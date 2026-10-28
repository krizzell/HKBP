import React from 'react'
import { ChevronRight, Home } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

/**
 * Breadcrumb
 * Komponen rekam jejak berjenjang yang mematuhi pola ARIA dan cakupan role pengguna.
 *
 * @param {Array<{ label: string, href?: string, level?: string }>} items
 * @param {Function} onNavigate (opsional, untuk SPA navigation)
 */
export function Breadcrumb({ items = [], onNavigate, className = '' }) {
  const { isSuperAdmin, isAdmin, user } = useAuth()

  // Filter rekam jejak berdasarkan role:
  // Admin Huria tidak melihat Distrik atau Resort di atas cakupannya.
  // Admin Distrik tidak melihat Wilayah umum di atas distriknya jika dibatasi.
  let visibleItems = [...items]

  if (isAdmin && user) {
    if (user.namaHuria) {
      // Potong leluhur di atas Huria jika role adalah Admin Huria
      const huriaIdx = visibleItems.findIndex((it) => it.level === 'huria')
      if (huriaIdx > 0) {
        visibleItems = visibleItems.slice(huriaIdx)
      }
    } else if (user.namaDistrik) {
      // Potong di atas Distrik jika role adalah Admin Distrik
      const distrikIdx = visibleItems.findIndex((it) => it.level === 'distrik')
      if (distrikIdx > 0) {
        visibleItems = visibleItems.slice(distrikIdx)
      }
    }
  }

  const handleClick = (e, href) => {
    if (!href) return
    if (onNavigate) {
      e.preventDefault()
      onNavigate(href)
    }
  }

  return (
    <nav aria-label="Navigasi rekam jejak wilayah" className={`flex items-center flex-wrap gap-1.5 text-xs ${className}`}>
      {visibleItems.map((item, index) => {
        const isLast = index === visibleItems.length - 1
        const isFirst = index === 0

        return (
          <React.Fragment key={`${item.label}-${index}`}>
            {index > 0 && (
              <ChevronRight className="w-3.5 h-3.5 text-muted/60 shrink-0 select-none" aria-hidden="true" />
            )}

            {isLast ? (
              <span
                aria-current="page"
                className="font-bold text-primary truncate max-w-[220px] sm:max-w-md py-1"
                title={item.label}
              >
                {item.label}
              </span>
            ) : (
              <a
                href={item.href || '#'}
                onClick={(e) => handleClick(e, item.href)}
                className="inline-flex items-center gap-1 min-h-[36px] px-1.5 py-1 rounded-md text-muted hover:text-primary hover:bg-primary-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                title={item.label}
              >
                {isFirst && isSuperAdmin && <Home className="w-3.5 h-3.5 shrink-0 text-muted" aria-hidden="true" />}
                <span className="truncate max-w-[160px] sm:max-w-xs">{item.label}</span>
              </a>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
