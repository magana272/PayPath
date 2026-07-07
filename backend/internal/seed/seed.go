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

func Run(db *storage.DB, users auth.Repository, inc income.Repository, exp expenses.Repository, dbt debts.Repository, liq liquid.Repository, insightsSvc *insights.Service) {
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
	go seedInsights(insightsSvc, int(userID))
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

func seedInsights(svc *insights.Service, userID int) {
	if _, err := svc.Get(context.Background(), userID); err != nil {
		logger.Log.Warn().Err(err).Msg("skipped seeding insights")
		return
	}
	logger.Log.Info().Msg("seeded insights cache for demo user")
}
