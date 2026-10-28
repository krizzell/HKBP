// Rupiah Currency Formatter
export const formatRupiah = (val) => {
  if (val === undefined || val === null || isNaN(val)) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val)
}

// Compact Number Formatter (e.g. Rp 1,5 Jt)
export const formatCompactRupiah = (val) => {
  if (val === undefined || val === null || isNaN(val)) return 'Rp 0'
  if (val >= 1000000000) return `Rp ${(val / 1000000000).toFixed(1)} M`
  if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)} Jt`
  if (val >= 1000) return `Rp ${(val / 1000).toFixed(0)} Rb`
  return formatRupiah(val)
}

// Date Formatter
export const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d)
  } catch (e) {
    return dateStr
  }
}

// ISO Week calculation (1 - 52)
export const getISOWeek = (dateStr) => {
  if (!dateStr) return 1
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return 1
  const target = new Date(date.valueOf())
  const dayNr = (date.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7))
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target) / 604800000)
  return weekNumber
}

// CSV Exporter (Mendukung array of objects atau formatted string CSV)
export const exportToCSV = (data, filename = 'ekspor_hkbp.csv') => {
  if (!data) {
    alert('Tidak ada data untuk diekspor')
    return
  }

  let csvContent = ''
  if (typeof data === 'string') {
    if (!data.trim()) {
      alert('Tidak ada data untuk diekspor')
      return
    }
    csvContent = data
  } else if (Array.isArray(data)) {
    if (!data.length) {
      alert('Tidak ada data untuk diekspor')
      return
    }
    const headers = Object.keys(data[0])
    const rows = data.map((item) =>
      headers
        .map((header) => {
          let val = item[header]
          if (val === null || val === undefined) return '""'
          if (typeof val === 'object') val = JSON.stringify(val)
          val = String(val).replace(/"/g, '""')
          return `"${val}"`
        })
        .join(',')
    )
    csvContent = [headers.join(','), ...rows].join('\r\n')
  }

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
