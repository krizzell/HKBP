/**
 * @file OrganisasiFilterBar.jsx
 * Filter wilayah berjenjang 3 level (Distrik -> Resort -> Huria) dalam 1 Section Tunggal:
 * - 1 section utuh tanpa kotak terpisah-pisah untuk tiap distrik.
 * - Berbasis hover interaktif:
 *   * Mengarahkan kursor (hover) ke baris Distrik otomatis membuka (expand) daftar Resort dan mem-fetch datanya secara otomatis.
 *   * Menggeser kursor ke salah satu Resort otomatis membuka (expand) daftar Huria di bawahnya dan mem-fetch datanya secara otomatis.
 * - Dilengkapi feedback visual loading (spinner & teks indikator) saat data sedang di-fetch.
 * - Tetap mendukung klik manual (chevron) & tombol Buka Semua / Tutup Semua.
 * - Multi-pilih (maksimal 6 item) dengan penanda target komparasi otomatis.
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  RotateCcw,
  Search,
  Building,
  Layers,
  Church,
  Check,
  ChevronRight,
  ChevronDown,
  Lock,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { FilterSummary } from './FilterSummary'
import { getOrganisasiOptions } from '../api/organisasiApi'
import { getResortList, getHuriaList } from '../api/masterWilayahApi'

// Jeda debounce hover (80ms) agar gerakan kursor cepat tidak memicu layout shift mendadak,
// namun langsung responsif saat kursor diarahkan ke baris target.
const HOVER_EXPAND_DELAY_MS = 80

// Checkbox kustom ramah brand token HKBP
function CustomCheckbox({ checked, onChange, disabled, id }) {
  return (
    <button
      type="button"
      id={id}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled && onChange) onChange(!checked)
      }}
      className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-all duration-150 ease-out shrink-0 cursor-pointer ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${
        checked
          ? 'bg-primary border-primary text-white shadow-2xs'
          : 'border-line bg-surface hover:border-primary-300 hover:bg-primary-50/50'
      }`}
    >
      {checked && <Check className="w-3 h-3 text-white stroke-[2.5]" />}
    </button>
  )
}

export function OrganisasiFilterBar({ filterState }) {
  const {
    selected,
    options,
    loading,
    level,
    items,
    excludedParents,
    summary,
    warnings,
    locks,
    periode,
    setPeriode,
    setSelected,
    reset,
    addOptions,
  } = filterState

  const maxSelected = 6

  // Local state status buka/tutup (expand) tiap entitas
  const [expandedDistriks, setExpandedDistriks] = useState(new Set())
  const [expandedResorts, setExpandedResorts] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [limitWarning, setLimitWarning] = useState('')

  // State untuk data anak yang di-fetch secara dinamis pas di-hover
  const [fetchedResorts, setFetchedResorts] = useState({}) // { [distrikId]: Resort[] }
  const [fetchedHurias, setFetchedHurias] = useState({})   // { [resortId]: Huria[] }
  const [loadingResorts, setLoadingResorts] = useState({}) // { [distrikId]: boolean }
  const [loadingHurias, setLoadingHurias] = useState({})   // { [resortId]: boolean }

  // Refs untuk tracking hover timer & request in-flight
  const hoverTimerRef = useRef(null)
  const fetchingRef = useRef(new Set())
  const fetchedIdsRef = useRef(new Set())

  // Cleanup timer saat unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    }
  }, [])

  // Fungsi fetch anak (Resort atau Huria) secara otomatis saat di-hover
  const fetchChildData = useCallback(
    async (type, id) => {
      const sId = String(id)
      const fetchKey = `${type}-${sId}`

      // Cegah duplikasi panggilan yang sedang berlangsung atau yang sudah pernah di-fetch
      if (fetchingRef.current.has(fetchKey)) return
      if (fetchedIdsRef.current.has(fetchKey)) return

      fetchingRef.current.add(fetchKey)

      if (type === 'distrik') {
        setLoadingResorts((prev) => ({ ...prev, [sId]: true }))
        try {
          let results = []

          // 1. Coba ambil dari Master Wilayah Resort API
          try {
            const res = await getResortList({ idDistrik: sId, limit: 100 })
            const raw = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
            if (raw.length > 0) {
              results = raw.map((item) => ({
                id: String(item._id || item.id || item.IdResort),
                nama: item.Nama || item.NamaResort || item.nama,
                idInduk: sId,
              }))
            }
          } catch {
            // Fallback ke getOrganisasiOptions
          }

          // 2. Fallback opsi organisasi
          if (results.length === 0) {
            try {
              const res = await getOrganisasiOptions({ level: 'resort', idDistrik: [sId] })
              const raw = res?.data || []
              if (Array.isArray(raw) && raw.length > 0) {
                results = raw.map((item) => ({
                  id: String(item.id || item._id || item.IdResort),
                  nama: item.nama || item.Nama || item.NamaResort,
                  idInduk: sId,
                }))
              }
            } catch {
              // Abaikan
            }
          }

          if (results.length > 0) {
            setFetchedResorts((prev) => ({ ...prev, [sId]: results }))
            if (typeof addOptions === 'function') {
              addOptions('resort', results)
            }
          }
          fetchedIdsRef.current.add(fetchKey)
        } finally {
          fetchingRef.current.delete(fetchKey)
          setLoadingResorts((prev) => ({ ...prev, [sId]: false }))
        }
      } else if (type === 'resort') {
        setLoadingHurias((prev) => ({ ...prev, [sId]: true }))
        try {
          let results = []

          // 1. Coba ambil dari Master Wilayah Huria API
          try {
            const res = await getHuriaList({ idResort: sId, limit: 100 })
            const raw = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
            if (raw.length > 0) {
              results = raw.map((item) => ({
                id: String(item._id || item.id || item.IdHuria),
                nama: item.Nama || item.NamaHuria || item.nama,
                idInduk: sId,
              }))
            }
          } catch {
            // Fallback ke getOrganisasiOptions
          }

          // 2. Fallback opsi organisasi
          if (results.length === 0) {
            try {
              const res = await getOrganisasiOptions({ level: 'huria', idResort: [sId] })
              const raw = res?.data || []
              if (Array.isArray(raw) && raw.length > 0) {
                results = raw.map((item) => ({
                  id: String(item.id || item._id || item.IdHuria),
                  nama: item.nama || item.Nama || item.NamaHuria,
                  idInduk: sId,
                }))
              }
            } catch {
              // Abaikan
            }
          }

          if (results.length > 0) {
            setFetchedHurias((prev) => ({ ...prev, [sId]: results }))
            if (typeof addOptions === 'function') {
              addOptions('huria', results)
            }
          }
          fetchedIdsRef.current.add(fetchKey)
        } finally {
          fetchingRef.current.delete(fetchKey)
          setLoadingHurias((prev) => ({ ...prev, [sId]: false }))
        }
      }
    },
    [addOptions]
  )

  // Handler hover untuk baris Distrik:
  // Otomatis expand daftar Resort dan mem-fetch datanya
  const handleDistrikMouseEnter = useCallback(
    (distrik) => {
      const dId = String(distrik.id)
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)

      hoverTimerRef.current = setTimeout(() => {
        setExpandedDistriks((prev) => {
          if (prev.has(dId)) return prev
          const next = new Set(prev)
          next.add(dId)
          return next
        })
        fetchChildData('distrik', dId)
      }, HOVER_EXPAND_DELAY_MS)
    },
    [fetchChildData]
  )

  // Handler hover untuk baris Resort:
  // Otomatis expand daftar Huria dan mem-fetch datanya
  const handleResortMouseEnter = useCallback(
    (resort) => {
      const rId = String(resort.id)
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)

      hoverTimerRef.current = setTimeout(() => {
        setExpandedResorts((prev) => {
          if (prev.has(rId)) return prev
          const next = new Set(prev)
          next.add(rId)
          return next
        })
        fetchChildData('resort', rId)
      }, HOVER_EXPAND_DELAY_MS)
    },
    [fetchChildData]
  )

  // Batal timer jika kursor hanya melintas sangat cepat
  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }, [])

  // Auto-expand saat Distrik terpilih
  useEffect(() => {
    if (selected.distrik.length > 0) {
      setExpandedDistriks((prev) => {
        const next = new Set(prev)
        selected.distrik.forEach((id) => next.add(String(id)))
        return next
      })
      // Fetch data resort untuk distrik yang dipilih
      selected.distrik.forEach((id) => fetchChildData('distrik', id))
    }
  }, [selected.distrik, fetchChildData])

  // Auto-expand saat Resort terpilih
  useEffect(() => {
    if (selected.resort.length > 0) {
      setExpandedResorts((prev) => {
        const next = new Set(prev)
        selected.resort.forEach((id) => next.add(String(id)))
        return next
      })
      // Fetch data huria untuk resort yang dipilih
      selected.resort.forEach((id) => fetchChildData('resort', id))
    }
  }, [selected.resort, fetchChildData])

  // Toggle manual klik Distrik
  const toggleDistrikExpand = (dId, e) => {
    if (e) e.stopPropagation()
    const sId = String(dId)
    setExpandedDistriks((prev) => {
      const next = new Set(prev)
      if (next.has(sId)) {
        next.delete(sId)
      } else {
        next.add(sId)
        fetchChildData('distrik', sId)
      }
      return next
    })
  }

  // Toggle manual klik Resort
  const toggleResortExpand = (rId, e) => {
    if (e) e.stopPropagation()
    const sId = String(rId)
    setExpandedResorts((prev) => {
      const next = new Set(prev)
      if (next.has(sId)) {
        next.delete(sId)
      } else {
        next.add(sId)
        fetchChildData('resort', sId)
      }
      return next
    })
  }

  // Buka semua / Tutup semua
  const handleExpandAll = () => {
    const allD = options.distrik || []
    const allDIds = new Set(allD.map((d) => String(d.id)))
    setExpandedDistriks(allDIds)
    allD.forEach((d) => fetchChildData('distrik', d.id))

    const allR = options.resort || []
    const allRIds = new Set(allR.map((r) => String(r.id)))
    setExpandedResorts(allRIds)
    allR.forEach((r) => fetchChildData('resort', r.id))
  }

  const handleCollapseAll = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    setExpandedDistriks(new Set())
    setExpandedResorts(new Set())
  }

  // Gabungkan options dengan data yang di-fetch secara dinamis
  const q = searchQuery.trim().toLowerCase()

  const { distrikList, resortsByDistrik, huriasByResort, allResorts, allHurias } = useMemo(() => {
    const allD = options.distrik || []

    // 1. Gabungkan opsi resort
    const combinedResorts = [...(options.resort || [])]
    const seenResortIds = new Set(combinedResorts.map((r) => String(r.id)))
    Object.values(fetchedResorts).forEach((arr) => {
      if (Array.isArray(arr)) {
        arr.forEach((r) => {
          const sId = String(r.id)
          if (!seenResortIds.has(sId)) {
            seenResortIds.add(sId)
            combinedResorts.push(r)
          }
        })
      }
    })

    // 2. Gabungkan opsi huria
    const combinedHurias = [...(options.huria || [])]
    const seenHuriaIds = new Set(combinedHurias.map((h) => String(h.id)))
    Object.values(fetchedHurias).forEach((arr) => {
      if (Array.isArray(arr)) {
        arr.forEach((h) => {
          const sId = String(h.id)
          if (!seenHuriaIds.has(sId)) {
            seenHuriaIds.add(sId)
            combinedHurias.push(h)
          }
        })
      }
    })

    // Kelompokkan resort berdasarkan idInduk (Distrik)
    const rMap = new Map()
    combinedResorts.forEach((r) => {
      const parentId = String(r.idInduk || '')
      if (!rMap.has(parentId)) rMap.set(parentId, [])
      rMap.get(parentId).push(r)
    })

    // Kelompokkan huria berdasarkan idInduk (Resort)
    const hMap = new Map()
    combinedHurias.forEach((h) => {
      const parentId = String(h.idInduk || '')
      if (!hMap.has(parentId)) hMap.set(parentId, [])
      hMap.get(parentId).push(h)
    })

    // Jika tidak ada pencarian, kembalikan semua
    if (!q) {
      return {
        distrikList: allD,
        resortsByDistrik: rMap,
        huriasByResort: hMap,
        allResorts: combinedResorts,
        allHurias: combinedHurias,
      }
    }

    // Filter berjenjang jika ada query
    const matchedD = []
    allD.forEach((d) => {
      const dMatches = d.nama?.toLowerCase().includes(q)
      const dResorts = rMap.get(String(d.id)) || []

      let hasMatchingChild = false
      dResorts.forEach((r) => {
        if (r.nama?.toLowerCase().includes(q)) hasMatchingChild = true
        const rHurias = hMap.get(String(r.id)) || []
        if (rHurias.some((h) => h.nama?.toLowerCase().includes(q))) {
          hasMatchingChild = true
        }
      })

      if (dMatches || hasMatchingChild) {
        matchedD.push(d)
      }
    })

    return {
      distrikList: matchedD,
      resortsByDistrik: rMap,
      huriasByResort: hMap,
      allResorts: combinedResorts,
      allHurias: combinedHurias,
    }
  }, [options.distrik, options.resort, options.huria, fetchedResorts, fetchedHurias, q])

  // Auto-expand hasil pencarian
  useEffect(() => {
    if (q) {
      const matchedDistrikIds = new Set(distrikList.map((d) => String(d.id)))
      const matchedResortIds = new Set(allResorts.map((r) => String(r.id)))
      setExpandedDistriks(matchedDistrikIds)
      setExpandedResorts(matchedResortIds)
    }
  }, [q, distrikList, allResorts])

  // Toggle seleksi checkbox per level
  const handleToggle = (lvl, id) => {
    if (locks[lvl]) return
    const sId = String(id)
    const current = selected[lvl] || []

    if (current.includes(sId)) {
      // Uncheck
      setSelected(
        lvl,
        current.filter((item) => String(item) !== sId)
      )
      setLimitWarning('')
    } else {
      // Check (dengan validasi batas 6 item)
      if (current.length >= maxSelected) {
        setLimitWarning(`Maksimal ${maxSelected} item per perbandingan pada level ini.`)
        setTimeout(() => setLimitWarning(''), 4000)
        return
      }

      // Pastikan induk juga terdaftar jika turunan dipilih agar tidak kena prune
      if (lvl === 'huria') {
        const huriaItem = (allHurias || []).find((h) => String(h.id) === sId)
        if (huriaItem && huriaItem.idInduk) {
          const resortId = String(huriaItem.idInduk)
          if (!selected.resort.includes(resortId)) {
            setSelected('resort', [...(selected.resort || []), resortId])
          }
          const resortItem = (allResorts || []).find((r) => String(r.id) === resortId)
          if (resortItem && resortItem.idInduk) {
            const distrikId = String(resortItem.idInduk)
            if (!selected.distrik.includes(distrikId)) {
              setSelected('distrik', [...(selected.distrik || []), distrikId])
            }
          }
        }
      } else if (lvl === 'resort') {
        const resortItem = (allResorts || []).find((r) => String(r.id) === sId)
        if (resortItem && resortItem.idInduk) {
          const distrikId = String(resortItem.idInduk)
          if (!selected.distrik.includes(distrikId)) {
            setSelected('distrik', [...(selected.distrik || []), distrikId])
          }
        }
      }

      setSelected(lvl, [...current, sId])
      setLimitWarning('')

      // Auto-buka anaknya jika dicentang
      if (lvl === 'distrik') {
        setExpandedDistriks((prev) => new Set([...prev, sId]))
        fetchChildData('distrik', sId)
      } else if (lvl === 'resort') {
        setExpandedResorts((prev) => new Set([...prev, sId]))
        fetchChildData('resort', sId)
      }
    }
  }

  // Hapus item dari chip ringkasan
  const handleRemoveChip = (lvl, id) => {
    const current = selected[lvl] || []
    setSelected(lvl, current.filter((item) => String(item) !== String(id)))
  }

  return (
    <div className="bg-surface rounded-2xl border border-line p-5 sm:p-6 shadow-xs w-full transition-all font-sans flex flex-col gap-4">
      {/* 1. Header: Judul & Reset Wilayah */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-ink tracking-tight m-0">
              Lingkup Wilayah
            </h2>
            {level && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Level Analisis: {level === 'distrik' ? 'Distrik' : level === 'resort' ? 'Resort' : 'Huria'}
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-0.5 mb-0">
            Arahkan kursor ke baris wilayah untuk memekarkan hirarki (Distrik → Resort → Huria) dan memuat datanya secara otomatis.
          </p>
        </div>

        <button
          type="button"
          onClick={reset}
          title="Reset semua pilihan wilayah"
          className="h-9 px-3 rounded-xl text-xs font-semibold text-danger hover:bg-danger/10 border border-transparent hover:border-danger/20 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Wilayah</span>
        </button>
      </div>

      {/* Banner Khusus Admin Huria Terkunci */}
      {locks.huria && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-primary-50 border border-primary-200 text-xs text-primary-950 font-medium animate-fadeIn">
          <Lock className="w-4 h-4 text-primary shrink-0" />
          <span>
            <strong>Otoritas Admin Huria:</strong> Filter wilayah terkunci pada gereja Anda. Visualisasi dan komparasi difokuskan khusus pada data gereja sendiri.
          </span>
        </div>
      )}

      {/* Peringatan Limit jika ada */}
      {limitWarning && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-warning/10 border border-warning/30 text-warning-700 text-xs font-medium animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 text-warning-600" />
          <span>{limitWarning}</span>
        </div>
      )}

      {/* 2. Container Tunggal: 1 Section Utuh Continuous Tree List */}
      <div className="border border-line rounded-2xl bg-surface shadow-2xs overflow-hidden flex flex-col w-full">
        {/* Toolbar Pencarian & Kontrol Buka/Tutup */}
        <div className="p-3 sm:p-4 bg-canvas/30 border-b border-line flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Kolom Pencarian */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari distrik, resort, atau huria..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-line bg-surface text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary-400/30 transition-all placeholder:text-muted"
            />
          </div>

          {/* Quick Actions & Status */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Status Counters */}
            <div className="hidden md:flex items-center gap-1.5 mr-2 text-[11px] font-semibold text-muted">
              <span className="px-2 py-0.5 rounded-md bg-primary-50 text-primary border border-primary-200">
                Distrik ({selected.distrik.length})
              </span>
              <span>→</span>
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                Resort ({selected.resort.length})
              </span>
              <span>→</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                Huria ({selected.huria.length})
              </span>
            </div>

            <button
              type="button"
              onClick={handleExpandAll}
              className="px-2.5 py-1 rounded-lg border border-line bg-surface hover:bg-canvas text-ink font-medium text-[11px] transition-colors cursor-pointer"
            >
              Buka Semua
            </button>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="px-2.5 py-1 rounded-lg border border-line bg-surface hover:bg-canvas text-ink font-medium text-[11px] transition-colors cursor-pointer"
            >
              Tutup Semua
            </button>
            {!locks.huria && (selected.distrik.length > 0 || selected.resort.length > 0 || selected.huria.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setSelected('distrik', [])
                  setSelected('resort', [])
                  setSelected('huria', [])
                }}
                className="px-2.5 py-1 rounded-lg text-danger hover:bg-danger/10 font-semibold text-[11px] transition-colors cursor-pointer ml-1"
              >
                Batal Semua
              </button>
            )}
          </div>
        </div>

        {/* Viewport 1 Section Tunggal: Continuous Tree List dengan Hover Expand */}
        <div className="max-h-[520px] overflow-y-auto flex flex-col divide-y divide-line/60">
          {distrikList.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">
              Tidak ada data wilayah yang cocok dengan pencarian "{searchQuery}"
            </div>
          ) : (
            distrikList.map((d) => {
              const dId = String(d.id)
              const isDistrikChecked = selected.distrik.includes(dId)
              const isDistrikExpanded = expandedDistriks.has(dId)
              const resortsForDistrik = resortsByDistrik.get(dId) || []
              const hasResorts = resortsForDistrik.length > 0
              const isResortsLoading = Boolean(loadingResorts[dId])

              return (
                <div key={dId} className="flex flex-col">
                  {/* ====================================================
                      BARIS DISTRIK (Hover to Expand & Auto-fetch)
                      ==================================================== */}
                  <div
                    onClick={() => handleToggle('distrik', d.id)}
                    onMouseEnter={() => handleDistrikMouseEnter(d)}
                    onMouseLeave={handleMouseLeave}
                    className={`group flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                      isDistrikChecked
                        ? 'bg-primary-50/70 text-primary font-bold'
                        : 'bg-surface hover:bg-primary-50/30 text-ink'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Chevron Buka/Tutup */}
                      <button
                        type="button"
                        onClick={(e) => toggleDistrikExpand(d.id, e)}
                        title={isDistrikExpanded ? 'Tutup daftar resort' : 'Buka daftar resort'}
                        className="p-1 -ml-1 rounded-md text-muted hover:text-ink hover:bg-canvas cursor-pointer transition-transform"
                      >
                        {isDistrikExpanded ? (
                          <ChevronDown className="w-4 h-4 text-primary" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      {/* Checkbox Distrik */}
                      <CustomCheckbox
                        checked={isDistrikChecked}
                        disabled={locks.distrik}
                        id={`cb-distrik-${d.id}`}
                        onChange={() => handleToggle('distrik', d.id)}
                      />

                      {/* Ikon & Nama Distrik */}
                      <div className="flex items-center gap-2 min-w-0">
                        <Building className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-xs sm:text-sm font-semibold truncate">{d.nama}</span>
                      </div>
                    </div>

                    {/* Info Kanan Distrik */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {isResortsLoading && (
                        <div className="flex items-center gap-1.5 text-[11px] text-primary">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="hidden sm:inline">Memuat resort...</span>
                        </div>
                      )}
                      {isDistrikChecked && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white shadow-2xs">
                          Dipilih
                        </span>
                      )}
                      {!isResortsLoading && hasResorts && (
                        <span className="text-[11px] text-muted">
                          {resortsForDistrik.length} resort
                        </span>
                      )}
                      {locks.distrik && <Lock className="w-3.5 h-3.5 text-muted" />}
                    </div>
                  </div>

                  {/* ====================================================
                      DAFTAR RESORT (Langsung di bawah Distrik)
                      ==================================================== */}
                  {isDistrikExpanded && (
                    <div className="bg-canvas/25 border-t border-line/40 flex flex-col divide-y divide-line/30 transition-all">
                      {isResortsLoading && resortsForDistrik.length === 0 ? (
                        <div className="flex items-center gap-2 px-5 py-3 text-xs text-muted">
                          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                          <span>Mengambil daftar resort...</span>
                        </div>
                      ) : resortsForDistrik.length === 0 ? (
                        <div className="px-5 py-3 text-xs text-muted italic">
                          Tidak ada data resort pada distrik ini.
                        </div>
                      ) : (
                        resortsForDistrik.map((r) => {
                          const rId = String(r.id)
                          const isResortChecked = selected.resort.includes(rId)
                          const isResortExpanded = expandedResorts.has(rId)
                          const huriasForResort = huriasByResort.get(rId) || []
                          const hasHurias = huriasForResort.length > 0
                          const isHuriasLoading = Boolean(loadingHurias[rId])

                          return (
                            <div key={rId} className="flex flex-col">
                              {/* Baris Resort */}
                              <div
                                onClick={() => handleToggle('resort', r.id)}
                                onMouseEnter={() => handleResortMouseEnter(r)}
                                onMouseLeave={handleMouseLeave}
                                className={`group flex items-center justify-between px-4 pl-11 py-2.5 cursor-pointer transition-colors ${
                                  isResortChecked
                                    ? 'bg-indigo-50/60 text-indigo-950 font-semibold'
                                    : 'hover:bg-indigo-50/30 text-ink'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {/* Chevron Buka/Tutup Huria */}
                                  <button
                                    type="button"
                                    onClick={(e) => toggleResortExpand(r.id, e)}
                                    title={isResortExpanded ? 'Tutup daftar huria' : 'Buka daftar huria'}
                                    className="p-1 -ml-1 rounded-md text-muted hover:text-ink hover:bg-canvas cursor-pointer transition-transform"
                                  >
                                    {isResortExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    )}
                                  </button>

                                  {/* Checkbox Resort */}
                                  <CustomCheckbox
                                    checked={isResortChecked}
                                    disabled={locks.resort}
                                    id={`cb-resort-${r.id}`}
                                    onChange={() => handleToggle('resort', r.id)}
                                  />

                                  {/* Ikon & Nama Resort */}
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                    <span className="text-xs truncate">{r.nama}</span>
                                  </div>
                                </div>

                                {/* Info Kanan Resort */}
                                <div className="flex items-center gap-2 shrink-0">
                                  {isHuriasLoading && (
                                    <div className="flex items-center gap-1 text-[10px] text-indigo-600">
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      <span className="hidden sm:inline">Memuat huria...</span>
                                    </div>
                                  )}
                                  {isResortChecked && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-2xs">
                                      Dipilih
                                    </span>
                                  )}
                                  {!isHuriasLoading && hasHurias && (
                                    <span className="text-[10px] text-muted">
                                      {huriasForResort.length} huria
                                    </span>
                                  )}
                                  {locks.resort && <Lock className="w-3.5 h-3.5 text-muted" />}
                                </div>
                              </div>

                              {/* ====================================================
                                  DAFTAR HURIA (Langsung di bawah Resort)
                                  ==================================================== */}
                              {isResortExpanded && (
                                <div className="bg-canvas/50 border-t border-line/30 flex flex-col divide-y divide-line/20 transition-all">
                                  {isHuriasLoading && huriasForResort.length === 0 ? (
                                    <div className="flex items-center gap-2 px-5 pl-18 py-2.5 text-xs text-muted">
                                      <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin shrink-0" />
                                      <span>Mengambil daftar huria...</span>
                                    </div>
                                  ) : huriasForResort.length === 0 ? (
                                    <div className="px-5 pl-18 py-2 text-xs text-muted italic">
                                      Tidak ada data huria pada resort ini.
                                    </div>
                                  ) : (
                                    huriasForResort.map((h) => {
                                      const hId = String(h.id)
                                      const isHuriaChecked = selected.huria.includes(hId)

                                      return (
                                        <div
                                          key={hId}
                                          onClick={() => handleToggle('huria', h.id)}
                                          className={`group flex items-center justify-between px-4 pl-18 py-2 cursor-pointer transition-colors ${
                                            isHuriaChecked
                                              ? 'bg-emerald-50/70 text-emerald-950 font-semibold'
                                              : 'hover:bg-emerald-50/30 text-ink'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            {/* Checkbox Huria */}
                                            <CustomCheckbox
                                              checked={isHuriaChecked}
                                              disabled={locks.huria}
                                              id={`cb-huria-${h.id}`}
                                              onChange={() => handleToggle('huria', h.id)}
                                            />

                                            {/* Ikon & Nama Huria */}
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <Church className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                              <span className="text-xs truncate">{h.nama}</span>
                                            </div>
                                          </div>

                                          {/* Status Terpilih Huria */}
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            {isHuriaChecked && (
                                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-700 text-white shadow-2xs">
                                                Dipilih
                                              </span>
                                            )}
                                            {locks.huria && <Lock className="w-3 h-3 text-muted" />}
                                          </div>
                                        </div>
                                      )
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 3. Baris Ringkasan, Chip Terpilih & Induk yang Tidak Ikut */}
      <FilterSummary
        summary={summary}
        level={level}
        items={items}
        excludedParents={excludedParents}
        warnings={warnings}
        onRemoveItem={handleRemoveChip}
      />
    </div>
  )
}

export default OrganisasiFilterBar
