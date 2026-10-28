/**
 * @file organisasiApi.js
 * API client dan fallback mock data untuk opsi wilayah berjenjang 3 level (distrik, resort, huria).
 * Kontrak:
 * GET /api/organisasi/options?level=distrik|resort|huria&idDistrik=1,2&idResort=5,6
 * -> { "data": [ { "id": "...", "nama": "...", "idInduk": "...", "namaInduk": "...", "total": 0 } ] }
 */

import apiClient from './client'

// Mock Data Hierarki Wilayah Lengkap HKBP (3 Level: Distrik -> Resort -> Huria)
export const MOCK_ORGANISASI_DATA = {
  distrik: [
    { id: 'D-1', nama: 'Distrik I Silindung', total: 270000000 },
    { id: 'D-2', nama: 'Distrik II Humbang', total: 180000000 },
    { id: 'D-3', nama: 'Distrik III Toba', total: 290000000 },
  ],
  resort: [
    // Distrik I Silindung
    { id: 'R-1.1', nama: 'Resort Pearaja', idInduk: 'D-1', namaInduk: 'Distrik I Silindung', total: 85000000 },
    { id: 'R-1.2', nama: 'Resort Tarutung Kota', idInduk: 'D-1', namaInduk: 'Distrik I Silindung', total: 120000000 },
    { id: 'R-1.3', nama: 'Resort Sipoholon', idInduk: 'D-1', namaInduk: 'Distrik I Silindung', total: 65000000 },

    // Distrik II Humbang
    { id: 'R-2.1', nama: 'Resort Dolok Sanggul', idInduk: 'D-2', namaInduk: 'Distrik II Humbang', total: 110000000 },
    { id: 'R-2.2', nama: 'Resort Lintongnihuta', idInduk: 'D-2', namaInduk: 'Distrik II Humbang', total: 70000000 },

    // Distrik III Toba
    { id: 'R-3.1', nama: 'Resort Balige', idInduk: 'D-3', namaInduk: 'Distrik III Toba', total: 140000000 },
    { id: 'R-3.2', nama: 'Resort Laguboti', idInduk: 'D-3', namaInduk: 'Distrik III Toba', total: 95000000 },
    { id: 'R-3.3', nama: 'Resort Porsea', idInduk: 'D-3', namaInduk: 'Distrik III Toba', total: 55000000 },
  ],
  huria: [
    // Under R-1.1 Pearaja
    { id: 'H-1.1.1', nama: 'HKBP Pearaja', idInduk: 'R-1.1', namaInduk: 'Resort Pearaja', total: 50000000 },
    { id: 'H-1.1.2', nama: 'HKBP Pardomuan', idInduk: 'R-1.1', namaInduk: 'Resort Pearaja', total: 35000000 }, // Nama kembar

    // Under R-1.2 Tarutung Kota
    { id: 'H-1.2.1', nama: 'HKBP Tarutung Kota', idInduk: 'R-1.2', namaInduk: 'Resort Tarutung Kota', total: 75000000 },
    { id: 'H-1.2.2', nama: 'HKBP Saitnihuta', idInduk: 'R-1.2', namaInduk: 'Resort Tarutung Kota', total: 45000000 },

    // Under R-1.3 Sipoholon
    { id: 'H-1.3.1', nama: 'HKBP Sipoholon', idInduk: 'R-1.3', namaInduk: 'Resort Sipoholon', total: 40000000 },
    { id: 'H-1.3.2', nama: 'HKBP Simanungkalit', idInduk: 'R-1.3', namaInduk: 'Resort Sipoholon', total: 25000000 },

    // Under R-2.1 Dolok Sanggul
    { id: 'H-2.1.1', nama: 'HKBP Dolok Sanggul Kota', idInduk: 'R-2.1', namaInduk: 'Resort Dolok Sanggul', total: 65000000 },
    { id: 'H-2.1.2', nama: 'HKBP Pardomuan', idInduk: 'R-2.1', namaInduk: 'Resort Dolok Sanggul', total: 45000000 }, // Nama kembar

    // Under R-2.2 Lintongnihuta
    { id: 'H-2.2.1', nama: 'HKBP Lintongnihuta', idInduk: 'R-2.2', namaInduk: 'Resort Lintongnihuta', total: 40000000 },
    { id: 'H-2.2.2', nama: 'HKBP Sigompulon', idInduk: 'R-2.2', namaInduk: 'Resort Lintongnihuta', total: 30000000 },

    // Under R-3.1 Balige
    { id: 'H-3.1.1', nama: 'HKBP Balige Kota', idInduk: 'R-3.1', namaInduk: 'Resort Balige', total: 85000000 },
    { id: 'H-3.1.2', nama: 'HKBP Soposurung', idInduk: 'R-3.1', namaInduk: 'Resort Balige', total: 55000000 },

    // Under R-3.2 Laguboti
    { id: 'H-3.2.1', nama: 'HKBP Laguboti Kota', idInduk: 'R-3.2', namaInduk: 'Resort Laguboti', total: 55000000 },
    { id: 'H-3.2.2', nama: 'HKBP Haunatas', idInduk: 'R-3.2', namaInduk: 'Resort Laguboti', total: 40000000 },

    // Under R-3.3 Porsea
    { id: 'H-3.3.1', nama: 'HKBP Porsea Kota', idInduk: 'R-3.3', namaInduk: 'Resort Porsea', total: 35000000 },
    { id: 'H-3.3.2', nama: 'HKBP Lumban Julu', idInduk: 'R-3.3', namaInduk: 'Resort Porsea', total: 20000000 },
  ],
}

