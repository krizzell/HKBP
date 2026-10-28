package repository

import (
	"context"
	"errors"

	"HKBP/internal/domain"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type distrikMongo struct {
	col       *mongo.Collection
	resortCol *mongo.Collection
}

// NewDistrikRepository mengembalikan implementasi DistrikRepository berbasis MongoDB
func NewDistrikRepository(db *mongo.Database) domain.DistrikRepository {
	return &distrikMongo{
		col:       db.Collection("distrik"),
		resortCol: db.Collection("resort"),
	}
}

func (r *distrikMongo) Create(ctx context.Context, doc *domain.DistrikDoc) error {
	if doc.ID.IsZero() {
		doc.ID = bson.NewObjectID()
	}
	_, err := r.col.InsertOne(ctx, doc)
	return err
}

func (r *distrikMongo) FindByID(ctx context.Context, id bson.ObjectID) (*domain.DistrikDoc, error) {
	var doc domain.DistrikDoc
	err := r.col.FindOne(ctx, bson.M{"_id": id}).Decode(&doc)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, domain.ErrDistrikNotFound
		}
		return nil, err
	}
	return &doc, nil
}

func (r *distrikMongo) FindByKode(ctx context.Context, kode string) (*domain.DistrikDoc, error) {
	var doc domain.DistrikDoc
	err := r.col.FindOne(ctx, bson.M{"Kode": kode}).Decode(&doc)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &doc, nil
}

func (r *distrikMongo) FindByNama(ctx context.Context, nama string) (*domain.DistrikDoc, error) {
	var doc domain.DistrikDoc
	opts := options.FindOne().SetCollation(&options.Collation{Locale: "id", Strength: 2})
	err := r.col.FindOne(ctx, bson.M{"Nama": nama}, opts).Decode(&doc)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &doc, nil
}

func (r *distrikMongo) FindAll(ctx context.Context, filter domain.DistrikFilter) ([]domain.DistrikDoc, int64, error) {
	filterDoc := bson.M{}

	if filter.Q != "" {
		regexPattern := bson.M{"$regex": filter.Q, "$options": "i"}
		filterDoc["$or"] = []bson.M{
			{"Nama": regexPattern},
			{"Kode": regexPattern},
			{"NamaPraeses": regexPattern},
		}
	}

	if filter.Aktif != nil {
		filterDoc["Aktif"] = *filter.Aktif
	}

	total, err := r.col.CountDocuments(ctx, filterDoc)
	if err != nil {
		return nil, 0, err
	}

	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 {
		limit = 10
	} else if limit > 100 {
		limit = 100
	}

	skip := int64((page - 1) * limit)
	opts := options.Find().
		SetSkip(skip).
		SetLimit(int64(limit)).
		SetSort(bson.D{{Key: "Kode", Value: 1}})

	cursor, err := r.col.Find(ctx, filterDoc, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var docs []domain.DistrikDoc
	if err := cursor.All(ctx, &docs); err != nil {
		return nil, 0, err
	}
	if docs == nil {
		docs = []domain.DistrikDoc{}
	}

	return docs, total, nil
}

func (r *distrikMongo) Update(ctx context.Context, id bson.ObjectID, doc *domain.DistrikDoc) error {
	updateDoc := bson.M{
		"$set": bson.M{
			"Kode":        doc.Kode,
			"Nama":        doc.Nama,
			"NamaPraeses": doc.NamaPraeses,
			"Aktif":       doc.Aktif,
			"DiubahPada":  doc.DiubahPada,
		},
	}
	res, err := r.col.UpdateOne(ctx, bson.M{"_id": id}, updateDoc)
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return domain.ErrDistrikNotFound
	}
	return nil
}

func (r *distrikMongo) Delete(ctx context.Context, id bson.ObjectID) error {
	res, err := r.col.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return err
	}
	if res.DeletedCount == 0 {
		return domain.ErrDistrikNotFound
	}
	return nil
}

func (r *distrikMongo) CountActiveResortByDistrikID(ctx context.Context, distrikID bson.ObjectID) (int64, error) {
	return r.resortCol.CountDocuments(ctx, bson.M{
		"IdDistrik": distrikID,
		"Aktif":     true,
	})
}

func (r *distrikMongo) CountTotalResortByDistrikID(ctx context.Context, distrikID bson.ObjectID) (int64, error) {
	return r.resortCol.CountDocuments(ctx, bson.M{
		"IdDistrik": distrikID,
	})
}
