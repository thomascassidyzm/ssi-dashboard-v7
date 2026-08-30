<script setup>
/**
 * Basket Lab — /admin/configs/basket
 *
 * THE UNIT BEING JUDGED IS THE BASKET: one LEGO's phrases, live in the course
 * today beside a newly generated candidate set, both scored against the same
 * machine floors, with a box for a verbatim verdict. (Tom, 2026-08-29: "it's
 * more of a BASKET_LAB" — the seed is how you NAVIGATE to a basket, the basket
 * is what you JUDGE.)
 *
 * WHY THIS VIEW IS A FRAME AND NOT A PORT OF THE LAB.
 * The lab is `labs/basket-lab/server.cjs`: it reads Supabase with the service
 * key, derives each seed's job from its own admission diff, scores every basket
 * against the frame-layer floors, and renders that. Re-rendering all of it in
 * Vue would create a second copy of the scoring surface that drifts from the
 * one Tom has been judging against since 2026-08-29 — the same instrument
 * reading two different numbers. So there is ONE lab, mounted into the
 * production API at /api/basket-lab (services/production-api.cjs, before the
 * body parser), and this view frames it under the route where Tom expects it.
 *
 * WHAT THE MOUNTED COPY WILL NOT DO: generate candidates. A generation pass
 * shells out to the Claude CLI, is real spend and can run fifteen minutes, so
 * it stays a deliberate local act. The lab says so in its own words on the page
 * and prints the command. Read and judge here; generate on the box.
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiUrl } from '@/services/api'

const route = useRoute()
const router = useRouter()

const course = ref(String(route.query.course || 'spa_for_eng'))
const seed = ref(String(route.query.seed || '599'))
const view = ref(String(route.query.view || 'lab')) // 'lab' | 'grid' | 'verdicts'

// null = not checked yet, true = the API answers, false = it does not
const reachable = ref(null)
const apiBase = ref('')

const src = computed(() => {
  const b = `${apiBase.value}/api/basket-lab/lab`
  if (view.value === 'grid') return `${b}/grid?courses=${encodeURIComponent(course.value)}&seeds=${encodeURIComponent(seed.value)}`
  if (view.value === 'verdicts') return `${b}/verdicts`
  return `${b}?course=${encodeURIComponent(course.value)}&seed=${encodeURIComponent(seed.value)}`
})

function show () {
  router.replace({ query: { course: course.value, seed: seed.value, view: view.value } })
}

onMounted(async () => {
  apiBase.value = getApiUrl()
  try {
    // /lab/courses is the lab's own cheapest read — it answers only if the
    // production API is running code that has this mount in it.
    const r = await fetch(`${apiBase.value}/api/basket-lab/lab/courses`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    reachable.value = r.ok
  } catch {
    reachable.value = false
  }
})
</script>

<template>
  <div class="basket-lab">
    <header class="bl-header">
      <nav class="admin-crumbs">
        <router-link to="/" class="crumb-link">Home</router-link>
        <span class="crumb-sep">/</span>
        <router-link to="/admin" class="crumb-link">Admin</router-link>
        <span class="crumb-sep">/</span>
        <router-link to="/admin/configs" class="crumb-link">Configs</router-link>
        <span class="crumb-sep">/</span>
        <span class="crumb-here">Basket Lab</span>
      </nav>
      <h1 class="page-title">Basket Lab</h1>
      <p class="page-subtitle">
        One LEGO's phrases, live in the course today beside a generated candidate set, both scored
        against the same floors. The seed is how you navigate; the basket is what you judge.
      </p>
    </header>

    <form class="bl-controls" @submit.prevent="show">
      <label>course <input v-model="course" size="12" spellcheck="false" /></label>
      <label>seed <input v-model="seed" size="5" inputmode="numeric" /></label>
      <label>view
        <select v-model="view">
          <option value="lab">deep view — judge and type verdicts</option>
          <option value="grid">grid — languages against seeds</option>
          <option value="verdicts">verdicts already typed</option>
        </select>
      </label>
      <button type="submit">show</button>
      <a v-if="reachable" :href="src" target="_blank" rel="noopener">open full screen &rarr;</a>
    </form>

    <p v-if="reachable === false" class="bl-gap">
      <b>The lab is not answering on this API.</b> It is mounted at
      <code>/api/basket-lab</code> in <code>services/production-api.cjs</code>, so a production API
      process started before that landed will not have it — restart the API on the machine this
      dashboard points at (<code>{{ apiBase || 'no API URL set' }}</code>), or use the Environment
      Switcher to point at one that has. The lab also runs standalone:
      <code>node labs/basket-lab/server.cjs</code> on port 8461.
    </p>

    <p v-else-if="reachable === null" class="bl-gap muted">checking the API for the lab…</p>

    <iframe v-else class="bl-frame" :src="src" title="Basket Lab"></iframe>

    <p class="bl-note">
      Candidate <b>generation is not offered here</b> — a pass shells out to the Claude CLI, is real
      spend and can run fifteen minutes, so it stays a deliberate local act:
      <code>node tools/frame-layer/generate-candidates.cjs &lt;course&gt; &lt;seed&gt; --passes 3</code>.
      Whatever it writes appears in this view. Verdicts you type are stored verbatim on the machine
      running the API, in <code>labs/basket-lab/verdicts.ndjson</code>; if that write ever fails the
      lab says so on screen rather than dropping what you typed.
    </p>
  </div>
</template>

<style scoped>
.basket-lab { max-width: 1400px; margin: 0 auto; padding: 1.25rem; color: var(--text, #e5e7eb); }
.admin-crumbs { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; margin-bottom: 0.75rem; }
.admin-crumbs .crumb-link { color: var(--accent-2, #34d399); text-decoration: none; }
.admin-crumbs .crumb-sep { color: var(--surface-3, #4b5563); }
.admin-crumbs .crumb-here { color: var(--muted, #9ca3af); }
.page-title { font-size: 1.5rem; margin: 0 0 0.25rem; }
.page-subtitle { color: var(--muted, #9ca3af); margin: 0 0 1rem; max-width: 70ch; }
.bl-controls { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; margin-bottom: 0.75rem; }
.bl-controls label { display: flex; gap: 0.35rem; align-items: center; font-size: 0.875rem; color: var(--muted, #9ca3af); }
.bl-controls input, .bl-controls select, .bl-controls button {
  font: inherit; color: inherit; background: transparent;
  border: 1px solid var(--surface-3, #4b5563); border-radius: 4px; padding: 0.3rem 0.5rem;
}
.bl-controls button { cursor: pointer; }
.bl-controls a { color: var(--accent-2, #34d399); font-size: 0.875rem; }
.bl-frame { width: 100%; height: 78vh; border: 1px solid var(--surface-3, #4b5563); border-radius: 6px; background: #fff; }
.bl-gap { border: 1px solid #b00020; border-radius: 6px; padding: 0.75rem; max-width: 80ch; }
.bl-gap.muted { border-color: var(--surface-3, #4b5563); color: var(--muted, #9ca3af); }
.bl-note { font-size: 0.8125rem; color: var(--muted, #9ca3af); max-width: 90ch; margin-top: 0.75rem; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em; }
</style>
