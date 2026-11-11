"""
Migrasi data lengkap HKBP (MongoDB) - mengisi SEMUA huria dengan data keuangan.

Menjalankan dari folder analytics/ (venv aktif):
    python -m scripts.seed_lengkap --dry-run        # simulasi, tidak menulis apa pun
    python -m scripts.seed_lengkap                  # tulis ke database (minta konfirmasi)

Yang dilakukan:
  1. Membaca dokumen pohon di koleksi `HKBP` (satu-satunya sumber data yang dibaca
     backend Go, frontend, dan layanan analitik).
  2. Backup dokumen itu ke koleksi `HKBP_backup_<waktu>`.
  3. Melengkapi struktur: Distrik tanpa resort diberi resort, resort ditambah huria
     sampai --huria-per-resort, koleksi master distrik/resort/huria ikut disinkronkan.
  4. Mengisi data keuangan huria yang kosong dan menambah riwayat tahun lampau
     untuk huria yang sudah punya data 2026 (data 2026 yang ada TIDAK diubah).
  5. Memeriksa konsistensi (alokasi = nominal, setoran = rincian, pelean = transaksi)
     dan ukuran dokumen sebelum menulis.

Batas teknis: satu dokumen MongoDB maksimal 16 MB. Skrip memilih tahun paling awal
yang masih muat (--mulai auto) atau menolak bila --mulai terlalu jauh.
"""
from __future__ import annotations

import argparse
import copy
import datetime as dt
import hashlib
import json
import random
import sys
from dataclasses import dataclass

import bson
from bson import ObjectId
from dateutil.easter import easter

AKHIR_DEFAULT = "2026-10-11"  # sama dengan data contoh yang sudah ada
BATAS_DOKUMEN_BYTE = 16 * 1024 * 1024
SEED = "hkbp-lengkap-v1"

KATEGORI = [
    ("K-01", "Pelean Minggu (Ia, Ib, IIa, IIb)"),
    ("K-02", "Guguan / Iuran Taon Jemaat"),
    ("K-03", "Hamuliateon (Ucapan Syukur)"),
    ("K-04", "Pesta Gotilon (Pesta Panen)"),
    ("K-05", "Pelean Partangiangan Lunggu"),
    ("K-06", "Pelean Ulaon Na Badia"),
    ("K-07", "Pelean Pamasumasuon (Pernikahan)"),
    ("K-08", "Pelean Tardidi (Baptisan Kudus)"),
]
LUNGGU = [
    ("Lunggu Sion", "Sektor I (Utara)"), ("Lunggu Bethel", "Sektor II (Selatan)"),
    ("Lunggu Jerusalem", "Sektor III (Pusat)"), ("Lunggu Galilea", "Sektor IV (Barat)"),
    ("Lunggu Hebron", "Sektor V (Timur)"), ("Lunggu Nazaret", "Sektor VI (Pinggiran)"),
]
WARTA_DEFAULT = {
    "Tema": "Manghaporseai Jesus Kristus Sipangolu",
    "SubTema": "Lam Margogo di Bagasan Haporseaon, Panghiramon, dohot Holong (1 Korint 13:13)",
    "TataIbadah": ["Votum - Introitus - Tangiang Buka", "Patik ni Debata", "Jamita (Khotbah)",
                   "Papungu Pelean Ia, Ib, IIa, IIb", "Tangiang Pelean, Pasupasu, dohot Amen"],
    "TingtingNaMarragam": ["Partangiangan Lunggu dipatupa ari Rabu pukul 19.30 WIB"],
    "TingtingParhepengon": ["Pelean Minggu Pelean Ia, Ib, IIa, IIb",
                            "Setoran Sentralisasi Keuangan 55% tu Kantor Pusat Pearaja"],
}

NAMA_DEPAN = ["Pdt. Binsar", "Pdt. Hotman", "Pdt. Parlindungan", "Pdt. Sahat", "Pdt. Tigor",
              "Pdt. Maruli", "Pdt. Bonar", "Pdt. Monang", "Pdt. Rosmawati", "Pdt. Lamhot",
              "Pdt. Frans", "Pdt. Andar", "Pdt. Josua", "Pdt. Erwin", "Pdt. Daniel"]
MARGA = ["Sihombing", "Simanjuntak", "Nainggolan", "Panjaitan", "Hutagalung", "Situmorang",
         "Pardede", "Sianipar", "Tampubolon", "Manurung", "Silitonga", "Hasibuan", "Purba",
         "Sinaga", "Lumbantobing", "Napitupulu", "Marbun", "Siahaan"]

