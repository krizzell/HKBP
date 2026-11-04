import { useEffect, useState, useMemo } from 'react'
import { AlertTriangle, BrainCircuit, LoaderCircle } from 'lucide-react'
import { runDropReportApi } from '../api/analyticsApi'

const PERIODS = [
  { key: 'mingguan', label: 'Minggu' },
  { key: 'bulanan', label: 'Bulan' },
  { key: 'tahunan', label: 'Tahun' },
]

const formatRupiah = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`


// Kirim periode terpilih + periode sebelumnya, agar laporan Drop dapat dibandingkan.
const isoDate = (date) => date.toISOString().slice(0, 10)
const getPeriodWindow = (periode) => {
  const year = Number(periode?.tahun) || new Date().getFullYear()
  if (periode?.mode === 'bulan') {
    const month = Math.max(1, Math.min(12, Number(periode.bulan) || 1))
    return {
      mulai: isoDate(new Date(Date.UTC(year, month - 2, 1))),
      akhir: isoDate(new Date(Date.UTC(year, month, 0))),
    }
  }
  if (periode?.mode === 'minggu') {
    const week = Math.max(1, Math.min(53, Number(periode.mingguISO) || 1))
    const jan4 = new Date(Date.UTC(year, 0, 4))
    const monday = new Date(jan4)
    monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + (week - 1) * 7)
    const start = new Date(monday)
    start.setUTCDate(monday.getUTCDate() - 7)
    const end = new Date(monday)
    end.setUTCDate(monday.getUTCDate() + 6)
    return { mulai: isoDate(start), akhir: isoDate(end) }
  }
  // Modus tahun menyertakan tahun pembanding sebelumnya.
  return { mulai: `${year - 1}-01-01`, akhir: `${year}-12-31` }
}

export const PythonAnalyticsPanel = ({ idHuria = [], kategori, periode }) => {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const periodWindow = useMemo(() => getPeriodWindow(periode), [periode?.mode, periode?.tahun, periode?.bulan, periode?.mingguISO])
  const idsKey = idHuria.join('|')

  useEffect(() => {
    let active = true
    if (!idsKey) {
      setReport(null)
      return undefined
    }

    setLoading(true)
    setError('')
    runDropReportApi({
      idHuria,
      ...(kategori ? { kategori } : {}),
      ...periodWindow,
    })
      .then((response) => {
        if (active) setReport(response.data)
      })
      .catch((requestError) => {
        if (active) {
          setReport(null)
          setError(
            requestError.response?.data?.detail ||
            requestError.response?.data?.error ||
            'Laporan penurunan pemasukan tidak dapat diakses.'
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [idsKey, kategori, periodWindow])

  return (
    <section className="bg-surface rounded-2xl border border-line p-4 sm:p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary flex items-center justify-center border border-primary-100">
            <BrainCircuit className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-ink">Deteksi Penurunan Pemasukan</h2>
            <p className="text-xs text-muted mt-0.5">
              Python membandingkan periode sesuai filter dan periode pembanding sebelumnya.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
          Diperbarui saat filter berubah
        </span>
      </div>

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted">
          <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
          Menganalisis pemasukan sesuai rentang yang dipilih...
        </div>
      )}
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
      {!loading && report && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-5">
          {PERIODS.map(({ key, label }) => {
            const period = report[key]
            const visibleRows = period?.data?.slice(0, 5) || []
            return (
              <div key={key} className="rounded-xl border border-line bg-white overflow-hidden min-w-0">
                <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50/70 px-4 py-3">
                  <div>
                    <h3 className="text-sm font-bold text-ink">Drop per {label}</h3>
                    <p className="text-[11px] text-muted mt-0.5">
                      {period?.periodeTerbaru || '-'} <span className="mx-1">vs</span> {period?.periodeSebelumnya || '-'}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-700">
                    <AlertTriangle className="w-3 h-3" />
                    {period?.jumlahHuriaTurun || 0}
                  </span>
                </div>
                {visibleRows.length > 0 ? (
                  <div className="divide-y divide-line">
                    <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-muted">
                      <span>Huria</span>
                      <span className="text-right">Drop</span>
                      <span className="text-right">Selisih</span>
                    </div>
                    {visibleRows.map((item, index) => (
                      <div key={item.idHuria} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex items-center gap-2">
                          <span className="w-5 text-[10px] font-bold text-muted">{index + 1}</span>
                          <span className="truncate text-xs font-semibold text-ink" title={item.namaHuria}>
                            {item.namaHuria || item.idHuria}
                          </span>
                        </div>
                        <span className="text-right text-xs font-bold text-red-700">-{item.persentaseDrop}%</span>
                        <span className="whitespace-nowrap text-right text-[11px] text-muted">{formatRupiah(item.selisih)}</span>
                      </div>
                    ))}
                    {period.data.length > visibleRows.length && (
                      <p className="px-4 py-2.5 text-[11px] text-muted">
                        Menampilkan {visibleRows.length} dari {period.data.length} Huria yang mengalami drop.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center">
                    <p className="text-xs font-semibold text-ink">{period?.status === 'data_tidak_cukup' ? 'Data tidak cukup' : 'Tidak ada penurunan yang terkonfirmasi'}</p>
                    <p className="mt-1 text-[11px] text-muted">{period?.status === 'data_tidak_cukup' ? 'Belum tersedia dua periode pembanding.' : 'Tidak ditemukan Huria dengan penurunan dan dua periode pelaporan lengkap.'}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
