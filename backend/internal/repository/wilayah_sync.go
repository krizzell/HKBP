package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"HKBP/internal/domain"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// SyncTree menambahkan/memperbarui profil dari master secara NON-DESTRUKTIF.
// Elemen lama yang belum ada di master tetap dipertahankan. Data keuangan pada
// Huria tidak pernah diganti. Penghapusan permanen hierarki butuh workflow lain.
func (r *wilayahMongo) SyncTree(ctx context.Context) error {
	roots, err := r.FindAll(ctx)
	if err != nil {
		return err
	}
	if len(roots) != 1 {
		return fmt.Errorf("sync ditolak: dibutuhkan tepat satu dokumen pusat, ditemukan %d", len(roots))
	}
	var raw bson.M
	if err = r.col.FindOne(ctx, bson.M{}).Decode(&raw); err != nil {
		return err
	}
	rootID := raw["_id"]
	tree := &roots[0]
	dCur, err := r.db.Collection("distrik").Find(ctx, bson.M{})
	if err != nil {
		return err
	}
	var districts []domain.DistrikDoc
	if err = dCur.All(ctx, &districts); err != nil {
		return err
	}
	rCur, err := r.db.Collection("resort").Find(ctx, bson.M{})
	if err != nil {
		return err
	}
	var resorts []domain.ResortDoc
	if err = rCur.All(ctx, &resorts); err != nil {
		return err
	}
	hCur, err := r.db.Collection("huria").Find(ctx, bson.M{})
	if err != nil {
		return err
	}
	var hurias []domain.HuriaDoc
	if err = hCur.All(ctx, &hurias); err != nil {
		return err
	}

	// Validasi referensi induk sebelum mulai menulis.
	districtIDs := make(map[string]bool)
	resortIDs := make(map[string]bool)
	for _, d := range districts {
		districtIDs[d.ID.Hex()] = true
	}
	for _, res := range resorts {
		if !districtIDs[res.IdDistrik.Hex()] {
			return fmt.Errorf("sync ditolak: resort %s tidak memiliki distrik induk aktif", res.Nama)
		}
		resortIDs[res.ID.Hex()] = true
	}
	for _, h := range hurias {
		if !resortIDs[h.IdResort.Hex()] {
			return fmt.Errorf("sync ditolak: Huria %s tidak memiliki resort induk aktif", h.Nama)
		}
	}
	// Cegah salinan Resort/Huria pada dua induk bila master sudah pernah dipindah.
	// Ini pemeriksaan non-destruktif; perpindahan yang aman butuh migrasi tersendiri.
	docDistriks := make(map[string]domain.DistrikDoc)
	for _, d := range districts {
		docDistriks[d.ID.Hex()] = d
	}
	docResorts := make(map[string]domain.ResortDoc)
	for _, res := range resorts {
		docResorts[res.ID.Hex()] = res
	}
	for _, doc := range resorts {
		target := docDistriks[doc.IdDistrik.Hex()]
		for _, d := range tree.Pusat.Distrik {
			for _, res := range d.Resort {
				identitySame := res.IdResort == doc.ID.Hex() || (res.KodeResort != "" && res.KodeResort == doc.Kode && strings.EqualFold(res.NamaResort, doc.Nama))
				if identitySame && d.IdDistrik != target.ID.Hex() && d.KodeDistrik != target.Kode && !strings.EqualFold(d.NamaDistrik, target.Nama) {
					return fmt.Errorf("sinkronisasi ditolak: Resort %s masih berada pada Distrik berbeda; jangan menggandakan data sebelum migrasi pemindahan", doc.Nama)
				}
			}
		}
	}
	for _, doc := range hurias {
		target := docResorts[doc.IdResort.Hex()]
		for _, d := range tree.Pusat.Distrik {
			for _, res := range d.Resort {
				for _, h := range res.Huria {
					if h.IdHuria == doc.Kode && res.IdResort != target.ID.Hex() && res.KodeResort != target.Kode && !strings.EqualFold(res.NamaResort, target.Nama) {
						return fmt.Errorf("sinkronisasi ditolak: Huria %s masih berada pada Resort berbeda; jangan menggandakan transaksi", doc.Nama)
					}
				}
			}
		}
	}
	filterRoot := bson.M{"_id": rootID}
	apply := func(update bson.M, filters ...any) error {
		opt := options.UpdateOne()
		if len(filters) > 0 {
			opt.SetArrayFilters(filters)
		}
		result, e := r.col.UpdateOne(ctx, filterRoot, update, opt)
		if e != nil {
			return e
		}
		if result.MatchedCount == 0 {
			return errors.New("dokumen pusat tidak ditemukan ketika sinkronisasi")
		}
		if _, isPush := update["$push"]; isPush && result.ModifiedCount == 0 {
			return errors.New("induk array tidak ditemukan ketika sinkronisasi; refresh dan periksa referensi master")
		}
		return nil
	}
	// Pilih kunci filter dari identitas lama, baru ubah metadata.
	dFilter := func(d domain.Distrik) bson.M {
		if d.IdDistrik != "" {
			return bson.M{"d.IdDistrik": d.IdDistrik}
		}
		if d.KodeDistrik != "" {
			return bson.M{"d.KodeDistrik": d.KodeDistrik}
		}
		return bson.M{"d.NamaDistrik": d.NamaDistrik}
	}
	rFilter := func(res domain.Resort) bson.M {
		if res.IdResort != "" {
			return bson.M{"r.IdResort": res.IdResort}
		}
		if res.KodeResort != "" {
			return bson.M{"r.KodeResort": res.KodeResort}
		}
		return bson.M{"r.NamaResort": res.NamaResort}
	}
	distIndex := make(map[string]int)
	for _, doc := range districts {
		idx := -1
		for i, d := range tree.Pusat.Distrik {
			if d.IdDistrik == doc.ID.Hex() || d.KodeDistrik == doc.Kode || strings.EqualFold(d.NamaDistrik, doc.Nama) {
				idx = i
				break
			}
		}
		if idx < 0 {
			districtActive := doc.Aktif
			newDistrict := domain.Distrik{Aktif: &districtActive, IdDistrik: doc.ID.Hex(), KodeDistrik: doc.Kode,
				NamaDistrik: doc.Nama, NamaPraeses: doc.NamaPraeses, Resort: []domain.Resort{}}
			if err = apply(bson.M{"$push": bson.M{"Pusat.Distrik": newDistrict}}); err != nil {
				return err
			}
			tree.Pusat.Distrik = append(tree.Pusat.Distrik, newDistrict)
			idx = len(tree.Pusat.Distrik) - 1
		} else {
			old := tree.Pusat.Distrik[idx]
			update := bson.M{"$set": bson.M{
				"Pusat.Distrik.$[d].IdDistrik":   doc.ID.Hex(),
				"Pusat.Distrik.$[d].KodeDistrik": doc.Kode,
				"Pusat.Distrik.$[d].NamaDistrik": doc.Nama,
				"Pusat.Distrik.$[d].NamaPraeses": doc.NamaPraeses,
				"Pusat.Distrik.$[d].Aktif":       doc.Aktif,
			}}
			if err = apply(update, dFilter(old)); err != nil {
				return err
			}
			tree.Pusat.Distrik[idx].IdDistrik = doc.ID.Hex()
			tree.Pusat.Distrik[idx].KodeDistrik = doc.Kode
			tree.Pusat.Distrik[idx].NamaDistrik = doc.Nama
			tree.Pusat.Distrik[idx].NamaPraeses = doc.NamaPraeses
			status := doc.Aktif
			tree.Pusat.Distrik[idx].Aktif = &status
		}
		distIndex[doc.ID.Hex()] = idx
	}
	resortIndex := make(map[string][2]int)
	for _, doc := range resorts {
		di := distIndex[doc.IdDistrik.Hex()]
		d := &tree.Pusat.Distrik[di]
		idx := -1
		for i, res := range d.Resort {
			if res.IdResort == doc.ID.Hex() || res.KodeResort == doc.Kode || strings.EqualFold(res.NamaResort, doc.Nama) {
				idx = i
				break
			}
		}
		if idx < 0 {
			resortActive := doc.Aktif
			newRes := domain.Resort{Aktif: &resortActive, IdResort: doc.ID.Hex(), KodeResort: doc.Kode, NamaResort: doc.Nama,
				NamaPendetaResort: doc.NamaPendetaResort, Huria: []domain.Huria{}}
			if err = apply(bson.M{"$push": bson.M{"Pusat.Distrik.$[d].Resort": newRes}}, dFilter(*d)); err != nil {
				return err
			}
			d.Resort = append(d.Resort, newRes)
			idx = len(d.Resort) - 1
		} else {
			old := d.Resort[idx]
			if err = apply(bson.M{"$set": bson.M{
				"Pusat.Distrik.$[d].Resort.$[r].IdResort":          doc.ID.Hex(),
				"Pusat.Distrik.$[d].Resort.$[r].KodeResort":        doc.Kode,
				"Pusat.Distrik.$[d].Resort.$[r].NamaResort":        doc.Nama,
				"Pusat.Distrik.$[d].Resort.$[r].NamaPendetaResort": doc.NamaPendetaResort,
				"Pusat.Distrik.$[d].Resort.$[r].Aktif":             doc.Aktif,
			}}, dFilter(*d), rFilter(old)); err != nil {
				return err
			}
			d.Resort[idx].IdResort = doc.ID.Hex()
			d.Resort[idx].KodeResort = doc.Kode
			d.Resort[idx].NamaResort = doc.Nama
			d.Resort[idx].NamaPendetaResort = doc.NamaPendetaResort
			status := doc.Aktif
			d.Resort[idx].Aktif = &status
		}
		resortIndex[doc.ID.Hex()] = [2]int{di, idx}
	}
	for _, doc := range hurias {
		loc := resortIndex[doc.IdResort.Hex()]
		d := &tree.Pusat.Distrik[loc[0]]
		res := &d.Resort[loc[1]]
		idx := -1
		for i, h := range res.Huria {
			if h.IdHuria == doc.Kode || strings.EqualFold(h.NamaHuria, doc.Nama) {
				idx = i
				break
			}
		}
		profile := bson.M{
			"Pusat.Distrik.$[d].Resort.$[r].Huria.$[h].NamaHuria":           doc.Nama,
			"Pusat.Distrik.$[d].Resort.$[r].Huria.$[h].Aktif":               doc.Aktif,
			"Pusat.Distrik.$[d].Resort.$[r].Huria.$[h].LokasiHuria":         doc.LokasiHuria,
			"Pusat.Distrik.$[d].Resort.$[r].Huria.$[h].TahunBerdiri":        doc.TahunBerdiri,
			"Pusat.Distrik.$[d].Resort.$[r].Huria.$[h].NamaPendetaPimpinan": doc.NamaPendetaPimpinan,
			"Pusat.Distrik.$[d].Resort.$[r].Huria.$[h].JumlahJemaat":        doc.JumlahJemaat,
			"Pusat.Distrik.$[d].Resort.$[r].Huria.$[h].KepalaKeluarga":      doc.KepalaKeluarga,
		}
		if idx < 0 {
			huriaActive := doc.Aktif
			h := domain.Huria{Aktif: &huriaActive, IdHuria: doc.Kode, NamaHuria: doc.Nama, LokasiHuria: doc.LokasiHuria,
				TahunBerdiri: doc.TahunBerdiri, NamaPendetaPimpinan: doc.NamaPendetaPimpinan,
				JumlahJemaat: doc.JumlahJemaat, KepalaKeluarga: doc.KepalaKeluarga,
				Lunggu: []domain.Lunggu{}, SesiIbadah: []domain.SesiIbadah{},
				KategoriPemasukan: []domain.KategoriPemasukan{}, PemasukanJemaat: []domain.PemasukanJemaat{},
				AlokasiTransaksi: []domain.AlokasiTransaksi{}, SetoranPusat: []domain.SetoranPusat{},
				RincianSetoranPusat: []domain.RincianSetoranPusat{},
			}
			if err = apply(bson.M{"$push": bson.M{"Pusat.Distrik.$[d].Resort.$[r].Huria": h}}, dFilter(*d), rFilter(*res)); err != nil {
				return err
			}
			res.Huria = append(res.Huria, h)
		} else {
			old := res.Huria[idx]
			if err = apply(bson.M{"$set": profile}, dFilter(*d), rFilter(*res), bson.M{"h.IdHuria": old.IdHuria}); err != nil {
				return err
			}
			res.Huria[idx].NamaHuria = doc.Nama
			status := doc.Aktif
			res.Huria[idx].Aktif = &status
		}
	}
	return nil
}
