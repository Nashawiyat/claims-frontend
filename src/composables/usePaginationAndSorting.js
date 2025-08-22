import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export function usePaginationAndSorting({ defaultLimit=10, defaultSortBy='', defaultSortDir='desc', allowedSort=[] }){
  const route = useRoute()
  const router = useRouter()
  const page = ref( Number(route.query.page) || 1 )
  const limit = ref( Number(route.query.limit) || defaultLimit )
  const sortBy = ref( route.query.sortBy || defaultSortBy )
  const sortDir = ref( route.query.sortDir || defaultSortDir )
  const status = ref( route.query.status || '' )

  function syncRouteQuery(){
    const q = { ...route.query }
    q.page = page.value
    q.limit = limit.value
    if (sortBy.value) q.sortBy = sortBy.value; else delete q.sortBy
    if (sortDir.value) q.sortDir = sortDir.value; else delete q.sortDir
    if (status.value) q.status = status.value; else delete q.status
    router.replace({ query: q })
  }

  function applyQueryFromRoute(){
    page.value = Number(route.query.page) || 1
    limit.value = Number(route.query.limit) || defaultLimit
    sortBy.value = route.query.sortBy || defaultSortBy
    sortDir.value = route.query.sortDir || defaultSortDir
    status.value = route.query.status || ''
  }

  function goToPage(n){
    page.value = Math.max(1, n)
    syncRouteQuery()
  }

  function toggleSort(field){
    if (!allowedSort.includes(field)) return
    if (sortBy.value !== field){
      sortBy.value = field
      sortDir.value = 'asc'
    } else {
      sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
    }
    page.value = 1
    syncRouteQuery()
  }

  watch(route, applyQueryFromRoute)

  return { page, limit, sortBy, sortDir, status, goToPage, toggleSort, syncRouteQuery, applyQueryFromRoute }
}
