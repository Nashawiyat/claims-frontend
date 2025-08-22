import api from '@/api/axios'

export async function fetchUsers(params={}){
  const { page=1, limit=50 } = params
  const { data } = await api.get('/api/users', { params: { page, limit } })
  const items = data?.data?.items || data?.items || []
  return { items, page: data?.data?.page || data?.page || 1, totalPages: data?.data?.totalPages || data?.totalPages || 1 }
}

export async function createUser(payload){
  const { data } = await api.post('/api/users', payload)
  return data?.data?.user || data?.user
}

export async function updateUser(id, payload){
  const { data } = await api.put(`/api/users/${id}`, payload)
  return data?.data?.user || data?.user
}

export async function deleteUser(id){
  const { data } = await api.delete(`/api/users/${id}`)
  return data?.data || data
}
