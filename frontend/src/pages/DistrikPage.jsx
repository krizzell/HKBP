import { useState, useRef, useCallback, useEffect } from 'react'
import useWilayah from '../hooks/useWilayah'
import { HoverPreviewPopover } from '../components/HoverPreviewPopover'
import { HOVER_PREVIEW_DELAY_MS, calculatePopoverCoords } from '../lib/hoverPreview'

export default function DistrikPage() {
  const { data, loading, error } = useWilayah()
  const distrik = data[0]?.Pusat?.Distrik ?? []

  const [hoverPreview, setHoverPreview] = useState(null)
  const hoverTimerRef = useRef(null)
  const mousePosRef = useRef({ x: 0, y: 0 })
  const activeTargetRef = useRef(null)

  const handleHoverStart = useCallback((e, d) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)

    const dId = String(d.IdDistrik || d.NamaDistrik || '')
    mousePosRef.current = { x: e.clientX, y: e.clientY }
    activeTargetRef.current = dId

    hoverTimerRef.current = setTimeout(() => {
      if (activeTargetRef.current !== dId) return

      const coords = calculatePopoverCoords({
        clientX: mousePosRef.current.x,
        clientY: mousePosRef.current.y,
      })

      const resorts = (d.Resort || []).map((r) => ({
        id: String(r.IdResort || r.NamaResort || ''),
        nama: r.NamaResort || '',
      }))

      setHoverPreview({
        type: 'distrik',
        id: dId,
        title: d.NamaDistrik,
        items: resorts,
        loading: false,
        coords,
      })
    }, HOVER_PREVIEW_DELAY_MS)
  }, [])

  const handleMouseMove = useCallback((e) => {
    mousePosRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleHoverEnd = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    activeTargetRef.current = null
    setHoverPreview(null)
  }, [])

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    }
  }, [])

  if (loading) return <p className="p-8 text-muted">Memuat...</p>
  if (error) return <p className="p-8 text-danger">Gagal memuat: {error}</p>

  return (
    <div className="min-h-screen bg-canvas p-8">
      <h1 className="text-2xl font-bold text-primary mb-4">Daftar Distrik</h1>
      <ul className="space-y-2">
        {distrik.map((d, i) => (
          <li
            key={i}
            onMouseEnter={(e) => handleHoverStart(e, d)}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleHoverEnd}
            className="bg-surface rounded-lg p-4 shadow-xs border border-line hover:border-primary-300 transition-colors cursor-pointer"
          >
            {d.NamaDistrik} — {d.Resort?.length ?? 0} resort
          </li>
        ))}
      </ul>

      {/* Popover Hover Preview */}
      <HoverPreviewPopover preview={hoverPreview} />
    </div>
  )
}
