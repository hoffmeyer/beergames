# Beerlympiad — Development Plan

## Context

This app supports a bachelor party tournament: 5 teams compete across 3 events (Kubb, Flunkyball, Tug of War) following the fixed schedule in `tournament-schedule.md`. The app needs to manage teams, show the schedule, let an organizer record match winners (password-protected, to prevent cheating), and show a live leaderboard — all mobile-friendly and easily deployable to Cloudflare.

Key decisions already made:
- Team count is fixed at 5 — no general N-team scheduling algorithm needed. Team numbers are assigned in creation order (1-5), which maps directly onto the schedule's placeholder letters A-E.
- Match results record only a winner, no scores/points.
- The password protects only match-result entry (recording/correcting a winner). Team management and all viewing (schedule, leaderboard) is public.
- The leaderboard updates via simple polling, not websockets/SSE.
- No user accounts — a single shared password via a Worker secret / env var.
- The team roster is fixed: exactly 5 teams, created once at setup in the exact order intended to fill schedule slots A-E, never deleted or reset. Name and color remain editable at any time (including mid- or post-tournament) — that's the only mutation ever available on a team.
- 3+-way tie cycles in the leaderboard are flagged (naming the tied teams), never auto-resolved in-app — resolved manually outside the app per tournament-schedule.md's sudden-death rule.

**Terminology:** see `CONTEXT.md` for canonical definitions of Team, Schedule Slot, Match, Match Result, and Leaderboard used throughout this plan.

## Tech Stack

- **Frontend:** Vite + React + TypeScript, React Router (3 routes), TanStack Query for data fetching and polling, Tailwind CSS for mobile-first styling.
- **Backend:** Hono running in a single Cloudflare Worker — idiomatic routing/middleware with minimal cold-start overhead, no need for a full framework given ~10 endpoints.
- **Deployment:** One Worker using Cloudflare "Workers + Static Assets" (via `@cloudflare/vite-plugin`), not separate Pages + Pages Functions. One `wrangler.toml`, one `wrangler deploy`. API lives under `/api/*`, static assets served directly, unmatched routes fall back to `index.html` (SPA routing). Same-origin means no CORS config needed.
- **Storage:** Cloudflare D1 (SQLite). The data is relational (teams, rounds, matches, standings via joins/aggregation) — D1 supports this natively via SQL, whereas KV would require manually maintained denormalized indexes for no real benefit at this scale. No ORM needed; D1's prepared statements are enough for this small, fixed schema.
- **Auth:** A single shared secret (`SCORE_PASSWORD`, stored as a Worker secret in prod / `.dev.vars` locally), sent by the client as an `X-Score-Password` header. A small Hono middleware checks it only on the two match-result mutation routes and returns `401` on mismatch. The frontend prompts once and caches the value in `sessionStorage` (not `localStorage`), re-prompting on a `401`.

## Data Model

```sql
-- migrations/0001_teams.sql
CREATE TABLE teams (
  number     INTEGER PRIMARY KEY CHECK (number BETWEEN 1 AND 5),
  name       TEXT NOT NULL,
  color      TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- migrations/0002_schedule_seed.sql
CREATE TABLE rounds (
  round_number         INTEGER PRIMARY KEY CHECK (round_number BETWEEN 1 AND 5),
  resting_team_number  INTEGER NOT NULL
);

CREATE TABLE matches (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  round_number        INTEGER NOT NULL REFERENCES rounds(round_number),
  match_order         INTEGER NOT NULL,
  event               TEXT NOT NULL CHECK (event IN ('kubb','flunkyball','tug_of_war')),
  team_a_number       INTEGER NOT NULL,
  team_b_number       INTEGER NOT NULL,
  winner_team_number  INTEGER,
  recorded_at         TEXT
);

INSERT INTO rounds (round_number, resting_team_number) VALUES
  (1,1), (2,2), (3,3), (4,4), (5,5);

INSERT INTO matches (round_number, match_order, event, team_a_number, team_b_number) VALUES
  (1,1,'tug_of_war',2,5), (1,2,'flunkyball',3,4),
  (2,1,'tug_of_war',1,3), (2,2,'kubb',4,5),
  (3,1,'tug_of_war',2,4), (3,2,'flunkyball',1,5),
  (4,1,'kubb',3,5),       (4,2,'flunkyball',1,2),
  (5,1,'kubb',1,4),       (5,2,'kubb',2,3);
```

