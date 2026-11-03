from fastapi import APIRouter, Query

from app.data.loader import (
    muat_alokasi,
    muat_huria,
    muat_pemasukan,
    muat_pelean,
    muat_rincian_setoran,
    muat_sesi,
    muat_setoran,
)
from app.data.periode import rentang_tanggal

router = APIRouter()


@router.get("/ringkasan-data")
def ringkasan_data(
    id_huria: list[str] = Query(..., alias="idHuria"),
    mulai: str | None = None,
    akhir: str | None = None,
) -> dict:
    kwargs = {"id_huria": id_huria, "mulai": mulai, "akhir": akhir}
    huria = muat_huria(**kwargs)
    sesi = muat_sesi(**kwargs)
    pelean = muat_pelean(**kwargs)
    pemasukan = muat_pemasukan(**kwargs)
    alokasi = muat_alokasi(**kwargs)
    setoran = muat_setoran(**kwargs)
    rincian = muat_rincian_setoran(**kwargs)

    tanggal_frames = [sesi, pemasukan, pelean]
    tanggal = [
        rentang_tanggal(frame)
        for frame in tanggal_frames
        if not frame.empty
    ]
    return {
        "jumlahHuria": len(huria),
        "jumlahSesi": len(sesi),
        "jumlahPelean": len(pelean),
        "jumlahTransaksi": len(pemasukan),
        "jumlahAlokasi": len(alokasi),
        "jumlahSetoran": len(setoran),
        "jumlahRincianSetoran": len(rincian),
        "rentangTanggal": {
            "mulai": min((item["mulai"] for item in tanggal), default=None),
            "akhir": max((item["akhir"] for item in tanggal), default=None),
        },
    }
