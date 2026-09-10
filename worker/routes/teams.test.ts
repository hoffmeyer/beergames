import { beforeEach, describe, expect, it } from "vitest";
import app from "../index";
import { createFakeD1 } from "../../test/fakeD1";
import type { Env } from "../env";

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

describe("GET /api/teams", () => {
  it("returns an empty list before any team is created", async () => {
    const env = testEnv();
    const res = await app.request("/api/teams", {}, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns created teams ordered by number", async () => {
    const env = testEnv();
    await createTeam(env, "Alpha", "alpha-avatar.webp");
    await createTeam(env, "Bravo", "beer-avatar.webp");

    const res = await app.request("/api/teams", {}, env);
    const body = (await res.json()) as { number: number; name: string }[];
    expect(body.map((t) => [t.number, t.name])).toEqual([
      [1, "Alpha"],
      [2, "Bravo"],
    ]);
  });
});

describe("POST /api/teams", () => {
  it("assigns numbers in creation order starting at 1", async () => {
    const env = testEnv();
    const res = await createTeam(env, "Alpha", "alpha-avatar.webp");
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ number: 1, name: "Alpha", avatar: "alpha-avatar.webp" });
  });

  it("rejects a missing name", async () => {
    const env = testEnv();
    const res = await createTeam(env, "", "alpha-avatar.webp");
    expect(res.status).toBe(400);
  });

  it("rejects an avatar outside the fixed set of options", async () => {
    const env = testEnv();
    const res = await createTeam(env, "Alpha", "nonexistent-avatar.webp");
    expect(res.status).toBe(400);
  });

  it("rejects an avatar already used by another team", async () => {
    const env = testEnv();
    await createTeam(env, "Alpha", "alpha-avatar.webp");
    const res = await createTeam(env, "Bravo", "alpha-avatar.webp");
    expect(res.status).toBe(409);
  });

  it("rejects creating a 6th team", async () => {
    const env = testEnv();
    const avatars = [
      "alpha-avatar.webp",
      "beer-avatar.webp",
      "buttcrack-avatar.webp",
      "gigachad-avatar.webp",
      "heavymetal-avatar.webp",
    ];
    for (let i = 0; i < 5; i++) {
      const res = await createTeam(env, `Team ${i + 1}`, avatars[i]);
      expect(res.status).toBe(201);
    }
    const sixth = await app.request(
      "/api/teams",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Team 6", avatar: "princess-avatar.webp" }),
      },
      env,
    );
    expect(sixth.status).toBe(409);

    const list = await (await app.request("/api/teams", {}, env)).json();
    expect(list).toHaveLength(5);
  });
});

describe("PATCH /api/teams/:number", () => {
  let env: Env;

  beforeEach(async () => {
    env = testEnv();
    await createTeam(env, "Alpha", "alpha-avatar.webp");
    await createTeam(env, "Bravo", "beer-avatar.webp");
  });

  it("updates a team's name", async () => {
    const res = await app.request(
      "/api/teams/1",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Alpha Renamed" }),
      },
      env,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      number: 1,
      name: "Alpha Renamed",
      avatar: "alpha-avatar.webp",
    });
  });

  it("updates a team's avatar", async () => {
    const res = await app.request(
      "/api/teams/1",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: "buttcrack-avatar.webp" }),
      },
      env,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ avatar: "buttcrack-avatar.webp" });
  });

  it("never changes the team number", async () => {
    const res = await app.request(
      "/api/teams/1",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Still One" }),
      },
      env,
    );
    expect((await res.json() as { number: number }).number).toBe(1);
  });

  it("rejects an avatar already used by a different team", async () => {
    const res = await app.request(
      "/api/teams/1",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: "beer-avatar.webp" }),
      },
      env,
    );
    expect(res.status).toBe(409);
  });

  it("allows re-submitting a team's own current avatar", async () => {
    const res = await app.request(
      "/api/teams/1",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: "alpha-avatar.webp" }),
      },
      env,
    );
    expect(res.status).toBe(200);
  });

  it("returns 404 for a team that doesn't exist", async () => {
    const res = await app.request(
      "/api/teams/5",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Ghost" }),
      },
      env,
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 rather than crashing on a non-object JSON body", async () => {
    const res = await app.request(
      "/api/teams/1",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(42),
      },
      env,
    );
    expect(res.status).toBe(400);
  });
});
