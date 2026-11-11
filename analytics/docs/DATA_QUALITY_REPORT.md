# Laporan Kualitas Data & Hasil ETL

- Dibuat otomatis oleh `etl/build_warehouse.py` pada 2026-11-11 07:07 UTC
- Sumber data: **mongo (MongoDB)**
- Huria terdaftar: **56**, Huria yang memiliki data operasional: **56**

## 1. Jumlah baris di warehouse

| Tabel | Jumlah baris |
|---|---:|
| `dim_waktu` | 7.890 |
| `dim_distrik` | 6 |
| `dim_resort` | 14 |
| `dim_huria` | 56 |
| `dim_kategori` | 8 |
| `dim_jenis_pelean` | 4 |
| `dim_sesi` | 98 |
| `dim_peruntukan` | 2 |
| `fact_kehadiran` | 7.940 |
| `fact_pelean` | 31.760 |
| `fact_pemasukan` | 18.341 |
| `fact_alokasi` | 36.682 |
| `fact_setoran` | 8.736 |

## 2. Kualitas data sebelum vs sesudah pembersihan

Nilai = persen baris yang lolos aturan (100% = tidak ada masalah).

| Tabel | Dimensi | Aturan | Sebelum | Sesudah | Masalah (sebelum) |
|---|---|---|---:|---:|---:|
| huria | completeness | id_huria terisi | 100.00% | 100.00% | 0 |
| huria | completeness | nama_huria terisi | 100.00% | 100.00% | 0 |
| huria | completeness | nama_resort terisi | 100.00% | 100.00% | 0 |
| huria | completeness | nama_distrik terisi | 100.00% | 100.00% | 0 |
| huria | completeness | jumlah_jemaat terisi | 100.00% | 100.00% | 0 |
| huria | uniqueness | kunci unik (id_huria) | 100.00% | 100.00% | 0 |
| kategori | completeness | id_huria terisi | 100.00% | 100.00% | 0 |
| kategori | completeness | id_kategori terisi | 100.00% | 100.00% | 0 |
| kategori | completeness | nama_kategori terisi | 100.00% | 100.00% | 0 |
| kategori | uniqueness | kunci unik (id_huria, id_kategori) | 100.00% | 100.00% | 0 |
| sesi | completeness | id_sesi terisi | 100.00% | 100.00% | 0 |
| sesi | completeness | nama_sesi terisi | 100.00% | 100.00% | 0 |
| sesi | completeness | tanggal terisi | 100.00% | 100.00% | 0 |
| sesi | completeness | jumlah_hadir terisi | 100.00% | 100.00% | 0 |
| sesi | validity | tanggal format YYYY-MM-DD | 100.00% | 100.00% | 0 |
| sesi | validity | jumlah_hadir numerik >= 0 | 100.00% | 100.00% | 0 |
| sesi | uniqueness | kunci unik (id_huria, id_sesi) | 100.00% | 100.00% | 0 |
| pelean | completeness | id_sesi terisi | 100.00% | 100.00% | 0 |
| pelean | completeness | jenis terisi | 100.00% | 100.00% | 0 |
| pelean | completeness | nominal terisi | 100.00% | 100.00% | 0 |
| pelean | validity | nominal numerik >= 0 | 100.00% | 100.00% | 0 |
| pelean | uniqueness | kunci unik (id_huria, id_sesi, jenis) | 100.00% | 100.00% | 0 |
| pemasukan | completeness | id_transaksi terisi | 100.00% | 100.00% | 0 |
| pemasukan | completeness | tanggal terisi | 100.00% | 100.00% | 0 |
| pemasukan | completeness | nominal terisi | 100.00% | 100.00% | 0 |
| pemasukan | completeness | id_kategori terisi | 100.00% | 100.00% | 0 |
| pemasukan | validity | tanggal format YYYY-MM-DD | 100.00% | 100.00% | 0 |
| pemasukan | validity | nominal numerik >= 0 | 100.00% | 100.00% | 0 |
| pemasukan | uniqueness | kunci unik (id_huria, id_transaksi) | 100.00% | 100.00% | 0 |
| alokasi | completeness | id_alokasi terisi | 100.00% | 100.00% | 0 |
| alokasi | completeness | id_transaksi terisi | 100.00% | 100.00% | 0 |
| alokasi | completeness | peruntukan terisi | 100.00% | 100.00% | 0 |
| alokasi | completeness | nominal terisi | 100.00% | 100.00% | 0 |
| alokasi | validity | nominal numerik >= 0 | 100.00% | 100.00% | 0 |
| alokasi | uniqueness | kunci unik (id_huria, id_alokasi) | 100.00% | 100.00% | 0 |
| setoran | completeness | id_setoran terisi | 100.00% | 100.00% | 0 |
| setoran | completeness | tanggal_setor terisi | 100.00% | 100.00% | 0 |
| setoran | completeness | total_setoran terisi | 100.00% | 100.00% | 0 |
| setoran | validity | tanggal_setor format YYYY-MM-DD | 100.00% | 100.00% | 0 |
| setoran | validity | total_setoran numerik >= 0 | 100.00% | 100.00% | 0 |
| setoran | uniqueness | kunci unik (id_huria, id_setoran) | 100.00% | 100.00% | 0 |
| rincian | completeness | id_rincian terisi | 100.00% | 100.00% | 0 |
| rincian | completeness | id_setoran terisi | 100.00% | 100.00% | 0 |
| rincian | completeness | id_alokasi terisi | 100.00% | 100.00% | 0 |
| rincian | completeness | nominal_dilunasi terisi | 100.00% | 100.00% | 0 |
| rincian | validity | nominal_dilunasi numerik >= 0 | 100.00% | 100.00% | 0 |
| rincian | uniqueness | kunci unik (id_huria, id_rincian) | 100.00% | 100.00% | 0 |
| pemasukan | consistency | total alokasi = nominal transaksi | 100.00% | 100.00% | 0 |
| setoran | consistency | total setoran = jumlah rincian | 100.00% | 100.00% | 0 |
| alokasi | consistency | alokasi menunjuk transaksi yang ada | 100.00% | 100.00% | 0 |
| pelean | consistency | pelean menunjuk sesi yang ada | 100.00% | 100.00% | 0 |

## 3. Perbaikan yang dilakukan ETL

Tidak ada baris yang perlu dibuang atau diperbaiki pada sumber ini.

## 4. Catatan penting

- 0 dari 56 Huria belum memiliki data operasional (sesi ibadah, pemasukan, setoran). Huria tersebut tetap ada di `dim_huria` namun tidak punya fakta.
- Aturan *consistency* mengikuti aturan bisnis keuangan HKBP: total alokasi harus sama dengan nominal transaksi, dan total setoran harus sama dengan jumlah rincian pelunasan.
