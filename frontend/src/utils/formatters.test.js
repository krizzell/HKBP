import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportToCSV, getISOWeek, formatRupiah, formatCompactRupiah } from './formatters'

describe('formatters - exportToCSV in Node environment', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    const mockAnchor = {
      setAttribute: vi.fn(),
      click: vi.fn(),
    }
    globalThis.alert = vi.fn()
    globalThis.document = {
      createElement: vi.fn(() => mockAnchor),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    }
    globalThis.URL = {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    }
  })

  it('alerts when data is null, undefined, or empty', () => {
    exportToCSV(null)
    expect(globalThis.alert).toHaveBeenCalledWith('Tidak ada data untuk diekspor')

    exportToCSV([])
    expect(globalThis.alert).toHaveBeenCalledWith('Tidak ada data untuk diekspor')

    exportToCSV('')
    expect(globalThis.alert).toHaveBeenCalledWith('Tidak ada data untuk diekspor')
  })

  it('creates blob and triggers download for pre-formatted CSV string', () => {
    const csvString = '"Kolom 1","Kolom 2"\r\n"Nilai 1","Nilai 2"'

    exportToCSV(csvString, 'test_ekspor.csv')

    expect(globalThis.URL.createObjectURL).toHaveBeenCalled()
    expect(globalThis.document.body.appendChild).toHaveBeenCalled()
    expect(globalThis.document.body.removeChild).toHaveBeenCalled()
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('creates blob and triggers download for array of objects', () => {
    const data = [
      { nama: 'HKBP Sudirman', nominal: 1000000 },
      { nama: 'HKBP Tebet', nominal: 2000000 },
    ]

    exportToCSV(data, 'komparasi.csv')

    expect(globalThis.URL.createObjectURL).toHaveBeenCalled()
    expect(globalThis.document.body.appendChild).toHaveBeenCalled()
    expect(globalThis.document.body.removeChild).toHaveBeenCalled()
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })
})

describe('formatters - getISOWeek & helpers', () => {
  it('calculates ISO week number correctly', () => {
    expect(getISOWeek('2026-01-01')).toBeGreaterThanOrEqual(1)
    expect(getISOWeek('2026-10-20')).toBe(43)
  })

  it('formats Rupiah values', () => {
    expect(formatRupiah(1500000)).toContain('1.500.000')
    expect(formatCompactRupiah(1500000).toLowerCase()).toContain('jt')
  })
})
