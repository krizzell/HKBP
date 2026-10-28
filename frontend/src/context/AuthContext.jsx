import { createContext, useContext, useState, useEffect } from 'react'
import { loginApi, getMeApi } from '../api/authApi'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('hkbp_user')
    return saved ? JSON.parse(saved) : null
  })
  const [token, setToken] = useState(() => localStorage.getItem('hkbp_token') || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Automatically refresh user metadata from backend on mount if logged in
  useEffect(() => {
    if (token) {
      getMeApi()
        .then((data) => {
          if (data?.user) {
            setUser(data.user)
            localStorage.setItem('hkbp_user', JSON.stringify(data.user))
          }
        })
        .catch(() => {
          // Keep cached user if network fails
        })
    }
  }, [token])

  const login = async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const data = await loginApi(email, password)
      setUser(data.user)
      setToken(data.token)
      localStorage.setItem('hkbp_user', JSON.stringify(data.user))
      localStorage.setItem('hkbp_token', data.token)
      return data.user
    } catch (err) {
      const msg = err.response?.data?.error || 'Email atau password salah'
      setError(msg)
      throw new Error(msg)
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('hkbp_user')
    localStorage.removeItem('hkbp_token')
  }

  const isSuperAdmin = user?.role === 'SuperAdmin'
  const isAdmin = user?.role === 'Admin'

  const value = {
    user,
    token,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
    isSuperAdmin,
    isAdmin,
    huriaScope: {
      idHuria: user?.idHuria || '',
      namaHuria: user?.namaHuria || '',
      namaResort: user?.namaResort || '',
      namaDistrik: user?.namaDistrik || '',
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
