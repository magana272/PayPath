package reporting

import (
	"fmt"
	"strconv"
	"sync"
	"time"

	"paypath/internal/liquid"
	"paypath/internal/services/debts"
	"paypath/internal/services/expenses"
	"paypath/internal/services/income"
	"paypath/pkg/utils"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Financials(uid int) ([]income.Income, []expenses.Expense, []debts.Debt, []liquid.Liquid, error) {
	return s.repo.Financials(uid)
}

func (s *Service) Summary(uid int) (Summary, error) {
	incomes, exps, dbts, liqs, err := s.repo.Financials(uid)
	if err != nil {
		return Summary{}, err
	}
	return BuildSummary(incomes, exps, dbts, liqs), nil
}

func (s *Service) Payoff(uid int, extra float64) (debts.PayoffResult, error) {
	incomes, exps, dbts, _, err := s.repo.Financials(uid)
	if err != nil {
		return debts.PayoffResult{}, err
	}
	taxes := income.CalcTaxes(income.CalcAnnualGross(incomes))
	surplus := taxes.MonthlyNet - expenses.CalcMonthly(exps)
	return debts.RunAvalanche(dbts, surplus+extra), nil
}

func (s *Service) Scenarios(uid int) ([]Scenario, error) {
	return s.repo.Scenarios(uid)
}

func (s *Service) Cashflow(uid, days int) ([]CashflowDay, error) {
	incomes, exps, _, liqs, err := s.repo.Financials(uid)
	if err != nil {
		return nil, err
	}
	annualGross := income.CalcAnnualGross(incomes)
	monthlyExp := expenses.CalcMonthly(exps)
	return ProjectCashflow(liqs, incomes, exps, annualGross, monthlyExp, days), nil
}

func (s *Service) Calendar(uid, year, month int) (Calendar, error) {
	incomes, exps, _, _, err := s.repo.Financials(uid)
	if err != nil {
		return Calendar{}, err
	}
	annualGross := income.CalcAnnualGross(incomes)
	return BuildCalendar(year, month, exps, incomes, annualGross), nil
}

func BuildSummary(incomes []income.Income, exps []expenses.Expense, dbts []debts.Debt, liqs []liquid.Liquid) Summary {
	annualGross := income.CalcAnnualGross(incomes)
	taxes := income.CalcTaxes(annualGross)
	monthlyGross := utils.Round2(annualGross / 12)
	monthlyExp := utils.Round2(expenses.CalcMonthly(exps))

	totalDebt := 0.0
	monthlyInterest := 0.0
	var interestAccounts []InterestAccount
	for _, d := range dbts {
		totalDebt += d.Balance
		mi := d.Balance * d.APY / 100.0 / 12.0
		monthlyInterest += mi
		interestAccounts = append(interestAccounts, InterestAccount{
			Name: d.Name, MonthlyInterest: utils.Round2(mi), APR: d.APY,
		})
	}

	totalLiquid := 0.0
	for _, l := range liqs {
		totalLiquid += l.Balance
	}

	monthlySurplus := taxes.MonthlyNet - monthlyExp
	dti := 0.0
	if monthlyGross > 0 {
		dti = utils.Round2(debts.TotalMinPayments(dbts) / monthlyGross * 100)
	}
	savingsRate := 0.0
	if taxes.MonthlyNet > 0 {
		savingsRate = utils.Round2(monthlySurplus / taxes.MonthlyNet * 100)
	}

	return Summary{
		MonthlyGross:    monthlyGross,
		Taxes:           taxes,
		MonthlyExpenses: monthlyExp,
		MonthlySurplus:  utils.Round2(monthlySurplus),
		TotalDebt:       utils.Round2(totalDebt),
		TotalLiquid:     utils.Round2(totalLiquid),
		MonthlyInterest: utils.Round2(monthlyInterest),
		DailyInterest:   utils.Round2(monthlyInterest / 30),
		NetWorth:        utils.Round2(totalLiquid - totalDebt),
		DTI:             dti,
		SavingsRate:     savingsRate,
		TaxBreakdownList: []TaxItem{
			{Name: "Federal", Value: taxes.Federal},
			{Name: "State", Value: taxes.State},
			{Name: "Social Security", Value: taxes.SocialSecurity},
			{Name: "Medicare", Value: taxes.Medicare},
			{Name: "SDI", Value: taxes.SDI},
		},
		InterestByAccount: interestAccounts,
	}
}

func SolveScenarios(dbts []debts.Debt, exps []expenses.Expense, incomes []income.Income) []Scenario {
	targets := []int{12, 24, 36, 48, 60, 84, 120}
	monthlyExp := expenses.CalcMonthly(exps)
	weeklyHours := income.TotalWeeklyHours(incomes)
	if weeklyHours == 0 {
		weeklyHours = 8 * income.DefaultDaysPerWeek
	}

	scenarios := make([]Scenario, len(targets))
	var wg sync.WaitGroup
	for i, target := range targets {
		wg.Add(1)
		go func(i, target int) {
			defer wg.Done()
			rate := binarySearchRate(dbts, monthlyExp, weeklyHours, target)
			scenarios[i] = Scenario{Months: target, HourlyRate: utils.Round2(rate)}
		}(i, target)
	}
	wg.Wait()
	return scenarios
}

func binarySearchRate(dbts []debts.Debt, monthlyExp, weeklyHours float64, targetMonths int) float64 {
	lo, hi := 0.0, 500.0
	for i := 0; i < 100; i++ {
		mid := (lo + hi) / 2
		annualGross := mid * weeklyHours * 52
		taxes := income.CalcTaxes(annualGross)
		surplus := taxes.MonthlyNet - monthlyExp
		result := debts.RunAvalanche(dbts, surplus)
		if result.Months > 0 && result.Months <= targetMonths {
			hi = mid
		} else {
			lo = mid
		}
	}
	return hi
}

type payEvent struct {
	Day    int
	Amount float64
	Label  string
	ID     int
}

func calcPaydays(incomes []income.Income, annualGross float64, year, month, daysInMonth int) []payEvent {
	if len(incomes) == 0 {
		return nil
	}

	taxes := income.CalcTaxes(annualGross)
	var events []payEvent

	for _, inc := range incomes {
		freq := "semi-monthly"
		if inc.PayFrequency != nil {
			freq = *inc.PayFrequency
		}

		if freq == "one-time" {
			amount := 0.0
			if inc.PayType == "salary" && inc.AnnualSalary != nil {
				amount = *inc.AnnualSalary
			} else if inc.PayPerHour != nil && inc.HourPerDay != nil {
				amount = *inc.PayPerHour * *inc.HourPerDay
			}
			if amount == 0 {
				continue
			}
			if inc.Date != nil {
				parsed, err := time.Parse("2006-01-02", *inc.Date)
				if err != nil || parsed.Year() != year || int(parsed.Month()) != month {
					continue
				}
				events = append(events, payEvent{Day: parsed.Day(), Amount: utils.Round2(amount), Label: inc.Job, ID: inc.ID})
				continue
			}
			if inc.PayDay == nil {
				continue
			}
			day := *inc.PayDay
			if day > daysInMonth {
				day = daysInMonth
			}
			events = append(events, payEvent{Day: day, Amount: utils.Round2(amount), Label: inc.Job, ID: inc.ID})
			continue
		}

		if annualGross == 0 {
			continue
		}

		var incGross float64
		if inc.PayType == "salary" && inc.AnnualSalary != nil {
			incGross = *inc.AnnualSalary
		} else if inc.PayPerHour != nil && inc.HourPerDay != nil {
			incGross = *inc.PayPerHour * *inc.HourPerDay * income.WorkDaysPerWeek(inc) * 52
		}
		if incGross == 0 {
			continue
		}

		netRatio := taxes.AnnualNet / annualGross
		incNet := incGross * netRatio

		var anchor *time.Time
		if inc.NextPayDate != nil {
			if parsed, err := time.Parse("2006-01-02", *inc.NextPayDate); err == nil {
				anchor = &parsed
			}
		}

		switch freq {
		case "weekly":
			payPerCheck := incNet / 52
			if anchor != nil {
				for _, day := range anchorDays(*anchor, 7, year, month) {
					events = append(events, payEvent{Day: day, Amount: utils.Round2(payPerCheck), Label: inc.Job, ID: inc.ID})
				}
			} else {
				t := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
				for d := t; d.Month() == time.Month(month); d = d.AddDate(0, 0, 1) {
					if d.Weekday() == time.Friday {
						day := d.Day()
						if inc.PayDay != nil {
							if d.Weekday() != time.Weekday(*inc.PayDay) {
								continue
							}
						}
						events = append(events, payEvent{Day: day, Amount: utils.Round2(payPerCheck), Label: inc.Job, ID: inc.ID})
					}
				}
			}
		case "biweekly":
			payPerCheck := incNet / 26
			if anchor != nil {
				for _, day := range anchorDays(*anchor, 14, year, month) {
					events = append(events, payEvent{Day: day, Amount: utils.Round2(payPerCheck), Label: inc.Job, ID: inc.ID})
				}
			} else {
				startDay := 1
				if inc.PayDay != nil {
					startDay = *inc.PayDay
				}
				monthStart := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
				monthEnd := monthStart.AddDate(0, 1, 0)
				ref := time.Date(year, time.Month(month), startDay, 0, 0, 0, 0, time.UTC)
				for d := ref; d.Before(monthEnd); d = d.AddDate(0, 0, 14) {
					if !d.Before(monthStart) {
						events = append(events, payEvent{Day: d.Day(), Amount: utils.Round2(payPerCheck), Label: inc.Job, ID: inc.ID})
					}
				}
				for d := ref.AddDate(0, 0, -14); !d.Before(monthStart); d = d.AddDate(0, 0, -14) {
					events = append(events, payEvent{Day: d.Day(), Amount: utils.Round2(payPerCheck), Label: inc.Job, ID: inc.ID})
				}
			}
		case "monthly":
			payPerCheck := incNet / 12
			day := 1
			if anchor != nil {
				day = anchor.Day()
			} else if inc.PayDay != nil {
				day = *inc.PayDay
			}
			if day > daysInMonth {
				day = daysInMonth
			}
			events = append(events, payEvent{Day: day, Amount: utils.Round2(payPerCheck), Label: inc.Job, ID: inc.ID})
		default:
			payPerCheck := utils.Round2(incNet / 24)
			day1 := 1
			day2 := 15
			if anchor != nil {
				day1 = clampDay(anchor.Day(), daysInMonth)
				day2 = clampDay(day1+14, daysInMonth)
			} else if inc.PayDay != nil {
				day1 = *inc.PayDay
				day2 = day1 + 14
				if day2 > daysInMonth {
					day2 = daysInMonth
				}
			}
			events = append(events, payEvent{Day: day1, Amount: payPerCheck, Label: inc.Job, ID: inc.ID})
			events = append(events, payEvent{Day: day2, Amount: payPerCheck, Label: inc.Job, ID: inc.ID})
		}
	}
	return events
}

func anchorDays(anchor time.Time, step, year, month int) []int {
	monthStart := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	monthEnd := monthStart.AddDate(0, 1, 0)
	diff := int(monthStart.Sub(anchor) / (24 * time.Hour))
	offset := ((-diff)%step + step) % step
	var days []int
	for d := monthStart.AddDate(0, 0, offset); d.Before(monthEnd); d = d.AddDate(0, 0, step) {
		days = append(days, d.Day())
	}
	return days
}

func ProjectCashflow(liqs []liquid.Liquid, incomes []income.Income, exps []expenses.Expense, annualGross, monthlyExp float64, days int) []CashflowDay {
	balance := 0.0
	for _, l := range liqs {
		balance += l.Balance
	}

	dailyExp := monthlyExp / 30.0
	today := time.Now()
	billMarkers := computeBillMarkers(exps, today, days)
	paydayMarkers := computePaydayMarkers(incomes, annualGross, today, days)
	result := make([]CashflowDay, 0, days)

	for i := 0; i < days; i++ {
		date := today.AddDate(0, 0, i)
		dateStr := date.Format("2006-01-02")
		balance += paydayMarkers[dateStr]
		balance -= dailyExp
		bills := billMarkers[dateStr]
		if bills == nil {
			bills = []CashflowBill{}
		}
		result = append(result, CashflowDay{
			Date:    dateStr,
			Balance: utils.Round2(balance),
			Bills:   bills,
		})
	}
	return result
}

func computePaydayMarkers(incomes []income.Income, annualGross float64, start time.Time, days int) map[string]float64 {
	result := make(map[string]float64)

	type yearMonth struct{ y, m int }
	var months []yearMonth
	seen := make(map[yearMonth]bool)
	for i := 0; i <= days; i++ {
		d := start.AddDate(0, 0, i)
		k := yearMonth{d.Year(), int(d.Month())}
		if !seen[k] {
			seen[k] = true
			months = append(months, k)
		}
	}

	for _, inc := range incomes {
		base := make(map[string]float64)
		single := []income.Income{inc}
		for _, mm := range months {
			dim := time.Date(mm.y, time.Month(mm.m), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 1, -1).Day()
			for _, p := range calcPaydays(single, annualGross, mm.y, mm.m, dim) {
				dateStr := fmt.Sprintf("%04d-%02d-%02d", mm.y, mm.m, p.Day)
				base[dateStr] += p.Amount
			}
		}
		for _, ex := range inc.Exceptions {
			amount, has := base[ex.OriginalDate]
			delete(base, ex.OriginalDate)
			if ex.Amount != nil {
				amount = *ex.Amount
			} else if !has {
				amount = income.PayAmount(inc, annualGross)
			}
			base[ex.NewDate] += amount
		}
		for dateStr, amt := range base {
			result[dateStr] += amt
		}
	}
	return result
}

func clampDay(d, dim int) int {
	if d > dim {
		return dim
	}
	return d
}

func yearlyAnchor(e expenses.Expense) (int, int) {
	if e.Date != nil {
		if parsed, err := time.Parse("2006-01-02", *e.Date); err == nil {
			return int(parsed.Month()), parsed.Day()
		}
	}
	if e.DueDate != nil {
		return 1, *e.DueDate
	}
	return 0, 0
}

func expenseOccursOn(e expenses.Expense, date time.Time, dim int) bool {
	day := date.Day()
	switch e.Frequency {
	case "one-time":
		if e.Date != nil {
			return *e.Date == date.Format("2006-01-02")
		}
		if e.DueDate != nil {
			return day == clampDay(*e.DueDate, dim)
		}
		return false
	case "monthly":
		if e.DueDate != nil {
			return day == clampDay(*e.DueDate, dim)
		}
		return day == 1
	case "biweekly":
		return day == 1 || day == 15
	case "weekly":
		return day == 1 || day == 8 || day == 15 || day == 22 || day == 29
	case "yearly":
		anchorMonth, anchorDay := yearlyAnchor(e)
		if anchorMonth == 0 {
			return false
		}
		return int(date.Month()) == anchorMonth && day == clampDay(anchorDay, dim)
	default:
		return false
	}
}

func computeBillMarkers(exps []expenses.Expense, start time.Time, days int) map[string][]CashflowBill {
	result := make(map[string][]CashflowBill)
	end := start.AddDate(0, 0, days)

	for _, e := range exps {
		bill := CashflowBill{
			ID:     fmt.Sprintf("e_%d", e.ID),
			Name:   e.Expense,
			Amount: utils.Round2(e.Cost),
		}

		movedAway := make(map[string]bool)
		for _, ex := range e.Exceptions {
			movedAway[ex.OriginalDate] = true
		}

		for i := 0; i < days; i++ {
			date := start.AddDate(0, 0, i)
			dateStr := date.Format("2006-01-02")
			dim := time.Date(date.Year(), date.Month(), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 1, -1).Day()

			occurs := expenseOccursOn(e, date, dim)

			if occurs && !movedAway[dateStr] {
				result[dateStr] = append(result[dateStr], bill)
			}
		}

		for _, ex := range e.Exceptions {
			newDate, err := time.Parse("2006-01-02", ex.NewDate)
			if err != nil {
				continue
			}
			if !newDate.Before(start) && newDate.Before(end) {
				result[ex.NewDate] = append(result[ex.NewDate], bill)
			}
		}
	}

	return result
}

func BuildCalendar(year, month int, exps []expenses.Expense, incomes []income.Income, annualGross float64) Calendar {
	t := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	daysInMonth := t.AddDate(0, 1, -1).Day()
	firstWeekday := int(t.Weekday())

	events := make(map[string][]CalendarEvent)
	addEvent := func(day int, evt CalendarEvent) {
		key := strconv.Itoa(day)
		events[key] = append(events[key], evt)
	}
	removeEvent := func(day int, id string) {
		key := strconv.Itoa(day)
		for i, e := range events[key] {
			if e.ID == id {
				events[key] = append(events[key][:i], events[key][i+1:]...)
				return
			}
		}
	}

	paydays := calcPaydays(incomes, annualGross, year, month, daysInMonth)
	totalSemiMonthly := 0.0
	for _, p := range paydays {
		addEvent(p.Day, CalendarEvent{Type: "payday", Label: p.Label, Amount: p.Amount, ID: fmt.Sprintf("i_%d", p.ID)})
		totalSemiMonthly += p.Amount
	}

	for _, e := range exps {
		expID := fmt.Sprintf("e_%d", e.ID)
		evtType := "bill"
		if e.Frequency == "one-time" {
			evtType = "purchase"
		}
		for day := 1; day <= daysInMonth; day++ {
			date := time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)
			if expenseOccursOn(e, date, daysInMonth) {
				addEvent(day, CalendarEvent{Type: evtType, Label: e.Expense, Amount: utils.Round2(e.Cost), ID: expID})
			}
		}
	}

	for _, e := range exps {
		expID := fmt.Sprintf("e_%d", e.ID)
		evtType := "bill"
		if e.Frequency == "one-time" {
			evtType = "purchase"
		}
		for _, ex := range e.Exceptions {
			origDate, err1 := time.Parse("2006-01-02", ex.OriginalDate)
			newDate, err2 := time.Parse("2006-01-02", ex.NewDate)
			if err1 != nil || err2 != nil {
				continue
			}
			if origDate.Year() == year && int(origDate.Month()) == month {
				removeEvent(origDate.Day(), expID)
			}
			if newDate.Year() == year && int(newDate.Month()) == month {
				addEvent(newDate.Day(), CalendarEvent{Type: evtType, Label: e.Expense, Amount: utils.Round2(e.Cost), ID: expID})
			}
		}
	}

	for _, inc := range incomes {
		incID := fmt.Sprintf("i_%d", inc.ID)
		for _, ex := range inc.Exceptions {
			origDate, err1 := time.Parse("2006-01-02", ex.OriginalDate)
			newDate, err2 := time.Parse("2006-01-02", ex.NewDate)
			if err1 != nil || err2 != nil {
				continue
			}
			var amount float64
			if origDate.Year() == year && int(origDate.Month()) == month {
				key := strconv.Itoa(origDate.Day())
				for _, evt := range events[key] {
					if evt.ID == incID {
						amount = evt.Amount
						break
					}
				}
				removeEvent(origDate.Day(), incID)
				totalSemiMonthly -= amount
			}
			if newDate.Year() == year && int(newDate.Month()) == month {
				if ex.Amount != nil {
					amount = *ex.Amount
				} else if amount == 0 {
					amount = income.PayAmount(inc, annualGross)
				}
				addEvent(newDate.Day(), CalendarEvent{Type: "payday", Label: inc.Job, Amount: amount, ID: incID})
				totalSemiMonthly += amount
			}
		}
	}

	return Calendar{
		Year:           year,
		Month:          month,
		MonthName:      time.Month(month).String(),
		DaysInMonth:    daysInMonth,
		FirstWeekday:   firstWeekday,
		SemiMonthlyPay: utils.Round2(totalSemiMonthly / 2),
		Events:         events,
	}
}
