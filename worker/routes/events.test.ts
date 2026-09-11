import { describe, expect, it } from "vitest";
import app from "../index";
import { createFakeD1 } from "../../test/fakeD1";
import type { Env } from "../env";
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

/** Identity ranking (team N placed Nth), with per-team overrides for building ties. */
function ranking(overrides: Record<number, number> = {}): EventPlacement[] {
  return [1, 2, 3, 4, 5].map((teamNumber) => ({ teamNumber, rank: overrides[teamNumber] ?? teamNumber }));
}

function createEvent(env: Env, name: string, placements: EventPlacement[] = ranking()) {
  return app.request(
    "/api/events",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, placements }),
    },
    env,
  );
}

function patchEvent(env: Env, id: number, body: unknown) {
  return app.request(
    `/api/events/${id}`,
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    env,
  );
}

function deleteEvent(env: Env, id: number) {
  return app.request(`/api/events/${id}`, { method: "DELETE" }, env);
}

function getEvent(env: Env, id: number) {
  return app.request(`/api/events/${id}`, {}, env);
}

function listEvents(env: Env) {
  return app.request("/api/events", {}, env);
}

function getTeamEvents(env: Env, teamNumber: number) {
  return app.request(`/api/teams/${teamNumber}/events`, {}, env);
}

describe("POST /api/events", () => {
  it("creates an event with 5 placements", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const res = await createEvent(env, "Kubb tournament");
    expect(res.status).toBe(201);
    const body = (await res.json()) as Event;
    expect(body.name).toBe("Kubb tournament");
    expect(body.placements).toEqual(expect.arrayContaining(ranking()));
    expect(typeof body.id).toBe("number");
  });

  it("allows duplicate ranks to represent a tie", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const placements = ranking({ 1: 1, 2: 1, 3: 3, 4: 4, 5: 4 });
    const res = await createEvent(env, "Tied event", placements);
    expect(res.status).toBe(201);
    const body = (await res.json()) as Event;
    expect(body.placements).toEqual(expect.arrayContaining(placements));
  });

  it("rejects a missing/empty name", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const res = await createEvent(env, "   ");
    expect(res.status).toBe(400);
  });

  it("rejects fewer than 5 placements", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const res = await createEvent(env, "Short", ranking().slice(0, 4));
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate team number", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const placements = [
      { teamNumber: 1, rank: 1 },
      { teamNumber: 1, rank: 2 },
      { teamNumber: 3, rank: 3 },
      { teamNumber: 4, rank: 4 },
      { teamNumber: 5, rank: 5 },
    ];
    const res = await createEvent(env, "Dup team", placements);
    expect(res.status).toBe(400);
  });

  it("rejects placements that don't cover all 5 teams", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const placements = [
      { teamNumber: 1, rank: 1 },
      { teamNumber: 2, rank: 2 },
      { teamNumber: 3, rank: 3 },
      { teamNumber: 4, rank: 4 },
      { teamNumber: 6, rank: 5 },
    ];
    const res = await createEvent(env, "Missing team", placements);
    expect(res.status).toBe(400);
  });

  it("rejects a rank out of range", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const res = await createEvent(env, "Bad rank", ranking({ 1: 6 }));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/events", () => {
  it("returns an empty list before any event is created", async () => {
    const env = testEnv();
    const res = await listEvents(env);
    expect(await res.json()).toEqual([]);
  });

  it("lists created events, each with its placements, ordered by creation", async () => {
    const env = testEnv();
    await createAllTeams(env);
    await createEvent(env, "Kubb");
    await createEvent(env, "Flunkyball");

    const res = await listEvents(env);
    const body = (await res.json()) as Event[];
    expect(body.map((e) => e.name)).toEqual(["Kubb", "Flunkyball"]);
    expect(body[0].placements).toHaveLength(5);
  });
});

describe("GET /api/events/:id", () => {
  it("returns a single event", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const created = (await (await createEvent(env, "Kubb")).json()) as Event;

    const res = await getEvent(env, created.id);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ name: "Kubb" });
  });

  it("returns 404 for an event that doesn't exist", async () => {
    const env = testEnv();
    const res = await getEvent(env, 9999);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/events/:id", () => {
  it("updates the name", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const created = (await (await createEvent(env, "Kubb")).json()) as Event;

    const res = await patchEvent(env, created.id, { name: "Kubb finals" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Event;
    expect(body.name).toBe("Kubb finals");
    expect(body.placements).toEqual(expect.arrayContaining(ranking()));
  });

  it("replaces the placements", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const created = (await (await createEvent(env, "Kubb")).json()) as Event;
    const newPlacements = ranking({ 1: 5, 5: 1 });

    const res = await patchEvent(env, created.id, { placements: newPlacements });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Event;
    expect(body.placements).toEqual(expect.arrayContaining(newPlacements));
  });

  it("rejects invalid placements", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const created = (await (await createEvent(env, "Kubb")).json()) as Event;

    const res = await patchEvent(env, created.id, { placements: ranking().slice(0, 3) });
    expect(res.status).toBe(400);
  });

  it("returns 404 for an event that doesn't exist", async () => {
    const env = testEnv();
    const res = await patchEvent(env, 9999, { name: "Nope" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/events/:id", () => {
  it("removes the event and its placements", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const created = (await (await createEvent(env, "Kubb")).json()) as Event;

    const res = await deleteEvent(env, created.id);
    expect(res.status).toBe(200);

    const listRes = await listEvents(env);
    expect(await listRes.json()).toEqual([]);
  });

  it("returns 404 for an event that doesn't exist", async () => {
    const env = testEnv();
    const res = await deleteEvent(env, 9999);
    expect(res.status).toBe(404);
  });
});

describe("GET /api/teams/:number/events", () => {
  it("returns a team's event history with points derived from rank, ordered by creation", async () => {
    const env = testEnv();
    await createAllTeams(env);
    await createEvent(env, "Kubb", ranking({ 1: 2 }));
    await createEvent(env, "Flunkyball", ranking({ 1: 1 }));

    const res = await getTeamEvents(env, 1);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { eventName: string; rank: number; points: number }[];
    expect(body.map(({ eventName, rank, points }) => ({ eventName, rank, points }))).toEqual([
      { eventName: "Kubb", rank: 2, points: 7 },
      { eventName: "Flunkyball", rank: 1, points: 10 },
    ]);
  });

  it("returns an empty list for a team with no event history", async () => {
    const env = testEnv();
    await createAllTeams(env);
    const res = await getTeamEvents(env, 1);
    expect(await res.json()).toEqual([]);
  });

  it("returns 404 for a team that doesn't exist", async () => {
    const env = testEnv();
    const res = await getTeamEvents(env, 99);
    expect(res.status).toBe(404);
  });
});
