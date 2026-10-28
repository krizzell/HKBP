import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach user auth info automatically to every request
client.interceptors.request.use((config) => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const token = localStorage.getItem('hkbp_token')
    const userJson = localStorage.getItem('hkbp_user')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    if (userJson) {
      try {
        const user = JSON.parse(userJson)
        if (user.role) {
          config.headers['X-User-Role'] = user.role
          config.headers['X-Dev-Role'] = user.role
        }
        if (user.email) config.headers['X-User-Email'] = user.email
        const huriaId = user.idHuria
        if (huriaId) config.headers['X-User-Huria'] = huriaId
      } catch (e) {
        // ignore
      }
    }
  }
  return config
})

export default client