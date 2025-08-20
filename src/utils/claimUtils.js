// Shared claim normalization utility used by stores and services
// Ensures heterogeneous backend shapes become a consistent object.

export function normalizeClaim(raw) {
  if (!raw || typeof raw !== 'object') return raw

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
  rejectionReason: raw.rejectionReason || raw.reason || '',
    createdAt: raw.createdAt || null,
  updatedAt: raw.updatedAt || null,
  // Approval timestamp (various possible backend keys)
  approvedAt: raw.approvedAt || raw.approvalDate || raw.approvedDate || null
  }
}

export default normalizeClaim
