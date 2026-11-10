from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.data.loader import muat_huria, muat_pemasukan, semua_id_huria
from app.services.drop import deteksi_drop_pemasukan

router = APIRouter()


class DropRequest(BaseModel):
    idHuria: list[str] | None = Field(default=None)
    mulai: str | None = None
    akhir: str | None = None
    kategori: str | None = None


@router.post("")
def drop(request: DropRequest) -> dict:
    if request.idHuria and len(request.idHuria) > 500:
        raise HTTPException(status_code=422, detail="idHuria maksimal 500 untuk analisis terpilih")
    id_huria = request.idHuria or semua_id_huria()
    if not id_huria:
        raise HTTPException(status_code=422, detail="Tidak ada data Huria untuk dianalisis")
    kwargs = {"id_huria": id_huria, "mulai": request.mulai, "akhir": request.akhir}
    try:
        return deteksi_drop_pemasukan(
            muat_pemasukan(**kwargs, max_ids=None),
            muat_huria(**kwargs, max_ids=None),
            kategori=request.kategori,
            akhir_terpilih=request.akhir,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