Notes:
- `teams.number` is the primary key directly (no separate surrogate id) since it's already unique and sequential. It also *is* the schedule slot: number 1 = slot A, ... number 5 = slot E, permanently, from the moment that team is created. There is no separate slot-assignment step and no way to reassign it later.
- Rounds/matches are seeded once via migration, independent of whether teams exist yet — the schedule API LEFT JOINs against `teams` and shows a placeholder for any team number not yet created.
- Team creation: `number = (SELECT COALESCE(MAX(number),0)+1 FROM teams)`, rejected with `409` once 5 teams exist. There is no delete endpoint and no reset endpoint — the roster is entered once, in the intended slot order, and only `name`/`color` are ever mutated afterward.
- Match results live directly on `matches` (`winner_team_number`, `recorded_at`) since it's a 1:1 winner-only record.

## API Surface

All routes under `/api`. Only the two mutation routes below require `X-Score-Password`.

**Teams**
- `GET /api/teams` — list all created teams.
- `POST /api/teams` — body `{name, color}`; assigns next number (= permanent schedule slot); `409` once 5 exist. Called at most 5 times ever, during setup, in the exact order intended to fill slots A-E.
- `PATCH /api/teams/:number` — body `{name?, color?}`; number is immutable. This is the *only* other team mutation available, and it's available at any time — no locking once matches start. No delete or reset endpoint exists.

