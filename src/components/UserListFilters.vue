<template>
  <div class="flex flex-wrap items-center gap-3">
    <div class="relative">
      <input
        :placeholder="searchPlaceholder"
        v-model="localSearch"
        @input="emitSearch"
        type="text"
        class="border rounded px-3 py-1.5 text-sm pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
      />
      <button
        v-if="localSearch"
        @click="clearSearch"
        class="absolute right-1 top-1 text-slate-400 hover:text-slate-600 text-xs px-1"
        aria-label="Clear search"
      >✕</button>
    </div>
    <select
      v-if="enableRole"
      v-model="localRole"
      @change="emitRole"
      class="border rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
    >
      <option value="">All Roles</option>
      <option v-for="r in roleOptions" :key="r" :value="r">{{ formatRole(r) }}</option>
    </select>
    <slot />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
const props = defineProps({
  search: { type: String, default: '' },
  role: { type: String, default: '' },
  roles: { type: Array, default: () => ['employee','manager','finance','admin'] },
  enableRole: { type: Boolean, default: true },
  searchPlaceholder: { type: String, default: 'Search users…' }
})
const emit = defineEmits(['update:search','update:role'])
const localSearch = ref(props.search)
const localRole = ref(props.role)
watch(()=>props.search, v=> { if(v!==localSearch.value) localSearch.value = v })
watch(()=>props.role, v=> { if(v!==localRole.value) localRole.value = v })
function emitSearch(){ emit('update:search', localSearch.value) }
function emitRole(){ emit('update:role', localRole.value) }
function clearSearch(){ localSearch.value=''; emitSearch() }
const roleOptions = props.roles
function formatRole(r){ return r.charAt(0).toUpperCase()+r.slice(1) }
</script>

<style scoped>
</style>
