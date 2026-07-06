package seed

import (
	"context"

	"paypath/internal/liquid"
	"paypath/internal/services/ai/insights"
	"paypath/internal/services/auth"
	"paypath/internal/services/debts"
	"paypath/internal/services/expenses"
	"paypath/internal/services/income"
	"paypath/internal/storage"
	"paypath/pkg/logger"
	"paypath/pkg/utils"

	"go.mongodb.org/mongo-driver/v2/bson"
	"golang.org/x/crypto/bcrypt"
)

func Run(db *storage.DB, users auth.Repository, inc income.Repository, exp expenses.Repository, dbt debts.Repository, liq liquid.Repository, ins insights.Repository) {
	count, _ := db.Collection("users").CountDocuments(context.Background(), bson.M{})
	if count > 0 {
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte("userpassword"), bcrypt.DefaultCost)
	if err != nil {
		logger.Log.Error().Err(err).Msg("seed user hash error")
		return
	}
	userID, err := users.CreateUser("user@email.com", string(hash), "Default User")
	if err != nil {
		logger.Log.Error().Err(err).Msg("seed user insert error")
		return
	}
	logger.Log.Info().Msg("seeded default user (user@email.com)")

	seedExpenses(exp, int(userID), "seed/fin_expense.csv")
	seedDebts(dbt, int(userID), "seed/fin_debt.csv")
	seedIncome(inc, int(userID), "seed/fin_income.csv")
	seedLiquid(liq, int(userID), "seed/fin_liqud.csv")
	seedInsights(ins, int(userID))
}

func seedExpenses(repo expenses.Repository, userID int, file string) {
	headers, rows, ok := utils.ReadCSV(file)
	if !ok {
		return
	}
	col := utils.HeaderIndex(headers)
	for _, row := range rows {
		e := expenses.Expense{
			Expense:   utils.CSVVal(row[col["expense"]]),
			Cost:      *utils.CSVFloat(row[col["cost"]]),
			Frequency: utils.CSVVal(row[col["frequency"]]),
		}
		if i, ok := col["date"]; ok && i < len(row) {
			v := utils.CSVVal(row[i])
			if v != "" {
				e.Date = &v
			}
		}
		if i, ok := col["due_date"]; ok && i < len(row) {
			e.DueDate = utils.CSVInt(row[i])
		}
		repo.Create(userID, e)
	}
	logger.Log.Info().Str("file", file).Msg("seeded expenses")
}

func seedDebts(repo debts.Repository, userID int, file string) {
	headers, rows, ok := utils.ReadCSV(file)
	if !ok {
		return
	}
	col := utils.HeaderIndex(headers)
	for _, row := range rows {
		repo.Create(userID, debts.Debt{
			Bank:    utils.CSVVal(row[col["bank"]]),
			Type:    utils.CSVVal(row[col["type"]]),
			Name:    utils.CSVVal(row[col["name"]]),
			APY:     *utils.CSVFloat(row[col["apy"]]),
			Balance: *utils.CSVFloat(row[col["balance"]]),
		})
	}
	logger.Log.Info().Str("file", file).Msg("seeded debts")
}

func seedIncome(repo income.Repository, userID int, file string) {
	headers, rows, ok := utils.ReadCSV(file)
	if !ok {
		return
	}
	col := utils.HeaderIndex(headers)
	for _, row := range rows {
		inc := income.Income{
			Job:     utils.CSVVal(row[col["job"]]),
			PayType: utils.CSVVal(row[col["pay_type"]]),
		}
		if i, ok := col["pay_per_hour"]; ok && i < len(row) {
			inc.PayPerHour = utils.CSVFloat(row[i])
		}
		if i, ok := col["hour_per_day"]; ok && i < len(row) {
			inc.HourPerDay = utils.CSVFloat(row[i])
		}
		if i, ok := col["annual_salary"]; ok && i < len(row) {
			inc.AnnualSalary = utils.CSVFloat(row[i])
		}
		if i, ok := col["pay_frequency"]; ok && i < len(row) {
			v := utils.CSVVal(row[i])
			if v != "" {
				inc.PayFrequency = &v
			}
		}
		if i, ok := col["pay_day"]; ok && i < len(row) {
			inc.PayDay = utils.CSVInt(row[i])
		}
		repo.Create(userID, inc)
	}
	logger.Log.Info().Str("file", file).Msg("seeded income")
}

func seedLiquid(repo liquid.Repository, userID int, file string) {
	headers, rows, ok := utils.ReadCSV(file)
	if !ok {
		return
	}
	col := utils.HeaderIndex(headers)
	for _, row := range rows {
		repo.Create(userID, liquid.Liquid{
			Bank:    utils.CSVVal(row[col["bank"]]),
			Balance: *utils.CSVFloat(row[col["balance"]]),
		})
	}
	logger.Log.Info().Str("file", file).Msg("seeded liquid")
}

func seedInsights(repo insights.Repository, userID int) {
	response := `{
		"overview": "Your finances are on a solid recovery track. Steady income from your Vet Assistant position at $24/hr, paired with disciplined credit card payoff, has brought total debt down to roughly $34,000 — now mostly lower-interest student loans and a car loan. The Capital One Savor is nearly cleared at $2,180, and you've built an $11,500 emergency fund covering about three months of expenses.",
		"health_score": 71,
		"strengths": [
			"Emergency fund of $11,500 covers roughly 3 months of expenses — right in the recommended range",
			"High-interest revolving debt is nearly eliminated; only $2,180 remains on the Capital One Savor",
			"Remaining balances are concentrated in lower-rate student loans (8-10%), which can be paid down strategically"
		],
		"warnings": [
			"The Capital One Savor at 28.99% APR still costs ~$53/month in interest — worth clearing to close out revolving debt entirely",
			"Student loans total roughly $28,700 across four Earnest accounts and remain the largest obligation",
			"The 10.58% Earnest Loan 4 is now your highest-rate remaining balance and should lead the payoff order"
		],
		"advice": [
			{
				"title": "Finish Off the Capital One Savor",
				"detail": "At 28.99% APR, the remaining $2,180 Savor balance costs ~$53/month in interest. Clearing it this quarter eliminates your last revolving-credit interest entirely."
			},
			{
				"title": "Roll Payments Into Earnest Loan 4",
				"detail": "Once the Savor is gone, redirect that payment to the 10.58% Earnest Loan 4 ($9,600) — your highest remaining rate — before moving down the list."
			},
			{
				"title": "Keep the Emergency Fund Topped Up",
				"detail": "Your $11,500 buffer already covers about 3 months of expenses. Maintain it as you accelerate debt payoff so an unexpected cost never sends you back to the cards."
			}
		],
		"resources": [
			{
				"title": "Debt Avalanche Calculator",
				"description": "Model how targeting your highest-rate balances first minimizes total interest paid across your remaining accounts."
			},
			{
				"title": "r/personalfinance Prime Directive",
				"description": "Step-by-step flowchart for balancing emergency savings, high-interest debt payoff, and retirement contributions on a limited income."
			}
		]
	}`
	if err := repo.Save(userID, "insights", response); err != nil {
		logger.Log.Error().Err(err).Msg("seed insights error")
		return
	}
	logger.Log.Info().Msg("seeded insights cache for demo user")
}
