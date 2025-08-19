<template>
  <div class="relative" ref="rootEl">
    <button
      @click="toggle"
      class="relative w-10 h-10 rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gradient-to-br from-blue-500 to-blue-700 text-white text-sm font-semibold select-none cursor-pointer"
      :aria-expanded="open ? 'true' : 'false'"
      aria-haspopup="menu"
      :aria-label="(user?.name ? user.name + ' profile menu' : 'Profile menu')"
      type="button"
    >
      <span>{{ initials }}</span>
    </button>

    <transition name="fade-scale">
      <div
        v-if="open"
        class="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-lg ring-1 ring-black/5 p-4 z-50"
        role="menu"
      >
        <div class="flex items-center gap-4 mb-4">
          <div class="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-lg font-semibold">
            {{ initials }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-slate-800 truncate">{{ user?.name || 'Unknown User' }}</p>
            <p class="text-xs text-slate-500 break-all">{{ maskedEmail }}</p>
            <p class="inline-block mt-1 text-[10px] tracking-wide uppercase bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">{{ user?.role || 'N/A' }}</p>
          </div>
        </div>
        <div class="border-t border-slate-200 my-3"></div>
        <button
          @click="emitLogout"
          class="w-full flex items-center justify-center gap-2 text-sm font-medium text-white bg-slate-700 hover:bg-slate-800 active:bg-slate-900 px-4 py-2 rounded-md shadow-sm transition-colors cursor-pointer"
        >
          Logout
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { maskEmail } from '../../utils/mask'

const props = defineProps({
  user: { type: Object, required: false }
})
const emit = defineEmits(['logout'])

const open = ref(false)
const rootEl = ref(null)

const initials = computed(() => {
  const name = props.user?.name || props.user?.fullName || ''
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  return parts.slice(0, 2).map(p => p[0]?.toUpperCase()).join('')
})

const maskedEmail = computed(() => maskEmail(props.user?.email))

function toggle() { open.value = !open.value }
function close() { open.value = false }
function emitLogout() {
  close(); emit('logout')
}

function handleClickOutside(e) {
  if (!rootEl.value) return
  if (!rootEl.value.contains(e.target)) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.fade-scale-enter-active, .fade-scale-leave-active { transition: all .12s ease; transform-origin: top right; }
.fade-scale-enter-from { opacity: 0; transform: scale(.96); }
.fade-scale-enter-to { opacity: 1; transform: scale(1); }
.fade-scale-leave-from { opacity: 1; transform: scale(1); }
.fade-scale-leave-to { opacity: 0; transform: scale(.96); }
</style>
