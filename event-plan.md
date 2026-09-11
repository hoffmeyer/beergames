# Rewrite scoring around general "events", tournament becomes just one of them

## Context

Scoring today is hard-wired to a single round-robin tournament: `worker/routes/leaderboard.ts` computes wins/matches-played/bonus-points live from the fixed 5-round schedule, resolves 2-way ties via head-to-head, and flags 3+-way ties as unresolved. This only works because there's exactly one tournament and nothing else contributes points.

The goal is to generalize scoring to any number of real-world events (games, side-bets, the tournament itself). An event is just "a name + the final 1st–5th placement of all 5 teams," entered by the admin after the fact, in reallity, once known. The tournament keeps its own schedule/bracket UI for organizing play in real life, but that UI no longer drives the leaderboard directly — once the tournament wraps up, the admin manually records it as an ordinary event, same as any other. This removes the leaderboard's tournament-specific concepts (wins, matches played, head-to-head) and replaces them with a flat points ledger: sum of event placement points, and sum of bonus points, kept as two separate numbers.

## Settled design

- **Fixed 5 teams**, always exactly 5 placements per event — no partial-participation events.
- **Points table** (flat lookup by placement rank, used everywhere ties are converted to points):
  `{1: 10, 2: 7, 3: 5, 4: 3, 5: 1}`. If multiple teams share a rank (a tie), each gets that rank's point value directly — e.g. 3 teams tied for 3rd each get 5 points; nobody gets the 4th/5th values in that case.
- **Tournament is not a special type.** It's an ordinary event the admin creates by hand once the real tournament is finished — no auto-conversion, no "resolve" step, no locking. All events (including it) stay freely editable/deletable, and every score is computed live from current data (no snapshots, no audit trail).
- **Schedule/bracket page stays**, fully decoupled from scoring, for running the tournament in real life. It gains a **live reference-only standings preview** at the bottom (wins desc → bonus points desc tiebreak → if still tied, teams share the points-table value for their tied rank) purely to help the admin know what to type into the eventual "Tournament" event. Zero effect on real scoring.
- **Bonus points are unchanged** — same free-standing per-team `{points, description}` list, same admin UI/hook (`AdminTeamBonusPoints`, `BonusPointsEditor`, `useTeamBonusPoints`). They're used as: (a) tiebreak input for the schedule preview above, and (b) tiebreak input for the real leaderboard order below.
- **Leaderboard**: each team shows two separate numbers — `sum(event placement points)` and `sum(bonus points)` — never combined into one total. Sort order: event points desc, then bonus points desc (display order only). If teams are still exactly tied on both, don't fall back to team number — flag them as tied (reuse the existing `needsTiebreaker`/`tiedWith` pattern) so the UI shows "tied, needs more bonus points to resolve"; the admin manually adds bonus points later to break it. No more wins/matches-played/head-to-head in the real leaderboard.
- **Leaderboard UI**: collapsed row = rank, avatar, name, event points, bonus points (no "wins/played" text). Expanded row = existing bonus points list, plus a new list of events the team scored in with points earned from each.
- **New Admin "Events" section**: create/edit/delete events — name + a rank (1–5) per team, duplicate ranks allowed to represent ties. Same tie→points rule applies uniformly to any event, not just the tournament.
- **Reset becomes a full wipe**: teams, schedule/match results, bonus points, and now events too — a true "start a new season" reset (schedule *structure* — the `rounds`/`matches` rows — stays in place, same as today, only data gets cleared).
- **Team identity stays `team_number`-keyed** (1–5) for event placements, consistent with bonus points; no separate durable ID needed since reset wipes everything together.

## Implementation

### 1. Migration — `migrations/0004_events.sql`
Two normalized tables (mirrors the existing `rounds`/`matches` split, not a JSON column, so per-row constraints work):
```sql
CREATE TABLE events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL CHECK (length(trim(name)) > 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE event_placements (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id      INTEGER NOT NULL REFERENCES events(id),
  team_number   INTEGER NOT NULL REFERENCES teams(number),
  rank          INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 5),
  UNIQUE (event_id, team_number)
);
```
"Exactly one placement per team, all 5 teams" is a whole-event invariant SQLite can't express across rows — enforce it in the route handler, same way `worker/routes/teams.ts` enforces the 5-team cap at the app layer. No `points` column — points are always derived from `rank` at read time (no snapshotting, per the "live" requirement). No cascade; route handlers delete `event_placements` before `events`, same ordering pattern `admin.ts` already uses for `team_bonus_points` → `teams`.

