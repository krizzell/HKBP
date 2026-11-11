import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { formatCompactRupiah } from '../../utils/formatters'

const PALETTE = ['#1e5a8a', '#d98e2b', '#2f9e6f', '#c0475b', '#7a5cc4', '#2c9cb8', '#8a6d3b', '#5b6b7a']
const INK = '#1f2937'
const MUTED = '#6b7280'
const LINE = '#e5e7eb'

const fmt = (v) => formatCompactRupiah(v)
const fmtNum = (v) => Number(v || 0).toLocaleString('id-ID')

function Empty({ text = 'Tidak ada data untuk filter ini' }) {
  return <div className="h-40 flex items-center justify-center text-xs text-muted">{text}</div>
}

/* ------------------------------------------------------------------ Sankey */
// links: [{source, target, value}]  levels: { nodeName: 0|1|2 }
export const SankeyChart = ({ links = [], levels = {}, height = 320, onNodeClick, activeNode, valueFormatter = fmt }) => {
  const width = 760
  const model = useMemo(() => {
    const valid = links.filter((l) => l.value > 0)
    const names = [...new Set(valid.flatMap((l) => [l.source, l.target]))]
    const cols = {}
    names.forEach((n) => {
      const lv = levels[n] ?? 0
      ;(cols[lv] = cols[lv] || []).push(n)
    })
    const out = {}
    const inn = {}
    valid.forEach((l) => {
      out[l.source] = (out[l.source] || 0) + l.value
      inn[l.target] = (inn[l.target] || 0) + l.value
    })
    const size = (n) => Math.max(out[n] || 0, inn[n] || 0)
    const levelKeys = Object.keys(cols).map(Number).sort((a, b) => a - b)
    const pad = 10
    const nodeW = 14
    const usable = height - 20
    const scale = Math.min(...levelKeys.map((k) => (usable - pad * (cols[k].length - 1)) / (cols[k].reduce((s, n) => s + size(n), 0) || 1)))
    const pos = {}
    levelKeys.forEach((k, ci) => {
      cols[k].sort((a, b) => size(b) - size(a))
      let y = 10
      const x = levelKeys.length === 1 ? 0 : (ci * (width - nodeW - 150)) / (levelKeys.length - 1)
      cols[k].forEach((n) => {
        const h = Math.max(size(n) * scale, 3)
        pos[n] = { x, y, h, in: 0, out: 0 }
        y += h + pad
      })
    })
    const paths = valid
      .sort((a, b) => pos[a.source].y - pos[b.source].y)
      .map((l) => {
        const s = pos[l.source]
        const t = pos[l.target]
        const w = Math.max(l.value * scale, 1)
        const y0 = s.y + s.out + w / 2
        const y1 = t.y + t.in + w / 2
        s.out += w
        t.in += w
        const x0 = s.x + nodeW
        const x1 = t.x
        const mid = (x0 + x1) / 2
        return { ...l, w, d: `M${x0},${y0} C${mid},${y0} ${mid},${y1} ${x1},${y1}` }
      })
    return { pos, paths, nodeW, names, size, levelKeys }
  }, [links, levels, height])

  if (!model.paths.length) return <Empty />
  const colorOf = (n) => PALETTE[model.names.indexOf(n) % PALETTE.length]
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width + 140} ${height}`} className="w-full min-w-[640px]" role="img" aria-label="Diagram Sankey aliran dana">
        {model.paths.map((p, i) => (
          <path key={i} d={p.d} fill="none" stroke={colorOf(p.source)} strokeWidth={p.w}
            opacity={activeNode && activeNode !== p.source && activeNode !== p.target ? 0.1 : 0.35}>
            <title>{`${p.source} → ${p.target}: ${valueFormatter(p.value)}`}</title>
          </path>
        ))}
        {model.names.map((n) => {
          const p = model.pos[n]
          const right = p.x > 200
          return (
            <g key={n} onClick={() => onNodeClick?.(n, levels[n] ?? 0)} className={onNodeClick ? 'cursor-pointer' : ''}>
              <rect x={p.x} y={p.y} width={model.nodeW} height={p.h} rx="3" fill={colorOf(n)} opacity={activeNode && activeNode !== n ? 0.45 : 1} />
              <text x={right ? p.x - 6 : p.x + model.nodeW + 6} y={p.y + p.h / 2} dominantBaseline="middle"
                textAnchor={right ? 'end' : 'start'} fontSize="11" fill={INK} fontWeight={activeNode === n ? 700 : 500}>
                {n.length > 26 ? `${n.slice(0, 25)}…` : n} · {valueFormatter(model.size(n))}
              </text>
              <title>{`${n}: ${valueFormatter(model.size(n))}`}</title>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* --------------------------------------------------------- Small multiples */
// series: [{ key, title, points: [{x, y}] }]
export const SmallMultiples = ({ series = [], onSelect, activeKey, valueFormatter = fmt }) => {
  const allY = series.flatMap((s) => s.points.map((p) => p.y))
  if (!allY.length) return <Empty />
  const maxY = Math.max(...allY, 1)
  const w = 200
  const h = 90
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${w + 20}px, 1fr))` }}>
      {series.map((s, idx) => {
        const n = s.points.length
        const step = n > 1 ? (w - 16) / (n - 1) : 0
        const pts = s.points.map((p, i) => [8 + i * step, h - 14 - (p.y / maxY) * (h - 28)])
        const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ')
        const last = s.points[n - 1]
        const color = PALETTE[idx % PALETTE.length]
        return (
          <button key={s.key} type="button" onClick={() => onSelect?.(s.key)}
            className={`text-left rounded-xl border p-2 bg-surface cursor-pointer transition-colors ${activeKey === s.key ? 'border-primary ring-2 ring-primary/20' : 'border-line hover:border-primary-300'}`}>
            <div className="text-[11px] font-bold text-ink truncate" title={s.title}>{s.title}</div>
            <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20" role="img" aria-label={`Tren ${s.title}`}>
              <line x1="8" x2={w - 8} y1={h - 14} y2={h - 14} stroke={LINE} />
              <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
              {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2" fill={color}><title>{`${s.points[i].x}: ${valueFormatter(s.points[i].y)}`}</title></circle>)}
            </svg>
            <div className="text-[10px] text-muted">Terakhir: <b className="text-ink">{valueFormatter(last?.y)}</b></div>
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------ Bubble chart animasi */
// frames: { label: [{id, name, x, y, r, group}] }  (label diurutkan)
export const AnimatedBubbleChart = ({ frames = {}, xLabel, yLabel, rLabel, onSelect, activeId, xFormatter = fmtNum, yFormatter = fmt }) => {
  const labels = Object.keys(frames).sort()
  const [chosen, setIdx] = useState(null) // null = bulan terakhir
  const [playing, setPlaying] = useState(false)
  const timer = useRef(null)
  const last = Math.max(labels.length - 1, 0)
  const idx = Math.min(chosen ?? last, last)
  useEffect(() => {
    if (!playing) return undefined
    timer.current = setInterval(() => {
      setIdx((i) => {
        const cur = Math.min(i ?? last, last)
        if (cur + 1 > last) { setPlaying(false); return cur }
        return cur + 1
      })
    }, 900)
    return () => clearInterval(timer.current)
  }, [playing, last])

  const all = Object.values(frames).flat()
  if (!all.length) return <Empty />
  const W = 720
  const H = 330
  const m = { l: 64, r: 20, t: 14, b: 40 }
  const maxX = Math.max(...all.map((d) => d.x)) * 1.08 || 1
  const maxY = Math.max(...all.map((d) => d.y)) * 1.08 || 1
  const maxR = Math.max(...all.map((d) => d.r)) || 1
  const groups = [...new Set(all.map((d) => d.group))]
  const sx = (v) => m.l + (v / maxX) * (W - m.l - m.r)
  const sy = (v) => H - m.b - (v / maxY) * (H - m.t - m.b)
  const current = frames[labels[idx]] || []
  const ticks = [0, 0.25, 0.5, 0.75, 1]
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <button type="button" onClick={() => { if (!playing && idx >= last) setIdx(0); setPlaying((p) => !p) }}
          className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center cursor-pointer" aria-label={playing ? 'Jeda' : 'Putar animasi'}>
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <input type="range" min="0" max={Math.max(labels.length - 1, 0)} value={idx} onChange={(e) => { setPlaying(false); setIdx(Number(e.target.value)) }} className="flex-1 accent-primary" aria-label="Pilih bulan" />
        <span className="text-sm font-extrabold text-primary w-20 text-right">{labels[idx]}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Bubble chart animasi per bulan">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={sy(maxY * t)} y2={sy(maxY * t)} stroke={LINE} />
            <text x={m.l - 6} y={sy(maxY * t)} fontSize="10" fill={MUTED} textAnchor="end" dominantBaseline="middle">{yFormatter(maxY * t)}</text>
            <text x={sx(maxX * t)} y={H - m.b + 14} fontSize="10" fill={MUTED} textAnchor="middle">{xFormatter(Math.round(maxX * t))}</text>
          </g>
        ))}
        <text x={(W + m.l) / 2} y={H - 4} fontSize="11" fill={INK} textAnchor="middle" fontWeight="600">{xLabel}</text>
        <text x="12" y={H / 2} fontSize="11" fill={INK} textAnchor="middle" fontWeight="600" transform={`rotate(-90 12 ${H / 2})`}>{yLabel}</text>
        {current.map((d) => (
          <circle key={d.id} cx={sx(d.x)} cy={sy(d.y)} r={6 + (d.r / maxR) * 20}
            fill={PALETTE[groups.indexOf(d.group) % PALETTE.length]} opacity={activeId && activeId !== d.id ? 0.25 : 0.7}
            stroke="#fff" strokeWidth="1.5" className="cursor-pointer" style={{ transition: 'cx 0.8s ease, cy 0.8s ease, r 0.8s ease, opacity .2s' }}
            onClick={() => onSelect?.(d)}>
            <title>{`${d.name}\n${xLabel}: ${xFormatter(d.x)}\n${yLabel}: ${yFormatter(d.y)}\n${rLabel}: ${fmtNum(d.r)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex flex-wrap gap-3 mt-1 text-[11px] text-muted">
        {groups.map((g, i) => <span key={g} className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />{g}</span>)}
        <span>· Ukuran gelembung = {rLabel}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------- Deret waktu beranotasi + prakiraan */
// history: [{label, value}]  forecast: [{label, value, lower, upper}]  annotations: [{label, text}]
export const AnnotatedTimeSeries = ({ history = [], forecast = [], annotations = [], height = 300, valueFormatter = fmt }) => {
  if (!history.length) return <Empty />
  const W = 760
  const m = { l: 62, r: 16, t: 28, b: 34 }
  const labels = [...history.map((p) => p.label), ...forecast.map((p) => p.label)]
  const n = labels.length
  const maxV = Math.max(...history.map((p) => p.value), ...forecast.map((p) => p.upper ?? p.value), 1) * 1.1
  const sx = (i) => m.l + (n > 1 ? (i / (n - 1)) * (W - m.l - m.r) : 0)
  const sy = (v) => height - m.b - (v / maxV) * (height - m.t - m.b)
  const line = history.map((p, i) => `${i ? 'L' : 'M'}${sx(i)},${sy(p.value)}`).join(' ')
  const start = history.length - 1
  const fline = forecast.length ? [`M${sx(start)},${sy(history[start].value)}`, ...forecast.map((p, i) => `L${sx(start + 1 + i)},${sy(p.value)}`)].join(' ') : ''
  const band = forecast.length
    ? `M${sx(start + 1)},${sy(forecast[0].upper ?? forecast[0].value)} ` +
      forecast.map((p, i) => `L${sx(start + 1 + i)},${sy(p.upper ?? p.value)}`).join(' ') + ' ' +
      [...forecast].reverse().map((p, i) => `L${sx(start + forecast.length - i)},${sy(p.lower ?? p.value)}`).join(' ') + ' Z'
    : ''
  const every = Math.max(1, Math.ceil(n / 10))
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full min-w-[620px]" role="img" aria-label="Deret waktu beranotasi dengan prakiraan">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={sy(maxV * t)} y2={sy(maxV * t)} stroke={LINE} />
            <text x={m.l - 6} y={sy(maxV * t)} fontSize="10" fill={MUTED} textAnchor="end" dominantBaseline="middle">{valueFormatter(maxV * t)}</text>
          </g>
        ))}
        {band && <path d={band} fill={PALETTE[1]} opacity="0.18" />}
        <path d={line} fill="none" stroke={PALETTE[0]} strokeWidth="2.2" strokeLinejoin="round" />
        {fline && <path d={fline} fill="none" stroke={PALETTE[1]} strokeWidth="2.2" strokeDasharray="6 4" />}
        {history.map((p, i) => <circle key={i} cx={sx(i)} cy={sy(p.value)} r="2.4" fill={PALETTE[0]}><title>{`${p.label}: ${valueFormatter(p.value)}`}</title></circle>)}
        {forecast.map((p, i) => <circle key={i} cx={sx(start + 1 + i)} cy={sy(p.value)} r="3.2" fill={PALETTE[1]}><title>{`Prakiraan ${p.label}: ${valueFormatter(p.value)} (${valueFormatter(p.lower)} – ${valueFormatter(p.upper)})`}</title></circle>)}
        {labels.map((l, i) => (i % every === 0 ? <text key={l} x={sx(i)} y={height - 12} fontSize="9.5" fill={MUTED} textAnchor="middle">{l.slice(-3) === l ? l : l.slice(2)}</text> : null))}
        {annotations.map((a, i) => {
          const idx = labels.indexOf(a.label)
          if (idx < 0) return null
          const v = history[idx]?.value ?? 0
          const flip = idx > n * 0.8
          return (
            <g key={i}>
              <line x1={sx(idx)} x2={sx(idx)} y1={sy(v)} y2={m.t - 6 + (i % 2) * 12} stroke={PALETTE[3]} strokeDasharray="3 3" />
              <circle cx={sx(idx)} cy={sy(v)} r="5" fill="none" stroke={PALETTE[3]} strokeWidth="2" />
              <text x={sx(idx) + (flip ? -6 : 6)} y={m.t - 4 + (i % 2) * 12} fontSize="10.5" fill={PALETTE[3]} fontWeight="700" textAnchor={flip ? 'end' : 'start'}>{a.text}</text>
            </g>
          )
        })}
      </svg>
      <div className="flex flex-wrap gap-4 text-[11px] text-muted mt-1">
        <span className="inline-flex items-center gap-1"><span className="w-4 h-0.5" style={{ background: PALETTE[0] }} />Aktual</span>
        {forecast.length > 0 && <span className="inline-flex items-center gap-1"><span className="w-4 border-t-2 border-dashed" style={{ borderColor: PALETTE[1] }} />Prakiraan + rentang</span>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ Heatmap */
// rows: [string]  cols: [string]  matrix: { 'row|col': value }
export const HeatmapGrid = ({ rows = [], cols = [], matrix = {}, onCellClick, activeRow, valueFormatter = fmt }) => {
  const vals = Object.values(matrix)
  if (!rows.length || !vals.length) return <Empty />
  const max = Math.max(...vals, 1)
  const cell = (v) => (v ? `rgba(30,90,138,${0.12 + 0.85 * (v / max)})` : '#f3f4f6')
  return (
    <div className="overflow-x-auto">
      <table className="text-[11px] border-separate border-spacing-0.5 w-full min-w-[560px]">
        <thead>
          <tr><th className="sticky left-0 bg-surface" />{cols.map((c) => <th key={c} className="font-semibold text-muted px-1">{c.slice(5)}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r}>
              <th className={`sticky left-0 bg-surface text-left pr-2 font-semibold whitespace-nowrap ${activeRow === r ? 'text-primary' : 'text-ink'}`}>{r.length > 24 ? `${r.slice(0, 23)}…` : r}</th>
              {cols.map((c) => {
                const v = matrix[`${r}|${c}`] || 0
                return (
                  <td key={c} onClick={() => onCellClick?.(r, c)} title={`${r} · ${c}: ${valueFormatter(v)}`}
                    className="h-7 min-w-9 rounded text-center cursor-pointer" style={{ background: cell(v), color: v / max > 0.55 ? '#fff' : INK }}>
                    {v ? valueFormatter(v).replace('Rp ', '') : ''}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* -------------------------------------------------------------- Bar chart klik */
// data: [{key, label, value, compare?}]
export const ClickableBars = ({ data = [], onSelect, activeKey, valueFormatter = fmt, color = PALETTE[0] }) => {
  if (!data.length) return <Empty />
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="space-y-1.5">
      {data.map((d) => (
        <button key={d.key} type="button" onClick={() => onSelect?.(d)} className="w-full text-left group cursor-pointer">
          <div className="flex justify-between text-[11px] mb-0.5">
            <span className={`truncate pr-2 ${activeKey === d.key ? 'font-extrabold text-primary' : 'font-semibold text-ink'}`}>{d.label}</span>
            <span className="text-muted shrink-0">{valueFormatter(d.value)}{d.share != null ? ` · ${d.share.toFixed(1)}%` : ''}</span>
          </div>
          <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full transition-all group-hover:opacity-80" style={{ width: `${(d.value / max) * 100}%`, background: activeKey && activeKey !== d.key ? '#9bb4c8' : color }} />
          </div>
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------- Model: aktual vs prediksi & residual */
export const ActualVsPredicted = ({ points = [], height = 320 }) => {
  if (!points.length) return <Empty />
  const W = 520
  const m = { l: 62, r: 14, t: 12, b: 38 }
  const all = points.flatMap((p) => [p.aktual, p.prediksi])
  const lo = Math.min(...all) * 0.95
  const hi = Math.max(...all) * 1.03
  const sx = (v) => m.l + ((v - lo) / (hi - lo)) * (W - m.l - m.r)
  const sy = (v) => height - m.b - ((v - lo) / (hi - lo)) * (height - m.t - m.b)
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label="Scatter aktual vs prediksi">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const v = lo + (hi - lo) * t
        return (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={sy(v)} y2={sy(v)} stroke={LINE} />
            <text x={m.l - 6} y={sy(v)} fontSize="10" fill={MUTED} textAnchor="end" dominantBaseline="middle">{fmt(v)}</text>
            <text x={sx(v)} y={height - m.b + 14} fontSize="10" fill={MUTED} textAnchor="middle">{fmt(v)}</text>
          </g>
        )
      })}
      <line x1={sx(lo)} y1={sy(lo)} x2={sx(hi)} y2={sy(hi)} stroke={PALETTE[3]} strokeDasharray="5 4" />
      {points.map((p, i) => (
        <circle key={i} cx={sx(p.aktual)} cy={sy(p.prediksi)} r="3.2" fill={PALETTE[0]} opacity="0.55">
          <title>{`${p.huria} · ${p.tanggal}\nAktual ${fmt(p.aktual)} | Prediksi ${fmt(p.prediksi)}`}</title>
        </circle>
      ))}
      <text x={(W + m.l) / 2} y={height - 4} fontSize="11" fill={INK} textAnchor="middle" fontWeight="600">Aktual (Rp)</text>
      <text x="12" y={height / 2} fontSize="11" fill={INK} textAnchor="middle" fontWeight="600" transform={`rotate(-90 12 ${height / 2})`}>Prediksi (Rp)</text>
    </svg>
  )
}

export const ResidualChart = ({ points = [], height = 320 }) => {
  if (!points.length) return <Empty />
  const W = 520
  const m = { l: 62, r: 14, t: 12, b: 38 }
  const maxAbs = Math.max(...points.map((p) => Math.abs(p.galat)), 1) * 1.1
  const sx = (v) => m.l + ((v - Math.min(...points.map((q) => q.aktual))) / ((Math.max(...points.map((q) => q.aktual)) - Math.min(...points.map((q) => q.aktual))) || 1)) * (W - m.l - m.r)
  const sy = (v) => height / 2 - (v / maxAbs) * (height / 2 - m.t - 4)
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label="Plot residual">
      {[-1, -0.5, 0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={m.l} x2={W - m.r} y1={sy(maxAbs * t)} y2={sy(maxAbs * t)} stroke={t === 0 ? INK : LINE} strokeWidth={t === 0 ? 1.2 : 1} />
          <text x={m.l - 6} y={sy(maxAbs * t)} fontSize="10" fill={MUTED} textAnchor="end" dominantBaseline="middle">{fmt(maxAbs * t)}</text>
        </g>
      ))}
      {points.map((p, i) => (
        <circle key={i} cx={sx(p.aktual)} cy={sy(p.galat)} r="3.2" fill={p.galat >= 0 ? PALETTE[1] : PALETTE[2]} opacity="0.6">
          <title>{`${p.huria} · ${p.tanggal}\nGalat (prediksi - aktual): ${fmt(p.galat)}`}</title>
        </circle>
      ))}
      <text x={(W + m.l) / 2} y={height - 4} fontSize="11" fill={INK} textAnchor="middle" fontWeight="600">Nilai aktual (Rp)</text>
      <text x="12" y={height / 2} fontSize="11" fill={INK} textAnchor="middle" fontWeight="600" transform={`rotate(-90 12 ${height / 2})`}>Residual (Rp)</text>
    </svg>
  )
}

/* -------------------------------------------------------- Correlation scatter */
export const CorrelationScatter = ({ data = [], height = 260 }) => {
  if (!data.length) return <Empty />
  const W = 520
  const m = { l: 62, r: 14, t: 12, b: 38 }
  const maxX = Math.max(...data.map((d) => d.jumlahHadir)) * 1.05 || 1
  const maxY = Math.max(...data.map((d) => d.nominal)) * 1.05 || 1
  const sx = (v) => m.l + (v / maxX) * (W - m.l - m.r)
  const sy = (v) => height - m.b - (v / maxY) * (height - m.t - m.b)
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label="Scatter kehadiran vs pemasukan">
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={m.l} x2={W - m.r} y1={sy(maxY * t)} y2={sy(maxY * t)} stroke={LINE} />
          <text x={m.l - 6} y={sy(maxY * t)} fontSize="10" fill={MUTED} textAnchor="end" dominantBaseline="middle">{fmt(maxY * t)}</text>
          <text x={sx(maxX * t)} y={height - m.b + 14} fontSize="10" fill={MUTED} textAnchor="middle">{fmtNum(Math.round(maxX * t))}</text>
        </g>
      ))}
      {data.map((d, i) => <circle key={i} cx={sx(d.jumlahHadir)} cy={sy(d.nominal)} r="3.6" fill={PALETTE[4]} opacity="0.65"><title>{`${d.periode}: ${fmtNum(d.jumlahHadir)} jiwa · ${fmt(d.nominal)}`}</title></circle>)}
      <text x={(W + m.l) / 2} y={height - 4} fontSize="11" fill={INK} textAnchor="middle" fontWeight="600">Total kehadiran per periode</text>
    </svg>
  )
}
