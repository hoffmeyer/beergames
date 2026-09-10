import { describe, expect, it } from "vitest";
import app from "../index";
import { createFakeD1 } from "../../test/fakeD1";
import type { Env } from "../env";
import type { ScheduleRound } from "../../shared/schedule";
import type { LeaderboardRow } from "../../shared/leaderboard";

function testEnv(): Env {
  return { DB: createFakeD1(), ASSETS: {} as Fetcher };
}

async function createTeam(env: Env, name: string, avatar: string) {
  return app.request(
    "/api/teams",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, avatar }),
    },
    env,
  );
}

async function createAllTeams(env: Env) {
  const avatars = [
    "alpha-avatar.webp",
    "beer-avatar.webp",
    "buttcrack-avatar.webp",
    "gigachad-avatar.webp",
    "heavymetal-avatar.webp",
  ];
  for (let i = 0; i < 5; i++) {
    await createTeam(env, `Team ${i + 1}`, avatars[i]);
  }
}

async function getSchedule(env: Env): Promise<ScheduleRound[]> {
  const res = await app.request("/api/schedule", {}, env);
  return res.json();
}

function findMatch(rounds: ScheduleRound[], aNumber: number, bNumber: number) {
  const match = rounds
    .flatMap((round) => round.matches)
    .find(
      (m) =>
        (m.teamA.number === aNumber && m.teamB.number === bNumber) ||
        (m.teamA.number === bNumber && m.teamB.number === aNumber),
    );
  if (!match) throw new Error(`no match found for ${aNumber} vs ${bNumber}`);
  return match;
}

function addBonusPoint(env: Env, teamNumber: number, points: number, description: string) {
  return app.request(
    `/api/teams/${teamNumber}/bonus-points`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points, description }),
    },
    env,
  );
}

function putResult(env: Env, matchId: number, winnerTeamNumber: number) {
  return app.request(
    `/api/matches/${matchId}/result`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winner_team_number: winnerTeamNumber }),
    },
    env,
  );
}

async function getLeaderboard(env: Env): Promise<LeaderboardRow[]> {
  const res = await app.request("/api/leaderboard", {}, env);
  return res.json();
}

