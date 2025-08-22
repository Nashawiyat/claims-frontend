<template>
  <div class="relative inline-block" ref="root">
    <button
      type="button"
      class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium border bg-white hover:bg-slate-50 shadow-sm"
      @click="toggle"
      :aria-expanded="open ? 'true':'false'"
    >
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 7h18M3 12h12M3 17h18"/></svg>
      <span>Bulk Actions</span>
      <svg class="w-3 h-3 text-slate-500" :class="open ? 'rotate-180':''" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z" clip-rule="evenodd"/></svg>
    </button>
    <transition name="fade-scale">
      <div
        v-if="open"
        class="absolute z-20 mt-2 w-80 p-4 rounded-lg border border-slate-200 bg-white shadow-lg origin-top-right right-0 space-y-3 text-xs"
      >
        <div class="flex flex-col gap-2">
          <label class="font-medium text-slate-600">Target Role</label>
          <select
            v-model="roleLocal"
            class="border rounded px-2 py-1.5 text-xs bg-slate-50"
          >
            <option value="" disabled>Select role…</option>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option v-if="isAdmin" value="admin">Admin</option>
          </select>
        </div>
        <div class="flex gap-2">
          <button
            class="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            :disabled="!roleLocal || actioning"
            @click="apply"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            <span>Apply Defaults</span>
          </button>
          <button
            class="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
            :disabled="actioning"
            @click="resetAll"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4h16v4H4zm0 6h10v10H4z"/></svg>
            <span>Reset Used</span>
          </button>
        </div>
        <p class="text-[11px] leading-snug text-slate-500">
          Apply Defaults overwrites Total for all accounts in the selected role (existing overrides lost). Reset Used sets Used to 0 for all visible accounts (restricted to the selected role if chosen). Actions are permanent.
        </p>
        <button @click="open=false" class="absolute top-1.5 right-1.5 text-slate-400 hover:text-slate-600" aria-label="Close">✕</button>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
const props = defineProps({
  modelValue: { type: String, default: '' },
  isAdmin: { type: Boolean, default: false },
  actioning: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue','apply-defaults','reset-all'])
const open = ref(false)
const roleLocal = ref(props.modelValue)
watch(()=>props.modelValue, v=>{ if(v!==roleLocal.value) roleLocal.value=v })
watch(roleLocal, v=> emit('update:modelValue', v))
function toggle(){ open.value = !open.value }
function apply(){ emit('apply-defaults') }
function resetAll(){ emit('reset-all') }
// close on outside click
const root = ref(null)
function onDoc(e){ if(!root.value) return; if(!root.value.contains(e.target)) open.value=false }
onMounted(()=> document.addEventListener('mousedown', onDoc))
onBeforeUnmount(()=> document.removeEventListener('mousedown', onDoc))
</script>

<style scoped>
.fade-scale-enter-active,.fade-scale-leave-active{ transition: all .12s ease; }
.fade-scale-enter-from,.fade-scale-leave-to{ opacity:0; transform:translateY(-4px) scale(.98); }
</style>
