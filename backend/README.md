# PayPath Backend

Personal finance API built in Go. Tracks income, expenses, debts, and liquid assets.
Computes taxes, net worth, debt payoff timelines, and cash flow projections.
AI-powered financial insights via OpenAI. MongoDB for storage. JSON REST API consumed by a React frontend.

## Tech Stack

- **Language:** Go 1.22+
- **Router:** `net/http` (stdlib ServeMux with method routing)
- **Database:** MongoDB Atlas (`go.mongodb.org/mongo-driver/v2`)
- **AI:** OpenAI GPT-4o-mini (`github.com/sashabaranov/go-openai`)
- **Auth:** JWT (`golang-jwt/jwt/v5`) + bcrypt (`golang.org/x/crypto`)
- **Logging:** zerolog (`github.com/rs/zerolog`)

## Project Layout

```text
paypath-go/
├── cmd/api/main.go                  # entry point, signal handling
├── internal/
│   ├── config/config.go             # env-based config
│   ├── server/server.go             # HTTP server lifecycle
│   ├── logger/logger.go             # zerolog setup
│   ├── model/models.go              # struct definitions
│   ├── store/store.go               # MongoDB init, seed, queries
│   ├── finance/finance.go           # tax calc, debt payoff, cashflow
│   └── api/
│       ├── router/router.go         # route wiring, CORS, request logging
│       └── handler/
│           ├── respond.go           # JSON helpers, context user ID
│           ├── auth.go              # register, login, logout, me, delete
│           ├── expenses.go          # expense CRUD
│           ├── debts.go             # debt CRUD
│           ├── income.go            # income CRUD
│           ├── liquid.go            # liquid account CRUD
│           ├── finance.go           # summary, payoff, scenarios, cashflow, calendar
│           ├── insights.go          # AI financial insights (OpenAI)
│           ├── strategies.go        # AI strategies: debt, savings, expense, income
│           └── bundle.go            # aggregated responses for frontend pages
├── seed/                            # CSV seed data
├── Makefile
└── .env
```

## API Endpoints

All prefixed with `/api`. JSON request/response bodies. All endpoints except auth require `Authorization: Bearer <token>`.

### Authentication (5)

| Method | Path             | Description      |
|--------|------------------|------------------|
| POST   | /auth/register   | Create account   |
| POST   | /auth/login      | Login, get JWT   |
| POST   | /auth/logout     | Revoke token     |
| GET    | /auth/me         | Current user     |
| DELETE | /auth/me         | Delete account   |

### Bundles (3)

| Method | Path              | Description                      |
|--------|-------------------|----------------------------------|
| GET    | /bundle/dashboard | All dashboard data in one call   |
| GET    | /bundle/explore   | All explore tab data in one call |
| GET    | /bundle/settings  | All settings data in one call    |

### Data Reads (9)

| Method | Path                    | Description                 |
|--------|-------------------------|-----------------------------|
| GET    | /summary                | Financial summary overview  |
| GET    | /expenses               | All expenses                |
| GET    | /debts                  | All debts                   |
| GET    | /income                 | All income/jobs             |
| GET    | /liquid                 | All liquid accounts         |
| GET    | /payoff                 | Debt payoff plan            |
| GET    | /scenarios              | Payoff scenarios            |
| GET    | /cashflow?days=90       | 90-day cash flow projection |
| GET    | /calendar?year=&month=  | Calendar events for a month |

### AI Insights (5)

| Method | Path                    | Description                   |
|--------|-------------------------|-------------------------------|
| GET    | /ai/insights            | General AI financial insights |
| GET    | /ai/debt-payoff-strategy| AI debt payoff strategy       |
| GET    | /ai/savings-plan        | AI savings plan               |
| GET    | /ai/expense-audit       | AI expense audit              |
| GET    | /ai/income-boost        | AI income boost suggestions   |

### CRUD - Expenses (3)

| Method | Path           | Description    |
|--------|----------------|----------------|
| POST   | /expenses      | Create expense |
| PUT    | /expenses/{id} | Update expense |
| DELETE | /expenses/{id} | Delete expense |

### CRUD - Debts (3)

| Method | Path        | Description |
|--------|-------------|-------------|
| POST   | /debts      | Create debt |
| PUT    | /debts/{id} | Update debt |
| DELETE | /debts/{id} | Delete debt |

### CRUD - Income (3)

| Method | Path         | Description       |
|--------|--------------|-------------------|
| POST   | /income      | Create income/job |
| PUT    | /income/{id} | Update income/job |
| DELETE | /income/{id} | Delete income/job |

### CRUD - Liquid Accounts (2)

| Method | Path         | Description           |
|--------|--------------|-----------------------|
| POST   | /liquid      | Create liquid account |
| PUT    | /liquid/{id} | Update liquid account |

### Simulation (1)

| Method | Path                         | Description                        |
|--------|------------------------------|------------------------------------|
| GET    | /payoff?extra_payment={amt}  | Simulate payoff with extra payment |

## Environment

```env
OPENAI_API_KEY=sk-...
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
FRONTEND_URL=http://localhost:3000
```

## Makefile

```
make build     # compile binary
make run       # build and start server
make run-dev   # build and start with request logging
make test      # run all tests
make clean     # remove binary
make kill      # kill process on port 8000
make reset     # kill + clean
```

## Docker

```bash
docker compose up --build   # from backend/: API on :8000
```

The compose file loads the API container's environment from `.env` in this directory (`cp .env.example .env` first — compose errors if it's missing). Every variable in the file is forwarded, including the optional `STRIPE_*` keys. `MONGODB_URI` must point at a reachable MongoDB (e.g. an Atlas URI); inside a container `localhost` is the container itself, so a Mongo running on the host is reached via `host.docker.internal` instead.

Don't run this and the root-level stack at the same time — both publish :8000.

To build just the image: `docker build -t paypath-backend .` — multi-stage build producing a static binary plus the `seed/` CSVs (read on first boot). The container listens on :8000 and honors `PORT`.

## Seed Data

On first run (empty users collection), seeds a default user `user@email.com` / `userpassword` and loads CSV data from `seed/` with cached AI insights.