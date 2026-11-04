"""Muat dokumen MongoDB bersarang menjadi DataFrame analitik."""

from collections.abc import Iterable, Mapping
import warnings

import pandas as pd

from app.data.periode import minggu_iso
from app.db import get_database

COLLECTION_NAME = "HKBP"
WILAYAH_COLUMNS = ["idHuria", "namaHuria", "namaResort", "namaDistrik"]


def _documents(source=None) -> list[Mapping]:
    if source is None:
        source = get_database()[COLLECTION_NAME].find({})
    if hasattr(source, "find"):
        source = source.find({})
    if isinstance(source, Mapping):
        source = [source]
    return [document for document in source if isinstance(document, Mapping)]


def _list(value) -> list:
    return value if isinstance(value, list) else []


def _int(value) -> int:
    if value is None or value == "":
        return 0
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return 0


def _date(value):
    if value in (None, ""):
        return pd.NaT
    return pd.to_datetime(value, errors="coerce")


def _hurias(source=None) -> list[dict]:
    result = []
    for document in _documents(source):
        pusat = document.get("Pusat", {})
        for distrik in _list(pusat.get("Distrik")):
            nama_distrik = distrik.get("NamaDistrik", "")
            for resort in _list(distrik.get("Resort")):
                nama_resort = resort.get("NamaResort", "")
                for huria in _list(resort.get("Huria")):
                    id_huria = huria.get("IdHuria")
                    if not id_huria:
                        id_huria = "|".join((nama_distrik, nama_resort, huria.get("NamaHuria", "")))
                        warnings.warn(
                            "IdHuria kosong; menggunakan kunci gabungan wilayah",
                            UserWarning,
                            stacklevel=2,
                        )
                    result.append({
                        "_raw": huria,
                        "idHuria": str(id_huria),
                        "namaHuria": huria.get("NamaHuria", ""),
                        "namaResort": nama_resort,
                        "namaDistrik": nama_distrik,
                        "jumlahJemaat": _int(huria.get("JumlahJemaat")),
                    })
    return result


def _validate_filter(id_huria: Iterable[str], mulai=None, akhir=None):
    requested_ids = [str(item) for item in id_huria if item not in (None, "")]
    ids = set(requested_ids)
    if not ids:
        raise ValueError("idHuria wajib diisi")
    if len(requested_ids) > 500:
        raise ValueError("idHuria maksimal 500")
    start = pd.Timestamp(mulai) if mulai else None
    end = pd.Timestamp(akhir) if akhir else None
    if start is not None and pd.isna(start):
        raise ValueError("mulai tidak valid")
    if end is not None and pd.isna(end):
        raise ValueError("akhir tidak valid")
    if start is not None and end is not None and start > end:
        raise ValueError("mulai tidak boleh setelah akhir")
    return ids, start, end


def _selected_hurias(source, id_huria, mulai=None, akhir=None):
    ids, start, end = _validate_filter(id_huria, mulai, akhir)
    return [huria for huria in _hurias(source) if huria["idHuria"] in ids], start, end


def _frame(records: list[dict], columns: list[str] | None = None) -> pd.DataFrame:
    frame = pd.DataFrame(records)
    if columns:
        for column in columns:
            if column not in frame:
                frame[column] = pd.Series(dtype="object")
        frame = frame[columns]
    return frame


def _apply_date_filter(frame: pd.DataFrame, mulai, akhir) -> pd.DataFrame:
    if frame.empty or "tanggal" not in frame:
        return frame
    result = frame
    if mulai is not None:
        result = result[result["tanggal"] >= mulai]
    if akhir is not None:
        result = result[result["tanggal"] <= akhir]
    return result.reset_index(drop=True)


def muat_huria(source=None, id_huria=None, mulai=None, akhir=None) -> pd.DataFrame:
    if id_huria is None:
        raise ValueError("idHuria wajib diisi")
    hurias, _, _ = _selected_hurias(source, id_huria, mulai, akhir)
    return _frame(
        [{key: value for key, value in huria.items() if key != "_raw"} for huria in hurias],
        WILAYAH_COLUMNS + ["jumlahJemaat"],
    )


def _muat_nested(source, id_huria, field, fields, mulai=None, akhir=None, tanggal_kolom="tanggal") -> pd.DataFrame:
    hurias, start, end = _selected_hurias(source, id_huria, mulai, akhir)
    records = []
    for huria in hurias:
        for item in _list(huria["_raw"].get(field)):
            records.append({
                "idHuria": huria["idHuria"],
                "namaHuria": huria["namaHuria"],
                "namaResort": huria["namaResort"],
                "namaDistrik": huria["namaDistrik"],
                **item,
            })
    frame = _frame(records)
    if frame.empty:
        return _frame([], fields)
    frame = frame.rename(columns={
        "Tanggal": "tanggal", "Nominal": "nominal", "JumlahHadir": "jumlahHadir",
        "IdSesi": "idSesi", "NamaSesi": "namaSesi", "IdTransaksi": "idTransaksi",
        "IdKategori": "idKategori", "Keterangan": "keterangan", "IdAlokasi": "idAlokasi",
        "Peruntukan": "peruntukan", "IdSetoran": "idSetoran", "Periode": "periode",
        "TanggalSetor": "tanggalSetor", "TotalSetoran": "totalSetoran",
        "IdRincian": "idRincian", "NominalDilunasi": "nominalDilunasi",
        "NamaKategori": "namaKategori", "IdKategoriInduk": "idKategoriInduk",
    })
    if tanggal_kolom in frame:
        frame[tanggal_kolom] = frame[tanggal_kolom].map(_date)
        frame = _apply_date_filter(frame.rename(columns={tanggal_kolom: "tanggal"}), start, end)
        if tanggal_kolom != "tanggal":
            frame = frame.rename(columns={"tanggal": tanggal_kolom})
        frame["mingguISO"] = frame[tanggal_kolom].map(
            lambda value: minggu_iso(value) if pd.notna(value) else None
        )
    for column in ("nominal", "jumlahHadir", "totalSetoran", "nominalDilunasi"):
        if column in frame:
            frame[column] = frame[column].map(_int).astype("int64")
    for column in fields:
        if column not in frame:
            frame[column] = pd.Series(dtype="object")
    return frame[fields]


