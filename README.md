# PayPath

Personal finance dashboard: track income, expenses, debts, and liquid assets; get computed taxes, net worth, debt payoff timelines, cash-flow projections, a bill & income calendar, trend visualizations, and AI-powered insights.

Monorepo with two apps:

```
backend/    Go JSON REST API (net/http + MongoDB), serves on :8000
frontend/   Next.js 16 + React 19 web app, serves on :3000
docs/       design notes
```

## Quick start

All local config lives in one `.env` at the repo root:

```bash
cp .env.example .env 
docker compose up --build
```

`MONGODB_URI` is the mode switch: leave it blank to use a bundled MongoDB container (docker compose starts it automatically), or set it to your own database (e.g. an Atlas URI) and the Mongo container is skipped.

### Docker (whole stack)

```bash
docker compose up --build
```

When the bundled Mongo runs, its data persists in the `mongo_data` volume and it's published on `localhost:27017` for mongosh/Compass (`mongodb://admin:secret_password@localhost:27017`). If you point `MONGODB_URI` at a Mongo running on the host, use `host.docker.internal` — `localhost` inside a container is the container itself.

### Docker (one service)

```bash
docker compose up --build backend   
docker compose up --build frontend  
docker compose up -d mongo 
```

### Make shortcuts

| Target | What it does |
|--------|--------------|
| `make up` / `make down` | Whole stack up / down |
| `make backend` | API (+ bundled Mongo when needed) |
| `make frontend` | Web app container |
| `make mongo` | Just the database, detached |
| `make dev-backend` | Bare-metal API: `cd backend && make run` |
| `make dev-frontend` | `cd frontend && make dev` |
| `make test` | `cd backend && make test` |

### 1. Backend (Go 1.26)

```bash
cd backend
make run 
```

Reads `.env` from the repo root. Bare-metal runs need `MONGODB_URI` set — either your own URI, or start just the bundled database with `docker compose up -d mongo` and use `mongodb://admin:secret_password@localhost:27017`.

Environment (read from the root `.env` or the shell):

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection string (Atlas or local) |
| `JWT_SECRET` | Signing key for auth tokens |
| `FRONTEND_URL` | Allowed CORS origin (e.g. `http://localhost:3000`) |
| `HTTP_ADDR` | Listen address (default `:8000`) |
| `ENV` | `development` / `production` |
| `OPENAI_API_KEY` | Enables the `/api/ai/*` insight endpoints (optional) |

On first run the backend seeds demo data from `backend/seed/*.csv`. `make reseed` drops the database so it re-seeds on next start.

### 2. Frontend (Node 20+)

Next.js 16 requires Node ≥ 20.9 (`.nvmrc` pins 20; the Docker image uses Node 24).

```bash
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000/api
npm install
make dev                     # next dev on :3000
```

Fonts are self-hosted via `next/font` (no external Google Fonts request).

## Architecture

- **Backend** is a layered, feature-folder Go module: thin HTTP handlers call per-feature services (`income`, `expenses`, `debts`, `auth`, `reporting`, `ai/*`, etc.), which depend on repository interfaces over MongoDB, with an in-memory TTL cache and singleflight read-collapsing. JWT + bcrypt auth. See `backend/README.md`.
- **Frontend** is a Next.js App Router app: a dashboard, an Explore section (debt payoff, cash flow, pay & tax breakdowns, trend charts, and AI insights), a bill & income calendar with per-occurrence edits (move a bill, log a one-time payment, or override a paycheck's actual amount for one day), and settings — calling the API via a small fetch wrapper with client-side caching. Recharts powers the visualizations. See `frontend/README.md`.

## Deployment

The two apps deploy independently to separate hosts, plus a managed database:

- **Frontend → Vercel.** In the Vercel project set **Root Directory** to `frontend` — this is a monorepo, so Vercel must build from the sub-directory (a root build fails with "build script … calls `next build`"). Add the build-time env var `NEXT_PUBLIC_API_URL` = the deployed backend, e.g. `https://<your-backend>.onrender.com/api`. Vercel auto-detects Next.js and runs `next build`; no `output` override is needed.
- **Backend → Render.** Deploy `backend/` as a Docker web service (uses `backend/Dockerfile`, listening on `:8000`). Set the environment variables from the table above — at minimum `MONGODB_URI`, `JWT_SECRET`, and `FRONTEND_URL` (the Vercel origin, so CORS allows it).
- **Database → MongoDB Atlas.** Point `MONGODB_URI` at your Atlas cluster; the backend seeds demo data on first run against an empty database.

Both services build from `main`, so pushing redeploys the affected side. `NEXT_PUBLIC_*` values are inlined at build time, so changing the API URL requires a frontend rebuild.

## Testing

```bash
cd backend
make test        # go test ./... — Mongo repository tests skip unless MONGODB_URI is set
```
