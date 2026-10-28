import { useState, useMemo, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Table as TableIcon,
  Check,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react'
import { formatRupiah, formatDate, exportToCSV, getISOWeek } from '../utils/formatters'
import { HkCheckbox } from '../components/FilterControls'

// 1. DEFINISI METRIK KEUANGAN PER TABEL
const TABLE_METRICS = {
  RingkasanHuria: [
    { id: 'avgPeleanPerMinggu', label: 'Rata-rata Pelean / Minggu', unit: 'Rp', isCurrency: true },
    { id: 'totalPelean', label: 'Total Pelean Minggu', unit: 'Rp', isCurrency: true },
    { id: 'totalPemasukan', label: 'Total Pemasukan Jemaat', unit: 'Rp', isCurrency: true },
    { id: 'totalSetoranPusat', label: 'Total Setoran ke Pusat', unit: 'Rp', isCurrency: true },
    { id: 'avgKehadiran', label: 'Rata-rata Kehadiran', unit: 'Jiwa', isCurrency: false },
  ],
  PemasukanJemaat: [
    { id: 'nominal', label: 'Nominal Pemasukan', unit: 'Rp', isCurrency: true },
  ],
  SesiIbadah: [
    { id: 'totalPelean', label: 'Total Pelean Sesi', unit: 'Rp', isCurrency: true },
    { id: 'pelean1a', label: 'Pelean 1a (Pusat)', unit: 'Rp', isCurrency: true },
    { id: 'pelean1b', label: 'Pelean 1b (Pusat)', unit: 'Rp', isCurrency: true },
    { id: 'pelean2a', label: 'Pelean 2a (Huria)', unit: 'Rp', isCurrency: true },
    { id: 'pelean2b', label: 'Pelean 2b (Pendidikan)', unit: 'Rp', isCurrency: true },
    { id: 'jumlahHadir', label: 'Jumlah Kehadiran', unit: 'Jiwa', isCurrency: false },
  ],
  AlokasiTransaksi: [
    { id: 'nominal', label: 'Nominal Alokasi', unit: 'Rp', isCurrency: true },
  ],
  SetoranPusat: [
    { id: 'totalSetoran', label: 'Total Setoran Pusat', unit: 'Rp', isCurrency: true },
  ],
  RincianSetoranPusat: [
    { id: 'nominalDilunasi', label: 'Nominal Dilunasi', unit: 'Rp', isCurrency: true },
  ],
}

// 2. PRESET RENTANG CEPAT BERDASARKAN METRIK
const METRIC_PRESETS = {
  avgPeleanPerMinggu: [
    { id: 'lt_1m', label: '< 1 Juta', min: null, max: 1000000 },
    { id: '1m_5m', label: '1 – 5 Juta', min: 1000000, max: 5000000 },
    { id: 'gt_5m', label: '> 5 Juta', min: 5000000, max: null },
  ],
  totalPelean: [
    { id: 'lt_50m', label: '< 50 Juta', min: null, max: 50000000 },
    { id: '50m_200m', label: '50 – 200 Juta', min: 50000000, max: 200000000 },
    { id: 'gt_200m', label: '> 200 Juta', min: 200000000, max: null },
  ],
  totalPemasukan: [
    { id: 'lt_50m', label: '< 50 Juta', min: null, max: 50000000 },
    { id: '50m_200m', label: '50 – 200 Juta', min: 50000000, max: 200000000 },
    { id: 'gt_200m', label: '> 200 Juta', min: 200000000, max: null },
  ],
  totalSetoranPusat: [
    { id: 'lt_10m', label: '< 10 Juta', min: null, max: 10000000 },
    { id: '10m_50m', label: '10 – 50 Juta', min: 10000000, max: 50000000 },
    { id: 'gt_50m', label: '> 50 Juta', min: 50000000, max: null },
  ],
  avgKehadiran: [
    { id: 'lt_200', label: '< 200 Jiwa', min: null, max: 200 },
    { id: '200_500', label: '200 – 500 Jiwa', min: 200, max: 500 },
    { id: 'gt_500', label: '> 500 Jiwa', min: 500, max: null },
  ],
  nominal: [
    { id: 'lt_500k', label: '< 500 Ribu', min: null, max: 500000 },
    { id: '500k_2m', label: '500 Ribu – 2 Juta', min: 500000, max: 2000000 },
    { id: '2m_10m', label: '2 – 10 Juta', min: 2000000, max: 10000000 },
    { id: 'gt_10m', label: '> 10 Juta', min: 10000000, max: null },
  ],
  totalSetoran: [
    { id: 'lt_10m', label: '< 10 Juta', min: null, max: 10000000 },
    { id: '10m_50m', label: '10 – 50 Juta', min: 10000000, max: 50000000 },
    { id: 'gt_50m', label: '> 50 Juta', min: 50000000, max: null },
  ],
  nominalDilunasi: [
    { id: 'lt_1m', label: '< 1 Juta', min: null, max: 1000000 },
    { id: '1m_5m', label: '1 – 5 Juta', min: 1000000, max: 5000000 },
    { id: 'gt_5m', label: '> 5 Juta', min: 5000000, max: null },
  ],
  jumlahHadir: [
    { id: 'lt_100', label: '< 100 Jiwa', min: null, max: 100 },
    { id: '100_500', label: '100 – 500 Jiwa', min: 100, max: 500 },
    { id: 'gt_500', label: '> 500 Jiwa', min: 500, max: null },
  ],
  pelean1a: [
    { id: 'lt_1m', label: '< 1 Juta', min: null, max: 1000000 },
    { id: '1m_5m', label: '1 – 5 Juta', min: 1000000, max: 5000000 },
    { id: 'gt_5m', label: '> 5 Juta', min: 5000000, max: null },
  ],
  pelean1b: [
    { id: 'lt_1m', label: '< 1 Juta', min: null, max: 1000000 },
    { id: '1m_5m', label: '1 – 5 Juta', min: 1000000, max: 5000000 },
    { id: 'gt_5m', label: '> 5 Juta', min: 5000000, max: null },
  ],
  pelean2a: [
    { id: 'lt_1m', label: '< 1 Juta', min: null, max: 1000000 },
    { id: '1m_5m', label: '1 – 5 Juta', min: 1000000, max: 5000000 },
    { id: 'gt_5m', label: '> 5 Juta', min: 5000000, max: null },
  ],
  pelean2b: [
    { id: 'lt_1m', label: '< 1 Juta', min: null, max: 1000000 },
    { id: '1m_5m', label: '1 – 5 Juta', min: 1000000, max: 5000000 },
    { id: 'gt_5m', label: '> 5 Juta', min: 5000000, max: null },
  ],
}

export const DataTabelPage = ({ wilayahData = [], filters }) => {
  const { user } = useAuth()
  const [selectedTable, setSelectedTable] = useState('RingkasanHuria')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [isTableDropdownOpen, setIsTableDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Metrik Keuangan yang sedang aktif difilter
  const [selectedMetric, setSelectedMetric] = useState('avgPeleanPerMinggu')

  // Filter Ambang Batas State:
  // rangeMode: 'preset' (Pilihan Cepat) | 'operator' (Ambang Batas <, <=, >, >=)
  const [rangeMode, setRangeMode] = useState('preset')
  const [rangePreset, setRangePreset] = useState('all') // 'all' | preset id
  const [rangeOp, setRangeOp] = useState('<') // '<' | '<=' | '>' | '>=' | '='
  const [rangeVal, setRangeVal] = useState('')

  // Sorting State
  const [sortField, setSortField] = useState('avgPeleanPerMinggu')
  const [sortDirection, setSortDirection] = useState('desc') // 'asc' | 'desc'

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsTableDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter list huria berdasarkan filter organisasi & peran user
  const filteredHurias = useMemo(() => {
    const list = []
    const distriks = wilayahData[0]?.Pusat?.Distrik || []
    const isAdmin = (user?.role || '').toLowerCase() === 'admin'
    const userHuriaId = user?.idHuria
    const userHuriaName = user?.namaHuria

    const selectedDistriks = Array.isArray(filters.distrik)
      ? filters.distrik
      : filters.distrik ? [filters.distrik] : []
    const selectedResorts = Array.isArray(filters.resort)
      ? filters.resort
      : filters.resort ? [filters.resort] : []
    const selectedHurias = Array.isArray(filters.huria)
      ? filters.huria
      : filters.huria ? [filters.huria] : []

    distriks.forEach((d) => {
      if (
        !isAdmin &&
        selectedDistriks.length &&
        !selectedDistriks.includes(d.NamaDistrik) &&
        !selectedDistriks.includes(d.IdDistrik)
      ) {
        return
      }
      ;(d.Resort || []).forEach((res) => {
        if (
          !isAdmin &&
          selectedResorts.length &&
          !selectedResorts.includes(res.NamaResort) &&
          !selectedResorts.includes(res.IdResort)
        ) {
          return
        }
        ;(res.Huria || []).forEach((h) => {
          if (isAdmin) {
            const matchId = userHuriaId && String(h.IdHuria) === String(userHuriaId)
            const matchName =
              userHuriaName &&
              (h.NamaHuria === userHuriaName ||
                (h.NamaHuria || '').toLowerCase() === userHuriaName.toLowerCase() ||
                (h.NamaHuria || '').includes(userHuriaName))
            if (!matchId && !matchName) return
          } else {
            if (
              selectedHurias.length &&
              !selectedHurias.includes(h.NamaHuria) &&
              !selectedHurias.includes(h.IdHuria)
            ) {
              return
            }
          }

          list.push({
            ...h,
            distrikName: d.NamaDistrik,
            resortName: res.NamaResort,
            huriaName: h.NamaHuria,
          })
        })
      })
    })

    return list
  }, [wilayahData, filters, user])

  // Helper date check
  const isDateInFilter = (dateStr) => {
    if (!dateStr) return false
    if (filters.tahun && !dateStr.startsWith(filters.tahun)) return false
    if (filters.bulan && dateStr.substring(5, 7) !== filters.bulan) return false
    if (filters.mingguISO && getISOWeek(dateStr) !== parseInt(filters.mingguISO)) return false
    if (filters.startDate && dateStr < filters.startDate) return false
    if (filters.endDate && dateStr > filters.endDate) return false
    return true
  }

  // Hitung agregasi keuangan per gereja (Huria)
  const huriaFinancialMap = useMemo(() => {
    const map = new Map()

    filteredHurias.forEach((h) => {
      const sundayMap = new Map()
      let totalAttendance = 0
      let attendanceCount = 0

      ;(h.SesiIbadah || []).forEach((sesi) => {
        if (!isDateInFilter(sesi.Tanggal)) return
        const p1a = (sesi.Pelean || []).find((p) => p.Jenis === '1a')?.Nominal || 0
        const p1b = (sesi.Pelean || []).find((p) => p.Jenis === '1b')?.Nominal || 0
        const p2a = (sesi.Pelean || []).find((p) => p.Jenis === '2a')?.Nominal || 0
        const p2b = (sesi.Pelean || []).find((p) => p.Jenis === '2b')?.Nominal || 0
        const sesiTotal = p1a + p1b + p2a + p2b

        const tgl = sesi.Tanggal || 'tanpa_tanggal'
        sundayMap.set(tgl, (sundayMap.get(tgl) || 0) + sesiTotal)

        if (sesi.JumlahHadir) {
          totalAttendance += sesi.JumlahHadir
          attendanceCount++
        }
      })

      // Jika SesiIbadah kosong, cek PemasukanJemaat kategori Pelean Minggu (K-01)
      if (sundayMap.size === 0) {
        ;(h.PemasukanJemaat || []).forEach((pj) => {
          if (!isDateInFilter(pj.Tanggal)) return
          const kat = (h.KategoriPemasukan || []).find((k) => k.IdKategori === pj.IdKategori)
          const katName = (kat?.NamaKategori || pj.Keterangan || '').toLowerCase()
          if (katName.includes('pelean') || katName.includes('minggu') || pj.IdKategori === 'K-01') {
            const tgl = pj.Tanggal || 'tanpa_tanggal'
            sundayMap.set(tgl, (sundayMap.get(tgl) || 0) + (pj.Nominal || 0))
          }
        })
      }

      let totalPelean = 0
      for (const nom of sundayMap.values()) {
        totalPelean += nom
      }
      const jumlahMinggu = sundayMap.size
      const avgPeleanPerMinggu = jumlahMinggu > 0 ? Math.round(totalPelean / jumlahMinggu) : 0

      // Total Pemasukan Jemaat
      let totalPemasukan = 0
      ;(h.PemasukanJemaat || []).forEach((pj) => {
        if (isDateInFilter(pj.Tanggal)) {
          totalPemasukan += pj.Nominal || 0
        }
      })
      if (totalPemasukan === 0 && totalPelean > 0) {
        totalPemasukan = totalPelean
      }

      // Total Setoran ke Pusat
      let totalSetoranPusat = 0
      ;(h.SetoranPusat || []).forEach((sp) => {
        if (isDateInFilter(sp.TanggalSetor)) {
          totalSetoranPusat += sp.TotalSetoran || 0
        }
      })

      // Rata-rata Kehadiran
      const avgKehadiran = attendanceCount > 0 ? Math.round(totalAttendance / attendanceCount) : 0

      map.set(h.NamaHuria, {
        totalPelean,
        jumlahMinggu,
        avgPeleanPerMinggu,
        totalPemasukan,
        totalSetoranPusat,
        avgKehadiran,
      })
    })

    return map
  }, [filteredHurias, filters])

  // Extract tabular dataset based on selected table
  const rawTableData = useMemo(() => {
    const rows = []

    if (selectedTable === 'RingkasanHuria') {
      filteredHurias.forEach((h) => {
        const stats = huriaFinancialMap.get(h.NamaHuria) || {
          totalPelean: 0,
          jumlahMinggu: 0,
          avgPeleanPerMinggu: 0,
          totalPemasukan: 0,
          totalSetoranPusat: 0,
          avgKehadiran: 0,
        }

        const avg = stats.avgPeleanPerMinggu
        const katLabel =
          stats.jumlahMinggu === 0
            ? 'Belum Ada Data'
            : avg < 1000000
            ? '< 1 Juta'
            : avg <= 5000000
            ? '1 – 5 Juta'
            : '> 5 Juta'

        rows.push({
          id: h.IdHuria || h.NamaHuria,
          huria: h.NamaHuria,
          resort: h.resortName || '-',
          distrik: h.distrikName || '-',
          jumlahMinggu: stats.jumlahMinggu,
          totalPelean: stats.totalPelean,
          avgPeleanPerMinggu: avg,
          totalPemasukan: stats.totalPemasukan,
          totalSetoranPusat: stats.totalSetoranPusat,
          avgKehadiran: stats.avgKehadiran,
          kategori: katLabel,
        })
      })
    } else {
      filteredHurias.forEach((h) => {
        if (selectedTable === 'PemasukanJemaat') {
          ;(h.PemasukanJemaat || []).forEach((item) => {
            if (isDateInFilter(item.Tanggal)) {
              const kat = (h.KategoriPemasukan || []).find((k) => k.IdKategori === item.IdKategori)
              rows.push({
                id: item.IdTransaksi,
                huria: h.NamaHuria,
                resort: h.resortName,
                tanggal: item.Tanggal,
                kategori: kat?.NamaKategori || item.IdKategori,
                nominal: item.Nominal,
                keterangan: item.Keterangan,
              })
            }
          })
        } else if (selectedTable === 'SesiIbadah') {
          ;(h.SesiIbadah || []).forEach((item) => {
            if (isDateInFilter(item.Tanggal)) {
              const p1a = (item.Pelean || []).find((p) => p.Jenis === '1a')?.Nominal || 0
              const p1b = (item.Pelean || []).find((p) => p.Jenis === '1b')?.Nominal || 0
              const p2a = (item.Pelean || []).find((p) => p.Jenis === '2a')?.Nominal || 0
              const p2b = (item.Pelean || []).find((p) => p.Jenis === '2b')?.Nominal || 0
              const totalPelean = p1a + p1b + p2a + p2b

              rows.push({
                id: item.IdSesi,
                huria: h.NamaHuria,
                namaSesi: item.NamaSesi,
                tanggal: item.Tanggal,
                jamMulai: item.JamMulai,
                jumlahHadir: item.JumlahHadir,
                pelean1a: p1a,
                pelean1b: p1b,
                pelean2a: p2a,
                pelean2b: p2b,
                totalPelean,
              })
            }
          })
        } else if (selectedTable === 'AlokasiTransaksi') {
          ;(h.AlokasiTransaksi || []).forEach((item) => {
            const parent = (h.PemasukanJemaat || []).find((t) => t.IdTransaksi === item.IdTransaksi)
            if (parent && !isDateInFilter(parent.Tanggal)) return

            rows.push({
              id: item.IdAlokasi,
              huria: h.NamaHuria,
              idTransaksi: item.IdTransaksi,
              peruntukan: item.Peruntukan,
              nominal: item.Nominal,
              tanggal: parent?.Tanggal || '-',
            })
          })
        } else if (selectedTable === 'SetoranPusat') {
          ;(h.SetoranPusat || []).forEach((item) => {
            if (isDateInFilter(item.TanggalSetor)) {
              rows.push({
                id: item.IdSetoran,
                huria: h.NamaHuria,
                periode: item.Periode,
                tanggalSetor: item.TanggalSetor,
                totalSetoran: item.TotalSetoran,
                keterangan: item.Keterangan || 'Setoran Pusat',
              })
            }
          })
        } else if (selectedTable === 'RincianSetoranPusat') {
          ;(h.RincianSetoranPusat || []).forEach((item) => {
            rows.push({
              id: item.IdRincian,
              huria: h.NamaHuria,
              idSetoran: item.IdSetoran,
              idAlokasi: item.IdAlokasi,
              nominalDilunasi: item.NominalDilunasi,
            })
          })
        } else if (selectedTable === 'KategoriPemasukan') {
          ;(h.KategoriPemasukan || []).forEach((item) => {
            rows.push({
              id: item.IdKategori,
              huria: h.NamaHuria,
              namaKategori: item.NamaKategori,
              kategoriInduk: item.IdKategoriInduk || '-',
            })
          })
        } else if (selectedTable === 'Lunggu') {
          ;(h.Lunggu || []).forEach((item) => {
            rows.push({
              id: item.IdLunggu,
              huria: h.NamaHuria,
              namaLunggu: item.NamaLunggu,
              keterangan: item.Keterangan || '-',
            })
          })
        }
      })
    }

    return rows
  }, [filteredHurias, selectedTable, filters, huriaFinancialMap])

  const isAdmin = (user?.role || '').toLowerCase() === 'admin'

  // Metrik aktif & preset yang tersedia
  const currentTableMetrics = TABLE_METRICS[selectedTable] || []
  const activeMetricObj =
    currentTableMetrics.find((m) => m.id === selectedMetric) ||
    currentTableMetrics[0]

  const activeMetricPresets = useMemo(() => {
    if (selectedTable === 'SesiIbadah' && selectedMetric === 'totalPelean') {
      return [
        { id: 'lt_5m', label: '< 5 Juta', min: null, max: 5000000 },
        { id: '5m_20m', label: '5 – 20 Juta', min: 5000000, max: 20000000 },
        { id: 'gt_20m', label: '> 20 Juta', min: 20000000, max: null },
      ]
    }
    if (METRIC_PRESETS[selectedMetric]) {
      return METRIC_PRESETS[selectedMetric]
    }
    if (activeMetricObj?.isCurrency !== false) {
      return [
        { id: 'lt_1m', label: '< 1 Juta', min: null, max: 1000000 },
        { id: '1m_5m', label: '1 – 5 Juta', min: 1000000, max: 5000000 },
        { id: 'gt_5m', label: '> 5 Juta', min: 5000000, max: null },
      ]
    }
    return [
      { id: 'lt_100', label: '< 100 Jiwa', min: null, max: 100 },
      { id: '100_500', label: '100 – 500 Jiwa', min: 100, max: 500 },
      { id: 'gt_500', label: '> 500 Jiwa', min: 500, max: null },
    ]
  }, [selectedTable, selectedMetric, activeMetricObj])

  // Predikat pengecekan ambang batas
  const passesRange = (val) => {
    if (val === undefined || val === null) return false
    const num = Number(val)
    if (isNaN(num)) return true

    if (rangeMode === 'preset') {
      if (rangePreset === 'all') return true
      const found = activeMetricPresets.find((p) => p.id === rangePreset)
      if (!found) return true
      if (found.min !== null && num < found.min) return false
      if (found.max !== null && num > found.max) return false
      return true
    }

    if (rangeMode === 'operator') {
      if (rangeVal === '' || isNaN(Number(rangeVal))) return true
      const target = Number(rangeVal)
      if (rangeOp === '<') return num < target
      if (rangeOp === '<=') return num <= target
      if (rangeOp === '>') return num > target
      if (rangeOp === '>=') return num >= target
      if (rangeOp === '=') return num === target
    }

    return true
  }

  const activeFilterLabel = useMemo(() => {
    if (!activeMetricObj) return null
    const metricName = activeMetricObj.label
    const isCurr = activeMetricObj.isCurrency !== false

    if (rangeMode === 'preset') {
      if (rangePreset === 'all') return null
      const found = activeMetricPresets.find((p) => p.id === rangePreset)
      return `${metricName}: ${found?.label || rangePreset}`
    }

    if (rangeMode === 'operator') {
      if (rangeVal === '') return null
      const valStr = isCurr
        ? formatRupiah(Number(rangeVal))
        : `${rangeVal} ${activeMetricObj.unit}`
      const opSign = rangeOp === '<=' ? '≤' : rangeOp === '>=' ? '≥' : rangeOp
      return `${metricName} ${opSign} ${valStr}`
    }

    return null
  }, [
    activeMetricObj,
    rangeMode,
    rangePreset,
    rangeOp,
    rangeVal,
    activeMetricPresets,
  ])

  // Filter dengan Universal Range & Search Term & Sorting
  const filteredData = useMemo(() => {
    let list = rawTableData

    // 1. Terapkan filter ambang batas jika aktif
    const isFilterActive =
      (rangeMode === 'preset' && rangePreset !== 'all') ||
      (rangeMode === 'operator' && rangeVal !== '')

    if (isFilterActive && selectedMetric) {
      list = list.filter((row) => passesRange(row[selectedMetric]))
    }

    // 2. Pencarian teks
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      list = list.filter((row) =>
        Object.values(row).some((val) => String(val).toLowerCase().includes(q))
      )
    }

    // 3. Pengurutan (Sorting) Konsisten & Stabil
    if (sortField) {
      list = [...list].sort((a, b) => {
        let aVal = a[sortField]
        let bVal = b[sortField]

        // Null / undefined handling
        if (aVal === null || aVal === undefined) return sortDirection === 'asc' ? 1 : -1
        if (bVal === null || bVal === undefined) return sortDirection === 'asc' ? -1 : 1

        let diff = 0

        // 1. Numerik (angka murni atau string numerik)
        const aNum =
          typeof aVal === 'number'
            ? aVal
            : typeof aVal === 'string' && aVal.trim() !== '' && !isNaN(Number(aVal))
            ? Number(aVal)
            : NaN
        const bNum =
          typeof bVal === 'number'
            ? bVal
            : typeof bVal === 'string' && bVal.trim() !== '' && !isNaN(Number(bVal))
            ? Number(bVal)
            : NaN

        if (!isNaN(aNum) && !isNaN(bNum)) {
          diff = aNum - bNum
        }
        // 2. Tanggal ISO (YYYY-MM-DD)
        else if (
          typeof aVal === 'string' &&
          typeof bVal === 'string' &&
          /^\d{4}-\d{2}-\d{2}/.test(aVal) &&
          /^\d{4}-\d{2}-\d{2}/.test(bVal)
        ) {
          diff = new Date(aVal).getTime() - new Date(bVal).getTime()
        }
        // 3. Teks alfanumerik alami dengan bahasa Indonesia
        else {
          diff = String(aVal).localeCompare(String(bVal), 'id', {
            numeric: true,
            sensitivity: 'base',
          })
        }

        // 4. Stable tie-breaker: jika nilainya identik, urutkan sekunder berdasarkan id agar konsisten di setiap halaman
        if (diff === 0) {
          const aId = String(a.id || a.idTransaksi || a.tanggal || '')
          const bId = String(b.id || b.idTransaksi || b.tanggal || '')
          diff = aId.localeCompare(bId, 'id', { numeric: true })
        }

        return sortDirection === 'asc' ? diff : -diff
      })
    }

    return list
  }, [
    rawTableData,
    rangeMode,
    rangePreset,
    rangeOp,
    rangeVal,
    selectedMetric,
    searchTerm,
    sortField,
    sortDirection,
    activeMetricPresets,
  ])

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      const numericFields = new Set([
        'nominal',
        'totalPelean',
        'totalPemasukan',
        'totalSetoranPusat',
        'totalSetoran',
        'nominalDilunasi',
        'avgPeleanPerMinggu',
        'jumlahHadir',
        'avgKehadiran',
        'jumlahMinggu',
        'pelean1a',
        'pelean1b',
        'pelean2a',
        'pelean2b',
      ])
      setSortDirection(numericFields.has(field) ? 'desc' : 'asc')
    }
    setCurrentPage(1)
  }

  // Helper render header kolom tabel dengan indikator sort yang visual dan konsisten
  const renderSortableHeader = (field, label, align = 'left', extraClass = '') => {
    const isSorted = sortField === field
    const isAsc = isSorted && sortDirection === 'asc'
    const isDesc = isSorted && sortDirection === 'desc'

    return (
      <th
        key={field}
        onClick={() => handleSort(field)}
        title={
          isSorted
            ? `Urutan: ${isAsc ? 'Menaik / Ascending (A-Z, 0-9)' : 'Menurun / Descending (Z-A, 9-0)'}. Klik untuk membalik.`
            : `Klik untuk mengurutkan berdasarkan ${label}`
        }
        className={`p-3 font-bold uppercase tracking-wider cursor-pointer select-none transition-all group ${
          align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
        } ${
          isSorted
            ? 'bg-primary-100/80 text-primary font-black ring-1 ring-inset ring-primary/30 shadow-2xs'
            : 'hover:text-primary hover:bg-primary-100/40 text-primary/80'
        } ${extraClass}`}
      >
        <div
          className={`flex items-center gap-1.5 ${
            align === 'right'
              ? 'justify-end'
              : align === 'center'
              ? 'justify-center'
              : 'justify-start'
          }`}
        >
          <span>{label}</span>
          <span className="shrink-0 transition-transform">
            {isAsc ? (
              <ArrowUp className="w-3.5 h-3.5 text-primary stroke-[2.8]" />
            ) : isDesc ? (
              <ArrowDown className="w-3.5 h-3.5 text-primary stroke-[2.8]" />
            ) : (
              <ArrowUpDown className="w-3 h-3 text-muted/50 group-hover:text-primary transition-colors" />
            )}
          </span>
        </div>
      </th>
    )
  }

  // Handler pergantian tabel
  const handleSelectTable = (tableId) => {
    setSelectedTable(tableId)
    setCurrentPage(1)
    setSelectedRows(new Set())
    setIsTableDropdownOpen(false)

    // Set default metric & sort for this table
    const availableMetrics = TABLE_METRICS[tableId] || []
    if (availableMetrics.length > 0) {
      setSelectedMetric(availableMetrics[0].id)
      setSortField(availableMetrics[0].id)
      setSortDirection('desc')
    } else {
      setSelectedMetric('')
      setSortField('')
    }
    setRangePreset('all')
    setRangeVal('')
  }

  // Handler pergantian metrik yang difilter
  const handleSelectMetric = (metricId) => {
    setSelectedMetric(metricId)
    setSortField(metricId)
    setSortDirection('desc')
    setRangePreset('all')
    setRangeVal('')
    setCurrentPage(1)
  }

  // Handler reset filter
  const handleResetFilter = () => {
    setRangePreset('all')
    setRangeVal('')
    setCurrentPage(1)
  }

  // Pagination calculation
  const totalItems = filteredData.length
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredData.slice(start, start + itemsPerPage)
  }, [filteredData, currentPage, itemsPerPage])

  // Checkbox row selections
  const allCurrentPageSelected =
    paginatedData.length > 0 && paginatedData.every((row) => selectedRows.has(row.id))
  const someCurrentPageSelected =
    paginatedData.some((row) => selectedRows.has(row.id)) && !allCurrentPageSelected

  const toggleSelectAllPage = (check) => {
    const next = new Set(selectedRows)
    if (check) {
      paginatedData.forEach((row) => next.add(row.id))
    } else {
      paginatedData.forEach((row) => next.delete(row.id))
    }
    setSelectedRows(next)
  }

  const toggleSelectRow = (id) => {
    const next = new Set(selectedRows)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedRows(next)
  }

  // Export to CSV
  const handleExportCSV = () => {
    const dataToExport =
      selectedRows.size > 0
        ? filteredData.filter((r) => selectedRows.has(r.id))
        : filteredData
    exportToCSV(
      dataToExport,
      `tabel_${selectedTable}_${new Date().toISOString().substring(0, 10)}.csv`
    )
  }

  const tableList = [
    {
      id: 'RingkasanHuria',
      dbName: 'ringkasan_keuangan_huria',
      label: 'Ringkasan Keuangan Gereja (Huria)',
    },
    { id: 'PemasukanJemaat', dbName: 'pemasukan_jemaat', label: 'Pemasukan Jemaat' },
    { id: 'SesiIbadah', dbName: 'sesi_ibadah', label: 'Sesi Ibadah & Pelean' },
    { id: 'AlokasiTransaksi', dbName: 'alokasi_transaksi', label: 'Alokasi Transaksi' },
    { id: 'SetoranPusat', dbName: 'setoran_pusat', label: 'Setoran Pusat' },
    {
      id: 'RincianSetoranPusat',
      dbName: 'rincian_setoran_pusat',
      label: 'Rincian Setoran Pusat',
    },
    { id: 'KategoriPemasukan', dbName: 'kategori_pemasukan', label: 'Kategori Pemasukan' },
    { id: 'Lunggu', dbName: 'lunggu', label: 'Lunggu (Sektor)' },
  ]

  const activeTableMeta = tableList.find((t) => t.id === selectedTable) || tableList[0]

  return (
    <div className="flex flex-col gap-5 w-full font-sans">
      {/* 1. PAGE TITLE & SUBTITLE */}
      <div className="w-full">
        <div className="text-xs font-bold text-muted tracking-wider uppercase mb-1">
          HKBP · Pelaporan & Analisis
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
              Data tabel
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1">
              {(user?.role || '').toLowerCase() === 'admin'
                ? `Data tabel dibatasi khusus untuk catatan jemaat & transaksi keuangan ${user?.namaHuria || 'gereja Anda'}.`
                : 'Telusuri, saring dengan rentang nominal, dan kelola data keuangan gereja dengan terstruktur.'}
            </p>
          </div>
          <div className="text-xs font-semibold text-muted">
            16 Oktober 2026
          </div>
        </div>
      </div>

      {/* 2. TABLE CARD CONTAINER */}
      <div className="relative bg-surface rounded-2xl border border-line shadow-xs w-full">
        {/* Table Title Bar */}
        <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between gap-3 min-w-0 rounded-t-2xl">
          <div className="min-w-0 flex-1 pr-2">
            <div className="text-[11px] font-mono text-muted mb-0.5 truncate">
              {activeTableMeta.dbName}
            </div>
            <div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
              <h2 className="text-base sm:text-lg font-bold text-ink whitespace-nowrap shrink-0">
                {activeTableMeta.label}
              </h2>
              <span className="text-[11px] font-semibold text-primary bg-primary-50 px-2.5 py-0.5 rounded-full border border-primary-100 whitespace-nowrap shrink-0">
                {totalItems} baris dalam cakupan
              </span>
            </div>
          </div>

          {/* Right Toolbar Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted/60 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Cari baris..."
                className="h-9 w-32 sm:w-36 md:w-44 pl-8 pr-3 rounded-full border border-line bg-canvas text-ink text-xs outline-none focus:bg-surface focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30 transition-all"
              />
            </div>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              className="h-9 px-3 sm:px-3.5 rounded-full border border-line bg-surface text-ink text-xs font-semibold flex items-center gap-1.5 hover:bg-primary-50 hover:text-primary transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-muted" />
              <span>Ekspor CSV</span>
            </button>

            {/* Dropdown "Tabel ditampilkan" */}
            <div ref={dropdownRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsTableDropdownOpen(!isTableDropdownOpen)}
                className={`h-9 px-3 sm:px-3.5 rounded-full border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all max-w-[180px] sm:max-w-[230px] ${
                  isTableDropdownOpen
                    ? 'border-primary ring-2 ring-primary-400/30 bg-surface text-primary'
                    : 'border-line bg-surface text-ink hover:border-primary-300'
                }`}
                title={`Tabel: ${activeTableMeta.label}`}
              >
                <TableIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">Tabel: {activeTableMeta.label}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-muted transition-transform shrink-0 ${
                    isTableDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Panel Dropdown */}
              {isTableDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-surface rounded-2xl shadow-xl border border-line p-2 z-50 animate-in fade-in duration-100 max-h-[380px] overflow-y-auto">
                  <div className="text-[11px] font-bold text-muted px-3 py-1.5 uppercase tracking-wider">
                    Pilih Tabel Data
                  </div>
                  {tableList.map((t) => {
                    const isSelected = selectedTable === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSelectTable(t.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer text-left transition-colors ${
                          isSelected
                            ? 'bg-primary-50 text-primary font-bold'
                            : 'text-ink hover:bg-canvas'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <TableIcon
                            className={`w-4 h-4 ${
                              isSelected ? 'text-primary' : 'text-muted'
                            }`}
                          />
                          <span>{t.label}</span>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-primary stroke-[2.5]" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sub-bar: Filter Ambang Batas Universal */}
        {currentTableMetrics.length > 0 && (
          <div className="px-5 py-3.5 bg-canvas/60 border-b border-line flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Kiri: Pilihan Parameter & Mode Ambang Batas */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                  <span>Filter Ambang Batas:</span>
                </div>

                {/* Metric Selector Dropdown */}
                {currentTableMetrics.length > 1 ? (
                  <div className="relative">
                    <select
                      value={selectedMetric}
                      onChange={(e) => handleSelectMetric(e.target.value)}
                      className="h-8 pl-3 pr-7 rounded-xl bg-surface border border-line text-xs font-bold text-ink outline-none cursor-pointer hover:border-primary-300 focus:border-primary shadow-2xs transition-all appearance-none"
                    >
                      {currentTableMetrics.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-muted pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
                  </div>
                ) : (
                  <span className="text-xs font-bold text-ink bg-surface px-2.5 py-1 rounded-lg border border-line shadow-2xs">
                    {currentTableMetrics[0]?.label}
                  </span>
                )}

                {/* Mode Selector Tabs (Pilihan Cepat & Ambang Batas) */}
                <div className="inline-flex bg-surface rounded-xl p-0.5 border border-line shadow-2xs items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setRangeMode('preset')
                      setCurrentPage(1)
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      rangeMode === 'preset'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-muted hover:text-ink hover:bg-canvas'
                    }`}
                  >
                    Pilihan Cepat
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRangeMode('operator')
                      setRangePreset('all')
                      setCurrentPage(1)
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      rangeMode === 'operator'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-muted hover:text-ink hover:bg-canvas'
                    }`}
                  >
                    Ambang Batas (&lt;, &gt;)
                  </button>
                </div>
              </div>

              {/* Kanan: Active filter summary & Reset Button */}
              {activeFilterLabel && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">
                    Filter aktif: <strong className="text-primary font-bold">{activeFilterLabel}</strong> (Menampilkan{' '}
                    <strong className="text-ink">{totalItems}</strong> baris)
                  </span>
                  <button
                    type="button"
                    onClick={handleResetFilter}
                    className="flex items-center gap-1 text-[11px] font-bold text-muted hover:text-danger hover:underline cursor-pointer ml-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
              )}
            </div>

            {/* Baris Kedua: Input berdasarkan Mode yang dipilih */}
            <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-line/60">
              {rangeMode === 'preset' && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-semibold text-muted mr-1">Pilihan Cepat:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setRangePreset('all')
                      setCurrentPage(1)
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      rangePreset === 'all'
                        ? 'bg-ink text-white shadow-xs'
                        : 'bg-surface text-muted border border-line hover:text-ink hover:bg-canvas'
                    }`}
                  >
                    Semua Nilai
                  </button>
                  {activeMetricPresets.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setRangePreset(opt.id)
                        setCurrentPage(1)
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        rangePreset === opt.id
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-surface text-muted border border-line hover:text-ink hover:bg-canvas'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {rangeMode === 'operator' && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[11px] font-semibold text-muted">Kondisi Ambang Batas:</span>
                  <div className="flex items-center gap-1.5 bg-surface px-2 py-1 rounded-xl border border-line shadow-2xs">
                    <select
                      value={rangeOp}
                      onChange={(e) => {
                        setRangeOp(e.target.value)
                        setCurrentPage(1)
                      }}
                      className="h-7 px-2 rounded-lg bg-canvas border border-line text-xs font-bold text-ink outline-none cursor-pointer"
                    >
                      <option value="<">&lt; (Kurang dari)</option>
                      <option value="<=">&le; (Kurang dari sama dengan)</option>
                      <option value=">">&gt; (Lebih dari)</option>
                      <option value=">=">&ge; (Lebih dari sama dengan)</option>
                      <option value="=">= (Sama dengan)</option>
                    </select>
                    <div className="flex items-center gap-1 bg-canvas px-2 h-7 rounded-lg border border-line">
                      {activeMetricObj?.isCurrency !== false && (
                        <span className="text-[11px] font-bold text-muted">Rp</span>
                      )}
                      <input
                        type="number"
                        value={rangeVal}
                        onChange={(e) => {
                          setRangeVal(e.target.value)
                          setCurrentPage(1)
                        }}
                        placeholder={activeMetricObj?.isCurrency !== false ? '1000000' : '100'}
                        className="w-28 sm:w-32 text-xs font-semibold text-ink outline-none bg-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. TABLE BODY */}
        <div className="overflow-x-auto relative">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-primary-50 text-primary border-b border-line">
                {/* Column 1: Checkbox (Sticky) */}
                <th className="p-3 w-12 sticky left-0 bg-primary-50 z-10">
                  <HkCheckbox
                    checked={allCurrentPageSelected}
                    indeterminate={someCurrentPageSelected}
                    onChange={toggleSelectAllPage}
                  />
                </th>

                {selectedTable === 'RingkasanHuria' && (
                  <>
                    {renderSortableHeader('huria', 'Gereja (Huria)', 'left', 'min-w-[160px]')}
                    {renderSortableHeader('resort', 'Resort', 'left')}
                    {renderSortableHeader('distrik', 'Distrik', 'left')}
                    {renderSortableHeader('jumlahMinggu', 'Minggu', 'right', 'whitespace-nowrap')}
                    {renderSortableHeader('avgPeleanPerMinggu', 'Rata-rata / Minggu', 'right', 'whitespace-nowrap')}
                    {renderSortableHeader('totalPelean', 'Total Pelean', 'right', 'whitespace-nowrap')}
                    {renderSortableHeader('totalPemasukan', 'Total Pemasukan', 'right', 'whitespace-nowrap')}
                    {renderSortableHeader('totalSetoranPusat', 'Setoran Pusat', 'right', 'whitespace-nowrap')}
                    {renderSortableHeader('avgKehadiran', 'Kehadiran (Rata²)', 'right', 'whitespace-nowrap')}
                    {renderSortableHeader('kategori', 'Status Ambang', 'center', 'whitespace-nowrap')}
                  </>
                )}

                {selectedTable === 'PemasukanJemaat' && (
                  <>
                    {renderSortableHeader('id', 'ID', 'left', 'min-w-[140px]')}
                    {renderSortableHeader('huria', 'Huria', 'left')}
                    {renderSortableHeader('resort', 'Resort', 'left')}
                    {renderSortableHeader('tanggal', 'Tanggal', 'left', 'whitespace-nowrap')}
                    {renderSortableHeader('kategori', 'Kategori', 'left')}
                    {renderSortableHeader('nominal', 'Nominal', 'right', 'whitespace-nowrap')}
                    {renderSortableHeader('keterangan', 'Keterangan', 'left')}
                  </>
                )}

                {selectedTable === 'SesiIbadah' && (
                  <>
                    {renderSortableHeader('id', 'ID', 'left')}
                    {renderSortableHeader('huria', 'Huria', 'left')}
                    {renderSortableHeader('namaSesi', 'Sesi Ibadah', 'left')}
                    {renderSortableHeader('tanggal', 'Tanggal', 'left', 'whitespace-nowrap')}
                    {renderSortableHeader('jumlahHadir', 'Kehadiran', 'right', 'whitespace-nowrap')}
                    {renderSortableHeader('pelean1a', 'Pelean 1a', 'right', 'whitespace-nowrap')}
                    {renderSortableHeader('pelean1b', 'Pelean 1b', 'right', 'whitespace-nowrap')}
                    {renderSortableHeader('pelean2a', 'Pelean 2a', 'right', 'whitespace-nowrap')}
                    {renderSortableHeader('pelean2b', 'Pelean 2b', 'right', 'whitespace-nowrap')}
                    {renderSortableHeader('totalPelean', 'Total Pelean', 'right', 'whitespace-nowrap')}
                  </>
                )}

                {selectedTable === 'AlokasiTransaksi' && (
                  <>
                    {renderSortableHeader('id', 'ID Alokasi', 'left')}
                    {renderSortableHeader('huria', 'Huria', 'left')}
                    {renderSortableHeader('idTransaksi', 'ID Transaksi', 'left')}
                    {renderSortableHeader('peruntukan', 'Peruntukan', 'left')}
                    {renderSortableHeader('nominal', 'Nominal', 'right', 'whitespace-nowrap')}
                  </>
                )}

                {selectedTable === 'SetoranPusat' && (
                  <>
                    {renderSortableHeader('id', 'ID Setoran', 'left')}
                    {renderSortableHeader('huria', 'Huria', 'left')}
                    {renderSortableHeader('periode', 'Periode', 'left')}
                    {renderSortableHeader('tanggalSetor', 'Tanggal Setor', 'left', 'whitespace-nowrap')}
                    {renderSortableHeader('totalSetoran', 'Total Setoran', 'right', 'whitespace-nowrap')}
                  </>
                )}

                {selectedTable === 'RincianSetoranPusat' && (
                  <>
                    {renderSortableHeader('id', 'ID Rincian', 'left')}
                    {renderSortableHeader('huria', 'Huria', 'left')}
                    {renderSortableHeader('idSetoran', 'ID Setoran', 'left')}
                    {renderSortableHeader('idAlokasi', 'ID Alokasi', 'left')}
                    {renderSortableHeader('nominalDilunasi', 'Nominal Dilunasi', 'right', 'whitespace-nowrap')}
                  </>
                )}

                {selectedTable === 'KategoriPemasukan' && (
                  <>
                    {renderSortableHeader('id', 'ID Kategori', 'left')}
                    {renderSortableHeader('huria', 'Huria', 'left')}
                    {renderSortableHeader('namaKategori', 'Nama Kategori', 'left')}
                    {renderSortableHeader('kategoriInduk', 'Kategori Induk', 'left')}
                  </>
                )}

                {selectedTable === 'Lunggu' && (
                  <>
                    {renderSortableHeader('id', 'ID Lunggu', 'left')}
                    {renderSortableHeader('huria', 'Huria', 'left')}
                    {renderSortableHeader('namaLunggu', 'Nama Lunggu (Sektor)', 'left')}
                    {renderSortableHeader('keterangan', 'Keterangan', 'left')}
                  </>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-line">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-muted">
                    Tidak ada data yang sesuai dengan pencarian atau filter aktif
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => {
                  const isChecked = selectedRows.has(row.id)
                  return (
                    <tr
                      key={row.id}
                      className={`h-12 transition-colors ${
                        isChecked ? 'bg-primary-50/70' : 'hover:bg-primary-50/50'
                      }`}
                    >
                      {/* Checkbox column (Sticky) */}
                      <td className="p-3 sticky left-0 bg-surface z-5">
                        <HkCheckbox
                          checked={isChecked}
                          onChange={() => toggleSelectRow(row.id)}
                        />
                      </td>

                      {selectedTable === 'RingkasanHuria' && (
                        <>
                          <td className="p-3 font-bold text-ink">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span className="truncate max-w-[200px]">{row.huria}</span>
                            </div>
                          </td>
                          <td className="p-3 text-muted">{row.resort}</td>
                          <td className="p-3 text-muted">{row.distrik}</td>
                          <td className="p-3 text-right text-muted tabular-nums font-medium whitespace-nowrap">
                            {row.jumlahMinggu} Minggu
                          </td>
                          <td
                            className={`p-3 text-right tabular-nums whitespace-nowrap ${
                              selectedMetric === 'avgPeleanPerMinggu'
                                ? 'font-extrabold text-primary bg-primary-50/50'
                                : 'font-semibold text-ink'
                            }`}
                          >
                            {formatRupiah(row.avgPeleanPerMinggu)}
                          </td>
                          <td
                            className={`p-3 text-right tabular-nums whitespace-nowrap ${
                              selectedMetric === 'totalPelean'
                                ? 'font-extrabold text-primary bg-primary-50/50'
                                : 'font-semibold text-ink'
                            }`}
                          >
                            {formatRupiah(row.totalPelean)}
                          </td>
                          <td
                            className={`p-3 text-right tabular-nums whitespace-nowrap ${
                              selectedMetric === 'totalPemasukan'
                                ? 'font-extrabold text-primary bg-primary-50/50'
                                : 'font-medium text-muted'
                            }`}
                          >
                            {formatRupiah(row.totalPemasukan)}
                          </td>
                          <td
                            className={`p-3 text-right tabular-nums whitespace-nowrap ${
                              selectedMetric === 'totalSetoranPusat'
                                ? 'font-extrabold text-primary bg-primary-50/50'
                                : 'font-medium text-muted'
                            }`}
                          >
                            {formatRupiah(row.totalSetoranPusat)}
                          </td>
                          <td
                            className={`p-3 text-right tabular-nums whitespace-nowrap ${
                              selectedMetric === 'avgKehadiran'
                                ? 'font-extrabold text-primary bg-primary-50/50'
                                : 'font-medium text-muted'
                            }`}
                          >
                            {row.avgKehadiran > 0 ? `${row.avgKehadiran} Jiwa` : '-'}
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                row.avgPeleanPerMinggu === 0
                                  ? 'bg-canvas text-muted border-line'
                                  : row.avgPeleanPerMinggu < 1000000
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : row.avgPeleanPerMinggu <= 5000000
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {row.kategori}
                            </span>
                          </td>
                        </>
                      )}

                      {selectedTable === 'PemasukanJemaat' && (
                        <>
                          <td className="p-3 font-mono text-muted">#{row.id}</td>
                          <td className="p-3 font-semibold text-ink">{row.huria}</td>
                          <td className="p-3 text-muted">{row.resort}</td>
                          <td className="p-3 text-muted">{formatDate(row.tanggal)}</td>
                          <td className="p-3">
                            <span className="inline-flex px-2.5 py-0.5 rounded-full bg-primary-50 border border-primary-100 text-[11px] font-semibold text-primary">
                              {row.kategori}
                            </span>
                          </td>
                          <td className="p-3 text-right font-bold text-ink bg-primary-50/30">
                            {formatRupiah(row.nominal)}
                          </td>
                          <td className="p-3 text-muted">{row.keterangan || '-'}</td>
                        </>
                      )}

                      {selectedTable === 'SesiIbadah' && (
                        <>
                          <td className="p-3 font-mono text-muted">#{row.id}</td>
                          <td className="p-3 font-semibold text-ink">{row.huria}</td>
                          <td className="p-3 font-medium text-ink">{row.namaSesi}</td>
                          <td className="p-3 text-muted">{formatDate(row.tanggal)}</td>
                          <td
                            className={`p-3 text-right font-semibold ${
                              selectedMetric === 'jumlahHadir'
                                ? 'text-primary font-bold bg-primary-50/50'
                                : 'text-ink'
                            }`}
                          >
                            {row.jumlahHadir} Jiwa
                          </td>
                          <td
                            className={`p-3 text-right ${
                              selectedMetric === 'pelean1a'
                                ? 'font-bold text-primary bg-primary-50/50'
                                : 'text-muted'
                            }`}
                          >
                            {formatRupiah(row.pelean1a)}
                          </td>
                          <td
                            className={`p-3 text-right ${
                              selectedMetric === 'pelean1b'
                                ? 'font-bold text-primary bg-primary-50/50'
                                : 'text-muted'
                            }`}
                          >
                            {formatRupiah(row.pelean1b)}
                          </td>
                          <td
                            className={`p-3 text-right ${
                              selectedMetric === 'pelean2a'
                                ? 'font-bold text-primary bg-primary-50/50'
                                : 'text-muted'
                            }`}
                          >
                            {formatRupiah(row.pelean2a)}
                          </td>
                          <td
                            className={`p-3 text-right ${
                              selectedMetric === 'pelean2b'
                                ? 'font-bold text-primary bg-primary-50/50'
                                : 'text-muted'
                            }`}
                          >
                            {formatRupiah(row.pelean2b)}
                          </td>
                          <td
                            className={`p-3 text-right font-bold ${
                              selectedMetric === 'totalPelean'
                                ? 'text-primary bg-primary-50/50'
                                : 'text-ink'
                            }`}
                          >
                            {formatRupiah(row.totalPelean)}
                          </td>
                        </>
                      )}

                      {selectedTable === 'AlokasiTransaksi' && (
                        <>
                          <td className="p-3 font-mono text-muted">#{row.id}</td>
                          <td className="p-3 font-semibold text-ink">{row.huria}</td>
                          <td className="p-3 font-mono text-muted">#{row.idTransaksi}</td>
                          <td className="p-3">
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                row.peruntukan === 'Kas Huria'
                                  ? 'bg-success/15 text-success border-success/30'
                                  : 'bg-primary-50 text-primary border-primary-100'
                              }`}
                            >
                              {row.peruntukan}
                            </span>
                          </td>
                          <td className="p-3 text-right font-bold text-ink bg-primary-50/30">
                            {formatRupiah(row.nominal)}
                          </td>
                        </>
                      )}

                      {selectedTable === 'SetoranPusat' && (
                        <>
                          <td className="p-3 font-mono text-muted">#{row.id}</td>
                          <td className="p-3 font-semibold text-ink">{row.huria}</td>
                          <td className="p-3 text-muted">{row.periode}</td>
                          <td className="p-3 text-muted">{formatDate(row.tanggalSetor)}</td>
                          <td className="p-3 text-right font-bold text-primary bg-primary-50/30">
                            {formatRupiah(row.totalSetoran)}
                          </td>
                        </>
                      )}

                      {selectedTable === 'RincianSetoranPusat' && (
                        <>
                          <td className="p-3 font-mono text-muted">#{row.id}</td>
                          <td className="p-3 font-semibold text-ink">{row.huria}</td>
                          <td className="p-3 font-mono text-muted">#{row.idSetoran}</td>
                          <td className="p-3 font-mono text-muted">#{row.idAlokasi}</td>
                          <td className="p-3 text-right font-bold text-primary bg-primary-50/30">
                            {formatRupiah(row.nominalDilunasi)}
                          </td>
                        </>
                      )}

                      {selectedTable === 'KategoriPemasukan' && (
                        <>
                          <td className="p-3 font-mono text-muted">#{row.id}</td>
                          <td className="p-3 font-semibold text-ink">{row.huria}</td>
                          <td className="p-3 font-semibold text-ink">{row.namaKategori}</td>
                          <td className="p-3 text-muted">{row.kategoriInduk}</td>
                        </>
                      )}

                      {selectedTable === 'Lunggu' && (
                        <>
                          <td className="p-3 font-mono text-muted">#{row.id}</td>
                          <td className="p-3 font-semibold text-ink">{row.huria}</td>
                          <td className="p-3 font-semibold text-ink">{row.namaLunggu}</td>
                          <td className="p-3 text-muted">{row.keterangan}</td>
                        </>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. PAGINATION FOOTER */}
        <div className="p-4 border-t border-line flex flex-wrap items-center justify-between gap-3 rounded-b-2xl">
          {/* Info & Rows per page */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted">
              Menampilkan {totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} -{' '}
              {Math.min(currentPage * itemsPerPage, totalItems)} dari {totalItems}
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted">Baris:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="h-8 px-2 rounded-lg border border-line text-xs text-ink bg-surface outline-none cursor-pointer focus:border-primary-500"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {/* Page buttons */}
          <div className="flex items-center gap-1.5">
            {/* Prev */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-lg border border-line bg-surface text-ink hover:bg-primary-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page number buttons */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1
              if (totalPages > 5 && currentPage > 3) {
                pageNum = currentPage - 3 + i
                if (pageNum > totalPages) pageNum = totalPages - 4 + i
              }
              const isActive = currentPage === pageNum

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-primary text-white shadow-xs'
                      : 'border border-line bg-surface text-ink hover:bg-primary-50'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}

            {/* Next */}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-lg border border-line bg-surface text-ink hover:bg-primary-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
