import React from 'react'
import { Wallet, Landmark, Users, UserCheck, ArrowUpRight, CheckCircle2 } from 'lucide-react'
import { formatRupiah, formatCompactRupiah, formatNumber } from '../../lib/format'

/**
 * KpiStrip
 * Strip ringkasan di atas daftar: 4 kartu KPI yang menjumlahkan seluruh anak pada level itu:
 * 1. Total pemasukan periode
 * 2. Jumlah anak (Distrik / Resort / Huria)
 * 3. Total jemaat
 * 4. Rata-rata kehadiran
 * Menggunakan gaya visual konsisten dengan Dashboard utama HKBP.
 */
export function KpiStrip({ ringkasan = {}, levelAnak = 'resort', className = '' }) {
  const {
    totalPemasukan = 0,
    jumlahAnak = 0,
    totalJemaat = 0,
    rataKehadiran = 0,
  } = ringkasan

  // Penamaan label anak
  const labelAnakMap = {
    distrik: 'Distrik',
    resort: 'Resort',
    huria: 'Huria',
  }
  const childNoun = labelAnakMap[levelAnak] || 'Wilayah'

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full font-sans ${className}`}>
      {/* KPI 1: Total Pemasukan Wilayah (Primary Accent Card) */}
      <div
        className="p-5 rounded-2xl bg-primary text-white shadow-sm flex flex-col justify-between relative overflow-hidden group"
        title={`Pemasukan Periode: ${formatRupiah(totalPemasukan)}`}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs text-white/80 font-medium truncate">Pemasukan Periode</span>
          <div className="w-9 h-9 rounded-full bg-surface text-primary flex items-center justify-center shrink-0 shadow-2xs">
            <Wallet className="w-4 h-4" aria-hidden="true" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-extrabold tracking-tight leading-tight truncate">
            {formatCompactRupiah(totalPemasukan)}
          </div>
          <div className="flex items-center gap-2 mt-2.5">
            <span className="inline-flex items-center gap-1 bg-accent text-primary text-xs font-bold px-2 py-0.5 rounded-full">
              <ArrowUpRight className="w-3 h-3" />
              100% Realisasi
            </span>
            <span className="text-xs text-white/60 truncate">
              Penerimaan Kas
            </span>
          </div>
        </div>
      </div>

      {/* KPI 2: Jumlah Anak (Distrik / Resort / Huria) */}
      <div
        className="p-5 rounded-2xl bg-surface border border-line shadow-xs hover:border-primary-200 hover:shadow-sm transition-all flex flex-col justify-between"
        title={`Jumlah ${childNoun}: ${formatNumber(jumlahAnak)}`}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold text-muted truncate">Jumlah {childNoun}</span>
          <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Landmark className="w-4 h-4" aria-hidden="true" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-extrabold text-ink tabular-nums tracking-tight leading-tight truncate">
            {formatNumber(jumlahAnak)}
          </div>
          <div className="flex items-center gap-2 mt-2.5">
            <span className="inline-flex items-center gap-1 bg-indigo-500/15 text-indigo-600 border border-indigo-500/30 text-xs font-bold px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              Hierarki
            </span>
            <span className="text-xs text-muted truncate">
              {childNoun} terdaftar
            </span>
          </div>
        </div>
      </div>

      {/* KPI 3: Total Warga Jemaat */}
      <div
        className="p-5 rounded-2xl bg-surface border border-line shadow-xs hover:border-primary-200 hover:shadow-sm transition-all flex flex-col justify-between"
        title={`Total Jemaat: ${formatNumber(totalJemaat)} jiwa`}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold text-muted truncate">Total Jemaat</span>
          <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" aria-hidden="true" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-extrabold text-ink tabular-nums tracking-tight leading-tight truncate">
            {formatNumber(totalJemaat)} <span className="text-sm font-semibold text-muted">jiwa</span>
          </div>
          <div className="flex items-center gap-2 mt-2.5">
            <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-xs font-bold px-2 py-0.5 rounded-full">
              <Users className="w-3 h-3" />
              Terdata
            </span>
            <span className="text-xs text-muted truncate">
              Warga HKBP
            </span>
          </div>
        </div>
      </div>

      {/* KPI 4: Rata-rata Kehadiran */}
      <div
        className="p-5 rounded-2xl bg-surface border border-line shadow-xs hover:border-primary-200 hover:shadow-sm transition-all flex flex-col justify-between"
        title={`Rata-rata Kehadiran: ${formatNumber(rataKehadiran)} jiwa per minggu`}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold text-muted truncate">Rata Kehadiran</span>
          <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4" aria-hidden="true" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-extrabold text-ink tabular-nums tracking-tight leading-tight truncate">
            {formatNumber(rataKehadiran)} <span className="text-sm font-semibold text-muted">jiwa</span>
          </div>
          <div className="flex items-center gap-2 mt-2.5">
            <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-700 border border-amber-500/30 text-xs font-bold px-2 py-0.5 rounded-full">
              <ArrowUpRight className="w-3 h-3" />
              Mingguan
            </span>
            <span className="text-xs text-muted truncate">
              Sesi ibadah
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
