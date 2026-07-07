package reporting

import "paypath/internal/services/income"

type TaxItem struct {
	Name  string  `json:"name"`
	Value float64 `json:"value"`
}

type InterestAccount struct {
	Name            string  `json:"name"`
	MonthlyInterest float64 `json:"monthly_interest"`
	APR             float64 `json:"apr"`
}

type NextPayday struct {
	Date      string  `json:"date"`
	DaysUntil int     `json:"days_until"`
	Amount    float64 `json:"amount"`
	Label     string  `json:"label"`
	BillsDue  float64 `json:"bills_due"`
}

type Summary struct {
	MonthlyGross      float64             `json:"monthly_gross"`
	Taxes             income.TaxBreakdown `json:"taxes"`
	MonthlyExpenses   float64             `json:"monthly_expenses"`
	MonthlySurplus    float64             `json:"monthly_surplus"`
	TotalDebt         float64             `json:"total_debt"`
	TotalLiquid       float64             `json:"total_liquid"`
	MonthlyInterest   float64             `json:"monthly_interest"`
	DailyInterest     float64             `json:"daily_interest"`
	NetWorth          float64             `json:"net_worth"`
	DTI               float64             `json:"dti"`
	SavingsRate       float64             `json:"savings_rate"`
	TaxBreakdownList  []TaxItem           `json:"tax_breakdown"`
	InterestByAccount []InterestAccount   `json:"interest_by_account"`
	NextPayday        *NextPayday         `json:"next_payday,omitempty"`
}

type Scenario struct {
	Months     int     `json:"months"`
	HourlyRate float64 `json:"hourly_rate"`
}

type CashflowBill struct {
	ID     string  `json:"id"`
	Name   string  `json:"name"`
	Amount float64 `json:"amount"`
}

type CashflowDay struct {
	Date    string         `json:"date"`
	Balance float64        `json:"balance"`
	Bills   []CashflowBill `json:"bills"`
}

type CalendarEvent struct {
	Type   string  `json:"type"`
	Label  string  `json:"label"`
	Amount float64 `json:"amount"`
	ID     string  `json:"id"`
}

type Calendar struct {
	Year           int                        `json:"year"`
	Month          int                        `json:"month"`
	MonthName      string                     `json:"month_name"`
	DaysInMonth    int                        `json:"days_in_month"`
	FirstWeekday   int                        `json:"first_weekday"`
	SemiMonthlyPay float64                    `json:"semi_monthly_pay"`
	Events         map[string][]CalendarEvent `json:"events"`
}
