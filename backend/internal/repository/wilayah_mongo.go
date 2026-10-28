package repository

import (
	"HKBP/internal/domain"
	"HKBP/internal/seeder"
	"context"
	"errors"
	"log"
	"strings"
	"sync"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type wilayahMongo struct {
	db      *mongo.Database
	col     *mongo.Collection
	userCol *mongo.Collection
	mu      sync.RWMutex
	cache   []domain.Wilayah
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
		IdHuria:     "H-1.1.1",
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
		IdHuria:     "H-1.1.1",
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
		IdHuria:     "H-2.1.1",
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
		IdHuria:     "H-2.1.1",
		NamaHuria:   "HKBP Pearaja",
		NamaResort:  "Resort Pearaja Tarutung",
		NamaDistrik: "Distrik II Silindung",
	},
}

func NewWilayahRepository(db *mongo.Database) domain.WilayahRepository {
	repo := &wilayahMongo{
		db:      db,
		col:     db.Collection("HKBP"),
		userCol: db.Collection("users"),
	}

	// Inisialisasi seed data jika koleksi kosong
	ctx := context.Background()
	count, err := repo.col.CountDocuments(ctx, bson.M{})
	if err != nil || count == 0 {
		log.Println("Database HKBP kosong atau baru, melakukan initial seeding...")
		seeded, seedErr := seeder.GenerateSeedData("wilayah.json")
		if seedErr != nil {
			log.Println("Gagal generate seeder:", seedErr)
		} else {
			_ = repo.SaveAll(ctx, seeded)
			_ = seeder.WriteSeededToFile("wilayah.json", seeded)
			log.Printf("Seeding berhasil disimpan! Total distrik: %d\n", len(seeded[0].Pusat.Distrik))
		}
	}

	// Selalu sinkronkan pengguna default untuk integritas RBAC
	for _, u := range defaultUsers {
		_, _ = repo.userCol.DeleteMany(ctx, bson.M{"email": strings.ToLower(u.Email)})
		_, _ = repo.userCol.InsertOne(ctx, u)
	}

	return repo
}

func (r *wilayahMongo) FindAll(ctx context.Context) ([]domain.Wilayah, error) {
	cursor, err := r.col.Find(ctx, bson.M{})
	if err != nil {
		r.mu.RLock()
		defer r.mu.RUnlock()
		if len(r.cache) > 0 {
			return r.cache, nil
		}
		// Fallback ke local wilayah.json
		seeded, errLocal := seeder.GenerateSeedData("wilayah.json")
		if errLocal == nil {
			return seeded, nil
		}
		return nil, err
	}

	result := []domain.Wilayah{}
	if err := cursor.All(ctx, &result); err != nil {
		return nil, err
	}

	if len(result) == 0 {
		seeded, _ := seeder.GenerateSeedData("wilayah.json")
		if len(seeded) > 0 {
			_ = r.SaveAll(ctx, seeded)
			return seeded, nil
		}
	}

	r.mu.Lock()
	r.cache = result
	r.mu.Unlock()

	return result, nil
}

func (r *wilayahMongo) SaveAll(ctx context.Context, data []domain.Wilayah) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.cache = data

	// Ganti semua dokumen di collection
	_, err := r.col.DeleteMany(ctx, bson.M{})
	if err != nil {
		log.Println("Warning delete existing documents:", err)
	}

	docs := make([]any, len(data))
	for i, v := range data {
		docs[i] = v
	}

	_, err = r.col.InsertMany(ctx, docs)
	if err != nil {
		log.Println("Warning insert to mongodb:", err)
	}

	_ = seeder.WriteSeededToFile("wilayah.json", data)
	_ = seeder.WriteSeededToFile("../wilayah.json", data)

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

