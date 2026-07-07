package insights

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"

	"paypath/internal/clients"
	"paypath/internal/services/debts"
	"paypath/internal/services/expenses"
	"paypath/internal/services/income"
	"paypath/internal/services/reporting"
)

//go:embed system_prompt.txt
var systemPrompt string

type Service struct {
	cache   Repository
	reports *reporting.Service
}

func NewService(cache Repository, reports *reporting.Service) *Service {
	return &Service{cache: cache, reports: reports}
}

func (s *Service) Get(ctx context.Context, uid int) (Insights, error) {
	if cached, err := s.cache.GetCached(uid, "insights"); err == nil {
		var ins Insights
		if json.Unmarshal([]byte(cached), &ins) == nil {
			return ins, nil
		}
	}

	if !clients.Configured() {
		return Insights{}, clients.ErrNoAPIKey
	}

	incomes, exps, dbts, liqs, err := s.reports.Financials(uid)
	if err != nil {
		return Insights{}, err
	}

	summary := reporting.BuildSummary(incomes, exps, dbts, liqs)
	taxes := income.CalcTaxes(income.CalcAnnualGross(incomes))
	surplus := taxes.MonthlyNet - expenses.CalcMonthly(exps)
	payoff := debts.RunAvalanche(dbts, surplus)

	raw, err := clients.Chat(ctx, systemPrompt, buildPrompt(summary, payoff, dbts, exps))
	if err != nil {
		return Insights{}, err
	}

	var ins Insights
	if err := json.Unmarshal([]byte(raw), &ins); err != nil {
		return Insights{}, fmt.Errorf("failed to parse AI response: %w", err)
	}

	s.cache.Save(uid, "insights", raw)
	return ins, nil
}

func buildPrompt(summary reporting.Summary, payoff debts.PayoffResult, dbts []debts.Debt, exps []expenses.Expense) string {
	debtLines := ""
	for _, d := range dbts {
		debtLines += fmt.Sprintf("  - %s (%s): $%.2f at %.2f%% APR\n", d.Name, d.Type, d.Balance, d.APY)
	}

	expenseLines := ""
	for _, e := range exps {
		expenseLines += fmt.Sprintf("  - %s: $%.2f (%s)\n", e.Expense, e.Cost, e.Frequency)
	}

	return fmt.Sprintf(`Analyze this person's finances and return a JSON object with this exact schema:
{
  "overview": "2-3 sentence summary of their financial state",
  "health_score": <integer 0-100>,
  "strengths": ["strength1", "strength2"],
  "warnings": ["warning1", "warning2"],
  "advice": [{"title": "short title", "detail": "1-2 sentence actionable detail"}],
  "resources": [{"title": "resource name", "description": "why it's relevant"}]
}

Financial data:
- Monthly gross income: $%.2f
- Monthly net income (after tax): $%.2f
- Monthly expenses: $%.2f
- Monthly surplus: $%.2f
- Total debt: $%.2f
- Total liquid assets: $%.2f
- Net worth: $%.2f
- Monthly interest on debt: $%.2f
- Debt-to-income ratio: %.1f%%
- Savings rate: %.1f%%
- Debt payoff timeline: %d months at $%.2f/month budget

Debts:
%s
Expenses:
%s
Provide 2-3 strengths, 2-3 warnings, 2-3 pieces of advice with specific dollar amounts where possible, and 2 relevant resources.`,
		summary.MonthlyGross,
		summary.Taxes.MonthlyNet,
		summary.MonthlyExpenses,
		summary.MonthlySurplus,
		summary.TotalDebt,
		summary.TotalLiquid,
		summary.NetWorth,
		summary.MonthlyInterest,
		summary.DTI,
		summary.SavingsRate,
		payoff.Months,
		payoff.Budget,
		debtLines,
		expenseLines,
	)
}
