<template>
	<div class="rounded-xl border border-slate-200 bg-white shadow-sm p-5 flex flex-col gap-4 hover:shadow transition-shadow">
		<!-- Header -->
		<div class="flex items-start justify-between gap-4">
			<div class="min-w-0 flex-1">
				<h3 class="text-base font-semibold text-slate-800 truncate" :title="claim.title">{{ claim.title }}</h3>
				<p class="text-xs text-slate-500 mt-0.5">Created {{ createdAtFormatted }}</p>
			</div>
			<div class="flex flex-col items-end gap-2">
				<span class="text-sm font-semibold text-slate-800">{{ currency }}</span>
				<span :class="['px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide', statusClass]">{{ claim.status }}</span>
			</div>
		</div>

		<!-- Description -->
		<div v-if="claim.description" class="text-sm text-slate-700 whitespace-pre-line line-clamp-4">{{ claim.description }}</div>

		<!-- Meta -->
		<div class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
			<div class="flex flex-col">
				<span class="text-slate-500">Employee</span>
				<span class="font-medium text-slate-700 truncate" :title="claim.createdBy?.name">{{ claim.createdBy?.name || '—' }}</span>
			</div>
			<div class="flex flex-col">
				<span class="text-slate-500">Manager</span>
				<span class="font-medium text-slate-700 truncate" :title="claim.manager?.name">{{ claim.manager?.name || '—' }}</span>
			</div>
			<div v-if="claim.receiptUrl" class="col-span-2">
				<button type="button" @click="emit('view-receipt', claim)" class="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer">
					<img src="@/assets/eye.svg" alt="View" class="w-4 h-4" />
					View receipt
				</button>
			</div>
		</div>

		<!-- Actions -->
		<div v-if="showActions" class="pt-2 mt-auto flex flex-wrap gap-2">
			<button
				v-if="canEdit"
				@click="emit('edit', claim)"
				type="button"
				class="px-3 py-1.5 rounded-md text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
			>Edit</button>
			<button
				v-if="canSubmit"
				@click="emit('submit', claim)"
				type="button"
				class="px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer"
			>Submit</button>
			<button
				v-if="canDelete"
				@click="emit('delete', claim)"
				type="button"
				class="px-3 py-1.5 rounded-md text-xs font-medium bg-red-600 hover:bg-red-700 text-white cursor-pointer"
			>Delete</button>
		</div>
	</div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
	claim: { type: Object, required: true },
	canEdit: { type: Boolean, default: false },
	canSubmit: { type: Boolean, default: false },
	canDelete: { type: Boolean, default: false }
})
const emit = defineEmits(['edit','submit','delete','view-receipt'])

const currency = computed(() => {
	const amount = props.claim?.amount ?? 0
	try {
		return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount)
	} catch {
		return amount.toFixed(2)
	}
})

const createdAtFormatted = computed(() => {
	const dt = props.claim?.createdAt
	if (!dt) return '—'
	try {
		return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dt))
	} catch {
		return dt
	}
})

const statusClass = computed(() => {
	const s = (props.claim?.status || '').toLowerCase()
	switch (s) {
		case 'approved': return 'bg-emerald-100 text-emerald-700'
		case 'rejected': return 'bg-red-100 text-red-700'
		case 'submitted': return 'bg-blue-100 text-blue-700'
		case 'draft': return 'bg-slate-200 text-slate-700'
		case 'paid': return 'bg-indigo-100 text-indigo-700'
		default: return 'bg-slate-100 text-slate-600'
	}
})

const showActions = computed(() => props.canEdit || props.canSubmit || props.canDelete)
</script>

<style scoped>
.line-clamp-4 { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; line-clamp: 4; }
</style>
