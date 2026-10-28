import { useState, useEffect, useRef, useCallback, useTransition } from 'react'
import { getWilayahAnak, getWilayahDetail } from '../api/wilayahExplorerApi'

/**
 * Membaca parameter query URL saat ini
 */
function getUrlParams(defaultView = 'card') {
  if (typeof window === 'undefined') {
    return { q: '', sort: 'kode-asc', status: 'semua', view: defaultView, page: 1 }
  }
  const sp = new URLSearchParams(window.location.search)
  return {
    q: sp.get('q') || '',
    sort: sp.get('sort') || 'kode-asc',
    status: sp.get('status') || 'semua',
    view: sp.get('view') || defaultView,
    page: Math.max(1, parseInt(sp.get('page') || '1', 10)),
  }
}

/**
 * Menyimpan parameter query ke URL browser tanpa reload halaman
 */
function syncUrlParams(params, defaultView = 'card') {
  if (typeof window === 'undefined') return
  const sp = new URLSearchParams(window.location.search)

  if (params.q && params.q.trim()) {
    sp.set('q', params.q.trim())
  } else {
    sp.delete('q')
  }

  if (params.sort && params.sort !== 'kode-asc') {
    sp.set('sort', params.sort)
  } else {
    sp.delete('sort')
  }

  if (params.status && params.status !== 'semua') {
    sp.set('status', params.status)
  } else {
    sp.delete('status')
  }

  if (params.view && params.view !== defaultView) {
    sp.set('view', params.view)
  } else {
    sp.delete('view')
  }

  if (params.page && params.page > 1) {
    sp.set('page', String(params.page))
  } else {
    sp.delete('page')
  }

  const newSearch = sp.toString() ? `?${sp.toString()}` : ''
  const newUrl = `${window.location.pathname}${newSearch}`
  const currentUrl = `${window.location.pathname}${window.location.search}`

  if (newUrl !== currentUrl) {
    window.history.replaceState({}, '', newUrl)
  }
}

/**
 * Hook useWilayahList(level, idInduk, options)
 * Mengelola daftar anak, ringkasan KPI, filter, search dengan debounce 300ms,
 * pembatalan request lama via AbortController, dan sinkronisasi URL query string.
 */
export function useWilayahList(level, idInduk, { globalPeriode } = {}) {
  // Untuk level Huria (level terakhir), tampilan tabel adalah default sesuai spesifikasi
  const defaultView = level === 'huria' ? 'table' : 'card'

  const initialParams = getUrlParams(defaultView)
  const [searchQuery, setSearchQuery] = useState(initialParams.q)
  const [debouncedQuery, setDebouncedQuery] = useState(initialParams.q)
  const [sort, setSort] = useState(initialParams.sort)
  const [status, setStatus] = useState(initialParams.status)
  const [view, setView] = useState(initialParams.view)
  const [page, setPage] = useState(initialParams.page)

  const [data, setData] = useState([])
  const [ringkasan, setRingkasan] = useState({
    totalPemasukan: 0,
    jumlahAnak: 0,
    totalJemaat: 0,
    rataKehadiran: 0,
  })
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const abortControllerRef = useRef(null)
  const debounceTimerRef = useRef(null)

  // Level Distrik & Resort tampil lengkap tanpa limit paginasi (limit: 0).
  // Level Huria memakai paginasi 20 per halaman.
  const limit = level === 'huria' ? 20 : 0

  // 1. Debounce pencarian 300 ms
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      // Reset ke halaman 1 saat keyword berubah
      setPage(1)
    }, 300)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchQuery])

  // 2. Sinkronkan ke URL query string
  useEffect(() => {
    syncUrlParams({ q: debouncedQuery, sort, status, view, page }, defaultView)
  }, [debouncedQuery, sort, status, view, page, defaultView])

  // 3. Tangani navigasi kembali/maju browser (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const p = getUrlParams(defaultView)
      setSearchQuery(p.q)
      setDebouncedQuery(p.q)
      setSort(p.sort)
      setStatus(p.status)
      setView(p.view)
      setPage(p.page)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [defaultView])

  // 4. Fetch data wilayah anak dengan AbortController
  const fetchData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    setLoading(true)
    setError(null)

    try {
      const res = await getWilayahAnak({
        level,
        idInduk,
        q: debouncedQuery,
        sort,
        status,
        page,
        limit,
        periode: globalPeriode,
        signal: controller.signal,
      })

      setData(res.data || [])
      setRingkasan(
        res.ringkasan || {
          totalPemasukan: 0,
          jumlahAnak: 0,
          totalJemaat: 0,
          rataKehadiran: 0,
        }
      )
      setTotal(res.total || 0)
    } catch (err) {
      if (err.name === 'AbortError') {
        // Request dibatalkan karena query baru dimulai, abaikan
        return
      }
      setError(err.message || 'Gagal memuat daftar wilayah HKBP')
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [level, idInduk, debouncedQuery, sort, status, page, limit, globalPeriode])

  useEffect(() => {
    fetchData()
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchData])

  const handleResetSearch = useCallback(() => {
    setSearchQuery('')
    setDebouncedQuery('')
    setPage(1)
  }, [])

  const handleSortChange = useCallback((newSort) => {
    setSort(newSort)
    setPage(1)
  }, [])

  const handleStatusChange = useCallback((newStatus) => {
    setStatus(newStatus)
    setPage(1)
  }, [])

  return {
    items: data,
    ringkasan,
    total,
    page,
    limit,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    resetSearch: handleResetSearch,
    sort,
    setSort: handleSortChange,
    status,
    setStatus: handleStatusChange,
    view,
    setView,
    setPage,
    refetch: fetchData,
  }
}

/**
 * Hook useWilayahDetail(level, id)
 * Mengambil informasi wilayah dan daftar leluhur untuk breadcrumb
 */
export function useWilayahDetail(level, id, { globalPeriode } = {}) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const abortControllerRef = useRef(null)

  const fetchDetail = useCallback(async () => {
    if (!id && level !== 'distrik') {
      setDetail(null)
      setLoading(false)
      return
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    setLoading(true)
    setError(null)

    try {
      const res = await getWilayahDetail(level, id, { signal: controller.signal })
      if (!res) {
        setError('Wilayah tidak ditemukan')
      } else {
        setDetail(res)
      }
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message || 'Gagal memuat detail wilayah')
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [level, id])

  useEffect(() => {
    fetchDetail()
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchDetail])

  return {
    detail,
    loading,
    error,
    refetch: fetchDetail,
  }
}
