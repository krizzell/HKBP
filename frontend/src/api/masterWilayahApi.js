import client from './client'

// --- DISTRIK ---
export const getDistrikList = (params = {}) =>
  client.get('/distrik', { params }).then((res) => res.data)

export const getDistrikById = (id) =>
  client.get(`/distrik/${id}`).then((res) => res.data)

export const createDistrik = (data) =>
  client.post('/distrik', data).then((res) => res.data)

export const updateDistrik = (id, data) =>
  client.put(`/distrik/${id}`, data).then((res) => res.data)

export const deleteDistrik = (id) =>
  client.delete(`/distrik/${id}`).then((res) => res.data)

// --- RESORT ---
export const getResortList = (params = {}) =>
  client.get('/resort', { params }).then((res) => res.data)

export const getResortById = (id) =>
  client.get(`/resort/${id}`).then((res) => res.data)

export const createResort = (data) =>
  client.post('/resort', data).then((res) => res.data)

export const updateResort = (id, data) =>
  client.put(`/resort/${id}`, data).then((res) => res.data)

export const deleteResort = (id) =>
  client.delete(`/resort/${id}`).then((res) => res.data)

// --- HURIA ---
export const getHuriaList = (params = {}) =>
  client.get('/huria', { params }).then((res) => res.data)

export const getHuriaById = (id) =>
  client.get(`/huria/${id}`).then((res) => res.data)

export const createHuria = (data) =>
  client.post('/huria', data).then((res) => res.data)

export const updateHuria = (id, data) =>
  client.put(`/huria/${id}`, data).then((res) => res.data)

export const deleteHuria = (id) =>
  client.delete(`/huria/${id}`).then((res) => res.data)
