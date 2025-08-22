<template>
	<transition name="fade" appear>
		<div
			v-if="modelValue"
			class="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
			@click.self="handleBackdrop"
		>
			<!-- Backdrop -->
			<div class="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"></div>

			<!-- Dialog -->
			<div class="relative w-full max-w-lg bg-white rounded-xl shadow-xl ring-1 ring-black/10 flex flex-col overflow-hidden animate-scale-in">
				<div class="px-6 pt-6 pb-4 border-b border-slate-200 flex items-start justify-between">
					<div>
						<h2 class="text-lg font-semibold tracking-tight text-slate-800">{{ heading }}</h2>
						<p class="text-xs text-slate-500 mt-0.5" v-if="mode==='create'">Fill details to create a draft claim.</p>
						<p class="text-xs text-slate-500 mt-0.5" v-else>Edit your draft claim.</p>
					</div>
					<button @click="close" class="p-1 rounded-md text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer" aria-label="Close dialog">
						<svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
					</button>
				</div>
				<form @submit.prevent="openConfirmSaveDraft" class="px-6 pt-4 pb-6 space-y-5 overflow-y-auto max-h-[70vh]">
					<div class="space-y-1.5">
						<label class="block text-sm font-medium text-slate-700" for="claim-title">Title<span class="text-red-500">*</span></label>
						<input id="claim-title" v-model.trim="title" type="text" required class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. Team offsite lunch" />
					</div>
					<div class="space-y-1.5">
						<label class="block text-sm font-medium text-slate-700" for="claim-amount">Amount<span class="text-red-500">*</span></label>
						<input id="claim-amount" v-model.number="amount" type="number" min="0.01" step="0.01" required class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="0.00" />
					</div>
						<div class="space-y-1.5">
							<label class="block text-sm font-medium text-slate-700" for="claim-description">Description</label>
							<textarea id="claim-description" v-model.trim="description" rows="4" class="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y" placeholder="Add context or breakdown..."></textarea>
						</div>
					<div class="space-y-1.5">
						<label class="block text-sm font-medium text-slate-700" for="claim-receipt">Receipt<span class="text-red-500">*</span></label>
						<input id="claim-receipt" ref="fileInput" type="file" accept="image/*,.pdf" @change="onFileChange" class="inline-block text-xs text-slate-500 file:cursor-pointer file:mr-4 file:py-2 file:px-3 file:rounded-md file:border file:border-slate-300 file:text-xs file:font-medium file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100" />
						<div v-if="initial?.receiptUrl && !file" class="text-xs flex items-center gap-2">
							<button type="button" @click="viewExistingReceipt" class="text-blue-600 hover:underline cursor-pointer">Current Receipt</button>
						</div>
						<p v-if="file" class="text-xs text-slate-500">Selected: {{ file.name }}</p>
					</div>
					<!-- Manager reviewer selection removed per updated workflow requirements -->
					<!-- Inline error removed; errors surface via global AlertsHost -->
				</form>
				<div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3">
					<button @click="close" type="button" class="text-sm px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-100 font-medium text-slate-700 cursor-pointer">Cancel</button>
					<button @click="openConfirmSaveDraft" :disabled="saving" type="button" class="text-sm px-4 py-2 rounded-md font-medium text-white bg-slate-600 hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer">
						<span v-if="!saving || savingType!=='draft'">Save Draft</span>
						<span v-else>Saving...</span>
					</button>
					<button @click="openConfirmSubmit" :disabled="saving" type="button" class="text-sm px-5 py-2 rounded-md font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer">
						<span v-if="!saving || savingType!=='submit'">Submit</span>
						<span v-else>Submitting...</span>
					</button>
				</div>
			</div>
		</div>
	</transition>

	<!-- Confirmation dialogs -->
	<ConfirmDialog
		:model-value="confirmSaveDraft"
		title="Save Draft"
		message="Save changes to this draft claim?"
		confirm-text="Save Draft"
		cancel-text="Cancel"
		:loading="saving && savingType==='draft'"
		@update:modelValue="val => confirmSaveDraft = val"
		@confirm="performSaveDraft"
	/>
	<ConfirmDialog
		:model-value="confirmSubmit"
		title="Submit Claim"
		message="Submit this claim for approval? You won't be able to edit it afterwards."
		confirm-text="Submit Claim"
		cancel-text="Cancel"
		:loading="saving && savingType==='submit'"
		@update:modelValue="val => confirmSubmit = val"
		@confirm="performSubmit"
	/>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import api from '@/api/axios'
