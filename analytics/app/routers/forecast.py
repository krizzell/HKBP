from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.data.loader import muat_pemasukan
from app.services.forecast import prakiraan_pemasukan

router = APIRouter()


class ForecastRequest(BaseModel):
    idHuria: list[str] = Field(min_length=1, max_length=500)
    mulai: str | None = None
    akhir: str | None = None
    granularitas: str = "mingguan"
    horizon: int | None = None
    kategori: str | None = None


@router.post("")
def forecast(request: ForecastRequest) -> dict:
    try:
        pemasukan = muat_pemasukan(
            id_huria=request.idHuria,
            mulai=request.mulai,
            akhir=request.akhir,
        )
        return prakiraan_pemasukan(
            pemasukan,
            granularitas=request.granularitas,
            horizon=request.horizon,
            mulai=request.mulai,
            akhir=request.akhir,
            kategori=request.kategori,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
