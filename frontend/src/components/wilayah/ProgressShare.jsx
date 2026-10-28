import React from 'react'
import { formatPercent } from '../../lib/format'

/**
 * ProgressShare
 * Batang tipis kontribusi terhadap total beserta persentasenya.
 * Jalur menggunakan bg-primary-100 dan batang menggunakan bg-primary-500.
 */
export function ProgressShare({ percent = 0, label = 'Kontribusi', showLabel = true, className = '' }) {
  const safePercent = Math.max(0, Math.min(100, Number(percent) || 0))

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between text-[11px] text-muted mb-1">
          <span>{label}</span>
          <span className="font-semibold text-ink tabular-nums">{formatPercent(safePercent)}</span>
        </div>
      )}
      <div
        className="w-full h-1.5 rounded-full bg-primary-100 overflow-hidden"
        role="progressbar"
        aria-valuenow={safePercent}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label={`${label}: ${formatPercent(safePercent)}`}
      >
        <div
          className="h-full bg-primary-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${safePercent}%` }}
        />
      </div>
    </div>
  )
}
