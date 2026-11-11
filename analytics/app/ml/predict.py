"""Layanan prediksi: memuat model terbaik, membentuk fitur dari input baru, mengeluarkan nilai prediksi."""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from app.config import get_settings
from app.ml.dataset import FEATURES, FEATURE_LABELS, TARGET, is_sesi_siang, kalender
from app.ml.train import METRICS_FILE, MODEL_FILE
from app.warehouse.db import query

_cache: dict = {}


class ModelBelumSiap(RuntimeError):
    """Model belum dilatih (python -m app.ml.train)."""


def _dir() -> Path:
    return Path(get_settings()["models_dir"])


def _muat():
    path = _dir() / MODEL_FILE
    if not path.exists():
        raise ModelBelumSiap("Model belum dilatih. Jalankan: python -m app.ml.train")
    stamp = path.stat().st_mtime
    if _cache.get("stamp") != stamp:
        _cache["artefak"] = joblib.load(path)
        _cache["stamp"] = stamp
        mpath = _dir() / METRICS_FILE
        _cache["metrics"] = json.loads(mpath.read_text(encoding="utf-8")) if mpath.exists() else {}
    return _cache["artefak"], _cache["metrics"]


def metrik() -> dict:
    return _muat()[1]


def opsi() -> dict:
    """Daftar pilihan untuk formulir input (Huria berdata, jenis sesi, rentang tanggal)."""
    huria = query(
        """SELECT v.id_huria AS idHuria, v.nama_huria AS namaHuria, v.nama_resort AS namaResort,
                  v.nama_distrik AS namaDistrik, v.jumlah_jemaat AS jumlahJemaat,
                  COUNT(f.id_sesi) AS jumlahSesi, MAX(w.tanggal) AS tanggalTerakhir
           FROM v_huria v JOIN fact_kehadiran f ON f.huria_key = v.huria_key
           JOIN dim_waktu w ON w.waktu_key = f.waktu_key
           GROUP BY v.huria_key ORDER BY v.nama_distrik, v.nama_resort, v.nama_huria""")
    sesi = [r["nama_sesi"] for r in query("SELECT nama_sesi FROM dim_sesi ORDER BY sesi_key")]
    return {"huria": huria, "sesi": sesi, "fitur": [{"nama": f, "label": FEATURE_LABELS[f]} for f in FEATURES]}


def _cari_sesi(teks: str) -> str:
    daftar = [r["nama_sesi"] for r in query("SELECT nama_sesi FROM dim_sesi")]
    kunci = (teks or "").casefold().strip()
    for nama in daftar:
        if kunci == nama.casefold():
            return nama
    for nama in daftar:
        if kunci and kunci in nama.casefold():
            return nama
    raise ValueError(f"Sesi '{teks}' tidak dikenal. Pilihan: {', '.join(daftar)}")


def _riwayat(id_huria: str, nama_sesi: str, tanggal: str) -> pd.DataFrame:
    rows = query(
        """SELECT w.tanggal, f.jumlah_hadir AS hadir, f.total_pelean AS pelean, v.jumlah_jemaat
           FROM fact_kehadiran f
           JOIN dim_waktu w ON w.waktu_key = f.waktu_key
           JOIN dim_sesi s ON s.sesi_key = f.sesi_key
           JOIN v_huria v ON v.huria_key = f.huria_key
           WHERE v.id_huria = ? AND s.nama_sesi = ? AND w.tanggal < ?
           ORDER BY w.tanggal DESC LIMIT 4""", (id_huria, nama_sesi, tanggal))
    return pd.DataFrame(rows)


