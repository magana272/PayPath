package income

import (
	"math"

	"paypath/internal/storage/cache"
	"paypath/pkg/utils"
)

const DefaultDaysPerWeek = 4.0

func WorkDaysPerWeek(inc Income) float64 {
	if inc.DaysPerWeek != nil && *inc.DaysPerWeek > 0 {
		return *inc.DaysPerWeek
	}
	return DefaultDaysPerWeek
}

type TaxBreakdown struct {
	AnnualGross    float64 `json:"annual_gross"`
	Federal        float64 `json:"federal"`
	State          float64 `json:"state"`
	SocialSecurity float64 `json:"social_security"`
	Medicare       float64 `json:"medicare"`
	SDI            float64 `json:"sdi"`
	TotalTax       float64 `json:"total_tax"`
	AnnualNet      float64 `json:"annual_net"`
	MonthlyNet     float64 `json:"monthly_net"`
}

type taxBracket struct {
	min, max, rate float64
}

var federalBrackets = []taxBracket{
	{0, 11925, 0.10},
	{11925, 48475, 0.12},
	{48475, 103350, 0.22},
	{103350, 197300, 0.24},
	{197300, 250525, 0.32},
	{250525, 626350, 0.35},
	{626350, math.MaxFloat64, 0.37},
}

var stateBrackets = []taxBracket{
	{0, 10756, 0.01},
	{10756, 25499, 0.02},
	{25499, 40245, 0.04},
	{40245, 55866, 0.06},
	{55866, 70606, 0.08},
	{70606, 360659, 0.093},
	{360659, 432787, 0.103},
	{432787, 721314, 0.113},
	{721314, math.MaxFloat64, 0.123},
}

const (
	federalStdDeduction = 15000.0
	stateStdDeduction   = 5540.0
	ssRate              = 0.062
	ssCap               = 168600.0
	medicareRate        = 0.0145
	sdiRate             = 0.011
)

func calcBracketTax(income float64, brackets []taxBracket) float64 {
	tax := 0.0
	for _, b := range brackets {
		if income <= b.min {
			break
		}
		taxable := math.Min(income, b.max) - b.min
		tax += taxable * b.rate
	}
	return tax
}

func CalcTaxes(annualGross float64) TaxBreakdown {
	federal := calcBracketTax(math.Max(annualGross-federalStdDeduction, 0), federalBrackets)
	state := calcBracketTax(math.Max(annualGross-stateStdDeduction, 0), stateBrackets)
	ss := math.Min(annualGross, ssCap) * ssRate
	medicare := annualGross * medicareRate
	sdi := annualGross * sdiRate
	totalTax := federal + state + ss + medicare + sdi
	annualNet := annualGross - totalTax

	return TaxBreakdown{
		AnnualGross:    utils.Round2(annualGross),
		Federal:        utils.Round2(federal),
		State:          utils.Round2(state),
		SocialSecurity: utils.Round2(ss),
		Medicare:       utils.Round2(medicare),
		SDI:            utils.Round2(sdi),
		TotalTax:       utils.Round2(totalTax),
		AnnualNet:      utils.Round2(annualNet),
		MonthlyNet:     utils.Round2(annualNet / 12),
	}
}

func CalcAnnualGross(incomes []Income) float64 {
	total := 0.0
	for _, inc := range incomes {
		if inc.PayFrequency != nil && *inc.PayFrequency == "one-time" {
			continue
		}
		if inc.PayType == "salary" && inc.AnnualSalary != nil {
			total += *inc.AnnualSalary
		} else if inc.PayPerHour != nil && inc.HourPerDay != nil {
			total += *inc.PayPerHour * *inc.HourPerDay * WorkDaysPerWeek(inc) * 52
		}
	}
	return total
}

func TotalWeeklyHours(incomes []Income) float64 {
	total := 0.0
	for _, inc := range incomes {
		if inc.PayFrequency != nil && *inc.PayFrequency == "one-time" {
			continue
		}
		if inc.HourPerDay != nil {
			total += *inc.HourPerDay * WorkDaysPerWeek(inc)
		} else if inc.PayType == "salary" {
			total += 8 * DefaultDaysPerWeek
		}
	}
	return total
}

func PayAmount(inc Income, annualGross float64) float64 {
	if inc.PayFrequency != nil && *inc.PayFrequency == "one-time" {
		if inc.PayType == "salary" && inc.AnnualSalary != nil {
			return utils.Round2(*inc.AnnualSalary)
		}
		if inc.PayPerHour != nil && inc.HourPerDay != nil {
			return utils.Round2(*inc.PayPerHour * *inc.HourPerDay)
		}
		return 0
	}
	var incGross float64
	if inc.PayType == "salary" && inc.AnnualSalary != nil {
		incGross = *inc.AnnualSalary
	} else if inc.PayPerHour != nil && inc.HourPerDay != nil {
		incGross = *inc.PayPerHour * *inc.HourPerDay * WorkDaysPerWeek(inc) * 52
	}
	if incGross == 0 || annualGross == 0 {
		return 0
	}
	taxes := CalcTaxes(annualGross)
	incNet := incGross * taxes.AnnualNet / annualGross
	freq := "semi-monthly"
	if inc.PayFrequency != nil {
		freq = *inc.PayFrequency
	}
	switch freq {
	case "weekly":
		return utils.Round2(incNet / 52)
	case "biweekly":
		return utils.Round2(incNet / 26)
	case "monthly":
		return utils.Round2(incNet / 12)
	default:
		return utils.Round2(incNet / 24)
	}
}

type Service struct {
	repo    Repository
	derived *cache.DerivedCache
}

func NewService(repo Repository, derived *cache.DerivedCache) *Service {
	return &Service{repo: repo, derived: derived}
}

func (s *Service) List(userID int) ([]Income, error) {
	return s.repo.All(userID)
}

func (s *Service) Create(userID int, inc Income) (Income, error) {
	out, err := s.repo.Create(userID, inc)
	if err == nil {
		s.derived.Invalidate(userID)
	}
	return out, err
}

func (s *Service) Update(userID, id int, inc Income) (*Income, error) {
	out, err := s.repo.Update(userID, id, inc)
	if err == nil && out != nil {
		s.derived.Invalidate(userID)
	}
	return out, err
}

func (s *Service) Delete(userID, id int) (bool, error) {
	ok, err := s.repo.Delete(userID, id)
	if err == nil && ok {
		s.derived.Invalidate(userID)
	}
	return ok, err
}
