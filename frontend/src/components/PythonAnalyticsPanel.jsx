import { useEffect, useState, useMemo } from 'react'
import { AlertTriangle, BrainCircuit, LoaderCircle } from 'lucide-react'
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
  if (status === 422) return `Rentang atau parameter analitik ditolak: ${body?.detail || 'periksa pilihan kategori/tanggal.'}`
  if (status === 404) return 'Endpoint analitik tidak ditemukan. Periksa backend dan versi router Python.'
  return body?.detail || body?.error || `Layanan analitik mengembalikan HTTP ${status || 'tidak diketahui'}.`
}

export const PythonAnalyticsPanel = ({ idHuria = [], kategori, periode }) => {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const idsKey = idHuria.map(String).sort().join('|')
  const periodSelected = useMemo(() => resolvePeriod(periode), [periode])
  const window = useMemo(() => getDropWindow(periode), [periode])
  const key = REPORT_KEYS[periodSelected.mode]

  useEffect(() => {
    let active = true
    if (!idsKey) {
      setReport(null)
      return undefined
    }
    setLoading(true)
    setError('')
    setReport(null)
    runDropReportApi({ idHuria: idsKey.split('|'), ...(kategori ? { kategori } : {}), ...window })
      .then(({ data }) => { if (active) setReport(data) })
      .catch((requestError) => { if (active) setError(formatAnalyticsError(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [idsKey, kategori, window.mulai, window.akhir])

  const period = report?.[key]
  const visibleRows = period?.data?.slice(0, 10) || []
  return (
    <section className="bg-surface rounded-2xl border border-line p-4 sm:p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary flex items-center justify-center border border-primary-100">
            <BrainCircuit className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-ink">Deteksi Penurunan Pemasukan</h2>
            <p className="text-xs text-muted mt-0.5">Perbandingan {LABELS[periodSelected.mode]?.toLowerCase()} pada rentang {periodSelected.label}. Periode sebelumnya ikut dibaca sebagai pembanding.</p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
          Diperbarui saat filter berubah
        </span>
      </div>
      {loading && <p className="mt-4 flex items-center gap-2 text-xs text-muted"><LoaderCircle className="w-3.5 h-3.5 animate-spin" />Menghitung laporan...</p>}
      {error && (
        <div className="mt-3 rounded-xl bg-red-50 border border-red-200 p-3" role="alert">
          <p className="text-xs font-semibold text-red-700">Analitik belum tersedia</p>
          <p className="mt-1 text-xs text-red-700">{error}</p>
        </div>
      )}
      {!loading && period && (
        <div className="mt-4 rounded-xl border border-line overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-slate-50/70 px-4 py-3">
            <div>
              <h3 className="text-sm font-bold text-ink">Laporan per {LABELS[periodSelected.mode]}</h3>
              <p className="text-xs text-muted">{period.periodeTerbaru || '-'} vs {period.periodeSebelumnya || '-'}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700"><AlertTriangle className="w-3 h-3" />{period.jumlahHuriaTurun || 0} Huria turun</span>
          </div>
          {period.status === 'data_tidak_cukup' ? (
            <p className="px-4 py-5 text-xs text-muted">Belum tersedia dua periode pelaporan berurutan untuk perbandingan {LABELS[periodSelected.mode]?.toLowerCase()} ini. Ini bukan kesalahan server.</p>
          ) : visibleRows.length ? (
            <div className="divide-y divide-line">
              {visibleRows.map((item) => (
                <div key={item.idHuria} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="truncate text-xs font-semibold text-ink" title={item.namaHuria}>{item.namaHuria || item.idHuria}</span>
                  <span className="shrink-0 text-right text-xs text-red-700 font-bold">-{item.persentaseDrop}% · {formatRupiah(item.selisih)}</span>
                </div>
              ))}
              {period.data.length > visibleRows.length && <p className="px-4 py-2 text-xs text-muted">Menampilkan {visibleRows.length} dari {period.data.length} Huria turun.</p>}
            </div>
          ) : <p className="px-4 py-5 text-xs text-muted">Tidak ditemukan penurunan terkonfirmasi pada dua periode pembanding.</p>}
          {(period.jumlahBelumLapor || 0) > 0 && <p className="border-t border-line px-4 py-3 text-xs text-amber-700">{period.jumlahBelumLapor} Huria belum memiliki laporan pada periode terbaru; tidak dihitung sebagai penurunan 100%.</p>}
        </div>
      )}
    </section>
  )
}
