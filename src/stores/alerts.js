import { defineStore } from 'pinia'

let _id = 0

export const useAlertsStore = defineStore('alerts', {
  state: () => ({
    items: [] // { id, type, message }
  }),
  actions: {
    push(message, { type = 'info', timeout = 4000 } = {}) {
      const id = ++_id
      this.items.push({ id, type, message })
      if (timeout > 0) {
        setTimeout(() => this.remove(id), timeout)
      }
      return id
    },
    success(msg, opts) { return this.push(msg, { type: 'success', ...(opts||{}) }) },
    error(msg, opts) { return this.push(msg, { type: 'error', timeout: 6000, ...(opts||{}) }) },
    remove(id) { this.items = this.items.filter(a => a.id !== id) }
  }
})

export default useAlertsStore
