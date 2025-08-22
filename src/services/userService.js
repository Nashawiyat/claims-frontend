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
  // Support unified response shape { success:true, data:{ user:{...} }} or legacy { user:{...} }
  const user = data?.data?.user || data?.user || null
  if (import.meta.env.DEV && !user) console.debug('[userService] fetchUser: no user found in response keys', Object.keys(data||{}))
  return user || data
}

// Fetch a user by email (assumes backend supports this lookup endpoint)
// Falls back returning null on 404
export async function fetchUserByEmail(email) {
  if(!email) throw new Error('fetchUserByEmail: email required')
  try {
    const { data } = await api.get(`/api/users/lookup`, { params: { email } })
    return data?.user || data || null
  } catch(e){
    if(e?.response?.status === 404) return null
    throw e
  }
}

/**
 * Fetch a user's manager by employee id.
 * Returns manager object or null.
 */
export async function fetchUserManager(id) {
  if (!id) throw new Error('fetchUserManager: id required')
    const auth = useAuthStore()
    const role = auth?.role || auth?.user?.role
    // Only attempt if role normally has a supervising manager
    if (!['employee','manager'].includes(role)) return null
    try {
      const { data } = await api.get(`/api/users/${id}/manager`)
      return data?.data?.manager || data?.manager
    } catch (e) {
      const status = e?.response?.status
      if (status === 400 || status === 404) {
        // Role lacks manager or not set; treat as null silently
        return null
      }
      throw e
    }
}
