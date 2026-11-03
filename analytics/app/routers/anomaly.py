from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.data.loader import (
    muat_alokasi,
    muat_huria,
    muat_pemasukan,
    muat_pelean,
    muat_rincian_setoran,
    muat_setoran,
)
from app.services.anomaly import deteksi_anomali

router = APIRouter()


class AnomalyRequest(BaseModel):
    idHuria: list[str] = Field(min_length=1, max_length=500)
    mulai: str | None = None
    akhir: str | None = None
    batasHariTunggakan: int = Field(default=45, ge=1)
    ambangZ: float = Field(default=3.5, gt=0)


@router.post("")
def anomaly(request: AnomalyRequest) -> dict:
    kwargs = {"id_huria": request.idHuria, "mulai": request.mulai, "akhir": request.akhir}
    try:
        frames = {
            "huria": muat_huria(**kwargs),
            "pemasukan": muat_pemasukan(**kwargs),
            "alokasi": muat_alokasi(**kwargs),
            "setoran": muat_setoran(**kwargs),
            "rincian": muat_rincian_setoran(**kwargs),
            "pelean": muat_pelean(**kwargs),
        }
        return deteksi_anomali(
            frames,
            batas_hari_tunggakan=request.batasHariTunggakan,
            ambang_z=request.ambangZ,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
