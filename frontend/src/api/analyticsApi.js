import client from './client'

// Analitik statistik (Python)
export const runForecastApi = (payload) => client.post('/analytics/forecast', payload)
export const runAnomalyApi = (payload) => client.post('/analytics/anomaly', payload)
export const runCorrelationApi = (payload) => client.post('/analytics/correlation', payload)
export const runDropReportApi = (payload = {}) => client.post('/analytics/drop', payload)

// Data warehouse (skema bintang) - sumber dashboard storytelling
export const getDwRingkasan = () => client.get('/analytics/dw/ringkasan').then((r) => r.data)
export const getDwCube = () => client.get('/analytics/dw/cube').then((r) => r.data.data)
export const getDwAliran = () => client.get('/analytics/dw/aliran').then((r) => r.data.data)
export const getDwSesi = () => client.get('/analytics/dw/sesi').then((r) => r.data.data)
export const refreshDw = (latih = false) => client.post(`/analytics/dw/refresh?latih=${latih}`).then((r) => r.data)
export const getDwKategori = () => client.get('/analytics/dw/kategori').then((r) => r.data.data)

// Model Machine Learning (prediksi pelean sesi ibadah)
export const getMlMetrics = () => client.get('/analytics/ml/metrics').then((r) => r.data)
export const getMlOpsi = () => client.get('/analytics/ml/opsi').then((r) => r.data)
export const predictPelean = (payload) => client.post('/analytics/ml/predict', payload).then((r) => r.data)

export function pesanErrorAnalitik(error) {
  const status = error?.response?.status
  const body = error?.response?.data
  if (!error?.response || [502, 503, 504].includes(status)) {
    return body?.detail || 'Layanan analitik Python belum dapat dihubungi. Pastikan Uvicorn berjalan dan ANALYTICS_URL benar.'
  }
  if (status === 401 || status === 403) return 'Akses analitik ditolak. Periksa login atau kunci internal (ANALYTICS_KEY = INTERNAL_KEY).'
  return body?.detail || body?.error || `Layanan analitik mengembalikan HTTP ${status || 'tidak diketahui'}.`
}
