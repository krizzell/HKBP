package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"HKBP/internal/domain"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type resortService struct {
	repo        domain.ResortRepository
	distrikRepo domain.DistrikRepository
	wilayahRepo domain.WilayahRepository
}

// NewResortService mengembalikan implementasi ResortService
func NewResortService(repo domain.ResortRepository, distrikRepo domain.DistrikRepository, wilayahRepo domain.WilayahRepository) domain.ResortService {
	return &resortService{
		repo:        repo,
		distrikRepo: distrikRepo,
		wilayahRepo: wilayahRepo,
	}
}

func (s *resortService) Create(ctx context.Context, req domain.CreateResortRequest) (*domain.ResortDoc, error) {
	// 1. Validasi Induk Distrik
	distrikIDStr := strings.TrimSpace(req.IdDistrik)
	if distrikIDStr == "" {
		return nil, domain.ErrResortParentReq
	}

	distrikID, err := bson.ObjectIDFromHex(distrikIDStr)
	if err != nil {
		return nil, domain.ErrResortParentInv
	}

	parentDistrik, err := s.distrikRepo.FindByID(ctx, distrikID)
	if err != nil {
		if errors.Is(err, domain.ErrDistrikNotFound) {
			return nil, domain.ErrResortParentNotFnd
		}
		return nil, err
	}

	if !parentDistrik.Aktif {
		return nil, domain.ErrResortParentInact
	}

	// 2. Validasi Kode Resort
	kode := strings.TrimSpace(req.Kode)
	if kode == "" {
		return nil, domain.ErrResortKodeEmpty
	}

	existingKode, err := s.repo.FindByKode(ctx, kode)
	if err != nil {
		return nil, err
	}
	if existingKode != nil {
		return nil, domain.ErrResortKodeDup
	}

	// 3. Validasi Nama Resort
	nama := strings.TrimSpace(req.Nama)
	if len(nama) < 2 || len(nama) > 100 {
		return nil, domain.ErrResortNamaEmpty
	}

	existingNama, err := s.repo.FindByIdDistrikAndNama(ctx, distrikID, nama)
	if err != nil {
		return nil, err
	}
	if existingNama != nil {
		return nil, domain.ErrResortNamaDup
	}

	// 4. Status Aktif
	aktif := true
	if req.Aktif != nil {
		aktif = *req.Aktif
	}

	namaPendeta := strings.TrimSpace(req.NamaPendetaResort)
	if namaPendeta == "" {
		return nil, domain.ErrResortPendetaEmpty
	}

	now := time.Now().UTC()
	doc := &domain.ResortDoc{
		ID:                bson.NewObjectID(),
		Kode:              kode,
		Nama:              nama,
		NamaPendetaResort: namaPendeta,
		IdDistrik:         distrikID,
		Aktif:             aktif,
		DibuatPada:        now,
		DiubahPada:        now,
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
			return nil, domain.ErrResortKodeDup
		}
		return nil, err
	}

	return doc, nil
}

func (s *resortService) GetByID(ctx context.Context, id string) (*domain.ResortDoc, error) {
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return nil, domain.ErrResortInvalidID
	}
	return s.repo.FindByID(ctx, objID)
}

func (s *resortService) GetAll(ctx context.Context, filter domain.ResortFilter) (*domain.ResortListResponse, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 {
		filter.Limit = 10
	} else if filter.Limit > 100 {
		filter.Limit = 100
	}

	docs, total, err := s.repo.FindAll(ctx, filter)
	if err != nil {
		return nil, err
	}

	return &domain.ResortListResponse{
		Data:  docs,
		Total: total,
		Page:  filter.Page,
		Limit: filter.Limit,
	}, nil
}

