/**
 * @file organisasiFilter.js
 * Logika murni (tanpa ketergantungan React/DOM) untuk kartu filter "Lingkup dan periode".
 * Memenuhi aturan:
 * 1. Multi-pilih berjenjang (distrik -> resort -> huria)
 * 2. Level perbandingan = level terdalam yang punya minimal 1 centang
 * 3. Hapus berantai (pruning anak jika induk dicabut)
 * 4. Batas maksimal 6 item per perbandingan
 * 5. Deteksi induk yang dicentang namun tidak punya turunan di level perbandingan
 * 6. Pembuatan teks ringkasan perbandingan
 * 7. Serialisasi & parsing query URL dua arah (?distrik=&resort=&huria=&mode=&tahun=)
 */

export const LEVELS = ['distrik', 'resort', 'huria']

export const PARENT_LEVEL = {
  resort: 'distrik',
  huria: 'resort',
}

export const CHILD_LEVEL = {
  distrik: 'resort',
  resort: 'huria',
}

export const MAX_SELECTION = 6

export const EMPTY_SELECTION = {
  distrik: [],
  resort: [],
  huria: [],
}

export const DEFAULT_PERIODE = {
  mode: 'tahun',
  tahun: '2026',
  bulan: '',
  mingguISO: '',
  startDate: '',
  endDate: '',
}

/**
 * Menentukan level perbandingan aktif.
 * Level perbandingan adalah level terdalam yang memiliki minimal satu ID terpilih.
 * @param {Record<string, string[]>} selected
 * @returns {'distrik' | 'resort' | 'huria' | null}
 */
export function resolveComparisonLevel(selected) {
  if (!selected) return null

  // Evaluasi dari level terdalam (huria) ke terluar (distrik)
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    const lvl = LEVELS[i]
    const ids = selected[lvl]
    if (Array.isArray(ids) && ids.length > 0) {
      return lvl
    }
  }

  return null
}

/**
 * Membuang pilihan yang induknya tidak lagi dicentang, berantai ke bawah.
 * Jika optionsByLevel tersedia, juga membuang ID yang tidak valid.
 * @param {Record<string, string[]>} selected
 * @param {Record<string, Array<{id: string, idInduk?: string}>>} [optionsByLevel]
 * @returns {Record<string, string[]>} objek selected baru yang sudah dipangkas
 */
export function pruneSelection(selected, optionsByLevel = {}) {
  const result = {
    distrik: Array.isArray(selected?.distrik) ? [...selected.distrik] : [],
    resort: Array.isArray(selected?.resort) ? [...selected.resort] : [],
    huria: Array.isArray(selected?.huria) ? [...selected.huria] : [],
  }

  // 1. Validasi distrik terhadap opsi (jika opsi distrik tersedia)
  if (Array.isArray(optionsByLevel.distrik) && optionsByLevel.distrik.length > 0) {
    const validDistrikIds = new Set(optionsByLevel.distrik.map((d) => String(d.id)))
    result.distrik = result.distrik.filter((id) => validDistrikIds.has(String(id)))
  }

  // 2. Resort membutuhkan minimal 1 distrik terpilih
  if (result.distrik.length === 0) {
    result.resort = []
    result.huria = []
    return result
  }

  const selectedDistrikSet = new Set(result.distrik.map(String))
  if (Array.isArray(optionsByLevel.resort) && optionsByLevel.resort.length > 0) {
    const resortMap = new Map(optionsByLevel.resort.map((r) => [String(r.id), r]))
    result.resort = result.resort.filter((id) => {
      const opt = resortMap.get(String(id))
      return opt && selectedDistrikSet.has(String(opt.idInduk))
    })
  }

  // 3. Huria membutuhkan minimal 1 resort terpilih
  if (result.resort.length === 0) {
    result.huria = []
    return result
  }

  const selectedResortSet = new Set(result.resort.map(String))
  if (Array.isArray(optionsByLevel.huria) && optionsByLevel.huria.length > 0) {
    const huriaMap = new Map(optionsByLevel.huria.map((h) => [String(h.id), h]))
    result.huria = result.huria.filter((id) => {
      const opt = huriaMap.get(String(id))
      return opt && selectedResortSet.has(String(opt.idInduk))
    })
  }

  return result
}

/**
 * Memotong array ID sampai batas maksimal dan melaporkan status pemotongan.
 * @param {string[]} ids
 * @param {number} [max=6]
 * @returns {{ ids: string[], isTruncated: boolean, truncatedCount: number, max: number }}
 */
