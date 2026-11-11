// Fungsi murni untuk halaman Storytelling: filter silang, agregasi, KPI + pembanding, dan temuan otomatis.
import { formatCompactRupiah } from '../utils/formatters'

export const EMPTY_SELECTION = { distrik: null, resort: null, huria: null, kategori: null }

export function filterRows(rows, sel, { ignoreKategori = false } = {}) {
  return rows.filter(
    (r) =>
      (!sel.distrik || r.distrik === sel.distrik) &&
      (!sel.resort || r.resort === sel.resort) &&
      (!sel.huria || r.huria === sel.huria) &&
      (ignoreKategori || !sel.kategori || r.kategori === undefined || r.kategori === sel.kategori),
  )
}

export function sumBy(rows, keyFn, valueKey) {
  const map = new Map()
  rows.forEach((r) => {
    const k = keyFn(r)
    map.set(k, (map.get(k) || 0) + (Number(r[valueKey]) || 0))
  })
  return map
}

// Level drill-down mengikuti pilihan: distrik -> resort -> huria
export function drillLevel(sel) {
  if (sel.resort) return { level: 'huria', key: 'huria', title: 'Huria' }
  if (sel.distrik) return { level: 'resort', key: 'resort', title: 'Resort' }
  return { level: 'distrik', key: 'distrik', title: 'Distrik' }
}

export function rankBy(rows, sel, valueKey) {
  const { key } = drillLevel(sel)
  const map = sumBy(rows, (r) => r[key], valueKey)
  const total = [...map.values()].reduce((a, b) => a + b, 0) || 1
  return [...map.entries()]
    .map(([label, value]) => ({ key: label, label, value, share: (value / total) * 100 }))
    .sort((a, b) => b.value - a.value)
}

// Bulan terakhir yang "lengkap": bulan terakhir bisa baru berjalan beberapa minggu sehingga tidak adil dibandingkan.
export function latestCompleteMonth(cube) {
  const bySesi = sumBy(cube, (r) => r.bulan, 'jumlahSesi')
  const months = [...bySesi.keys()].sort()
  if (!months.length) return { latest: null, previous: null, months }
  const counts = months.map((m) => bySesi.get(m)).sort((a, b) => a - b)
  const median = counts[Math.floor(counts.length / 2)] || 1
  let idx = months.length - 1
  if (bySesi.get(months[idx]) < median * 0.7 && idx > 0) idx -= 1
  return { latest: months[idx], previous: idx > 0 ? months[idx - 1] : null, months }
}

// Setoran Pusat dibayar akhir bulan; bulan yang masih berjalan belum jatuh tempo sehingga tidak dihitung.
export function rowsDueForSetoran(cube) {
  const { latest } = latestCompleteMonth(cube)
  return latest ? cube.filter((r) => r.bulan <= latest) : cube
}

const pct = (a, b) => (b ? ((a - b) / b) * 100 : null)

export function computeKpis(cube) {
  const { latest, previous, months } = latestCompleteMonth(cube)
  if (!latest) return []
  const perMonth = (valueKey) => sumBy(cube, (r) => r.bulan, valueKey)
  const pemasukan = perMonth('totalPemasukan')
  const hadir = perMonth('totalHadir')
  const sesi = perMonth('jumlahSesi')
  const pelean = perMonth('totalPelean')
  const completeMonths = months.filter((m) => sesi.get(m) >= (sesi.get(latest) || 0) * 0.7)
  const avg = (map) => completeMonths.reduce((s, m) => s + (map.get(m) || 0), 0) / (completeMonths.length || 1)

  const hadirPerSesi = (m) => (sesi.get(m) ? hadir.get(m) / sesi.get(m) : 0)
  const avgHadirPerSesi = completeMonths.reduce((s, m) => s + hadirPerSesi(m), 0) / (completeMonths.length || 1)
  const peleanPerJiwa = (m) => (hadir.get(m) ? pelean.get(m) / hadir.get(m) : 0)
  const avgPeleanPerJiwa = completeMonths.reduce((s, m) => s + peleanPerJiwa(m), 0) / (completeMonths.length || 1)

  const due = rowsDueForSetoran(cube)
  const alokasiPusat = due.reduce((s, r) => s + r.alokasiPusat, 0)
  const setoran = due.reduce((s, r) => s + r.setoranDibayar, 0)
  const kepatuhan = alokasiPusat ? (setoran / alokasiPusat) * 100 : 0

  return [
    {
      id: 'pemasukan', label: `Pemasukan ${latest}`, value: pemasukan.get(latest) || 0, format: 'rupiah',
      comparisons: [
        { label: 'vs bulan lalu', delta: previous ? pct(pemasukan.get(latest), pemasukan.get(previous)) : null },
        { label: 'vs rata-rata bulanan', delta: pct(pemasukan.get(latest), avg(pemasukan)) },
      ],
    },
    {
      id: 'kehadiran', label: 'Kehadiran rata-rata / sesi', value: hadirPerSesi(latest), format: 'angka', unit: 'jiwa',
      comparisons: [
        { label: 'vs bulan lalu', delta: previous ? pct(hadirPerSesi(latest), hadirPerSesi(previous)) : null },
        { label: 'vs rata-rata', delta: pct(hadirPerSesi(latest), avgHadirPerSesi) },
      ],
    },
    {
      id: 'pelean', label: 'Pelean per jemaat hadir', value: peleanPerJiwa(latest), format: 'rupiah',
      comparisons: [
        { label: 'vs bulan lalu', delta: previous ? pct(peleanPerJiwa(latest), peleanPerJiwa(previous)) : null },
        { label: 'vs rata-rata', delta: pct(peleanPerJiwa(latest), avgPeleanPerJiwa) },
      ],
    },
    {
      id: 'kepatuhan', label: 'Kepatuhan Setoran Pusat', value: kepatuhan, format: 'persen',
      comparisons: [{ label: 'vs target 100%', delta: kepatuhan - 100, absolute: true }],
    },
  ]
}

