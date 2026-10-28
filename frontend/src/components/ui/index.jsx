import React, { useState, useRef, useEffect } from 'react'
import { X, ChevronDown, Check } from 'lucide-react'

// ==========================================
// 1. BUTTON
// ==========================================
export const buttonVariants = {
  primary: 'bg-primary text-white hover:bg-primary-700 active:bg-primary-900 shadow-xs',
  secondary: 'border border-primary text-primary hover:bg-primary-50 active:bg-primary-100',
  accent: 'bg-accent text-primary hover:bg-accent-strong active:opacity-90 font-semibold shadow-xs',
  danger: 'bg-danger text-white hover:bg-danger/90 active:bg-danger/80 shadow-xs',
  ghost: 'text-muted hover:bg-primary-50 hover:text-primary active:bg-primary-100',
  outline: 'border border-line bg-surface text-ink hover:bg-primary-50 hover:text-primary',
}

export const buttonSizes = {
  sm: 'px-2.5 py-1.5 text-xs rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-5 py-2.5 text-base rounded-xl gap-2.5',
  icon: 'p-2 rounded-lg',
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  children,
  ...props
}) => {
  const variantClass = buttonVariants[variant] || buttonVariants.primary
  const sizeClass = buttonSizes[size] || buttonSizes.md
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:outline-none ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

// ==========================================
// 2. INPUT
// ==========================================
export const Input = ({ className = '', ...props }) => {
  return (
    <input
      className={`w-full bg-surface border border-line text-ink placeholder:text-muted/60 rounded-lg px-3.5 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30 focus-visible:ring-2 focus-visible:ring-primary-400 focus:outline-none transition-all disabled:bg-canvas disabled:text-muted disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  )
}

// ==========================================
// 3. SELECT
// ==========================================
export const Select = ({ className = '', children, ...props }) => {
  return (
    <select
      className={`w-full bg-surface border border-line text-ink rounded-lg px-3.5 py-2 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30 focus-visible:ring-2 focus-visible:ring-primary-400 focus:outline-none transition-all cursor-pointer disabled:bg-canvas disabled:text-muted disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

// ==========================================
// 4. MULTI SELECT
// ==========================================
export const MultiSelect = ({
  options = [],
  value = [],
  onChange,
  placeholder = 'Pilih opsi...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOptions = options.filter((opt) =>
    (opt.label || opt.name || opt).toLowerCase().includes(search.toLowerCase())
  )

  const toggleOption = (optValue) => {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue))
    } else {
      onChange([...value, optValue])
    }
  }

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[38px] w-full bg-surface border border-line text-ink rounded-lg px-3 py-1.5 text-sm flex items-center justify-between gap-2 cursor-pointer focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-400/30"
      >
        <div className="flex flex-wrap gap-1.5 items-center flex-1">
          {value.length === 0 ? (
            <span className="text-muted/60">{placeholder}</span>
          ) : (
            value.map((val) => {
              const matched = options.find((o) => (o.value ?? o) === val)
              const label = matched ? (matched.label ?? matched.name ?? matched) : val
              return (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 bg-primary-50 text-primary text-xs px-2 py-0.5 rounded-md font-medium"
                >
                  {label}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleOption(val)
                    }}
                    className="hover:text-primary-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )
            })
          )}
        </div>
        <ChevronDown className="w-4 h-4 text-muted shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-surface border border-line rounded-lg shadow-lg p-2 max-h-60 overflow-y-auto">
          <Input
            placeholder="Cari..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2 py-1 px-2 text-xs"
            autoFocus
          />
          <div className="flex flex-col gap-1">
            {filteredOptions.length === 0 ? (
              <div className="text-xs text-muted text-center py-2">Tidak ditemukan</div>
            ) : (
              filteredOptions.map((opt) => {
                const optVal = opt.value ?? opt
                const optLabel = opt.label ?? opt.name ?? opt
                const isSelected = value.includes(optVal)
                return (
                  <div
                    key={optVal}
                    onClick={() => toggleOption(optVal)}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm cursor-pointer hover:bg-primary-50 text-ink"
                  >
                    <span>{optLabel}</span>
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
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

// ==========================================
// 5. MODAL
// ==========================================
export const Modal = ({ isOpen, onClose, title, children, footer, className = '' }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`bg-surface border border-line rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] ${className}`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h3 className="text-lg font-bold text-ink">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-ink hover:bg-primary-50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-line bg-canvas/50 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ==========================================
// 6. DRAWER
// ==========================================
export const Drawer = ({ isOpen, onClose, title, children, footer, className = '' }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="fixed inset-0" onClick={onClose} />
      <div
        className={`relative z-10 w-full max-w-md bg-surface border-l border-line shadow-2xl flex flex-col h-full ${className}`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h3 className="text-lg font-bold text-ink">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-ink hover:bg-primary-50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-line bg-canvas/50 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ==========================================
// 7. TABLE COMPONENTS
// ==========================================
export const Table = ({ children, className = '' }) => (
  <div className="w-full overflow-x-auto rounded-xl border border-line bg-surface">
    <table className={`w-full border-collapse text-sm text-left ${className}`}>{children}</table>
  </div>
)

export const TableHeader = ({ children, className = '' }) => (
  <thead className={`bg-primary-50 text-primary border-b border-line ${className}`}>{children}</thead>
)

export const TableBody = ({ children, className = '' }) => (
  <tbody className={`divide-y divide-line ${className}`}>{children}</tbody>
)

export const TableRow = ({ children, className = '', ...props }) => (
  <tr className={`hover:bg-primary-50/50 transition-colors ${className}`} {...props}>
    {children}
  </tr>
)

export const TableHead = ({ children, className = '', ...props }) => (
  <th
    className={`px-4 py-3.5 text-xs font-bold tracking-wider text-primary uppercase select-none ${className}`}
    {...props}
  >
    {children}
  </th>
)

export const TableCell = ({ children, className = '', ...props }) => (
  <td className={`px-4 py-3 text-ink ${className}`} {...props}>
    {children}
  </td>
)

// ==========================================
// 8. PAGINATION
// ==========================================
export const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between gap-4 py-3 ${className}`}>
      <span className="text-xs text-muted">
        Halaman <span className="font-semibold text-ink">{currentPage}</span> dari{' '}
        <span className="font-semibold text-ink">{totalPages}</span>
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Sebelumnya
        </Button>
        <span className="px-3 py-1 bg-primary text-white text-xs font-semibold rounded-md">
          {currentPage}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Berikutnya
        </Button>
      </div>
    </div>
  )
}

// ==========================================
// 9. CARD
// ==========================================
export const Card = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-surface border border-line rounded-xl shadow-xs p-5 transition-all ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

// ==========================================
// 10. BADGE
// ==========================================
export const badgeVariants = {
  success: 'bg-success/15 text-success border-success/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  primary: 'bg-primary-50 text-primary border-primary-100',
  accent: 'bg-accent text-primary font-semibold border-accent-strong/40',
  muted: 'bg-line/60 text-muted border-line',
}

export const Badge = ({ variant = 'primary', className = '', children }) => {
  const variantClass = badgeVariants[variant] || badgeVariants.primary
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variantClass} ${className}`}
    >
      {children}
    </span>
  )
}

// ==========================================
// 11. SKELETON
// ==========================================
export const Skeleton = ({ className = '' }) => {
  return <div className={`hk-skeleton bg-line/50 rounded-lg animate-pulse ${className}`} />
}

// ==========================================
// 12. EMPTY STATE
// ==========================================
export const EmptyState = ({
  icon: Icon,
  title = 'Tidak ada data',
  description = 'Belum ada data yang dapat ditampilkan untuk kriteria ini.',
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 bg-surface rounded-xl border border-line ${className}`}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-primary-50 text-primary flex items-center justify-center mb-3">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h4 className="text-ink font-bold text-base">{title}</h4>
      {description && <p className="text-muted text-xs mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ==========================================
// 13. NAV ITEM
// ==========================================
export const NavItem = ({
  icon: Icon,
  label,
  isActive = false,
  isCollapsed = false,
  onClick,
  className = '',
}) => {
  return (
    <button
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer text-left ${
        isActive
          ? 'bg-primary-700 text-white border-l-4 border-accent font-semibold pl-2.5'
          : 'text-white/75 hover:bg-primary-700 hover:text-white'
      } ${isCollapsed ? 'justify-center px-2' : ''} ${className}`}
    >
      {Icon && (
        <Icon
          className={`w-5 h-5 shrink-0 ${
            isActive ? 'text-accent' : 'text-white/75'
          }`}
        />
      )}
      {!isCollapsed && <span className="truncate">{label}</span>}
    </button>
  )
}
