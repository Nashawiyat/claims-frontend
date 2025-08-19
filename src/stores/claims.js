import { defineStore } from 'pinia'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'
import { fetchUser, fetchUserManager } from '@/services/userService'

function normalizeClaim(raw) {
	if (!raw || typeof raw !== 'object') return raw
	// Backend currently returns creator id under "user" (not createdBy). Support both.
	const creatorSource = raw.createdBy || raw.user || raw.owner
	let createdBy = null
	if (creatorSource) {
		if (typeof creatorSource === 'string') {
			createdBy = { _id: creatorSource, name: 'Unknown' }
		} else {
			createdBy = {
				_id: creatorSource._id || creatorSource.id,
				name: creatorSource.name || creatorSource.fullName || creatorSource.email || 'Unknown'
			}
		}
	}
	let manager = null
	if (raw.manager) {
		if (typeof raw.manager === 'string') {
			manager = { _id: raw.manager, name: 'Unknown' }
		} else {
			manager = {
				_id: raw.manager._id || raw.manager.id,
				name: raw.manager.name || raw.manager.fullName || 'Unknown'
			}
		}
	}
	return {
		_id: raw._id || raw.id,
		title: raw.title || '',
		description: raw.description || '',
		amount: raw.amount != null ? raw.amount : 0,
		status: raw.status || 'draft',
		receiptUrl: raw.receiptUrl || raw.receipt || null,
		createdBy,
		manager,
		createdAt: raw.createdAt || null,
		updatedAt: raw.updatedAt || null
	}
}

