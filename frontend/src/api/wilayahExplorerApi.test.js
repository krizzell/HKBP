import { describe, it, expect } from 'vitest'
import {
  getWilayahAnak,
  getWilayahDetail,
  getHuriaRingkasan,
  getHuriaSesiIbadah,
  getHuriaPemasukan,
  getHuriaAlokasi,
  getHuriaLunggu,
  getHuriaWarta,
} from './wilayahExplorerApi'

describe('wilayahExplorerApi', () => {
  it('returns at least 6 distriks with long name, inactive, and without leader', async () => {
    const res = await getWilayahAnak({ level: 'distrik' })
    expect(res.data.length).toBeGreaterThanOrEqual(6)

    // Distrik dengan nama sangat panjang
    const longName = res.data.find((d) => d.nama.length > 40)
    expect(longName).toBeDefined()

    // Distrik nonaktif
    const inactive = res.data.find((d) => d.aktif === false)
    expect(inactive).toBeDefined()

    // Distrik tanpa pimpinan
    const noLeader = res.data.find((d) => !d.namaPimpinan)
    expect(noLeader).toBeDefined()

    // Ringkasan KPI tersedia
    expect(res.ringkasan).toBeDefined()
    expect(res.ringkasan.totalPemasukan).toBeGreaterThan(0)
    expect(res.ringkasan.totalJemaat).toBeGreaterThan(0)
  })

  it('paginates 45 huria in resort r-01-01 (20 per page)', async () => {
    // Halaman 1
    const p1 = await getWilayahAnak({
      level: 'huria',
      idInduk: 'r-01-01',
      page: 1,
      limit: 20,
    })
    expect(p1.total).toBe(45)
    expect(p1.data.length).toBe(20)
    expect(p1.page).toBe(1)

    // Halaman 2
    const p2 = await getWilayahAnak({
      level: 'huria',
      idInduk: 'r-01-01',
      page: 2,
      limit: 20,
    })
    expect(p2.data.length).toBe(20)

    // Halaman 3 (sisa 5 item)
    const p3 = await getWilayahAnak({
      level: 'huria',
      idInduk: 'r-01-01',
      page: 3,
      limit: 20,
    })
    expect(p3.data.length).toBe(5)
  })

  it('filters by status and search query', async () => {
    // Filter aktif
    const aktifRes = await getWilayahAnak({ level: 'distrik', status: 'aktif' })
    expect(aktifRes.data.every((d) => d.aktif === true)).toBe(true)

    // Filter nonaktif
    const nonaktifRes = await getWilayahAnak({ level: 'distrik', status: 'nonaktif' })
    expect(nonaktifRes.data.every((d) => d.aktif === false)).toBe(true)
    expect(nonaktifRes.data.length).toBeGreaterThan(0)

    // Search query
    const searchRes = await getWilayahAnak({ level: 'distrik', q: 'Silindung' })
    expect(searchRes.data.length).toBe(1)
    expect(searchRes.data[0].nama).toContain('Silindung')
  })

  it('provides ancestors (leluhur) for breadcrumbs in getWilayahDetail', async () => {
    const huriaDetail = await getWilayahDetail('huria', 'h-01-01-01')
    expect(huriaDetail).toBeDefined()
    expect(huriaDetail.leluhur).toHaveLength(2)
    expect(huriaDetail.leluhur[0].level).toBe('distrik')
    expect(huriaDetail.leluhur[1].level).toBe('resort')
  })

  it('provides data for all 6 huria detail tabs', async () => {
    const huriaId = 'h-01-01-01'
    const ringkasan = await getHuriaRingkasan(huriaId)
    expect(ringkasan.profil.lokasi).toBeDefined()
    expect(ringkasan.ringkasan.trenMingguan.length).toBeGreaterThan(0)

    const sesi = await getHuriaSesiIbadah(huriaId)
    expect(sesi.daftar.length).toBeGreaterThan(0)
    expect(sesi.kehadiranPerSesi.length).toBeGreaterThan(0)

    const pemasukan = await getHuriaPemasukan(huriaId)
    expect(pemasukan.komposisiKategori.length).toBeGreaterThan(0)
    expect(pemasukan.rincianPeleanPerSesi.kolomPelean).toContain('1A')

    const alokasi = await getHuriaAlokasi(huriaId)
    expect(alokasi.alokasiPersen).toBeDefined || expect(alokasi.alokasiPersentase).toBeDefined()
    expect(alokasi.daftarSetoran.length).toBeGreaterThan(0)

    const lunggu = await getHuriaLunggu(huriaId)
    expect(lunggu.length).toBeGreaterThanOrEqual(4)

    const warta = await getHuriaWarta(huriaId)
    expect(warta.tema).toBeDefined()
    expect(warta.tataIbadah.length).toBeGreaterThan(0)
  })
})
