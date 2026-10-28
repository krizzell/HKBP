import React from 'react'
import { LayoutGrid, TableProperties } from 'lucide-react'

/**
 * ViewToggle
 * Pengalih tampilan antara kartu (grid) dan tabel.
 */
export function ViewToggle({ view = 'card', onChange, className = '' }) {
  return (
    <div
      role="group"
      aria-label="Pilihan tampilan daftar"
      className={`inline-flex items-center p-1 rounded-xl bg-canvas border border-line ${className}`}
    >
      <button
        type="button"
        onClick={() => onChange('card')}
        aria-pressed={view === 'card'}
        title="Tampilan Kartu"
        className={`inline-flex items-center justify-center p-1.5 rounded-lg text-xs font-semibold min-h-[36px] min-w-[36px] transition-all cursor-pointer ${
          view === 'card'
            ? 'bg-surface text-primary shadow-2xs'
            : 'text-muted hover:text-ink hover:bg-surface/50'
        }`}
      >
        <LayoutGrid className="w-4 h-4" aria-hidden="true" />
        <span className="sr-only">Tampilan Kartu</span>
      </button>

      <button
        type="button"
        onClick={() => onChange('table')}
        aria-pressed={view === 'table'}
        title="Tampilan Tabel"
        className={`inline-flex items-center justify-center p-1.5 rounded-lg text-xs font-semibold min-h-[36px] min-w-[36px] transition-all cursor-pointer ${
          view === 'table'
            ? 'bg-surface text-primary shadow-2xs'
            : 'text-muted hover:text-ink hover:bg-surface/50'
        }`}
      >
        <TableProperties className="w-4 h-4" aria-hidden="true" />
        <span className="sr-only">Tampilan Tabel</span>
      </button>
    </div>
  )
}
