import React from 'react'
import {
  FileText,
  Calendar,
  Wallet,
  ArrowRightLeft,
  Users,
  ScrollText,
} from 'lucide-react'

/**
 * HuriaTabs
 * Tab navigasi 6 tab untuk halaman detail Huria:
 * 1. Ringkasan
 * 2. Ibadah & Kehadiran
 * 3. Pemasukan
 * 4. Alokasi & Setoran
 * 5. Lunggu
 * 6. Warta Jemaat
 *
 * Menerapkan kontrol akses role:
 * - Super Admin & Admin gereja sendiri: Dapat mengakses seluruh tab.
 * - Admin yang membuka gereja lain: Hanya dapat mengakses tab "Ringkasan" (tab lain terkunci).
 */
export function HuriaTabs({
  activeTab = 'ringkasan',
  onTabChange,
  canAccessAllTabs = true,
  churchName = '',
  className = '',
}) {
  const tabs = [
    { id: 'ringkasan', label: 'Ringkasan', icon: FileText, alwaysOpen: true },
    { id: 'ibadah', label: 'Ibadah & Kehadiran', icon: Calendar },
    { id: 'pemasukan', label: 'Pemasukan', icon: Wallet },
    { id: 'alokasi', label: 'Alokasi & Setoran', icon: ArrowRightLeft },
    { id: 'lunggu', label: 'Lunggu', icon: Users },
    { id: 'warta', label: 'Warta Jemaat', icon: ScrollText },
  ]

  // Hanya tampilkan tab yang dapat diakses (tab yang terkunci tidak ditampilkan sama sekali)
  const visibleTabs = canAccessAllTabs ? tabs : tabs.filter((tab) => tab.alwaysOpen)

  // Jika tidak ada tab atau hanya 1 tab dan tidak perlu navigasi, tetap tampilkan tab yang aktif secara bersih
  return (
    <div
      role="tablist"
      aria-label="Tab Informasi Huria"
      className={`w-fit self-start inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-surface border border-line shadow-xs overflow-x-auto max-w-full ${className}`}
    >
      {visibleTabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id

        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap min-h-[38px] transition-all cursor-pointer ${
              isActive
                ? 'bg-primary text-white shadow-xs'
                : 'text-muted hover:text-ink hover:bg-canvas'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default HuriaTabs
