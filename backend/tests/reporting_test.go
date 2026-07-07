package tests

import (
	"testing"
	"time"

	"paypath/internal/liquid"
	"paypath/internal/services/debts"
	"paypath/internal/services/expenses"
	"paypath/internal/services/income"
	"paypath/internal/services/reporting"
)

func TestBuildSummary(t *testing.T) {
	incomes := []income.Income{{PayType: "salary", AnnualSalary: fptr(120000)}}
	exps := []expenses.Expense{{Cost: 2000, Frequency: "monthly"}}
	dbts := []debts.Debt{{Name: "cc", Balance: 10000, APY: 20, Type: "credit_card"}}
	liqs := []liquid.Liquid{{Balance: 5000}}

	s := reporting.BuildSummary(incomes, exps, dbts, liqs)
	if !approx(s.MonthlyGross, 10000, 0.01) {
		t.Errorf("MonthlyGross = %v, want 10000", s.MonthlyGross)
	}
	if !approx(s.TotalDebt, 10000, 0.01) {
		t.Errorf("TotalDebt = %v, want 10000", s.TotalDebt)
	}
	if !approx(s.TotalLiquid, 5000, 0.01) {
		t.Errorf("TotalLiquid = %v, want 5000", s.TotalLiquid)
	}
	if !approx(s.NetWorth, -5000, 0.01) {
		t.Errorf("NetWorth = %v, want -5000", s.NetWorth)
	}
	if !approx(s.MonthlyExpenses, 2000, 0.01) {
		t.Errorf("MonthlyExpenses = %v, want 2000", s.MonthlyExpenses)
	}
}

func TestSolveScenarios(t *testing.T) {
	dbts := []debts.Debt{{Name: "cc", Balance: 5000, APY: 20, Type: "credit_card"}}
	exps := []expenses.Expense{{Cost: 1000, Frequency: "monthly"}}
	incomes := []income.Income{{PayType: "hourly", PayPerHour: fptr(20), HourPerDay: fptr(8)}}

	scs := reporting.SolveScenarios(dbts, exps, incomes)
	if len(scs) != 7 {
		t.Fatalf("want 7 scenarios, got %d", len(scs))
	}
	for _, sc := range scs {
		if sc.HourlyRate < 0 {
			t.Errorf("negative hourly rate for %d-month scenario", sc.Months)
		}
	}
}

func TestBuildCalendarPaydays(t *testing.T) {
	incomes := []income.Income{{Job: "J", PayType: "salary", AnnualSalary: fptr(120000)}}
	cal := reporting.BuildCalendar(2025, 6, nil, incomes, income.CalcAnnualGross(incomes))
	if cal.Year != 2025 || cal.Month != 6 {
		t.Fatalf("year/month = %d/%d", cal.Year, cal.Month)
	}
	if len(cal.Events["1"]) == 0 || len(cal.Events["15"]) == 0 {
		t.Fatalf("expected semi-monthly paydays on days 1 and 15")
	}
}

func TestBuildCalendarBiweeklyAnchor(t *testing.T) {
	freq := "biweekly"
	anchor := "2026-07-17"
	incomes := []income.Income{{Job: "Vet", PayType: "hourly", PayPerHour: fptr(19), HourPerDay: fptr(11), PayFrequency: &freq, NextPayDate: &anchor}}
	gross := income.CalcAnnualGross(incomes)

	cal := reporting.BuildCalendar(2026, 7, nil, incomes, gross)
	for _, day := range []string{"3", "17", "31"} {
		if len(cal.Events[day]) != 1 {
			t.Fatalf("July: expected payday on day %s, got %v", day, cal.Events[day])
		}
		if !approx(cal.Events[day][0].Amount, 1368.86, 0.01) {
			t.Fatalf("July day %s amount = %v, want 1368.86", day, cal.Events[day][0].Amount)
		}
	}

	cal = reporting.BuildCalendar(2026, 8, nil, incomes, gross)
	for _, day := range []string{"3", "17", "31"} {
		if len(cal.Events[day]) != 0 {
			t.Fatalf("August: unexpected payday on day %s", day)
		}
	}
	for _, day := range []string{"14", "28"} {
		if len(cal.Events[day]) != 1 {
			t.Fatalf("August: expected payday on day %s", day)
		}
	}

	cal = reporting.BuildCalendar(2026, 9, nil, incomes, gross)
	for _, day := range []string{"11", "25"} {
		if len(cal.Events[day]) != 1 {
			t.Fatalf("September: expected payday on day %s", day)
		}
	}
}

func TestBuildCalendarWeeklyAnchor(t *testing.T) {
	freq := "weekly"
	anchor := "2026-07-15"
	incomes := []income.Income{{Job: "J", PayType: "salary", AnnualSalary: fptr(52000), PayFrequency: &freq, NextPayDate: &anchor}}
	cal := reporting.BuildCalendar(2026, 7, nil, incomes, income.CalcAnnualGross(incomes))
	for _, day := range []string{"1", "8", "15", "22", "29"} {
		if len(cal.Events[day]) != 1 {
			t.Fatalf("expected weekly payday on day %s", day)
		}
	}
	if len(cal.Events["17"]) != 0 {
		t.Fatalf("Friday fallback should not fire when anchored")
	}
}

func TestBuildCalendarMonthlyAnchor(t *testing.T) {
	freq := "monthly"
	anchor := "2026-07-31"
	incomes := []income.Income{{Job: "J", PayType: "salary", AnnualSalary: fptr(60000), PayFrequency: &freq, NextPayDate: &anchor}}
	cal := reporting.BuildCalendar(2026, 7, nil, incomes, income.CalcAnnualGross(incomes))
	if len(cal.Events["31"]) != 1 {
		t.Fatalf("expected payday on July 31")
	}
	cal = reporting.BuildCalendar(2026, 9, nil, incomes, income.CalcAnnualGross(incomes))
	if len(cal.Events["30"]) != 1 {
		t.Fatalf("expected payday clamped to September 30")
	}
}

