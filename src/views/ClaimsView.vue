<template>
  <div class="space-y-10">
  <AlertsHost />

    <!-- Top Bar: Limit + New Claim Button -->
    <div class="flex flex-col gap-6">
      <div class="flex items-center justify-between flex-wrap gap-4">
        <h1 class="text-xl font-semibold tracking-tight text-slate-800">My Claims</h1>
  <button @click="openCreate" class="inline-flex items-center gap-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2 rounded-md shadow-sm cursor-pointer">
          <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
          New Claim
        </button>
      </div>
      <LimitBar
        :key="summary.limit + '-' + summary.used + '-' + summary.remaining"
        :limit="summary.limit"
        :used="summary.used"
        :remaining="summary.remaining"
      />
    </div>

    <!-- Drafts Section -->
    <section class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold tracking-wide uppercase text-slate-600">Drafts</h2>
        <span class="text-xs text-slate-500" v-if="drafts.length">{{ drafts.length }} draft(s)</span>
      </div>
      <div v-if="loading" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div v-for="n in 3" :key="n" class="h-40 bg-slate-100 animate-pulse rounded-xl border border-slate-200"></div>
      </div>
      <div v-else-if="drafts.length" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <ClaimCard
          v-for="c in drafts"
          :key="c._id"
          :claim="c"
          :can-edit="true"
          :can-submit="true"
          :can-delete="true"
          @open="openView"
          @edit="onEdit"
          @submit="onSubmit"
          @delete="onDelete"
          @view-receipt="onViewReceipt"
        />
      </div>
      <template v-else>
        <p class="text-sm text-slate-500">No drafts found.</p>
      </template>
      <div class="flex items-center justify-center gap-2 pt-2" v-if="draftTotalPages>1">
        <button class="px-2 py-1 rounded border text-xs bg-white disabled:opacity-40" :disabled="draftPage===1 || loading" @click="changeDraftPage(draftPage-1)">Prev</button>
        <span class="text-xs">Page {{ draftPage }} of {{ draftTotalPages }}</span>
        <button class="px-2 py-1 rounded border text-xs bg-white disabled:opacity-40" :disabled="draftPage===draftTotalPages || loading" @click="changeDraftPage(draftPage+1)">Next</button>
      </div>
    </section>

    <!-- Submitted & History Section -->
    <section class="space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="flex items-center gap-4">
          <h2 class="text-sm font-semibold tracking-wide uppercase text-slate-600">Submitted & History</h2>
          <select v-model="statusFilter" class="text-xs border border-slate-300 rounded px-2 py-1 bg-white">
            <option value="">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="reimbursed">Reimbursed</option>
          </select>
        </div>
        <div class="text-xs text-slate-500" v-if="submittedTotalPages>1">Page {{ submittedPage }} / {{ submittedTotalPages }}</div>
      </div>
      <div v-if="loading" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div v-for="n in 6" :key="n" class="h-40 bg-slate-100 animate-pulse rounded-xl border border-slate-200"></div>
      </div>
      <div v-else-if="submittedClaims.length" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <ClaimCard
          v-for="c in submittedClaims"
          :key="c._id"
          :claim="c"
          :can-edit="false"
          :can-submit="false"
          :can-delete="false"
          @open="openView"
          @view-receipt="onViewReceipt"
        />
      </div>
      <p v-else class="text-sm text-slate-500">No matching claims.</p>
      <div class="flex items-center justify-center gap-2 pt-2" v-if="submittedTotalPages>1">
        <button class="px-2 py-1 rounded border text-xs bg-white disabled:opacity-40" :disabled="submittedPage===1 || loading" @click="changeSubmittedPage(submittedPage-1)">Prev</button>
        <span class="text-xs">Page {{ submittedPage }} of {{ submittedTotalPages }}</span>
        <button class="px-2 py-1 rounded border text-xs bg-white disabled:opacity-40" :disabled="submittedPage===submittedTotalPages || loading" @click="changeSubmittedPage(submittedPage+1)">Next</button>
      </div>
    </section>

  <!-- Store error removed: rely on alerts + form validation -->

    <!-- Modal -->
    <ClaimFormModal
      v-model="modalOpen"
      :mode="modalMode"
      :initial="editingClaimInitial"
  :is-manager-creator="auth.isManager"
      :managers="managers"
      @save="onModalSave"
      @close="onModalClose"
  @validation-error="onFormValidationError"
    />

    <!-- Confirm Dialogs -->
    <ConfirmDialog
      v-model="confirmSubmitOpen"
      title="Submit Claim"
      :message="submitConfirmMessage"
      confirm-text="Submit"
      :loading="processingSubmit"
  @confirm="performSubmit"
      @cancel="resetSubmitDialog"
    />
    <ConfirmDialog
      v-model="confirmDeleteOpen"
      title="Delete Draft Claim"
      :message="deleteConfirmMessage"
      confirm-text="Delete"
      :destructive="true"
      :loading="processingDelete"
      @confirm="performDelete"
      @cancel="resetDeleteDialog"
    />
    <ClaimViewModal
      v-model="viewOpen"
      :claim="viewClaim"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useClaimsStore } from '@/stores/claims'
