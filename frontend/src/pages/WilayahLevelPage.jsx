import React, { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWilayahList, useWilayahDetail } from '../hooks/useWilayahExplorer'
import { WilayahHeader } from '../components/wilayah/WilayahHeader'
import { KpiStrip } from '../components/wilayah/KpiStrip'
import { ListControls } from '../components/wilayah/ListControls'
import { WilayahCard } from '../components/wilayah/WilayahCard'
import { WilayahTable } from '../components/wilayah/WilayahTable'
import { Pagination } from '../components/wilayah/Pagination'
import { SkeletonWilayah } from '../components/wilayah/SkeletonWilayah'
import { EmptyStateWilayah } from '../components/wilayah/EmptyStateWilayah'
import { ErrorStateWilayah } from '../components/wilayah/ErrorStateWilayah'
import { exportWilayahToCsv } from '../lib/format'

/**
 * WilayahLevelPage
 * Komponen halaman generik untuk 3 level hierarki HKBP:
 * - /wilayah             -> Level 1: distrik
 * - /wilayah/distrik/:id -> Level 2: resort dalam distrik
 * - /wilayah/resort/:id  -> Level 3: huria dalam resort
 */
export function WilayahLevelPage({
  level = 'distrik',
  idInduk = '',
  globalFilters = {},
  onNavigate,
}) {
  const { isSuperAdmin, isAdmin, user } = useAuth()

  // 1. Ambil detail wilayah induk (untuk breadcrumbs, judul, pimpinan)
  // Kecuali level distrik teratas yang tidak memiliki induk
  const parentLevel =
    level === 'resort'
      ? 'distrik'
      : level === 'huria'
      ? 'resort'
      : 'pusat'

  const {
    detail: parentDetail,
    loading: parentLoading,
    error: parentError,
    refetch: refetchParent,
  } = useWilayahDetail(parentLevel, idInduk, { globalPeriode: globalFilters })

  // 2. Ambil daftar anak wilayah
  const {
    items,
    ringkasan,
    total,
    page,
    limit,
    loading: listLoading,
    error: listError,
    searchQuery,
    setSearchQuery,
    resetSearch,
    sort,
    setSort,
    status,
    setStatus,
    view,
    setView,
    setPage,
    refetch: refetchList,
  } = useWilayahList(level, idInduk, { globalPeriode: globalFilters })

  // 3. Susun Rekam Jejak (Breadcrumb)
  const breadcrumbs = useMemo(() => {
    const list = []

    // Semua pengguna terotentikasi (Super Admin & Admin) dapat melihat hierarki Wilayah HKBP
    list.push({
      label: 'Wilayah HKBP',
      href: '/wilayah',
      level: 'distrik',
    })

    if (level === 'distrik') {
      // Di level distrik, label terakhir adalah 'Distrik'
      list.push({
        label: 'Distrik',
        level: 'distrik',
      })
      return list
    }

    // Jika level di bawah distrik, masukkan rantai leluhur
    if (parentDetail?.leluhur) {
      parentDetail.leluhur.forEach((anc) => {
        const href =
          anc.level === 'distrik'
            ? `/wilayah/distrik/${anc.id}`
            : anc.level === 'resort'
            ? `/wilayah/resort/${anc.id}`
            : `/wilayah/huria/${anc.id}`

        list.push({
          label: anc.nama,
          href,
          level: anc.level,
        })
      })
    }

    // Masukkan induk langsung
    if (parentDetail) {
      list.push({
        label: parentDetail.nama,
        level: parentLevel,
      })
    }

    return list
  }, [level, parentDetail, parentLevel])

  // 4. Verifikasi Cakupan Hak Akses Role (RBAC Scope Guard)
  // Admin dan Super Admin diizinkan melihat informasi publik/wilayah seluruh HKBP
  const isOutOfScope = false

  // 5. Penentuan Judul dan Subjudul Halaman
  const childNoun =
    level === 'distrik'
      ? 'Distrik'
      : level === 'resort'
      ? 'Resort'
      : 'Huria'

  const pageTitle =
    level === 'distrik'
      ? 'Wilayah HKBP'
      : parentDetail?.nama || `Daftar ${childNoun}`

  const countSubtitle = `${total} ${childNoun.toLowerCase()} ${
    level === 'distrik' ? 'di seluruh Indonesia' : 'dalam wilayah ini'
  }`

  // 6. Tangani Tombol Ekspor CSV
  const handleExportCsv = () => {
    const filename = `${level}-${idInduk || 'semua'}-${new Date().toISOString().slice(0, 10)}.csv`
    exportWilayahToCsv(filename, items, childNoun)
  }

  // JIKA WILAYAH INDUK TIDAK DITEMUKAN ATAU DI LUAR CAKUPAN ROLE
  if (isOutOfScope || (level !== 'distrik' && !parentLoading && (!parentDetail || parentError))) {
    return (
      <div className="flex flex-col gap-6">
        <WilayahHeader
          breadcrumbs={breadcrumbs.slice(0, 1)}
          title="Wilayah HKBP"
          subtitle="Pemeriksaan Hak Akses & Lokasi"
          onNavigate={onNavigate}
        />
        <ErrorStateWilayah
          isNotFound={true}
          onBack={() => onNavigate ? onNavigate('/wilayah') : (window.location.href = '/wilayah')}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-12 w-full font-sans">
      {/* 1. HEADER KONSISTEN DI POSISI PALING ATAS */}
      <WilayahHeader
        breadcrumbs={breadcrumbs}
        title={pageTitle}
        subtitle={countSubtitle}
        pimpinan={parentDetail?.namaPimpinan}
        onExportCsv={handleExportCsv}
        onNavigate={onNavigate}
      />

      {/* 2. STRIP RINGKASAN KPI DI ATAS DAFTAR */}
      <KpiStrip ringkasan={ringkasan} levelAnak={level} />

      {/* 3. KONTROL DAFTAR (SEARCH, SORT, STATUS, VIEW TOGGLE) */}
      <ListControls
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onResetSearch={resetSearch}
        sort={sort}
        onSortChange={setSort}
        status={status}
        onStatusChange={setStatus}
        view={view}
        onViewChange={setView}
        totalResults={total}
      />

      {/* 4. DAFTAR WILAYAH (GRID KARTU ATAU TABEL) */}
      {listLoading && items.length === 0 ? (
        <SkeletonWilayah view={view} count={limit > 0 ? 6 : 8} />
      ) : listError ? (
        <ErrorStateWilayah
          title="Gagal Memuat Daftar Wilayah"
          message={listError}
          onRetry={refetchList}
        />
      ) : items.length === 0 ? (
        <EmptyStateWilayah
          isSearch={Boolean(searchQuery || status !== 'semua')}
          searchQuery={searchQuery}
          onResetSearch={resetSearch}
        />
      ) : view === 'table' ? (
        <WilayahTable
          items={items}
          level={level}
          sort={sort}
          onSortChange={setSort}
          onNavigate={onNavigate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {items.map((item) => (
            <WilayahCard
              key={item.id}
              item={item}
              level={level}
              nextLevelName={childNoun}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}

      {/* 5. PAGINASI (UNTUK LEVEL HURIA & GEREJA) */}
      {limit > 0 && total > limit && (
        <div className="pt-2">
          <Pagination
            currentPage={page}
            totalItems={total}
            pageSize={limit}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  )
}
