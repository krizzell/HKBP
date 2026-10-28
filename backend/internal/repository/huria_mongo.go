package repository

import (
	"context"
	"errors"
	"regexp"

	"HKBP/internal/domain"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type huriaMongo struct {
	col       *mongo.Collection
	lungguCol *mongo.Collection
	sesiCol   *mongo.Collection
	katCol    *mongo.Collection
	pemCol    *mongo.Collection
	alokCol   *mongo.Collection
	setorCol  *mongo.Collection
	rincCol   *mongo.Collection
}

// NewHuriaRepository mengembalikan implementasi HuriaRepository berbasis MongoDB
func NewHuriaRepository(db *mongo.Database) domain.HuriaRepository {
	return &huriaMongo{
		col:       db.Collection("huria"),
		lungguCol: db.Collection("lunggu"),
		sesiCol:   db.Collection("sesi_ibadah"),
		katCol:    db.Collection("kategori_pemasukan"),
		pemCol:    db.Collection("pemasukan_jemaat"),
		alokCol:   db.Collection("alokasi_transaksi"),
		setorCol:  db.Collection("setoran_pusat"),
		rincCol:   db.Collection("rincian_setoran_pusat"),
	}
}

func (r *huriaMongo) Create(ctx context.Context, doc *domain.HuriaDoc) error {
	if doc.ID.IsZero() {
		doc.ID = bson.NewObjectID()
	}
	_, err := r.col.InsertOne(ctx, doc)
	return err
}

func (r *huriaMongo) FindByID(ctx context.Context, id bson.ObjectID) (*domain.HuriaDoc, error) {
	var doc domain.HuriaDoc
	err := r.col.FindOne(ctx, bson.M{"_id": id}).Decode(&doc)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, domain.ErrHuriaNotFound
		}
		return nil, err
	}
	return &doc, nil
}

func (r *huriaMongo) FindByKode(ctx context.Context, kode string) (*domain.HuriaDoc, error) {
	var doc domain.HuriaDoc
	err := r.col.FindOne(ctx, bson.M{"Kode": kode}).Decode(&doc)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &doc, nil
}

func (r *huriaMongo) FindByIdResortAndNama(ctx context.Context, idResort bson.ObjectID, nama string) (*domain.HuriaDoc, error) {
	var doc domain.HuriaDoc
	opts := options.FindOne().SetCollation(&options.Collation{Locale: "id", Strength: 2})
	err := r.col.FindOne(ctx, bson.M{
		"IdResort": idResort,
		"Nama":     nama,
	}, opts).Decode(&doc)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, nil
		}
		return nil, err
	}
	return &doc, nil
}

func (r *huriaMongo) FindAll(ctx context.Context, filter domain.HuriaFilter) ([]domain.HuriaDoc, int64, error) {
	filterDoc := bson.M{}

	if filter.IdResort != "" {
		resortID, err := bson.ObjectIDFromHex(filter.IdResort)
		if err != nil {
			return []domain.HuriaDoc{}, 0, nil
		}
		filterDoc["IdResort"] = resortID
	}

	if filter.IdDistrik != "" {
		distrikID, err := bson.ObjectIDFromHex(filter.IdDistrik)
		if err != nil {
			return []domain.HuriaDoc{}, 0, nil
		}
		filterDoc["IdDistrik"] = distrikID
	}

	if filter.Aktif != nil {
		filterDoc["Aktif"] = *filter.Aktif
	}

	if filter.Q != "" {
		pattern := regexp.QuoteMeta(filter.Q)
		filterDoc["$or"] = []bson.M{
			{"Nama": bson.M{"$regex": pattern, "$options": "i"}},
			{"Kode": bson.M{"$regex": pattern, "$options": "i"}},
			{"NamaPendetaPimpinan": bson.M{"$regex": pattern, "$options": "i"}},
			{"LokasiHuria": bson.M{"$regex": pattern, "$options": "i"}},
		}
	}

	total, err := r.col.CountDocuments(ctx, filterDoc)
	if err != nil {
		return nil, 0, err
	}

	limit := int64(filter.Limit)
	if limit <= 0 {
		limit = 10
	}
	page := int64(filter.Page)
	if page <= 0 {
		page = 1
	}
	skip := (page - 1) * limit

	findOpts := options.Find().
		SetSort(bson.D{{Key: "Kode", Value: 1}}).
		SetSkip(skip).
		SetLimit(limit)

	cursor, err := r.col.Find(ctx, filterDoc, findOpts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var docs []domain.HuriaDoc
	if err := cursor.All(ctx, &docs); err != nil {
		return nil, 0, err
	}
	if docs == nil {
		docs = []domain.HuriaDoc{}
	}

	return docs, total, nil
}

func (r *huriaMongo) Update(ctx context.Context, id bson.ObjectID, doc *domain.HuriaDoc) error {
	updateDoc := bson.M{
		"$set": bson.M{
			"Kode":                doc.Kode,
			"Nama":                doc.Nama,
			"LokasiHuria":         doc.LokasiHuria,
			"TahunBerdiri":        doc.TahunBerdiri,
			"NamaPendetaPimpinan": doc.NamaPendetaPimpinan,
			"JumlahJemaat":        doc.JumlahJemaat,
			"KepalaKeluarga":      doc.KepalaKeluarga,
			"IdResort":            doc.IdResort,
			"IdDistrik":           doc.IdDistrik,
			"Aktif":               doc.Aktif,
			"DiubahPada":          doc.DiubahPada,
		},
	}
	res, err := r.col.UpdateOne(ctx, bson.M{"_id": id}, updateDoc)
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return domain.ErrHuriaNotFound
	}
	return nil
}

func (r *huriaMongo) Delete(ctx context.Context, id bson.ObjectID) error {
	res, err := r.col.DeleteOne(ctx, bson.M{"_id": id})
	if err != nil {
		return err
	}
	if res.DeletedCount == 0 {
		return domain.ErrHuriaNotFound
	}
	return nil
}

func (r *huriaMongo) HasFinancialOrActivityData(ctx context.Context, huriaID bson.ObjectID) (bool, error) {
	collections := []*mongo.Collection{
		r.lungguCol,
		r.sesiCol,
		r.katCol,
		r.pemCol,
		r.alokCol,
		r.setorCol,
		r.rincCol,
	}

	for _, c := range collections {
		count, err := c.CountDocuments(ctx, bson.M{"IdHuria": huriaID})
		if err != nil {
			return false, err
		}
		if count > 0 {
			return true, nil
		}
	}
	return false, nil
}

func (r *huriaMongo) CascadeUpdateResort(ctx context.Context, huriaID bson.ObjectID, newResortID bson.ObjectID, newDistrikID bson.ObjectID) error {
	descendantCollections := []*mongo.Collection{
		r.lungguCol,
		r.sesiCol,
		r.katCol,
		r.pemCol,
		r.alokCol,
		r.setorCol,
		r.rincCol,
	}

	filter := bson.M{"IdHuria": huriaID}
	update := bson.M{
		"$set": bson.M{
			"IdResort":  newResortID,
			"IdDistrik": newDistrikID,
		},
	}

	for _, c := range descendantCollections {
		if _, err := c.UpdateMany(ctx, filter, update); err != nil {
			return err
		}
	}
	return nil
}
