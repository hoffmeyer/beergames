# Beerlympiad

A mobile-friendly tournament app for a 5-team, 3-event bachelor party tournament (Kubb,
Flunkyball, Tug of War). Anyone can manage teams, view the fixed schedule, record match
winners, and watch a live leaderboard — no accounts, no passwords. See `spec.md` and
`plan.md` for the full design, and `tournament-schedule.md` for the tournament rules.

## Tech stack

- **Frontend:** Vite + React + TypeScript, React Router, TanStack Query, Tailwind CSS.
- **Backend:** Hono, running in a single Cloudflare Worker alongside the static assets.
- **Storage:** Cloudflare D1 (SQLite).

Everything ships as one Cloudflare Worker — no separate frontend host, no CORS config.

## Prerequisites

- Node.js 20+
- A Cloudflare account
- `npx wrangler login` (run once, to authenticate the Wrangler CLI used below)

## Local development

```bash
npm install
npm run dev
```

This starts Vite with the Cloudflare plugin, which runs the Worker and serves the app at
the printed local URL. The Worker uses a local D1 database (via Miniflare) that's created
automatically the first time migrations are applied:

```bash
npx wrangler d1 migrations apply beerlympiad --local
```

Re-run that command whenever a new file is added to `migrations/`. To wipe local data and
start over, use `npm run db:reset`.

## First-time production setup

These steps are only needed once, when deploying to a fresh Cloudflare account/database.

1. **Create the D1 database:**

   ```bash
   npx wrangler d1 create beerlympiad
   ```

   This prints a `database_id`. Copy it into `wrangler.toml`, replacing
   `REPLACE_WITH_D1_DATABASE_ID` in the `[[d1_databases]]` block.

2. **Apply migrations to the remote database:**

   ```bash
   npx wrangler d1 migrations apply beerlympiad --remote
   ```

   This creates the `teams`, `rounds`, and `matches` tables and seeds the fixed
   tournament schedule. Team rows are created later through the app itself (Teams tab).

3. **Deploy:**

   ```bash
   npm run deploy
   ```

   This builds the frontend and deploys the Worker (static assets + API) as a single
   unit. Wrangler prints the deployed URL when it finishes.

4. **Verify:** visit `<deployed-url>/api/health` and confirm it returns `{"ok":true}`,
   then open the app and create the 5 teams in the order intended to fill schedule slots
   A-E (see `tournament-schedule.md`).

## Subsequent deploys

Once the database exists and `wrangler.toml` has its real `database_id`:

```bash
npx wrangler d1 migrations apply beerlympiad --remote   # only if migrations/ changed
npm run deploy
```

## Scripts

| Script                | Purpose                                                  |
| ---------------------- | --------------------------------------------------------- |
| `npm run dev`          | Local dev server (Vite + Worker + local D1)               |
| `npm run build`        | Type-check and build the frontend + Worker bundle          |
| `npm run deploy`       | Build and deploy to Cloudflare                             |
| `npm run test`         | Run the test suite once                                    |
| `npm run test:watch`   | Run tests in watch mode                                    |
| `npm run typecheck`    | Type-check without emitting                                 |
| `npm run db:reset`     | Wipe local D1 state and re-apply migrations locally          |
