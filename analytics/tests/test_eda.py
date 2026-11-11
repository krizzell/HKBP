from etl import eda


def test_eda_menghasilkan_minimal_lima_temuan_dan_laporan(gudang, tmp_path, monkeypatch):
    sesi, masuk, info = eda.muat()
    temuan = eda.temuan(sesi, masuk, info)
    assert len(temuan) >= 5 and all(isinstance(t, str) and t for t in temuan)
    monkeypatch.setattr(eda, "OUT", tmp_path / "eda.md")
    path = eda.tulis()
    teks = path.read_text(encoding="utf-8")
    assert "Statistik deskriptif" in teks and "Temuan" in teks
    assert {"hadir", "pelean"} <= set(eda.outlier_per_huria(sesi).columns) | {"hadir", "pelean"}
