import { useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  Wallet,
  Building2,
  Send,
  Users,
  Download,
  ArrowUpRight,
  ChevronRight,
  TrendingUp,
  Award,
  Layers,
  Scale,
} from 'lucide-react'
import { formatRupiah, formatCompactRupiah, formatDate, exportToCSV } from '../utils/formatters'
import { SvgLineChart } from '../components/charts/InteractiveCharts'
import { Button } from '../components/ui'

// Helper pembersih & standarisasi nama kategori penerimaan HKBP
const cleanCategoryName = (rawName) => {
  if (!rawName) return 'Pelean Minggu'
  const lower = rawName.toLowerCase()
  if (lower.includes('pelean minggu') || lower.includes('ia, ib')) return 'Pelean Minggu'
  if (lower.includes('guguan') || lower.includes('iuran taon') || lower.includes('iuran')) return 'Iuran Taon (Guguan)'
  if (lower.includes('hamuliateon') || lower.includes('syukur')) return 'Hamuliateon (Ucapan Syukur)'
  if (lower.includes('gotilon') || lower.includes('panen')) return 'Pesta Gotilon'
  if (lower.includes('lunggu') || lower.includes('partangiangan') || lower.includes('lingkungan')) return 'Pelean Lunggu / Lingkungan'
  if (lower.includes('ulaon na badia') || lower.includes('perjamuan')) return 'Ulaon Na Badia'
  if (lower.includes('pamasumasuon') || lower.includes('pernikahan')) return 'Pamasumasuon (Pernikahan)'
  if (lower.includes('tardidi') || lower.includes('baptis')) return 'Pelean Tardidi'
  return rawName
}

