package income

type DateException struct {
	OriginalDate string   `json:"original_date" bson:"original_date"`
	NewDate      string   `json:"new_date" bson:"new_date"`
	Amount       *float64 `json:"amount,omitempty" bson:"amount,omitempty"`
}

type Income struct {
	ID           int             `json:"id" bson:"id"`
	UserID       int             `json:"-" bson:"user_id"`
	Job          string          `json:"job" bson:"job"`
	PayType      string          `json:"pay_type" bson:"pay_type"`
	PayPerHour   *float64        `json:"pay_per_hour" bson:"pay_per_hour,omitempty"`
	HourPerDay   *float64        `json:"hour_per_day" bson:"hour_per_day,omitempty"`
	DaysPerWeek  *float64        `json:"days_per_week" bson:"days_per_week,omitempty"`
	AnnualSalary *float64        `json:"annual_salary" bson:"annual_salary,omitempty"`
	PayFrequency *string         `json:"pay_frequency" bson:"pay_frequency,omitempty"`
	PayDay       *int            `json:"pay_day" bson:"pay_day,omitempty"`
	Date         *string         `json:"date" bson:"date,omitempty"`
	Exceptions   []DateException `json:"exceptions" bson:"exceptions,omitempty"`
}
