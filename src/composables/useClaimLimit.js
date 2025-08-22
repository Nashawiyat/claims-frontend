// Backwards compatibility wrapper – delegate to new unified composable
import { useClaimLimits } from './useClaimLimits'
export function useClaimLimit(){
  const { summary, refreshDual: refresh, refreshSingle: hardRefreshSingle, refreshListOnly } = useClaimLimits()
  return { summary, refresh, hardRefreshSingle, refreshListOnly }
}
export default useClaimLimit
