import { describe, expect, it } from 'vitest'
import { defaultRangePeriod, resolvePeriod, getDropWindow } from './periodeRange'

describe('rentang periode visualisasi', () => {
  it('satu tahun menghasilkan 12 bulan', () => {
    const period = resolvePeriod({ mode: 'tahun', tahunAwal: '2026', tahunAkhir: '2026' })
    expect(period.start).toBe('2026-01-01')
    expect(period.slots).toHaveLength(12)
    expect(period.slotFor('2026-11-04')?.key).toBe('2026-11')
  })
  it('rentang tahun 2023–2026 menghasilkan 4 batang per tahun', () => {
    const period = resolvePeriod({ mode: 'tahun', tahunAwal: '2023', tahunAkhir: '2026' })
    expect(period.slots.map((x) => x.key)).toEqual(['2023','2024','2025','2026'])
    expect(period.slotFor('2022-12-31')).toBe(null)
  })
  it('rentang bulan lintas tahun benar dan inklusif', () => {
    const period = resolvePeriod({ mode: 'bulan', bulanAwal: '2025-11', bulanAkhir: '2026-02' })
    expect(period.start).toBe('2025-11-01')
    expect(period.end).toBe('2026-02-28')
    expect(period.slots).toHaveLength(4)
  })
  it('klik 4 atau 7 November masuk satu minggu penuh Senin-Minggu', () => {
    const period = resolvePeriod({ mode: 'minggu', startDate: '2026-11-04', endDate: '2026-11-07' })
    expect(period.start).toBe('2026-11-02')
    expect(period.end).toBe('2026-11-08')
    expect(period.slots).toHaveLength(1)
  })
  it('klik 7–11 November menghasilkan dua minggu', () => {
    const period = resolvePeriod({ mode: 'minggu', startDate: '2026-11-07', endDate: '2026-11-11' })
    expect(period.start).toBe('2026-11-02')
    expect(period.end).toBe('2026-11-15')
    expect(period.slots).toHaveLength(2)
    expect(getDropWindow({ mode: 'minggu', startDate: '2026-11-07', endDate: '2026-11-11' }).mulai).toBe('2026-10-26')
  })
  it('minggu akhir tahun memakai tahun ISO, bukan tahun kalender', () => {
    const period = resolvePeriod({ mode: 'minggu', startDate: '2021-01-01', endDate: '2021-01-03' })
    expect(period.start).toBe('2020-12-28')
    expect(period.slots[0].label).toContain('2020-W53')
    expect(period.slotFor('2020-12-31')).not.toBe(null)
  })
})
