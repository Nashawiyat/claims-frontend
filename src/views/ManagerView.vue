<template>
  <div class="space-y-6">
    <div class="flex flex-wrap gap-4 items-end justify-between">
      <div>
        <h1 class="text-xl font-semibold tracking-tight text-slate-800">Team Claims</h1>
        <p class="text-xs text-slate-500 mt-1">Review and act on submitted team claims.</p>
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
              <SortHeader field="amount" label="Amount" :sort-by="sortBy" :sort-dir="sortDir" @sort="headerSort" />
              <th class="py-2 px-3 font-medium max-w-[220px]">Description</th>
              <th class="py-2 px-3 font-medium">Receipt</th>
              <SortHeader field="submittedAt" label="Date Submitted" :sort-by="sortBy" :sort-dir="sortDir" @sort="headerSort" />
              <th class="py-2 px-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="py-8 text-center text-slate-500">Loading claims...</td>
            </tr>
            <tr v-else-if="!displayClaims.length">
              <td colspan="7" class="py-8 text-center text-slate-500">No claims found.</td>
            </tr>
            <tr v-for="c in displayClaims" :key="c._id" class="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" @click="openView(c)">
              <td class="py-2 px-3 font-medium text-slate-800 underline decoration-transparent hover:decoration-slate-400">{{ c.title }}</td>
              <td class="py-2 px-3 text-slate-700">{{ c.createdBy?.name || c.createdByName || 'Unknown' }}</td>
              <td class="py-2 px-3 tabular-nums">{{ formatCurrency(c.amount) }}</td>
              <td class="py-2 px-3 text-slate-600 max-w-[220px] truncate" :title="c.description">{{ c.description || '—' }}</td>
              <td class="py-2 px-3">
                <button v-if="c.receiptUrl" @click.stop="viewReceipt(c)" class="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 text-xs font-medium">
                  <img src="@/assets/eye.svg" alt="View" class="w-4 h-4" /> View
                </button>
                <span v-else class="text-xs text-slate-400">None</span>
              </td>
              <td class="py-2 px-3 text-slate-600">{{ formatDate(c.submittedAt || c.createdAt) }}</td>
              <td class="py-2 px-3 space-x-2">
                <button
                  v-if="canActOn(c)"
                  @click.stop="confirmApprove(c)"
                  :disabled="actioningId===c._id"
                  class="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
                >Approve</button>
                <button
                  v-if="canActOn(c)"
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
  <ConfirmDialog
    v-model="showApproveConfirm"
    title="Approve Claim"
    :message="approveMessage"
    confirm-text="Approve"
    :loading="actioningId===pendingApproveId"
    @confirm="doApprove"
  />
  <ReasonDialog
    v-model="showReason"
    title="Reject Claim"
    message="Please provide a reason for rejection so the employee can address it."
    confirm-text="Reject"
    :loading="actioningId===pendingRejectId"
    @confirm="doReject"
    @cancel="cancelReject"
  />
  <ClaimViewModal
    v-model="viewOpen"
    :claim="viewClaim"
  />
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useAlertsStore } from '@/stores/alerts'
import { useAuthStore } from '@/stores/auth'
import { approveClaim, rejectClaim, openReceiptForClaim, enrichClaimUsers, fetchClaimManager } from '@/services/claimWorkflowService'
import { getTeam as fetchTeamClaims } from '@/apis/claims'
import ReasonDialog from '@/components/ReasonDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ClaimViewModal from '@/components/ClaimViewModal.vue'
import { usePaginationAndSorting } from '@/composables/usePaginationAndSorting'
import SortHeader from '@/components/SortHeader.vue'
import { normalizeClaim } from '@/utils/claimUtils'

const alerts = useAlertsStore()
const auth = useAuthStore()

const { page, limit, sortBy, sortDir, status, goToPage, toggleSort, applyQueryFromRoute } = usePaginationAndSorting({
  defaultLimit: 10,
  defaultSortBy: 'submittedAt',
  defaultSortDir: 'desc',
  allowedSort: ['submittedAt','amount']
})

const claims = ref([])
const loading = ref(false)
const error = ref('')
const actioningId = ref(null)
const showReason = ref(false)
const pendingRejectId = ref(null)
const viewOpen = ref(false)
const viewClaim = ref(null)
const showApproveConfirm = ref(false)
const pendingApproveId = ref(null)
const approveMessage = ref('')
const totalPages = ref(1)
const totalItems = ref(0)

function formatCurrency(v){
  try { return new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(v) } catch { return Number(v||0).toFixed(2) }
}

async function ensureAuthReady(){
  if (auth.token) return true
  if (typeof auth.loadFromStorage === 'function') auth.loadFromStorage()
  let tries = 0
  while(!auth.token && tries < 5){
    await new Promise(r=>setTimeout(r,100)); tries++
    if(!auth.token && typeof auth.loadFromStorage==='function') auth.loadFromStorage()
  }
  return !!auth.token
}