export const useClaimsStore = defineStore('claims', {
	state: () => ({
		items: [],        // all my claims
		loading: false,
		error: null,
		summary: { limit: 0, used: 0, remaining: 0 },
		_userCache: {} // id -> user object
	}),
	getters: {
		drafts: (state) => state.items.filter(c => c.status === 'draft'),
		nonDrafts: (state) => state.items.filter(c => c.status !== 'draft'),
		byId: (state) => (id) => state.items.find(c => c._id === id)
	},
	actions: {
		async fetchMine() {
			this.loading = true; this.error = null
			try {
				const { data } = await api.get('/api/claims/mine')
				const list = Array.isArray(data) ? data : (data?.claims || [])
				this.items = list.map(normalizeClaim)
				// New extended limit info can arrive with list response
				this._maybeUpdateSummary(data)
				// Immediate fallback enrichment using auth user (self + manager id)
				await this.ensureSelfAndManagerNames()
				// Attempt to enrich user + manager names without blocking initial paint
				this.enrichUsers().catch(e => console.warn('enrichUsers failed', e))
			} catch (e) {
				this.error = e?.response?.data?.message || e.message || 'Failed loading claims'
			} finally {
				this.loading = false
			}
		},
		_maybeUpdateSummary(payload) {
			if (!payload) return
			// Accept various shapes: direct fields, nested limit object, or legacy fields
			const obj = payload.limit || payload.claimLimit || payload
			// New field names from backend
			const limit = obj.effectiveClaimLimit ?? obj.limit ?? obj.amount ?? obj.max
			const used = obj.usedClaimAmount ?? obj.used ?? obj.consumed
			const remaining = obj.remainingClaimLimit ?? obj.remaining ?? (typeof limit === 'number' && typeof used === 'number' ? (limit - used) : undefined)
			if ([limit, used, remaining].some(v => typeof v === 'number')) {
				this.summary = {
					limit: typeof limit === 'number' ? limit : (this.summary.limit || 0),
					used: typeof used === 'number' ? used : (this.summary.used || 0),
					remaining: typeof remaining === 'number' ? remaining : (typeof limit === 'number' && typeof used === 'number' ? limit - used : this.summary.remaining || 0)
				}
			}
		},
		async ensureSelfAndManagerNames() {
			const auth = useAuthStore()
			const self = auth?.user
			if (!self) return
			// Cache self
			if (self._id && !this._userCache[self._id]) this._userCache[self._id] = self
			for (const c of this.items) {
				if (!c.createdBy || !c.createdBy._id || c.createdBy._id === self._id) {
					c.createdBy = { _id: self._id, name: self.name || self.fullName || self.email || 'Me' }
				}
			}
			// Manager: if self has manager id and we haven't populated
			if (self.manager && !this._userCache[self.manager]) {
				try {
					// Use fetchUserManager with employee id (self._id) to comply with authorization rules
					const mgr = await fetchUserManager(self._id)
					if (mgr) this._userCache[mgr._id || mgr.id] = mgr
					for (const c of this.items) {
						if (!c.manager || !c.manager._id || c.manager._id === self.manager) {
							c.manager = mgr ? { _id: mgr._id || mgr.id, name: mgr.name || mgr.fullName || mgr.email || 'Manager' } : c.manager
						}
					}
				} catch (e) {
					// ignore (403 etc.)
				}
			}
		},
		async enrichUsers() {
			// Collect missing createdBy users
			const toFetchUserIds = new Set()
			const needManagerForEmployeeIds = new Set()
			for (const c of this.items) {
				// createdBy enrichment
				if (c.createdBy) {
					if (typeof c.createdBy === 'string') {
						toFetchUserIds.add(c.createdBy)
					} else if (!c.createdBy.name || c.createdBy.name === 'Unknown') {
						c.createdBy._id && toFetchUserIds.add(c.createdBy._id)
					}
					// manager enrichment (only if missing / unknown)
					if (!c.manager || !c.manager.name || c.manager.name === 'Unknown') {
						c.createdBy._id && needManagerForEmployeeIds.add(c.createdBy._id)
					}
				}
			}
			if (!toFetchUserIds.size && !needManagerForEmployeeIds.size) return
			// Fetch users
			await Promise.all([
				...Array.from(toFetchUserIds).map(async id => {
					if (this._userCache[id]) return
					try { this._userCache[id] = await fetchUser(id) } catch (e) { /* ignore */ }
				}),
				...Array.from(needManagerForEmployeeIds).map(async empId => {
					try {
						const mgr = await fetchUserManager(empId)
						if (mgr && mgr._id) this._userCache[mgr._id] = mgr
						// Assign back to corresponding claims
						for (const c of this.items) {
							if (c.createdBy && (c.createdBy._id === empId || c.createdBy === empId) && (!c.manager || !c.manager.name || c.manager.name === 'Unknown')) {
								c.manager = mgr ? { _id: mgr._id, name: mgr.name || mgr.fullName || 'Unknown' } : null
							}
						}
					} catch {/* ignore */}
				})
			])
			// Apply user details to claims + derive manager from user.manager id when missing
			for (const c of this.items) {
				if (c.createdBy) {
					const id = typeof c.createdBy === 'string' ? c.createdBy : c.createdBy._id
					const u = id && this._userCache[id]
					if (u) {
						c.createdBy = { _id: u._id || u.id, name: u.name || u.fullName || u.email || 'Unknown' }
						if ((!c.manager || !c.manager._id) && u.manager) {
							// If we already cached the manager, apply immediately; else set placeholder and async fetch
							const cachedMgr = this._userCache[u.manager]
							if (cachedMgr) {
								c.manager = { _id: cachedMgr._id || cachedMgr.id, name: cachedMgr.name || cachedMgr.fullName || cachedMgr.email || 'Manager' }
							} else {
								c.manager = { _id: u.manager, name: 'Unknown' }
								// Fire and forget manager fetch
								fetchUser(u.manager).then(mgr => {
									if (!mgr) return
									this._userCache[mgr._id || mgr.id] = mgr
									for (const c2 of this.items) {
										if (c2.manager && c2.manager._id === (mgr._id || mgr.id)) {
											c2.manager = { _id: mgr._id || mgr.id, name: mgr.name || mgr.fullName || mgr.email || 'Manager' }
										}
									}
								}).catch(()=>{})
							}
						}
					}
				}
			}
		},
		async fetchMyLimit() {
			try {
				const auth = useAuthStore()
				const userId = auth?.user?._id || auth?.user?.id
				if (!userId) {
					console.warn('fetchMyLimit: missing user id, skipping')
					return
				}
				// New API route pattern: /api/users/:id/claim-limit
				const { data } = await api.get(`/api/users/${userId}/claim-limit`)
				this._maybeUpdateSummary(data)
			} catch (e) {
				// Non-fatal; retain previous summary so UI still renders
				console.warn('Failed fetching claim limit', e)
			}
		},
		async createDraft({ title, description, amount, file }) {
			this.error = null
			try {
				let res
				if (file) {
					const fd = new FormData()
						;['title','description','amount'].forEach(k => fd.append(k, { title, description, amount }[k]))
					fd.append('status', 'draft')
						;(file) && fd.append('receipt', file)
					res = await api.post('/api/claims', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
				} else {
					res = await api.post('/api/claims', { title, description, amount, status: 'draft' })
				}
				const claimRaw = res.data?.claim || res.data
				const claim = normalizeClaim(claimRaw)
				this.items.push(claim)
				// Update limit summary if backend returned extended fields
				// Only update summary if server returned new summary fields (AND status success which we already are in)
				this._maybeUpdateSummary(res.data)
				// Enrich asynchronously if needed
				if (claim.createdBy?.name === 'Unknown' || !claim.manager) this.enrichUsers().catch(()=>{})
				return claim
			} catch (e) {
				this.error = e?.response?.data?.message || e.message || 'Failed creating draft'
				throw e
			}
		},
		async updateDraft(id, { title, description, amount, file }) {
			this.error = null
			try {
				let res
				if (file) {
					const fd = new FormData()
					if (title != null) fd.append('title', title)
					if (description != null) fd.append('description', description)
					if (amount != null) fd.append('amount', amount)
					fd.append('status', 'draft')
					fd.append('receipt', file)
					res = await api.patch(`/api/claims/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
				} else {
					const body = { status: 'draft' }
					if (title != null) body.title = title
					if (description != null) body.description = description
					if (amount != null) body.amount = amount
					res = await api.patch(`/api/claims/${id}`, body)
				}
				const claimRaw = res.data?.claim || res.data
				const updated = normalizeClaim(claimRaw)
				const idx = this.items.findIndex(c => c._id === id)
				if (idx !== -1) this.items.splice(idx, 1, updated)
				else this.items.push(updated)
				this._maybeUpdateSummary(res.data)
				if (updated.createdBy?.name === 'Unknown' || !updated.manager) this.enrichUsers().catch(()=>{})
				return updated
			} catch (e) {
				this.error = e?.response?.data?.message || e.message || 'Failed updating draft'
				throw e
			}
		},
		async deleteClaim(id) {
			this.error = null
			try {
				await api.delete(`/api/claims/${id}`)
				this.items = this.items.filter(c => c._id !== id)
			} catch (e) {
				this.error = e?.response?.data?.message || e.message || 'Failed deleting claim'
				throw e
			}
		},
		async submitDraft(id) {
			this.error = null
			try {
				const { data, status } = await api.put(`/api/claims/${id}/submit`)
				const claimRaw = data?.claim || data
				const updated = normalizeClaim(claimRaw)
				const idx = this.items.findIndex(c => c._id === id)
				if (idx !== -1) this.items.splice(idx, 1, updated)
				else this.items.push(updated)
				// Summary update only if a success status and data carries limit info
				if (status >= 200 && status < 300) this._maybeUpdateSummary(data)
				// Always fetch latest limit after submission (submission affects used amount)
				// even if backend didn't embed limit fields in response
				await this.fetchMyLimit()
				if (updated.createdBy?.name === 'Unknown' || !updated.manager) this.enrichUsers().catch(()=>{})
				return updated
			} catch (e) {
				this.error = e?.response?.data?.message || e.message || 'Failed submitting draft'
				throw e
			}
		}
	}
})

export default useClaimsStore
