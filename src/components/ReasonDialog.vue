<template>
  <transition name="fade" appear>
    <div v-if="modelValue" class="fixed inset-0 z-[66] flex items-center justify-center px-4 py-8" @click.self="close">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
      <div class="relative w-full max-w-md bg-white rounded-xl shadow-xl ring-1 ring-black/10 overflow-hidden animate-scale-in flex flex-col">
        <div class="px-6 pt-6 pb-4 border-b border-slate-200">
          <h2 class="text-base font-semibold text-slate-800">{{ title }}</h2>
          <p v-if="message" class="mt-1 text-sm text-slate-600 whitespace-pre-line">{{ message }}</p>
        </div>
        <div class="px-6 pt-4 pb-2 flex-1">
          <label :for="id" class="block text-xs font-medium text-slate-600 uppercase tracking-wide mb-1">{{ label }}</label>
          <textarea :id="id" v-model.trim="localReason" :placeholder="placeholder" rows="4" class="w-full resize-y rounded-md border border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm p-2 outline-none" :disabled="loading"></textarea>
          <p v-if="errorMsg" class="mt-1 text-xs text-red-600">{{ errorMsg }}</p>
        </div>
        <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button type="button" class="text-sm px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-100 font-medium text-slate-700 disabled:opacity-60 cursor-pointer" :disabled="loading" @click="cancel">{{ cancelText }}</button>
          <button type="button" :class="['text-sm px-5 py-2 rounded-md font-medium text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed bg-red-600 hover:bg-red-700','cursor-pointer']" :disabled="loading" @click="confirm">
            <span v-if="!loading">{{ confirmText }}</span>
            <span v-else>Processing...</span>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: 'Provide Reason' },
  message: { type: String, default: '' },
  label: { type: String, default: 'Reason' },
  placeholder: { type: String, default: 'Enter detailed reason for rejection...' },
  confirmText: { type: String, default: 'Submit' },
  cancelText: { type: String, default: 'Cancel' },
  minLength: { type: Number, default: 3 },
  loading: { type: Boolean, default: false },
  value: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue','confirm','cancel'])

const localReason = ref('')
const errorMsg = ref('')
const id = 'reason-' + Math.random().toString(36).slice(2)

watch(() => props.modelValue, (open) => {
  if (open) {
    localReason.value = props.value || ''
    errorMsg.value = ''
    requestAnimationFrame(()=>{
      const el = document.getElementById(id)
      el && el.focus()
    })
  }
})

function close(){ emit('update:modelValue', false) }
function cancel(){ emit('cancel'); close() }
function validate(){
  if (!localReason.value || localReason.value.length < props.minLength) {
    errorMsg.value = `Reason must be at least ${props.minLength} characters.`
    return false
  }
  errorMsg.value = ''
  return true
}
function confirm(){
  if(!validate()) return
  emit('confirm', localReason.value)
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@keyframes scale-in { from { transform: scale(.97); opacity: 0;} to { transform: scale(1); opacity:1;} }
.animate-scale-in { animation: scale-in .16s ease; }
</style>
