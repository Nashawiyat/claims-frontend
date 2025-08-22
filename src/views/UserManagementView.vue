<template>
  <div class="space-y-8">
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <h1 class="text-xl font-semibold tracking-tight text-slate-800">User Management</h1>
        <button @click="openCreate" class="inline-flex items-center gap-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
          <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
          Create New User
        </button>
      </div>
      <UserListFilters
        v-model:search="search"
        v-model:role="roleFilter"
        :roles="['employee','manager','finance','admin']"
        search-placeholder="Search by name or email…"
      />
    </div>

    <div class="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr class="text-left">
              <th class="py-2 px-3 font-medium">Name</th>
              <th class="py-2 px-3 font-medium">Email</th>
              <th class="py-2 px-3 font-medium">Role</th>
              <th class="py-2 px-3 font-medium">Manager</th>
              <th class="py-2 px-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="py-8 text-center text-slate-500">Loading users...</td>
            </tr>
            <tr v-else-if="!users.length">
              <td colspan="5" class="py-8 text-center text-slate-500">No users found.</td>
            </tr>
            <tr v-for="u in pagedUsers" :key="u._id" class="border-t border-slate-100 hover:bg-slate-50">
              <td class="py-2 px-3 font-medium text-slate-800">{{ u.name || u.fullName || '—' }}</td>
              <td class="py-2 px-3">{{ u.email }}</td>
              <td class="py-2 px-3 capitalize">{{ u.role }}</td>
              <td class="py-2 px-3">{{ managerName(u) }}</td>
              <td class="py-2 px-3 space-x-2 text-xs">
                <button @click="startEdit(u)" class="px-2 py-1 rounded border">Edit</button>
                <button @click="askDelete(u)" :disabled="actioningId===u._id" class="px-2 py-1 rounded bg-red-600 text-white disabled:opacity-50">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex items-center justify-between p-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-600" v-if="totalPages>1 || users.length">
        <div>Total {{ totalItems }} • Page {{ page }} / {{ totalPages }}</div>
        <div class="flex items-center gap-2">
          <button class="px-2 py-1 rounded bg-white border text-xs disabled:opacity-40" :disabled="page===1 || loading" @click="changePage(page-1)">Prev</button>
          <button class="px-2 py-1 rounded bg-white border text-xs disabled:opacity-40" :disabled="page===totalPages || loading" @click="changePage(page+1)">Next</button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="modalOpen" class="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div class="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <button class="absolute top-2 right-2 text-slate-400 hover:text-slate-600" @click="closeModal">✕</button>
        <h2 class="text-lg font-semibold mb-4">{{ editUser ? 'Edit User' : 'Create User' }}</h2>
    <form @submit.prevent="onSubmit" class="space-y-4">
          <div>
      <label class="block text-xs font-medium mb-1">Name<span class="text-red-500">*</span></label>
      <input v-model.trim="form.name" required type="text" class="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium mb-1">Email<span class="text-red-500">*</span></label>
            <input v-model.trim="form.email" :disabled="!!editUser" required type="email" class="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium mb-1">Role<span class="text-red-500">*</span></label>
            <select v-model="form.role" required class="w-full border rounded px-3 py-2 text-sm">
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="finance">Finance</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div v-if="['employee','manager'].includes(form.role)">
            <label class="block text-xs font-medium mb-1">Manager<span class="text-red-500">*</span></label>
            <select v-model="form.manager" required class="w-full border rounded px-3 py-2 text-sm">
              <option value="">— Select Manager —</option>
              <option v-for="m in managers" :key="m._id" :value="m._id">{{ m.name || m.fullName || m.email || 'Manager' }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium mb-1">Password<span class="text-red-500" v-if="!editUser">*</span></label>
            <input :required="!editUser" v-model.trim="form.password" type="password" class="w-full border rounded px-3 py-2 text-sm" />
          </div>
            <div>
            <label class="block text-xs font-medium mb-1">Confirm Password<span class="text-red-500" v-if="!editUser">*</span></label>
            <input :required="!editUser" v-model.trim="form.passwordConfirm" type="password" class="w-full border rounded px-3 py-2 text-sm" />
          </div>
          <div v-if="formError" class="text-sm font-medium text-red-600" role="alert">{{ formError }}</div>
          <div class="flex justify-end gap-3 pt-2">
            <button type="button" @click="closeModal" class="px-4 py-2 text-sm rounded border">Cancel</button>
            <button type="submit" :disabled="saving" class="px-4 py-2 text-sm rounded bg-blue-600 text-white disabled:opacity-50">{{ saving ? 'Saving...' : (editUser ? 'Update' : 'Create') }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirm -->
    <div v-if="deleteOpen" class="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div class="bg-white rounded-lg shadow-lg w-full max-w-sm p-6 relative">
        <button class="absolute top-2 right-2 text-slate-400 hover:text-slate-600" @click="deleteOpen=false">✕</button>
        <h2 class="text-lg font-semibold mb-4">Delete User</h2>
        <p class="text-sm mb-6">Are you sure you want to delete <strong>{{ pendingDelete?.email }}</strong>? This action cannot be undone.</p>
        <div class="flex justify-end gap-3">
          <button @click="deleteOpen=false" class="px-4 py-2 text-sm rounded border">Cancel</button>
          <button @click="performDelete" :disabled="actioningId===pendingDelete?._id" class="px-4 py-2 text-sm rounded bg-red-600 text-white disabled:opacity-50">Delete</button>
        </div>
      </div>
    </div>

    <!-- Creation confirmation dialog (moved inside template) -->
    <ConfirmDialog
      v-if="showCreateConfirm"
      v-model="showCreateConfirm"
      title="Create User"
      :message="`Create new ${form.role} user ${form.email}?`"
      confirm-text="Create"
      :loading="saving"
      @confirm="performSaveUser"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchUsers, createUser, updateUser, deleteUser } from '@/apis/users'
import UserListFilters from '@/components/UserListFilters.vue'
import { fetchManagers } from '@/services/userService'
import { useAlertsStore } from '@/stores/alerts'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
const alerts = useAlertsStore()

const users = ref([])
const managers = ref([])
const loading = ref(false)
const modalOpen = ref(false)
const editUser = ref(null)
const form = ref({ name:'', email:'', role:'employee', manager:'', password:'', passwordConfirm:'' })
const saving = ref(false)
const deleteOpen = ref(false)
const pendingDelete = ref(null)
const actioningId = ref(null)
const formError = ref('')
const showCreateConfirm = ref(false)
// Pagination
const route = useRoute()
const router = useRouter()
const page = ref(Number(route.query.page) || 1)
const limit = ref(10)
const totalPages = ref(1)
const totalItems = ref(0)
// Filtering & search
const search = ref('')
const roleFilter = ref('')
const filtered = computed(()=> users.value.filter(u => {
  if(roleFilter.value && u.role !== roleFilter.value) return false
  if(search.value){
    const q = search.value.toLowerCase()
    const name = (u.name || u.fullName || '').toLowerCase()
    if(!name.includes(q) && !u.email.toLowerCase().includes(q)) return false
  }
  return true
}))
// Paged slice of filtered users
const pagedUsersComputed = computed(()=>{ const start=(page.value-1)*limit.value; return filtered.value.slice(start,start+limit.value) })
function syncQuery(){ const q={ ...route.query, page: page.value }; router.replace({ query:q }) }
function applyRoute(){ page.value = Number(route.query.page)||1 }
watch(route, applyRoute)
function changePage(p){ if(p<1 || p> totalPages.value) return; page.value=p; syncQuery() }

function managerName(u){
  if(!u.manager) return '—'
  const found = managers.value.find(m => m._id === (u.manager._id || u.manager))
  return found ? (found.name || found.email) : (u.manager.name || u.manager.email || '—')
}

async function load(){
  loading.value = true
  try {
    const { items } = await fetchUsers({ limit: 500 })
    users.value = items
    managers.value = items.filter(u => u.role === 'manager')
  } catch(e){ alerts.error(e?.response?.data?.message || e.message || 'Failed loading users') }
  finally { loading.value = false }
}

function openCreate(){ editUser.value=null; form.value={ name:'', email:'', role:'employee', manager:'', password:'', passwordConfirm:'' }; formError.value=''; modalOpen.value=true }
function startEdit(u){ editUser.value=u; form.value={ name:u.name||'', email:u.email, role:u.role, manager: u.manager?._id||u.manager||'', password:'', passwordConfirm:'' }; modalOpen.value=true }
function closeModal(){ modalOpen.value=false }

function validate(isCreate){
  formError.value=''
  if(!form.value.name || !form.value.name.trim()) { formError.value='Name required'; return false }
  if(!form.value.email || !form.value.email.trim()) { formError.value='Email required'; return false }
  if(['employee','manager'].includes(form.value.role) && !form.value.manager) { formError.value='Manager required for this role'; return false }
  if(isCreate){
    if(!form.value.password || form.value.password.length<8){ formError.value='Password must be at least 8 characters'; return false }
    if(form.value.password !== form.value.passwordConfirm){ formError.value='Passwords do not match'; return false }
  } else if(form.value.password || form.value.passwordConfirm){
    if(form.value.password !== form.value.passwordConfirm){ formError.value='Passwords do not match'; return false }
    if(form.value.password && form.value.password.length<8){ formError.value='Password must be at least 8 characters'; return false }
  }
  return true
}

function onSubmit(){
  if(saving.value) return
  const isCreate = !editUser.value
  if(!validate(isCreate)) { alerts.error(formError.value); return }
  if(isCreate){ showCreateConfirm.value = true; return }
  // editing flows straight through
  performSaveUser()
}

async function performSaveUser(){
  saving.value=true
  try {
    const isCreate = !editUser.value
    if(!validate(isCreate)) throw new Error(formError.value || 'Invalid form')
    if(editUser.value){
      const payload = { name: form.value.name.trim(), role: form.value.role, supervisingManager: form.value.manager||undefined }
      if(form.value.password) payload.password = form.value.password
      const updated = await updateUser(editUser.value._id, payload)
      Object.assign(editUser.value, updated)
      alerts.success('User updated')
    } else {
      const payload = { name: form.value.name.trim(), email: form.value.email.trim(), role: form.value.role, supervisingManager: form.value.manager||undefined, password: form.value.password }
      const created = await createUser(payload)
      users.value.push(created)
      if(created.role==='manager') managers.value.push(created)
      alerts.success('User created')
    }
    showCreateConfirm.value=false
    modalOpen.value=false
  } catch(e){ formError.value = e.message || e?.response?.data?.message || 'Failed saving user'; alerts.error(formError.value) }
  finally { saving.value=false }
}

function askDelete(u){ pendingDelete.value=u; deleteOpen.value=true }
async function performDelete(){
  if(!pendingDelete.value) return
  actioningId.value = pendingDelete.value._id
  try {
    await deleteUser(pendingDelete.value._id)
    users.value = users.value.filter(x=>x._id!==pendingDelete.value._id)
    managers.value = managers.value.filter(x=>x._id!==pendingDelete.value._id)
    alerts.success('User deleted')
    deleteOpen.value=false
  } catch(e){ alerts.error(e?.response?.data?.message || e.message || 'Failed deleting user') }
  finally { actioningId.value=null }
}

watch([users, filtered], ()=> { totalItems.value = filtered.value.length; totalPages.value = Math.max(1, Math.ceil(totalItems.value/limit.value)); if(page.value>totalPages.value) page.value = totalPages.value })
// expose for template
const pagedUsers = pagedUsersComputed
onMounted(()=>{ applyRoute(); load() })
</script>

<style scoped>
</style>
