import { useEffect, useState, useMemo } from 'react'
import { LoaderCircle } from 'lucide-react'
import { runDropReportApi } from '../api/analyticsApi'
import { getDropWindow, resolvePeriod } from '../lib/periodeRange'

const LABELS = { minggu: 'Mingguan', bulan: 'Bulanan', tahun: 'Tahunan' }
const REPORT_KEYS = { minggu: 'mingguan', bulan: 'bulanan', tahun: 'tahunan' }
const formatRupiah = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`

function formatAnalyticsError(error) {
  const status = error?.response?.status
  const body = error?.response?.data
  if (!error?.response || status === 502 || status === 503 || status === 504) {
    return 'Layanan Python Analytics belum dapat dihubungi. Jalankan Uvicorn pada port 8000, lalu pastikan ANALYTICS_URL backend Go benar. Periksa juga terminal kedua server.'
  }
  if (status === 401 || status === 403) return 'Kunci layanan analitik tidak cocok. Periksa ANALYTICS_INTERNAL_KEY di backend dan INTERNAL_KEY di analytics.'
  if (status === 422) {
    const detail = Array.isArray(body?.detail)
      ? body.detail.map((item) => item?.msg || item?.message || JSON.stringify(item)).join('; ')
      : body?.detail
    return `Rentang atau parameter analitik ditolak: ${detail || 'periksa pilihan kategori/tanggal.'}`
  }
  if (status === 404) return 'Endpoint analitik tidak ditemukan. Periksa backend dan versi router Python.'
  return body?.detail || body?.error || `Layanan analitik mengembalikan HTTP ${status || 'tidak diketahui'}.`
}

export const PythonAnalyticsPanel = ({ idHuria = [], kategori, periode, wilayahData = [], globalReport = false }) => {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedDropPeriod, setSelectedDropPeriod] = useState('bulan')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [expandedPeriods, setExpandedPeriods] = useState({})
  const idsKey = idHuria.map(String).sort().join('|')
  const periodSelected = useMemo(() => resolvePeriod(periode), [periode])
  const window = useMemo(() => getDropWindow(periode), [periode])
  const key = REPORT_KEYS[periodSelected.mode]
  const categoryOptions = useMemo(() => {
    const names = new Set()
    const distriks = wilayahData[0]?.Pusat?.Distrik || []
    distriks.forEach((distrik) => {
      if (distrik.Aktif === false) return
      ;(distrik.Resort || []).forEach((resort) => {
        if (resort.Aktif === false) return
        ;(resort.Huria || []).forEach((huria) => {
          if (huria.Aktif === false) return
          ;(huria.KategoriPemasukan || []).forEach((category) => {
            const name = String(category.NamaKategori || '').trim()
            if (name) names.add(name)
          })
        })
      })
    })
    return [...names].sort((a, b) => a.localeCompare(b, 'id'))
  }, [wilayahData])

  useEffect(() => {
    let active = true
    if (!globalReport && !idsKey) {
      setReport(null)
      return undefined
    }
    setLoading(true)
    setError('')
    setReport(null)
    const payload = globalReport
      ? (selectedCategory ? { kategori: selectedCategory } : {})
      : { idHuria: idsKey.split('|'), ...(kategori ? { kategori } : {}), ...window }
    runDropReportApi(payload)
      .then(({ data }) => { if (active) setReport(data) })
      .catch((requestError) => { if (active) setError(formatAnalyticsError(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [globalReport, idsKey, kategori, selectedCategory, window.mulai, window.akhir])

  const displayedPeriodKey = globalReport ? REPORT_KEYS[selectedDropPeriod] : key
  const periods = [{ key: displayedPeriodKey, period: report?.[displayedPeriodKey] }].filter(({ period }) => period)
  return (
    <section className="bg-surface rounded-2xl border border-line p-4 sm:p-5 shadow-xs">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h2 className="text-base font-bold tracking-tight text-ink">Deteksi Penurunan Pemasukan</h2>
          <p className="mt-1 text-xs text-muted">
            {globalReport
              ? 'Analisis otomatis seluruh Huria berdasarkan seluruh data yang tersedia.'
              : `Perbandingan ${LABELS[periodSelected.mode]?.toLowerCase()} pada rentang ${periodSelected.label}.`}
          </p>
        </div>
        <span className="text-[11px] font-medium text-muted">
          {globalReport ? 'Otomatis · Semua Huria' : 'Diperbarui saat filter berubah'}
        </span>
      </div>
      {globalReport && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[440px_260px] sm:justify-between">
          <label className="flex items-center gap-2 text-xs font-semibold text-ink">
            <span className="shrink-0">Kategori pemasukan</span>
            <select
              value={selectedCategory}
              onChange={(event) => {
                setSelectedCategory(event.target.value)
                setExpandedPeriods({})
              }}
              className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-xs font-medium text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              aria-label="Pilih kategori pemasukan untuk deteksi penurunan"
            >
              <option value="">Semua kategori</option>
              {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-3 rounded-lg border border-line bg-canvas p-0.5" role="group" aria-label="Pilih periode deteksi penurunan">
            {Object.entries(LABELS).map(([periodKey, label]) => (
              <button
                key={periodKey}
                type="button"
                onClick={() => setSelectedDropPeriod(periodKey)}
                aria-pressed={selectedDropPeriod === periodKey}
                className={`w-full px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                  selectedDropPeriod === periodKey
                    ? 'rounded-md bg-surface text-primary shadow-2xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {loading && <p className="mt-4 flex items-center gap-2 text-xs text-muted"><LoaderCircle className="w-3.5 h-3.5 animate-spin" />Menghitung laporan...</p>}
      {error && (
        <div className="mt-3 rounded-xl bg-red-50 border border-red-200 p-3" role="alert">
          <p className="text-xs font-semibold text-red-700">Analitik belum tersedia</p>
          <p className="mt-1 text-xs text-red-700">{error}</p>
        </div>
      )}
      {!loading && periods.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4">
          {periods.map(({ key: periodKey, period }) => {
            const rows = period.data || []
            const isExpanded = Boolean(expandedPeriods[periodKey])
            const visibleRows = isExpanded ? rows : rows.slice(0, globalReport ? 5 : 10)
            const hasDrop = period.status !== 'data_tidak_cukup' && visibleRows.length > 0
            return (
              <div key={periodKey} className="overflow-hidden border border-line bg-surface">
                <div className="border-b border-line px-4 py-3">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-ink">{LABELS[periodKey]}</h3>
                      <p className="mt-1 text-[11px] text-muted">
                        {period.periodeTerbaru || '-'} dibandingkan dengan {period.periodeSebelumnya || '-'}
                      </p>
                    </div>
                    <div className={`text-right ${hasDrop ? 'text-red-700' : 'text-muted'}`}>
                      <p className="text-lg font-bold leading-none">{period.jumlahHuriaTurun || 0}</p>
                      <p className="mt-1 text-[10px] font-medium">Huria mengalami penurunan</p>
                    </div>
                  </div>
                </div>
                {period.status === 'data_tidak_cukup' ? (
                  <div className="px-4 py-5 text-center">
                    <p className="text-xs font-semibold text-ink">Data belum cukup</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted">Belum tersedia dua periode berurutan untuk dibandingkan.</p>
                  </div>
                ) : visibleRows.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] table-fixed border-collapse text-left">
                      <colgroup>
                        <col className="w-[30%]" />
                        <col className="w-[17.5%]" />
                        <col className="w-[17.5%]" />
                        <col className="w-[17.5%]" />
                        <col className="w-[17.5%]" />
                      </colgroup>
                      <thead className="border-b border-line bg-canvas/40 text-[10px] font-semibold uppercase tracking-wide text-muted">
                        <tr>
                          <th className="w-[30%] px-4 py-2.5">Huria</th>
                          <th className="w-[17.5%] px-4 py-2.5 text-right">Sebelumnya</th>
                          <th className="w-[17.5%] px-4 py-2.5 text-right">Terbaru</th>
                          <th className="w-[17.5%] px-4 py-2.5 text-right">Selisih</th>
                          <th className="w-[17.5%] px-4 py-2.5 text-right">Penurunan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {visibleRows.map((item) => (
                          <tr key={item.idHuria} className="hover:bg-canvas/40">
                            <td className="truncate px-4 py-3 text-xs font-semibold text-ink" title={item.namaHuria}>
                              {item.namaHuria || item.idHuria}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-[11px] text-muted">{formatRupiah(item.pemasukanSebelumnya)}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-[11px] font-medium text-ink">{formatRupiah(item.pemasukanSekarang)}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-[11px] text-red-700">{formatRupiah(item.selisih)}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold text-red-700">-{item.persentaseDrop}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!isExpanded && rows.length > visibleRows.length && (
                      <button
                        type="button"
                        onClick={() => setExpandedPeriods((current) => ({ ...current, [periodKey]: true }))}
                        className="w-full border-t border-line px-4 py-2.5 text-left text-[11px] font-semibold text-primary hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                        aria-label={`Tampilkan ${rows.length - visibleRows.length} Huria lainnya untuk periode ${LABELS[periodKey]}`}
                      >
                        Tampilkan semua {rows.length} Huria yang mengalami penurunan
                      </button>
                    )}
                    {isExpanded && rows.length > 5 && (
                      <button
                        type="button"
                        onClick={() => setExpandedPeriods((current) => ({ ...current, [periodKey]: false }))}
                        className="w-full border-t border-line px-4 py-2.5 text-left text-[11px] font-semibold text-primary hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                        aria-label={`Sembunyikan daftar Huria periode ${LABELS[periodKey]}`}
                      >
                        Tampilkan hanya 5 Huria teratas
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="px-4 py-5 text-center">
                    <p className="text-xs font-semibold text-ink">Tidak ada penurunan</p>
                    <p className="mt-1 text-[11px] text-muted">Pemasukan relatif stabil pada periode ini.</p>
                  </div>
                )}
                {(period.jumlahBelumLapor || 0) > 0 && (
                  <p className="border-t border-amber-200 bg-amber-50/60 px-4 py-2.5 text-[10px] leading-relaxed text-amber-800">
                    {period.jumlahBelumLapor} Huria belum melapor dan tidak dihitung sebagai penurunan.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
