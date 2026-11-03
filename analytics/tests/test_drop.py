import pandas as pd

from app.services.drop import deteksi_drop_pemasukan


def test_drop_report_lists_huria_for_week_month_and_year():
    income = pd.DataFrame([
        {"idHuria": "H-1", "tanggal": "2025-01-05", "nominal": 100},
        {"idHuria": "H-1", "tanggal": "2025-01-12", "nominal": 50},
        {"idHuria": "H-1", "tanggal": "2024-12-29", "nominal": 200},
        {"idHuria": "H-1", "tanggal": "2024-01-07", "nominal": 200},
        {"idHuria": "H-2", "tanggal": "2025-01-05", "nominal": 100},
        {"idHuria": "H-2", "tanggal": "2025-01-12", "nominal": 150},
        {"idHuria": "H-2", "tanggal": "2024-12-29", "nominal": 100},
        {"idHuria": "H-2", "tanggal": "2024-01-07", "nominal": 100},
    ])
    huria = pd.DataFrame([
        {"idHuria": "H-1", "namaHuria": "Huria Satu"},
        {"idHuria": "H-2", "namaHuria": "Huria Dua"},
    ])

    result = deteksi_drop_pemasukan(income, huria)

    assert result["mingguan"]["jumlahHuriaTurun"] == 1
    assert result["mingguan"]["data"][0]["idHuria"] == "H-1"
    assert result["bulanan"]["jumlahHuriaTurun"] == 1
    assert result["tahunan"]["jumlahHuriaTurun"] == 1


def test_drop_report_does_not_invent_drop_without_previous_income():
    income = pd.DataFrame([
        {"idHuria": "H-1", "tanggal": "2025-01-05", "nominal": 100},
    ])
    huria = pd.DataFrame([{"idHuria": "H-1", "namaHuria": "Huria Satu"}])

    result = deteksi_drop_pemasukan(income, huria)

    assert result["status"] == "ok"
    assert result["mingguan"]["data"] == []
