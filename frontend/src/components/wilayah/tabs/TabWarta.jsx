import React from 'react'
import { ScrollText, BookOpen, Bell, Wallet, ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { formatRupiah } from '../../../lib/format'
import { EmptyStateWilayah } from '../EmptyStateWilayah'

/**
 * TabWarta
 * Warta jemaat: tema, subtema, tata ibadah, tingting na marragam, tingting parhepengon.
 */
export function TabWarta({ church }) {
  const warta = church?.warta
  if (!warta) {
    return <EmptyStateWilayah isSearch={false} />
  }

  const {
    mingguTgl = '',
    tema = '',
    subtema = '',
    tataIbadah = [],
    tingtingMarragam = [],
    tingtingParhepengon = {},
  } = warta

  return (
    <div className="flex flex-col gap-6">
      {/* 1. TEMA & SUBTEMA MINGGU INI */}
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-line shadow-2xs">
        <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-2">
          <ScrollText className="w-4 h-4" />
          <span>{mingguTgl}</span>
        </div>
        <h2 className="text-lg sm:text-xl font-extrabold text-ink leading-snug mb-2">
          {tema}
        </h2>
        {subtema && (
          <p className="text-xs sm:text-sm text-muted leading-relaxed italic bg-canvas p-3.5 rounded-xl border border-line/60">
            &ldquo;{subtema}&rdquo;
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. TATA IBADAH (LITURGI) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-line shadow-2xs flex flex-col">
          <h3 className="text-sm font-bold text-ink uppercase tracking-wider mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span>Tata Ibadah (Liturgi Minggu)</span>
          </h3>

          <ol className="divide-y divide-line/60 text-xs flex-1">
            {tataIbadah.map((item) => (
              <li key={item.no} className="py-2.5 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-primary-50 text-primary font-bold flex items-center justify-center shrink-0 text-[11px] tabular-nums mt-0.5">
                  {item.no}
                </span>
                <span className="text-ink font-medium leading-relaxed">{item.bagian}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* 3. TINGTING NA MARRAGAM (WARTA UMUM) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-line shadow-2xs flex flex-col">
          <h3 className="text-sm font-bold text-ink uppercase tracking-wider mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <span>Tingting na Marragam</span>
          </h3>

          <div className="flex flex-col gap-3 flex-1">
            {tingtingMarragam.map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-canvas border border-line/60">
                <h4 className="font-bold text-xs text-ink mb-1">{item.judul}</h4>
                <p className="text-xs text-muted leading-relaxed">{item.isi}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. TINGTING PARHEPENGON (WARTA KEUANGAN) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-line shadow-2xs">
        <h3 className="text-sm font-bold text-ink uppercase tracking-wider mb-4 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          <span>Tingting Parhepengon (Laporan Keuangan Kas)</span>
        </h3>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
          <div className="p-4 rounded-xl bg-canvas border border-line">
            <span className="text-[11px] font-semibold text-muted">Saldo Awal Kas</span>
            <div className="text-base sm:text-lg font-bold text-ink tabular-nums mt-1">
              {formatRupiah(tingtingParhepengon.saldoAwal || 0)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-canvas border border-line">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted">
              <span>Penerimaan Minggu Ini</span>
              <ArrowDownRight className="w-3.5 h-3.5 text-success" />
            </div>
            <div className="text-base sm:text-lg font-bold text-success tabular-nums mt-1">
              +{formatRupiah(tingtingParhepengon.pemasukanMingguIni || 0)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-canvas border border-line">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted">
              <span>Pengeluaran Minggu Ini</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-danger" />
            </div>
            <div className="text-base sm:text-lg font-bold text-danger tabular-nums mt-1">
              -{formatRupiah(tingtingParhepengon.pengeluaranMingguIni || 0)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-primary-50/70 border border-primary-200">
            <span className="text-[11px] font-bold text-primary">Saldo Akhir Kas</span>
            <div className="text-base sm:text-lg font-extrabold text-primary tabular-nums mt-1">
              {formatRupiah(tingtingParhepengon.saldoAkhir || 0)}
            </div>
          </div>
        </div>

        {tingtingParhepengon.keterangan && (
          <div className="text-xs text-muted italic">
            * {tingtingParhepengon.keterangan}
          </div>
        )}
      </div>
    </div>
  )
}