async function fetchClaims(){
  loading.value = true; error.value=''
  try {
    await ensureAuthReady()
    const params = { page: page.value, limit: limit.value, sortBy: sortBy.value, sortDir: sortDir.value }
    if (status.value) params.status = status.value
    const { items, meta } = await fetchTeamClaims(params)
    claims.value = items
    totalPages.value = meta.totalPages || 1
    totalItems.value = meta.totalItems || items.length
    enrichClaimUsers(claims.value).catch(()=>{})
    if (import.meta.env.DEV) console.debug('[manager] fetched team claims', { tokenPresent: !!auth.token, params, count: claims.value.length })
  } catch (e) {
    error.value = e?.response?.data?.error || e?.response?.data?.message || e.message || 'Failed loading claims'
    alerts.error(error.value)
  } finally { loading.value = false }
}

// Apply client-side sort to ensure consistent ordering across pagination pages when backend might not guarantee stable sort.
const displayClaims = computed(()=> {
  const list = [...claims.value]
  if(sortBy.value){
    list.sort((a,b)=>{
      let av, bv
      if(sortBy.value==='submittedAt') { av = a.submittedAt || a.createdAt; bv = b.submittedAt || b.createdAt }
      else if(sortBy.value==='amount') { av = a.amount; bv = b.amount }
      else { av = a[sortBy.value]; bv = b[sortBy.value] }
      // Normalize to timestamps for dates
      if(av instanceof Date) av = av.getTime()
      if(bv instanceof Date) bv = bv.getTime()
      // Fallback for undefined
      if(av==null) av = 0
      if(bv==null) bv = 0
      if(av < bv) return sortDir.value==='asc' ? -1 : 1
      if(av > bv) return sortDir.value==='asc' ? 1 : -1
      return 0
    })
  }
  return list
})

function canActOn(c){
  if(!c) return false
  const statusOk = ['submitted'].includes((c.status||'').toLowerCase())
  if(!statusOk) return false
  if(auth.role === 'admin') return true
  return c.createdBy && (c.createdBy._id !== auth.user?._id)
}

function confirmApprove(c){
  pendingApproveId.value = c._id
  approveMessage.value = `Approve claim "${c.title}" for ${formatCurrency(c.amount)}?`
  showApproveConfirm.value = true
}
async function doApprove(){
  if(!pendingApproveId.value) return
  actioningId.value = pendingApproveId.value
  try { await approveClaim(pendingApproveId.value); alerts.success('Claim approved'); await fetchClaims() }
  catch(e){ alerts.error(e?.response?.data?.message || e.message || 'Failed approving claim') }
  finally { actioningId.value = null; showApproveConfirm.value = false; pendingApproveId.value = null }
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
  try { await rejectClaim(pendingRejectId.value, reason); alerts.success('Claim rejected'); await fetchClaims() }
  catch(e){ alerts.error(e?.response?.data?.message || e.message || 'Failed rejecting claim') }
  finally { actioningId.value = null; showReason.value = false; pendingRejectId.value = null }
}

async function viewReceipt(c){
  try { await openReceiptForClaim(c) } catch { alerts.error('Failed to load receipt') }
}

function refresh(){ fetchClaims() }

function formatDate(value){
  if(!value) return '—'
  try { return new Date(value).toLocaleDateString(undefined,{ year:'numeric', month:'short', day:'numeric'}) } catch { return value }
}

async function openView(c){
  viewClaim.value = c
  viewOpen.value = true
  if (c.manager === null) { c._adminClaim = true; return }
  if ((!c.manager || !c.manager.name || c.manager.name === 'Unknown') && !c._managerLookupTried) {
    c._managerLookupTried = true
    try {
      const mgr = await fetchClaimManager(c._id)
  if (mgr) c.manager = { _id: mgr._id || mgr.id, name: mgr.name || mgr.fullName || mgr.email || 'Unknown', email: mgr.email }
    } catch {}
  }
}

function headerSort(field){ toggleSort(field) }
function changePage(p){ if(p<1 || p> totalPages.value) return; goToPage(p) }

watch([page, sortBy, sortDir, status], ()=>{ fetchClaims() })

onMounted(()=>{ applyQueryFromRoute(); fetchClaims() })
</script>

<script>
// Inline small component for sort indicator
export default { components: { SortIcon: { props:['field','sortBy','sortDir'], template:`<span class='inline-block w-3 ml-1' v-if="sortBy===field">{{ sortDir==='asc' ? '▲' : '▼' }}</span>` } } }
</script>

<style scoped>
table { border-collapse: separate; border-spacing: 0; }
</style>
