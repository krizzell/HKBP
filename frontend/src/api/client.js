import axios from 'axios'

// Pada production, set VITE_API_URL ke URL backend Go (mis. https://hkbp-api.onrender.com/api).
// Pada development, '/api' diteruskan oleh proxy Vite ke http://localhost:8081.
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Hanya JWT yang dikirim. Identitas & peran ditentukan server dari token (bukan dari header buatan klien).
client.interceptors.request.use((config) => {
  if (typeof localStorage !== 'undefined') {
    const token = localStorage.getItem('hkbp_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Token kedaluwarsa / tidak valid -> bersihkan sesi dan kembali ke halaman login.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const url = error?.config?.url || ''
    if (status === 401 && !url.includes('/auth/login') && typeof localStorage !== 'undefined') {
      localStorage.removeItem('hkbp_token')
      localStorage.removeItem('hkbp_user')
      window.location.assign('/')
    }
    return Promise.reject(error)
  },
)

export default client
