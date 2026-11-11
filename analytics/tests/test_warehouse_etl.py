import sqlite3

import pytest

from etl import build_warehouse as etl
from tests.synthetic import dokumen


def _jalankan(tmp_path, docs):
    raw = etl.extract(docs)
    dq = etl.assess(raw, "sebelum")
    bersih, log = etl.clean(raw)
    dq += etl.assess(bersih, "sesudah")
    db = tmp_path / "wh.db"
    conn = sqlite3.connect(db)
    counts = etl.load(conn, bersih)
    return conn, counts, dq, log


def test_skema_bintang_punya_fakta_dan_dimensi(tmp_path):
    conn, counts, _, _ = _jalankan(tmp_path, dokumen())
    tabel = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    fakta = {t for t in tabel if t.startswith("fact_")}
    dimensi = {t for t in tabel if t.startswith("dim_")}
    assert len(fakta) >= 1 and len(dimensi) >= 3
    assert counts["fact_kehadiran"] == 4 * 24 * 2
    assert counts["fact_pelean"] == counts["fact_kehadiran"] * 4


def test_integritas_referensial_dan_konsistensi_finansial(tmp_path):
    conn, _, _, _ = _jalankan(tmp_path, dokumen())
    conn.execute("PRAGMA foreign_keys = ON")
    assert conn.execute("PRAGMA foreign_key_check").fetchall() == []
    beda = conn.execute("SELECT COUNT(*) FROM fact_pemasukan WHERE nominal <> nominal_alokasi_pusat + nominal_alokasi_huria").fetchone()[0]
    assert beda == 0
    assert conn.execute("SELECT COUNT(*) FROM fact_setoran WHERE total_setoran <> total_rincian").fetchone()[0] == 0


def test_etl_menangkap_dan_memperbaiki_data_kotor(tmp_path):
    conn, counts, dq, log = _jalankan(tmp_path, dokumen(kotor=True))
    sebelum = {(r["tabel"], r["metrik"]): r["nilai"] for r in dq if r["tahap"] == "sebelum"}
    sesudah = {(r["tabel"], r["metrik"]): r["nilai"] for r in dq if r["tahap"] == "sesudah"}
    assert sebelum[("pemasukan", "kunci unik (id_huria, id_transaksi)")] < 100
    assert sesudah[("pemasukan", "kunci unik (id_huria, id_transaksi)")] == 100
    assert sebelum[("sesi", "tanggal format YYYY-MM-DD")] < 100
    assert sebelum[("sesi", "jumlah_hadir numerik >= 0")] < 100
    assert any("duplikat" in k for k in log) and any("tanggal" in k for k in log)
    assert conn.execute("SELECT nama_huria FROM dim_huria WHERE id_huria='H-0'").fetchone()[0] == "HKBP 0"


def test_etl_dapat_dijalankan_ulang(tmp_path):
    docs = dokumen()
    db = tmp_path / "wh.db"
    import json
    path = tmp_path / "d.json"
    path.write_text(json.dumps(docs))
    r1 = etl.run("json", path, db, tmp_path / "r.md")
    r2 = etl.run("json", path, db, tmp_path / "r.md")
    assert r1["counts"] == r2["counts"]
    assert (tmp_path / "r.md").read_text().startswith("# Laporan Kualitas Data")


def test_kategori_kanonik():
    assert etl.kategori_kanonik("Pelean Minggu (Ia, Ib, IIa, IIb)") == "Pelean Minggu"
    assert etl.kategori_kanonik("Guguan / Iuran Taon Jemaat") == "Iuran Taon (Guguan)"
