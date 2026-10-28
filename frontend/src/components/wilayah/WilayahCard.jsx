import React from 'react'
import { ChevronRight, User, Users, Landmark, Wallet, Building2, Church } from 'lucide-react'
import { formatCompactRupiah, formatNumber } from '../../lib/format'
import { StatusBadge } from './StatusBadge'
import { ProgressShare } from './ProgressShare'

/**
 * WilayahCard
 * Kartu wilayah HKBP berjenjang dengan desain modern & elegan yang konsisten dengan Dashboard:
 * - Seluruh kartu satu elemen <a> (tidak ada link bersarang)
 * - Lencana kode berjenjang dengan ikon entitas (Distrik, Resort, Huria)
 * - Penanda status nonaktif
 * - Nama wilayah dengan kontras tegas dan hover warna primary
 * - Panel metrik terstruktur dalam kotak canvas berbingkai halus
 * - Batang kontribusi progresif
 * - Tombol panah navigasi interaktif
 */
export function WilayahCard({
  item,
  level = 'distrik',
  nextLevelName = 'resort',
  onNavigate,
  className = '',
}) {
  const {
    id,
    kodeLengkap,
    kode,
    nama,
    namaPimpinan,
    aktif = true,
    jumlahAnak = 0,
    jumlahJemaat = 0,
    totalPemasukan = 0,
    kontribusiPersen = 0,
  } = item

  // Tautan tujuan berdasarkan level
  const targetHref =
    level === 'distrik'
      ? `/wilayah/distrik/${id}`
      : level === 'resort'
      ? `/wilayah/resort/${id}`
      : `/wilayah/huria/${id}`

  const handleClick = (e) => {
    if (onNavigate) {
      e.preventDefault()
      onNavigate(targetHref)
    }
  }

  // Label anak (cth "8 resort", "10 huria")
  const childNoun =
    level === 'distrik'
      ? 'Resort'
      : level === 'resort'
      ? 'Huria'
      : ''

  // Ikon spesifik level
  const LevelIcon =
    level === 'distrik'
      ? Building2
      : level === 'resort'
      ? Landmark
      : Church

  const displayCode = kodeLengkap || kode || '-'

  return (
    <a
      href={targetHref}
      onClick={handleClick}
      aria-label={`${nama}, kode ${displayCode}`}
      className={`group block p-5 rounded-2xl bg-surface border border-line hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all duration-200 text-inherit no-underline select-none relative flex flex-col justify-between ${className}`}
    >
      <div>
        {/* Baris Atas: Lencana Kode Berjenjang dengan Ikon & Tombol Aksi */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-primary-50 text-primary border border-primary-100/80 tracking-wide font-mono tabular-nums">
              <LevelIcon className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
              <span>{displayCode}</span>
            </span>
            {!aktif && <StatusBadge aktif={false} />}
          </div>
          <div className="w-8 h-8 rounded-full bg-canvas group-hover:bg-primary text-muted group-hover:text-white flex items-center justify-center transition-all duration-200 shadow-2xs shrink-0">
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </div>
        </div>

        {/* Nama Wilayah (Maksimal 2 baris dengan tooltip) */}
        <h3
          className="text-base sm:text-lg font-extrabold text-ink leading-snug line-clamp-2 mb-1.5 group-hover:text-primary transition-colors min-h-[44px] tracking-tight"
          title={nama}
        >
          {nama}
        </h3>

        {/* Nama Pimpinan */}
        <div className="min-h-[22px] mb-3">
          {namaPimpinan ? (
            <div
              className="flex items-center gap-1.5 text-xs text-muted truncate"
              title={`Pimpinan: ${namaPimpinan}`}
            >
              <User className="w-3.5 h-3.5 shrink-0 text-muted/70" aria-hidden="true" />
              <span className="truncate">{namaPimpinan}</span>
            </div>
          ) : (
            <div className="text-[11px] text-muted/50 italic">Pimpinan belum ditetapkan</div>
          )}
        </div>
      </div>

      {/* Bagian Bawah: Panel Metrik & Batang Kontribusi */}
      <div>
        {/* Panel Metrik Terbingkai Halus */}
        <div className="my-3 p-3 rounded-xl bg-canvas/80 border border-line/60 grid grid-cols-3 gap-2 text-center">
          {/* Kolom 1: Jumlah Anak / Status */}
          <div className="min-w-0" title={childNoun ? `${jumlahAnak} ${childNoun}` : 'Status Huria'}>
            <div className="text-[10px] text-muted uppercase tracking-wider font-bold truncate mb-0.5">
              {childNoun || 'Status'}
            </div>
            <div className="text-sm font-extrabold text-ink whitespace-nowrap tabular-nums truncate">
              {childNoun ? formatNumber(jumlahAnak) : (aktif ? 'Aktif' : 'Nonaktif')}
            </div>
          </div>

          {/* Kolom 2: Jemaat */}
          <div className="min-w-0 border-x border-line/60 px-1" title={`${formatNumber(jumlahJemaat)} jiwa jemaat`}>
            <div className="text-[10px] text-muted uppercase tracking-wider font-bold truncate mb-0.5">
              Jemaat
            </div>
            <div className="text-sm font-extrabold text-ink whitespace-nowrap tabular-nums truncate">
              {formatNumber(jumlahJemaat)}
            </div>
          </div>

          {/* Kolom 3: Pemasukan Periode */}
          <div className="min-w-0" title={`Pemasukan: ${formatCompactRupiah(totalPemasukan)}`}>
            <div className="text-[10px] text-muted uppercase tracking-wider font-bold truncate mb-0.5">
              Pemasukan
            </div>
            <div className="text-sm font-extrabold text-primary whitespace-nowrap tabular-nums truncate">
              {formatCompactRupiah(totalPemasukan)}
            </div>
          </div>
        </div>

        {/* Batang Kontribusi Terhadap Total */}
        <ProgressShare percent={kontribusiPersen} label="Kontribusi wilayah" showLabel={true} />
      </div>
    </a>
  )
}
