# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"What's for Dinner?" — a full-stack app for documenting recipes, planning meals for the week,
generating a shopping list from that plan, favoriting recipes, and tracking how long it's been
since each recipe was last made. Recipes can be marked shareable so other users can discover,
view, and copy them into their own collection. Users can also add friends and (depending on
visibility settings) see each other's meal plans, recently-made recipes, and recipe lists.

## Stack

- **Client**: React + Vite + TypeScript, React Router, TanStack Query, Tailwind CSS — `client/`
- **Server**: Node + Express + TypeScript, REST API — `server/`
- **Database**: PostgreSQL via Prisma ORM (e.g. Neon)
- **Auth**: Email/password (bcrypt) or Google Sign-In, both resulting in a JWT session cookie

This is an npm workspaces monorepo (`server`, `client`).

## Commands

Run from the repo root unless noted:

```bash
npm install                      # installs both workspaces
npm run dev                      # runs API on :3001 and client on :5173 concurrently
npm run build                    # builds server then client
npm run typecheck                # typechecks server then client (no separate lint script exists)
npm run prisma:migrate           # applies Prisma schema to Database_DATABASE_URL (wraps -w server)
npm run prisma:generate          # regenerates the Prisma client (wraps -w server)
npm run prisma:seed -w server    # seeds 2 example shared recipes so Discover isn't empty
```

Per-workspace (use `-w server` / `-w client`, or `cd` into the workspace):

- `npm run dev -w server` — `tsx watch src/index.ts`
- `npm run dev -w client` — `vite`
- `npm run typecheck -w server` / `-w client` — `tsc --noEmit`
- `npm run prisma:migrate -w server` — `prisma migrate dev` (creates a new migration from schema changes)
- `npm run prisma:seed -w server` — `tsx prisma/seed.ts`

There is no test suite and no lint script in this repo — `typecheck` is the only automated
correctness check. There's also no single-test-runner command to document since there are no
tests.

## Environment variables

`server/.env` (see `server/.env.example`):
- `Database_DATABASE_URL` — PostgreSQL connection string (note the unusual `Database_` prefix)
- `SESSION_SECRET` — signs the JWT session cookie; `server/src/lib/auth.ts` throws at import time if unset
- `GOOGLE_CLIENT_ID` — must exactly match the client's `VITE_GOOGLE_CLIENT_ID`
- `PORT` — defaults to `3001`

