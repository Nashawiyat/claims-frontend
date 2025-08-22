<template>
  <div class="space-y-6">
    <div class="flex flex-wrap gap-4 items-end justify-between">
      <div>
        <h1 class="text-xl font-semibold tracking-tight text-slate-800">Finance Processing</h1>
        <p class="text-xs text-slate-500 mt-1">Process approved claims and mark as reimbursed.</p>
      </div>
      <div class="flex flex-wrap gap-2 items-center text-sm">
        <button @click="refresh" :disabled="loading" class="inline-flex items-center gap-2 text-sm font-medium bg-slate-200 hover:bg-slate-300 disabled:opacity-50 px-4 py-2 rounded-md">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v6h6M20 20v-6h-6M5 19a9 9 0 0014-3M19 5a9 9 0 00-14 3"/></svg>
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <div class="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 select-none">
            <tr class="text-left">
              <SortHeader field="title" :can-sort="false" label="Title" :sort-by="sortBy" :sort-dir="sortDir" />
              <SortHeader field="employee" :can-sort="false" label="Employee" :sort-by="sortBy" :sort-dir="sortDir" />
              <SortHeader field="manager" :can-sort="false" label="Manager" :sort-by="sortBy" :sort-dir="sortDir" />
              <SortHeader field="amount" label="Amount" :sort-by="sortBy" :sort-dir="sortDir" @sort="headerSort" />
              <th class="py-2 px-3 font-medium max-w-[220px]">Description</th>
              <th class="py-2 px-3 font-medium">Receipt</th>
              <SortHeader field="approvedAt" label="Approved Date" :sort-by="sortBy" :sort-dir="sortDir" @sort="headerSort" />
              <th class="py-2 px-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="py-8 text-center text-slate-500">Loading claims...</td>
            </tr>
            <tr v-else-if="error">
              <td colspan="8" class="py-8 text-center text-red-600 font-medium">{{ error }}</td>
            </tr>
            <tr v-else-if="!claims.length">
              <td colspan="8" class="py-8 text-center text-slate-500">No approved claims to process.</td>
            </tr>
            <tr v-for="c in claims" :key="c._id" class="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" @click="openView(c)">
              <td class="py-2 px-3 font-medium text-slate-800">{{ c.title }}</td>
              <td class="py-2 px-3 text-slate-700">{{ c.createdBy?.name || c.createdByName || '—' }}</td>
              <td class="py-2 px-3 text-slate-700">{{ c.manager?.name || c.managerName || '—' }}</td>
              <td class="py-2 px-3 tabular-nums">{{ formatCurrency(c.amount) }}</td>
              <td class="py-2 px-3 text-slate-600 max-w-[220px] truncate" :title="c.description">{{ c.description || '—' }}</td>
              <td class="py-2 px-3">
                <button v-if="c.receiptUrl" @click.stop="viewReceipt(c)" class="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 text-xs font-medium">
                  <img src="@/assets/eye.svg" alt="View" class="w-4 h-4" /> View
                </button>
                <span v-else class="text-xs text-slate-400">None</span>
              </td>
              <td class="py-2 px-3 text-slate-600">{{ formatDate(c.approvedAt) }}</td>
              <td class="py-2 px-3 space-x-2">
                <button
                  v-if="canReimburse(c)"
                  @click.stop="confirmReimburse(c)"
                  :disabled="actioningId===c._id"
                  class="px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60"
                >Reimburse</button>
                <button
                  v-if="canReject(c)"
                  @click.stop="reject(c)"
                  :disabled="actioningId===c._id"
                  class="px-2.5 py-1 rounded-md text-xs font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
                >Reject</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex items-center justify-between p-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-600" v-if="totalPages>1 || claims.length">
        <div>Total {{ totalItems }} • Page {{ page }} / {{ totalPages }}</div>
        <div class="flex items-center gap-2">
          <button class="px-2 py-1 rounded bg-white border text-xs disabled:opacity-40" :disabled="page===1 || loading" @click="changePage(page-1)">Prev</button>
          <button class="px-2 py-1 rounded bg-white border text-xs disabled:opacity-40" :disabled="page===totalPages || loading" @click="changePage(page+1)">Next</button>
        </div>
      </div>
    </div>
  </div>
  <ReasonDialog
    v-model="showReason"
    title="Reject Claim"
    message="Provide a reason so the manager/employee understands why it was rejected."
    confirm-text="Reject"
    :loading="actioningId===pendingRejectId"
    @confirm="doReject"
    @cancel="cancelReject"
  />
  <ClaimViewModal
    v-model="viewOpen"
    :claim="viewClaim"
  />
  <ConfirmDialog
    v-model="showReimburseConfirm"
    title="Reimburse Claim"
    :message="reimburseMessage"
    confirm-text="Reimburse"
    :loading="actioningId===pendingReimburseId"
    @confirm="doReimburse"
  />
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useAlertsStore } from '@/stores/alerts'
import { reimburseClaim, financeRejectClaim, openReceiptForClaim, fetchClaimManager, enrichFinanceClaims } from '@/services/claimWorkflowService'
import { fetchUser } from '@/services/userService'
import { getFinance as fetchFinanceList } from '@/apis/claims'
import ReasonDialog from '@/components/ReasonDialog.vue'
import ClaimViewModal from '@/components/ClaimViewModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { usePaginationAndSorting } from '@/composables/usePaginationAndSorting'
import SortHeader from '@/components/SortHeader.vue'
import { normalizeClaim } from '@/utils/claimUtils'

