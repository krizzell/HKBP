import React from 'react'

/**
 * SkeletonWilayah
 * Placeholder loading dengan bentuk dan dimensi yang sama persis seperti WilayahCard atau WilayahTable
 * sehingga mencegah pergeseran tata letak (layout shift / CLS).
 */
export function SkeletonWilayah({ view = 'card', count = 6 }) {
  if (view === 'table') {
    return (
      <div className="w-full overflow-hidden rounded-2xl bg-surface border border-line shadow-2xs animate-pulse">
        <div className="p-4 bg-canvas/60 border-b border-line flex gap-4">
          <div className="h-4 w-16 bg-line rounded" />
          <div className="h-4 w-40 bg-line rounded" />
          <div className="h-4 w-32 bg-line rounded" />
          <div className="h-4 w-20 bg-line rounded ml-auto" />
          <div className="h-4 w-24 bg-line rounded" />
        </div>
        <div className="divide-y divide-line/40">
          {Array.from({ length: count }).map((_, idx) => (
            <div key={idx} className="p-4 flex items-center gap-4">
              <div className="h-6 w-14 bg-line rounded-md" />
              <div className="h-4 w-48 bg-line rounded" />
              <div className="h-4 w-36 bg-line rounded" />
              <div className="h-4 w-16 bg-line rounded ml-auto" />
              <div className="h-4 w-24 bg-line rounded" />
              <div className="h-5 w-16 bg-line rounded-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Tampilan Grid Kartu
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="p-4 sm:p-5 rounded-2xl bg-surface border border-line animate-pulse flex flex-col justify-between h-[230px]"
        >
          {/* Baris Atas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="h-6 w-14 bg-line rounded-lg" />
              <div className="w-6 h-6 rounded-full bg-line" />
            </div>

            {/* Nama Wilayah */}
            <div className="h-5 w-3/4 bg-line rounded mb-2" />
            <div className="h-4 w-1/2 bg-line rounded mb-4" />

            {/* Pimpinan */}
            <div className="h-3.5 w-2/5 bg-line rounded mb-4" />
          </div>

          {/* Baris Metrik */}
          <div>
            <div className="pt-3 border-t border-line/60 grid grid-cols-3 gap-2 mb-3">
              <div className="h-7 bg-line/80 rounded" />
              <div className="h-7 bg-line/80 rounded" />
              <div className="h-7 bg-line/80 rounded" />
            </div>
            {/* Batang Kontribusi */}
            <div className="h-2 w-full bg-line rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
