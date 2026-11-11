-- =====================================================================
-- Data Warehouse HKBP  (skema bintang / snowflake ringan)
-- Dimensi : dim_waktu, dim_distrik, dim_resort, dim_huria, dim_kategori,
--           dim_jenis_pelean, dim_sesi, dim_peruntukan
-- Fakta   : fact_kehadiran, fact_pelean, fact_pemasukan, fact_alokasi,
--           fact_setoran
-- =====================================================================
PRAGMA foreign_keys = ON;

DROP VIEW  IF EXISTS v_huria;
DROP TABLE IF EXISTS fact_setoran;
DROP TABLE IF EXISTS fact_alokasi;
DROP TABLE IF EXISTS fact_pemasukan;
DROP TABLE IF EXISTS fact_pelean;
DROP TABLE IF EXISTS fact_kehadiran;
DROP TABLE IF EXISTS dim_peruntukan;
DROP TABLE IF EXISTS dim_sesi;
DROP TABLE IF EXISTS dim_jenis_pelean;
DROP TABLE IF EXISTS dim_kategori;
DROP TABLE IF EXISTS dim_huria;
DROP TABLE IF EXISTS dim_resort;
DROP TABLE IF EXISTS dim_distrik;
DROP TABLE IF EXISTS dim_waktu;
DROP TABLE IF EXISTS dq_report;
DROP TABLE IF EXISTS etl_run;

CREATE TABLE dim_waktu (
    waktu_key      INTEGER PRIMARY KEY,
    tanggal        TEXT    NOT NULL UNIQUE,
    tahun          INTEGER NOT NULL,
    kuartal        INTEGER NOT NULL,
    bulan          INTEGER NOT NULL,
    nama_bulan     TEXT    NOT NULL,
    tahun_bulan    TEXT    NOT NULL,
    minggu_iso     TEXT    NOT NULL,
    hari_ke_minggu INTEGER NOT NULL,
    nama_hari      TEXT    NOT NULL,
    is_hari_minggu INTEGER NOT NULL
);

CREATE TABLE dim_distrik (
    distrik_key  INTEGER PRIMARY KEY AUTOINCREMENT,
    id_distrik   TEXT,
    kode_distrik TEXT,
    nama_distrik TEXT NOT NULL UNIQUE,
    nama_praeses TEXT
);

CREATE TABLE dim_resort (
    resort_key   INTEGER PRIMARY KEY AUTOINCREMENT,
    distrik_key  INTEGER NOT NULL REFERENCES dim_distrik(distrik_key),
    id_resort    TEXT,
    kode_resort  TEXT,
    nama_resort  TEXT NOT NULL,
    nama_pendeta_resort TEXT,
    UNIQUE (distrik_key, nama_resort)
);

CREATE TABLE dim_huria (
    huria_key     INTEGER PRIMARY KEY AUTOINCREMENT,
    resort_key    INTEGER NOT NULL REFERENCES dim_resort(resort_key),
    id_huria      TEXT NOT NULL UNIQUE,
    nama_huria    TEXT NOT NULL,
    lokasi        TEXT,
    tahun_berdiri INTEGER,
    nama_pendeta  TEXT,
    jumlah_jemaat INTEGER,
    jumlah_kk     INTEGER
);

CREATE TABLE dim_kategori (
    kategori_key      INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_kategori_raw TEXT NOT NULL UNIQUE,
    kategori_kanonik  TEXT NOT NULL
);

CREATE TABLE dim_jenis_pelean (
    jenis_key    INTEGER PRIMARY KEY AUTOINCREMENT,
    kode_jenis   TEXT NOT NULL UNIQUE,
    keterangan   TEXT NOT NULL
);

CREATE TABLE dim_sesi (
    sesi_key    INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_sesi   TEXT NOT NULL UNIQUE,
    jam_mulai   TEXT,
    bahasa      TEXT
);

CREATE TABLE dim_peruntukan (
    peruntukan_key INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_peruntukan TEXT NOT NULL UNIQUE,
    is_setoran_pusat INTEGER NOT NULL
);

