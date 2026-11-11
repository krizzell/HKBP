"""ETL data warehouse HKBP.

MongoDB (dokumen bersarang) atau berkas JSON  ->  SQLite skema bintang.

Tahapan (Extract -> Assess -> Clean -> Load -> Assess ulang):
  1. extract : meratakan hierarki Pusat > Distrik > Resort > Huria menjadi tabel datar
  2. assess  : laporan kualitas data SEBELUM pembersihan
               (completeness, validity, consistency, uniqueness)
  3. clean   : standarisasi teks, buang duplikat, buang baris tidak valid
  4. load    : isi dimensi + fakta (etl/schema.sql)
  5. assess  : laporan kualitas data SESUDAH pembersihan

Dapat dijalankan ulang kapan saja (idempotent: tabel dibangun ulang).

Contoh:
  python -m etl.build_warehouse --source json --json-path ../backend/wilayah.json
  python -m etl.build_warehouse --source mongo
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = Path(__file__).with_name("schema.sql")
DEFAULT_DB = ROOT / "data" / "warehouse.db"
DEFAULT_REPORT = ROOT / "docs" / "DATA_QUALITY_REPORT.md"

NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli",
              "Agustus", "September", "Oktober", "November", "Desember"]
NAMA_HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
KETERANGAN_PELEAN = {
    "1a": "Pelean 1a (Pusat)", "1b": "Pelean 1b (Pusat)",
    "2a": "Pelean 2a (Huria)", "2b": "Pelean 2b (Pendidikan)",
}


# ---------------------------------------------------------------- helpers
def _aktif(value) -> bool:
    """Sama dengan app.data.loader._aktif: nilai di bawah dianggap nonaktif."""
    return value not in (False, 0, "0", "false", "False", "inactive")


def _list(value) -> list:
    return value if isinstance(value, list) else []


def _txt(value) -> str:
    return re.sub(r"\s+", " ", str(value)).strip() if value not in (None, "") else ""


def _num(value):
    """Angka bulat atau None bila kosong / tidak dapat dibaca."""
    if value is None or value == "":
        return None
    try:
        return int(round(float(value)))
    except (TypeError, ValueError):
        return None


def kategori_kanonik(nama: str) -> str:
    """Standarisasi nama kategori (selaras dengan filter kategori backend/frontend)."""
    low = (nama or "").casefold()
    if "pelean minggu" in low or "ia, ib" in low:
        return "Pelean Minggu"
    if "guguan" in low or "iuran" in low:
        return "Iuran Taon (Guguan)"
    if "hamuliateon" in low or "syukur" in low:
        return "Hamuliateon (Ucapan Syukur)"
    if "gotilon" in low or "panen" in low:
        return "Pesta Gotilon"
    if "lunggu" in low or "partangiangan" in low or "lingkungan" in low:
        return "Pelean Lunggu"
    if "ulaon na badia" in low or "perjamuan" in low:
        return "Ulaon Na Badia"
    if "pamasumasuon" in low or "pernikahan" in low:
        return "Pamasumasuon (Pernikahan)"
    if "tardidi" in low or "baptis" in low:
        return "Pelean Tardidi"
    return nama or "Tidak diketahui"


def bahasa_sesi(nama: str) -> str:
    low = (nama or "").casefold()
    if "batak" in low and "indonesia" in low:
        return "Indonesia/Batak"
    if "batak" in low:
        return "Batak"
    if "indonesia" in low:
        return "Indonesia"
    return "Lainnya"


# ---------------------------------------------------------------- extract
def load_documents(source: str, json_path: Path | None, mongo_uri: str | None,
                   mongo_db: str | None, collection: str = "HKBP") -> list[dict]:
    if source == "json":
        path = json_path or ROOT.parent / "backend" / "wilayah.json"
        with open(path, encoding="utf-8-sig") as handle:
            data = json.load(handle)
        return data if isinstance(data, list) else [data]
    if source == "mongo":
        from pymongo import MongoClient  # impor lambat agar mode json tanpa Mongo

        from app.config import get_settings

        settings = get_settings()
        client = MongoClient(mongo_uri or settings["mongo_uri"], serverSelectionTimeoutMS=8000)
        return list(client[mongo_db or settings["mongo_db"]][collection].find({}))
    raise ValueError("source harus 'json' atau 'mongo'")


def extract(documents: list[dict]) -> dict[str, pd.DataFrame]:
    """Ratakan dokumen bersarang -> dict DataFrame mentah (belum dibersihkan)."""
    huria, kategori, sesi, pelean, pemasukan, alokasi, setoran, rincian = ([] for _ in range(8))
    for doc in documents:
        for distrik in _list((doc.get("Pusat") or {}).get("Distrik")):
            if not _aktif(distrik.get("Aktif", True)):
                continue
            for resort in _list(distrik.get("Resort")):
                if not _aktif(resort.get("Aktif", True)):
                    continue
                for h in _list(resort.get("Huria")):
                    if not _aktif(h.get("Aktif", True)):
                        continue
                    id_huria = h.get("IdHuria")
                    huria.append({
                        "id_distrik": distrik.get("IdDistrik"), "kode_distrik": distrik.get("KodeDistrik"),
                        "nama_distrik": distrik.get("NamaDistrik"), "nama_praeses": distrik.get("NamaPraeses"),
                        "id_resort": resort.get("IdResort"), "kode_resort": resort.get("KodeResort"),
                        "nama_resort": resort.get("NamaResort"),
                        "nama_pendeta_resort": resort.get("NamaPendetaResort"),
                        "id_huria": id_huria, "nama_huria": h.get("NamaHuria"),
                        "lokasi": h.get("LokasiHuria"), "tahun_berdiri": h.get("TahunBerdiri"),
                        "nama_pendeta": h.get("NamaPendetaPimpinan"),
                        "jumlah_jemaat": h.get("JumlahJemaat"), "kepala_keluarga": h.get("KepalaKeluarga"),
                    })
                    for k in _list(h.get("KategoriPemasukan")):
                        kategori.append({"id_huria": id_huria, "id_kategori": k.get("IdKategori"),
                                         "nama_kategori": k.get("NamaKategori")})
                    for s in _list(h.get("SesiIbadah")):
                        sesi.append({"id_huria": id_huria, "id_sesi": s.get("IdSesi"),
                                     "nama_sesi": s.get("NamaSesi"), "tanggal": s.get("Tanggal"),
                                     "jam_mulai": s.get("JamMulai"), "jumlah_hadir": s.get("JumlahHadir")})
                        for p in _list(s.get("Pelean")):
                            pelean.append({"id_huria": id_huria, "id_sesi": s.get("IdSesi"),
                                           "tanggal": s.get("Tanggal"), "jenis": p.get("Jenis"),
                                           "nominal": p.get("Nominal")})
                    for p in _list(h.get("PemasukanJemaat")):
                        pemasukan.append({"id_huria": id_huria, "id_transaksi": p.get("IdTransaksi"),
                                          "tanggal": p.get("Tanggal"), "nominal": p.get("Nominal"),
                                          "id_kategori": p.get("IdKategori"), "keterangan": p.get("Keterangan")})
                    for a in _list(h.get("AlokasiTransaksi")):
                        alokasi.append({"id_huria": id_huria, "id_alokasi": a.get("IdAlokasi"),
                                        "id_transaksi": a.get("IdTransaksi"),
                                        "peruntukan": a.get("Peruntukan"), "nominal": a.get("Nominal")})
                    for s in _list(h.get("SetoranPusat")):
                        setoran.append({"id_huria": id_huria, "id_setoran": s.get("IdSetoran"),
                                        "periode": s.get("Periode"), "tanggal_setor": s.get("TanggalSetor"),
                                        "total_setoran": s.get("TotalSetoran")})
                    for r in _list(h.get("RincianSetoranPusat")):
                        rincian.append({"id_huria": id_huria, "id_rincian": r.get("IdRincian"),
                                        "id_setoran": r.get("IdSetoran"), "id_alokasi": r.get("IdAlokasi"),
                                        "nominal_dilunasi": r.get("NominalDilunasi")})
    return {
        "huria": pd.DataFrame(huria), "kategori": pd.DataFrame(kategori), "sesi": pd.DataFrame(sesi),
        "pelean": pd.DataFrame(pelean), "pemasukan": pd.DataFrame(pemasukan),
        "alokasi": pd.DataFrame(alokasi), "setoran": pd.DataFrame(setoran),
        "rincian": pd.DataFrame(rincian),
    }


# ---------------------------------------------------------------- data quality
REQUIRED = {
    "huria": ["id_huria", "nama_huria", "nama_resort", "nama_distrik", "jumlah_jemaat"],
    "kategori": ["id_huria", "id_kategori", "nama_kategori"],
    "sesi": ["id_sesi", "nama_sesi", "tanggal", "jumlah_hadir"],
    "pelean": ["id_sesi", "jenis", "nominal"],
    "pemasukan": ["id_transaksi", "tanggal", "nominal", "id_kategori"],
    "alokasi": ["id_alokasi", "id_transaksi", "peruntukan", "nominal"],
    "setoran": ["id_setoran", "tanggal_setor", "total_setoran"],
    "rincian": ["id_rincian", "id_setoran", "id_alokasi", "nominal_dilunasi"],
}
KEY = {"huria": ["id_huria"], "kategori": ["id_huria", "id_kategori"], "sesi": ["id_huria", "id_sesi"],
       "pelean": ["id_huria", "id_sesi", "jenis"], "pemasukan": ["id_huria", "id_transaksi"],
       "alokasi": ["id_huria", "id_alokasi"], "setoran": ["id_huria", "id_setoran"],
       "rincian": ["id_huria", "id_rincian"]}
DATE_COLS = {"sesi": "tanggal", "pemasukan": "tanggal", "setoran": "tanggal_setor"}
NONNEG = {"sesi": ["jumlah_hadir"], "pelean": ["nominal"], "pemasukan": ["nominal"],
          "alokasi": ["nominal"], "setoran": ["total_setoran"], "rincian": ["nominal_dilunasi"]}


def _row(tahap, tabel, dimensi, metrik, masalah, total):
    nilai = 100.0 if total == 0 else round(100.0 * (total - masalah) / total, 2)
    return {"tahap": tahap, "tabel": tabel, "dimensi": dimensi, "metrik": metrik,
            "nilai": nilai, "jumlah_baris": int(total), "jumlah_masalah": int(masalah)}


def assess(tables: dict[str, pd.DataFrame], tahap: str) -> list[dict]:
    """Hitung 4 dimensi kualitas data untuk seluruh tabel."""
    out: list[dict] = []
    for name, frame in tables.items():
        total = len(frame)
        if total == 0:
            continue
        # 1. Completeness: sel wajib terisi
        for col in REQUIRED.get(name, []):
            if col in frame:
                empty = frame[col].isna() | (frame[col].astype(str).str.strip() == "")
                out.append(_row(tahap, name, "completeness", f"{col} terisi", int(empty.sum()), total))
        # 2. Validity: tanggal terbaca & nominal tidak negatif
        if name in DATE_COLS and DATE_COLS[name] in frame:
            parsed = pd.to_datetime(frame[DATE_COLS[name]], errors="coerce", format="%Y-%m-%d")
            out.append(_row(tahap, name, "validity", f"{DATE_COLS[name]} format YYYY-MM-DD",
                            int(parsed.isna().sum()), total))
        for col in NONNEG.get(name, []):
            if col in frame:
                values = pd.to_numeric(frame[col], errors="coerce")
                out.append(_row(tahap, name, "validity", f"{col} numerik >= 0",
                                int((values.isna() | (values < 0)).sum()), total))
        # 4. Uniqueness: kunci unik
        keys = [k for k in KEY[name] if k in frame]
        if keys:
            out.append(_row(tahap, name, "uniqueness", "kunci unik (" + ", ".join(keys) + ")",
                            int(frame.duplicated(keys).sum()), total))
    # 3. Consistency: aturan lintas tabel
    p, a, s, r = (tables.get(k, pd.DataFrame()) for k in ("pemasukan", "alokasi", "setoran", "rincian"))
    if not p.empty and not a.empty:
        alloc = a.assign(nominal=pd.to_numeric(a["nominal"], errors="coerce")).groupby(
            ["id_huria", "id_transaksi"])["nominal"].sum()
        nominal = p.assign(nominal=pd.to_numeric(p["nominal"], errors="coerce")).set_index(
            ["id_huria", "id_transaksi"])["nominal"]
        nominal = nominal[~nominal.index.duplicated()]
        joined = pd.concat([nominal.rename("trx"), alloc.rename("alok")], axis=1)
        bad = int(((joined["trx"].fillna(-1) != joined["alok"].fillna(-1)) & joined["trx"].notna()).sum())
        out.append(_row(tahap, "pemasukan", "consistency", "total alokasi = nominal transaksi", bad, len(nominal)))
    if not s.empty and not r.empty:
        det = r.assign(v=pd.to_numeric(r["nominal_dilunasi"], errors="coerce")).groupby(
            ["id_huria", "id_setoran"])["v"].sum()
        tot = s.assign(v=pd.to_numeric(s["total_setoran"], errors="coerce")).set_index(
            ["id_huria", "id_setoran"])["v"]
        tot = tot[~tot.index.duplicated()]
        joined = pd.concat([tot.rename("tot"), det.rename("det")], axis=1)
        bad = int((joined["tot"].notna() & (joined["tot"] != joined["det"].fillna(0))).sum())
        out.append(_row(tahap, "setoran", "consistency", "total setoran = jumlah rincian", bad, len(tot)))
    if not a.empty and not p.empty:
        known = set(zip(p["id_huria"], p["id_transaksi"]))
        orphan = sum(1 for key in zip(a["id_huria"], a["id_transaksi"]) if key not in known)
        out.append(_row(tahap, "alokasi", "consistency", "alokasi menunjuk transaksi yang ada", orphan, len(a)))
    sesi, pel = tables.get("sesi", pd.DataFrame()), tables.get("pelean", pd.DataFrame())
    if not sesi.empty and not pel.empty:
        known = set(zip(sesi["id_huria"], sesi["id_sesi"]))
        orphan = sum(1 for key in zip(pel["id_huria"], pel["id_sesi"]) if key not in known)
        out.append(_row(tahap, "pelean", "consistency", "pelean menunjuk sesi yang ada", orphan, len(pel)))
    return out


# ---------------------------------------------------------------- clean
def clean(raw: dict[str, pd.DataFrame]) -> tuple[dict[str, pd.DataFrame], dict[str, int]]:
    """Bersihkan data & catat jumlah perbaikan."""
    log: dict[str, int] = {}
    tables = {k: v.copy() for k, v in raw.items()}

    for name, frame in tables.items():
        if frame.empty:
            continue
        for col in frame.columns:
            if frame[col].dtype == object or str(frame[col].dtype).startswith("str"):
                before = frame[col].map(lambda x: x if isinstance(x, str) else None)
                frame[col] = frame[col].map(lambda x: _txt(x) if isinstance(x, str) else x)
                changed = int((before.notna() & (before != frame[col])).sum())
                if changed:
                    log[f"{name}.{col}: rapikan spasi/teks"] = changed
        tables[name] = frame

    # tipe numerik
    for name, cols in {**NONNEG, "huria": ["jumlah_jemaat", "tahun_berdiri"]}.items():
        frame = tables[name]
        for col in cols:
            if col in frame:
                frame[col] = frame[col].map(_num)

    # tanggal valid
    for name, col in DATE_COLS.items():
        frame = tables[name]
        if frame.empty:
            continue
        parsed = pd.to_datetime(frame[col], errors="coerce", format="%Y-%m-%d")
        bad = int(parsed.isna().sum())
        if bad:
            log[f"{name}: buang tanggal tidak valid"] = bad
        frame = frame[parsed.notna()].copy()
        frame[col] = parsed[parsed.notna()].dt.strftime("%Y-%m-%d")
        tables[name] = frame

    # nominal negatif / kosong pada fakta
    for name, cols in NONNEG.items():
        frame = tables[name]
        for col in cols:
            if col not in frame:
                continue
            bad = frame[col].isna() | (frame[col] < 0)
            if bad.any():
                log[f"{name}.{col}: buang kosong/negatif"] = int(bad.sum())
            frame = frame[~bad]
        tables[name] = frame

    # duplikat kunci (pertahankan kemunculan terakhir)
    for name, keys in KEY.items():
        frame = tables[name]
        if frame.empty:
            continue
        dup = int(frame.duplicated(keys).sum())
        if dup:
            log[f"{name}: buang duplikat kunci"] = dup
        tables[name] = frame.drop_duplicates(keys, keep="last").reset_index(drop=True)

    # integritas referensial
    sesi_keys = set(zip(tables["sesi"]["id_huria"], tables["sesi"]["id_sesi"])) if not tables["sesi"].empty else set()
    pel = tables["pelean"]
    if not pel.empty:
        ok = [key in sesi_keys for key in zip(pel["id_huria"], pel["id_sesi"])]
        if not all(ok):
            log["pelean: buang yatim (tanpa sesi)"] = int(len(ok) - sum(ok))
        tables["pelean"] = pel[ok].reset_index(drop=True)
    trx_keys = set(zip(tables["pemasukan"]["id_huria"], tables["pemasukan"]["id_transaksi"])) \
        if not tables["pemasukan"].empty else set()
    alok = tables["alokasi"]
    if not alok.empty:
        ok = [key in trx_keys for key in zip(alok["id_huria"], alok["id_transaksi"])]
        if not all(ok):
            log["alokasi: buang yatim (tanpa transaksi)"] = int(len(ok) - sum(ok))
        tables["alokasi"] = alok[ok].reset_index(drop=True)
    return tables, log


# ---------------------------------------------------------------- load
def _waktu_row(ts: pd.Timestamp) -> tuple:
    iso = ts.isocalendar()
    return (int(ts.strftime("%Y%m%d")), ts.strftime("%Y-%m-%d"), ts.year, (ts.month - 1) // 3 + 1,
            ts.month, NAMA_BULAN[ts.month - 1], ts.strftime("%Y-%m"), f"{iso.year:04d}-W{iso.week:02d}",
            ts.isoweekday(), NAMA_HARI[ts.isoweekday() - 1], int(ts.isoweekday() == 7))


def _wkey(value) -> int:
    return int(pd.Timestamp(value).strftime("%Y%m%d"))


def load(conn: sqlite3.Connection, t: dict[str, pd.DataFrame]) -> dict[str, int]:
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    cur = conn.cursor()

    # ---- dim_waktu: kalender penuh dari tanggal minimum sampai maksimum
    dates = pd.concat([pd.to_datetime(t["sesi"]["tanggal"]), pd.to_datetime(t["pemasukan"]["tanggal"]),
                       pd.to_datetime(t["setoran"]["tanggal_setor"])]).dropna()
    for ts in pd.date_range(dates.min(), dates.max(), freq="D"):
        cur.execute("INSERT INTO dim_waktu VALUES (?,?,?,?,?,?,?,?,?,?,?)", _waktu_row(ts))

    # ---- dim wilayah
    huria = t["huria"].drop_duplicates("id_huria")
    distrik_key: dict[str, int] = {}
    resort_key: dict[tuple, int] = {}
    huria_key: dict[str, int] = {}
    for _, r in huria.iterrows():
        nd = r["nama_distrik"]
        if nd not in distrik_key:
            cur.execute("INSERT INTO dim_distrik(id_distrik,kode_distrik,nama_distrik,nama_praeses) VALUES (?,?,?,?)",
                        (r["id_distrik"], r["kode_distrik"], nd, r["nama_praeses"]))
            distrik_key[nd] = cur.lastrowid
        rk = (nd, r["nama_resort"])
        if rk not in resort_key:
            cur.execute("INSERT INTO dim_resort(distrik_key,id_resort,kode_resort,nama_resort,nama_pendeta_resort) "
                        "VALUES (?,?,?,?,?)", (distrik_key[nd], r["id_resort"], r["kode_resort"],
                                               r["nama_resort"], r["nama_pendeta_resort"]))
            resort_key[rk] = cur.lastrowid
        kk = _num(re.sub(r"\D", "", str(r["kepala_keluarga"] or "")) or None)
        cur.execute("INSERT INTO dim_huria(resort_key,id_huria,nama_huria,lokasi,tahun_berdiri,nama_pendeta,"
                    "jumlah_jemaat,jumlah_kk) VALUES (?,?,?,?,?,?,?,?)",
                    (resort_key[rk], r["id_huria"], r["nama_huria"], r["lokasi"], _num(r["tahun_berdiri"]),
                     r["nama_pendeta"], _num(r["jumlah_jemaat"]), kk))
        huria_key[r["id_huria"]] = cur.lastrowid

    # ---- dimensi kecil
    kat_raw = t["kategori"].drop_duplicates(["id_huria", "id_kategori"])
    kat_name = {(r["id_huria"], r["id_kategori"]): r["nama_kategori"] for _, r in kat_raw.iterrows()}
    kategori_key: dict[str, int] = {}
    for nama in sorted(set(kat_name.values())):
        cur.execute("INSERT INTO dim_kategori(nama_kategori_raw,kategori_kanonik) VALUES (?,?)",
                    (nama, kategori_kanonik(nama)))
        kategori_key[nama] = cur.lastrowid
    jenis_key: dict[str, int] = {}
    for kode in sorted(set(t["pelean"]["jenis"].dropna())):
        cur.execute("INSERT INTO dim_jenis_pelean(kode_jenis,keterangan) VALUES (?,?)",
                    (kode, KETERANGAN_PELEAN.get(kode, f"Pelean {kode}")))
        jenis_key[kode] = cur.lastrowid
    sesi_key: dict[str, int] = {}
    for nama, grp in t["sesi"].groupby("nama_sesi"):
        cur.execute("INSERT INTO dim_sesi(nama_sesi,jam_mulai,bahasa) VALUES (?,?,?)",
                    (nama, grp["jam_mulai"].dropna().iloc[0] if grp["jam_mulai"].notna().any() else None,
                     bahasa_sesi(nama)))
        sesi_key[nama] = cur.lastrowid
    peruntukan_key: dict[str, int] = {}
    for nama in sorted(set(t["alokasi"]["peruntukan"].dropna())):
        cur.execute("INSERT INTO dim_peruntukan(nama_peruntukan,is_setoran_pusat) VALUES (?,?)",
                    (nama, int(nama.casefold() == "setoran pusat")))
        peruntukan_key[nama] = cur.lastrowid

    # ---- fakta kehadiran + pelean
    pel_total = t["pelean"].groupby(["id_huria", "id_sesi"])["nominal"].sum().to_dict()
    sesi_waktu: dict[tuple, int] = {}
    for _, r in t["sesi"].iterrows():
        if r["id_huria"] not in huria_key:
            continue
        wk = _wkey(r["tanggal"])
        sesi_waktu[(r["id_huria"], r["id_sesi"])] = wk
        cur.execute("INSERT INTO fact_kehadiran VALUES (?,?,?,?,?,?)",
                    (r["id_sesi"], wk, huria_key[r["id_huria"]], sesi_key[r["nama_sesi"]],
                     int(r["jumlah_hadir"]), int(pel_total.get((r["id_huria"], r["id_sesi"]), 0))))
    for _, r in t["pelean"].iterrows():
        wk = sesi_waktu.get((r["id_huria"], r["id_sesi"]))
        if wk is None:
            continue
        cur.execute("INSERT INTO fact_pelean(id_sesi,waktu_key,huria_key,jenis_key,nominal) VALUES (?,?,?,?,?)",
                    (r["id_sesi"], wk, huria_key[r["id_huria"]], jenis_key[r["jenis"]], int(r["nominal"])))

    # ---- fakta pemasukan + alokasi
    alok = t["alokasi"].copy()
    alok["pusat"] = alok["peruntukan"].fillna("").str.casefold().eq("setoran pusat")
    pusat_sum = alok[alok["pusat"]].groupby(["id_huria", "id_transaksi"])["nominal"].sum().to_dict()
    huria_sum = alok[~alok["pusat"]].groupby(["id_huria", "id_transaksi"])["nominal"].sum().to_dict()
    trx_waktu: dict[tuple, int] = {}
    for _, r in t["pemasukan"].iterrows():
        if r["id_huria"] not in huria_key:
            continue
        nama_kat = kat_name.get((r["id_huria"], r["id_kategori"]))
        if nama_kat is None:
            continue
        key = (r["id_huria"], r["id_transaksi"])
        wk = _wkey(r["tanggal"])
        trx_waktu[key] = wk
        cur.execute("INSERT INTO fact_pemasukan VALUES (?,?,?,?,?,?,?,?)",
                    (r["id_transaksi"], wk, huria_key[r["id_huria"]], kategori_key[nama_kat], int(r["nominal"]),
                     int(pusat_sum.get(key, 0)), int(huria_sum.get(key, 0)), r["keterangan"]))
    dilunasi = t["rincian"].groupby(["id_huria", "id_alokasi"])["nominal_dilunasi"].sum().to_dict()
    for _, r in alok.iterrows():
        wk = trx_waktu.get((r["id_huria"], r["id_transaksi"]))
        if wk is None:
            continue
        cur.execute("INSERT INTO fact_alokasi VALUES (?,?,?,?,?,?,?)",
                    (r["id_alokasi"], r["id_transaksi"], wk, huria_key[r["id_huria"]],
                     peruntukan_key[r["peruntukan"]], int(r["nominal"]),
                     int(dilunasi.get((r["id_huria"], r["id_alokasi"]), 0))))

    # ---- fakta setoran
    rincian_sum = t["rincian"].groupby(["id_huria", "id_setoran"])["nominal_dilunasi"].sum().to_dict()
    for _, r in t["setoran"].iterrows():
        if r["id_huria"] not in huria_key:
            continue
        cur.execute("INSERT INTO fact_setoran VALUES (?,?,?,?,?,?)",
                    (r["id_setoran"], _wkey(r["tanggal_setor"]), huria_key[r["id_huria"]], r["periode"],
                     int(r["total_setoran"]), int(rincian_sum.get((r["id_huria"], r["id_setoran"]), 0))))
    conn.commit()

    counts = {}
    for table in ("dim_waktu", "dim_distrik", "dim_resort", "dim_huria", "dim_kategori", "dim_jenis_pelean",
                  "dim_sesi", "dim_peruntukan", "fact_kehadiran", "fact_pelean", "fact_pemasukan",
                  "fact_alokasi", "fact_setoran"):
        counts[table] = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    return counts


# ---------------------------------------------------------------- report
def write_report(path: Path, rows: list[dict], counts: dict[str, int], log: dict[str, int],
                 sumber: str, jumlah_huria_data: int, jumlah_huria: int) -> None:
    before = {(r["tabel"], r["dimensi"], r["metrik"]): r for r in rows if r["tahap"] == "sebelum"}
    after = {(r["tabel"], r["dimensi"], r["metrik"]): r for r in rows if r["tahap"] == "sesudah"}
    lines = [
        "# Laporan Kualitas Data & Hasil ETL",
        "",
        f"- Dibuat otomatis oleh `etl/build_warehouse.py` pada {datetime.now(timezone.utc):%Y-%m-%d %H:%M} UTC",
        f"- Sumber data: **{sumber}**",
        f"- Huria terdaftar: **{jumlah_huria}**, Huria yang memiliki data operasional: **{jumlah_huria_data}**",
        "",
        "## 1. Jumlah baris di warehouse",
        "",
        "| Tabel | Jumlah baris |", "|---|---:|",
        *[f"| `{k}` | {v:,} |".replace(",", ".") for k, v in counts.items()],
        "",
        "## 2. Kualitas data sebelum vs sesudah pembersihan",
        "",
        "Nilai = persen baris yang lolos aturan (100% = tidak ada masalah).",
        "",
        "| Tabel | Dimensi | Aturan | Sebelum | Sesudah | Masalah (sebelum) |",
        "|---|---|---|---:|---:|---:|",
    ]
    for key, b in before.items():
        a = after.get(key)
        lines.append(f"| {key[0]} | {key[1]} | {key[2]} | {b['nilai']:.2f}% | "
                     f"{(a['nilai'] if a else 100.0):.2f}% | {b['jumlah_masalah']} |")
    lines += ["", "## 3. Perbaikan yang dilakukan ETL", ""]
    if log:
        lines += ["| Tindakan | Jumlah |", "|---|---:|", *[f"| {k} | {v} |" for k, v in log.items()]]
    else:
        lines.append("Tidak ada baris yang perlu dibuang atau diperbaiki pada sumber ini.")
    lines += [
        "",
        "## 4. Catatan penting",
        "",
        f"- {jumlah_huria - jumlah_huria_data} dari {jumlah_huria} Huria belum memiliki data operasional "
        "(sesi ibadah, pemasukan, setoran). Huria tersebut tetap ada di `dim_huria` namun tidak punya fakta.",
        "- Aturan *consistency* mengikuti aturan bisnis keuangan HKBP: total alokasi harus sama dengan nominal "
        "transaksi, dan total setoran harus sama dengan jumlah rincian pelunasan.",
        "",
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


# ---------------------------------------------------------------- main
def run(source: str = "json", json_path: Path | None = None, db_path: Path = DEFAULT_DB,
        report_path: Path | None = DEFAULT_REPORT, mongo_uri: str | None = None,
        mongo_db: str | None = None) -> dict:
    documents = load_documents(source, json_path, mongo_uri, mongo_db)
    raw = extract(documents)
    if raw["huria"].empty:
        raise SystemExit("Sumber data tidak berisi Huria. ETL dibatalkan.")
    dq = assess(raw, "sebelum")
    cleaned, log = clean(raw)
    dq += assess(cleaned, "sesudah")

    db_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = db_path.with_name(db_path.name + ".tmp")
    tmp_path.unlink(missing_ok=True)
    conn = sqlite3.connect(tmp_path)
    try:
        counts = load(conn, cleaned)
        conn.executemany(
            "INSERT INTO dq_report VALUES (:tahap,:tabel,:dimensi,:metrik,:nilai,:jumlah_baris,:jumlah_masalah)", dq)
        conn.execute("INSERT INTO etl_run VALUES (?,?,?)",
                     (datetime.now(timezone.utc).isoformat(timespec="seconds"), source, json.dumps(counts)))
        conn.commit()
    finally:
        conn.close()
    os.replace(tmp_path, db_path)  # atomik: dashboard/model tidak pernah membaca DB setengah jadi

    jumlah_data = int(cleaned["sesi"]["id_huria"].nunique()) if not cleaned["sesi"].empty else 0
    if report_path:
        write_report(report_path, dq, counts, log, f"{source} ({json_path or 'MongoDB'})",
                     jumlah_data, int(cleaned["huria"]["id_huria"].nunique()))
    return {"counts": counts, "perbaikan": log, "dq_rows": len(dq)}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="ETL data warehouse HKBP")
    parser.add_argument("--source", choices=["json", "mongo"], default="json")
    parser.add_argument("--json-path", type=Path, default=None)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    args = parser.parse_args(argv)
    result = run(args.source, args.json_path, args.db, args.report)
    print(f"Warehouse dibangun: {args.db}")
    for table, n in result["counts"].items():
        print(f"  {table:<18} {n:>7}")
    print(f"Perbaikan data: {result['perbaikan'] or 'tidak ada'}")
    print(f"Laporan kualitas: {args.report}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
