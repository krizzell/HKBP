import client from './client'

export const getWilayah = () => client.get('/wilayah').then((res) => res.data)

export const resetSeeder = () => client.post('/seeder/reset').then((res) => res.data)

export const getHuria = (idHuria) => client.get(`/huria/${idHuria}`).then((res) => res.data)
export const updateHuria = (idHuria, data) => client.put(`/huria/${idHuria}`, data).then((res) => res.data)


// Pemasukan
export const addPemasukan = (idHuria, pemasukan, alokasiPusatPercent = 0.55) =>
  client.post(`/huria/${idHuria}/pemasukan`, { pemasukan, alokasiPusatPercent }).then((res) => res.data)

export const updatePemasukan = (idHuria, idTransaksi, pemasukan) =>
  client.put(`/huria/${idHuria}/pemasukan/${idTransaksi}`, pemasukan).then((res) => res.data)

export const deletePemasukan = (idHuria, idTransaksi) =>
  client.delete(`/huria/${idHuria}/pemasukan/${idTransaksi}`).then((res) => res.data)

// Sesi Ibadah
export const addSesi = (idHuria, sesi) =>
  client.post(`/huria/${idHuria}/sesi`, sesi).then((res) => res.data)

export const updateSesi = (idHuria, idSesi, sesi) =>
  client.put(`/huria/${idHuria}/sesi/${idSesi}`, sesi).then((res) => res.data)

export const deleteSesi = (idHuria, idSesi) =>
  client.delete(`/huria/${idHuria}/sesi/${idSesi}`).then((res) => res.data)

// Alokasi
export const addAlokasi = (idHuria, alokasi) =>
  client.post(`/huria/${idHuria}/alokasi`, alokasi).then((res) => res.data)

export const updateAlokasi = (idHuria, idAlokasi, alokasi) =>
  client.put(`/huria/${idHuria}/alokasi/${idAlokasi}`, alokasi).then((res) => res.data)

export const deleteAlokasi = (idHuria, idAlokasi) =>
  client.delete(`/huria/${idHuria}/alokasi/${idAlokasi}`).then((res) => res.data)

// Setoran Pusat
export const addSetoran = (idHuria, setoran, rincian = []) =>
  client.post(`/huria/${idHuria}/setoran`, { setoran, rincian }).then((res) => res.data)

export const updateSetoran = (idHuria, idSetoran, setoran) =>
  client.put(`/huria/${idHuria}/setoran/${idSetoran}`, setoran).then((res) => res.data)

export const deleteSetoran = (idHuria, idSetoran) =>
  client.delete(`/huria/${idHuria}/setoran/${idSetoran}`).then((res) => res.data)

// Kategori
export const addKategori = (idHuria, kategori) =>
  client.post(`/huria/${idHuria}/kategori`, kategori).then((res) => res.data)

export const updateKategori = (idHuria, idKategori, kategori) =>
  client.put(`/huria/${idHuria}/kategori/${idKategori}`, kategori).then((res) => res.data)

export const deleteKategori = (idHuria, idKategori) =>
  client.delete(`/huria/${idHuria}/kategori/${idKategori}`).then((res) => res.data)

// Lunggu
export const addLunggu = (idHuria, lunggu) =>
  client.post(`/huria/${idHuria}/lunggu`, lunggu).then((res) => res.data)

export const updateLunggu = (idHuria, idLunggu, lunggu) =>
  client.put(`/huria/${idHuria}/lunggu/${idLunggu}`, lunggu).then((res) => res.data)

export const deleteLunggu = (idHuria, idLunggu) =>
  client.delete(`/huria/${idHuria}/lunggu/${idLunggu}`).then((res) => res.data)

// Warta
export const updateWarta = (idHuria, warta) =>
  client.put(`/huria/${idHuria}/warta`, warta).then((res) => res.data)