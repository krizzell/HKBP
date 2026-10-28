package service

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"time"

	"HKBP/internal/domain"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type huriaService struct {
	repo        domain.HuriaRepository
	resortRepo  domain.ResortRepository
	wilayahRepo domain.WilayahRepository
}

// NewHuriaService mengembalikan implementasi HuriaService
func NewHuriaService(repo domain.HuriaRepository, resortRepo domain.ResortRepository, wilayahRepo domain.WilayahRepository) domain.HuriaService {
	return &huriaService{
		repo:        repo,
		resortRepo:  resortRepo,
		wilayahRepo: wilayahRepo,
	}
}

func (s *huriaService) Create(ctx context.Context, req domain.CreateHuriaRequest) (*domain.HuriaDoc, error) {
	// 1. Validasi Induk Resort
	resortIDStr := strings.TrimSpace(req.IdResort)
	if resortIDStr == "" {
		return nil, domain.ErrHuriaParentReq
	}

	resortID, err := bson.ObjectIDFromHex(resortIDStr)
	if err != nil {
		return nil, domain.ErrHuriaParentInv
	}

	parentResort, err := s.resortRepo.FindByID(ctx, resortID)
	if err != nil {
		if errors.Is(err, domain.ErrResortNotFound) {
			return nil, domain.ErrHuriaParentNotFnd
		}
		return nil, err
	}

	if !parentResort.Aktif {
		return nil, domain.ErrHuriaParentInact
	}

	// 2. Validasi Kode Huria
	kode := strings.TrimSpace(req.Kode)
	if kode == "" {
		return nil, domain.ErrHuriaKodeEmpty
	}

	existingKode, err := s.repo.FindByKode(ctx, kode)
	if err != nil {
		return nil, err
	}
	if existingKode != nil {
		return nil, domain.ErrHuriaKodeDup
	}

	// 3. Validasi Nama Huria
	nama := strings.TrimSpace(req.Nama)
	if len(nama) < 2 || len(nama) > 100 {
		return nil, domain.ErrHuriaNamaEmpty
	}

	existingNama, err := s.repo.FindByIdResortAndNama(ctx, resortID, nama)
	if err != nil {
		return nil, err
	}
	if existingNama != nil {
		return nil, domain.ErrHuriaNamaDup
	}

	// 4. Validasi Jumlah Jemaat
	if req.JumlahJemaat < 0 {
		return nil, domain.ErrHuriaJumlahJemaatNeg
	}

	// 5. Validasi Tahun Berdiri (opsional, 4 digit)
	tahun := strings.TrimSpace(req.TahunBerdiri)
	if tahun != "" {
		if matched, _ := regexp.MatchString(`^\d{4}$`, tahun); !matched {
			return nil, domain.ErrHuriaTahunInv
		}
	}

	// 6. Status Aktif
	aktif := true
	if req.Aktif != nil {
		aktif = *req.Aktif
	}

	now := time.Now().UTC()
	doc := &domain.HuriaDoc{
		ID:                  bson.NewObjectID(),
		Kode:                kode,
		Nama:                nama,
		LokasiHuria:         strings.TrimSpace(req.LokasiHuria),
		TahunBerdiri:        tahun,
		NamaPendetaPimpinan: strings.TrimSpace(req.NamaPendetaPimpinan),
		JumlahJemaat:        req.JumlahJemaat,
		KepalaKeluarga:      strings.TrimSpace(req.KepalaKeluarga),
		IdResort:            resortID,
		IdDistrik:           parentResort.IdDistrik,
		Aktif:               aktif,
		DibuatPada:          now,
		DiubahPada:          now,
	}

	if err := s.repo.Create(ctx, doc); err != nil {
		return nil, err
	}
	if s.wilayahRepo != nil {
		_ = s.wilayahRepo.SyncTree(ctx)
	}
	return doc, nil
	if false {
		if mongo.IsDuplicateKeyError(err) {
			return nil, domain.ErrHuriaKodeDup
		}
		return nil, err
	}

	return doc, nil
}

func (s *huriaService) GetByID(ctx context.Context, id string) (*domain.HuriaDoc, error) {
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return nil, domain.ErrHuriaInvalidID
	}
	return s.repo.FindByID(ctx, objID)
}

func (s *huriaService) GetAll(ctx context.Context, filter domain.HuriaFilter) (*domain.HuriaListResponse, error) {
	docs, total, err := s.repo.FindAll(ctx, filter)
	if err != nil {
		return nil, err
	}
	return &domain.HuriaListResponse{
		Data:  docs,
		Total: total,
		Page:  filter.Page,
		Limit: filter.Limit,
	}, nil
}

