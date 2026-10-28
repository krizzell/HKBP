/**
 * @file MultiSelect.jsx
 * Komponen dropdown multi-select generik yang dapat dikelompokkan,
 * dilengkapi pencarian otomatis (> 8 opsi), pintasan cepat di dalam menu,
 * status terkunci (role), dan status nonaktif berpetunjuk.
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import {
  ChevronDown,
  Search,
  Lock,
  Check,
  X,
} from 'lucide-react'

export function MultiSelect({
  label,
  options = [],
  selected = [],
  onChange,
  onPickTop,
  maxSelected = 6,
  disabled = false,
  disabledReason = '',
  locked = false,
  placeholder = 'Semua',
  groupBy = 'namaInduk',
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef(null)
  const searchInputRef = useRef(null)

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fokus input pencarian saat menu dibuka
  useEffect(() => {
    if (isOpen && options.length > 8 && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen, options.length])

  // Filter opsi berdasarkan teks pencarian
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options
    const query = searchTerm.toLowerCase()
    return options.filter(
      (opt) =>
        opt.nama?.toLowerCase().includes(query) ||
        opt.id?.toLowerCase().includes(query) ||
        opt.namaInduk?.toLowerCase().includes(query)
    )
  }, [options, searchTerm])

  // Kelompokkan opsi per grup
  const grouped = useMemo(() => {
    const map = new Map()
    filteredOptions.forEach((opt) => {
      const gName = opt[groupBy] || 'Lainnya'
      if (!map.has(gName)) {
        map.set(gName, [])
      }
      map.get(gName).push(opt)
    })
    return Array.from(map.entries())
  }, [filteredOptions, groupBy])

  // Teks ringkasan tombol trigger
  const triggerLabel = useMemo(() => {
    if (locked) {
      const matched = options.find((o) => selected.includes(String(o.id)))
      return matched?.nama || 'Terkunci'
    }
    if (disabled) {
      return disabledReason || 'Nonaktif'
    }
    if (!selected || selected.length === 0) {
      return placeholder
    }
    if (selected.length === 1) {
      const item = options.find((o) => String(o.id) === String(selected[0]))
      return item?.nama || selected[0]
    }
    return `${selected.length} ${label.toLowerCase()}`
  }, [locked, disabled, disabledReason, selected, options, placeholder, label])

  // Toggle satu item checkbox
  const handleToggle = (id) => {
    if (disabled || locked) return
    const sId = String(id)
    if (selected.includes(sId)) {
      onChange(selected.filter((item) => String(item) !== sId))
    } else {
      if (selected.length >= maxSelected) {
        alert(`Maksimal ${maxSelected} item per perbandingan`)
        return
      }
      onChange([...selected, sId])
    }
  }

  // Pilih / Bersihkan semua item dalam satu kelompok
  const handleToggleGroup = (itemsInGroup) => {
    if (disabled || locked) return
    const groupIds = itemsInGroup.map((o) => String(o.id))
    const isAllSelected = groupIds.every((id) => selected.includes(id))

    if (isAllSelected) {
      // Hapus semua dalam kelompok
      onChange(selected.filter((id) => !groupIds.includes(id)))
    } else {
      // Tambahkan item kelompok yang belum terpilih hingga batas
      const toAdd = groupIds.filter((id) => !selected.includes(id))
      const combined = [...selected, ...toAdd].slice(0, maxSelected)
      onChange(combined)
    }
  }

  // Pilih Semua (hingga batas)
  const handleSelectAll = () => {
    const allIds = options.map((o) => String(o.id)).slice(0, maxSelected)
    onChange(allIds)
  }

  // Bersihkan pilihan
  const handleClear = () => {
    onChange([])
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-xs font-semibold text-muted mb-1 truncate">
        {label}
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled && !locked) setIsOpen(!isOpen)
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full h-10 px-3.5 rounded-xl border flex items-center justify-between gap-2 text-xs font-medium transition-all text-left outline-none ${
          disabled
            ? 'bg-canvas text-muted border-line cursor-not-allowed opacity-75'
            : locked
            ? 'bg-canvas text-ink border-line cursor-default'
            : isOpen
            ? 'bg-surface border-primary ring-2 ring-primary-400/20 text-ink shadow-2xs'
            : 'bg-surface border-line text-ink hover:border-primary-300 shadow-2xs'
        } focus-visible:ring-2 focus-visible:ring-primary-400`}
      >
        <span className="truncate flex-1">{triggerLabel}</span>
        {locked ? (
          <Lock className="w-3.5 h-3.5 text-muted shrink-0" aria-label="Terkunci" />
        ) : (
          <ChevronDown
            className={`w-4 h-4 text-muted transition-transform shrink-0 ${
              isOpen ? 'rotate-180 text-primary' : ''
            }`}
          />
        )}
      </button>

      {/* Petunjuk saat nonaktif */}
      {disabled && disabledReason && (
        <span className="block text-[10px] text-muted mt-1 leading-tight truncate">
          {disabledReason}
        </span>
      )}

      {/* Dropdown Menu */}
      {isOpen && !disabled && !locked && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-50 left-0 right-0 mt-1.5 bg-surface border border-line rounded-2xl shadow-xl overflow-hidden min-w-[240px] max-w-[340px] animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header Aksi Cepat: Hanya Pilih Semua & Reset */}
          <div className="p-2 border-b border-line bg-canvas/60 flex items-center justify-between text-xs font-semibold">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-2.5 py-1 rounded-lg hover:bg-primary-50 text-muted hover:text-ink transition-colors cursor-pointer"
            >
              Pilih Semua
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="px-2.5 py-1 rounded-lg text-danger hover:bg-danger/10 transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>

          {/* Kotak Pencarian jika Opsi > 8 */}
          {options.length > 8 && (
            <div className="p-2 border-b border-line bg-surface">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Cari ${label.toLowerCase()}...`}
                  className="w-full h-8 pl-8 pr-2.5 text-xs bg-canvas rounded-lg border border-line outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 text-ink placeholder:text-muted"
                />
              </div>
            </div>
          )}

          {/* Daftar Opsi Berkelompok */}
          <div className="max-h-64 overflow-y-auto p-1.5">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted">
                Tidak ada opsi yang cocok
              </div>
            ) : grouped.length === 1 && grouped[0][0] === 'Lainnya' ? (
              // Tampilan datar jika tidak ada induk
              <div className="space-y-0.5">
                {grouped[0][1].map((opt) => {
                  const isChecked = selected.includes(String(opt.id))
                  return (
                    <div
                      key={opt.id}
                      role="option"
                      aria-selected={isChecked}
                      onClick={() => handleToggle(opt.id)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-primary-50 text-primary font-semibold'
                          : 'text-ink hover:bg-canvas'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                            isChecked
                              ? 'bg-primary border-primary text-white'
                              : 'border-line bg-surface'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="truncate">{opt.nama}</span>
                      </div>
                      {typeof opt.total === 'number' && opt.total > 0 && (
                        <span className="text-[10px] text-muted shrink-0 ml-2">
                          Rp {(opt.total / 1000000).toFixed(0)} jt
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              // Tampilan Berkelompok
              grouped.map(([groupName, itemsInGroup]) => {
                const groupIds = itemsInGroup.map((o) => String(o.id))
                const isGroupAllSelected = groupIds.every((id) => selected.includes(id))

                return (
                  <div key={groupName} className="mb-2 last:mb-0">
                    {/* Header Grup */}
                    <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-bold text-muted uppercase tracking-wider bg-canvas/60 rounded-lg mb-1">
                      <span className="truncate">{groupName}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleGroup(itemsInGroup)
                        }}
                        className="text-[10px] text-primary hover:underline font-semibold cursor-pointer lowercase"
                      >
                        {isGroupAllSelected ? 'batal' : 'pilih semua'}
                      </button>
                    </div>

                    {/* Item dalam Grup */}
                    <div className="space-y-0.5 pl-1">
                      {itemsInGroup.map((opt) => {
                        const isChecked = selected.includes(String(opt.id))
                        return (
                          <div
                            key={opt.id}
                            role="option"
                            aria-selected={isChecked}
                            onClick={() => handleToggle(opt.id)}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-primary-50 text-primary font-semibold'
                                : 'text-ink hover:bg-canvas'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <div
                                className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                                  isChecked
                                    ? 'bg-primary border-primary text-white'
                                    : 'border-line bg-surface'
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className="truncate">{opt.nama}</span>
                            </div>
                            {typeof opt.total === 'number' && opt.total > 0 && (
                              <span className="text-[10px] text-muted shrink-0 ml-2">
                                Rp {(opt.total / 1000000).toFixed(0)} jt
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