# Resort baru untuk distrik yang masih kosong (kunci = nama distrik di data Anda)
RESORT_BARU = {
    "Distrik Sumatera Timur": [
        ("Resort Pematangsiantar", ["HKBP Siantar Kota", "HKBP Parluasan", "HKBP Sutomo Siantar", "HKBP Martoba"]),
        ("Resort Tebing Tinggi", ["HKBP Tebing Tinggi Kota", "HKBP Rambutan", "HKBP Bandar Khalipah", "HKBP Paya Pinang"]),
        ("Resort Kisaran", ["HKBP Kisaran Kota", "HKBP Sei Renggas", "HKBP Aek Songsongan", "HKBP Tanjung Balai"]),
    ],
}
# Huria tambahan per resort (nama resort -> daftar nama huria cadangan)
HURIA_CADANGAN = {
    "Resort Tebet": ["HKBP Manggarai", "HKBP Pasar Minggu", "HKBP Kalibata", "HKBP Bukit Duri"],
    "Resort Rawamangun": ["HKBP Pulomas", "HKBP Kayu Putih", "HKBP Cakung", "HKBP Utan Kayu"],
    "Resort Pearaja Tarutung": ["HKBP Sitompul", "HKBP Hutatoruan", "HKBP Silantom", "HKBP Aek Nauli"],
    "Resort Balige": ["HKBP Tambunan", "HKBP Lumban Silintong", "HKBP Sibolahotang", "HKBP Hinalang"],
    "Resort Doloksanggul Kota": ["HKBP Sihotang", "HKBP Pakkat", "HKBP Lumban Purba", "HKBP Sibuntuon"],
    "Resort Parsaoran Nauli": ["HKBP Siborongborong", "HKBP Parbubu", "HKBP Hutapea", "HKBP Sampagul"],
    "Resort Medan": ["HKBP Sei Agul", "HKBP Petisah", "HKBP Sunggal", "HKBP Kota Matsum"],
    "Resort Glugur Medan": ["HKBP Helvetia", "HKBP Tembung", "HKBP Titi Papan", "HKBP Belawan"],
    "Resort Porsea": ["HKBP Parparean", "HKBP Sosor Ladang", "HKBP Silaen", "HKBP Lumban Julu"],
    "Nommensen Sigumpar": ["HKBP Sigumpar Dolok", "HKBP Sipinggan", "HKBP Gurgur", "HKBP Aek Rihit"],
    "Resort Laguboti": ["HKBP Lumban Bulbul", "HKBP Siraja Hutagalung", "HKBP Sitoluama", "HKBP Pintu Pohan"],
}


# ----------------------------------------------------------------------------- util
def rng_untuk(kunci: str) -> random.Random:
    h = hashlib.sha256(f"{SEED}|{kunci}".encode()).hexdigest()
    return random.Random(int(h[:12], 16))


def ke_date(s: str) -> dt.date:
    return dt.date.fromisoformat(s[:10])


def bulatkan(x: float) -> int:
    return int(round(x / 1000.0)) * 1000


def minggu_dalam(awal: dt.date, akhir: dt.date):
    d = awal + dt.timedelta(days=(6 - awal.weekday()) % 7)
    while d <= akhir:
        yield d
        d += dt.timedelta(days=7)


def faktor_tahun(tahun: int) -> tuple[float, float]:
    """(pelean, hadir) relatif terhadap 2026."""
    return 1.055 ** (tahun - 2026), 1.012 ** (tahun - 2026)


def faktor_covid(d: dt.date) -> tuple[float, float]:
    """Ibadah daring Mar 2020 - Agu 2021 lalu pemulihan bertahap sampai Mar 2022."""
    a, b, c = dt.date(2020, 3, 22), dt.date(2021, 8, 31), dt.date(2022, 3, 31)
    if d < a or d > c:
        return 1.0, 1.0
    if d <= b:
        return 0.55, 0.35
    t = (d - b).days / (c - b).days
    return 0.55 + 0.45 * t, 0.35 + 0.65 * t


def label_minggu(d: dt.date) -> tuple[str, float]:
    """Nama khusus & pengali untuk Minggu liturgi tertentu."""
    ps = easter(d.year)
    if d == ps:
        return "Pesta Paskah", 2.4
    if d == ps + dt.timedelta(days=49):
        return "Pesta Pentakosta", 1.35
    if d.month == 1 and d.day <= 7:
        return "Minggu Tahun Baru", 1.25
    if d.month == 12 and 18 <= d.day <= 25:
        return "Minggu Natal", 1.9
    if d.month == 12 and d.day > 25:
        return "Minggu Akhir Tahun", 1.3
    if d.month in (6, 7):
        return "Minggu", 0.93
    return "Minggu", 1.0


# ----------------------------------------------------------------------------- generator
@dataclass
class Profil:
    id_huria: str
    jemaat: int
    base_pelean: float  # Rupiah per Minggu pada level 2026
    base_hadir: float


