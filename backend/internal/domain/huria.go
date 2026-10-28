package domain

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

// Error domain standar untuk Huria
var (
	ErrHuriaNotFound        = errors.New("Huria tidak ditemukan")
	ErrHuriaInvalidID       = errors.New("ID huria tidak valid")
	ErrHuriaKodeDup         = errors.New("Kode huria sudah digunakan")
	ErrHuriaNamaDup         = errors.New("Nama huria sudah digunakan di resort ini")
	ErrHuriaParentReq       = errors.New("Induk resort wajib dipilih")
	ErrHuriaParentInv       = errors.New("ID resort induk tidak valid")
	ErrHuriaParentNotFnd    = errors.New("Resort induk tidak ditemukan")
	ErrHuriaParentInact     = errors.New("Resort induk tidak aktif")
	ErrHuriaHasData         = errors.New("Tidak dapat menghapus permanen huria karena masih memiliki data transaksi/ibadah/lunggu terdaftar. Silakan nonaktifkan huria")
	ErrHuriaNamaEmpty       = errors.New("Nama huria wajib diisi (2 hingga 100 karakter)")
	ErrHuriaKodeEmpty       = errors.New("Kode huria wajib diisi")
	ErrHuriaJumlahJemaatNeg = errors.New("Jumlah jemaat tidak boleh bernilai negatif")
	ErrHuriaTahunInv        = errors.New("Tahun berdiri harus berupa 4 digit angka")
)

// HuriaDoc merepresentasikan dokumen huria di MongoDB sesuai model data target.
// Nama field menggunakan PascalCase baik pada bson maupun json.
type HuriaDoc struct {
	ID                  bson.ObjectID `bson:"_id,omitempty" json:"_id"`
	Kode                string        `bson:"Kode" json:"Kode"`
	Nama                string        `bson:"Nama" json:"Nama"`
	LokasiHuria         string        `bson:"LokasiHuria,omitempty" json:"LokasiHuria"`
	TahunBerdiri        string        `bson:"TahunBerdiri,omitempty" json:"TahunBerdiri"`
	NamaPendetaPimpinan string        `bson:"NamaPendetaPimpinan,omitempty" json:"NamaPendetaPimpinan"`
	JumlahJemaat        int           `bson:"JumlahJemaat,omitempty" json:"JumlahJemaat"`
	KepalaKeluarga      string        `bson:"KepalaKeluarga,omitempty" json:"KepalaKeluarga"`
	IdResort            bson.ObjectID `bson:"IdResort" json:"IdResort"`
	IdDistrik           bson.ObjectID `bson:"IdDistrik" json:"IdDistrik"`
	Aktif               bool          `bson:"Aktif" json:"Aktif"`
	DibuatPada          time.Time     `bson:"DibuatPada" json:"DibuatPada"`
	DiubahPada          time.Time     `bson:"DiubahPada" json:"DiubahPada"`
}

// Request DTO untuk penambahan Huria baru
type CreateHuriaRequest struct {
	Kode                string `json:"Kode" binding:"required"`
	Nama                string `json:"Nama" binding:"required"`
	LokasiHuria         string `json:"LokasiHuria"`
	TahunBerdiri        string `json:"TahunBerdiri"`
	NamaPendetaPimpinan string `json:"NamaPendetaPimpinan"`
	JumlahJemaat        int    `json:"JumlahJemaat"`
	KepalaKeluarga      string `json:"KepalaKeluarga"`
	IdResort            string `json:"IdResort" binding:"required"`
	Aktif               *bool  `json:"Aktif"`
}

// Request DTO untuk pengubahan Huria
type UpdateHuriaRequest struct {
	Kode                *string `json:"Kode"`
	Nama                *string `json:"Nama"`
	LokasiHuria         *string `json:"LokasiHuria"`
	TahunBerdiri        *string `json:"TahunBerdiri"`
	NamaPendetaPimpinan *string `json:"NamaPendetaPimpinan"`
	JumlahJemaat        *int    `json:"JumlahJemaat"`
	KepalaKeluarga      *string `json:"KepalaKeluarga"`
	IdResort            *string `json:"IdResort"`
	Aktif               *bool   `json:"Aktif"`
}

// Response DTO untuk daftar berpaginasi
type HuriaListResponse struct {
	Data  []HuriaDoc `json:"data"`
	Total int64      `json:"total"`
	Page  int        `json:"page"`
	Limit int        `json:"limit"`
}

// Filter kueri pencarian Huria
type HuriaFilter struct {
	IdResort  string
	IdDistrik string
	Page      int
	Limit     int
	Q         string
	Aktif     *bool
}

// HuriaRepository mendefinisikan kontrak akses database untuk Huria
type HuriaRepository interface {
	Create(ctx context.Context, doc *HuriaDoc) error
	FindByID(ctx context.Context, id bson.ObjectID) (*HuriaDoc, error)
	FindByKode(ctx context.Context, kode string) (*HuriaDoc, error)
	FindByIdResortAndNama(ctx context.Context, idResort bson.ObjectID, nama string) (*HuriaDoc, error)
	FindAll(ctx context.Context, filter HuriaFilter) ([]HuriaDoc, int64, error)
	Update(ctx context.Context, id bson.ObjectID, doc *HuriaDoc) error
	Delete(ctx context.Context, id bson.ObjectID) error
	HasFinancialOrActivityData(ctx context.Context, huriaID bson.ObjectID) (bool, error)
	CascadeUpdateResort(ctx context.Context, huriaID bson.ObjectID, newResortID bson.ObjectID, newDistrikID bson.ObjectID) error
}

// HuriaService mendefinisikan logika bisnis dan validasi aturan untuk Huria
type HuriaService interface {
	Create(ctx context.Context, req CreateHuriaRequest) (*HuriaDoc, error)
	GetByID(ctx context.Context, id string) (*HuriaDoc, error)
	GetAll(ctx context.Context, filter HuriaFilter) (*HuriaListResponse, error)
	Update(ctx context.Context, id string, req UpdateHuriaRequest) (*HuriaDoc, error)
	Delete(ctx context.Context, id string) error
}
