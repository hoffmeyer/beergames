import { Hono } from "hono";
import type { Env } from "../env";
import { isValidTeamColor } from "../../shared/palette";
import type { Team } from "../../shared/team";

const SELECT_TEAM_FIELDS = "number, name, color, created_at, updated_at";

/** True if `err` is D1's constraint-violation error for the teams.color UNIQUE index. */
function isColorUniqueViolation(err: unknown): boolean {
  return err instanceof Error && /UNIQUE constraint failed.*teams\.color/i.test(err.message);
}

export const teams = new Hono<{ Bindings: Env }>();

teams.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT ${SELECT_TEAM_FIELDS} FROM teams ORDER BY number`,
  ).all<Team>();
  return c.json(results);
});

teams.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const color = typeof body?.color === "string" ? body.color : "";

  if (!name) {
    return c.json({ error: "name is required" }, 400);
  }
  if (!isValidTeamColor(color)) {
    return c.json({ error: "color must be one of the palette colors" }, 400);
  }

  // The number assignment, the 5-team cap, and the insert all happen in one
  // statement so concurrent requests can't race each other onto the same
  // number or past the cap: HAVING COUNT(*) < 5 makes the SELECT (and thus
  // the INSERT) produce zero rows once 5 teams already exist.
  try {
    const inserted = await c.env.DB.prepare(
      `INSERT INTO teams (number, name, color)
       SELECT COALESCE(MAX(number), 0) + 1, ?, ?
       FROM teams
       HAVING COUNT(*) < 5
       RETURNING ${SELECT_TEAM_FIELDS}`,
    )
      .bind(name, color)
      .first<Team>();

    if (!inserted) {
      return c.json({ error: "all 5 teams already created" }, 409);
    }
    return c.json(inserted, 201);
  } catch (err) {
    if (isColorUniqueViolation(err)) {
      return c.json({ error: "color already taken" }, 409);
    }
    throw err;
  }
});

teams.patch("/:number", async (c) => {
  const number = Number(c.req.param("number"));
  if (!Number.isInteger(number)) {
    return c.json({ error: "invalid team number" }, 400);
  }

  const body = await c.req.json().catch(() => null);
  if (body !== null && (typeof body !== "object" || Array.isArray(body))) {
    return c.json({ error: "request body must be a JSON object" }, 400);
  }
  const rawName = body && "name" in body ? body.name : undefined;
  const rawColor = body && "color" in body ? body.color : undefined;

  if (rawName !== undefined && (typeof rawName !== "string" || !rawName.trim())) {
    return c.json({ error: "name must be a non-empty string" }, 400);
  }
  if (rawColor !== undefined && !isValidTeamColor(rawColor)) {
    return c.json({ error: "color must be one of the palette colors" }, 400);
  }

  const name = rawName !== undefined ? rawName.trim() : null;
  const color = rawColor !== undefined ? rawColor : null;

  try {
    // COALESCE lets untouched fields fall back to their current value in the
    // same statement, so there's no separate read-then-write race window.
    const updated = await c.env.DB.prepare(
      `UPDATE teams
       SET name = COALESCE(?, name),
           color = COALESCE(?, color),
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE number = ?
       RETURNING ${SELECT_TEAM_FIELDS}`,
    )
      .bind(name, color, number)
      .first<Team>();

    if (!updated) {
      return c.json({ error: "team not found" }, 404);
    }
    return c.json(updated);
  } catch (err) {
    if (isColorUniqueViolation(err)) {
      return c.json({ error: "color already taken" }, 409);
    }
    throw err;
  }
});
