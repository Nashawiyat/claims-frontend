import { defineStore } from 'pinia'
import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'
import { fetchUser, fetchUserManager, fetchManagers } from '@/services/userService'
import { normalizeClaim } from '@/utils/claimUtils'

export const useClaimsStore = defineStore('claims', {
	state: () => ({
		items: [],        // all my claims
		loading: false,
		error: null,
		summary: { limit: 0, used: 0, remaining: 0 },
		_userCache: {}, // id -> user object
		_forbiddenUserIds: {} // id -> true (403 seen)
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
			this.summary = {
				limit: typeof limit === 'number' ? limit : (this.summary.limit || 0),
				used: typeof used === 'number' ? used : (this.summary.used || 0),
				remaining: typeof remaining === 'number' ? remaining : (typeof limit === 'number' && typeof used === 'number' ? limit - used : this.summary.remaining || 0)
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
			const auth = useAuthStore()
			const role = auth?.role
			const selfId = auth?.user?._id || auth?.user?.id
			const toFetchUserIds = new Set() // user ids safe to fetch directly
			const employeeIdsNeedingManager = new Set() // employees whose manager we derive
			const approverManagerIdsNeedingName = new Set() // manager approver ids (claim.manager) with unknown names
			const createdByPotentialManagerIds = new Set() // createdBy ids that might be managers (avoid direct fetch to prevent 403)
			const claimDetailCreatorIds = new Set() // creators we will resolve via claim detail endpoint instead of fetchUser
			for (const c of this.items) {
				// createdBy enrichment
				if (c.createdBy) {
					const createdById = typeof c.createdBy === 'string' ? c.createdBy : c.createdBy._id
					const hasName = typeof c.createdBy !== 'string' && c.createdBy.name && c.createdBy.name !== 'Unknown'
					if (createdById && !hasName) {
						// If current user is assigned manager on this claim, prefer claim detail endpoint (authorized) over direct user fetch
						if (role === 'manager' && c.manager && c.manager._id === selfId && createdById !== selfId) {
							claimDetailCreatorIds.add(createdById)
						} else if (role === 'manager' && createdById !== selfId) {
							createdByPotentialManagerIds.add(createdById)
						} else {
							toFetchUserIds.add(createdById)
						}
					}
				}
				// manager enrichment (approver manager on claim)
				if (c.manager && c.manager._id && (!c.manager.name || c.manager.name === 'Unknown')) {
					if (role === 'manager') approverManagerIdsNeedingName.add(c.manager._id)
					else toFetchUserIds.add(c.manager._id)
				} else if ((!c.manager || !c.manager._id) && c.createdBy && typeof c.createdBy !== 'string') {
					if (c.createdBy._id) employeeIdsNeedingManager.add(c.createdBy._id)
				}
			}
			// For manager role, batch fetch managers first (covers both createdBy + claim.manager cases)
			if (role === 'manager' && (approverManagerIdsNeedingName.size || createdByPotentialManagerIds.size)) {
				try {
					const mgrs = await fetchManagers()
					for (const m of mgrs) {
						const mid = m._id || m.id
						if (!mid) continue
						if (approverManagerIdsNeedingName.has(mid) || createdByPotentialManagerIds.has(mid)) {
							this._userCache[mid] = m
						}
					}
				} catch {/* ignore */}
			}
			// Any createdBy ids still unresolved after manager batch treated as regular users (likely employees)
			// IMPORTANT: Do NOT fall back to direct fetchUser for unresolved potential manager ids when current user is a manager.
			// These are likely managers outside the viewer's authorization scope and will 403.
			if (role !== 'manager') {
				for (const id of createdByPotentialManagerIds) {
					if (!this._userCache[id]) toFetchUserIds.add(id)
				}
			}
			// Fetch remaining user ids directly
			if (toFetchUserIds.size) {
				// Extra defensive filtering: if role=manager, avoid direct fetch for ids that appear as any claim.createdBy or claim.manager with unknown name (likely managers) to prevent 403.
				if (role === 'manager') {
					for (const c of this.items) {
						const createdById = typeof c.createdBy === 'string' ? c.createdBy : c.createdBy?._id
						if (createdById && toFetchUserIds.has(createdById) && createdById !== selfId) {
							toFetchUserIds.delete(createdById)
						}
						if (c.manager && c.manager._id && toFetchUserIds.has(c.manager._id) && c.manager._id !== selfId) {
							toFetchUserIds.delete(c.manager._id)
						}
					}
				}
				await Promise.all(Array.from(toFetchUserIds).map(async id => {
					if (this._userCache[id] || this._forbiddenUserIds[id]) return
					try { this._userCache[id] = await fetchUser(id) } catch (e) { if (e?.response?.status === 403) this._forbiddenUserIds[id] = true }
				}))
			}
			// Apply user details (createdBy & manager)
			for (const c of this.items) {
				if (c.createdBy) {
					const id = typeof c.createdBy === 'string' ? c.createdBy : c.createdBy._id
					const u = id && this._userCache[id]
					if (u) {
						c.createdBy = { _id: u._id || u.id, name: u.name || u.fullName || u.email || 'Unknown' }
					} else if (role === 'manager' && id && id !== selfId) {
						// Provide safe placeholder instead of provoking 403
						c.createdBy = { _id: id, name: c.createdBy.name && c.createdBy.name !== 'Unknown' ? c.createdBy.name : 'Manager' }
					}
				}
				if (c.manager && c.manager._id) {
					const m = this._userCache[c.manager._id]
					if (m && (!c.manager.name || c.manager.name === 'Unknown')) {
						c.manager = { _id: m._id || m.id, name: m.name || m.fullName || m.email || 'Manager' }
					} else if (role === 'manager' && (!c.manager.name || c.manager.name === 'Unknown')) {
						c.manager = { _id: c.manager._id, name: 'Manager' }
					}
				}
			}
			// For employees whose manager id lives on their user record but claim lacks manager assignment
			// fetch their manager via employee->manager endpoint (skip if employee is manager/admin)
			await Promise.all(Array.from(employeeIdsNeedingManager).map(async empId => {
				try {
					let empUser = this._userCache[empId]
					if (!empUser && !this._forbiddenUserIds[empId]) {
						try { empUser = await fetchUser(empId); this._userCache[empId] = empUser } catch(e2){ if (e2?.response?.status === 403) this._forbiddenUserIds[empId] = true }
					}
					if (empUser) this._userCache[empId] = empUser
					if (empUser && (empUser.role === 'manager' || empUser.role === 'admin')) return
					const mgr = await fetchUserManager(empId)
					if (mgr && (mgr._id || mgr.id)) this._userCache[mgr._id || mgr.id] = mgr
					for (const c of this.items) {
						if (c.createdBy && typeof c.createdBy !== 'string' && c.createdBy._id === empId && (!c.manager || !c.manager._id)) {
							if (mgr) c.manager = { _id: mgr._id || mgr.id, name: mgr.name || mgr.fullName || mgr.email || 'Manager' }
						}
					}
				} catch {/* ignore */}
			}))
			// FINAL PASS: Use new backend claim-by-id endpoint to resolve creator names for claims assigned to this manager
			if (role === 'manager' && auth?.user?._id) {
				const selfId = auth.user._id
				await Promise.all(this.items
					.filter(c => c.manager && c.manager._id === selfId && c.createdBy && (!c.createdBy.name || c.createdBy.name === 'Unknown') && claimDetailCreatorIds.has(typeof c.createdBy === 'string' ? c.createdBy : c.createdBy._id))
					.map(async c => {
						try {
							const { data } = await api.get(`/api/claims/${c._id}`)
							const full = normalizeClaim(data?.claim || data)
							// Merge only identity fields to avoid overwriting optimistic UI data unnecessarily
							if (full.createdBy && full.createdBy._id) {
								c.createdBy = { _id: full.createdBy._id, name: full.createdBy.name || full.createdBy.fullName || full.createdBy.email || c.createdBy.name || 'Unknown' }
							}
							if (full.manager && full.manager._id && c.manager && c.manager._id === full.manager._id) {
								c.manager = { _id: full.manager._id, name: full.manager.name || full.manager.fullName || full.manager.email || c.manager.name || 'Manager' }
							}
						} catch {/* ignore per-claim errors */}
					}))
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
		async createDraft({ title, description, amount, file, managerId, managerName }) {
			this.error = null
			try {
				let res
				if (file) {
					const fd = new FormData()
						;['title','description','amount'].forEach(k => fd.append(k, { title, description, amount }[k]))
					fd.append('status', 'draft')
					if (managerId) fd.append('manager', managerId)
						;(file) && fd.append('receipt', file)
					res = await api.post('/api/claims', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
				} else {
					const body = { title, description, amount, status: 'draft' }
					if (managerId) body.manager = managerId
					res = await api.post('/api/claims', body)
				}
				const claimRaw = res.data?.claim || res.data
				const claim = normalizeClaim(claimRaw)
				// If backend only returned manager id (or nothing) but we know selection, inject immediately for UI responsiveness
				if (managerId && (!claim.manager || !claim.manager.name || claim.manager.name === 'Unknown')) {
					claim.manager = { _id: managerId, name: managerName || 'Unknown' }
				}
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
		async updateDraft(id, { title, description, amount, file, managerId, managerName }) {
			this.error = null
			try {
				let res
				if (file) {
					const fd = new FormData()
					if (title != null) fd.append('title', title)
					if (description != null) fd.append('description', description)
					if (amount != null) fd.append('amount', amount)
					fd.append('status', 'draft')
					if (managerId) fd.append('manager', managerId)
					fd.append('receipt', file)
					res = await api.patch(`/api/claims/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
				} else {
					const body = { status: 'draft' }
					if (title != null) body.title = title
					if (description != null) body.description = description
					if (amount != null) body.amount = amount
					if (managerId) body.manager = managerId
					res = await api.patch(`/api/claims/${id}`, body)
				}
				const claimRaw = res.data?.claim || res.data
				const updated = normalizeClaim(claimRaw)
				if (managerId && (!updated.manager || !updated.manager.name || updated.manager.name === 'Unknown')) {
					updated.manager = { _id: managerId, name: managerName || 'Unknown' }
				}
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
