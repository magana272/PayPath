package strategies

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"

	"paypath/internal/clients"
	"paypath/internal/services/ai/insights"
	"paypath/internal/services/debts"
	"paypath/internal/services/expenses"
	"paypath/internal/services/income"
	"paypath/internal/services/reporting"
)

//go:embed system_prompt.txt
var systemPrompt string

type Response struct {
	Summary string `json:"summary"`
	Items   []Item `json:"items"`
}

type Item struct {
	Title  string `json:"title"`
	Detail string `json:"detail"`
}

type Service struct {
	cache   insights.Repository
	reports *reporting.Service
}

func NewService(cache insights.Repository, reports *reporting.Service) *Service {
	return &Service{cache: cache, reports: reports}
}

func (s *Service) cached(uid int, topic string) (Response, bool) {
	raw, err := s.cache.GetCached(uid, topic)
	if err != nil {
		return Response{}, false
	}
	var resp Response
	if json.Unmarshal([]byte(raw), &resp) != nil {
		return Response{}, false
	}
	return resp, true
}

func (s *Service) callAI(ctx context.Context, uid int, topic, prompt string) (Response, error) {
	raw, err := clients.Chat(ctx, systemPrompt, prompt)
	if err != nil {
		return Response{}, err
	}
	var result Response
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		return Response{}, fmt.Errorf("failed to parse AI response: %w", err)
	}
	out, _ := json.Marshal(result)
	s.cache.Save(uid, topic, string(out))
	return result, nil
}

func (s *Service) DebtPayoff(ctx context.Context, uid int) (Response, error) {
	if resp, ok := s.cached(uid, "debt-payoff"); ok {
		return resp, nil
	}

	incomes, exps, dbts, _, err := s.reports.Financials(uid)
	if err != nil {
		return Response{}, err
	}

	taxes := income.CalcTaxes(income.CalcAnnualGross(incomes))
	surplus := taxes.MonthlyNet - expenses.CalcMonthly(exps)
	avalanche := debts.RunAvalancheWithInterest(dbts, surplus)
	snowball := debts.RunSnowball(dbts, surplus)

	debtLines := ""
	for _, d := range dbts {
		interest := d.Balance * d.APY / 100.0 / 12.0
		debtLines += fmt.Sprintf("  - %s (%s): $%.2f at %.2f%% APR ($%.2f/mo interest)\n", d.Name, d.Type, d.Balance, d.APY, interest)
	}

	prompt := fmt.Sprintf(`Analyze this person's debt situation and provide a payoff strategy. Return a JSON object:
{
  "summary": "2-3 sentence overview comparing avalanche vs snowball and recommended approach",
  "items": [{"title": "short title", "detail": "1-2 sentence actionable detail with specific dollar amounts"}]
}

Financial context:
- Monthly net income: $%.2f
- Monthly expenses: $%.2f
- Monthly surplus for debt payoff: $%.2f
- Avalanche method: %d months, $%.0f total interest
- Snowball method: %d months, $%.0f total interest

Debts:
%s
Provide 4-6 items: recommended strategy, specific payoff order, monthly allocation, and any quick wins.`,
		taxes.MonthlyNet, expenses.CalcMonthly(exps), surplus,
		avalanche.Months, avalanche.TotalInterest,
		snowball.Months, snowball.TotalInterest,
		debtLines,
	)

	return s.callAI(ctx, uid, "debt-payoff", prompt)
}

func (s *Service) SavingsPlan(ctx context.Context, uid int) (Response, error) {
	if resp, ok := s.cached(uid, "savings-plan"); ok {
		return resp, nil
	}

	incomes, exps, _, liqs, err := s.reports.Financials(uid)
	if err != nil {
		return Response{}, err
	}

	taxes := income.CalcTaxes(income.CalcAnnualGross(incomes))
	monthlyExp := expenses.CalcMonthly(exps)
	surplus := taxes.MonthlyNet - monthlyExp

	currentLiquid := 0.0
	for _, l := range liqs {
		currentLiquid += l.Balance
	}

	prompt := fmt.Sprintf(`Analyze this person's savings situation and create a plan. Return a JSON object:
{
  "summary": "2-3 sentence overview of savings position and recommended approach",
  "items": [{"title": "short title", "detail": "1-2 sentence actionable detail with specific dollar amounts and timelines"}]
}

Financial context:
- Monthly net income: $%.2f
- Monthly expenses: $%.2f
- Monthly surplus: $%.2f
- Current liquid savings: $%.2f
- Months of expenses covered: %.1f

Provide 4-6 items: emergency fund milestones with timelines, suggested monthly savings amount, and prioritization advice.`,
		taxes.MonthlyNet, monthlyExp, surplus, currentLiquid, currentLiquid/monthlyExp,
	)

	return s.callAI(ctx, uid, "savings-plan", prompt)
}

