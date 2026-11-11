"""Pelatihan, tuning, evaluasi, dan pemilihan model prediksi pelean sesi ibadah.

Jalankan ulang kapan saja:  python -m app.ml.train

Alur:  data warehouse -> fitur lag (tanpa kebocoran) -> split kronologis train/val/test
       -> 3 algoritma (Linear Regression = baseline, Random Forest, Gradient Boosting)
       -> tuning RandomizedSearchCV + TimeSeriesSplit -> evaluasi -> pilih model terbaik
       -> simpan joblib + metrics.json + MODEL_CARD.md
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import RandomizedSearchCV, TimeSeriesSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.config import ROOT, get_settings
from app.ml.dataset import FEATURE_LABELS, FEATURES, TARGET, dataset, split_waktu

SEED = 42
MODEL_FILE = "model.joblib"
METRICS_FILE = "metrics.json"
MODEL_CARD_FILE = ROOT / "docs" / "MODEL_CARD.md"

NAMA_MODEL = {
    "linear_regression": "Linear Regression (baseline)",
    "random_forest": "Random Forest",
    "gradient_boosting": "Gradient Boosting",
}


def metrik(y_true, y_pred) -> dict:
    y_true, y_pred = np.asarray(y_true, float), np.asarray(y_pred, float)
    nonzero = y_true != 0
    mape = float(np.mean(np.abs((y_true[nonzero] - y_pred[nonzero]) / y_true[nonzero])) * 100) if nonzero.any() else 0.0
    return {
        "mae": round(float(mean_absolute_error(y_true, y_pred)), 2),
        "rmse": round(float(np.sqrt(mean_squared_error(y_true, y_pred))), 2),
        "mape": round(mape, 4),
        "r2": round(float(r2_score(y_true, y_pred)), 6),
    }


def kandidat() -> dict:
    """Tiga algoritma + ruang pencarian hyperparameter."""
    return {
        "linear_regression": (Pipeline([("scale", StandardScaler()), ("model", LinearRegression())]), {}),
        "random_forest": (
            RandomForestRegressor(random_state=SEED, n_jobs=1),
            {"n_estimators": [100, 200, 300], "max_depth": [4, 6, 8, None],
             "min_samples_leaf": [1, 2, 4], "max_features": [0.5, 0.8, 1.0]},
        ),
        "gradient_boosting": (
            GradientBoostingRegressor(random_state=SEED),
            {"n_estimators": [100, 200, 300], "learning_rate": [0.03, 0.05, 0.1],
             "max_depth": [2, 3, 4], "subsample": [0.7, 0.85, 1.0]},
        ),
    }


def cv_waktu(estimator, X, y, folds: int = 5) -> dict:
    """Validasi silang berurutan (TimeSeriesSplit) di seluruh data -> menilai kestabilan."""
    scores = []
    for tr, te in TimeSeriesSplit(n_splits=folds).split(X):
        est = _clone(estimator)
        est.fit(X.iloc[tr], y.iloc[tr])
        scores.append(metrik(y.iloc[te], est.predict(X.iloc[te])))
    out = {}
    for key in ("mae", "rmse", "mape", "r2"):
        values = [s[key] for s in scores]
        out[key] = {"rata": round(float(np.mean(values)), 4), "simpangan": round(float(np.std(values)), 4)}
    out["fold"] = folds
    return out


def _clone(estimator):
    from sklearn.base import clone
    return clone(estimator)


def importance(model, name: str) -> list[dict]:
    if name == "linear_regression":
        coef = np.abs(model.named_steps["model"].coef_)
    else:
        coef = model.feature_importances_
    total = float(np.sum(coef)) or 1.0
    rows = [{"fitur": f, "label": FEATURE_LABELS[f], "kepentingan": round(float(c) / total, 6)}
            for f, c in zip(FEATURES, coef)]
    return sorted(rows, key=lambda r: -r["kepentingan"])


def penyebab(row: pd.Series, error: float) -> str:
    """Dugaan penyebab galat besar (heuristik berbasis data, untuk analisis kesalahan)."""
    alasan = []
    if row["is_paskah"] or row["is_pentakosta"]:
        alasan.append("Hari raya besar: pola pelean berbeda dari minggu biasa")
    lag = row["pelean_lag1"]
    if lag and abs(row[TARGET] - lag) / max(row[TARGET], 1) > 0.2:
        alasan.append("Pelean berubah >20% dari minggu sebelumnya (fitur lag tidak menangkap lonjakan)")
    if row["pelean_lag1"] and row["pelean_rata4"] and abs(row["pelean_lag1"] - row["pelean_rata4"]) / row["pelean_rata4"] > 0.2:
        alasan.append("Minggu sebelumnya sendiri menyimpang dari rata-rata 4 minggu")
    if row["jumlah_jemaat"] < 700:
        alasan.append("Huria kecil: selisih kecil terlihat besar secara persentase")
    return "; ".join(alasan) or "Variasi kehadiran jemaat yang tidak terekam fitur historis"


def train(save: bool = True, card_path: Path | None = None) -> dict:
    df = dataset()
    tr, va, te = split_waktu(df)
    X_tr, y_tr = tr[FEATURES], tr[TARGET]
    X_va, y_va = va[FEATURES], va[TARGET]
    X_te, y_te = te[FEATURES], te[TARGET]
    cv = TimeSeriesSplit(n_splits=4)

    hasil, fitted = {}, {}
    # Pembanding naif (bukan salah satu dari 3 algoritma): prediksi = pelean minggu lalu
    naif = {"validasi": metrik(y_va, va["pelean_lag1"]), "uji": metrik(y_te, te["pelean_lag1"])}

    for key, (estimator, grid) in kandidat().items():
        if grid:
            search = RandomizedSearchCV(estimator, grid, n_iter=12, cv=cv, random_state=SEED,
                                        scoring="neg_root_mean_squared_error", n_jobs=1, refit=True)
            search.fit(X_tr, y_tr)
            best, params = search.best_estimator_, search.best_params_
            tuning = {"metode": "RandomizedSearchCV (n_iter=12) + TimeSeriesSplit(4)",
                      "skorCvRmse": round(float(-search.best_score_), 2),
                      "parameterTerbaik": {k: (None if v is None else (int(v) if isinstance(v, (np.integer,)) else
                                          (float(v) if isinstance(v, (np.floating,)) else v)))
                                           for k, v in params.items()}}
        else:
            best = estimator.fit(X_tr, y_tr)
            tuning = {"metode": "Tanpa tuning (model dasar)", "parameterTerbaik": {}}
        fitted[key] = best
        hasil[key] = {
            "nama": NAMA_MODEL[key],
            "tuning": tuning,
            "latih": metrik(y_tr, best.predict(X_tr)),
            "validasi": metrik(y_va, best.predict(X_va)),
            "uji": metrik(y_te, best.predict(X_te)),
            "cvWaktu": cv_waktu(best, df[FEATURES], df[TARGET]),
        }

    # Pemilihan: RMSE validasi terkecil; bila selisih <2% pilih model yang lebih sederhana.
    urut = sorted(hasil, key=lambda k: hasil[k]["validasi"]["rmse"])
    terbaik = urut[0]
    kompleksitas = ["linear_regression", "random_forest", "gradient_boosting"]
    for k in sorted(urut, key=kompleksitas.index):
        if hasil[k]["validasi"]["rmse"] <= hasil[terbaik]["validasi"]["rmse"] * 1.02:
            terbaik = k
            break
    alasan = (f"{NAMA_MODEL[terbaik]} dipilih: RMSE validasi {hasil[terbaik]['validasi']['rmse']:,.0f} "
              f"(terendah atau dalam 2% dari terendah; bila seri dipilih model paling sederhana).")

    # Deploy: refit model terbaik pada train+validasi
    final = _clone(fitted[terbaik])
    trva = pd.concat([tr, va])
    final.fit(trva[FEATURES], trva[TARGET])
    pred_uji = fitted[terbaik].predict(X_te)

    te = te.assign(prediksi=pred_uji, galat=pred_uji - y_te.to_numpy())
    te["galat_abs"] = te["galat"].abs()
    titik = [{"idHuria": r.id_huria, "huria": r.nama_huria, "tanggal": r.tanggal.strftime("%Y-%m-%d"),
              "sesi": r.nama_sesi, "aktual": int(r.total_pelean), "prediksi": int(round(r.prediksi)),
              "galat": int(round(r.galat))} for r in te.itertuples()]
    terburuk = te.sort_values("galat_abs", ascending=False).head(10)
    analisis = [{"huria": r["nama_huria"], "tanggal": r["tanggal"].strftime("%Y-%m-%d"), "sesi": r["nama_sesi"],
                 "aktual": int(r[TARGET]), "prediksi": int(round(r["prediksi"])), "galat": int(round(r["galat"])),
                 "galatPersen": round(float(abs(r["galat"]) / max(r[TARGET], 1) * 100), 2),
                 "dugaanPenyebab": penyebab(r, r["galat"])} for _, r in terburuk.iterrows()]
    galat_hari_raya = te[(te["is_paskah"] == 1) | (te["is_pentakosta"] == 1)]
    seluruh = df.assign(prediksi=final.predict(df[FEATURES]))
    raya = seluruh[(seluruh["is_paskah"] == 1) | (seluruh["is_pentakosta"] == 1)]
    metrik_raya = metrik(raya[TARGET], raya["prediksi"]) if len(raya) else None

    kemungkinan = df.sort_values("tanggal")
    meta = {
        "dilatihPada": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "versiSklearn": sklearn.__version__,
        "tugas": "Regresi: memprediksi total pelean (Rp) sebuah sesi ibadah",
        "target": TARGET,
        "fitur": [{"nama": f, "label": FEATURE_LABELS[f]} for f in FEATURES],
        "jumlahBaris": int(len(df)),
        "jumlahHuria": int(df["id_huria"].nunique()),
        "rentangTanggal": {"mulai": kemungkinan["tanggal"].min().strftime("%Y-%m-%d"),
                           "akhir": kemungkinan["tanggal"].max().strftime("%Y-%m-%d")},
        "split": {
            "metode": "Kronologis (60% awal latih, 20% validasi, 20% akhir uji) - tidak diacak",
            "latih": {"baris": int(len(tr)), "sampai": tr["tanggal"].max().strftime("%Y-%m-%d")},
            "validasi": {"baris": int(len(va)), "dari": va["tanggal"].min().strftime("%Y-%m-%d"),
                         "sampai": va["tanggal"].max().strftime("%Y-%m-%d")},
            "uji": {"baris": int(len(te)), "dari": te["tanggal"].min().strftime("%Y-%m-%d"),
                    "sampai": te["tanggal"].max().strftime("%Y-%m-%d")},
        },
        "pencegahanKebocoran": [
            "Semua fitur lag memakai shift(1) per deret (Huria x sesi): hanya data sebelum sesi.",
            "Kehadiran & pelean sesi yang diprediksi TIDAK dipakai sebagai fitur.",
            "Split kronologis; tuning memakai TimeSeriesSplit di data latih saja.",
            "Data uji baru dievaluasi setelah model dipilih berdasarkan validasi.",
        ],
    }
    laporan = {
        "meta": meta,
        "modelTerbaik": terbaik,
        "namaModelTerbaik": NAMA_MODEL[terbaik],
        "alasanPemilihan": alasan,
        "pembandingNaif": {"deskripsi": "Prediksi = pelean sesi yang sama minggu lalu", **naif},
        "model": hasil,
        "kepentingan": importance(fitted[terbaik], terbaik),
        "titikUji": titik,
        "analisisKesalahan": analisis,
        "metrikHariRaya": metrik_raya,
        "catatan": [
            "Data bersumber dari data warehouse hasil ETL (seed/simulasi pola keuangan HKBP).",
            "Hubungan kehadiran-pelean pada data sangat linear sehingga baseline sudah kuat; "
            "model non-linear tidak selalu lebih baik - ini ditunjukkan apa adanya.",
        ],
    }
    if save:
        out = Path(get_settings()["models_dir"])
        out.mkdir(parents=True, exist_ok=True)
        joblib.dump({"model": final, "fitur": FEATURES, "nama": NAMA_MODEL[terbaik], "kunci": terbaik,
                     "dilatihPada": meta["dilatihPada"], "sklearn": sklearn.__version__}, out / MODEL_FILE)
        (out / METRICS_FILE).write_text(json.dumps(laporan, ensure_ascii=False, indent=2), encoding="utf-8")
        tulis_model_card(laporan, card_path or MODEL_CARD_FILE)
    return laporan


def _rp(value) -> str:
    return f"{value:,.0f}".replace(",", ".")


def tulis_model_card(laporan: dict, path: Path = MODEL_CARD_FILE) -> None:
    m, meta = laporan["model"], laporan["meta"]
    best = laporan["modelTerbaik"]
    baris = []
    for key, v in m.items():
        baris.append(f"| {v['nama']} | {_rp(v['validasi']['rmse'])} | {_rp(v['uji']['mae'])} | "
                     f"{_rp(v['uji']['rmse'])} | {v['uji']['mape']:.2f}% | {v['uji']['r2']:.4f} | "
                     f"{v['cvWaktu']['r2']['rata']:.4f} ± {v['cvWaktu']['r2']['simpangan']:.4f} |")
    naif = laporan["pembandingNaif"]["uji"]
    lines = [
        "# Model Card - Prediksi Pelean Sesi Ibadah HKBP",
        "",
        f"*Dibuat otomatis oleh `app/ml/train.py` pada {meta['dilatihPada']}*",
        "",
        "## 1. Tujuan",
        "Memprediksi **total pelean (Rp) sebuah sesi ibadah** sebelum sesi berlangsung, agar bendahara Huria "
        "dan pengurus resort/distrik dapat merencanakan kas Huria dan kewajiban Setoran Pusat. "
        "Tugas: **regresi** (target numerik).",
        "",
        "## 2. Data latih",
        f"- Sumber: data warehouse (`fact_kehadiran` + `dim_waktu` + `dim_huria` + `dim_sesi`), hasil ETL dari MongoDB.",
        f"- {meta['jumlahBaris']} observasi, {meta['jumlahHuria']} Huria, "
        f"{meta['rentangTanggal']['mulai']} s/d {meta['rentangTanggal']['akhir']}.",
        f"- Split kronologis: latih {meta['split']['latih']['baris']} baris, validasi {meta['split']['validasi']['baris']}, "
        f"uji {meta['split']['uji']['baris']} baris.",
        f"- Fitur ({len(meta['fitur'])}): " + ", ".join(f"`{f['nama']}`" for f in meta["fitur"]) + ".",
        "- Pencegahan kebocoran data: " + " ".join(meta["pencegahanKebocoran"]),
        "",
        "## 3. Algoritma & performa",
        "| Model | RMSE validasi | MAE uji (Rp) | RMSE uji (Rp) | MAPE uji | R² uji | R² CV-waktu |",
        "|---|---:|---:|---:|---:|---:|---:|",
        *baris,
        "",
        f"Pembanding naif (pelean minggu lalu): MAE uji {_rp(naif['mae'])}, MAPE {naif['mape']:.2f}%, R² {naif['r2']:.4f}.",
        "",
        f"**Model terpilih: {laporan['namaModelTerbaik']}.** {laporan['alasanPemilihan']}",
        "Model yang di-deploy dilatih ulang pada data latih + validasi.",
        "",
        "## 4. Hyperparameter hasil tuning",
        *[f"- {v['nama']}: {v['tuning']['metode']}; parameter = `{v['tuning']['parameterTerbaik'] or '-'}`"
          for v in m.values()],
        "",
        "## 5. Keterbatasan",
        "- Data berasal dari satu periode (2026) sehingga pola musiman tahunan belum dapat dipelajari; "
        "hanya satu Paskah dan satu Pentakosta tersedia di data.",
        "- Hanya Huria yang memiliki riwayat >= 5 sesi yang dapat diprediksi (butuh fitur lag).",
        "- Data merupakan data seed/simulasi pola keuangan HKBP; hubungan kehadiran-pelean sangat linear, "
        "sehingga performa model pada data riil perlu diverifikasi ulang.",
        "- Model memprediksi nilai rata-rata; lonjakan tak terduga (mis. persembahan khusus) tidak tertangkap.",
        "- Bukan alat pengambil keputusan tunggal: gunakan sebagai estimasi perencanaan, bukan target setoran.",
        "",
        "## 6. Cara pakai",
        "`POST /api/analytics/ml/predict` dengan `idHuria`, `sesi`, `tanggal` (nilai lag diisi otomatis dari warehouse "
        "atau dapat diisi manual). Latih ulang: `python -m app.ml.train`.",
        "",
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    laporan = train(save=True)
    print(f"Model terbaik: {laporan['namaModelTerbaik']}")
    print(laporan["alasanPemilihan"])
    for key, v in laporan["model"].items():
        print(f"  {v['nama']:<30} val RMSE={v['validasi']['rmse']:>12,.0f}  uji MAE={v['uji']['mae']:>10,.0f} "
              f"MAPE={v['uji']['mape']:.2f}%  R2={v['uji']['r2']:.4f}")
    print(f"  Pembanding naif: uji MAE={laporan['pembandingNaif']['uji']['mae']:,.0f} MAPE={laporan['pembandingNaif']['uji']['mape']:.2f}%")
    return 0


if __name__ == "__main__":
    sys.exit(main())
