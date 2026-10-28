import React from 'react'

/**
 * StatusBadge
 * Status Aktif menggunakan tint success, Nonaktif menggunakan tint muted.
 */
export function StatusBadge({ aktif = true, className = '' }) {
  if (aktif) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20 whitespace-nowrap ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-success" />
        Aktif
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-muted/10 text-muted border border-muted/20 whitespace-nowrap ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-muted" />
      Nonaktif
    </span>
  )
}
