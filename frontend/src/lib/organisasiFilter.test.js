import { describe, it, expect } from 'vitest'
import {
  LEVELS,
  MAX_SELECTION,
  EMPTY_SELECTION,
  resolveComparisonLevel,
  pruneSelection,
  enforceLimit,
  findExcludedParents,
  buildSummary,
  toQuery,
  fromQuery,
  pickTop,
} from './organisasiFilter'

// Mock Data Hierarki Wilayah HKBP dengan nama kembar untuk pengujian kasus tepi
const mockOptions = {
  distrik: [
    { id: 'D-1', nama: 'Distrik I Silindung' },
    { id: 'D-2', nama: 'Distrik II Humbang' },
    { id: 'D-3', nama: 'Distrik III Toba' },
  ],
  resort: [
    { id: 'R-1.1', nama: 'Resort Pearaja', idInduk: 'D-1', total: 50000000 },
    { id: 'R-1.2', nama: 'Resort Tarutung Kota', idInduk: 'D-1', total: 75000000 },
    { id: 'R-2.1', nama: 'Resort Dolok Sanggul', idInduk: 'D-2', total: 60000000 },
    { id: 'R-2.2', nama: 'Resort Lintongnihuta', idInduk: 'D-2', total: 40000000 },
    { id: 'R-3.1', nama: 'Resort Balige', idInduk: 'D-3', total: 90000000 },
  ],
  huria: [
    { id: 'H-1.1.1', nama: 'HKBP Pearaja', idInduk: 'R-1.1', total: 30000000 },
    { id: 'H-1.1.2', nama: 'HKBP Pardomuan', idInduk: 'R-1.1', total: 20000000 }, // Nama kembar di Resort Pearaja
    { id: 'H-2.1.1', nama: 'HKBP Dolok Sanggul Kota', idInduk: 'R-2.1', total: 45000000 },
    { id: 'H-2.1.2', nama: 'HKBP Pardomuan', idInduk: 'R-2.1', total: 15000000 }, // Nama kembar di Resort Dolok Sanggul
  ],
}

describe('organisasiFilter - resolveComparisonLevel', () => {
  it('mengembalikan null jika seleksi kosong, null, atau undefined', () => {
    expect(resolveComparisonLevel(null)).toBeNull()
    expect(resolveComparisonLevel(undefined)).toBeNull()
    expect(resolveComparisonLevel(EMPTY_SELECTION)).toBeNull()
    expect(resolveComparisonLevel({ distrik: [], resort: [], huria: [] })).toBeNull()
  })

  it('mengembalikan distrik jika hanya distrik yang dipilih', () => {
    const selected = { ...EMPTY_SELECTION, distrik: ['D-1', 'D-2'] }
    expect(resolveComparisonLevel(selected)).toBe('distrik')
  })

  it('mengembalikan resort jika distrik dan resort dipilih', () => {
    const selected = { ...EMPTY_SELECTION, distrik: ['D-1'], resort: ['R-1.1', 'R-1.2'] }
    expect(resolveComparisonLevel(selected)).toBe('resort')
  })

  it('mengembalikan huria sebagai level terdalam saat huria dipilih', () => {
    const selected = {
      ...EMPTY_SELECTION,
      distrik: ['D-1'],
      resort: ['R-1.1'],
      huria: ['H-1.1.1', 'H-1.1.2'],
    }
    expect(resolveComparisonLevel(selected)).toBe('huria')
  })
})

describe('organisasiFilter - pruneSelection', () => {
  it('menghapus semua turunan jika induk distrik dicabut', () => {
    const selected = {
      distrik: [], // Distrik kosong
      resort: ['R-1.1'],
      huria: ['H-1.1.1'],
    }

    const pruned = pruneSelection(selected, mockOptions)
    expect(pruned.distrik).toEqual([])
    expect(pruned.resort).toEqual([])
    expect(pruned.huria).toEqual([])
  })

  it('membuang resort yang induk distriknya tidak dicentang', () => {
    const selected = {
      distrik: ['D-1'], // Hanya D-1
      resort: ['R-1.1', 'R-2.1'], // R-2.1 milik D-2 (tidak dicentang)
      huria: ['H-1.1.1', 'H-2.1.1'], // H-2.1.1 milik R-2.1
    }

    const pruned = pruneSelection(selected, mockOptions)
    expect(pruned.distrik).toEqual(['D-1'])
    expect(pruned.resort).toEqual(['R-1.1'])
    expect(pruned.huria).toEqual(['H-1.1.1'])
  })

  it('membuang ID tidak valid yang tidak ada di daftar opsi', () => {
    const selected = {
      distrik: ['D-1', 'ID-PALSU'],
      resort: ['R-1.1', 'R-TIDAK-ADA'],
      huria: [],
    }

    const pruned = pruneSelection(selected, mockOptions)
    expect(pruned.distrik).toEqual(['D-1'])
    expect(pruned.resort).toEqual(['R-1.1'])
  })

  it('menangani kasus tepi nama kembar di induk berbeda secara independen', () => {
    // HKBP Pardomuan ada dua: H-1.1.2 di R-1.1 dan H-2.1.2 di R-2.1
    const selected = {
      distrik: ['D-1'], // Hanya D-1 yang dicentang
      resort: ['R-1.1'], // Hanya R-1.1 yang dicentang
      huria: ['H-1.1.2', 'H-2.1.2'], // Memilih kedua HKBP Pardomuan
    }

    const pruned = pruneSelection(selected, mockOptions)
    // H-1.1.2 tetap ada karena induknya R-1.1 dicentang
    // H-2.1.2 dibuang karena induknya R-2.1 tidak dicentang
    expect(pruned.huria).toEqual(['H-1.1.2'])
  })
})

