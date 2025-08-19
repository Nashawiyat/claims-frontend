import axios from 'axios'

// Assumed localStorage key for JWT; adjust if your app uses a different key.
const TOKEN_STORAGE_KEY = 'auth_token'

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
      const token = localStorage.getItem(TOKEN_STORAGE_KEY)
      if (token) {
        config.headers = config.headers || {}
        config.headers['Authorization'] = `Bearer ${token}`
      }
    } catch (e) {
      console.warn('Token retrieval failed:', e)
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
        // Optionally clear token
        localStorage.removeItem(TOKEN_STORAGE_KEY)
      } catch (_) {}
      // Avoid infinite redirect loops
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export { api as axiosInstance }
export default api
