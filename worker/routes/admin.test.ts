import { describe, expect, it } from "vitest";
import app from "../index";
import { createFakeD1 } from "../../test/fakeD1";
import type { Env } from "../env";
import type { Team } from "../../shared/team";
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

function recordResult(env: Env, matchId: number, winnerTeamNumber: number) {
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

function resetTournament(env: Env) {
  return app.request("/api/admin/reset", { method: "POST" }, env);
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

function createEvent(env: Env, name: string) {
  return app.request(
    "/api/events",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        placements: [1, 2, 3, 4, 5].map((teamNumber) => ({ teamNumber, rank: teamNumber })),
      }),
    },
    env,
  );
}

describe("POST /api/admin/reset", () => {
  it("clears teams, bonus points, match results, and events", async () => {
    const env = testEnv();
    await createAllTeams(env);
    await addBonusPoint(env, 1, 5, "Best costume");
    await recordResult(env, 1, 1);
    await createEvent(env, "Kubb");

    const res = await resetTournament(env);
    expect(res.status).toBe(200);

    const teams = (await (await app.request("/api/teams", {}, env)).json()) as Team[];
    expect(teams).toEqual([]);

    const bonusPoints = await (await app.request("/api/teams/1/bonus-points", {}, env)).json();
    expect(bonusPoints).toEqual({ error: "team not found" });

    const schedule = (await (await app.request("/api/schedule", {}, env)).json()) as ScheduleRound[];
    const firstMatch = schedule[0].matches[0];
    expect(firstMatch.winnerTeamNumber).toBeNull();

    const events = await (await app.request("/api/events", {}, env)).json();
    expect(events).toEqual([]);
  });

  it("leaves the fixed schedule rows in place", async () => {
    const env = testEnv();
    await resetTournament(env);

    const schedule = (await (await app.request("/api/schedule", {}, env)).json()) as ScheduleRound[];
    expect(schedule).toHaveLength(5);
  });
});
