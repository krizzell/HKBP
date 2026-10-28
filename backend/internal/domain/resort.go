package domain

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

// Error domain standar untuk Resort
var (
	ErrResortNotFound     = errors.New("Resort tidak ditemukan")
	ErrResortInvalidID    = errors.New("ID resort tidak valid")
	ErrResortKodeDup      = errors.New("Kode resort sudah digunakan")
	ErrResortNamaDup      = errors.New("Nama resort sudah digunakan di distrik ini")
	ErrResortParentReq    = errors.New("Induk distrik wajib dipilih")
	ErrResortParentInv    = errors.New("ID distrik induk tidak valid")
	ErrResortParentNotFnd = errors.New("Distrik induk tidak ditemukan")
	ErrResortParentInact  = errors.New("Distrik induk tidak aktif")
	ErrResortHasActive    = errors.New("Tidak dapat menghapus resort karena masih memiliki huria aktif")
	ErrResortHasHuria     = errors.New("Tidak dapat menghapus permanen resort karena masih memiliki huria terdaftar. Silakan nonaktifkan resort")
	ErrResortNamaEmpty    = errors.New("Nama resort wajib diisi (2 hingga 100 karakter)")
	ErrResortKodeEmpty    = errors.New("Kode resort wajib diisi")
	ErrResortPendetaEmpty = errors.New("Nama pendeta resort wajib diisi")
)

// ResortDoc merepresentasikan dokumen resort di MongoDB sesuai model data target.
// Nama field menggunakan PascalCase baik pada bson maupun json.
type ResortDoc struct {
	ID                bson.ObjectID `bson:"_id,omitempty" json:"_id"`
	Kode              string        `bson:"Kode" json:"Kode"`
	Nama              string        `bson:"Nama" json:"Nama"`
	NamaPendetaResort string        `bson:"NamaPendetaResort,omitempty" json:"NamaPendetaResort,omitempty"`
	IdDistrik         bson.ObjectID `bson:"IdDistrik" json:"IdDistrik"`
	Aktif             bool          `bson:"Aktif" json:"Aktif"`
	DibuatPada        time.Time     `bson:"DibuatPada" json:"DibuatPada"`
	DiubahPada        time.Time     `bson:"DiubahPada" json:"DiubahPada"`
}

// Request DTO untuk penambahan Resort baru
type CreateResortRequest struct {
	Kode              string `json:"Kode" binding:"required"`
	Nama              string `json:"Nama" binding:"required"`
	NamaPendetaResort string `json:"NamaPendetaResort" binding:"required"`
	IdDistrik         string `json:"IdDistrik" binding:"required"`
	Aktif             *bool  `json:"Aktif"`
}

// Request DTO untuk pengubahan Resort
type UpdateResortRequest struct {
	Kode              *string `json:"Kode"`
	Nama              *string `json:"Nama"`
	NamaPendetaResort *string `json:"NamaPendetaResort"`
	IdDistrik         *string `json:"IdDistrik"`
	Aktif             *bool   `json:"Aktif"`
}

// Response DTO untuk daftar berpaginasi
type ResortListResponse struct {
	Data  []ResortDoc `json:"data"`
	Total int64       `json:"total"`
	Page  int         `json:"page"`
	Limit int         `json:"limit"`
}

// Filter kueri pencarian Resort
type ResortFilter struct {
	IdDistrik string
	Page      int
	Limit     int
	Q         string
	Aktif     *bool
}

// ResortRepository mendefinisikan kontrak akses database untuk Resort
type ResortRepository interface {
	Create(ctx context.Context, doc *ResortDoc) error
	FindByID(ctx context.Context, id bson.ObjectID) (*ResortDoc, error)
	FindByKode(ctx context.Context, kode string) (*ResortDoc, error)
	FindByIdDistrikAndNama(ctx context.Context, idDistrik bson.ObjectID, nama string) (*ResortDoc, error)
	FindAll(ctx context.Context, filter ResortFilter) ([]ResortDoc, int64, error)
	Update(ctx context.Context, id bson.ObjectID, doc *ResortDoc) error
	Delete(ctx context.Context, id bson.ObjectID) error
	CountActiveHuriaByResortID(ctx context.Context, resortID bson.ObjectID) (int64, error)
	CountTotalHuriaByResortID(ctx context.Context, resortID bson.ObjectID) (int64, error)
	CascadeUpdateDistrik(ctx context.Context, resortID bson.ObjectID, newDistrikID bson.ObjectID) error
}

// ResortService mendefinisikan logika bisnis dan validasi aturan untuk Resort
type ResortService interface {
	Create(ctx context.Context, req CreateResortRequest) (*ResortDoc, error)
	GetByID(ctx context.Context, id string) (*ResortDoc, error)
	GetAll(ctx context.Context, filter ResortFilter) (*ResortListResponse, error)
	Update(ctx context.Context, id string, req UpdateResortRequest) (*ResortDoc, error)
	Delete(ctx context.Context, id string) error
}