func (s *huriaService) Update(ctx context.Context, id string, req domain.UpdateHuriaRequest) (*domain.HuriaDoc, error) {
	huriaID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return nil, domain.ErrHuriaInvalidID
	}

	doc, err := s.repo.FindByID(ctx, huriaID)
	if err != nil {
		return nil, err
	}

	// 1. Cek pemindahan Induk Resort
	if req.IdResort != nil {
		newResortIDStr := strings.TrimSpace(*req.IdResort)
		if newResortIDStr == "" {
			return nil, domain.ErrHuriaParentReq
		}
		newResortID, err := bson.ObjectIDFromHex(newResortIDStr)
		if err != nil {
			return nil, domain.ErrHuriaParentInv
		}

		if newResortID != doc.IdResort {
			newParentResort, err := s.resortRepo.FindByID(ctx, newResortID)
			if err != nil {
				if errors.Is(err, domain.ErrResortNotFound) {
					return nil, domain.ErrHuriaParentNotFnd
				}
				return nil, err
			}
			if !newParentResort.Aktif {
				return nil, domain.ErrHuriaParentInact
			}

			// Cek duplikasi nama di resort baru
			currentName := doc.Nama
			if req.Nama != nil && strings.TrimSpace(*req.Nama) != "" {
				currentName = strings.TrimSpace(*req.Nama)
			}
			existing, err := s.repo.FindByIdResortAndNama(ctx, newResortID, currentName)
			if err != nil {
				return nil, err
			}
			if existing != nil && existing.ID != doc.ID {
				return nil, domain.ErrHuriaNamaDup
			}

			doc.IdResort = newResortID
			doc.IdDistrik = newParentResort.IdDistrik

			// Cascade pembaruan ke seluruh koleksi aktivitas/keuangan turunan
			_ = s.repo.CascadeUpdateResort(ctx, doc.ID, newResortID, newParentResort.IdDistrik)
		}
	}

	// 2. Cek pembaruan Kode
	if req.Kode != nil {
		newKode := strings.TrimSpace(*req.Kode)
		if newKode == "" {
			return nil, domain.ErrHuriaKodeEmpty
		}
		if newKode != doc.Kode {
			existing, err := s.repo.FindByKode(ctx, newKode)
			if err != nil {
				return nil, err
			}
			if existing != nil && existing.ID != doc.ID {
				return nil, domain.ErrHuriaKodeDup
			}
			doc.Kode = newKode
		}
	}

	// 3. Cek pembaruan Nama
	if req.Nama != nil {
		newNama := strings.TrimSpace(*req.Nama)
		if len(newNama) < 2 || len(newNama) > 100 {
			return nil, domain.ErrHuriaNamaEmpty
		}
		if newNama != doc.Nama {
			existing, err := s.repo.FindByIdResortAndNama(ctx, doc.IdResort, newNama)
			if err != nil {
				return nil, err
			}
			if existing != nil && existing.ID != doc.ID {
				return nil, domain.ErrHuriaNamaDup
			}
			doc.Nama = newNama
		}
	}

	// 4. Atribut tambahan
	if req.LokasiHuria != nil {
		doc.LokasiHuria = strings.TrimSpace(*req.LokasiHuria)
	}
	if req.TahunBerdiri != nil {
		th := strings.TrimSpace(*req.TahunBerdiri)
		if th != "" {
			if matched, _ := regexp.MatchString(`^\d{4}$`, th); !matched {
				return nil, domain.ErrHuriaTahunInv
			}
		}
		doc.TahunBerdiri = th
	}
	if req.NamaPendetaPimpinan != nil {
		doc.NamaPendetaPimpinan = strings.TrimSpace(*req.NamaPendetaPimpinan)
	}
	if req.JumlahJemaat != nil {
		if *req.JumlahJemaat < 0 {
			return nil, domain.ErrHuriaJumlahJemaatNeg
		}
		doc.JumlahJemaat = *req.JumlahJemaat
	}
	if req.KepalaKeluarga != nil {
		doc.KepalaKeluarga = strings.TrimSpace(*req.KepalaKeluarga)
	}
	if req.Aktif != nil {
		doc.Aktif = *req.Aktif
	}

	doc.DiubahPada = time.Now().UTC()

	if err := s.repo.Update(ctx, doc.ID, doc); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return nil, domain.ErrHuriaKodeDup
		}
		return nil, err
	}
	if s.wilayahRepo != nil {
		_ = s.wilayahRepo.SyncTree(ctx)
	}

	return doc, nil
}

func (s *huriaService) Delete(ctx context.Context, id string) error {
	huriaID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return domain.ErrHuriaInvalidID
	}

	doc, err := s.repo.FindByID(ctx, huriaID)
	if err != nil {
		return err
	}

	// Periksa apakah Huria memiliki catatan transaksi keuangan / aktivitas terdaftar
	hasData, err := s.repo.HasFinancialOrActivityData(ctx, huriaID)
	if err != nil {
		return err
	}

	if hasData {
		// Huria dinonaktifkan (Aktif: false), bukan dihapus permanen bila memiliki data
		doc.Aktif = false
		doc.DiubahPada = time.Now().UTC()
		return s.repo.Update(ctx, huriaID, doc)
	}

	// Jika belum ada data keuangan, hapus dokumen huria secara permanen
	if err := s.repo.Delete(ctx, huriaID); err != nil {
		return err
	}
	if s.wilayahRepo != nil {
		_ = s.wilayahRepo.SyncTree(ctx)
	}
	return nil
}