func TestBuildCalendarSemiMonthlyAnchor(t *testing.T) {
	freq := "semi-monthly"
	anchor := "2026-07-20"
	incomes := []income.Income{{Job: "J", PayType: "salary", AnnualSalary: fptr(60000), PayFrequency: &freq, NextPayDate: &anchor}}
	cal := reporting.BuildCalendar(2026, 7, nil, incomes, income.CalcAnnualGross(incomes))
	if len(cal.Events["20"]) != 1 || len(cal.Events["31"]) != 1 {
		t.Fatalf("expected semi-monthly paydays on 20 and 31")
	}
}

func TestBuildCalendarBiweeklyPayDayFallback(t *testing.T) {
	freq := "biweekly"
	day := 17
	incomes := []income.Income{{Job: "J", PayType: "hourly", PayPerHour: fptr(19), HourPerDay: fptr(11), PayFrequency: &freq, PayDay: &day}}
	cal := reporting.BuildCalendar(2026, 8, nil, incomes, income.CalcAnnualGross(incomes))
	for _, d := range []string{"3", "17", "31"} {
		if len(cal.Events[d]) != 1 {
			t.Fatalf("legacy pay_day fallback: expected payday on day %s", d)
		}
	}
}

func TestBuildCalendarDueDateClamp(t *testing.T) {
	due := 31
	exps := []expenses.Expense{{Expense: "rent", Cost: 1000, Frequency: "monthly", DueDate: &due}}
	cal := reporting.BuildCalendar(2025, 2, exps, nil, 0)
	if len(cal.Events["28"]) == 0 {
		t.Fatalf("due_date 31 in February should clamp to day 28")
	}
}

func TestCalcNextPayday(t *testing.T) {
	freq := "biweekly"
	anchor := "2026-07-17"
	incomes := []income.Income{{Job: "Vet", PayType: "hourly", PayPerHour: fptr(19), HourPerDay: fptr(11), PayFrequency: &freq, NextPayDate: &anchor}}
	due6 := 6
	due10 := 10
	due17 := 17
	exps := []expenses.Expense{
		{Expense: "Internet", Cost: 80, Frequency: "monthly", DueDate: &due6},
		{Expense: "Rent", Cost: 1000, Frequency: "monthly", DueDate: &due10},
		{Expense: "Gym", Cost: 50, Frequency: "monthly", DueDate: &due17},
	}
	from := time.Date(2026, 7, 6, 0, 0, 0, 0, time.UTC)
	np := reporting.CalcNextPayday(incomes, exps, income.CalcAnnualGross(incomes), from)
	if np == nil {
		t.Fatal("expected next payday")
	}
	if np.Date != "2026-07-17" || np.DaysUntil != 11 {
		t.Fatalf("got %s in %d days, want 2026-07-17 in 11", np.Date, np.DaysUntil)
	}
	if !approx(np.Amount, 1368.86, 0.01) {
		t.Fatalf("Amount = %v, want 1368.86", np.Amount)
	}
	if np.Label != "Vet" {
		t.Fatalf("Label = %q, want Vet", np.Label)
	}
	if !approx(np.BillsDue, 1080, 0.01) {
		t.Fatalf("BillsDue = %v, want 1080", np.BillsDue)
	}
}

func TestCalcNextPaydayToday(t *testing.T) {
	freq := "biweekly"
	anchor := "2026-07-17"
	incomes := []income.Income{{Job: "Vet", PayType: "hourly", PayPerHour: fptr(19), HourPerDay: fptr(11), PayFrequency: &freq, NextPayDate: &anchor}}
	from := time.Date(2026, 7, 17, 0, 0, 0, 0, time.UTC)
	np := reporting.CalcNextPayday(incomes, nil, income.CalcAnnualGross(incomes), from)
	if np == nil || np.DaysUntil != 0 || np.Date != "2026-07-17" {
		t.Fatalf("got %+v, want payday today", np)
	}
	if np.BillsDue != 0 {
		t.Fatalf("BillsDue = %v, want 0", np.BillsDue)
	}
}

func TestCalcNextPaydayNil(t *testing.T) {
	if np := reporting.CalcNextPayday(nil, nil, 0, time.Date(2026, 7, 6, 0, 0, 0, 0, time.UTC)); np != nil {
		t.Fatalf("expected nil, got %+v", np)
	}
}

func TestCalcNextPaydayException(t *testing.T) {
	freq := "biweekly"
	anchor := "2026-07-17"
	incomes := []income.Income{{Job: "Vet", PayType: "hourly", PayPerHour: fptr(19), HourPerDay: fptr(11), PayFrequency: &freq, NextPayDate: &anchor,
		Exceptions: []income.DateException{{OriginalDate: "2026-07-17", NewDate: "2026-07-20"}}}}
	from := time.Date(2026, 7, 6, 0, 0, 0, 0, time.UTC)
	np := reporting.CalcNextPayday(incomes, nil, income.CalcAnnualGross(incomes), from)
	if np == nil || np.Date != "2026-07-20" || np.DaysUntil != 14 {
		t.Fatalf("got %+v, want 2026-07-20 in 14 days", np)
	}
}

func TestProjectCashflowLength(t *testing.T) {
	cf := reporting.ProjectCashflow([]liquid.Liquid{{Balance: 1000}}, nil, nil, 0, 0, 30)
	if len(cf) != 30 {
		t.Fatalf("want 30 days, got %d", len(cf))
	}
}
