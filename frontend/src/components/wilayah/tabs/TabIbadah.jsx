import React from 'react'
import { Calendar, Clock, Users, BarChart2 } from 'lucide-react'
import { formatNumber } from '../../../lib/format'
import { EmptyStateWilayah } from '../EmptyStateWilayah'

/**
 * TabIbadah
 * Tabel sesi ibadah (tanggal, nama sesi, jam, jumlah hadir) dan grafik kehadiran per sesi.
 */
export function TabIbadah({ church }) {
  const sesiData = church?.sesiIbadah
  const daftar = sesiData?.daftar || []
  const kehadiranPerSesi = sesiData?.kehadiranPerSesi || []

  if (!daftar.length && !kehadiranPerSesi.length) {
    return <EmptyStateWilayah isSearch={false} />
  }

  const maxHadir = Math.max(...kehadiranPerSesi.map((k) => k.hadir || 0), 100)

  return (
    <div className="flex flex-col gap-6">
      {/* 1. GRAFIK KEHADIRAN PER SESI */}
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-line shadow-2xs">
        <h2 className="text-sm font-bold text-ink uppercase tracking-wider mb-1 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-primary" />
          <span>Grafik Kehadiran per Sesi Ibadah</span>
        </h2>
        <p className="text-xs text-muted mb-6">
          Distribusi jumlah jemaat yang menghadiri setiap sesi kebaktian minggu
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {kehadiranPerSesi.map((item, idx) => {
            const heightPercent = Math.max(15, Math.round((item.hadir / maxHadir) * 100))
            return (
              <div
                key={idx}
                className="p-4 rounded-xl bg-canvas border border-line/70 flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs font-semibold text-ink line-clamp-1" title={item.sesi}>
                    {item.sesi}
                  </div>
                  <div className="text-lg font-extrabold text-primary tabular-nums mt-1">
                    {formatNumber(item.hadir)}{' '}
                    <span className="text-xs font-normal text-muted">jiwa</span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="w-full bg-primary-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-300"
                      style={{ width: `${heightPercent}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-muted text-right mt-1">
                    {Math.round((item.hadir / maxHadir) * 100)}% dari puncak
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 2. TABEL SESI IBADAH */}
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-line shadow-2xs">
        <h2 className="text-sm font-bold text-ink uppercase tracking-wider mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <span>Jadwal & Catatan Sesi Ibadah</span>
        </h2>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-canvas text-muted text-[11px] uppercase tracking-wider font-semibold border-b border-line">
              <tr>
                <th scope="col" className="py-3 px-4">
                  Tanggal
                </th>
                <th scope="col" className="py-3 px-4">
                  Nama Sesi Ibadah
                </th>
                <th scope="col" className="py-3 px-4">
                  Waktu
                </th>
                <th scope="col" className="py-3 px-4">
                  Bahasa Pengantar
                </th>
                <th scope="col" className="py-3 px-4 text-right">
                  Jumlah Hadir
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {daftar.map((sesi) => (
                <tr key={sesi.id} className="hover:bg-canvas/50 transition-colors">
                  <td className="py-3 px-4 text-muted whitespace-nowrap">{sesi.tanggal}</td>
                  <td className="py-3 px-4 font-bold text-ink">{sesi.namaSesi}</td>
                  <td className="py-3 px-4 text-muted whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted/70" />
                      <span>{sesi.jam}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted">
                    <span className="inline-block px-2 py-0.5 rounded bg-primary-50 text-primary text-xs font-medium">
                      {sesi.bahasa || 'Batak / Indonesia'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-primary tabular-nums whitespace-nowrap">
                    {formatNumber(sesi.jumlahHadir)} jiwa
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
