import { defineStore } from 'pinia'
import api from '../api/axios'
import { loginUser } from '../services/authService'
import { registerUser } from '../services/authService'

// LocalStorage keys (token key aligns with axios interceptor expectation)
const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'
const ROLE_KEY = 'auth_role'

export const useAuthStore = defineStore('auth', {
	state: () => ({
		user: null,      // full user object returned by backend
		token: null,     // JWT token string
		role: null       // convenience role string (e.g., 'admin','manager','finance','employee')
	}),
	getters: {
		isAuthenticated: (state) => !!state.token,
		isAdmin: (state) => state.role === 'admin',
		isManager: (state) => state.role === 'manager',
		isFinance: (state) => state.role === 'finance',
		isEmployee: (state) => state.role === 'employee'
	},
	actions: {
		async login(email, password) {
			const raw = await loginUser(email, password)
			// Support multiple backend response shapes:
			// 1) { token, user }
			// 2) { success:true, data:{ token, user } }
			// 3) { data:{ token, user } }
			const container = raw?.data && (raw.token == null && raw.user == null) ? raw.data : raw
			const token = container?.token || raw?.token
			const user = container?.user || raw?.user || null
			if (!token) {
				throw new Error('Login response missing token')
			}
			const role = user?.role || null
			this.token = token
			this.user = user
			this.role = role
			try {
				localStorage.setItem(TOKEN_KEY, token)
				if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
				if (role) localStorage.setItem(ROLE_KEY, role)
			} catch (e) {
				console.warn('Failed to persist auth data', e)
			}
			return user
		},
		// async register({ name, email, password, role, managerId, manager }) {
		// 	const selectedManager = manager || managerId
		// 	const payload = { name, email, password, role }
		// 	if (role === 'employee') {
		// 		if (!selectedManager) throw new Error('Manager is required for employee accounts')
		// 		payload.manager = selectedManager
		// 	}
		// 	try {
		// 		const data = await registerUser(payload)
		// 		const token = data?.token
		// 		const user = data?.user || null
		// 		if (!token) throw new Error('Registration response missing token')
		// 		const resolvedRole = user?.role || role || null
		// 		this.token = token
		// 		this.user = user
		// 		this.role = resolvedRole
		// 		try {
		// 			localStorage.setItem(TOKEN_KEY, token)
		// 			if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
		// 			if (resolvedRole) localStorage.setItem(ROLE_KEY, resolvedRole)
		// 		} catch (e) {
		// 			console.warn('Failed to persist auth data after register', e)
		// 		}
		// 		return user
		// 	} catch (e) {
		// 		const message = e?.response?.data?.message || e?.response?.data?.error || e.message || 'Registration failed'
		// 		throw new Error(message)
		// 	}
		// },
		// Admin-side creation that does NOT log into the new account
		async createUserNoLogin({ name, email, password, role, managerId, manager }) {
			const selectedManager = manager || managerId
			const payload = { name, email, password, role }
			if (role === 'employee') {
				if (!selectedManager) throw new Error('Manager is required for employee accounts')
				payload.manager = selectedManager
			}
			try {
				const data = await registerUser(payload)
				// Intentionally ignore returned token/user to preserve current session
				return data?.user || null
			} catch (e) {
				const message = e?.response?.data?.message || e?.response?.data?.error || e.message || 'User creation failed'
				throw new Error(message)
			}
		},
		logout() {
			this.token = null
			this.user = null
			this.role = null
			try {
				localStorage.removeItem(TOKEN_KEY)
				localStorage.removeItem(USER_KEY)
				localStorage.removeItem(ROLE_KEY)
			} catch (e) {
				console.warn('Failed clearing auth storage', e)
			}
		},
		loadFromStorage() {
			try {
				const token = localStorage.getItem(TOKEN_KEY)
				const role = localStorage.getItem(ROLE_KEY)
				const userRaw = localStorage.getItem(USER_KEY)
				let user = null
				if (userRaw) {
					try { user = JSON.parse(userRaw) } catch { user = null }
				}
				if (token) this.token = token
				if (user) this.user = user
				if (role) this.role = role
			} catch (e) {
				console.warn('Failed loading auth from storage', e)
			}
		}
	}
})

export default useAuthStore
