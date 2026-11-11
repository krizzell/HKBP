"""Query SQL analitik di atas skema bintang. Dashboard & model membaca sumber yang sama."""

from __future__ import annotations

import json

from app.warehouse.db import query

# --- Kubus bulanan per Huria: dasar KPI, tren, drill-down distrik>resort>huria, cross-filter.
SQL_CUBE = """
WITH hadir AS (
    SELECT f.huria_key, w.tahun_bulan,
           COUNT(*)            AS jumlah_sesi,
           SUM(f.jumlah_hadir) AS total_hadir,
           SUM(f.total_pelean) AS total_pelean
    FROM fact_kehadiran f JOIN dim_waktu w ON w.waktu_key = f.waktu_key
    GROUP BY f.huria_key, w.tahun_bulan
), masuk AS (
    SELECT p.huria_key, w.tahun_bulan,
           SUM(p.nominal)               AS total_pemasukan,
           SUM(p.nominal_alokasi_pusat) AS alokasi_pusat,
           SUM(p.nominal_alokasi_huria) AS alokasi_kas
    FROM fact_pemasukan p JOIN dim_waktu w ON w.waktu_key = p.waktu_key
    GROUP BY p.huria_key, w.tahun_bulan
), setor AS (
    SELECT s.huria_key, w.tahun_bulan, SUM(s.total_setoran) AS setoran_dibayar
    FROM fact_setoran s JOIN dim_waktu w ON w.waktu_key = s.waktu_key
    GROUP BY s.huria_key, w.tahun_bulan
), kunci AS (
    SELECT huria_key, tahun_bulan FROM hadir
    UNION SELECT huria_key, tahun_bulan FROM masuk
    UNION SELECT huria_key, tahun_bulan FROM setor
)
SELECT v.nama_distrik AS distrik, v.nama_resort AS resort, v.nama_huria AS huria,
       v.id_huria AS idHuria, v.jumlah_jemaat AS jumlahJemaat, k.tahun_bulan AS bulan,
       COALESCE(h.jumlah_sesi, 0)      AS jumlahSesi,
       COALESCE(h.total_hadir, 0)      AS totalHadir,
       COALESCE(h.total_pelean, 0)     AS totalPelean,
       COALESCE(m.total_pemasukan, 0)  AS totalPemasukan,
       COALESCE(m.alokasi_pusat, 0)    AS alokasiPusat,
       COALESCE(m.alokasi_kas, 0)      AS alokasiKas,
       COALESCE(s.setoran_dibayar, 0)  AS setoranDibayar
FROM kunci k
JOIN v_huria v ON v.huria_key = k.huria_key
LEFT JOIN hadir h ON h.huria_key = k.huria_key AND h.tahun_bulan = k.tahun_bulan
LEFT JOIN masuk m ON m.huria_key = k.huria_key AND m.tahun_bulan = k.tahun_bulan
LEFT JOIN setor s ON s.huria_key = k.huria_key AND s.tahun_bulan = k.tahun_bulan
ORDER BY k.tahun_bulan, v.nama_distrik, v.nama_resort, v.nama_huria
"""

# --- Aliran uang: distrik > kategori > peruntukan (bahan diagram Sankey)
SQL_ALIRAN = """
SELECT v.nama_distrik AS distrik, v.nama_resort AS resort, v.nama_huria AS huria,
       w.tahun_bulan AS bulan, k.kategori_kanonik AS kategori,
       pr.nama_peruntukan AS peruntukan, SUM(a.nominal) AS nominal
FROM fact_alokasi a
JOIN fact_pemasukan p   ON p.id_transaksi = a.id_transaksi
JOIN dim_kategori k     ON k.kategori_key = p.kategori_key
JOIN dim_peruntukan pr  ON pr.peruntukan_key = a.peruntukan_key
JOIN dim_waktu w        ON w.waktu_key = a.waktu_key
JOIN v_huria v          ON v.huria_key = a.huria_key
GROUP BY v.nama_distrik, v.nama_resort, v.nama_huria, w.tahun_bulan, k.kategori_kanonik, pr.nama_peruntukan
ORDER BY w.tahun_bulan
"""