func (s *resortService) Update(ctx context.Context, id string, req domain.UpdateResortRequest) (*domain.ResortDoc, error) {
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return nil, domain.ErrResortInvalidID
	}

	existing, err := s.repo.FindByID(ctx, objID)
	if err != nil {
		return nil, err
	}

	targetDistrikID := existing.IdDistrik
	distrikChanged := false

	// Periksa pemindahan induk Distrik
	if req.IdDistrik != nil {
		newDistrikStr := strings.TrimSpace(*req.IdDistrik)
		if newDistrikStr == "" {
			return nil, domain.ErrResortParentReq
		}

		newDistrikID, err := bson.ObjectIDFromHex(newDistrikStr)
		if err != nil {
			return nil, domain.ErrResortParentInv
		}

		if newDistrikID != existing.IdDistrik {
			parentDistrik, err := s.distrikRepo.FindByID(ctx, newDistrikID)
			if err != nil {
				if errors.Is(err, domain.ErrDistrikNotFound) {
					return nil, domain.ErrResortParentNotFnd
				}
				return nil, err
			}
			if !parentDistrik.Aktif {
				return nil, domain.ErrResortParentInact
			}

			targetDistrikID = newDistrikID
			distrikChanged = true
		}
	}

	// Validasi & Perbarui Nama
	targetNama := existing.Nama
	if req.Nama != nil {
		nama := strings.TrimSpace(*req.Nama)
		if len(nama) < 2 || len(nama) > 100 {
			return nil, domain.ErrResortNamaEmpty
		}
		targetNama = nama
	}

	// Cek keunikan nama dalam distrik target jika nama berubah atau distrik berubah
	if targetNama != existing.Nama || distrikChanged {
		checkNama, err := s.repo.FindByIdDistrikAndNama(ctx, targetDistrikID, targetNama)
		if err != nil {
			return nil, err
		}
		if checkNama != nil && checkNama.ID != existing.ID {
			return nil, domain.ErrResortNamaDup
		}
		existing.Nama = targetNama
	}

	// Validasi & Perbarui Kode
	if req.Kode != nil {
		kode := strings.TrimSpace(*req.Kode)
		if kode == "" {
			return nil, domain.ErrResortKodeEmpty
		}

		if kode != existing.Kode {
			checkKode, err := s.repo.FindByKode(ctx, kode)
			if err != nil {
				return nil, err
			}
			if checkKode != nil && checkKode.ID != existing.ID {
				return nil, domain.ErrResortKodeDup
			}
			existing.Kode = kode
		}
	}

	// Perbarui status Aktif jika dikirim
	if req.Aktif != nil {
		existing.Aktif = *req.Aktif
	}

	// Perbarui NamaPendetaResort jika dikirim
	if req.NamaPendetaResort != nil {
		namaPendeta := strings.TrimSpace(*req.NamaPendetaResort)
		if namaPendeta == "" {
			return nil, domain.ErrResortPendetaEmpty
		}
		existing.NamaPendetaResort = namaPendeta
	}

	// Jika distrik berubah, perbarui referensi cascade pada seluruh anak sebelum simpan dokumen resort
	if distrikChanged {
		if err := s.repo.CascadeUpdateDistrik(ctx, objID, targetDistrikID); err != nil {
			return nil, err
		}
		existing.IdDistrik = targetDistrikID
	}

	existing.DiubahPada = time.Now().UTC()

	if err := s.repo.Update(ctx, objID, existing); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return nil, domain.ErrResortNamaDup
		}
		return nil, err
	}
	if s.wilayahRepo != nil {
		_ = s.wilayahRepo.SyncTree(ctx)
	}

	return existing, nil
}

func (s *resortService) Delete(ctx context.Context, id string) error {
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return domain.ErrResortInvalidID
	}

	// 1. Pastikan resort ada
	_, err = s.repo.FindByID(ctx, objID)
	if err != nil {
		return err
	}

	// 2. Cek apakah masih memiliki huria aktif
	activeHuriaCount, err := s.repo.CountActiveHuriaByResortID(ctx, objID)
	if err != nil {
		return err
	}
	if activeHuriaCount > 0 {
		return domain.ErrResortHasActive
	}

	// 3. Cek apakah masih memiliki huria (aktif maupun nonaktif)
	totalHuriaCount, err := s.repo.CountTotalHuriaByResortID(ctx, objID)
	if err != nil {
		return err
	}
	if totalHuriaCount > 0 {
		return domain.ErrResortHasHuria
	}

	// 4. Hapus permanen jika tidak memiliki anak sama sekali
	if err := s.repo.Delete(ctx, objID); err != nil {
		return err
	}
	if s.wilayahRepo != nil {
		_ = s.wilayahRepo.SyncTree(ctx)
	}
	return nil
}
