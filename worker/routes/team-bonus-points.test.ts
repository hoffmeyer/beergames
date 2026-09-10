import { beforeEach, describe, expect, it } from "vitest";
import app from "../index";
import { createFakeD1 } from "../../test/fakeD1";
import type { Env } from "../env";
import type { TeamBonusPoint } from "../../shared/team-bonus-point";

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

function listBonusPoints(env: Env, teamNumber: number) {
  return app.request(`/api/teams/${teamNumber}/bonus-points`, {}, env);
}

function patchBonusPoint(env: Env, id: number, body: unknown) {
  return app.request(
    `/api/bonus-points/${id}`,
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    env,
  );
}

function deleteBonusPoint(env: Env, id: number) {
  return app.request(`/api/bonus-points/${id}`, { method: "DELETE" }, env);
}

describe("POST /api/teams/:number/bonus-points", () => {
  let env: Env;

  beforeEach(async () => {
    env = testEnv();
    await createTeam(env, "Alpha", "alpha-avatar.webp");
  });

  it("creates a bonus point entry", async () => {
    const res = await addBonusPoint(env, 1, 5, "Best costume");
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ team_number: 1, points: 5, description: "Best costume" });
  });

  it("rejects a non-positive points value", async () => {
    const res = await addBonusPoint(env, 1, 0, "Free points");
    expect(res.status).toBe(400);
  });

  it("rejects a negative points value", async () => {
    const res = await addBonusPoint(env, 1, -3, "Penalty");
    expect(res.status).toBe(400);
  });

  it("rejects a non-integer points value", async () => {
    const res = await addBonusPoint(env, 1, 1.5, "Half a point");
    expect(res.status).toBe(400);
  });

  it("rejects an empty description", async () => {
    const res = await addBonusPoint(env, 1, 5, "  ");
    expect(res.status).toBe(400);
  });

  it("returns 404 for a team that doesn't exist", async () => {
    const res = await addBonusPoint(env, 99, 5, "Best costume");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/teams/:number/bonus-points", () => {
  it("lists a team's entries ordered by creation", async () => {
    const env = testEnv();
    await createTeam(env, "Alpha", "alpha-avatar.webp");
    await addBonusPoint(env, 1, 5, "Best costume");
    await addBonusPoint(env, 1, 2, "Team spirit");

    const res = await listBonusPoints(env, 1);
    const body = (await res.json()) as TeamBonusPoint[];
    expect(body.map((e) => e.description)).toEqual(["Best costume", "Team spirit"]);
  });

  it("returns an empty list for a team with no entries", async () => {
    const env = testEnv();
    await createTeam(env, "Alpha", "alpha-avatar.webp");
    const res = await listBonusPoints(env, 1);
    expect(await res.json()).toEqual([]);
  });

  it("returns 404 for a team that doesn't exist", async () => {
    const env = testEnv();
    const res = await listBonusPoints(env, 99);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/bonus-points/:id", () => {
  let env: Env;
  let entryId: number;

  beforeEach(async () => {
    env = testEnv();
    await createTeam(env, "Alpha", "alpha-avatar.webp");
    const created = (await (await addBonusPoint(env, 1, 5, "Best costume")).json()) as TeamBonusPoint;
    entryId = created.id;
  });

  it("updates the points value", async () => {
    const res = await patchBonusPoint(env, entryId, { points: 8 });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ points: 8, description: "Best costume" });
  });

  it("updates the description", async () => {
    const res = await patchBonusPoint(env, entryId, { description: "Actually team spirit" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ points: 5, description: "Actually team spirit" });
  });

  it("rejects a non-positive points value", async () => {
    const res = await patchBonusPoint(env, entryId, { points: 0 });
    expect(res.status).toBe(400);
  });

  it("rejects an empty description", async () => {
    const res = await patchBonusPoint(env, entryId, { description: "" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for an entry that doesn't exist", async () => {
    const res = await patchBonusPoint(env, 9999, { points: 3 });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/bonus-points/:id", () => {
  it("removes the entry", async () => {
    const env = testEnv();
    await createTeam(env, "Alpha", "alpha-avatar.webp");
    const created = (await (await addBonusPoint(env, 1, 5, "Best costume")).json()) as TeamBonusPoint;

    const res = await deleteBonusPoint(env, created.id);
    expect(res.status).toBe(200);

    const remaining = (await (await listBonusPoints(env, 1)).json()) as TeamBonusPoint[];
    expect(remaining).toEqual([]);
  });

  it("returns 404 for an entry that doesn't exist", async () => {
    const env = testEnv();
    const res = await deleteBonusPoint(env, 9999);
    expect(res.status).toBe(404);
  });
});
