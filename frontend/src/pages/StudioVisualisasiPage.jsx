/**
 * @file StudioVisualisasiPage.jsx
 * Halaman Studio Visualisasi & Komparasi Data HKBP.
 * Fitur:
 * - Filter Wilayah berjenjang (Distrik -> Resort -> Huria) di 1 section bersambung.
 * - 1 Filtering Waktu tunggal di atas visualisasi (dalam Parameter Visualisasi),
 *   menggantikan dimensi X-Axis dan terhubung langsung ke visualisasi.
 * - Kategori dan jenis transaksi digabung ke dalam pilihan Sumber Data.
 * - Visualisasi akurat dan presisi sesuai kombinasi entitas wilayah dan waktu.
 */

import { useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  Download,
  Settings2,
  PieChart as PieIcon,
  LineChart as LineIcon,
  BarChart2,
  GitCompare,
  TrendingUp,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { formatRupiah, formatCompactRupiah, exportToCSV, getISOWeek } from '../utils/formatters'
import {
  SvgBarChart,
  SvgLineChart,
  SvgDonutChart,
  ComparisonGroupedBarChart,
} from '../components/charts/InteractiveCharts'
import { useOrganisasiFilter } from '../hooks/useOrganisasiFilter'
import { OrganisasiFilterBar } from '../components/OrganisasiFilterBar'
import { PeriodeFilter } from '../components/PeriodeFilter'

// Metadata Sumber Data & Kategori untuk display dan ekspor CSV
const DATA_SOURCE_META = {
  'pemasukan': { sumber: 'Pemasukan Jemaat', kategori: 'Semua Kategori Pemasukan', unit: 'Rp' },
  'pemasukan::Pelean Minggu': { sumber: 'Pemasukan Jemaat', kategori: 'Pelean Minggu', unit: 'Rp' },
  'pemasukan::Iuran Taon': { sumber: 'Pemasukan Jemaat', kategori: 'Iuran Taon (Guguan)', unit: 'Rp' },
  'pemasukan::Pesta Gotilon': { sumber: 'Pemasukan Jemaat', kategori: 'Pesta Gotilon', unit: 'Rp' },
  'pemasukan::Hamuliateon': { sumber: 'Pemasukan Jemaat', kategori: 'Hamuliateon', unit: 'Rp' },
  'pemasukan::Pelean Lunggu': { sumber: 'Pemasukan Jemaat', kategori: 'Pelean Lunggu / Lingkungan', unit: 'Rp' },
  'pemasukan::Ulaon Na Badia': { sumber: 'Pemasukan Jemaat', kategori: 'Ulaon Na Badia (Perjamuan Kudus)', unit: 'Rp' },
  'pemasukan::Pamasumasuon': { sumber: 'Pemasukan Jemaat', kategori: 'Pamasumasuon (Pernikahan)', unit: 'Rp' },
  'pelean': { sumber: 'Pelean Sesi Ibadah', kategori: 'Semua Jenis Pelean', unit: 'Rp' },
  'pelean::1a': { sumber: 'Pelean Sesi Ibadah', kategori: 'Pelean Sesi 1a (I-A)', unit: 'Rp' },
  'pelean::1b': { sumber: 'Pelean Sesi Ibadah', kategori: 'Pelean Sesi 1b (I-B)', unit: 'Rp' },
  'pelean::2a': { sumber: 'Pelean Sesi Ibadah', kategori: 'Pelean Sesi 2a (II-A)', unit: 'Rp' },
  'pelean::2b': { sumber: 'Pelean Sesi Ibadah', kategori: 'Pelean Sesi 2b (II-B)', unit: 'Rp' },
  'alokasi': { sumber: 'Alokasi Transaksi', kategori: 'Semua Alokasi Transaksi', unit: 'Rp' },
  'alokasi::Setoran Pusat': { sumber: 'Alokasi Transaksi', kategori: 'Setoran Pusat (55%)', unit: 'Rp' },
  'alokasi::Kas Huria': { sumber: 'Alokasi Transaksi', kategori: 'Kas Huria (45%)', unit: 'Rp' },
  'kehadiran': { sumber: 'Kehadiran Jemaat', kategori: 'Semua Sesi Kehadiran', unit: 'Jiwa' },
  'kehadiran::Pagi': { sumber: 'Kehadiran Jemaat', kategori: 'Sesi Pagi (Ibadah Pagi)', unit: 'Jiwa' },
  'kehadiran::Siang': { sumber: 'Kehadiran Jemaat', kategori: 'Sesi Siang (Ibadah Siang)', unit: 'Jiwa' },
  'kehadiran::Sore': { sumber: 'Kehadiran Jemaat', kategori: 'Sesi Sore / Sekolah Minggu', unit: 'Jiwa' },
}

// Opsi dan label metrik agregasi
const METRIC_OPTIONS = [
  { id: 'SUM', label: 'Total' },
  { id: 'AVG', label: 'Rata-rata' },
  { id: 'COUNT', label: 'Jumlah' },
]

const METRIC_LABELS = {
  SUM: 'Total',
  AVG: 'Rata-rata',
  COUNT: 'Jumlah',
}

export const StudioVisualisasiPage = ({ wilayahData = [], filters = {}, onFilterChange }) => {
  const { user } = useAuth()
  const organisasiFilter = useOrganisasiFilter({ user, liveWilayahData: wilayahData })

  // 1. Parameter Visualisasi
  // Sumber Data menggabungkan kategori / jenis transaksi
  const [dataSource, setDataSource] = useState('pemasukan')
  const [metric, setMetric] = useState('SUM') // 'SUM' | 'AVG' | 'COUNT'
  const [chartType, setChartType] = useState('line') // 'line' | 'bar' | 'pie'

  // Tabel Ringkasan Sorting
  const [tableSortField, setTableSortField] = useState('total')
  const [tableSortDirection, setTableSortDirection] = useState('desc')

  const handleTableSort = (field) => {
    if (tableSortField === field) {
      setTableSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setTableSortField(field)
      const numericFields = new Set(['total', 'avg', 'peak', 'share'])
      setTableSortDirection(numericFields.has(field) ? 'desc' : 'asc')
    }
  }

  const renderComparisonHeader = (field, label, align = 'left', extraClass = '') => {
    const isSorted = tableSortField === field
    const isAsc = isSorted && tableSortDirection === 'asc'
    const isDesc = isSorted && tableSortDirection === 'desc'

    return (
      <th
        onClick={() => handleTableSort(field)}
        title={
          isSorted
            ? `Urutan: ${isAsc ? 'Menaik / Ascending' : 'Menurun / Descending'}. Klik untuk membalik.`
            : `Klik untuk mengurutkan berdasarkan ${label}`
        }
        className={`py-2.5 px-3 font-semibold cursor-pointer select-none transition-colors group ${
          align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
        } ${
          isSorted
            ? 'bg-primary-100/70 text-primary font-bold'
            : 'text-muted hover:text-primary hover:bg-primary-100/30'
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
              <ArrowUp className="w-3 h-3 text-primary stroke-[2.5]" />
            ) : isDesc ? (
              <ArrowDown className="w-3 h-3 text-primary stroke-[2.5]" />
            ) : (
              <ArrowUpDown className="w-3 h-3 text-muted/40 group-hover:text-primary transition-colors" />
            )}
          </span>
        </div>
      </th>
    )
  }

  // Colors Palette
  const palette = [
    'var(--color-chart-1)',
    'var(--color-chart-2)',
    'var(--color-chart-3)',
    'var(--color-chart-4)',
    'var(--color-chart-5)',
    'var(--color-chart-6)',
  ]

  // Flatten Hierarki Wilayah (Pusat -> Distrik -> Resort -> Huria)
  const distriks = useMemo(() => wilayahData[0]?.Pusat?.Distrik || [], [wilayahData])

  const { allDistriks, allResorts, allHurias } = useMemo(() => {
    const dList = []
    const rList = []
    const hList = []

    distriks.forEach((d) => {
      const distrikHurias = []
        ; (d.Resort || []).forEach((res) => {
          const resortHurias = []
            ; (res.Huria || []).forEach((h) => {
              const enrichedHuria = {
                ...h,
                distrikName: d.NamaDistrik,
                resortName: res.NamaResort,
                huriaName: h.NamaHuria,
              }
              resortHurias.push(enrichedHuria)
              distrikHurias.push(enrichedHuria)
              hList.push(enrichedHuria)
            })
          rList.push({
            id: res.IdResort || res.NamaResort,
            name: res.NamaResort,
            distrikName: d.NamaDistrik,
            hurias: resortHurias,
            churches: resortHurias,
          })
        })
      dList.push({
        id: d.IdDistrik || d.NamaDistrik,
        name: d.NamaDistrik,
        hurias: distrikHurias,
        churches: distrikHurias,
      })
    })

    return {
      allDistriks: dList,
      allResorts: rList,
      allHurias: hList,
    }
  }, [distriks])

  const isAdmin = (user?.role || '').toLowerCase() === 'admin'

  // 2. Entitas Pembanding dari organisasiFilter
  const comparisonLevel = organisasiFilter.level || 'huria'

  const comparedEntities = useMemo(() => {
    if (isAdmin) {
      const huriaName = user?.namaHuria || 'HKBP Sudirman'
      const huriaId = user?.idHuria || 'H-1.1.1'
      const matchedHurias = allHurias.filter(
        (h) =>
          (huriaId && (h.IdHuria === huriaId || String(h.IdHuria).startsWith(huriaId) || huriaId.startsWith(String(h.IdHuria)))) ||
          (huriaName && (
            h.NamaHuria === huriaName ||
            (h.NamaHuria || '').toLowerCase() === huriaName.toLowerCase() ||
            (h.NamaHuria || '').includes(huriaName) ||
            huriaName.includes(h.NamaHuria)
          ))
      )

      return [
        {
          id: String(huriaId),
          name: huriaName,
          hurias: matchedHurias.length > 0 ? matchedHurias : allHurias.slice(0, 1),
          churches: matchedHurias.length > 0 ? matchedHurias : allHurias.slice(0, 1),
          color: palette[0],
        },
      ]
    }

    if (organisasiFilter.items.length > 0) {
      return organisasiFilter.items.map((item, idx) => {
        let matchedHurias = []
        if (organisasiFilter.level === 'huria') {
          matchedHurias = allHurias.filter(
            (h) =>
              h.NamaHuria === item.nama ||
              h.IdHuria === item.id ||
              h.nama === item.nama ||
              (item.nama && (h.NamaHuria || '').toLowerCase() === item.nama.toLowerCase())
          )
        } else if (organisasiFilter.level === 'resort') {
          const r = allResorts.find((x) => x.name === item.nama || x.id === item.id)
          matchedHurias = r?.hurias || []
        } else {
          const d = allDistriks.find((x) => x.name === item.nama || x.id === item.id)
          matchedHurias = d?.hurias || []
        }

        return {
          id: String(item.id),
          name: item.nama,
          hurias: matchedHurias,
          churches: matchedHurias,
          color: palette[idx % palette.length],
        }
      })
    }
    return []
  }, [isAdmin, user, allHurias, allResorts, allDistriks, palette, organisasiFilter.items, organisasiFilter.level])

  // 3. Helper Cek Tanggal Sesuai Filter Waktu Aktif (Tahun, Bulan, Minggu)
  const isDateInFilter = (dateStr) => {
    if (!dateStr) return false
    const { mode, tahun, bulan, mingguISO } = organisasiFilter.periode
    const yr = tahun || '2026'

    if (mode === 'tahun') {
      return dateStr.startsWith(`${yr}-`) || dateStr === yr
    }
    if (mode === 'bulan') {
      const m = (bulan || '01').padStart(2, '0')
      return dateStr.startsWith(`${yr}-${m}`)
    }
    if (mode === 'minggu') {
      if (!dateStr.startsWith(`${yr}-`)) return false
      const w = parseInt(mingguISO || '1', 10)
      return getISOWeek(dateStr) === w
    }
    return dateStr.startsWith(`${yr}-`) || dateStr === yr
  }

  // 4. Agregasi Data Visualisasi Akurat Berdasarkan Filter Waktu & Wilayah
  const { chartData, series, entityStats, totalOverall, timeAxisTitle, periodBadgeLabel } =
    useMemo(() => {
      const { mode, tahun, bulan, mingguISO } = organisasiFilter.periode
      const currentYear = tahun || '2026'

      const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
      const mKeys = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))

      // Map: [slotKey] -> { label, counts: {}, sums: {} }
      const dimMap = new Map()

      const ensureSlot = (key, label) => {
        if (!dimMap.has(key)) {
          dimMap.set(key, { label, counts: {}, sums: {} })
        }
        return dimMap.get(key)
      }

      let timeTitle = 'Bulan'
      let badgeLabel = `Tahun ${currentYear}`

      // Pre-populate slot urut berdasarkan mode waktu
      if (mode === 'tahun') {
        timeTitle = `Bulan (${currentYear})`
        badgeLabel = `Tahun ${currentYear}`
        mKeys.forEach((k, idx) => {
          ensureSlot(k, mNames[idx])
        })
      } else if (mode === 'bulan') {
        const bIdx = parseInt(bulan || '1', 10) - 1
        const bName = mNames[bIdx] || 'Bulan'
        timeTitle = `Minggu di ${bName} ${currentYear}`
        badgeLabel = `${bName} ${currentYear}`
        ensureSlot('w1', 'Mg 1 (1-7)')
        ensureSlot('w2', 'Mg 2 (8-14)')
        ensureSlot('w3', 'Mg 3 (15-21)')
        ensureSlot('w4', 'Mg 4 (22-28)')
        ensureSlot('w5', 'Mg 5 (29-31)')
      } else if (mode === 'minggu') {
        timeTitle = `Hari di Minggu ke-${mingguISO || '1'} (${currentYear})`
        badgeLabel = `W-${mingguISO || '1'} (${currentYear})`
        const dayLabels = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
        for (let d = 1; d <= 7; d++) {
          ensureSlot(`d${d}`, dayLabels[d - 1])
        }
      }

      // Slot generator untuk tiap record
      const getSlotForDate = (dateStr) => {
        if (!dateStr) return { key: 'other', label: 'Lainnya' }

        if (mode === 'tahun') {
          const m = parseInt(dateStr.substring(5, 7) || '1', 10)
          const k = String(m).padStart(2, '0')
          return { key: k, label: mNames[m - 1] || k }
        }

        if (mode === 'bulan') {
          const day = parseInt(dateStr.substring(8, 10) || '1', 10)
          if (day <= 7) return { key: 'w1', label: 'Mg 1 (1-7)' }
          if (day <= 14) return { key: 'w2', label: 'Mg 2 (8-14)' }
          if (day <= 21) return { key: 'w3', label: 'Mg 3 (15-21)' }
          if (day <= 28) return { key: 'w4', label: 'Mg 4 (22-28)' }
          return { key: 'w5', label: 'Mg 5 (29-31)' }
        }

        if (mode === 'minggu') {
          const d = new Date(dateStr)
          const dayOfWeek = (d.getDay() + 6) % 7 + 1 // 1=Sen, 7=Min
          const dayLabels = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
          return { key: `d${dayOfWeek}`, label: dayLabels[dayOfWeek - 1] || `Hari ${dayOfWeek}` }
        }

        return { key: 'other', label: 'Lainnya' }
      }

      // Parse Sumber Data dan Kategori / Jenis
      const [primarySource, subCategory] = dataSource.split('::')

      // Hitung agregasi per entitas
      comparedEntities.forEach((ent) => {
        const entKey = ent.id

        ent.churches.forEach((g) => {
          if (primarySource === 'pemasukan') {
            ; (g.PemasukanJemaat || []).forEach((pj) => {
              if (!isDateInFilter(pj.Tanggal)) return

              // Filter subkategori pemasukan jika dipilih
              if (subCategory) {
                const cat = (g.KategoriPemasukan || []).find((c) => c.IdKategori === pj.IdKategori)
                const rawName = (cat?.NamaKategori || pj.Keterangan || '').toLowerCase()
                const subLower = subCategory.toLowerCase()

                if (!rawName.includes(subLower)) {
                  // Fallback pencocokan sinonim nama transaksi HKBP
                  if (
                    subLower.includes('iuran') &&
                    (rawName.includes('guguan') || rawName.includes('iuran') || rawName.includes('taon'))
                  ) {
                    // Match
                  } else if (
                    subLower.includes('lunggu') &&
                    (rawName.includes('partangiangan') || rawName.includes('lunggu') || rawName.includes('lingkungan'))
                  ) {
                    // Match
                  } else {
                    return
                  }
                }
              }

              const { key, label } = getSlotForDate(pj.Tanggal)
              const slot = ensureSlot(key, label)
              slot.sums[entKey] = (slot.sums[entKey] || 0) + (pj.Nominal || 0)
              slot.counts[entKey] = (slot.counts[entKey] || 0) + 1
            })
          } else if (primarySource === 'pelean') {
            ; (g.SesiIbadah || []).forEach((s) => {
              if (!isDateInFilter(s.Tanggal)) return

                ; (s.Pelean || []).forEach((p) => {
                  if (subCategory && p.Jenis !== subCategory) return

                  const { key, label } = getSlotForDate(s.Tanggal)
                  const slot = ensureSlot(key, label)
                  slot.sums[entKey] = (slot.sums[entKey] || 0) + (p.Nominal || 0)
                  slot.counts[entKey] = (slot.counts[entKey] || 0) + 1
                })
            })
          } else if (primarySource === 'alokasi') {
            ; (g.AlokasiTransaksi || []).forEach((al) => {
              const parent = (g.PemasukanJemaat || []).find((t) => t.IdTransaksi === al.IdTransaksi)
              if (!parent || !isDateInFilter(parent.Tanggal)) return

              if (subCategory && al.Peruntukan !== subCategory) return

              const { key, label } = getSlotForDate(parent.Tanggal)
              const slot = ensureSlot(key, label)
              slot.sums[entKey] = (slot.sums[entKey] || 0) + (al.Nominal || 0)
              slot.counts[entKey] = (slot.counts[entKey] || 0) + 1
            })
          } else if (primarySource === 'kehadiran') {
            ; (g.SesiIbadah || []).forEach((s) => {
              if (!isDateInFilter(s.Tanggal)) return

              if (subCategory) {
                const nameLower = (s.NamaSesi || '').toLowerCase()
                if (!nameLower.includes(subCategory.toLowerCase())) return
              }

              const { key, label } = getSlotForDate(s.Tanggal)
              const slot = ensureSlot(key, label)
              slot.sums[entKey] = (slot.sums[entKey] || 0) + (s.JumlahHadir || 0)
              slot.counts[entKey] = (slot.counts[entKey] || 0) + 1
            })
          }
        })
      })

      // Series data
      const sList = comparedEntities.map((ent) => ({
        key: ent.id,
        label: ent.name,
        color: ent.color,
      }))

      // Tracking statistik per entitas
      const stats = {}
      comparedEntities.forEach((ent) => {
        stats[ent.id] = {
          name: ent.name,
          color: ent.color,
          total: 0,
          count: 0,
          peakVal: 0,
          peakLabel: '-',
        }
      })

      let overallSum = 0
      let highestVal = 0

      // Bangun baris chart
      const rows = Array.from(dimMap.entries()).map(([slotKey, slotData]) => {
        const row = { key: slotKey, label: slotData.label }

        comparedEntities.forEach((ent) => {
          const entSum = slotData.sums[ent.id] || 0
          const entCount = slotData.counts[ent.id] || 0

          let val = entSum
          if (metric === 'AVG') {
            val = entCount > 0 ? Math.round(entSum / entCount) : 0
          } else if (metric === 'COUNT') {
            val = entCount
          }

          row[ent.id] = val
          overallSum += val
          if (val > highestVal) highestVal = val

          const s = stats[ent.id]
          if (s) {
            s.total += val
            s.count += entCount
            if (val > s.peakVal) {
              s.peakVal = val
              s.peakLabel = slotData.label
            }
          }
        })

        if (comparedEntities.length === 1) {
          row.value = row[comparedEntities[0].id] || 0
        }

        return row
      })

      return {
        chartData: rows,
        series: sList,
        entityStats: stats,
        totalOverall: overallSum,
        maxOverall: highestVal,
        timeAxisTitle: timeTitle,
        periodBadgeLabel: badgeLabel,
      }
    }, [comparedEntities, dataSource, metric, organisasiFilter.periode])

  // Donut data untuk perbandingan proporsi entitas
  const donutData = useMemo(() => {
    if (comparedEntities.length === 0) return []
    return comparedEntities.map((ent) => {
      const stat = entityStats[ent.id] || {}
      return {
        label: ent.name,
        value: stat.total || 0,
        color: ent.color,
      }
    })
  }, [comparedEntities, entityStats])

  // Data Tabel Perbandingan yang terurut secara stabil & konsisten
  const sortedComparedEntities = useMemo(() => {
    return [...comparedEntities].sort((a, b) => {
      const statA = entityStats[a.id] || { total: 0, count: 0, peakVal: 0 }
      const statB = entityStats[b.id] || { total: 0, count: 0, peakVal: 0 }
      const shareA = totalOverall > 0 ? (statA.total / totalOverall) * 100 : 0
      const shareB = totalOverall > 0 ? (statB.total / totalOverall) * 100 : 0
      const avgA = chartData.length > 0 ? statA.total / chartData.length : 0
      const avgB = chartData.length > 0 ? statB.total / chartData.length : 0

      let diff = 0
      if (tableSortField === 'name') {
        diff = a.name.localeCompare(b.name, 'id', { numeric: true })
      } else if (tableSortField === 'level') {
        diff = String(comparisonLevel).localeCompare(String(comparisonLevel))
      } else if (tableSortField === 'total') {
        diff = statA.total - statB.total
      } else if (tableSortField === 'avg') {
        diff = avgA - avgB
      } else if (tableSortField === 'peak') {
        diff = statA.peakVal - statB.peakVal
      } else if (tableSortField === 'share') {
        diff = shareA - shareB
      }
      if (diff === 0) {
        diff = String(a.id).localeCompare(String(b.id), 'id', { numeric: true })
      }
      return tableSortDirection === 'asc' ? diff : -diff
    })
  }, [comparedEntities, entityStats, totalOverall, chartData, tableSortField, tableSortDirection, comparisonLevel])

  // CSV Export: Menampilkan informasi wilayah & filtering serta data visualisasi persis seperti yang tampil
  const handleExportCSV = () => {
    if (!comparedEntities.length || !chartData.length) {
      alert('Tidak ada data visualisasi untuk diekspor. Silakan pilih minimal 1 wilayah terlebih dahulu.')
      return
    }

    const meta = DATA_SOURCE_META[dataSource] || {
      sumber: dataSource,
      kategori: 'Umum',
      unit: 'Nilai',
    }

    const levelLabel =
      comparisonLevel === 'huria'
        ? 'Huria (Gereja)'
        : comparisonLevel === 'resort'
          ? 'Resort'
          : 'Distrik'

    const entityNames = comparedEntities.map((e) => e.name).join('; ')
    const timeFilterModeLabel =
      organisasiFilter.periode.mode === 'tahun'
        ? `Per Tahun (${periodBadgeLabel})`
        : organisasiFilter.periode.mode === 'bulan'
          ? `Per Bulan (${periodBadgeLabel})`
          : `Per Minggu (${periodBadgeLabel})`

    const metricLabel = METRIC_LABELS[metric] || 'Total'

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""'
      return `"${String(val).replace(/"/g, '""')}"`
    }

    const lines = []

    // 1. INFORMASI PARAMETER & FILTERING
    lines.push(escapeCSV('LAPORAN HASIL VISUALISASI DATA HKBP'))
    lines.push(`${escapeCSV('Waktu Ekspor')},${escapeCSV(new Date().toLocaleString('id-ID'))}`)
    lines.push('')
    lines.push(escapeCSV('PARAMETER & FILTER AKTIF'))
    lines.push(`${escapeCSV('Sumber Data')},${escapeCSV(meta.sumber)}`)
    lines.push(`${escapeCSV('Kategori / Jenis')},${escapeCSV(meta.kategori)}`)
    lines.push(`${escapeCSV('Filter Waktu')},${escapeCSV(timeFilterModeLabel)}`)
    lines.push(`${escapeCSV('Tingkat Wilayah')},${escapeCSV(levelLabel)}`)
    lines.push(`${escapeCSV('Wilayah yang Ditampilkan')},${escapeCSV(entityNames)}`)
    lines.push(`${escapeCSV('Metrik Agregasi')},${escapeCSV(metricLabel)}`)
    lines.push('')

    // 2. DATA DERET WAKTU VISUALISASI
    lines.push(escapeCSV('DATA DERET WAKTU VISUALISASI'))
    const tableHeaders = [
      timeAxisTitle,
      ...comparedEntities.map((e) => e.name),
    ]
    if (comparedEntities.length > 1) {
      tableHeaders.push('Total Semua Wilayah')
    }
    tableHeaders.push('Sumber Data', 'Kategori', 'Filter Waktu', 'Tingkat Wilayah')
    lines.push(tableHeaders.map(escapeCSV).join(','))

    const columnSums = {}
    comparedEntities.forEach((e) => {
      columnSums[e.id] = 0
    })
    let totalAllColumns = 0

    chartData.forEach((row) => {
      let rowTotal = 0
      const rowValues = [escapeCSV(row.label)]

      comparedEntities.forEach((ent) => {
        const val = row[ent.id] || 0
        columnSums[ent.id] = (columnSums[ent.id] || 0) + val
        rowTotal += val
        rowValues.push(val)
      })

      if (comparedEntities.length > 1) {
        rowValues.push(rowTotal)
      }
      totalAllColumns += rowTotal

      rowValues.push(
        escapeCSV(meta.sumber),
        escapeCSV(meta.kategori),
        escapeCSV(periodBadgeLabel),
        escapeCSV(levelLabel)
      )

      lines.push(rowValues.join(','))
    })

    // Baris TOTAL KESELURUHAN
    const totalRow = [escapeCSV('TOTAL KESELURUHAN')]
    comparedEntities.forEach((ent) => {
      totalRow.push(columnSums[ent.id] || 0)
    })
    if (comparedEntities.length > 1) {
      totalRow.push(totalAllColumns)
    }
    totalRow.push(
      escapeCSV(meta.sumber),
      escapeCSV(meta.kategori),
      escapeCSV(periodBadgeLabel),
      escapeCSV(levelLabel)
    )
    lines.push(totalRow.join(','))

    lines.push('')

    // 3. RINGKASAN & STATISTIK WILAYAH
    lines.push(escapeCSV('--- RINGKASAN & STATISTIK WILAYAH ---'))
    const summaryHeaders = [
      'Nama Wilayah / Entitas',
      'Tingkat Wilayah',
      `Total Nilai ${meta.unit === 'Rp' ? '(Nominal)' : '(Jiwa)'}`,
      'Total Terformat',
      'Kontribusi (%)',
      'Rata-rata per Periode',
      'Nilai Tertinggi (Puncak)',
    ]
    lines.push(summaryHeaders.map(escapeCSV).join(','))

    comparedEntities.forEach((ent) => {
      const stat = entityStats[ent.id] || { total: 0, peakVal: 0, peakLabel: '-' }
      const totalVal = stat.total || 0
      const pct = totalOverall > 0 ? ((totalVal / totalOverall) * 100).toFixed(2) + '%' : '0%'
      const avg = chartData.length > 0 ? Math.round(totalVal / chartData.length) : 0
      const peakFormatted = `${meta.unit === 'Rp' ? formatRupiah(stat.peakVal) : stat.peakVal} (${stat.peakLabel})`
      const totalFormatted = meta.unit === 'Rp' ? formatRupiah(totalVal) : `${totalVal.toLocaleString('id-ID')} Jiwa`

      lines.push([
        escapeCSV(ent.name),
        escapeCSV(levelLabel),
        totalVal,
        escapeCSV(totalFormatted),
        escapeCSV(pct),
        avg,
        escapeCSV(peakFormatted),
      ].join(','))
    })

    const csvContent = lines.join('\r\n')
    const safeSource = dataSource.replace(/::/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
    const safePeriod = periodBadgeLabel.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
    const safeFileName = `hkbp_visualisasi_${safeSource}_${safePeriod}.csv`

    exportToCSV(csvContent, safeFileName)
  }

  const isMultiEntity = comparedEntities.length >= 2

  return (
    <div className="flex flex-col gap-5 w-full font-sans">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 w-full">
        <div>
          <div className="text-xs font-bold text-muted tracking-wider uppercase mb-1 flex items-center gap-1.5">
            <span>HKBP · Studio Analisis & Visualisasi</span>
            {(user?.role || '').toLowerCase() === 'admin' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                {user?.namaHuria || 'Admin Huria'}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            {(user?.role || '').toLowerCase() === 'admin'
              ? `Visualisasi Data ${user?.namaHuria || 'Gereja'}`
              : 'Visualisasi & Komparasi Data'}
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            {(user?.role || '').toLowerCase() === 'admin'
              ? `Analisis tren penerimaan, formula sentralisasi 55% & 45%, serta kehadiran jemaat khusus untuk ${user?.namaHuria || 'gereja Anda'}.`
              : 'Bandingkan data antar distrik, resort, atau huria berdasarkan filter wilayah dan waktu secara akurat.'}
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="h-9 px-4 rounded-full bg-primary text-white text-xs font-semibold flex items-center gap-2 hover:bg-primary-700 active:bg-primary-900 shadow-xs cursor-pointer transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-white" />
          <span>Ekspor Hasil (CSV)</span>
        </button>
      </div>

      {/* 2. FILTER WILAYAH (Khusus SuperAdmin) */}
      {!isAdmin && <OrganisasiFilterBar filterState={organisasiFilter} />}

      {/* 3. VISUALIZATION CANVAS & METRICS ATAU EMPTY STATE */}
      {comparedEntities.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-line p-10 sm:p-14 text-center flex flex-col items-center justify-center gap-3.5 shadow-xs w-full">
          <div className="w-14 h-14 rounded-2xl bg-primary-50 text-primary flex items-center justify-center border border-primary-100 shadow-2xs">
            <GitCompare className="w-7 h-7 text-primary" />
          </div>
          <div className="max-w-md">
            <h3 className="text-base sm:text-lg font-bold text-ink m-0">
              Belum Ada Wilayah yang Dipilih
            </h3>
            <p className="text-xs sm:text-sm text-muted mt-2 mb-0 leading-relaxed">
              Silakan pilih minimal satu wilayah pada filter <strong>Lingkup Wilayah</strong> di atas untuk memunculkan visualisasi grafik dan tabel komparasi data.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* 3. PARAMETER VISUALISASI (Termasuk 1 Filtering Waktu Tunggal di Atas Visualisasi) */}
          <div className="bg-surface rounded-2xl border border-line p-4 sm:p-5 shadow-xs w-full">
            <div className="flex items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-line">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-ink">
                  Parameter Visualisasi
                </span>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 text-primary border border-primary-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {user?.namaHuria || 'Huria Anda'}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted hidden sm:inline">
                Periode: <strong className="text-ink">{periodBadgeLabel}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
              {/* 1. Sumber Data & Kategori (Span 4) */}
              <div className="lg:col-span-4 flex flex-col justify-end">
                <label className="block text-xs font-semibold text-muted mb-1 truncate">
                  1. Sumber Data & Kategori
                </label>
                <select
                  value={dataSource}
                  onChange={(e) => setDataSource(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-line bg-surface text-ink text-xs font-semibold outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30 cursor-pointer shadow-2xs"
                >
                  <optgroup label="Pemasukan Jemaat">
                    <option value="pemasukan">Semua Kategori Pemasukan</option>
                    <option value="pemasukan::Pelean Minggu">Pelean Minggu</option>
                    <option value="pemasukan::Iuran Taon">Iuran Taon (Guguan)</option>
                    <option value="pemasukan::Pesta Gotilon">Pesta Gotilon</option>
                    <option value="pemasukan::Hamuliateon">Hamuliateon</option>
                    <option value="pemasukan::Pelean Lunggu">Pelean Lunggu / Lingkungan</option>
                    <option value="pemasukan::Ulaon Na Badia">Ulaon Na Badia (Perjamuan Kudus)</option>
                    <option value="pemasukan::Pamasumasuon">Pamasumasuon (Pernikahan)</option>
                  </optgroup>
                  <optgroup label="Pelean Sesi Ibadah">
                    <option value="pelean">Semua Jenis Pelean (1a, 1b, 2a, 2b)</option>
                    <option value="pelean::1a">Pelean Sesi: Jenis 1a (I-A)</option>
                    <option value="pelean::1b">Pelean Sesi: Jenis 1b (I-B)</option>
                    <option value="pelean::2a">Pelean Sesi: Jenis 2a (II-A)</option>
                    <option value="pelean::2b">Pelean Sesi: Jenis 2b (II-B)</option>
                  </optgroup>
                  <optgroup label="Alokasi Transaksi">
                    <option value="alokasi">Semua Alokasi Transaksi</option>
                    <option value="alokasi::Setoran Pusat">Alokasi: Setoran Pusat (55%)</option>
                    <option value="alokasi::Kas Huria">Alokasi: Kas Huria (45%)</option>
                  </optgroup>
                  <optgroup label="Kehadiran Jemaat">
                    <option value="kehadiran">Semua Sesi Kehadiran</option>
                    <option value="kehadiran::Pagi">Sesi Pagi (Ibadah Pagi)</option>
                    <option value="kehadiran::Siang">Sesi Siang (Ibadah Siang)</option>
                    <option value="kehadiran::Sore">Sesi Sore / Sekolah Minggu</option>
                  </optgroup>
                </select>
              </div>

              {/* 2. Filtering Waktu (Menggantikan Dimensi X-Axis) (Span 4) */}
              <div className="lg:col-span-4 flex flex-col justify-end">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                  <PeriodeFilter
                    periode={organisasiFilter.periode}
                    onChange={organisasiFilter.setPeriode}
                  />
                </div>
              </div>

              {/* 3. Metrik Agregasi (Span 2) */}
              <div className="lg:col-span-2 flex flex-col justify-end">
                <label className="block text-xs font-semibold text-muted mb-1 truncate">
                  3. Metrik Agregasi
                </label>
                <div className="flex bg-canvas rounded-xl p-1 border border-line h-10 items-center shadow-2xs">
                  {METRIC_OPTIONS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMetric(m.id)}
                      className={`flex-1 h-full rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center justify-center ${metric === m.id
                          ? 'bg-primary text-white shadow-xs'
                          : 'text-muted hover:text-ink'
                        }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Tipe Grafik (Span 2) */}
              <div className="lg:col-span-2 flex flex-col justify-end">
                <label className="block text-xs font-semibold text-muted mb-1 truncate">
                  4. Tipe Grafik
                </label>
                <div className="flex bg-canvas rounded-xl p-1 border border-line h-10 items-center shadow-2xs">
                  {[
                    { id: 'line', label: 'Garis', icon: LineIcon },
                    { id: 'bar', label: 'Batang', icon: BarChart2 },
                    { id: 'pie', label: 'Lingkaran', icon: PieIcon },
                  ].map((t) => {
                    const Icon = t.icon
                    const isActive = chartType === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setChartType(t.id)}
                        className={`flex-1 h-full flex items-center justify-center gap-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${isActive
                            ? 'bg-primary text-white shadow-xs'
                            : 'text-muted hover:text-ink'
                          }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-muted'}`} />
                        <span className="hidden sm:inline">{t.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 4. VISUALIZATION CANVAS CARD */}
          <div className="bg-surface rounded-2xl border border-line p-4 sm:p-5 shadow-xs w-full">
            {/* Header Ringkasan & Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-line">
              <div>
                <div className="text-xs text-muted font-medium flex items-center gap-1.5">
                  <span>
                    Total Akumulasi {isMultiEntity ? `(${comparedEntities.length} Entitas)` : ''} ({METRIC_LABELS[metric]})
                  </span>
                  <span className="text-muted/40">•</span>
                  <span className="text-primary font-semibold">{periodBadgeLabel}</span>
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-ink tracking-tight">
                  {dataSource.startsWith('kehadiran') || metric === 'COUNT'
                    ? new Intl.NumberFormat('id-ID').format(totalOverall)
                    : formatRupiah(totalOverall)}
                </div>
              </div>

              {/* Entity Legend Badges */}
              <div className="flex flex-wrap items-center gap-2 max-w-full">
                {comparedEntities.map((ent) => {
                  const stat = entityStats[ent.id] || {}
                  const share = totalOverall > 0 ? ((stat.total / totalOverall) * 100).toFixed(1) : 0
                  return (
                    <div
                      key={ent.id}
                      className="flex items-center gap-1.5 bg-canvas px-2.5 py-1 rounded-xl border border-line text-xs"
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ent.color }} />
                      <span className="font-semibold text-ink truncate max-w-[140px]">{ent.name}</span>
                      <span className="text-muted text-[11px] font-normal">
                        {dataSource.startsWith('kehadiran') || metric === 'COUNT'
                          ? formatCompactRupiah(stat.total || 0).replace('Rp ', '')
                          : formatCompactRupiah(stat.total || 0)}
                      </span>
                      {isMultiEntity && (
                        <span className="px-1.5 py-0.2 rounded-md bg-primary-50 text-primary font-bold text-[10px]">
                          {share}%
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Container Grafik */}
            <div className="min-h-[260px] w-full flex items-center justify-center pb-2">
              {chartData.length === 0 ? (
                <div className="text-center text-muted p-6 text-xs">
                  Tidak ada data yang memenuhi kriteria kombinasi wilayah dan waktu ini.
                </div>
              ) : chartType === 'line' ? (
                <SvgLineChart
                  data={chartData}
                  height={240}
                  series={series}
                  valueFormatter={(v) =>
                    dataSource.startsWith('kehadiran') || metric === 'COUNT'
                      ? new Intl.NumberFormat('id-ID').format(v)
                      : formatCompactRupiah(v)
                  }
                />
              ) : chartType === 'bar' ? (
                isMultiEntity ? (
                  <ComparisonGroupedBarChart data={chartData} height={240} series={series} />
                ) : (
                  <SvgBarChart
                    data={chartData}
                    height={240}
                    color={series[0]?.color || 'var(--color-chart-1)'}
                    valueFormatter={(v) =>
                      dataSource.startsWith('kehadiran') || metric === 'COUNT'
                        ? new Intl.NumberFormat('id-ID').format(v)
                        : formatCompactRupiah(v)
                    }
                  />
                )
              ) : (
                <SvgDonutChart
                  data={isMultiEntity ? donutData : chartData}
                  height={220}
                  valueFormatter={(v) =>
                    dataSource.startsWith('kehadiran') || metric === 'COUNT'
                      ? new Intl.NumberFormat('id-ID').format(v)
                      : formatCompactRupiah(v)
                  }
                />
              )}
            </div>
          </div>

          {/* 5. TABEL RINGKASAN PERBANDINGAN */}
          <div className="bg-surface rounded-2xl border border-line p-4 sm:p-5 shadow-xs w-full">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-ink">
                  Tabel Ringkasan Perbandingan
                </span>
              </div>
              <span className="text-xs text-muted">
                Sumber: <strong className="text-ink capitalize">{dataSource.replace('::', ' - ')}</strong> · Metrik:{' '}
                <strong className="text-ink">{METRIC_LABELS[metric]}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-line text-muted font-semibold bg-canvas/60">
                    {renderComparisonHeader('name', 'Entitas / Wilayah', 'left', 'rounded-l-xl')}
                    {renderComparisonHeader('level', 'Tingkat', 'left')}
                    {renderComparisonHeader('total', metric === 'SUM' ? 'Total' : metric === 'AVG' ? 'Rata-rata' : 'Jumlah', 'right')}
                    {renderComparisonHeader('avg', 'Rata-rata / Interval', 'right')}
                    {renderComparisonHeader('peak', 'Interval Puncak', 'center')}
                    {renderComparisonHeader('share', 'Kontribusi (%)', 'right', 'rounded-r-xl')}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {sortedComparedEntities.map((ent) => {
                    const stat = entityStats[ent.id] || { total: 0, count: 0, peakVal: 0, peakLabel: '-' }
                    const sharePct = totalOverall > 0 ? ((stat.total / totalOverall) * 100).toFixed(1) : '0.0'
                    const avgVal = chartData.length > 0 ? Math.round(stat.total / chartData.length) : 0

                    return (
                      <tr key={ent.id} className="hover:bg-primary-50/40 transition-colors">
                        {/* Entity with color badge */}
                        <td className="py-2.5 px-3 font-semibold text-ink">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                              style={{ backgroundColor: ent.color }}
                            />
                            <span className="truncate max-w-[200px]">{ent.name}</span>
                          </div>
                        </td>

                        {/* Level Badge */}
                        <td className="py-2.5 px-3 text-muted capitalize">
                          <span className="px-2 py-0.5 rounded-md bg-canvas border border-line text-[11px] font-medium text-ink">
                            {comparisonLevel}
                          </span>
                        </td>

                        {/* Total Value */}
                        <td className="py-2.5 px-3 text-right font-extrabold text-ink">
                          {dataSource.startsWith('kehadiran') || metric === 'COUNT'
                            ? new Intl.NumberFormat('id-ID').format(stat.total)
                            : formatRupiah(stat.total)}
                        </td>

                        {/* Average per Interval */}
                        <td className="py-2.5 px-3 text-right text-muted">
                          {dataSource.startsWith('kehadiran') || metric === 'COUNT'
                            ? new Intl.NumberFormat('id-ID').format(avgVal)
                            : formatCompactRupiah(avgVal)}
                        </td>

                        {/* Peak Interval */}
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-lg bg-accent/20 text-ink font-bold text-[11px]">
                            {stat.peakLabel}{' '}
                            <span className="text-muted font-normal">
                              ({formatCompactRupiah(stat.peakVal)})
                            </span>
                          </span>
                        </td>

                        {/* Share Percentage + Mini Progress Bar */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-canvas rounded-full overflow-hidden border border-line shrink-0">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, Math.max(4, parseFloat(sharePct)))}%`,
                                  backgroundColor: ent.color,
                                }}
                              />
                            </div>
                            <span className="font-bold text-ink min-w-[38px] text-right">
                              {sharePct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default StudioVisualisasiPage
