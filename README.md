# Meal Planner

A full-stack app for documenting recipes, planning meals for the week, generating a shopping
list from that plan, favoriting recipes, and tracking how long it's been since each recipe was
last made.

## Stack

- **Client**: React + Vite + TypeScript, React Router, TanStack Query, Tailwind CSS
- **Server**: Node + Express + TypeScript, REST API
- **Database**: SQLite via Prisma ORM

## Getting started

```bash
npm install
npm run prisma:migrate   # first time only, creates server/prisma/dev.db
npm run dev              # runs the API on :3001 and the client on :5173
```

Open http://localhost:5173.

## Project layout

- `server/` — Express API, Prisma schema/migrations (`server/prisma/schema.prisma`)
- `client/` — React app (pages in `client/src/pages`, API hooks in `client/src/api`)

## Deploying

The app is two independently deployable pieces: build `server/` and `client/` (`npm run build`)
and serve each on your host of choice. `server/.env` holds `DATABASE_URL` and `PORT`.

SQLite works well on hosts with a persistent disk/volume (a VPS, Fly.io, Railway, Render with a
disk). If you deploy somewhere without persistent local storage (e.g. a serverless platform),
switch the Prisma datasource `provider` in `server/prisma/schema.prisma` to `postgresql`, point
`DATABASE_URL` at a hosted Postgres instance, and re-run `npx prisma migrate deploy` — no
application code changes needed.

## Data model notes

- A recipe's "days since last made" is computed from the most recent meal-plan entry for that
  recipe with status `MADE` (entries default to `PLANNED`; click a meal plan pill to cycle
  planned → made → skipped).
- The shopping list for a week is generated from that week's planned meals by summing matching
  ingredients (same name + unit). Checked-off state and manually added items persist per week;
  the recipe-derived portion is recomputed whenever the list is viewed or the plan changes.
