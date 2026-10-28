import { useState, useRef, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  RotateCcw,
  ChevronDown,
  Lock,
  Check,
  Minus,
} from 'lucide-react'

// Custom Styled Checkbox Component using brand tokens
export const HkCheckbox = ({ checked, indeterminate, onChange, disabled }) => {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled && onChange) onChange(!checked)
      }}
      tabIndex={disabled ? -1 : 0}
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          if (!disabled && onChange) onChange(!checked)
        }
      }}
      className={`w-[18px] h-[18px] rounded-[5px] border inline-flex items-center justify-center transition-all duration-150 shrink-0 outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-400 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${
        checked || indeterminate
          ? 'border-primary bg-primary text-white'
          : 'border-line bg-surface hover:bg-primary-50'
      }`}
    >
      {checked && <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
      {indeterminate && !checked && <Minus className="w-3 h-3 text-white stroke-[3]" />}
    </div>
  )
}

export const FilterControls = ({
  wilayahData = [],
  filters,
  onFilterChange,
  showOrgFilter = true,
  showTimeFilter = true,
}) => {
  const { isSuperAdmin, isAdmin, user } = useAuth()
  const canFilterOrg = showOrgFilter && isSuperAdmin
  const containerRef = useRef(null)

  // Track which dropdown panel is open: null | 'distrik' | 'resort' | 'huria' | 'periode'
  const [openDropdown, setOpenDropdown] = useState(null)

  // Close dropdown on outside click or Esc
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenDropdown(null)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Extract Pusat, Distrik, Resort, Huria list
  const pusat = wilayahData[0]?.Pusat

  const distrikList = useMemo(() => {
    return pusat?.Distrik || []
  }, [pusat])

  // Normalise filter values to array for multi-select support while staying compatible with single-string
  const getSelectedArray = (val) => {
    if (!val) return []
    if (Array.isArray(val)) return val
    return [val]
  }

  const selectedDistriks = useMemo(() => getSelectedArray(filters.distrik), [filters.distrik])
  const selectedResorts = useMemo(() => getSelectedArray(filters.resort), [filters.resort])
  const selectedHurias = useMemo(() => getSelectedArray(filters.huria), [filters.huria])

  // Cascading lists
  const availableResorts = useMemo(() => {
    if (selectedDistriks.length === 0) {
      return distrikList.flatMap((d) => d.Resort || [])
    }
    return distrikList
      .filter((d) => selectedDistriks.includes(d.NamaDistrik))
      .flatMap((d) => d.Resort || [])
  }, [distrikList, selectedDistriks])

  const availableHurias = useMemo(() => {
    if (selectedResorts.length === 0) {
      return availableResorts.flatMap((r) => r.Huria || [])
    }
    return availableResorts
      .filter((r) => selectedResorts.includes(r.NamaResort))
      .flatMap((r) => r.Huria || [])
  }, [availableResorts, selectedResorts])

  // Helper trigger label
  const getTriggerLabel = (selectedArr, totalCount) => {
    if (selectedArr.length === 0 || selectedArr.length === totalCount) return 'Semua'
    if (selectedArr.length === 1) return selectedArr[0]
    return `${selectedArr.length} dipilih`
  }

  // Toggle item in array
  const toggleArrayItem = (arr, item) => {
    if (arr.includes(item)) {
      return arr.filter((i) => i !== item)
    }
    return [...arr, item]
  }

  // Handler: toggle distrik
  const handleToggleDistrik = (namaDistrik) => {
    const nextDistriks = toggleArrayItem(selectedDistriks, namaDistrik)
    onFilterChange({
      ...filters,
      distrik: nextDistriks,
      resort: [],
      huria: [],
    })
  }

  // Handler: select all distriks
  const handleSelectAllDistriks = (select) => {
    onFilterChange({
      ...filters,
      distrik: select ? distrikList.map((d) => d.NamaDistrik) : [],
      resort: [],
      huria: [],
    })
  }

  // Handler: toggle resort
  const handleToggleResort = (namaResort) => {
    const nextResorts = toggleArrayItem(selectedResorts, namaResort)
    onFilterChange({
      ...filters,
      resort: nextResorts,
      huria: [],
    })
  }

  // Handler: select all resorts
  const handleSelectAllResorts = (select) => {
    onFilterChange({
      ...filters,
      resort: select ? availableResorts.map((r) => r.NamaResort) : [],
      huria: [],
    })
  }

  // Handler: toggle huria
  const handleToggleHuria = (namaHuria) => {
    const nextHurias = toggleArrayItem(selectedHurias, namaHuria)
    onFilterChange({
      ...filters,
      huria: nextHurias,
    })
  }

  // Handler: select all hurias
  const handleSelectAllHurias = (select) => {
    onFilterChange({
      ...filters,
      huria: select ? availableHurias.map((h) => h.NamaHuria) : [],
    })
  }

  // Reset filters
  const handleReset = () => {
    if (isSuperAdmin) {
      onFilterChange({
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
    } else {
      onFilterChange({
        ...filters,
        periodeType: 'Tahun',
        tahun: '2026',
        bulan: '',
        mingguISO: '',
        startDate: '',
        endDate: '',
      })
    }
    setOpenDropdown(null)
  }

  return (
    <div
      ref={containerRef}
      className="bg-surface border border-line rounded-2xl p-5 shadow-xs mb-5 font-sans relative z-20 w-full"
    >
      {/* Title & Subtitle */}
      <div className="flex items-center justify-between mb-4 w-full">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-ink">
            {canFilterOrg ? 'Lingkup & periode' : 'Periode laporan'}
          </h3>
          {!canFilterOrg && (
            <span className="text-xs font-semibold text-primary bg-primary-50 px-2.5 py-0.5 rounded-md border border-primary-100">
              {user?.namaHuria || 'Huria Anda'}
            </span>
          )}
          <span className="text-xs text-muted">
            {canFilterOrg ? 'Filter berlaku pada data di halaman ini' : 'Filter data berdasarkan rentang waktu'}
          </span>
        </div>

        {/* Reset Button */}
        <button
          onClick={handleReset}
          title="Reset semua filter"
          className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-primary-50 transition-colors cursor-pointer"
          aria-label="Reset filter"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div
        className={`grid gap-3 items-end w-full ${
          canFilterOrg
            ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        }`}
      >
        {/* 1. DISTRIK DROPDOWN */}
        {canFilterOrg && (
          <div className="relative">
            <label className="block text-xs font-semibold text-muted mb-1.5">
              Distrik
            </label>
            <button
              type="button"
              disabled={isAdmin}
              onClick={() => setOpenDropdown(openDropdown === 'distrik' ? null : 'distrik')}
              className={`w-full h-10 px-3 rounded-xl border text-xs font-medium flex items-center justify-between transition-all outline-none ${
                isAdmin
                  ? 'bg-canvas text-muted cursor-not-allowed border-line'
                  : openDropdown === 'distrik'
                  ? 'border-primary ring-2 ring-primary-400/30 bg-surface text-ink'
                  : 'border-line bg-surface text-ink hover:border-primary-300'
              }`}
            >
              <span className="truncate">
                {getTriggerLabel(selectedDistriks, distrikList.length)}
              </span>
              <div className="flex items-center gap-1 shrink-0 ml-1">
                {isAdmin ? (
                  <Lock className="w-3.5 h-3.5 text-muted" />
                ) : (
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-muted transition-transform ${
                      openDropdown === 'distrik' ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </div>
            </button>

            {/* Distrik Menu Panel */}
            {openDropdown === 'distrik' && !isAdmin && (
              <div className="absolute left-0 top-full mt-2 min-w-[220px] max-w-[300px] w-full bg-surface rounded-2xl shadow-xl border border-line p-2 z-50 animate-in fade-in duration-100">
                <div className="p-2 border-b border-line flex items-center justify-between text-xs font-bold text-primary">
                  <span>Pilih Distrik</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectAllDistriks(selectedDistriks.length !== distrikList.length)
                    }
                    className="text-primary hover:underline cursor-pointer"
                  >
                    {selectedDistriks.length === distrikList.length ? 'Batal Semua' : 'Pilih Semua'}
                  </button>
                </div>
                <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5 mt-1">
                  {distrikList.map((d) => {
                    const checked = selectedDistriks.includes(d.NamaDistrik)
                    return (
                      <div
                        key={d.IdDistrik}
                        onClick={() => handleToggleDistrik(d.NamaDistrik)}
                        className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-primary-50 transition-colors text-ink text-xs"
                      >
                        <HkCheckbox
                          checked={checked}
                          onChange={() => handleToggleDistrik(d.NamaDistrik)}
                        />
                        <span className="truncate">{d.NamaDistrik}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. RESORT DROPDOWN */}
        {canFilterOrg && (
          <div className="relative">
            <label className="block text-xs font-semibold text-muted mb-1.5">
              Resort
            </label>
            <button
              type="button"
              disabled={isAdmin}
              onClick={() => setOpenDropdown(openDropdown === 'resort' ? null : 'resort')}
              className={`w-full h-10 px-3 rounded-xl border text-xs font-medium flex items-center justify-between transition-all outline-none ${
                isAdmin
                  ? 'bg-canvas text-muted cursor-not-allowed border-line'
                  : openDropdown === 'resort'
                  ? 'border-primary ring-2 ring-primary-400/30 bg-surface text-ink'
                  : 'border-line bg-surface text-ink hover:border-primary-300'
              }`}
            >
              <span className="truncate">
                {getTriggerLabel(selectedResorts, availableResorts.length)}
              </span>
              <div className="flex items-center gap-1 shrink-0 ml-1">
                {isAdmin ? (
                  <Lock className="w-3.5 h-3.5 text-muted" />
                ) : (
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-muted transition-transform ${
                      openDropdown === 'resort' ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </div>
            </button>

            {/* Resort Menu Panel */}
            {openDropdown === 'resort' && !isAdmin && (
              <div className="absolute left-0 top-full mt-2 min-w-[220px] max-w-[300px] w-full bg-surface rounded-2xl shadow-xl border border-line p-2 z-50 animate-in fade-in duration-100">
                <div className="p-2 border-b border-line flex items-center justify-between text-xs font-bold text-primary">
                  <span>Pilih Resort</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectAllResorts(selectedResorts.length !== availableResorts.length)
                    }
                    className="text-primary hover:underline cursor-pointer"
                  >
                    {selectedResorts.length === availableResorts.length ? 'Batal Semua' : 'Pilih Semua'}
                  </button>
                </div>
                <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5 mt-1">
                  {availableResorts.map((r) => {
                    const checked = selectedResorts.includes(r.NamaResort)
                    return (
                      <div
                        key={r.IdResort}
                        onClick={() => handleToggleResort(r.NamaResort)}
                        className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-primary-50 transition-colors text-ink text-xs"
                      >
                        <HkCheckbox
                          checked={checked}
                          onChange={() => handleToggleResort(r.NamaResort)}
                        />
                        <span className="truncate">{r.NamaResort}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. HURIA DROPDOWN */}
        {canFilterOrg && (
          <div className="relative">
            <label className="block text-xs font-semibold text-muted mb-1.5">
              Huria
            </label>
            <button
              type="button"
              disabled={isAdmin}
              onClick={() => setOpenDropdown(openDropdown === 'huria' ? null : 'huria')}
              className={`w-full h-10 px-3 rounded-xl border text-xs font-medium flex items-center justify-between transition-all outline-none ${
                isAdmin
                  ? 'bg-canvas text-muted cursor-not-allowed border-line'
                  : openDropdown === 'huria'
                  ? 'border-primary ring-2 ring-primary-400/30 bg-surface text-ink'
                  : 'border-line bg-surface text-ink hover:border-primary-300'
              }`}
            >
              <span className="truncate">
                {getTriggerLabel(selectedHurias, availableHurias.length)}
              </span>
              <div className="flex items-center gap-1 shrink-0 ml-1">
                {isAdmin ? (
                  <Lock className="w-3.5 h-3.5 text-muted" />
                ) : (
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-muted transition-transform ${
                      openDropdown === 'huria' ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </div>
            </button>

            {/* Huria Menu Panel */}
            {openDropdown === 'huria' && !isAdmin && (
              <div className="absolute left-0 top-full mt-2 min-w-[220px] max-w-[300px] w-full bg-surface rounded-2xl shadow-xl border border-line p-2 z-50 animate-in fade-in duration-100">
                <div className="p-2 border-b border-line flex items-center justify-between text-xs font-bold text-primary">
                  <span>Pilih Huria</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectAllHurias(selectedHurias.length !== availableHurias.length)
                    }
                    className="text-primary hover:underline cursor-pointer"
                  >
                    {selectedHurias.length === availableHurias.length ? 'Batal Semua' : 'Pilih Semua'}
                  </button>
                </div>
                <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5 mt-1">
                  {availableHurias.map((h) => {
                    const checked = selectedHurias.includes(h.NamaHuria)
                    return (
                      <div
                        key={h.IdHuria}
                        onClick={() => handleToggleHuria(h.NamaHuria)}
                        className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-primary-50 transition-colors text-ink text-xs"
                      >
                        <HkCheckbox
                          checked={checked}
                          onChange={() => handleToggleHuria(h.NamaHuria)}
                        />
                        <span className="truncate">{h.NamaHuria}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. MODE PERIODE DROPDOWN */}
        {showTimeFilter && (
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">
              Mode Periode
            </label>
            <select
              value={filters.periodeType || 'Tahun'}
              onChange={(e) => {
                const pType = e.target.value
                if (pType === 'Tahun') {
                  onFilterChange({
                    ...filters,
                    periodeType: 'Tahun',
                    tahun: filters.tahun || '2026',
                    bulan: '',
                    mingguISO: '',
                    startDate: '',
                    endDate: '',
                  })
                } else if (pType === 'Bulan') {
                  onFilterChange({
                    ...filters,
                    periodeType: 'Bulan',
                    tahun: filters.tahun || '2026',
                    bulan: filters.bulan || '10',
                    mingguISO: '',
                    startDate: '',
                    endDate: '',
                  })
                } else if (pType === 'Minggu ISO') {
                  onFilterChange({
                    ...filters,
                    periodeType: 'Minggu ISO',
                    tahun: filters.tahun || '2026',
                    bulan: '',
                    mingguISO: filters.mingguISO || '41',
                    startDate: '',
                    endDate: '',
                  })
                } else if (pType === 'Semua') {
                  onFilterChange({
                    ...filters,
                    periodeType: 'Semua',
                    tahun: '',
                    bulan: '',
                    mingguISO: '',
                    startDate: '',
                    endDate: '',
                  })
                } else {
                  // Fallback ke Tahun
                  onFilterChange({
                    ...filters,
                    periodeType: 'Tahun',
                    tahun: filters.tahun || '2026',
                    bulan: '',
                    mingguISO: '',
                  })
                }
              }}
              className="w-full h-10 px-3 rounded-xl border border-line bg-surface text-ink text-xs font-semibold outline-none cursor-pointer focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30 transition-all"
            >
              <option value="Tahun">Per Tahun</option>
              <option value="Bulan">Per Bulan</option>
              <option value="Minggu ISO">Minggu Kalender (ISO)</option>
              <option value="Semua">Semua Waktu</option>
            </select>
          </div>
        )}

        {/* Mode: Per Tahun */}
        {showTimeFilter && (filters.periodeType === 'Tahun' || (!filters.periodeType && filters.tahun)) && (
          <div>
            <label className="block text-xs font-semibold text-muted mb-1.5">
              Pilih Tahun
            </label>
            <select
              value={filters.tahun || '2026'}
              onChange={(e) => onFilterChange({ ...filters, tahun: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-line bg-surface text-ink text-xs font-semibold outline-none cursor-pointer focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30 transition-all"
            >
              <option value="2026">Tahun 2026 (Aktif)</option>
              <option value="2025">Tahun 2025</option>
              <option value="2024">Tahun 2024</option>
            </select>
          </div>
        )}

        {/* Mode: Per Bulan */}
        {showTimeFilter && filters.periodeType === 'Bulan' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">
                Pilih Bulan
              </label>
              <select
                value={filters.bulan || '10'}
                onChange={(e) => onFilterChange({ ...filters, bulan: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-line bg-surface text-ink text-xs font-semibold outline-none cursor-pointer focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30 transition-all"
              >
                <option value="01">Januari</option>
                <option value="02">Februari</option>
                <option value="03">Maret</option>
                <option value="04">April</option>
                <option value="05">Mei</option>
                <option value="06">Juni</option>
                <option value="07">Juli</option>
                <option value="08">Agustus</option>
                <option value="09">September</option>
                <option value="10">Oktober</option>
                <option value="11">November</option>
                <option value="12">Desember</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">
                Tahun
              </label>
              <select
                value={filters.tahun || '2026'}
                onChange={(e) => onFilterChange({ ...filters, tahun: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-line bg-surface text-ink text-xs font-semibold outline-none cursor-pointer focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30 transition-all"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
            </div>
          </>
        )}

        {/* Mode: Minggu ISO */}
        {showTimeFilter && filters.periodeType === 'Minggu ISO' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">
                Minggu Kalender (ISO)
              </label>
              <select
                value={filters.mingguISO || '41'}
                onChange={(e) => onFilterChange({ ...filters, mingguISO: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-line bg-surface text-ink text-xs font-semibold outline-none cursor-pointer focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30 transition-all"
              >
                {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={String(w)}>Minggu Ke-{w}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">
                Tahun
              </label>
              <select
                value={filters.tahun || '2026'}
                onChange={(e) => onFilterChange({ ...filters, tahun: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-line bg-surface text-ink text-xs font-semibold outline-none cursor-pointer focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30 transition-all"
              >
                <option value="2026">2026</option>
              </select>
            </div>
          </>
        )}

        {/* Mode: Semua Waktu */}
        {showTimeFilter && filters.periodeType === 'Semua' && (
          <div className="flex items-center h-10 bg-primary-50 px-4 rounded-xl border border-primary-100 text-primary text-xs font-semibold">
            Menampilkan seluruh data tanpa batas waktu
          </div>
        )}
      </div>
    </div>
  )
}
