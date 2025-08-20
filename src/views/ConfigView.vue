<template>
  <div class="space-y-12">
    <AlertsHost />
    <h1 class="text-2xl font-semibold tracking-tight text-slate-800">Configuration</h1>

    <!-- Default Claim Limit -->
    <section class="space-y-4">
      <h2 class="text-lg font-medium text-slate-700">Update Default Claim Limit</h2>
      <div class="bg-slate-50 border border-slate-200 rounded-lg p-6 space-y-4 max-w-xl">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-slate-600" for="defaultLimit">New Default Limit</label>
          <input id="defaultLimit" v-model.number="defaultLimit" type="number" min="0" class="px-3 py-2 rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 5000" />
        </div>
        <button :disabled="loadingDefault || defaultLimit===null || defaultLimit<0" @click="confirmDefault" class="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white">
          <span v-if="!loadingDefault">Update Default Limit</span>
          <span v-else class="flex items-center gap-2"><svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>Saving...</span>
        </button>
      </div>
    </section>

    <!-- User Specific Limit -->
    <section class="space-y-4">
      <h2 class="text-lg font-medium text-slate-700">Update User Claim Limit</h2>
      <div class="bg-slate-50 border border-slate-200 rounded-lg p-6 space-y-4 max-w-xl">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-slate-600" for="userEmail">User Email</label>
          <input id="userEmail" v-model.trim="userEmail" type="email" class="px-3 py-2 rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="user@example.com" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-slate-600" for="userLimit">New Limit Total</label>
          <input id="userLimit" v-model.number="userLimit" type="number" min="0" class="px-3 py-2 rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 8000" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-slate-600" for="userUsed">Used Claim Amount</label>
          <input id="userUsed" v-model.number="userUsed" type="number" min="0" class="px-3 py-2 rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 1200" />
        </div>
        <button :disabled="loadingUser || !isValidUserForm" @click="confirmUser" class="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white">
          <span v-if="!loadingUser">Update User Limit</span>
          <span v-else class="flex items-center gap-2"><svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>Saving...</span>
        </button>
      </div>
    </section>

    <ConfirmDialog
      v-model="showConfirmDefault"
      title="Confirm Default Limit Update"
      :message="defaultConfirmMessage"
      confirm-text="Update"
      :loading="loadingDefault"
      @confirm="performDefaultUpdate"
    />
    <ConfirmDialog
      v-model="showConfirmUser"
      title="Confirm User Limit Update"
      :message="userConfirmMessage"
      confirm-text="Update"
      :loading="loadingUser"
      @confirm="performUserUpdate"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
// Services encapsulate API access
import { updateDefaultLimit as apiUpdateDefaultLimit, updateUserLimit as apiUpdateUserLimit } from '@/services/configService'
import { useAlertsStore } from '@/stores/alerts'
import { useAuthStore } from '@/stores/auth'
import AlertsHost from '@/components/AlertsHost.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { fetchUserByEmail } from '@/services/userService'

const alerts = useAlertsStore()
const auth = useAuthStore()

const defaultLimit = ref(null)
const userEmail = ref('')
const userLimit = ref(null)
const userUsed = ref(null)

const loadingDefault = ref(false)
const loadingUser = ref(false)

// Confirm dialog state
const showConfirmDefault = ref(false)
const showConfirmUser = ref(false)
const defaultConfirmMessage = computed(()=>`Set global default claim limit to ${Number(defaultLimit.value)}?`)
const userConfirmMessage = computed(()=>`Set limit for ${userEmail.value || 'user'} to total ${Number(userLimit.value)} and used ${Number(userUsed.value)}?`)

const isValidUserForm = computed(() => !!userEmail.value && userLimit.value != null && userLimit.value >= 0 && userUsed.value != null && userUsed.value >= 0)

function confirmDefault(){
  if(defaultLimit.value==null || defaultLimit.value<0) return
  showConfirmDefault.value = true
}
async function performDefaultUpdate(){
  if(defaultLimit.value==null || defaultLimit.value<0) return
  loadingDefault.value = true
  try {
  await apiUpdateDefaultLimit(Number(defaultLimit.value))
    alerts.success('Default claim limit updated')
    defaultLimit.value = null
  } catch(e){
    alerts.error(e?.response?.data?.message || e.message || 'Failed updating default limit')
  } finally { loadingDefault.value = false; showConfirmDefault.value = false }
}

function confirmUser(){
  if(!isValidUserForm.value) return
  showConfirmUser.value = true
}
async function performUserUpdate(){
  if(!isValidUserForm.value) return
  // Lookup & role validation BEFORE any API call
  let target
  try { target = await fetchUserByEmail(userEmail.value) } catch(e){ alerts.error(e?.response?.data?.message || e.message || 'Lookup failed'); showConfirmUser.value=false; return }
  if(!target){ alerts.error('User not found'); showConfirmUser.value=false; return }
  const targetRole = target.role || target.userRole || ''
  if(targetRole === 'finance'){
    alerts.error('Cannot update claim limit for finance users')
    showConfirmUser.value=false
    return
  }
  if(targetRole === 'admin' && auth.role !== 'admin'){
    alerts.error('Only admins can update another admin\'s claim limit')
    showConfirmUser.value=false
    return
  }
  if(targetRole !== 'admin' && !['employee','manager'].includes(targetRole)){
    alerts.error('User role not eligible for limit update')
    showConfirmUser.value=false
    return
  }
  loadingUser.value = true
  try {
  await apiUpdateUserLimit({ email: userEmail.value, limit: Number(userLimit.value), used: Number(userUsed.value) })
    alerts.success('User claim limit updated')
    userEmail.value=''; userLimit.value=null; userUsed.value=null
  } catch(e){
    alerts.error(e?.response?.data?.message || e.message || 'Failed updating user limit')
  } finally { loadingUser.value = false; showConfirmUser.value = false }
}
</script>

<style scoped>
</style>
