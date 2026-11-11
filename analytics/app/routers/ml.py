"""Endpoint Data Science: informasi model, opsi formulir, dan prediksi input baru."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.ml import predict as svc
from app.warehouse.db import WarehouseNotReady

router = APIRouter()


class PrediksiRequest(BaseModel):
    idHuria: str | None = None
    sesi: str = Field(min_length=1, description="'pagi', 'siang', atau nama sesi lengkap")
    tanggal: str = Field(description="YYYY-MM-DD")
    # Opsional: isi manual bila Huria baru / riwayat kurang dari 4 sesi
    jumlahJemaat: float | None = Field(default=None, ge=0)
    peleanMingguLalu: float | None = Field(default=None, ge=0)
    peleanDuaMingguLalu: float | None = Field(default=None, ge=0)
    rataPelean4: float | None = Field(default=None, ge=0)
    hadirMingguLalu: float | None = Field(default=None, ge=0)
    rataHadir4: float | None = Field(default=None, ge=0)


def _guard(fn):
    try:
        return fn()
    except (svc.ModelBelumSiap, WarehouseNotReady) as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.get("/metrics")
def metrics() -> dict:
    return _guard(svc.metrik)


@router.get("/opsi")
def opsi() -> dict:
    return _guard(svc.opsi)


@router.post("/predict")
def predict(request: PrediksiRequest) -> dict:
    manual = request.model_dump(exclude={"idHuria", "sesi", "tanggal"})
    return _guard(lambda: svc.prediksi(id_huria=request.idHuria, sesi=request.sesi,
                                       tanggal=request.tanggal, manual=manual))
