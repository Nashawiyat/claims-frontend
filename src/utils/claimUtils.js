// Shared claim normalization utility used by stores and services
// Ensures heterogeneous backend shapes become a consistent object.

export function normalizeClaim(raw) {
  if (!raw || typeof raw !== 'object') return raw

  const id = raw._id || raw.id
  const amount = raw.amount != null ? Number(raw.amount) : 0

  function normUser(u){
    if(!u) return null
    if(typeof u === 'string') return { _id: u, name: 'Unknown', email: undefined }
    return {
      _id: u._id || u.id,
      name: u.name || u.fullName || u.email || 'Unknown',
      email: u.email
    }
  }

  // Some backend list endpoints may supply denormalized name fields or only ids.
  const createdBy = (() => {
    let base = raw.createdBy || raw.user || raw.owner
    // Fallback to separate id/name fields from aggregated list responses
    if (!base && (raw.createdById || raw.userId)) {
      base = { _id: raw.createdById || raw.userId, name: raw.createdByName }
    } else if (base && typeof base === 'object') {
      if (!base.name && raw.createdByName) base.name = raw.createdByName
      if (!base._id && raw.createdById) base._id = raw.createdById
    }
    return normUser(base)
  })()

  const manager = (() => {
    let base = raw.manager || raw.data?.manager
    if (!base && (raw.managerId)) {
      base = { _id: raw.managerId, name: raw.managerName }
    } else if (base && typeof base === 'object') {
      if (!base.name && raw.managerName) base.name = raw.managerName
      if (!base._id && raw.managerId) base._id = raw.managerId
    }
    const resolved = normUser(base)
    if (import.meta?.env?.DEV && base && resolved && resolved.name === 'Unknown' && (base.name || base.fullName || base.email)) {
      console.debug('[normalizeClaim] manager name lost during normalization', { rawManager: base })
    }
    return resolved
  })()

  const submittedAt = raw.submittedAt || raw.submissionDate || null
  const approvedAt = raw.approvedAt || raw.approvalDate || raw.approvedDate || null
  const reimbursedAt = raw.reimbursedAt || raw.paidAt || null

  const obj = {
    _id: id,
    id, // alias for convenience
    title: raw.title || '',
    description: raw.description || '',
    amount,
    displayAmount: isFinite(amount) ? amount.toLocaleString(undefined,{ style:'currency', currency:'USD'}) : '$0.00',
    status: (raw.status || 'draft').toLowerCase(),
    receiptUrl: raw.receiptUrl || raw.receipt || (raw.attachments?.[0]?.url) || null,
    createdBy,
    manager,
    rejectionReason: raw.rejectionReason || raw.reason || '',
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
    submittedAt,
    approvedAt,
    reimbursedAt,
    isDraft: (raw.status || 'draft').toLowerCase() === 'draft'
  }
  return obj
}

export default normalizeClaim
