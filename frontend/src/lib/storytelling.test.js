import { describe, expect, it } from 'vitest'
import {
  annotationsFor, computeKpis, drillLevel, easterDate, filterRows, isoWeekLabel, latestCompleteMonth, rankBy, toSankey,
} from './storytelling'

const row = (o) => ({ distrik: 'A', resort: 'R1', huria: 'H1', bulan: '2026-01', jumlahSesi: 8, totalHadir: 800, totalPelean: 8000,
  totalPemasukan: 10000, alokasiPusat: 5500, alokasiKas: 4500, setoranDibayar: 5500, ...o })

const cube = [
  row({ bulan: '2026-01' }), row({ bulan: '2026-02', totalPemasukan: 12000 }), row({ bulan: '2026-03', totalPemasukan: 15000 }),
  row({ bulan: '2026-04', jumlahSesi: 2, totalPemasukan: 3000 }),
  row({ huria: 'H2', resort: 'R2', distrik: 'B', setoranDibayar: 2750 }),
]

describe('storytelling', () => {
  it('filter silang menyaring distrik/resort/huria', () => {
    expect(filterRows(cube, { distrik: 'B', resort: null, huria: null, kategori: null })).toHaveLength(1)
    expect(filterRows(cube, { distrik: null, resort: 'R1', huria: null, kategori: null })).toHaveLength(4)
  })

  it('drill-down bergerak distrik > resort > huria', () => {
    expect(drillLevel({}).level).toBe('distrik')
    expect(drillLevel({ distrik: 'A' }).level).toBe('resort')
    expect(drillLevel({ distrik: 'A', resort: 'R1' }).level).toBe('huria')
  })

  it('ranking menjumlahkan dan menghitung porsi', () => {
    const r = rankBy(cube, {}, 'totalPemasukan')
    expect(r[0].key).toBe('A')
    expect(Math.round(r.reduce((s, x) => s + x.share, 0))).toBe(100)
  })

  it('bulan terakhir yang belum lengkap dilewati', () => {
    expect(latestCompleteMonth(cube).latest).toBe('2026-03')
  })

  it('KPI punya pembanding dan kepatuhan setoran dihitung', () => {
    const kpis = computeKpis(cube)
    expect(kpis).toHaveLength(4)
    kpis.forEach((k) => expect(k.comparisons.length).toBeGreaterThan(0))
    const kep = kpis.find((k) => k.id === 'kepatuhan')
    expect(kep.value).toBeGreaterThan(80)
    expect(kep.value).toBeLessThan(100)
  })

  it('Paskah 2026 jatuh pada 5 April dan minggu ISO-nya benar', () => {
    const d = easterDate(2026)
    expect(d.toISOString().slice(0, 10)).toBe('2026-04-05')
    expect(isoWeekLabel(d)).toBe('2026-W14')
  })

  it('anotasi menandai Paskah bila ada pada riwayat', () => {
    const history = [{ label: '2026-W13', value: 1 }, { label: '2026-W14', value: 9 }]
    expect(annotationsFor(history).map((a) => a.text)).toContain('Paskah')
  })

  it('sankey membentuk tautan tiga tingkat', () => {
    const aliran = [{ distrik: 'A', resort: 'R1', huria: 'H1', bulan: '2026-01', kategori: 'Pelean Minggu', peruntukan: 'Setoran Pusat', nominal: 55 },
      { distrik: 'A', resort: 'R1', huria: 'H1', bulan: '2026-01', kategori: 'Pelean Minggu', peruntukan: 'Kas Huria', nominal: 45 }]
    const s = toSankey(aliran, {})
    expect(s.links).toHaveLength(3)
    expect(s.levels['Setoran Pusat']).toBe(2)
  })
})
