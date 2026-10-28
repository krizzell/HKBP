import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatNumber } from '../../lib/format'

/**
 * Pagination
 * Komponen kontrol paginasi yang menampilkan teks "Menampilkan X–Y dari Z",
 * tombol Sebelumnya & Selanjutnya, dan penanda nomor halaman aktif.
 */
export function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 20,
  onPageChange,
  className = '',
}) {
  if (totalItems <= pageSize) return null

  const totalPages = Math.ceil(totalItems / pageSize)
  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  // Buat deretan halaman
  const pages = []
  for (let i = 1; i <= totalPages; i++) {
    // Tampilkan halaman pertama, terakhir, dan yang berada di sekitar currentPage
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted ${className}`}
      aria-label="Paginasi daftar wilayah"
    >
      {/* Teks Informasi Menampilkan X-Y dari Z */}
      <div className="font-medium">
        Menampilkan{' '}
        <span className="font-bold text-ink tabular-nums">
          {formatNumber(startItem)}–{formatNumber(endItem)}
        </span>{' '}
        dari <span className="font-bold text-ink tabular-nums">{formatNumber(totalItems)}</span>
      </div>

      {/* Tombol Halaman */}
      <div className="flex items-center gap-1">
        {/* Tombol Sebelumnya */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Halaman sebelumnya"
          className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] px-2.5 rounded-xl border border-line bg-surface text-ink hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Deretan Nomor Halaman */}
        <div className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-muted select-none">
                  …
                </span>
              )
            }
            const isCurrent = p === currentPage
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={`Halaman ${p}`}
                className={`inline-flex items-center justify-center min-h-[40px] min-w-[40px] px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface border border-line text-ink hover:bg-canvas'
                }`}
              >
                {p}
              </button>
            )
          })}
        </div>

        {/* Tombol Selanjutnya */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Halaman selanjutnya"
          className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] px-2.5 rounded-xl border border-line bg-surface text-ink hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
