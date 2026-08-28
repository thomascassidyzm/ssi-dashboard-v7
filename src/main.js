import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import './assets/ui-tokens.css'
import App from './App.vue'
import router from './router'
import { installAuthFetch } from './services/authFetch'

// Attach the dashboard session token to all API-bound fetch() calls —
// course-scoped routes are auth-gated server-side. Must install before
// any component fires its first request.
installAuthFetch()

// Apply the saved light/dark theme before mount (dark is the default = no attribute).
try {
  if (localStorage.getItem('popty-theme') === 'light') document.documentElement.dataset.theme = 'light'
} catch { /* private mode — stay on default dark */ }

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)
app.mount('#app')

// Stale-version detection: check if a newer build has been deployed
// Runs on visibility change (tab focus) — auto-reloads if version mismatch
const BUILD_VERSION = typeof __GIT_COMMIT__ !== 'undefined' ? __GIT_COMMIT__ : null

if (BUILD_VERSION && typeof document !== 'undefined') {
  let checking = false

  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible' || checking) return
    checking = true
    try {
      const resp = await fetch('/version.json?_t=' + Date.now(), { cache: 'no-store' })
      if (resp.ok) {
        const { version } = await resp.json()
        if (version && version !== BUILD_VERSION) {
          console.log(`[Popty] New version detected: ${version} (current: ${BUILD_VERSION}). Reloading...`)
          window.location.reload()
        }
      }
    } catch {
      // Offline or version.json not deployed yet — ignore
    } finally {
      checking = false
    }
  })
}
