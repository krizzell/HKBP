"""Pembentukan dataset ML dari data warehouse (tanpa kebocoran data).

Target  : total pelean sesi ibadah (Rp)  -> regresi
Prinsip : fitur HANYA memakai informasi yang sudah diketahui SEBELUM sesi
          berlangsung (lag/rata-rata sesi sebelumnya + kalender), sehingga
          tidak ada kebocoran dari kehadiran/pelean sesi yang sama.
"""

from __future__ import annotations

from datetime import date

import numpy as np
import pandas as pd
from dateutil.easter import easter

from app.warehouse.db import connect

TARGET = "total_pelean"
FEATURES = [
    "jumlah_jemaat",
    "is_sesi_siang",
    "bulan",
    "minggu_ke",
    "is_paskah",
    "is_pentakosta",
    "pelean_lag1",
    "pelean_lag2",
    "pelean_rata4",
    "hadir_lag1",
    "hadir_rata4",
    "pelean_per_hadir_lag1",
]
FEATURE_LABELS = {
    "jumlah_jemaat": "Jumlah jemaat Huria",
    "is_sesi_siang": "Sesi siang (1) / pagi (0)",
    "bulan": "Bulan",
    "minggu_ke": "Minggu ke- (ISO)",
    "is_paskah": "Minggu Paskah",
    "is_pentakosta": "Minggu Pentakosta",
    "pelean_lag1": "Pelean 1 minggu lalu",
    "pelean_lag2": "Pelean 2 minggu lalu",
    "pelean_rata4": "Rata-rata pelean 4 minggu terakhir",
    "hadir_lag1": "Kehadiran 1 minggu lalu",
    "hadir_rata4": "Rata-rata kehadiran 4 minggu terakhir",
    "pelean_per_hadir_lag1": "Pelean per jemaat hadir (minggu lalu)",
}

SQL_SESI = """
SELECT v.id_huria, v.nama_huria, v.nama_resort, v.nama_distrik, v.jumlah_jemaat,
       s.nama_sesi, w.tanggal, f.jumlah_hadir, f.total_pelean
FROM fact_kehadiran f
JOIN dim_waktu w ON w.waktu_key = f.waktu_key
JOIN dim_sesi s  ON s.sesi_key  = f.sesi_key
JOIN v_huria v   ON v.huria_key = f.huria_key
ORDER BY v.id_huria, s.nama_sesi, w.tanggal
"""


def is_sesi_siang(nama_sesi: str) -> int:
    return int("siang" in (nama_sesi or "").casefold())


def kalender(tanggal: date | str) -> dict[str, int]:
    """Fitur kalender liturgi dari tanggal (Paskah & Pentakosta dihitung algoritmik)."""
    d = pd.Timestamp(tanggal).date()
    paskah = easter(d.year)
    return {
        "bulan": d.month,
        "minggu_ke": int(pd.Timestamp(d).isocalendar().week),
        "is_paskah": int(d == paskah),
        "is_pentakosta": int((d - paskah).days == 49),
    }


def muat_sesi() -> pd.DataFrame:
    with connect() as conn:
        frame = pd.read_sql_query(SQL_SESI, conn)
    frame["tanggal"] = pd.to_datetime(frame["tanggal"])
    return frame


def bangun_fitur(sesi: pd.DataFrame) -> pd.DataFrame:
    """Tambahkan fitur lag per deret (huria x jenis sesi). shift(1) menjamin hanya masa lalu."""
    df = sesi.sort_values(["id_huria", "nama_sesi", "tanggal"]).reset_index(drop=True).copy()
    df = df.rename(columns={"jumlah_hadir": "hadir", "total_pelean": TARGET})
    grp = df.groupby(["id_huria", "nama_sesi"], sort=False)
    df["pelean_lag1"] = grp[TARGET].shift(1)
    df["pelean_lag2"] = grp[TARGET].shift(2)
    df["pelean_rata4"] = grp[TARGET].transform(lambda s: s.shift(1).rolling(4, min_periods=4).mean())
    df["hadir_lag1"] = grp["hadir"].shift(1)
    df["hadir_rata4"] = grp["hadir"].transform(lambda s: s.shift(1).rolling(4, min_periods=4).mean())
    df["pelean_per_hadir_lag1"] = df["pelean_lag1"] / df["hadir_lag1"].replace(0, np.nan)
    df["is_sesi_siang"] = df["nama_sesi"].map(is_sesi_siang)
    cal = pd.DataFrame([kalender(t) for t in df["tanggal"]])
    df = pd.concat([df, cal], axis=1)
    return df.dropna(subset=FEATURES + [TARGET]).reset_index(drop=True)


def dataset() -> pd.DataFrame:
    return bangun_fitur(muat_sesi())


def split_waktu(df: pd.DataFrame, train: float = 0.6, val: float = 0.2):
    """Split kronologis berdasarkan tanggal: train < val < test (tanpa mengacak)."""
    tanggal = np.sort(df["tanggal"].unique())
    a = tanggal[int(len(tanggal) * train)]
    b = tanggal[int(len(tanggal) * (train + val))]
    tr = df[df["tanggal"] < a]
    va = df[(df["tanggal"] >= a) & (df["tanggal"] < b)]
    te = df[df["tanggal"] >= b]
    return tr, va, te
