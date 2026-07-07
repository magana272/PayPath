package config

import (
	"paypath/internal/api/router"
	"paypath/internal/liquid"
	"paypath/internal/seed"
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
	"paypath/internal/storage"
	"paypath/internal/storage/cache"
	"paypath/pkg/setting"
)

type App struct {
	DB   *storage.DB
	Deps router.Deps
}

func Setup(cfg setting.Config) *App {
	db := storage.Connect(cfg.MongoURI)
	derived := cache.NewDerivedCache(db.Cache())

	incomeRepo := income.NewRepository(db)
	expenseRepo := expenses.NewRepository(db)
	debtRepo := debts.NewRepository(db)
	liquidRepo := liquid.NewRepository(db)
	authRepo := auth.NewRepository(db)
	insightsRepo := insights.NewRepository(db)

	reportingRepo := reporting.NewRepository(incomeRepo, expenseRepo, debtRepo, liquidRepo, derived)
	reportingSvc := reporting.NewService(reportingRepo)
	insightsSvc := insights.NewService(insightsRepo, reportingSvc)

	deps := router.Deps{
		Auth:        auth.NewService(authRepo, cfg.JWTSecret, reportingSvc),
		Income:      income.NewService(incomeRepo, derived),
		Expenses:    expenses.NewService(expenseRepo, derived),
		Debts:       debts.NewService(debtRepo, derived),
		Liquid:      liquidRepo,
		Reporting:   reportingSvc,
		Dashboard:   dashboard.NewService(reportingRepo),
		Explore:     explore.NewService(reportingRepo),
		Settings:    settings.NewService(reportingRepo),
		Insights:    insightsSvc,
		Strategies:  strategies.NewService(insightsRepo, reportingSvc),
		FrontendURL: cfg.FrontendURL,
	}

	seed.Run(db, authRepo, incomeRepo, expenseRepo, debtRepo, liquidRepo, insightsSvc)

	return &App{DB: db, Deps: deps}
}