// Updated to new unified composable name
import { useClaimLimits } from '@/composables/useClaimLimits'
import { fetchManagers } from '@/services/userService'
import LimitBar from '@/components/LimitBar.vue'
import AlertsHost from '@/components/AlertsHost.vue'
import { useAlertsStore } from '@/stores/alerts'
const alerts = useAlertsStore()
import ClaimCard from '@/components/ClaimCard.vue'
import ClaimFormModal from '@/components/ClaimFormModal.vue'
import ClaimViewModal from '@/components/ClaimViewModal.vue'
import api from '@/api/axios'
// Removed remote paginated fetch; using local pagination based on full list in store
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const auth = useAuthStore()
const claims = useClaimsStore()
const router = useRouter()

// Managers can also access this view now; only redirect finance & admin.
function roleRedirect(r) {
  if (r === 'employee' || r === 'manager' || !r) return
  const map = { finance: '/finance', admin: '/admin' }
  if (map[r]) router.replace(map[r])
}
roleRedirect(auth.role)
watch(() => auth.role, roleRedirect)

const loading = computed(() => claims.loading)
const error = computed(() => claims.error) // kept for possible future use
const { summary, refreshDual: refreshLimit, refreshListOnly } = useClaimLimits()
// Local pagination (9 per page) for drafts & submitted separately
const route = useRoute()
const statusFilter = ref(route.query.status || '')
const draftPage = ref(Number(route.query.draftPage)||1)
const submittedPage = ref(Number(route.query.page)||1)
const PAGE_SIZE = 9
const allDrafts = computed(()=> claims.drafts)
const allSubmitted = computed(()=> claims.nonDrafts)

const filteredSubmitted = computed(()=> {
  let list = allSubmitted.value
  if (statusFilter.value) list = list.filter(c => c.status === statusFilter.value)
  // Basic sort: submittedAt desc fallback to createdAt
  return [...list].sort((a,b)=>{
    const av = a.submittedAt || a.createdAt || 0
    const bv = b.submittedAt || b.createdAt || 0
    return av>bv ? -1 : av<bv ? 1 : 0
  })
})

const draftTotalPages = computed(()=> Math.max(1, Math.ceil((allDrafts.value.length||0)/PAGE_SIZE)))
const submittedTotalPages = computed(()=> Math.max(1, Math.ceil((filteredSubmitted.value.length||0)/PAGE_SIZE)))

const drafts = computed(()=> {
  if(draftPage.value>draftTotalPages.value) draftPage.value = draftTotalPages.value
  const start = (draftPage.value-1)*PAGE_SIZE
  return allDrafts.value.slice(start, start+PAGE_SIZE)
})
const submittedClaims = computed(()=> {
  if(submittedPage.value>submittedTotalPages.value) submittedPage.value = submittedTotalPages.value
  const start = (submittedPage.value-1)*PAGE_SIZE
  return filteredSubmitted.value.slice(start, start+PAGE_SIZE)
})

