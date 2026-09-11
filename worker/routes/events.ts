import { Hono } from "hono";
import type { Env } from "../env";
import { POINTS_TABLE, type Event, type EventPlacement } from "../../shared/event";

const EVENT_SELECT_FIELDS = "id, name, created_at, updated_at";

type EventRow = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
};

type PlacementRow = {
  event_id: number;
  team_number: number;
  rank: number;
};

/** Points awarded for a placement rank (1-5), per the shared points table. */
export function eventPoints(rank: number): number {
  return POINTS_TABLE[rank as keyof typeof POINTS_TABLE];
}

/** True if `placements` covers all 5 teams exactly once, each with an integer rank 1-5 (duplicate ranks allowed, for ties). */
function isValidPlacements(placements: unknown): placements is EventPlacement[] {
  if (!Array.isArray(placements) || placements.length !== 5) {
    return false;
  }

  const teamNumbers = new Set<number>();
  for (const placement of placements) {
    if (typeof placement !== "object" || placement === null) {
      return false;
    }
    const { teamNumber, rank } = placement as Record<string, unknown>;
    if (!Number.isInteger(teamNumber) || !Number.isInteger(rank)) {
      return false;
    }
    if ((rank as number) < 1 || (rank as number) > 5) {
      return false;
    }
    teamNumbers.add(teamNumber as number);
  }

  return [1, 2, 3, 4, 5].every((n) => teamNumbers.has(n));
}

async function insertPlacements(env: Env, eventId: number, placements: EventPlacement[]) {
  for (const placement of placements) {
    await env.DB.prepare("INSERT INTO event_placements (event_id, team_number, rank) VALUES (?, ?, ?)")
      .bind(eventId, placement.teamNumber, placement.rank)
      .run();
  }
}

async function loadPlacements(env: Env, eventId: number): Promise<EventPlacement[]> {
  const { results } = await env.DB.prepare(
    "SELECT team_number, rank FROM event_placements WHERE event_id = ? ORDER BY team_number",
  )
    .bind(eventId)
    .all<{ team_number: number; rank: number }>();
  return results.map((row) => ({ teamNumber: row.team_number, rank: row.rank }));
}

function toEvent(row: EventRow, placements: EventPlacement[]): Event {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    placements,
  };
}

export const events = new Hono<{ Bindings: Env }>();

events.get("/events", async (c) => {
  const [{ results: eventRows }, { results: placementRows }] = await Promise.all([
    c.env.DB.prepare(`SELECT ${EVENT_SELECT_FIELDS} FROM events ORDER BY created_at`).all<EventRow>(),
    c.env.DB.prepare(
      "SELECT event_id, team_number, rank FROM event_placements ORDER BY team_number",
    ).all<PlacementRow>(),
  ]);

  const placementsByEvent = new Map<number, EventPlacement[]>();
  for (const row of placementRows) {
    const list = placementsByEvent.get(row.event_id) ?? [];
    list.push({ teamNumber: row.team_number, rank: row.rank });
    placementsByEvent.set(row.event_id, list);
  }

  return c.json(eventRows.map((row) => toEvent(row, placementsByEvent.get(row.id) ?? [])));
});

events.get("/events/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ error: "invalid event id" }, 400);
  }

  const row = await c.env.DB.prepare(`SELECT ${EVENT_SELECT_FIELDS} FROM events WHERE id = ?`)
    .bind(id)
    .first<EventRow>();
  if (!row) {
    return c.json({ error: "event not found" }, 404);
  }

  return c.json(toEvent(row, await loadPlacements(c.env, id)));
});

events.post("/events", async (c) => {
  const body = await c.req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const placements = body?.placements;

  if (!name) {
    return c.json({ error: "name is required" }, 400);
  }
  if (!isValidPlacements(placements)) {
    return c.json(
      { error: "placements must cover all 5 teams exactly once, each with a rank between 1 and 5" },
      400,
    );
  }

  const inserted = await c.env.DB.prepare(
    `INSERT INTO events (name) VALUES (?) RETURNING ${EVENT_SELECT_FIELDS}`,
  )
    .bind(name)
    .first<EventRow>();
  if (!inserted) {
    return c.json({ error: "failed to create event" }, 500);
  }

  await insertPlacements(c.env, inserted.id, placements);
  return c.json(toEvent(inserted, placements), 201);
});

events.patch("/events/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ error: "invalid event id" }, 400);
  }

  const body = await c.req.json().catch(() => null);
  if (body !== null && (typeof body !== "object" || Array.isArray(body))) {
    return c.json({ error: "request body must be a JSON object" }, 400);
  }
  const rawName = body && "name" in body ? body.name : undefined;
  const rawPlacements = body && "placements" in body ? body.placements : undefined;

  if (rawName !== undefined && (typeof rawName !== "string" || !rawName.trim())) {
    return c.json({ error: "name must be a non-empty string" }, 400);
  }
  if (rawPlacements !== undefined && !isValidPlacements(rawPlacements)) {
    return c.json(
      { error: "placements must cover all 5 teams exactly once, each with a rank between 1 and 5" },
      400,
    );
  }

  const name = rawName !== undefined ? rawName.trim() : null;
  const updated = await c.env.DB.prepare(
    `UPDATE events
     SET name = COALESCE(?, name),
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = ?
     RETURNING ${EVENT_SELECT_FIELDS}`,
  )
    .bind(name, id)
    .first<EventRow>();

  if (!updated) {
    return c.json({ error: "event not found" }, 404);
  }

  let placements: EventPlacement[];
  if (rawPlacements !== undefined) {
    await c.env.DB.prepare("DELETE FROM event_placements WHERE event_id = ?").bind(id).run();
    await insertPlacements(c.env, id, rawPlacements);
    placements = rawPlacements;
  } else {
    placements = await loadPlacements(c.env, id);
  }

  return c.json(toEvent(updated, placements));
});

events.delete("/events/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ error: "invalid event id" }, 400);
  }

  const placements = await loadPlacements(c.env, id);
  await c.env.DB.prepare("DELETE FROM event_placements WHERE event_id = ?").bind(id).run();

  const deleted = await c.env.DB.prepare(
    `DELETE FROM events WHERE id = ? RETURNING ${EVENT_SELECT_FIELDS}`,
  )
    .bind(id)
    .first<EventRow>();

  if (!deleted) {
    return c.json({ error: "event not found" }, 404);
  }
  return c.json(toEvent(deleted, placements));
});

events.get("/teams/:number/events", async (c) => {
  const teamNumber = Number(c.req.param("number"));
  if (!Number.isInteger(teamNumber)) {
    return c.json({ error: "invalid team number" }, 400);
  }

  const team = await c.env.DB.prepare("SELECT number FROM teams WHERE number = ?").bind(teamNumber).first();
  if (!team) {
    return c.json({ error: "team not found" }, 404);
  }

  const { results } = await c.env.DB.prepare(
    `SELECT e.id AS event_id, e.name AS event_name, ep.rank AS rank
     FROM event_placements ep
     JOIN events e ON e.id = ep.event_id
     WHERE ep.team_number = ?
     ORDER BY e.created_at`,
  )
    .bind(teamNumber)
    .all<{ event_id: number; event_name: string; rank: number }>();

  return c.json(
    results.map((row) => ({
      eventId: row.event_id,
      eventName: row.event_name,
      rank: row.rank,
      points: eventPoints(row.rank),
    })),
  );
});
