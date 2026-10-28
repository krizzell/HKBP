/**
 * format.js - Utilitas pemformatan angka, mata uang, persen, dan kode wilayah HKBP
 */

/**
 * Format angka ke format Rupiah penuh (contoh: Rp 12.500.000)
 * @param {number|string|null|undefined} value
 * @returns {string}
 */
export function formatRupiah(value) {
  if (value === null || value === undefined || value === '') return 'Rp 0'
  const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : Number(value)
  if (isNaN(num)) return 'Rp 0'

  const isNegative = num < 0
  const abs = Math.abs(Math.round(num))
  const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  return isNegative ? `-Rp ${formatted}` : `Rp ${formatted}`
}

/**
 * Format angka ke format Rupiah singkat (contoh: "Rp 1,2 jt", "Rp 850 rb", "Rp 2,5 M")
 * @param {number|string|null|undefined} value
 * @returns {string}
 */
export function formatCompactRupiah(value) {
  if (value === null || value === undefined || value === '') return 'Rp 0'
  const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : Number(value)
  if (isNaN(num)) return 'Rp 0'

  const isNegative = num < 0
  const abs = Math.abs(num)

  let formatted = '0'
  if (abs >= 1_000_000_000_000) {
    const val = abs / 1_000_000_000_000
    const str = val >= 10 ? Math.round(val).toString() : val.toFixed(1).replace('.0', '').replace('.', ',')
    formatted = `${str} T`
  } else if (abs >= 1_000_000_000) {
    const val = abs / 1_000_000_000
    const str = val >= 10 ? Math.round(val).toString() : val.toFixed(1).replace('.0', '').replace('.', ',')
    formatted = `${str} M`
  } else if (abs >= 1_000_000) {
    const val = abs / 1_000_000
    const str = val >= 10 ? Math.round(val).toString() : val.toFixed(1).replace('.0', '').replace('.', ',')
    formatted = `${str} jt`
  } else if (abs >= 1_000) {
    const val = abs / 1_000
    const str = val >= 10 ? Math.round(val).toString() : val.toFixed(1).replace('.0', '').replace('.', ',')
    formatted = `${str} rb`
  } else {
    formatted = Math.round(abs).toString()
  }

  return isNegative ? `-Rp ${formatted}` : `Rp ${formatted}`
}

/**
 * Format angka ke format persentase dengan pemisah desimal koma (contoh: "12,5%")
 * @param {number|string|null|undefined} value
 * @param {number} decimals
 * @returns {string}
 */
export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined || value === '') return '0%'
  const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : Number(value)
  if (isNaN(num)) return '0%'

  const fixed = num.toFixed(decimals)
  // Hilangkan trailing ,0 jika desimal bulat
  const clean = fixed.replace(/\.0+$/, '').replace('.', ',')
  return `${clean}%`
}

/**
 * Format kode berjenjang wilayah HKBP (contoh: induk "01", anak "3" -> "01.03")
 * Jika kode anak sudah mengandung kode induk (cth "01.03"), tetap dikembalikan "01.03".
 * @param {string|number|null|undefined} codeInduk
 * @param {string|number|null|undefined} code
 * @returns {string}
 */
export function formatHierarchicalCode(codeInduk, code) {
  const normChild = code !== null && code !== undefined ? String(code).trim() : ''
  const normInduk = codeInduk !== null && codeInduk !== undefined ? String(codeInduk).trim() : ''

  if (!normChild && !normInduk) return ''
  if (!normChild) return normInduk

  // Bila kode anak sudah berjenjang (memuat titik)
  if (normChild.includes('.')) {
    return normChild
  }

  // Standarisasi padding anak menjadi minimal 2 digit jika angka murni
  const paddedChild = /^\d+$/.test(normChild) ? normChild.padStart(2, '0') : normChild

  if (!normInduk) {
    return paddedChild
  }

  return `${normInduk}.${paddedChild}`
}

/**
 * Format integer dengan pemisah ribuan titik (contoh: 12500 -> "12.500")
 * @param {number|string|null|undefined} value
 * @returns {string}
 */
export function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '0'
  const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : Number(value)
  if (isNaN(num)) return '0'
  return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/**
 * Ekspor data daftar wilayah ke file CSV
 * @param {string} filename
 * @param {Array} items
 * @param {string} childNoun
 */
export function exportWilayahToCsv(filename = 'wilayah-hkbp.csv', items = [], childNoun = 'Anak') {
  if (!items || items.length === 0) return

  const headers = ['Kode', 'Nama', 'Pimpinan', `Jumlah ${childNoun}`, 'Jemaat', 'Pemasukan', 'Kontribusi', 'Status']
  const rows = items.map((it) => [
    `"${it.kodeLengkap || it.kode || ''}"`,
    `"${(it.nama || '').replace(/"/g, '""')}"`,
    `"${(it.namaPimpinan || '-').replace(/"/g, '""')}"`,
    it.jumlahAnak || 0,
    it.jumlahJemaat || 0,
    it.totalPemasukan || 0,
    `"${(it.kontribusiPersen || 0).toString().replace('.', ',')}%"`,
    it.aktif ? 'Aktif' : 'Nonaktif',
  ])

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

