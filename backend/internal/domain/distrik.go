package domain

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

// Error domain standar untuk Distrik
var (
	ErrDistrikNotFound  = errors.New("Distrik tidak ditemukan")
	ErrDistrikInvalidID = errors.New("ID distrik tidak valid")
	ErrDistrikKodeDup   = errors.New("Kode distrik sudah digunakan")
	ErrDistrikNamaDup   = errors.New("Nama distrik sudah digunakan")
	ErrDistrikHasActive = errors.New("Tidak dapat menghapus distrik karena masih memiliki resort aktif")
	ErrDistrikHasResort = errors.New("Tidak dapat menghapus permanen distrik karena masih memiliki resort terdaftar. Silakan nonaktifkan distrik")
	ErrDistrikNamaEmpty = errors.New("Nama distrik wajib diisi (2 hingga 100 karakter)")
	ErrDistrikKodeEmpty = errors.New("Kode distrik wajib diisi")
	ErrDistrikPraesesEmpty = errors.New("Nama praeses wajib diisi")
)

// DistrikDoc merepresentasikan dokumen distrik di MongoDB sesuai model data target.
// Nama field menggunakan PascalCase baik pada bson maupun json.
type DistrikDoc struct {
	ID          bson.ObjectID `bson:"_id,omitempty" json:"_id"`
	Kode        string        `bson:"Kode" json:"Kode"`
	Nama        string        `bson:"Nama" json:"Nama"`
	NamaPraeses string        `bson:"NamaPraeses,omitempty" json:"NamaPraeses,omitempty"`
	Aktif       bool          `bson:"Aktif" json:"Aktif"`
	DibuatPada  time.Time     `bson:"DibuatPada" json:"DibuatPada"`
	DiubahPada  time.Time     `bson:"DiubahPada" json:"DiubahPada"`
}

// Request DTO untuk penambahan Distrik baru
type CreateDistrikRequest struct {
	Kode        string `json:"Kode" binding:"required"`
	Nama        string `json:"Nama" binding:"required"`
	NamaPraeses string `json:"NamaPraeses" binding:"required"`
	Aktif       *bool  `json:"Aktif"`
}

// Request DTO untuk pengubahan Distrik
type UpdateDistrikRequest struct {
	Kode        *string `json:"Kode"`
	Nama        *string `json:"Nama"`
	NamaPraeses *string `json:"NamaPraeses"`
	Aktif       *bool   `json:"Aktif"`
}

// Response DTO untuk daftar berpaginasi
type DistrikListResponse struct {
	Data  []DistrikDoc `json:"data"`
	Total int64        `json:"total"`
	Page  int          `json:"page"`
	Limit int          `json:"limit"`
}

// Filter kueri pencarian Distrik
type DistrikFilter struct {
	Page  int
	Limit int
	Q     string
	Aktif *bool
}

// DistrikRepository mendefinisikan kontrak akses database untuk Distrik
type DistrikRepository interface {
	Create(ctx context.Context, doc *DistrikDoc) error
	FindByID(ctx context.Context, id bson.ObjectID) (*DistrikDoc, error)
	FindByKode(ctx context.Context, kode string) (*DistrikDoc, error)
	FindByNama(ctx context.Context, nama string) (*DistrikDoc, error)
	FindAll(ctx context.Context, filter DistrikFilter) ([]DistrikDoc, int64, error)
	Update(ctx context.Context, id bson.ObjectID, doc *DistrikDoc) error
	Delete(ctx context.Context, id bson.ObjectID) error
	CountActiveResortByDistrikID(ctx context.Context, distrikID bson.ObjectID) (int64, error)
	CountTotalResortByDistrikID(ctx context.Context, distrikID bson.ObjectID) (int64, error)
}

// DistrikService mendefinisikan logika bisnis dan validasi aturan untuk Distrik
type DistrikService interface {
	Create(ctx context.Context, req CreateDistrikRequest) (*DistrikDoc, error)
	GetByID(ctx context.Context, id string) (*DistrikDoc, error)
	GetAll(ctx context.Context, filter DistrikFilter) (*DistrikListResponse, error)
	Update(ctx context.Context, id string, req UpdateDistrikRequest) (*DistrikDoc, error)
	Delete(ctx context.Context, id string) error
}
