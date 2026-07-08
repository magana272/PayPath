package router

import (
	"net/http"

	"paypath/internal/api/handler"
	"paypath/internal/liquid"
	"paypath/internal/middleware"
	"paypath/internal/services/ai/insights"
	"paypath/internal/services/ai/strategies"
	"paypath/internal/services/auth"
	"paypath/internal/services/dashboard"
	"paypath/internal/services/debts"
	"paypath/internal/services/expenses"
	"paypath/internal/services/explore"
	"paypath/internal/services/income"
	"paypath/internal/services/reporting"
	"paypath/internal/services/settings"
)

type Deps struct {
	Auth        *auth.Service
	Income      *income.Service
	Expenses    *expenses.Service
	Debts       *debts.Service
	Liquid      liquid.Repository
	Reporting   *reporting.Service
	Dashboard   *dashboard.Service
	Explore     *explore.Service
	Settings    *settings.Service
	Insights    *insights.Service
	Strategies  *strategies.Service
	FrontendURL string
}

func New(d Deps) http.Handler {
	mux := http.NewServeMux()

	authH := handler.NewAuthHandler(d.Auth)
	mux.HandleFunc("POST /api/auth/register", authH.Register)
	mux.HandleFunc("POST /api/auth/login", authH.Login)
	mux.HandleFunc("POST /api/auth/logout", authH.Logout)
	mux.HandleFunc("DELETE /api/auth/me", authH.Delete)
	mux.HandleFunc("GET /api/auth/me", authH.Me)

	protected := http.NewServeMux()

	exp := handler.NewExpensesHandler(d.Expenses)
	protected.HandleFunc("GET /api/expenses", exp.List)
	protected.HandleFunc("POST /api/expenses", exp.Create)
	protected.HandleFunc("PUT /api/expenses/{id}", exp.Update)
	protected.HandleFunc("DELETE /api/expenses/{id}", exp.Delete)

	dbt := handler.NewDebtsHandler(d.Debts)
	protected.HandleFunc("GET /api/debts", dbt.List)
	protected.HandleFunc("POST /api/debts", dbt.Create)
	protected.HandleFunc("PUT /api/debts/{id}", dbt.Update)
	protected.HandleFunc("DELETE /api/debts/{id}", dbt.Delete)

	inc := handler.NewIncomeHandler(d.Income)
	protected.HandleFunc("GET /api/income", inc.List)
	protected.HandleFunc("POST /api/income", inc.Create)
	protected.HandleFunc("PUT /api/income/{id}", inc.Update)
	protected.HandleFunc("DELETE /api/income/{id}", inc.Delete)

	liq := handler.NewLiquidHandler(d.Liquid)
	protected.HandleFunc("GET /api/liquid", liq.List)
	protected.HandleFunc("POST /api/liquid", liq.Create)
	protected.HandleFunc("PUT /api/liquid/{id}", liq.Update)

	fin := handler.NewFinanceHandler(d.Reporting)
	protected.HandleFunc("GET /api/summary", fin.Summary)
	protected.HandleFunc("GET /api/payoff", fin.Payoff)
	protected.HandleFunc("GET /api/scenarios", fin.Scenarios)
	protected.HandleFunc("GET /api/cashflow", fin.Cashflow)
	protected.HandleFunc("GET /api/calendar", fin.Calendar)

	ins := handler.NewInsightsHandler(d.Insights)
	protected.HandleFunc("GET /api/ai/insights", ins.GetInsights)

	strat := handler.NewStrategiesHandler(d.Strategies)
	protected.HandleFunc("GET /api/ai/debt-payoff-strategy", strat.DebtPayoffStrategy)
	protected.HandleFunc("GET /api/ai/savings-plan", strat.SavingsPlan)
	protected.HandleFunc("GET /api/ai/expense-audit", strat.ExpenseAudit)
	protected.HandleFunc("GET /api/ai/income-boost", strat.IncomeBoost)
	protected.HandleFunc("GET /api/ai/status", strat.Status)

	bundle := handler.NewBundleHandler(d.Dashboard, d.Explore, d.Settings)
	protected.HandleFunc("GET /api/bundle/dashboard", bundle.Dashboard)
	protected.HandleFunc("GET /api/bundle/explore", bundle.Explore)
	protected.HandleFunc("GET /api/bundle/settings", bundle.Settings)

	mux.Handle("/api/", middleware.RequireAuth(d.Auth, middleware.BlockProtectedWrites(d.Auth, protected)))

	return middleware.Recover(middleware.RequestLogger(middleware.CORS(mux, d.FrontendURL)))
}
