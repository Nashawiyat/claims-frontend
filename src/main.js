import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './style.css'
import App from './App.vue'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

// Restore persisted auth (token, user, role) before router navigation
try {
	const auth = useAuthStore()
	auth.loadFromStorage()
} catch (e) {
	console.warn('Auth restoration failed', e)
}

app.use(router)
app.mount('#app')
