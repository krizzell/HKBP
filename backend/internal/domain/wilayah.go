package domain

import "context"

type WartaJemaat struct {
	Tema                string   `bson:"Tema" json:"Tema"`
	SubTema             string   `bson:"SubTema" json:"SubTema"`
	TataIbadah          []string `bson:"TataIbadah" json:"TataIbadah"`
	TingtingNaMarragam  []string `bson:"TingtingNaMarragam" json:"TingtingNaMarragam"`
	TingtingParhepengon []string `bson:"TingtingParhepengon" json:"TingtingParhepengon"`
}

type Lunggu struct {
	IdLunggu   string `bson:"IdLunggu" json:"IdLunggu"`
	NamaLunggu string `bson:"NamaLunggu" json:"NamaLunggu"`
	Keterangan string `bson:"Keterangan" json:"Keterangan"`
}

type Pelean struct {
	Jenis   string `bson:"Jenis" json:"Jenis"`     // "1a", "1b", "2a", "2b"
	Nominal int64  `bson:"Nominal" json:"Nominal"` // Nominal persembahan
}

type SesiIbadah struct {
	IdSesi      string   `bson:"IdSesi" json:"IdSesi"`
	NamaSesi    string   `bson:"NamaSesi" json:"NamaSesi"`
	Tanggal     string   `bson:"Tanggal" json:"Tanggal"` // YYYY-MM-DD
	JamMulai    string   `bson:"JamMulai" json:"JamMulai"`
	JumlahHadir int      `bson:"JumlahHadir" json:"JumlahHadir"`
	Pelean      []Pelean `bson:"Pelean" json:"Pelean"`
}

type KategoriPemasukan struct {
	IdKategori      string `bson:"IdKategori" json:"IdKategori"`
	NamaKategori    string `bson:"NamaKategori" json:"NamaKategori"`
	IdKategoriInduk string `bson:"IdKategoriInduk" json:"IdKategoriInduk"`
}

type PemasukanJemaat struct {
	IdTransaksi string `bson:"IdTransaksi" json:"IdTransaksi"`
	Tanggal     string `bson:"Tanggal" json:"Tanggal"` // YYYY-MM-DD
	Nominal     int64  `bson:"Nominal" json:"Nominal"`
	IdKategori  string `bson:"IdKategori" json:"IdKategori"`
	Keterangan  string `bson:"Keterangan" json:"Keterangan"`
}

type AlokasiTransaksi struct {
	IdAlokasi   string `bson:"IdAlokasi" json:"IdAlokasi"`
	IdTransaksi string `bson:"IdTransaksi" json:"IdTransaksi"`
	Peruntukan  string `bson:"Peruntukan" json:"Peruntukan"` // "Setoran Pusat" / "Kas Huria"
	Nominal     int64  `bson:"Nominal" json:"Nominal"`
}

type SetoranPusat struct {
	IdSetoran    string `bson:"IdSetoran" json:"IdSetoran"`
	Periode      string `bson:"Periode" json:"Periode"`           // YYYY-MM
	TanggalSetor string `bson:"TanggalSetor" json:"TanggalSetor"` // YYYY-MM-DD
	TotalSetoran int64  `bson:"TotalSetoran" json:"TotalSetoran"`
	Keterangan   string `bson:"Keterangan" json:"Keterangan"`
}

type RincianSetoranPusat struct {
	IdRincian       string `bson:"IdRincian" json:"IdRincian"`
	IdSetoran       string `bson:"IdSetoran" json:"IdSetoran"`
	IdAlokasi       string `bson:"IdAlokasi" json:"IdAlokasi"`
	NominalDilunasi int64  `bson:"NominalDilunasi" json:"NominalDilunasi"`
}

type Huria struct {
	NamaHuria           string                `bson:"NamaHuria" json:"NamaHuria"`
	IdHuria             string                `bson:"IdHuria" json:"IdHuria"`
	LokasiHuria         string                `bson:"LokasiHuria" json:"LokasiHuria"`
	TahunBerdiri        string                `bson:"TahunBerdiri" json:"TahunBerdiri"`
	NamaPendetaPimpinan string                `bson:"NamaPendetaPimpinan" json:"NamaPendetaPimpinan"`
	JumlahJemaat        int                   `bson:"JumlahJemaat" json:"JumlahJemaat"`
	KepalaKeluarga      string                `bson:"KepalaKeluarga" json:"KepalaKeluarga"`
	WartaJemaat         WartaJemaat           `bson:"WartaJemaat" json:"WartaJemaat"`
	Lunggu              []Lunggu              `bson:"Lunggu" json:"Lunggu"`
	SesiIbadah          []SesiIbadah          `bson:"SesiIbadah" json:"SesiIbadah"`
	KategoriPemasukan   []KategoriPemasukan   `bson:"KategoriPemasukan" json:"KategoriPemasukan"`
	PemasukanJemaat     []PemasukanJemaat     `bson:"PemasukanJemaat" json:"PemasukanJemaat"`
	AlokasiTransaksi    []AlokasiTransaksi    `bson:"AlokasiTransaksi" json:"AlokasiTransaksi"`
	SetoranPusat        []SetoranPusat        `bson:"SetoranPusat" json:"SetoranPusat"`
	RincianSetoranPusat []RincianSetoranPusat `bson:"RincianSetoranPusat" json:"RincianSetoranPusat"`
}

