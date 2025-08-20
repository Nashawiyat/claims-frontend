// Claim workflow related API calls (manager + finance operations)
// Centralizes endpoints so view components stay slim.
import api from '@/api/axios'
import { normalizeClaim } from '@/utils/claimUtils'
import { fetchUser } from '@/services/userService'

function extractList(data) {
  return Array.isArray(data) ? data : (data?.claims || data?.items || [])
}

// Manager scope
export async function fetchManagerClaims(opts = {}) {
  const { all } = opts
  if(!all){
    const { data } = await api.get('/api/claims/manager')
    return extractList(data).map(normalizeClaim)
  }
  // Auto-paginate until fewer than pageSize returned or no more pages metadata.
  const pageSize = opts.pageSize || 50
  let page = 1
  const allClaims = []
  // Support both count-based and nextPage metadata; stop when empty or repeated.
  while(true){
    const { data } = await api.get('/api/claims/manager', { params: { page, limit: pageSize } })
    const list = extractList(data).map(normalizeClaim)
    if(!list.length) break
    allClaims.push(...list)
    // Break if received less than requested, or metadata indicates end
    const totalPages = data?.totalPages || data?.pages
    if(list.length < pageSize) break
    if(totalPages && page >= totalPages) break
    page += 1
    // Safety cap to avoid infinite loops
    if(page > 200) break
  }
  return allClaims
}
export async function approveClaim(id) {
  if (!id) throw new Error('approveClaim: id required')
  const { data } = await api.put(`/api/claims/${id}/approve`)
  return data?.claim || data
}
export async function rejectClaim(id, reason) {
  if (!id) throw new Error('rejectClaim: id required')
  const payload = reason ? { reason } : {}
  const { data } = await api.put(`/api/claims/${id}/reject`, payload)
  return data?.claim || data
}

// Finance scope
export async function fetchFinanceClaims(opts = {}) {
  const { all } = opts
  if(!all){
    const { data } = await api.get('/api/claims/finance')
    return extractList(data).map(normalizeClaim)
  }
  const pageSize = opts.pageSize || 50
  let page = 1
  const allClaims = []
  while(true){
    const { data } = await api.get('/api/claims/finance', { params: { page, limit: pageSize } })
    const list = extractList(data).map(normalizeClaim)
    if(!list.length) break
    allClaims.push(...list)
    const totalPages = data?.totalPages || data?.pages
    if(list.length < pageSize) break
    if(totalPages && page >= totalPages) break
    page += 1
    if(page > 200) break
  }
  return allClaims
}
export async function reimburseClaim(id) {
  if (!id) throw new Error('reimburseClaim: id required')
  const { data } = await api.put(`/api/claims/${id}/reimburse`)
  return data?.claim || data
}
export async function financeRejectClaim(id, reason) {
  if (!id) throw new Error('financeRejectClaim: id required')
  const payload = reason ? { reason } : {}
  const { data } = await api.put(`/api/claims/${id}/reject-finance`, payload)
  return data?.claim || data
}

// Fetch manager for a specific claim
export async function fetchClaimManager(id) {
  if (!id) throw new Error('fetchClaimManager: id required')
  const { data } = await api.get(`/api/claims/${id}/manager`)
  return data?.manager || data
}

// Receipt helper consolidates blob logic for reuse
export async function openReceiptForClaim(claim) {
  if (!claim?.receiptUrl) return
  const url = claim.receiptUrl
  const absolute = url.startsWith('http') ? url : api.defaults.baseURL.replace(/\/$/, '') + (url.startsWith('/') ? url : '/' + url)
  const res = await api.get(absolute, { responseType: 'blob' })
  let blob = res.data
  const type = res.headers?.['content-type'] || blob.type
  if (type && type !== blob.type) blob = new Blob([blob], { type })
  const objectUrl = URL.createObjectURL(blob)
  window.open(objectUrl, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000)
}

// Backend now supplies populated creator for manager view; enrichment is a no-op kept for API stability.
export async function enrichClaimUsers(list) { return list }

// Finance specific lightweight enrichment (if backend omitted nested objects but provided *_Name fallbacks)
export async function enrichFinanceClaims(list){
  if(!Array.isArray(list)) return list
  // First apply simple name fallbacks
  for(const c of list){
    if((!c.createdBy || !c.createdBy.name || c.createdBy.name==='Unknown') && c.createdByName){
      c.createdBy = c.createdBy || { _id: c.createdById }
      c.createdBy.name = c.createdByName
    }
    if((!c.manager || !c.manager.name || c.manager.name==='Unknown') && c.managerName){
      c.manager = c.manager || { _id: c.managerId }
      c.manager.name = c.managerName
    }
  }
  // Collect ids still missing names
  const needIds = new Set()
  for(const c of list){
    if(c.createdBy && (!c.createdBy.name || c.createdBy.name==='Unknown') && c.createdBy._id) needIds.add(c.createdBy._id)
    if(c.manager && (!c.manager.name || c.manager.name==='Unknown') && c.manager._id) needIds.add(c.manager._id)
  }
  if(!needIds.size) return list
  const cache = {}
  await Promise.all([...needIds].map(async id=>{
    try {
      const u = await fetchUser(id)
      if(u) cache[id] = u
    } catch {/* ignore permission / 404 */}
  }))
  for(const c of list){
    if(c.createdBy && cache[c.createdBy._id] && (!c.createdBy.name || c.createdBy.name==='Unknown')){
      const u = cache[c.createdBy._id]
      c.createdBy.name = u.name || u.fullName || u.email || c.createdBy.name || 'Unknown'
    }
    if(c.manager && cache[c.manager._id] && (!c.manager.name || c.manager.name==='Unknown')){
      const u = cache[c.manager._id]
      c.manager.name = u.name || u.fullName || u.email || c.manager.name || 'Unknown'
    }
  }
  return list
}
