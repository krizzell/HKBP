from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.data.loader import muat_pemasukan, muat_sesi
from app.services.correlation import analisis_korelasi

router = APIRouter()


class CorrelationRequest(BaseModel):
    idHuria: list[str] = Field(min_length=1, max_length=500)
    mulai: str | None = None
    akhir: str | None = None
    granularitas: str = "mingguan"
    kategori: str | None = None
    minimumPeriode: int = Field(default=8, ge=2)


@router.post("")
def correlation(request: CorrelationRequest) -> dict:
    kwargs = {"id_huria": request.idHuria, "mulai": request.mulai, "akhir": request.akhir}
    try:
        return analisis_korelasi(
            muat_sesi(**kwargs),
            muat_pemasukan(**kwargs),
            granularitas=request.granularitas,
            kategori=request.kategori,
            minimum_periode=request.minimumPeriode,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
