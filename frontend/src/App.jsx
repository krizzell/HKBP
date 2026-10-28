import { useState, useEffect, useCallback, useMemo } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { getWilayah } from './api/wilayahApi'
import { Navbar } from './components/Navbar'
import { Sidebar } from './components/Sidebar'
import { FilterControls } from './components/FilterControls'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { PerbandinganPage } from './pages/PerbandinganPage'
import { StudioVisualisasiPage } from './pages/StudioVisualisasiPage'
import { DataTabelPage } from './pages/DataTabelPage'
import { ManajemenDataPage } from './pages/ManajemenDataPage'
import { KelolaWilayahPage } from './pages/KelolaWilayahPage'
import { WilayahLevelPage } from './pages/WilayahLevelPage'
import { HuriaDetailPage } from './pages/HuriaDetailPage'
import { setLiveWilayahTree } from './api/wilayahExplorerApi'
import { Loader2, AlertCircle } from 'lucide-react'

function MainApp() {
  const { isAuthenticated, user, isSuperAdmin, isAdmin } = useAuth()
  const [wilayahData, setWilayahData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // URL Path Routing State
  const [currentPath, setCurrentPath] = useState(() => {
    return typeof window !== 'undefined' ? window.location.pathname : '/'
  })

  // Current Active Sidebar Tab
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname
      if (p.startsWith('/wilayah')) return 'perbandingan'
      if (p.startsWith('/visualisasi') || p.startsWith('/studio')) return 'studio'
      if (p.startsWith('/tabel')) return 'tabel'
      if (p.startsWith('/kelola')) return 'kelola-wilayah'
      if (p.startsWith('/pengaturan') || p.startsWith('/manajemen')) return 'manajemen'
    }
    return 'dashboard'
  })

  // Sidebar collapse & mobile state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  // Global Filter State
  const [filters, setFilters] = useState({
    distrik: '',
    resort: '',
    huria: '',
    periodeType: 'Tahun',
    tahun: '2026',
    bulan: '',
    mingguISO: '',
    startDate: '',
    endDate: '',
  })

  // Dengarkan navigasi balik/maju (popstate) browser
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      setCurrentPath(path)
      if (path.startsWith('/wilayah')) {
        setActiveTab('perbandingan')
      } else if (path.startsWith('/visualisasi') || path.startsWith('/studio')) {
        setActiveTab('studio')
      } else if (path.startsWith('/tabel')) {
        setActiveTab('tabel')
      } else if (path.startsWith('/kelola')) {
        setActiveTab('kelola-wilayah')
      } else if (path.startsWith('/pengaturan') || path.startsWith('/manajemen')) {
        setActiveTab('manajemen')
      } else if (path === '/') {
        setActiveTab('dashboard')
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Fungsi navigasi internal SPA tanpa full page reload
  const handleNavigate = useCallback((path) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path)
      setCurrentPath(path)
      if (path.startsWith('/wilayah')) {
        setActiveTab('perbandingan')
      } else if (path.startsWith('/visualisasi') || path.startsWith('/studio')) {
        setActiveTab('studio')
      } else if (path.startsWith('/tabel')) {
        setActiveTab('tabel')
      } else if (path.startsWith('/kelola')) {
        setActiveTab('kelola-wilayah')
      } else if (path.startsWith('/pengaturan') || path.startsWith('/manajemen')) {
        setActiveTab('manajemen')
      } else if (path === '/') {
        setActiveTab('dashboard')
      }
    }
  }, [])

  // Handler pemilihan tab di sidebar
  const handleSelectTab = useCallback(
    (tabId) => {
      setActiveTab(tabId)
      if (tabId === 'perbandingan') {
        // Arahkan ke rute awal hierarki wilayah agar Admin dan Super Admin dapat melihat semua wilayah & huria
        const targetRoute = '/wilayah'
        if (!currentPath.startsWith('/wilayah')) {
          handleNavigate(targetRoute)
        }
      } else if (tabId === 'studio') {
        handleNavigate('/studio-visualisasi')
      } else if (tabId === 'tabel') {
        handleNavigate('/tabel')
      } else if (tabId === 'kelola-wilayah') {
        handleNavigate('/kelola-wilayah')
      } else if (tabId === 'manajemen') {
        handleNavigate('/manajemen')
      } else {
        handleNavigate('/')
      }
    },
    [isAdmin, user, currentPath, handleNavigate]
  )

  // Synchronize admin default scope
  useEffect(() => {
    if (isAdmin && user) {
      let matchedDistrik = user.namaDistrik || ''
      let matchedResort = user.namaResort || ''
      let matchedHuria = user.namaHuria || ''

      if (wilayahData && wilayahData.length > 0) {
        const distriks = wilayahData[0]?.Pusat?.Distrik || []
        for (const d of distriks) {
          for (const res of d.Resort || []) {
            for (const h of res.Huria || []) {
              if (
                (user.idHuria && h.IdHuria === user.idHuria) ||
                (user.namaHuria && h.NamaHuria === user.namaHuria) ||
                (user.namaHuria && user.namaHuria.includes(h.NamaHuria)) ||
                (user.namaHuria && h.NamaHuria.includes(user.namaHuria))
              ) {
                matchedDistrik = d.NamaDistrik
                matchedResort = res.NamaResort
                matchedHuria = h.NamaHuria
                break
              }
            }
          }
        }
      }

      setFilters((prev) => ({
        ...prev,
        distrik: matchedDistrik,
        resort: matchedResort,
        huria: matchedHuria,
      }))
    }
  }, [isAdmin, user, wilayahData])

  // Fetch Wilayah Data
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getWilayah()
      setWilayahData(data || [])
      setLiveWilayahTree(data || [])
    } catch (err) {
      setError(err.message || 'Gagal memuat data wilayah HKBP')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchData()
    }
  }, [isAuthenticated, fetchData])

  // RBAC Tab Protection Guard (Admin now allowed in 'perbandingan')
  useEffect(() => {
    if (isAdmin && activeTab === 'kelola-wilayah') {
      setActiveTab('dashboard')
    }
    if (isSuperAdmin && activeTab === 'manajemen') {
      setActiveTab('dashboard')
    }
  }, [isAdmin, isSuperAdmin, activeTab])

  // Parser rute wilayah HKBP
  const wilayahRoute = useMemo(() => {
    if (!currentPath.startsWith('/wilayah')) {
      // Jika tab perbandingan aktif tapi path belum di-update, arahkan ke rute awal sesuai role
      if (activeTab === 'perbandingan') {
        return { type: 'distrik-list', id: '' }
      }
      return null
    }

    const huriaMatch = currentPath.match(/^\/wilayah\/huria\/([^/?#]+)/)
    if (huriaMatch) return { type: 'huria', id: huriaMatch[1] }

    const resortMatch = currentPath.match(/^\/wilayah\/resort\/([^/?#]+)/)
    if (resortMatch) return { type: 'resort', id: resortMatch[1] }

    const distrikMatch = currentPath.match(/^\/wilayah\/distrik\/([^/?#]+)/)
    if (distrikMatch) return { type: 'distrik', id: distrikMatch[1] }

    return { type: 'distrik-list', id: '' }
  }, [currentPath, activeTab, isAdmin, user])

  // If not authenticated, render Login Page
  if (!isAuthenticated) {
    return <LoginPage />
  }

  // Active Tab Title Mapping
  const tabTitles = {
    dashboard: 'Dashboard',
    tabel: 'Data tabel',
    studio: 'Visualisasi',
    perbandingan: 'Wilayah & Huria',
    'kelola-wilayah': 'Kelola Wilayah',
    manajemen: 'Pengaturan',
  }

  return (
    <div className="min-h-screen w-full bg-canvas flex font-sans text-ink">
      {/* Sidebar (Desktop sticky / Mobile drawer) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full min-h-screen">
        {/* Top Navbar */}
        <Navbar
          onRefreshData={fetchData}
          activeTabTitle={tabTitles[activeTab] || 'Dashboard'}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        {/* Content Area */}
        <main className="flex-1 p-5 sm:p-7 lg:p-8 overflow-y-auto w-full max-w-full">
          {loading && wilayahData.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3.5 text-muted">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-sm font-medium">
                Memuat data operasional & hierarki HKBP...
              </span>
            </div>
          ) : error ? (
            <div className="p-5 rounded-2xl bg-danger/10 border border-danger/20 text-danger flex items-center gap-3.5">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <div>
                <h4 className="text-sm font-bold m-0">Gagal Mengambil Data</h4>
                <p className="text-xs mt-1 mb-0">{error}</p>
                <button
                  onClick={fetchData}
                  className="mt-2 text-xs font-bold underline bg-transparent border-none text-danger cursor-pointer p-0"
                >
                  Coba lagi
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Filter Controls hanya untuk Data Tabel */}
              {activeTab === 'tabel' && (
                <FilterControls
                  wilayahData={wilayahData}
                  filters={filters}
                  onFilterChange={setFilters}
                  showOrgFilter={true}
                  showTimeFilter={true}
                />
              )}

              {/* Page Views */}
              {activeTab === 'dashboard' && (
                <DashboardPage
                  wilayahData={wilayahData}
                  filters={filters}
                  onNavigateTab={handleSelectTab}
                />
              )}

              {/* RUTE WILAYAH HKBP BERJENJANG */}
              {activeTab === 'perbandingan' && wilayahRoute && (
                <>
                  {wilayahRoute.type === 'huria' ? (
                    <HuriaDetailPage
                      idHuria={wilayahRoute.id}
                      globalFilters={filters}
                      onNavigate={handleNavigate}
                    />
                  ) : wilayahRoute.type === 'resort' ? (
                    <WilayahLevelPage
                      level="huria"
                      idInduk={wilayahRoute.id}
                      globalFilters={filters}
                      onNavigate={handleNavigate}
                    />
                  ) : wilayahRoute.type === 'distrik' ? (
                    <WilayahLevelPage
                      level="resort"
                      idInduk={wilayahRoute.id}
                      globalFilters={filters}
                      onNavigate={handleNavigate}
                    />
                  ) : (
                    <WilayahLevelPage
                      level="distrik"
                      idInduk=""
                      globalFilters={filters}
                      onNavigate={handleNavigate}
                    />
                  )}
                </>
              )}

              {activeTab === 'studio' && (
                <StudioVisualisasiPage
                  wilayahData={wilayahData}
                  filters={filters}
                  onFilterChange={setFilters}
                />
              )}

              {activeTab === 'tabel' && (
                <DataTabelPage wilayahData={wilayahData} filters={filters} />
              )}

              {activeTab === 'kelola-wilayah' && isSuperAdmin && (
                <KelolaWilayahPage onDataUpdated={fetchData} />
              )}

              {activeTab === 'manajemen' && isAdmin && (
                <ManajemenDataPage wilayahData={wilayahData} onDataUpdated={fetchData} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  )
}