export function enforceLimit(ids, max = MAX_SELECTION) {
  const safeList = Array.isArray(ids) ? ids : []
  if (safeList.length <= max) {
    return {
      ids: safeList,
      isTruncated: false,
      truncatedCount: 0,
      max,
    }
  }

  return {
    ids: safeList.slice(0, max),
    isTruncated: true,
    truncatedCount: safeList.length - max,
    max,
  }
}

/**
 * Mencari induk yang dicentang tetapi tidak punya turunan terpilih pada level perbandingan.
 * @param {Record<string, string[]>} selected
 * @param {Record<string, Array<{id: string, nama: string, idInduk?: string}>>} optionsByLevel
 * @returns {Array<{ level: string, id: string, nama: string, reason: string }>}
 */
export function findExcludedParents(selected, optionsByLevel = {}) {
  const comparisonLevel = resolveComparisonLevel(selected)
  if (!comparisonLevel || comparisonLevel === 'distrik') {
    return []
  }

  const targetLevelIndex = LEVELS.indexOf(comparisonLevel)
  const selectedTargetIds = new Set((selected[comparisonLevel] || []).map(String))
  if (selectedTargetIds.size === 0) {
    return []
  }

  // Kumpulkan semua ancestor aktif dari item yang terpilih pada comparisonLevel
  // Trace ke atas: huria -> resort -> distrik
  const activeAncestors = {
    distrik: new Set(),
    resort: new Set(),
  }

  const huriaOpts = optionsByLevel.huria || []
  const resortOpts = optionsByLevel.resort || []

  const huriaMap = new Map(huriaOpts.map((o) => [String(o.id), o]))
  const resortMap = new Map(resortOpts.map((o) => [String(o.id), o]))

  if (comparisonLevel === 'huria') {
    selectedTargetIds.forEach((hId) => {
      const hOpt = huriaMap.get(hId)
      if (hOpt && hOpt.idInduk) {
        const rId = String(hOpt.idInduk)
        activeAncestors.resort.add(rId)
        const rOpt = resortMap.get(rId)
        if (rOpt && rOpt.idInduk) {
          activeAncestors.distrik.add(String(rOpt.idInduk))
        }
      }
    })
  } else if (comparisonLevel === 'resort') {
    selectedTargetIds.forEach((rId) => {
      const rOpt = resortMap.get(rId)
      if (rOpt && rOpt.idInduk) {
        activeAncestors.distrik.add(String(rOpt.idInduk))
      }
    })
  }

  const excluded = []

  // Periksa semua level induk di atas level perbandingan
  for (let i = 0; i < targetLevelIndex; i++) {
    const pLevel = LEVELS[i]
    const pSelected = (selected[pLevel] || []).map(String)
    const pOptions = optionsByLevel[pLevel] || []
    const pMap = new Map(pOptions.map((o) => [String(o.id), o.nama]))

    pSelected.forEach((pId) => {
      if (!activeAncestors[pLevel]?.has(pId)) {
        excluded.push({
          level: pLevel,
          id: pId,
          nama: pMap.get(pId) || pId,
          reason: `tidak ikut karena ${comparisonLevel} dipilih`,
        })
      }
    })
  }

  return excluded
}

/**
 * Membuat teks ringkasan untuk level perbandingan aktif.
 * Contoh: "Membandingkan 3 huria dari 2 resort"
 * Kata distrik, resort, huria tidak berubah saat jamak.
 * @param {'distrik' | 'resort' | 'huria' | null} level
 * @param {Record<string, string[]>} selected
 * @param {Record<string, Array<{id: string, nama: string, idInduk?: string}>>} [optionsByLevel]
 * @returns {string}
 */
