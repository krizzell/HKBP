/**
 * @file HoverPreviewPopover.jsx
 * Popover tooltip melayang untuk preview data hierarki wilayah HKBP (Distrik -> Resort -> Huria).
 * Fitur:
 * - Render aman via React Portal ke document.body agar tidak terpotong container overflow-y-auto.
 * - Loading state visual dengan spinner dan teks ramah saat data sedang diambil via API.
 * - Desain ringkas, elegan, dan konsisten dengan brand token HKBP.
 */

import React from 'react'
import { createPortal } from 'react-dom'
import { Building, Layers, Church, Loader2 } from 'lucide-react'

export function HoverPreviewPopover({ preview }) {
  if (!preview || typeof document === 'undefined') return null

  const {
    type = 'distrik', // 'distrik' | 'resort'
    title = '',
    items = [],
    loading = false,
    coords = { top: 0, left: 0 },
    error = null,
  } = preview

  const isDistrik = type === 'distrik'
  const noun = isDistrik ? 'Resort' : 'Huria'
  const count = Array.isArray(items) ? items.length : 0

  return createPortal(
    <div
      style={{
        top: `${coords.top}px`,
        left: `${coords.left}px`,
      }}
      className="fixed z-[9999] w-72 max-w-[90vw] bg-surface rounded-xl border border-line shadow-xl font-sans overflow-hidden pointer-events-none animate-fadeIn transition-opacity duration-150"
    >
      {/* Header Popover */}
      <div
        className={`px-3.5 py-2.5 border-b flex items-center justify-between gap-2 ${
          isDistrik
            ? 'bg-primary-50/80 border-primary-100 text-primary-950'
            : 'bg-indigo-50/80 border-indigo-100 text-indigo-950'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isDistrik ? (
            <Building className="w-4 h-4 text-primary shrink-0" />
          ) : (
            <Layers className="w-4 h-4 text-indigo-700 shrink-0" />
          )}
          <span className="text-xs font-bold truncate text-ink">{title}</span>
        </div>

        {!loading && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
              isDistrik
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
            }`}
          >
            {count} {noun}
          </span>
        )}
      </div>

      {/* Konten Popover */}
      {loading ? (
        <div className="p-4 flex items-center justify-center gap-2.5 text-muted text-xs">
          <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
          <span className="font-medium">Memuat daftar {noun.toLowerCase()}...</span>
        </div>
      ) : error ? (
        <div className="p-3.5 text-center text-xs text-danger font-medium">
          <span>{error}</span>
        </div>
      ) : count === 0 ? (
        <div className="p-4 text-center text-xs text-muted">
          <span>Belum ada {noun.toLowerCase()} terdaftar</span>
        </div>
      ) : (
        <div className="max-h-56 overflow-y-auto p-1.5 flex flex-col gap-0.5 text-xs">
          {items.map((item, idx) => (
            <div
              key={item.id || idx}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-ink/90 bg-transparent hover:bg-canvas transition-colors"
            >
              {isDistrik ? (
                <Layers className="w-3.5 h-3.5 text-indigo-600/70 shrink-0" />
              ) : (
                <Church className="w-3.5 h-3.5 text-emerald-600/70 shrink-0" />
              )}
              <span className="truncate">{item.nama}</span>
            </div>
          ))}
        </div>
      )}
    </div>,
    document.body
  )
}

export default HoverPreviewPopover

