import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Database, Loader2, Minus, RefreshCw, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  getDwAliran, getDwCube, getDwRingkasan, getDwSesi, pesanErrorAnalitik, refreshDw,
  runAnomalyApi, runCorrelationApi, runForecastApi,
} from '../api/analyticsApi'
import {
  AnimatedBubbleChart, AnnotatedTimeSeries, ClickableBars, CorrelationScatter, HeatmapGrid, SankeyChart, SmallMultiples,
} from '../components/charts/AdvancedCharts'
import { formatCompactRupiah, formatRupiah } from '../utils/formatters'
import {
  EMPTY_SELECTION, annotationsFor, buildInsights, computeKpis, drillLevel, filterRows, rankBy,
  toBubbleFrames, toHeatmap, toSankey, toSmallMultiples,
} from '../lib/storytelling'

const Panel = ({ title, subtitle, children, className = '', badge }) => (
  <section className={`bg-surface rounded-2xl border border-line p-4 sm:p-5 shadow-xs ${className}`}>
    <div className="flex items-start justify-between gap-3 mb-3">
      <div>
        <h3 className="text-sm sm:text-base font-extrabold text-ink leading-snug">{title}</h3>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
      {badge && <span className="shrink-0 rounded-full bg-primary-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">{badge}</span>}
    </div>
    {children}
  </section>
)

const ErrorBox = ({ text }) => (
  <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700" role="alert">{text}</div>
)

const formatKpi = (k) => {
  if (k.format === 'rupiah') return k.value >= 100000 ? formatCompactRupiah(k.value) : formatRupiah(Math.round(k.value))
  if (k.format === 'persen') return `${k.value.toFixed(1)}%`
  return `${Math.round(k.value).toLocaleString('id-ID')}${k.unit ? ` ${k.unit}` : ''}`
}

