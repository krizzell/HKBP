package repository

import (
	"HKBP/internal/domain"
	"context"
	"errors"
	"fmt"
	"log"
	"strings"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type wilayahMongo struct {
	db      *mongo.Database
	col     *mongo.Collection
	userCol *mongo.Collection
}

var defaultUsers = []domain.User{
	{
		ID:          "usr-admin-parsaoran",
		Email:       "admin.parsaoran@hkbp.or.id",
		Password:    "Admin123#",
		Nama:        "Admin Huria HKBP Parsaoran Nauli",
		Role:        "Admin",
		IdHuria:     "H-3.2.1.1",
		NamaHuria:   "HKBP Parsaoran Nauli",
		NamaResort:  "Resort Parsaoran Nauli",
		NamaDistrik: "Distrik III Humbang Habinsaran",
	},

	{
		ID:       "usr-pusat",
		Email:    "pusat@hkbp.or.id",
		Password: "Admin123#",
		Nama:     "Ephorus / Kantor Pusat HKBP (Pearaja Tarutung)",
		Role:     "SuperAdmin",
	},
	{
		ID:       "usr-superadmin",
		Email:    "superadmin@hkbp.or.id",
		Password: "Admin123#",
		Nama:     "Ephorus / Admin Pusat HKBP",
		Role:     "SuperAdmin",
	},
	{
		ID:          "usr-admin-sudirman",
		Email:       "admin.sudirman@hkbp.or.id",
		Password:    "Admin123#",
		Nama:        "Admin Huria HKBP Sudirman Jakarta",
		Role:        "Admin",
		IdHuria:     "H-1.1.1.1",
		NamaHuria:   "HKBP Sudirman",
		NamaResort:  "Resort Tebet",
		NamaDistrik: "Distrik VIII DKI Jakarta",
	},
	{
		ID:          "usr-admin-1111",
		Email:       "admin.huria1111@hkbp.or.id",
		Password:    "Admin123#",
		Nama:        "Admin Huria HKBP Sudirman Jakarta",
		Role:        "Admin",
		IdHuria:     "H-1.1.1.1",
		NamaHuria:   "HKBP Sudirman",
		NamaResort:  "Resort Tebet",
		NamaDistrik: "Distrik VIII DKI Jakarta",
	},
	{
		ID:          "usr-admin-pearaja",
		Email:       "admin.pearaja@hkbp.or.id",
		Password:    "Admin123#",
		Nama:        "Admin Huria HKBP Pearaja Tarutung",
		Role:        "Admin",
		IdHuria:     "H-2.1.1.1",
		NamaHuria:   "HKBP Pearaja",
		NamaResort:  "Resort Pearaja Tarutung",
		NamaDistrik: "Distrik II Silindung",
	},
	{
		ID:          "usr-admin-2111",
		Email:       "admin.huria2111@hkbp.or.id",
		Password:    "Admin123#",
		Nama:        "Admin Huria HKBP Pearaja Tarutung",
		Role:        "Admin",
		IdHuria:     "H-2.1.1.1",
		NamaHuria:   "HKBP Pearaja",
		NamaResort:  "Resort Pearaja Tarutung",
		NamaDistrik: "Distrik II Silindung",
	},
}

func NewWilayahRepository(db *mongo.Database) domain.WilayahRepository {
	repo := &wilayahMongo{db: db, col: db.Collection("HKBP"), userCol: db.Collection("users")}
	// Tidak membuat seeder otomatis ataupun menimpa wilayah.json saat startup.
	// Jika master benar-benar kosong, salin identitas distrik/resort/huria dari
	// hierarki lama. Proses ini hanya menambah dokumen, bukan menghapus hierarki.
	if err := BootstrapMasterFromTree(context.Background(), db); err != nil {
		log.Printf("Master wilayah belum dapat dibootstrap: %v", err)
	}
	// Akun contoh hanya dibuat jika belum ada, sehingga perubahan pengguna tidak
	// terhapus setiap backend dijalankan.
	for _, u := range defaultUsers {
		err := repo.userCol.FindOne(context.Background(), bson.M{"email": strings.ToLower(u.Email)}).Err()
		if errors.Is(err, mongo.ErrNoDocuments) {
			if _, err = repo.userCol.InsertOne(context.Background(), u); err != nil {
				log.Printf("Gagal membuat akun awal %s: %v", u.Email, err)
			}
		} else if err != nil {
			log.Printf("Gagal memeriksa akun %s: %v", u.Email, err)
		}
	}
	return repo
}

func (r *wilayahMongo) FindAll(ctx context.Context) ([]domain.Wilayah, error) {
	cursor, err := r.col.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	result := make([]domain.Wilayah, 0)
	if err := cursor.All(ctx, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// SaveAll dipakai hanya untuk reset eksplisit; operasi CRUD rutin tidak pernah
// boleh menggunakan DeleteMany/InsertMany pada seluruh collection.
func (r *wilayahMongo) SaveAll(ctx context.Context, data []domain.Wilayah) error {
	if len(data) != 1 {
		return fmt.Errorf("penyimpanan hierarki ditolak: wajib tepat 1 dokumen pusat, diterima %d", len(data))
	}
	var previous bson.M
	err := r.col.FindOne(ctx, bson.M{}).Decode(&previous)
	if errors.Is(err, mongo.ErrNoDocuments) {
		_, err = r.col.InsertOne(ctx, data[0])
		return err
	}
	if err != nil {
		return err
	}
	n, err := r.col.CountDocuments(ctx, bson.M{})
	if err != nil {
		return err
	}
	if n != 1 {
		return fmt.Errorf("penyimpanan ditolak: terdapat %d dokumen pusat; butuh penanganan manual", n)
	}
	result, err := r.col.ReplaceOne(ctx, bson.M{"_id": previous["_id"]}, data[0])
	if err != nil {
		return err
	}
	if result.MatchedCount != 1 {
		return errors.New("dokumen pusat tidak ditemukan")
	}
	return nil
}

func (r *wilayahMongo) FindHuria(ctx context.Context, idHuria string) (*domain.Huria, error) {
	all, err := r.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	for _, w := range all {
		for _, d := range w.Pusat.Distrik {
			for _, res := range d.Resort {
				for _, h := range res.Huria {
					if h.IdHuria == idHuria || h.NamaHuria == idHuria {
						return &h, nil
					}
				}
			}
		}
	}

	return nil, errors.New("Huria tidak ditemukan")
}

// UpdateHuria mengubah satu Huria secara atomik menggunakan arrayFilters.
// Versi digunakan untuk menolak penulisan basi bila dua admin mengubah Huria
// yang sama hampir bersamaan. Pembaruan Huria lain tidak ikut tertimpa.
func (r *wilayahMongo) UpdateHuria(ctx context.Context, idHuria string, updated domain.Huria) error {
	all, err := r.FindAll(ctx)
	if err != nil {
		return err
	}
	var parentDist domain.Distrik
	var parentRes domain.Resort
	var old domain.Huria
	found := false
	for _, w := range all {
		for _, d := range w.Pusat.Distrik {
			for _, res := range d.Resort {
				for _, h := range res.Huria {
					if h.IdHuria == idHuria || h.NamaHuria == idHuria {
						parentDist, parentRes, old, found = d, res, h, true
						break
					}
				}
				if found {
					break
				}
			}
			if found {
				break
			}
		}
		if found {
			break
		}
	}
	if !found {
		return errors.New("Huria tidak ditemukan")
	}
	if updated.Versi != old.Versi {
		return errors.New("konflik data: Huria sudah diubah pengguna lain, muat ulang terlebih dahulu")
	}
	updated.IdHuria = old.IdHuria
	updated.Versi = old.Versi + 1
	dFilter := bson.M{"d.IdDistrik": parentDist.IdDistrik}
	if parentDist.IdDistrik == "" {
		dFilter = bson.M{"d.NamaDistrik": parentDist.NamaDistrik}
	}
	rFilter := bson.M{"r.IdResort": parentRes.IdResort}
	if parentRes.IdResort == "" {
		rFilter = bson.M{"r.NamaResort": parentRes.NamaResort}
	}
	hFilter := bson.M{"h.IdHuria": old.IdHuria}
	if old.Versi == 0 {
		hFilter["h.Versi"] = bson.M{"$exists": false}
	} else {
		hFilter["h.Versi"] = old.Versi
	}
	result, err := r.col.UpdateOne(ctx,
		bson.M{"Pusat.Distrik.Resort.Huria.IdHuria": old.IdHuria},
		bson.M{"$set": bson.M{"Pusat.Distrik.$[d].Resort.$[r].Huria.$[h]": updated}},
		options.UpdateOne().SetArrayFilters([]any{dFilter, rFilter, hFilter}),
	)
	if err != nil {
		return err
	}
	if result.ModifiedCount == 0 {
		return errors.New("konflik perubahan Huria; silakan refresh data sebelum menyimpan ulang")
	}
	return nil
}

func (r *wilayahMongo) FindUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	var u domain.User
	err := r.userCol.FindOne(ctx, bson.M{"email": strings.ToLower(email)}).Decode(&u)
	if err != nil {
		// Fallback memory check
		for _, def := range defaultUsers {
			if strings.EqualFold(def.Email, email) {
				return &def, nil
			}
		}
		return nil, err
	}
	return &u, nil
}