function changeDraftPage(p){ if(p<1||p>draftTotalPages.value) return; draftPage.value = p; syncQuery() }
function changeSubmittedPage(p){ if(p<1||p>submittedTotalPages.value) return; submittedPage.value = p; syncQuery() }
function syncQuery(){
  const q = { ...route.query }
  if (statusFilter.value) q.status = statusFilter.value; else delete q.status
  if (draftPage.value>1) q.draftPage = draftPage.value; else delete q.draftPage
  if (submittedPage.value>1) q.page = submittedPage.value; else delete q.page
  router.replace({ query: q })
}
watch([statusFilter, submittedPage, draftPage], syncQuery)
watch(statusFilter, ()=> { submittedPage.value = 1 })

// Modal state
const modalOpen = ref(false)
const modalMode = ref('create')
const editingClaim = ref(null)
const managers = ref([]) // approving managers (for manager-owned claims)

const editingClaimInitial = computed(() => {
  if (!editingClaim.value) return null
  const { _id, title, description, amount, receiptUrl, manager } = editingClaim.value
  return { _id, title, description, amount, receiptUrl, managerId: manager?._id }
})

function toastSuccess(msg){ alerts.success(msg) }
function toastError(msg){ alerts.error(msg) }

async function ensureManagersLoaded(){
  if (!auth.isManager) return
  if (managers.value.length) return
  try {
    const list = await fetchManagers()
    const selfId = auth.user?._id || auth.user?.id
    managers.value = list.filter(m => (m._id||m.id) !== selfId)
  } catch {/* optional alert */}
}

async function openCreate() {
  await ensureManagersLoaded()
  editingClaim.value = null
  modalMode.value = 'create'
  modalOpen.value = true
}
async function onEdit(claim) {
  await ensureManagersLoaded()
  editingClaim.value = claim
  modalMode.value = 'edit'
  modalOpen.value = true
}

// Submission confirmation flow
const confirmSubmitOpen = ref(false)
const submitTarget = ref(null)
const processingSubmit = ref(false)
const submitConfirmMessage = computed(() => submitTarget.value ? `Are you sure you want to submit the claim "${submitTarget.value.title}" for $${submitTarget.value.amount?.toFixed?.(2) ?? submitTarget.value.amount}?\nOnce submitted it can no longer be edited.` : '')

async function onSubmit(claim) {
  // For validation rely strictly on list values (same source as Claim Limits view)
  await refreshListOnly()
  const remaining = summary.value?.remaining
  if (typeof remaining === 'number' && claim.amount > remaining) {
    toastError('Submitting this claim would exceed your remaining limit')
    return
  }
  submitTarget.value = claim
  confirmSubmitOpen.value = true
}
function resetSubmitDialog(){ processingSubmit.value = false; submitTarget.value = null }
async function performSubmit(){
  if (!submitTarget.value) return
  processingSubmit.value = true
  try {
  await claims.submitDraft(submitTarget.value._id, { preferListLimit: true })
    toastSuccess('Draft submitted')
    confirmSubmitOpen.value = false
  } catch (e) {
    const msg = claims.error || e?.response?.data?.message || e.message || 'Failed submitting draft'
    toastError(msg)
  } finally {
    processingSubmit.value = false
  }
}

// Delete confirmation flow
const confirmDeleteOpen = ref(false)
const deleteTarget = ref(null)
const processingDelete = ref(false)
const deleteConfirmMessage = computed(() => deleteTarget.value ? `Delete draft claim "${deleteTarget.value.title}"? This action cannot be undone.` : '')

// View modal
const viewOpen = ref(false)
const viewClaim = ref(null)
function openView(c){ viewClaim.value = c; viewOpen.value = true }