def prediksi(*, id_huria: str | None, sesi: str, tanggal: str, manual: dict | None = None) -> dict:
    artefak, laporan = _muat()
    manual = {k: v for k, v in (manual or {}).items() if v is not None}
    try:
        ts = pd.Timestamp(tanggal)
    except (ValueError, TypeError) as error:
        raise ValueError("tanggal tidak valid (format YYYY-MM-DD)") from error
    if pd.isna(ts):
        raise ValueError("tanggal tidak valid (format YYYY-MM-DD)")
    tanggal = ts.strftime("%Y-%m-%d")

    nama_sesi = _cari_sesi(sesi)
    sumber: dict[str, str] = {}
    nilai: dict[str, float] = {}
    nama_huria = None

    riwayat = pd.DataFrame()
    if id_huria:
        riwayat = _riwayat(id_huria, nama_sesi, tanggal)
        info = query("SELECT nama_huria, jumlah_jemaat FROM v_huria WHERE id_huria = ?", (id_huria,))
        if not info:
            raise ValueError(f"idHuria '{id_huria}' tidak ditemukan")
        nama_huria = info[0]["nama_huria"]
        nilai["jumlah_jemaat"] = float(info[0]["jumlah_jemaat"] or 0)
        sumber["jumlah_jemaat"] = "warehouse"
    if len(riwayat) >= 4:
        nilai["pelean_lag1"] = float(riwayat["pelean"].iloc[0])
        nilai["pelean_lag2"] = float(riwayat["pelean"].iloc[1])
        nilai["pelean_rata4"] = float(riwayat["pelean"].mean())
        nilai["hadir_lag1"] = float(riwayat["hadir"].iloc[0])
        nilai["hadir_rata4"] = float(riwayat["hadir"].mean())
        for k in ("pelean_lag1", "pelean_lag2", "pelean_rata4", "hadir_lag1", "hadir_rata4"):
            sumber[k] = "warehouse"

    peta_manual = {
        "jumlahJemaat": "jumlah_jemaat", "peleanMingguLalu": "pelean_lag1", "peleanDuaMingguLalu": "pelean_lag2",
        "rataPelean4": "pelean_rata4", "hadirMingguLalu": "hadir_lag1", "rataHadir4": "hadir_rata4",
    }
    for kunci, fitur in peta_manual.items():
        if kunci in manual:
            if float(manual[kunci]) < 0:
                raise ValueError(f"{kunci} tidak boleh negatif")
            nilai[fitur] = float(manual[kunci])
            sumber[fitur] = "manual"

    # Bila lag-2 / rata-rata tidak diisi manual, turunkan dari nilai yang tersedia
    if "pelean_lag1" in nilai:
        nilai.setdefault("pelean_lag2", nilai["pelean_lag1"]); sumber.setdefault("pelean_lag2", "diturunkan")
        nilai.setdefault("pelean_rata4", nilai["pelean_lag1"]); sumber.setdefault("pelean_rata4", "diturunkan")
    if "hadir_lag1" in nilai:
        nilai.setdefault("hadir_rata4", nilai["hadir_lag1"]); sumber.setdefault("hadir_rata4", "diturunkan")

    wajib = ["jumlah_jemaat", "pelean_lag1", "hadir_lag1"]
    kurang = [f for f in wajib if f not in nilai]
    if kurang:
        raise ValueError(
            "Riwayat sesi sebelumnya kurang dari 4 minggu untuk Huria/tanggal ini. Isi manual: "
            + ", ".join(FEATURE_LABELS[f] for f in kurang))
    if nilai["hadir_lag1"] > 0:
        nilai["pelean_per_hadir_lag1"] = nilai["pelean_lag1"] / nilai["hadir_lag1"]
    else:
        nilai["pelean_per_hadir_lag1"] = 0.0
    sumber["pelean_per_hadir_lag1"] = "diturunkan"

    nilai["is_sesi_siang"] = float(is_sesi_siang(nama_sesi)); sumber["is_sesi_siang"] = "input"
    for k, v in kalender(tanggal).items():
        nilai[k] = float(v); sumber[k] = "kalender"

    X = pd.DataFrame([[nilai[f] for f in artefak["fitur"]]], columns=artefak["fitur"])
    nilai_prediksi = float(max(artefak["model"].predict(X)[0], 0))

    galat = np.array([abs(t["galat"]) for t in laporan.get("titikUji", [])] or [0.0])
    spread = float(np.quantile(galat, 0.8))
    return {
        "status": "ok",
        "model": artefak["nama"],
        "target": TARGET,
        "idHuria": id_huria,
        "namaHuria": nama_huria,
        "sesi": nama_sesi,
        "tanggal": tanggal,
        "prediksi": int(round(nilai_prediksi)),
        "rentang": {"bawah": int(round(max(nilai_prediksi - spread, 0))), "atas": int(round(nilai_prediksi + spread)),
                    "keterangan": "Perkiraan rentang ±kuantil-80% galat absolut pada data uji"},
        "pembandingNaif": int(round(nilai["pelean_lag1"])),
        "fiturDipakai": [{"nama": f, "label": FEATURE_LABELS[f], "nilai": round(nilai[f], 2), "sumber": sumber.get(f, "-")}
                         for f in artefak["fitur"]],
        "riwayat": riwayat.sort_values("tanggal").to_dict("records") if not riwayat.empty else [],
    }