const alerts = useAlertsStore()

const { page, limit, sortBy, sortDir, status, goToPage, toggleSort, applyQueryFromRoute } = usePaginationAndSorting({
  defaultLimit: 10,
  defaultSortBy: 'approvedAt',
  defaultSortDir: 'desc',
  allowedSort: ['approvedAt','amount']
})

const claims = ref([])
const loading = ref(false)
const error = ref('')
const actioningId = ref(null)
const showReason = ref(false)
const pendingRejectId = ref(null)
const viewOpen = ref(false)
const viewClaim = ref(null)
const showReimburseConfirm = ref(false)
const pendingReimburseId = ref(null)
const reimburseMessage = ref('')
const totalPages = ref(1)
const totalItems = ref(0)

function formatCurrency(v){
  try { return new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(v) } catch { return Number(v||0).toFixed(2) }
}

async function ensureAuthReady(){
  const store = (await import('@/stores/auth')).useAuthStore()
  if (store.token) return true
  if (typeof store.loadFromStorage === 'function') store.loadFromStorage()
  let tries = 0
  while(!store.token && tries < 5){ await new Promise(r=>setTimeout(r,100)); tries++; if(!store.token && typeof store.loadFromStorage==='function') store.loadFromStorage() }
  return !!store.token
}

async function fetchClaims(){
  loading.value = true; error.value=''
  try {
    await ensureAuthReady()
    const params = { page: page.value, limit: limit.value, sortBy: sortBy.value, sortDir: sortDir.value }
    if (status.value) params.status = status.value
    const { items, meta } = await fetchFinanceList(params)
    claims.value = items
    // Enrich employee & manager names if missing
    try { await enrichFinanceClaims(claims.value) } catch {}
    // Per-claim detailed enrichment (manager then employee) if still unknown
    for (const c of claims.value) {
      // Manager enrichment first
      if (c.manager !== null && (!c.manager || !c.manager.name || c.manager.name === 'Unknown')) {
        try {
          const mgr = await fetchClaimManager(c._id)
          if (mgr) c.manager = { _id: mgr._id || mgr.id, name: mgr.name || mgr.fullName || mgr.email || 'Unknown', email: mgr.email }
        } catch {}
      }
      // Employee enrichment: determine best id
      if (!c.createdBy || !c.createdBy.name || c.createdBy.name === 'Unknown') {
        const empId = c.createdBy?._id || c.user?._id || c.userId || c.createdById || c.user || null
        if (empId && typeof empId === 'string') {
          try {
            const emp = await fetchUser(empId)
            if (emp) c.createdBy = { _id: emp._id || emp.id, name: emp.name || emp.fullName || emp.email || 'Unknown', email: emp.email }
          } catch (e) { if(import.meta.env.DEV) console.debug('[finance] employee enrichment failed', empId, e?.message) }
        }
      }
      if (import.meta.env.DEV) console.debug('[finance] claim enrichment snapshot', { id: c._id, employee: c.createdBy && c.createdBy.name, manager: c.manager && c.manager.name })
    }
    totalPages.value = meta.totalPages || 1
    totalItems.value = meta.totalItems || items.length
    if (import.meta.env.DEV) console.debug('[finance] fetched finance claims', { tokenPresent: !!(await import('@/stores/auth')).useAuthStore().token, params, count: claims.value.length })
  } catch (e) { error.value = e?.response?.data?.error || e?.response?.data?.message || e.message || 'Failed loading claims' }
  finally { loading.value = false }
}

