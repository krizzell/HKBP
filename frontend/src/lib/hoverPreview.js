/**
 * @file hoverPreview.js
 * Utility and calculation functions for Wilayah Hover Preview popovers.
 */

export const HOVER_PREVIEW_DELAY_MS = 200

/**
 * Menghitung koordinat posisi popover tooltip agar tidak terpotong tepi layar (viewport).
 *
 * @param {Object} params
 * @param {number} [params.clientX] Posisi horizontal kursor mouse
 * @param {number} [params.clientY] Posisi vertikal kursor mouse
 * @param {number} [params.windowWidth] Lebar viewport
 * @param {number} [params.windowHeight] Tinggi viewport
 * @param {number} [params.popoverWidth] Perkiraan lebar popover (default 280px)
 * @param {number} [params.popoverHeight] Perkiraan tinggi popover (default 220px)
 * @param {number} [params.padding] Jarak aman dari tepi layar (default 12px)
 * @param {number} [params.offset] Jarak dari kursor mouse (default 14px)
 * @returns {{ top: number, left: number }}
 */
export function calculatePopoverCoords({
  clientX = 0,
  clientY = 0,
  windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1024,
  windowHeight = typeof window !== 'undefined' ? window.innerHeight : 768,
  popoverWidth = 280,
  popoverHeight = 220,
  padding = 12,
  offset = 14,
} = {}) {
  const effectiveWidth = Math.min(popoverWidth, Math.max(100, windowWidth - padding * 2))

  // Posisi default: sedikit di kanan-bawah kursor
  let left = clientX + offset
  let top = clientY + offset

  // Jika melebihi batas kanan layar, coba balik ke sebelah kiri kursor
  if (left + effectiveWidth > windowWidth - padding) {
    const flippedLeft = clientX - effectiveWidth - 10
    if (flippedLeft >= padding) {
      left = flippedLeft
    } else {
      left = Math.max(padding, windowWidth - effectiveWidth - padding)
    }
  }

  if (left < padding) left = padding

  // Jika melebihi batas bawah layar, coba balik ke atas kursor
  if (top + popoverHeight > windowHeight - padding) {
    const flippedTop = clientY - popoverHeight - 10
    if (flippedTop >= padding) {
      top = flippedTop
    } else {
      top = Math.max(padding, windowHeight - popoverHeight - padding)
    }
  }

  if (top < padding) top = padding

  return {
    top: Math.round(top),
    left: Math.round(left),
  }
}

/**
 * Mengekstrak data entitas anak untuk preview tooltip Distrik -> Resort atau Resort -> Huria.
 *
 * @param {Object} params
 * @param {'distrik' | 'resort'} params.type
 * @param {Object} params.item
 * @param {Object} [params.options]
 * @param {Object} [params.loadingState]
 * @param {Object} [params.cachedData]
 * @param {Object} [params.fetchingState]
 * @returns {Object|null}
 */
export function getChildPreviewData({
  type,
  item,
  options = {},
  loadingState = {},
  cachedData = {},
  fetchingState = {},
}) {
  if (!item) return null

  const id = String(item.id ?? item.IdDistrik ?? item.IdResort ?? '')
  const title = item.nama || item.NamaDistrik || item.NamaResort || ''

  if (type === 'distrik') {
    const isGlobalLoading = Boolean(loadingState.resort)
    const isItemFetching = Boolean(fetchingState[id])
    const isLoading = isGlobalLoading || isItemFetching

    let children = []
    if (Array.isArray(cachedData[id]) && cachedData[id].length > 0) {
      children = cachedData[id]
    } else if (Array.isArray(options.resort)) {
      children = options.resort.filter((r) => String(r.idInduk) === id)
    }

    return {
      type: 'distrik',
      id,
      title,
      childType: 'resort',
      items: children.map((c) => ({
        id: String(c.id ?? c.IdResort ?? ''),
        nama: c.nama || c.NamaResort || '',
      })),
      loading: isLoading,
    }
  }

  if (type === 'resort') {
    const isGlobalLoading = Boolean(loadingState.huria)
    const isItemFetching = Boolean(fetchingState[id])
    const isLoading = isGlobalLoading || isItemFetching

    let children = []
    if (Array.isArray(cachedData[id]) && cachedData[id].length > 0) {
      children = cachedData[id]
    } else if (Array.isArray(options.huria)) {
      children = options.huria.filter((h) => String(h.idInduk) === id)
    }

    return {
      type: 'resort',
      id,
      title,
      childType: 'huria',
      items: children.map((c) => ({
        id: String(c.id ?? c.IdHuria ?? ''),
        nama: c.nama || c.NamaHuria || '',
      })),
      loading: isLoading,
    }
  }

  return null
}

