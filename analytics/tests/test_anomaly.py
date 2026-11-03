import pandas as pd

from app.services.anomaly import deteksi_anomali


def frames():
    return {
        "huria": pd.DataFrame([{"idHuria": "H-1", "namaHuria": "Huria Satu"}]),
        "pemasukan": pd.DataFrame([{
            "idHuria": "H-1", "namaHuria": "Huria Satu", "idTransaksi": "T-1",
            "tanggal": pd.Timestamp("2026-01-01"), "nominal": 100,
            "namaKategori": "Pelean Minggu",
        }]),
        "alokasi": pd.DataFrame([{
            "idHuria": "H-1", "namaHuria": "Huria Satu", "idAlokasi": "A-1",
            "idTransaksi": "T-1",             "peruntukan": "Setoran Pusat", "nominal": 100,
        }]),
        "setoran": pd.DataFrame([{
            "idHuria": "H-1", "namaHuria": "Huria Satu", "idSetoran": "S-1",
            "tanggalSetor": pd.Timestamp("2026-01-15"), "totalSetoran": 100,
        }]),
        "rincian": pd.DataFrame([{
            "idHuria": "H-1", "namaHuria": "Huria Satu", "idRincian": "R-1",
            "idSetoran": "S-1", "idAlokasi": "A-1", "nominalDilunasi": 100,
        }]),
        "pelean": pd.DataFrame([{
            "idHuria": "H-1", "namaHuria": "Huria Satu",
            "tanggal": pd.Timestamp("2026-01-01"), "nominal": 100,
        }]),
    }


def test_clean_data_has_no_rule_findings():
    result = deteksi_anomali(frames())

    assert result["status"] == "ok"
    assert result["temuan"] == []


def test_r1_detects_setoran_mismatch():
    data = frames()
    data["rincian"].loc[0, "nominalDilunasi"] = 90

    result = deteksi_anomali(data)

    finding = next(item for item in result["temuan"] if item["kode"] == "R1")
    assert finding["bukti"] == {"totalSetoran": 100, "totalRincian": 90}


def test_r2_detects_overpaid_allocation():
    data = frames()
    data["rincian"].loc[0, "nominalDilunasi"] = 110

    result = deteksi_anomali(data)

    assert any(item["kode"] == "R2" for item in result["temuan"])


def test_r5_detects_allocation_total_mismatch():
    data = frames()
    data["alokasi"].loc[0, "nominal"] = 40

    result = deteksi_anomali(data)

    assert any(item["kode"] == "R5" for item in result["temuan"])
