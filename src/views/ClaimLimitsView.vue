<template>
  <div class="space-y-8">
    <div class="space-y-4">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div class="space-y-3 flex-1 min-w-0">
          <h1 class="text-xl font-semibold tracking-tight text-slate-800">Claim Limits</h1>
          <div class="flex flex-wrap items-center gap-3">
            <UserListFilters
              v-model:search="search"
              v-model:role="roleFilter"
              :roles="roleFilterOptions"
              :enable-role="true"
              search-placeholder="Search by name or email…"
            />
            <BulkLimitActions
              v-if="canBulk"
              v-model="bulkRole"
              :is-admin="isAdmin"
              :actioning="actioningBulk"
              @apply-defaults="openApplyDefaults"
              @reset-all="openResetAll"
            />
          </div>
        </div>
        <div class="flex gap-2">
          <button @click="load" :disabled="loading" class="inline-flex items-center gap-2 text-xs font-medium bg-slate-200 hover:bg-slate-300 disabled:opacity-50 px-3 py-1.5 rounded-md self-start">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v6h6M20 20v-6h-6M5 19a9 9 0 0014-3M19 5a9 9 0 00-14 3"/></svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>

  <div class="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr class="text-left">
              <th class="py-2 px-3 font-medium">Name</th>
              <th class="py-2 px-3 font-medium">Role</th>
              <th class="py-2 px-3 font-medium">Email</th>
              <th class="py-2 px-3 font-medium">Total</th>
              <th class="py-2 px-3 font-medium">Used</th>
              <th class="py-2 px-3 font-medium">Remaining</th>
              <th class="py-2 px-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="py-8 text-center text-slate-500">Loading...</td>
            </tr>
            <tr v-else-if="!records.length">
              <td colspan="7" class="py-8 text-center text-slate-500">No users found.</td>
            </tr>
            <tr v-for="r in pagedRecords" :key="r._id" class="border-t border-slate-100 hover:bg-slate-50">
              <td class="py-2 px-3 text-slate-800 font-medium">{{ r.name || r.fullName || r.email || '—' }}</td>
              <td class="py-2 px-3 capitalize">{{ r.role }}</td>
              <td class="py-2 px-3">{{ r.email }}</td>
              <td class="py-2 px-3">
                <div v-if="editId===r._id" class="flex items-center gap-1">
                  <input v-model.number="editLimit" type="number" min="0" step="0.01" class="w-24 border rounded px-2 py-1 text-xs" />
                </div>
                <span v-else>{{ formatCurrency(r.limit?.total) }}</span>
              </td>
              <td class="py-2 px-3 tabular-nums">{{ formatCurrency(r.used) }}</td>
              <td class="py-2 px-3 tabular-nums">{{ formatCurrency(r.remaining) }}</td>
              <td class="py-2 px-3 space-x-2 text-xs">
                <template v-if="editId===r._id">
                  <button @click="openConfirmSave(r)" :disabled="actioning" class="px-2 py-1 rounded bg-blue-600 text-white disabled:opacity-50">Save</button>
                  <button @click="cancel" :disabled="actioning" class="px-2 py-1 rounded border">Cancel</button>
                </template>
                <template v-else>
                  <button @click="startEdit(r)" class="px-2 py-1 rounded border">Edit</button>
                  <button @click="openConfirmResetUser(r)" :disabled="actioning" class="px-2 py-1 rounded bg-amber-500 text-white disabled:opacity-50">Reset Used</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex items-center justify-between p-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-600">
        <div>Yearly resets occur automatically; use Reset Used only for corrective adjustments.</div>
        <div v-if="totalPages>1 || records.length" class="flex items-center gap-2">
          <span>Total {{ totalItems }} • Page {{ page }} / {{ totalPages }}</span>
          <button class="px-2 py-1 rounded bg-white border text-xs disabled:opacity-40" :disabled="page===1 || loading" @click="changePage(page-1)">Prev</button>
          <button class="px-2 py-1 rounded bg-white border text-xs disabled:opacity-40" :disabled="page===totalPages || loading" @click="changePage(page+1)">Next</button>
    </div>
      </div>
    </div>
  </div>
  <ConfirmDialog
    v-model="showConfirmApplyDefaults"
    title="Apply Role Defaults"
    :message="applyDefaultsMessage"
    confirm-text="Apply"
    :loading="actioningBulk"
    @confirm="applyDefaults"
  />
  <ConfirmDialog
    v-model="showConfirmResetAll"
    title="Reset Used Amounts"
    :message="resetAllMessage"
    confirm-text="Reset"
    :loading="actioningBulk"
    @confirm="doResetAll"
  />
  <ConfirmDialog
    v-model="showConfirmSaveLimit"
    title="Confirm Limit Update"
    :message="saveLimitMessage"
    confirm-text="Save"
    :loading="actioning"
    @confirm="doSaveConfirmed"
  />
  <ConfirmDialog
    v-model="showConfirmResetUser"
    title="Confirm User Reset"
    :message="resetUserMessage"
    confirm-text="Reset"
    :loading="actioning"
    @confirm="doResetUserConfirmed"
  />
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { fetchClaimLimits, updateClaimLimit, applyDefaultsForRole, resetAllUsed } from '@/apis/claimLimits'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import UserListFilters from '@/components/UserListFilters.vue'
import BulkLimitActions from '@/components/BulkLimitActions.vue'
import { useAuthStore } from '@/stores/auth'
import { useClaimsStore } from '@/stores/claims'
import { useAlertsStore } from '@/stores/alerts'
import { useClaimLimits } from '@/composables/useClaimLimits'
import { useRoute, useRouter } from 'vue-router'
const alerts = useAlertsStore()

