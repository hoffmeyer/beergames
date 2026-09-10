import { describe, expect, it } from "vitest";
import app from "../index";
import { createFakeD1 } from "../../test/fakeD1";
import type { Env } from "../env";
import type { ScheduleRound } from "../../shared/schedule";

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

async function getSchedule(env: Env): Promise<ScheduleRound[]> {
  const res = await app.request("/api/schedule", {}, env);
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
