import { Hono } from "hono";
import type { Env } from "../env";

export const admin = new Hono<{ Bindings: Env }>();

// Wipes everything specific to one tournament run — teams, recorded match
// results, and bonus points — so the fixed schedule (rounds/matches rows) is
// ready for 5 fresh teams. Bonus points are deleted before teams to satisfy
// the team_bonus_points -> teams foreign key.
admin.post("/admin/reset", async (c) => {
  await c.env.DB.prepare("DELETE FROM team_bonus_points").run();
  await c.env.DB.prepare(
    "UPDATE matches SET winner_team_number = NULL, recorded_at = NULL",
  ).run();
  await c.env.DB.prepare("DELETE FROM teams").run();
  return c.json({ ok: true });
});