def muat_sesi(source=None, id_huria=None, mulai=None, akhir=None) -> pd.DataFrame:
    return _muat_nested(source, id_huria, "SesiIbadah", WILAYAH_COLUMNS + ["idSesi", "namaSesi", "tanggal", "jumlahHadir", "mingguISO"], mulai, akhir)


def muat_pelean(source=None, id_huria=None, mulai=None, akhir=None) -> pd.DataFrame:
    hurias, start, end = _selected_hurias(source, id_huria, mulai, akhir)
    records = []
    for huria in hurias:
        for sesi in _list(huria["_raw"].get("SesiIbadah")):
            for item in _list(sesi.get("Pelean")):
                records.append({
                    "idHuria": huria["idHuria"], "namaHuria": huria["namaHuria"],
                    "namaResort": huria["namaResort"], "namaDistrik": huria["namaDistrik"],
                    "idSesi": sesi.get("IdSesi"), "tanggal": _date(sesi.get("Tanggal")),
                    "jenis": item.get("Jenis"), "nominal": _int(item.get("Nominal")),
                })
    frame = _apply_date_filter(_frame(records), start, end)
    if not frame.empty:
        frame["mingguISO"] = frame["tanggal"].map(minggu_iso)
    return frame


def muat_pemasukan(source=None, id_huria=None, mulai=None, akhir=None) -> pd.DataFrame:
    frame = _muat_nested(source, id_huria, "PemasukanJemaat", WILAYAH_COLUMNS + ["idTransaksi", "tanggal", "nominal", "idKategori", "keterangan", "mingguISO"], mulai, akhir)
    if not frame.empty:
        kategori = muat_kategori(source, id_huria)
        names = (kategori.drop_duplicates(["idHuria", "idKategori"])
                 .set_index(["idHuria", "idKategori"])["namaKategori"].to_dict()) if not kategori.empty else {}
        frame["namaKategori"] = [names.get((row.idHuria, row.idKategori), "") for row in frame.itertuples()]
    else:
        frame["namaKategori"] = pd.Series(dtype="object")
    return frame


def muat_alokasi(source=None, id_huria=None, mulai=None, akhir=None) -> pd.DataFrame:
    fields = WILAYAH_COLUMNS + ["idAlokasi", "idTransaksi", "peruntukan", "nominal"]
    frame = _muat_nested(source, id_huria, "AlokasiTransaksi", fields)
    if frame.empty or (not mulai and not akhir):
        return frame
    pemasukan = muat_pemasukan(source, id_huria)
    if pemasukan.empty:
        return frame.iloc[0:0].reset_index(drop=True)
    dates = pemasukan.set_index(["idHuria", "idTransaksi"])["tanggal"].to_dict()
    frame["tanggal"] = [dates.get((r.idHuria, r.idTransaksi), pd.NaT) for r in frame.itertuples()]
    _, start, end = _selected_hurias(source, id_huria, mulai, akhir)
    return _apply_date_filter(frame, start, end)[fields]



def muat_setoran(source=None, id_huria=None, mulai=None, akhir=None) -> pd.DataFrame:
    return _muat_nested(source, id_huria, "SetoranPusat", WILAYAH_COLUMNS + ["idSetoran", "periode", "tanggalSetor", "totalSetoran"], mulai, akhir, "tanggalSetor")


def muat_rincian_setoran(source=None, id_huria=None, mulai=None, akhir=None) -> pd.DataFrame:
    fields = WILAYAH_COLUMNS + ["idRincian", "idSetoran", "idAlokasi", "nominalDilunasi"]
    frame = _muat_nested(source, id_huria, "RincianSetoranPusat", fields)
    if frame.empty or (not mulai and not akhir):
        return frame
    setoran = muat_setoran(source, id_huria)
    if setoran.empty:
        return frame.iloc[0:0].reset_index(drop=True)
    dates = setoran.set_index(["idHuria", "idSetoran"])["tanggalSetor"].to_dict()
    frame["tanggal"] = [dates.get((r.idHuria, r.idSetoran), pd.NaT) for r in frame.itertuples()]
    _, start, end = _selected_hurias(source, id_huria, mulai, akhir)
    return _apply_date_filter(frame, start, end)[fields]



def muat_kategori(source=None, id_huria=None, mulai=None, akhir=None) -> pd.DataFrame:
    return _muat_nested(source, id_huria, "KategoriPemasukan", WILAYAH_COLUMNS + ["idKategori", "namaKategori", "idKategoriInduk"], mulai, akhir)
