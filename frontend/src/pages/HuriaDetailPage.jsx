import React, { useState, useEffect, useMemo } from 'react'
import {
  ArrowLeft,
  Church,
  MapPin,
  User,
  Users,
  Eye,
  ShieldCheck,
  Lock,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useWilayahDetail } from '../hooks/useWilayahExplorer'
import { Breadcrumb } from '../components/wilayah/Breadcrumb'
import { StatusBadge } from '../components/wilayah/StatusBadge'
import { HuriaTabs } from '../components/wilayah/HuriaTabs'
import { TabRingkasan } from '../components/wilayah/tabs/TabRingkasan'
import { TabIbadah } from '../components/wilayah/tabs/TabIbadah'
import { TabPemasukan } from '../components/wilayah/tabs/TabPemasukan'
import { TabAlokasi } from '../components/wilayah/tabs/TabAlokasi'
import { TabLunggu } from '../components/wilayah/tabs/TabLunggu'
import { TabWarta } from '../components/wilayah/tabs/TabWarta'
import { ErrorStateWilayah } from '../components/wilayah/ErrorStateWilayah'
import { Loader2 } from 'lucide-react'
import { formatNumber } from '../lib/format'

/**
 * HuriaDetailPage
 * Halaman detail Huria HKBP dengan 6 tab baca lengkap:
 * 1. Ringkasan
 * 2. Ibadah & Kehadiran
 * 3. Pemasukan
 * 4. Alokasi & Setoran
 * 5. Lunggu
 * 6. Warta Jemaat
 *
 * Kontrol Akses Role (RBAC):
 * - Super Admin: Memiliki akses membaca seluruh data di semua gereja.
 * - Admin Huria Sendiri: Memiliki akses penuh (baca semua tab + kelola data di Kelola Data Huria).
 * - Admin yang membuka gereja lain: Hanya dapat membaca tab "Ringkasan" (tab detail operasional terkunci).
 */
