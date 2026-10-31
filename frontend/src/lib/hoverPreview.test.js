import { describe, it, expect } from 'vitest'
import {
  HOVER_PREVIEW_DELAY_MS,
  calculatePopoverCoords,
  getChildPreviewData,
} from './hoverPreview'

describe('hoverPreview - HOVER_PREVIEW_DELAY_MS', () => {
  it('harus bernilai 200 milidetik sesuai spesifikasi', () => {
    expect(HOVER_PREVIEW_DELAY_MS).toBe(200)
  })
})

describe('hoverPreview - calculatePopoverCoords', () => {
  it('menempatkan popover di kanan-bawah kursor secara normal', () => {
    const coords = calculatePopoverCoords({
      clientX: 100,
      clientY: 100,
      windowWidth: 1000,
      windowHeight: 800,
      popoverWidth: 280,
      popoverHeight: 220,
      padding: 12,
      offset: 14,
    })

    expect(coords.left).toBe(114) // 100 + 14
    expect(coords.top).toBe(114)  // 100 + 14
  })

  it('membalik ke kiri kursor jika melebihi batas kanan layar', () => {
    const coords = calculatePopoverCoords({
      clientX: 900,
      clientY: 100,
      windowWidth: 1000,
      windowHeight: 800,
      popoverWidth: 280,
      popoverHeight: 220,
      padding: 12,
      offset: 14,
    })

    // 900 + 14 + 280 = 1194 > 988 -> flipped left: 900 - 280 - 10 = 610
    expect(coords.left).toBe(610)
    expect(coords.top).toBe(114)
  })

  it('membalik ke atas kursor jika melebihi batas bawah layar', () => {
    const coords = calculatePopoverCoords({
      clientX: 100,
      clientY: 700,
      windowWidth: 1000,
      windowHeight: 800,
      popoverWidth: 280,
      popoverHeight: 220,
      padding: 12,
      offset: 14,
    })

    // 700 + 14 + 220 = 934 > 788 -> flipped top: 700 - 220 - 10 = 470
    expect(coords.left).toBe(114)
    expect(coords.top).toBe(470)
  })

  it('tidak pernah menghasilkan koordinat kurang dari batas padding aman', () => {
    const coords = calculatePopoverCoords({
      clientX: 0,
      clientY: 0,
      windowWidth: 320,
      windowHeight: 320,
      popoverWidth: 400,
      popoverHeight: 400,
      padding: 12,
      offset: 14,
    })

    expect(coords.left).toBeGreaterThanOrEqual(12)
    expect(coords.top).toBeGreaterThanOrEqual(12)
  })
})

describe('hoverPreview - getChildPreviewData', () => {
  const mockOptions = {
    distrik: [
      { id: 'D-1', nama: 'Distrik VIII DKI Jakarta' },
      { id: 'D-2', nama: 'Distrik II Silindung' },
    ],
    resort: [
      { id: 'R-1.1', nama: 'Resort Menteng', idInduk: 'D-1' },
      { id: 'R-1.2', nama: 'Resort Tebet', idInduk: 'D-1' },
      { id: 'R-2.1', nama: 'Resort Pearaja', idInduk: 'D-2' },
    ],
    huria: [
      { id: 'H-1.2.1', nama: 'HKBP Tebet', idInduk: 'R-1.2' },
      { id: 'H-1.2.2', nama: 'HKBP Sudirman', idInduk: 'R-1.2' },
      { id: 'H-1.2.3', nama: 'HKBP Pasar Rebo', idInduk: 'R-1.2' },
    ],
  }

  it('mengekstrak daftar Resort untuk Distrik tertentu', () => {
    const data = getChildPreviewData({
      type: 'distrik',
      item: mockOptions.distrik[0],
      options: mockOptions,
      loadingState: { resort: false },
    })

    expect(data).not.toBeNull()
    expect(data.title).toBe('Distrik VIII DKI Jakarta')
    expect(data.childType).toBe('resort')
    expect(data.loading).toBe(false)
    expect(data.items).toHaveLength(2)
    expect(data.items.map((i) => i.nama)).toEqual(['Resort Menteng', 'Resort Tebet'])
  })

  it('mengekstrak daftar Huria untuk Resort tertentu', () => {
    const data = getChildPreviewData({
      type: 'resort',
      item: mockOptions.resort[1], // Resort Tebet
      options: mockOptions,
      loadingState: { huria: false },
    })

    expect(data).not.toBeNull()
    expect(data.title).toBe('Resort Tebet')
    expect(data.childType).toBe('huria')
    expect(data.loading).toBe(false)
    expect(data.items).toHaveLength(3)
    expect(data.items.map((i) => i.nama)).toEqual([
      'HKBP Tebet',
      'HKBP Sudirman',
      'HKBP Pasar Rebo',
    ])
  })

  it('mengembalikan status loading: true jika loadingState aktif', () => {
    const data = getChildPreviewData({
      type: 'distrik',
      item: mockOptions.distrik[0],
      options: mockOptions,
      loadingState: { resort: true },
    })

    expect(data.loading).toBe(true)
  })

  it('menggunakan cachedData jika tersedia untuk pengambilan data on-demand API', () => {
    const cachedData = {
      'D-99': [
        { id: 'R-99.1', nama: 'Resort Baru 1' },
        { id: 'R-99.2', nama: 'Resort Baru 2' },
      ],
    }

    const data = getChildPreviewData({
      type: 'distrik',
      item: { id: 'D-99', nama: 'Distrik Anyar' },
      options: { resort: [] },
      cachedData,
      loadingState: { resort: false },
    })

    expect(data.items).toHaveLength(2)
    expect(data.items[0].nama).toBe('Resort Baru 1')
  })

  it('menandai status loading: true jika fetchingState untuk item ini sedang aktif', () => {
    const fetchingState = { 'D-1': true }
    const data = getChildPreviewData({
      type: 'distrik',
      item: mockOptions.distrik[0],
      options: mockOptions,
      fetchingState,
    })

    expect(data.loading).toBe(true)
  })
})

