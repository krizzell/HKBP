import React, { useState } from 'react'
import { Search, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react'
import { ViewToggle } from './ViewToggle'

/**
 * ListControls
 * Baris kontrol daftar: kotak pencarian, pengurutan, penyaring status, pengalih kartu/tabel.
 * Responsif di perangkat ponsel dengan opsi pelipatan.
 */
export function ListControls({
  searchQuery = '',
  onSearchChange,
  onResetSearch,
  sort = 'kode-asc',
  onSortChange,
  status = 'semua',
  onStatusChange,
  view = 'card',
  onViewChange,
  totalResults = 0,
  className = '',
}) {
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false)

  const sortOptions = [
    { value: 'kode-asc', label: 'Kode (Terkecil)' },
    { value: 'nama-asc', label: 'Nama (A–Z)' },
    { value: 'nama-desc', label: 'Nama (Z–A)' },
    { value: 'pemasukan-desc', label: 'Pemasukan Tertinggi' },
    { value: 'jemaat-desc', label: 'Jemaat Terbanyak' },
  ]

  const statusOptions = [
    { value: 'semua', label: 'Semua Status' },
    { value: 'aktif', label: 'Hanya Aktif' },
    { value: 'nonaktif', label: 'Nonaktif' },
  ]

  return (
    <div className={`flex flex-col gap-3 font-sans ${className}`}>
      {/* Baris Utama Kontrol dalam Kartu Konsisten */}
      <div className="bg-surface rounded-2xl p-3 sm:p-4 border border-line shadow-xs flex items-center gap-2.5 sm:gap-3 flex-wrap sm:flex-nowrap">
        {/* Kotak Pencarian */}
        <div className="relative flex-1 min-w-[200px]">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
            <Search className="w-4 h-4" aria-hidden="true" />
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari nama, kode, atau pimpinan..."
            aria-label="Cari wilayah berdasarkan nama, kode, atau pimpinan"
            className="w-full pl-9 pr-9 py-2 min-h-[40px] text-xs sm:text-sm bg-canvas border border-line rounded-xl text-ink placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={onResetSearch}
              title="Hapus pencarian"
              aria-label="Hapus kata kunci pencarian"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-ink cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tombol Toggle Filter di Ponsel */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-semibold rounded-xl border border-line cursor-pointer transition-colors ${
              isMobileFilterOpen || status !== 'semua' || sort !== 'kode-asc'
                ? 'bg-primary-50 text-primary border-primary-200'
                : 'bg-canvas text-ink hover:bg-slate-100'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter</span>
          </button>
          <ViewToggle view={view} onChange={onViewChange} />
        </div>

        {/* Kontrol Desktop (Urutan & Status & ViewToggle) */}
        <div className="hidden sm:flex items-center gap-2.5 shrink-0">
          {/* Dropdown Urutan */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
              aria-label="Urutkan daftar"
              className="appearance-none pl-3.5 pr-8 py-2 min-h-[40px] text-xs sm:text-sm bg-canvas border border-line rounded-xl text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer shadow-2xs"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-muted">
              <ArrowUpDown className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Dropdown Status */}
          <div className="relative">
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              aria-label="Saring status wilayah"
              className="appearance-none pl-3.5 pr-8 py-2 min-h-[40px] text-xs sm:text-sm bg-canvas border border-line rounded-xl text-ink font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer shadow-2xs hover:border-primary-200 transition-colors"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-muted">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Chip Total Hasil Terdaftar */}
          <span className="text-xs font-bold text-muted bg-canvas px-3 py-2 min-h-[40px] flex items-center rounded-xl border border-line select-none tabular-nums">
            {totalResults} Wilayah
          </span>

          {/* View Toggle */}
          <ViewToggle view={view} onChange={onViewChange} />
        </div>
      </div>

      {/* Panel Filter Mobile (Terbuka saat tombol di-tap) */}
      {isMobileFilterOpen && (
        <div className="sm:hidden p-3 rounded-xl bg-surface border border-line shadow-2xs flex flex-col gap-2.5 animate-in fade-in duration-200">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-muted">Urutan</label>
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-canvas border border-line rounded-lg text-ink font-medium"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-muted">Status</label>
            <select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-canvas border border-line rounded-lg text-ink font-medium"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Live Region Hasil Pencarian */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {searchQuery
          ? `Ditemukan ${totalResults} wilayah untuk pencarian "${searchQuery}"`
          : `Menampilkan ${totalResults} wilayah`}
      </div>
    </div>
  )
}
