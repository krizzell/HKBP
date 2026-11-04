package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"HKBP/internal/domain"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

// BootstrapMasterFromTree melakukan backfill NON-DESTRUKTIF dari collection HKBP
// menuju collection master. Aman dipanggil berulang: entitas master yang sudah
// tersedia dipertahankan, yang belum ada ditambahkan. Data historis keuangan
// pada dokumen HKBP tidak disentuh. Ini BUKAN migrasi data finansial.
func BootstrapMasterFromTree(ctx context.Context, db *mongo.Database) error {
	dCol, rCol, hCol := db.Collection("distrik"), db.Collection("resort"), db.Collection("huria")
	var roots []domain.Wilayah
	cur, err := db.Collection("HKBP").Find(ctx, bson.M{})
	if err != nil {
		return err
	}
	if err = cur.All(ctx, &roots); err != nil {
		return err
	}
	if len(roots) == 0 {
		return nil
	} // jangan membuat data palsu ketika root hilang
	if len(roots) != 1 {
		return fmt.Errorf("bootstrap master ditolak: %d dokumen pusat", len(roots))
	}

	var districts []domain.DistrikDoc
	if c, e := dCol.Find(ctx, bson.M{}); e != nil {
		return e
	} else if e = c.All(ctx, &districts); e != nil {
		return e
	}
	var resorts []domain.ResortDoc
	if c, e := rCol.Find(ctx, bson.M{}); e != nil {
		return e
	} else if e = c.All(ctx, &resorts); e != nil {
		return e
	}
	var hurias []domain.HuriaDoc
	if c, e := hCol.Find(ctx, bson.M{}); e != nil {
		return e
	} else if e = c.All(ctx, &hurias); e != nil {
		return e
	}

	now := time.Now().UTC()
	// Kode unik di master Resort bersifat global, padahal sumber bisa memakai
	// RES-01 berulang di Distrik berbeda. Gunakan prefix hanya saat bentrok.
	usedRCodes := map[string]bool{}
	for _, r := range resorts {
		usedRCodes[strings.ToLower(r.Kode)] = true
	}
	for _, d := range roots[0].Pusat.Distrik {
		dcode := strings.TrimSpace(d.KodeDistrik)
		var parent *domain.DistrikDoc
		for i := range districts {
			item := &districts[i]
			if (dcode != "" && strings.EqualFold(item.Kode, dcode)) || strings.EqualFold(item.Nama, d.NamaDistrik) {
				parent = item
				break
			}
		}
		if parent == nil {
			did := objectIDOrNew(d.IdDistrik)
			if dcode == "" {
				dcode = "DIS-" + did.Hex()
			}
			candidate := domain.DistrikDoc{ID: did, Kode: dcode, Nama: d.NamaDistrik, NamaPraeses: d.NamaPraeses,
				Aktif: true, DibuatPada: now, DiubahPada: now}
			if _, err = dCol.InsertOne(ctx, candidate); err != nil {
				return fmt.Errorf("gagal menambah master distrik %s: %w", d.NamaDistrik, err)
			}
			districts = append(districts, candidate)
			parent = &districts[len(districts)-1]
		}
		for _, r := range d.Resort {
			rcode := strings.TrimSpace(r.KodeResort)
			var resParent *domain.ResortDoc
			for i := range resorts {
				item := &resorts[i]
				if item.IdDistrik != parent.ID {
					continue
				}
				if (rcode != "" && strings.EqualFold(item.Kode, rcode)) || strings.EqualFold(item.Nama, r.NamaResort) {
					resParent = item
					break
				}
			}
			if resParent == nil {
				rid := objectIDOrNew(r.IdResort)
				if rcode == "" {
					rcode = "RES-" + rid.Hex()
				}
				if usedRCodes[strings.ToLower(rcode)] {
					rcode = parent.Kode + "-" + rcode
				}
				base := rcode
				for n := 2; usedRCodes[strings.ToLower(rcode)]; n++ {
					rcode = fmt.Sprintf("%s-%d", base, n)
				}
				candidate := domain.ResortDoc{ID: rid, Kode: rcode, Nama: r.NamaResort,
					NamaPendetaResort: r.NamaPendetaResort, IdDistrik: parent.ID,
					Aktif: true, DibuatPada: now, DiubahPada: now}
				if _, err = rCol.InsertOne(ctx, candidate); err != nil {
					return fmt.Errorf("gagal menambah master resort %s: %w", r.NamaResort, err)
				}
				resorts = append(resorts, candidate)
				resParent = &resorts[len(resorts)-1]
				usedRCodes[strings.ToLower(rcode)] = true
			}
			for _, h := range r.Huria {
				code := strings.TrimSpace(h.IdHuria)
				if code == "" {
					return fmt.Errorf("Huria %q tidak memiliki IdHuria", h.NamaHuria)
				}
				found := false
				for _, existing := range hurias {
					if existing.Kode == code || (existing.IdResort == resParent.ID && strings.EqualFold(existing.Nama, h.NamaHuria)) {
						found = true
						break
					}
				}
				if found {
					continue
				}
				candidate := domain.HuriaDoc{ID: bson.NewObjectID(), Kode: code, Nama: h.NamaHuria,
					LokasiHuria: h.LokasiHuria, TahunBerdiri: h.TahunBerdiri,
					NamaPendetaPimpinan: h.NamaPendetaPimpinan, JumlahJemaat: h.JumlahJemaat,
					KepalaKeluarga: h.KepalaKeluarga, IdResort: resParent.ID, IdDistrik: parent.ID,
					Aktif: true, DibuatPada: now, DiubahPada: now}
				if _, err = hCol.InsertOne(ctx, candidate); err != nil {
					return fmt.Errorf("gagal menambah master Huria %s: %w", h.NamaHuria, err)
				}
				hurias = append(hurias, candidate)
			}
		}
	}
	return nil
}

func objectIDOrNew(value string) bson.ObjectID {
	if id, err := bson.ObjectIDFromHex(value); err == nil {
		return id
	}
	return bson.NewObjectID()
}
