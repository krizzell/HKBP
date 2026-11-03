import pandas as pd

from app.services.correlation import analisis_korelasi


def frames(periods=8):
    dates = pd.date_range("2026-01-04", periods=periods, freq="W-SUN")
    return (
        pd.DataFrame({"tanggal": dates, "jumlahHadir": range(10, 10 + periods)}),
        pd.DataFrame({
            "tanggal": dates,
            "nominal": [value * 1000 for value in range(10, 10 + periods)],
            "namaKategori": ["Pelean Minggu"] * periods,
        }),
    )


def test_correlation_returns_strong_positive_relationship():
    sesi, pemasukan = frames()

    result = analisis_korelasi(sesi, pemasukan)

    assert result["status"] == "ok"
    assert result["jumlahPeriode"] == 8
    assert result["pearson"] == 1.0
    assert result["spearman"] == 1.0
    assert len(result["data"]) == 8


def test_correlation_filters_category_and_reports_insufficient_overlap():
    sesi, pemasukan = frames()
    pemasukan.loc[4:, "namaKategori"] = "Lainnya"

    result = analisis_korelasi(
        sesi,
        pemasukan,
        kategori="Pelean Minggu",
        minimum_periode=5,
    )

    assert result["status"] == "data_tidak_cukup"
    assert result["jumlahPeriode"] == 4
    assert result["pearson"] is None


def test_correlation_supports_monthly_granularity():
    dates = pd.date_range("2026-01-01", periods=8, freq="MS")
    sesi = pd.DataFrame({"tanggal": dates, "jumlahHadir": range(1, 9)})
    pemasukan = pd.DataFrame({"tanggal": dates, "nominal": range(100, 900, 100)})

    result = analisis_korelasi(sesi, pemasukan, granularitas="bulanan")

    assert result["status"] == "ok"
    assert result["data"][0]["periode"] == "2026-01"
