// Practice-mode entry for the recordist tutorial.
//
// Deliberately NOT src/main.js: that installs authFetch, the router and Pinia,
// and would drag the whole dashboard into this bundle. Here there is exactly
// one component, the theme stylesheet, and no network code of any kind.
//
// The theme is read but never written — the practice page must leave no trace
// in localStorage, so it does not offer a theme toggle and does not persist one.
import { createApp } from 'vue'
import '@/style.css'
import TutorialStudio from '@/components/production/autocue/TutorialStudio.vue'

// Match the dashboard's default (dark) and honour the phone's own preference,
// without touching storage.
if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
  document.documentElement.dataset.theme = 'light'
}

createApp(TutorialStudio).mount('#app')
