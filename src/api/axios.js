import axios from 'axios'
// Pinia store accessor (lazy usage inside interceptor to avoid early instantiation issues)
import { useAuthStore } from '@/stores/auth'

// Primary + legacy localStorage token keys (backward compatibility)
const TOKEN_KEYS = ['auth_token', 'token']

const resolvedBaseURL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:5000'
if (!import.meta.env.VITE_API_URL) {
  console.warn('[api] VITE_API_URL not set in environment; falling back to', resolvedBaseURL)
}

const api = axios.create({
  baseURL: resolvedBaseURL,
  withCredentials: true
})

// Request interceptor: attach Authorization header if token exists
api.interceptors.request.use(
  (config) => {
    try {
      let token = null
      // 1. Attempt Pinia store (if pinia mounted & store populated)
      try {
        const pinia = window.__appPinia
        if (pinia) {
          const authStore = useAuthStore(pinia)
          token = authStore?.token || null
          if (import.meta.env.DEV) console.debug('[api][auth] token from store?', !!token)
        }
      } catch (e) {
        if (import.meta.env.DEV) console.debug('[api][auth] store token access failed', e)
      }
      // 2. Fallback to known localStorage keys if still missing
      if (!token) {
        for (const k of TOKEN_KEYS) {
          const val = localStorage.getItem(k)
            || (sessionStorage ? sessionStorage.getItem(k) : null)
          if (val) { token = val; if (import.meta.env.DEV) console.debug('[api][auth] token from storage key', k); break }
        }
      }
      if (token) {
        config.headers = config.headers || {}
        if (!config.headers['Authorization']) {
          config.headers['Authorization'] = `Bearer ${token}`
          if (import.meta.env.DEV) console.debug('[api][auth] Authorization header attached')
        }
      } else if (import.meta.env.DEV) {
        console.debug('[api][auth] no token available for request', config.url)
      }
      // Only auto-set JSON Content-Type when body is NOT FormData.
      const hasBody = !!config.data
      const isFormData = (typeof FormData !== 'undefined') && config.data instanceof FormData
      if (hasBody && !isFormData) {
        config.headers = config.headers || {}
        const existing = Object.keys(config.headers).find(h => h.toLowerCase() === 'content-type')
        if (!existing) config.headers['Content-Type'] = 'application/json'
      }
    } catch (e) {
      console.warn('[api][auth] token retrieval failed:', e)
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: redirect to /login on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      try {
        // Clear all known token keys to avoid stale loops
        for (const k of TOKEN_KEYS) localStorage.removeItem(k)
      } catch (_) {}
      if (import.meta.env.DEV) console.debug('[api][auth] 401 received; redirecting to /login')
      if (window.location.pathname !== '/login') window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export { api as axiosInstance }
export default api
