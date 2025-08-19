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
