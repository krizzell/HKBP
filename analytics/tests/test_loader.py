import json
from pathlib import Path

import pandas as pd
import pytest

from app.data.loader import (
    muat_alokasi,
    muat_huria,
    muat_pemasukan,
    muat_pelean,
    muat_rincian_setoran,
    muat_sesi,
    muat_setoran,
)


FIXTURE = Path(__file__).parent / "fixtures" / "wilayah_contoh.json"


def load_fixture():
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def test_loader_normalizes_nested_records_and_null_arrays():
    source = load_fixture()

    huria = muat_huria(source, ["H-TEST-1", "Distrik Contoh|Resort Contoh|HKBP Tanpa ID"])
    sesi = muat_sesi(source, ["H-TEST-1"])
    pelean = muat_pelean(source, ["H-TEST-1"])
    pemasukan = muat_pemasukan(source, ["H-TEST-1"])
    alokasi = muat_alokasi(source, ["H-TEST-1"])
    setoran = muat_setoran(source, ["H-TEST-1"])
    rincian = muat_rincian_setoran(source, ["H-TEST-1"])

    assert len(huria) == 2
    assert len(sesi) == 1
    assert len(pelean) == 1
    assert len(pemasukan) == 1
    assert len(alokasi) == 1
    assert len(setoran) == 1
    assert len(rincian) == 1
    assert sesi.loc[0, "jumlahHadir"] == 80
    assert pemasukan.loc[0, "nominal"] == 100000
    assert sesi.loc[0, "mingguISO"] == "2026-W02"
    assert pd.api.types.is_integer_dtype(pemasukan["nominal"])


def test_loader_warns_and_uses_composite_id_for_missing_id():
    with pytest.warns(UserWarning, match="IdHuria kosong"):
        frame = muat_huria(load_fixture(), ["Distrik Contoh|Resort Contoh|HKBP Tanpa ID"])

    assert frame.loc[0, "idHuria"] == "Distrik Contoh|Resort Contoh|HKBP Tanpa ID"


@pytest.mark.parametrize("ids, message", [([], "wajib"), (["x"] * 501, "maksimal")])
def test_loader_rejects_invalid_id_filter(ids, message):
    with pytest.raises(ValueError, match=message):
        muat_huria(load_fixture(), ids)


def test_loader_uses_only_active_huria_in_active_wilayah_without_duplicates():
    source = [{
        "Pusat": {
            "Distrik": [
                {
                    "IdDistrik": "D-1",
                    "NamaDistrik": "Distrik Aktif",
                    "Resort": [{
                        "IdResort": "R-1",
                        "NamaResort": "Resort Aktif",
                        "Huria": [
                            {"IdHuria": "H-1", "NamaHuria": "Huria Aktif", "Aktif": True},
                            {"IdHuria": "H-1", "NamaHuria": "Huria Duplikat", "Aktif": True},
                            {"IdHuria": "H-2", "NamaHuria": "Huria Nonaktif", "Aktif": False},
                        ],
                    }],
                },
                {
                    "NamaDistrik": "Distrik Nonaktif",
                    "Aktif": False,
                    "Resort": [{
                        "NamaResort": "Resort Nonaktif",
                        "Huria": [{"IdHuria": "H-3", "NamaHuria": "Huria Nonaktif"}],
                    }],
                },
            ],
        },
    }]

    frame = muat_huria(source, ["H-1", "H-2", "H-3"])

    assert frame["idHuria"].tolist() == ["H-1"]
    assert frame.loc[0, "namaHuria"] == "Huria Aktif"