describe("GET /api/leaderboard", () => {
  it("returns an empty list before any team is created", async () => {
    const env = testEnv();
    const res = await app.request("/api/leaderboard", {}, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("only includes created teams, with zero wins before any result is recorded", async () => {
    const env = testEnv();
    await createTeam(env, "Alpha", "alpha-avatar.webp");
    await createTeam(env, "Bravo", "beer-avatar.webp");

    const rows = await getLeaderboard(env);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.wins === 0 && r.matchesPlayed === 0)).toBe(true);
  });

  it("ranks teams by wins descending when there's no tie", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const schedule = await getSchedule(env);

    // Team 1 wins both of its recorded matches; team 2 wins one.
    await putResult(env, findMatch(schedule, 1, 3).id, 1);
    await putResult(env, findMatch(schedule, 1, 5).id, 1);
    await putResult(env, findMatch(schedule, 2, 4).id, 2);

    const rows = await getLeaderboard(env);
    const team1 = rows.find((r) => r.number === 1)!;
    const team2 = rows.find((r) => r.number === 2)!;
    expect(team1.wins).toBe(2);
    expect(team1.rank).toBe(1);
    expect(team2.wins).toBe(1);
    expect(team2.rank).toBeGreaterThan(1);
    expect(team1.needsTiebreaker).toBe(false);
    expect(team1.tiedWith).toEqual([]);
  });

  it("resolves a 2-way tie via head-to-head, and flags an unresolved 3+-way tie", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const schedule = await getSchedule(env);

    // Team 1 and team 3 both end up with exactly 1 win; team 1 beat team 3 head-to-head.
    await putResult(env, findMatch(schedule, 1, 3).id, 1);
    await putResult(env, findMatch(schedule, 3, 5).id, 3);
    // Teams 2, 4, 5 are left with 0 recorded wins each — an unresolved 3-way tie.

    const rows = await getLeaderboard(env);
    const byNumber = new Map(rows.map((r) => [r.number, r]));

    const team1 = byNumber.get(1)!;
    const team3 = byNumber.get(3)!;
    expect(team1.wins).toBe(1);
    expect(team3.wins).toBe(1);
    expect(team1.resolvedBy).toBe("head_to_head");
    expect(team3.resolvedBy).toBe("head_to_head");
    expect(team1.rank).toBeLessThan(team3.rank);
    expect(team1.needsTiebreaker).toBe(false);
    expect(team1.tiedWith).toEqual([3]);
    expect(team3.tiedWith).toEqual([1]);

    const team3MatchesPlayed = byNumber.get(3)!.matchesPlayed;
    expect(team3MatchesPlayed).toBe(2);
    expect(byNumber.get(5)!.matchesPlayed).toBe(1);

    for (const number of [2, 4, 5]) {
      const row = byNumber.get(number)!;
      expect(row.wins).toBe(0);
      expect(row.needsTiebreaker).toBe(true);
      expect(row.resolvedBy).toBeNull();
      expect(row.rank).toBe(byNumber.get(2)!.rank);
      expect(new Set(row.tiedWith)).toEqual(new Set([2, 4, 5].filter((n) => n !== number)));
    }
  });

  it("keeps a 2-way tie undecided (same rank, no resolvedBy) until the head-to-head match is recorded", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const schedule = await getSchedule(env);

    // Team 1 and team 2 each pick up a win elsewhere but haven't played each other yet.
    await putResult(env, findMatch(schedule, 1, 3).id, 1);
    await putResult(env, findMatch(schedule, 2, 4).id, 2);

    const rows = await getLeaderboard(env);
    const team1 = rows.find((r) => r.number === 1)!;
    const team2 = rows.find((r) => r.number === 2)!;
    expect(team1.wins).toBe(1);
    expect(team2.wins).toBe(1);
    expect(team1.resolvedBy).toBeNull();
    expect(team2.resolvedBy).toBeNull();
    expect(team1.rank).toBe(team2.rank);
    expect(team1.needsTiebreaker).toBe(false);
  });

  it("breaks a 2-way tie on wins using bonus points, without needing head-to-head", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const schedule = await getSchedule(env);

    // Team 1 and team 2 each end up with 1 win and haven't played each other.
    await putResult(env, findMatch(schedule, 1, 3).id, 1);
    await putResult(env, findMatch(schedule, 2, 4).id, 2);
    await addBonusPoint(env, 1, 5, "Best costume");

    const rows = await getLeaderboard(env);
    const team1 = rows.find((r) => r.number === 1)!;
    const team2 = rows.find((r) => r.number === 2)!;
    expect(team1.bonusPoints).toBe(5);
    expect(team2.bonusPoints).toBe(0);
    expect(team1.rank).toBeLessThan(team2.rank);
    expect(team1.resolvedBy).toBeNull();
    expect(team1.needsTiebreaker).toBe(false);
    expect(team1.tiedWith).toEqual([]);
    expect(team2.tiedWith).toEqual([]);
  });

  it("still falls back to head-to-head when wins and bonus points are both equal", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const schedule = await getSchedule(env);

    await putResult(env, findMatch(schedule, 1, 3).id, 1);
    await putResult(env, findMatch(schedule, 3, 5).id, 3);
    await addBonusPoint(env, 1, 4, "Best costume");
    await addBonusPoint(env, 3, 4, "Team spirit");

    const rows = await getLeaderboard(env);
    const team1 = rows.find((r) => r.number === 1)!;
    const team3 = rows.find((r) => r.number === 3)!;
    expect(team1.bonusPoints).toBe(4);
    expect(team3.bonusPoints).toBe(4);
    expect(team1.resolvedBy).toBe("head_to_head");
    expect(team1.rank).toBeLessThan(team3.rank);
  });

  it("narrows an unresolved 3-way tie down using bonus points", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const schedule = await getSchedule(env);

    // Team 1 and team 3 pick up 1 win each elsewhere; teams 2, 4, 5 are left
    // with 0 recorded wins each — an unresolved 3-way tie, per the existing
    // head-to-head test above. Give team 2 a bonus point to break it out.
    await putResult(env, findMatch(schedule, 1, 3).id, 1);
    await putResult(env, findMatch(schedule, 3, 5).id, 3);
    await addBonusPoint(env, 2, 10, "Best costume");

    const rows = await getLeaderboard(env);
    const byNumber = new Map(rows.map((r) => [r.number, r]));

    const team2 = byNumber.get(2)!;
    expect(team2.needsTiebreaker).toBe(false);
    expect(team2.tiedWith).toEqual([]);

    // Narrowing the 3-way group down to {4, 5} turns it into an ordinary
    // 2-way tie, pending their (unplayed) head-to-head match.
    const team4 = byNumber.get(4)!;
    const team5 = byNumber.get(5)!;
    expect(team4.needsTiebreaker).toBe(false);
    expect(team5.needsTiebreaker).toBe(false);
    expect(team4.resolvedBy).toBeNull();
    expect(new Set(team4.tiedWith)).toEqual(new Set([5]));
    expect(team4.rank).toBeGreaterThan(team2.rank);
  });

  it("never lets bonus points outrank a team with more wins", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const schedule = await getSchedule(env);

    await putResult(env, findMatch(schedule, 1, 3).id, 1);
    await putResult(env, findMatch(schedule, 1, 5).id, 1);
    await addBonusPoint(env, 2, 100, "Huge bonus");

    const rows = await getLeaderboard(env);
    const team1 = rows.find((r) => r.number === 1)!;
    const team2 = rows.find((r) => r.number === 2)!;
    expect(team1.wins).toBe(2);
    expect(team2.wins).toBe(0);
    expect(team1.rank).toBeLessThan(team2.rank);
  });
});
