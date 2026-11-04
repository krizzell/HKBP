"""Deteksi deterministik ketidaksesuaian setoran dan alokasi."""

from __future__ import annotations

from datetime import datetime

import numpy as np
import pandas as pd


SEVERITY_ORDER = {"tinggi": 0, "sedang": 1, "rendah": 2}


def _number(value) -> int:
    return int(round(float(value or 0)))


def _date(value):
    parsed = pd.to_datetime(value, errors="coerce")
    return None if pd.isna(parsed) else parsed.date().isoformat()


def _finding(code, severity, row, summary, evidence, period=None):
    return {
        "kode": code,
        "keparahan": severity,
        "idHuria": str(row.get("idHuria", "")),
        "namaHuria": row.get("namaHuria", ""),
        "periode": period or _date(row.get("tanggal") or row.get("tanggalSetor")),
        "ringkasan": summary,
        "bukti": evidence,
    }


def _group_sum(frame, keys, value):
    if frame.empty:
        return pd.Series(dtype="float64")
    return frame.groupby(keys, dropna=False)[value].sum()


def _rule_r1(setoran, rincian):
    findings = []
    details = _group_sum(rincian, ["idHuria", "idSetoran"], "nominalDilunasi")
    for _, row in setoran.iterrows():
        expected = _number(row.get("totalSetoran"))
        actual = _number(details.get((row["idHuria"], row["idSetoran"]), 0))
        if expected != actual:
            findings.append(_finding(
                "R1", "tinggi", row,
                "Total setoran tidak sama dengan jumlah rincian yang dilunasi.",
                {"totalSetoran": expected, "totalRincian": actual},
                _date(row.get("tanggalSetor")),
            ))
    return findings


def _rule_r2(alokasi, rincian):
    findings = []
    paid = _group_sum(rincian, ["idHuria", "idAlokasi"], "nominalDilunasi")
    for _, row in alokasi.iterrows():
        allocated = _number(row.get("nominal"))
        settled = _number(paid.get((row["idHuria"], row["idAlokasi"]), 0))
        if settled > allocated:
            findings.append(_finding(
                "R2", "tinggi", row,
                "Nominal pelunasan alokasi melebihi nominal alokasi.",
                {"nominalAlokasi": allocated, "nominalDilunasi": settled},
            ))
    return findings


def _rule_r3(alokasi, pemasukan, rincian, batas_hari):
    findings = []
    paid = _group_sum(rincian, ["idHuria", "idAlokasi"], "nominalDilunasi")
    transaction_dates = pemasukan.set_index(["idHuria", "idTransaksi"])["tanggal"].to_dict() if not pemasukan.empty else {}
    today = pd.Timestamp.now().normalize()
    for _, row in alokasi.iterrows():
        if str(row.get("peruntukan", "")).casefold() != "setoran pusat":
            continue
        key = (row["idHuria"], row["idAlokasi"])
        remaining = _number(row.get("nominal")) - _number(paid.get(key, 0))
        if remaining <= 0:
            continue
        transaction_date = transaction_dates.get((row["idHuria"], row["idTransaksi"]))
        if pd.isna(transaction_date) if transaction_date is not None else True:
            continue
        days = max(0, (today - pd.Timestamp(transaction_date).normalize()).days)
        if days > batas_hari:
            severity = "tinggi" if days > batas_hari * 2 else "sedang"
            findings.append(_finding(
                "R3", severity, row,
                "Alokasi Setoran Pusat belum dilunasi melewati batas waktu.",
                {"hariTunggakan": days, "batasHariTunggakan": batas_hari, "nominal": _number(row.get("nominal")), "sisaKewajiban": remaining},
                _date(transaction_date),
            ))
    return findings


def _rule_r4(alokasi, setoran, rincian):
    findings = []
    allocation_ids = set(zip(alokasi["idHuria"], alokasi["idAlokasi"])) if not alokasi.empty else set()
    setoran_ids = set(zip(setoran["idHuria"], setoran["idSetoran"])) if not setoran.empty else set()
    for _, row in rincian.iterrows():
        if (row["idHuria"], row["idAlokasi"]) not in allocation_ids:
            findings.append(_finding("R4", "tinggi", row, "Rincian menunjuk alokasi yang tidak ada.", {"idAlokasi": row["idAlokasi"]}))
        if (row["idHuria"], row["idSetoran"]) not in setoran_ids:
            findings.append(_finding("R4", "tinggi", row, "Rincian menunjuk setoran yang tidak ada.", {"idSetoran": row["idSetoran"]}))
    return findings


def _rule_r5(alokasi, pemasukan):
    findings = []
    totals = _group_sum(alokasi, ["idHuria", "idTransaksi"], "nominal")
    transactions = pemasukan.set_index(["idHuria", "idTransaksi"]) if not pemasukan.empty else pd.DataFrame()
    for key, total in totals.items():
        if key not in transactions.index:
            continue
        row = transactions.loc[key]
        nominal = _number(row["nominal"])
        allocated = _number(total)
        if nominal != allocated:
            findings.append(_finding("R5", "tinggi", row, "Jumlah alokasi tidak sama dengan nominal transaksi.", {
                "nominalTransaksi": nominal, "totalAlokasi": allocated,
            }, _date(row["tanggal"])))
    return findings


