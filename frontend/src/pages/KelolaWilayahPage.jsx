import { fetchLiveWilayah } from '../api/wilayahExplorerApi'
import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  MapPin,
  Building2,
  Home,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  Layers,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  getDistrikList,
  createDistrik,
  updateDistrik,
  deleteDistrik,
  getResortList,
  createResort,
  updateResort,
  deleteResort,
  getHuriaList,
  createHuria,
  updateHuria,
  deleteHuria,
} from '../api/masterWilayahApi'

export const KelolaWilayahPage = ({ onDataUpdated }) => {
  const [activeTab, setActiveTab] = useState('distrik') // 'distrik' | 'resort' | 'huria'

  // Data states (3 level: Distrik, Resort, Huria)
  const [distrikData, setDistrikData] = useState({ data: [], total: 0, page: 1, limit: 10 })
  const [resortData, setResortData] = useState({ data: [], total: 0, page: 1, limit: 10 })
  const [huriaData, setHuriaData] = useState({ data: [], total: 0, page: 1, limit: 10 })

  // Lookup options for parent dropdowns in forms & filters
  const [distrikOptions, setDistrikOptions] = useState([])
  const [resortOptions, setResortOptions] = useState([])
  const [tabCounts, setTabCounts] = useState({ distrik: 0, resort: 0, huria: 0 })

  // UI state
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [feedback, setFeedback] = useState(null) // { type: 'success' | 'error', message: '' }

  // Filter states per tab
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAktif, setFilterAktif] = useState('') // '' | 'true' | 'false'
  const [filterDistrikId, setFilterDistrikId] = useState('')
  const [filterResortId, setFilterResortId] = useState('')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' | 'edit'
  const [selectedItem, setSelectedItem] = useState(null)
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null)

  // Form states (Huria memuat atribut lengkap gereja)
  const [formValues, setFormValues] = useState({
    Kode: '',
    Nama: '',
    NamaPraeses: '',
    NamaPendetaResort: '',
    IdDistrik: '',
    IdResort: '',
    LokasiHuria: '',
    TahunBerdiri: '',
    NamaPendetaPimpinan: '',
    JumlahJemaat: 0,
    KepalaKeluarga: '',
    Aktif: true,
  })

  // Load Parent Options (Distrik, Resort) and global tab counts
  const loadParentOptions = useCallback(async () => {
    try {
      const [dRes, rRes, hRes] = await Promise.all([
        getDistrikList({ limit: 100 }),
        getResortList({ limit: 200 }),
        getHuriaList({ limit: 1 }),
      ])
      setDistrikOptions(dRes.data || [])
      setResortOptions(rRes.data || [])
      setTabCounts({
        distrik: dRes.total !== undefined ? dRes.total : (dRes.data || []).length,
        resort: rRes.total !== undefined ? rRes.total : (rRes.data || []).length,
        huria: hRes.total !== undefined ? hRes.total : (hRes.data || []).length,
      })
    } catch (err) {
      console.error('Gagal memuat opsi referensi induk wilayah:', err)
    }
  }, [])

  useEffect(() => {
    loadParentOptions()
  }, [loadParentOptions])

  // Fetch Tab Data
  const fetchTabData = useCallback(
    async (page = 1) => {
      setLoading(true)
      setFeedback(null)
      try {
        const params = {
          page,
          limit: 10,
          q: searchQuery.trim(),
        }
        if (filterAktif !== '') params.aktif = filterAktif

        if (activeTab === 'distrik') {
          const res = await getDistrikList(params)
          setDistrikData(res)
          if (!searchQuery && filterAktif === '') {
            setTabCounts((prev) => ({ ...prev, distrik: res.total }))
          }
        } else if (activeTab === 'resort') {
          if (filterDistrikId) params.idDistrik = filterDistrikId
          const res = await getResortList(params)
          setResortData(res)
          if (!searchQuery && filterAktif === '' && !filterDistrikId) {
            setTabCounts((prev) => ({ ...prev, resort: res.total }))
          }
        } else if (activeTab === 'huria') {
          if (filterDistrikId) params.idDistrik = filterDistrikId
          if (filterResortId) params.idResort = filterResortId
          const res = await getHuriaList(params)
          setHuriaData(res)
          if (!searchQuery && filterAktif === '' && !filterDistrikId && !filterResortId) {
            setTabCounts((prev) => ({ ...prev, huria: res.total }))
          }
        }
      } catch (err) {
        setFeedback({
          type: 'error',
          message: err.response?.data?.error || err.message || 'Gagal memuat data',
        })
      } finally {
        setLoading(false)
      }
    },
    [activeTab, searchQuery, filterAktif, filterDistrikId, filterResortId]
  )

  // Reload when tab or search/filter changes
  useEffect(() => {
    fetchTabData(1)
  }, [fetchTabData])

  // Tab definitions (3 level: Distrik, Resort, Huria)
  const tabs = [
    {
      id: 'distrik',
      label: 'Distrik',
      icon: MapPin,
      count:
        activeTab === 'distrik' && (searchQuery || filterAktif !== '')
          ? distrikData.total
          : tabCounts.distrik,
    },
    {
      id: 'resort',
      label: 'Resort',
      icon: Building2,
      count:
        activeTab === 'resort' && (searchQuery || filterAktif !== '' || filterDistrikId !== '')
          ? resortData.total
          : tabCounts.resort,
    },
    {
      id: 'huria',
      label: 'Huria',
      icon: Home,
      count:
        activeTab === 'huria' && (searchQuery || filterAktif !== '' || filterDistrikId !== '' || filterResortId !== '')
          ? huriaData.total
          : tabCounts.huria,
    },
  ]

  // Reset filters when switching tabs
  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    setSearchQuery('')
    setFilterAktif('')
    setFilterDistrikId('')
    setFilterResortId('')
    setFeedback(null)
  }

  // Apakah tombol Tambah diizinkan aktif sesuai alur berjenjang:
  // - Resort: harus pilih Distrik dulu
  // - Huria: harus pilih Distrik lalu Resort dulu
  const isCreateDisabled = useMemo(() => {
    if (activeTab === 'resort') {
      return distrikOptions.length === 0
    }
    if (activeTab === 'huria') {
      return resortOptions.length === 0
    }
    return false
  }, [activeTab, distrikOptions.length, resortOptions.length])

  const createDisabledReason = useMemo(() => {
    if (activeTab === 'resort' && distrikOptions.length === 0) {
      return 'Belum ada data Distrik. Silakan buat Distrik terlebih dahulu sebelum menambah Resort.'
    }
    if (activeTab === 'huria' && resortOptions.length === 0) {
      return 'Belum ada data Resort. Silakan buat Distrik dan Resort terlebih dahulu sebelum menambah Huria.'
    }
    return ''
  }, [activeTab, distrikOptions.length, resortOptions.length])

  // Open Create Modal
  const handleOpenCreate = () => {
    if (isCreateDisabled) return
    setModalMode('create')
    setSelectedItem(null)
    const initialDistrikId = filterDistrikId || (distrikOptions[0]?._id || '')
    const availableResorts = resortOptions.filter((r) => !initialDistrikId || r.IdDistrik === initialDistrikId)
    const initialResortId = filterResortId || (availableResorts[0]?._id || '')

    setFormValues({
      Kode: '',
      Nama: '',
      NamaPraeses: '',
      NamaPendetaResort: '',
      IdDistrik: initialDistrikId,
      IdResort: initialResortId,
      LokasiHuria: '',
      TahunBerdiri: '',
      NamaPendetaPimpinan: '',
      JumlahJemaat: 0,
      KepalaKeluarga: '',
      Aktif: true,
    })
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setModalMode('edit')
    setSelectedItem(item)
    setFormValues({
      Kode: item.Kode || '',
      Nama: item.Nama || item.NamaHuria || '',
      NamaPraeses: item.NamaPraeses || '',
      NamaPendetaResort: item.NamaPendetaResort || '',
      IdDistrik: item.IdDistrik || '',
      IdResort: item.IdResort || '',
      LokasiHuria: item.LokasiHuria || '',
      TahunBerdiri: item.TahunBerdiri || '',
      NamaPendetaPimpinan: item.NamaPendetaPimpinan || '',
      JumlahJemaat: item.JumlahJemaat || 0,
      KepalaKeluarga: item.KepalaKeluarga || '',
      Aktif: item.Aktif !== undefined ? item.Aktif : true,
    })
    setIsModalOpen(true)
  }

  // Submit Create or Edit Form
  const handleSubmitForm = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    setFeedback(null)

    try {
      if (activeTab === 'distrik') {
        const payload = {
          Kode: formValues.Kode.trim(),
          Nama: formValues.Nama.trim(),
          NamaPraeses: formValues.NamaPraeses.trim(),
          Aktif: formValues.Aktif,
        }
        if (modalMode === 'create') {
          await createDistrik(payload)
          setFeedback({ type: 'success', message: `Distrik "${payload.Nama}" berhasil ditambahkan` })
        } else {
          await updateDistrik(selectedItem._id, payload)
          setFeedback({ type: 'success', message: `Distrik "${payload.Nama}" berhasil diperbarui` })
        }
      } else if (activeTab === 'resort') {
        const payload = {
          Kode: formValues.Kode.trim(),
          Nama: formValues.Nama.trim(),
          NamaPendetaResort: formValues.NamaPendetaResort.trim(),
          IdDistrik: formValues.IdDistrik || filterDistrikId,
          Aktif: formValues.Aktif,
        }
        if (modalMode === 'create') {
          await createResort(payload)
          setFeedback({ type: 'success', message: `Resort "${payload.Nama}" berhasil ditambahkan` })
        } else {
          await updateResort(selectedItem._id, payload)
          setFeedback({ type: 'success', message: `Resort "${payload.Nama}" berhasil diperbarui` })
        }
      } else if (activeTab === 'huria') {
        const payload = {
          Kode: formValues.Kode.trim(),
          Nama: formValues.Nama.trim(),
          IdResort: formValues.IdResort || filterResortId,
          LokasiHuria: formValues.LokasiHuria.trim(),
          TahunBerdiri: formValues.TahunBerdiri.trim(),
          NamaPendetaPimpinan: formValues.NamaPendetaPimpinan.trim(),
          JumlahJemaat: Number(formValues.JumlahJemaat) || 0,
          KepalaKeluarga: formValues.KepalaKeluarga.trim(),
          Aktif: formValues.Aktif,
        }
        if (modalMode === 'create') {
          await createHuria(payload)
          setFeedback({ type: 'success', message: `Huria "${payload.Nama}" berhasil ditambahkan` })
        } else {
          await updateHuria(selectedItem._id, payload)
          setFeedback({ type: 'success', message: `Huria "${payload.Nama}" berhasil diperbarui` })
        }
      }

      setIsModalOpen(false)
      loadParentOptions()
      fetchTabData()
      fetchLiveWilayah(true)
      if (onDataUpdated) onDataUpdated()
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Gagal menyimpan data',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Quick Toggle Active Status
  const handleToggleAktif = async (item) => {
    setActionLoading(true)
    try {
      const nextAktif = !item.Aktif
      if (activeTab === 'distrik') {
        await updateDistrik(item._id, { Aktif: nextAktif })
      } else if (activeTab === 'resort') {
        await updateResort(item._id, { Aktif: nextAktif })
      } else if (activeTab === 'huria') {
        await updateHuria(item._id, { Aktif: nextAktif })
      }
      setFeedback({
        type: 'success',
        message: `Status "${item.Nama || item.NamaHuria}" diubah menjadi ${nextAktif ? 'Aktif' : 'Nonaktif'}`,
      })
      fetchTabData()
      if (onDataUpdated) onDataUpdated()
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Gagal mengubah status',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Delete Action
  const handleConfirmDelete = async () => {
    if (!deleteConfirmItem) return
    setActionLoading(true)
    setFeedback(null)

    try {
      const id = deleteConfirmItem._id
      const name = deleteConfirmItem.Nama || deleteConfirmItem.NamaHuria || 'Data'

      if (activeTab === 'distrik') {
        await deleteDistrik(id)
      } else if (activeTab === 'resort') {
        await deleteResort(id)
      } else if (activeTab === 'huria') {
        await deleteHuria(id)
      }

      setFeedback({ type: 'success', message: `${name} berhasil diproses` })
      setDeleteConfirmItem(null)
      loadParentOptions()
      fetchTabData()
      if (onDataUpdated) onDataUpdated()
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Gagal menghapus data',
      })
      setDeleteConfirmItem(null)
    } finally {
      setActionLoading(false)
    }
  }

  // Lookup Maps for Parent Names
  const distrikMap = useMemo(() => {
    const map = {}
    distrikOptions.forEach((d) => {
      map[d._id] = d.Nama
    })
    return map
  }, [distrikOptions])

  const resortMap = useMemo(() => {
    const map = {}
    resortOptions.forEach((r) => {
      map[r._id] = r.Nama
    })
    return map
  }, [resortOptions])

  // Current Table Data based on Active Tab
  const currentTableState = useMemo(() => {
    if (activeTab === 'distrik') return distrikData
    if (activeTab === 'resort') return resortData
    return huriaData
  }, [activeTab, distrikData, resortData, huriaData])

  return (
    <div className="flex flex-col gap-6 pb-12 w-full font-sans">
      {/* 1. HEADER SECTION (Title, Subtitle, Actions) */}
      <div className="flex flex-wrap items-center justify-between gap-4 w-full">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-bold text-muted tracking-wider uppercase">
              HKBP · Manajemen Master Data
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight leading-tight">
            Kelola Wilayah HKBP
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1 max-w-2xl">
            Pusat pengelolaan struktur organisasi gereja HKBP dari tingkat Distrik, Resort, hingga Huria.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              loadParentOptions()
              fetchTabData()
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl border border-line bg-surface text-ink text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Segarkan data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : 'text-muted'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            disabled={isCreateDisabled}
            title={isCreateDisabled ? createDisabledReason : `Tambah ${tabs.find((t) => t.id === activeTab)?.label}`}
            className={`inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl text-white text-xs sm:text-sm font-bold shadow-xs transition-colors ${
              isCreateDisabled
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-primary hover:bg-primary-700 cursor-pointer shadow-xs'
            }`}
          >
            <Plus className="w-4 h-4 text-accent" />
            <span>Tambah {tabs.find((t) => t.id === activeTab)?.label}</span>
          </button>
        </div>
      </div>

      {/* Petunjuk alur berjenjang jika tombol disabled */}
      {isCreateDisabled && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{createDisabledReason}</span>
        </div>
      )}

      {/* Feedback Toast Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          )}
          <div className="flex-1 text-sm font-medium leading-relaxed">{feedback.message}</div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs Navigation (3 tabs: Distrik, Resort, Huria) */}
      <div className="flex border-b border-line overflow-x-auto gap-2 sm:gap-4 no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2.5 py-3.5 px-4 font-bold text-sm border-b-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'border-primary text-primary font-extrabold bg-primary/5 rounded-t-xl'
                  : 'border-transparent text-muted hover:text-ink hover:border-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted'}`} />
              <span>{tab.label}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-colors ${
                  isActive ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count || 0}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-surface rounded-2xl p-3 sm:p-4 border border-line shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder={`Cari nama atau kode ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 min-h-[40px] bg-canvas border border-line rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-2xs placeholder:text-muted/70 text-ink"
          />
        </div>

        {/* Filter Parent: Distrik (for Resort, Huria) */}
        {activeTab !== 'distrik' && (
          <select
            value={filterDistrikId}
            onChange={(e) => {
              setFilterDistrikId(e.target.value)
              setFilterResortId('')
            }}
            className="px-3.5 py-2 min-h-[40px] bg-canvas border border-line rounded-xl text-xs sm:text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer shadow-2xs"
          >
            <option value="">Semua Distrik</option>
            {distrikOptions.map((d) => (
              <option key={d._id} value={d._id}>
                {d.Kode} - {d.Nama}
              </option>
            ))}
          </select>
        )}

        {/* Filter Parent: Resort (for Huria) */}
        {activeTab === 'huria' && (
          <select
            value={filterResortId}
            onChange={(e) => setFilterResortId(e.target.value)}
            className="px-3.5 py-2 min-h-[40px] bg-canvas border border-line rounded-xl text-xs sm:text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer shadow-2xs"
          >
            <option value="">Semua Resort</option>
            {resortOptions
              .filter((r) => !filterDistrikId || r.IdDistrik === filterDistrikId)
              .map((r) => (
                <option key={r._id} value={r._id}>
                  {r.Kode} - {r.Nama}
                </option>
              ))}
          </select>
        )}

        {/* Status Aktif Filter */}
        <select
          value={filterAktif}
          onChange={(e) => setFilterAktif(e.target.value)}
          className="px-3.5 py-2 min-h-[40px] bg-canvas border border-line rounded-xl text-xs sm:text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer shadow-2xs"
        >
          <option value="">Semua Status</option>
          <option value="true">Aktif</option>
          <option value="false">Nonaktif</option>
        </select>
      </div>

      {/* Main Table Card */}
      <div className="bg-surface rounded-2xl border border-line shadow-xs overflow-hidden">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-muted">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm font-medium">Memuat data {activeTab}...</span>
          </div>
        ) : currentTableState.data.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-center p-6 text-muted">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-ink">Tidak ada data {activeTab}</h4>
              <p className="text-xs text-muted mt-1 max-w-sm">
                Belum ada data terdaftar dengan filter pencarian ini. Tambahkan data baru dengan tombol di atas.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-canvas/80 border-b border-line text-[11px] font-bold text-muted uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th className="py-3.5 px-4">Kode</th>
                  <th className="py-3.5 px-4">Nama</th>

                  {activeTab === 'distrik' && <th className="py-3.5 px-4">Praeses</th>}
                  {activeTab === 'resort' && (
                    <>
                      <th className="py-3.5 px-4">Induk Distrik</th>
                      <th className="py-3.5 px-4">Pendeta Resort</th>
                    </>
                  )}

                  {activeTab === 'huria' && (
                    <>
                      <th className="py-3.5 px-4">Induk Organisasi</th>
                      <th className="py-3.5 px-4">Pimpinan</th>
                      <th className="py-3.5 px-4 text-right">Jemaat</th>
                    </>
                  )}

                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs sm:text-sm">
                {currentTableState.data.map((item, idx) => {
                  const no = (currentTableState.page - 1) * currentTableState.limit + idx + 1
                  const itemName = item.Nama || item.NamaHuria

                  return (
                    <tr key={item._id} className="hover:bg-primary-50/40 transition-colors">
                      <td className="py-3.5 px-4 text-center text-xs text-muted font-medium">{no}</td>

                      {/* Kode Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-primary-50 text-primary border border-primary-100">
                          {item.Kode}
                        </span>
                      </td>

                      {/* Nama */}
                      <td className="py-3.5 px-4 font-bold text-ink whitespace-nowrap">
                        {itemName}
                        {activeTab === 'huria' && item.LokasiHuria && (
                          <div className="text-xs font-normal text-muted mt-0.5">{item.LokasiHuria}</div>
                        )}
                      </td>

                      {/* Praeses (untuk Distrik) */}
                      {activeTab === 'distrik' && (
                        <td className="py-3.5 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                          {item.NamaPraeses || '-'}
                        </td>
                      )}

                      {/* Induk Organisasi & Pendeta Resort (untuk Resort) */}
                      {activeTab === 'resort' && (
                        <>
                          <td className="py-3.5 px-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                            {distrikMap[item.IdDistrik] || 'Distrik tidak ditemukan'}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                            {item.NamaPendetaResort || '-'}
                          </td>
                        </>
                      )}

                      {activeTab === 'huria' && (
                        <td className="py-3.5 px-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                          <div className="font-semibold text-ink">{resortMap[item.IdResort] || '-'}</div>
                          <div className="text-[11px] text-muted">{distrikMap[item.IdDistrik] || '-'}</div>
                        </td>
                      )}

                      {/* Extra Huria Info */}
                      {activeTab === 'huria' && (
                        <>
                          <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                            {item.NamaPendetaPimpinan || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-right font-semibold text-ink whitespace-nowrap">
                            {item.JumlahJemaat ? item.JumlahJemaat.toLocaleString('id-ID') : '-'}
                          </td>
                        </>
                      )}

                      {/* Status Aktif */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleToggleAktif(item)}
                          disabled={actionLoading}
                          title="Klik untuk ubah status aktif/nonaktif"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            item.Aktif
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${item.Aktif ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          />
                          <span>{item.Aktif ? 'Aktif' : 'Nonaktif'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="Edit data"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-primary-50 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmItem(item)}
                            title="Hapus entitas"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {currentTableState.total > 0 && (
          <div className="p-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
            <div className="font-medium">
              Menampilkan{' '}
              <span className="font-bold text-ink tabular-nums">
                {(currentTableState.page - 1) * currentTableState.limit + 1}–{Math.min(currentTableState.page * currentTableState.limit, currentTableState.total)}
              </span>{' '}
              dari <span className="font-bold text-ink tabular-nums">{currentTableState.total}</span> data
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fetchTabData(currentTableState.page - 1)}
                disabled={currentTableState.page <= 1 || loading}
                aria-label="Halaman sebelumnya"
                className="inline-flex items-center justify-center min-h-[40px] px-3.5 rounded-xl border border-line bg-surface text-ink text-xs font-semibold hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>

              <div className="inline-flex items-center justify-center min-h-[40px] px-3.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xs">
                Halaman {currentTableState.page} dari{' '}
                {Math.max(1, Math.ceil(currentTableState.total / currentTableState.limit))}
              </div>

              <button
                type="button"
                onClick={() => fetchTabData(currentTableState.page + 1)}
                disabled={
                  currentTableState.page >=
                    Math.ceil(currentTableState.total / currentTableState.limit) || loading
                }
                aria-label="Halaman selanjutnya"
                className="inline-flex items-center justify-center min-h-[40px] px-3.5 rounded-xl border border-line bg-surface text-ink text-xs font-semibold hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer gap-1"
              >
                <span>Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL FORM CREATE / EDIT --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
          <div className="bg-surface rounded-2xl max-w-lg w-full border border-line shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-line flex items-center justify-between bg-canvas/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center shadow-xs">
                  <Plus className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink leading-tight">
                    {modalMode === 'create' ? 'Tambah' : 'Ubah'}{' '}
                    {tabs.find((t) => t.id === activeTab)?.label}
                  </h3>
                  <p className="text-xs text-muted">
                    {modalMode === 'create' ? 'Isi data baru untuk disimpan' : 'Perbarui informasi entitas ini'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-canvas transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Field Kode */}
              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                  Kode <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    activeTab === 'distrik'
                      ? 'Contoh: DIS-09'
                      : activeTab === 'resort'
                      ? 'Contoh: RES-05'
                      : 'Contoh: HUR-09'
                  }
                  value={formValues.Kode}
                  onChange={(e) => setFormValues({ ...formValues, Kode: e.target.value })}
                  className="w-full px-3.5 py-2 min-h-[40px] bg-canvas border border-line rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-ink"
                />
              </div>

              {/* Field Nama */}
              <div>
                <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                  Nama {tabs.find((t) => t.id === activeTab)?.label} <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={`Masukkan nama ${activeTab}...`}
                  value={formValues.Nama}
                  onChange={(e) => setFormValues({ ...formValues, Nama: e.target.value })}
                  className="w-full px-3.5 py-2 min-h-[40px] bg-canvas border border-line rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-ink font-medium"
                />
              </div>

              {/* Field Nama Praeses (untuk Distrik) */}
              {activeTab === 'distrik' && (
                <div>
                  <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                    Nama Praeses <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pdt. Bernard Manik, M.Th"
                    value={formValues.NamaPraeses}
                    onChange={(e) => setFormValues({ ...formValues, NamaPraeses: e.target.value })}
                    className="w-full px-3.5 py-2 min-h-[40px] bg-canvas border border-line rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-ink font-medium"
                  />
                </div>
              )}

              {/* Field Nama Pendeta Resort (untuk Resort) */}
              {activeTab === 'resort' && (
                <div>
                  <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                    Nama Pendeta Resort <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pdt. Victor Tinambunan, MST"
                    value={formValues.NamaPendetaResort}
                    onChange={(e) => setFormValues({ ...formValues, NamaPendetaResort: e.target.value })}
                    className="w-full px-3.5 py-2 min-h-[40px] bg-canvas border border-line rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-ink font-medium"
                  />
                </div>
              )}

              {/* Field Induk Distrik (untuk Resort) */}
              {activeTab === 'resort' && (
                <div>
                  <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                    Induk Distrik <span className="text-danger">*</span>
                  </label>
                  <select
                    required
                    value={formValues.IdDistrik || filterDistrikId}
                    onChange={(e) => setFormValues({ ...formValues, IdDistrik: e.target.value })}
                    className="w-full px-3.5 py-2 min-h-[40px] bg-canvas border border-line rounded-xl text-xs sm:text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer shadow-2xs"
                  >
                    <option value="" disabled>
                      Pilih Distrik Induk...
                    </option>
                    {distrikOptions.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.Kode} - {d.Nama}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Field Induk Distrik & Resort Berjenjang (untuk Huria) */}
              {activeTab === 'huria' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                      1. Pilih Distrik Induk <span className="text-danger">*</span>
                    </label>
                    <select
                      required
                      value={formValues.IdDistrik || ''}
                      onChange={(e) => {
                        const newDistrikId = e.target.value
                        const available = resortOptions.filter((r) => r.IdDistrik === newDistrikId)
                        setFormValues({
                          ...formValues,
                          IdDistrik: newDistrikId,
                          IdResort: available[0]?._id || '',
                        })
                      }}
                      className="w-full px-3.5 py-2 min-h-[40px] bg-canvas border border-line rounded-xl text-xs sm:text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer shadow-2xs"
                    >
                      <option value="" disabled>
                        -- Pilih Distrik Induk --
                      </option>
                      {distrikOptions.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.Kode} - {d.Nama}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                      2. Pilih Resort Induk <span className="text-danger">*</span>
                    </label>
                    {(() => {
                      const filteredResorts = resortOptions.filter(
                        (r) => !formValues.IdDistrik || r.IdDistrik === formValues.IdDistrik
                      )
                      if (!formValues.IdDistrik) {
                        return (
                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                            <span>Pilih Distrik terlebih dahulu untuk memunculkan daftar Resort.</span>
                          </div>
                        )
                      }
                      if (filteredResorts.length === 0) {
                        return (
                          <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>Distrik ini belum memiliki Resort. Buat Resort di distrik ini terlebih dahulu.</span>
                          </div>
                        )
                      }
                      return (
                        <select
                          required
                          value={formValues.IdResort || ''}
                          onChange={(e) => setFormValues({ ...formValues, IdResort: e.target.value })}
                          className="w-full px-3.5 py-2 min-h-[40px] bg-canvas border border-line rounded-xl text-xs sm:text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer shadow-2xs"
                        >
                          <option value="" disabled>
                            -- Pilih Resort Induk --
                          </option>
                          {filteredResorts.map((r) => (
                            <option key={r._id} value={r._id}>
                              {r.Kode} - {r.Nama}
                            </option>
                          ))}
                        </select>
                      )
                    })()}
                  </div>
                </>
              )}

              {/* Atribut Lengkap untuk Huria */}
              {activeTab === 'huria' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                      Lokasi / Alamat Huria
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Jl. Sudirman No. 12, Jakarta"
                      value={formValues.LokasiHuria}
                      onChange={(e) => setFormValues({ ...formValues, LokasiHuria: e.target.value })}
                      className="w-full px-3.5 py-2 min-h-[40px] bg-canvas border border-line rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-ink font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                        Tahun Berdiri (4 digit)
                      </label>
                      <input
                        type="text"
                        maxLength="4"
                        placeholder="Contoh: 1952"
                        value={formValues.TahunBerdiri}
                        onChange={(e) => setFormValues({ ...formValues, TahunBerdiri: e.target.value })}
                        className="w-full px-3.5 py-2 min-h-[40px] bg-canvas border border-line rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-ink font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                        Jumlah Jemaat
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formValues.JumlahJemaat}
                        onChange={(e) => setFormValues({ ...formValues, JumlahJemaat: e.target.value })}
                        className="w-full px-3.5 py-2 min-h-[40px] bg-canvas border border-line rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-ink font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                      Kepala Keluarga
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 350 KK"
                      value={formValues.KepalaKeluarga}
                      onChange={(e) => setFormValues({ ...formValues, KepalaKeluarga: e.target.value })}
                      className="w-full px-3.5 py-2 min-h-[40px] bg-canvas border border-line rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-ink font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
                      Nama Pendeta Pimpinan
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Pdt. Dr. John Doe, M.Th"
                      value={formValues.NamaPendetaPimpinan}
                      onChange={(e) => setFormValues({ ...formValues, NamaPendetaPimpinan: e.target.value })}
                      className="w-full px-3.5 py-2 min-h-[40px] bg-canvas border border-line rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-ink font-medium"
                    />
                  </div>
                </>
              )}

              {/* Status Aktif Toggle */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="formAktif"
                  checked={formValues.Aktif}
                  onChange={(e) => setFormValues({ ...formValues, Aktif: e.target.checked })}
                  className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary cursor-pointer"
                />
                <label htmlFor="formAktif" className="text-xs sm:text-sm font-semibold text-ink cursor-pointer select-none">
                  Status Aktif (dapat digunakan dalam operasional & pelaporan)
                </label>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-line flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={actionLoading}
                  className="px-4 py-2 min-h-[40px] rounded-xl border border-line font-semibold text-xs sm:text-sm text-muted hover:bg-canvas transition-colors cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 min-h-[40px] rounded-xl bg-primary hover:bg-primary-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin text-accent" />}
                  <span>{modalMode === 'create' ? 'Simpan Data' : 'Perbarui Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONFIRM DELETE MODAL --- */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
          <div className="bg-surface rounded-2xl max-w-md w-full border border-line shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-danger">
              <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-danger" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink">Konfirmasi Hapus</h3>
                <p className="text-xs text-muted">Tindakan ini akan memverifikasi dependensi data</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus {tabs.find((t) => t.id === activeTab)?.label}{' '}
              <strong className="text-ink font-bold">
                "{deleteConfirmItem.Nama || deleteConfirmItem.NamaHuria}" ({deleteConfirmItem.Kode})
              </strong>
              ?
            </p>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs leading-relaxed">
              <strong>Catatan:</strong> Jika entitas ini masih memiliki unit anak atau catatan transaksi keuangan,
              sistem akan menolak penghapusan (HTTP 409) atau menonaktifkan entitas untuk melindungi integritas audit.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                disabled={actionLoading}
                className="px-4 py-2 min-h-[40px] rounded-xl border border-line text-xs sm:text-sm font-semibold text-muted hover:bg-canvas cursor-pointer disabled:opacity-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={actionLoading}
                className="px-4 py-2 min-h-[40px] rounded-xl bg-danger hover:bg-red-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
