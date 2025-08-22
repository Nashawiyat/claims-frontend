<template>
  <div class="space-y-10">
    <AlertsHost />
    <h1 class="text-2xl font-semibold tracking-tight text-slate-800">Configuration</h1>

    <!-- Default Claim Limits by Role -->
    <section class="space-y-4">
      <div>
        <h2 class="text-lg font-medium text-slate-700">Default Claim Limits</h2>
        <p class="text-xs text-slate-500 mt-1">These limits apply only to <strong>newly created accounts</strong> for each role. Existing users are unaffected.</p>
      </div>
      <div class="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl">
        <div v-for="role in roleOrder" :key="role" class="bg-white border border-slate-200 rounded-lg p-5 space-y-3 shadow-sm">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold tracking-wide uppercase text-slate-600">{{ roleLabel(role) }}</h3>
            <span v-if="isDisabled(role)" class="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">{{ disableReason(role) }}</span>
          </div>
          <div class="flex flex-col gap-1">
            <label :for="'limit_'+role" class="text-xs font-medium text-slate-500">Default Limit</label>
            <input :id="'limit_'+role" v-model.number="limits[role]" type="number" min="0" :disabled="isDisabled(role) || saving" class="px-3 py-2 rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
          </div>
        </div>
      </div>
    </section>

    <!-- Reset Policy -->
    <section class="space-y-4 max-w-3xl">
      <div>
        <h2 class="text-lg font-medium text-slate-700">Reset Policy</h2>
        <p class="text-xs text-slate-500 mt-1">Defines when all users' claim usage counters reset.</p>
      </div>
      <div class="bg-white border border-slate-200 rounded-lg p-6 space-y-5 shadow-sm">
        <div class="grid gap-6 md:grid-cols-2">
          <div class="flex flex-col gap-1">
            <label for="cycle" class="text-xs font-medium text-slate-500">Cycle</label>
            <select id="cycle" v-model="reset.cycle" :disabled="!canEditReset || saving" class="px-3 py-2 rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
              <option value="annual">Annual</option>
              <option value="quarterly">Quarterly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label for="resetDate" class="text-xs font-medium text-slate-500">Reset Date</label>
            <input id="resetDate" type="date" v-model="resetDateInput" :disabled="!canEditReset || saving" class="px-3 py-2 rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
            <p class="text-[10px] text-slate-400">Choose the date the next reset will run.</p>
          </div>
        </div>
      </div>
    </section>

    <div class="pt-2">
      <button @click="openSave" :disabled="!dirty || saving" class="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
        <span v-if="!saving">Save Changes</span>
        <span v-else class="flex items-center gap-2"><svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>Saving...</span>
      </button>
    </div>

    <ConfirmDialog
      v-model="showConfirm"
      title="Save Configuration"
      :message="confirmMessage"
      confirm-text="Save"
      :loading="saving"
      @confirm="performSave"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useAlertsStore } from '@/stores/alerts'
import { useAuthStore } from '@/stores/auth'
import AlertsHost from '@/components/AlertsHost.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { getConfig, saveConfig } from '@/services/configService'

const alerts = useAlertsStore()
const auth = useAuthStore()

const limits = reactive({ employee: null, manager: null, admin: null })
const original = reactive({ limits: {}, reset: {} })
const reset = reactive({ cycle: 'annual', resetDate: null })
const saving = ref(false)
const showConfirm = ref(false)
const resetDateInput = ref('')

// Finance default limit removed (non-applicable); only show editable / governed roles
const roleOrder = ['employee','manager','admin']

const canEditReset = computed(()=> ['admin','finance'].includes(auth.role))
function isDisabled(role){
  if(role==='admin') return auth.role !== 'admin'
  // employee or manager require admin or finance
  return !['admin','finance'].includes(auth.role)
}
function disableReason(role){
  if(role==='admin' && auth.role!=='admin') return 'Admin Only'
  if(['employee','manager'].includes(role) && !['admin','finance'].includes(auth.role)) return 'Restricted'
  return '—'
}
function roleLabel(r){ return r.charAt(0).toUpperCase()+r.slice(1) }

const dirty = computed(()=>{
  if(limits.employee !== original.limits.employee) return true
  if(limits.manager !== original.limits.manager) return true
  if(limits.admin !== original.limits.admin) return true
  if(reset.cycle !== original.reset.cycle) return true
  const origDate = original.reset.resetDate ? new Date(original.reset.resetDate).toISOString().slice(0,10) : ''
  if(resetDateInput.value !== origDate) return true
  return false
})

const confirmMessage = computed(()=>{
  return 'Apply configuration changes? Defaults affect only future accounts.'
})

async function load(){
  try {
    const cfg = await getConfig()
    if(cfg?.defaultLimits){
      limits.employee = cfg.defaultLimits.employee ?? 0
      limits.manager = cfg.defaultLimits.manager ?? 0
      limits.admin = cfg.defaultLimits.admin ?? 0
      Object.assign(original.limits, { employee: limits.employee, manager: limits.manager, admin: limits.admin })
    }
    if(cfg?.resetPolicy){
      reset.cycle = cfg.resetPolicy.cycle || 'annual'
      reset.resetDate = cfg.resetPolicy.resetDate || null
      resetDateInput.value = reset.resetDate ? new Date(reset.resetDate).toISOString().slice(0,10) : ''
      Object.assign(original.reset, { cycle: reset.cycle, resetDate: reset.resetDate })
    }
  } catch(e){
    alerts.error(e?.response?.data?.message || e.message || 'Failed loading config')
  }
}

function openSave(){ if(!dirty.value) return; showConfirm.value = true }

async function performSave(){
  saving.value = true
  try {
    const payload = { defaultLimits: {}, resetPolicy: {} }
    if(!isDisabled('employee')) payload.defaultLimits.employee = Number(limits.employee||0)
    if(!isDisabled('manager')) payload.defaultLimits.manager = Number(limits.manager||0)
    if(!isDisabled('admin')) payload.defaultLimits.admin = Number(limits.admin||0)
    if(canEditReset.value){
      payload.resetPolicy.cycle = reset.cycle
      if(resetDateInput.value){ payload.resetPolicy.resetDate = resetDateInput.value }
    }
    const cfg = await saveConfig(payload)
    alerts.success('Configuration saved')
    // Update originals
    if(cfg?.defaultLimits){
      Object.assign(original.limits, cfg.defaultLimits)
      limits.employee = cfg.defaultLimits.employee
      limits.manager = cfg.defaultLimits.manager
      limits.admin = cfg.defaultLimits.admin
    }
    if(cfg?.resetPolicy){
      Object.assign(original.reset, cfg.resetPolicy)
      reset.cycle = cfg.resetPolicy.cycle
      reset.resetDate = cfg.resetPolicy.resetDate
      resetDateInput.value = reset.resetDate ? new Date(reset.resetDate).toISOString().slice(0,10) : ''
    }
    showConfirm.value = false
  } catch(e){
    alerts.error(e?.response?.data?.message || e.message || 'Failed saving configuration')
  } finally { saving.value = false }
}

onMounted(load)
</script>

<style scoped>
</style>
