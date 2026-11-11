import json

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("INTERNAL_KEY", "test-internal-key")
    get_settings.cache_clear()
    return TestClient(app)


@pytest.fixture(scope="module")
def gudang(tmp_path_factory):
    """Bangun warehouse + latih model kecil pada data sintetis; arahkan setting ke folder sementara."""
    from app.ml import train as ml_train
    from app.ml import predict as ml_predict
    from etl import build_warehouse as etl
    from tests.synthetic import dokumen

    tmp_path = tmp_path_factory.mktemp("gudang")
    monkeypatch = pytest.MonkeyPatch()
    sumber = tmp_path / "docs.json"
    sumber.write_text(json.dumps(dokumen(n_huria=4, n_minggu=30)))
    db = tmp_path / "wh.db"
    etl.run("json", sumber, db, tmp_path / "dq.md")
    monkeypatch.setenv("WAREHOUSE_PATH", str(db))
    monkeypatch.setenv("MODELS_DIR", str(tmp_path / "models"))
    monkeypatch.setenv("INTERNAL_KEY", "test-internal-key")
    get_settings.cache_clear()
    ml_predict._cache.clear()
    laporan = ml_train.train(save=True, card_path=tmp_path / "card.md")
    yield {"db": db, "laporan": laporan, "dir": tmp_path}
    monkeypatch.undo()
    get_settings.cache_clear()
    ml_predict._cache.clear()
