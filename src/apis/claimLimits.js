import api from '@/api/axios'

function normalizeLimitPayload(raw){
  if(!raw) return null
  // Accept shapes: { limit:{ total, used, remaining } } or flat total/used/remaining or legacy fields
  const src = raw.limit || raw.claimLimit || raw
  const total = src.total ?? src.limit ?? src.max ?? 0
  const used = src.used ?? src.usedAmount ?? 0
  const remaining = src.remaining ?? (typeof total==='number' && typeof used==='number' ? (total-used) : 0)
  return { total, used, remaining }
}

export async function fetchClaimLimits(){
  const { data } = await api.get('/api/users/claim-limits')
  return data?.data?.items || data?.items || []
}

export async function updateClaimLimit(userId, total, resetUsed){
  const body = { total }
  if (resetUsed) body.resetUsed = true
  const { data } = await api.put(`/api/users/claim-limits/${userId}`, body)
  const user = data?.data?.user || data?.user || data?.userId && data
  return { user, limit: normalizeLimitPayload(data?.data?.limit || data?.limit || user?.limit) }
}

export async function recomputeUsage(userId){
  const { data } = await api.post(`/api/users/claim-limits/recompute/${userId}`)
  return data?.data || data
}

export async function applyDefaultsForRole(role){
  const { data } = await api.post('/api/users/claim-limits/apply-defaults', { role })
  return data?.data || data
}

export async function resetAllUsed(role){
  const body = role ? { role } : {}
  const { data } = await api.post('/api/users/claim-limits/reset-used-all', body)
  return data?.data || data
}
