"""Deteksi penurunan pemasukan antarperiode untuk setiap Huria."""

from __future__ import annotations

import pandas as pd

from app.services.category_match import filter_kategori


_GRANULARITAS = {
    "mingguan": "W-SUN",
    "bulanan": "M",
    "tahunan": "Y",
}


def _label(period: pd.Period, granularitas: str) -> str:
    if granularitas == "mingguan":
        iso = period.start_time.isocalendar()
        return f"{iso.year:04d}-W{iso.week:02d}"
    if granularitas == "bulanan":
        return period.strftime("%Y-%m")
    return period.strftime("%Y")


def deteksi_drop_pemasukan(
    pemasukan: pd.DataFrame,
    huria: pd.DataFrame,
    *,
    granularitas: str = "semua",
    kategori: str | None = None,
    akhir_terpilih: str | None = None,
) -> dict:
    granularitas_valid = ("mingguan", "bulanan", "tahunan")
    if granularitas != "semua" and granularitas not in granularitas_valid:
        raise ValueError("granularitas harus berupa semua, mingguan, bulanan, atau tahunan")

    frame = pemasukan.copy()
    frame = filter_kategori(frame, kategori)
    if "tanggal" not in frame or "nominal" not in frame:
        frame = frame.iloc[0:0]
    else:
        frame["tanggal"] = pd.to_datetime(frame["tanggal"], errors="coerce")
        frame["nominal"] = pd.to_numeric(frame["nominal"], errors="coerce").fillna(0)
        frame = frame.dropna(subset=["tanggal"])

    names = (
        huria.drop_duplicates("idHuria").set_index("idHuria")["namaHuria"].to_dict()
        if not huria.empty
        else {}
    )
    results = {}
    for current_granularitas in granularitas_valid:
        if frame.empty:
            results[current_granularitas] = {
                "status": "data_tidak_cukup",
                "periodeTerbaru": None,
                "periodeSebelumnya": None,
                "jumlahHuriaTurun": 0,
                "jumlahBelumLapor": 0,
                "idHuriaBelumLapor": [],
                "data": [],
            }
            continue

        periods = frame["tanggal"].dt.to_period(_GRANULARITAS[current_granularitas])
        # Gunakan akhir rentang yang dipilih UI, bukan otomatis laporan terakhir.
        # Jika akhir itu belum memiliki laporan, jangan mundur diam-diam ke periode lain.
        if akhir_terpilih:
            latest = pd.Period(pd.Timestamp(akhir_terpilih), freq=_GRANULARITAS[current_granularitas])
        else:
            latest = periods.max()
        previous = latest - 1
        grouped = (
            frame.assign(_periode=periods)
            .groupby(["idHuria", "_periode"], as_index=False)["nominal"]
            .sum()
        )
        current_values = grouped[grouped["_periode"].eq(latest)].set_index("idHuria")["nominal"]
        previous_values = grouped[grouped["_periode"].eq(previous)].set_index("idHuria")["nominal"]
        rows = []
        belum_lapor = []
        for id_huria in sorted(set(current_values.index) | set(previous_values.index)):
            if id_huria not in current_values.index:
                # Tidak ada record bukan berarti pembayaran nol. Jangan buat drop 100%.
                if id_huria in previous_values.index:
                    belum_lapor.append(str(id_huria))
                continue
            if id_huria not in previous_values.index:
                continue
            current = float(current_values[id_huria])
            prior = float(previous_values[id_huria])
            if prior <= 0 or current >= prior:
                continue
            drop = prior - current
            rows.append({
                "idHuria": str(id_huria),
                "namaHuria": names.get(id_huria, ""),
                "pemasukanSekarang": int(round(current)),
                "pemasukanSebelumnya": int(round(prior)),
                "selisih": int(round(drop)),
                "persentaseDrop": round(drop / prior * 100, 2),
            })
        rows.sort(key=lambda row: (-row["persentaseDrop"], -row["selisih"], row["namaHuria"]))
        results[current_granularitas] = {
            "status": "ok" if not current_values.empty and not previous_values.empty else "data_tidak_cukup",
            "periodeTerbaru": _label(latest, current_granularitas),
            "periodeSebelumnya": _label(previous, current_granularitas),
            "jumlahHuriaTurun": len(rows),
            "jumlahBelumLapor": len(belum_lapor),
            "idHuriaBelumLapor": belum_lapor,
            "data": rows,
        }

    return {
        "status": "ok" if not frame.empty else "data_tidak_cukup",
        "kategori": kategori,
        "jumlahHuria": int(huria["idHuria"].nunique()) if "idHuria" in huria else 0,
        "mingguan": results["mingguan"],
        "bulanan": results["bulanan"],
        "tahunan": results["tahunan"],
    }