**Schedule**
- `GET /api/schedule` — all 5 rounds with resting team and their 2 matches (event, both teams' info, winner, recorded_at).

**Match results (password-protected)**
- `PUT /api/matches/:id/result` — body `{winner_team_number}`; validates winner is one of the match's two teams; `401` on bad/missing password, `400` on invalid winner.
- `DELETE /api/matches/:id/result` — clears a recorded result (correction).

**Leaderboard**
- `GET /api/leaderboard` — computed on the fly from `matches`:
  - Per team: `wins`, `matches_played`.
  - Sort by wins desc. Exactly-2-team ties resolved via their head-to-head match (`resolvedBy: "head_to_head"`).
  - 3+-team tie cycles are **not** auto-resolved and the app never records an in-app tiebreaker match — flagged with `needsTiebreaker: true` and the tied group, for the UI to surface; resolved manually outside the app (tournament-schedule.md's sudden-death rule).

**Health**
- `GET /api/health` — `{ok: true}`, used to verify deploys.

## Frontend Structure

Bottom tab navigation across three routes:
- `/` — **Teams**: cards for each team (number, name, color swatch), add-team form (hidden once 5 exist, no delete affordance ever), inline edit of name/color always available. Color is chosen from a fixed palette (swatch picker) sized to exactly the 5 teams needed; a color already taken by another team is disabled/greyed out in the picker.
- `/schedule` — **Schedule**: 5 round cards, each showing the resting team and its 2 matches; tapping a match opens `ScoreEntryModal`. Slots without a real team yet show a placeholder label (e.g. "Team 3 — unnamed") from the moment the app loads; matches involving a placeholder team can't have a result recorded.
- `/leaderboard` — **Leaderboard**: ranked list, tie groups visually annotated, polling every ~5s via TanStack Query (`refetchInterval`).

Key files: `src/app/main.tsx`, `App.tsx` (router + bottom nav), `pages/TeamsPage.tsx`, `SchedulePage.tsx`, `LeaderboardPage.tsx`, `components/TeamForm.tsx`, `TeamCard.tsx`, `ColorPicker.tsx`, `RoundCard.tsx`, `MatchRow.tsx`, `ScoreEntryModal.tsx`, `lib/api.ts`, `lib/usePassword.ts`.

Mobile-friendliness: correct viewport meta tag, Tailwind mobile-first breakpoints, ≥44px tap targets, fixed bottom nav, no hover-dependent interactions.

## Staged Development Plan

Each stage ends with a deployed, demoable slice of the app.

### Stage 0 — Scaffolding & deploy skeleton
- **Goal:** empty Vite/React app + Hono worker, deployed to Cloudflare as one Worker.
- **Files:** `wrangler.toml`, `vite.config.ts` (with `@cloudflare/vite-plugin`), `worker/index.ts` (Hono app with `GET /api/health`), placeholder `src/app`.
- **Verify:** `npm run build && npx wrangler deploy` succeeds; deployed URL shows a placeholder page; `GET /api/health` returns `{"ok":true}`.

### Stage 1 — Team management
- **Goal:** create exactly 5 teams (in the order intended to fill schedule slots A-E) and edit their name/color thereafter, persisted in D1.
- **Files:** `migrations/0001_teams.sql`, `worker/routes/teams.ts`, `worker/db.ts`, `src/app/pages/TeamsPage.tsx`, `TeamForm.tsx`, `TeamCard.tsx`, `ColorPicker.tsx`.
- **Verify:** create 5 teams with distinct names and palette colors in the intended slot order; refresh — they persist; a 6th is blocked; a color already used by another team can't be picked again; confirm there is no delete affordance anywhere in the UI; edit a team's name/color both before and after a match result exists (Stage 3) and confirm it's allowed both times; numbers stay 1-5 in creation order and are never reassignable.

### Stage 2 — Fixed schedule + read-only view
- **Goal:** schedule seeded via migration referencing team numbers 1-5; `GET /api/schedule` returns the joined view; SchedulePage renders all 5 rounds.
- **Files:** `migrations/0002_schedule_seed.sql`, `worker/routes/schedule.ts`, `SchedulePage.tsx`, `RoundCard.tsx`, `MatchRow.tsx`.
- **Verify:** check the schedule page against `tournament-schedule.md`'s table round-by-round (correct resting team, events, pairings — e.g. round 1 resting = team 1, matches team2-vs-team5 Tug of War and team3-vs-team4 Flunkyball); totals are 4 kubb / 3 flunkyball / 3 tug-of-war across 10 matches.

### Stage 3 — Password-protected match result recording
- **Goal:** an authorized user can record/correct a winner; unauthorized requests are rejected.
- **Files:** `worker/middleware/auth.ts`, `worker/routes/matches.ts` (`PUT`/`DELETE /api/matches/:id/result`), `ScoreEntryModal.tsx`, `usePassword.ts`, `.dev.vars` / `wrangler secret put SCORE_PASSWORD`.
- **Verify:** wrong password → error, no change; correct password → pick a winner → result persists across reload; direct request without the header → `401`.

### Stage 4 — Leaderboard with polling & tie-break handling
- **Goal:** public leaderboard ranks teams by wins, auto-refreshes, resolves 2-way ties via head-to-head, flags unresolved 3+-way ties.
- **Files:** `worker/routes/leaderboard.ts`, `LeaderboardPage.tsx` (TanStack Query with `refetchInterval`).
- **Verify:** force a 2-way tie between two teams that already played each other — head-to-head winner ranks higher; force a 3-way tie — flagged as needing a tiebreaker, not silently ordered; open two tabs, record a result in one, confirm the other updates within the polling window.

### Stage 5 — Mobile polish + deployment hardening
- **Goal:** confirm real-device usability and production readiness.
- **Files:** Tailwind/CSS pass, bottom-nav polish, loading/error states, `README.md` with `wrangler d1 create` / migrations / `secret put` deployment steps.
- **Verify:** run the full flow (teams → schedule → scoring → leaderboard) on a real phone or mobile emulator with no horizontal scroll and comfortable tap targets; do a clean deploy against a fresh D1 database to confirm the documented setup steps are complete.