export function buildSummary(level, selected, optionsByLevel = {}) {
  if (!level || !selected || !Array.isArray(selected[level]) || selected[level].length === 0) {
    return 'Pilih minimal satu wilayah untuk mulai membandingkan'
  }

  const count = selected[level].length
  const prefix = count === 1 ? 'Analisis 1' : `Membandingkan ${count}`

  if (level === 'distrik') {
    return `${prefix} distrik`
  }

  const pLevel = PARENT_LEVEL[level]
  let parentCount = 0

  // Hitung jumlah induk unik yang menaungi item-item terpilih
  const currentOptions = optionsByLevel[level] || []
  if (currentOptions.length > 0) {
    const optMap = new Map(currentOptions.map((o) => [String(o.id), String(o.idInduk || '')]))
    const parentIdSet = new Set()
    selected[level].forEach((id) => {
      const pId = optMap.get(String(id))
      if (pId) parentIdSet.add(pId)
    })
    parentCount = parentIdSet.size
  }

  // Fallback jika opsi belum tersedia: gunakan jumlah induk terpilih
  if (parentCount === 0 && selected[pLevel]) {
    parentCount = selected[pLevel].length
  }
  if (parentCount === 0) {
    parentCount = 1
  }

  return `${prefix} ${level} dari ${parentCount} ${pLevel}`
}

/**
 * Mengubah state filter & periode menjadi URL query string.
 * @param {{
 *   selected?: Record<string, string[]>,
 *   distrik?: string[],
 *   resort?: string[],
 *   huria?: string[],
 *   periode?: { mode?: string, tahun?: string, bulan?: string, mingguISO?: string, startDate?: string, endDate?: string },
 *   mode?: string,
 *   tahun?: string,
 *   bulan?: string,
 *   mingguISO?: string,
 *   startDate?: string,
 *   endDate?: string
 * }} state
 * @returns {string} query string tanpa awalan "?"
 */
export function toQuery(state = {}) {
  const params = new URLSearchParams()

  const sel = state.selected || state
  LEVELS.forEach((lvl) => {
    const list = sel[lvl]
    if (Array.isArray(list) && list.length > 0) {
      params.set(lvl, list.join(','))
    }
  })

  const per = state.periode || state
  if (per.mode) params.set('mode', per.mode)
  if (per.tahun) params.set('tahun', per.tahun)
  if (per.bulan) params.set('bulan', per.bulan)
  if (per.mingguISO) params.set('mingguISO', per.mingguISO)
  if (per.startDate) params.set('startDate', per.startDate)
  if (per.endDate) params.set('endDate', per.endDate)

  return params.toString()
}

/**
 * Mengurai URL query string, URLSearchParams, atau objek menjadi state terstruktur.
 * @param {string | URLSearchParams | Record<string, string>} input
 * @returns {{
 *   selected: { distrik: string[], resort: string[], huria: string[] },
 *   periode: { mode: string, tahun: string, bulan: string, mingguISO: string, startDate: string, endDate: string }
 * }}
 */
export function fromQuery(input) {
  let searchParams

  if (typeof input === 'string') {
    const clean = input.startsWith('?') ? input.slice(1) : input
    searchParams = new URLSearchParams(clean)
  } else if (input instanceof URLSearchParams) {
    searchParams = input
  } else if (input && typeof input === 'object') {
    searchParams = new URLSearchParams()
    Object.entries(input).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        searchParams.set(k, String(v))
      }
    })
  } else {
    searchParams = new URLSearchParams()
  }

  const selected = {
    distrik: parseIdList(searchParams.get('distrik')),
    resort: parseIdList(searchParams.get('resort')),
    huria: parseIdList(searchParams.get('huria')),
  }

  const periode = {
    mode: searchParams.get('mode') || DEFAULT_PERIODE.mode,
    tahun: searchParams.get('tahun') || DEFAULT_PERIODE.tahun,
    bulan: searchParams.get('bulan') || '',
    mingguISO: searchParams.get('mingguISO') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
  }

  return { selected, periode }
}

/**
 * Membantu mengurai string ID yang dipisahkan koma menjadi array unik tanpa elemen kosong.
 * @param {string | null | undefined} val
 * @returns {string[]}
 */
function parseIdList(val) {
  if (!val || typeof val !== 'string') return []
  return Array.from(
    new Set(
      val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    )
  )
}

/**
 * Memilih N item teratas berdasarkan field total (atau urutan awal jika total tidak ada).
 * @param {Array<{ id: string, total?: number }>} options
 * @param {number} [n=2]
 * @param {number} [max=6]
 * @returns {string[]}
 */
export function pickTop(options = [], n = 2, max = MAX_SELECTION) {
  if (!Array.isArray(options) || options.length === 0) return []

  const limit = Math.min(n, max)
  const sorted = [...options].sort((a, b) => {
    const totalA = typeof a.total === 'number' ? a.total : -1
    const totalB = typeof b.total === 'number' ? b.total : -1
    return totalB - totalA
  })

  return sorted.slice(0, limit).map((opt) => String(opt.id))
}
