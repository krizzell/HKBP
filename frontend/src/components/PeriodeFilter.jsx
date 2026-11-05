/** Filter rentang periode tunggal untuk Studio Visualisasi. */
import { useMemo } from 'react'
import { defaultRangePeriod, resolvePeriod } from '../lib/periodeRange'

const selectClass = 'w-full h-10 px-2.5 rounded-xl border border-line bg-surface text-ink text-xs font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary-400/20 cursor-pointer shadow-2xs'

export function PeriodeFilter({ periode = {}, onChange }) {
  const defaults = useMemo(() => defaultRangePeriod(), [])
  const current = resolvePeriod(periode)
  const years = useMemo(() => {
    const yearsSet = new Set(Array.from({ length: 30 }, (_, i) => String(new Date().getFullYear() + 2 - i)))
    ;[periode.tahunAwal, periode.tahunAkhir, periode.tahun].filter(Boolean).forEach((y) => yearsSet.add(String(y)))
    return [...yearsSet].sort((a, b) => Number(b) - Number(a))
  }, [periode.tahunAwal, periode.tahunAkhir, periode.tahun])
  const startYear = periode.tahunAwal || periode.tahun || defaults.tahun
  const endYear = periode.tahunAkhir || periode.tahun || startYear
  const startMonth = periode.bulanAwal || `${startYear}-${String(periode.bulan || defaults.bulan).padStart(2, '0')}`
  const endMonth = periode.bulanAkhir || startMonth
  const startDate = periode.startDate || defaults.startDate
  const endDate = periode.endDate || startDate

  const updateStart = (key, value, endKey, endValue) => {
    onChange({ [key]: value, ...(value > endValue ? { [endKey]: value } : {}) })
  }
  const updateEnd = (key, value, startKey, startValue) => {
    onChange({ [key]: value, ...(value < startValue ? { [startKey]: value } : {}) })
  }

  return (
    <>
      <div className="w-full">
        <label className="block text-xs font-semibold text-muted mb-1">Mode Periode</label>
        <select value={periode.mode || 'tahun'} onChange={(e) => onChange({ mode: e.target.value })} className={selectClass}>
          <option value="tahun">Per Tahun (rentang tahun)</option>
          <option value="bulan">Per Bulan (rentang bulan)</option>
          <option value="minggu">Per Minggu (pilih tanggal)</option>
        </select>
      </div>
      <div className="min-w-0 w-full">
        <div className="grid grid-cols-2 gap-2">
          {current.mode === 'tahun' && (
            <>
              <div>
                <label htmlFor="range-year-start" className="block text-xs font-semibold text-muted mb-1">Dari Tahun</label>
                <select id="range-year-start" value={startYear} className={selectClass}
                  onChange={(e) => updateStart('tahunAwal', e.target.value, 'tahunAkhir', endYear)}>
                  {years.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="range-year-end" className="block text-xs font-semibold text-muted mb-1">Sampai Tahun</label>
                <select id="range-year-end" value={endYear} className={selectClass}
                  onChange={(e) => updateEnd('tahunAkhir', e.target.value, 'tahunAwal', startYear)}>
                  {years.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
            </>
          )}
          {current.mode === 'bulan' && (
            <>
              <div>
                <label htmlFor="range-month-start" className="block text-xs font-semibold text-muted mb-1">Dari Bulan</label>
                <input id="range-month-start" type="month" className={selectClass} value={startMonth}
                  onChange={(e) => e.target.value && updateStart('bulanAwal', e.target.value, 'bulanAkhir', endMonth)} />
              </div>
              <div>
                <label htmlFor="range-month-end" className="block text-xs font-semibold text-muted mb-1">Sampai Bulan</label>
                <input id="range-month-end" type="month" className={selectClass} value={endMonth}
                  onChange={(e) => e.target.value && updateEnd('bulanAkhir', e.target.value, 'bulanAwal', startMonth)} />
              </div>
            </>
          )}
          {current.mode === 'minggu' && (
            <>
              <div>
                <label htmlFor="range-week-start" className="block text-xs font-semibold text-muted mb-1">Dari Tanggal</label>
                <input id="range-week-start" type="date" className={selectClass} value={startDate}
                  onChange={(e) => e.target.value && updateStart('startDate', e.target.value, 'endDate', endDate)} />
              </div>
              <div>
                <label htmlFor="range-week-end" className="block text-xs font-semibold text-muted mb-1">Sampai Tanggal</label>
                <input id="range-week-end" type="date" className={selectClass} value={endDate}
                  onChange={(e) => e.target.value && updateEnd('endDate', e.target.value, 'startDate', startDate)} />
              </div>
            </>
          )}
        </div>
        {current.mode === 'minggu' && (
          <p className="mt-1 text-[11px] text-muted">Otomatis dihitung per minggu (Senin–Minggu): {current.start} s.d. {current.end}</p>
        )}
      </div>
    </>
  )
}