describe('organisasiFilter - enforceLimit', () => {
  it('tidak memotong jika jumlah item di bawah atau sama dengan batas maksimal 6', () => {
    const ids = ['1', '2', '3']
    const result = enforceLimit(ids, MAX_SELECTION)
    expect(result.ids).toEqual(['1', '2', '3'])
    expect(result.isTruncated).toBe(false)
    expect(result.truncatedCount).toBe(0)
    expect(result.max).toBe(6)
  })

  it('memotong ke batas maksimal 6 jika item lebih dari 6 dan memberi tahu', () => {
    const ids = ['1', '2', '3', '4', '5', '6', '7', '8']
    const result = enforceLimit(ids, 6)
    expect(result.ids).toEqual(['1', '2', '3', '4', '5', '6'])
    expect(result.isTruncated).toBe(true)
    expect(result.truncatedCount).toBe(2)
  })

  it('menangani input array kosong dan non-array secara aman', () => {
    expect(enforceLimit([]).ids).toEqual([])
    expect(enforceLimit([]).isTruncated).toBe(false)
    expect(enforceLimit(null).ids).toEqual([])
  })
})

describe('organisasiFilter - findExcludedParents', () => {
  it('mengembalikan array kosong jika level perbandingan adalah distrik atau seleksi kosong', () => {
    expect(findExcludedParents(EMPTY_SELECTION, mockOptions)).toEqual([])
    expect(
      findExcludedParents({ ...EMPTY_SELECTION, distrik: ['D-1', 'D-2'] }, mockOptions)
    ).toEqual([])
  })

  it('mendeteksi distrik yang dicentang tetapi tidak punya resort terpilih', () => {
    const selected = {
      distrik: ['D-1', 'D-2'],
      resort: ['R-1.1', 'R-1.2'], // Semua resort berasal dari D-1, tidak ada dari D-2
      huria: [],
    }

    const excluded = findExcludedParents(selected, mockOptions)
    expect(excluded).toHaveLength(1)
    expect(excluded[0]).toEqual({
      level: 'distrik',
      id: 'D-2',
      nama: 'Distrik II Humbang',
      reason: 'tidak ikut karena resort dipilih',
    })
  })

  it('mendeteksi induk bertingkat (distrik dan resort) yang tidak ikut pada level huria', () => {
    const selected = {
      distrik: ['D-1', 'D-2'],
      resort: ['R-1.1', 'R-1.2', 'R-2.1'],
      huria: ['H-1.1.1'], // Hanya huria di bawah R-1.1 (D-1)
    }

    const excluded = findExcludedParents(selected, mockOptions)
    // D-2 tidak punya huria terpilih
    // R-1.2 tidak punya huria terpilih
    // R-2.1 tidak punya huria terpilih
    expect(excluded).toContainEqual({
      level: 'distrik',
      id: 'D-2',
      nama: 'Distrik II Humbang',
      reason: 'tidak ikut karena huria dipilih',
    })
    expect(excluded).toContainEqual({
      level: 'resort',
      id: 'R-1.2',
      nama: 'Resort Tarutung Kota',
      reason: 'tidak ikut karena huria dipilih',
    })
    expect(excluded).toContainEqual({
      level: 'resort',
      id: 'R-2.1',
      nama: 'Resort Dolok Sanggul',
      reason: 'tidak ikut karena huria dipilih',
    })
  })

  it('mengembalikan array kosong jika semua induk memiliki turunan aktif', () => {
    const selected = {
      distrik: ['D-1', 'D-2'],
      resort: ['R-1.1', 'R-2.1'], // R-1.1 mewakili D-1, R-2.1 mewakili D-2
      huria: [],
    }

    const excluded = findExcludedParents(selected, mockOptions)
    expect(excluded).toEqual([])
  })
})

