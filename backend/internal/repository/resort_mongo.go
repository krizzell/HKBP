package repository

import (
	"context"
	"errors"

	"HKBP/internal/domain"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type resortMongo struct {
	col       *mongo.Collection
	huriaCol  *mongo.Collection
	gerejaCol *mongo.Collection
	lungguCol *mongo.Collection
	sesiCol   *mongo.Collection
	katCol    *mongo.Collection
	pemCol    *mongo.Collection
	alokCol   *mongo.Collection
	setorCol  *mongo.Collection
	rincCol   *mongo.Collection
}

// NewResortRepository mengembalikan implementasi ResortRepository berbasis MongoDB
func NewResortRepository(db *mongo.Database) domain.ResortRepository {
	return &resortMongo{
		col:       db.Collection("resort"),
		huriaCol:  db.Collection("huria"),
		gerejaCol: db.Collection("gereja"),
		lungguCol: db.Collection("lunggu"),
		sesiCol:   db.Collection("sesi_ibadah"),
		katCol:    db.Collection("kategori_pemasukan"),
		pemCol:    db.Collection("pemasukan_jemaat"),
		alokCol:   db.Collection("alokasi_transaksi"),
		setorCol:  db.Collection("setoran_pusat"),
		rincCol:   db.Collection("rincian_setoran_pusat"),
	}
}

func (r *resortMongo) Create(ctx context.Context, doc *domain.ResortDoc) error {
	if doc.ID.IsZero() {
		doc.ID = bson.NewObjectID()
	}
	_, err := r.col.InsertOne(ctx, doc)
	return err
}

func (r *resortMongo) FindByID(ctx context.Context, id bson.ObjectID) (*domain.ResortDoc, error) {
	var doc domain.ResortDoc
	err := r.col.FindOne(ctx, bson.M{"_id": id}).Decode(&doc)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, domain.ErrResortNotFound
		}
		return nil, err
	}
	return &doc, nil
}

func (r *resortMongo) FindByKode(ctx context.Context, kode string) (*domain.ResortDoc, error) {
	var doc domain.ResortDoc
	err := r.col.FindOne(ctx, bson.M{"Kode": kode}).Decode(&doc)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &doc, nil
}

func (r *resortMongo) FindByIdDistrikAndNama(ctx context.Context, idDistrik bson.ObjectID, nama string) (*domain.ResortDoc, error) {
	var doc domain.ResortDoc
	opts := options.FindOne().SetCollation(&options.Collation{Locale: "id", Strength: 2})
	err := r.col.FindOne(ctx, bson.M{
		"IdDistrik": idDistrik,
		"Nama":      nama,
	}, opts).Decode(&doc)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &doc, nil
}

func (r *resortMongo) FindAll(ctx context.Context, filter domain.ResortFilter) ([]domain.ResortDoc, int64, error) {
	filterDoc := bson.M{}

	if filter.IdDistrik != "" {
		distrikID, err := bson.ObjectIDFromHex(filter.IdDistrik)
		if err != nil {
			return []domain.ResortDoc{}, 0, nil
		}
		filterDoc["IdDistrik"] = distrikID
	}

	if filter.Q != "" {
		regexPattern := bson.M{"$regex": filter.Q, "$options": "i"}
		filterDoc["$or"] = []bson.M{
			{"Nama": regexPattern},
			{"Kode": regexPattern},
			{"NamaPendetaResort": regexPattern},
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

	var docs []domain.ResortDoc
	if err := cursor.All(ctx, &docs); err != nil {
		return nil, 0, err
	}
	if docs == nil {
		docs = []domain.ResortDoc{}
	}

	return docs, total, nil
}

func (r *resortMongo) Update(ctx context.Context, id bson.ObjectID, doc *domain.ResortDoc) error {
	updateDoc := bson.M{
		"$set": bson.M{
			"Kode":              doc.Kode,
			"Nama":              doc.Nama,
			"NamaPendetaResort": doc.NamaPendetaResort,
			"IdDistrik":         doc.IdDistrik,
			"Aktif":             doc.Aktif,
			"DiubahPada":        doc.DiubahPada,
		},
	}
	res, err := r.col.UpdateOne(ctx, bson.M{"_id": id}, updateDoc)
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return domain.ErrResortNotFound
	}
	return nil
}

func (r *resortMongo) Delete(ctx context.Context, id bson.ObjectID) error {
	res, err := r.col.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return err
	}
	if res.DeletedCount == 0 {
		return domain.ErrResortNotFound
	}
	return nil
}

func (r *resortMongo) CountActiveHuriaByResortID(ctx context.Context, resortID bson.ObjectID) (int64, error) {
	return r.huriaCol.CountDocuments(ctx, bson.M{
		"IdResort": resortID,
		"Aktif":    true,
	})
}

func (r *resortMongo) CountTotalHuriaByResortID(ctx context.Context, resortID bson.ObjectID) (int64, error) {
	return r.huriaCol.CountDocuments(ctx, bson.M{
		"IdResort": resortID,
	})
}

func (r *resortMongo) CascadeUpdateDistrik(ctx context.Context, resortID bson.ObjectID, newDistrikID bson.ObjectID) error {
	descendantCollections := []*mongo.Collection{
		r.huriaCol,
		r.gerejaCol,
		r.lungguCol,
		r.sesiCol,
		r.katCol,
		r.pemCol,
		r.alokCol,
		r.setorCol,
		r.rincCol,
	}

	filter := bson.M{"IdResort": resortID}
	update := bson.M{"$set": bson.M{"IdDistrik": newDistrikID}}

	for _, c := range descendantCollections {
		if _, err := c.UpdateMany(ctx, filter, update); err != nil {
			return err
		}
	}
	return nil
}
