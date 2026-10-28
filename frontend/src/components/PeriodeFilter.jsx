/**
 * @file PeriodeFilter.jsx
 * Komponen pemilih mode periode & parameter tanggal/bulan/minggu dinamis.
 * Mode:
 * - Per tahun (pilih tahun, tahun aktif diberi label "(Aktif)")
 * - Per bulan (tahun dan bulan)
 * - Per minggu (tahun dan minggu ISO)
 * - Per tanggal (rentang tanggal Dari & Sampai)
 * Hanya pemilih yang relevan yang tampil.
 */

import { useMemo } from 'react'

const MONTHS = [
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
]

export function PeriodeFilter({ periode, onChange }) {
  const currentYear = '2026'
  const years = useMemo(() => ['2026', '2025', '2024'], [])

  const handleModeChange = (newMode) => {
    onChange({
      mode: newMode,
      tahun: periode.tahun || currentYear,
      bulan: newMode === 'bulan' ? periode.bulan || '01' : '',
      mingguISO: newMode === 'minggu' ? periode.mingguISO || '1' : '',
    })
  }

  return (
    <>
      {/* 1. Mode Periode */}
      <div className="w-full">
        <label className="block text-xs font-semibold text-muted mb-1 truncate">
          Mode Periode
        </label>
        <select
          value={periode.mode || 'tahun'}
          onChange={(e) => handleModeChange(e.target.value)}
          className="w-full h-10 px-3 rounded-xl border border-line bg-surface text-ink text-xs font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary-400/20 cursor-pointer shadow-2xs"
        >
          <option value="tahun">Per Tahun</option>
          <option value="bulan">Per Bulan</option>
          <option value="minggu">Per Minggu</option>
        </select>
      </div>

      {/* 2. Pemilih Periode Spesifik Sesuai Mode */}
      <div className="w-full">
        {periode.mode === 'tahun' && (
          <div>
            <label className="block text-xs font-semibold text-muted mb-1 truncate">
              Pilih Tahun
            </label>
            <select
              value={periode.tahun || currentYear}
              onChange={(e) => onChange({ tahun: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-line bg-surface text-ink text-xs font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary-400/20 cursor-pointer shadow-2xs"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  Tahun {y} {y === currentYear ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {periode.mode === 'bulan' && (
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1 truncate">
                Tahun
              </label>
              <select
                value={periode.tahun || currentYear}
                onChange={(e) => onChange({ tahun: e.target.value })}
                className="w-full h-10 px-2.5 rounded-xl border border-line bg-surface text-ink text-xs font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary-400/20 cursor-pointer shadow-2xs"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1 truncate">
                Bulan
              </label>
              <select
                value={periode.bulan || '01'}
                onChange={(e) => onChange({ bulan: e.target.value })}
                className="w-full h-10 px-2.5 rounded-xl border border-line bg-surface text-ink text-xs font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary-400/20 cursor-pointer shadow-2xs"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {periode.mode === 'minggu' && (
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="block text-xs font-semibold text-muted mb-1 truncate">
                Tahun
              </label>
              <select
                value={periode.tahun || currentYear}
                onChange={(e) => onChange({ tahun: e.target.value })}
                className="w-full h-10 px-2.5 rounded-xl border border-line bg-surface text-ink text-xs font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary-400/20 cursor-pointer shadow-2xs"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1 truncate">
                Minggu
              </label>
              <select
                value={periode.mingguISO || '1'}
                onChange={(e) => onChange({ mingguISO: e.target.value })}
                className="w-full h-10 px-2.5 rounded-xl border border-line bg-surface text-ink text-xs font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary-400/20 cursor-pointer shadow-2xs"
              >
                {Array.from({ length: 52 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1)}>W-{i + 1}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
