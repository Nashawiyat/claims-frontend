// Authentication related API calls.
// Keeps endpoint paths centralized and separate from stores/views.
import api from '../api/axios'

/**
 * Login user with credentials.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{token: string, user: object}>}
 */
export async function loginUser(email, password) {
  const { data } = await api.post('/api/auth/login', { email, password })
  return data
}

/**
 * Register new user (delegated to userService.registerUser for clarity in that domain)
 * This file keeps only auth-centric calls; registration logic lives in userService.
 */
/**
 * Register a new user account.
 * For employees include { manager: <managerId> } in payload.
 * Mirrors backend response: { token, user }
 */
export async function registerUser(payload) {
  const { data } = await api.post('/api/auth/register', payload)
  return data
}
