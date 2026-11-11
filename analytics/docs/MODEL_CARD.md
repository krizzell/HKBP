# Model Card - Prediksi Pelean Sesi Ibadah HKBP

*Dibuat otomatis oleh `app/ml/train.py` pada 2026-11-11T02:29:59+00:00*

## 1. Tujuan
Memprediksi **total pelean (Rp) sebuah sesi ibadah** sebelum sesi berlangsung, agar bendahara Huria dan pengurus resort/distrik dapat merencanakan kas Huria dan kewajiban Setoran Pusat. Tugas: **regresi** (target numerik).

## 2. Data latih
- Sumber: data warehouse (`fact_kehadiran` + `dim_waktu` + `dim_huria` + `dim_sesi`), hasil ETL dari MongoDB.
- 2384 observasi, 56 Huria, 2026-02-01 s/d 2026-10-11.
- Split kronologis: latih 1364 baris, validasi 476, uji 544 baris.
- Fitur (12): `jumlah_jemaat`, `is_sesi_siang`, `bulan`, `minggu_ke`, `is_paskah`, `is_pentakosta`, `pelean_lag1`, `pelean_lag2`, `pelean_rata4`, `hadir_lag1`, `hadir_rata4`, `pelean_per_hadir_lag1`.
- Pencegahan kebocoran data: Semua fitur lag memakai shift(1) per deret (Huria x sesi): hanya data sebelum sesi. Kehadiran & pelean sesi yang diprediksi TIDAK dipakai sebagai fitur. Split kronologis; tuning memakai TimeSeriesSplit di data latih saja. Data uji baru dievaluasi setelah model dipilih berdasarkan validasi.

## 3. Algoritma & performa
| Model | RMSE validasi | MAE uji (Rp) | RMSE uji (Rp) | MAPE uji | R² uji | R² CV-waktu |
|---|---:|---:|---:|---:|---:|---:|
| Linear Regression (baseline) | 745.912 | 607.972 | 723.240 | 9.39% | 0.9575 | 0.7115 ± 0.4907 |
| Random Forest | 436.828 | 286.128 | 383.595 | 3.89% | 0.9880 | 0.8919 ± 0.1049 |
| Gradient Boosting | 476.686 | 305.964 | 419.843 | 4.13% | 0.9857 | 0.8750 ± 0.1390 |

Pembanding naif (pelean minggu lalu): MAE uji 348.298, MAPE 4.71%, R² 0.9815.

**Model terpilih: Random Forest.** Random Forest dipilih: RMSE validasi 436,828 (terendah atau dalam 2% dari terendah; bila seri dipilih model paling sederhana).
Model yang di-deploy dilatih ulang pada data latih + validasi.

## 4. Hyperparameter hasil tuning
- Linear Regression (baseline): Tanpa tuning (model dasar); parameter = `-`
- Random Forest: RandomizedSearchCV (n_iter=12) + TimeSeriesSplit(4); parameter = `{'n_estimators': 100, 'min_samples_leaf': 1, 'max_features': 1.0, 'max_depth': 6}`
- Gradient Boosting: RandomizedSearchCV (n_iter=12) + TimeSeriesSplit(4); parameter = `{'subsample': 0.85, 'n_estimators': 200, 'max_depth': 4, 'learning_rate': 0.03}`

## 5. Keterbatasan
- Data berasal dari satu periode (2026) sehingga pola musiman tahunan belum dapat dipelajari; hanya satu Paskah dan satu Pentakosta tersedia di data.
- Hanya Huria yang memiliki riwayat >= 5 sesi yang dapat diprediksi (butuh fitur lag).
- Data merupakan data seed/simulasi pola keuangan HKBP; hubungan kehadiran-pelean sangat linear, sehingga performa model pada data riil perlu diverifikasi ulang.
- Model memprediksi nilai rata-rata; lonjakan tak terduga (mis. persembahan khusus) tidak tertangkap.
- Bukan alat pengambil keputusan tunggal: gunakan sebagai estimasi perencanaan, bukan target setoran.

## 6. Cara pakai
`POST /api/analytics/ml/predict` dengan `idHuria`, `sesi`, `tanggal` (nilai lag diisi otomatis dari warehouse atau dapat diisi manual). Latih ulang: `python -m app.ml.train`.
