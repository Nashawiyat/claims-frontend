// Centralized user-related API calls.
// Keeps raw endpoint strings out of view components.
import api from '../api/axios'

/**
 * Fetch list of manager users.
 * Returns array of manager objects.
 */
export async function fetchManagers() {
  const { data } = await api.get('/api/users/managers')
  // Support multiple possible backend shapes
  return Array.isArray(data) ? data : (data.managers || data.users || [])
}

// Registration moved to authService to keep auth flows together.

/**
 * Fetch a single user by id.
 * Permissions handled server-side (self, admin, finance, direct manager).
 */
export async function fetchUser(id) {
  if (!id) throw new Error('fetchUser: id required')
  const { data } = await api.get(`/api/users/${id}`)
  return data?.user || data
}

/**
 * Fetch a user's manager by employee id.
 * Returns manager object or null.
 */
export async function fetchUserManager(id) {
  if (!id) throw new Error('fetchUserManager: id required')
  const { data } = await api.get(`/api/users/${id}/manager`)
  return data?.manager || data?.user || data || null
}
