import { useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  addPemasukan,
  updatePemasukan,
  deletePemasukan,
  addSesi,
  updateSesi,
  deleteSesi,
  addAlokasi,
  updateAlokasi,
  deleteAlokasi,
  addSetoran,
  updateSetoran,
  deleteSetoran,
  addKategori,
  updateKategori,
  deleteKategori,
  addLunggu,
  updateLunggu,
  deleteLunggu,
  updateWarta,
} from '../api/wilayahApi'
import {
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Building2,
  Lock,
  Layers,
  Calendar,
  Wallet,
  Send,
  Users,
  Scroll,
  Search,
  Tag,
  PieChart,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react'
import { formatRupiah, formatDate } from '../utils/formatters'
import { Button } from '../components/ui'

export const ManajemenDataPage = ({ wilayahData = [], onDataUpdated }) => {
  const { user, isSuperAdmin, isAdmin } = useAuth()
  const [activeSubTab, setActiveSubTab] = useState('pemasukan')
  const [notification, setNotification] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Temukan data Huria milik Admin yang sedang login
  const myHuria = useMemo(() => {
    const distriks = wilayahData[0]?.Pusat?.Distrik || []
    for (const d of distriks) {
      for (const res of d.Resort || []) {
        for (const h of res.Huria || []) {
          if (
            (user?.idHuria && h.IdHuria === user?.idHuria) ||
            (user?.idHuria && h.IdHuria.startsWith(user?.idHuria)) ||
            (user?.idHuria && user?.idHuria.startsWith(h.IdHuria)) ||
            (user?.namaHuria && h.NamaHuria === user?.namaHuria) ||
            (user?.namaHuria && user?.namaHuria.toLowerCase().includes(h.NamaHuria.toLowerCase())) ||
            (user?.namaHuria && h.NamaHuria.toLowerCase().includes(user?.namaHuria.toLowerCase()))
          ) {
            return { ...h, huria: h.NamaHuria, resort: res.NamaResort, distrik: d.NamaDistrik }
          }
        }
      }
    }
    // Fallback ke huria pertama jika belum terpetakan
    const fallback = distriks[0]?.Resort?.[0]?.Huria?.[0]
    return fallback
      ? { ...fallback, huria: fallback.NamaHuria, resort: distriks[0]?.Resort?.[0]?.NamaResort || 'Resort Tebet', distrik: distriks[0]?.NamaDistrik || 'Distrik VIII' }
      : null
  }, [wilayahData, user])

  const churchId = myHuria?.IdHuria || user?.idHuria || 'H-1.1.1.1'
  const myChurch = myHuria

  const showNotify = (type, text) => {
    setNotification({ type, text })
    setTimeout(() => setNotification(null), 4000)
  }

  // =========================================================================
  // 1. STATE & HANDLER: PEMASUKAN JEMAAT
  // =========================================================================
  const [editingTrxId, setEditingTrxId] = useState(null)
  const [formPemasukan, setFormPemasukan] = useState({
    Tanggal: '2026-10-18',
    Nominal: 500000,
    IdKategori: 'K-01',
    Keterangan: 'Pelean Ibadah Minggu',
    AlokasiPusatPercent: 45,
  })

  const resetFormPemasukan = () => {
    setEditingTrxId(null)
    setFormPemasukan({
      Tanggal: new Date().toISOString().substring(0, 10),
      Nominal: 500000,
      IdKategori: myChurch?.KategoriPemasukan?.[0]?.IdKategori || 'K-01',
      Keterangan: '',
      AlokasiPusatPercent: 45,
    })
  }

  const handleSavePemasukan = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (editingTrxId) {
        await updatePemasukan(churchId, editingTrxId, {
          Tanggal: formPemasukan.Tanggal,
          Nominal: parseFloat(formPemasukan.Nominal),
          IdKategori: formPemasukan.IdKategori,
          Keterangan: formPemasukan.Keterangan,
        })
        showNotify('success', `Transaksi ${editingTrxId} berhasil diperbarui`)
        resetFormPemasukan()
      } else {
        await addPemasukan(
          churchId,
          {
            Tanggal: formPemasukan.Tanggal,
            Nominal: parseFloat(formPemasukan.Nominal),
            IdKategori: formPemasukan.IdKategori,
            Keterangan: formPemasukan.Keterangan,
          },
          formPemasukan.AlokasiPusatPercent / 100.0
        )
        showNotify('success', 'Transaksi pemasukan dan alokasi otomatis berhasil dicatat')
        resetFormPemasukan()
      }
      if (onDataUpdated) onDataUpdated()
    } catch (err) {
      showNotify('error', err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePemasukan = async (idTrx) => {
    if (!window.confirm(`Hapus transaksi pemasukan ${idTrx} beserta catatan alokasinya?`)) return
    try {
      await deletePemasukan(churchId, idTrx)
      showNotify('success', `Transaksi ${idTrx} berhasil dihapus`)
      if (editingTrxId === idTrx) resetFormPemasukan()
      if (onDataUpdated) onDataUpdated()
    } catch (err) {
      showNotify('error', err.response?.data?.error || err.message)
    }
  }

  // =========================================================================
  // 2. STATE & HANDLER: SESI IBADAH & PELEAN
  // =========================================================================
  const [editingSesiId, setEditingSesiId] = useState(null)
  const [formSesi, setFormSesi] = useState({
    NamaSesi: 'Ibadah Minggu Pagi (Bahasa Batak)',
    Tanggal: '2026-10-18',
    JamMulai: '08:00',
    JumlahHadir: 150,
    p1a: 1200000,
    p1b: 600000,
    p2a: 1500000,
    p2b: 400000,
  })

  const resetFormSesi = () => {
    setEditingSesiId(null)
    setFormSesi({
      NamaSesi: 'Ibadah Minggu Pagi',
      Tanggal: new Date().toISOString().substring(0, 10),
      JamMulai: '08:00',
      JumlahHadir: 100,
      p1a: 0,
      p1b: 0,
      p2a: 0,
      p2b: 0,
    })
  }

  const totalPeleanFormSesi =
    (parseFloat(formSesi.p1a) || 0) +
    (parseFloat(formSesi.p1b) || 0) +
    (parseFloat(formSesi.p2a) || 0) +
    (parseFloat(formSesi.p2b) || 0)

  const handleSaveSesi = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const sesiPayload = {
        NamaSesi: formSesi.NamaSesi,
        Tanggal: formSesi.Tanggal,
        JamMulai: formSesi.JamMulai,
        JumlahHadir: parseInt(formSesi.JumlahHadir, 10) || 0,
        Pelean: [
          { Jenis: '1a', Nominal: parseFloat(formSesi.p1a) || 0 },
          { Jenis: '1b', Nominal: parseFloat(formSesi.p1b) || 0 },
          { Jenis: '2a', Nominal: parseFloat(formSesi.p2a) || 0 },
          { Jenis: '2b', Nominal: parseFloat(formSesi.p2b) || 0 },
        ],
      }

      if (editingSesiId) {
        await updateSesi(churchId, editingSesiId, sesiPayload)
        showNotify('success', `Sesi ibadah ${editingSesiId} berhasil diperbarui`)
        resetFormSesi()
      } else {
        await addSesi(churchId, sesiPayload)
        showNotify('success', 'Sesi ibadah dan 4 kantong pelean berhasil disimpan')
        resetFormSesi()
      }
      if (onDataUpdated) onDataUpdated()
    } catch (err) {
      showNotify('error', err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSesi = async (idSesi) => {
    if (!window.confirm(`Hapus catatan sesi ibadah ${idSesi}?`)) return
    try {
      await deleteSesi(churchId, idSesi)
      showNotify('success', `Sesi ibadah ${idSesi} berhasil dihapus`)
      if (editingSesiId === idSesi) resetFormSesi()
      if (onDataUpdated) onDataUpdated()
    } catch (err) {
      showNotify('error', err.response?.data?.error || err.message)
    }
  }

  // =========================================================================
  // 3. STATE & HANDLER: ALOKASI TRANSAKSI
  // =========================================================================
  const [editingAlokasiId, setEditingAlokasiId] = useState(null)
  const [formAlokasi, setFormAlokasi] = useState({
    IdTransaksi: '',
    Peruntukan: 'Kas Huria',
    Nominal: 300000,
  })

  const resetFormAlokasi = () => {
    setEditingAlokasiId(null)
    setFormAlokasi({
      IdTransaksi: myChurch?.PemasukanJemaat?.[0]?.IdTransaksi || '',
      Peruntukan: 'Kas Huria',
      Nominal: 200000,
    })
  }

  const handleSaveAlokasi = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const alokPayload = {
        IdTransaksi: formAlokasi.IdTransaksi,
        Peruntukan: formAlokasi.Peruntukan,
        Nominal: parseFloat(formAlokasi.Nominal) || 0,
      }

      if (editingAlokasiId) {
        await updateAlokasi(churchId, editingAlokasiId, alokPayload)
        showNotify('success', `Alokasi ${editingAlokasiId} berhasil diperbarui`)
        resetFormAlokasi()
      } else {
        await addAlokasi(churchId, alokPayload)
        showNotify('success', 'Alokasi transaksi baru berhasil ditambahkan')
        resetFormAlokasi()
      }
      if (onDataUpdated) onDataUpdated()
    } catch (err) {
      showNotify('error', err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAlokasi = async (idAlokasi) => {
    if (!window.confirm(`Hapus catatan alokasi ${idAlokasi}?`)) return
    try {
      await deleteAlokasi(churchId, idAlokasi)
      showNotify('success', `Alokasi ${idAlokasi} berhasil dihapus`)
      if (editingAlokasiId === idAlokasi) resetFormAlokasi()
      if (onDataUpdated) onDataUpdated()
    } catch (err) {
      showNotify('error', err.response?.data?.error || err.message)
    }
  }

  // =========================================================================
  // 4. STATE & HANDLER: SETORAN PUSAT & RINCIAN
  // =========================================================================
  const [editingSetoranId, setEditingSetoranId] = useState(null)
  const [formSetoran, setFormSetoran] = useState({
    Periode: '2026-10',
    TanggalSetor: '2026-10-31',
    TotalSetoran: 2500000,
    Keterangan: 'Pelunasan setoran pusat bulan Oktober via transfer Bank Mandiri',
  })

  const resetFormSetoran = () => {
    setEditingSetoranId(null)
    setFormSetoran({
      Periode: '2026-10',
      TanggalSetor: new Date().toISOString().substring(0, 10),
      TotalSetoran: 1000000,
      Keterangan: '',
    })
  }

  const handleSaveSetoran = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const setoranPayload = {
        Periode: formSetoran.Periode,
        TanggalSetor: formSetoran.TanggalSetor,
        TotalSetoran: parseFloat(formSetoran.TotalSetoran) || 0,
        Keterangan: formSetoran.Keterangan,
      }

      if (editingSetoranId) {
        await updateSetoran(churchId, editingSetoranId, setoranPayload)
        showNotify('success', `Setoran pusat ${editingSetoranId} berhasil diperbarui`)
        resetFormSetoran()
      } else {
        await addSetoran(churchId, setoranPayload, [])
        showNotify('success', 'Setoran pusat berhasil dicatat')
        resetFormSetoran()
      }
      if (onDataUpdated) onDataUpdated()
    } catch (err) {
      showNotify('error', err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSetoran = async (idSetoran) => {
    if (!window.confirm(`Hapus catatan setoran pusat ${idSetoran}?`)) return
    try {
      await deleteSetoran(churchId, idSetoran)
      showNotify('success', `Setoran pusat ${idSetoran} berhasil dihapus`)
      if (editingSetoranId === idSetoran) resetFormSetoran()
      if (onDataUpdated) onDataUpdated()
    } catch (err) {
      showNotify('error', err.response?.data?.error || err.message)
    }
  }

  // =========================================================================
  // 5. STATE & HANDLER: KATEGORI PEMASUKAN
  // =========================================================================
  const [editingKatId, setEditingKatId] = useState(null)
  const [formKat, setFormKat] = useState({
    NamaKategori: '',
    IdKategoriInduk: 'Pelean Rutin',
  })

  const resetFormKat = () => {
    setEditingKatId(null)
    setFormKat({ NamaKategori: '', IdKategoriInduk: 'Pelean Rutin' })
  }

  const handleSaveKategori = async (e) => {
    e.preventDefault()
    if (!formKat.NamaKategori.trim()) return
    setLoading(true)
    try {
      const katPayload = {
        NamaKategori: formKat.NamaKategori.trim(),
        IdKategoriInduk: formKat.IdKategoriInduk,
      }

      if (editingKatId) {
        await updateKategori(churchId, editingKatId, katPayload)
        showNotify('success', `Kategori ${editingKatId} berhasil diperbarui`)
        resetFormKat()
      } else {
        await addKategori(churchId, katPayload)
        showNotify('success', `Kategori "${formKat.NamaKategori}" berhasil ditambahkan`)
        resetFormKat()
      }
      if (onDataUpdated) onDataUpdated()
    } catch (err) {
      showNotify('error', err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteKategori = async (idKategori, nama) => {
    if (!window.confirm(`Hapus kategori "${nama || idKategori}"?`)) return
    try {
      await deleteKategori(churchId, idKategori)
      showNotify('success', `Kategori ${idKategori} berhasil dihapus`)
      if (editingKatId === idKategori) resetFormKat()
      if (onDataUpdated) onDataUpdated()
    } catch (err) {
      showNotify('error', err.response?.data?.error || err.message)
    }
  }

  // =========================================================================
  // 6. STATE & HANDLER: SEKTOR LUNGGU
  // =========================================================================
  const [editingLungguId, setEditingLungguId] = useState(null)
  const [formLunggu, setFormLunggu] = useState({
    NamaLunggu: '',
    Keterangan: '',
  })

  const resetFormLunggu = () => {
    setEditingLungguId(null)
    setFormLunggu({ NamaLunggu: '', Keterangan: '' })
  }

  const handleSaveLunggu = async (e) => {
    e.preventDefault()
    if (!formLunggu.NamaLunggu.trim()) return
    setLoading(true)
    try {
      const lungguPayload = {
        NamaLunggu: formLunggu.NamaLunggu.trim(),
        Keterangan: formLunggu.Keterangan.trim(),
      }

      if (editingLungguId) {
        await updateLunggu(churchId, editingLungguId, lungguPayload)
        showNotify('success', `Sektor Lunggu ${editingLungguId} berhasil diperbarui`)
        resetFormLunggu()
      } else {
        await addLunggu(churchId, lungguPayload)
        showNotify('success', `Sektor Lunggu "${formLunggu.NamaLunggu}" berhasil ditambahkan`)
        resetFormLunggu()
      }
      if (onDataUpdated) onDataUpdated()
    } catch (err) {
      showNotify('error', err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLunggu = async (idLunggu, nama) => {
    if (!window.confirm(`Hapus sektor lunggu "${nama || idLunggu}"?`)) return
    try {
      await deleteLunggu(churchId, idLunggu)
      showNotify('success', `Sektor Lunggu ${idLunggu} berhasil dihapus`)
      if (editingLungguId === idLunggu) resetFormLunggu()
      if (onDataUpdated) onDataUpdated()
    } catch (err) {
      showNotify('error', err.response?.data?.error || err.message)
    }
  }

  // =========================================================================
  // 7. STATE & HANDLER: WARTA JEMAAT
  // =========================================================================
  const [formWarta, setFormWarta] = useState({
    Tema: myChurch?.WartaJemaat?.Tema || 'Manghaporseai Kristus',
    SubTema: myChurch?.WartaJemaat?.SubTema || 'Lam Margogo di Bagasan Haporseaon',
    TataIbadahStr: (myChurch?.WartaJemaat?.TataIbadah || []).join(', '),
    TingtingMarragamStr: (myChurch?.WartaJemaat?.TingtingNaMarragam || []).join('\n'),
    TingtingParhepengonStr: (myChurch?.WartaJemaat?.TingtingParhepengon || []).join('\n'),
  })

  const handleSaveWarta = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await updateWarta(churchId, {
        Tema: formWarta.Tema,
        SubTema: formWarta.SubTema,
        TataIbadah: formWarta.TataIbadahStr.split(',').map((s) => s.trim()).filter(Boolean),
        TingtingNaMarragam: formWarta.TingtingMarragamStr.split('\n').map((s) => s.trim()).filter(Boolean),
        TingtingParhepengon: formWarta.TingtingParhepengonStr.split('\n').map((s) => s.trim()).filter(Boolean),
      })
      showNotify('success', 'Warta jemaat berhasil diperbarui')
      if (onDataUpdated) onDataUpdated()
    } catch (err) {
      showNotify('error', err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter pencarian tabel yang aktif
  const filteredPemasukan = useMemo(() => {
    const list = myChurch?.PemasukanJemaat || []
    if (!searchTerm) return list
    const q = searchTerm.toLowerCase()
    return list.filter(
      (item) =>
        (item.IdTransaksi && item.IdTransaksi.toLowerCase().includes(q)) ||
        (item.IdKategori && item.IdKategori.toLowerCase().includes(q)) ||
        (item.Keterangan && item.Keterangan.toLowerCase().includes(q)) ||
        String(item.Nominal).includes(q)
    )
  }, [myChurch, searchTerm])

  const filteredSesi = useMemo(() => {
    const list = myChurch?.SesiIbadah || []
    if (!searchTerm) return list
    const q = searchTerm.toLowerCase()
    return list.filter(
      (item) =>
        (item.IdSesi && item.IdSesi.toLowerCase().includes(q)) ||
        (item.NamaSesi && item.NamaSesi.toLowerCase().includes(q)) ||
        (item.Tanggal && item.Tanggal.includes(q))
    )
  }, [myChurch, searchTerm])

  const filteredAlokasi = useMemo(() => {
    const list = myChurch?.AlokasiTransaksi || []
    if (!searchTerm) return list
    const q = searchTerm.toLowerCase()
    return list.filter(
      (item) =>
        (item.IdAlokasi && item.IdAlokasi.toLowerCase().includes(q)) ||
        (item.IdTransaksi && item.IdTransaksi.toLowerCase().includes(q)) ||
        (item.Peruntukan && item.Peruntukan.toLowerCase().includes(q)) ||
        String(item.Nominal).includes(q)
    )
  }, [myChurch, searchTerm])

  const filteredSetoran = useMemo(() => {
    const list = myChurch?.SetoranPusat || []
    if (!searchTerm) return list
    const q = searchTerm.toLowerCase()
    return list.filter(
      (item) =>
        (item.IdSetoran && item.IdSetoran.toLowerCase().includes(q)) ||
        (item.Periode && item.Periode.includes(q)) ||
        (item.Keterangan && item.Keterangan.toLowerCase().includes(q))
    )
  }, [myChurch, searchTerm])

  const filteredKategori = useMemo(() => {
    const list = myChurch?.KategoriPemasukan || []
    if (!searchTerm) return list
    const q = searchTerm.toLowerCase()
    return list.filter(
      (item) =>
        (item.IdKategori && item.IdKategori.toLowerCase().includes(q)) ||
        (item.NamaKategori && item.NamaKategori.toLowerCase().includes(q)) ||
        (item.IdKategoriInduk && item.IdKategoriInduk.toLowerCase().includes(q))
    )
  }, [myChurch, searchTerm])

  const filteredLunggu = useMemo(() => {
    const list = myChurch?.Lunggu || []
    if (!searchTerm) return list
    const q = searchTerm.toLowerCase()
    return list.filter(
      (item) =>
        (item.IdLunggu && item.IdLunggu.toLowerCase().includes(q)) ||
        (item.NamaLunggu && item.NamaLunggu.toLowerCase().includes(q)) ||
        (item.Keterangan && item.Keterangan.toLowerCase().includes(q))
    )
  }, [myChurch, searchTerm])

  // If SuperAdmin tries to access, block with explicit Use Case message
  if (isSuperAdmin) {
    return (
      <div className="p-8 bg-surface rounded-2xl border border-line text-center max-w-xl mx-auto my-10 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-warning/10 text-warning flex items-center justify-center mx-auto mb-3">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-ink">
          Akses Dibatasi — SuperAdmin (Read-Only)
        </h3>
        <p className="text-xs sm:text-sm text-muted mt-2 leading-relaxed">
          Berdasarkan Use Case HKBP, <strong>SuperAdmin</strong> berfokus pada fungsi analitis dan monitoring seluruh wilayah sehingga tidak memiliki hak akses mengubah (CRUD) data operasional huria lokal.
        </p>
        <p className="text-xs text-primary font-bold mt-3">
          Fitur pengaturan ini dikhususkan secara eksklusif untuk <strong>Admin Huria</strong>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full pb-10 font-sans">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4 w-full">
        <div>
          <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">
            HKBP · Pengaturan Operasional & Manajemen Data
          </p>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
              Kelola Data Huria
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary border border-primary-100">
              Admin Huria
            </span>
          </div>
          <p className="text-sm text-muted mt-1">
            Kelola (Tambah, Ubah, Hapus) catatan data operasional jemaat & transaksi keuangan untuk{' '}
            <strong className="text-ink">{myHuria?.NamaHuria || 'Gereja Anda'}</strong>.
          </p>
        </div>

        {/* Church scope badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-line shadow-xs">
          <Building2 className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted">Huria Terikat:</span>
          <span className="text-xs font-bold text-ink">
            {myHuria?.NamaHuria || 'Huria'}
          </span>
          <span className="text-[11px] font-semibold text-muted/70">
            ({myHuria?.distrik || ''})
          </span>
        </div>
      </div>

      {/* TOAST NOTIFICATION */}
      {notification && (
        <div
          className={`flex items-center gap-2.5 p-3.5 rounded-xl text-xs sm:text-sm font-semibold border animate-in fade-in duration-150 ${
            notification.type === 'success'
              ? 'bg-success/10 text-success border-success/30'
              : 'bg-danger/10 text-danger border-danger/30'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* 2. SUB-TABS NAVIGATION (Pill Group matching Data Tabel) */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-surface border border-line shadow-xs">
          {[
            { id: 'pemasukan', label: '1. Pemasukan Jemaat', icon: Wallet, count: myChurch?.PemasukanJemaat?.length || 0 },
            { id: 'sesi', label: '2. Sesi Ibadah & Pelean', icon: Calendar, count: myChurch?.SesiIbadah?.length || 0 },
            { id: 'alokasi', label: '3. Alokasi Transaksi', icon: PieChart, count: myChurch?.AlokasiTransaksi?.length || 0 },
            { id: 'setoran', label: '4. Setoran Pusat', icon: Send, count: myChurch?.SetoranPusat?.length || 0 },
            { id: 'kategori', label: '5. Kategori Pemasukan', icon: Tag, count: myChurch?.KategoriPemasukan?.length || 0 },
            { id: 'lunggu', label: '6. Lunggu (Sektor)', icon: Users, count: myChurch?.Lunggu?.length || 0 },
            { id: 'warta', label: '7. Warta Jemaat', icon: Scroll, count: null },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeSubTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveSubTab(tab.id)
                  setSearchTerm('')
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-muted hover:text-primary hover:bg-primary-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-canvas text-muted'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Search input for the table on active subtab */}
        {activeSubTab !== 'warta' && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted/60 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari data tabel..."
              className="h-9 w-48 sm:w-56 pl-8 pr-3 rounded-full border border-line bg-surface text-ink text-xs outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30 transition-all"
            />
          </div>
        )}
      </div>

      {/* ========================================================
          SUBTAB 1: PEMASUKAN JEMAAT (CRUD)
          ======================================================== */}
      {activeSubTab === 'pemasukan' && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(340px,1fr)_minmax(0,1.9fr)] gap-5 w-full items-start">
          {/* Form Create / Edit */}
          <div className="bg-surface rounded-2xl border border-line p-5 sm:p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-ink">
                  {editingTrxId ? 'Ubah Data Pemasukan' : 'Tambah Pemasukan Jemaat'}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  {editingTrxId ? `Mengedit ID Transaksi #${editingTrxId}` : 'Catat penerimaan keuangan jemaat baru'}
                </p>
              </div>
              {editingTrxId && (
                <button
                  type="button"
                  onClick={resetFormPemasukan}
                  className="flex items-center gap-1 text-xs text-muted hover:text-danger cursor-pointer px-2 py-1 rounded-lg border border-line"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Batal</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSavePemasukan} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Tanggal Transaksi <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  value={formPemasukan.Tanggal}
                  onChange={(e) => setFormPemasukan({ ...formPemasukan, Tanggal: e.target.value })}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-line text-sm text-ink bg-surface focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Kategori Pemasukan <span className="text-danger">*</span>
                </label>
                <select
                  value={formPemasukan.IdKategori}
                  onChange={(e) => setFormPemasukan({ ...formPemasukan, IdKategori: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-line text-sm text-ink bg-surface focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30 cursor-pointer"
                >
                  {(myChurch?.KategoriPemasukan || []).map((k) => (
                    <option key={k.IdKategori} value={k.IdKategori}>
                      {k.NamaKategori} ({k.IdKategori})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Nominal Penerimaan (Rp) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  value={formPemasukan.Nominal}
                  onChange={(e) => setFormPemasukan({ ...formPemasukan, Nominal: e.target.value })}
                  required
                  min="1000"
                  step="1000"
                  className="w-full h-10 px-3 rounded-xl border border-line text-sm font-bold text-ink bg-surface focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
                />
                <div className="text-xs text-primary font-semibold mt-1">
                  Terbilang: {formatRupiah(formPemasukan.Nominal)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Keterangan Transaksi
                </label>
                <input
                  type="text"
                  value={formPemasukan.Keterangan}
                  onChange={(e) => setFormPemasukan({ ...formPemasukan, Keterangan: e.target.value })}
                  placeholder="Contoh: Pelean Minggu Ibadah Pagi / Persepuluhan Kel. Sitompul"
                  className="w-full h-10 px-3 rounded-xl border border-line text-sm text-ink bg-surface focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
                />
              </div>

              {/* Alokasi Setoran Pusat slider (Hanya saat buat transaksi baru) */}
              {!editingTrxId && (
                <div className="p-3.5 rounded-xl bg-canvas border border-line flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-semibold text-ink">
                    <span>Alokasi Setoran Pusat Otomatis:</span>
                    <strong className="text-primary">{formPemasukan.AlokasiPusatPercent}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={formPemasukan.AlokasiPusatPercent}
                    onChange={(e) => setFormPemasukan({ ...formPemasukan, AlokasiPusatPercent: Number(e.target.value) })}
                    className="w-full accent-primary cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-muted pt-1">
                    <span>
                      Kas Huria ({100 - formPemasukan.AlokasiPusatPercent}%):{' '}
                      <strong>{formatRupiah((formPemasukan.Nominal * (100 - formPemasukan.AlokasiPusatPercent)) / 100)}</strong>
                    </span>
                    <span>
                      Pusat ({formPemasukan.AlokasiPusatPercent}%):{' '}
                      <strong className="text-primary">{formatRupiah((formPemasukan.Nominal * formPemasukan.AlokasiPusatPercent) / 100)}</strong>
                    </span>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full mt-2"
              >
                {editingTrxId ? 'Simpan Perubahan Pemasukan' : 'Catat Pemasukan Baru'}
              </Button>
            </form>
          </div>

          {/* Tabel Data Pemasukan Jemaat */}
          <div className="bg-surface rounded-2xl border border-line shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-ink">
                  Tabel: Pemasukan Jemaat
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Menampilkan {filteredPemasukan.length} dari total {myChurch?.PemasukanJemaat?.length || 0} transaksi
                </p>
              </div>
            </div>

            <div className="overflow-x-auto flex-1 max-h-[560px] overflow-y-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 bg-primary-50 text-primary border-b border-line z-10">
                  <tr>
                    <th className="p-3 text-left font-bold uppercase tracking-wider">ID</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider">Tanggal</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider">Kategori</th>
                    <th className="p-3 text-right font-bold uppercase tracking-wider">Nominal</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider">Keterangan</th>
                    <th className="p-3 text-center font-bold uppercase tracking-wider w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredPemasukan.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted">
                        Belum ada transaksi pemasukan yang sesuai pencarian
                      </td>
                    </tr>
                  ) : (
                    filteredPemasukan.map((pj) => {
                      const isEditing = editingTrxId === pj.IdTransaksi
                      return (
                        <tr
                          key={pj.IdTransaksi}
                          className={`h-12 transition-colors ${
                            isEditing ? 'bg-primary-50/80 font-semibold' : 'hover:bg-canvas'
                          }`}
                        >
                          <td className="p-3 font-mono font-semibold text-primary">#{pj.IdTransaksi}</td>
                          <td className="p-3 text-muted">{formatDate(pj.Tanggal)}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full bg-primary-50 border border-primary-100 text-[11px] font-semibold text-primary">
                              {pj.IdKategori}
                            </span>
                          </td>
                          <td className="p-3 text-right font-bold text-ink">{formatRupiah(pj.Nominal)}</td>
                          <td className="p-3 text-muted max-w-[200px] truncate">{pj.Keterangan || '-'}</td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTrxId(pj.IdTransaksi)
                                  setFormPemasukan({
                                    Tanggal: pj.Tanggal,
                                    Nominal: pj.Nominal,
                                    IdKategori: pj.IdKategori,
                                    Keterangan: pj.Keterangan || '',
                                    AlokasiPusatPercent: 45,
                                  })
                                }}
                                className="p-1.5 rounded-lg text-primary hover:bg-primary-50 transition-colors cursor-pointer"
                                title="Ubah Data Transaksi"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePemasukan(pj.IdTransaksi)}
                                className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                                title="Hapus Data Transaksi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUBTAB 2: SESI IBADAH & PELEAN (CRUD)
          ======================================================== */}
      {activeSubTab === 'sesi' && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(340px,1fr)_minmax(0,1.9fr)] gap-5 w-full items-start">
          {/* Form Create / Edit */}
          <div className="bg-surface rounded-2xl border border-line p-5 sm:p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-ink">
                  {editingSesiId ? 'Ubah Sesi Ibadah' : 'Tambah Sesi Ibadah & Pelean'}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  {editingSesiId ? `Mengedit ID Sesi #${editingSesiId}` : 'Catat jadwal ibadah dan 4 kantong pelean'}
                </p>
              </div>
              {editingSesiId && (
                <button
                  type="button"
                  onClick={resetFormSesi}
                  className="flex items-center gap-1 text-xs text-muted hover:text-danger cursor-pointer px-2 py-1 rounded-lg border border-line"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Batal</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSaveSesi} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Nama Sesi Ibadah <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={formSesi.NamaSesi}
                  onChange={(e) => setFormSesi({ ...formSesi, NamaSesi: e.target.value })}
                  placeholder="Contoh: Ibadah Minggu Pagi (Bahasa Batak)"
                  required
                  className="w-full h-10 px-3 rounded-xl border border-line text-sm text-ink bg-surface focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1.5">
                    Tanggal Ibadah <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    value={formSesi.Tanggal}
                    onChange={(e) => setFormSesi({ ...formSesi, Tanggal: e.target.value })}
                    required
                    className="w-full h-10 px-3 rounded-xl border border-line text-sm text-ink bg-surface focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1.5">
                    Jam Mulai <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={formSesi.JamMulai}
                    onChange={(e) => setFormSesi({ ...formSesi, JamMulai: e.target.value })}
                    placeholder="08:00"
                    required
                    className="w-full h-10 px-3 rounded-xl border border-line text-sm text-ink bg-surface focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Jumlah Kehadiran Jemaat (Jiwa) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  value={formSesi.JumlahHadir}
                  onChange={(e) => setFormSesi({ ...formSesi, JumlahHadir: e.target.value })}
                  required
                  min="0"
                  className="w-full h-10 px-3 rounded-xl border border-line text-sm font-bold text-ink bg-surface focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
                />
              </div>

              {/* Rincian 4 Kantong Pelean HKBP */}
              <div className="p-3.5 rounded-xl bg-canvas border border-line flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">Rincian 4 Kantong Pelean:</span>
                  <span className="text-xs font-bold text-primary">
                    Total: {formatRupiah(totalPeleanFormSesi)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-muted block mb-1">Pelean 1a (Pusat - Rp):</label>
                    <input
                      type="number"
                      value={formSesi.p1a}
                      onChange={(e) => setFormSesi({ ...formSesi, p1a: e.target.value })}
                      min="0"
                      className="w-full h-9 px-2.5 rounded-lg border border-line text-xs font-semibold text-ink bg-surface focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted block mb-1">Pelean 1b (Pusat - Rp):</label>
                    <input
                      type="number"
                      value={formSesi.p1b}
                      onChange={(e) => setFormSesi({ ...formSesi, p1b: e.target.value })}
                      min="0"
                      className="w-full h-9 px-2.5 rounded-lg border border-line text-xs font-semibold text-ink bg-surface focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted block mb-1">Pelean 2a (Huria - Rp):</label>
                    <input
                      type="number"
                      value={formSesi.p2a}
                      onChange={(e) => setFormSesi({ ...formSesi, p2a: e.target.value })}
                      min="0"
                      className="w-full h-9 px-2.5 rounded-lg border border-line text-xs font-semibold text-ink bg-surface focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted block mb-1">Pelean 2b (Pendidikan - Rp):</label>
                    <input
                      type="number"
                      value={formSesi.p2b}
                      onChange={(e) => setFormSesi({ ...formSesi, p2b: e.target.value })}
                      min="0"
                      className="w-full h-9 px-2.5 rounded-lg border border-line text-xs font-semibold text-ink bg-surface focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full mt-2"
              >
                {editingSesiId ? 'Simpan Perubahan Sesi Ibadah' : 'Simpan Sesi Ibadah'}
              </Button>
            </form>
          </div>

          {/* Tabel Data Sesi Ibadah */}
          <div className="bg-surface rounded-2xl border border-line shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-ink">
                  Tabel: Sesi Ibadah & Pelean
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Menampilkan {filteredSesi.length} dari total {myChurch?.SesiIbadah?.length || 0} sesi
                </p>
              </div>
            </div>

            <div className="overflow-x-auto flex-1 max-h-[560px] overflow-y-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 bg-primary-50 text-primary border-b border-line z-10">
                  <tr>
                    <th className="p-3 text-left font-bold uppercase tracking-wider">ID Sesi</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider">Nama Sesi</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider">Tanggal & Jam</th>
                    <th className="p-3 text-center font-bold uppercase tracking-wider">Hadir</th>
                    <th className="p-3 text-right font-bold uppercase tracking-wider">Total Pelean</th>
                    <th className="p-3 text-center font-bold uppercase tracking-wider w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredSesi.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted">
                        Belum ada sesi ibadah yang sesuai pencarian
                      </td>
                    </tr>
                  ) : (
                    filteredSesi.map((s) => {
                      const totPelean = (s.Pelean || []).reduce((acc, p) => acc + (p.Nominal || 0), 0)
                      const isEditing = editingSesiId === s.IdSesi
                      return (
                        <tr
                          key={s.IdSesi}
                          className={`h-12 transition-colors ${
                            isEditing ? 'bg-primary-50/80 font-semibold' : 'hover:bg-canvas'
                          }`}
                        >
                          <td className="p-3 font-mono font-semibold text-primary">#{s.IdSesi}</td>
                          <td className="p-3 font-semibold text-ink">{s.NamaSesi}</td>
                          <td className="p-3 text-muted">
                            {formatDate(s.Tanggal)} &bull; {s.JamMulai}
                          </td>
                          <td className="p-3 text-center font-bold text-primary">{s.JumlahHadir} Jiwa</td>
                          <td className="p-3 text-right font-bold text-emerald-700">{formatRupiah(totPelean)}</td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const p1a = s.Pelean?.find((p) => p.Jenis === '1a')?.Nominal || 0
                                  const p1b = s.Pelean?.find((p) => p.Jenis === '1b')?.Nominal || 0
                                  const p2a = s.Pelean?.find((p) => p.Jenis === '2a')?.Nominal || 0
                                  const p2b = s.Pelean?.find((p) => p.Jenis === '2b')?.Nominal || 0
                                  setEditingSesiId(s.IdSesi)
                                  setFormSesi({
                                    NamaSesi: s.NamaSesi,
                                    Tanggal: s.Tanggal,
                                    JamMulai: s.JamMulai,
                                    JumlahHadir: s.JumlahHadir,
                                    p1a,
                                    p1b,
                                    p2a,
                                    p2b,
                                  })
                                }}
                                className="p-1.5 rounded-lg text-primary hover:bg-primary-50 transition-colors cursor-pointer"
                                title="Ubah Sesi Ibadah"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSesi(s.IdSesi)}
                                className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                                title="Hapus Sesi Ibadah"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUBTAB 3: ALOKASI TRANSAKSI (CRUD)
          ======================================================== */}
      {activeSubTab === 'alokasi' && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(340px,1fr)_minmax(0,1.9fr)] gap-5 w-full items-start">
          {/* Form Alokasi */}
          <div className="bg-surface rounded-2xl border border-line p-5 sm:p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-ink">
                  {editingAlokasiId ? 'Ubah Alokasi Transaksi' : 'Tambah Alokasi Transaksi'}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  {editingAlokasiId ? `Mengedit ID Alokasi #${editingAlokasiId}` : 'Distribusi pos peruntukan kas huria & pusat'}
                </p>
              </div>
              {editingAlokasiId && (
                <button
                  type="button"
                  onClick={resetFormAlokasi}
                  className="flex items-center gap-1 text-xs text-muted hover:text-danger cursor-pointer px-2 py-1 rounded-lg border border-line"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Batal</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSaveAlokasi} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Pilih ID Transaksi Pemasukan Terkait <span className="text-danger">*</span>
                </label>
                <select
                  value={formAlokasi.IdTransaksi}
                  onChange={(e) => setFormAlokasi({ ...formAlokasi, IdTransaksi: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-line text-sm text-ink bg-surface focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30 cursor-pointer"
                >
                  <option value="">-- Pilih ID Transaksi --</option>
                  {(myChurch?.PemasukanJemaat || []).map((pj) => (
                    <option key={pj.IdTransaksi} value={pj.IdTransaksi}>
                      #{pj.IdTransaksi} &bull; {pj.IdKategori} &bull; {formatRupiah(pj.Nominal)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Peruntukan Alokasi <span className="text-danger">*</span>
                </label>
                <select
                  value={formAlokasi.Peruntukan}
                  onChange={(e) => setFormAlokasi({ ...formAlokasi, Peruntukan: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-line text-sm text-ink bg-surface focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30 cursor-pointer"
                >
                  <option value="Kas Huria">Kas Huria (Operasional Lokal)</option>
                  <option value="Setoran Pusat">Setoran Pusat (Kantor Pusat HKBP)</option>
                  <option value="Dana Sosial">Dana Sosial / Diakonia</option>
                  <option value="Pembangunan">Dana Pembangunan Gereja</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Nominal Alokasi (Rp) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  value={formAlokasi.Nominal}
                  onChange={(e) => setFormAlokasi({ ...formAlokasi, Nominal: e.target.value })}
                  required
                  min="1000"
                  step="1000"
                  className="w-full h-10 px-3 rounded-xl border border-line text-sm font-bold text-ink bg-surface focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
                />
                <div className="text-xs text-primary font-semibold mt-1">
                  Terbilang: {formatRupiah(formAlokasi.Nominal)}
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full mt-2"
              >
                {editingAlokasiId ? 'Simpan Perubahan Alokasi' : 'Tambah Alokasi'}
              </Button>
            </form>
          </div>

          {/* Tabel Alokasi Transaksi */}
          <div className="bg-surface rounded-2xl border border-line shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-ink">
                  Tabel: Alokasi Transaksi
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Menampilkan {filteredAlokasi.length} dari total {myChurch?.AlokasiTransaksi?.length || 0} alokasi
                </p>
              </div>
            </div>

            <div className="overflow-x-auto flex-1 max-h-[560px] overflow-y-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 bg-primary-50 text-primary border-b border-line z-10">
                  <tr>
                    <th className="p-3 text-left font-bold uppercase tracking-wider">ID Alokasi</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider">ID Transaksi Terkait</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider">Peruntukan</th>
                    <th className="p-3 text-right font-bold uppercase tracking-wider">Nominal</th>
                    <th className="p-3 text-center font-bold uppercase tracking-wider w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredAlokasi.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted">
                        Belum ada catatan alokasi yang sesuai
                      </td>
                    </tr>
                  ) : (
                    filteredAlokasi.map((a) => {
                      const isEditing = editingAlokasiId === a.IdAlokasi
                      return (
                        <tr
                          key={a.IdAlokasi}
                          className={`h-12 transition-colors ${
                            isEditing ? 'bg-primary-50/80 font-semibold' : 'hover:bg-canvas'
                          }`}
                        >
                          <td className="p-3 font-mono font-semibold text-primary">#{a.IdAlokasi}</td>
                          <td className="p-3 font-mono text-muted">#{a.IdTransaksi || '-'}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                a.Peruntukan === 'Setoran Pusat'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-primary-50 text-primary border-primary-100'
                              }`}
                            >
                              {a.Peruntukan}
                            </span>
                          </td>
                          <td className="p-3 text-right font-bold text-ink">{formatRupiah(a.Nominal)}</td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAlokasiId(a.IdAlokasi)
                                  setFormAlokasi({
                                    IdTransaksi: a.IdTransaksi || '',
                                    Peruntukan: a.Peruntukan || 'Kas Huria',
                                    Nominal: a.Nominal || 0,
                                  })
                                }}
                                className="p-1.5 rounded-lg text-primary hover:bg-primary-50 transition-colors cursor-pointer"
                                title="Ubah Data Alokasi"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAlokasi(a.IdAlokasi)}
                                className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                                title="Hapus Data Alokasi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUBTAB 4: SETORAN PUSAT (CRUD)
          ======================================================== */}
      {activeSubTab === 'setoran' && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(340px,1fr)_minmax(0,1.9fr)] gap-5 w-full items-start">
          {/* Form Setoran Pusat */}
          <div className="bg-surface rounded-2xl border border-line p-5 sm:p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-ink">
                  {editingSetoranId ? 'Ubah Setoran Pusat' : 'Catat Pelunasan Setoran Pusat'}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  {editingSetoranId ? `Mengedit ID Setoran #${editingSetoranId}` : 'Kewajiban setoran dana huria ke Kantor Pusat'}
                </p>
              </div>
              {editingSetoranId && (
                <button
                  type="button"
                  onClick={resetFormSetoran}
                  className="flex items-center gap-1 text-xs text-muted hover:text-danger cursor-pointer px-2 py-1 rounded-lg border border-line"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Batal</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSaveSetoran} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Periode Bulan (YYYY-MM) <span className="text-danger">*</span>
                </label>
                <input
                  type="month"
                  value={formSetoran.Periode}
                  onChange={(e) => setFormSetoran({ ...formSetoran, Periode: e.target.value })}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-line text-sm text-ink bg-surface focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Tanggal Setor <span className="text-danger">*</span>
                </label>
                <input
                  type="date"
                  value={formSetoran.TanggalSetor}
                  onChange={(e) => setFormSetoran({ ...formSetoran, TanggalSetor: e.target.value })}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-line text-sm text-ink bg-surface focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Total Nominal Setoran (Rp) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  value={formSetoran.TotalSetoran}
                  onChange={(e) => setFormSetoran({ ...formSetoran, TotalSetoran: e.target.value })}
                  required
                  min="1000"
                  step="1000"
                  className="w-full h-10 px-3 rounded-xl border border-line text-sm font-bold text-ink bg-surface focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
                />
                <div className="text-xs text-primary font-semibold mt-1">
                  Terbilang: {formatRupiah(formSetoran.TotalSetoran)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Keterangan / No. Bukti Transfer
                </label>
                <input
                  type="text"
                  value={formSetoran.Keterangan}
                  onChange={(e) => setFormSetoran({ ...formSetoran, Keterangan: e.target.value })}
                  placeholder="Contoh: Transfer Bank Mandiri Bukti #TRF-90219"
                  className="w-full h-10 px-3 rounded-xl border border-line text-sm text-ink bg-surface focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full mt-2"
              >
                {editingSetoranId ? 'Simpan Perubahan Setoran' : 'Simpan Setoran Pusat'}
              </Button>
            </form>
          </div>

          {/* Tabel Data Setoran Pusat */}
          <div className="bg-surface rounded-2xl border border-line shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-ink">
                  Tabel: Setoran Pusat
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Menampilkan {filteredSetoran.length} dari total {myChurch?.SetoranPusat?.length || 0} setoran
                </p>
              </div>
            </div>

            <div className="overflow-x-auto flex-1 max-h-[560px] overflow-y-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 bg-primary-50 text-primary border-b border-line z-10">
                  <tr>
                    <th className="p-3 text-left font-bold uppercase tracking-wider">ID Setoran</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider">Periode</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider">Tgl Setor</th>
                    <th className="p-3 text-right font-bold uppercase tracking-wider">Total Setor</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider">Keterangan</th>
                    <th className="p-3 text-center font-bold uppercase tracking-wider w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredSetoran.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted">
                        Belum ada catatan setoran pusat yang sesuai
                      </td>
                    </tr>
                  ) : (
                    filteredSetoran.map((sp) => {
                      const isEditing = editingSetoranId === sp.IdSetoran
                      return (
                        <tr
                          key={sp.IdSetoran}
                          className={`h-12 transition-colors ${
                            isEditing ? 'bg-primary-50/80 font-semibold' : 'hover:bg-canvas'
                          }`}
                        >
                          <td className="p-3 font-mono font-semibold text-primary">#{sp.IdSetoran}</td>
                          <td className="p-3 font-bold text-ink">{sp.Periode}</td>
                          <td className="p-3 text-muted">{formatDate(sp.TanggalSetor)}</td>
                          <td className="p-3 text-right font-bold text-emerald-700">{formatRupiah(sp.TotalSetoran)}</td>
                          <td className="p-3 text-muted max-w-[200px] truncate">{sp.Keterangan || '-'}</td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSetoranId(sp.IdSetoran)
                                  setFormSetoran({
                                    Periode: sp.Periode || '2026-10',
                                    TanggalSetor: sp.TanggalSetor || new Date().toISOString().substring(0, 10),
                                    TotalSetoran: sp.TotalSetoran || 0,
                                    Keterangan: sp.Keterangan || '',
                                  })
                                }}
                                className="p-1.5 rounded-lg text-primary hover:bg-primary-50 transition-colors cursor-pointer"
                                title="Ubah Data Setoran"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSetoran(sp.IdSetoran)}
                                className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                                title="Hapus Data Setoran"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUBTAB 5: KATEGORI PEMASUKAN (CRUD)
          ======================================================== */}
      {activeSubTab === 'kategori' && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(340px,1fr)_minmax(0,1.9fr)] gap-5 w-full items-start">
          {/* Form Kategori */}
          <div className="bg-surface rounded-2xl border border-line p-5 sm:p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-ink">
                  {editingKatId ? 'Ubah Kategori Pemasukan' : 'Tambah Kategori Pemasukan'}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  {editingKatId ? `Mengedit Kategori #${editingKatId}` : 'Kelola jenis penerimaan jemaat'}
                </p>
              </div>
              {editingKatId && (
                <button
                  type="button"
                  onClick={resetFormKat}
                  className="flex items-center gap-1 text-xs text-muted hover:text-danger cursor-pointer px-2 py-1 rounded-lg border border-line"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Batal</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSaveKategori} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Nama Kategori <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pelean Minggu, Guguan Taon, Hamuliateon..."
                  value={formKat.NamaKategori}
                  onChange={(e) => setFormKat({ ...formKat, NamaKategori: e.target.value })}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-line text-sm text-ink bg-surface focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Kategori Induk <span className="text-danger">*</span>
                </label>
                <select
                  value={formKat.IdKategoriInduk}
                  onChange={(e) => setFormKat({ ...formKat, IdKategoriInduk: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-line text-sm text-ink bg-surface focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30 cursor-pointer"
                >
                  <option value="Pelean Rutin">Pelean Rutin</option>
                  <option value="Iuran & Kewajiban Jemaat">Iuran & Kewajiban Jemaat</option>
                  <option value="Ucapan Syukur & Donasi">Ucapan Syukur & Donasi</option>
                  <option value="Kegiatan & Pesta Huria">Kegiatan & Pesta Huria</option>
                  <option value="Pembangunan Gereja">Pembangunan Gereja</option>
                </select>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full mt-2"
              >
                {editingKatId ? 'Simpan Perubahan Kategori' : 'Tambah Kategori'}
              </Button>
            </form>
          </div>

          {/* Tabel Kategori */}
          <div className="bg-surface rounded-2xl border border-line shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-ink">
                  Tabel: Kategori Pemasukan
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Menampilkan {filteredKategori.length} dari total {myChurch?.KategoriPemasukan?.length || 0} kategori
                </p>
              </div>
            </div>

            <div className="overflow-x-auto flex-1 max-h-[560px] overflow-y-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 bg-primary-50 text-primary border-b border-line z-10">
                  <tr>
                    <th className="p-3 text-left font-bold uppercase tracking-wider">ID</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider">Nama Kategori</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider">Kategori Induk</th>
                    <th className="p-3 text-center font-bold uppercase tracking-wider w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredKategori.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted">
                        Belum ada kategori yang sesuai
                      </td>
                    </tr>
                  ) : (
                    filteredKategori.map((k) => {
                      const isEditing = editingKatId === k.IdKategori
                      return (
                        <tr
                          key={k.IdKategori}
                          className={`h-12 transition-colors ${
                            isEditing ? 'bg-primary-50/80 font-semibold' : 'hover:bg-canvas'
                          }`}
                        >
                          <td className="p-3 font-mono font-semibold text-primary">#{k.IdKategori}</td>
                          <td className="p-3 font-bold text-ink">{k.NamaKategori}</td>
                          <td className="p-3 text-muted">
                            <span className="px-2 py-0.5 rounded-full bg-canvas border border-line text-[11px]">
                              {k.IdKategoriInduk || 'Umum'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingKatId(k.IdKategori)
                                  setFormKat({
                                    NamaKategori: k.NamaKategori || '',
                                    IdKategoriInduk: k.IdKategoriInduk || 'Pelean Rutin',
                                  })
                                }}
                                className="p-1.5 rounded-lg text-primary hover:bg-primary-50 transition-colors cursor-pointer"
                                title="Ubah Kategori"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteKategori(k.IdKategori, k.NamaKategori)}
                                className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                                title="Hapus Kategori"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUBTAB 6: SEKTOR LUNGGU (CRUD)
          ======================================================== */}
      {activeSubTab === 'lunggu' && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(340px,1fr)_minmax(0,1.9fr)] gap-5 w-full items-start">
          {/* Form Lunggu */}
          <div className="bg-surface rounded-2xl border border-line p-5 sm:p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-ink">
                  {editingLungguId ? 'Ubah Sektor Lunggu' : 'Tambah Sektor Lunggu'}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  {editingLungguId ? `Mengedit Lunggu #${editingLungguId}` : 'Kelola pembagian wilayah lingkungan jemaat'}
                </p>
              </div>
              {editingLungguId && (
                <button
                  type="button"
                  onClick={resetFormLunggu}
                  className="flex items-center gap-1 text-xs text-muted hover:text-danger cursor-pointer px-2 py-1 rounded-lg border border-line"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Batal</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSaveLunggu} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Nama Sektor Lunggu <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Lunggu Sion, Lunggu Betlehem, Sektor I..."
                  value={formLunggu.NamaLunggu}
                  onChange={(e) => setFormLunggu({ ...formLunggu, NamaLunggu: e.target.value })}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-line text-sm text-ink bg-surface focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Keterangan / Koordinator Sintua
                </label>
                <textarea
                  rows={3}
                  placeholder="Wilayah Jl. Sudirman & sekitarnya - Koordinator: St. B. Sitompul"
                  value={formLunggu.Keterangan}
                  onChange={(e) => setFormLunggu({ ...formLunggu, Keterangan: e.target.value })}
                  className="w-full p-3 rounded-xl border border-line text-sm text-ink bg-surface focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30 resize-none"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full mt-2"
              >
                {editingLungguId ? 'Simpan Perubahan Lunggu' : 'Tambah Sektor Lunggu'}
              </Button>
            </form>
          </div>

          {/* Tabel Lunggu */}
          <div className="bg-surface rounded-2xl border border-line shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-ink">
                  Tabel: Lunggu (Sektor)
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Menampilkan {filteredLunggu.length} dari total {myChurch?.Lunggu?.length || 0} sektor
                </p>
              </div>
            </div>

            <div className="overflow-x-auto flex-1 max-h-[560px] overflow-y-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 bg-primary-50 text-primary border-b border-line z-10">
                  <tr>
                    <th className="p-3 text-left font-bold uppercase tracking-wider">ID</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider">Nama Lunggu</th>
                    <th className="p-3 text-left font-bold uppercase tracking-wider">Keterangan</th>
                    <th className="p-3 text-center font-bold uppercase tracking-wider w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredLunggu.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted">
                        Belum ada sektor lunggu yang sesuai
                      </td>
                    </tr>
                  ) : (
                    filteredLunggu.map((l) => {
                      const isEditing = editingLungguId === l.IdLunggu
                      return (
                        <tr
                          key={l.IdLunggu}
                          className={`h-12 transition-colors ${
                            isEditing ? 'bg-primary-50/80 font-semibold' : 'hover:bg-canvas'
                          }`}
                        >
                          <td className="p-3 font-mono font-semibold text-primary">#{l.IdLunggu}</td>
                          <td className="p-3 font-bold text-ink">{l.NamaLunggu}</td>
                          <td className="p-3 text-muted">{l.Keterangan || '-'}</td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingLungguId(l.IdLunggu)
                                  setFormLunggu({
                                    NamaLunggu: l.NamaLunggu || '',
                                    Keterangan: l.Keterangan || '',
                                  })
                                }}
                                className="p-1.5 rounded-lg text-primary hover:bg-primary-50 transition-colors cursor-pointer"
                                title="Ubah Sektor Lunggu"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLunggu(l.IdLunggu, l.NamaLunggu)}
                                className="p-1.5 rounded-lg text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                                title="Hapus Sektor Lunggu"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          SUBTAB 7: WARTA JEMAAT
          ======================================================== */}
      {activeSubTab === 'warta' && (
        <div className="bg-surface rounded-2xl border border-line p-5 sm:p-6 shadow-xs w-full">
          <div className="pb-3.5 border-b border-line mb-4">
            <h3 className="text-base font-bold text-ink">
              Kelola Warta Jemaat Minggu
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Perbarui tema kotbah, tata ibadah, dan pengumuman jemaat aktif pada warta gereja
            </p>
          </div>

          <form onSubmit={handleSaveWarta} className="flex flex-col gap-4 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Tema Khotbah <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={formWarta.Tema}
                  onChange={(e) => setFormWarta({ ...formWarta, Tema: e.target.value })}
                  required
                  className="w-full h-10 px-3 rounded-xl border border-line text-sm text-ink bg-surface focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">Sub-Tema</label>
                <input
                  type="text"
                  value={formWarta.SubTema}
                  onChange={(e) => setFormWarta({ ...formWarta, SubTema: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-line text-sm text-ink bg-surface focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1.5">
                Tata Ibadah (Pisahkan dengan tanda koma)
              </label>
              <input
                type="text"
                value={formWarta.TataIbadahStr}
                onChange={(e) => setFormWarta({ ...formWarta, TataIbadahStr: e.target.value })}
                placeholder="Marende BE 1, Votum, Jamita, Pelean, Tangiang"
                className="w-full h-10 px-3 rounded-xl border border-line text-sm text-ink bg-surface focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Tingting Na Marragam (1 baris per pengumuman)
                </label>
                <textarea
                  rows={4}
                  value={formWarta.TingtingMarragamStr}
                  onChange={(e) => setFormWarta({ ...formWarta, TingtingMarragamStr: e.target.value })}
                  className="w-full p-3 rounded-xl border border-line text-sm text-ink bg-surface focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30 resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1.5">
                  Tingting Parhepengon (Pengumuman Keuangan)
                </label>
                <textarea
                  rows={4}
                  value={formWarta.TingtingParhepengonStr}
                  onChange={(e) => setFormWarta({ ...formWarta, TingtingParhepengonStr: e.target.value })}
                  className="w-full p-3 rounded-xl border border-line text-sm text-ink bg-surface focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30 resize-y"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-fit cursor-pointer"
            >
              Simpan Warta Jemaat
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
