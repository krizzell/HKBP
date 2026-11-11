"""Tes murni (tanpa MongoDB) untuk scripts/seed_lengkap.py."""
import datetime as dt

from scripts import seed_lengkap as S


def pohon_contoh():
    return {"Pusat": {"NamaPusat": "Pusat", "Distrik": [
        {"IdDistrik": "a" * 24, "KodeDistrik": "DIS-06", "NamaDistrik": "Distrik Sumatera Timur", "NamaPraeses": "Pdt. X", "Resort": []},
        {"IdDistrik": "b" * 24, "KodeDistrik": "DIS-01", "NamaDistrik": "Distrik I", "NamaPraeses": "Pdt. Y", "Resort": [
            {"IdResort": "c" * 24, "KodeResort": "RES-01", "NamaResort": "Resort Tebet", "NamaPendetaResort": "Pdt. Z",
             "Huria": [{"NamaHuria": "HKBP Kosong", "IdHuria": "H-1", "JumlahJemaat": 500,
                        "KategoriPemasukan": [{"IdKategori": "K-01", "NamaKategori": "Pelean Minggu (Ia, Ib, IIa, IIb)", "IdKategoriInduk": ""}]}]}]}]}}


def test_semua_huria_terisi_dan_konsisten():
    p = pohon_contoh()
    S.susun(p, 2015, dt.date(2026, 10, 11), per_resort=2, tahun_mingguan=1, ringkas=2020)
    hs = [h for _, _, h in S.semua_huria(p)]
    assert len(hs) >= 8  # 3 resort baru x2 + Resort Tebet 2
    for h in hs:
        assert h["PemasukanJemaat"], h["IdHuria"]
        assert S.validasi_huria(h) == [], h["IdHuria"]


def test_deterministik_dan_idempoten():
    a, b = pohon_contoh(), pohon_contoh()
    S.susun(a, 2018, dt.date(2026, 10, 11), 2, 1, 2022)
    S.susun(b, 2018, dt.date(2026, 10, 11), 2, 1, 2022)
    assert a == b
    n = sum(len(h["PemasukanJemaat"]) for _, _, h in S.semua_huria(a))
    S.susun(a, 2018, dt.date(2026, 10, 11), 2, 1, 2022)
    assert n == sum(len(h["PemasukanJemaat"]) for _, _, h in S.semua_huria(a))


def test_alokasi_55_45_dan_ukuran_wajar():
    p = pohon_contoh()
    S.susun(p, 2024, dt.date(2026, 10, 11), 2, 1, 2025)
    for _, _, h in S.semua_huria(p):
        pusat = sum(a["Nominal"] for a in h["AlokasiTransaksi"] if a["Peruntukan"] == "Setoran Pusat")
        total = sum(t["Nominal"] for t in h["PemasukanJemaat"])
        assert abs(pusat / total - 0.55) < 0.001
    assert S.ukuran_byte(p) < S.BATAS_DOKUMEN_BYTE
