<template>
  <transition name="fade" appear>
  <div v-if="modelValue" class="fixed inset-0 z-[65] flex items-center justify-center px-4 py-8" @click.self="close">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
      <div class="relative w-full max-w-sm bg-white rounded-xl shadow-xl ring-1 ring-black/10 overflow-hidden animate-scale-in flex flex-col">
        <div class="px-6 pt-6 pb-4 border-b border-slate-200">
          <h2 class="text-base font-semibold text-slate-800">{{ title }}</h2>
          <p v-if="message" class="mt-1 text-sm text-slate-600 whitespace-pre-line">{{ message }}</p>
        </div>
        <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button type="button" class="text-sm px-4 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-100 font-medium text-slate-700 disabled:opacity-60 cursor-pointer" :disabled="loading" @click="cancel">{{ cancelText }}</button>
          <button type="button" :class="[...confirmBtnClass, 'cursor-pointer']" :disabled="loading" @click="confirm">
            <span v-if="!loading">{{ confirmText }}</span>
            <span v-else>Processing...</span>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: 'Confirm' },
  message: { type: String, default: '' },
  confirmText: { type: String, default: 'Confirm' },
  cancelText: { type: String, default: 'Cancel' },
  destructive: { type: Boolean, default: false },
  loading: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue','confirm','cancel'])

const confirmBtnClass = computed(() => [
  'text-sm px-5 py-2 rounded-md font-medium text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed',
  props.destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
])

function close(){ emit('update:modelValue', false) }
function cancel(){ emit('cancel'); close() }
function confirm(){ emit('confirm') }
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@keyframes scale-in { from { transform: scale(.97); opacity: 0;} to { transform: scale(1); opacity:1;} }
.animate-scale-in { animation: scale-in .16s ease; }
</style>
