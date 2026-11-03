import numpy as np
import pandas as pd

from app.services.forecast import prakiraan_pemasukan


def weekly_frame(periods=20):
    dates = pd.date_range("2025-01-05", periods=periods, freq="W-SUN")
    values = [1000000 + index * 10000 for index in range(periods)]
    return pd.DataFrame({"tanggal": dates, "nominal": values, "keterangan": "Pelean Minggu"})


def test_forecast_returns_deterministic_non_negative_values():
    frame = weekly_frame()

    first = prakiraan_pemasukan(frame, horizon=4)
    second = prakiraan_pemasukan(frame, horizon=4)

    assert first == second
    assert first["status"] == "ok"
    assert len(first["prakiraan"]) == 4
    assert all(item["nilai"] >= 0 for item in first["prakiraan"])


def test_forecast_reports_insufficient_data_without_inventing_values():
    result = prakiraan_pemasukan(weekly_frame(11))

    assert result["status"] == "data_tidak_cukup"
    assert result["prakiraan"] == []
    assert result["jumlahSampel"] == 11


def test_forecast_supports_monthly_granularity():
    dates = pd.date_range("2024-01-01", periods=14, freq="MS")
    frame = pd.DataFrame({"tanggal": dates, "nominal": np.arange(14) * 1000 + 50000})

    result = prakiraan_pemasukan(frame, granularitas="bulanan", horizon=2)

    assert result["status"] == "ok"
    assert len(result["prakiraan"]) == 2
    assert result["prakiraan"][0]["periode"].startswith("2025-")
