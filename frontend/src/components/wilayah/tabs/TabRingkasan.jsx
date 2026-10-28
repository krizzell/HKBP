import React from 'react'
import {
  MapPin,
  Calendar,
  User,
  Users,
  Home,
  Wallet,
  Building,
  UserCheck,
  Send,
  Building2,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react'
import { formatCompactRupiah, formatRupiah, formatNumber } from '../../../lib/format'
import { EmptyStateWilayah } from '../EmptyStateWilayah'

/**
 * TabRingkasan
 * Menampilkan profil huria dan kartu KPI keuangan & jemaat dengan estetika elegan yang selaras dengan Dashboard.
 */
export function TabRingkasan({ church }) {
  if (!church || !church.profil) {
    return <EmptyStateWilayah isSearch={false} />
  }

  const { profil = {}, ringkasan = {} } = church
  const {
    totalPemasukan = 0,
    bagianHuria = 0,
    bagianPusat = 0,
    rataKehadiran = 0,
  } = ringkasan

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* 1. KARTU PROFIL GEREJA DENGAN SEL ELEGAN */}
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-line shadow-xs">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-100">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              Identitas & Struktur Gereja
            </span>
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider">
              Profil Huria
            </h2>
          </div>
          <span className="text-xs text-muted">Data registrasi resmi HKBP</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div className="p-3.5 rounded-xl bg-canvas/75 border border-line/60 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-muted uppercase tracking-wider">Alamat & Lokasi</div>
              <div className="text-xs font-bold text-ink mt-0.5 truncate" title={profil.lokasi || '-'}>
                {profil.lokasi || '-'}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas/75 border border-line/60 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-muted uppercase tracking-wider">Tahun Berdiri</div>
              <div className="text-xs font-bold text-ink mt-0.5">
                {profil.tahunBerdiri || '-'}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas/75 border border-line/60 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-muted uppercase tracking-wider">Pendeta Pimpinan</div>
              <div className="text-xs font-bold text-ink mt-0.5 truncate" title={profil.pendetaPimpinan || '-'}>
                {profil.pendetaPimpinan || '-'}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas/75 border border-line/60 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-muted uppercase tracking-wider">Jumlah Warga Jemaat</div>
              <div className="text-xs font-extrabold text-ink tabular-nums mt-0.5">
                {formatNumber(profil.jumlahJemaat)} jiwa
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas/75 border border-line/60 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
              <Home className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-muted uppercase tracking-wider">Kepala Keluarga (KK)</div>
              <div className="text-xs font-extrabold text-ink tabular-nums mt-0.5">
                {typeof profil.kepalaKeluarga === 'number'
                  ? `${formatNumber(profil.kepalaKeluarga)} KK`
                  : profil.kepalaKeluarga || '-'}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas/75 border border-line/60 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
              <Building className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-muted uppercase tracking-wider">Jumlah Lunggu / Sektor</div>
              <div className="text-xs font-extrabold text-ink tabular-nums mt-0.5">
                {profil.jumlahLunggu || 0} Lunggu
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. KPI KEUANGAN & KEHADIRAN PERIODE (KONSISTEN DENGAN DASHBOARD) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {/* KPI 1: Total Pemasukan Jemaat */}
        <div
          className="p-5 rounded-2xl bg-primary text-white shadow-sm flex flex-col justify-between relative overflow-hidden"
          title={`Total Pemasukan: ${formatRupiah(totalPemasukan)}`}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs text-white/80 font-medium truncate">Total Pemasukan Jemaat</span>
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
                Tahun Anggaran 2026
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Setoran Pusat (55%) */}
        <div
          className="p-5 rounded-2xl bg-surface border border-line shadow-xs hover:border-primary-200 transition-colors flex flex-col justify-between"
          title={`Setoran Pusat (55%): ${formatRupiah(bagianPusat)}`}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-semibold text-muted truncate">Kewajiban Setoran Pusat (55%)</span>
            <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Send className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-ink tabular-nums tracking-tight leading-tight truncate">
              {formatCompactRupiah(bagianPusat)}
            </div>
            <div className="flex items-center gap-2 mt-2.5">
              <span className="inline-flex items-center gap-1 bg-indigo-500/15 text-indigo-600 border border-indigo-500/30 text-xs font-bold px-2 py-0.5 rounded-full">
                <ArrowUpRight className="w-3 h-3" />
                55,0%
              </span>
              <span className="text-xs text-muted truncate">
                Sentralisasi Pearaja
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Kas Huria (45%) */}
        <div
          className="p-5 rounded-2xl bg-surface border border-line shadow-xs hover:border-primary-200 transition-colors flex flex-col justify-between"
          title={`Kas Huria (45%): ${formatRupiah(bagianHuria)}`}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-semibold text-muted truncate">Alokasi Kas Huria (45%)</span>
            <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-ink tabular-nums tracking-tight leading-tight truncate">
              {formatCompactRupiah(bagianHuria)}
            </div>
            <div className="flex items-center gap-2 mt-2.5">
              <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-xs font-bold px-2 py-0.5 rounded-full">
                <ArrowUpRight className="w-3 h-3" />
                45,0%
              </span>
              <span className="text-xs text-muted truncate">
                Otonomi Huria Lokal
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4: Rata Kehadiran */}
        <div className="p-5 rounded-2xl bg-surface border border-line shadow-xs hover:border-primary-200 transition-colors flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-semibold text-muted truncate">Rata-rata Kehadiran</span>
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
                Sesi ibadah huria
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
