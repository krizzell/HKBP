import { useState, useMemo } from 'react'
import {
  GitCompare,
  Download,
  Calendar,
  Building,
  CheckCircle,
  BarChart,
  ArrowUpDown,
  Layers,
  RotateCcw
} from 'lucide-react'
import { formatRupiah, formatCompactRupiah, exportToCSV, getISOWeek } from '../utils/formatters'
import { ComparisonGroupedBarChart } from '../components/charts/InteractiveCharts'
import { HkCheckbox } from '../components/FilterControls'

export const PerbandinganPage = ({ wilayahData = [] }) => {
  // Comparative level: 'distrik' | 'resort' | 'huria' | 'gereja'
  const [level, setLevel] = useState('distrik')

  // Integrated Filter Waktu
  const [timeFilter, setTimeFilter] = useState({
    tahun: '2026',
    bulan: '',
    mingguISO: '',
    startDate: '',
    endDate: '',
  })

  // Selected regions to compare
  const [selectedRegionKeys, setSelectedRegionKeys] = useState([])

  // Helper date check
  const isDateInFilter = (dateStr) => {
    if (!dateStr) return false
    if (timeFilter.tahun && !dateStr.startsWith(timeFilter.tahun)) return false
    if (timeFilter.bulan && dateStr.substring(5, 7) !== timeFilter.bulan) return false
    if (timeFilter.mingguISO && getISOWeek(dateStr) !== parseInt(timeFilter.mingguISO)) return false
    if (timeFilter.startDate && dateStr < timeFilter.startDate) return false
    if (timeFilter.endDate && dateStr > timeFilter.endDate) return false
    return true
  }

  // Extract all regions by level
  const regionsData = useMemo(() => {
    const distriks = wilayahData[0]?.Pusat?.Distrik || []
    const map = new Map()

    distriks.forEach((d) => {
      ;(d.Resort || []).forEach((res) => {
        ;(res.Huria || []).forEach((h) => {
          let key = ''
          let name = ''
          let parentInfo = ''

          if (level === 'distrik') {
            key = d.NamaDistrik
            name = d.NamaDistrik
            parentInfo = 'Pusat HKBP'
          } else if (level === 'resort') {
            key = `${d.NamaDistrik} - ${res.NamaResort}`
            name = res.NamaResort
            parentInfo = d.NamaDistrik
          } else {
            key = `${res.NamaResort} - ${h.NamaHuria}`
            name = h.NamaHuria
            parentInfo = `${res.NamaResort} (${d.NamaDistrik})`
          }

          if (!map.has(key)) {
            map.set(key, {
              key,
              nama: name,
              parentInfo,
              huriaCount: 0,
              totalPemasukan: 0,
              alokasiKas: 0,
              alokasiPusat: 0,
              setoranLunas: 0,
              totalHadir: 0,
              sesiCount: 0,
              trxCount: 0,
            })
          }

          const reg = map.get(key)
          reg.huriaCount += 1

          // Sum Pemasukan
          ;(h.PemasukanJemaat || []).forEach((pj) => {
            if (isDateInFilter(pj.Tanggal)) {
              reg.totalPemasukan += pj.Nominal || 0
              reg.trxCount += 1
            }
          })

          // Sum Alokasi
          ;(h.AlokasiTransaksi || []).forEach((al) => {
            const parent = (h.PemasukanJemaat || []).find((t) => t.IdTransaksi === al.IdTransaksi)
            if (parent && !isDateInFilter(parent.Tanggal)) return

            if (al.Peruntukan !== 'Setoran Pusat') {
              reg.alokasiKas += al.Nominal || 0
            } else if (al.Peruntukan === 'Setoran Pusat') {
              reg.alokasiPusat += al.Nominal || 0
            }
          })

          // Setoran Dilunasi
          ;(h.RincianSetoranPusat || []).forEach((rin) => {
            reg.setoranLunas += rin.NominalDilunasi || 0
          })

          // Sesi Ibadah
          ;(h.SesiIbadah || []).forEach((s) => {
            if (isDateInFilter(s.Tanggal)) {
              reg.totalHadir += s.JumlahHadir || 0
              reg.sesiCount += 1
            }
          })
        })
      })
    })

    return Array.from(map.values())
  }, [wilayahData, level, timeFilter])

  // Active items being compared
  const comparedItems = useMemo(() => {
    if (selectedRegionKeys.length === 0) {
      return regionsData.slice(0, 4)
    }
    return regionsData.filter((r) => selectedRegionKeys.includes(r.key))
  }, [regionsData, selectedRegionKeys])

  // Toggle Region Selection
  const toggleSelectRegion = (key) => {
    if (selectedRegionKeys.includes(key)) {
      setSelectedRegionKeys(selectedRegionKeys.filter((k) => k !== key))
    } else {
      if (selectedRegionKeys.length >= 6) {
        alert('Maksimal 6 entitas wilayah untuk dibandingkan sekaligus.')
        return
      }
      setSelectedRegionKeys([...selectedRegionKeys, key])
    }
  }

  // Export CSV
  const handleExportCSV = () => {
    const csvRows = comparedItems.map((c) => ({
      Wilayah: c.nama,
      'Induk / Wilayah Atas': c.parentInfo,
      'Jumlah Huria': c.huriaCount,
      'Total Pemasukan': c.totalPemasukan,
      'Kas Huria': c.alokasiKas,
      'Alokasi Pusat': c.alokasiPusat,
      'Setoran Dilunasi': c.setoranLunas,
      'Kehadiran Ibadah': c.totalHadir,
    }))
    exportToCSV(csvRows, `komparasi_${level}_${new Date().toISOString().substring(0, 10)}.csv`)
  }

  const months = [
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ]

  return (
    <div className="flex flex-col gap-5 w-full font-sans">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 w-full">
        <div>
          <div className="text-xs font-bold text-muted tracking-wider uppercase mb-1">
            HKBP · Analisis Komparatif
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
              Wilayah & Huria
            </h1>
            <span className="text-xs font-semibold text-primary bg-primary-50 px-2.5 py-0.5 rounded-full border border-primary-100">
              SuperAdmin
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Bandingkan kinerja keuangan dan operasional antar-distrik, resort, atau huria.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="h-10 px-4 rounded-full bg-primary text-white text-xs font-semibold flex items-center gap-2 hover:bg-primary-700 active:bg-primary-900 shadow-xs cursor-pointer transition-colors"
        >
          <Download className="w-4 h-4 text-white" />
          <span>Ekspor Komparasi (CSV)</span>
        </button>
      </div>

      {/* 2. FILTER & LEVEL SELECTION CARD */}
      <div className="bg-surface rounded-2xl border border-line p-5 sm:p-6 shadow-xs w-full">
        {/* Level Selector Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3.5 pb-4 border-b border-line mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted">Tingkat Wilayah:</span>
            <div className="inline-flex bg-canvas p-1 rounded-full border border-line">
              {[
                { id: 'distrik', label: 'Antar-Distrik' },
                { id: 'resort', label: 'Antar-Resort' },
                { id: 'huria', label: 'Antar-Huria' },
              ].map((lvl) => {
                const isActive = level === lvl.id
                return (
                  <button
                    key={lvl.id}
                    onClick={() => {
                      setLevel(lvl.id)
                      setSelectedRegionKeys([])
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    {lvl.label}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            onClick={() => {
              setTimeFilter({
                tahun: '2026',
                bulan: '',
                mingguISO: '',
                startDate: '',
                endDate: '',
              })
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Waktu</span>
          </button>
        </div>

        {/* Time Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Tahun</label>
            <select
              value={timeFilter.tahun}
              onChange={(e) => setTimeFilter({ ...timeFilter, tahun: e.target.value })}
              className="w-full h-9 px-3 rounded-xl border border-line bg-surface text-ink text-xs font-semibold outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
            >
              <option value="">Semua Tahun</option>
              <option value="2026">2026 (Aktif)</option>
              <option value="2025">2025</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Bulan</label>
            <select
              value={timeFilter.bulan}
              onChange={(e) => setTimeFilter({ ...timeFilter, bulan: e.target.value })}
              className="w-full h-9 px-3 rounded-xl border border-line bg-surface text-ink text-xs font-semibold outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
            >
              <option value="">Semua Bulan</option>
              {months.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Minggu ISO</label>
            <select
              value={timeFilter.mingguISO}
              onChange={(e) => setTimeFilter({ ...timeFilter, mingguISO: e.target.value })}
              className="w-full h-9 px-3 rounded-xl border border-line bg-surface text-ink text-xs font-semibold outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
            >
              <option value="">Semua Minggu</option>
              {Array.from({ length: 52 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>Minggu ke-{i + 1}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Dari</label>
            <input
              type="date"
              value={timeFilter.startDate}
              onChange={(e) => setTimeFilter({ ...timeFilter, startDate: e.target.value })}
              className="w-full h-9 px-3 rounded-xl border border-line bg-surface text-ink text-xs outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted mb-1">Sampai</label>
            <input
              type="date"
              value={timeFilter.endDate}
              onChange={(e) => setTimeFilter({ ...timeFilter, endDate: e.target.value })}
              className="w-full h-9 px-3 rounded-xl border border-line bg-surface text-ink text-xs outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
            />
          </div>
        </div>
      </div>

      {/* 3. COMPARISON CHART & SELECTION CHIPS */}
      <div className="bg-surface rounded-2xl border border-line p-5 sm:p-6 shadow-xs w-full">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold text-ink">
              Grafik Komparasi: Pemasukan vs Kas vs Setoran Pusat
            </h3>
            <span className="text-xs text-muted">
              Membandingkan <strong className="text-ink">{comparedItems.length}</strong> entitas
            </span>
          </div>

          {/* Quick select chips */}
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <span className="text-xs text-muted mr-1">Pilih entitas:</span>
            {regionsData.map((r) => {
              const isSelected = selectedRegionKeys.includes(r.key) || (selectedRegionKeys.length === 0 && comparedItems.some((c) => c.key === r.key))
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => toggleSelectRegion(r.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-surface border-line text-ink hover:bg-primary-50'
                  }`}
                >
                  <HkCheckbox checked={isSelected} />
                  <span>{r.nama}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Chart */}
        <div className="mt-5 min-h-[300px]">
          <ComparisonGroupedBarChart
            items={comparedItems.map((c) => ({
              label: c.nama,
              pemasukan: c.totalPemasukan,
              kasHuria: c.alokasiKas,
              setoranPusat: c.alokasiPusat,
            }))}
            height={320}
          />
        </div>
      </div>

      {/* 4. COMPARISON DATA TABLE */}
      <div className="bg-surface rounded-2xl border border-line overflow-hidden shadow-xs w-full">
        <div className="p-4 sm:p-5 border-b border-line">
          <h3 className="text-base font-bold text-ink">
            Tabel Rincian Komparasi
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-primary-50 text-primary border-b border-line">
                <th className="p-3 text-left font-bold uppercase tracking-wider">Wilayah</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider">Induk Wilayah</th>
                <th className="p-3 text-right font-bold uppercase tracking-wider">Huria</th>
                <th className="p-3 text-right font-bold uppercase tracking-wider">Total Pemasukan</th>
                <th className="p-3 text-right font-bold uppercase tracking-wider">Setoran Pusat (55%)</th>
                <th className="p-3 text-right font-bold uppercase tracking-wider">Kas Huria (45%)</th>
                <th className="p-3 text-right font-bold uppercase tracking-wider">Kehadiran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {comparedItems.map((c, idx) => (
                <tr
                  key={c.key || idx}
                  className="h-12 hover:bg-primary-50/60 transition-colors"
                >
                  <td className="p-3 font-bold text-ink">{c.nama}</td>
                  <td className="p-3 text-muted">{c.parentInfo}</td>
                  <td className="p-3 text-right text-muted">{c.huriaCount}</td>
                  <td className="p-3 text-right font-bold text-ink">{formatRupiah(c.totalPemasukan)}</td>
                  <td className="p-3 text-right font-semibold text-ink">{formatRupiah(c.alokasiPusat)}</td>
                  <td className="p-3 text-right font-semibold text-ink">{formatRupiah(c.alokasiKas)}</td>
                  <td className="p-3 text-right text-muted">{new Intl.NumberFormat('id-ID').format(c.totalHadir)} Jiwa</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
