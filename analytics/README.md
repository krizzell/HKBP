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

## Tes

```powershell
pytest -q
```
