import React from 'react'
import { Download, User, Layers, MapPin } from 'lucide-react'
import { Breadcrumb } from './Breadcrumb'

/**
 * WilayahHeader
 * Header ringkas satu kartu berlatar surface yang konsisten di posisi paling atas:
 * - Breadcrumb berjenjang yang mematuhi role
 * - Eyebrow badge tema HKBP
 * - Judul level (cth "Distrik", atau nama induk wilayah)
 * - Subjudul hitungan ("36 distrik", "8 resort")
 * - Nama pimpinan induk (bila ada)
 * - Tombol "Ekspor CSV" yang serasi dengan Dashboard
 */
export function WilayahHeader({
  breadcrumbs = [],
  title = 'Distrik HKBP',
  subtitle = '36 distrik di seluruh Indonesia',
  pimpinan = '',
  onExportCsv,
  onNavigate,
  className = '',
}) {
  return (
    <div className={`flex flex-col gap-3.5 w-full font-sans ${className}`}>
      {/* Baris 1: Breadcrumb Navigasi */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Breadcrumb items={breadcrumbs} onNavigate={onNavigate} />
        </div>
      )}

      {/* Baris 2: Eyebrow, Judul, Subjudul Hitungan, dan Tombol Ekspor CSV */}
      <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs font-bold text-muted tracking-wider uppercase">
              HKBP · STRUKTUR WILAYAH
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary-50 px-2.5 py-0.5 rounded-md border border-primary-100">
              <Layers className="w-3.5 h-3.5 text-primary" />
              Hierarki Pelayanan
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight leading-tight truncate mb-1">
            {title}
          </h1>

          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-muted flex-wrap mt-1">
            <span className="font-semibold text-primary bg-primary-50/60 px-2 py-0.5 rounded-md border border-primary-100/50">
              {subtitle}
            </span>
            {pimpinan && (
              <>
                <span className="text-line select-none">•</span>
                <span className="inline-flex items-center gap-1.5 bg-canvas px-2.5 py-0.5 rounded-md border border-line text-ink font-medium truncate">
                  <User className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                  <span className="truncate">Pimpinan: <strong>{pimpinan}</strong></span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Tombol Ekspor CSV */}
        {onExportCsv && (
          <button
            type="button"
            onClick={onExportCsv}
            title="Ekspor daftar ke format CSV"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary hover:bg-primary-700 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Ekspor CSV</span>
          </button>
        )}
      </div>
    </div>
  )
}
