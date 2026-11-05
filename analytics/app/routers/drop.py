from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.data.loader import muat_huria, muat_pemasukan
from app.services.drop import deteksi_drop_pemasukan

router = APIRouter()


class DropRequest(BaseModel):
    idHuria: list[str] = Field(min_length=1, max_length=500)
    mulai: str | None = None
    akhir: str | None = None
    kategori: str | None = None


@router.post("")
def drop(request: DropRequest) -> dict:
    kwargs = {"id_huria": request.idHuria, "mulai": request.mulai, "akhir": request.akhir}
    try:
        return deteksi_drop_pemasukan(
            muat_pemasukan(**kwargs),
            muat_huria(**kwargs),
            kategori=request.kategori,
            akhir_terpilih=request.akhir,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