func (r *wilayahMongo) UpdateHuria(ctx context.Context, idHuria string, updated domain.Huria) error {
	all, err := r.FindAll(ctx)
	if err != nil {
		return err
	}

	found := false
	for wi := range all {
		for di := range all[wi].Pusat.Distrik {
			for ri := range all[wi].Pusat.Distrik[di].Resort {
				for hi := range all[wi].Pusat.Distrik[di].Resort[ri].Huria {
					h := &all[wi].Pusat.Distrik[di].Resort[ri].Huria[hi]
					if h.IdHuria == idHuria || h.NamaHuria == idHuria {
						all[wi].Pusat.Distrik[di].Resort[ri].Huria[hi] = updated
						found = true
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

	return r.SaveAll(ctx, all)
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


func (r *wilayahMongo) SyncTree(ctx context.Context) error {
	// 1. Ambil dokumen HKBP saat ini untuk mempertahankan data finansial huria yang ada
	existingTree, err := r.FindAll(ctx)
	existingHurias := make(map[string]domain.Huria)
	if err == nil {
		for _, w := range existingTree {
			for _, d := range w.Pusat.Distrik {
				for _, res := range d.Resort {
					for _, h := range res.Huria {
						existingHurias[h.IdHuria] = h
						existingHurias[strings.ToLower(strings.TrimSpace(h.NamaHuria))] = h
					}
				}
			}
		}
	}

	// 2. Ambil seluruh Distrik aktif
	distrikCol := r.db.Collection("distrik")
	resortCol := r.db.Collection("resort")
	huriaCol := r.db.Collection("huria")

	dCur, err := distrikCol.Find(ctx, bson.M{"Aktif": true})
	if err != nil {
		return err
	}
	var distrikDocs []domain.DistrikDoc
	if err := dCur.All(ctx, &distrikDocs); err != nil {
		return err
	}

	// 3. Ambil seluruh Resort aktif
	rCur, err := resortCol.Find(ctx, bson.M{"Aktif": true})
	if err != nil {
		return err
	}
	var resortDocs []domain.ResortDoc
	if err := rCur.All(ctx, &resortDocs); err != nil {
		return err
	}

	// 4. Ambil seluruh Huria aktif
	hCur, err := huriaCol.Find(ctx, bson.M{"Aktif": true})
	if err != nil {
		return err
	}
	var huriaDocs []domain.HuriaDoc
	if err := hCur.All(ctx, &huriaDocs); err != nil {
		return err
	}

	// Kelompokkan Huria berdasarkan IdResort
	huriasByResort := make(map[string][]domain.HuriaDoc)
	for _, h := range huriaDocs {
		resKey := h.IdResort.Hex()
		huriasByResort[resKey] = append(huriasByResort[resKey], h)
	}

	// Kelompokkan Resort berdasarkan IdDistrik
	resortsByDistrik := make(map[string][]domain.ResortDoc)
	for _, res := range resortDocs {
		distKey := res.IdDistrik.Hex()
		resortsByDistrik[distKey] = append(resortsByDistrik[distKey], res)
	}

	// 5. Bangun struktur Pusat -> Distrik -> Resort -> Huria
	distrikList := []domain.Distrik{}

	for _, dDoc := range distrikDocs {
		resortList := []domain.Resort{}
		resList := resortsByDistrik[dDoc.ID.Hex()]

		for _, rDoc := range resList {
			huriaList := []domain.Huria{}
			hList := huriasByResort[rDoc.ID.Hex()]

			for _, hDoc := range hList {
				// Cari apakah data huria lama sudah ada
				hKey := strings.ToLower(strings.TrimSpace(hDoc.Nama))
				matched, found := existingHurias[hDoc.Kode]
				if !found {
					matched, found = existingHurias[hKey]
				}

				if found {
					// Update atribut profil
					matched.NamaHuria = hDoc.Nama
					matched.IdHuria = hDoc.Kode
					matched.LokasiHuria = hDoc.LokasiHuria
					matched.TahunBerdiri = hDoc.TahunBerdiri
					matched.NamaPendetaPimpinan = hDoc.NamaPendetaPimpinan
					matched.JumlahJemaat = hDoc.JumlahJemaat
					matched.KepalaKeluarga = hDoc.KepalaKeluarga
					huriaList = append(huriaList, matched)
				} else {
					// Buat Huria baru dengan atribut lengkap
					newHuria := domain.Huria{
						NamaHuria:           hDoc.Nama,
						IdHuria:             hDoc.Kode,
						LokasiHuria:         hDoc.LokasiHuria,
						TahunBerdiri:        hDoc.TahunBerdiri,
						NamaPendetaPimpinan: hDoc.NamaPendetaPimpinan,
						JumlahJemaat:        hDoc.JumlahJemaat,
						KepalaKeluarga:      hDoc.KepalaKeluarga,
						KategoriPemasukan: []domain.KategoriPemasukan{
							{IdKategori: "K-01", NamaKategori: "Pelean Minggu (Ia, Ib, IIa, IIb)"},
							{IdKategori: "K-02", NamaKategori: "Guguan / Iuran Taon Jemaat"},
							{IdKategori: "K-03", NamaKategori: "Hamuliateon (Ucapan Syukur)"},
							{IdKategori: "K-04", NamaKategori: "Pesta Gotilon (Pesta Panen)"},
						},
						Lunggu: []domain.Lunggu{
							{IdLunggu: "L-01", NamaLunggu: "Lunggu Sion", Keterangan: "Sektor I"},
							{IdLunggu: "L-02", NamaLunggu: "Lunggu Bethel", Keterangan: "Sektor II"},
							{IdLunggu: "L-03", NamaLunggu: "Lunggu Jerusalem", Keterangan: "Sektor III"},
						},
					}
					huriaList = append(huriaList, newHuria)
				}
			}

			// Jika NamaPendetaResort masih kosong pada dokumen lama, derive dari Huria pertama atau fallback
			pimpinanResort := strings.TrimSpace(rDoc.NamaPendetaResort)
			if pimpinanResort == "" {
				for _, h := range huriaList {
					if h.NamaPendetaPimpinan != "" {
						pimpinanResort = h.NamaPendetaPimpinan
						break
					}
				}
				if pimpinanResort == "" {
					pimpinanResort = "Pdt. " + rDoc.Nama
				}
				_, _ = resortCol.UpdateOne(ctx, bson.M{"_id": rDoc.ID}, bson.M{"$set": bson.M{"NamaPendetaResort": pimpinanResort}})
				rDoc.NamaPendetaResort = pimpinanResort
			}

			resortList = append(resortList, domain.Resort{
				IdResort:          rDoc.ID.Hex(),
				KodeResort:        rDoc.Kode,
				NamaResort:        rDoc.Nama,
				NamaPendetaResort: pimpinanResort,
				Huria:             huriaList,
			})
		}

		// Jika NamaPraeses masih kosong pada dokumen lama, derive dari daftar standar praeses
		praeses := strings.TrimSpace(dDoc.NamaPraeses)
		if praeses == "" {
			namaLower := strings.ToLower(dDoc.Nama)
			switch {
			case strings.Contains(namaLower, "silindung"):
				praeses = "Pdt. Hasudungan Siregar, S.Th"
			case strings.Contains(namaLower, "humbang"):
				praeses = "Pdt. Donald Sianturi, S.Th"
			case strings.Contains(namaLower, "toba"):
				praeses = "Pdt. Julson Pasaribu, S.Th"
			case strings.Contains(namaLower, "sumatera timur"):
				praeses = "Pdt. Robinsarhot Lumban Gaol, M.Div"
			case strings.Contains(namaLower, "dki jakarta"):
				praeses = "Pdt. Bernard Manik, M.Th"
			case strings.Contains(namaLower, "medan"):
				praeses = "Pdt. Henri Napitupulu, M.Th"
			case strings.Contains(namaLower, "tabagsel"):
				praeses = "Pdt. Ebsan B. Hutabarat, M.Th"
			case strings.Contains(namaLower, "dairi"):
				praeses = "Pdt. Riedel Sihotang, S.Th"
			default:
				praeses = "Praeses " + dDoc.Nama
			}
			_, _ = distrikCol.UpdateOne(ctx, bson.M{"_id": dDoc.ID}, bson.M{"$set": bson.M{"NamaPraeses": praeses}})
			dDoc.NamaPraeses = praeses
		}

		distrikList = append(distrikList, domain.Distrik{
			IdDistrik:   dDoc.ID.Hex(),
			KodeDistrik: dDoc.Kode,
			NamaDistrik: dDoc.Nama,
			NamaPraeses: praeses,
			Resort:      resortList,
		})
	}

	newTree := []domain.Wilayah{
		{
			Pusat: domain.Pusat{
				NamaPusat: "Kantor Pusat HKBP (Pearaja Tarutung)",
				Distrik:   distrikList,
			},
		},
	}

	return r.SaveAll(ctx, newTree)
}
