package main

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"HKBP/internal/config"
	"HKBP/internal/database"
	"HKBP/internal/domain"
	"HKBP/internal/seeder"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// Helper: parse string date to time.Time (BSON Date)
func parseDate(s string) time.Time {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Now().UTC()
	}
	formats := []string{
		"2006-01-02",
		"2006-01-02T15:04:05Z07:00",
		time.RFC3339,
		"2006/01/02",
	}
	for _, f := range formats {
		if t, err := time.Parse(f, s); err == nil {
			return t.UTC()
		}
	}
	return time.Now().UTC()
}

// Helper: derive Distrik code from Roman numeral in name (e.g. VIII -> DIS-08, II -> DIS-02)
func deriveDistrikKode(name string, fallbackIdx int) string {
	upper := strings.ToUpper(name)
	romanMap := []struct {
		roman string
		num   int
	}{
		{"VIII", 8}, {"VII", 7}, {"VI", 6}, {"IV", 4}, {"V", 5},
		{"IX", 9}, {"III", 3}, {"II", 2}, {"I", 1}, {"X", 10},
		{"XI", 11}, {"XII", 12}, {"XIII", 13}, {"XIV", 14}, {"XV", 15},
		{"XVI", 16}, {"XVII", 17}, {"XVIII", 18}, {"XIX", 19}, {"XX", 20},
	}
	for _, r := range romanMap {
		pattern := " " + r.roman + " "
		if strings.Contains(upper+" ", pattern) || strings.HasPrefix(upper, r.roman+" ") {
			return fmt.Sprintf("DIS-%02d", r.num)
		}
	}
	return fmt.Sprintf("DIS-%02d", fallbackIdx)
}