### 2. Shared types
- **New `shared/event.ts`**: `POINTS_TABLE` (the single source of truth, reused by `events.ts`, `leaderboard.ts`, and the schedule-standings endpoint), `EventPlacement = { teamNumber, rank }`, `Event = { id, name, createdAt, updatedAt, placements }`.
- **Rewrite `shared/leaderboard.ts`**: `LeaderboardRow = { number, name, avatar, eventPoints, bonusPoints, rank, needsTiebreaker, tiedWith }`. Delete `wins`, `matchesPlayed`, `resolvedBy`.
- **New `shared/schedule-standings.ts`**: `ScheduleStandingRow = { number, name, avatar, wins, matchesPlayed, bonusPoints, rank, previewPoints, tiedWith }` — separate shape from the real leaderboard since it's a different concept (schedule-page-only reference).

### 3. Worker routes
- **New `worker/routes/events.ts`** (follow `worker/routes/team-bonus-points.ts` conventions — `SELECT_FIELDS` const, validation helpers, `RETURNING`):
  - `GET /events` — list with placements (events query + placements query, grouped in JS like `schedule.ts` groups rounds/matches).
  - `GET /events/:id` — single event, 404 if missing.
  - `POST /events` — body `{name, placements}`; validate name non-empty, exactly 5 placements, team numbers are exactly `{1..5}` with no duplicates/gaps, each rank an integer 1–5. Insert event, then 5 placement rows sequentially (no `.batch()` — codebase doesn't use it, `test/fakeD1.ts` doesn't implement it).
  - `PATCH /events/:id` — update `name` and/or replace the whole placements array (delete + re-insert, simpler than diffing).
  - `DELETE /events/:id` — delete placements then the event row, 404 if missing.
  - `GET /teams/:number/events` — per-team event history for the leaderboard expanded view: `[{eventId, eventName, rank, points}]` ordered by `created_at`.
  - Export a small `eventPoints(rank)` helper wrapping `POINTS_TABLE` for reuse.
