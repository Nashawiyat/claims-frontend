// Centralized claims list API wrappers (mine, team, finance)
// Ensures consistent param passing & response normalization
import api from '@/api/axios'
import { normalizeClaim } from '@/utils/claimUtils'

function normalizeListResponse(data){
  // Accept shapes: { success, data:{ items, ...meta }} or { items, ...meta }
  const root = data?.data && data.success !== undefined ? data.data : data
  const items = root?.items || []
  const meta = {
    page: root?.page || 1,
    totalPages: root?.totalPages || 1,
    totalItems: root?.totalItems || items.length,
    limit: root?.limit,
    sortBy: root?.sortBy,
    sortDir: root?.sortDir,
    status: root?.status
  }
  return { items: items.map(normalizeClaim), meta }
}

export async function getMine(params){
  const { data } = await api.get('/api/claims/mine', { params })
  return normalizeListResponse(data)
}
export async function getTeam(params){
  const { data } = await api.get('/api/claims/team', { params })
  return normalizeListResponse(data)
}
export async function getFinance(params){
  const { data } = await api.get('/api/claims/finance', { params })
  return normalizeListResponse(data)
}

export default { getMine, getTeam, getFinance }
