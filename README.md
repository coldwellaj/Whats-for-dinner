# What's for Dinner?

A full-stack app for documenting recipes, planning meals for the week, generating a shopping
list from that plan, favoriting recipes, and tracking how long it's been since each recipe was
last made. Recipes can also be marked shareable so other users can discover, view, and copy them
into their own collection.

## Stack

- **Client**: React + Vite + TypeScript, React Router, TanStack Query, Tailwind CSS
- **Server**: Node + Express + TypeScript, REST API
- **Database**: PostgreSQL via Prisma ORM (e.g. [Neon](https://neon.tech))
- **Auth**: Email/password, or Google Sign-In

## Getting started

1. **Install dependencies** (npm workspaces — this installs both `client/` and `server/`):

   ```bash
   npm install
   ```

2. **Configure environment variables.**

   Copy `server/.env.example` to `server/.env` and fill in:

   | Variable                | Required | Notes                                                             |
   | ------------------------ | -------- | ------------------------------------------------------------------ |
   | `Database_DATABASE_URL` | yes      | PostgreSQL connection string                                       |
   | `SESSION_SECRET`        | yes      | Any long random string, used to sign session cookies               |
   | `GOOGLE_CLIENT_ID`      | yes      | Google OAuth client ID — see [Google sign-in setup](#google-sign-in-setup-optional) |
   | `PORT`                  | no       | Defaults to `3001`                                                  |

   Copy `client/.env.example` to `client/.env` and fill in:

   | Variable               | Required | Notes                                                                                         |
   | ----------------------- | -------- | ----------------------------------------------------------------------------------------------- |
   | `VITE_GOOGLE_CLIENT_ID` | yes      | The client app throws on startup if this is unset. Must match `GOOGLE_CLIENT_ID` above exactly. |

   `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` are required for the app to boot even if you only
   plan to use email/password login locally — a placeholder value is enough to start the app; the
   "Sign in with Google" button just won't work until it's a real client ID.

3. **Set up the database:**

   ```bash
   npm run prisma:migrate           # applies the schema to Database_DATABASE_URL
   npm run prisma:seed -w server    # optional: seeds 2 example shared recipes so Discover isn't empty
   ```

4. **Run the app:**

   ```bash
   npm run dev   # runs the API on :3001 and the client on :5173
   ```

   Open http://localhost:5173 and sign up with an email/password, or sign in with Google if
   you've configured it.

## Google sign-in setup (optional)

Email/password sign-up works without any Google configuration. To also enable "Sign in with
Google":

1. In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an
   OAuth 2.0 Client ID (Web application type).
2. Add `http://localhost:5173` as an Authorized JavaScript origin for local dev (and your
   production URL once deployed).
3. Use that client ID as both `GOOGLE_CLIENT_ID` (`server/.env`) and `VITE_GOOGLE_CLIENT_ID`
   (`client/.env`) — the server verifies Google tokens against this ID, so the two must match.

## Project layout

- `server/` — Express API, Prisma schema/migrations/seed (`server/prisma/`)
- `client/` — React app (pages in `client/src/pages`, API hooks in `client/src/api`)

## Deploying

The app deploys as two separate Vercel projects from this repo:

- **Client** — root `vercel.json` builds `client/` as a static Vite app and rewrites `/api/*`
  requests to the deployed server's URL. Update that `destination` if your server's URL differs.
- **Server** — `server/vercel.json` deploys the Express app as a serverless function
  (`server/api/index.ts`). Its `build` script runs `prisma migrate deploy` automatically, so
  pending migrations apply on every deploy.

Set the same environment variables from [Getting started](#getting-started) on each Vercel
project (the client project only needs `VITE_GOOGLE_CLIENT_ID`).

## Data model notes

- A recipe's "days since last made" is computed from the most recent meal-plan entry for that
  recipe with status `MADE` (entries default to `PLANNED`; click a meal plan pill to cycle
  planned → made → skipped).
- The shopping list for a week is generated from that week's planned meals by summing matching
  ingredients (same name + unit). Checked-off state and manually added items persist per week;
  the recipe-derived portion is recomputed whenever the list is viewed or the plan changes.
- Recipes are scoped to a family once you're in one (see the Family page); until then they're
  scoped to you personally. Marking a recipe "shareable" makes it visible to any signed-in user
  on the Discover page, regardless of scope; saving a copy duplicates it into your own scope as
  a private, independently editable recipe. `saveCount` (how many times a shared recipe has been
  copied) drives Discover's "Most popular" sort.
