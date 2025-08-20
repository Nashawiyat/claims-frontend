<template>
  <transition name="fade" appear>
    <div v-if="modelValue" class="fixed inset-0 z-[55] flex items-center justify-center px-4 py-8" @click.self="close">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
      <div class="relative w-full max-w-lg bg-white rounded-xl shadow-xl ring-1 ring-black/10 flex flex-col overflow-hidden animate-scale-in">
        <div class="px-6 pt-6 pb-4 border-b border-slate-200 flex items-start justify-between">
          <div class="pr-4 min-w-0">
            <h2 class="text-lg font-semibold text-slate-800 truncate" :title="claim?.title">{{ claim?.title || 'Claim' }}</h2>
            <p class="text-xs text-slate-500 mt-0.5">Created {{ createdAt }}</p>
          </div>
          <button @click="close" class="p-1 rounded-md text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer" aria-label="Close dialog">
            <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
          </button>
        </div>
  <div class="px-6 pt-5 pb-6 space-y-6 text-sm">
          <div class="grid grid-cols-2 gap-4 text-xs">
            <div class="flex flex-col gap-0.5">
              <span class="text-slate-500 uppercase tracking-wide">Amount</span>
              <span class="text-sm font-medium text-slate-800">{{ currency }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-slate-500 uppercase tracking-wide">Status</span>
              <span :class="['px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide w-fit', statusClass]">{{ claim?.status }}</span>
            </div>
            <div class="flex flex-col gap-0.5 col-span-1">
              <span class="text-slate-500 uppercase tracking-wide">Employee</span>
              <span class="font-medium text-slate-700 truncate" :title="claim?.createdBy?.name">{{ claim?.createdBy?.name || '—' }}</span>
            </div>
            <div class="flex flex-col gap-0.5 col-span-1">
              <span class="text-slate-500 uppercase tracking-wide">Manager</span>
              <span class="font-medium text-slate-700 truncate" :title="managerName">{{ managerName }}</span>
            </div>
            <div class="flex flex-col gap-0.5 col-span-1" v-if="updatedAt && updatedAt !== createdAt">
              <span class="text-slate-500 uppercase tracking-wide">Updated</span>
              <span class="font-medium text-slate-700">{{ updatedAt }}</span>
            </div>
            <div class="flex flex-col gap-0.5 col-span-2" v-if="showRejectionReason">
              <span class="text-slate-500 uppercase tracking-wide">Rejection Reason</span>
              <span class="font-medium text-slate-700 whitespace-pre-line" data-test="rejection-reason">{{ rejectionReason }}</span>
            </div>
          </div>
          <div>
            <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Description</h3>
            <p v-if="claim?.description" class="text-slate-700 whitespace-pre-line text-sm break-words break-all [&>*]:break-words">{{ claim.description }}</p>
            <p v-else class="text-slate-400 text-xs">No description provided.</p>
          </div>
          <div v-if="claim?.receiptUrl">
            <button type="button" @click="viewReceipt" class="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer">
              <img src="@/assets/eye.svg" alt="View" class="w-4 h-4" /> View receipt
            </button>
          </div>
        </div>
        <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button @click="close" type="button" class="text-sm px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-100 font-medium text-slate-700 cursor-pointer">Close</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { openReceiptForClaim, fetchClaimManager } from '@/services/claimWorkflowService'
import { useAlertsStore } from '@/stores/alerts'
import { fetchUserManager } from '@/services/userService'
const alerts = useAlertsStore()

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  claim: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue','close'])

function close(){ emit('update:modelValue', false); emit('close') }

async function viewReceipt(){
  try { await openReceiptForClaim(props.claim) } catch { alerts.error('Failed to load receipt') }
}

const currency = computed(()=>{
  const amount = props.claim?.amount ?? 0
  try { return new Intl.NumberFormat(undefined,{ style:'currency', currency:'USD'}).format(amount) } catch { return amount.toFixed(2) }
})
const createdAt = computed(()=> formatDate(props.claim?.createdAt))
const updatedAt = computed(()=> formatDate(props.claim?.updatedAt))
const rejectionReason = computed(()=> props.claim?.rejectionReason || '')
const showRejectionReason = computed(()=> (props.claim?.status || '').toLowerCase() === 'rejected' && !!rejectionReason.value.trim())

// Manager enrichment (when modal opened) – mirrors logic used in claims store
const managerRef = ref(null)
const managerName = computed(()=> {
  if (props.claim?.manager === null || props.claim?._adminClaim) return 'N/A (Admin Claim)'
  const name = props.claim?.manager?.name || managerRef.value?.name
  return name && name !== 'Unknown' ? name : '—'
})

watch(() => props.modelValue, async (open) => {
  if (open) {
    maybeFetchManager()
  }
})

watch(() => props.claim, () => { if (props.modelValue) maybeFetchManager() })

let fetchingMgr = false
async function maybeFetchManager(){
  if (fetchingMgr) return
  const claimId = props.claim?._id
  const existingName = props.claim?.manager?.name
  if (!claimId) return
  if (props.claim?.manager === null) return // admin claim, no manager
  if (existingName && existingName !== 'Unknown') return
  try {
    fetchingMgr = true
    // Prefer dedicated claim manager endpoint
    let mgr = null
    try { mgr = await fetchClaimManager(claimId) } catch { /* fallback below */ }
    if (!mgr) {
      // fallback to user manager via createdBy path
      const createdById = props.claim?.createdBy?._id
      if (createdById) {
        try { mgr = await fetchUserManager(createdById) } catch { /* ignore */ }
      }
    }
    if (mgr) managerRef.value = { _id: mgr._id || mgr.id, name: mgr.name || mgr.fullName || mgr.email || '—' }
  } catch { /* ignore */ } finally { fetchingMgr = false }
}

function formatDate(dt){
  if(!dt) return '—'
  try { return new Date(dt).toLocaleString(undefined,{ dateStyle:'medium', timeStyle:'short'}) } catch { return dt }
}

const statusClass = computed(()=>{
  const s = (props.claim?.status||'').toLowerCase()
  switch (s){
    case 'approved': return 'bg-emerald-100 text-emerald-700'
    case 'rejected': return 'bg-red-100 text-red-700'
    case 'submitted': return 'bg-blue-100 text-blue-700'
    case 'draft': return 'bg-slate-200 text-slate-700'
    case 'paid': return 'bg-indigo-100 text-indigo-700'
    default: return 'bg-slate-100 text-slate-600'
  }
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@keyframes scale-in { from { transform: scale(.97); opacity: 0;} to { transform: scale(1); opacity:1;} }
.animate-scale-in { animation: scale-in .16s ease; }
</style>
