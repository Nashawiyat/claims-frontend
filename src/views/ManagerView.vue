<template>
  <div class="space-y-8">
    <div class="flex items-center justify-between flex-wrap gap-4">
      <h1 class="text-xl font-semibold tracking-tight text-slate-800">Manager Claims Review</h1>
      <button @click="refresh" :disabled="loading" class="inline-flex items-center gap-2 text-sm font-medium bg-slate-200 hover:bg-slate-300 disabled:opacity-50 px-4 py-2 rounded-md">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v6h6M20 20v-6h-6M5 19a9 9 0 0014-3M19 5a9 9 0 00-14 3"/></svg>
        <span>Refresh</span>
      </button>
    </div>

    <div class="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr class="text-left">
              <th class="py-2 px-3 font-medium">Title</th>
              <th class="py-2 px-3 font-medium">Employee</th>
              <th class="py-2 px-3 font-medium">Amount</th>
              <th class="py-2 px-3 font-medium max-w-[220px]">Description</th>
              <th class="py-2 px-3 font-medium">Receipt</th>
              <th class="py-2 px-3 font-medium">Date Submitted</th>
              <th class="py-2 px-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="py-8 text-center text-slate-500">Loading claims...</td>
            </tr>
            <tr v-else-if="!claims.length">
              <td colspan="7" class="py-8 text-center text-slate-500">No claims pending your review.</td>
            </tr>
              <tr v-for="c in claims" :key="c._id" class="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" @click="openView(c)">
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
              <td class="py-2 px-3 text-slate-600">{{ formatDate(c.createdAt) }}</td>
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
import { ref, onMounted } from 'vue'
import { useAlertsStore } from '@/stores/alerts'
import { useAuthStore } from '@/stores/auth'
import { fetchManagerClaims, approveClaim, rejectClaim, openReceiptForClaim, enrichClaimUsers, fetchClaimManager } from '@/services/claimWorkflowService'
import api from '@/api/axios'
import { fetchUser } from '@/services/userService'
import ReasonDialog from '@/components/ReasonDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ClaimViewModal from '@/components/ClaimViewModal.vue'

const alerts = useAlertsStore()
const auth = useAuthStore()

const claims = ref([])
const loading = ref(false)
const error = ref('') // kept for potential future inline use, alerts used instead
const actioningId = ref(null)
const showReason = ref(false)
const pendingRejectId = ref(null)
const viewOpen = ref(false)
const viewClaim = ref(null)
const showApproveConfirm = ref(false)
const pendingApproveId = ref(null)
const approveMessage = ref('')
let lastReason = ''

// status badge removed; we now show submitted date instead

function formatCurrency(v){
  try { return new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(v) } catch { return Number(v||0).toFixed(2) }
}

async function fetchClaims(){
  loading.value = true; error.value=''
  try {
    const list = await fetchManagerClaims()
    claims.value = list
  // Enrichment now a no-op since backend populates creator names
  enrichClaimUsers(claims.value).catch(()=>{})
  } catch (e) {
    error.value = e?.response?.data?.message || e.message || 'Failed loading claims'
    alerts.error(error.value)
  } finally { loading.value = false }
}

function canActOn(c){
  // Cannot act on own claims
  return c && c.createdBy && (c.createdBy._id !== auth.user?._id) && ['submitted'].includes((c.status||'').toLowerCase())
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
  // fetch manager if missing
  if (!c.manager || !c.manager.name || c.manager.name === 'Unknown') {
    try {
      const mgr = await fetchClaimManager(c._id)
      if (mgr) c.manager = { _id: mgr._id || mgr.id, name: mgr.name || mgr.fullName || mgr.email || 'Unknown' }
    } catch {/* ignore */}
  }
}

onMounted(fetchClaims)
</script>

<style scoped>
table { border-collapse: separate; border-spacing: 0; }
</style>
