import { describe, expect, it } from "vitest";
import app from "../index";
import { createFakeD1 } from "../../test/fakeD1";
import type { Env } from "../env";
import type { ScheduleRound } from "../../shared/schedule";

function testEnv(): Env {
  return { DB: createFakeD1(), ASSETS: {} as Fetcher };
}

async function getSchedule(env: Env): Promise<ScheduleRound[]> {
  const res = await app.request("/api/schedule", {}, env);
  return res.json();
}

function putResult(env: Env, matchId: number, winnerTeamNumber: unknown) {
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

function deleteResult(env: Env, matchId: number) {
  return app.request(`/api/matches/${matchId}/result`, { method: "DELETE" }, env);
}

async function createTeam(env: Env, name: string, color: string) {
  return app.request(
    "/api/teams",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    },
    env,
  );
}

/** Creates all 5 teams so every schedule slot is a real team, not a placeholder. */
async function createAllTeams(env: Env) {
  const palette = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7"];
  for (let i = 0; i < 5; i++) {
    await createTeam(env, `Team ${i + 1}`, palette[i]);
  }
}

describe("PUT /api/matches/:id/result", () => {
  it("records a winner and it persists in the schedule", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const schedule = await getSchedule(env);
    const match = schedule[0].matches[0]; // round 1: team 2 vs team 5

    const res = await putResult(env, match.id, match.teamA.number);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: number; winnerTeamNumber: number; recordedAt: string };
    expect(body).toMatchObject({ id: match.id, winnerTeamNumber: match.teamA.number });
    expect(body.recordedAt).toEqual(expect.any(String));

    const after = await getSchedule(env);
    const updatedMatch = after[0].matches[0];
    expect(updatedMatch.winnerTeamNumber).toBe(match.teamA.number);
    expect(updatedMatch.recordedAt).not.toBeNull();
  });

  it("rejects a winner that isn't one of the match's two teams", async () => {
    const env = testEnv();
    const schedule = await getSchedule(env);
    const match = schedule[0].matches[0];

    const res = await putResult(env, match.id, 999);
    expect(res.status).toBe(400);
  });

  it("returns 404 for a match that doesn't exist", async () => {
    const env = testEnv();
    const res = await putResult(env, 999, 1);
    expect(res.status).toBe(404);
  });

  it("returns 400 for a non-integer winner_team_number", async () => {
    const env = testEnv();
    const schedule = await getSchedule(env);
    const match = schedule[0].matches[0];

    const res = await putResult(env, match.id, "not-a-number");
    expect(res.status).toBe(400);
  });

  it("rejects recording a result when a team slot is still a placeholder", async () => {
    const env = testEnv();
    const schedule = await getSchedule(env);
    const match = schedule[0].matches[0]; // neither team 2 nor team 5 has been created

    const res = await putResult(env, match.id, match.teamA.number);
    expect(res.status).toBe(400);
  });

  it("allows correcting an already-recorded result with no prompt or restriction", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const schedule = await getSchedule(env);
    const match = schedule[0].matches[0];

    await putResult(env, match.id, match.teamA.number);
    const res = await putResult(env, match.id, match.teamB.number);
    expect(res.status).toBe(200);

    const after = await getSchedule(env);
    expect(after[0].matches[0].winnerTeamNumber).toBe(match.teamB.number);
  });
});

describe("DELETE /api/matches/:id/result", () => {
  it("clears a recorded result", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const schedule = await getSchedule(env);
    const match = schedule[0].matches[0];
    await putResult(env, match.id, match.teamA.number);

    const res = await deleteResult(env, match.id);
    expect(res.status).toBe(200);

    const after = await getSchedule(env);
    const cleared = after[0].matches[0];
    expect(cleared.winnerTeamNumber).toBeNull();
    expect(cleared.recordedAt).toBeNull();
  });

  it("is idempotent when no result was ever recorded", async () => {
    const env = testEnv();
    const schedule = await getSchedule(env);
    const match = schedule[0].matches[0];

    const res = await deleteResult(env, match.id);
    expect(res.status).toBe(200);
  });

  it("returns 404 for a match that doesn't exist", async () => {
    const env = testEnv();
    const res = await deleteResult(env, 999);
    expect(res.status).toBe(404);
  });
});