const records = ref([])
const loading = ref(false)
// Pagination state
const route = useRoute()
const router = useRouter()
const page = ref(Number(route.query.page) || 1)
const limit = ref(10)
const totalPages = ref(1)
const totalItems = ref(0)

// Search & filtering
const search = ref('')
const roleFilter = ref('')
const roleFilterOptions = computed(()=> isAdmin.value ? ['employee','manager','admin'] : ['employee','manager'])
const filteredRecords = computed(()=> records.value.filter(r => {
  if(roleFilter.value && r.role !== roleFilter.value) return false
  if(search.value){
    const q = search.value.toLowerCase()
    const name = (r.name || r.fullName || '').toLowerCase()
    if(!name.includes(q) && !r.email.toLowerCase().includes(q)) return false
  }
  return true
}))
const pagedRecords = computed(()=>{
  const start = (page.value-1)*limit.value
  return filteredRecords.value.slice(start, start+limit.value)
})

function syncQuery(){
  const q = { ...route.query, page: page.value }
  router.replace({ query: q })
}
function applyRoute(){ page.value = Number(route.query.page)||1 }
watch(route, applyRoute)

function changePage(p){ if(p<1 || p> totalPages.value) return; page.value=p; syncQuery() }
const editId = ref(null)
const editLimit = ref(0)
const actioning = ref(false)
const actioningBulk = ref(false)
const bulkRole = ref('')
const canBulk = computed(()=> ['admin','finance'].includes(auth.role))
const isAdmin = computed(()=> auth.role==='admin')
const showConfirmApplyDefaults = ref(false)
const showConfirmResetAll = ref(false)
const showConfirmSaveLimit = ref(false)
const showConfirmResetUser = ref(false)
const targetRecord = ref(null)
const applyDefaultsMessage = computed(()=> bulkRole.value
  ? `Apply current configuration default limit to ALL ${formatRoleLabel(bulkRole.value)} accounts? This will overwrite their existing totals.`
  : 'Select a role to apply defaults.'
)
const resetAllMessage = computed(()=> bulkRole.value
  ? `Reset used amounts to 0 for all ${formatRoleLabel(bulkRole.value)} accounts?`
  : 'Reset used amounts to 0 for ALL visible accounts (excluding Finance).'
)
function formatRoleLabel(r){ return r.charAt(0).toUpperCase()+r.slice(1) }
const auth = useAuthStore()
const claimsStore = useClaimsStore()
// Shared limits composable (keeps Claims view & this view in sync)
const { refreshDual: refreshMySummary, updateFrom: updateSummaryFrom } = useClaimLimits()

function formatCurrency(v){ try { return new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(v||0) } catch { return Number(v||0).toFixed(2) } }