def hitung_profil(h: dict) -> Profil:
    jemaat = int(h.get("JumlahJemaat") or 0) or 600
    rng = rng_untuk("profil|" + h["IdHuria"])
    base_pelean = jemaat * 11500 * rng.uniform(0.9, 1.1)
    base_hadir = jemaat * 0.5
    # Jika huria sudah punya data 2026, ikuti level yang nyata agar riwayat menyambung mulus.
    kat = {k["IdKategori"]: k["NamaKategori"] for k in (h.get("KategoriPemasukan") or [])}
    nominal = sorted(p["Nominal"] for p in (h.get("PemasukanJemaat") or [])
                     if kat.get(p.get("IdKategori"), "").startswith("Pelean Minggu"))
    if len(nominal) >= 8:
        base_pelean = float(nominal[len(nominal) // 2])
    per_hari: dict[str, int] = {}
    for s in (h.get("SesiIbadah") or []):
        per_hari[s["Tanggal"]] = per_hari.get(s["Tanggal"], 0) + int(s.get("JumlahHadir") or 0)
    if len(per_hari) >= 8:
        v = sorted(per_hari.values())
        base_hadir = float(v[len(v) // 2])
    return Profil(h["IdHuria"], jemaat, base_pelean, base_hadir)


def pelean_split(total: int) -> list[dict]:
    a = int(total * 0.45)
    b = int(total * 0.15)
    c = int(total * 0.25)
    return [{"Jenis": "1a", "Nominal": a}, {"Jenis": "1b", "Nominal": b},
            {"Jenis": "2a", "Nominal": c}, {"Jenis": "2b", "Nominal": total - a - b - c}]


class Pembangun:
    """Membangun data keuangan satu huria untuk rentang tanggal tertentu."""

    def __init__(self, huria: dict, profil: Profil, awal: dt.date, akhir: dt.date, tahun_mingguan_sejak: int,
                 ringkas_sebelum: int = 0, akhir_global: dt.date | None = None):
        self.h, self.p, self.awal, self.akhir = huria, profil, awal, akhir
        self.akhir_global = akhir_global or akhir
        self.sejak = tahun_mingguan_sejak
        self.ringkas = ringkas_sebelum
        self.rng = rng_untuk("data|" + profil.id_huria + "|" + awal.isoformat())
        self.sesi, self.trx, self.alok = [], [], []
        self.setoran, self.rincian = [], []
        self._pusat_per_bulan: dict[str, list[tuple[str, int]]] = {}

    # -- pencatatan transaksi + alokasi 55/45 (sesuai aturan backend AddPemasukan)
    def _tambah_trx(self, kode: str, tanggal: dt.date, nominal: int, kat: str, ket: str):
        if nominal <= 0 or tanggal > self.akhir or tanggal < self.awal:
            return
        idt = f"T-{self.p.id_huria}-{tanggal.isoformat()}-{kode}"
        self.trx.append({"IdTransaksi": idt, "Tanggal": tanggal.isoformat(), "Nominal": nominal,
                         "IdKategori": kat, "Keterangan": ket})
        pusat = int(round(nominal * 0.55))
        ida = f"A-{self.p.id_huria}-{tanggal.isoformat()}-{kode}"
        self.alok.append({"IdAlokasi": ida + "-P", "IdTransaksi": idt, "Peruntukan": "Setoran Pusat", "Nominal": pusat})
        self.alok.append({"IdAlokasi": ida + "-K", "IdTransaksi": idt, "Peruntukan": "Kas Huria", "Nominal": nominal - pusat})
        self._pusat_per_bulan.setdefault(tanggal.isoformat()[:7], []).append((ida + "-P", pusat))

    def _skala(self, d: dt.date, mult: float = 1.0) -> tuple[float, float]:
        fp, fh = faktor_tahun(d.year)
        cp, ch = faktor_covid(d)
        return self.p.base_pelean * fp * cp * mult, self.p.base_hadir * fh * ch * mult

    def bangun(self) -> "Pembangun":
        r = self.rng
        # 1) Pelean Minggu: hitung deret mingguan lalu catat mingguan atau rekap bulanan
        per_grup: dict[str, list[tuple[dt.date, int, int, str]]] = {}
        for d in minggu_dalam(self.awal, self.akhir):
            nama, mult = label_minggu(d)
            acak = 1.0 + r.uniform(-0.07, 0.07)
            pel, had = self._skala(d, mult * acak)
            kunci = f"{d.year}-Q{(d.month - 1) // 3 + 1}" if d.year < self.ringkas else d.isoformat()[:7]
            per_grup.setdefault(kunci, []).append((d, bulatkan(pel), int(had), nama))
        for kunci, daftar in per_grup.items():
            if daftar[0][0].year >= self.sejak:  # --- rinci mingguan
                for d, nom, had, nama in daftar:
                    self._tambah_trx("PM", d, nom, "K-01", f"Pelean {nama} ({d.isoformat()})")
                    self.sesi.append({"IdSesi": f"S-{self.p.id_huria}-{d.isoformat()}-1",
                                      "NamaSesi": "Ibadah Minggu" if nama == "Minggu" else f"Ibadah {nama}",
                                      "Tanggal": d.isoformat(), "JamMulai": "08:00",
                                      "JumlahHadir": had, "Pelean": pelean_split(nom)})
            else:  # --- rekap bulanan / triwulanan (tanggal = Minggu terakhir periode itu)
                d = daftar[-1][0]
                nom = sum(x[1] for x in daftar)
                had = sum(x[2] for x in daftar)
                jenis = "triwulan" if "Q" in kunci else "bulan"
                self._tambah_trx("PM", d, nom, "K-01", f"Rekap Pelean Minggu {jenis} {kunci} ({len(daftar)} Minggu)")
                self.sesi.append({"IdSesi": f"S-{self.p.id_huria}-{d.isoformat()}-1",
                                  "NamaSesi": f"Rekap Ibadah Minggu {jenis.capitalize()} {kunci}",
                                  "Tanggal": d.isoformat(), "JamMulai": "08:00",
                                  "JumlahHadir": had, "Pelean": pelean_split(nom)})
        # 2) Kategori lain
        for tahun in range(self.awal.year, self.akhir.year + 1):
            self._kategori_lain(tahun, rinci=tahun >= self.sejak, ringkas=tahun < self.ringkas)
        # 3) Setoran Pusat bulanan (tanggal 5 bulan berikutnya, hanya bila sudah lewat)
        for bulan in sorted(self._pusat_per_bulan):
            thn, bln = int(bulan[:4]), int(bulan[5:])
            tgl = dt.date(thn + (bln == 12), bln % 12 + 1, 5)
            if tgl > self.akhir_global:
                continue  # bulan berjalan belum disetor (sama seperti data contoh)
            ids = f"SP-{self.p.id_huria}-{bulan}"
            total = 0
            for n, (ida, nom) in enumerate(self._pusat_per_bulan[bulan], 1):
                self.rincian.append({"IdRincian": f"R-{self.p.id_huria}-{bulan}-{n:03d}", "IdSetoran": ids,
                                     "IdAlokasi": ida, "NominalDilunasi": nom})
                total += nom
            self.setoran.append({"IdSetoran": ids, "Periode": bulan, "TanggalSetor": tgl.isoformat(),
                                 "TotalSetoran": total,
                                 "Keterangan": f"Sentralisasi Keuangan Hatopan HKBP Bulan {bulan}"})
        return self

    def _kategori_lain(self, tahun: int, rinci: bool, ringkas: bool = False):
        r, b = self.rng, self.p.base_pelean
        a0 = max(self.awal, dt.date(tahun, 1, 1))
        z0 = min(self.akhir, dt.date(tahun, 12, 31))
        if a0 > z0:
            return

        def minggu_ke(bln: int, urut: int):
            ms = [d for d in minggu_dalam(dt.date(tahun, bln, 1), dt.date(tahun, bln, 28) + dt.timedelta(days=4))
                  if d.month == bln]
            return ms[min(urut, len(ms) - 1)]

        def nilai(mult):
            return bulatkan(self._skala(dt.date(tahun, 6, 1), mult * r.uniform(0.85, 1.15))[0])

        if ringkas:  # tingkat ringkas: satu catatan per kategori per tahun
            self._tambah_trx("IT", minggu_ke(3, 0), nilai(15.6), "K-02", f"Rekap Guguan / Iuran Taon Jemaat {tahun}")
            self._tambah_trx("HM", minggu_ke(6, 1), nilai(8.0), "K-03", f"Rekap Hamuliateon {tahun}")
            self._tambah_trx("LG", minggu_ke(9, 2), nilai(3.6), "K-05", f"Rekap Pelean Partangiangan Lunggu {tahun}")
            self._tambah_trx("GT", minggu_ke(8, 3), nilai(7.5), "K-04", f"Pesta Gotilon Huria {tahun}")
            self._tambah_trx("UB", easter(tahun), nilai(2.8), "K-06", f"Rekap Pelean Ulaon Na Badia {tahun}")
            self._tambah_trx("WD", minggu_ke(6, 3), nilai(1.2), "K-07", f"Rekap Pelean Pamasumasuon {tahun}")
            self._tambah_trx("BP", minggu_ke(5, 3), nilai(0.5), "K-08", f"Rekap Pelean Tardidi {tahun}")
            return
        bulan_iuran = range(1, 13) if rinci else (3, 6, 9, 12)
        for m in bulan_iuran:
            kali = 1.3 if rinci else 3.9
            self._tambah_trx("IT", minggu_ke(m, 0), nilai(kali), "K-02", f"Guguan / Iuran Taon Jemaat Periode {tahun}-{m:02d}")
        for m in (range(1, 13) if rinci else (3, 6, 9, 12)):
            kali = 0.6 if rinci else 1.8
            extra = 1.8 if m == 12 else 1.0
            self._tambah_trx("HM", minggu_ke(m, 1), nilai(kali * extra), "K-03", "Ucapan Syukur Hamuliateon Keluarga / Parbagasan")
        for m in (range(1, 13) if rinci else (3, 6, 9, 12)):
            kali = 0.3 if rinci else 0.9
            self._tambah_trx("LG", minggu_ke(m, 2), nilai(kali), "K-05", "Pelean Gabungan Partangiangan Lunggu")
        self._tambah_trx("GT", minggu_ke(8, 3), nilai(7.5), "K-04", f"Pesta Gotilon Huria {tahun}")
        ps = easter(tahun)
        self._tambah_trx("UB", ps, nilai(1.2), "K-06", "Pelean Ulaon Na Badia - Perjamuan Kudus Paskah")
        self._tambah_trx("NT", dt.date(tahun, 12, 25), nilai(1.6), "K-06", "Pelean Ibadah Natal")
        if rinci:
            self._tambah_trx("UB2", minggu_ke(10, 0), nilai(0.4), "K-06", "Pelean Ulaon Na Badia - Perjamuan Kudus")
            for i in range(r.randint(2, 5)):
                self._tambah_trx(f"WD{i}", minggu_ke(r.randint(1, 12), r.randint(0, 3)), nilai(0.3),
                                 "K-07", "Pelean Ibadah Pamasumasuon (Pernikahan)")
            for i in range(r.randint(2, 4)):
                self._tambah_trx(f"BP{i}", minggu_ke(r.randint(1, 12), r.randint(0, 3)), nilai(0.15),
                                 "K-08", "Pelean Tardidi (Baptisan Kudus)")
        else:
            self._tambah_trx("WD", minggu_ke(6, 3), nilai(1.2), "K-07", f"Rekap Pelean Pamasumasuon {tahun}")
            self._tambah_trx("BP", minggu_ke(5, 3), nilai(0.5), "K-08", f"Rekap Pelean Tardidi {tahun}")


# ----------------------------------------------------------------------------- struktur
def tambah_struktur(pohon: dict, per_resort: int) -> list[str]:
    """Mengisi distrik tanpa resort & menambah huria sampai per_resort. Mengembalikan log."""
    log = []
    for dis in pohon["Pusat"]["Distrik"]:
        if not (dis.get("Resort") or []):
            for nama_res, nama_huria in RESORT_BARU.get(dis["NamaDistrik"], []):
                dis.setdefault("Resort", [])
                dis["Resort"] = (dis["Resort"] or []) + [{
                    "NamaResort": nama_res,
                    "NamaPendetaResort": f"{NAMA_DEPAN[len(nama_res) % len(NAMA_DEPAN)]} {MARGA[len(nama_res) % len(MARGA)]}, M.Th",
                    "Huria": [], "_calon": nama_huria}]
                log.append(f"+ resort {nama_res} di {dis['NamaDistrik']}")
    semua = {h["IdHuria"] for d in pohon["Pusat"]["Distrik"] for r in (d.get("Resort") or []) for h in (r.get("Huria") or [])}
    for dis in pohon["Pusat"]["Distrik"]:
        m = __import__("re").search(r"(\d+)", dis.get("KodeDistrik") or "")
        dnum = int(m.group(1)) if m else 99
        for rseq, res in enumerate(dis.get("Resort") or [], 1):
            res["Huria"] = res.get("Huria") or []
            calon = list(res.pop("_calon", None) or HURIA_CADANGAN.get(res["NamaResort"], []))
            ada = {h["NamaHuria"] for h in res["Huria"]}
            k = 0
            while len(res["Huria"]) < per_resort:
                k += 1
                nama = next((c for c in calon if c not in ada), None) or f"HKBP {res['NamaResort'].replace('Resort ', '')} {k + 10}"
                ida = f"HK-{dnum:02d}-{rseq:02d}-{k:02d}"
                while ida in semua:
                    k += 1
                    ida = f"HK-{dnum:02d}-{rseq:02d}-{k:02d}"
                rr = rng_untuk("huria|" + ida)
                jemaat = rr.randint(260, 1250)
                res["Huria"].append({
                    "NamaHuria": nama, "IdHuria": ida, "JumlahJemaat": jemaat,
                    "TahunBerdiri": str(rr.randint(1925, 1995)),
                    "NamaPendetaPimpinan": f"{rr.choice(NAMA_DEPAN)} {rr.choice(MARGA)}, M.Th",
                    "KepalaKeluarga": f"{int(jemaat / 3.8)} KK",
                    "LokasiHuria": f"Jl. {rr.choice(['Merdeka','Diponegoro','Gereja','Pasar','Sisingamangaraja','Kartini'])} No. {rr.randint(1, 120)}, {res['NamaResort'].replace('Resort ', '')}",
                })
                semua.add(ida)
                ada.add(nama)
                log.append(f"+ huria {nama} ({ida}) di {res['NamaResort']}")
    return log


def lengkapi_profil(h: dict, resort: dict, warta_contoh: dict):
    rr = rng_untuk("profil-lengkap|" + h["IdHuria"])
    if not h.get("JumlahJemaat"):
        h["JumlahJemaat"] = rr.randint(260, 1250)
    j = h["JumlahJemaat"]
    h.setdefault("KepalaKeluarga", "")
    if not h["KepalaKeluarga"]:
        h["KepalaKeluarga"] = f"{int(j / 3.8)} KK"
    if not h.get("TahunBerdiri"):
        h["TahunBerdiri"] = str(rr.randint(1925, 1995))
    if not h.get("NamaPendetaPimpinan"):
        h["NamaPendetaPimpinan"] = f"{rr.choice(NAMA_DEPAN)} {rr.choice(MARGA)}, M.Th"
    if not h.get("LokasiHuria"):
        h["LokasiHuria"] = f"Jl. Gereja No. {rr.randint(1, 120)}, {resort['NamaResort'].replace('Resort ', '')}"
    ada = {k["IdKategori"] for k in (h.get("KategoriPemasukan") or [])}
    h["KategoriPemasukan"] = (h.get("KategoriPemasukan") or []) + [
        {"IdKategori": k, "NamaKategori": n, "IdKategoriInduk": ""} for k, n in KATEGORI if k not in ada]
    if not h.get("Lunggu"):
        h["Lunggu"] = [{"IdLunggu": f"L-{h['IdHuria']}-{i:02d}", "NamaLunggu": n, "Keterangan": k}
                       for i, (n, k) in enumerate(LUNGGU, 1)]
    w = h.get("WartaJemaat") or {}
    if not (w.get("Tema") or w.get("TataIbadah")):
        h["WartaJemaat"] = copy.deepcopy(warta_contoh)
    for f in ("SesiIbadah", "PemasukanJemaat", "AlokasiTransaksi", "SetoranPusat", "RincianSetoranPusat"):
        h[f] = h.get(f) or []


def tanggal_awal_data(h: dict) -> dt.date | None:
    ds = [p["Tanggal"] for p in (h.get("PemasukanJemaat") or [])] + [s["Tanggal"] for s in (h.get("SesiIbadah") or [])] \
        + [s["TanggalSetor"] for s in (h.get("SetoranPusat") or [])]
    return min(ke_date(x) for x in ds) if ds else None


def isi_huria(h: dict, awal: dt.date, akhir: dt.date, sejak: int, ringkas: int = 0) -> dict:
    prof = hitung_profil(h)
    mulai_data = tanggal_awal_data(h)
    batas = akhir if mulai_data is None else mulai_data - dt.timedelta(days=1)
    thn = str(h.get("TahunBerdiri") or "").strip()
    if thn.isdigit() and int(thn) > awal.year:  # huria belum berdiri pada tahun awal rentang
        awal = dt.date(int(thn), 1, 1)
    if mulai_data is not None and mulai_data <= dt.date(awal.year, 12, 31):
        return {"trx": 0}  # riwayat sudah ada (skrip pernah dijalankan) -> aman diulang
    if awal > batas:
        return {"trx": 0}
    b = Pembangun(h, prof, awal, batas, sejak, ringkas, akhir).bangun()
    h["SesiIbadah"] = b.sesi + h["SesiIbadah"]
    h["PemasukanJemaat"] = b.trx + h["PemasukanJemaat"]
    h["AlokasiTransaksi"] = b.alok + h["AlokasiTransaksi"]
    h["SetoranPusat"] = b.setoran + h["SetoranPusat"]
    h["RincianSetoranPusat"] = b.rincian + h["RincianSetoranPusat"]
    return {"trx": len(b.trx)}


# ----------------------------------------------------------------------------- validasi
def validasi_huria(h: dict) -> list[str]:
    err, idh = [], h["IdHuria"]
    trx = {t["IdTransaksi"]: t["Nominal"] for t in h["PemasukanJemaat"]}
    if len(trx) != len(h["PemasukanJemaat"]):
        err.append(f"{idh}: IdTransaksi ganda")
    al_sum, al_id = {}, {}
    for a in h["AlokasiTransaksi"]:
        al_sum[a["IdTransaksi"]] = al_sum.get(a["IdTransaksi"], 0) + a["Nominal"]
        al_id[a["IdAlokasi"]] = a["Nominal"]
    for k, v in trx.items():
        if al_sum.get(k) != v:
            err.append(f"{idh}: alokasi {k} != nominal")
            break
    kat = {k["IdKategori"] for k in h["KategoriPemasukan"]}
    if any(t["IdKategori"] not in kat for t in h["PemasukanJemaat"]):
        err.append(f"{idh}: kategori tidak terdaftar")
    lunas, tot_rinci = {}, {}
    for r in h["RincianSetoranPusat"]:
        lunas[r["IdAlokasi"]] = lunas.get(r["IdAlokasi"], 0) + r["NominalDilunasi"]
        tot_rinci[r["IdSetoran"]] = tot_rinci.get(r["IdSetoran"], 0) + r["NominalDilunasi"]
    if any(v > al_id.get(k, -1) for k, v in lunas.items()):
        err.append(f"{idh}: pelunasan melebihi alokasi")
    for s in h["SetoranPusat"]:
        if tot_rinci.get(s["IdSetoran"], 0) != s["TotalSetoran"]:
            err.append(f"{idh}: total setoran {s['IdSetoran']} != rincian")
            break
    kk = {k["IdKategori"]: k["NamaKategori"] for k in h["KategoriPemasukan"]}
    pel_t, pel_s = {}, {}
    for t in h["PemasukanJemaat"]:
        if kk.get(t["IdKategori"], "").startswith("Pelean Minggu"):
            pel_t[t["Tanggal"]] = pel_t.get(t["Tanggal"], 0) + t["Nominal"]
    for s in h["SesiIbadah"]:
        pel_s[s["Tanggal"]] = pel_s.get(s["Tanggal"], 0) + sum(p["Nominal"] for p in s["Pelean"])
    if pel_t != pel_s:
        err.append(f"{idh}: pelean sesi != transaksi Pelean Minggu")
    return err


def ukuran_byte(doc: dict) -> int:
    return len(bson.encode(doc))


# ----------------------------------------------------------------------------- proses utama
def semua_huria(pohon):
    for d in pohon["Pusat"]["Distrik"]:
        for r in d.get("Resort") or []:
            for h in r.get("Huria") or []:
                yield d, r, h


def susun(pohon: dict, mulai: int, akhir: dt.date, per_resort: int, tahun_mingguan: int, ringkas: int = 0):
    """Mengubah `pohon` di tempat. Mengembalikan (log_struktur, jumlah_trx)."""
    log = tambah_struktur(pohon, per_resort)
    warta = next((h["WartaJemaat"] for _, _, h in semua_huria(pohon)
                  if (h.get("WartaJemaat") or {}).get("TataIbadah")), WARTA_DEFAULT)
    sejak = akhir.year - tahun_mingguan + 1
    total = 0
    for _, r, h in semua_huria(pohon):
        lengkapi_profil(h, r, warta)
        total += isi_huria(h, dt.date(mulai, 1, 1), akhir, sejak, ringkas)["trx"]
    return log, total


def pilih_mulai_auto(pohon_asli: dict, akhir: dt.date, per_resort: int, tahun_mingguan: int, batas_mb: float, ringkas: int = 0) -> int:
    for mulai in range(2000, akhir.year + 1):
        p = copy.deepcopy(pohon_asli)
        susun(p, mulai, akhir, per_resort, tahun_mingguan, ringkas)
        if ukuran_byte(p) <= batas_mb * 1024 * 1024:
            return mulai
    return akhir.year


def sinkron_master(db, pohon: dict) -> list[str]:
    """Memastikan koleksi distrik/resort/huria punya dokumen untuk setiap entitas di pohon."""
    log, now = [], dt.datetime.now(dt.timezone.utc)
    cd, cr, ch = db["distrik"], db["resort"], db["huria"]
    for d in pohon["Pusat"]["Distrik"]:
        md = cd.find_one({"$or": [{"Kode": d.get("KodeDistrik")}, {"Nama": d["NamaDistrik"]}]})
        if md is None:
            oid = ObjectId(d["IdDistrik"]) if d.get("IdDistrik") and ObjectId.is_valid(d["IdDistrik"]) else ObjectId()
            cd.insert_one({"_id": oid, "Kode": d.get("KodeDistrik") or f"DIS-{oid}", "Nama": d["NamaDistrik"],
                           "NamaPraeses": d.get("NamaPraeses", ""), "Aktif": True, "DibuatPada": now, "DiubahPada": now})
            md = cd.find_one({"_id": oid})
            log.append(f"master distrik baru: {d['NamaDistrik']}")
        d["IdDistrik"] = str(md["_id"])
        for res in d.get("Resort") or []:
            mr = cr.find_one({"$or": [{"Kode": res.get("KodeResort")}, {"IdDistrik": md["_id"], "Nama": res["NamaResort"]}]}) \
                if res.get("KodeResort") else cr.find_one({"IdDistrik": md["_id"], "Nama": res["NamaResort"]})
            if mr is None:
                kode = res.get("KodeResort") or f"RES-{cr.count_documents({}) + 1:02d}"
                while cr.find_one({"Kode": kode}):
                    kode = f"RES-{int(kode[4:]) + 1:02d}"
                mr = {"_id": ObjectId(), "Kode": kode, "Nama": res["NamaResort"],
                      "NamaPendetaResort": res.get("NamaPendetaResort", ""), "IdDistrik": md["_id"],
                      "Aktif": True, "DibuatPada": now, "DiubahPada": now}
                cr.insert_one(mr)
                log.append(f"master resort baru: {res['NamaResort']} ({kode})")
            res["IdResort"], res["KodeResort"] = str(mr["_id"]), mr["Kode"]
            for h in res.get("Huria") or []:
                if ch.find_one({"Kode": h["IdHuria"]}) is None and \
                        ch.find_one({"IdResort": mr["_id"], "Nama": h["NamaHuria"]}) is None:
                    ch.insert_one({"_id": ObjectId(), "Kode": h["IdHuria"], "Nama": h["NamaHuria"],
                                   "LokasiHuria": h.get("LokasiHuria", ""), "TahunBerdiri": h.get("TahunBerdiri", ""),
                                   "NamaPendetaPimpinan": h.get("NamaPendetaPimpinan", ""),
                                   "JumlahJemaat": h.get("JumlahJemaat", 0), "KepalaKeluarga": h.get("KepalaKeluarga", ""),
                                   "IdResort": mr["_id"], "IdDistrik": md["_id"], "Aktif": True,
                                   "DibuatPada": now, "DiubahPada": now})
                    log.append(f"master huria baru: {h['NamaHuria']}")
    return log


def jalankan(db, args) -> int:
    docs = list(db["HKBP"].find({}))
    if len(docs) != 1:
        print(f"GAGAL: koleksi HKBP harus berisi tepat 1 dokumen pusat, ditemukan {len(docs)}. "
              "Jalankan backend Go sekali / seeder dahulu.")
        return 1
    asli = docs[0]
    akhir = ke_date(args.akhir)
    pohon = copy.deepcopy(asli)
    pohon.pop("_id", None)
    batas_mb = args.batas_mb
    if args.mulai == "auto":
        mulai = pilih_mulai_auto(pohon, akhir, args.huria_per_resort, args.tahun_mingguan, batas_mb, args.ringkas_sebelum)
        print(f"[auto] tahun paling awal yang muat dalam {batas_mb} MB: {mulai}")
    else:
        mulai = int(args.mulai)
    log, jml_trx = susun(pohon, mulai, akhir, args.huria_per_resort, args.tahun_mingguan, args.ringkas_sebelum)

    galat = [e for _, _, h in semua_huria(pohon) for e in validasi_huria(h)]
    ukuran = ukuran_byte(pohon)
    n_huria = sum(1 for _ in semua_huria(pohon))
    kosong = [h["NamaHuria"] for _, _, h in semua_huria(pohon) if not h["PemasukanJemaat"]]
    print("=" * 64)
    print(f"Rentang data        : {mulai}-01-01 s.d. {akhir}")
    print(f"Mingguan rinci sejak: {akhir.year - args.tahun_mingguan + 1}; rekap bulanan {args.ringkas_sebelum}-{akhir.year - args.tahun_mingguan}; rekap triwulan sebelum {args.ringkas_sebelum}")
    print(f"Distrik/Resort/Huria: {len(pohon['Pusat']['Distrik'])} / "
          f"{sum(len(d.get('Resort') or []) for d in pohon['Pusat']['Distrik'])} / {n_huria}")
    print(f"Transaksi baru      : {jml_trx:,}")
    print(f"Ukuran dokumen HKBP : {ukuran / 1024 / 1024:.2f} MB (batas MongoDB 16 MB)")
    print(f"Huria tanpa data    : {len(kosong)}")
    print(f"Pelanggaran aturan  : {len(galat)}")
    print("Perubahan struktur  :", *(log[:12] or ["-"]), sep="\n   ")
    if len(log) > 12:
        print(f"   ... dan {len(log) - 12} lainnya")
    print("=" * 64)
    if galat:
        print("GAGAL validasi:", *galat[:10], sep="\n  ")
        return 2
    if ukuran > BATAS_DOKUMEN_BYTE - 512 * 1024:
        print("DITOLAK: dokumen terlalu besar untuk MongoDB. Pilih --mulai lebih baru, "
              "kurangi --huria-per-resort, atau pakai --mulai auto.")
        return 3
    if args.dry_run:
        print("Dry-run selesai. Tidak ada perubahan yang ditulis.")
        return 0
    if not args.yes:
        if input("Tulis ke database sekarang? (backup otomatis dibuat) ketik YA: ").strip() != "YA":
            print("Dibatalkan.")
            return 0
    stamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    if not args.tanpa_backup:
        db[f"HKBP_backup_{stamp}"].insert_one(asli)
        print(f"Backup dibuat: koleksi HKBP_backup_{stamp}")
    sinkron_log = sinkron_master(db, pohon)
    for x in sinkron_log[:10]:
        print("  ", x)
    ukuran = ukuran_byte(pohon)
    if ukuran > BATAS_DOKUMEN_BYTE - 256 * 1024:
        print("DITOLAK setelah sinkron master: dokumen terlalu besar.")
        return 3
    hasil = db["HKBP"].replace_one({"_id": asli["_id"]}, pohon)
    print(f"Selesai. Dokumen HKBP diperbarui (cocok={hasil.matched_count}, ubah={hasil.modified_count}).")
    print("Restart backend Go dan refresh browser (Ctrl+F5).")
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Melengkapi data HKBP di MongoDB")
    ap.add_argument("--mulai", default="auto", help="tahun awal (mis. 2015) atau 'auto' = paling awal yang muat")
    ap.add_argument("--akhir", default=AKHIR_DEFAULT, help="tanggal akhir data (YYYY-MM-DD)")
    ap.add_argument("--huria-per-resort", type=int, default=4)
    ap.add_argument("--tahun-mingguan", type=int, default=1, help="jumlah tahun terakhir yang dirinci per Minggu")
    ap.add_argument("--ringkas-sebelum", type=int, default=2025, help="tahun sebelum ini memakai rekap triwulanan (0 = tidak dipakai)")
    ap.add_argument("--batas-mb", type=float, default=14.5, help="target ukuran dokumen untuk mode auto")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--yes", action="store_true", help="lewati pertanyaan konfirmasi")
    ap.add_argument("--tanpa-backup", action="store_true")
    args = ap.parse_args(argv)
    from app.db import get_database  # baca MONGO_URI/MONGO_DB dari analytics/.env
    return jalankan(get_database(), args)


if __name__ == "__main__":
    sys.exit(main())
