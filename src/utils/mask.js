// Utility functions for masking / formatting user data

/**
 * Mask an email address for display (e.g., john.doe@example.com -> jo***@example.com)
 * Keeps first 2 characters before @, masks rest of local part with * (minimum 3 stars when masked).
 */
export function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return email || ''
  const [local, domain] = email.split('@')
  if (local.length <= 2) return local[0] + '***@' + domain
  const visible = local.slice(0, 2)
  const stars = '*'.repeat(Math.max(local.length - 2, 3))
  return `${visible}${stars}@${domain}`
}
