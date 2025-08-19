<template>
	<div class="space-y-3">
		<div class="flex flex-wrap gap-4 text-xs font-medium text-slate-600">
			<div class="flex items-center gap-1"><span class="text-slate-500">Limit:</span><span class="text-slate-800 font-semibold">{{ format(limit) }}</span></div>
			<div class="flex items-center gap-1"><span class="text-slate-500">Used:</span><span class="text-blue-600 font-semibold">{{ format(used) }}</span></div>
			<div class="flex items-center gap-1"><span class="text-slate-500">Remaining:</span><span class="text-emerald-600 font-semibold">{{ format(remaining) }}</span></div>
		</div>
		<div class="w-full h-4 bg-slate-100 rounded-full shadow-inner relative overflow-hidden">
			<div :key="limit + '-' + used" class="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 transition-[width] duration-150 ease-out" :style="{ width: percent + '%' }"></div>
			<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
				<span class="text-[10px] font-semibold tracking-wide text-white/90 drop-shadow-sm">{{ Math.round(percent) }}%</span>
			</div>
		</div>
	</div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
	limit: { type: Number, required: true },
	used: { type: Number, required: true },
	remaining: { type: Number, required: true }
})

const percent = computed(() => {
	if (!props.limit || props.limit <= 0) return 0
	return Math.min(100, Math.max(0, (props.used / props.limit) * 100))
})

function format(v) {
	if (v == null) return '0'
	// Basic currency-like formatting; could be enhanced or externalized later
	return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)
}
</script>

<style scoped>
.shadow-inner { box-shadow: inset 0 1px 2px rgba(0,0,0,0.08); }
</style>
