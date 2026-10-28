import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  Shield,
  Building,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  TrendingUp,
  BarChart2,
} from 'lucide-react'
import { Button } from '../components/ui'

export const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [localError, setLocalError] = useState(null)
  const { login, loading, error } = useAuth()

  const validate = () => {
    let isValid = true
    setEmailError('')
    setPasswordError('')

    if (!email.trim()) {
      setEmailError('Email wajib diisi')
      isValid = false
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Format email tidak valid')
      isValid = false
    }

    if (!password) {
      setPasswordError('Kata sandi wajib diisi')
      isValid = false
    } else if (password.length < 6) {
      setPasswordError('Kata sandi minimal 6 karakter')
      isValid = false
    }

    return isValid
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError(null)
    if (!validate()) return

    try {
      await login(email, password)
    } catch (err) {
      setLocalError(err.message || 'Login gagal. Periksa kembali email dan kata sandi Anda.')
    }
  }

  const handleFillTestAccount = (testEmail, testPassword) => {
    setEmail(testEmail)
    setPassword(testPassword)
    setEmailError('')
    setPasswordError('')
    setLocalError(null)
  }

  return (
    <div className="min-h-screen w-full bg-canvas flex items-center justify-center p-4 md:p-8 font-sans">
      {/* Central 2-Column Container */}
      <div className="w-full max-w-5xl bg-primary rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-line/20 min-h-[640px]">
        {/* Left Column: Official HKBP Logo & Brand Overview (hidden on mobile) */}
        <div className="hidden md:flex flex-1 flex-col justify-between p-10 bg-primary relative overflow-hidden text-white">
          {/* Subtle Decorative Ambient Background Glows */}
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-primary-400/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

          {/* Top Logo & Title */}
          <div className="relative z-10 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-surface p-1 shadow-md flex items-center justify-center shrink-0">
              <img
                src="/logo_hkbp.jpeg"
                alt="Logo HKBP"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="text-xl font-extrabold text-white tracking-tight block">
                HKBP
              </span>
              <span className="text-xs text-primary-200/80 font-medium">
                Huria Kristen Batak Protestan
              </span>
            </div>
          </div>

          {/* Center Graphic: Prominent Official HKBP Logo Showcase */}
          <div className="relative z-10 flex flex-col items-center justify-center py-6 text-center">
            <div className="w-32 h-32 rounded-3xl bg-surface p-3 shadow-xl mb-6 flex items-center justify-center border-4 border-primary-100/20">
              <img
                src="/logo_hkbp.jpeg"
                alt="Logo Resmi HKBP"
                className="w-full h-full object-contain"
              />
            </div>

            <h2 className="text-lg font-bold text-white tracking-tight mb-1">
              Portal Keuangan & Statistik
            </h2>
            <p className="text-xs text-primary-200/80 max-w-xs mb-6">
              Transparansi pelaporan keuangan, setoran pusat, dan analitik jemaat dari tingkat Huria hingga Kantor Pusat.
            </p>

            {/* Stylized Metric Glass Cards */}
            <div className="w-full max-w-xs flex flex-col gap-3">
              <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 flex items-center justify-between text-left">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-white/70">Penerimaan Huria</div>
                    <div className="text-sm font-bold text-white">Rp 4.280.000.000</div>
                  </div>
                </div>
                <span className="bg-success/20 text-accent font-bold text-[10px] px-2 py-0.5 rounded-full border border-accent/30">
                  +12.4%
                </span>
              </div>

              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 flex items-center justify-between text-left">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
                    <BarChart2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-white/70">Cakupan Wilayah</div>
                    <div className="text-xs font-bold text-white">34 Distrik · 8 Resort</div>
                  </div>
                </div>
                {/* 10% Lime Accent point */}
                <div className="w-2.5 h-2.5 rounded-full bg-accent shadow-xs" />
              </div>
            </div>
          </div>

          {/* Bottom Statement */}
          <div className="relative z-10 border-t border-primary-700/50 pt-4">
            <p className="text-xs text-primary-200/70 leading-relaxed m-0 text-center">
              Ketertiban administrasi dan integritas pelayanan HKBP.
            </p>
          </div>
        </div>

        {/* Right Column: Clean White Card with Form */}
        <div className="flex-1 bg-surface p-8 sm:p-12 flex flex-col justify-center rounded-2xl md:rounded-3xl md:m-2">
          {/* Header */}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 border border-primary-100 mb-4">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-[11px] font-bold text-primary tracking-wide">
                PORTAL RESMI HKBP
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
              Masuk
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1">
              Akses sistem pelaporan dan analisis keuangan terpadu.
            </p>
          </div>

          {/* Error Banner */}
          {(localError || error) && (
            <div className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/20 flex items-center gap-2.5 text-danger text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{localError || error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/60" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (emailError) setEmailError('')
                  }}
                  placeholder="contoh: pusat@hkbp.or.id"
                  className={`w-full h-11 pl-10 pr-3.5 rounded-xl border text-sm text-ink bg-surface outline-none transition-all duration-150 ${
                    emailError
                      ? 'border-danger focus:ring-2 focus:ring-danger/20'
                      : 'border-line focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30'
                  }`}
                />
              </div>
              {emailError && (
                <span className="block text-xs text-danger mt-1">
                  {emailError}
                </span>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/60" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (passwordError) setPasswordError('')
                  }}
                  placeholder="Masukkan kata sandi..."
                  className={`w-full h-11 pl-10 pr-10 rounded-xl border text-sm text-ink bg-surface outline-none transition-all duration-150 ${
                    passwordError
                      ? 'border-danger focus:ring-2 focus:ring-danger/20'
                      : 'border-line focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer p-1"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && (
                <span className="block text-xs text-danger mt-1">
                  {passwordError}
                </span>
              )}
            </div>

            {/* Primary Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              className="w-full mt-2 font-bold shadow-md cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <span>Masuk</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Quick-fill Test Accounts */}
          <div className="mt-6 pt-5 border-t border-line">
            <div className="text-xs font-semibold text-muted mb-2.5">
              Akun Uji Coba (Klik untuk mengisi cepat):
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleFillTestAccount('pusat@hkbp.or.id', 'Admin123#')}
                className="flex items-center justify-between p-2.5 rounded-xl bg-canvas border border-line text-ink hover:bg-primary-50 hover:border-primary-200 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Shield className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs font-semibold truncate">
                    Super Admin (Kantor Pusat)
                  </span>
                </div>
                <span className="text-[11px] text-muted font-mono shrink-0 ml-2">
                  pusat@hkbp.or.id
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleFillTestAccount('admin.sudirman@hkbp.or.id', 'Admin123#')}
                className="flex items-center justify-between p-2.5 rounded-xl bg-canvas border border-line text-ink hover:bg-primary-50 hover:border-primary-200 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Building className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs font-semibold truncate">
                    Admin Huria (HKBP Sudirman Jakarta)
                  </span>
                </div>
                <span className="text-[11px] text-muted font-mono shrink-0 ml-2">
                  admin.sudirman@...
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleFillTestAccount('admin.pearaja@hkbp.or.id', 'Admin123#')}
                className="flex items-center justify-between p-2.5 rounded-xl bg-canvas border border-line text-ink hover:bg-primary-50 hover:border-primary-200 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Building className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs font-semibold truncate">
                    Admin Huria (HKBP Pearaja Tarutung)
                  </span>
                </div>
                <span className="text-[11px] text-muted font-mono shrink-0 ml-2">
                  admin.pearaja@...
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
