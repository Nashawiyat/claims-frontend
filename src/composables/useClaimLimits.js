import { computed } from 'vue'
import { useClaimsStore } from '@/stores/claims'

// New unified composable (supersedes useClaimLimit) exposing reactive summary + helpers.
// Both ClaimsView & ClaimLimitsView should use this single source of truth.
export function useClaimLimits(){
  const store = useClaimsStore()
  const summary = computed(()=> store.summary)
  async function refreshDual(){
    // Fetch list first (captures used/remaining when nested shape omits them inside limit object)
    await store.fetchMyLimitViaList().catch(()=>{})
    // Then fetch single-user endpoint (authoritative recalculation)
    await store.fetchMyLimit().catch(()=>{})
  }
  // List-only refresh: rely solely on values shown in Claim Limits view (requested authoritative source)
  async function refreshListOnly(){
    await store.fetchMyLimitViaList().catch(()=>{})
  }
  async function refreshSingle(){
    await store.fetchMyLimit().catch(()=>{})
  }
  function updateFrom(payload){ store.updateSummaryFrom(payload) }
  return { summary, refreshDual, refreshListOnly, refreshSingle, updateFrom }
}
export default useClaimLimits
