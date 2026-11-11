"""EDA data warehouse HKBP: statistik deskriptif, distribusi, korelasi, outlier, dan temuan tertulis.

Jalankan:  python -m etl.eda        -> menulis docs/EDA_TEMUAN.md
Dipakai juga oleh notebooks/01_eda.ipynb.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

from app.config import ROOT
from app.warehouse.db import connect

OUT = ROOT / "docs" / "EDA_TEMUAN.md"

SQL_SESI = """
SELECT v.nama_huria, v.nama_resort, v.nama_distrik, v.jumlah_jemaat, s.nama_sesi, w.tanggal, w.tahun_bulan,
       f.jumlah_hadir AS hadir, f.total_pelean AS pelean
FROM fact_kehadiran f JOIN dim_waktu w ON w.waktu_key=f.waktu_key
JOIN dim_sesi s ON s.sesi_key=f.sesi_key JOIN v_huria v ON v.huria_key=f.huria_key
"""
SQL_PEMASUKAN = """
SELECT v.nama_huria, v.nama_distrik, w.tahun_bulan, w.tanggal, k.kategori_kanonik AS kategori,
       p.nominal, p.nominal_alokasi_pusat AS pusat, p.nominal_alokasi_huria AS kas
FROM fact_pemasukan p JOIN dim_waktu w ON w.waktu_key=p.waktu_key
JOIN dim_kategori k ON k.kategori_key=p.kategori_key JOIN v_huria v ON v.huria_key=p.huria_key
"""


def muat() -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    with connect() as conn:
        sesi = pd.read_sql_query(SQL_SESI, conn)
        masuk = pd.read_sql_query(SQL_PEMASUKAN, conn)
        total_huria = conn.execute("SELECT COUNT(*) FROM dim_huria").fetchone()[0]
        settle = conn.execute("SELECT SUM(nominal_dilunasi), SUM(nominal) FROM fact_alokasi a JOIN dim_peruntukan p "
                              "ON p.peruntukan_key=a.peruntukan_key WHERE p.is_setoran_pusat=1").fetchone()
    sesi["tanggal"] = pd.to_datetime(sesi["tanggal"])
    masuk["tanggal"] = pd.to_datetime(masuk["tanggal"])
    return sesi, masuk, {"total_huria": total_huria, "dilunasi": settle[0] or 0, "alokasi_pusat": settle[1] or 0}


def _fmt(frame: pd.DataFrame) -> pd.DataFrame:
    return frame.map(lambda x: f"{x:,.0f}".replace(",", "."))


def deskriptif(sesi: pd.DataFrame, masuk: pd.DataFrame) -> dict[str, pd.DataFrame]:
    return {
        "Kehadiran per sesi (jiwa)": _fmt(sesi["hadir"].describe().to_frame("nilai")),
        "Pelean per sesi (Rp)": _fmt(sesi["pelean"].describe().to_frame("nilai")),
        "Nominal transaksi pemasukan (Rp)": _fmt(masuk["nominal"].describe().to_frame("nilai")),
    }


def outlier_per_huria(sesi: pd.DataFrame) -> pd.DataFrame:
    """Outlier aturan IQR (1,5x) dihitung per Huria dan sesi agar adil terhadap ukuran Huria."""
    rows = []
    for (huria, nama), g in sesi.groupby(["nama_huria", "nama_sesi"]):
        q1, q3 = g["pelean"].quantile([0.25, 0.75])
        iqr = q3 - q1
        hit = g[(g["pelean"] > q3 + 1.5 * iqr) | (g["pelean"] < q1 - 1.5 * iqr)]
        for _, r in hit.iterrows():
            rows.append({"huria": huria, "sesi": nama, "tanggal": r["tanggal"].date().isoformat(),
                         "pelean": int(r["pelean"]), "median_huria": int(g["pelean"].median())})
    return pd.DataFrame(rows)


def temuan(sesi: pd.DataFrame, masuk: pd.DataFrame, info: dict) -> list[str]:
    out = []
    r = float(np.corrcoef(sesi["hadir"], sesi["pelean"])[0, 1])
    per_hadir = sesi["pelean"] / sesi["hadir"]
    out.append(f"**Pelean hampir berbanding lurus dengan kehadiran** (Pearson r = {r:.3f}); rata-rata pelean per "
               f"jemaat hadir Rp {per_hadir.mean():,.0f} (simpangan baku Rp {per_hadir.std():,.0f}).".replace(",", "."))
    huria = sesi.groupby("nama_huria")["pelean"].mean().sort_values()
    out.append(f"**Skala Huria sangat timpang**: rata-rata pelean per sesi {huria.index[-1]} (Rp {huria.iloc[-1]:,.0f}) adalah "
               f"{huria.iloc[-1] / huria.iloc[0]:.1f}x {huria.index[0]} (Rp {huria.iloc[0]:,.0f}); "
               "analisis lintas Huria harus dinormalisasi (per jemaat / per hadir).".replace(",", "."))
    pg = sesi.groupby("nama_sesi")[["hadir", "pelean"]].mean()
    if len(pg) >= 2:
        a, b = pg.index[0], pg.index[1]
        out.append(f"**Perbedaan antar sesi ibadah**: kehadiran rata-rata '{a}' {pg.loc[a, 'hadir']:.0f} jiwa vs '{b}' "
                   f"{pg.loc[b, 'hadir']:.0f} jiwa (selisih {abs(pg.loc[a, 'hadir'] - pg.loc[b, 'hadir']) / max(pg['hadir']) * 100:.0f}%).")
    bulan = masuk.groupby("tahun_bulan")["nominal"].sum()
    lengkap = bulan.iloc[:-1] if len(bulan) > 3 else bulan  # bulan terakhir masih berjalan -> tidak adil dibandingkan
    out.append(f"**Pemasukan memuncak pada {lengkap.idxmax()}** sebesar {lengkap.max() / lengkap.mean():.1f}x rata-rata bulanan "
               f"(terendah {lengkap.idxmin()}: {lengkap.min() / lengkap.mean():.1f}x; bulan berjalan {bulan.index[-1]} tidak dihitung) "
               "- pola musiman pesta/hari raya.")
    kat = masuk.groupby("kategori")["nominal"].sum().sort_values(ascending=False)
    kedua = (f", diikuti '{kat.index[1]}' ({kat.iloc[1] / kat.sum() * 100:.0f}%)" if len(kat) > 1 else "")
    out.append(f"**Konsentrasi kategori**: '{kat.index[0]}' menyumbang {kat.iloc[0] / kat.sum() * 100:.0f}% total pemasukan{kedua}.")
    pusat = masuk["pusat"].sum() / masuk["nominal"].sum() * 100
    out.append(f"**Aturan alokasi stabil**: {pusat:.1f}% pemasukan dialokasikan ke Setoran Pusat dan "
               f"{100 - pusat:.1f}% ke Kas Huria; {info['dilunasi'] / max(info['alokasi_pusat'], 1) * 100:.1f}% alokasi pusat sudah dilunasi "
               "(sisanya adalah bulan yang belum jatuh tempo).")
    n_data = sesi["nama_huria"].nunique()
    out.append(f"**Cakupan data tidak merata**: hanya {n_data} dari {info['total_huria']} Huria memiliki data operasional; "
               "Huria lain tidak dapat dianalisis/diprediksi sampai datanya dicatat.")
    ol = outlier_per_huria(sesi)
    out.append(f"**Outlier**: {len(ol)} sesi (dari {len(sesi)}) keluar dari batas IQR per Huria" +
               (f"; contoh terbesar {ol.sort_values('pelean', ascending=False).iloc[0]['huria']} pada "
                f"{ol.sort_values('pelean', ascending=False).iloc[0]['tanggal']} - bertepatan dengan hari raya." if len(ol) else "."))
    return out


def tulis() -> Path:
    sesi, masuk, info = muat()
    lines = ["# EDA & Temuan Awal", "", "Dibuat otomatis oleh `etl/eda.py` dari data warehouse.", "",
             "## 1. Statistik deskriptif", ""]
    for judul, df in deskriptif(sesi, masuk).items():
        lines += [f"**{judul}**", "", df.to_markdown(), ""]
    lines += ["## 2. Korelasi (kehadiran, pelean, jemaat)", "",
              sesi[["hadir", "pelean", "jumlah_jemaat"]].corr().round(3).to_markdown(), "",
              "## 3. Temuan (≥ 5)", ""]
    lines += [f"{i}. {t}" for i, t in enumerate(temuan(sesi, masuk, info), 1)]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return OUT


if __name__ == "__main__":
    print(tulis())
    sys.exit(0)
