# HKBP Analytics

Layanan FastAPI untuk analitik dashboard HKBP.

## Menjalankan

```powershell
Set-Location "D:\HKBP\analytics"
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

`GET /health` dapat diakses tanpa kunci. Endpoint analitik lainnya memerlukan
header `X-Internal-Key` yang sesuai dengan `INTERNAL_KEY`.

## Korelasi kehadiran dan pemasukan

`POST /correlation` menghitung korelasi Pearson dan Spearman antara jumlah
kehadiran dan nominal pemasukan pada periode mingguan atau bulanan.

Contoh body:

```json
{
  "idHuria": ["id-huria"],
  "granularitas": "mingguan",
  "minimumPeriode": 8
}
```

Respons juga menyertakan `data` per periode untuk kebutuhan scatter plot.
Jika periode yang beririsan kurang dari `minimumPeriode`, respons memakai
status `data_tidak_cukup` dan tidak mengarang nilai korelasi.

Backend Go meneruskan fitur ini melalui `/api/analytics/forecast`,
`/api/analytics/anomaly`, dan `/api/analytics/correlation`. Konfigurasikan
`ANALYTICS_URL` dan `ANALYTICS_INTERNAL_KEY` pada environment backend agar
frontend dapat mengakses layanan Python tanpa memanggil Python secara langsung.
Nilai `ANALYTICS_INTERNAL_KEY` (atau `ANALYTICS_KEY` pada konfigurasi backend
lama) harus sama persis dengan `INTERNAL_KEY` pada layanan Python. Backend Go
menerima ketiga nama tersebut untuk kompatibilitas konfigurasi.

Laporan penurunan pemasukan tersedia melalui `POST /drop` dan diteruskan
frontend sebagai `POST /api/analytics/drop`. Endpoint ini otomatis
membandingkan pemasukan terbaru dengan periode sebelumnya untuk setiap Huria
pada skala mingguan, bulanan, dan tahunan.

## Tes

```powershell
pytest -q
```
