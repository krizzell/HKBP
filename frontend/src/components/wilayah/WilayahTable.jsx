import React from 'react'
import { ArrowUpDown, ChevronRight, User } from 'lucide-react'
import { formatCompactRupiah, formatNumber, formatPercent } from '../../lib/format'
import { StatusBadge } from './StatusBadge'

/**
 * WilayahTable
 * Tampilan tabel wilayah HKBP dengan header tetap, kolom angka rata kanan,
 * baris bisa diklik, dan sorting melalui klik kolom header.
 */
export function WilayahTable({
  items = [],
  level = 'distrik',
  sort = 'kode-asc',
  onSortChange,
  onNavigate,
  className = '',
}) {
  const childNoun =
    level === 'distrik'
      ? 'Resort'
      : level === 'resort'
      ? 'Huria'
      : ''

  const handleHeaderSort = (field) => {
    if (!onSortChange) return
    if (field === 'kode') {
      onSortChange(sort === 'kode-asc' ? 'nama-asc' : 'kode-asc')
    } else if (field === 'nama') {
      onSortChange(sort === 'nama-asc' ? 'nama-desc' : 'nama-asc')
    } else if (field === 'pemasukan') {
      onSortChange(sort === 'pemasukan-desc' ? 'kode-asc' : 'pemasukan-desc')
    } else if (field === 'jemaat') {
      onSortChange(sort === 'jemaat-desc' ? 'kode-asc' : 'jemaat-desc')
    }
  }

  const handleRowClick = (item) => {
    const targetHref =
      level === 'distrik'
        ? `/wilayah/distrik/${item.id}`
        : level === 'resort'
        ? `/wilayah/resort/${item.id}`
        : `/wilayah/huria/${item.id}`

    if (onNavigate) {
      onNavigate(targetHref)
    } else {
      window.location.href = targetHref
    }
  }

  return (
    <div className={`w-full overflow-hidden rounded-2xl bg-surface border border-line shadow-xs font-sans ${className}`}>
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          {/* Header Tetap Konsisten dengan Tabel Dashboard */}
          <thead className="bg-primary-50 text-primary border-b border-line text-[11px] uppercase tracking-wider font-extrabold sticky top-0 z-10">
            <tr>
              <th
                scope="col"
                onClick={() => handleHeaderSort('kode')}
                className="py-3.5 px-4 cursor-pointer hover:text-primary-700 transition-colors select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Kode</span>
                  <ArrowUpDown className="w-3 h-3 text-muted/60" />
                </div>
              </th>

              <th
                scope="col"
                onClick={() => handleHeaderSort('nama')}
                className="py-3.5 px-4 cursor-pointer hover:text-primary transition-colors select-none min-w-[180px]"
              >
                <div className="flex items-center gap-1">
                  <span>Nama Wilayah</span>
                  <ArrowUpDown className="w-3 h-3 text-muted/60" />
                </div>
              </th>

              <th scope="col" className="py-3.5 px-4 min-w-[160px]">
                Pimpinan
              </th>

              {childNoun && (
                <th scope="col" className="py-3.5 px-4 text-right whitespace-nowrap">
                  Jumlah {childNoun}
                </th>
              )}

              <th
                scope="col"
                onClick={() => handleHeaderSort('jemaat')}
                className="py-3.5 px-4 text-right cursor-pointer hover:text-primary transition-colors select-none whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Jemaat</span>
                  <ArrowUpDown className="w-3 h-3 text-muted/60" />
                </div>
              </th>

              <th
                scope="col"
                onClick={() => handleHeaderSort('pemasukan')}
                className="py-3.5 px-4 text-right cursor-pointer hover:text-primary transition-colors select-none whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Pemasukan</span>
                  <ArrowUpDown className="w-3 h-3 text-muted/60" />
                </div>
              </th>

              <th scope="col" className="py-3.5 px-4 text-right whitespace-nowrap">
                Kontribusi
              </th>

              <th scope="col" className="py-3.5 px-4 text-center whitespace-nowrap">
                Status
              </th>

              <th scope="col" className="py-3.5 px-3 w-8">
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>

          {/* Isi Baris Tabel */}
          <tbody className="divide-y divide-line text-xs sm:text-sm">
            {items.map((item) => {
              const displayCode = item.kodeLengkap || item.kode || '-'
              return (
                <tr
                  key={item.id}
                  onClick={() => handleRowClick(item)}
                  className="group hover:bg-primary-50/40 cursor-pointer transition-colors"
                >
                  {/* Kolom Kode */}
                  <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-primary tabular-nums">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-primary-50 border border-primary-100/70 text-xs">
                      {displayCode}
                    </span>
                  </td>

                  {/* Kolom Nama */}
                  <td className="py-3 px-3.5 font-bold text-ink group-hover:text-primary transition-colors">
                    <div className="line-clamp-2" title={item.nama}>
                      {item.nama}
                    </div>
                  </td>

                  {/* Kolom Pimpinan */}
                  <td className="py-3 px-3.5 text-muted">
                    {item.namaPimpinan ? (
                      <div className="flex items-center gap-1.5 truncate max-w-[200px]" title={item.namaPimpinan}>
                        <User className="w-3.5 h-3.5 text-muted/60 shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.namaPimpinan}</span>
                      </div>
                    ) : (
                      <span className="text-muted/40 italic text-xs">-</span>
                    )}
                  </td>

                  {/* Kolom Jumlah Anak */}
                  {childNoun && (
                    <td className="py-3 px-3.5 text-right font-medium tabular-nums text-ink whitespace-nowrap">
                      {formatNumber(item.jumlahAnak)}
                    </td>
                  )}

                  {/* Kolom Jemaat */}
                  <td className="py-3 px-3.5 text-right font-medium tabular-nums text-ink whitespace-nowrap">
                    {formatNumber(item.jumlahJemaat)}
                  </td>

                  {/* Kolom Pemasukan */}
                  <td className="py-3 px-3.5 text-right font-bold text-primary tabular-nums whitespace-nowrap">
                    {formatCompactRupiah(item.totalPemasukan)}
                  </td>

                  {/* Kolom Kontribusi */}
                  <td className="py-3 px-3.5 text-right tabular-nums text-muted whitespace-nowrap font-medium">
                    {formatPercent(item.kontribusiPersen)}
                  </td>

                  {/* Kolom Status */}
                  <td className="py-3 px-3.5 text-center whitespace-nowrap">
                    <StatusBadge aktif={item.aktif} />
                  </td>

                  {/* Panah Aksi */}
                  <td className="py-3 px-2 text-right">
                    <ChevronRight className="w-4 h-4 text-muted/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all inline-block" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
