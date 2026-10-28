import React from 'react'
import { Users, Home, Calendar, User } from 'lucide-react'
import { formatNumber } from '../../../lib/format'
import { EmptyStateWilayah } from '../EmptyStateWilayah'

/**
 * TabLunggu
 * Menampilkan daftar lunggu / sektor jemaat HKBP
 */
export function TabLunggu({ church }) {
  const lungguList = church?.lunggu || []

  if (!lungguList.length) {
    return <EmptyStateWilayah isSearch={false} />
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-line shadow-2xs">
        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div>
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span>Daftar Lunggu / Wijk Jemaat</span>
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Unit pembinaan jemaat tingkat lingkungan keluarga HKBP
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-primary-50 text-primary text-xs font-bold border border-primary-100">
            Total {lungguList.length} Lunggu
          </span>
        </div>

        {/* Grid Kartu Lunggu */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {lungguList.map((lunggu) => (
            <div
              key={lunggu.id}
              className="p-4 rounded-xl bg-canvas border border-line hover:border-primary-200 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="font-bold text-sm text-ink mb-1">{lunggu.nama}</div>
                <div className="flex items-center gap-1.5 text-xs text-muted mb-3" title={lunggu.sintua}>
                  <User className="w-3.5 h-3.5 shrink-0 text-muted/70" />
                  <span className="truncate">{lunggu.sintua}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-line/60">
                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div>
                    <span className="text-[10px] text-muted uppercase">Kepala Keluarga</span>
                    <div className="font-bold text-ink tabular-nums">{formatNumber(lunggu.kk)} KK</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted uppercase">Jiwa</span>
                    <div className="font-bold text-ink tabular-nums">{formatNumber(lunggu.jiwa)} Jiwa</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-muted">
                  <Calendar className="w-3.5 h-3.5 shrink-0 text-primary" />
                  <span>{lunggu.jadwalPartangiangan}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
