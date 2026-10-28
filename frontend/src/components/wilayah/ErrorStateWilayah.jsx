import React from 'react'
import { AlertCircle, RotateCcw, ArrowLeft } from 'lucide-react'

/**
 * ErrorStateWilayah
 * Menampilkan pesan kesalahan atau status 404 wilayah tidak ditemukan dengan tombol kembali/coba lagi.
 */
export function ErrorStateWilayah({
  title = 'Gagal Memuat Data',
  message = 'Terjadi kendala saat menghubungkan ke server data wilayah HKBP.',
  isNotFound = false,
  onRetry,
  onBack,
  className = '',
}) {
  return (
    <div
      className={`p-8 sm:p-12 text-center rounded-2xl bg-surface border border-line shadow-2xs flex flex-col items-center justify-center max-w-lg mx-auto my-6 ${className}`}
    >
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
          isNotFound ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'
        }`}
      >
        <AlertCircle className="w-7 h-7" aria-hidden="true" />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-ink mb-1.5">
        {isNotFound ? 'Wilayah Tidak Ditemukan' : title}
      </h3>

      <p className="text-xs text-muted max-w-sm mb-6 leading-relaxed">
        {isNotFound
          ? 'Wilayah yang Anda tuju tidak terdaftar atau berada di luar batas kewenangan hak akses akun Anda.'
          : message}
      </p>

      <div className="flex items-center gap-3 flex-wrap justify-center">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-canvas border border-line text-ink text-xs font-bold hover:bg-line/40 transition-colors cursor-pointer min-h-[40px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Wilayah</span>
          </button>
        )}

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-700 transition-colors shadow-xs cursor-pointer min-h-[40px]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Coba lagi</span>
          </button>
        )}
      </div>
    </div>
  )
}
