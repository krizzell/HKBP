"""Regresi untuk bug fungsional yang terjadi pada data HKBP."""
from datetime import timedelta

import pandas as pd

from app.data.loader import muat_alokasi, muat_pemasukan, muat_rincian_setoran
from app.services.anomaly import _rule_r3
from app.services.drop import deteksi_drop_pemasukan


def test_drop_tidak_menganggap_tidak_lapor_sebagai_nol():
    income = pd.DataFrame([
        {"idHuria": "A", "tanggal": "2026-01-04", "nominal": 100, "namaKategori": "Pelean Minggu (Ia, Ib)"},
        {"idHuria": "B", "tanggal": "2026-01-11", "nominal": 200, "namaKategori": "Pelean Minggu (Ia, Ib)"},
    ])
    hurias = pd.DataFrame([{"idHuria": "A", "namaHuria": "A"}, {"idHuria": "B", "namaHuria": "B"}])
    result = deteksi_drop_pemasukan(income, hurias, kategori="Pelean Minggu")
    assert result["mingguan"]["jumlahHuriaTurun"] == 0
    assert result["mingguan"]["jumlahBelumLapor"] == 1
    assert result["mingguan"]["idHuriaBelumLapor"] == ["A"]


def _fixture():
    def h(kode, name):
        return {
            "IdHuria": kode, "NamaHuria": kode,
            "KategoriPemasukan": [{"IdKategori": "K-01", "NamaKategori": name}],
            "PemasukanJemaat": [{"IdTransaksi": kode+"-T", "Tanggal": "2026-01-04", "Nominal": 100, "IdKategori": "K-01"}],
            "AlokasiTransaksi": [{"IdAlokasi": kode+"-A", "IdTransaksi": kode+"-T", "Nominal": 50, "Peruntukan": "Setoran Pusat"}],
            "SetoranPusat": [{"IdSetoran": kode+"-S", "TanggalSetor": "2026-02-02", "TotalSetoran": 50}],
            "RincianSetoranPusat": [{"IdRincian": kode+"-R", "IdSetoran": kode+"-S", "IdAlokasi": kode+"-A", "NominalDilunasi": 50}],
        }
    return [{"Pusat": {"Distrik": [{"NamaDistrik": "D", "Resort": [{"NamaResort": "R", "Huria": [h("A", "Pelean Minggu"), h("B", "Iuran Taon")]}]}]}}]


def test_kategori_sama_id_berbeda_huria_tidak_tertukar():
    data = muat_pemasukan(_fixture(), ["A", "B"])
    names = data.set_index("idHuria")["namaKategori"].to_dict()
    assert names == {"A": "Pelean Minggu", "B": "Iuran Taon"}


def test_alokasi_dan_rincian_mengikuti_tanggal_berbeda():
    source = _fixture()
    assert len(muat_alokasi(source, ["A"], "2026-01-01", "2026-01-31")) == 1
    assert len(muat_alokasi(source, ["A"], "2026-02-01", "2026-02-28")) == 0
    assert len(muat_rincian_setoran(source, ["A"], "2026-02-01", "2026-02-28")) == 1
    assert len(muat_rincian_setoran(source, ["A"], "2026-01-01", "2026-01-31")) == 0


def test_tunggakan_sebagian_tetap_diperiksa():
    older = pd.Timestamp.today().normalize() - pd.Timedelta(days=90)
    alokasi = pd.DataFrame([{"idHuria": "A", "namaHuria": "A", "idAlokasi": "a", "idTransaksi": "t", "peruntukan": "Setoran Pusat", "nominal": 1000}])
    pemasukan = pd.DataFrame([{"idHuria": "A", "idTransaksi": "t", "tanggal": older, "nominal": 1000}])
    rincian = pd.DataFrame([{"idHuria": "A", "idAlokasi": "a", "nominalDilunasi": 200}])
    findings = _rule_r3(alokasi, pemasukan, rincian, 45)
    assert len(findings) == 1
    assert findings[0]["bukti"]["sisaKewajiban"] == 800
