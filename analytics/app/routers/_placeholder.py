from fastapi import APIRouter


def create_router() -> APIRouter:
    router = APIRouter()

    @router.post("")
    def not_implemented() -> dict[str, str]:
        return {"status": "belum_diimplementasikan"}

    return router