def _rule_r6(pelean, pemasukan):
    findings = []
    if pelean.empty or pemasukan.empty:
        return findings
    pelean_total = pelean.assign(tanggal=pelean["tanggal"].dt.date).groupby(["idHuria", "tanggal"])["nominal"].sum()
    minggu = pemasukan["namaKategori"].fillna("").str.casefold().str.contains("pelean minggu")
    pemasukan_total = pemasukan[minggu].assign(tanggal=pemasukan.loc[minggu, "tanggal"].dt.date).groupby(["idHuria", "tanggal"])["nominal"].sum()
    for key in set(pelean_total.index) | set(pemasukan_total.index):
        left = _number(pelean_total.get(key, 0))
        right = _number(pemasukan_total.get(key, 0))
        if left != right:
            row = pemasukan[pemasukan["idHuria"].eq(key[0])].iloc[0] if not pemasukan[pemasukan["idHuria"].eq(key[0])].empty else {"idHuria": key[0]}
            findings.append(_finding("R6", "sedang", row, "Total pelean harian tidak sama dengan transaksi Pelean Minggu.", {
                "totalPelean": left, "nominalTransaksi": right,
            }, str(key[1])))
    return findings


def _rule_s1(alokasi, pemasukan, huria, ambang_z):
    if alokasi.empty or pemasukan.empty:
        return [], ["S1 dilewati karena data alokasi atau pemasukan kosong."]
    pusat = alokasi[alokasi["peruntukan"].fillna("").str.casefold().eq("setoran pusat")].copy()
    if pusat.empty:
        return [], ["S1 dilewati karena tidak ada alokasi Setoran Pusat."]
    # Rasio bulanan memakai tanggal transaksi yang dicari berdasarkan IdTransaksi.
    dates = pemasukan.set_index(["idHuria", "idTransaksi"])["tanggal"].to_dict()
    pusat["bulan"] = [pd.Timestamp(dates.get((r.idHuria, r.idTransaksi))).to_period("M") if dates.get((r.idHuria, r.idTransaksi)) is not None else pd.NaT for r in pusat.itertuples()]
    paid = _group_sum(pusat, ["idHuria", "bulan"], "nominal")
    # Gunakan total pemasukan sebagai denominator untuk rasio setoran/alokasi.
    revenue = pemasukan.assign(bulan=pemasukan["tanggal"].dt.to_period("M")).groupby(["idHuria", "bulan"])["nominal"].sum()
    ratios = (paid / revenue.replace(0, np.nan)).dropna()
    if ratios.empty:
        return [], ["S1 dilewati karena rasio tidak dapat dihitung."]
    findings, notes = [], []
    names = huria.set_index("idHuria")["namaHuria"].to_dict() if not huria.empty else {}
    for (id_huria, month), value in ratios.items():
        peers = ratios[ratios.index.get_level_values("bulan") == month]
        if len(peers) < 8:
            notes.append("S1 dilewati karena pembanding kurang dari 8 Huria.")
            continue
        median = float(peers.median())
        mad = float(np.median(np.abs(peers - median)))
        robust_sd = mad * 1.4826
        # Rasio berbeda hanya karena pembulatan rupiah tidak perlu dianggap anomali.
        tolerance = 0.005  # 0,5 poin persentase
        z = 0 if robust_sd < tolerance or abs(value - median) < tolerance else float((value - median) / robust_sd)
        if abs(z) >= ambang_z:
            findings.append({
                "kode": "S1", "keparahan": "sedang", "idHuria": id_huria,
                "namaHuria": names.get(id_huria, ""), "periode": str(month),
                "ringkasan": "Rasio setoran terhadap pemasukan berbeda jauh dari Huria pembanding.",
                "bukti": {"rasio": round(float(value), 6), "median": round(median, 6), "mad": round(mad, 6), "z": round(z, 4)},
            })
    return findings, list(dict.fromkeys(notes))


def deteksi_anomali(frames: dict[str, pd.DataFrame], *, batas_hari_tunggakan=45, ambang_z=3.5) -> dict:
    if batas_hari_tunggakan < 1:
        raise ValueError("batasHariTunggakan harus lebih besar dari 0")
    if ambang_z <= 0:
        raise ValueError("ambangZ harus lebih besar dari 0")
    pemasukan = frames["pemasukan"]
    findings = []
    findings.extend(_rule_r1(frames["setoran"], frames["rincian"]))
    findings.extend(_rule_r2(frames["alokasi"], frames["rincian"]))
    findings.extend(_rule_r3(frames["alokasi"], pemasukan, frames["rincian"], batas_hari_tunggakan))
    findings.extend(_rule_r4(frames["alokasi"], frames["setoran"], frames["rincian"]))
    findings.extend(_rule_r5(frames["alokasi"], pemasukan))
    findings.extend(_rule_r6(frames["pelean"], pemasukan))
    s1, notes = _rule_s1(frames["alokasi"], pemasukan, frames["huria"], ambang_z)
    findings.extend(s1)
    findings.sort(key=lambda item: (SEVERITY_ORDER.get(item["keparahan"], 9), item.get("periode") or ""), reverse=False)
    counts_code = {}
    counts_severity = {}
    for finding in findings:
        counts_code[finding["kode"]] = counts_code.get(finding["kode"], 0) + 1
        counts_severity[finding["keparahan"]] = counts_severity.get(finding["keparahan"], 0) + 1
    dates = [item.get("periode") for item in findings if item.get("periode")]
    return {
        "status": "ok",
        "metode": "Aturan deterministik R1-R6 dan z-score robust S1 (median, MAD x 1.4826).",
        "rentangData": {"mulai": min(dates) if dates else None, "akhir": max(dates) if dates else None},
        "jumlahSampel": int(len(pemasukan)),
        "ringkasan": {"perKode": counts_code, "perKeparahan": counts_severity},
        "temuan": findings,
        "catatan": notes,
    }