CREATE TABLE fact_kehadiran (
    id_sesi       TEXT PRIMARY KEY,
    waktu_key     INTEGER NOT NULL REFERENCES dim_waktu(waktu_key),
    huria_key     INTEGER NOT NULL REFERENCES dim_huria(huria_key),
    sesi_key      INTEGER NOT NULL REFERENCES dim_sesi(sesi_key),
    jumlah_hadir  INTEGER NOT NULL,
    total_pelean  INTEGER NOT NULL
);

CREATE TABLE fact_pelean (
    pelean_key  INTEGER PRIMARY KEY AUTOINCREMENT,
    id_sesi     TEXT NOT NULL REFERENCES fact_kehadiran(id_sesi),
    waktu_key   INTEGER NOT NULL REFERENCES dim_waktu(waktu_key),
    huria_key   INTEGER NOT NULL REFERENCES dim_huria(huria_key),
    jenis_key   INTEGER NOT NULL REFERENCES dim_jenis_pelean(jenis_key),
    nominal     INTEGER NOT NULL
);

CREATE TABLE fact_pemasukan (
    id_transaksi TEXT PRIMARY KEY,
    waktu_key    INTEGER NOT NULL REFERENCES dim_waktu(waktu_key),
    huria_key    INTEGER NOT NULL REFERENCES dim_huria(huria_key),
    kategori_key INTEGER NOT NULL REFERENCES dim_kategori(kategori_key),
    nominal      INTEGER NOT NULL,
    nominal_alokasi_pusat INTEGER NOT NULL DEFAULT 0,
    nominal_alokasi_huria INTEGER NOT NULL DEFAULT 0,
    keterangan   TEXT
);

CREATE TABLE fact_alokasi (
    id_alokasi     TEXT PRIMARY KEY,
    id_transaksi   TEXT NOT NULL REFERENCES fact_pemasukan(id_transaksi),
    waktu_key      INTEGER NOT NULL REFERENCES dim_waktu(waktu_key),
    huria_key      INTEGER NOT NULL REFERENCES dim_huria(huria_key),
    peruntukan_key INTEGER NOT NULL REFERENCES dim_peruntukan(peruntukan_key),
    nominal        INTEGER NOT NULL,
    nominal_dilunasi INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE fact_setoran (
    id_setoran     TEXT PRIMARY KEY,
    waktu_key      INTEGER NOT NULL REFERENCES dim_waktu(waktu_key),
    huria_key      INTEGER NOT NULL REFERENCES dim_huria(huria_key),
    periode        TEXT,
    total_setoran  INTEGER NOT NULL,
    total_rincian  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE dq_report (
    tahap      TEXT NOT NULL,
    tabel      TEXT NOT NULL,
    dimensi    TEXT NOT NULL,
    metrik     TEXT NOT NULL,
    nilai      REAL NOT NULL,
    jumlah_baris INTEGER NOT NULL,
    jumlah_masalah INTEGER NOT NULL
);

CREATE TABLE etl_run (
    run_at     TEXT NOT NULL,
    sumber     TEXT NOT NULL,
    ringkasan  TEXT NOT NULL
);

CREATE INDEX ix_kehadiran_huria_waktu ON fact_kehadiran(huria_key, waktu_key);
CREATE INDEX ix_pelean_huria_waktu    ON fact_pelean(huria_key, waktu_key);
CREATE INDEX ix_pemasukan_huria_waktu ON fact_pemasukan(huria_key, waktu_key);
CREATE INDEX ix_alokasi_huria         ON fact_alokasi(huria_key, peruntukan_key);
CREATE INDEX ix_setoran_huria_waktu   ON fact_setoran(huria_key, waktu_key);
CREATE INDEX ix_resort_distrik        ON dim_resort(distrik_key);
CREATE INDEX ix_huria_resort          ON dim_huria(resort_key);

CREATE VIEW v_huria AS
SELECT h.huria_key, h.id_huria, h.nama_huria, h.jumlah_jemaat,
       r.resort_key, r.nama_resort, d.distrik_key, d.nama_distrik
FROM dim_huria h
JOIN dim_resort r ON r.resort_key = h.resort_key
JOIN dim_distrik d ON d.distrik_key = r.distrik_key;
