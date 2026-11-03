from datetime import date, datetime

import pandas as pd


def minggu_iso(tanggal: date | datetime | pd.Timestamp | str) -> str:
    nilai = pd.Timestamp(tanggal)
    iso = nilai.isocalendar()
    return f"{iso.year:04d}-W{iso.week:02d}"


def rentang_tanggal(frame: pd.DataFrame, kolom: str = "tanggal") -> dict[str, str | None]:
    if frame.empty or kolom not in frame or frame[kolom].dropna().empty:
        return {"mulai": None, "akhir": None}
    nilai = pd.to_datetime(frame[kolom], errors="coerce").dropna()
    if nilai.empty:
        return {"mulai": None, "akhir": None}
    return {
        "mulai": nilai.min().date().isoformat(),
        "akhir": nilai.max().date().isoformat(),
    }