function canReimburse(c){ return (c.status||'').toLowerCase()==='approved' }
function canReject(c){ return ['approved'].includes((c.status||'').toLowerCase()) }

function confirmReimburse(c){
  pendingReimburseId.value = c._id
  reimburseMessage.value = `Reimburse claim "${c.title}" for ${formatCurrency(c.amount)}?`
  showReimburseConfirm.value = true
}
async function doReimburse(){
  if(!pendingReimburseId.value) return
  actioningId.value = pendingReimburseId.value
  try { await reimburseClaim(pendingReimburseId.value); alerts.success('Claim reimbursed'); await fetchClaims() }
  catch(e){ alerts.error(e?.response?.data?.message || e.message || 'Failed reimbursing claim') }
  finally { actioningId.value = null; showReimburseConfirm.value = false; pendingReimburseId.value = null }
}
function reject(c){
  pendingRejectId.value = c._id
  showReason.value = true
}
function cancelReject(){
  pendingRejectId.value = null
  showReason.value = false
}
async function doReject(reason){
  if(!pendingRejectId.value) return
  actioningId.value = pendingRejectId.value
  try { await financeRejectClaim(pendingRejectId.value, reason); alerts.success('Claim rejected'); await fetchClaims() }
  catch(e){ alerts.error(e?.response?.data?.message || e.message || 'Failed rejecting claim') }
  finally { actioningId.value = null; showReason.value = false; pendingRejectId.value = null }
}

async function viewReceipt(c){
  try { await openReceiptForClaim(c) } catch { alerts.error('Failed to load receipt') }
}

function openView(c){
  viewClaim.value = c; viewOpen.value = true
  if (c.manager === null) { c._adminClaim = true }
}

function refresh(){ fetchClaims() }
function formatDate(value){ if(!value) return '—'; try { return new Date(value).toLocaleDateString(undefined,{ year:'numeric', month:'short', day:'numeric'}) } catch { return value } }
// Client-side stabilized sorting for visible page to compensate for backend pagination ordering quirks.
watch([claims, sortBy, sortDir], ()=>{
  if(!sortBy.value) return
  claims.value = [...claims.value].sort((a,b)=>{
    let av, bv
    if(sortBy.value==='approvedAt') { av = a.approvedAt || a.updatedAt; bv = b.approvedAt || b.updatedAt }
    else if(sortBy.value==='amount') { av = a.amount; bv = b.amount }
    else { av = a[sortBy.value]; bv = b[sortBy.value] }
    if(av instanceof Date) av = av.getTime(); if(bv instanceof Date) bv = bv.getTime()
    if(av==null) av = 0; if(bv==null) bv = 0
    if(av < bv) return sortDir.value==='asc' ? -1 : 1
    if(av > bv) return sortDir.value==='asc' ? 1 : -1
    return 0
  })
})
function headerSort(field){ toggleSort(field) }
function changePage(p){ if(p<1 || p> totalPages.value) return; goToPage(p) }

watch([page, sortBy, sortDir, status], ()=> fetchClaims())
onMounted(()=>{ applyQueryFromRoute(); fetchClaims() })
</script>

<script>
export default { }
</script>

<style scoped>
table { border-collapse: separate; border-spacing: 0; }
</style>
