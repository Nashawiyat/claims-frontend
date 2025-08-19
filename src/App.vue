<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import UserProfileMenu from './components/profile/UserProfileMenu.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const role = computed(() => auth.role)
const isAuthed = computed(() => auth.isAuthenticated)
const isLoginRoute = computed(() => route.path === '/login' || route.path === '/register')

function go(path) {
  router.push(path)
}
function logout() {
  auth.logout()
  router.push('/login')
}

function navClasses(active) {
  return [
    'px-3','py-2','rounded-md','text-sm','font-medium','transition-colors','select-none',
    active
      ? 'bg-slate-300 text-slate-1000 shadow-sm'
      : 'text-slate-700 hover:bg-slate-200 hover:text-slate-900'
  ].join(' ')
}
</script>

<template>
  <div>
    <RouterView v-if="isLoginRoute" />
    <div v-else class="min-h-screen flex flex-col bg-slate-100 text-gray-800">
      <header class="bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm">
        <div class="max-w-8xl mx-auto pl-10 pr-10 py-4 flex items-center gap-20">
          <h1 @click="go('/claims')" class="text-2xl font-bold cursor-pointer select-none tracking-tight flex items-center gap-1" title="Go to claims">
            <span class="text-blue-600">Claims</span><span class="text-slate-800">GT</span>
          </h1>
          <nav class="flex-1 flex items-center gap-3">
            <RouterLink v-if="isAuthed" to="/claims" v-slot="{ isActive }">
              <span :class="navClasses(isActive)">Claims</span>
            </RouterLink>
            <RouterLink v-if="isAuthed && (role==='manager' || role==='admin')" to="/manager" v-slot="{ isActive }">
              <span :class="navClasses(isActive)">Manager</span>
            </RouterLink>
            <RouterLink v-if="isAuthed && (role==='finance' || role==='admin')" to="/finance" v-slot="{ isActive }">
              <span :class="navClasses(isActive)">Finance</span>
            </RouterLink>
            <RouterLink v-if="isAuthed && role==='admin'" to="/admin" v-slot="{ isActive }">
              <span :class="navClasses(isActive)">Admin</span>
            </RouterLink>
          </nav>
          <div class="flex items-center gap-4">
            <RouterLink v-if="!isAuthed" to="/login" class="text-sm bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow text-white px-4 py-2 rounded-md font-medium transition-colors">Login</RouterLink>
            <UserProfileMenu v-else :user="auth.user" @logout="logout" />
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
