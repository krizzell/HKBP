import pandas as pd
import pytest

from app.ml import dataset, predict


def test_tidak_ada_kebocoran_data(gudang):
    df = dataset.dataset()
    # fitur lag harus sama dengan nilai target sesi SEBELUMNYA pada deret yang sama
    d = df[(df.id_huria == "H-0") & (df.nama_sesi.str.contains("Pagi"))].sort_values("tanggal")
    assert (d["pelean_lag1"].iloc[1:].to_numpy() == d[dataset.TARGET].iloc[:-1].to_numpy()).all()
    # tidak ada fitur yang sama dengan target atau kehadiran sesi berjalan
    assert dataset.TARGET not in dataset.FEATURES and "hadir" not in dataset.FEATURES


def test_split_kronologis_tanpa_tumpang_tindih(gudang):
    tr, va, te = dataset.split_waktu(dataset.dataset())
    assert tr["tanggal"].max() < va["tanggal"].min() <= va["tanggal"].max() < te["tanggal"].min()


def test_tiga_algoritma_dan_metrik_lengkap(gudang):
    lap = gudang["laporan"]
    assert set(lap["model"]) == {"linear_regression", "random_forest", "gradient_boosting"}
    for v in lap["model"].values():
        for bagian in ("latih", "validasi", "uji"):
            assert {"mae", "rmse", "mape", "r2"} <= set(v[bagian])
        assert v["cvWaktu"]["fold"] == 5
    assert lap["model"]["random_forest"]["tuning"]["parameterTerbaik"]
    assert lap["analisisKesalahan"] and "dugaanPenyebab" in lap["analisisKesalahan"][0]
    assert (gudang["dir"] / "card.md").read_text().startswith("# Model Card")


def test_prediksi_input_baru(gudang):
    hasil = predict.prediksi(id_huria="H-0", sesi="pagi", tanggal="2026-06-14")
    assert hasil["status"] == "ok" and hasil["prediksi"] > 0
    assert hasil["rentang"]["bawah"] <= hasil["prediksi"] <= hasil["rentang"]["atas"]
    assert all(f["sumber"] for f in hasil["fiturDipakai"])


def test_prediksi_manual_huria_baru(gudang):
    hasil = predict.prediksi(id_huria=None, sesi="siang", tanggal="2026-08-02",
                             manual={"jumlahJemaat": 900, "peleanMingguLalu": 5_000_000, "hadirMingguLalu": 210})
    assert hasil["prediksi"] > 0
    assert {f["sumber"] for f in hasil["fiturDipakai"]} >= {"manual", "kalender"}


def test_prediksi_menolak_input_tidak_valid(gudang):
    with pytest.raises(ValueError):
        predict.prediksi(id_huria="H-0", sesi="malam", tanggal="2026-06-14")
    with pytest.raises(ValueError):
        predict.prediksi(id_huria="H-0", sesi="pagi", tanggal="bukan-tanggal")
    with pytest.raises(ValueError):
        predict.prediksi(id_huria="H-0", sesi="pagi", tanggal="2026-01-05")  # riwayat < 4 sesi