// Algoritma Paskah (Meeus/Jones/Butcher) untuk anotasi kalender liturgi.
export function easterDate(year) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(year, month - 1, day))
}

export function isoWeekLabel(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function annotationsFor(history) {
  if (!history.length) return []
  const out = []
  const year = Number(history[0].label.slice(0, 4))
  const easter = isoWeekLabel(easterDate(year))
  if (history.some((p) => p.label === easter)) out.push({ label: easter, text: 'Paskah' })
  const peak = history.reduce((a, b) => (b.value > a.value ? b : a), history[0])
  if (peak.label !== easter) out.push({ label: peak.label, text: 'Puncak' })
  return out
}

// Temuan & rekomendasi otomatis dari data yang sedang difilter.
export function buildInsights(cube, sel) {
  const notes = { judul: {}, rekomendasi: [] }
  if (!cube.length) return notes
  const rank = rankBy(cube, sel, 'totalPemasukan')
  const { title } = drillLevel(sel)
  if (rank.length) {
    const top = rank[0]
    notes.judul.ranking = `${top.label} menyumbang ${top.share.toFixed(0)}% pemasukan (${title.toLowerCase()} terbesar: ${formatCompactRupiah(top.value)})`
  }

  const byHuria = new Map()
  const due = new Set(rowsDueForSetoran(cube))
  cube.forEach((r) => {
    const x = byHuria.get(r.huria) || { alokasiPusat: 0, setoran: 0, pelean: 0, hadir: 0, sesi: 0, pemasukan: 0 }
    if (due.has(r)) {
      x.alokasiPusat += r.alokasiPusat
      x.setoran += r.setoranDibayar
    }
    x.pelean += r.totalPelean
    x.hadir += r.totalHadir
    x.sesi += r.jumlahSesi
    x.pemasukan += r.totalPemasukan
    byHuria.set(r.huria, x)
  })
  const list = [...byHuria.entries()].map(([huria, x]) => ({
    huria, ...x, kepatuhan: x.alokasiPusat ? (x.setoran / x.alokasiPusat) * 100 : 100, peleanPerJiwa: x.hadir ? x.pelean / x.hadir : 0,
    hadirPerSesi: x.sesi ? x.hadir / x.sesi : 0,
  }))

  const kurang = list.filter((x) => x.kepatuhan < 99.5).sort((a, b) => a.kepatuhan - b.kepatuhan)
  if (kurang.length) {
    const sisa = kurang.reduce((s, x) => s + (x.alokasiPusat - x.setoran), 0)
    notes.judul.kepatuhan = `${kurang.length} Huria belum melunasi seluruh Setoran Pusat (selisih ${formatCompactRupiah(sisa)})`
    notes.rekomendasi.push(`Tindak lanjuti Setoran Pusat: ${kurang.slice(0, 3).map((x) => `${x.huria} (${x.kepatuhan.toFixed(0)}%)`).join(', ')}. Jadwalkan pengingat sebelum tenggat bulanan.`)
  } else {
    notes.judul.kepatuhan = 'Seluruh Huria sudah melunasi Setoran Pusat sesuai alokasi'
  }

  const sortedPel = [...list].filter((x) => x.hadir > 0).sort((a, b) => a.peleanPerJiwa - b.peleanPerJiwa)
  if (sortedPel.length > 2) {
    const low = sortedPel[0]
    const avg = sortedPel.reduce((s, x) => s + x.peleanPerJiwa, 0) / sortedPel.length
    notes.judul.pelean = `${low.huria} memiliki pelean per jemaat terendah (${formatCompactRupiah(low.peleanPerJiwa)} vs rata-rata ${formatCompactRupiah(avg)})`
    notes.rekomendasi.push(`Tinjau pembinaan persembahan di ${low.huria}: pelean per jemaat hadir ${(((avg - low.peleanPerJiwa) / avg) * 100).toFixed(0)}% di bawah rata-rata Huria lain.`)
  }

  const { latest } = latestCompleteMonth(cube)
  const perBulan = [...sumBy(cube, (r) => r.bulan, 'totalPemasukan').entries()]
    .filter(([bulan]) => !latest || bulan <= latest) // bulan berjalan belum lengkap, tidak ikut rata-rata
    .sort((a, b) => a[0].localeCompare(b[0]))
  if (perBulan.length > 2) {
    const avg = perBulan.reduce((s, [, v]) => s + v, 0) / perBulan.length
    const peak = perBulan.reduce((a, b) => (b[1] > a[1] ? b : a))
    notes.judul.tren = `Pemasukan memuncak pada ${peak[0]} (${(peak[1] / avg).toFixed(1)}× rata-rata bulanan)`
    notes.rekomendasi.push(`Siapkan perencanaan kas untuk bulan dengan lonjakan (${peak[0]}): lonjakan pesta/hari raya berarti alokasi Setoran Pusat bulan itu juga lebih besar.`)
  }
  return notes
}

export function toHeatmap(cube, sel, valueKey = 'totalPemasukan') {
  const rows = [...new Set(cube.map((r) => r.huria))].sort()
  const cols = [...new Set(cube.map((r) => r.bulan))].sort()
  const matrix = {}
  cube.forEach((r) => {
    const k = `${r.huria}|${r.bulan}`
    matrix[k] = (matrix[k] || 0) + (Number(r[valueKey]) || 0)
  })
  return { rows, cols, matrix }
}

export function toSankey(aliran, sel) {
  const rows = filterRows(aliran, sel, { ignoreKategori: false }).filter((r) => !sel.kategori || r.kategori === sel.kategori)
  const levels = {}
  const links = new Map()
  const add = (source, target, value) => {
    const k = `${source}||${target}`
    links.set(k, (links.get(k) || 0) + value)
  }
  const level = sel.resort ? 'huria' : sel.distrik ? 'resort' : 'distrik'
  rows.forEach((r) => {
    const src = r[level]
    levels[src] = 0
    levels[r.kategori] = 1
    levels[r.peruntukan] = 2
    add(src, r.kategori, r.nominal)
    add(r.kategori, r.peruntukan, r.nominal)
  })
  return {
    levels,
    links: [...links.entries()].map(([k, value]) => {
      const [source, target] = k.split('||')
      return { source, target, value }
    }),
  }
}

export function toBubbleFrames(sesi, sel) {
  const rows = filterRows(sesi, sel)
  const groups = new Map()
  rows.forEach((r) => {
    const key = `${r.bulan}|${r.huria}`
    const g = groups.get(key) || { bulan: r.bulan, huria: r.huria, distrik: r.distrik, jemaat: r.jumlahJemaat, hadir: 0, pelean: 0, n: 0 }
    g.hadir += r.hadir
    g.pelean += r.pelean
    g.n += 1
    groups.set(key, g)
  })
  const frames = {}
  groups.forEach((g) => {
    ;(frames[g.bulan] = frames[g.bulan] || []).push({
      id: g.huria, name: g.huria, group: g.distrik, x: Math.round(g.hadir / g.n), y: g.pelean, r: g.jemaat,
    })
  })
  return frames
}

export function toSmallMultiples(cube, sel) {
  const key = drillLevel(sel).key
  const bulan = [...new Set(cube.map((r) => r.bulan))].sort()
  const names = [...new Set(cube.map((r) => r[key]))].sort()
  return names.slice(0, 12).map((name) => {
    const rows = cube.filter((r) => r[key] === name)
    const perBulan = sumBy(rows, (r) => r.bulan, 'totalPemasukan')
    return { key: name, title: name, points: bulan.map((b) => ({ x: b, y: perBulan.get(b) || 0 })) }
  })
}
