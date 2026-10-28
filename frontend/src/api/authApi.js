import client from './client'

export const loginApi = async (email, password) => {
  const res = await client.post('/auth/login', { email, password })
  return res.data
}

export const getMeApi = async () => {
  const res = await client.get('/auth/me')
  return res.data
}