const Delta = ({ c }) => {
  if (c.delta === null || c.delta === undefined || Number.isNaN(c.delta)) {
    return <span className="text-[11px] text-muted">{c.label}: –</span>
  }
  const up = c.delta > 0.05
  const down = c.delta < -0.05
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus
  const color = up ? 'text-emerald-600' : down ? 'text-red-600' : 'text-muted'
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${color}`}>
      <Icon className="w-3 h-3" />
      {c.absolute ? `${c.delta.toFixed(1)} poin` : `${Math.abs(c.delta).toFixed(1)}%`}
      <span className="font-normal text-muted ml-0.5">{c.label}</span>
    </span>
  )
}

export const StorytellingPage = () => {
  const { isSuperAdmin } = useAuth()
  const [reloadKey, setReloadKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState('')
  const [cube, setCube] = useState([])
  const [aliran, setAliran] = useState([])
  const [sesi, setSesi] = useState([])
  const [ringkasan, setRingkasan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sel, setSel] = useState(EMPTY_SELECTION)

  // Hasil analitik Python disimpan bersama kunci pilihan (idKey); bila kunci berubah, otomatis tampil "memuat".
  const [forecastRaw, setForecast] = useState({})
  const [anomalyRaw, setAnomaly] = useState({})
  const [corrRaw, setCorr] = useState({})

  useEffect(() => {
    let active = true
    Promise.all([getDwCube(), getDwAliran(), getDwSesi(), getDwRingkasan()])
      .then(([c, a, s, r]) => { if (active) { setCube(c); setAliran(a); setSesi(s); setRingkasan(r) } })
      .catch((e) => { if (active) setError(pesanErrorAnalitik(e)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reloadKey])

  const perbaruiWarehouse = async () => {
    setRefreshing(true)
    setRefreshMsg('')
    try {
      const r = await refreshDw(false)
      setRefreshMsg(`Warehouse diperbarui (${Object.values(r.baris).reduce((a, b) => a + b, 0).toLocaleString('id-ID')} baris).`)
      setReloadKey((k) => k + 1)
    } catch (e) {
      setRefreshMsg(pesanErrorAnalitik(e))
    } finally {
      setRefreshing(false)
    }
  }

  const filtered = useMemo(() => filterRows(cube, sel), [cube, sel])
  const kpis = useMemo(() => computeKpis(filtered), [filtered])
  const insights = useMemo(() => buildInsights(filtered, sel), [filtered, sel])
  const drill = drillLevel(sel)
  const ranking = useMemo(() => rankBy(filtered, sel, 'totalPemasukan'), [filtered, sel])
  const sankey = useMemo(() => toSankey(filterRows(aliran, sel), sel), [aliran, sel])
  const heat = useMemo(() => toHeatmap(filtered, sel), [filtered, sel])
  const multiples = useMemo(() => toSmallMultiples(filtered, sel), [filtered, sel])
  const bubbles = useMemo(() => toBubbleFrames(sesi, sel), [sesi, sel])
  const idHuria = useMemo(() => [...new Set(filtered.map((r) => r.idHuria))].sort(), [filtered])
  const idKey = idHuria.join('|')

  // Analitik Python dipanggil ulang setiap pilihan (cross-filter) berubah.
  useEffect(() => {
    if (!idHuria.length) return undefined
    let active = true
    runForecastApi({ idHuria, granularitas: 'mingguan', horizon: 4, kategori: 'Pelean Minggu' })
      .then(({ data }) => active && setForecast({ key: idKey, state: 'ok', data }))
      .catch((e) => active && setForecast({ key: idKey, state: 'error', text: pesanErrorAnalitik(e) }))
    runAnomalyApi({ idHuria })
      .then(({ data }) => active && setAnomaly({ key: idKey, state: 'ok', data }))
      .catch((e) => active && setAnomaly({ key: idKey, state: 'error', text: pesanErrorAnalitik(e) }))
    runCorrelationApi({ idHuria, granularitas: 'mingguan', kategori: 'Pelean Minggu' })
      .then(({ data }) => active && setCorr({ key: idKey, state: 'ok', data }))
      .catch((e) => active && setCorr({ key: idKey, state: 'error', text: pesanErrorAnalitik(e) }))
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idKey])

  const loadingState = { state: 'loading' }
  const forecast = forecastRaw.key === idKey ? forecastRaw : loadingState
  const anomaly = anomalyRaw.key === idKey ? anomalyRaw : loadingState
  const corr = corrRaw.key === idKey ? corrRaw : loadingState

  const select = (patch) => setSel((prev) => ({ ...prev, ...patch }))
  const onBar = (d) => {
    if (drill.level === 'distrik') select({ distrik: d.key, resort: null, huria: null })
    else if (drill.level === 'resort') select({ resort: d.key, huria: null })
    else select({ huria: sel.huria === d.key ? null : d.key })
  }
  const onSankeyNode = (name, level) => {
    if (level === 1) select({ kategori: sel.kategori === name ? null : name })
    else if (level === 0) onBar({ key: name })
  }
  const hasSelection = Object.values(sel).some(Boolean)

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-3 text-muted">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-sm font-medium">Membaca data warehouse…</span>
      </div>
    )
  }
  if (error) {
    return (
      <div className="space-y-2">
        <ErrorBox text={error} />
        <p className="text-xs text-muted">Pastikan ETL sudah dijalankan: <code>python -m etl.build_warehouse</code></p>
      </div>
    )
  }

  const fc = forecast.state === 'ok' && forecast.data.status === 'ok' ? forecast.data : null
  const history = fc ? fc.histori.map((p) => ({ label: p.periode, value: p.nilai })) : []
  const prakiraan = fc ? fc.prakiraan.map((p) => ({ label: p.periode, value: p.nilai, lower: p.bawah, upper: p.atas })) : []
  const temuan = anomaly.state === 'ok' ? anomaly.data.temuan || [] : []

  return (
    <div className="space-y-6">
      {/* Pertanyaan keputusan */}
      <header className="rounded-2xl bg-primary text-white p-5 sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">Halaman Storytelling · Data Warehouse</p>
        <h1 className="text-xl sm:text-2xl font-extrabold mt-1 leading-tight">
          Di mana kas Huria sehat, dan Huria mana yang perlu didampingi agar Setoran Pusat tepat waktu?
        </h1>
        <p className="text-sm text-white/80 mt-2 max-w-3xl">
          Pertanyaan keputusan untuk Pengurus Pusat, Praeses, dan Bendahara Huria. Klik batang, node Sankey, sel heatmap, atau kartu
          untuk memfilter seluruh halaman (cross-filter) dan menelusuri hierarki Distrik → Resort → Huria (drill-down).
        </p>
      </header>

      {isSuperAdmin && (
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={perbaruiWarehouse} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-bold text-primary cursor-pointer disabled:opacity-60">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />Perbarui data warehouse (jalankan ETL)
          </button>
          {refreshMsg && <span className="text-xs text-muted">{refreshMsg}</span>}
        </div>
      )}

      {/* Filter aktif */}
      <div className="flex flex-wrap items-center gap-2 min-h-8">
        <span className="text-xs font-bold text-muted">Filter aktif:</span>
        {!hasSelection && <span className="text-xs text-muted">Semua wilayah & kategori</span>}
        {Object.entries(sel).filter(([, v]) => v).map(([k, v]) => (
          <button key={k} onClick={() => select({ [k]: null, ...(k === 'distrik' ? { resort: null, huria: null } : {}), ...(k === 'resort' ? { huria: null } : {}) })}
            className="inline-flex items-center gap-1 rounded-full bg-primary-50 border border-primary-100 px-2.5 py-1 text-xs font-semibold text-primary cursor-pointer">
            {k}: {v} <X className="w-3 h-3" />
          </button>
        ))}
        {hasSelection && <button onClick={() => setSel(EMPTY_SELECTION)} className="text-xs font-bold underline text-primary cursor-pointer bg-transparent border-none">Hapus semua</button>}
      </div>

      {/* KPI + pembanding */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.id} className="bg-surface rounded-2xl border border-line p-4 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{k.label}</div>
            <div className="text-2xl font-extrabold text-ink mt-1 tracking-tight">{formatKpi(k)}</div>
            <div className="mt-2 flex flex-col gap-0.5">{k.comparisons.map((c) => <Delta key={c.label} c={c} />)}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title={insights.judul.ranking || 'Pemasukan per wilayah'} subtitle={`Drill-down: klik ${drill.title.toLowerCase()} untuk masuk satu tingkat lebih dalam`} badge="Drill-down">
          <ClickableBars data={ranking} onSelect={onBar} activeKey={sel[drill.key]} />
        </Panel>

        <Panel title={insights.judul.kepatuhan || 'Kepatuhan Setoran Pusat'} subtitle="Aliran dana: wilayah → kategori pemasukan → peruntukan (klik node untuk cross-filter)" badge="Sankey">
          <SankeyChart links={sankey.links} levels={sankey.levels} onNodeClick={onSankeyNode} activeNode={sel.kategori} />
        </Panel>
      </div>

      <Panel
        title={fc ? `Pelean Minggu diprakirakan ${fc.prakiraan[fc.prakiraan.length - 1] ? formatCompactRupiah(fc.prakiraan[0].nilai) : ''} pada ${fc.prakiraan[0]?.periode} (model: ${fc.metode.model})` : (insights.judul.tren || 'Tren pelean mingguan')}
        subtitle="Deret waktu beranotasi + prakiraan 4 minggu (Python: pembanding rata-rata bergerak, seasonal naive, Holt-Winters; dipilih lewat backtest)"
        badge="Python · Prakiraan"
      >
        {forecast.state === 'loading' && <p className="flex items-center gap-2 text-xs text-muted"><Loader2 className="w-3.5 h-3.5 animate-spin" />Menghitung prakiraan…</p>}
        {forecast.state === 'error' && <ErrorBox text={forecast.text} />}
        {forecast.state === 'ok' && !fc && <p className="text-xs text-muted">{(forecast.data.catatan || []).join(' ') || 'Data tidak cukup untuk prakiraan pada filter ini.'}</p>}
        {fc && (
          <>
            <AnnotatedTimeSeries history={history} forecast={prakiraan} annotations={annotationsFor(history)} />
            <p className="text-[11px] text-muted mt-2">
              Galat backtest model: sMAPE {fc.galat.model.smape}% · MAE {formatRupiah(fc.galat.model.mae)} (pembanding rata-rata bergerak: sMAPE {fc.galat.pembanding.smape}%).
            </p>
          </>
        )}
      </Panel>

      <Panel title="Pemasukan terkonsentrasi pada bulan-bulan tertentu, terutama bulan hari raya" subtitle="Heatmap pemasukan per Huria per bulan (klik sel untuk memfilter Huria)" badge="Heatmap">
        <HeatmapGrid rows={heat.rows} cols={heat.cols} matrix={heat.matrix} activeRow={sel.huria} onCellClick={(r) => select({ huria: sel.huria === r ? null : r })} />
      </Panel>

      <Panel title={`Tren pemasukan tiap ${drill.title.toLowerCase()} berpola serupa, dengan level berbeda`} subtitle="Small multiples: skala Y seragam agar dapat dibandingkan langsung" badge="Small multiples">
        <SmallMultiples series={multiples} activeKey={sel[drill.key]} onSelect={(key) => onBar({ key })} />
      </Panel>

      <Panel title={insights.judul.pelean || 'Kehadiran dan pelean per Huria'} subtitle="Bubble chart animasi per bulan: sumbu X = kehadiran rata-rata/sesi, Y = total pelean, ukuran = jumlah jemaat" badge="Bubble animasi">
        <AnimatedBubbleChart frames={bubbles} xLabel="Kehadiran rata-rata per sesi" yLabel="Total pelean bulan itu" rLabel="jumlah jemaat" onSelect={(d) => select({ huria: sel.huria === d.id ? null : d.id })} activeId={sel.huria} />
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel
          title={corr.state === 'ok' && corr.data.pearson !== null ? `Kehadiran dan pelean ${corr.data.interpretasi.toLowerCase().replace('.', '')} (r = ${corr.data.pearson})` : 'Hubungan kehadiran dan pelean'}
          subtitle="Korelasi Pearson & Spearman per minggu (Python)" badge="Python · Korelasi"
        >
          {corr.state === 'loading' && <p className="text-xs text-muted">Menghitung…</p>}
          {corr.state === 'error' && <ErrorBox text={corr.text} />}
          {corr.state === 'ok' && (
            <>
              <CorrelationScatter data={corr.data.data} />
              <p className="text-[11px] text-muted mt-1">Pearson {corr.data.pearson ?? '–'} · Spearman {corr.data.spearman ?? '–'} · {corr.data.jumlahPeriode} periode.</p>
            </>
          )}
        </Panel>

        <Panel
          title={anomaly.state === 'ok' ? `${temuan.length} ketidaksesuaian pencatatan terdeteksi pada Huria terpilih` : 'Deteksi ketidaksesuaian pencatatan'}
          subtitle="Aturan deterministik R1–R6 + z-score robust (median, MAD) pada rasio setoran (Python)" badge="Python · Anomali"
        >
          {anomaly.state === 'loading' && <p className="text-xs text-muted">Memeriksa aturan…</p>}
          {anomaly.state === 'error' && <ErrorBox text={anomaly.text} />}
          {anomaly.state === 'ok' && (temuan.length === 0
            ? <p className="text-sm text-emerald-700 font-semibold">Tidak ada anomali: seluruh transaksi, alokasi, dan setoran konsisten.</p>
            : (
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-xs">
                  <thead><tr className="text-left text-muted"><th className="py-1">Kode</th><th>Huria</th><th>Periode</th><th>Keterangan</th></tr></thead>
                  <tbody>
                    {temuan.slice(0, 12).map((t, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="py-1.5 pr-2"><span className={`inline-flex items-center gap-1 font-bold ${t.keparahan === 'tinggi' ? 'text-red-700' : 'text-amber-700'}`}><AlertTriangle className="w-3 h-3" />{t.kode}</span></td>
                        <td className="pr-2">{t.namaHuria}</td><td className="pr-2">{t.periode || '-'}</td><td>{t.ringkasan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
        </Panel>
      </div>

      <Panel title="Rekomendasi tindak lanjut" subtitle="Dihasilkan otomatis dari data yang sedang difilter" badge="Aksi">
        {insights.rekomendasi.length === 0
          ? <p className="text-sm text-muted">Tidak ada rekomendasi khusus untuk filter ini.</p>
          : <ol className="list-decimal pl-5 space-y-1.5 text-sm text-ink">{insights.rekomendasi.map((r, i) => <li key={i}>{r}</li>)}</ol>}
      </Panel>

      {ringkasan && (
        <Panel title="Dokumentasi data: seluruh visual di atas membaca data warehouse skema bintang yang sama dengan model ML" subtitle="Hasil ETL Python (etl/build_warehouse.py)" badge="Data warehouse">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              ['Baris fakta', ringkasan.totalBarisFakta.toLocaleString('id-ID')],
              ['Tabel fakta / dimensi', `${ringkasan.skema.fakta.length} / ${ringkasan.skema.dimensi.length}`],
              ['Huria berdata', `${ringkasan.jumlahHuriaBerdata} dari ${ringkasan.jumlahHuria}`],
              ['Rentang data', `${ringkasan.rentangTanggal.mulai} – ${ringkasan.rentangTanggal.akhir}`],
            ].map(([a, b]) => (
              <div key={a} className="rounded-xl bg-canvas border border-line p-3"><div className="text-[11px] text-muted font-semibold">{a}</div><div className="text-sm font-extrabold text-ink mt-0.5">{b}</div></div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-muted mb-1"><Database className="w-3.5 h-3.5" />Skor kualitas data (sebelum → sesudah pembersihan)</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(ringkasan.skorKualitas).map(([dim, v]) => (
              <div key={dim} className="rounded-xl border border-line p-3">
                <div className="text-[11px] font-semibold capitalize text-muted">{dim}</div>
                <div className="text-sm font-extrabold text-ink">{v.sebelum}% → {v.sesudah}%</div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  )
}
