import { Hono } from "hono";
import type { Env } from "./env";
import { teams } from "./routes/teams";
import { schedule } from "./routes/schedule";

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api/teams", teams);
app.route("/api/schedule", schedule);

// Anything else falls through to the static assets binding, which applies
// the single-page-application fallback (serves index.html) for unknown paths.
app.get("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
