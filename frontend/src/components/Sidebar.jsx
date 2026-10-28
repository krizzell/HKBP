import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  GitCompare,
  BarChart3,
  TableProperties,
  Settings,
  Shield,
  Building,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react'

export const Sidebar = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { isSuperAdmin, isAdmin, user, logout } = useAuth()

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['SuperAdmin', 'Admin'],
    },
    {
      id: 'tabel',
      label: 'Data tabel',
      icon: TableProperties,
      roles: ['SuperAdmin', 'Admin'],
    },
    {
      id: 'studio',
      label: 'Visualisasi',
      icon: BarChart3,
      roles: ['SuperAdmin', 'Admin'],
    },
    {
      id: 'perbandingan',
      label: 'Wilayah & Huria',
      icon: GitCompare,
      roles: ['SuperAdmin', 'Admin'],
    },
    {
      id: 'kelola-wilayah',
      label: 'Kelola Wilayah',
      icon: Layers,
      roles: ['SuperAdmin'],
    },
    {
      id: 'manajemen',
      label: 'Kelola Data Huria',
      icon: Settings,
      roles: ['Admin'],
    },
  ]

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(user?.role)
  )

  const handleNavClick = (tabId) => {
    onSelectTab(tabId)
    if (onCloseMobile) onCloseMobile()
  }

  const sidebarContent = (
    <div
      className={`flex flex-col h-full bg-primary text-white transition-all duration-200 overflow-hidden ${
        isCollapsed ? 'w-[72px]' : 'w-[250px]'
      }`}
    >
      {/* Brand Header */}
      <div
        className={`border-b border-primary-900 flex items-center ${
          isCollapsed ? 'p-4 justify-center' : 'p-5 justify-between'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo inside rounded white container */}
          <div className="w-10 h-10 rounded-xl bg-surface p-1 shadow-xs flex items-center justify-center shrink-0 overflow-hidden">
            <img
              src="/logo_hkbp.jpeg"
              alt="Logo HKBP"
              className="w-full h-full object-contain"
            />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="text-base font-extrabold text-white tracking-tight leading-tight whitespace-nowrap">
                HKBP
              </div>
              <div className="text-xs text-primary-200/70 font-medium whitespace-nowrap">
                Pelaporan Keuangan
              </div>
            </div>
          )}
        </div>

        {/* Collapse toggle (desktop only) */}
        {!isCollapsed && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-primary-700 transition-colors cursor-pointer"
            title="Ciutkan sidebar"
            aria-label="Ciutkan sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Scope Badge (when not collapsed) */}
      {!isCollapsed && (
        <div className="p-3">
          <div className="p-3 rounded-xl bg-white/10 border border-white/20 backdrop-blur-xs flex items-center gap-3 shadow-xs">
            {isSuperAdmin ? (
              <>
                <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0 border border-white/30 shadow-xs">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white leading-tight">
                    Kantor Pusat
                  </div>
                  <div className="text-[11px] text-white/80 font-medium mt-0.5">
                    Akses Semua Wilayah
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0 border border-white/30 shadow-xs">
                  <Building className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white leading-tight truncate">
                    {user?.namaHuria || 'Huria'}
                  </div>
                  <div className="text-[11px] text-white/80 font-medium mt-0.5 truncate">
                    {user?.namaResort || 'Resort'}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Nav List */}
      <nav className={`flex-1 flex flex-col gap-1 overflow-y-auto ${isCollapsed ? 'p-2' : 'px-3 py-2'}`}>
        {!isCollapsed && (
          <div className="px-3 py-1.5 text-[11px] font-bold text-white/40 uppercase tracking-wider">
            Menu Utama
          </div>
        )}

        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer text-left ${
                isCollapsed ? 'justify-center px-2' : 'px-3.5'
              } ${
                isActive
                  ? 'bg-primary-700 text-white border-l-4 border-accent font-semibold pl-2.5 shadow-xs'
                  : 'text-white/75 hover:bg-primary-700 hover:text-white'
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-colors ${
                  isActive ? 'text-accent' : 'text-white/75'
                }`}
              />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Expand toggle (when collapsed, desktop only) */}
      {isCollapsed && onToggleCollapse && (
        <div className="p-2 flex justify-center">
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-primary-700 transition-colors cursor-pointer"
            title="Perluas sidebar"
            aria-label="Perluas sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* User Profile Card & Logout Button (Bottom) */}
      <div className="p-3 border-t border-primary-900 bg-primary-950/80">
        <div
          className={`flex items-center gap-2.5 ${
            isCollapsed ? 'justify-center' : 'justify-between'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full bg-white/20 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-white/30">
              {user?.nama ? user.nama.charAt(0).toUpperCase() : 'U'}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="text-xs font-bold text-white leading-tight truncate">
                  {user?.nama || 'Pengguna HKBP'}
                </div>
                <div className="text-[10px] text-white/80 font-medium truncate">
                  {user?.role === 'SuperAdmin' ? 'Super Admin' : user?.namaHuria || 'Admin Huria'}
                </div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={logout}
              title="Keluar dari akun"
              className="p-1.5 rounded-lg text-white/50 hover:text-danger hover:bg-danger/15 transition-colors cursor-pointer"
              aria-label="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block h-screen sticky top-0 z-40 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Drawer content */}
          <div className="relative z-51 h-full shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
