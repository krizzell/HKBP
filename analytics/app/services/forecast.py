"""Prakiraan pemasukan dengan pembanding dan backtest deterministik."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing


MIN_PERIODS = 12


@dataclass(frozen=True)
class ModelResult:
    name: str
    predictions: np.ndarray
    seasonal: bool


def _periods(frame: pd.DataFrame, granularitas: str, mulai=None, akhir=None) -> pd.PeriodIndex:
    if frame.empty:
        return pd.PeriodIndex([], freq="W-SUN" if granularitas == "mingguan" else "M")
    dates = pd.to_datetime(frame["tanggal"], errors="coerce").dropna()
    if mulai:
        dates = dates[dates >= pd.Timestamp(mulai)]
    if akhir:
        dates = dates[dates <= pd.Timestamp(akhir)]
    if dates.empty:
        return pd.PeriodIndex([], freq="W-SUN" if granularitas == "mingguan" else "M")
    return pd.period_range(dates.min(), dates.max(), freq="W-SUN" if granularitas == "mingguan" else "M")


def _aggregate(frame: pd.DataFrame, granularitas: str, mulai=None, akhir=None, kategori=None) -> pd.Series:
    if frame.empty:
        return pd.Series(dtype="float64")
    work = frame.copy()
    work["tanggal"] = pd.to_datetime(work["tanggal"], errors="coerce")
    work["nominal"] = pd.to_numeric(work["nominal"], errors="coerce").fillna(0)
    work = work.dropna(subset=["tanggal"])
    if mulai:
        work = work[work["tanggal"] >= pd.Timestamp(mulai)]
    if akhir:
        work = work[work["tanggal"] <= pd.Timestamp(akhir)]
    if kategori:
        category = kategori.casefold()
        category_columns = [column for column in ("namaKategori", "keterangan") if column in work]
        if not category_columns:
            return pd.Series(dtype="float64")
        mask = work[category_columns].fillna("").astype(str).apply(
            lambda column: column.str.casefold().str.contains(category, regex=False)
        ).any(axis=1)
        work = work[mask]
    if work.empty:
        return pd.Series(dtype="float64")
    freq = "W-SUN" if granularitas == "mingguan" else "M"
    values = work.groupby(work["tanggal"].dt.to_period(freq))["nominal"].sum()
    periods = _periods(work, granularitas)
    return values.reindex(periods, fill_value=0).astype(float)


def _moving_average(values: np.ndarray, horizon: int) -> np.ndarray:
    window = min(4, len(values))
    return np.repeat(np.mean(values[-window:]), horizon)


def _seasonal_naive(values: np.ndarray, horizon: int, season: int) -> np.ndarray:
    return np.resize(values[-season:], horizon).astype(float)


def _holt_winters(values: np.ndarray, horizon: int, season: int | None) -> np.ndarray:
    kwargs = {"trend": "add", "initialization_method": "estimated"}
    if season and len(values) >= season * 2:
        kwargs["seasonal"] = "add"
        kwargs["seasonal_periods"] = season
    model = ExponentialSmoothing(values, **kwargs).fit(optimized=True)
    return np.asarray(model.forecast(horizon), dtype=float)


def _smape(actual: np.ndarray, predicted: np.ndarray) -> float:
    denominator = np.abs(actual) + np.abs(predicted)
    valid = denominator > 0
    if not np.any(valid):
        return 0.0
    return float(np.mean(2 * np.abs(actual[valid] - predicted[valid]) / denominator[valid]) * 100)


def _mae(actual: np.ndarray, predicted: np.ndarray) -> float:
    return float(np.mean(np.abs(actual - predicted)))


def _backtest(values: np.ndarray, name: str, season: int | None) -> tuple[float, float, list[float]]:
    horizon = 1
    if name == "seasonal naive":
        minimum_train = season or 8
    else:
        minimum_train = 8
    predictions = []
    actuals = []
    for end in range(minimum_train, len(values)):
        train = values[:end]
        try:
            if name == "rata-rata bergerak 4 periode":
                prediction = _moving_average(train, horizon)[0]
            elif name == "seasonal naive":
                prediction = _seasonal_naive(train, horizon, season or 1)[0]
            else:
                prediction = _holt_winters(train, horizon, season)[0]
        except (ValueError, np.linalg.LinAlgError):
            continue
        predictions.append(prediction)
        actuals.append(values[end])
    if not actuals:
        return float("inf"), float("inf"), []
    actual_array = np.asarray(actuals)
    prediction_array = np.asarray(predictions)
    residuals = (actual_array - prediction_array).tolist()
    return _smape(actual_array, prediction_array), _mae(actual_array, prediction_array), residuals


def _label_period(period: pd.Period, granularitas: str) -> str:
    if granularitas == "mingguan":
        iso = period.start_time.isocalendar()
        return f"{iso.year:04d}-W{iso.week:02d}"
    return period.strftime("%Y-%m")


def prakiraan_pemasukan(
    frame: pd.DataFrame,
    *,
    granularitas: str = "mingguan",
    horizon: int | None = None,
    mulai=None,
    akhir=None,
    kategori: str | None = None,
) -> dict:
    if granularitas not in {"mingguan", "bulanan"}:
        raise ValueError("granularitas harus mingguan atau bulanan")
    default_horizon = 4 if granularitas == "mingguan" else 1
    horizon = default_horizon if horizon is None else horizon
    if horizon < 1 or horizon > 12:
        raise ValueError("horizon harus antara 1 dan 12")

    values = _aggregate(frame, granularitas, mulai, akhir, kategori)
    rentang = {
        "mulai": values.index[0].start_time.date().isoformat() if len(values) else None,
        "akhir": values.index[-1].end_time.date().isoformat() if len(values) else None,
    }
    if len(values) < MIN_PERIODS:
        return {
            "status": "data_tidak_cukup",
            "metode": {"model": None, "granularitas": granularitas, "musiman": False},
            "rentangData": rentang,
            "jumlahSampel": int(len(values)),
            "histori": [],
            "prakiraan": [],
            "galat": {"model": None, "pembanding": None, "satuan": "rupiah"},
            "catatan": [f"Minimal {MIN_PERIODS} periode diperlukan untuk prakiraan."],
        }

    season = 52 if granularitas == "mingguan" else 12
    candidates = ["rata-rata bergerak 4 periode"]
    if len(values) >= season:
        candidates.append("seasonal naive")
    candidates.append("holt-winters")
    scores = {name: _backtest(values.to_numpy(), name, season) for name in candidates}
    selected = min(candidates, key=lambda name: (scores[name][0], scores[name][1], name))
    seasonal = selected == "seasonal naive" or (selected == "holt-winters" and len(values) >= season * 2)
    try:
        if selected == "rata-rata bergerak 4 periode":
            forecast = _moving_average(values.to_numpy(), horizon)
        elif selected == "seasonal naive":
            forecast = _seasonal_naive(values.to_numpy(), horizon, season)
        else:
            forecast = _holt_winters(values.to_numpy(), horizon, season if len(values) >= season * 2 else None)
    except (ValueError, np.linalg.LinAlgError):
        selected = "rata-rata bergerak 4 periode"
        seasonal = False
        forecast = _moving_average(values.to_numpy(), horizon)

    residuals = scores[selected][2]
    spread = float(np.quantile(np.abs(residuals), 0.8)) if residuals else 0.0
    future_periods = pd.period_range(values.index[-1] + 1, periods=horizon, freq=values.index.freq)
    history = [
        {"periode": _label_period(period, granularitas), "nilai": int(round(max(value, 0)))}
        for period, value in zip(values.index, values)
    ]
    forecasts = [
        {
            "periode": _label_period(period, granularitas),
            "nilai": int(round(max(value, 0))),
            "bawah": int(round(max(value - spread, 0))),
            "atas": int(round(max(value + spread, 0))),
        }
        for period, value in zip(future_periods, forecast)
    ]
    comparison = scores["rata-rata bergerak 4 periode"]
    return {
        "status": "ok",
        "metode": {"model": selected, "granularitas": granularitas, "musiman": seasonal},
        "rentangData": rentang,
        "jumlahSampel": int(len(values)),
        "histori": history,
        "prakiraan": forecasts,
        "galat": {
            "model": {"smape": round(scores[selected][0], 4), "mae": int(round(scores[selected][1]))},
            "pembanding": {"smape": round(comparison[0], 4), "mae": int(round(comparison[1]))},
            "satuan": "rupiah",
        },
        "catatan": (
            ["Musiman digunakan karena tersedia minimal dua musim penuh."]
            if seasonal
            else ["Data terbatas untuk estimasi musiman; model tanpa komponen musiman digunakan."]
        ),
    }