export function HuriaDetailPage({ idHuria, globalFilters = {}, onNavigate }) {
  const effectiveId = idHuria
  const { isSuperAdmin, isAdmin, user } = useAuth()

  // Ambil data detail huria
  const { detail: huria, loading, error, refetch } = useWilayahDetail('huria', effectiveId, {
    globalPeriode: globalFilters,
  })

  // Verifikasi apakah huria yang dibuka adalah huria milik admin sendiri
  const isOwnHuria = useMemo(() => {
    if (isSuperAdmin) return true
    if (!isAdmin || !user) return false

    const uHuria = (user.namaHuria || '').toLowerCase().trim()
    const hNama = (huria?.nama || '').toLowerCase().trim()
    const uId = (user.idHuria || '').trim().toLowerCase()
    const effId = (effectiveId || '').trim().toLowerCase()
    const hId = (huria?.id || '').trim().toLowerCase()
    const hKode = (huria?.kode || '').trim().toLowerCase()
    const hKodeLengkap = (huria?.kodeLengkap || '').trim().toLowerCase()

    // 1. Cek kesesuaian ID / Kode Huria
    if (uId) {
      if (
        uId === effId ||
        uId === hId ||
        uId === hKode ||
        uId === hKodeLengkap ||
        effId.startsWith(uId) ||
        uId.startsWith(effId)
      ) {
        return true
      }
    }

    // 2. Cek kesesuaian Nama Huria (contoh: "HKBP Sudirman" dan "HKBP Sudirman Jakarta")
    if (uHuria && hNama) {
      if (
        uHuria === hNama ||
        hNama.includes(uHuria) ||
        uHuria.includes(hNama)
      ) {
        return true
      }
    }

    return false
  }, [isSuperAdmin, isAdmin, user, effectiveId, huria])

  // Hak akses membaca seluruh data operasional (Super Admin atau Admin Huria setempat)
  const canAccessAllTabs = isSuperAdmin || isOwnHuria

  // Baca parameter tab dari URL saat ini
  const getInitialTab = () => {
    if (typeof window === 'undefined') return 'ringkasan'
    const sp = new URLSearchParams(window.location.search)
    const t = sp.get('tab')
    const validTabs = ['ringkasan', 'ibadah', 'pemasukan', 'alokasi', 'lunggu', 'warta']
    // Jika bukan Super Admin dan bukan gereja sendiri, hanya izinkan 'ringkasan'
    if (!canAccessAllTabs) return 'ringkasan'
    return validTabs.includes(t) ? t : 'ringkasan'
  }

  const [activeTab, setActiveTab] = useState(getInitialTab)

  // Pastikan Admin yang membuka gereja lain selalu berada di tab 'ringkasan'
  useEffect(() => {
    if (!canAccessAllTabs && activeTab !== 'ringkasan') {
      setActiveTab('ringkasan')
      if (typeof window !== 'undefined') {
        const sp = new URLSearchParams(window.location.search)
        sp.delete('tab')
        const newSearch = sp.toString() ? `?${sp.toString()}` : ''
        window.history.replaceState({}, '', `${window.location.pathname}${newSearch}`)
      }
    }
  }, [canAccessAllTabs, activeTab])

  // Tangani pergantian tab & sinkronkan ke query string URL
  const handleTabChange = (tabId) => {
    if (!canAccessAllTabs && tabId !== 'ringkasan') {
      return // Ditolak: Admin tidak boleh membuka tab selain ringkasan untuk gereja lain
    }
    setActiveTab(tabId)
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search)
      if (tabId === 'ringkasan') {
        sp.delete('tab')
      } else {
        sp.set('tab', tabId)
      }
      const newSearch = sp.toString() ? `?${sp.toString()}` : ''
      const newUrl = `${window.location.pathname}${newSearch}`
      window.history.replaceState({}, '', newUrl)
    }
  }

  // Dengarkan popstate browser
  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getInitialTab())
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Alias church untuk kompatibilitas tab komponen
  const church = huria

  // Rekam Jejak (Breadcrumb penuh dari Distrik -> Resort -> Huria)
  const breadcrumbs = useMemo(() => {
    const list = []

    // Semua pengguna (Super Admin & Admin) mulai dari Wilayah HKBP
    list.push({
      label: 'Wilayah HKBP',
      href: '/wilayah',
      level: 'distrik',
    })

    if (huria?.leluhur) {
      huria.leluhur.forEach((anc) => {
        const href =
          anc.level === 'distrik'
            ? `/wilayah/distrik/${anc.id}`
            : `/wilayah/resort/${anc.id}`

        list.push({
          label: anc.nama,
          href,
          level: anc.level,
        })
      })
    }

    if (huria) {
      list.push({
        label: huria.nama,
        level: 'huria',
      })
    }

    return list
  }, [huria])

  // Admin diizinkan melihat informasi semua wilayah dan huria
  const isOutOfScope = false

  // STATE LOADING
  if (loading && !huria) {
    return (
      <div className="flex flex-col gap-6">
        <div className="p-5 rounded-2xl bg-surface border border-line shadow-2xs h-32 animate-pulse flex items-center justify-center">
          <div className="flex items-center gap-3 text-muted">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs font-semibold">Memuat profil dan data operasional huria...</span>
          </div>
        </div>
      </div>
    )
  }

  // STATE ERROR ATAU TIDAK DITEMUKAN
  if (isOutOfScope || error || !huria) {
    return (
      <div className="flex flex-col gap-6">
        <div className="p-4 rounded-2xl bg-surface border border-line">
          <Breadcrumb items={[{ label: 'Wilayah HKBP', href: '/wilayah', level: 'distrik' }]} onNavigate={onNavigate} />
        </div>
        <ErrorStateWilayah
          isNotFound={true}
          onBack={() => (onNavigate ? onNavigate('/wilayah') : (window.location.href = '/wilayah'))}
        />
      </div>
    )
  }

  const { profil = {} } = huria

  return (
    <div className="flex flex-col gap-6 pb-12 w-full font-sans">
      {/* 1. HEADER KONSISTEN DI POSISI PALING ATAS */}
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-line shadow-xs flex flex-col gap-4">
        {/* Breadcrumb Navigasi Penuh & Tombol Kembali */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Breadcrumb items={breadcrumbs} onNavigate={onNavigate} />

          {/* Tombol Kembali ke Resort */}
          {breadcrumbs.length > 1 && (
            <button
              type="button"
              onClick={() => {
                const prev = breadcrumbs[breadcrumbs.length - 2]
                if (prev?.href && onNavigate) onNavigate(prev.href)
                else window.history.back()
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[38px] rounded-full bg-canvas border border-line hover:bg-slate-100 text-xs sm:text-sm font-bold text-ink hover:text-primary transition-colors cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </button>
          )}
        </div>

        {/* Informasi Utama Huria */}
        <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap pt-2 border-t border-line/60">
          <div className="min-w-0">
            {/* Eyebrow Badge */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-bold text-muted tracking-wider uppercase">
                HKBP · PROFIL & OPERASIONAL
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary-50 px-2.5 py-0.5 rounded-md border border-primary-100">
                <Church className="w-3.5 h-3.5 text-primary" />
                Gereja Lokal
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-primary-50 text-primary border border-primary-100 font-mono">
                {huria.kodeLengkap || huria.kode}
              </span>
              <StatusBadge aktif={huria.aktif} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight leading-tight mb-3">
              {huria.nama}
            </h1>

            {/* Profil Singkat dalam Bentuk Pill Halus */}
            <div className="flex items-center gap-2.5 text-xs text-muted flex-wrap">
              {profil.lokasi && (
                <div className="inline-flex items-center gap-1.5 bg-canvas px-3 py-1.5 rounded-xl border border-line text-ink font-medium max-w-xs truncate" title={profil.lokasi}>
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">{profil.lokasi}</span>
                </div>
              )}
              {profil.pendetaPimpinan && (
                <div className="inline-flex items-center gap-1.5 bg-canvas px-3 py-1.5 rounded-xl border border-line text-ink font-medium truncate" title={profil.pendetaPimpinan}>
                  <User className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">Pdt: <strong>{profil.pendetaPimpinan}</strong></span>
                </div>
              )}
              {profil.jumlahJemaat && (
                <div className="inline-flex items-center gap-1.5 bg-canvas px-3 py-1.5 rounded-xl border border-line text-ink font-medium">
                  <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Jemaat: <strong className="tabular-nums">{formatNumber(profil.jumlahJemaat)}</strong> jiwa
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>


        {isAdmin && isOwnHuria && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Gereja Anda:</strong> Anda memiliki otoritas penuh untuk mengelola data operasional dan keuangan pada <strong>{huria.nama}</strong>.
              </span>
            </div>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('/manajemen')}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shrink-0 cursor-pointer shadow-2xs"
              >
                Buka Manajemen Data
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. TAB NAVIGASI ENAM TAB (DILENGKAPI RBAC LOCK) */}
      <HuriaTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        canAccessAllTabs={canAccessAllTabs}
        churchName={huria.nama}
      />

      {/* 3. KONTEN TAB PANEL AKTIF */}
      <div id={`tabpanel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
        {activeTab === 'ringkasan' && <TabRingkasan church={church} huria={huria} />}

        {/* Tab-tab detail operasional hanya dapat dibuka bila canAccessAllTabs true */}
        {canAccessAllTabs ? (
          <>
            {activeTab === 'ibadah' && <TabIbadah church={church} huria={huria} />}
            {activeTab === 'pemasukan' && <TabPemasukan church={church} huria={huria} />}
            {activeTab === 'alokasi' && <TabAlokasi church={church} huria={huria} />}
            {activeTab === 'lunggu' && <TabLunggu church={church} huria={huria} />}
            {activeTab === 'warta' && <TabWarta church={church} huria={huria} />}
          </>
        ) : (
          activeTab !== 'ringkasan' && (
            <div className="p-8 sm:p-12 rounded-2xl bg-surface border border-line shadow-xs text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4 shadow-2xs">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-ink">Akses Data Terbatas</h3>
              <p className="text-xs text-muted max-w-md mt-1.5 mb-5 leading-relaxed">
                Sebagai Admin Huria <strong>{user?.namaHuria || 'Gereja Anda'}</strong>, Anda hanya dapat membaca <strong>Ringkasan</strong> profil dan keuangan umum untuk <strong>{huria.nama}</strong>. Rincian data operasional bersifat privat bagi gereja setempat.
              </p>
              <button
                type="button"
                onClick={() => handleTabChange('ringkasan')}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Kembali ke Ringkasan
              </button>
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default HuriaDetailPage
