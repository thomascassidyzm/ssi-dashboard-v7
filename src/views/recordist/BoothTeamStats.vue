<template>
  <!-- THE TEAM, under the finished work on a God admin's own booth (Aran, 2026-10-14, job #379).
       Who may see it is the server's call (team-stats.js says why); on any other booth this draws
       nothing and asks for nothing. -->
  <section v-if="state !== 'hidden'" class="bt" data-test="booth-team">
    <h3 class="bt-sec">The team</h3>
    <p v-if="state === 'signin'" class="bt-sub">
      <router-link :to="signInTo" class="bt-link" data-test="booth-team-signin">Sign in to see the team ›</router-link>
    </p>
    <p v-else-if="state === 'loading'" class="bt-sub">Loading the other readers…</p>
    <p v-else-if="state === 'error'" class="bt-sub">{{ error }}</p>
    <div v-else class="bt-grid">
      <router-link
        v-for="a in cards" :key="a.voiceId" class="bt-card" :data-test="`team-${a.voiceId}`"
        :to="{ path: '/admin/recording', query: { artist: a.voiceId } }"
      >
        <span class="bt-top">
          <b class="bt-name">{{ a.name }}</b>
          <span class="bt-when" :class="{ today: a.activity.takesToday }">{{ lastActive(a) }}</span>
        </span>
        <span class="bt-meta">{{ a.languageName }}<template v-if="a.dialect && a.dialect !== 'standard'"> · {{ a.dialect }}</template> · {{ a.activity.takes7d }} {{ a.activity.takes7d === 1 ? 'take' : 'takes' }} this week</span>
        <template v-if="a.focus">
          <span class="bt-proj">{{ a.focus.label }}</span>
          <span class="bt-bar"><i :style="{ width: pct(a.focus) }"></i></span>
          <span class="bt-meta">{{ n(a.focus.recorded) }} of {{ n(a.focus.total) }} recorded<template v-if="a.projects.length > 1"> · {{ a.projects.length }} projects ›</template></span>
        </template>
      </router-link>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { recordingApiBase as apiBase } from '@/services/recordingApi'
import { useAuth } from '@/composables/useAuth'
import { showsTeamSection, teamCards } from './team-stats.js'

const route = useRoute()
const { getAccessToken } = useAuth()
const voiceId = computed(() => String(route.params.voiceId || ''))
const state = ref('hidden') // hidden | signin | loading | ready | error
const error = ref(null)
const artists = ref([])
const cards = computed(() => teamCards(artists.value, voiceId.value))
const signInTo = computed(() => ({ path: '/login', query: { redirect: route.fullPath } }))

const n = (x) => Number(x || 0).toLocaleString('en-GB')
const pct = (p) => `${p.total ? Math.max(Math.round(100 * p.recorded / p.total), p.recorded ? 1 : 0) : 0}%`
function lastActive(a) {
  const t = a.activity.lastActive
  if (!t) return 'not started'
  if (a.activity.takesToday) return 'today'
  const days = Math.floor((Date.now() - Date.parse(t)) / 86400000)
  return days < 1 ? 'in the last day' : days === 1 ? 'yesterday' : `${days}d ago`
}

onMounted(async () => {
  if (!showsTeamSection(voiceId.value)) return // an ordinary reader's booth: nothing, no call
  const token = await getAccessToken().catch(() => null)
  if (!token) { state.value = 'signin'; return }
  state.value = 'loading'
  try {
    const res = await fetch(`${apiBase()}/api/recording/admin/artists`, { headers: { Authorization: `Bearer ${token}` } })
    // Signed in, but not as Tom, Aran or Kai: the server refused, and the booth shows nothing.
    if (res.status === 401 || res.status === 403) { state.value = 'hidden'; return }
    if (!res.ok) throw new Error(`Could not load the team (${res.status})`)
    artists.value = (await res.json()).artists || []
    state.value = cards.value.length ? 'ready' : 'hidden'
  } catch (err) {
    error.value = (err && err.message) || 'Could not load the team'
    state.value = 'error'
  }
})
</script>

<style scoped>
.bt-sec { font-size: 0.78rem; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--color-paper-dim, #c1c1bb); margin: 1.4rem 0 0.3rem; }
.bt-sub { color: var(--color-paper-dim, #c1c1bb); font-size: 0.9rem; margin: 0; }
.bt-link { display: inline-block; min-height: 44px; line-height: 44px; color: var(--color-emerald, #06ffa5); font-weight: 600; text-decoration: none; }
.bt-grid { display: grid; gap: 0.6rem; grid-template-columns: 1fr 1fr; }
.bt-card { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; padding: 0.75rem; border-radius: 14px; text-decoration: none; color: inherit; background: var(--color-shadow, #1e293b); border: 1px solid var(--color-graphite, #475569); }
.bt-card:hover { border-color: var(--color-emerald, #06ffa5); }
.bt-top { display: flex; justify-content: space-between; align-items: baseline; gap: 0.4rem; }
.bt-name { font-size: 1rem; color: var(--color-paper, #f7f7f2); }
.bt-when { font-size: 0.72rem; color: var(--color-paper-dim, #c1c1bb); white-space: nowrap; }
.bt-when.today { color: var(--color-emerald, #06ffa5); font-weight: 600; }
.bt-meta { font-size: 0.74rem; color: var(--color-paper-dim, #c1c1bb); line-height: 1.35; }
.bt-proj { font-size: 0.8rem; font-weight: 600; margin-top: 0.35rem; color: var(--color-paper, #f7f7f2); line-height: 1.3; }
.bt-bar { display: block; height: 6px; background: var(--color-graphite, #475569); border-radius: 99px; overflow: hidden; margin: 0.2rem 0 0.1rem; }
.bt-bar > i { display: block; height: 100%; background: var(--color-emerald, #06ffa5); }
@media (max-width: 360px) { .bt-grid { grid-template-columns: 1fr; } }
:root[data-theme="light"] .bt-card { border-color: var(--line); box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06); }
:root[data-theme="light"] .bt-bar { background: var(--line); }
</style>
