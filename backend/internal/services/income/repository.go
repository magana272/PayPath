package income

import (
	"context"
	"fmt"

	"paypath/internal/storage"
	"paypath/internal/storage/cache"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type Repository interface {
	All(userID int) ([]Income, error)
	Create(userID int, inc Income) (Income, error)
	Update(userID, id int, inc Income) (*Income, error)
	Delete(userID, id int) (bool, error)
}

type mongoRepo struct {
	db *storage.DB
}

func NewRepository(db *storage.DB) Repository {
	r := &mongoRepo{db: db}
	r.db.Collection("income").Indexes().CreateOne(context.Background(), mongo.IndexModel{
		Keys: bson.D{{Key: "user_id", Value: 1}},
	})
	return r
}

func cacheKey(userID int) string { return fmt.Sprintf("inc:%d", userID) }

func (r *mongoRepo) All(userID int) ([]Income, error) {
	return cache.CachedList(r.db.Cache(), r.db.SF(), cacheKey(userID), func() ([]Income, error) {
		cursor, err := r.db.Collection("income").Find(context.Background(), bson.M{"user_id": userID})
		if err != nil {
			return nil, err
		}
		var list []Income
		if err := cursor.All(context.Background(), &list); err != nil {
			return nil, err
		}
		return list, nil
	})
}

func (r *mongoRepo) Create(userID int, inc Income) (Income, error) {
	inc.ID = r.db.NextID("income")
	inc.UserID = userID
	_, err := r.db.Collection("income").InsertOne(context.Background(), inc)
	if err == nil {
		r.db.Cache().Delete(cacheKey(userID))
	}
	return inc, err
}

func (r *mongoRepo) Update(userID, id int, inc Income) (*Income, error) {
	set := bson.M{}
	if inc.Job != "" {
		set["job"] = inc.Job
	}
	if inc.PayType != "" {
		set["pay_type"] = inc.PayType
	}
	if inc.PayPerHour != nil {
		set["pay_per_hour"] = inc.PayPerHour
	}
	if inc.HourPerDay != nil {
		set["hour_per_day"] = inc.HourPerDay
	}
	if inc.DaysPerWeek != nil {
		set["days_per_week"] = inc.DaysPerWeek
	}
	if inc.AnnualSalary != nil {
		set["annual_salary"] = inc.AnnualSalary
	}
	if inc.PayFrequency != nil {
		set["pay_frequency"] = inc.PayFrequency
	}
	if inc.PayDay != nil {
		set["pay_day"] = inc.PayDay
	}
	if inc.NextPayDate != nil {
		set["next_pay_date"] = inc.NextPayDate
	}
	if inc.Exceptions != nil {
		set["exceptions"] = inc.Exceptions
	}
	if len(set) == 0 {
		return r.get(userID, id)
	}
	filter := bson.M{"id": id, "user_id": userID}
	res, err := r.db.Collection("income").UpdateOne(context.Background(), filter, bson.M{"$set": set})
	if err != nil {
		return nil, err
	}
	if res.MatchedCount == 0 {
		return nil, nil
	}
	r.db.Cache().Delete(cacheKey(userID))
	return r.get(userID, id)
}

func (r *mongoRepo) get(userID, id int) (*Income, error) {
	var inc Income
	err := r.db.Collection("income").FindOne(context.Background(), bson.M{"id": id, "user_id": userID}).Decode(&inc)
	if err != nil {
		return nil, err
	}
	return &inc, nil
}

func (r *mongoRepo) Delete(userID, id int) (bool, error) {
	res, err := r.db.Collection("income").DeleteOne(context.Background(), bson.M{"id": id, "user_id": userID})
	if err != nil {
		return false, err
	}
	if res.DeletedCount > 0 {
		r.db.Cache().Delete(cacheKey(userID))
	}
	return res.DeletedCount > 0, nil
}
