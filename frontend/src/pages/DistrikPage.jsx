import useWilayah from '../hooks/useWilayah'

export default function DistrikPage() {
  const { data, loading, error } = useWilayah()
  const distrik = data[0]?.Pusat?.Distrik ?? []

  if (loading) return <p className="p-8 text-muted">Memuat...</p>
  if (error) return <p className="p-8 text-danger">Gagal memuat: {error}</p>

  return (
    <div className="min-h-screen bg-canvas p-8">
      <h1 className="text-2xl font-bold text-primary mb-4">Daftar Distrik</h1>
      <ul className="space-y-2">
        {distrik.map((d, i) => (
          <li key={i} className="bg-surface rounded-lg p-4 shadow-xs border border-line">
            {d.NamaDistrik} — {d.Resort?.length ?? 0} resort
          </li>
        ))}
      </ul>
    </div>
  )
}