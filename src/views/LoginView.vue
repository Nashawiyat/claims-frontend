<template>
  <div class="min-h-screen h-screen w-full flex flex-col md:flex-row overflow-hidden">
    <!-- Left Illustration / Image (slightly larger) -->
    <div class="relative hidden md:block md:basis-[58%] lg:basis-[62%] xl:basis-[64%] bg-black">
      <div class="absolute inset-0" :style="bgStyle"></div>
      <div class="relative h-full w-full">
        <!-- Center horizontally, raise vertically to ~30% viewport height -->
        <div class="absolute left-1/2 -translate-x-1/2 top-[30%] -translate-y-1/2 w-full px-6 md:px-10 lg:px-16">
          <div class="max-w-xl mx-auto text-center text-white bg-black/45 backdrop-blur-sm rounded-lg px-8 py-10 shadow-2xl ring-1 ring-white/10">
            <h2 class="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 drop-shadow">Welcome back</h2>
            <p class="text-lg md:text-xl leading-relaxed font-medium text-white/95 [text-shadow:_0_1px_2px_rgba(0,0,0,0.6)]">
              Access your claims dashboard, submit expenses, and track approvals effortlessly.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Login Form -->
    <div class="flex-1 md:basis-[42%] lg:basis-[38%] xl:basis-[36%] flex items-center justify-center p-8 md:p-10 lg:p-14 bg-slate-50 z-10">
      <div class="w-full max-w-md">
        <div class="mb-8 text-center md:text-left select-none">
          <span class="text-3xl font-bold tracking-tight text-blue-600">Claims<span class="text-slate-800">GT</span></span>
        </div>
        <div class="bg-white/95 backdrop-blur border border-slate-200 rounded-2xl shadow-xl px-8 py-10">
          <h1 class="text-2xl font-semibold mb-2 tracking-tight text-slate-800 text-center md:text-left">Sign in</h1>
          <p class="text-sm text-slate-500 mb-8 text-center md:text-left">Enter your credentials to continue.</p>
          <form @submit.prevent="onSubmit" class="space-y-5">
            <div class="space-y-1.5">
              <label for="email" class="block text-sm font-medium text-slate-700">Email</label>
              <input
                id="email"
                type="email"
                v-model="email"
                required
                autocomplete="username"
                class="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                placeholder="you@example.com"
              />
            </div>
            <div class="space-y-1.5">
              <label for="password" class="block text-sm font-medium text-slate-700">Password</label>
              <input
                id="password"
                type="password"
                v-model="password"
                required
                autocomplete="current-password"
                class="w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                placeholder="••••••••"
              />
            </div>
            <div v-if="error" class="text-red-600 text-sm font-medium" role="alert">{{ error }}</div>
            <button
              type="submit"
              :disabled="loading"
              class="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-md shadow transition-colors"
            >
              <span v-if="!loading">Sign In</span>
              <span v-else>Signing in...</span>
            </button>
          </form>
          <div class="mt-6 text-sm text-slate-500 text-center md:text-left">
            Don't have an account yet?
            <RouterLink to="/register" class="text-blue-600 hover:text-blue-700 font-medium">Sign Up</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import loginImg from '../assets/office-work-concept-problems-and-solutions-business-illustration-free-vector.jpg'

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const router = useRouter()
const auth = useAuthStore()

const bgStyle = `background-image:url(${loginImg});background-size:cover;background-position:center;opacity:80%`

async function onSubmit() {
  error.value = ''
  if (loading.value) return
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    await router.push('/claims')
  } catch (e) {
    // Attempt to pull a message off typical error response shapes
    const msg = e?.response?.data?.message || e?.message || 'Login failed'
    error.value = msg
  } finally {
    loading.value = false
  }
}
</script>
