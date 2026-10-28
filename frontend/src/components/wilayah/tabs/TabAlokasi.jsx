import React from 'react'
import { ArrowRightLeft, Building, Home, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { formatRupiah, formatCompactRupiah, formatPercent } from '../../../lib/format'
import { EmptyStateWilayah } from '../EmptyStateWilayah'

/**
 * TabAlokasi
 * Tabel alokasi (Huria vs Pusat), daftar setoran per periode, dan status pelunasan (belum disetor, sebagian, lunas).
 */
export function TabAlokasi({ church }) {
  const alokasiData = church?.alokasiSetoran
  if (!alokasiData) {
    return <EmptyStateWilayah isSearch={false} />
  }

  const { alokasiPersentase = { huriaPersen: 45, pusatPersen: 55 }, daftarSetoran = [] } =
    alokasiData

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'lunas':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-success/10 text-success border border-success/20 whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Lunas
          </span>
        )
      case 'sebagian':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-warning/10 text-warning border border-warning/20 whitespace-nowrap">
            <Clock className="w-3.5 h-3.5" />
            Sebagian
          </span>
        )
      case 'belum':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-danger/10 text-danger border border-danger/20 whitespace-nowrap">
            <AlertCircle className="w-3.5 h-3.5" />
            Belum Disetor
          </span>
        )
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. KARTU RASIO ALOKASI HURIA VS PUSAT */}
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-line shadow-2xs">
        <h2 className="text-sm font-bold text-ink uppercase tracking-wider mb-2 flex items-center gap-2">
          <ArrowRightLeft className="w-4 h-4 text-primary" />
          <span>Skema Alokasi Anggaran HKBP</span>
        </h2>
        <p className="text-xs text-muted mb-5">
          Pembagian penerimaan sentralisasi keuangan sesuai ketetapan Sinode Godang HKBP (55% Pusat, 45% Huria)
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Pusat 55% */}
          <div className="p-4 rounded-xl bg-canvas border border-line flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center font-bold">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-ink">Setoran Sinode Hatopan (55%)</div>
                <div className="text-[11px] text-muted">Dana sentralisasi gaji & program pusat</div>
              </div>
            </div>
            <div className="text-2xl font-extrabold text-primary tabular-nums">
              {formatPercent(alokasiPersentase.pusatPersen, 0)}
            </div>
          </div>

          {/* Huria 45% */}
          <div className="p-4 rounded-xl bg-canvas border border-line flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 text-success flex items-center justify-center font-bold">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-ink">Kas Operasional Huria (45%)</div>
                <div className="text-[11px] text-muted">Pelayanan lokal, operasional & lunggu</div>
              </div>
            </div>
            <div className="text-2xl font-extrabold text-success tabular-nums">
              {formatPercent(alokasiPersentase.huriaPersen, 0)}
            </div>
          </div>
        </div>
      </div>

      {/* 2. TABEL DAFTAR SETORAN PER PERIODE */}
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-line shadow-2xs">
        <h2 className="text-sm font-bold text-ink uppercase tracking-wider mb-4 flex items-center gap-2">
          <Building className="w-4 h-4 text-primary" />
          <span>Daftar Setoran Pusat per Periode</span>
        </h2>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-canvas text-muted text-[11px] uppercase tracking-wider font-semibold border-b border-line">
              <tr>
                <th scope="col" className="py-3 px-4">
                  Periode Setoran
                </th>
                <th scope="col" className="py-3 px-4 text-right">
                  Kewajiban Pusat
                </th>
                <th scope="col" className="py-3 px-4 text-right">
                  Realisasi Disetor
                </th>
                <th scope="col" className="py-3 px-4">
                  Tanggal Setor
                </th>
                <th scope="col" className="py-3 px-4">
                  Bukti / Ref Transfer
                </th>
                <th scope="col" className="py-3 px-4 text-center">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {daftarSetoran.map((item, idx) => (
                <tr key={idx} className="hover:bg-canvas/50 transition-colors">
                  <td className="py-3 px-4 font-bold text-ink whitespace-nowrap">
                    {item.periode}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-muted font-medium whitespace-nowrap">
                    {formatRupiah(item.wajibPusat)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums font-bold text-primary whitespace-nowrap">
                    {formatRupiah(item.disetor)}
                  </td>
                  <td className="py-3 px-4 text-muted whitespace-nowrap">{item.tanggalSetor}</td>
                  <td className="py-3 px-4 font-mono text-xs text-muted whitespace-nowrap">
                    {item.buktiRef}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    {renderStatusBadge(item.status)}
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
