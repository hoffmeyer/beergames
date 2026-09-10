import { Hono } from "hono";
import type { Env } from "../env";

type MatchTeams = {
  team_a_number: number;
  team_b_number: number;
  team_a_exists: number;
  team_b_exists: number;
};

type MatchResultRow = {
  id: number;
  winner_team_number: number | null;
  recorded_at: string | null;
};

function matchResultJson(row: MatchResultRow) {
  return {
    id: row.id,
    winnerTeamNumber: row.winner_team_number,
    recordedAt: row.recorded_at,
  };
}

export const matches = new Hono<{ Bindings: Env }>();

matches.put("/:id/result", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ error: "invalid match id" }, 400);
  }

  const body = await c.req.json().catch(() => null);
  const winnerTeamNumber = body?.winner_team_number;
  if (!Number.isInteger(winnerTeamNumber)) {
    return c.json({ error: "winner_team_number is required" }, 400);
  }

  const match = await c.env.DB.prepare(
    `SELECT
       m.team_a_number                AS team_a_number,
       m.team_b_number                AS team_b_number,
       (ta.number IS NOT NULL)        AS team_a_exists,
       (tb.number IS NOT NULL)        AS team_b_exists
     FROM matches m
     LEFT JOIN teams ta ON ta.number = m.team_a_number
     LEFT JOIN teams tb ON tb.number = m.team_b_number
     WHERE m.id = ?`,
  )
    .bind(id)
    .first<MatchTeams>();

  if (!match) {
    return c.json({ error: "match not found" }, 404);
  }
  if (winnerTeamNumber !== match.team_a_number && winnerTeamNumber !== match.team_b_number) {
    return c.json({ error: "winner_team_number must be one of the match's two teams" }, 400);
  }
  if (!match.team_a_exists || !match.team_b_exists) {
    return c.json(
      { error: "cannot record a result for a match with a team that hasn't been created yet" },
      400,
    );
  }

  const updated = await c.env.DB.prepare(
    `UPDATE matches
     SET winner_team_number = ?, recorded_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = ?
     RETURNING id, winner_team_number, recorded_at`,
  )
    .bind(winnerTeamNumber, id)
    .first<MatchResultRow>();

  return c.json(matchResultJson(updated!));
});

matches.delete("/:id/result", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ error: "invalid match id" }, 400);
  }

  const updated = await c.env.DB.prepare(
    `UPDATE matches
     SET winner_team_number = NULL, recorded_at = NULL
     WHERE id = ?
     RETURNING id, winner_team_number, recorded_at`,
  )
    .bind(id)
    .first<MatchResultRow>();

  if (!updated) {
    return c.json({ error: "match not found" }, 404);
  }

  return c.json(matchResultJson(updated));
});
