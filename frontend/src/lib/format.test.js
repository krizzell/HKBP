import { describe, it, expect } from 'vitest'
import {
  formatRupiah,
  formatCompactRupiah,
  formatPercent,
  formatHierarchicalCode,
  formatNumber,
} from './format'

describe('formatRupiah', () => {
  it('formats positive integers to Indonesian Rupiah standard', () => {
    expect(formatRupiah(12500000)).toBe('Rp 12.500.000')
    expect(formatRupiah(1000)).toBe('Rp 1.000')
    expect(formatRupiah(500)).toBe('Rp 500')
  })

  it('formats zero, null, undefined, empty, and invalid values safely to Rp 0', () => {
    expect(formatRupiah(0)).toBe('Rp 0')
    expect(formatRupiah(null)).toBe('Rp 0')
    expect(formatRupiah(undefined)).toBe('Rp 0')
    expect(formatRupiah('')).toBe('Rp 0')
    expect(formatRupiah('invalid')).toBe('Rp 0')
  })

  it('formats negative numbers correctly', () => {
    expect(formatRupiah(-50000)).toBe('-Rp 50.000')
  })

  it('formats string numbers', () => {
    expect(formatRupiah('12500000')).toBe('Rp 12.500.000')
  })
})

describe('formatCompactRupiah', () => {
  it('formats trillions (T) correctly', () => {
    expect(formatCompactRupiah(1500000000000)).toBe('Rp 1,5 T')
    expect(formatCompactRupiah(2000000000000)).toBe('Rp 2 T')
  })

  it('formats billions (M) correctly', () => {
    expect(formatCompactRupiah(2500000000)).toBe('Rp 2,5 M')
    expect(formatCompactRupiah(1000000000)).toBe('Rp 1 M')
    expect(formatCompactRupiah(12400000000)).toBe('Rp 12 M')
  })

  it('formats millions (jt) correctly', () => {
    expect(formatCompactRupiah(1200000)).toBe('Rp 1,2 jt')
    expect(formatCompactRupiah(1000000)).toBe('Rp 1 jt')
    expect(formatCompactRupiah(25500000)).toBe('Rp 26 jt')
  })

  it('formats thousands (rb) correctly', () => {
    expect(formatCompactRupiah(850000)).toBe('Rp 850 rb')
    expect(formatCompactRupiah(1500)).toBe('Rp 1,5 rb')
    expect(formatCompactRupiah(1000)).toBe('Rp 1 rb')
  })

  it('formats values under 1000 without unit', () => {
    expect(formatCompactRupiah(500)).toBe('Rp 500')
    expect(formatCompactRupiah(0)).toBe('Rp 0')
  })

  it('handles negative values and empty safely', () => {
    expect(formatCompactRupiah(-1200000)).toBe('-Rp 1,2 jt')
    expect(formatCompactRupiah(null)).toBe('Rp 0')
    expect(formatCompactRupiah(undefined)).toBe('Rp 0')
  })
})

describe('formatPercent', () => {
  it('formats percentages with Indonesian comma separator', () => {
    expect(formatPercent(12.5)).toBe('12,5%')
    expect(formatPercent(12.0)).toBe('12%')
    expect(formatPercent(0.75, 2)).toBe('0,75%')
    expect(formatPercent(100)).toBe('100%')
  })

  it('handles zeroes and falsy values safely', () => {
    expect(formatPercent(0)).toBe('0%')
    expect(formatPercent(null)).toBe('0%')
    expect(formatPercent(undefined)).toBe('0%')
    expect(formatPercent('')).toBe('0%')
  })
})

describe('formatHierarchicalCode', () => {
  it('combines parent and child code with a dot', () => {
    expect(formatHierarchicalCode('01', '03')).toBe('01.03')
    expect(formatHierarchicalCode('01', '3')).toBe('01.03')
    expect(formatHierarchicalCode('01.02', '4')).toBe('01.02.04')
  })

  it('returns child code directly if it already contains hierarchy', () => {
    expect(formatHierarchicalCode('01', '01.03')).toBe('01.03')
    expect(formatHierarchicalCode('01.02', '01.02.03')).toBe('01.02.03')
  })

  it('handles empty parent code by returning formatted child', () => {
    expect(formatHierarchicalCode('', '1')).toBe('01')
    expect(formatHierarchicalCode(null, '05')).toBe('05')
  })

  it('handles empty child code safely', () => {
    expect(formatHierarchicalCode('01', '')).toBe('01')
    expect(formatHierarchicalCode('', '')).toBe('')
  })
})

describe('formatNumber', () => {
  it('formats numbers with dots as thousand separator', () => {
    expect(formatNumber(1250)).toBe('1.250')
    expect(formatNumber(4567890)).toBe('4.567.890')
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(null)).toBe('0')
  })
})
