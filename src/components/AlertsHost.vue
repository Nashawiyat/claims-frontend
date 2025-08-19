<template>
  <div class="fixed top-4 left-1/2 -translate-x-1/2 z-[70] w-full max-w-xl px-4 space-y-3 pointer-events-none">
    <transition-group name="alert-fade" tag="div">
      <div
        v-for="a in alerts.items"
        :key="a.id"
        :class="[
          'pointer-events-auto rounded-md px-4 py-3 shadow text-sm font-medium flex items-start gap-3 border',
          a.type === 'error' && 'bg-red-600/95 text-white border-red-500',
          a.type === 'success' && 'bg-emerald-600/95 text-white border-emerald-500',
          a.type === 'info' && 'bg-slate-700/95 text-slate-100 border-slate-600'
        ]"
      >
        <div class="flex-1">{{ a.message }}</div>
        <button @click="alerts.remove(a.id)" class="text-white/80 hover:text-white focus:outline-none">✕</button>
      </div>
    </transition-group>
  </div>
</template>
<script setup>
import { useAlertsStore } from '@/stores/alerts'
const alerts = useAlertsStore()
</script>
<style scoped>
.alert-fade-enter-active, .alert-fade-leave-active { transition: all .35s ease; }
.alert-fade-enter-from { opacity:0; transform: translateY(-6px); }
.alert-fade-leave-to { opacity:0; transform: translateY(-6px); }
</style>
