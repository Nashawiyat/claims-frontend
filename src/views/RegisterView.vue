<template>
  <div class="min-h-screen h-screen w-full flex flex-col md:flex-row overflow-hidden">
    <!-- Left Illustration / Image matches login -->
    <div class="relative hidden md:block md:basis-[58%] lg:basis-[62%] xl:basis-[64%] bg-black">
      <div class="absolute inset-0" :style="bgStyle"></div>
      <div class="relative h-full w-full">
        <div class="absolute left-1/2 -translate-x-1/2 top-[30%] -translate-y-1/2 w-full px-6 md:px-10 lg:px-16">
          <div class="max-w-xl mx-auto text-center text-white bg-black/45 backdrop-blur-sm rounded-lg px-8 py-10 shadow-2xl ring-1 ring-white/10">
            <h2 class="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 drop-shadow">Create account</h2>
            <p class="text-lg md:text-xl leading-relaxed font-medium text-white/95 [text-shadow:_0_1px_2px_rgba(0,0,0,0.6)]">
              Register to submit and manage claims in one unified dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Register Form -->
    <div class="flex-1 md:basis-[42%] lg:basis-[38%] xl:basis-[36%] flex items-center justify-center p-8 md:p-10 lg:p-14 bg-slate-50 z-10">
      <div class="w-full max-w-md">
        <div class="mb-8 text-center md:text-left select-none">
          <span class="text-3xl font-bold tracking-tight text-blue-600">Claims<span class="text-slate-800">GT</span></span>
        </div>
        <div class="bg-white/95 backdrop-blur border border-slate-200 rounded-2xl shadow-xl px-8 py-10">
          <h1 class="text-2xl font-semibold mb-2 tracking-tight text-slate-800 text-center md:text-left">Register</h1>
          <p class="text-sm text-slate-500 mb-8 text-center md:text-left">Fill in your details to create your account.</p>
          <form @submit.prevent="onSubmit" class="space-y-5">
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
            <button type="submit" :disabled="loading" class="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-md shadow transition-colors">
              <span v-if="!loading">Create Account</span>
              <span v-else>Creating...</span>
            </button>
          </form>
          <div class="mt-6 text-sm text-slate-500 text-center md:text-left">
            Already have an account?
            <RouterLink to="/login" class="text-blue-600 hover:text-blue-700 font-medium">Login</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
// API service layer abstraction
import { fetchManagers as apiFetchManagers } from '../services/userService'
import loginImg from '../assets/office-work-concept-problems-and-solutions-business-illustration-free-vector.jpg'

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

const router = useRouter()
const auth = useAuthStore()

const bgStyle = `background-image:url(${loginImg});background-size:cover;background-position:center;opacity:80%`

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

onMounted(() => {
  // Preload managers if default role is employee (not selected yet so nothing now)
})

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
    await auth.register({
      name: name.value,
      email: email.value,
      password: password.value,
      role: role.value,
      manager: role.value === 'employee' ? managerId.value : undefined
    })
    await router.push('/claims')
  } catch (e) {
    const msg = e?.message || e?.response?.data?.message || 'Registration failed'
    error.value = msg
  } finally {
    loading.value = false
  }
}
</script>
