import { Hono } from "hono";
import type { Env } from "../env";
import type { TeamBonusPoint } from "../../shared/team-bonus-point";

const SELECT_FIELDS = "id, team_number, points, description, created_at, updated_at";

/** True if `points` is a valid bonus-point value: a positive integer. */
function isValidPoints(points: unknown): points is number {
  return Number.isInteger(points) && (points as number) > 0;
}

async function teamExists(env: Env, teamNumber: number): Promise<boolean> {
  const team = await env.DB.prepare("SELECT number FROM teams WHERE number = ?")
    .bind(teamNumber)
    .first();
  return team !== null;
}

export const teamBonusPoints = new Hono<{ Bindings: Env }>();

teamBonusPoints.get("/teams/:number/bonus-points", async (c) => {
  const teamNumber = Number(c.req.param("number"));
  if (!Number.isInteger(teamNumber)) {
    return c.json({ error: "invalid team number" }, 400);
  }
  if (!(await teamExists(c.env, teamNumber))) {
    return c.json({ error: "team not found" }, 404);
  }

  const { results } = await c.env.DB.prepare(
    `SELECT ${SELECT_FIELDS} FROM team_bonus_points WHERE team_number = ? ORDER BY created_at`,
  )
    .bind(teamNumber)
    .all<TeamBonusPoint>();
  return c.json(results);
});

teamBonusPoints.post("/teams/:number/bonus-points", async (c) => {
  const teamNumber = Number(c.req.param("number"));
  if (!Number.isInteger(teamNumber)) {
    return c.json({ error: "invalid team number" }, 400);
  }

  const body = await c.req.json().catch(() => null);
  const points = body?.points;
  const description = typeof body?.description === "string" ? body.description.trim() : "";

  if (!isValidPoints(points)) {
    return c.json({ error: "points must be a positive integer" }, 400);
  }
  if (!description) {
    return c.json({ error: "description is required" }, 400);
  }
  if (!(await teamExists(c.env, teamNumber))) {
    return c.json({ error: "team not found" }, 404);
  }

  const inserted = await c.env.DB.prepare(
    `INSERT INTO team_bonus_points (team_number, points, description)
     VALUES (?, ?, ?)
     RETURNING ${SELECT_FIELDS}`,
  )
    .bind(teamNumber, points, description)
    .first<TeamBonusPoint>();

  return c.json(inserted, 201);
});

teamBonusPoints.patch("/bonus-points/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ error: "invalid id" }, 400);
  }

  const body = await c.req.json().catch(() => null);
  if (body !== null && (typeof body !== "object" || Array.isArray(body))) {
    return c.json({ error: "request body must be a JSON object" }, 400);
  }
  const rawPoints = body && "points" in body ? body.points : undefined;
  const rawDescription = body && "description" in body ? body.description : undefined;

  if (rawPoints !== undefined && !isValidPoints(rawPoints)) {
    return c.json({ error: "points must be a positive integer" }, 400);
  }
  if (rawDescription !== undefined && (typeof rawDescription !== "string" || !rawDescription.trim())) {
    return c.json({ error: "description must be a non-empty string" }, 400);
  }

  const points = rawPoints !== undefined ? rawPoints : null;
  const description = rawDescription !== undefined ? rawDescription.trim() : null;

  const updated = await c.env.DB.prepare(
    `UPDATE team_bonus_points
     SET points = COALESCE(?, points),
         description = COALESCE(?, description),
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = ?
     RETURNING ${SELECT_FIELDS}`,
  )
    .bind(points, description, id)
    .first<TeamBonusPoint>();

  if (!updated) {
    return c.json({ error: "bonus point entry not found" }, 404);
  }
  return c.json(updated);
});

teamBonusPoints.delete("/bonus-points/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ error: "invalid id" }, 400);
  }

  const deleted = await c.env.DB.prepare(
    `DELETE FROM team_bonus_points WHERE id = ? RETURNING ${SELECT_FIELDS}`,
  )
    .bind(id)
    .first<TeamBonusPoint>();

  if (!deleted) {
    return c.json({ error: "bonus point entry not found" }, 404);
  }
  return c.json(deleted);
});
