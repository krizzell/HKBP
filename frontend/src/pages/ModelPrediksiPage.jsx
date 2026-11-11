import { useEffect, useMemo, useState } from 'react'
import { Award, BrainCircuit, Loader2, ShieldCheck, Sparkles } from 'lucide-react'
import { getMlMetrics, getMlOpsi, pesanErrorAnalitik, predictPelean } from '../api/analyticsApi'
import { ActualVsPredicted, ClickableBars, ResidualChart } from '../components/charts/AdvancedCharts'
import { formatCompactRupiah, formatRupiah } from '../utils/formatters'

const Panel = ({ title, subtitle, children, badge }) => (
  <section className="bg-surface rounded-2xl border border-line p-4 sm:p-5 shadow-xs">
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

const MANUAL_FIELDS = [
  ['jumlahJemaat', 'Jumlah jemaat'],
  ['peleanMingguLalu', 'Pelean 1 minggu lalu (Rp)'],
  ['peleanDuaMingguLalu', 'Pelean 2 minggu lalu (Rp)'],
  ['rataPelean4', 'Rata-rata pelean 4 minggu (Rp)'],
  ['hadirMingguLalu', 'Kehadiran 1 minggu lalu'],
  ['rataHadir4', 'Rata-rata kehadiran 4 minggu'],
]

const pct = (v, d = 2) => `${Number(v).toFixed(d)}%`
const SUMBER_WARNA = { warehouse: 'text-primary', manual: 'text-amber-700', kalender: 'text-emerald-700', diturunkan: 'text-muted', input: 'text-muted' }

export const ModelPrediksiPage = () => {
  const [metrics, setMetrics] = useState(null)
  const [opsi, setOpsi] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({ idHuria: '', sesi: '', tanggal: '' })
  const [manual, setManual] = useState({})
  const [useManual, setUseManual] = useState(false)
  const [hasil, setHasil] = useState(null)
  const [formError, setFormError] = useState('')
  const [predicting, setPredicting] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([getMlMetrics(), getMlOpsi()])
      .then(([m, o]) => {
        if (!active) return
        setMetrics(m)
        setOpsi(o)
        const first = o.huria[0]
        const akhir = m.meta?.rentangTanggal?.akhir
        const next = akhir ? new Date(new Date(akhir).getTime() + 7 * 86400000).toISOString().slice(0, 10) : ''
        setForm({ idHuria: first?.idHuria || '', sesi: o.sesi[0] || '', tanggal: next })
      })
      .catch((e) => active && setError(pesanErrorAnalitik(e)))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setPredicting(true)
    setFormError('')
    try {
      const payload = { sesi: form.sesi, tanggal: form.tanggal }
      if (form.idHuria && !(useManual && form.idHuria === '__baru')) payload.idHuria = form.idHuria
      if (useManual) {
        Object.entries(manual).forEach(([k, v]) => { if (v !== '' && v !== undefined) payload[k] = Number(v) })
      }
      setHasil(await predictPelean(payload))
    } catch (err) {
      setHasil(null)
      setFormError(pesanErrorAnalitik(err))
    } finally {
      setPredicting(false)
    }
  }

  const rows = useMemo(() => (metrics ? Object.entries(metrics.model).map(([key, v]) => ({ key, ...v })) : []), [metrics])

  if (loading) {
    return <div className="h-96 flex flex-col items-center justify-center gap-3 text-muted"><Loader2 className="w-8 h-8 animate-spin text-primary" /><span className="text-sm">Memuat model…</span></div>
  }
  if (error) {
    return (
      <div className="space-y-2">
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700" role="alert">{error}</div>
        <p className="text-xs text-muted">Latih model terlebih dahulu: <code>python -m etl.build_warehouse</code> lalu <code>python -m app.ml.train</code></p>
      </div>
    )
  }

  const best = metrics.modelTerbaik
  const naif = metrics.pembandingNaif
  const bestRow = metrics.model[best]
  const mapeBars = [
    ...rows.map((r) => ({ key: r.key, label: r.nama + (r.key === best ? ' ★' : ''), value: r.uji.mape })),
    { key: 'naif', label: 'Pembanding naif (pelean minggu lalu)', value: naif.uji.mape },
  ]

  return (
    <div className="space-y-6">
      <header className="rounded-2xl bg-primary text-white p-5 sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">Modul Data Science · Regresi</p>
        <h1 className="text-xl sm:text-2xl font-extrabold mt-1 leading-tight">Prediksi Pelean Sesi Ibadah</h1>
        <p className="text-sm text-white/80 mt-2 max-w-3xl">
          Memperkirakan total pelean (Rp) sebuah sesi ibadah <b>sebelum</b> sesi berlangsung, untuk perencanaan kas Huria dan Setoran Pusat.
          Model dilatih dari data warehouse yang sama dengan dashboard: {metrics.meta.jumlahBaris} observasi, {metrics.meta.jumlahHuria} Huria,
          {' '}{metrics.meta.rentangTanggal.mulai} s/d {metrics.meta.rentangTanggal.akhir}.
        </p>
      </header>

      {/* ---------------- Formulir input data baru */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2">
          <Panel title="Form input data baru" subtitle="Pilih Huria, sesi, dan tanggal ibadah. Nilai historis diambil otomatis dari warehouse." badge="Prediksi">
            <form onSubmit={submit} className="space-y-3">
              <label className="block text-xs font-bold text-ink">Huria
                <select value={form.idHuria} onChange={(e) => setForm({ ...form, idHuria: e.target.value })} className="mt-1 w-full h-10 rounded-lg border border-line bg-canvas px-2 text-sm">
                  {opsi.huria.map((h) => <option key={h.idHuria} value={h.idHuria}>{h.namaHuria} — {h.namaResort}</option>)}
                  <option value="">(Huria baru / isi manual)</option>
                </select>
              </label>
              <label className="block text-xs font-bold text-ink">Sesi ibadah
                <select value={form.sesi} onChange={(e) => setForm({ ...form, sesi: e.target.value })} className="mt-1 w-full h-10 rounded-lg border border-line bg-canvas px-2 text-sm">
                  {opsi.sesi.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="block text-xs font-bold text-ink">Tanggal ibadah (Minggu)
                <input type="date" required value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} className="mt-1 w-full h-10 rounded-lg border border-line bg-canvas px-2 text-sm" />
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
                <input type="checkbox" checked={useManual} onChange={(e) => setUseManual(e.target.checked)} className="accent-primary" />
                Isi nilai historis secara manual (Huria baru / skenario “bagaimana jika”)
              </label>
              {useManual && (
                <div className="grid grid-cols-2 gap-2">
                  {MANUAL_FIELDS.map(([k, label]) => (
                    <label key={k} className="block text-[11px] font-semibold text-muted">{label}
                      <input type="number" min="0" value={manual[k] ?? ''} onChange={(e) => setManual({ ...manual, [k]: e.target.value })} className="mt-0.5 w-full h-9 rounded-lg border border-line bg-canvas px-2 text-sm text-ink" />
                    </label>
                  ))}
                </div>
              )}
              <button type="submit" disabled={predicting} className="w-full h-10 rounded-lg bg-primary text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
                {predicting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Prediksi pelean
              </button>
              {formError && <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700" role="alert">{formError}</div>}
            </form>
          </Panel>
        </div>

        <div className="xl:col-span-3">
          <Panel title={hasil ? `Pelean diprediksi ${formatRupiah(hasil.prediksi)}` : 'Hasil prediksi'} subtitle={hasil ? `${hasil.namaHuria || 'Huria manual'} · ${hasil.sesi} · ${hasil.tanggal}` : 'Hasil muncul di sini setelah form dikirim'} badge={hasil ? hasil.model : undefined}>
            {!hasil ? (
              <div className="h-40 flex flex-col items-center justify-center text-muted text-xs gap-2"><BrainCircuit className="w-8 h-8 text-primary/40" />Belum ada prediksi</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl bg-primary-50 border border-primary-100 p-3"><div className="text-[11px] font-semibold text-muted">Nilai prediksi</div><div className="text-lg font-extrabold text-primary">{formatCompactRupiah(hasil.prediksi)}</div></div>
                  <div className="rounded-xl border border-line p-3"><div className="text-[11px] font-semibold text-muted">Rentang wajar</div><div className="text-sm font-extrabold text-ink">{formatCompactRupiah(hasil.rentang.bawah)} – {formatCompactRupiah(hasil.rentang.atas)}</div></div>
                  <div className="rounded-xl border border-line p-3"><div className="text-[11px] font-semibold text-muted">Pembanding (pelean minggu lalu)</div><div className="text-sm font-extrabold text-ink">{formatCompactRupiah(hasil.pembandingNaif)}</div></div>
                </div>
                <p className="text-[11px] text-muted">{hasil.rentang.keterangan}.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-left text-muted"><th className="py-1">Fitur yang dipakai model</th><th className="text-right">Nilai</th><th className="text-right">Sumber</th></tr></thead>
                    <tbody>
                      {hasil.fiturDipakai.map((f) => (
                        <tr key={f.nama} className="border-t border-line"><td className="py-1">{f.label}</td><td className="text-right font-semibold">{Number(f.nilai).toLocaleString('id-ID')}</td><td className={`text-right font-bold ${SUMBER_WARNA[f.sumber] || ''}`}>{f.sumber}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* ---------------- Perbandingan model */}
      <Panel title={`${metrics.namaModelTerbaik} dipilih: MAPE uji ${pct(bestRow.uji.mape)} vs pembanding naif ${pct(naif.uji.mape)}`} subtitle={metrics.alasanPemilihan} badge="Perbandingan 3 model">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted border-b border-line">
                <th className="py-2">Model</th><th className="text-right">RMSE validasi</th><th className="text-right">MAE uji</th><th className="text-right">RMSE uji</th>
                <th className="text-right">MAPE uji</th><th className="text-right">R² uji</th><th className="text-right">R² CV-waktu (5 fold)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className={`border-b border-line ${r.key === best ? 'bg-primary-50/60 font-bold' : ''}`}>
                  <td className="py-2 flex items-center gap-1">{r.key === best && <Award className="w-3.5 h-3.5 text-primary" />}{r.nama}</td>
                  <td className="text-right">{formatCompactRupiah(r.validasi.rmse)}</td><td className="text-right">{formatCompactRupiah(r.uji.mae)}</td>
                  <td className="text-right">{formatCompactRupiah(r.uji.rmse)}</td><td className="text-right">{pct(r.uji.mape)}</td>
                  <td className="text-right">{r.uji.r2.toFixed(4)}</td><td className="text-right">{r.cvWaktu.r2.rata.toFixed(4)} ± {r.cvWaktu.r2.simpangan.toFixed(4)}</td>
                </tr>
              ))}
              <tr className="text-muted"><td className="py-2">Pembanding naif (pelean minggu lalu)</td><td className="text-right">{formatCompactRupiah(naif.validasi.rmse)}</td><td className="text-right">{formatCompactRupiah(naif.uji.mae)}</td><td className="text-right">{formatCompactRupiah(naif.uji.rmse)}</td><td className="text-right">{pct(naif.uji.mape)}</td><td className="text-right">{naif.uji.r2.toFixed(4)}</td><td className="text-right">–</td></tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div><div className="text-xs font-bold text-ink mb-2">Galat MAPE pada data uji (lebih kecil lebih baik)</div><ClickableBars data={mapeBars} valueFormatter={(v) => pct(v)} /></div>
          <div className="text-xs text-muted space-y-1.5">
            <div className="font-bold text-ink">Hyperparameter hasil tuning</div>
            {rows.map((r) => <div key={r.key}><b className="text-ink">{r.nama}</b>: {r.tuning.metode}{Object.keys(r.tuning.parameterTerbaik).length ? ` → ${JSON.stringify(r.tuning.parameterTerbaik)}` : ''}</div>)}
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Titik prediksi mengikuti garis ideal, penyimpangan kecil" subtitle="Aktual vs prediksi pada data uji (garis putus-putus = prediksi sempurna)" badge="Actual vs Predicted"><ActualVsPredicted points={metrics.titikUji} /></Panel>
        <Panel title="Residual tersebar acak di sekitar nol, tanpa pola sistematis" subtitle="Residual = prediksi − aktual pada data uji" badge="Residual"><ResidualChart points={metrics.titikUji} /></Panel>
      </div>

      <Panel title={`Fitur paling berpengaruh: ${metrics.kepentingan[0]?.label}`} subtitle={`Kepentingan fitur model ${metrics.namaModelTerbaik}`} badge="Feature importance">
        <ClickableBars data={metrics.kepentingan.slice(0, 8).map((f) => ({ key: f.fitur, label: f.label, value: f.kepentingan * 100 }))} valueFormatter={(v) => `${v.toFixed(1)}%`} />
      </Panel>

      {/* ---------------- Analisis kesalahan */}
      <Panel title="Analisis kesalahan: 10 galat terbesar pada data uji beserta dugaan penyebabnya" subtitle={metrics.metrikHariRaya ? `Pada Paskah & Pentakosta (seluruh data): MAPE ${pct(metrics.metrikHariRaya.mape)}` : undefined} badge="Error analysis">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-muted border-b border-line"><th className="py-1">Huria</th><th>Tanggal</th><th className="text-right">Aktual</th><th className="text-right">Prediksi</th><th className="text-right">Galat</th><th className="pl-3">Dugaan penyebab</th></tr></thead>
            <tbody>
              {metrics.analisisKesalahan.map((e, i) => (
                <tr key={i} className="border-b border-line align-top">
                  <td className="py-1.5">{e.huria}</td><td>{e.tanggal}</td><td className="text-right">{formatCompactRupiah(e.aktual)}</td><td className="text-right">{formatCompactRupiah(e.prediksi)}</td>
                  <td className={`text-right font-bold ${e.galat > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{e.galatPersen}%</td><td className="pl-3 text-muted">{e.dugaanPenyebab}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ---------------- Model card */}
      <Panel title="Model Card" subtitle="Tujuan, data latih, performa, dan keterbatasan" badge="Transparansi">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs text-ink">
          <div className="space-y-2">
            <div><b>Tujuan.</b> {metrics.meta.tugas}. Pengguna: bendahara Huria, pengurus resort/distrik.</div>
            <div><b>Data latih.</b> {metrics.meta.jumlahBaris} baris dari <code>fact_kehadiran</code>; split kronologis — latih {metrics.meta.split.latih.baris} (≤ {metrics.meta.split.latih.sampai}), validasi {metrics.meta.split.validasi.baris}, uji {metrics.meta.split.uji.baris} ({metrics.meta.split.uji.dari} s/d {metrics.meta.split.uji.sampai}).</div>
            <div><b>Fitur ({metrics.meta.fitur.length}).</b> {metrics.meta.fitur.map((f) => f.label).join(', ')}.</div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1 font-bold"><ShieldCheck className="w-4 h-4 text-emerald-600" />Pencegahan kebocoran data</div>
            <ul className="list-disc pl-5 text-muted space-y-1">{metrics.meta.pencegahanKebocoran.map((p, i) => <li key={i}>{p}</li>)}</ul>
            <div className="font-bold pt-1">Keterbatasan</div>
            <ul className="list-disc pl-5 text-muted space-y-1">{metrics.catatan.map((c, i) => <li key={i}>{c}</li>)}<li>Hanya satu periode (2026): pola musiman tahunan belum dapat dipelajari.</li></ul>
          </div>
        </div>
      </Panel>
    </div>
  )
}
