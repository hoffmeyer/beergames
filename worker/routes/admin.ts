import { Hono } from "hono";
import type { Env } from "../env";

export const admin = new Hono<{ Bindings: Env }>();

// Wipes everything specific to one tournament run — teams, recorded match
// results, bonus points, and events — so the fixed schedule (rounds/matches
// rows) is ready for 5 fresh teams. Events and bonus points are deleted
// before teams to satisfy their foreign keys to teams.
admin.post("/admin/reset", async (c) => {
  await c.env.DB.prepare("DELETE FROM event_placements").run();
  await c.env.DB.prepare("DELETE FROM events").run();
  await c.env.DB.prepare("DELETE FROM team_bonus_points").run();
  await c.env.DB.prepare(
    "UPDATE matches SET winner_team_number = NULL, recorded_at = NULL",
  ).run();
  await c.env.DB.prepare("DELETE FROM teams").run();
  return c.json({ ok: true });
});
