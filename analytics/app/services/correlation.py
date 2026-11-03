"""Analisis hubungan jumlah kehadiran dan pemasukan per periode."""

from __future__ import annotations

import pandas as pd


_GRANULARITAS = {"mingguan": "W-SUN", "bulanan": "M"}


def _period_label(value: pd.Period, granularitas: str) -> str:
    if granularitas == "mingguan":
        iso = value.start_time.isocalendar()
        return f"{iso.year:04d}-W{iso.week:02d}"
    return value.strftime("%Y-%m")


def _correlation(left: pd.Series, right: pd.Series) -> float | None:
    value = left.corr(right)
    return None if pd.isna(value) else round(float(value), 6)


def analisis_korelasi(
    sesi: pd.DataFrame,
    pemasukan: pd.DataFrame,
    *,
    granularitas: str = "mingguan",
    kategori: str | None = None,
    minimum_periode: int = 8,
) -> dict:
    if granularitas not in _GRANULARITAS:
        raise ValueError("granularitas harus berupa mingguan atau bulanan")
    if minimum_periode < 2:
        raise ValueError("minimumPeriode harus lebih besar atau sama dengan 2")

    attendance = sesi.copy()
    income = pemasukan.copy()
    if kategori:
        income = income[income["namaKategori"].fillna("").eq(kategori)]

    for frame in (attendance, income):
        if "tanggal" in frame:
            frame["tanggal"] = pd.to_datetime(frame["tanggal"], errors="coerce")

    attendance = attendance.dropna(subset=["tanggal"]) if "tanggal" in attendance else attendance.iloc[0:0]
    income = income.dropna(subset=["tanggal"]) if "tanggal" in income else income.iloc[0:0]
    if not attendance.empty:
        attendance["periode"] = attendance["tanggal"].dt.to_period(_GRANULARITAS[granularitas])
        attendance = attendance.assign(jumlahHadir=pd.to_numeric(attendance["jumlahHadir"], errors="coerce").fillna(0))
        attendance = attendance.groupby("periode", as_index=False)["jumlahHadir"].sum()
    else:
        attendance = pd.DataFrame(columns=["periode", "jumlahHadir"])
    if not income.empty:
        income["periode"] = income["tanggal"].dt.to_period(_GRANULARITAS[granularitas])
        income = income.assign(nominal=pd.to_numeric(income["nominal"], errors="coerce").fillna(0))
        income = income.groupby("periode", as_index=False)["nominal"].sum()
    else:
        income = pd.DataFrame(columns=["periode", "nominal"])

    merged = attendance.merge(income, on="periode", how="inner").sort_values("periode")
    points = [
        {
            "periode": _period_label(row.periode, granularitas),
            "jumlahHadir": int(row.jumlahHadir),
            "nominal": int(row.nominal),
        }
        for row in merged.itertuples(index=False)
    ]
    base = {
        "status": "ok" if len(points) >= minimum_periode else "data_tidak_cukup",
        "metode": "Korelasi Pearson dan Spearman pada agregasi periode yang sama.",
        "granularitas": granularitas,
        "kategori": kategori,
        "jumlahPeriode": len(points),
        "minimumPeriode": minimum_periode,
        "data": points,
    }
    if len(points) < minimum_periode:
        return {
            **base,
            "pearson": None,
            "spearman": None,
            "interpretasi": "Data periode yang beririsan belum mencukupi untuk menghitung korelasi.",
        }

    attendance_values = merged["jumlahHadir"]
    income_values = merged["nominal"]
    pearson = _correlation(attendance_values, income_values)
    spearman = _correlation(attendance_values.rank(), income_values.rank())
    if pearson is None:
        interpretation = "Korelasi tidak dapat ditentukan karena salah satu variabel konstan."
    elif pearson >= 0.7:
        interpretation = "Hubungan positif kuat."
    elif pearson >= 0.3:
        interpretation = "Hubungan positif sedang."
    elif pearson <= -0.7:
        interpretation = "Hubungan negatif kuat."
    elif pearson <= -0.3:
        interpretation = "Hubungan negatif sedang."
    else:
        interpretation = "Hubungan linear lemah atau tidak ada."
    return {
        **base,
        "pearson": pearson,
        "spearman": spearman,
        "interpretasi": interpretation,
    }