// Helper: execute bulk writes safely in chunks
func executeBulk(ctx context.Context, col *mongo.Collection, models []mongo.WriteModel) error {
	if len(models) == 0 {
		return nil
	}
	const batchSize = 1000
	for i := 0; i < len(models); i += batchSize {
		end := i + batchSize
		if end > len(models) {
			end = len(models)
		}
		batch := models[i:end]
		_, err := col.BulkWrite(ctx, batch, options.BulkWrite().SetOrdered(false))
		if err != nil {
			return err
		}
	}
	return nil
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println(".env tidak ditemukan, menggunakan konfigurasi environment bawaan")
	}

	cfg := config.Load()
	db, err := database.Connect(cfg.MongoURI, cfg.MongoDB)
	if err != nil {
		log.Fatalf("Gagal terhubung ke MongoDB (%s / %s): %v\n", cfg.MongoURI, cfg.MongoDB, err)
	}
	log.Printf("Terhubung ke MongoDB: %s [DB: %s]\n", cfg.MongoURI, cfg.MongoDB)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	// 1. Ambil data dari collection "HKBP"
	log.Println("Membaca dokumen wilayah dari collection 'HKBP'...")
	oldCol := db.Collection("HKBP")
	cursor, err := oldCol.Find(ctx, bson.M{})
	var wilayahList []domain.Wilayah
	if err == nil {
		_ = cursor.All(ctx, &wilayahList)
	}

	// Fallback ke seeder jika collection HKBP kosong
	if len(wilayahList) == 0 {
		log.Println("Collection 'HKBP' kosong, membaca fallback dari seeder...")
		seeded, seedErr := seeder.GenerateSeedData("wilayah.json")
		if seedErr != nil {
			log.Fatalf("Gagal membaca data awal: %v\n", seedErr)
		}
		wilayahList = seeded
	}
	log.Printf("Data sumber berhasil dimuat: %d dokumen root\n", len(wilayahList))

	// 2. Siapkan references ke semua koleksi target (tanpa gereja)
	distrikCol := db.Collection("distrik")
	resortCol := db.Collection("resort")
	huriaCol := db.Collection("huria")

	lungguCol := db.Collection("lunggu")
	sesiCol := db.Collection("sesi_ibadah")
	kategoriCol := db.Collection("kategori_pemasukan")
	pemasukanCol := db.Collection("pemasukan_jemaat")
	alokasiCol := db.Collection("alokasi_transaksi")
	setoranCol := db.Collection("setoran_pusat")
	rincianCol := db.Collection("rincian_setoran_pusat")

	// 3. Buat Index untuk semua koleksi
	log.Println("Membuat indeks MongoDB untuk seluruh koleksi target...")

	// Indeks distrik
	_, err = distrikCol.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "Kode", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("idx_distrik_kode_unique"),
		},
		{
			Keys: bson.D{{Key: "Nama", Value: 1}},
			Options: options.Index().
				SetUnique(true).
				SetCollation(&options.Collation{Locale: "id", Strength: 2}).
				SetName("idx_distrik_nama_unique_ci"),
		},
	})
	if err != nil {
		log.Printf("Peringatan indeks distrik: %v\n", err)
	}

	// Indeks resort
	_, err = resortCol.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "Kode", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("idx_resort_kode_unique"),
		},
		{
			Keys: bson.D{{Key: "IdDistrik", Value: 1}, {Key: "Nama", Value: 1}},
			Options: options.Index().
				SetUnique(true).
				SetCollation(&options.Collation{Locale: "id", Strength: 2}).
				SetName("idx_resort_induk_nama_unique_ci"),
		},
		{
			Keys:    bson.D{{Key: "IdDistrik", Value: 1}},
			Options: options.Index().SetName("idx_resort_id_distrik"),
		},
	})
	if err != nil {
		log.Printf("Peringatan indeks resort: %v\n", err)
	}

	// Indeks huria
	_, err = huriaCol.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "Kode", Value: 1}},
			Options: options.Index().SetUnique(true).SetName("idx_huria_kode_unique"),
		},
		{
			Keys: bson.D{{Key: "IdResort", Value: 1}, {Key: "Nama", Value: 1}},
			Options: options.Index().
				SetUnique(true).
				SetCollation(&options.Collation{Locale: "id", Strength: 2}).
				SetName("idx_huria_induk_nama_unique_ci"),
		},
		{
			Keys:    bson.D{{Key: "IdResort", Value: 1}},
			Options: options.Index().SetName("idx_huria_id_resort"),
		},
		{
			Keys:    bson.D{{Key: "IdDistrik", Value: 1}},
			Options: options.Index().SetName("idx_huria_id_distrik"),
		},
	})
	if err != nil {
		log.Printf("Peringatan indeks huria: %v\n", err)
	}

	// Helper membuat indeks foreign keys untuk koleksi keuangan (IdHuria, IdResort, IdDistrik)
	createFinancialIndexes := func(col *mongo.Collection, idField string, hasDate bool, dateField string) {
		idxModels := []mongo.IndexModel{
			{
				Keys:    bson.D{{Key: idField, Value: 1}},
				Options: options.Index().SetUnique(true).SetName(fmt.Sprintf("idx_%s_unique", idField)),
			},
			{Keys: bson.D{{Key: "IdHuria", Value: 1}}, Options: options.Index().SetName("idx_id_huria")},
			{Keys: bson.D{{Key: "IdResort", Value: 1}}, Options: options.Index().SetName("idx_id_resort")},
			{Keys: bson.D{{Key: "IdDistrik", Value: 1}}, Options: options.Index().SetName("idx_id_distrik")},
		}
		if hasDate && dateField != "" {
			idxModels = append(idxModels, mongo.IndexModel{
				Keys:    bson.D{{Key: dateField, Value: 1}},
				Options: options.Index().SetName(fmt.Sprintf("idx_%s", dateField)),
			})
		}
		_, _ = col.Indexes().CreateMany(ctx, idxModels)
	}

	createFinancialIndexes(lungguCol, "IdLunggu", false, "")
	createFinancialIndexes(sesiCol, "IdSesi", true, "Tanggal")
	createFinancialIndexes(kategoriCol, "IdKategori", false, "")
	createFinancialIndexes(pemasukanCol, "IdTransaksi", true, "Tanggal")
	createFinancialIndexes(alokasiCol, "IdAlokasi", false, "")
	createFinancialIndexes(setoranCol, "IdSetoran", true, "TanggalSetor")
	createFinancialIndexes(rincianCol, "IdRincian", false, "")

	// 4. Proses Migrasi Data
	log.Println("Memproses pemisahan data hirarki dan koleksi keuangan...")
	now := time.Now().UTC()

	var lungguOps []mongo.WriteModel
	var sesiOps []mongo.WriteModel
	var kategoriOps []mongo.WriteModel
	var pemasukanOps []mongo.WriteModel
	var alokasiOps []mongo.WriteModel
	var setoranOps []mongo.WriteModel
	var rincianOps []mongo.WriteModel

	resortCounter := 0
	huriaCounter := 0

	for _, w := range wilayahList {
		for dIdx, d := range w.Pusat.Distrik {
			distrikKode := deriveDistrikKode(d.NamaDistrik, dIdx+1)

			// Cari atau buat ObjectID untuk Distrik
			var existingDistrik struct {
				ID bson.ObjectID `bson:"_id"`
			}
			errFind := distrikCol.FindOne(ctx, bson.M{
				"$or": []bson.M{
					{"Kode": distrikKode},
					{"Nama": d.NamaDistrik},
				},
			}).Decode(&existingDistrik)

			var distrikID bson.ObjectID
			if errFind == nil {
				distrikID = existingDistrik.ID
			} else {
				distrikID = bson.NewObjectID()
			}

			// Upsert dokumen distrik
			_, err = distrikCol.UpdateOne(ctx,
				bson.M{"_id": distrikID},
				bson.M{
					"$set": bson.M{
						"Kode":       distrikKode,
						"Nama":       strings.TrimSpace(d.NamaDistrik),
						"Aktif":      true,
						"DiubahPada": now,
					},
					"$setOnInsert": bson.M{
						"DibuatPada": now,
					},
				},
				options.UpdateOne().SetUpsert(true),
			)
			if err != nil {
				log.Fatalf("Gagal upsert distrik %s: %v\n", d.NamaDistrik, err)
			}

			// Proses Resort
			for _, res := range d.Resort {
				resortCounter++
				resortKode := fmt.Sprintf("RES-%02d", resortCounter)

				var existingResort struct {
					ID bson.ObjectID `bson:"_id"`
				}
				errFindRes := resortCol.FindOne(ctx, bson.M{
					"$or": []bson.M{
						{"Kode": resortKode},
						{"IdDistrik": distrikID, "Nama": res.NamaResort},
					},
				}).Decode(&existingResort)

				var resortID bson.ObjectID
				if errFindRes == nil {
					resortID = existingResort.ID
				} else {
					resortID = bson.NewObjectID()
				}

				_, err = resortCol.UpdateOne(ctx,
					bson.M{"_id": resortID},
					bson.M{
						"$set": bson.M{
							"Kode":       resortKode,
							"Nama":       strings.TrimSpace(res.NamaResort),
							"IdDistrik":  distrikID,
							"Aktif":      true,
							"DiubahPada": now,
						},
						"$setOnInsert": bson.M{
							"DibuatPada": now,
						},
					},
					options.UpdateOne().SetUpsert(true),
				)
				if err != nil {
					log.Fatalf("Gagal upsert resort %s: %v\n", res.NamaResort, err)
				}

				// Proses Huria (atribut gereja langsung di Huria)
				for _, h := range res.Huria {
					huriaCounter++
					huriaKode := strings.TrimSpace(h.IdHuria)
					if huriaKode == "" {
						huriaKode = fmt.Sprintf("HUR-%02d", huriaCounter)
					}

					var existingHuria struct {
						ID bson.ObjectID `bson:"_id"`
					}
					errFindHur := huriaCol.FindOne(ctx, bson.M{
						"$or": []bson.M{
							{"Kode": huriaKode},
							{"IdResort": resortID, "Nama": h.NamaHuria},
						},
					}).Decode(&existingHuria)

					var huriaID bson.ObjectID
					if errFindHur == nil {
						huriaID = existingHuria.ID
					} else {
						huriaID = bson.NewObjectID()
					}

					_, err = huriaCol.UpdateOne(ctx,
						bson.M{"_id": huriaID},
						bson.M{
							"$set": bson.M{
								"Kode":                huriaKode,
								"Nama":                strings.TrimSpace(h.NamaHuria),
								"LokasiHuria":         h.LokasiHuria,
								"TahunBerdiri":        h.TahunBerdiri,
								"NamaPendetaPimpinan": h.NamaPendetaPimpinan,
								"JumlahJemaat":        h.JumlahJemaat,
								"KepalaKeluarga":      h.KepalaKeluarga,
								"WartaJemaat":         h.WartaJemaat,
								"IdResort":            resortID,
								"IdDistrik":           distrikID,
								"Aktif":               true,
								"DiubahPada":          now,
							},
							"$setOnInsert": bson.M{
								"DibuatPada": now,
							},
						},
						options.UpdateOne().SetUpsert(true),
					)
					if err != nil {
						log.Fatalf("Gagal upsert huria %s: %v\n", h.NamaHuria, err)
					}

					// Koleksi 1: Lunggu
					for _, l := range h.Lunggu {
						lDoc := bson.M{
							"IdLunggu":   l.IdLunggu,
							"NamaLunggu": l.NamaLunggu,
							"Keterangan": l.Keterangan,
							"IdHuria":    huriaID,
							"IdResort":   resortID,
							"IdDistrik":  distrikID,
						}
						model := mongo.NewUpdateOneModel().
							SetFilter(bson.M{"IdLunggu": l.IdLunggu}).
							SetUpdate(bson.M{"$set": lDoc, "$setOnInsert": bson.M{"_id": bson.NewObjectID()}}).
							SetUpsert(true)
						lungguOps = append(lungguOps, model)
					}

					// Koleksi 2: Sesi Ibadah
					for _, s := range h.SesiIbadah {
						var peleanList []bson.M
						for _, p := range s.Pelean {
							peleanList = append(peleanList, bson.M{
								"Jenis":   p.Jenis,
								"Nominal": p.Nominal,
							})
						}
						sDoc := bson.M{
							"IdSesi":      s.IdSesi,
							"NamaSesi":    s.NamaSesi,
							"Tanggal":     parseDate(s.Tanggal),
							"JamMulai":    s.JamMulai,
							"JumlahHadir": s.JumlahHadir,
							"Pelean":      peleanList,
							"IdHuria":     huriaID,
							"IdResort":    resortID,
							"IdDistrik":   distrikID,
						}
						model := mongo.NewUpdateOneModel().
							SetFilter(bson.M{"IdSesi": s.IdSesi}).
							SetUpdate(bson.M{"$set": sDoc, "$setOnInsert": bson.M{"_id": bson.NewObjectID()}}).
							SetUpsert(true)
						sesiOps = append(sesiOps, model)
					}

					// Koleksi 3: Kategori Pemasukan
					for _, k := range h.KategoriPemasukan {
						kDoc := bson.M{
							"IdKategori":      k.IdKategori,
							"NamaKategori":    k.NamaKategori,
							"IdKategoriInduk": k.IdKategoriInduk,
							"IdHuria":         huriaID,
							"IdResort":        resortID,
							"IdDistrik":       distrikID,
						}
						model := mongo.NewUpdateOneModel().
							SetFilter(bson.M{"IdKategori": k.IdKategori}).
							SetUpdate(bson.M{"$set": kDoc, "$setOnInsert": bson.M{"_id": bson.NewObjectID()}}).
							SetUpsert(true)
						kategoriOps = append(kategoriOps, model)
					}

					// Koleksi 4: Pemasukan Jemaat
					for _, pj := range h.PemasukanJemaat {
						pjDoc := bson.M{
							"IdTransaksi": pj.IdTransaksi,
							"Tanggal":     parseDate(pj.Tanggal),
							"Nominal":     pj.Nominal,
							"IdKategori":  pj.IdKategori,
							"Keterangan":  pj.Keterangan,
							"IdHuria":     huriaID,
							"IdResort":    resortID,
							"IdDistrik":   distrikID,
						}
						model := mongo.NewUpdateOneModel().
							SetFilter(bson.M{"IdTransaksi": pj.IdTransaksi}).
							SetUpdate(bson.M{"$set": pjDoc, "$setOnInsert": bson.M{"_id": bson.NewObjectID()}}).
							SetUpsert(true)
						pemasukanOps = append(pemasukanOps, model)
					}

					// Koleksi 5: Alokasi Transaksi
					for _, al := range h.AlokasiTransaksi {
						peruntukan := al.Peruntukan
						if peruntukan != "Setoran Pusat" {
							peruntukan = "Kas Huria"
						}
						alDoc := bson.M{
							"IdAlokasi":   al.IdAlokasi,
							"IdTransaksi": al.IdTransaksi,
							"Peruntukan":  peruntukan,
							"Nominal":     al.Nominal,
							"IdHuria":     huriaID,
							"IdResort":    resortID,
							"IdDistrik":   distrikID,
						}
						model := mongo.NewUpdateOneModel().
							SetFilter(bson.M{"IdAlokasi": al.IdAlokasi}).
							SetUpdate(bson.M{"$set": alDoc, "$setOnInsert": bson.M{"_id": bson.NewObjectID()}}).
							SetUpsert(true)
						alokasiOps = append(alokasiOps, model)
					}

					// Koleksi 6: Setoran Pusat
					for _, sp := range h.SetoranPusat {
						spDoc := bson.M{
							"IdSetoran":    sp.IdSetoran,
							"Periode":      sp.Periode,
							"TanggalSetor": parseDate(sp.TanggalSetor),
							"TotalSetoran": sp.TotalSetoran,
							"Keterangan":   sp.Keterangan,
							"IdHuria":      huriaID,
							"IdResort":     resortID,
							"IdDistrik":    distrikID,
						}
						model := mongo.NewUpdateOneModel().
							SetFilter(bson.M{"IdSetoran": sp.IdSetoran}).
							SetUpdate(bson.M{"$set": spDoc, "$setOnInsert": bson.M{"_id": bson.NewObjectID()}}).
							SetUpsert(true)
						setoranOps = append(setoranOps, model)
					}

					// Koleksi 7: Rincian Setoran Pusat
					for _, rsp := range h.RincianSetoranPusat {
						rspDoc := bson.M{
							"IdRincian":       rsp.IdRincian,
							"IdSetoran":       rsp.IdSetoran,
							"IdAlokasi":       rsp.IdAlokasi,
							"NominalDilunasi": rsp.NominalDilunasi,
							"IdHuria":         huriaID,
							"IdResort":        resortID,
							"IdDistrik":       distrikID,
						}
						model := mongo.NewUpdateOneModel().
							SetFilter(bson.M{"IdRincian": rsp.IdRincian}).
							SetUpdate(bson.M{"$set": rspDoc, "$setOnInsert": bson.M{"_id": bson.NewObjectID()}}).
							SetUpsert(true)
						rincianOps = append(rincianOps, model)
					}
				}
			}
		}
	}

	// 5. Eksekusi Bulk Writes untuk 7 Koleksi Keuangan
	log.Println("Menyimpan dokumen keuangan ke koleksi masing-masing...")
	if err := executeBulk(ctx, lungguCol, lungguOps); err != nil {
		log.Fatalf("Gagal bulk write lunggu: %v\n", err)
	}
	if err := executeBulk(ctx, sesiCol, sesiOps); err != nil {
		log.Fatalf("Gagal bulk write sesi_ibadah: %v\n", err)
	}
	if err := executeBulk(ctx, kategoriCol, kategoriOps); err != nil {
		log.Fatalf("Gagal bulk write kategori_pemasukan: %v\n", err)
	}
	if err := executeBulk(ctx, pemasukanCol, pemasukanOps); err != nil {
		log.Fatalf("Gagal bulk write pemasukan_jemaat: %v\n", err)
	}
	if err := executeBulk(ctx, alokasiCol, alokasiOps); err != nil {
		log.Fatalf("Gagal bulk write alokasi_transaksi: %v\n", err)
	}
	if err := executeBulk(ctx, setoranCol, setoranOps); err != nil {
		log.Fatalf("Gagal bulk write setoran_pusat: %v\n", err)
	}
	if err := executeBulk(ctx, rincianCol, rincianOps); err != nil {
		log.Fatalf("Gagal bulk write rincian_setoran_pusat: %v\n", err)
	}

	// 6. Cetak Ringkasan Jumlah Data per Koleksi
	countDoc := func(col *mongo.Collection) int64 {
		c, _ := col.CountDocuments(ctx, bson.M{})
		return c
	}

	fmt.Println("\n==================================================")
	fmt.Println("       RINGKASAN HASIL MIGRASI KOLEKSI HKBP       ")
	fmt.Println("==================================================")
	fmt.Printf("1.  distrik                : %6d dokumen\n", countDoc(distrikCol))
	fmt.Printf("2.  resort                 : %6d dokumen\n", countDoc(resortCol))
	fmt.Printf("3.  huria                  : %6d dokumen\n", countDoc(huriaCol))
	fmt.Println("--------------------------------------------------")
	fmt.Printf("4.  lunggu                 : %6d dokumen\n", countDoc(lungguCol))
	fmt.Printf("5.  sesi_ibadah            : %6d dokumen\n", countDoc(sesiCol))
	fmt.Printf("6.  kategori_pemasukan     : %6d dokumen\n", countDoc(kategoriCol))
	fmt.Printf("7.  pemasukan_jemaat       : %6d dokumen\n", countDoc(pemasukanCol))
	fmt.Printf("8.  alokasi_transaksi      : %6d dokumen\n", countDoc(alokasiCol))
	fmt.Printf("9.  setoran_pusat          : %6d dokumen\n", countDoc(setoranCol))
	fmt.Printf("10. rincian_setoran_pusat  : %6d dokumen\n", countDoc(rincianCol))
	fmt.Println("--------------------------------------------------")
	fmt.Printf("Koleksi 'HKBP' lama        : %6d dokumen (Tetap dipertahankan)\n", countDoc(oldCol))
	fmt.Println("==================================================")
	fmt.Println("Migrasi selesai dengan sukses tanpa error!")
}
