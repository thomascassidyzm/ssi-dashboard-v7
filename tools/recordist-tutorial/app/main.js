// Practice-mode entry for the recordist tutorial.
//
// Deliberately NOT src/main.js: that installs authFetch, the dashboard router
// and Pinia, and would drag the whole app into this bundle. Here there is one
// component, the theme stylesheet, and no network code of any kind.
//
// A router IS present, but a deliberately empty one. `ModeSelector.vue` — the
// real mode-switch control the tutorial makes the recordist press — calls
// useRoute()/useRouter(), so it needs a router in scope to mount at all. This
// one uses MEMORY history (no URL is ever touched) and has a single catch-all
// route. Two consequences worth stating:
//   - `route.params.courseCode` is undefined, so ModeSelector's third card
//     (Listening Pods) is v-if'd out. That is correct: pods are a separate
//     cast-first flow reached from the pods page, not part of this tutorial.
//   - the only router.push() in ModeSelector is on that hidden card, so nothing
//     here can navigate anywhere.
//
// The theme is read but never written — the practice page must leave no trace
// in localStorage, so it offers no theme toggle and persists nothing.
import { createApp } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import '@/style.css'
import TutorialStudio from '@/components/production/autocue/TutorialStudio.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/:pathMatch(.*)*', name: 'practice', component: TutorialStudio }],
})

// Match the dashboard's default (dark) and honour the phone's own preference,
// without touching storage.
if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
  document.documentElement.dataset.theme = 'light'
}

createApp(TutorialStudio).use(router).mount('#app')