type Resort struct {
	IdResort          string  `bson:"IdResort,omitempty" json:"IdResort,omitempty"`
	KodeResort        string  `bson:"KodeResort,omitempty" json:"KodeResort,omitempty"`
	NamaResort        string  `bson:"NamaResort" json:"NamaResort"`
	NamaPendetaResort string  `bson:"NamaPendetaResort,omitempty" json:"NamaPendetaResort,omitempty"`
	Huria             []Huria `bson:"Huria" json:"Huria"`
}

type Distrik struct {
	IdDistrik   string   `bson:"IdDistrik,omitempty" json:"IdDistrik,omitempty"`
	KodeDistrik string   `bson:"KodeDistrik,omitempty" json:"KodeDistrik,omitempty"`
	NamaDistrik string   `bson:"NamaDistrik" json:"NamaDistrik"`
	NamaPraeses string   `bson:"NamaPraeses,omitempty" json:"NamaPraeses,omitempty"`
	Resort      []Resort `bson:"Resort" json:"Resort"`
}

type Pusat struct {
	NamaPusat string    `bson:"NamaPusat" json:"NamaPusat"`
	Distrik   []Distrik `bson:"Distrik" json:"Distrik"`
}

type Wilayah struct {
	Pusat Pusat `bson:"Pusat" json:"Pusat"`
}

type User struct {
	ID          string `bson:"id" json:"id"`
	Email       string `bson:"email" json:"email"`
	Password    string `bson:"password" json:"password"`
	Nama        string `bson:"nama" json:"nama"`
	Role        string `bson:"role" json:"role"` // "Admin" | "SuperAdmin"
	IdHuria     string `bson:"idHuria,omitempty" json:"idHuria,omitempty"`
	NamaHuria   string `bson:"namaHuria,omitempty" json:"namaHuria,omitempty"`
	NamaResort  string `bson:"namaResort,omitempty" json:"namaResort,omitempty"`
	NamaDistrik string `bson:"namaDistrik,omitempty" json:"namaDistrik,omitempty"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type WilayahRepository interface {
	FindAll(ctx context.Context) ([]Wilayah, error)
	SaveAll(ctx context.Context, data []Wilayah) error
	FindHuria(ctx context.Context, idHuria string) (*Huria, error)
	UpdateHuria(ctx context.Context, idHuria string, updated Huria) error
	FindUserByEmail(ctx context.Context, email string) (*User, error)
	SyncTree(ctx context.Context) error
}

type WilayahService interface {
	GetAll(ctx context.Context, currentUser *User) ([]Wilayah, error)
	ResetSeeder(ctx context.Context) error
	GetHuria(ctx context.Context, idHuria string) (*Huria, error)
	UpdateHuria(ctx context.Context, idHuria string, updated Huria, currentUser *User) error

	// Granular CRUD operations for Admin Huria:
	AddPemasukan(ctx context.Context, idHuria string, item PemasukanJemaat, alokasiPusatPercent float64, currentUser *User) error
	UpdatePemasukan(ctx context.Context, idHuria string, idTransaksi string, item PemasukanJemaat, currentUser *User) error
	DeletePemasukan(ctx context.Context, idHuria string, idTransaksi string, currentUser *User) error

	AddSesiIbadah(ctx context.Context, idHuria string, item SesiIbadah, currentUser *User) error
	UpdateSesiIbadah(ctx context.Context, idHuria string, idSesi string, item SesiIbadah, currentUser *User) error
	DeleteSesiIbadah(ctx context.Context, idHuria string, idSesi string, currentUser *User) error

	AddAlokasi(ctx context.Context, idHuria string, item AlokasiTransaksi, currentUser *User) error
	UpdateAlokasi(ctx context.Context, idHuria string, idAlokasi string, item AlokasiTransaksi, currentUser *User) error
	DeleteAlokasi(ctx context.Context, idHuria string, idAlokasi string, currentUser *User) error

	AddSetoranPusat(ctx context.Context, idHuria string, item SetoranPusat, rincian []RincianSetoranPusat, currentUser *User) error
	UpdateSetoranPusat(ctx context.Context, idHuria string, idSetoran string, item SetoranPusat, currentUser *User) error
	DeleteSetoranPusat(ctx context.Context, idHuria string, idSetoran string, currentUser *User) error

	AddKategori(ctx context.Context, idHuria string, item KategoriPemasukan, currentUser *User) error
	UpdateKategori(ctx context.Context, idHuria string, idKategori string, item KategoriPemasukan, currentUser *User) error
	DeleteKategori(ctx context.Context, idHuria string, idKategori string, currentUser *User) error

	AddLunggu(ctx context.Context, idHuria string, item Lunggu, currentUser *User) error
	UpdateLunggu(ctx context.Context, idHuria string, idLunggu string, item Lunggu, currentUser *User) error
	DeleteLunggu(ctx context.Context, idHuria string, idLunggu string, currentUser *User) error

	UpdateWarta(ctx context.Context, idHuria string, warta WartaJemaat, currentUser *User) error

	Login(ctx context.Context, req LoginRequest) (*LoginResponse, error)
}
