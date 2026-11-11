H = {"X-Internal-Key": "test-internal-key"}


def test_dw_dan_ml_butuh_kunci_internal(client):
    assert client.get("/dw/cube").status_code == 401
    assert client.post("/ml/predict", json={}).status_code == 401


def test_endpoint_dw(gudang, client):
    ring = client.get("/dw/ringkasan", headers=H).json()
    assert ring["totalBarisFakta"] > 0 and ring["jumlahHuriaBerdata"] == 4
    cube = client.get("/dw/cube", headers=H).json()["data"]
    assert cube and {"distrik", "resort", "huria", "bulan", "totalPemasukan"} <= set(cube[0])
    assert client.get("/dw/aliran", headers=H).json()["data"]
    assert client.get("/dw/sesi", headers=H).json()["data"]
    assert client.get("/dw/kategori", headers=H).json()["data"]


def test_endpoint_ml(gudang, client):
    assert client.get("/ml/opsi", headers=H).json()["huria"]
    assert client.get("/ml/metrics", headers=H).json()["modelTerbaik"]
    ok = client.post("/ml/predict", headers=H, json={"idHuria": "H-1", "sesi": "pagi", "tanggal": "2026-06-14"})
    assert ok.status_code == 200 and ok.json()["prediksi"] > 0
    bad = client.post("/ml/predict", headers=H, json={"idHuria": "H-1", "sesi": "malam", "tanggal": "2026-06-14"})
    assert bad.status_code == 422


def test_warehouse_belum_ada_memberi_503(client, monkeypatch, tmp_path):
    from app.config import get_settings
    monkeypatch.setenv("WAREHOUSE_PATH", str(tmp_path / "tidak-ada.db"))
    get_settings.cache_clear()
    assert client.get("/dw/cube", headers=H).status_code == 503
    get_settings.cache_clear()


def test_refresh_dw_menolak_tanpa_kunci_dan_menangani_gagal_mongo(gudang, client, monkeypatch):
    assert client.post("/dw/refresh").status_code == 401
    from etl import build_warehouse as etl

    def gagal(*args, **kwargs):
        raise RuntimeError("mongo mati")

    monkeypatch.setattr(etl, "run", gagal)
    r = client.post("/dw/refresh", headers=H)
    assert r.status_code == 502 and "mongo mati" in r.json()["detail"]
    # kunci dilepas: permintaan berikutnya tidak terkunci (bukan 409)
    assert client.post("/dw/refresh", headers=H).status_code == 502
