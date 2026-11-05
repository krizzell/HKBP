/** Periode visualisasi HKBP. Semua batas adalah tanggal UTC, inklusif.
 * Minggu ISO berjalan Senin-Minggu, termasuk ketika melintasi tahun.
 */
const DAY = 86400000
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export const todayLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const isoUTC = (date) => date.toISOString().slice(0, 10)
export const parseISO = (date) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date ?? ''))) return null
  const d = new Date(`${date}T00:00:00Z`)
  return Number.isNaN(d.getTime()) || isoUTC(d) !== date ? null : d
}
const addDays = (d, count) => new Date(d.getTime() + count * DAY)
export const weekMonday = (d) => addDays(d, -((d.getUTCDay() + 6) % 7))
export const weekSunday = (d) => addDays(weekMonday(d), 6)
export const weekId = (d) => {
  const day = new Date(d.getTime())
  day.setUTCDate(day.getUTCDate() + 3 - ((day.getUTCDay() + 6) % 7))
  const isoYear = day.getUTCFullYear()
  const jan4 = new Date(Date.UTC(isoYear, 0, 4))
  const firstMonday = weekMonday(jan4)
  return `${isoYear}-W${String(1 + Math.round((weekMonday(d) - firstMonday) / (7 * DAY))).padStart(2, '0')}`
}
export const defaultRangePeriod = () => {
  const today = todayLocal()
  const year = today.slice(0, 4)
  const month = today.slice(0, 7)
  return { mode: 'tahun', tahun: year, tahunAwal: year, tahunAkhir: year,
    bulan: month.slice(5), bulanAwal: month, bulanAkhir: month,
    mingguISO: '', startDate: today, endDate: today }
}
const monthValid = (m) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(m ?? ''))
const yearValid = (y) => /^\d{4}$/.test(String(y ?? '')) && Number(y) >= 1900 && Number(y) <= 2200

export function resolvePeriod(periode = {}) {
  const defaults = defaultRangePeriod()
  const mode = ['tahun', 'bulan', 'minggu'].includes(periode.mode) ? periode.mode : 'tahun'
  let start, end, label, axis, bucket
  if (mode === 'tahun') {
    const yr = yearValid(periode.tahun) ? periode.tahun : defaults.tahun
    const y1 = yearValid(periode.tahunAwal) ? periode.tahunAwal : yr
    const y2 = yearValid(periode.tahunAkhir) ? periode.tahunAkhir : y1
    const [a, b] = [y1, y2].sort()
    start = `${a}-01-01`; end = `${b}-12-31`
    label = a === b ? `Tahun ${a}` : `${a} – ${b}`
    bucket = a === b ? 'month' : 'year'
    axis = bucket === 'year' ? 'Tahun' : `Bulan (${a})`
  } else if (mode === 'bulan') {
    const oldMonth = `${yearValid(periode.tahun) ? periode.tahun : defaults.tahun}-${String(periode.bulan || defaults.bulan).padStart(2, '0')}`
    const m1 = monthValid(periode.bulanAwal) ? periode.bulanAwal : oldMonth
    const m2 = monthValid(periode.bulanAkhir) ? periode.bulanAkhir : m1
    const [a, b] = [m1, m2].sort()
    start = `${a}-01`
    end = isoUTC(new Date(Date.UTC(Number(b.slice(0, 4)), Number(b.slice(5)), 0)))
    label = a === b ? `${MONTH_NAMES[Number(a.slice(5)) - 1]} ${a.slice(0, 4)}` : `${a} – ${b}`
    bucket = a === b ? 'week' : 'month'
    axis = bucket === 'week' ? `Minggu di ${label}` : 'Bulan'
  } else {
    const one = parseISO(periode.startDate) || parseISO(periode.endDate) || parseISO(defaults.startDate)
    const two = parseISO(periode.endDate) || one
    const [a, b] = [one, two].sort((x, y) => x - y)
    start = isoUTC(weekMonday(a)); end = isoUTC(weekSunday(b))
    label = start === isoUTC(weekMonday(b)) ? `${weekId(a)} (${start} – ${end})` : `${start} – ${end}`
    bucket = 'week'; axis = 'Minggu (Senin–Minggu)'
  }
  const first = parseISO(start)
  const last = parseISO(end)
  const countLimit = 2000 // Hindari deret ribuan slot akibat URL yang tidak valid.
  const slots = []
  const make = (d) => {
    if (bucket === 'year') return { key: String(d.getUTCFullYear()), label: String(d.getUTCFullYear()) }
    if (bucket === 'month') return { key: isoUTC(d).slice(0, 7), label: `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}` }
    const monday = weekMonday(d)
    return { key: isoUTC(monday), label: `${weekId(d)} (${isoUTC(monday).slice(5)}–${isoUTC(weekSunday(d)).slice(5)})` }
  }
  let cursor = bucket === 'week' ? weekMonday(first) : first
  for (let i = 0; cursor <= last && i < countLimit; i += 1) {
    slots.push(make(cursor))
    if (bucket === 'year') cursor = new Date(Date.UTC(cursor.getUTCFullYear() + 1, 0, 1))
    else if (bucket === 'month') cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
    else cursor = addDays(cursor, 7)
  }
  const slotFor = (dateStr) => {
    const d = parseISO(dateStr)
    if (!d || dateStr < start || dateStr > end) return null
    return make(d)
  }
  return { mode, start, end, label, axis, slots, bucket, slotFor }
}

/** Jendela Drop membutuhkan satu periode pembanding SEBELUM rentang grafik. */
export function getDropWindow(periode) {
  const selected = resolvePeriod(periode)
  const start = parseISO(selected.start)
  let before
  if (selected.mode === 'tahun') before = new Date(Date.UTC(start.getUTCFullYear() - 1, 0, 1))
  else if (selected.mode === 'bulan') before = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1))
  else before = addDays(start, -7)
  return { mulai: isoUTC(before), akhir: selected.end }
}