describe('organisasiFilter - buildSummary', () => {
  it('menampilkan petunjuk awal jika belum ada wilayah yang dipilih', () => {
    expect(buildSummary(null, EMPTY_SELECTION)).toBe(
      'Pilih minimal satu wilayah untuk mulai membandingkan'
    )
    expect(buildSummary('distrik', { distrik: [] })).toBe(
      'Pilih minimal satu wilayah untuk mulai membandingkan'
    )
  })

  it('menampilkan ringkasan analisis tunggal untuk 1 item', () => {
    expect(buildSummary('distrik', { distrik: ['D-1'] }, mockOptions)).toBe(
      'Analisis 1 distrik'
    )
  })

  it('menampilkan perbandingan distrik majemuk', () => {
    expect(buildSummary('distrik', { distrik: ['D-1', 'D-2'] }, mockOptions)).toBe(
      'Membandingkan 2 distrik'
    )
  })

  it('menampilkan perbandingan resort dengan induk distrik', () => {
    const selected = {
      distrik: ['D-1', 'D-2'],
      resort: ['R-1.1', 'R-1.2', 'R-2.1'], // 3 resort dari 2 distrik (D-1 dan D-2)
    }
    expect(buildSummary('resort', selected, mockOptions)).toBe(
      'Membandingkan 3 resort dari 2 distrik'
    )
  })

  it('menampilkan perbandingan huria dengan induk resort', () => {
    const selected = {
      distrik: ['D-1'],
      resort: ['R-1.1'],
      huria: ['H-1.1.1', 'H-1.1.2'],
    }
    expect(buildSummary('huria', selected, mockOptions)).toBe(
      'Membandingkan 2 huria dari 1 resort'
    )
  })
})

describe('organisasiFilter - toQuery & fromQuery', () => {
  it('mengonversi state filter dan periode menjadi URL query string dengan benar', () => {
    const state = {
      selected: {
        distrik: ['1', '2'],
        resort: ['5', '6'],
        huria: [],
      },
      periode: {
        mode: 'tahun',
        tahun: '2026',
        bulan: '',
        mingguISO: '',
        startDate: '',
        endDate: '',
      },
    }

    const query = toQuery(state)
    expect(query).toBe('distrik=1%2C2&resort=5%2C6&mode=tahun&tahun=2026')
  })

  it('mengurai query string kembali ke struktur state secara akurat', () => {
    const query = '?distrik=1,2&resort=5,6&mode=tahun&tahun=2026'
    const parsed = fromQuery(query)

    expect(parsed.selected.distrik).toEqual(['1', '2'])
    expect(parsed.selected.resort).toEqual(['5', '6'])
    expect(parsed.selected.huria).toEqual([])
    expect(parsed.periode.mode).toBe('tahun')
    expect(parsed.periode.tahun).toBe('2026')
  })

  it('menangani input query kosong atau string kotor dengan anggun', () => {
    const parsed = fromQuery('?distrik=1,,2&resort=&&mode=')
    expect(parsed.selected.distrik).toEqual(['1', '2'])
    expect(parsed.selected.resort).toEqual([])
    expect(parsed.periode.mode).toBe('tahun') // Default fallback
    expect(parsed.periode.tahun).toBe('2026')
  })

  it('bekerja roundtrip antara toQuery dan fromQuery', () => {
    const originalState = {
      selected: {
        distrik: ['D-1', 'D-2'],
        resort: ['R-1.1'],
        huria: ['H-1.1.1'],
      },
      periode: {
        mode: 'bulan',
        tahun: '2026',
        bulan: '05',
        mingguISO: '',
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      },
    }

    const q = toQuery(originalState)
    const restored = fromQuery(q)

    expect(restored.selected).toEqual(originalState.selected)
    expect(restored.periode).toEqual(originalState.periode)
  })
})

describe('organisasiFilter - pickTop', () => {
  it('memilih 2 item dengan total tertinggi', () => {
    const top2 = pickTop(mockOptions.resort, 2)
    // Resort Balige (90 jt) & Resort Tarutung Kota (75 jt)
    expect(top2).toEqual(['R-3.1', 'R-1.2'])
  })

  it('memakai urutan awal jika total tidak didefinisikan', () => {
    const optsWithoutTotal = [
      { id: 'A', nama: 'Item A' },
      { id: 'B', nama: 'Item B' },
      { id: 'C', nama: 'Item C' },
    ]
    expect(pickTop(optsWithoutTotal, 2)).toEqual(['A', 'B'])
  })

  it('membatasi pemilihan sesuai batas maksimum', () => {
    const manyOpts = Array.from({ length: 10 }, (_, i) => ({ id: `ID-${i}`, total: i * 10 }))
    const result = pickTop(manyOpts, 8, 6)
    expect(result).toHaveLength(6)
  })
})
