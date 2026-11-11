# EDA & Temuan Awal

Dibuat otomatis oleh `etl/eda.py` dari data warehouse.

## 1. Statistik deskriptif

**Kehadiran per sesi (jiwa)**

|       |   nilai |
|:------|--------:|
| count |   7.94  |
| mean  |   2.656 |
| std   |   2.644 |
| min   |  87     |
| 25%   | 400     |
| 50%   |   1.83  |
| 75%   |   4.37  |
| max   |  15.455 |

**Pelean per sesi (Rp)**

|       | nilai       |
|:------|:------------|
| count | 7.940       |
| mean  | 42.854.622  |
| std   | 42.722.147  |
| min   | 1.876.000   |
| 25%   | 9.453.250   |
| 50%   | 29.424.500  |
| 75%   | 63.697.000  |
| max   | 319.335.000 |

**Nominal transaksi pemasukan (Rp)**

|       | nilai       |
|:------|:------------|
| count | 18.341      |
| mean  | 31.794.240  |
| std   | 37.594.840  |
| min   | 296.000     |
| 25%   | 6.207.000   |
| 50%   | 16.720.000  |
| 75%   | 44.768.000  |
| max   | 358.112.000 |

## 2. Korelasi (kehadiran, pelean, jemaat)

|               |   hadir |   pelean |   jumlah_jemaat |
|:--------------|--------:|---------:|----------------:|
| hadir         |   1     |    0.93  |           0.469 |
| pelean        |   0.93  |    1     |           0.475 |
| jumlah_jemaat |   0.469 |    0.475 |           1     |

## 3. Temuan (≥ 5)

1. **Pelean hampir berbanding lurus dengan kehadiran** (Pearson r = 0.930); rata-rata pelean per jemaat hadir Rp 19.069 (simpangan baku Rp 5.554).
2. **Skala Huria sangat timpang**: rata-rata pelean per sesi HKBP Medan Kota (Rp 96.088.299) adalah 8.7x Tanding (Rp 11.081.617); analisis lintas Huria harus dinormalisasi (per jemaat / per hadir).
3. **Perbedaan antar sesi ibadah**: kehadiran rata-rata 'Ibadah Minggu' 321 jiwa vs 'Ibadah Minggu Tahun Baru' 412 jiwa (selisih 2%).
4. **Pemasukan memuncak pada 2024-03** sebesar 4.0x rata-rata bulanan (terendah 2005-05: 0.0x; bulan berjalan 2026-10 tidak dihitung) - pola musiman pesta/hari raya.
5. **Konsentrasi kategori**: 'Pelean Minggu' menyumbang 58% total pemasukan, diikuti 'Iuran Taon (Guguan)' (17%).
6. **Aturan alokasi stabil**: 55.0% pemasukan dialokasikan ke Setoran Pusat dan 45.0% ke Kas Huria; 99.7% alokasi pusat sudah dilunasi (sisanya adalah bulan yang belum jatuh tempo).
7. **Cakupan data tidak merata**: hanya 56 dari 56 Huria memiliki data operasional; Huria lain tidak dapat dianalisis/diprediksi sampai datanya dicatat.
8. **Outlier**: 34 sesi (dari 7940) keluar dari batas IQR per Huria; contoh terbesar HKBP Medan Kota pada 2026-04-05 - bertepatan dengan hari raya.