`client/.env` (see `client/.env.example`):
- `VITE_GOOGLE_CLIENT_ID` — required; the client throws on startup if unset (a placeholder value is fine if you're only testing email/password login)

## Architecture

### Server (`server/`)

- `src/app.ts` — builds the Express app: CORS, JSON body parsing, cookie parsing, then mounts
  `/api/auth` (unauthenticated), then `requireAuth` middleware, then every other `/api/*` router.
  Every route registered after `requireAuth` requires a valid session.
- `src/index.ts` — local dev entrypoint (`app.listen`).
- `api/index.ts` — Vercel serverless entrypoint; exports the same Express `app` for
  `@vercel/node`. Keep request-handling logic in `src/`, not in `api/`.
- `src/middleware/requireAuth.ts` — verifies the session cookie, loads the user, and sets
  `req.userId` / `req.familyId` (see `src/types/express.d.ts` for the `Request` augmentation).
  Also exports `scopeWhere(req)`, the standard Prisma where-clause fragment for "rows this
  caller can see."
- `src/routes/*.ts` — one router per resource (`recipes`, `ingredients`, `mealPlan`,
  `shoppingList`, `family`, `friends`, `auth`), mounted in `app.ts`.
- `src/lib/*.ts` — shared domain logic used by routes (see "Key domain concepts" below).
- `prisma/schema.prisma` — the data model; `prisma/migrations/` holds applied migrations;
  `prisma/seed.ts` seeds example shared recipes.

### Client (`client/`)

- `src/App.tsx` — top-level routing. Shows `LoginScreen` unless `useCurrentUser()` (TanStack
  Query, from `src/api/auth.ts`) resolves a user; otherwise renders `NavBar` + `<Routes>`.
- `src/api/*.ts` — one file per resource, each wrapping `src/api/client.ts`'s `api.get/post/put/delete`
  helpers (which call `${VITE_API_URL ?? "/api"}...`) in TanStack Query hooks. This is the only
  layer that talks to the network — pages/components consume these hooks, not `fetch` directly.
- `src/pages/*.tsx` — one component per route in `App.tsx`.
- `src/components/*.tsx` — shared UI (`NavBar`, `RecipeCard`, `RecipePicker`,
  `IngredientListEditor`, `LoginScreen`, `Logo`).
- `src/lib/dates.ts`, `src/lib/units.ts` — date/week and unit-formatting helpers shared across pages.

### Key domain concepts (span both client and server — read the relevant `lib/` file before changing behavior)

- **Family scoping**: every `Recipe`, `MealPlanEntry`, and `ShoppingListItem` has both a
  `userId` and a nullable `familyId`. A user with no family is scoped to their own rows
  (`familyId: null, userId`); once in a family, they're scoped to `familyId` and share
  everything with other members. `requireAuth.scopeWhere(req)` is the canonical way to build
  this where-clause server-side — reuse it rather than re-deriving the condition. Joining a
  family (`src/lib/family.ts` `joinFamily`) migrates the user's existing personal rows onto the
  family so nothing is orphaned.
- **Recipe sharing/Discover**: `Recipe.isShared` makes a recipe visible to any signed-in user
  regardless of scope (the `/shared` routes and Discover page). Copying a shared recipe
  (`POST /:id/copy`) duplicates it into the caller's own scope and increments `saveCount`, which
  drives Discover's "Most popular" sort. `src/routes/recipes.ts` has a deliberately verbose
  `excludeOwnScope` helper working around Prisma/SQL NULL semantics (`NULL <> X` is `NULL`, not
  `true`) when excluding the caller's own scope from shared-recipe queries — read that comment
  before touching scope-exclusion logic anywhere else in the codebase.
- **Friends & visibility**: `Friendship` rows are one per pair, `PENDING` → `ACCEPTED`, queried
  symmetrically once accepted (`src/lib/friends.ts` `areFriends`). Each user has three
  independent visibility settings (`mealPlanVisibility`, `recentlyMadeVisibility`,
  `recipeListVisibility`), each one of `"ALL" | "FRIENDS" | "PRIVATE"` (default `PRIVATE`),
  checked via `canView(viewerId, targetId, visibility)`.
- **"Days since last made"**: derived, not stored — computed from the most recent
  `MealPlanEntry` with `status: "MADE"` for that recipe (`src/lib/lastMade.ts`). Entries default
  to `PLANNED`; the UI cycles a meal-plan entry planned → made → skipped.
- **Shopping list generation**: `src/lib/shoppingList.ts` `reconcileAutoShoppingListItems`
  recomputes the auto-generated portion of a week's shopping list from that week's planned
  meals, summing quantities only when ingredient + unit match (otherwise the quantity is
  dropped to `null` rather than summed incorrectly). It preserves checked state on existing
  items and removes auto items for ingredients no longer needed, while leaving manually-added
  items (`isManual: true`) untouched. This recomputation runs whenever the list is viewed or the
  plan changes — don't try to incrementally patch it from individual meal-plan mutations.
- Enums like `MealType`, `MealPlanStatus`, and `Visibility` are stored as plain strings in
  Postgres (carried over from an earlier SQLite schema) and validated application-side against
  the union types / type guards in `server/src/lib/types.ts`, not via Prisma/SQL enums.

## Deployment

Two separate Vercel projects deploy from this one repo:

- **Client** (root `vercel.json`): builds `client/` as a static Vite app; rewrites `/api/*` to
  the deployed server's URL (currently `https://api.rotisserie-app.com`) — update that
  `destination` if the server's URL changes.
- **Server** (`server/vercel.json`): deploys the Express app as a serverless function via
  `server/api/index.ts`. Its `build` script (`prisma generate && prisma migrate deploy && tsc`)
  applies pending migrations automatically on every deploy — so a merged migration goes live
  the moment the server redeploys, not at some separate manual step.
