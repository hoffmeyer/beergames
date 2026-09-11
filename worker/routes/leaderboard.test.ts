import { describe, expect, it } from "vitest";
import app from "../index";
import { createFakeD1 } from "../../test/fakeD1";
import type { Env } from "../env";
import type { LeaderboardRow } from "../../shared/leaderboard";
import type { Event, EventPlacement } from "../../shared/event";

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

async function createEvent(env: Env, name: string, placements: EventPlacement[]) {
  const res = await app.request(
    "/api/events",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, placements }),
    },
    env,
  );
  expect(res.status).toBe(201);
  return (await res.json()) as Event;
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

  it("only includes created teams, with zero event and bonus points before any event or bonus point is recorded", async () => {
    const env = testEnv();
    await createTeam(env, "Alpha", "alpha-avatar.webp");
    await createTeam(env, "Bravo", "beer-avatar.webp");

    const rows = await getLeaderboard(env);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.eventPoints === 0 && r.bonusPoints === 0)).toBe(true);
    expect(rows.every((r) => r.needsTiebreaker)).toBe(true);
  });

  it("ranks teams by event points when there's no tie", async () => {
    const env = testEnv();
    await createAllTeams(env);
    await createEvent(env, "Kubb", [
      { teamNumber: 1, rank: 1 },
      { teamNumber: 2, rank: 2 },
      { teamNumber: 3, rank: 3 },
      { teamNumber: 4, rank: 4 },
      { teamNumber: 5, rank: 5 },
    ]);

    const rows = await getLeaderboard(env);
    const byNumber = new Map(rows.map((r) => [r.number, r]));
    expect(byNumber.get(1)!.eventPoints).toBe(10);
    expect(byNumber.get(2)!.eventPoints).toBe(7);
    expect(byNumber.get(5)!.eventPoints).toBe(1);
    expect(byNumber.get(1)!.rank).toBe(1);
    expect(byNumber.get(2)!.rank).toBe(2);
    expect(rows.every((r) => !r.needsTiebreaker && r.tiedWith.length === 0)).toBe(true);
  });

  it("ranks teams by bonus points alone when no events have been recorded", async () => {
    const env = testEnv();
    await createAllTeams(env);
    await addBonusPoint(env, 1, 5, "Best costume");
    await addBonusPoint(env, 2, 3, "Team spirit");

    const rows = await getLeaderboard(env);
    const team1 = rows.find((r) => r.number === 1)!;
    const team2 = rows.find((r) => r.number === 2)!;
    expect(team1.eventPoints).toBe(0);
    expect(team2.eventPoints).toBe(0);
    expect(team1.bonusPoints).toBe(5);
    expect(team2.bonusPoints).toBe(3);
    expect(team1.rank).toBeLessThan(team2.rank);
    expect(team1.needsTiebreaker).toBe(false);
  });

  it("keeps event points and bonus points as two separate numbers, never combined into one total", async () => {
    const env = testEnv();
    await createAllTeams(env);
    await createEvent(env, "Kubb", [
      { teamNumber: 1, rank: 1 },
      { teamNumber: 2, rank: 2 },
      { teamNumber: 3, rank: 3 },
      { teamNumber: 4, rank: 4 },
      { teamNumber: 5, rank: 5 },
    ]);
    // Team 2's bonus points (20) would outscore team 1's event points (10) if
    // the two numbers were ever added together — they must not be.
    await addBonusPoint(env, 2, 20, "Huge bonus");

    const rows = await getLeaderboard(env);
    const team1 = rows.find((r) => r.number === 1)!;
    const team2 = rows.find((r) => r.number === 2)!;
    expect(team1.eventPoints).toBe(10);
    expect(team1.bonusPoints).toBe(0);
    expect(team2.eventPoints).toBe(7);
    expect(team2.bonusPoints).toBe(20);
    expect(team1.rank).toBeLessThan(team2.rank);
  });

  it("flags a tie needing a tiebreaker when both event points and bonus points match", async () => {
    const env = testEnv();
    await createAllTeams(env);
    await createEvent(env, "Kubb", [
      { teamNumber: 1, rank: 1 },
      { teamNumber: 2, rank: 1 },
      { teamNumber: 3, rank: 3 },
      { teamNumber: 4, rank: 4 },
      { teamNumber: 5, rank: 5 },
    ]);

    const rows = await getLeaderboard(env);
    const team1 = rows.find((r) => r.number === 1)!;
    const team2 = rows.find((r) => r.number === 2)!;
    expect(team1.eventPoints).toBe(10);
    expect(team2.eventPoints).toBe(10);
    expect(team1.bonusPoints).toBe(0);
    expect(team2.bonusPoints).toBe(0);
    expect(team1.rank).toBe(team2.rank);
    expect(team1.needsTiebreaker).toBe(true);
    expect(team2.needsTiebreaker).toBe(true);
    expect(team1.tiedWith).toEqual([2]);
    expect(team2.tiedWith).toEqual([1]);
  });

  it("resolves a tie in event points purely by differing bonus points", async () => {
    const env = testEnv();
    await createAllTeams(env);
    await createEvent(env, "Kubb", [
      { teamNumber: 1, rank: 1 },
      { teamNumber: 2, rank: 1 },
      { teamNumber: 3, rank: 3 },
      { teamNumber: 4, rank: 4 },
      { teamNumber: 5, rank: 5 },
    ]);
    await addBonusPoint(env, 1, 5, "Best costume");

    const rows = await getLeaderboard(env);
    const team1 = rows.find((r) => r.number === 1)!;
    const team2 = rows.find((r) => r.number === 2)!;
    expect(team1.eventPoints).toBe(team2.eventPoints);
    expect(team1.bonusPoints).toBe(5);
    expect(team2.bonusPoints).toBe(0);
    expect(team1.rank).toBeLessThan(team2.rank);
    expect(team1.needsTiebreaker).toBe(false);
    expect(team2.needsTiebreaker).toBe(false);
    expect(team1.tiedWith).toEqual([]);
    expect(team2.tiedWith).toEqual([]);
  });
});
