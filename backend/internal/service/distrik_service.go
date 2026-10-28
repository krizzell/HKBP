package service

import (
	"context"
	"strings"
	"time"

	"HKBP/internal/domain"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type distrikService struct {
	repo        domain.DistrikRepository
	wilayahRepo domain.WilayahRepository
}

// NewDistrikService mengembalikan implementasi DistrikService
func NewDistrikService(repo domain.DistrikRepository, wilayahRepo domain.WilayahRepository) domain.DistrikService {
	return &distrikService{
		repo:        repo,
		wilayahRepo: wilayahRepo,
	}
}

func (s *distrikService) Create(ctx context.Context, req domain.CreateDistrikRequest) (*domain.DistrikDoc, error) {
	kode := strings.TrimSpace(req.Kode)
	if kode == "" {
		return nil, domain.ErrDistrikKodeEmpty
	}

	nama := strings.TrimSpace(req.Nama)
	if len(nama) < 2 || len(nama) > 100 {
		return nil, domain.ErrDistrikNamaEmpty
	}

	namaPraeses := strings.TrimSpace(req.NamaPraeses)
	if namaPraeses == "" {
		return nil, domain.ErrDistrikPraesesEmpty
	}

	// 1. Cek duplikasi Kode
	existingKode, err := s.repo.FindByKode(ctx, kode)
	if err != nil {
		return nil, err
	}
	if existingKode != nil {
		return nil, domain.ErrDistrikKodeDup
	}

	// 2. Cek duplikasi Nama (case-insensitive)
	existingNama, err := s.repo.FindByNama(ctx, nama)
	if err != nil {
		return nil, err
	}
	if existingNama != nil {
		return nil, domain.ErrDistrikNamaDup
	}

	aktif := true
	if req.Aktif != nil {
		aktif = *req.Aktif
	}

	now := time.Now().UTC()
	doc := &domain.DistrikDoc{
		ID:          bson.NewObjectID(),
		Kode:        kode,
		Nama:        nama,
		NamaPraeses: namaPraeses,
		Aktif:       aktif,
		DibuatPada:  now,
		DiubahPada:  now,
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
			return nil, domain.ErrDistrikNamaDup
		}
		return nil, err
	}

	return doc, nil
}

func (s *distrikService) GetByID(ctx context.Context, id string) (*domain.DistrikDoc, error) {
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return nil, domain.ErrDistrikInvalidID
	}
	return s.repo.FindByID(ctx, objID)
}

func (s *distrikService) GetAll(ctx context.Context, filter domain.DistrikFilter) (*domain.DistrikListResponse, error) {
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

	return &domain.DistrikListResponse{
		Data:  docs,
		Total: total,
		Page:  filter.Page,
		Limit: filter.Limit,
	}, nil
}

func (s *distrikService) Update(ctx context.Context, id string, req domain.UpdateDistrikRequest) (*domain.DistrikDoc, error) {
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return nil, domain.ErrDistrikInvalidID
	}

	existing, err := s.repo.FindByID(ctx, objID)
	if err != nil {
		return nil, err
	}

	// Perbarui Nama jika dikirim
	if req.Nama != nil {
		nama := strings.TrimSpace(*req.Nama)
		if len(nama) < 2 || len(nama) > 100 {
			return nil, domain.ErrDistrikNamaEmpty
		}

		if !strings.EqualFold(nama, existing.Nama) {
			checkNama, err := s.repo.FindByNama(ctx, nama)
			if err != nil {
				return nil, err
			}
			if checkNama != nil && checkNama.ID != existing.ID {
				return nil, domain.ErrDistrikNamaDup
			}
		}
		existing.Nama = nama
	}

	// Perbarui Kode jika dikirim
	if req.Kode != nil {
		kode := strings.TrimSpace(*req.Kode)
		if kode == "" {
			return nil, domain.ErrDistrikKodeEmpty
		}

		if kode != existing.Kode {
			checkKode, err := s.repo.FindByKode(ctx, kode)
			if err != nil {
				return nil, err
			}
			if checkKode != nil && checkKode.ID != existing.ID {
				return nil, domain.ErrDistrikKodeDup
			}
		}
		existing.Kode = kode
	}

	// Perbarui NamaPraeses jika dikirim
	if req.NamaPraeses != nil {
		namaPraeses := strings.TrimSpace(*req.NamaPraeses)
		if namaPraeses == "" {
			return nil, domain.ErrDistrikPraesesEmpty
		}
		existing.NamaPraeses = namaPraeses
	}

	// Perbarui status Aktif jika dikirim
	if req.Aktif != nil {
		existing.Aktif = *req.Aktif
	}

	existing.DiubahPada = time.Now().UTC()

	if err := s.repo.Update(ctx, objID, existing); err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return nil, domain.ErrDistrikNamaDup
		}
		return nil, err
	}
	if s.wilayahRepo != nil {
		_ = s.wilayahRepo.SyncTree(ctx)
	}

	return existing, nil
}

func (s *distrikService) Delete(ctx context.Context, id string) error {
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return domain.ErrDistrikInvalidID
	}

	// 1. Pastikan distrik ada
	_, err = s.repo.FindByID(ctx, objID)
	if err != nil {
		return err
	}

	// 2. Cek apakah masih memiliki resort aktif
	activeResortCount, err := s.repo.CountActiveResortByDistrikID(ctx, objID)
	if err != nil {
		return err
	}
	if activeResortCount > 0 {
		return domain.ErrDistrikHasActive
	}

	// 3. Cek apakah masih memiliki resort (aktif maupun nonaktif)
	// Aturan bisnis: Distrik hapus permanen HANYA kalau tidak punya anak sama sekali
	totalResortCount, err := s.repo.CountTotalResortByDistrikID(ctx, objID)
	if err != nil {
		return err
	}
	if totalResortCount > 0 {
		return domain.ErrDistrikHasResort
	}

	// 4. Hapus permanen jika tidak memiliki resort sama sekali
	if err := s.repo.Delete(ctx, objID); err != nil {
		return err
	}
	if s.wilayahRepo != nil {
		_ = s.wilayahRepo.SyncTree(ctx)
	}
	return nil
}
