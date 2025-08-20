<template>
  <div class="w-full flex flex-col items-center">
    <div class="w-full max-w-xl mb-6">
      <h1 class="text-xl font-semibold tracking-tight text-slate-800 text-center">Create User</h1>
    </div>
    <div class="w-full flex justify-center">
      <div class="w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-sm p-8 space-y-6">
        <div>
          <h2 class="text-lg font-semibold tracking-tight text-slate-800">Register New Account</h2>
          <p class="text-sm text-slate-500 mt-1">Fill in the details below.</p>
        </div>
  <form @submit.prevent="openConfirm" class="space-y-5">
            <!-- Name -->
            <div class="space-y-1.5">
              <label for="name" class="block text-sm font-medium text-slate-700">Full Name</label>
              <input id="name" type="text" v-model="name" required autocomplete="name" class="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" placeholder="Jane Doe" />
            </div>
            <!-- Email -->
            <div class="space-y-1.5">
              <label for="email" class="block text-sm font-medium text-slate-700">Email</label>
              <input id="email" type="email" v-model="email" required autocomplete="email" class="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" placeholder="you@example.com" />
            </div>
            <!-- Password -->
            <div class="space-y-1.5">
              <label for="password" class="block text-sm font-medium text-slate-700">Password</label>
              <input id="password" type="password" v-model="password" required autocomplete="new-password" class="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" placeholder="••••••••" />
            </div>
            <!-- Confirm Password -->
            <div class="space-y-1.5">
              <label for="confirmPassword" class="block text-sm font-medium text-slate-700">Confirm Password</label>
              <input id="confirmPassword" type="password" v-model="confirmPassword" required autocomplete="new-password" class="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" placeholder="••••••••" />
            </div>
            <!-- Role -->
            <div class="space-y-1.5">
              <label for="role" class="block text-sm font-medium text-slate-700">Role</label>
              <select id="role" v-model="role" required class="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                <option disabled value="">Select role</option>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="finance">Finance</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <!-- Manager selection if employee -->
            <div v-if="role==='employee'" class="space-y-1.5">
              <label for="manager" class="block text-sm font-medium text-slate-700">Manager</label>
              <select id="manager" v-model="managerId" required class="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                <option disabled value="">Select manager</option>
                <option v-for="m in managers" :key="m.id || m._id" :value="m.id || m._id">{{ m.name || m.fullName || m.email }}</option>
              </select>
              <p v-if="loadingManagers" class="text-xs text-slate-500">Loading managers...</p>
              <p v-else-if="!loadingManagers && managers.length===0" class="text-xs text-slate-500">No managers found.</p>
            </div>
            <div v-if="error" class="text-red-600 text-sm font-medium" role="alert">{{ error }}</div>
          <div class="flex justify-end">
            <button type="submit" :disabled="loading" class="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium px-5 py-2.5 rounded-md shadow transition-colors">
              <span v-if="!loading">Create Account</span>
              <span v-else>Creating...</span>
            </button>
          </div>
        </form>
        <ConfirmDialog
          v-model="showConfirm"
          title="Create New Account"
          :message="confirmMessage"
          confirm-text="Create"
          :loading="loading"
          @confirm="onSubmit"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
// API service layer abstraction
import { fetchManagers as apiFetchManagers } from '../services/userService'
import { useAlertsStore } from '@/stores/alerts'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const role = ref('')
const managerId = ref('')

const loading = ref(false)
const error = ref('')
const managers = ref([])
const loadingManagers = ref(false)

const auth = useAuthStore()
const alerts = useAlertsStore()
const showConfirm = ref(false)
const confirmMessage = computed(()=>`Create new ${role.value || 'user'} account for ${email.value || 'email'}?`)

// Layout now matches in-app views; background illustration removed.

watch(role, async (val) => {
  if (val === 'employee' && managers.value.length === 0 && !loadingManagers.value) {
    await fetchManagers()
  }
})

async function fetchManagers() {
  loadingManagers.value = true
  try {
    managers.value = await apiFetchManagers()
  } catch (e) {
    console.warn('Failed to fetch managers', e)
  } finally {
    loadingManagers.value = false
  }
}

// No mount side-effects needed

function openConfirm(){
  error.value=''
  if(loading.value) return
  if(password.value !== confirmPassword.value){
    error.value = 'Passwords do not match'
    return
  }
  if(role.value === 'employee' && !managerId.value){
    error.value = 'Please select a manager for employee registration'
    return
  }
  showConfirm.value = true
}

async function onSubmit() {
  error.value = ''
  if (loading.value) return
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }
  if (role.value === 'employee' && !managerId.value) {
    error.value = 'Please select a manager for employee registration'
    return
  }
  loading.value = true
  try {
  // Use non-auth-logging creation to preserve current admin session
  await auth.createUserNoLogin({
      name: name.value,
      email: email.value,
      password: password.value,
      role: role.value,
      manager: role.value === 'employee' ? managerId.value : undefined
    })
    alerts.success('Account created')
    showConfirm.value = false
    // Reset form (keep role & manager? choose to reset all)
    name.value=''; email.value=''; password.value=''; confirmPassword.value=''; role.value=''; managerId.value=''; managers.value=[]
  } catch (e) {
    const msg = e?.message || e?.response?.data?.message || 'Registration failed'
    error.value = msg
  } finally {
    loading.value = false
  }
}
</script>