- **Rewrite `worker/routes/leaderboard.ts`**: delete the `TeamStandingRow`/`MatchPairRow`/`pairKey`/`headToHeadWinner` machinery outright (it moves to the schedule endpoint below, not reused here). New query sums `event_placements` points per team via an inline SQL `CASE rank WHEN 1 THEN 10 WHEN 2 THEN 7 WHEN 3 THEN 5 WHEN 4 THEN 3 WHEN 5 THEN 1 END` (SQLite can't call the JS `POINTS_TABLE` lookup) plus the existing bonus-points subquery, ordered by event points desc, bonus points desc. Keep the existing grouping-by-equal-key `while` loop shape, but the key is now `(event_points, bonus_points)` and there is no head-to-head branch at all — groups of size ≥ 2 are simply flagged `needsTiebreaker: true` with `tiedWith` populated, all sharing one `rank`.
- **New endpoint `GET /schedule/standings`** (add to `worker/routes/schedule.ts`, colocated with the feature it serves): this is where **today's wins/bonus SQL and grouping logic get repurposed almost verbatim**, minus the head-to-head branch (not part of this preview per spec) — two branches only: solo (no tie) and tied group (shared rank, `previewPoints = POINTS_TABLE[rank]` using the standings position as the lookup key, `tiedWith` populated).
- **Rewrite `worker/routes/admin.ts` reset handler**: also `DELETE FROM event_placements` and `DELETE FROM events`, before the existing bonus-points/match/teams wipes. Update the comment — reset now also clears all events.
- **`worker/index.ts`**: `import { events } from "./routes/events";` and `app.route("/api", events);` (mounted at `/api` like `teamBonusPoints`/`admin`, since its paths are `/events`, `/events/:id`, `/teams/:number/events`).

### 4. Frontend
- **`src/app/lib/api.ts`**: re-export `Event`/`EventPlacement`/`POINTS_TABLE` from `shared/event`; add `fetchEvents`, `createEvent`, `updateEvent`, `deleteEvent`, `fetchTeamEvents`; re-export `ScheduleStandingRow` and add `fetchScheduleStandings`.
- **New `src/app/lib/useEvents.ts`** — mirrors `useTeamBonusPoints.ts`: query on `["events"]`, mutations invalidating `["events"]` and `["leaderboard"]`.
- **New `src/app/lib/useTeamEvents.ts`** — small hook parallel to the bonus-points enabled-on-expand pattern, for the leaderboard expanded view.
- **New Admin Events components**, following `AdminTeamBonusPoints.tsx`/`BonusPointsEditor.tsx`/`BonusPointsList.tsx` conventions:
  - `src/app/components/AdminEvents.tsx` — list + create/edit/delete section for `AdminPage.tsx`.
  - `src/app/components/EventForm.tsx` — name input + one rank selector (1–5) per team (label teams via existing `fetchTeams`/`["teams"]` query); client-side validation before submit, mirroring `BonusPointsEditor`'s local validation.
- **`src/app/pages/AdminPage.tsx`**: add `<AdminEvents />` between "Bonus points" and "Reset tournament"; update reset copy to mention events are wiped too.
- **`src/app/components/LeaderboardEntry.tsx`**: collapsed row replaces the wins/bonus/played line with two separate numbers (event points, bonus points). Expanded view keeps `<BonusPointsList>` unchanged and adds a new events-scored list (new small `EventPointsList.tsx`, parallel to `BonusPointsList.tsx`) driven by `useTeamEvents(row.number, { enabled: expanded })`, showing `{eventName}: {points} pts (rank {rank})`.
- **`src/app/pages/LeaderboardPage.tsx`**: simplify `tieNote()` to a single case — `tiedWith.length > 0` → "Tied with {names} — needs more bonus points to resolve." Delete the `resolvedBy`/head-to-head branching.
- **`src/app/pages/SchedulePage.tsx`**: add a `useQuery(["schedule-standings"], fetchScheduleStandings)` and render a new `ScheduleStandingsPreview.tsx` component at the bottom of the page — purely additive, no changes to existing round/match rendering.

### 5. Tests
- `worker/routes/leaderboard.test.ts` — full rewrite: delete head-to-head cases, add cases for event-points-only, bonus-points-only, both combined and kept separate, a tie needing `needsTiebreaker` after both match, and a tie resolved purely by differing bonus points.
- New `worker/routes/events.test.ts` — CRUD happy paths; validation failures (missing team, duplicate team number, rank out of range, wrong placement count); 404s; the by-team events endpoint.
- Extend `worker/routes/schedule.test.ts` (or new `schedule-standings.test.ts`) with the wins/bonus/tie-grouping cases moved out of the old leaderboard tests (ranks by wins desc, breaks tie via bonus points, narrows 3-way tie via bonus points) — drop head-to-head-specific assertions.
- `worker/routes/admin.test.ts` — extend the reset test to also create an event and assert `GET /api/events` returns `[]` after reset.
- `worker/routes/team-bonus-points.test.ts` — unchanged.

Verify each backend step with `npm test` (vitest + `test/fakeD1.ts`, which replays every file in `migrations/` against `node:sqlite`, so the new migration is picked up automatically). Verify frontend steps with `npm run typecheck`, then exercise the app manually (admin: create an event with a tie, check leaderboard totals and expanded breakdown update; schedule page: check the reference standings preview updates as match results are entered; reset: confirm events are wiped).

### Critical files
- `migrations/0004_events.sql` (new)
- `shared/event.ts` (new), `shared/leaderboard.ts`, `shared/schedule-standings.ts` (new)
- `worker/routes/events.ts` (new), `worker/routes/leaderboard.ts`, `worker/routes/schedule.ts`, `worker/routes/admin.ts`, `worker/index.ts`
- `src/app/lib/api.ts`, `src/app/lib/useEvents.ts` (new), `src/app/lib/useTeamEvents.ts` (new)
- `src/app/components/AdminEvents.tsx` (new), `EventForm.tsx` (new), `EventPointsList.tsx` (new), `LeaderboardEntry.tsx`, `ScheduleStandingsPreview.tsx` (new)
- `src/app/pages/AdminPage.tsx`, `LeaderboardPage.tsx`, `SchedulePage.tsx`
