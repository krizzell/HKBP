import { useState } from 'react'
import { formatCompactRupiah, formatRupiah } from '../../utils/formatters'

// 1. SVG BAR CHART
export const SvgBarChart = ({
  data = [],
  height = 240,
  color = 'var(--color-chart-1)',
  valueFormatter = formatCompactRupiah,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null)

  if (!data || data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-muted">
        Tidak ada data untuk grafik
      </div>
    )
  }

  const hasLongLabels = data.some((d) => (d.label || '').length > 6)
  const maxVal = Math.max(...data.map((d) => d.value || 0), 1)
  const svgHeight = hasLongLabels ? height + 35 : height
  const chartHeight = hasLongLabels ? height - 55 : height - 40
  const width = 860
  const barWidth = Math.max(10, Math.min(30, (width - 70) / data.length - 8))
  const spacing = (width - 70) / data.length

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${svgHeight}`} className="w-full h-auto overflow-visible">
        {/* Horizontal Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = chartHeight - pct * (chartHeight - 30) + 15
          return (
            <g key={i}>
              <line
                x1="50"
                y1={y}
                x2={width}
                y2={y}
                stroke="var(--color-line)"
                strokeDasharray="3 3"
              />
              <text
                x="45"
                y={y + 3.5}
                textAnchor="end"
                className="text-[9.5px] font-medium"
                fill="var(--color-muted)"
              >
                {valueFormatter(maxVal * pct)}
              </text>
            </g>
          )
        })}

        {/* Bars */}
        {data.map((item, idx) => {
          const barHeight = Math.max(4, ((item.value || 0) / maxVal) * (chartHeight - 30))
          const x = 60 + idx * spacing + (spacing - barWidth) / 2
          const y = chartHeight + 15 - barHeight
          const isHovered = hoveredIdx === idx
          const labelX = x + barWidth / 2
          const labelY = hasLongLabels ? chartHeight + 25 : height - 8

          return (
            <g
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer transition-all duration-200"
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="3.5"
                fill={item.color || color}
                opacity={isHovered ? 1 : 0.88}
                className="transition-all duration-200"
              />
              {/* X Label */}
              <text
                x={labelX}
                y={labelY}
                transform={hasLongLabels ? `rotate(-28 ${labelX} ${labelY})` : undefined}
                textAnchor={hasLongLabels ? 'end' : 'middle'}
                className={`text-[9.5px] font-medium ${
                  isHovered ? 'font-bold' : ''
                }`}
                fill={isHovered ? 'var(--color-ink)' : 'var(--color-muted)'}
              >
                {hasLongLabels && item.label && item.label.length > 20
                  ? `${item.label.slice(0, 18)}…`
                  : item.label}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div
          className="absolute z-20 pointer-events-none rounded-xl bg-ink text-surface px-3 py-2 text-xs shadow-xl transition-all border border-line/20"
          style={{
            left: `${((hoveredIdx + 0.5) / data.length) * 100}%`,
            top: '5px',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-semibold text-surface/80 text-[11px]">{data[hoveredIdx].label}</div>
          <div className="font-bold text-accent text-xs mt-0.5">
            {formatRupiah(data[hoveredIdx].value)}
          </div>
          {data[hoveredIdx].subtext && (
            <div className="text-[9.5px] text-surface/60 mt-0.5">{data[hoveredIdx].subtext}</div>
          )}
        </div>
      )}
    </div>
  )
}

// 2. SVG LINE CHART (Multi-Series support with Column Hover)
export const SvgLineChart = ({
  data = [],
  height = 240,
  series = [{ key: 'value', label: 'Nilai', color: 'var(--color-chart-1)' }],
  valueFormatter = formatCompactRupiah,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null)

  if (!data || data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-muted">
        Tidak ada data tren
      </div>
    )
  }

  const hasLongLabels = data.some((d) => (d.label || '').length > 6)
  const allValues = data.flatMap((d) => series.map((s) => d[s.key] || 0))
  const maxVal = Math.max(...allValues, 1)
  const width = 860
  const svgHeight = hasLongLabels ? height + 35 : height
  const chartHeight = hasLongLabels ? height - 55 : height - 42
  const spacing = (width - 90) / (data.length - 1 || 1)

  const hoveredX = hoveredIdx !== null ? 75 + hoveredIdx * spacing : 0

  return (
    <div className="relative w-full">
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-end gap-3.5 mb-2 text-xs">
        {series.map((s, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-muted font-medium text-[11px]">{s.label}</span>
          </div>
        ))}
      </div>

      <svg viewBox={`0 0 ${width} ${svgHeight}`} className="w-full h-auto overflow-visible">
        <defs>
          {series.map((s, idx) => (
            <linearGradient key={idx} id={`chart-grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.0" />
            </linearGradient>
          ))}
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = chartHeight - pct * (chartHeight - 30) + 15
          return (
            <g key={i}>
              <line
                x1="65"
                y1={y}
                x2={width}
                y2={y}
                stroke="var(--color-line)"
                strokeDasharray="3 3"
              />
              <text
                x="58"
                y={y + 3.5}
                textAnchor="end"
                className="text-[9.5px] font-medium"
                fill="var(--color-muted)"
              >
                {valueFormatter(maxVal * pct)}
              </text>
            </g>
          )
        })}

        {/* Hovered Column Highlight Line */}
        {hoveredIdx !== null && (
          <line
            x1={hoveredX}
            y1={15}
            x2={hoveredX}
            y2={chartHeight + 15}
            stroke="var(--color-primary-300)"
            strokeDasharray="3 3"
            strokeWidth="1.5"
            opacity="0.8"
          />
        )}

        {/* Area & Lines */}
        {series.map((s, sIdx) => {
          const points = data.map((d, dIdx) => {
            const x = 75 + dIdx * spacing
            const y = chartHeight + 15 - ((d[s.key] || 0) / maxVal) * (chartHeight - 30)
            return { x, y, val: d[s.key] || 0, label: d.label }
          })

          const pathD = points.reduce(
            (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
            ''
          )
          const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight + 15} L ${
            points[0].x
          } ${chartHeight + 15} Z`

          return (
            <g key={sIdx}>
              {/* Gradient Area */}
              <path d={areaD} fill={`url(#chart-grad-${sIdx})`} />
              {/* Line */}
              <path
                d={pathD}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Points */}
              {points.map((pt, pIdx) => {
                const isPointHovered = hoveredIdx === pIdx
                return (
                  <circle
                    key={pIdx}
                    cx={pt.x}
                    cy={pt.y}
                    r={isPointHovered ? 4.5 : 3}
                    fill="var(--color-surface)"
                    stroke={s.color}
                    strokeWidth={isPointHovered ? 2.5 : 1.8}
                    className="cursor-pointer transition-all duration-150"
                  />
                )
              })}
            </g>
          )
        })}

        {/* Invisible Vertical Columns for Smooth Hover */}
        {data.map((d, dIdx) => {
          const x = 75 + dIdx * spacing
          const colWidth = Math.max(24, spacing)
          return (
            <rect
              key={`hover-col-${dIdx}`}
              x={x - colWidth / 2}
              y={10}
              width={colWidth}
              height={chartHeight + 10}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(dIdx)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          )
        })}

        {/* X Axis Labels */}
        {data.map((d, i) => {
          const shouldShow =
            data.length <= 12 || i % Math.ceil(data.length / 10) === 0 || i === data.length - 1
          if (!shouldShow) return null
          const x = 75 + i * spacing
          const isLabelHovered = hoveredIdx === i
          const labelY = hasLongLabels ? chartHeight + 25 : height - 6

          if (hasLongLabels) {
            return (
              <text
                key={i}
                x={x}
                y={labelY}
                transform={`rotate(-28 ${x} ${labelY})`}
                textAnchor="end"
                className={`text-[9.5px] ${isLabelHovered ? 'font-bold' : 'font-medium'}`}
                fill={isLabelHovered ? 'var(--color-ink)' : 'var(--color-muted)'}
              >
                {d.label && d.label.length > 22 ? `${d.label.slice(0, 20)}…` : d.label}
              </text>
            )
          }

          return (
            <text
              key={i}
              x={x}
              y={labelY}
              textAnchor="middle"
              className={`text-[9.5px] ${isLabelHovered ? 'font-bold' : 'font-medium'}`}
              fill={isLabelHovered ? 'var(--color-ink)' : 'var(--color-muted)'}
            >
              {d.label}
            </text>
          )
        })}
      </svg>

      {/* Multi-Series Hover Tooltip */}
      {hoveredIdx !== null && data[hoveredIdx] && (
        <div
          className="absolute z-30 pointer-events-none rounded-xl bg-ink text-surface px-3.5 py-2.5 text-xs shadow-xl transition-all border border-line/20 min-w-[220px]"
          style={{
            left: `${(hoveredX / width) * 100}%`,
            top: '0px',
            transform:
              hoveredX > width * 0.72
                ? 'translateX(-95%)'
                : hoveredX < width * 0.28
                ? 'translateX(5%)'
                : 'translateX(-50%)',
          }}
        >
          <div className="font-semibold text-surface/90 text-[11px] border-b border-surface/20 pb-1 mb-1.5 flex items-center justify-between">
            <span>Bulan {data[hoveredIdx].label} 2026</span>
            <span className="text-[9.5px] text-surface/60">{series.length} Seri</span>
          </div>
          <div className="space-y-1.5">
            {series.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 truncate max-w-[160px]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-surface/80 truncate text-[10.5px]">{s.label}:</span>
                </div>
                <span className="font-bold text-accent shrink-0 text-xs">
                  {formatRupiah(data[hoveredIdx][s.key] || 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// 3. SVG DONUT / PIE CHART (using chart-1 to chart-6 sequentially)
export const SvgDonutChart = ({
  data = [],
  height = 220,
  innerRadius = 55,
  outerRadius = 85,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null)

  const defaultColors = [
    'var(--color-chart-1)',
    'var(--color-chart-2)',
    'var(--color-chart-3)',
    'var(--color-chart-4)',
    'var(--color-chart-5)',
    'var(--color-chart-6)',
  ]

  const total = data.reduce((acc, d) => acc + (d.value || 0), 0)

  if (!data || data.length === 0 || total === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted">
        Tidak ada data proporsi
      </div>
    )
  }

  const cx = 110
  const cy = 110

  // Calculate slices
  let accumulatedAngle = -90 // Start at top
  const slices = data.map((item, idx) => {
    const angle = ((item.value || 0) / total) * 360
    const startAngle = accumulatedAngle
    const endAngle = accumulatedAngle + angle
    accumulatedAngle += angle

    // Polar to Cartesian
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180

    const x1 = cx + outerRadius * Math.cos(startRad)
    const y1 = cy + outerRadius * Math.sin(startRad)
    const x2 = cx + outerRadius * Math.cos(endRad)
    const y2 = cy + outerRadius * Math.sin(endRad)

    const x3 = cx + innerRadius * Math.cos(endRad)
    const y3 = cy + innerRadius * Math.sin(endRad)
    const x4 = cx + innerRadius * Math.cos(startRad)
    const y4 = cy + innerRadius * Math.sin(startRad)

    const largeArc = angle > 180 ? 1 : 0

    const pathData = `
      M ${x1} ${y1}
      A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}
      Z
    `

    const percentage = ((item.value / total) * 100).toFixed(1)

    return {
      ...item,
      pathData,
      percentage,
      color: item.color || defaultColors[idx % defaultColors.length],
    }
  })

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
      <div className="relative">
        <svg width="220" height="220" viewBox="0 0 220 220" className="overflow-visible">
          {slices.map((slice, idx) => {
            const isHovered = hoveredIdx === idx
            return (
              <path
                key={idx}
                d={slice.pathData}
                fill={slice.color}
                opacity={isHovered ? 1 : 0.9}
                transform={isHovered ? 'scale(1.04) translate(-4, -4)' : 'scale(1)'}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            )
          })}
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-[11px] font-semibold text-muted">Total</span>
          <span className="text-sm font-bold text-ink">{formatCompactRupiah(total)}</span>
        </div>
      </div>

      {/* Legend & Percentages */}
      <div className="flex flex-col gap-2 min-w-[180px]">
        {slices.map((slice, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between text-xs p-1.5 rounded-lg cursor-pointer transition-colors ${
              hoveredIdx === idx ? 'bg-primary-50 font-semibold' : ''
            }`}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-ink">{slice.label}</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-ink">{slice.percentage}%</span>
              <div className="text-[10px] text-muted">{formatCompactRupiah(slice.value)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 4. COMPARISON GROUPED BAR CHART
export const ComparisonGroupedBarChart = ({ data = [], items = [], height = 240, series: customSeries = null }) => {
  const [hoveredGroup, setHoveredGroup] = useState(null)
  const chartData = data.length > 0 ? data : items

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-muted">
        Pilih wilayah untuk membandingkan
      </div>
    )
  }

  // Uses chart-1 through chart-6 or customSeries
  const series = customSeries || [
    {
      key: 'totalPemasukan',
      altKey: 'pemasukan',
      label: 'Total Pemasukan',
      color: 'var(--color-chart-1)',
    },
    {
      key: 'alokasiPusat',
      altKey: 'setoranPusat',
      label: 'Setoran Pusat (55%)',
      color: 'var(--color-chart-3)',
    },
    {
      key: 'alokasiKas',
      altKey: 'kasHuria',
      label: 'Kas Huria (45%)',
      color: 'var(--color-chart-2)',
    },
  ]

  const getSeriesVal = (d, s) => (d[s.key] !== undefined ? d[s.key] : d[s.altKey] || 0)

  const maxVal = Math.max(
    ...chartData.flatMap((d) => series.map((s) => getSeriesVal(d, s))),
    1000
  )

  const hasLongLabels = chartData.some((d) => (d.label || d.nama || '').length > 6)
  const width = 860
  const svgHeight = hasLongLabels ? height + 35 : height
  const chartHeight = hasLongLabels ? height - 60 : height - 50
  const groupSpacing = (width - 90) / chartData.length
  const barWidth = Math.max(6, Math.min(20, (groupSpacing - 12) / series.length))

  return (
    <div className="relative w-full">
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-2 text-xs">
        {series.map((s, idx) => (
          <div
            key={idx}
            className="flex items-center gap-1.5 bg-canvas px-2.5 py-0.5 rounded-full border border-line"
          >
            <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: s.color }} />
            <span className="text-ink font-semibold text-[11px]">{s.label}</span>
          </div>
        ))}
      </div>

      <svg viewBox={`0 0 ${width} ${svgHeight}`} className="w-full h-auto overflow-visible">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = chartHeight - pct * (chartHeight - 35) + 15
          return (
            <g key={i}>
              <line
                x1="60"
                y1={y}
                x2={width}
                y2={y}
                stroke="var(--color-line)"
                strokeDasharray="3 3"
              />
              <text
                x="55"
                y={y + 3.5}
                textAnchor="end"
                className="text-[9.5px] font-medium"
                fill="var(--color-muted)"
              >
                {formatCompactRupiah(maxVal * pct)}
              </text>
            </g>
          )
        })}

        {/* Groups */}
        {chartData.map((item, gIdx) => {
          const groupX = 70 + gIdx * groupSpacing
          const isHovered = hoveredGroup === gIdx
          const labelText = item.label || item.nama || ''
          const labelX = groupX + (series.length * barWidth) / 2
          const labelY = hasLongLabels ? chartHeight + 25 : height - 10

          return (
            <g
              key={gIdx}
              onMouseEnter={() => setHoveredGroup(gIdx)}
              onMouseLeave={() => setHoveredGroup(null)}
              className="cursor-pointer"
            >
              {/* Highlight background if hovered */}
              {isHovered && (
                <rect
                  x={groupX - 6}
                  y="12"
                  width={groupSpacing}
                  height={chartHeight + 5}
                  fill="var(--color-primary-50)"
                  opacity="0.6"
                  rx="5"
                />
              )}

              {/* Group Bars */}
              {series.map((s, sIdx) => {
                const val = getSeriesVal(item, s)
                const bHeight = Math.max(3, (val / maxVal) * (chartHeight - 35))
                const bx = groupX + sIdx * barWidth
                const by = chartHeight + 15 - bHeight

                return (
                  <rect
                    key={sIdx}
                    x={bx}
                    y={by}
                    width={barWidth - 1.5}
                    height={bHeight}
                    rx="2.5"
                    fill={s.color}
                    opacity={isHovered ? 1 : 0.88}
                    className="transition-all duration-150"
                  />
                )
              })}

              {/* Group Label */}
              <text
                x={labelX}
                y={labelY}
                transform={hasLongLabels ? `rotate(-28 ${labelX} ${labelY})` : undefined}
                textAnchor={hasLongLabels ? 'end' : 'middle'}
                className={`text-[9.5px] ${
                  isHovered ? 'font-bold' : 'font-medium'
                }`}
                fill={isHovered ? 'var(--color-ink)' : 'var(--color-muted)'}
              >
                {hasLongLabels && labelText.length > 20
                  ? `${labelText.slice(0, 18)}…`
                  : labelText}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Tooltip Card for Group */}
      {hoveredGroup !== null && chartData[hoveredGroup] && (
        <div
          className="absolute z-30 pointer-events-none rounded-xl bg-ink text-surface p-3 text-xs shadow-2xl border border-line/20 min-w-[200px]"
          style={{
            left: `${((hoveredGroup + 0.5) / chartData.length) * 100}%`,
            top: '5px',
            transform:
              hoveredGroup > chartData.length * 0.72
                ? 'translateX(-95%)'
                : hoveredGroup < chartData.length * 0.28
                ? 'translateX(5%)'
                : 'translateX(-50%)',
          }}
        >
          <div className="font-bold text-xs text-surface border-b border-surface/20 pb-1 mb-1.5 flex items-center justify-between">
            <span>{chartData[hoveredGroup].label || chartData[hoveredGroup].nama}</span>
            <span className="text-[9.5px] text-surface/60 font-normal">{series.length} Entitas</span>
          </div>
          <div className="space-y-1">
            {series.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-surface/75 truncate max-w-[130px]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="truncate text-[10.5px]">{s.label}:</span>
                </span>
                <span className="font-bold text-accent shrink-0 text-xs">
                  {formatRupiah(getSeriesVal(chartData[hoveredGroup], s))}
                </span>
              </div>
            ))}
            {chartData[hoveredGroup].kepatuhan !== undefined && (
              <div className="pt-1.5 mt-1 border-t border-surface/10 flex justify-between font-bold">
                <span className="text-surface/70">Kepatuhan Setor:</span>
                <span className="text-accent">{chartData[hoveredGroup].kepatuhan}%</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
