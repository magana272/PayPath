package tests

import (
	"testing"

	"paypath/internal/services/income"
)

func TestCalcAnnualGrossHourly(t *testing.T) {
	got := income.CalcAnnualGross([]income.Income{{PayType: "hourly", PayPerHour: fptr(20), HourPerDay: fptr(8)}})
	want := 20.0 * 8 * income.DefaultDaysPerWeek * 52
	if got != want {
		t.Fatalf("CalcAnnualGross = %v, want %v", got, want)
	}
}

func TestCalcAnnualGrossDaysPerWeek(t *testing.T) {
	got := income.CalcAnnualGross([]income.Income{{PayType: "hourly", PayPerHour: fptr(19), HourPerDay: fptr(11), DaysPerWeek: fptr(5)}})
	if got != 19.0*11*5*52 {
		t.Fatalf("CalcAnnualGross = %v, want %v", got, 19.0*11*5*52)
	}
}

func TestWorkDaysPerWeekDefault(t *testing.T) {
	if got := income.WorkDaysPerWeek(income.Income{}); got != income.DefaultDaysPerWeek {
		t.Fatalf("got %v, want %v", got, income.DefaultDaysPerWeek)
	}
	if got := income.WorkDaysPerWeek(income.Income{DaysPerWeek: fptr(3)}); got != 3 {
		t.Fatalf("got %v, want 3", got)
	}
}

func TestCalcAnnualGrossSalary(t *testing.T) {
	if got := income.CalcAnnualGross([]income.Income{{PayType: "salary", AnnualSalary: fptr(60000)}}); got != 60000 {
		t.Fatalf("got %v, want 60000", got)
	}
}

func TestCalcAnnualGrossEmpty(t *testing.T) {
	if got := income.CalcAnnualGross(nil); got != 0 {
		t.Fatalf("got %v, want 0", got)
	}
}

func TestCalcAnnualGrossOneTimeExcluded(t *testing.T) {
	freq := "one-time"
	got := income.CalcAnnualGross([]income.Income{{PayType: "salary", AnnualSalary: fptr(60000), PayFrequency: &freq}})
	if got != 0 {
		t.Fatalf("one-time income should be excluded, got %v", got)
	}
}

func TestCalcTaxesZero(t *testing.T) {
	tb := income.CalcTaxes(0)
	if tb.TotalTax != 0 || tb.AnnualNet != 0 || tb.MonthlyNet != 0 {
		t.Fatalf("zero gross should yield zero taxes, got %+v", tb)
	}
}

func TestCalcTaxesConsistency(t *testing.T) {
	tb := income.CalcTaxes(60000)
	sum := tb.Federal + tb.State + tb.SocialSecurity + tb.Medicare + tb.SDI
	if !approx(sum, tb.TotalTax, 0.05) {
		t.Fatalf("components %.2f != TotalTax %.2f", sum, tb.TotalTax)
	}
	if !approx(tb.AnnualNet, 60000-tb.TotalTax, 0.05) {
		t.Fatalf("AnnualNet %.2f != gross-tax %.2f", tb.AnnualNet, 60000-tb.TotalTax)
	}
	if !approx(tb.MonthlyNet, tb.AnnualNet/12, 0.05) {
		t.Fatalf("MonthlyNet %.2f != AnnualNet/12 %.2f", tb.MonthlyNet, tb.AnnualNet/12)
	}
	if tb.TotalTax <= 0 || tb.TotalTax >= 60000 {
		t.Fatalf("implausible TotalTax %.2f", tb.TotalTax)
	}
}