async function load(){
  loading.value = true
  try {
    const raw = await fetchClaimLimits()
    // Filter out finance always; hide admin unless current user is admin
    const isAdminViewer = auth.role === 'admin'
    records.value = raw.filter(u => u.role !== 'finance' && (isAdminViewer || u.role !== 'admin'))
  }
  catch(e){ alerts.error(e?.response?.data?.message || e.message || 'Failed loading claim limits') }
  finally { loading.value = false }
}
function startEdit(r){ editId.value = r._id; editLimit.value = r.limit?.total || 0 }
function cancel(){ editId.value = null }
function openConfirmSave(r){ targetRecord.value = r; showConfirmSaveLimit.value = true }
async function save(r){
  actioning.value = true
  try {
    const { limit } = await updateClaimLimit(r._id, editLimit.value, false)
    if(limit){
      r.limit = { total: limit.total }
      r.used = limit.used
      r.remaining = limit.remaining
    } else {
      r.limit = { total: editLimit.value }
      // preserve existing used/remaining if backend omitted
    }
    // If updating currently authenticated user, refresh their limit summary for claims view
    const selfId = auth.user?._id || auth.user?.id
    if (selfId && selfId === r._id) {
      // Immediate shared summary update then dual refresh for authoritative state
      if(limit) updateSummaryFrom({ limit: { total: limit.total, used: limit.used, remaining: limit.remaining }, used: limit.used, remaining: limit.remaining })
      await refreshMySummary()
    }
    alerts.success('Limit updated')
    editId.value = null
  } catch(e){ alerts.error(e?.response?.data?.message || e.message || 'Failed updating limit') }
  finally { actioning.value = false }
}
function openConfirmResetUser(r){ targetRecord.value = r; showConfirmResetUser.value = true }
async function resetUsed(r){
  actioning.value = true
  try {
    const { limit } = await updateClaimLimit(r._id, r.limit?.total || 0, true)
    if(limit){
      r.used = limit.used
      r.remaining = limit.remaining
    } else {
      r.used = 0; r.remaining = (r.limit?.total||0)
    }
    const selfId = auth.user?._id || auth.user?.id
    if (selfId && selfId === r._id) {
      if(limit) updateSummaryFrom({ limit: { total: limit.total, used: limit.used, remaining: limit.remaining }, used: limit.used, remaining: limit.remaining })
      else updateSummaryFrom({ limit: { total: r.limit?.total }, used: 0, remaining: r.limit?.total||0 })
      await refreshMySummary()
    }
    alerts.success('Used amount reset')
  } catch(e){ alerts.error(e?.response?.data?.message || e.message || 'Failed resetting used amount') }
  finally { actioning.value = false }
}
// Confirm dialog computed messages & handlers
const saveLimitMessage = computed(()=> targetRecord.value ? `Save new total limit of ${formatCurrency(editLimit.value)} for ${targetRecord.value.name || targetRecord.value.fullName || targetRecord.value.email}?` : '')
const resetUserMessage = computed(()=> targetRecord.value ? `Reset used amount for ${targetRecord.value.name || targetRecord.value.fullName || targetRecord.value.email} back to 0?` : '')
async function doSaveConfirmed(){ if(!targetRecord.value) return; await save(targetRecord.value); showConfirmSaveLimit.value = false }
async function doResetUserConfirmed(){ if(!targetRecord.value) return; await resetUsed(targetRecord.value); showConfirmResetUser.value = false }
// Bulk operations
function openApplyDefaults(){ if(!bulkRole.value) return; showConfirmApplyDefaults.value = true }
async function applyDefaults(){
  actioningBulk.value = true
  try {
    await applyDefaultsForRole(bulkRole.value)
    alerts.success('Defaults applied')
    await load()
  } catch(e){ alerts.error(e?.response?.data?.message || e.message || 'Failed applying defaults') }
  finally { actioningBulk.value = false; showConfirmApplyDefaults.value = false }
}
function openResetAll(){ showConfirmResetAll.value = true }
async function doResetAll(){
  actioningBulk.value = true
  try {
    await resetAllUsed(bulkRole.value || undefined)
    alerts.success('Used amounts reset')
    await load()
  } catch(e){ alerts.error(e?.response?.data?.message || e.message || 'Failed resetting all used amounts') }
  finally { actioningBulk.value = false; showConfirmResetAll.value = false }
}
watch([records, filteredRecords], ()=> { totalItems.value = filteredRecords.value.length; totalPages.value = Math.max(1, Math.ceil(totalItems.value/limit.value)); if(page.value>totalPages.value) page.value = totalPages.value })

onMounted(()=>{ applyRoute(); load() })
</script>

<style scoped>
</style>