# --- Tingkat sesi ibadah (box plot, bubble animasi, small multiples)
SQL_SESI = """
SELECT v.nama_distrik AS distrik, v.nama_resort AS resort, v.nama_huria AS huria,
       v.jumlah_jemaat AS jumlahJemaat, w.tanggal, w.tahun_bulan AS bulan,
       w.minggu_iso AS mingguISO, s.nama_sesi AS sesi,
       f.jumlah_hadir AS hadir, f.total_pelean AS pelean
FROM fact_kehadiran f
JOIN dim_waktu w ON w.waktu_key = f.waktu_key
JOIN dim_sesi s  ON s.sesi_key = f.sesi_key
JOIN v_huria v   ON v.huria_key = f.huria_key
ORDER BY w.tanggal, v.nama_huria
"""

SQL_KATEGORI = """
SELECT v.nama_distrik AS distrik, v.nama_resort AS resort, v.nama_huria AS huria,
       w.tahun_bulan AS bulan, k.kategori_kanonik AS kategori, SUM(p.nominal) AS nominal,
       COUNT(*) AS jumlahTransaksi
FROM fact_pemasukan p
JOIN dim_kategori k ON k.kategori_key = p.kategori_key
JOIN dim_waktu w ON w.waktu_key = p.waktu_key
JOIN v_huria v ON v.huria_key = p.huria_key
GROUP BY v.nama_distrik, v.nama_resort, v.nama_huria, w.tahun_bulan, k.kategori_kanonik
ORDER BY w.tahun_bulan
"""


def cube() -> list[dict]:
    return query(SQL_CUBE)


def aliran() -> list[dict]:
    return query(SQL_ALIRAN)


def sesi() -> list[dict]:
    return query(SQL_SESI)


def kategori() -> list[dict]:
    return query(SQL_KATEGORI)


def ringkasan() -> dict:
    tabel = ["dim_waktu", "dim_distrik", "dim_resort", "dim_huria", "dim_kategori", "dim_jenis_pelean",
             "dim_sesi", "dim_peruntukan", "fact_kehadiran", "fact_pelean", "fact_pemasukan",
             "fact_alokasi", "fact_setoran"]
    jumlah = {t: query(f"SELECT COUNT(*) AS n FROM {t}")[0]["n"] for t in tabel}
    rentang = query("SELECT MIN(w.tanggal) AS mulai, MAX(w.tanggal) AS akhir FROM fact_kehadiran f "
                    "JOIN dim_waktu w ON w.waktu_key = f.waktu_key")[0]
    huria_data = query("SELECT COUNT(DISTINCT huria_key) AS n FROM fact_kehadiran")[0]["n"]
    dq = query("SELECT tahap, tabel, dimensi, metrik, nilai, jumlah_baris, jumlah_masalah FROM dq_report")
    run = query("SELECT run_at, sumber, ringkasan FROM etl_run ORDER BY run_at DESC LIMIT 1")
    skor = {}
    for tahap in ("sebelum", "sesudah"):
        rows = [r for r in dq if r["tahap"] == tahap]
        for dim in ("completeness", "validity", "consistency", "uniqueness"):
            sub = [r["nilai"] for r in rows if r["dimensi"] == dim]
            skor.setdefault(dim, {})[tahap] = round(sum(sub) / len(sub), 2) if sub else None
    return {
        "jumlahBaris": jumlah,
        "totalBarisFakta": sum(v for k, v in jumlah.items() if k.startswith("fact_")),
        "rentangTanggal": rentang,
        "jumlahHuriaBerdata": huria_data,
        "jumlahHuria": jumlah["dim_huria"],
        "skorKualitas": skor,
        "etlTerakhir": ({"waktu": run[0]["run_at"], "sumber": run[0]["sumber"],
                         "ringkasan": json.loads(run[0]["ringkasan"])} if run else None),
        "skema": {
            "fakta": ["fact_kehadiran", "fact_pelean", "fact_pemasukan", "fact_alokasi", "fact_setoran"],
            "dimensi": ["dim_waktu", "dim_distrik", "dim_resort", "dim_huria", "dim_kategori",
                        "dim_jenis_pelean", "dim_sesi", "dim_peruntukan"],
        },
    }