func (s *Service) ExpenseAudit(ctx context.Context, uid int) (Response, error) {
	if resp, ok := s.cached(uid, "expense-audit"); ok {
		return resp, nil
	}

	incomes, exps, _, _, err := s.reports.Financials(uid)
	if err != nil {
		return Response{}, err
	}

	taxes := income.CalcTaxes(income.CalcAnnualGross(incomes))
	totalMonthly := expenses.CalcMonthly(exps)

	expenseLines := ""
	for _, e := range exps {
		monthly := expenses.Normalize(e)
		expenseLines += fmt.Sprintf("  - %s: $%.2f/mo ($%.2f %s)\n", e.Expense, monthly, e.Cost, e.Frequency)
	}

	pctOfIncome := 0.0
	if taxes.MonthlyNet > 0 {
		pctOfIncome = totalMonthly / taxes.MonthlyNet * 100
	}

	prompt := fmt.Sprintf(`Audit this person's expenses and identify optimization opportunities. Return a JSON object:
{
  "summary": "2-3 sentence overview of spending patterns and key findings",
  "items": [{"title": "short title", "detail": "1-2 sentence actionable detail with specific dollar amounts"}]
}

Financial context:
- Monthly net income: $%.2f
- Total monthly expenses: $%.2f (%.1f%% of net income)
- Annual expenses: $%.2f

Expenses:
%s
Provide 4-6 items: identify largest expenses, suggest specific cuts, flag any concerning patterns, and estimate potential monthly savings.`,
		taxes.MonthlyNet, totalMonthly, pctOfIncome, totalMonthly*12, expenseLines,
	)

	return s.callAI(ctx, uid, "expense-audit", prompt)
}

func (s *Service) IncomeBoost(ctx context.Context, uid int) (Response, error) {
	if resp, ok := s.cached(uid, "income-boost"); ok {
		return resp, nil
	}

	incomes, exps, dbts, _, err := s.reports.Financials(uid)
	if err != nil {
		return Response{}, err
	}

	annualGross := income.CalcAnnualGross(incomes)
	taxes := income.CalcTaxes(annualGross)
	monthlyExp := expenses.CalcMonthly(exps)
	surplus := taxes.MonthlyNet - monthlyExp

	totalDebt := 0.0
	for _, d := range dbts {
		totalDebt += d.Balance
	}

	var currentRate string
	for _, inc := range incomes {
		if inc.PayPerHour != nil {
			currentRate = fmt.Sprintf("$%.0f/hr", *inc.PayPerHour)
			break
		}
	}
	if currentRate == "" {
		currentRate = fmt.Sprintf("$%.0f/year", annualGross)
	}

	scenarios, err := s.reports.Scenarios(uid)
	if err != nil {
		return Response{}, err
	}
	scenarioLines := ""
	for _, sc := range scenarios {
		scenarioLines += fmt.Sprintf("  - Pay off in %d months requires $%.2f/hr\n", sc.Months, sc.HourlyRate)
	}

	prompt := fmt.Sprintf(`Analyze this person's income situation and suggest ways to boost earnings for faster debt payoff. Return a JSON object:
{
  "summary": "2-3 sentence overview of current income position and potential",
  "items": [{"title": "short title", "detail": "1-2 sentence actionable detail with specific dollar amounts"}]
}

Financial context:
- Current rate: %s ($%.0f/year gross)
- Monthly net income: $%.2f
- Monthly expenses: $%.2f
- Monthly surplus: $%.2f
- Total debt: $%.2f

Income scenarios for faster payoff:
%s
Provide 4-6 items: evaluate current rate, suggest income targets, recommend side income strategies, and show impact of raises on debt timeline.`,
		currentRate, annualGross, taxes.MonthlyNet, monthlyExp, surplus, totalDebt, scenarioLines,
	)

	return s.callAI(ctx, uid, "income-boost", prompt)
}
