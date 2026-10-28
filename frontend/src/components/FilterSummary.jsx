/**
 * @file FilterSummary.jsx
 * Menampilkan baris ringkasan hasil pemilihan wilayah:
 * 1. Teks ringkasan (contoh: "Membandingkan 3 resort dari 2 distrik")
 * 2. Chip item terpilih pada level perbandingan dengan tombol hapus
 * 3. Petunjuk induk yang dicentang namun tidak ikut karena turunan dipilih
 * 4. Peringatan batas / validasi
 */

import { X, AlertTriangle, Info } from 'lucide-react'

export function FilterSummary({
  summary,
  level,
  items = [],
  excludedParents = [],
  warnings = [],
  onRemoveItem,
}) {
  return (
    <div className="flex flex-col gap-2.5 pt-3.5 border-t border-line mt-3.5">
      {/* 1. Baris Ringkasan & Chip Item */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ink">
            {summary}
          </span>
          {items.length > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary-100 text-primary">
              {items.length} item
            </span>
          )}
        </div>

        {/* Chip Item Terpilih pada Level Perbandingan */}
        {items.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 ml-auto">
            {items.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-50 border border-primary text-primary transition-all shadow-2xs"
              >
                <span className="max-w-[150px] truncate">{item.nama}</span>
                {onRemoveItem && (
                  <button
                    type="button"
                    onClick={() => onRemoveItem(level, item.id)}
                    aria-label={`Hapus ${item.nama}`}
                    className="p-0.5 rounded-full hover:bg-primary-200/50 text-primary cursor-pointer transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 2. Chip Petunjuk Induk yang Tidak Ikut */}
      {excludedParents.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-warning flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            <span>Induk tidak ikut:</span>
          </span>
          {excludedParents.map((parent) => (
            <span
              key={`${parent.level}-${parent.id}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-warning/10 border border-warning/30 text-warning"
            >
              <strong>{parent.nama}</strong>
              <span className="text-[10px] opacity-80">({parent.reason})</span>
            </span>
          ))}
        </div>
      )}

      {/* 3. Pesan Peringatan Batas Maksimal / URL */}
      {warnings.length > 0 && (
        <div className="space-y-1">
          {warnings.map((warn, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-warning/10 border border-warning/20 text-warning text-xs font-medium"
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{warn}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
