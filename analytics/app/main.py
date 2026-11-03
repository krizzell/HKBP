import hmac
from collections.abc import Callable

from fastapi import Depends, FastAPI, Header, HTTPException, status

from app.config import get_settings
from app.routers import anomaly, clustering, correlation, data, drop, forecast

app = FastAPI(title="HKBP Analytics", version="0.1.0")


def require_internal_key(
    internal_key: str | None = Header(default=None, alias="X-Internal-Key"),
) -> None:
    expected = get_settings()["internal_key"]
    if not expected or internal_key is None or not hmac.compare_digest(internal_key, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kunci internal tidak valid",
        )


InternalAuth = Callable[[], None]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(
    forecast.router,
    prefix="/forecast",
    dependencies=[Depends(require_internal_key)],
)
app.include_router(
    anomaly.router,
    prefix="/anomaly",
    dependencies=[Depends(require_internal_key)],
)
app.include_router(
    correlation.router,
    prefix="/correlation",
    dependencies=[Depends(require_internal_key)],
)
app.include_router(
    drop.router,
    prefix="/drop",
    dependencies=[Depends(require_internal_key)],
)
app.include_router(
    clustering.router,
    prefix="/clustering",
    dependencies=[Depends(require_internal_key)],
)
app.include_router(
    data.router,
    dependencies=[Depends(require_internal_key)],
)
