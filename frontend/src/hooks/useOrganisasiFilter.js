/**
 * @file useOrganisasiFilter.js
 * Custom hook untuk mengelola state filter organisasi berjenjang (Distrik -> Resort -> Huria) & periode.
 * Mengintegrasikan aturan:
 * - Pruning berantai 3 level
 * - Batas maksimal 6 item
 * - Deteksi level perbandingan & induk yang tidak ikut
 * - Role-based locking (Super Admin, Admin Distrik, Admin Huria)
 * - Sinkronisasi URL dua arah & debounce query 300ms
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  LEVELS,
  MAX_SELECTION,
  EMPTY_SELECTION,
  DEFAULT_PERIODE,
  resolveComparisonLevel,
  pruneSelection,
  enforceLimit,
  findExcludedParents,
  buildSummary,
  toQuery,
  fromQuery,
  pickTop as pickTopHelper,
} from '../lib/organisasiFilter'
import { getOrganisasiOptions } from '../api/organisasiApi'

export function useOrganisasiFilter({ user = null, liveWilayahData = null, initialParams = null } = {}) {
  // 1. Role & Locks State
  const userRole = (user?.role || 'superadmin').toLowerCase()
  const isDistrikAdmin = userRole === 'admin_distrik'
  const isHuriaAdmin = userRole === 'admin_huria' || userRole === 'admin'

  const locks = useMemo(
    () => ({
      distrik: isDistrikAdmin || isHuriaAdmin,
      resort: isHuriaAdmin,
      huria: isHuriaAdmin,
    }),
    [isDistrikAdmin, isHuriaAdmin]
  )

  // 2. Primary Selection & Periode State
  const [selected, setSelectedState] = useState(() => {
    const fromUrl = fromQuery(initialParams || window.location.search)
    return fromUrl.selected || EMPTY_SELECTION
  })

  const [periode, setPeriodeState] = useState(() => {
    const fromUrl = fromQuery(initialParams || window.location.search)
    return fromUrl.periode || DEFAULT_PERIODE
  })

  // 3. Options Cache & Loading State per Level (3 level)
  const [options, setOptions] = useState({
    distrik: [],
    resort: [],
    huria: [],
  })

  const [loading, setLoading] = useState({
    distrik: false,
    resort: false,
    huria: false,
  })

  // 4. Warnings & Notifications (Batas, Induk tidak ikut, ID dibuang)
  const [warnings, setWarnings] = useState([])

  // Helper untuk mencatat peringatan sementara
  const addWarning = useCallback((msg) => {
    setWarnings((prev) => (prev.includes(msg) ? prev : [...prev, msg]))
  }, [])

  const clearWarnings = useCallback(() => {
    setWarnings([])
  }, [])

  // 5. Fetch Options untuk Semua Level (Distrik, Resort, Huria)
  useEffect(() => {
    let isCancelled = false
    setLoading({ distrik: true, resort: true, huria: true })

    Promise.all([
      getOrganisasiOptions({ level: 'distrik', liveWilayahData }),
      getOrganisasiOptions({ level: 'resort', liveWilayahData }),
      getOrganisasiOptions({ level: 'huria', liveWilayahData }),
    ])
      .then(([distrikRes, resortRes, huriaRes]) => {
        if (!isCancelled) {
          const distrikOpts = distrikRes.data || []
          const resortOpts = resortRes.data || []
          const huriaOpts = huriaRes.data || []

          setOptions({
            distrik: distrikOpts,
            resort: resortOpts,
            huria: huriaOpts,
          })

          // Auto-select untuk locked role
          setSelectedState((prev) => {
            const next = { ...prev }

            // Untuk Admin Huria: Kunci strictly ke Huria milik admin
            if (isHuriaAdmin && huriaOpts.length > 0) {
              const matchedHuria = huriaOpts.find(
                (h) =>
                  (user?.idHuria && String(h.id) === String(user.idHuria)) ||
                  (user?.namaHuria && h.nama === user.namaHuria) ||
                  (user?.namaHuria && (h.nama || '').toLowerCase() === user.namaHuria.toLowerCase()) ||
                  (user?.namaHuria && (h.nama || '').includes(user.namaHuria))
              ) || huriaOpts[0]

              if (matchedHuria) {
                const matchedResort = resortOpts.find(
                  (r) => String(r.id) === String(matchedHuria.idInduk)
                )
                const matchedDistrik = distrikOpts.find(
                  (d) => String(d.id) === String(matchedResort?.idInduk)
                )

                next.distrik = matchedDistrik ? [String(matchedDistrik.id)] : []
                next.resort = matchedResort ? [String(matchedResort.id)] : []
                next.huria = [String(matchedHuria.id)]
                return next
              }
            }

            if (locks.distrik && distrikOpts.length > 0 && next.distrik.length === 0) {
              const matched = distrikOpts.find(
                (d) => d.id === user?.idDistrik || d.nama === user?.namaDistrik
              ) || distrikOpts[0]
              next.distrik = [String(matched.id)]
            }
            if (locks.resort && resortOpts.length > 0 && next.resort.length === 0) {
              const matched = resortOpts.find(
                (r) => r.id === user?.idResort || r.nama === user?.namaResort
              ) || resortOpts[0]
              next.resort = [String(matched.id)]
            }
            if (locks.huria && huriaOpts.length > 0 && next.huria.length === 0) {
              const matched = huriaOpts.find(
                (h) => h.id === user?.idHuria || h.nama === user?.namaHuria
              ) || huriaOpts[0]
              next.huria = [String(matched.id)]
            }
            return next
          })
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!isCancelled) {
          setLoading({ distrik: false, resort: false, huria: false })
        }
      })

    return () => {
      isCancelled = true
    }
  }, [liveWilayahData, locks.distrik, locks.resort, locks.huria, isHuriaAdmin, user])

  // 6. Prune Berantai Saat Options Berubah
  useEffect(() => {
    setSelectedState((prev) => {
      const pruned = pruneSelection(prev, options)
      const isDifferent =
        pruned.distrik.length !== prev.distrik.length ||
        pruned.resort.length !== prev.resort.length ||
        pruned.huria.length !== prev.huria.length

      return isDifferent ? pruned : prev
    })
  }, [options])

  // 7. Derivasi Level Perbandingan & Induk yang Tidak Ikut
  const level = useMemo(() => resolveComparisonLevel(selected), [selected])

  const items = useMemo(() => {
    if (!level) return []
    const currentOptions = options[level] || []
    const map = new Map(currentOptions.map((o) => [String(o.id), o]))
    return (selected[level] || []).map((id) => map.get(String(id)) || { id, nama: id })
  }, [level, selected, options])

  const excludedParents = useMemo(() => {
    return findExcludedParents(selected, options)
  }, [selected, options])

  const summary = useMemo(() => {
    return buildSummary(level, selected, options)
  }, [level, selected, options])

  // 8. Sinkronisasi ke URL lewat window.history
  useEffect(() => {
    const qStr = toQuery({ selected, periode })
    const newRelativePathQuery = window.location.pathname + (qStr ? `?${qStr}` : '')
    window.history.replaceState(null, '', newRelativePathQuery)
  }, [selected, periode])

  // 9. Debounce Query (300 ms) untuk Pengambilan Data Grafik
  const [debouncedQuery, setDebouncedQuery] = useState(() => toQuery({ selected, periode }))
  const abortControllerRef = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()
      setDebouncedQuery(toQuery({ selected, periode }))
    }, 300)

    return () => {
      clearTimeout(timer)
    }
  }, [selected, periode])

  // 10. Handler Manipulasi Filter
  const setSelected = useCallback(
    (lvl, ids) => {
      if (locks[lvl]) return

      // Terapkan batas maksimal 6 item jika ini adalah level perbandingan
      const { ids: limitedIds, isTruncated } = enforceLimit(ids, MAX_SELECTION)
      if (isTruncated) {
        addWarning(`Maksimal ${MAX_SELECTION} item per perbandingan. Hanya 6 item pertama yang dipilih.`)
      }

      setSelectedState((prev) => {
        const next = { ...prev, [lvl]: limitedIds }
        return pruneSelection(next, options)
      })
    },
    [locks, options, addWarning]
  )

  // Toggle semua item dalam satu grup induk
  const toggleGroup = useCallback(
    (lvl, idInduk) => {
      if (locks[lvl]) return

      const groupOptions = (options[lvl] || []).filter((opt) => String(opt.idInduk) === String(idInduk))
      const groupIds = groupOptions.map((o) => String(o.id))
      const currentSelected = selected[lvl] || []
      const isAllGroupSelected = groupIds.length > 0 && groupIds.every((id) => currentSelected.includes(id))

      let nextIds
      if (isAllGroupSelected) {
        nextIds = currentSelected.filter((id) => !groupIds.includes(id))
      } else {
        const combined = Array.from(new Set([...currentSelected, ...groupIds]))
        const { ids: limited, isTruncated } = enforceLimit(combined, MAX_SELECTION)
        if (isTruncated) {
          addWarning(`Maksimal ${MAX_SELECTION} item terpilih. Opsi grup dipilih hingga batas.`)
        }
        nextIds = limited
      }

      setSelected(lvl, nextIds)
    },
    [locks, options, selected, setSelected, addWarning]
  )

  // Pintasan: Pilih N teratas (berdasarkan total pemasukan)
  const pickTop = useCallback(
    (lvl, n = 2) => {
      if (locks[lvl]) return
      const topIds = pickTopHelper(options[lvl] || [], n, MAX_SELECTION)
      setSelected(lvl, topIds)
    },
    [locks, options, setSelected]
  )

  // Reset ke kondisi awal sesuai peran
  const reset = useCallback(() => {
    clearWarnings()
    setPeriodeState(DEFAULT_PERIODE)

    if (isHuriaAdmin && options.huria.length > 0) {
      const matchedHuria = options.huria.find(
        (h) =>
          (user?.idHuria && String(h.id) === String(user.idHuria)) ||
          (user?.namaHuria && h.nama === user.namaHuria) ||
          (user?.namaHuria && (h.nama || '').toLowerCase() === user.namaHuria.toLowerCase()) ||
          (user?.namaHuria && (h.nama || '').includes(user.namaHuria))
      ) || options.huria[0]

      const matchedResort = options.resort.find(
        (r) => String(r.id) === String(matchedHuria?.idInduk)
      )
      const matchedDistrik = options.distrik.find(
        (d) => String(d.id) === String(matchedResort?.idInduk)
      )

      setSelectedState({
        distrik: matchedDistrik ? [String(matchedDistrik.id)] : [],
        resort: matchedResort ? [String(matchedResort.id)] : [],
        huria: matchedHuria ? [String(matchedHuria.id)] : [],
      })
    } else if (locks.distrik && options.distrik.length > 0) {
      const defaultDistrik = options.distrik[0].id
      setSelectedState({
        distrik: [String(defaultDistrik)],
        resort: [],
        huria: [],
      })
    } else {
      setSelectedState(EMPTY_SELECTION)
    }
  }, [isHuriaAdmin, locks.distrik, options, user, clearWarnings])

  const setPeriode = useCallback((patch) => {
    setPeriodeState((prev) => ({ ...prev, ...patch }))
  }, [])

  return {
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
    toggleGroup,
    pickTop,
    reset,
    query: debouncedQuery,
    abortSignal: abortControllerRef.current?.signal,
  }
}