function onDelete(claim) {
  deleteTarget.value = claim
  confirmDeleteOpen.value = true
}
function resetDeleteDialog(){ processingDelete.value = false; deleteTarget.value = null }
async function performDelete(){
  if (!deleteTarget.value) return
  processingDelete.value = true
  try {
    await claims.deleteClaim(deleteTarget.value._id)
    toastSuccess('Draft deleted')
    confirmDeleteOpen.value = false
  } catch (e) {
    toastError(claims.error || e?.response?.data?.message || e.message || 'Failed deleting draft')
  } finally {
    processingDelete.value = false
    resetDeleteDialog()
  }
}

async function onViewReceipt(claim) {
  try {
    const url = claim.receiptUrl
    if (!url) return
    const absolute = url.startsWith('http') ? url : api.defaults.baseURL.replace(/\/$/, '') + (url.startsWith('/') ? url : '/' + url)
    const res = await api.get(absolute, { responseType: 'blob' })
    let blob = res.data
    let type = res.headers?.['content-type'] || blob.type
    if (!type || type === 'application/octet-stream') {
      if (/\.png($|\?)/i.test(url)) type = 'image/png'
      else if (/\.jpe?g($|\?)/i.test(url)) type = 'image/jpeg'
      else if (/\.gif($|\?)/i.test(url)) type = 'image/gif'
      else if (/\.pdf($|\?)/i.test(url)) type = 'application/pdf'
      if (type && type !== blob.type) blob = new Blob([blob], { type })
    }
    const objectUrl = URL.createObjectURL(blob)
    window.open(objectUrl, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  } catch (e) { toastError('Failed to load receipt') }
}

function mapBackendMessage(data){
  if(!data) return ''
  return data.error || data.message || data.msg || ''
}
function isLimitExceeded(msg, code){
  if(code==='LIMIT_EXCEEDED') return true
  if(!msg) return false
  return /limit/i.test(msg)
}
async function onModalSave(payload) {
  const submitted = !!payload?.submitted
  // Modal now performs API calls itself; this handler just shows appropriate success & refreshes
  try {
  if(import.meta.env.DEV) console.debug('[ClaimsView] onModalSave', { submitted, payload })
    // If modal emitted submitted:true we assume backend success already; otherwise it's a draft save success.
    if (submitted) toastSuccess('Claim submitted successfully')
    else toastSuccess('Draft saved successfully')
    modalOpen.value = false
    await Promise.all([
      refreshListOnly(),
      claims.fetchMine().catch(()=>{})
    ])
  } catch(e){
    const code = e?.response?.data?.code
    const backendMsg = mapBackendMessage(e?.response?.data)
    if(isLimitExceeded(backendMsg, code)) toastError('Submitting this claim would exceed your remaining limit')
    else toastError(backendMsg || e.message || 'Failed saving claim')
  }
}
function onModalClose() {}

onMounted(async () => {
  try {
    if(!auth.token && typeof auth.loadFromStorage==='function') auth.loadFromStorage()
    await claims.fetchMine()
  await refreshListOnly()
    if (auth.isManager) ensureManagersLoaded()
    const visHandler = async () => {
      if(document.visibilityState==='visible') {
    await refreshLimit()
      }
    }
    document.addEventListener('visibilitychange', visHandler)
  const interval = setInterval(()=> { refreshListOnly() }, 60000)
    const cleanup = () => { document.removeEventListener('visibilitychange', visHandler); clearInterval(interval) }
    window.__claimsLimitCleanup && window.__claimsLimitCleanup();
    window.__claimsLimitCleanup = cleanup
  } catch {}
})

function onFormValidationError(msg){
  if(!msg) return
  if(/Submitting this claim would exceed your remaining limit/i.test(msg) || /limit/i.test(msg) && /exceed|exceeds|remaining/i.test(msg)) {
    toastError('Submitting this claim would exceed your remaining limit')
  } else {
    toastError(msg)
  }
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
