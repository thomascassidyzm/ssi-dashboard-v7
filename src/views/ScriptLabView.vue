<template>
  <div class="min-h-screen bg-canvas text-ink p-4 sm:p-8">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center gap-2 mb-4 text-sm flex-wrap">
        <router-link to="/" class="text-accent-2 hover:opacity-80">Home</router-link>
        <span class="text-faint">/</span>
        <router-link to="/admin/labs" class="text-accent-2 hover:opacity-80">Labs</router-link>
        <span class="text-faint">/</span>
        <span class="text-muted">Script Lab</span>
      </div>

      <h1 class="text-2xl sm:text-3xl font-bold text-accent-2 mb-1">Script Lab</h1>
      <p class="text-muted text-sm mb-4">
        Every walk in the estate, in one place. A walk is a script read as a path over the shape
        metagraph; the read-out beside each one is the coverage that path achieves.
      </p>

      <BlastRadiusBanner
        tier="deferred"
        note="The write is POST /api/canonical-script — a versioned save onto canonical_pod_scenarios.english_text. Re-translation is a separate pipeline step, so an edit here is OWED to every course, not applied to it."
        class="mb-4"
      />

      <!-- THE OBJECT. Conflating these two cost a worker a whole run: the
           canonical seed is one set, identical by definition; a course's known
           English is derived from it and legitimately differs per pair. -->
      <div class="object-box border rounded-lg p-4 mb-5 text-sm">
        <p class="font-semibold text-ink mb-1">You are editing the canonical English master. You are not editing any course's known text.</p>
        <p class="text-muted leading-relaxed">
          These two are different objects. One canonical set exists, identical by definition.
          Each course's known English is <strong>derived</strong> from it and legitimately differs per pair:
          canonical seed 1 has <strong>116 distinct known texts across 130 courses</strong>, and the canonical
          pod line “Good morning, Sarah!” appears as <strong>24 distinct known texts across 46 courses</strong>.
          Saving here changes the master and propagates to none of them — re-translation is a separate
          pipeline step, so your change is <strong>owed</strong> to every course rather than applied to it.
        </p>
      </div>

      <div class="flex flex-wrap gap-2 mb-5">
        <router-link to="/canonical/metagraph" class="inline-block px-3 py-1.5 rounded border border-line bg-surface text-xs text-accent-2 hover:border-accent-2">
          See the graph itself, with these scripts as overlays through it →
        </router-link>
      </div>

      <p class="text-xs text-faint mb-6 border border-line rounded px-3 py-2 bg-surface leading-relaxed">
        <strong class="text-muted">Audio.</strong> The canonical store holds no audio at all — not for any walk on this
        page. Audio exists against generated pods, per course, downstream of these masters. There is nothing to render here.
      </p>

      <p v-if="stale" class="text-accent text-xs mb-4 border border-line rounded px-3 py-2 bg-surface">
        This API has not been restarted onto the script index yet, so the database column below is empty.
        The registry still lists every walk, and each script page works.
      </p>

      <div v-if="error" class="error-box border rounded-lg p-4 mb-4">{{ error }}</div>
      <div v-if="loading" class="text-faint py-8 text-center">Reading the canonical store…</div>

      <div class="space-y-8">
        <section v-for="group in groups" :key="group.id">
          <div class="flex items-baseline gap-3 mb-1">
            <h2 class="text-sm font-bold tracking-wide uppercase" :style="{ color: group.accent }">{{ group.title }}</h2>
            <div class="flex-1 h-px bg-line"></div>
          </div>
          <p class="text-xs text-muted mb-3 leading-relaxed max-w-2xl">{{ group.blurb }}</p>

          <!-- The two Method cuts are ONE decision shown as two realisations,
               so they are rendered inside one frame rather than as two walks. -->
          <div v-if="group.paired" class="paired border rounded-lg p-3 sm:p-4">
            <p class="text-xs text-accent font-semibold mb-3">
              One decision, two realisations of the same material. Tom's choice is outstanding — picking one sacks the other.
            </p>
            <div class="grid gap-3 sm:grid-cols-2">
              <WalkCard v-for="w in group.walks" :key="w.slug" :walk="w" />
            </div>
          </div>
          <div v-else class="space-y-3">
            <WalkCard v-for="w in group.walks" :key="w.slug" :walk="w" />
          </div>
        </section>
      </div>

      <div class="mt-10 text-xs text-faint space-y-1">
        <p><strong class="text-muted">The graph.</strong> {{ graph.nodes.length }} shapes, {{ graph.compositionEdges.length }} composition edges, {{ graph.survivability.length }} survivability edges, {{ graph.outcomes.length }} outcome shapes under the selector.</p>
        <p>Source: <code>{{ graph.source }}</code>. {{ graph.provenance }}</p>
        <p>The walk registry is <code>tools/pods/pod-corpora.json</code> — one file, two readers. Adding a walk is one entry there plus its corpus file, and no code change on this page.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * SCRIPT LAB INDEX — every walk in the estate, in one place, with the
 * distinctions needed to tell them apart (Tom, 2026-09-01: "can we wrap all
 * this up into the scripts lab page? including the changes we've made to the
 * other pods, so I can see them all in one place?").
 *
 * THE JOIN IS DONE HERE, IN THE PAGE — the registry is imported as JSON and
 * joined to whatever GET /api/admin/canonical-pods returns. That endpoint has
 * no filter and needed no change; a server-side join would have been a new
 * endpoint to keep in step with a file the page can simply import. The join
 * itself lives in lib/walkGroups.js so it is testable without a browser.
 *
 * The old hardcoded NOTES map is gone. It named `pod-0`, `pod-1` and `pod-0.5`,
 * and the 2026-09-01 slug rename made two of those three wrong on the same
 * morning. Nothing on this page keys on a slug now, so the page was correct
 * before that migration and is correct after it, with no edit.
 *
 * BLAST RADIUS: deferred — LIVE AT NEXT GENERATION. The reasoning, and the
 * write it was checked against, are in components/admin/blastRadius.js beside
 * the `scripts` entry.
 */
import { ref, computed, onMounted } from 'vue'
import { getApiUrl } from '@/services/api.js'
import { useAuth } from '@/composables/useAuth.js'
import { loadGraph } from '@/lib/metagraph/loadGraph.js'
import { walkFromCanonicalRows, walkFromStoredPod } from '@/lib/metagraph/walk.js'
import { computeCoverage } from '@/lib/metagraph/coverage.js'
import { buildGroups } from '@/lib/walkGroups.js'
import BlastRadiusBanner from '@/components/admin/BlastRadiusBanner.vue'
import WalkCard from '@/components/admin/WalkCard.vue'
import CORPORA from '../../tools/pods/pod-corpora.json'

const graph = loadGraph()
const dbPods = ref([])     // what the canonical store holds, by slug
const coverage = ref({})   // slug -> { coverage, unresolved, declarations } | { error }
const targets = ref({})    // slug -> { rows, langs[] }
const stale = ref(false)
const loading = ref(true)
const error = ref(null)

const groups = computed(() => buildGroups(CORPORA, {
  dbPods: dbPods.value, targets: targets.value, coverage: coverage.value,
}))

const { getAccessToken } = useAuth()
async function authedFetch (path, init = {}) {
  const token = await getAccessToken()
  const headers = { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json', ...(init.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${getApiUrl()}${path}`, { ...init, headers })
}

async function load () {
  loading.value = true
  error.value = null
  try {
    const res = await authedFetch('/api/admin/canonical-pods')
    if (res.ok) {
      dbPods.value = (await res.json()).pods || []
    } else if (res.status === 404) {
      // An API process not yet restarted onto the index 404s. The registry is a
      // local import, so the page still lists every walk — it just cannot say
      // what the store holds. Say that, rather than showing nothing.
      stale.value = true
      dbPods.value = []
    } else {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.error || `HTTP ${res.status}`)
    }

    for (const pod of dbPods.value) {
      authedFetch(`/api/admin/canonical-pods/${encodeURIComponent(pod.slug)}`)
        .then(async r => {
          const b = await r.json()
          if (!r.ok) throw new Error(b?.error || `HTTP ${r.status}`)
          const scenarios = b.scenarios || []
          // Target rows counted off the same fetch coverage already needs, so
          // the target column costs no extra request and no endpoint change.
          const withTarget = scenarios.filter(s => (s.target_text || '').trim())
          targets.value = {
            ...targets.value,
            [pod.slug]: {
              rows: withTarget.length,
              langs: [...new Set(withTarget.map(s => s.target_lang).filter(Boolean))],
            },
          }
          // A pod carrying a stored walk is read through it; the rest keep the
          // original row-reference path.
          const walk = (b.walk || []).length
            ? walkFromStoredPod(scenarios, b.walk, graph, { id: pod.slug, slug: pod.slug })
            : walkFromCanonicalRows(scenarios, graph, { id: pod.slug, slug: pod.slug })
          coverage.value = {
            ...coverage.value,
            [pod.slug]: {
              coverage: computeCoverage(graph, walk),
              unresolved: (walk.unresolved || []).length,
              declarations: (walk.declarations || []).length,
            },
          }
        })
        .catch(e => { coverage.value = { ...coverage.value, [pod.slug]: { error: e.message } } })
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.error-box { color: var(--danger); border-color: var(--danger); background: color-mix(in srgb, var(--danger) 14%, var(--surface)); }
:root[data-theme="light"] .error-box { background: color-mix(in srgb, var(--danger) 8%, #ffffff); }

/* The one thing on this page nobody is allowed to skim past. */
.object-box { border-color: #f59e0b; border-left-width: 3px; background: rgba(245, 158, 11, 0.1); }

/* One frame around the two Method cuts, so they read as one decision. */
.paired { border-color: #f59e0b; border-style: dashed; background: rgba(245, 158, 11, 0.05); }
</style>
