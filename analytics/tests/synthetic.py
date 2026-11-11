"""Pembangun dokumen bersarang bergaya MongoDB untuk uji ETL/ML (tanpa bergantung pada wilayah.json)."""
from datetime import date, timedelta

import numpy as np


def dokumen(n_huria: int = 4, n_minggu: int = 24, kotor: bool = False) -> list[dict]:
    rng = np.random.default_rng(7)
    awal = date(2026, 1, 4)
    hurias = []
    for i in range(n_huria):
        kode = f"H-{i}"
        jemaat = 600 + i * 300
        sesi, pemasukan, alokasi, setoran, rincian = [], [], [], [], []
        for w in range(n_minggu):
            tgl = (awal + timedelta(days=7 * w)).isoformat()
            total = 0
            for j, nama in enumerate(("Ibadah Pagi (Bahasa Batak)", "Ibadah Siang (Bahasa Indonesia/Batak)")):
                hadir = int(jemaat * (0.25 - 0.03 * j) * rng.uniform(0.95, 1.05))
                pel = [{"Jenis": k, "Nominal": int(hadir * r)} for k, r in zip(("1a", "1b", "2a", "2b"), (14000, 4500, 4500, 2000))]
                total += sum(p["Nominal"] for p in pel)
                sesi.append({"IdSesi": f"S-{kode}-{w:02d}-{j}", "NamaSesi": nama, "Tanggal": tgl, "JamMulai": "07:00",
                             "JumlahHadir": hadir, "Pelean": pel})
            pemasukan.append({"IdTransaksi": f"T-{kode}-{w:02d}", "Tanggal": tgl, "Nominal": total,
                              "IdKategori": "K-01", "Keterangan": "Pelean Minggu"})
            pusat = int(total * 0.55)
            alokasi.append({"IdAlokasi": f"AP-{kode}-{w:02d}", "IdTransaksi": f"T-{kode}-{w:02d}",
                            "Peruntukan": "Setoran Pusat", "Nominal": pusat})
            alokasi.append({"IdAlokasi": f"AK-{kode}-{w:02d}", "IdTransaksi": f"T-{kode}-{w:02d}",
                            "Peruntukan": "Kas Huria", "Nominal": total - pusat})
            setoran.append({"IdSetoran": f"SP-{kode}-{w:02d}", "Periode": tgl[:7],
                            "TanggalSetor": (awal + timedelta(days=7 * w + 20)).isoformat(), "TotalSetoran": pusat})
            rincian.append({"IdRincian": f"R-{kode}-{w:02d}", "IdSetoran": f"SP-{kode}-{w:02d}",
                            "IdAlokasi": f"AP-{kode}-{w:02d}", "NominalDilunasi": pusat})
        hurias.append({"IdHuria": kode, "NamaHuria": f"HKBP {i}", "LokasiHuria": "X", "TahunBerdiri": "1950",
                       "NamaPendetaPimpinan": "Pdt", "JumlahJemaat": jemaat, "KepalaKeluarga": "100 KK",
                       "KategoriPemasukan": [{"IdKategori": "K-01", "NamaKategori": "Pelean Minggu (Ia, Ib, IIa, IIb)"}],
                       "SesiIbadah": sesi, "PemasukanJemaat": pemasukan, "AlokasiTransaksi": alokasi,
                       "SetoranPusat": setoran, "RincianSetoranPusat": rincian})
    if kotor:  # sisipkan masalah kualitas data yang harus ditangkap ETL
        h = hurias[0]
        h["PemasukanJemaat"].append(dict(h["PemasukanJemaat"][0]))                 # duplikat
        h["SesiIbadah"][0]["Tanggal"] = "31/02/2026"                                # tanggal tidak valid
        h["SesiIbadah"][1]["JumlahHadir"] = -5                                      # nilai negatif
        h["NamaHuria"] = "  HKBP   0  "                                             # spasi berlebih
    return [{"Pusat": {"Distrik": [{"IdDistrik": "D1", "KodeDistrik": "DIS-01", "NamaDistrik": "Distrik A",
                                    "Resort": [{"IdResort": "R1", "KodeResort": "RES-01", "NamaResort": "Resort A",
                                                "Huria": hurias}]}]}}]
