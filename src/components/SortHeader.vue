<template>
  <th
    :class="['py-2 px-3 font-medium select-none', canSort ? 'cursor-pointer group' : '']"
    scope="col"
  >
    <button
      v-if="canSort"
      type="button"
      @click="$emit('sort', field)"
      class="flex items-center gap-1 text-left focus:outline-none focus:ring-2 focus:ring-blue-500/40 rounded-sm"
      :aria-sort="ariaSort"
    >
      <span>{{ label }}</span>
      <span class="inline-flex flex-col leading-none -space-y-0.5 text-[9px] text-slate-400 group-hover:text-slate-600">
        <span :class="iconClass('asc')">▲</span>
        <span :class="iconClass('desc')">▼</span>
      </span>
    </button>
    <span v-else>{{ label }}</span>
  </th>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  field: { type: String, required: true },
  label: { type: String, required: true },
  sortBy: { type: String, default: '' },
  sortDir: { type: String, default: 'asc' },
  canSort: { type: Boolean, default: true }
})
const ariaSort = computed(()=> props.sortBy === props.field ? (props.sortDir === 'asc' ? 'ascending' : 'descending') : 'none')
function iconClass(dir){
  if(props.sortBy !== props.field) return 'opacity-40'
  return props.sortDir === dir ? 'text-blue-600' : 'opacity-20'
}
</script>

<style scoped>
</style>
