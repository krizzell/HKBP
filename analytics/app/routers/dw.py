"""Endpoint data warehouse: dashboard membaca skema bintang yang sama dengan model ML."""

import threading

from fastapi import APIRouter, HTTPException

from app.warehouse import queries
from app.warehouse.db import WarehouseNotReady

router = APIRouter()


def _safe(fn):
    try:
        return fn()
    except WarehouseNotReady as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@router.get("/ringkasan")
def ringkasan() -> dict:
    return _safe(queries.ringkasan)


@router.get("/cube")
def cube() -> dict:
    return {"data": _safe(queries.cube)}


@router.get("/aliran")
def aliran() -> dict:
    return {"data": _safe(queries.aliran)}


@router.get("/sesi")
def sesi() -> dict:
    return {"data": _safe(queries.sesi)}


@router.get("/kategori")
def kategori() -> dict:
    return {"data": _safe(queries.kategori)}


_refresh_lock = threading.Lock()


@router.post("/refresh")
def refresh(latih: bool = False) -> dict:
    """Jalankan ulang ETL MongoDB -> warehouse (opsional: latih ulang model). Hanya satu proses sekaligus."""
    from app.config import ROOT
    from app.warehouse.db import warehouse_path
    from etl import build_warehouse as etl

    if not _refresh_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="Pembaruan warehouse sedang berjalan")
    try:
        hasil = etl.run("mongo", None, warehouse_path(), ROOT / "docs" / "DATA_QUALITY_REPORT.md")
        out = {"status": "ok", "baris": hasil["counts"], "perbaikan": hasil["perbaikan"]}
        if latih:
            from app.ml import train as ml_train

            lap = ml_train.train(save=True)
            out["model"] = lap["namaModelTerbaik"]
        return out
    except Exception as error:  # koneksi Mongo / data tidak valid
        raise HTTPException(status_code=502, detail=f"Pembaruan warehouse gagal: {error}") from error
    finally:
        _refresh_lock.release()