export const DashboardPage = ({ wilayahData = [], onNavigateTab }) => {
  const { user } = useAuth()
  // Mode tampilan tren alokasi 55% & 45%:
  // 'formula' (Setoran Pusat 55% vs Kas Huria 45% - Default) | 'total' (Total 100% Pemasukan Jemaat)
  const [trendMode, setTrendMode] = useState('formula')

  // Agregasi Konsolidasi Seluruh HKBP (Tanpa Filter Wilayah / Lingkup)
  const {
    totalPemasukan,
    totalKasHuria,
    totalSetoranPusat,
    totalHadir,
    categoryBreakdown,
    trendData,
    recentTransactions,
    peakMonth,
  } = useMemo(() => {
    let pemasukan = 0
    let kas = 0
    let pusat = 0
    let hadir = 0

    const catMap = {}
    const txList = []

    // 12 Bulan Tahun Anggaran 2026
    const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    const mData = mNames.map((lbl, idx) => ({
      key: String(idx + 1).padStart(2, '0'),
      label: lbl,
      pemasukan: 0,
      kas: 0,
      pusat: 0,
    }))

    const distriks = wilayahData[0]?.Pusat?.Distrik || []
    const isAdmin = (user?.role || '').toLowerCase() === 'admin'
    const userHuriaId = user?.idHuria
    const userHuriaName = user?.namaHuria

    distriks.forEach((d) => {
      ;(d.Resort || []).forEach((res) => {
        ;(res.Huria || []).forEach((h) => {
          if (isAdmin) {
            const matchId = userHuriaId && String(h.IdHuria) === String(userHuriaId)
            const matchName =
              userHuriaName &&
              (h.NamaHuria === userHuriaName ||
                (h.NamaHuria || '').toLowerCase() === userHuriaName.toLowerCase() ||
                (h.NamaHuria || '').includes(userHuriaName))
            if (!matchId && !matchName) return
          }

          // Peta Alokasi Transaksi
          const allocMap = new Map()
          ;(h.AlokasiTransaksi || []).forEach((al) => {
            if (!allocMap.has(al.IdTransaksi)) {
              allocMap.set(al.IdTransaksi, { kas: 0, pusat: 0 })
            }
            const item = allocMap.get(al.IdTransaksi)
            if (al.Peruntukan === 'Setoran Pusat') {
              item.pusat += al.Nominal || 0
            } else {
              item.kas += al.Nominal || 0
            }
          })

          // Pemasukan Jemaat
          ;(h.PemasukanJemaat || []).forEach((pj) => {
            const nominal = pj.Nominal || 0
            let pjKas = 0
            let pjPusat = 0

            if (allocMap.has(pj.IdTransaksi)) {
              const alloc = allocMap.get(pj.IdTransaksi)
              pjKas = alloc.kas
              pjPusat = alloc.pusat
            } else {
              pjKas = Math.round(nominal * 0.45)
              pjPusat = Math.round(nominal * 0.55)
            }

            pemasukan += nominal
            kas += pjKas
            pusat += pjPusat

            // Distribusi Bulanan 2026
            if (pj.Tanggal && pj.Tanggal.startsWith('2026-')) {
              const mIdx = parseInt(pj.Tanggal.substring(5, 7), 10) - 1
              if (mIdx >= 0 && mIdx < 12) {
                mData[mIdx].pemasukan += nominal
                mData[mIdx].kas += pjKas
                mData[mIdx].pusat += pjPusat
              }
            }

            // Kategori Pemasukan
            const katObj = (h.KategoriPemasukan || []).find((k) => k.IdKategori === pj.IdKategori)
            const cleanKat = cleanCategoryName(katObj?.NamaKategori || pj.Keterangan)
            catMap[cleanKat] = (catMap[cleanKat] || 0) + nominal

            // Transaksi Terkini
            txList.push({
              id: pj.IdTransaksi,
              huria: h.NamaHuria,
              resort: res.NamaResort,
              tanggal: pj.Tanggal,
              kategori: cleanKat,
              nominal,
            })
          })

          // Kehadiran Sesi Ibadah
          ;(h.SesiIbadah || []).forEach((s) => {
            hadir += s.JumlahHadir || 0
          })
        })
      })
    })

    // Format struktur data bulanan untuk chart
    const formattedTrend = mData.map((m) => ({
      label: m.label,
      pemasukan: m.pemasukan,
      kas: m.kas,
      pusat: m.pusat,
      kasTarget: Math.round(m.kas * 0.9),
      pusatTarget: Math.round(m.pusat * 0.9),
    }))

    // Cari bulan puncak realisasi
    let peak = { label: 'Agu', pemasukan: 0, kas: 0, pusat: 0 }
    formattedTrend.forEach((m) => {
      if (m.pemasukan > peak.pemasukan) {
        peak = m
      }
    })

    // Urutkan transaksi terkini menurun berdasarkan tanggal
    txList.sort((a, b) => (b.tanggal > a.tanggal ? 1 : -1))

    // Susun peringkat kategori pemasukan
    const catList = Object.entries(catMap)
      .map(([nama, total]) => ({ nama, total }))
      .sort((a, b) => b.total - a.total)

    return {
      totalPemasukan: pemasukan,
      totalKasHuria: kas,
      totalSetoranPusat: pusat,
      totalHadir: hadir,
      categoryBreakdown: catList,
      trendData: formattedTrend,
      recentTransactions: txList.slice(0, 8),
      peakMonth: peak,
    }
  }, [wilayahData, user])

  // Konfigurasi seri garis kurva berdasarkan mode aktif
  const currentSeries = useMemo(() => {
    if (trendMode === 'total') {
      return [
        {
          key: 'pemasukan',
          label: 'Total Pemasukan Jemaat (100%)',
          color: '#0284c7', // Primary Sky Blue
        },
      ]
    }
    // Default 'formula': Komparasi Setoran Pusat (55%) vs Kas Huria (45%)
    return [
      {
        key: 'pusat',
        label: 'Setoran Pusat (55% · Sentralisasi)',
        color: '#6366f1', // Indigo
      },
      {
        key: 'kas',
        label: 'Kas Huria (45% · Otonomi Lokal)',
        color: '#10b981', // Emerald Green
      },
    ]
  }, [trendMode])

  // Export Dashboard Summary to CSV
  const handleExportDashboard = () => {
    const lines = []
    const escapeCSV = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`
    const isAdmin = (user?.role || '').toLowerCase() === 'admin'
    const scopeLabel = isAdmin ? `HURIA ${user?.namaHuria?.toUpperCase() || ''}` : 'KONSOLIDASI SELURUH HKBP'

    lines.push(escapeCSV(`LAPORAN RINGKASAN EKSEKUTIF DASHBOARD HKBP (${scopeLabel})`))
    lines.push(`${escapeCSV('Tahun Anggaran')},${escapeCSV(isAdmin ? `2026 (${user?.namaHuria || 'Huria'})` : '2026 (Konsolidasi Seluruh HKBP)')}`)
    lines.push(`${escapeCSV('Waktu Ekspor')},${escapeCSV(new Date().toLocaleString('id-ID'))}`)
    lines.push('')

    lines.push(escapeCSV('RINGKASAN FORMULA ALOKASI SENTRALISASI & OTONOMI'))
    lines.push(`${escapeCSV('Indikator')},${escapeCSV('Nominal (Rp)')},${escapeCSV('Persentase')},${escapeCSV('Peruntukan')}`)
    lines.push(`${escapeCSV('Total Pemasukan Jemaat')},${totalPemasukan},${escapeCSV('100%')},${escapeCSV('Total Penerimaan Kas Masuk')}`)
    lines.push(`${escapeCSV('Kewajiban Setoran Pusat')},${totalSetoranPusat},${escapeCSV('55%')},${escapeCSV('Sentralisasi Pearaja & Dana Pensiun')}`)
    lines.push(`${escapeCSV('Alokasi Kas Huria')},${totalKasHuria},${escapeCSV('45%')},${escapeCSV('Otonomi Pelayanan Huria Lokal')}`)
    lines.push(`${escapeCSV('Total Kehadiran Ibadah')},${totalHadir},${escapeCSV('-')},${escapeCSV(new Intl.NumberFormat('id-ID').format(totalHadir) + ' Jiwa')}`)
    lines.push('')

    lines.push(escapeCSV('TREN BULANAN FORMULA ALOKASI 55% DAN 45% (2026)'))
    lines.push(`${escapeCSV('Bulan')},${escapeCSV('Total Pemasukan')},${escapeCSV('Setoran Pusat (55%)')},${escapeCSV('Kas Huria (45%)')},${escapeCSV('Selisih Sentralisasi (+10%)')}`)
    trendData.forEach((t) => {
      lines.push(`${escapeCSV(t.label)},${t.pemasukan},${t.pusat},${t.kas},${t.pusat - t.kas}`)
    })
    lines.push('')

    lines.push(escapeCSV('PERINGKAT KATEGORI PEMASUKAN'))
    lines.push(`${escapeCSV('Kategori')},${escapeCSV('Nominal')},${escapeCSV('Format')}`)
    categoryBreakdown.forEach((c) => {
      lines.push(`${escapeCSV(c.nama)},${c.total},${escapeCSV(formatRupiah(c.total))}`)
    })

    const csvContent = lines.join('\r\n')
    const fileName = isAdmin
      ? `ringkasan_dashboard_${(user?.namaHuria || 'huria').toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().substring(0, 10)}.csv`
      : `ringkasan_dashboard_formula_hkbp_${new Date().toISOString().substring(0, 10)}.csv`
    exportToCSV(csvContent, fileName)
  }

  // Nilai kategori tertinggi untuk kalkulasi progress bar
  const maxCategoryVal = Math.max(...categoryBreakdown.map((c) => c.total), 1)
  const isAdmin = (user?.role || '').toLowerCase() === 'admin'

  return (
    <div className="flex flex-col gap-6 w-full font-sans">
      {/* 1. HEADER SECTION (Greeting, Subtitle, Export Button) */}
      <div className="flex flex-wrap items-center justify-between gap-4 w-full">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-bold text-muted tracking-wider uppercase">
              {isAdmin ? `HKBP · Dashboard Keuangan Huria` : 'HKBP · Ikhtisar Keuangan 2026'}
            </span>
            {isAdmin && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                {user?.namaHuria || 'Admin Huria'}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight leading-tight">
            Selamat datang, {user?.nama || 'Pengurus HKBP'}
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            {isAdmin
              ? `Realisasi penerimaan kas jemaat, formula sentralisasi 55% dan 45%, serta kehadiran ibadah di ${user?.namaHuria || 'gereja Anda'}.`
              : 'Konsolidasi menyeluruh realisasi penerimaan kas jemaat, formula sentralisasi 55% dan 45%, serta kehadiran ibadah.'}
          </p>
        </div>

        <Button
          onClick={handleExportDashboard}
          variant="primary"
          size="md"
          className="rounded-full shadow-xs cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Ekspor Laporan (CSV)</span>
        </Button>
      </div>

      {/* 2. ROW OF 4 KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {/* KPI 1: Total Pemasukan Jemaat */}
        <div className="bg-primary text-white rounded-2xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-white/80 font-medium">
              Total Pemasukan Jemaat
            </span>
            <div className="w-9 h-9 rounded-full bg-surface text-primary flex items-center justify-center shrink-0 shadow-2xs">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold tracking-tight leading-tight">
              {formatRupiah(totalPemasukan)}
            </div>
            <div className="flex items-center gap-2 mt-2.5">
              <span className="inline-flex items-center gap-1 bg-accent text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                <ArrowUpRight className="w-3 h-3" />
                100% Realisasi
              </span>
              <span className="text-xs text-white/60">
                Tahun Anggaran 2026
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Setoran Pusat (55%) */}
        <div className="bg-surface border border-line rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted font-medium">
              Kewajiban Setoran Pusat (55%)
            </span>
            <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-ink tracking-tight leading-tight">
              {formatRupiah(totalSetoranPusat)}
            </div>
            <div className="flex items-center gap-2 mt-2.5">
              <span className="inline-flex items-center gap-1 bg-indigo-500/15 text-indigo-600 border border-indigo-500/30 text-xs font-bold px-2 py-0.5 rounded-full">
                <ArrowUpRight className="w-3 h-3" />
                55,0%
              </span>
              <span className="text-xs text-muted">
                Sentralisasi Pearaja
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Kas Huria (45%) */}
        <div className="bg-surface border border-line rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted font-medium">
              Alokasi Kas Huria (45%)
            </span>
            <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-ink tracking-tight leading-tight">
              {formatRupiah(totalKasHuria)}
            </div>
            <div className="flex items-center gap-2 mt-2.5">
              <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-xs font-bold px-2 py-0.5 rounded-full">
                <ArrowUpRight className="w-3 h-3" />
                45,0%
              </span>
              <span className="text-xs text-muted">
                Otonomi Huria Lokal
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4: Total Hadir Ibadah */}
        <div className="bg-surface border border-line rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted font-medium">
              Total Hadir Ibadah
            </span>
            <div className="w-9 h-9 rounded-full bg-primary-50 text-primary flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-ink tracking-tight leading-tight">
              {new Intl.NumberFormat('id-ID').format(totalHadir)}{' '}
              <span className="text-sm font-semibold text-muted">Jiwa</span>
            </div>
            <div className="flex items-center gap-2 mt-2.5">
              <span className="inline-flex items-center gap-1 bg-success/15 text-success border border-success/30 text-xs font-bold px-2 py-0.5 rounded-full">
                <ArrowUpRight className="w-3 h-3" />
                Akumulasi
              </span>
              <span className="text-xs text-muted">
                Sesi Ibadah 2026
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. HERO SECTION: 1 TREN FORMULA ALOKASI 55% & 45% (Left 2 cols) + PERINGKAT KATEGORI (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* HERO 1 TREN UTAMA: FORMULA ALOKASI SENTRALISASI VS OTONOMI LOKAL */}
        <div className="lg:col-span-2 bg-surface border border-line rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          {/* Header Tren */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary-50 px-2.5 py-0.5 rounded-md border border-primary-100">
                  <Scale className="w-3.5 h-3.5 text-primary" />
                  Tata Kelola Sentralisasi HKBP
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-ink tracking-tight">
                Tren Formula Alokasi 55% dan 45% (Sentralisasi vs Otonomi Lokal)
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Dinamika perolehan bulanan antara Setoran Kantor Pusat HKBP (55% Sentralisasi) dan Kas Huria (45% Otonomi Lokal).
              </p>
            </div>

            {/* Mode Switcher Pill */}
            <div className="inline-flex bg-canvas p-1 rounded-xl border border-line shrink-0">
              <button
                type="button"
                onClick={() => setTrendMode('formula')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  trendMode === 'formula'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Formula 55% vs 45%
              </button>
              <button
                type="button"
                onClick={() => setTrendMode('total')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  trendMode === 'total'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Total 100%
              </button>
            </div>
          </div>

          {/* 4 HIGHLIGHT BADGES FORMULA ALOKASI AGAR TAMPIL SANGAT MENCOLOK */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 p-3.5 bg-canvas/70 rounded-xl border border-line">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="text-[11px] font-semibold text-muted">Setoran Pusat (55%)</span>
              </div>
              <span className="text-sm sm:text-base font-extrabold text-indigo-600 mt-0.5">
                {formatCompactRupiah(totalSetoranPusat)}
              </span>
              <span className="text-[10px] text-muted">Sentralisasi & Pensiun</span>
            </div>

            <div className="flex flex-col border-l border-line pl-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-semibold text-muted">Kas Huria (45%)</span>
              </div>
              <span className="text-sm sm:text-base font-extrabold text-emerald-600 mt-0.5">
                {formatCompactRupiah(totalKasHuria)}
              </span>
              <span className="text-[10px] text-muted">Otonomi Huria Lokal</span>
            </div>

            <div className="flex flex-col border-l border-line pl-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[11px] font-semibold text-muted">Porsi Sentralisasi</span>
              </div>
              <span className="text-sm sm:text-base font-extrabold text-ink mt-0.5">
                +{formatCompactRupiah(totalSetoranPusat - totalKasHuria)}
              </span>
              <span className="text-[10px] text-muted">Surplus Pusat (+10%)</span>
            </div>

            <div className="flex flex-col border-l border-line pl-3">
              <div className="flex items-center gap-1.5">
                <Award className="w-3 h-3 text-accent" />
                <span className="text-[11px] font-semibold text-muted">Puncak Gotilon</span>
              </div>
              <span className="text-sm sm:text-base font-extrabold text-ink mt-0.5">
                {peakMonth.label} · {formatCompactRupiah(peakMonth.pemasukan)}
              </span>
              <span className="text-[10px] text-muted">
                P: {formatCompactRupiah(peakMonth.pusat)} | H: {formatCompactRupiah(peakMonth.kas)}
              </span>
            </div>
          </div>

          {/* SvgLineChart Hero Canvas */}
          <div className="w-full flex-1 flex flex-col justify-center">
            <SvgLineChart
              data={trendData}
              height={300}
              series={currentSeries}
            />
          </div>
        </div>

        {/* KARTU KANAN: PERINGKAT KATEGORI PEMASUKAN */}
        <div className="bg-surface border border-line rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-bold text-ink">
              Peringkat Kategori Pemasukan
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Distribusi penerimaan berdasarkan pos anggaran HKBP 2026.
            </p>
          </div>

          <div className="flex flex-col gap-3.5 flex-1 justify-center">
            {categoryBreakdown.length === 0 ? (
              <div className="text-center text-xs text-muted py-8">
                Tidak ada data pemasukan
              </div>
            ) : (
              categoryBreakdown.slice(0, 6).map((cat, idx) => {
                const pct = Math.round((cat.total / maxCategoryVal) * 100)
                const barColors = [
                  'var(--color-chart-1)',
                  'var(--color-chart-2)',
                  'var(--color-chart-3)',
                  'var(--color-chart-4)',
                  'var(--color-chart-5)',
                  'var(--color-chart-6)',
                ]
                return (
                  <div
                    key={idx}
                    className={`pb-3 ${
                      idx < Math.min(categoryBreakdown.length, 6) - 1 ? 'border-b border-canvas' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-ink truncate pr-2">
                        {cat.nama}
                      </span>
                      <span className="text-xs font-bold text-primary shrink-0">
                        {formatRupiah(cat.total)}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full bg-canvas overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: barColors[idx % barColors.length],
                        }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* 4. SUMMARY TABLE CARD AT BOTTOM */}
      <div className="bg-surface border border-line rounded-2xl p-5 sm:p-6 shadow-xs w-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-ink">
              Transaksi Terkini (Penerimaan Kas Jemaat)
            </h3>
            <p className="text-xs text-muted mt-0.5">
              {isAdmin
                ? `Catatan penerimaan kas jemaat terbaru di ${user?.namaHuria || 'gereja Anda'}.`
                : 'Catatan penerimaan kas jemaat terbaru dari seluruh gereja HKBP.'}
            </p>
          </div>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('tabel')}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-700 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <span>Lihat semua</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full border-collapse text-xs text-left">
            <thead>
              <tr className="bg-primary-50 text-primary border-b border-line">
                <th className="p-3 font-bold uppercase tracking-wider">
                  ID Transaksi
                </th>
                <th className="p-3 font-bold uppercase tracking-wider">
                  Huria
                </th>
                <th className="p-3 font-bold uppercase tracking-wider">
                  Resort
                </th>
                <th className="p-3 font-bold uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="p-3 font-bold uppercase tracking-wider">
                  Kategori
                </th>
                <th className="p-3 text-right font-bold uppercase tracking-wider">
                  Nominal
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted">
                    Tidak ada transaksi untuk ditampilkan
                  </td>
                </tr>
              ) : (
                recentTransactions.map((tx, idx) => (
                  <tr
                    key={tx.id || idx}
                    className="hover:bg-primary-50 transition-colors"
                  >
                    <td className="p-3 font-mono text-muted">
                      #{tx.id}
                    </td>
                    <td className="p-3 font-semibold text-ink">
                      {tx.huria}
                    </td>
                    <td className="p-3 text-muted">
                      {tx.resort}
                    </td>
                    <td className="p-3 text-muted">
                      {formatDate(tx.tanggal)}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full bg-primary-50 border border-primary-100 text-[11px] font-semibold text-primary">
                        {tx.kategori}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-ink">
                      {formatRupiah(tx.nominal)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
