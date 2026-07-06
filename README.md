# PayPath

Personal finance dashboard: track income, expenses, debts, and liquid assets; get computed taxes, net worth, debt payoff timelines, cash flow projections, and AI-powered insights.

Monorepo with two apps:

```
backend/    Go JSON REST API (net/http + MongoDB), serves on :8000
frontend/   Next.js 16 + React 19 web app, serves on :3000
docs/       design notes
```

## Quick start

### Docker (whole stack)

```bash
cp backend/.env.example backend/.env   # backend config — see variables below
docker compose up --build
```

The backend container reads its config from `backend/.env` — point `MONGODB_URI` at your MongoDB (e.g. an Atlas URI). A `localhost` URI won't work from inside a container; use `host.docker.internal` to reach a Mongo running on the host.

### Docker (fully local: backend + frontend + Mongo)

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

Adds a bundled MongoDB container and points the backend at it, overriding `MONGODB_URI` from `backend/.env` (everything else in the file still applies). Data persists in the `mongo_data` volume, and Mongo is published on `localhost:27017` for mongosh/Compass (`mongodb://admin:secret_password@localhost:27017`).

### 1. Backend (Go 1.22+)

```bash
cd backend
cp .env.example .env   # or create .env — see variables below
make run               # builds and serves the API on :8000
```

Environment (read from `.env` or the shell):

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection string (Atlas or local) |
| `JWT_SECRET` | Signing key for auth tokens |
| `FRONTEND_URL` | Allowed CORS origin (e.g. `http://localhost:3000`) |
| `HTTP_ADDR` | Listen address (default `:8000`) |
| `ENV` | `development` / `production` |
| `OPENAI_API_KEY` | Enables the `/api/ai/*` insight endpoints (optional) |

On first run the backend seeds demo data from `backend/seed/*.csv`. `make reseed` drops the database so it re-seeds on next start.

### 2. Frontend (Node 24)

```bash
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000/api
npm install
make dev                     # next dev on :3000
```

## Architecture

- **Backend** is a layered, feature-folder Go module: thin HTTP handlers call per-feature services (`income`, `expenses`, `debts`, `auth`, `reporting`, `ai/*`, etc.), which depend on repository interfaces over MongoDB, with an in-memory TTL cache and singleflight read-collapsing. JWT + bcrypt auth. See `backend/README.md`.
- **Frontend** is a Next.js App Router app: dashboard, explore (payoff / scenarios / cashflow / AI insights), calendar, and settings pages, calling the API via a small fetch wrapper with client-side caching. See `frontend/README.md`.

## Testing

```bash
cd backend
make test        # go test ./... — Mongo repository tests skip unless MONGODB_URI is set
```