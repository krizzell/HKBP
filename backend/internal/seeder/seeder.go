package seeder

import (
	"HKBP/internal/domain"
	"encoding/json"
	"fmt"
	"math/rand"
	"os"
	"path/filepath"
)

type HuriaSeedMeta struct {
	IdHuria             string
	NamaHuria           string
	NamaResort          string
	NamaDistrik         string
	LokasiHuria         string
	TahunBerdiri        string
	NamaPendetaPimpinan string
	JumlahJemaat        int
	KepalaKeluarga      string
	BasePelean          int64
	BaseAttendance      int
}

type SundayInfo struct {
	Date      string
	Name      string
	IsEaster  bool
	IsGotilon bool
}

// GenerateSeedData builds rich, authentic HKBP hierarchy and 2026 financial records
func GenerateSeedData(basePath string) ([]domain.Wilayah, error) {
	r := rand.New(rand.NewSource(20261017))

	// 41 Sundays in 2026 (Jan 4 - Oct 11) with authentic Batak liturgical calendar names
	sundays := []SundayInfo{
		{Date: "2026-01-04", Name: "Minggu Epiphanias"},
		{Date: "2026-01-11", Name: "Minggu I Dung Epiphanias"},
		{Date: "2026-01-18", Name: "Minggu II Dung Epiphanias"},
		{Date: "2026-01-25", Name: "Minggu III Dung Epiphanias"},
		{Date: "2026-02-01", Name: "Minggu Septuagesima"},
		{Date: "2026-02-08", Name: "Minggu Sexagesima"},
		{Date: "2026-02-15", Name: "Minggu Estomihi"},
		{Date: "2026-02-22", Name: "Minggu Invocavit"},
		{Date: "2026-03-01", Name: "Minggu Reminiscere"},
		{Date: "2026-03-08", Name: "Minggu Oculi"},
		{Date: "2026-03-15", Name: "Minggu Laetare"},
		{Date: "2026-03-22", Name: "Minggu Judika"},
		{Date: "2026-03-29", Name: "Minggu Palmarum"},
		{Date: "2026-04-05", Name: "Pesta Paskah I (Haheheon ni Tuhan Jesus)", IsEaster: true},
		{Date: "2026-04-12", Name: "Minggu Quasimodogeniti"},
		{Date: "2026-04-19", Name: "Minggu Misericordias Domini"},
		{Date: "2026-04-26", Name: "Minggu Jubilate"},
		{Date: "2026-05-03", Name: "Minggu Cantate"},
		{Date: "2026-05-10", Name: "Minggu Rogate"},
		{Date: "2026-05-17", Name: "Minggu Exaudi"},
		{Date: "2026-05-24", Name: "Pesta Pentakosta I"},
		{Date: "2026-05-31", Name: "Minggu Trinitatis"},
		{Date: "2026-06-07", Name: "Minggu I Dung Trinitatis"},
		{Date: "2026-06-14", Name: "Minggu II Dung Trinitatis"},
		{Date: "2026-06-21", Name: "Minggu III Dung Trinitatis"},
		{Date: "2026-06-28", Name: "Minggu IV Dung Trinitatis"},
		{Date: "2026-07-05", Name: "Minggu V Dung Trinitatis"},
		{Date: "2026-07-12", Name: "Minggu VI Dung Trinitatis"},
		{Date: "2026-07-19", Name: "Minggu VII Dung Trinitatis"},
		{Date: "2026-07-26", Name: "Minggu VIII Dung Trinitatis"},
		{Date: "2026-08-02", Name: "Minggu IX Dung Trinitatis"},
		{Date: "2026-08-09", Name: "Minggu X Dung Trinitatis"},
		{Date: "2026-08-16", Name: "Minggu XI Dung Trinitatis"},
		{Date: "2026-08-23", Name: "Minggu XII Dung Trinitatis (Pesta Gotilon)", IsGotilon: true},
		{Date: "2026-08-30", Name: "Minggu XIII Dung Trinitatis"},
		{Date: "2026-09-06", Name: "Minggu XIV Dung Trinitatis"},
		{Date: "2026-09-13", Name: "Minggu XV Dung Trinitatis"},
		{Date: "2026-09-20", Name: "Minggu XVI Dung Trinitatis"},
		{Date: "2026-09-27", Name: "Minggu XVII Dung Trinitatis"},
		{Date: "2026-10-04", Name: "Minggu XVIII Dung Trinitatis"},
		{Date: "2026-10-11", Name: "Minggu XIX Dung Trinitatis"},
	}

	categories := []domain.KategoriPemasukan{
		{IdKategori: "K-01", NamaKategori: "Pelean Minggu (Ia, Ib, IIa, IIb)", IdKategoriInduk: ""},
		{IdKategori: "K-02", NamaKategori: "Guguan / Iuran Taon Jemaat", IdKategoriInduk: ""},
		{IdKategori: "K-03", NamaKategori: "Hamuliateon (Ucapan Syukur)", IdKategoriInduk: ""},
		{IdKategori: "K-04", NamaKategori: "Pesta Gotilon (Pesta Panen)", IdKategoriInduk: ""},
		{IdKategori: "K-05", NamaKategori: "Pelean Partangiangan Lunggu", IdKategoriInduk: ""},
		{IdKategori: "K-06", NamaKategori: "Pelean Ulaon Na Badia", IdKategoriInduk: ""},
		{IdKategori: "K-07", NamaKategori: "Pelean Pamasumasuon (Pernikahan)", IdKategoriInduk: ""},
		{IdKategori: "K-08", NamaKategori: "Pelean Tardidi (Baptisan Kudus)", IdKategoriInduk: ""},
	}

	// 16 Authentic HKBP Hurias
	huriaTemplates := []HuriaSeedMeta{
		// Distrik VIII DKI Jakarta -> Resort Tebet
		{
			IdHuria:             "H-1.1.1.1",
			NamaHuria:           "HKBP Sudirman Jakarta",
			NamaResort:          "Resort Tebet",
			NamaDistrik:         "Distrik VIII DKI Jakarta",
			LokasiHuria:         "Jl. Jend. Sudirman Kav. 32, Jakarta Pusat",
			TahunBerdiri:        "1956",
			NamaPendetaPimpinan: "Pdt. Victor Tinambunan, MST",
			JumlahJemaat:        1450,
			KepalaKeluarga:      "380 KK",
			BasePelean:          18000000,
			BaseAttendance:      720,
		},
		{
			IdHuria:             "H-1.1.1.2",
			NamaHuria:           "HKBP Menteng Lama",
			NamaResort:          "Resort Tebet",
			NamaDistrik:         "Distrik VIII DKI Jakarta",
			LokasiHuria:         "Jl. Menteng Raya No. 45, Jakarta Pusat",
			TahunBerdiri:        "1962",
			NamaPendetaPimpinan: "Pdt. Bernard Manik, M.Th",
			JumlahJemaat:        920,
			KepalaKeluarga:      "240 KK",
			BasePelean:          12000000,
			BaseAttendance:      480,
		},
		{
			IdHuria:             "H-1.1.2.1",
			NamaHuria:           "HKBP Tebet Barat",
			NamaResort:          "Resort Tebet",
			NamaDistrik:         "Distrik VIII DKI Jakarta",
			LokasiHuria:         "Jl. Tebet Barat Raya No. 12, Jakarta Selatan",
			TahunBerdiri:        "1970",
			NamaPendetaPimpinan: "Pdt. Ramlan Siregar, M.Th",
			JumlahJemaat:        1150,
			KepalaKeluarga:      "300 KK",
			BasePelean:          15000000,
			BaseAttendance:      580,
		},
		{
			IdHuria:             "H-1.1.2.2",
			NamaHuria:           "HKBP Pancoran",
			NamaResort:          "Resort Tebet",
			NamaDistrik:         "Distrik VIII DKI Jakarta",
			LokasiHuria:         "Jl. Pancoran Barat VIII No. 5, Jakarta Selatan",
			TahunBerdiri:        "1978",
			NamaPendetaPimpinan: "Pdt. Jonner Hutabarat, M.Div",
			JumlahJemaat:        720,
			KepalaKeluarga:      "190 KK",
			BasePelean:          9000000,
			BaseAttendance:      360,
		},
		// Distrik VIII DKI Jakarta -> Resort Rawamangun
		{
			IdHuria:             "H-1.2.1.1",
			NamaHuria:           "HKBP Rawamangun Jati",
			NamaResort:          "Resort Rawamangun",
			NamaDistrik:         "Distrik VIII DKI Jakarta",
			LokasiHuria:         "Jl. Balai Pustaka No. 20, Jakarta Timur",
			TahunBerdiri:        "1965",
			NamaPendetaPimpinan: "Pdt. Martunas Tampubolon, S.Th",
			JumlahJemaat:        1350,
			KepalaKeluarga:      "350 KK",
			BasePelean:          16500000,
			BaseAttendance:      660,
		},
		{
			IdHuria:             "H-1.2.1.2",
			NamaHuria:           "HKBP Cipinang Cempedak",
			NamaResort:          "Resort Rawamangun",
			NamaDistrik:         "Distrik VIII DKI Jakarta",
			LokasiHuria:         "Jl. Cipinang Cempedak I No. 8, Jakarta Timur",
			TahunBerdiri:        "1982",
			NamaPendetaPimpinan: "Pdt. Daniel Nababan, S.Th",
			JumlahJemaat:        680,
			KepalaKeluarga:      "175 KK",
			BasePelean:          8500000,
			BaseAttendance:      340,
		},
		{
			IdHuria:             "H-1.2.2.1",
			NamaHuria:           "HKBP Kebayoran Baru",
			NamaResort:          "Resort Rawamangun",
			NamaDistrik:         "Distrik VIII DKI Jakarta",
			LokasiHuria:         "Jl. Hang Lekiu III No. 3, Jakarta Selatan",
			TahunBerdiri:        "1951",
			NamaPendetaPimpinan: "Pdt. Saut Marpaung, M.Th",
			JumlahJemaat:        1600,
			KepalaKeluarga:      "420 KK",
			BasePelean:          22000000,
			BaseAttendance:      850,
		},
		{
			IdHuria:             "H-1.2.2.2",
			NamaHuria:           "HKBP Gandaria",
			NamaResort:          "Resort Rawamangun",
			NamaDistrik:         "Distrik VIII DKI Jakarta",
			LokasiHuria:         "Jl. Gandaria Tengah II No. 15, Jakarta Selatan",
			TahunBerdiri:        "1985",
			NamaPendetaPimpinan: "Pdt. Robert Lumbantobing, S.Th",
			JumlahJemaat:        620,
			KepalaKeluarga:      "160 KK",
			BasePelean:          8000000,
			BaseAttendance:      310,
		},
		// Distrik II Silindung -> Resort Pearaja Tarutung
		{
			IdHuria:             "H-2.1.1.1",
			NamaHuria:           "HKBP Pearaja Tarutung",
			NamaResort:          "Resort Pearaja Tarutung",
			NamaDistrik:         "Distrik II Silindung",
			LokasiHuria:         "Jl. Pearaja No. 1, Tarutung, Tapanuli Utara",
			TahunBerdiri:        "1881",
			NamaPendetaPimpinan: "Pdt. Dr. Robinson Butarbutar",
			JumlahJemaat:        1100,
			KepalaKeluarga:      "290 KK",
			BasePelean:          9500000,
			BaseAttendance:      550,
		},
		{
			IdHuria:             "H-2.1.1.2",
			NamaHuria:           "HKBP Saitnihuta",
			NamaResort:          "Resort Pearaja Tarutung",
			NamaDistrik:         "Distrik II Silindung",
			LokasiHuria:         "Desa Saitnihuta, Kec. Tarutung, Tapanuli Utara",
			TahunBerdiri:        "1895",
			NamaPendetaPimpinan: "Pdt. Hasudungan Simanjuntak, S.Th",
			JumlahJemaat:        520,
			KepalaKeluarga:      "135 KK",
			BasePelean:          4500000,
			BaseAttendance:      260,
		},
		{
			IdHuria:             "H-2.1.2.1",
			NamaHuria:           "HKBP Dame Tarutung",
			NamaResort:          "Resort Pearaja Tarutung",
			NamaDistrik:         "Distrik II Silindung",
			LokasiHuria:         "Jl. Sisingamangaraja No. 14, Tarutung",
			TahunBerdiri:        "1864",
			NamaPendetaPimpinan: "Pdt. Marolop Simatupang, M.Th",
			JumlahJemaat:        780,
			KepalaKeluarga:      "200 KK",
			BasePelean:          6200000,
			BaseAttendance:      390,
		},
		{
			IdHuria:             "H-2.1.2.2",
			NamaHuria:           "HKBP Hutabarat",
			NamaResort:          "Resort Pearaja Tarutung",
			NamaDistrik:         "Distrik II Silindung",
			LokasiHuria:         "Partali Julu, Tarutung, Tapanuli Utara",
			TahunBerdiri:        "1912",
			NamaPendetaPimpinan: "Pdt. Poltak Pasaribu, S.Th",
			JumlahJemaat:        420,
			KepalaKeluarga:      "110 KK",
			BasePelean:          3800000,
			BaseAttendance:      210,
		},
		// Distrik II Silindung -> Resort Balige
		{
			IdHuria:             "H-2.2.1.1",
			NamaHuria:           "HKBP Balige Kota",
			NamaResort:          "Resort Balige",
			NamaDistrik:         "Distrik II Silindung",
			LokasiHuria:         "Jl. Gereja No. 2, Balige, Toba",
			TahunBerdiri:        "1891",
			NamaPendetaPimpinan: "Pdt. Gibson Silalahi, M.Th",
			JumlahJemaat:        1050,
			KepalaKeluarga:      "270 KK",
			BasePelean:          8500000,
			BaseAttendance:      520,
		},
		{
			IdHuria:             "H-2.2.1.2",
			NamaHuria:           "HKBP Soposurung",
			NamaResort:          "Resort Balige",
			NamaDistrik:         "Distrik II Silindung",
			LokasiHuria:         "Jl. Dr. T.D. Pardede, Balige, Toba",
			TahunBerdiri:        "1938",
			NamaPendetaPimpinan: "Pdt. David Hutapea, S.Th",
			JumlahJemaat:        560,
			KepalaKeluarga:      "145 KK",
			BasePelean:          4800000,
			BaseAttendance:      280,
		},
		{
			IdHuria:             "H-2.2.2.1",
			NamaHuria:           "HKBP Laguboti Kota",
			NamaResort:          "Resort Balige",
			NamaDistrik:         "Distrik II Silindung",
			LokasiHuria:         "Jl. Sisingamangaraja No. 88, Laguboti, Toba",
			TahunBerdiri:        "1889",
			NamaPendetaPimpinan: "Pdt. Freddy Panjaitan, S.Th",
			JumlahJemaat:        750,
			KepalaKeluarga:      "195 KK",
			BasePelean:          6000000,
			BaseAttendance:      370,
		},
		{
			IdHuria:             "H-2.2.2.2",
			NamaHuria:           "HKBP Haunatas",
			NamaResort:          "Resort Balige",
			NamaDistrik:         "Distrik II Silindung",
			LokasiHuria:         "Desa Haunatas, Laguboti, Toba",
			TahunBerdiri:        "1925",
			NamaPendetaPimpinan: "Pdt. Tiur Situmorang, S.Th",
			JumlahJemaat:        340,
			KepalaKeluarga:      "90 KK",
			BasePelean:          3200000,
			BaseAttendance:      170,
		},
		// Distrik III Humbang Habinsaran -> Resort Doloksanggul Kota
		{
			IdHuria:             "H-3.1.1.1",
			NamaHuria:           "HKBP Doloksanggul Kota",
			NamaResort:          "Resort Doloksanggul Kota",
			NamaDistrik:         "Distrik III Humbang Habinsaran",
			LokasiHuria:         "Jl. Merdeka No. 45, Doloksanggul, Humbang Hasundutan",
			TahunBerdiri:        "1922",
			NamaPendetaPimpinan: "Pdt. Jonner Lumbangaol, M.Th",
			JumlahJemaat:        1250,
			KepalaKeluarga:      "320 KK",
			BasePelean:          10000000,
			BaseAttendance:      620,
		},
		{
			IdHuria:             "H-3.1.1.2",
			NamaHuria:           "HKBP Matiti",
			NamaResort:          "Resort Doloksanggul Kota",
			NamaDistrik:         "Distrik III Humbang Habinsaran",
			LokasiHuria:         "Desa Matiti, Doloksanggul, Humbang Hasundutan",
			TahunBerdiri:        "1948",
			NamaPendetaPimpinan: "Pdt. Ramses Purba, S.Th",
			JumlahJemaat:        580,
			KepalaKeluarga:      "150 KK",
			BasePelean:          4800000,
			BaseAttendance:      290,
		},
		// Distrik III Humbang Habinsaran -> Resort Parsaoran Nauli
		{
			IdHuria:             "H-3.2.1.1",
			NamaHuria:           "HKBP Parsaoran Nauli",
			NamaResort:          "Resort Parsaoran Nauli",
			NamaDistrik:         "Distrik III Humbang Habinsaran",
			LokasiHuria:         "Desa Parsaoran Nauli, Humbang Hasundutan",
			TahunBerdiri:        "1964",
			NamaPendetaPimpinan: "Pdt. Marthin Simamora, S.Th",
			JumlahJemaat:        720,
			KepalaKeluarga:      "185 KK",
			BasePelean:          6000000,
			BaseAttendance:      360,
		},
		{
			IdHuria:             "H-3.2.1.2",
			NamaHuria:           "HKBP Banualuhu",
			NamaResort:          "Resort Parsaoran Nauli",
			NamaDistrik:         "Distrik III Humbang Habinsaran",
			LokasiHuria:         "Desa Banualuhu, Humbang Hasundutan",
			TahunBerdiri:        "1972",
			NamaPendetaPimpinan: "Pdt. Antonius Sihombing, S.Th",
			JumlahJemaat:        430,
			KepalaKeluarga:      "115 KK",
			BasePelean:          3500000,
			BaseAttendance:      215,
		},
		// Distrik X Medan - Aceh -> Resort Medan
		{
			IdHuria:             "H-10.1.1.1",
			NamaHuria:           "HKBP Medan Kota",
			NamaResort:          "Resort Medan",
			NamaDistrik:         "Distrik X Medan - Aceh",
			LokasiHuria:         "Jl. Jend. Sudirman No. 12, Medan",
			TahunBerdiri:        "1912",
			NamaPendetaPimpinan: "Pdt. Timbul Sitanggang, M.Th",
			JumlahJemaat:        2100,
			KepalaKeluarga:      "540 KK",
			BasePelean:          24000000,
			BaseAttendance:      1050,
		},
		{
			IdHuria:             "H-10.1.1.2",
			NamaHuria:           "HKBP Teladan Medan",
			NamaResort:          "Resort Medan",
			NamaDistrik:         "Distrik X Medan - Aceh",
			LokasiHuria:         "Jl. Gedung Arca No. 8, Medan",
			TahunBerdiri:        "1968",
			NamaPendetaPimpinan: "Pdt. Binsar Simanjuntak, S.Th",
			JumlahJemaat:        1300,
			KepalaKeluarga:      "340 KK",
			BasePelean:          14000000,
			BaseAttendance:      650,
		},
		// Distrik X Medan - Aceh -> Resort Glugur Medan
		{
			IdHuria:             "H-10.2.1.1",
			NamaHuria:           "HKBP Glugur",
			NamaResort:          "Resort Glugur Medan",
			NamaDistrik:         "Distrik X Medan - Aceh",
			LokasiHuria:         "Jl. KL. Yos Sudarso No. 104, Medan",
			TahunBerdiri:        "1954",
			NamaPendetaPimpinan: "Pdt. Edison Munthe, M.Th",
			JumlahJemaat:        890,
			KepalaKeluarga:      "230 KK",
			BasePelean:          9500000,
			BaseAttendance:      445,
		},
		{
			IdHuria:             "H-10.2.1.2",
			NamaHuria:           "HKBP Percut Sei Tuan",
			NamaResort:          "Resort Glugur Medan",
			NamaDistrik:         "Distrik X Medan - Aceh",
			LokasiHuria:         "Jl. Besar Percut, Deli Serdang",
			TahunBerdiri:        "1980",
			NamaPendetaPimpinan: "Pdt. Samuel Lubis, S.Th",
			JumlahJemaat:        610,
			KepalaKeluarga:      "160 KK",
			BasePelean:          6200000,
			BaseAttendance:      305,
		},
	}

	// Create map of hurias
	generatedHuriaMap := make(map[string]domain.Huria)

	for _, meta := range huriaTemplates {
		h := domain.Huria{
			NamaHuria:           meta.NamaHuria,
			IdHuria:             meta.IdHuria,
			LokasiHuria:         meta.LokasiHuria,
			TahunBerdiri:        meta.TahunBerdiri,
			NamaPendetaPimpinan: meta.NamaPendetaPimpinan,
			JumlahJemaat:        meta.JumlahJemaat,
			KepalaKeluarga:      meta.KepalaKeluarga,
			KategoriPemasukan:   categories,
			Lunggu: []domain.Lunggu{
				{IdLunggu: fmt.Sprintf("L-%s-01", meta.IdHuria), NamaLunggu: "Lunggu Sion", Keterangan: "Sektor I (Utara)"},
				{IdLunggu: fmt.Sprintf("L-%s-02", meta.IdHuria), NamaLunggu: "Lunggu Bethel", Keterangan: "Sektor II (Selatan)"},
				{IdLunggu: fmt.Sprintf("L-%s-03", meta.IdHuria), NamaLunggu: "Lunggu Jerusalem", Keterangan: "Sektor III (Pusat)"},
				{IdLunggu: fmt.Sprintf("L-%s-04", meta.IdHuria), NamaLunggu: "Lunggu Galilea", Keterangan: "Sektor IV (Barat)"},
				{IdLunggu: fmt.Sprintf("L-%s-05", meta.IdHuria), NamaLunggu: "Lunggu Hebron", Keterangan: "Sektor V (Timur)"},
				{IdLunggu: fmt.Sprintf("L-%s-06", meta.IdHuria), NamaLunggu: "Lunggu Nazaret", Keterangan: "Sektor VI (Pinggiran)"},
			},
			WartaJemaat: domain.WartaJemaat{
				Tema:    "Manghaporseai Jesus Kristus Sipangolu",
				SubTema: "Lam Margogo di Bagasan Haporseaon, Panghiramon, dohot Holong (1 Korint 13:13)",
				TataIbadah: []string{
					"Marende BE No. 6: 1-3 'Puji Jahowa'",
					"Votum - Introitus - Tangiang Buka",
					"Marende BE No. 171: 1-2 'Tandai Ma Au'",
					"Patik ni Debata: Patik I - X",
					"Koor Ina Hanna",
					"Manopoti Dosa & Baga-baga Hasesaan ni Dosa",
					"Marende BE No. 435: 1 'Marolopolop Tondingki'",
					"Epistel: Markus 10: 46-52",
					"Koor Ama / Parhalado",
					"Manghatindangkon Haporseaon (Apostolikum)",
					"Tingting Huria & Warta Parhepengon",
					"Marende BE No. 260: 1--- 'Holong ni RohaNa'",
					"Jamita (Khotbah)",
					"Marende BE No. 792: 1--- (Papungu Pelean Ia, Ib, IIa, IIb)",
					"Tangiang Pelean, Pasupasu, dohot Amen (3x)",
				},
				TingtingNaMarragam: []string{
					"Partangiangan Lunggu/Wijk dipatupa ari Rabu pukul 19.30 WIB di bagas ni ruas",
					"Sermon Parhalado / Sintua dipatupa ari Sabtu pukul 10.00 WIB di Consistori",
					"Latihan Koor Naposobulung & Remaja dipatupa ari Sabtu pukul 18.00 WIB",
					"Pendaftaran Katekisasi Sidi (Malua) taon ajaran 2026/2027 nunga dipungka",
					"Pesta Gotilon Huria taon 2026 dipatupa di ari Minggu tanggal 23 Agustus 2026",
				},
				TingtingParhepengon: []string{
					"Pelean Minggu Pelean Ia, Ib, IIa, IIb",
					"Penerimaan Iuran Taon Jemaat (Guguan 2026)",
					"Pelean Hamuliateon Parbagasan / Ulaon Na Badia",
					"Setoran Sentralisasi Keuangan Hatopan HKBP 55% tu Kantor Pusat Pearaja",
				},
			},
		}

		var sesiList []domain.SesiIbadah
		var pemasukanList []domain.PemasukanJemaat
		var alokasiList []domain.AlokasiTransaksi
		var setoranList []domain.SetoranPusat
		var rincianList []domain.RincianSetoranPusat

		monthlyPusatAlokasi := make(map[string]int64)
		monthlyAlokasiIds := make(map[string][]string)

		// Loop through all 41 sundays
		for sIdx, sun := range sundays {
			monthKey := sun.Date[:7] // e.g. "2026-01"

			// Sunday multiplier
			mult := 1.0 + float64(r.Intn(15)-7)/100.0 // slight weekly variation +/- 7%
			if sun.IsEaster {
				mult = 2.4 // Easter peak!
			}

			// Weekly total Sunday Pelean
			totalSundayPelean := int64(float64(meta.BasePelean) * mult)
			weeklyAttendance := int(float64(meta.BaseAttendance) * mult)

			// Session I: Ibadah Pagi (Bahasa Batak, 07:00)
			hadir1 := int(float64(weeklyAttendance) * 0.45)
			p1Total := int64(float64(totalSundayPelean) * 0.45)
			p1a_1 := int64(float64(p1Total) * 0.45)
			p1b_1 := int64(float64(p1Total) * 0.15)
			p2a_1 := int64(float64(p1Total) * 0.25)
			p2b_1 := p1Total - (p1a_1 + p1b_1 + p2a_1)

			sesi1Id := fmt.Sprintf("S-%s-%02d-1", meta.IdHuria, sIdx+1)
			sesi1 := domain.SesiIbadah{
				IdSesi:      sesi1Id,
				NamaSesi:    "Ibadah Pagi (Bahasa Batak)",
				Tanggal:     sun.Date,
				JamMulai:    "07:00",
				JumlahHadir: hadir1,
				Pelean: []domain.Pelean{
					{Jenis: "1a", Nominal: p1a_1},
					{Jenis: "1b", Nominal: p1b_1},
					{Jenis: "2a", Nominal: p2a_1},
					{Jenis: "2b", Nominal: p2b_1},
				},
			}

			// Session II: Ibadah Siang (Bahasa Indonesia / Batak, 10:00)
			hadir2 := weeklyAttendance - hadir1
			p2Total := totalSundayPelean - p1Total
			p1a_2 := int64(float64(p2Total) * 0.45)
			p1b_2 := int64(float64(p2Total) * 0.15)
			p2a_2 := int64(float64(p2Total) * 0.25)
			p2b_2 := p2Total - (p1a_2 + p1b_2 + p2a_2)

			sesi2Id := fmt.Sprintf("S-%s-%02d-2", meta.IdHuria, sIdx+1)
			sesi2 := domain.SesiIbadah{
				IdSesi:      sesi2Id,
				NamaSesi:    "Ibadah Siang (Bahasa Indonesia/Batak)",
				Tanggal:     sun.Date,
				JamMulai:    "10:00",
				JumlahHadir: hadir2,
				Pelean: []domain.Pelean{
					{Jenis: "1a", Nominal: p1a_2},
					{Jenis: "1b", Nominal: p1b_2},
					{Jenis: "2a", Nominal: p2a_2},
					{Jenis: "2b", Nominal: p2b_2},
				},
			}

			sesiList = append(sesiList, sesi1, sesi2)

			// Record Weekly Sunday Pelean (K-01)
			trxMingguId := fmt.Sprintf("T-%s-%02d-PM", meta.IdHuria, sIdx+1)
			pemasukanMinggu := domain.PemasukanJemaat{
				IdTransaksi: trxMingguId,
				Tanggal:     sun.Date,
				Nominal:     totalSundayPelean,
				IdKategori:  "K-01",
				Keterangan:  fmt.Sprintf("Pelean %s (%s)", sun.Name, sun.Date),
			}
			pemasukanList = append(pemasukanList, pemasukanMinggu)

			// Alokasi Pelean Minggu: 55% Setoran Pusat, 45% Kas Huria
			alokPusatNom := int64(float64(totalSundayPelean) * 0.55)
			alokKasNom := totalSundayPelean - alokPusatNom
			alokPusatId := fmt.Sprintf("A-%s-%02d-P", meta.IdHuria, sIdx+1)
			alokKasId := fmt.Sprintf("A-%s-%02d-K", meta.IdHuria, sIdx+1)

			alokasiList = append(alokasiList,
				domain.AlokasiTransaksi{
					IdAlokasi:   alokPusatId,
					IdTransaksi: trxMingguId,
					Peruntukan:  "Setoran Pusat",
					Nominal:     alokPusatNom,
				},
				domain.AlokasiTransaksi{
					IdAlokasi:   alokKasId,
					IdTransaksi: trxMingguId,
					Peruntukan:  "Kas Huria",
					Nominal:     alokKasNom,
				},
			)
			monthlyPusatAlokasi[monthKey] += alokPusatNom
			monthlyAlokasiIds[monthKey] = append(monthlyAlokasiIds[monthKey], alokPusatId)

			// Easter Special Offering (Ulaon Na Badia)
			if sun.IsEaster {
				paskahNom := int64(float64(meta.BasePelean) * 1.5)
				trxPaskahId := fmt.Sprintf("T-%s-PASKAH", meta.IdHuria)
				pemasukanList = append(pemasukanList, domain.PemasukanJemaat{
					IdTransaksi: trxPaskahId,
					Tanggal:     sun.Date,
					Nominal:     paskahNom,
					IdKategori:  "K-06",
					Keterangan:  "Pelean Ulaon Na Badia & Paskah 2026",
				})

				alokPaskahPusat := int64(float64(paskahNom) * 0.55)
				alokPaskahKas := paskahNom - alokPaskahPusat
				alokPaskahPusatId := fmt.Sprintf("A-%s-PAS-P", meta.IdHuria)
				alokasiList = append(alokasiList,
					domain.AlokasiTransaksi{
						IdAlokasi:   alokPaskahPusatId,
						IdTransaksi: trxPaskahId,
						Peruntukan:  "Setoran Pusat",
						Nominal:     alokPaskahPusat,
					},
					domain.AlokasiTransaksi{
						IdAlokasi:   fmt.Sprintf("A-%s-PAS-K", meta.IdHuria),
						IdTransaksi: trxPaskahId,
						Peruntukan:  "Kas Huria",
						Nominal:     alokPaskahKas,
					},
				)
				monthlyPusatAlokasi[monthKey] += alokPaskahPusat
				monthlyAlokasiIds[monthKey] = append(monthlyAlokasiIds[monthKey], alokPaskahPusatId)
			}

			// Monthly Guguan / Iuran Taon Jemaat (K-02) on 2nd Sunday
			if sIdx%4 == 1 {
				iuranNom := int64(float64(meta.BasePelean) * (1.2 + float64(r.Intn(30))/100.0))
				trxIuranId := fmt.Sprintf("T-%s-%02d-IT", meta.IdHuria, sIdx+1)
				pemasukanList = append(pemasukanList, domain.PemasukanJemaat{
					IdTransaksi: trxIuranId,
					Tanggal:     sun.Date,
					Nominal:     iuranNom,
					IdKategori:  "K-02",
					Keterangan:  fmt.Sprintf("Guguan / Iuran Taon Jemaat Periode %s", monthKey),
				})

				alokIuranPusat := int64(float64(iuranNom) * 0.55)
				alokIuranKas := iuranNom - alokIuranPusat
				alokIuranPusatId := fmt.Sprintf("A-%s-%02d-IT-P", meta.IdHuria, sIdx+1)

				alokasiList = append(alokasiList,
					domain.AlokasiTransaksi{
						IdAlokasi:   alokIuranPusatId,
						IdTransaksi: trxIuranId,
						Peruntukan:  "Setoran Pusat",
						Nominal:     alokIuranPusat,
					},
					domain.AlokasiTransaksi{
						IdAlokasi:   fmt.Sprintf("A-%s-%02d-IT-K", meta.IdHuria, sIdx+1),
						IdTransaksi: trxIuranId,
						Peruntukan:  "Kas Huria",
						Nominal:     alokIuranKas,
					},
				)
				monthlyPusatAlokasi[monthKey] += alokIuranPusat
				monthlyAlokasiIds[monthKey] = append(monthlyAlokasiIds[monthKey], alokIuranPusatId)
			}

			// Hamuliateon (Ucapan Syukur) (K-03) every 2-3 weeks
			if sIdx%3 == 0 {
				hamNom := int64(float64(meta.BasePelean) * (0.35 + float64(r.Intn(20))/100.0))
				trxHamId := fmt.Sprintf("T-%s-%02d-HM", meta.IdHuria, sIdx+1)
				pemasukanList = append(pemasukanList, domain.PemasukanJemaat{
					IdTransaksi: trxHamId,
					Tanggal:     sun.Date,
					Nominal:     hamNom,
					IdKategori:  "K-03",
					Keterangan:  "Ucapan Syukur Hamuliateon Keluarga / Parbagasan",
				})

				alokHamPusat := int64(float64(hamNom) * 0.55)
				alokHamKas := hamNom - alokHamPusat
				alokHamPusatId := fmt.Sprintf("A-%s-%02d-HM-P", meta.IdHuria, sIdx+1)

				alokasiList = append(alokasiList,
					domain.AlokasiTransaksi{
						IdAlokasi:   alokHamPusatId,
						IdTransaksi: trxHamId,
						Peruntukan:  "Setoran Pusat",
						Nominal:     alokHamPusat,
					},
					domain.AlokasiTransaksi{
						IdAlokasi:   fmt.Sprintf("A-%s-%02d-HM-K", meta.IdHuria, sIdx+1),
						IdTransaksi: trxHamId,
						Peruntukan:  "Kas Huria",
						Nominal:     alokHamKas,
					},
				)
				monthlyPusatAlokasi[monthKey] += alokHamPusat
				monthlyAlokasiIds[monthKey] = append(monthlyAlokasiIds[monthKey], alokHamPusatId)
			}

			// Partangiangan Lunggu (K-05) once every month (3rd week)
			if sIdx%4 == 2 {
				lungguNom := int64(float64(meta.BasePelean) * (0.25 + float64(r.Intn(15))/100.0))
				trxLungguId := fmt.Sprintf("T-%s-%02d-LG", meta.IdHuria, sIdx+1)
				pemasukanList = append(pemasukanList, domain.PemasukanJemaat{
					IdTransaksi: trxLungguId,
					Tanggal:     sun.Date,
					Nominal:     lungguNom,
					IdKategori:  "K-05",
					Keterangan:  fmt.Sprintf("Pelean Gabungan Partangiangan Lunggu / Sektor Bulan %s", monthKey),
				})

				alokLungguPusat := int64(float64(lungguNom) * 0.55)
				alokLungguKas := lungguNom - alokLungguPusat
				alokLungguPusatId := fmt.Sprintf("A-%s-%02d-LG-P", meta.IdHuria, sIdx+1)

				alokasiList = append(alokasiList,
					domain.AlokasiTransaksi{
						IdAlokasi:   alokLungguPusatId,
						IdTransaksi: trxLungguId,
						Peruntukan:  "Setoran Pusat",
						Nominal:     alokLungguPusat,
					},
					domain.AlokasiTransaksi{
						IdAlokasi:   fmt.Sprintf("A-%s-%02d-LG-K", meta.IdHuria, sIdx+1),
						IdTransaksi: trxLungguId,
						Peruntukan:  "Kas Huria",
						Nominal:     alokLungguKas,
					},
				)
				monthlyPusatAlokasi[monthKey] += alokLungguPusat
				monthlyAlokasiIds[monthKey] = append(monthlyAlokasiIds[monthKey], alokLungguPusatId)
			}
		}

		// Pesta Gotilon 2026 (K-04) - August 23, 2026
		pestaGotilonNom := int64(float64(meta.BasePelean) * (5.5 + float64(r.Intn(40))/10.0))
		trxGotilonId := fmt.Sprintf("T-%s-GOTILON-2026", meta.IdHuria)
		pemasukanList = append(pemasukanList, domain.PemasukanJemaat{
			IdTransaksi: trxGotilonId,
			Tanggal:     "2026-08-23",
			Nominal:     pestaGotilonNom,
			IdKategori:  "K-04",
			Keterangan:  "Silua dohot Hamuliateon Pesta Gotilon HKBP Taon 2026",
		})

		gotilonPusat := int64(float64(pestaGotilonNom) * 0.55)
		gotilonKas := pestaGotilonNom - gotilonPusat
		alokGotPusatId := fmt.Sprintf("A-%s-GOT-P", meta.IdHuria)

		alokasiList = append(alokasiList,
			domain.AlokasiTransaksi{
				IdAlokasi:   alokGotPusatId,
				IdTransaksi: trxGotilonId,
				Peruntukan:  "Setoran Pusat",
				Nominal:     gotilonPusat,
			},
			domain.AlokasiTransaksi{
				IdAlokasi:   fmt.Sprintf("A-%s-GOT-K", meta.IdHuria),
				IdTransaksi: trxGotilonId,
				Peruntukan:  "Kas Huria",
				Nominal:     gotilonKas,
			},
		)
		monthlyPusatAlokasi["2026-08"] += gotilonPusat
		monthlyAlokasiIds["2026-08"] = append(monthlyAlokasiIds["2026-08"], alokGotPusatId)

		// Occasional Services: Wedding (K-07) and Baptism (K-08)
		weddingDates := []string{"2026-02-14", "2026-06-20", "2026-09-12"}
		for wIdx, wDate := range weddingDates {
			wNom := int64(float64(meta.BasePelean) * 0.4)
			trxWId := fmt.Sprintf("T-%s-WED-%02d", meta.IdHuria, wIdx+1)
			pemasukanList = append(pemasukanList, domain.PemasukanJemaat{
				IdTransaksi: trxWId,
				Tanggal:     wDate,
				Nominal:     wNom,
				IdKategori:  "K-07",
				Keterangan:  "Pelean Ibadah Pamasumasuon (Pemberkatan Pernikahan Kudus)",
			})
			wPusat := int64(float64(wNom) * 0.55)
			wKas := wNom - wPusat
			wAlokPId := fmt.Sprintf("A-%s-WED-%02d-P", meta.IdHuria, wIdx+1)
			alokasiList = append(alokasiList,
				domain.AlokasiTransaksi{
					IdAlokasi:   wAlokPId,
					IdTransaksi: trxWId,
					Peruntukan:  "Setoran Pusat",
					Nominal:     wPusat,
				},
				domain.AlokasiTransaksi{
					IdAlokasi:   fmt.Sprintf("A-%s-WED-%02d-K", meta.IdHuria, wIdx+1),
					IdTransaksi: trxWId,
					Peruntukan:  "Kas Huria",
					Nominal:     wKas,
				},
			)
			mKey := wDate[:7]
			monthlyPusatAlokasi[mKey] += wPusat
			monthlyAlokasiIds[mKey] = append(monthlyAlokasiIds[mKey], wAlokPId)
		}

		// Monthly Setoran Pusat & Rincian (Jan - Sep 2026 completed)
		completedMonths := []string{
			"2026-01", "2026-02", "2026-03",
			"2026-04", "2026-05", "2026-06",
			"2026-07", "2026-08", "2026-09",
		}

		for mIdx, m := range completedMonths {
			tot := monthlyPusatAlokasi[m]
			if tot > 0 {
				spId := fmt.Sprintf("SP-%s-%02d", meta.IdHuria, mIdx+1)
				setorDate := fmt.Sprintf("%s-28", m)
				setoranList = append(setoranList, domain.SetoranPusat{
					IdSetoran:    spId,
					Periode:      m,
					TanggalSetor: setorDate,
					TotalSetoran: tot,
					Keterangan:   fmt.Sprintf("Sentralisasi Keuangan Hatopan HKBP Bulan %s", m),
				})

				for rIdx, aId := range monthlyAlokasiIds[m] {
					var nom int64
					for _, a := range alokasiList {
						if a.IdAlokasi == aId {
							nom = a.Nominal
							break
						}
					}
					rincianList = append(rincianList, domain.RincianSetoranPusat{
						IdRincian:       fmt.Sprintf("R-%s-%s-%02d", meta.IdHuria, m, rIdx+1),
						IdSetoran:       spId,
						IdAlokasi:       aId,
						NominalDilunasi: nom,
					})
				}
			}
		}

		h.SesiIbadah = sesiList
		h.PemasukanJemaat = pemasukanList
		h.AlokasiTransaksi = alokasiList
		h.SetoranPusat = setoranList
		h.RincianSetoranPusat = rincianList

		generatedHuriaMap[meta.IdHuria] = h
	}

	// Assemble complete HKBP hierarchy (Pusat -> Distrik -> Resort -> Huria)
	resortTebet := domain.Resort{
		NamaResort: "Resort Tebet",
		Huria: []domain.Huria{
			generatedHuriaMap["H-1.1.1.1"],
			generatedHuriaMap["H-1.1.1.2"],
			generatedHuriaMap["H-1.1.2.1"],
			generatedHuriaMap["H-1.1.2.2"],
		},
	}

	resortRawamangun := domain.Resort{
		NamaResort: "Resort Rawamangun",
		Huria: []domain.Huria{
			generatedHuriaMap["H-1.2.1.1"],
			generatedHuriaMap["H-1.2.1.2"],
			generatedHuriaMap["H-1.2.2.1"],
			generatedHuriaMap["H-1.2.2.2"],
		},
	}

	distrikJakarta := domain.Distrik{
		NamaDistrik: "Distrik VIII DKI Jakarta",
		Resort:      []domain.Resort{resortTebet, resortRawamangun},
	}

	resortPearaja := domain.Resort{
		NamaResort: "Resort Pearaja Tarutung",
		Huria: []domain.Huria{
			generatedHuriaMap["H-2.1.1.1"],
			generatedHuriaMap["H-2.1.1.2"],
			generatedHuriaMap["H-2.1.2.1"],
			generatedHuriaMap["H-2.1.2.2"],
		},
	}

	resortBalige := domain.Resort{
		NamaResort: "Resort Balige",
		Huria: []domain.Huria{
			generatedHuriaMap["H-2.2.1.1"],
			generatedHuriaMap["H-2.2.1.2"],
			generatedHuriaMap["H-2.2.2.1"],
			generatedHuriaMap["H-2.2.2.2"],
		},
	}

	distrikSilindung := domain.Distrik{
		NamaDistrik: "Distrik II Silindung",
		Resort:      []domain.Resort{resortPearaja, resortBalige},
	}

		resortDoloksanggul := domain.Resort{
		NamaResort: "Resort Doloksanggul Kota",
		Huria: []domain.Huria{
			generatedHuriaMap["H-3.1.1.1"],
			generatedHuriaMap["H-3.1.1.2"],
		},
	}

	resortParsaoranNauli := domain.Resort{
		NamaResort: "Resort Parsaoran Nauli",
		Huria: []domain.Huria{
			generatedHuriaMap["H-3.2.1.1"],
			generatedHuriaMap["H-3.2.1.2"],
		},
	}

	distrikHumbang := domain.Distrik{
		NamaDistrik: "Distrik III Humbang Habinsaran",
		Resort:      []domain.Resort{resortDoloksanggul, resortParsaoranNauli},
	}

	resortMedan := domain.Resort{
		NamaResort: "Resort Medan",
		Huria: []domain.Huria{
			generatedHuriaMap["H-10.1.1.1"],
			generatedHuriaMap["H-10.1.1.2"],
		},
	}

	resortGlugur := domain.Resort{
		NamaResort: "Resort Glugur Medan",
		Huria: []domain.Huria{
			generatedHuriaMap["H-10.2.1.1"],
			generatedHuriaMap["H-10.2.1.2"],
		},
	}

	distrikMedan := domain.Distrik{
		NamaDistrik: "Distrik X Medan - Aceh",
		Resort:      []domain.Resort{resortMedan, resortGlugur},
	}

	fullWilayah := domain.Wilayah{
		Pusat: domain.Pusat{
			NamaPusat: "Kantor Pusat HKBP (Pearaja Tarutung)",
			Distrik:   []domain.Distrik{distrikJakarta, distrikSilindung, distrikHumbang, distrikMedan},
		},
	}

	return []domain.Wilayah{fullWilayah}, nil
}

// WriteSeededToFile writes the seed data back to a file
func WriteSeededToFile(filePath string, data []domain.Wilayah) error {
	dir := filepath.Dir(filePath)
	_ = os.MkdirAll(dir, 0755)

	formatted, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filePath, formatted, 0644)
}
