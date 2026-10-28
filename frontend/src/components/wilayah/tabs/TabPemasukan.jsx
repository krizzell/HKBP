import React from 'react'
import { Wallet, PieChart, Coins } from 'lucide-react'
import { formatRupiah, formatCompactRupiah, formatPercent } from '../../../lib/format'
import { EmptyStateWilayah } from '../EmptyStateWilayah'

/**
 * TabPemasukan
 * Menampilkan:
 * 1. Komposisi kategori penerimaan kas
 * 2. Rincian Pelean per sesi kebaktian dengan KOLOM DINAMIS (1A, 1B, 2A, dst) yang dibangun dari data
 * 3. Tabel transaksi persembahan terbaru
 */
export function TabPemasukan({ church }) {
  const pemasukanData = church?.pemasukan
  if (!pemasukanData) {
    return <EmptyStateWilayah isSearch={false} />
  }

  const {
    komposisiKategori = [],
    rincianPeleanPerSesi = {},
    transaksiTerbaru = [],
  } = pemasukanData

  const { kolomPelean = [], baris = [], grandTotal = 0 } = rincianPeleanPerSesi
  const totalKategori = komposisiKategori.reduce((acc, it) => acc + (it.value || 0), 0)

  // Chart tokens mapping
  const chartTokenColors = [
    'var(--color-chart-1)',
    'var(--color-chart-2)',
    'var(--color-chart-3)',
    'var(--color-chart-4)',
    'var(--color-chart-5)',
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* 1. KOMPOSISI KATEGORI PEMASUKAN */}
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-line shadow-2xs">
        <h2 className="text-sm font-bold text-ink uppercase tracking-wider mb-1 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-primary" />
          <span>Komposisi Kategori Pemasukan</span>
        </h2>
        <p className="text-xs text-muted mb-5">
          Proporsi persembahan jemaat berdasarkan jenis dan peruntukan
        </p>

        {/* Bar Bertumpuk (Stacked Bar) Menggunakan Token CSS Variables */}
        <div className="w-full h-4 rounded-full overflow-hidden flex bg-canvas mb-4 shadow-inner">
          {komposisiKategori.map((kat, idx) => {
            const pct = totalKategori > 0 ? (kat.value / totalKategori) * 100 : 0
            const colorVar = kat.colorVar || chartTokenColors[idx % chartTokenColors.length]
            return (
              <div
                key={kat.name}
                className="h-full transition-all duration-300 relative group cursor-pointer"
                style={{ width: `${pct}%`, backgroundColor: colorVar }}
                title={`${kat.name}: ${formatRupiah(kat.value)} (${formatPercent(pct)})`}
              />
            )
          })}
        </div>

        {/* Legenda Kategori */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {komposisiKategori.map((kat, idx) => {
            const pct = totalKategori > 0 ? (kat.value / totalKategori) * 100 : 0
            const colorVar = kat.colorVar || chartTokenColors[idx % chartTokenColors.length]
            return (
              <div
                key={kat.name}
                className="p-3 rounded-xl bg-canvas border border-line/60 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-md shrink-0"
                    style={{ backgroundColor: colorVar }}
                  />
                  <span className="font-semibold text-ink truncate" title={kat.name}>
                    {kat.name}
                  </span>
                </div>
                <div className="text-right tabular-nums shrink-0 ml-2">
                  <div className="font-bold text-primary">{formatCompactRupiah(kat.value)}</div>
                  <div className="text-[10px] text-muted">{formatPercent(pct)}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 2. RINCIAN PELEAN PER SESI (KOLOM DIBANGUN DINAMIS DARI DATA) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-line shadow-2xs">
        <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
          <div>
            <h2 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
              <Coins className="w-4 h-4 text-primary" />
              <span>Rincian Pelean Minggu per Sesi</span>
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Kolom kantong persembahan dibangun secara dinamis sesuai struktur litugis jemaat
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted">Total Pelean Minggu:</div>
            <div className="text-base sm:text-lg font-extrabold text-primary tabular-nums">
              {formatRupiah(grandTotal)}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto w-full mt-4">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-canvas text-muted text-[11px] uppercase tracking-wider font-semibold border-b border-line">
              <tr>
                <th scope="col" className="py-3 px-4 min-w-[180px]">
                  Sesi Ibadah
                </th>
                {/* KOLOM PELEAN DINAMIS DARI DATA (BUKAN DITULIS TETAP) */}
                {kolomPelean.map((kolom) => (
                  <th key={kolom} scope="col" className="py-3 px-3 text-right whitespace-nowrap">
                    Pelean {kolom}
                  </th>
                ))}
                <th scope="col" className="py-3 px-4 text-right font-bold text-ink whitespace-nowrap">
                  Total Sesi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {baris.map((row, idx) => (
                <tr key={idx} className="hover:bg-canvas/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-ink whitespace-nowrap">
                    {row.sesi}
                  </td>
                  {/* CELL DINAMIS BERDASARKAN kolomPelean */}
                  {kolomPelean.map((kolom) => (
                    <td
                      key={kolom}
                      className="py-3 px-3 text-right tabular-nums text-muted whitespace-nowrap font-medium"
                    >
                      {formatRupiah(row.pelean?.[kolom] || 0)}
                    </td>
                  ))}
                  <td className="py-3 px-4 text-right font-bold text-primary tabular-nums whitespace-nowrap">
                    {formatRupiah(row.total || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* BARIS GRAND TOTAL */}
            <tfoot className="bg-primary-50/60 font-bold border-t-2 border-primary-200">
              <tr>
                <td className="py-3 px-4 text-primary font-extrabold">Total Pelean Minggu</td>
                {kolomPelean.map((kolom) => {
                  const sumCol = baris.reduce((acc, r) => acc + (r.pelean?.[kolom] || 0), 0)
                  return (
                    <td key={kolom} className="py-3 px-3 text-right text-primary tabular-nums whitespace-nowrap">
                      {formatRupiah(sumCol)}
                    </td>
                  )
                })}
                <td className="py-3 px-4 text-right font-extrabold text-primary tabular-nums whitespace-nowrap">
                  {formatRupiah(grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 3. TABEL TRANSAKSI PERSEMBAHAN TERBARU */}
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-line shadow-2xs">
        <h2 className="text-sm font-bold text-ink uppercase tracking-wider mb-4 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          <span>Transaksi Pemasukan Terbaru</span>
        </h2>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-canvas text-muted text-[11px] uppercase tracking-wider font-semibold border-b border-line">
              <tr>
                <th scope="col" className="py-3 px-4">
                  Tanggal
                </th>
                <th scope="col" className="py-3 px-4">
                  Kategori
                </th>
                <th scope="col" className="py-3 px-4 min-w-[200px]">
                  Keterangan
                </th>
                <th scope="col" className="py-3 px-4 text-right">
                  Jumlah
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {transaksiTerbaru.map((trx) => (
                <tr key={trx.id} className="hover:bg-canvas/50 transition-colors">
                  <td className="py-3 px-4 text-muted whitespace-nowrap">{trx.tanggal}</td>
                  <td className="py-3 px-4 font-semibold text-ink whitespace-nowrap">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-canvas border border-line text-xs font-semibold">
                      {trx.kategori}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted">{trx.keterangan}</td>
                  <td className="py-3 px-4 text-right font-bold text-primary tabular-nums whitespace-nowrap">
                    {formatRupiah(trx.jumlah)}
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
