import React from 'react'
import { SearchX, FolderX, RotateCcw } from 'lucide-react'

/**
 * EmptyStateWilayah
 * Membedakan kondisi "belum ada data wilayah" dengan "tidak ada hasil untuk pencarian ini"
 */
export function EmptyStateWilayah({
  isSearch = false,
  searchQuery = '',
  onResetSearch,
  className = '',
}) {
  if (isSearch) {
    return (
      <div
        className={`p-8 sm:p-12 text-center rounded-2xl bg-surface border border-line shadow-2xs flex flex-col items-center justify-center max-w-lg mx-auto my-6 ${className}`}
      >
        <div className="w-14 h-14 rounded-2xl bg-canvas text-muted flex items-center justify-center mb-4">
          <SearchX className="w-7 h-7 text-muted" aria-hidden="true" />
        </div>
        <h3 className="text-base font-bold text-ink mb-1.5">Tidak Ada Hasil Ditemukan</h3>
        <p className="text-xs text-muted max-w-xs mb-5">
          Tidak ditemukan wilayah yang cocok dengan kata kunci &quot;<span className="font-semibold text-ink">{searchQuery}</span>&quot; atau kriteria penyaring saat ini.
        </p>
        {onResetSearch && (
          <button
            type="button"
            onClick={onResetSearch}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-700 transition-colors shadow-xs cursor-pointer min-h-[40px]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Hapus pencarian & reset filter</span>
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className={`p-8 sm:p-12 text-center rounded-2xl bg-surface border border-line shadow-2xs flex flex-col items-center justify-center max-w-lg mx-auto my-6 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-canvas text-muted flex items-center justify-center mb-4">
        <FolderX className="w-7 h-7 text-muted" aria-hidden="true" />
      </div>
      <h3 className="text-base font-bold text-ink mb-1.5">Belum Ada Data Wilayah</h3>
      <p className="text-xs text-muted max-w-xs">
        Daftar anak wilayah pada tingkatan ini belum memiliki data terdaftar.
      </p>
    </div>
  )
}