import ConfirmDialog from './ConfirmDialog.vue'

// New props allow manager users to pick an approving manager


const props = defineProps({
	modelValue: { type: Boolean, default: false },
	mode: { type: String, default: 'create', validator: v => ['create','edit'].includes(v) },
	initial: { type: Object, default: null },
	// When true, show manager select (current user is a manager creating their own claim)
	isManagerCreator: { type: Boolean, default: false },
	// List of manager users (objects with _id / id & name) to choose from
	managers: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:modelValue','save','close','validation-error'])

const title = ref('')
const description = ref('')
const amount = ref(null)
const file = ref(null)
// Approving manager auto derived (for manager-created claims); backend already has supervising manager link
const selectedManagerId = ref('')
// Local error removed from UI; still used transiently before emitting alert
const error = ref('')
const saving = ref(false)
const savingType = ref('draft')
const fileInput = ref(null)

const heading = computed(() => props.mode === 'edit' ? 'Edit Draft Claim' : 'New Draft Claim')

function initFromInitial() {
	title.value = props.initial?.title || ''
	description.value = props.initial?.description || ''
	amount.value = props.initial?.amount != null ? props.initial.amount : null
	file.value = null
	// Manager-created claims: derive supervising manager if provided; else leave blank (backend will infer existing association)
	if (props.isManagerCreator) {
		const initMgr = props.initial?.managerId || props.initial?.manager?._id || props.initial?.manager || ''
		selectedManagerId.value = initMgr === (props.initial?.selfId) ? '' : initMgr
	} else selectedManagerId.value = ''
	// Keep external error if provided; otherwise clear
	if (!props.externalError) error.value = ''
	// Reset file input if open again
	if (fileInput.value) fileInput.value.value = ''
}

watch(() => props.initial, () => {
	if (props.modelValue) initFromInitial()
})

watch(() => props.modelValue, (open) => {
	if (open) initFromInitial()
	else {
		// clear transient state
		file.value = null
	}
})

// External server validation errors now shown globally; no watcher needed

function close() {
	emit('update:modelValue', false)
	emit('close')
}

function onFileChange(e) {
	const f = e.target.files?.[0]
	file.value = f || null
}

function validate() {
	if (!title.value.trim()) {
		error.value = 'Title is required'
		return false
	}
	if (amount.value == null || isNaN(amount.value) || Number(amount.value) <= 0) {
		error.value = 'Amount must be greater than 0'
		return false
	}
	// Client-side receipt requirement: if no existing receipt and no new file selected
	if (!props.initial?.receiptUrl && !file.value) {
		error.value = 'Receipt file is required'
		return false
	}
	// For manager self-claims we no longer force selecting approving manager here; backend enforces relationship.
	error.value = ''
	return true
}

async function basePayload(){
	return { title: title.value.trim(), description: description.value.trim(), amount: Number(amount.value) }
}

function deriveBackendMessage(respData){
	if(!respData) return ''
	return respData.error || respData.message || respData.msg || ''
}

function mapErrorMessage(e){
	const code = e?.response?.data?.code
	const backendMsg = deriveBackendMessage(e?.response?.data)
	// Treat any explicit code, or message containing limit / exceed variants, as limit exceeded
	if(code === 'LIMIT_EXCEEDED' || /limit/i.test(backendMsg) || /exceed/i.test(backendMsg) || /exceeds allowed remaining/i.test(backendMsg)) {
		return 'Submitting this claim would exceed your remaining limit'
	}
	return backendMsg || e.message || 'Request failed'
}

async function doPersist(submit){
	const base = await basePayload()
	// Build FormData only if file present (otherwise send JSON)
	const usingFormData = !!file.value
	const fd = usingFormData ? new FormData() : null
	const appendField = (k,v)=> { if(usingFormData) fd.append(k,v); else base[k]=v }
	Object.entries(base).forEach(([k,v])=> appendField(k,v))
	// Only append manager override if explicitly chosen (e.g., admin creating for employee); managers creating their own claim rely on backend stored supervising manager
	if(props.isManagerCreator && selectedManagerId.value){
		appendField('manager', selectedManagerId.value)
	}
	if(file.value) fd.append('receipt', file.value)

	// DEV logging helper
	try {
		if(props.mode==='create') {
			// New claim: single POST; backend enforces limit if submit flag present
			const config = submit ? { params: { submit:true } } : {}
			const endpoint = '/api/claims'
				if(submit){
					// ensure backend sees submit flag in body/form as well as query for maximum compatibility
					if(usingFormData) fd.append('submit','true')
					else base.submit = true
				}
			const res = usingFormData ? await api.post(endpoint, fd, config) : await api.post(endpoint, base, config)
			return res.data
		} else if (props.mode==='edit' && props.initial?._id) {
			const id = props.initial._id
			// 1. Always persist latest draft changes via PATCH (no optimistic status change)
			const patchEndpoint = `/api/claims/${id}`
			const patchRes = usingFormData ? await api.patch(patchEndpoint, fd) : await api.patch(patchEndpoint, base)
			if(!submit) return patchRes.data
			// 2. Submit via dedicated submit endpoint to ensure server validation
			const submitEndpoint = `/api/claims/${id}/submit`
			const submitRes = await api.put(submitEndpoint)
			return submitRes.data
		}
	} catch(e){
		const mapped = mapErrorMessage(e)
		// Re-throw with mapped message for outer handler
		const err = new Error(mapped)
		err.original = e
		throw err
	}
}

// Confirmation dialog state
const confirmSaveDraft = ref(false)
const confirmSubmit = ref(false)

function openConfirmSaveDraft(){
	if(saving.value) return
	if(!validate()){ emit('validation-error', error.value); return }
	confirmSaveDraft.value = true
}
function openConfirmSubmit(){
	if(saving.value) return
	if(!validate()){ emit('validation-error', error.value); return }
	confirmSubmit.value = true
}

async function performSaveDraft(){
	if(saving.value) return
	savingType.value='draft'
	saving.value = true
	try {
		await doPersist(false)
		confirmSaveDraft.value = false
		emit('save', { submitted:false })
	} catch(e){
		emit('validation-error', e.message || 'Failed saving draft')
	} finally { saving.value=false }
}
async function performSubmit(){
	if(saving.value) return
	savingType.value='submit'
	saving.value = true
	try {
		await doPersist(true)
		confirmSubmit.value = false
		emit('save', { submitted:true })
	} catch(e){
		emit('validation-error', e.message || 'Failed submitting claim')
	} finally { saving.value=false }
}

function handleBackdrop() {
	close()
}

async function viewExistingReceipt() {
	try {
		const url = props.initial?.receiptUrl
		if (!url) return
		const absolute = url.startsWith('http') ? url : api.defaults.baseURL.replace(/\/$/, '') + (url.startsWith('/') ? url : '/' + url)
		const res = await api.get(absolute, { responseType: 'blob' })
		let blob = res.data
		let type = res.headers?.['content-type'] || blob.type
		if (!type || type === 'application/octet-stream') {
			if (/\.png($|\?)/i.test(url)) type = 'image/png'
			else if (/\.jpe?g($|\?)/i.test(url)) type = 'image/jpeg'
			else if (/\.gif($|\?)/i.test(url)) type = 'image/gif'
			else if (/\.pdf($|\?)/i.test(url)) type = 'application/pdf'
			if (type && type !== blob.type) blob = new Blob([blob], { type })
		}
		const objectUrl = URL.createObjectURL(blob)
		window.open(objectUrl, '_blank', 'noopener')
		setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
	} catch (e) {
		// Silent fail; could integrate alerts store if desired
		console.warn('Failed to open existing receipt', e)
	}
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@keyframes scale-in { from { transform: scale(.97); opacity: 0;} to { transform: scale(1); opacity:1;} }
.animate-scale-in { animation: scale-in .16s ease; }
</style>
