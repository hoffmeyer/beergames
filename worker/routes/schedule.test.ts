import { describe, expect, it } from "vitest";
import app from "../index";
import { createFakeD1 } from "../../test/fakeD1";
import type { Env } from "../env";
import type { ScheduleRound } from "../../shared/schedule";
import type { ScheduleStandingRow } from "../../shared/schedule-standings";

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
  expect(res.status).toBe(200);
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

async function getStandings(env: Env): Promise<ScheduleStandingRow[]> {
  const res = await app.request("/api/schedule/standings", {}, env);
  expect(res.status).toBe(200);
  return res.json();
}

describe("GET /api/schedule", () => {
  it("returns all 5 rounds in order, each with 2 matches", async () => {
    const env = testEnv();
    const schedule = await getSchedule(env);

    expect(schedule.map((r) => r.roundNumber)).toEqual([1, 2, 3, 4, 5]);
    for (const round of schedule) {
      expect(round.matches).toHaveLength(2);
    }
  });

  it("matches round 1 from tournament-schedule.md: team 1 rests, 2v5 tug of war, 3v4 flunkyball", async () => {
    const env = testEnv();
    const schedule = await getSchedule(env);
    const round1 = schedule[0];

    expect(round1.restingTeam.number).toBe(1);
    expect(round1.matches[0]).toMatchObject({
      event: "tug_of_war",
      teamA: { number: 2 },
      teamB: { number: 5 },
    });
    expect(round1.matches[1]).toMatchObject({
      event: "flunkyball",
      teamA: { number: 3 },
      teamB: { number: 4 },
    });
  });

  it("totals 4 kubb, 3 flunkyball, 3 tug_of_war across 10 matches", async () => {
    const env = testEnv();
    const schedule = await getSchedule(env);
    const allMatches = schedule.flatMap((r) => r.matches);

    expect(allMatches).toHaveLength(10);
    const counts = allMatches.reduce<Record<string, number>>((acc, m) => {
      acc[m.event] = (acc[m.event] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({ kubb: 4, flunkyball: 3, tug_of_war: 3 });
  });

  it("shows a placeholder (null name/avatar) for a slot whose team hasn't been created yet", async () => {
    const env = testEnv();
    const schedule = await getSchedule(env);
    const round1 = schedule[0];

    expect(round1.restingTeam).toMatchObject({ number: 1, name: null, avatar: null });
    expect(round1.matches[0].teamA).toMatchObject({ number: 2, name: null, avatar: null });
  });

  it("fills in name/avatar once a team is created", async () => {
    const env = testEnv();
    await createTeam(env, "Alpha", "alpha-avatar.webp");
    const schedule = await getSchedule(env);
    const round1 = schedule[0];

    expect(round1.restingTeam).toMatchObject({ number: 1, name: "Alpha", avatar: "alpha-avatar.webp" });
  });

  it("has no results recorded yet (winner/recordedAt are null)", async () => {
    const env = testEnv();
    const schedule = await getSchedule(env);
    const allMatches = schedule.flatMap((r) => r.matches);

    for (const match of allMatches) {
      expect(match.winnerTeamNumber).toBeNull();
      expect(match.recordedAt).toBeNull();
    }
  });
});

describe("GET /api/schedule/standings", () => {
  it("puts every team at rank 1 with zero wins before any result is recorded", async () => {
    const env = testEnv();
    await createAllTeams(env);

    const rows = await getStandings(env);
    expect(rows).toHaveLength(5);
    expect(rows.every((r) => r.wins === 0 && r.rank === 1)).toBe(true);
  });

  it("ranks teams by wins descending when there's no tie", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const schedule = await getSchedule(env);

    // Team 1 wins both of its recorded matches; team 2 wins one.
    await putResult(env, findMatch(schedule, 1, 3).id, 1);
    await putResult(env, findMatch(schedule, 1, 5).id, 1);
    await putResult(env, findMatch(schedule, 2, 4).id, 2);

    const rows = await getStandings(env);
    const team1 = rows.find((r) => r.number === 1)!;
    const team2 = rows.find((r) => r.number === 2)!;
    expect(team1.wins).toBe(2);
    expect(team1.rank).toBe(1);
    expect(team1.previewPoints).toBe(10);
    expect(team2.wins).toBe(1);
    expect(team2.rank).toBeGreaterThan(1);
    expect(team1.tiedWith).toEqual([]);
  });

  it("keeps a 2-way tie tied even after they've played each other (no head-to-head resolution in this preview)", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const schedule = await getSchedule(env);

    // Team 1 beat team 3 head-to-head, and both end up with exactly 1 win.
    await putResult(env, findMatch(schedule, 1, 3).id, 1);
    await putResult(env, findMatch(schedule, 3, 5).id, 3);

    const rows = await getStandings(env);
    const team1 = rows.find((r) => r.number === 1)!;
    const team3 = rows.find((r) => r.number === 3)!;
    expect(team1.wins).toBe(1);
    expect(team3.wins).toBe(1);
    expect(team1.rank).toBe(team3.rank);
    expect(team1.previewPoints).toBe(team3.previewPoints);
    expect(team1.tiedWith).toEqual([3]);
    expect(team3.tiedWith).toEqual([1]);
  });

  it("breaks a tie in wins using bonus points", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const schedule = await getSchedule(env);

    // Team 1 and team 2 each end up with 1 win and haven't played each other.
    await putResult(env, findMatch(schedule, 1, 3).id, 1);
    await putResult(env, findMatch(schedule, 2, 4).id, 2);
    await addBonusPoint(env, 1, 5, "Best costume");

    const rows = await getStandings(env);
    const team1 = rows.find((r) => r.number === 1)!;
    const team2 = rows.find((r) => r.number === 2)!;
    expect(team1.bonusPoints).toBe(5);
    expect(team2.bonusPoints).toBe(0);
    expect(team1.rank).toBeLessThan(team2.rank);
    expect(team1.tiedWith).toEqual([]);
    expect(team2.tiedWith).toEqual([]);
  });

  it("narrows an unresolved 3-way tie down using bonus points", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const schedule = await getSchedule(env);

    // Team 1 and team 3 pick up 1 win each elsewhere; teams 2, 4, 5 are left
    // with 0 recorded wins each — an unresolved 3-way tie. Give team 2 a
    // bonus point to break it out.
    await putResult(env, findMatch(schedule, 1, 3).id, 1);
    await putResult(env, findMatch(schedule, 3, 5).id, 3);
    await addBonusPoint(env, 2, 10, "Best costume");

    const rows = await getStandings(env);
    const byNumber = new Map(rows.map((r) => [r.number, r]));

    const team2 = byNumber.get(2)!;
    expect(team2.tiedWith).toEqual([]);

    // Narrowing the 3-way group down to {4, 5} leaves them tied.
    const team4 = byNumber.get(4)!;
    expect(new Set(team4.tiedWith)).toEqual(new Set([5]));
    expect(team4.rank).toBeGreaterThan(team2.rank);
  });
});