/**
 * Helper untuk mengekstrak opsi dari data wilayah live jika tersedia.
 */
export function extractOptionsFromWilayahData(wilayahData) {
  if (!Array.isArray(wilayahData) || wilayahData.length === 0) return null

  const distriks = wilayahData[0]?.Pusat?.Distrik || []
  if (distriks.length === 0) return null

  const resDistrik = []
  const resResort = []
  const resHuria = []

  distriks.forEach((d) => {
    const dId = d.IdDistrik || d.NamaDistrik
    resDistrik.push({
      id: dId,
      nama: d.NamaDistrik,
      total: 0,
    })

    ;(d.Resort || []).forEach((r) => {
      const rId = r.IdResort || `${dId}::${r.NamaResort}`
      resResort.push({
        id: rId,
        nama: r.NamaResort,
        idInduk: dId,
        namaInduk: d.NamaDistrik,
        total: 0,
      })

      ;(r.Huria || []).forEach((h) => {
        const hId = h.IdHuria || `${rId}::${h.NamaHuria}`
        let hTotal = 0
        ;(h.PemasukanJemaat || []).forEach((p) => {
          hTotal += p.Nominal || 0
        })

        resHuria.push({
          id: hId,
          nama: h.NamaHuria,
          idInduk: rId,
          namaInduk: r.NamaResort,
          total: hTotal,
          rawHuria: h,
        })
      })
    })
  })

  return {
    distrik: resDistrik,
    resort: resResort,
    huria: resHuria,
  }
}

/**
 * Mengambil opsi wilayah per level dengan filter induk (distrik, resort, huria).
 * @param {Object} params
 * @param {'distrik' | 'resort' | 'huria'} params.level
 * @param {string[]} [params.idDistrik]
 * @param {string[]} [params.idResort]
 * @param {Array} [params.liveWilayahData]
 * @returns {Promise<{ data: Array<{ id: string, nama: string, idInduk?: string, namaInduk?: string, total?: number }> }>}
 */
export async function getOrganisasiOptions({
  level,
  idDistrik = [],
  idResort = [],
  liveWilayahData = null,
}) {
  // 1. Jika liveWilayahData tersedia, langsung ekstrak dan filter tanpa jeda network
  if (liveWilayahData) {
    const liveExtracted = extractOptionsFromWilayahData(liveWilayahData)
    if (liveExtracted) {
      const allForLevel = liveExtracted[level] || []
      let filtered = allForLevel

      if (level === 'resort' && idDistrik.length > 0) {
        const dSet = new Set(idDistrik.map(String))
        filtered = allForLevel.filter((item) => dSet.has(String(item.idInduk)))
      } else if (level === 'huria' && idResort.length > 0) {
        const rSet = new Set(idResort.map(String))
        filtered = allForLevel.filter((item) => rSet.has(String(item.idInduk)))
      }

      return { data: filtered }
    }
  }

  // 2. Coba panggil endpoint backend jika tersedia
  try {
    const queryParams = new URLSearchParams()
    queryParams.set('level', level)
    if (idDistrik.length > 0) queryParams.set('idDistrik', idDistrik.join(','))
    if (idResort.length > 0) queryParams.set('idResort', idResort.join(','))

    const response = await apiClient.get(`/organisasi/options?${queryParams.toString()}`)
    if (response.data && Array.isArray(response.data.data)) {
      return response.data
    }
  } catch (err) {
    // Backend endpoint belum siap / 404, fallback ke MOCK_ORGANISASI_DATA
  }

  // 3. Fallback menggunakan MOCK_ORGANISASI_DATA
  const allForLevel = MOCK_ORGANISASI_DATA[level] || []
  let filtered = allForLevel

  if (level === 'resort' && idDistrik.length > 0) {
    const dSet = new Set(idDistrik.map(String))
    filtered = allForLevel.filter((item) => dSet.has(String(item.idInduk)))
  } else if (level === 'huria' && idResort.length > 0) {
    const rSet = new Set(idResort.map(String))
    filtered = allForLevel.filter((item) => rSet.has(String(item.idInduk)))
  }

  return { data: filtered }
}
