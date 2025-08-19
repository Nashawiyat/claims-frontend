<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const role = computed(() => auth.role)
const isAuthed = computed(() => auth.isAuthenticated)
const isLoginRoute = computed(() => route.path === '/login')

function go(path) {
  router.push(path)
}
function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div>
    <RouterView v-if="isLoginRoute" />
    <div v-else class="min-h-screen flex flex-col bg-slate-100 text-gray-800">
      <header class="bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm">
        <div class="max-w-7xl mx-auto pl-4 pr-8 py-4 flex items-center gap-8">
          <h1 @click="go('/claims')" class="font-semibold text-2xl cursor-pointer select-none tracking-tight text-slate-800">Claims Portal</h1>
          <nav class="flex-1 flex items-center gap-6 text-[15px]">
            <RouterLink v-if="isAuthed" to="/claims" class="hover:text-blue-600 transition-colors" active-class="text-blue-600 font-semibold">Claims</RouterLink>
            <RouterLink v-if="isAuthed && (role==='manager' || role==='admin')" to="/manager" class="hover:text-blue-600 transition-colors" active-class="text-blue-600 font-semibold">Manager</RouterLink>
            <RouterLink v-if="isAuthed && (role==='finance' || role==='admin')" to="/finance" class="hover:text-blue-600 transition-colors" active-class="text-blue-600 font-semibold">Finance</RouterLink>
            <RouterLink v-if="isAuthed && role==='admin'" to="/admin" class="hover:text-blue-600 transition-colors" active-class="text-blue-600 font-semibold">Admin</RouterLink>
          </nav>
          <div class="flex items-center gap-4">
            <span v-if="isAuthed" class="text-xs uppercase tracking-wide bg-slate-200 px-2 py-1 rounded-md font-medium text-slate-700">{{ role }}</span>
            <RouterLink v-if="!isAuthed" to="/login" class="text-sm bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow text-white px-4 py-2 rounded-md font-medium transition-colors">Login</RouterLink>
            <button v-else @click="logout" class="text-sm bg-slate-700 hover:bg-slate-800 active:bg-slate-900 shadow text-white px-4 py-2 rounded-md font-medium transition-colors">Logout</button>
          </div>
        </div>
      </header>
      <main class="flex-1 w-full mx-auto max-w-7xl px-10 pt-8 pb-12">
        <div class="bg-white rounded-lg shadow border border-slate-200 min-h-[60vh] p-8">
          <RouterView />
        </div>
      </main>
      <footer class="text-center text-xs text-slate-500 py-6">© {{ new Date().getFullYear() }} Claims System</footer>
    </div>
  </div>
</template>

<style>
</style>
