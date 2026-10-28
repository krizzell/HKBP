import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { resetSeeder } from '../api/wilayahApi'
import {
  Menu,
  Search,
  Bell,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ChevronDown,
} from 'lucide-react'

export const Navbar = ({ onRefreshData, activeTabTitle = 'Dashboard', onOpenMobileSidebar }) => {
  const { user, logout, isSuperAdmin } = useAuth()
  const [resetting, setResetting] = useState(false)
  const [message, setMessage] = useState(null)
  const [showUserDropdown, setShowUserDropdown] = useState(false)

  const handleReset = async () => {
    if (!window.confirm('Reset database dan muat ulang seeder data keuangan 2026 untuk seluruh gereja?')) return
    setResetting(true)
    try {
      await resetSeeder()
      setMessage({ type: 'success', text: 'Seeder 2026 berhasil dimuat ulang!' })
      if (onRefreshData) onRefreshData()
      setTimeout(() => setMessage(null), 4000)
    } catch {
      setMessage({ type: 'error', text: 'Gagal mereset seeder' })
      setTimeout(() => setMessage(null), 4000)
    } finally {
      setResetting(false)
    }
  }

  // Active scope text
  const scopeChipText = isSuperAdmin
    ? 'PUSAT · 8 Huria'
    : `${user?.namaHuria || 'Huria'} · ${user?.namaDistrik || 'Distrik'}`

  return (
    <header className="h-16 bg-surface border-b border-line flex items-center justify-between px-6 lg:px-8 w-full sticky top-0 z-30 font-sans shadow-2xs">
      {/* Left: Mobile menu toggle + Breadcrumb / Page Title */}
      <div className="flex items-center gap-4">
        {/* Mobile Hamburger */}
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-1.5 rounded-lg text-ink hover:bg-primary-50 transition-colors cursor-pointer"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <span className="text-muted font-medium">Ruang kerja</span>
          <span className="text-line select-none font-bold">/</span>
          <span className="text-ink font-bold">{activeTabTitle}</span>
        </div>
      </div>

      {/* Center/Right Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Toast Notification if present */}
        {message && (
          <div
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 animate-in fade-in ${
              message.type === 'success'
                ? 'bg-success/15 text-success border border-success/30'
                : 'bg-danger/15 text-danger border border-danger/30'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Search Input Bar (Pill shape) */}
        <div className="hidden sm:flex relative items-center">
          <Search className="absolute left-3 w-4 h-4 text-muted/60 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari transaksi, warta, jemaat..."
            className="h-9 w-48 lg:w-60 pl-9 pr-3 rounded-full border border-line bg-canvas text-ink text-xs outline-none transition-all duration-150 focus:w-64 focus:bg-surface focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
          />
        </div>

        {/* Notification Bell */}
        <button
          className="w-9 h-9 rounded-full border border-line bg-surface flex items-center justify-center text-muted hover:text-primary hover:bg-primary-50 transition-colors relative cursor-pointer"
          title="Notifikasi"
          aria-label="Notifikasi"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-primary" />
        </button>

        {/* Reset Seeder Button (SuperAdmin / Dev) */}
        <button
          onClick={handleReset}
          disabled={resetting}
          className="h-9 px-3.5 rounded-full border border-line bg-surface text-ink text-xs font-semibold hover:bg-primary-50 hover:text-primary transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title="Muat ulang data sampel 2026"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-muted ${resetting ? 'animate-spin' : ''}`}
          />
          <span className="hidden lg:inline">{resetting ? 'Mereset...' : 'Reset Seeder'}</span>
        </button>

        {/* Scope / Role Chip ("PUSAT · 8 Huria") */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-100">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-xs font-bold text-primary tracking-wide whitespace-nowrap">
            {scopeChipText}
          </span>
        </div>

        {/* User Profile Avatar with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 p-1 pr-2.5 rounded-full border border-line bg-surface hover:bg-primary-50 transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
              {user?.nama ? user.nama.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="hidden xl:inline text-xs font-semibold text-ink max-w-[120px] truncate">
              {user?.nama || 'Pengguna'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted" />
          </button>

          {/* User Dropdown Menu */}
          {showUserDropdown && (
            <>
              {/* Click outside backdrop */}
              <div
                onClick={() => setShowUserDropdown(false)}
                className="fixed inset-0 z-40"
              />
              <div className="absolute right-0 top-full mt-2 w-56 bg-surface rounded-2xl shadow-xl border border-line p-2 z-50 animate-in fade-in duration-100">
                <div className="p-3 border-b border-line mb-1">
                  <div className="text-xs font-bold text-ink">
                    {user?.nama}
                  </div>
                  <div className="text-[11px] text-muted truncate">
                    {user?.email}
                  </div>
                  <div className="mt-1 text-[10px] font-bold text-primary uppercase tracking-wide">
                    {isSuperAdmin ? 'Super Admin' : 'Admin Huria'}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowUserDropdown(false)
                    logout()
                  }}
                  className="w-full p-2.5 rounded-xl text-danger hover:bg-danger/10 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar Akun</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
