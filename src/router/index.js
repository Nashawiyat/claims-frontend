import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

// Route meta defines auth requirements and role-based access
const routes = [
	{
		path: '/login',
		name: 'login',
		component: () => import('../views/LoginView.vue'),
		meta: { requiresAuth: false }
	},
	{
		path: '/register',
		name: 'register',
		component: () => import('../views/UserManagementView.vue'),
		meta: { requiresAuth: true, roles: ['admin'] }
	},
	{
		path: '/claims',
		name: 'claims',
		component: () => import('../views/ClaimsView.vue'),
		meta: { requiresAuth: true, roles: ['employee', 'manager', 'finance', 'admin'] }
	},
	{
		path: '/manager',
		name: 'manager',
		component: () => import('../views/ManagerView.vue'),
		meta: { requiresAuth: true, roles: ['manager', 'admin'] }
	},
	{
		path: '/finance',
		name: 'finance',
		component: () => import('../views/FinanceView.vue'),
		meta: { requiresAuth: true, roles: ['finance', 'admin'] }
	},
	{
		path: '/config',
		name: 'config',
		component: () => import('../views/ConfigView.vue'),
		meta: { requiresAuth: true, roles: ['finance','admin'] }
	},
	{
		path: '/claim-limits',
		name: 'claim-limits',
		component: () => import('../views/ClaimLimitsView.vue'),
		meta: { requiresAuth: true, roles: ['finance','admin'] }
	},
	// Fallback could redirect to claims or login
	{
		path: '/:pathMatch(.*)*',
		redirect: '/claims'
	}
]

const router = createRouter({
	history: createWebHistory(),
	routes
})

// Global auth & role guard
router.beforeEach((to, from, next) => {
	const auth = useAuthStore()
	// Ensure store reflects persisted session
	if (!auth.token) {
		auth.loadFromStorage()
	}

	const requiresAuth = to.meta.requiresAuth
	const roles = to.meta.roles

	if (requiresAuth && !auth.isAuthenticated) {
		return next({ path: '/login', query: { redirect: to.fullPath } })
	}

	if (roles && roles.length && auth.isAuthenticated) {
		if (!auth.role || !roles.includes(auth.role)) {
			return next('/claims')
		}
	}

	// Prevent logged-in users from seeing login page
	if (to.path === '/login' && auth.isAuthenticated) {
		return next('/claims')
	}

	return next()
})

export default router
