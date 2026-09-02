<template>
  <div class="min-h-screen bg-canvas text-ink p-4 sm:p-8">
    <div class="mx-auto">
      <LabCrumbs :trail="[{ label: 'Home', to: '/' }, { label: 'Labs', to: '/admin/labs' }, { label: 'Script Lab' }]" />

      <h1 class="text-2xl sm:text-3xl font-bold text-ink mb-1">Script Lab</h1>
      <p class="text-muted text-sm mb-4 max-w-4xl">
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
      <div class="object-box border rounded-lg p-4 mb-5 text-sm max-w-4xl">
        <p class="font-semibold text-ink mb-1">You are editing the canonical English master. You are not editing any course's known text.</p>
        <p class="text-muted leading-relaxed">
          These two are different objects. One canonical set exists, identical by definition.
          Each course's known English is <strong>derived</strong> from it and legitimately differs per pair:
          the core pod's first line, “Good morning, Sarah!”, appears as
          <strong>24 distinct known texts across 46 courses</strong> — “¡Buenos días, Sarah!”, “Bonjour, Sarah !”,
          “Guten Morgen, Sarah!”, “Good morning, Sara!”, “Hello, good morning, Sarah!”. Slot 2 is 21 across 46,
          slot 3 is 24 across 45, and canonical seed 1 has <strong>116 distinct known texts across 130 courses</strong>.
          That spread is genuine per-pair translation AND legitimate per-course differentiation, which is the point:
          saving here changes the master and propagates to none of them. Re-translation is a separate pipeline step,
          so your change is <strong>owed</strong> to every course rather than applied to it.
        </p>
      </div>

      <div class="flex flex-wrap gap-2 mb-5">
        <router-link to="/canonical/metagraph" class="inline-block px-3 py-1.5 rounded border border-line bg-surface text-xs text-muted hover:text-ink hover:border-muted">
          See the graph itself, with these scripts as overlays through it →
        </router-link>
      </div>

      <div class="text-xs text-faint mb-6 border border-line rounded px-3 py-2 bg-surface leading-relaxed space-y-1.5 max-w-4xl">
        <p>
          <strong class="text-muted">Audio is not a property of this layer.</strong>
          The canonical store has no audio column and nothing points at one, so for every walk on this page
          the honest answer is <em>n/a here</em> — audio exists only against the generated pods, per course,
          downstream of these masters.
        </p>
        <p>
          <strong class="text-muted">At that layer, the core walk is fully rendered.</strong>
          {{ core.newSlate.courses }} courses, {{ core.newSlate.sentences.toLocaleString() }} sentences,
          {{ core.newSlate.targetClips.toLocaleString() }} target clips and
          {{ core.newSlate.knownClips.toLocaleString() }} known clips — 100% on both sides.
        </p>
        <!-- The trap: mid-cutover, `pod-1` names two different objects in two
             tables with two different sets of numbers. Seeing that without being
             told would reasonably read as the page being broken. -->
        <p class="text-muted">
          <strong class="text-ink">One slug, two meanings, while the cutover runs.</strong>
          In the canonical store <code>pod-1</code> is the core canon above, renamed from <code>pod-0</code> —
          that rename has landed. On the generated side <code>pod-1</code> is the new slate and <code>pod-0</code>
          is still the old one ({{ core.oldSlate.courses }} courses, {{ core.oldSlate.sentences.toLocaleString() }} sentences).
          The learner-side cutover is {{ core.coursesDone }} of {{ core.coursesTotal }} courses in, runs on its own
          tooling, and is nothing this page touches.
        </p>
      </div>

      <p v-if="stale" class="text-muted text-xs mb-4 border border-line rounded px-3 py-2 bg-surface max-w-4xl">
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
            <p class="text-xs text-ink font-semibold mb-3">
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
        <!-- CITED, not restated. The rule has one home and two implementations;
             printing the registry's own words means the page cannot drift from
             it silently, and a reader can see the authority rather than a
             paraphrase of it. -->
        <p><strong class="text-muted">Ingestable</strong> means <code>{{ ingestableRule }}</code> — the registry's definition, verbatim, shared with the ingest tool.</p>
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
import LabCrumbs from '@/components/LabCrumbs.vue'
import { getApiUrl } from '@/services/api.js'
import { useAuth } from '@/composables/useAuth.js'
import { loadGraph } from '@/lib/metagraph/loadGraph.js'
import { walkFromCanonicalRows, walkFromStoredPod } from '@/lib/metagraph/walk.js'
import { computeCoverage } from '@/lib/metagraph/coverage.js'
import { buildGroups } from '@/lib/walkGroups.js'
import { GENERATED_CORE } from '@/lib/walkFacts.js'
import BlastRadiusBanner from '@/components/admin/BlastRadiusBanner.vue'
import WalkCard from '@/components/admin/WalkCard.vue'
import CORPORA from '../../tools/pods/pod-corpora.json'

const graph = loadGraph()
const core = GENERATED_CORE
// The rule's first clause is the predicate; the rest of the field is the
// explanation of why it lives in the registry. The page prints the predicate.
const ingestableRule = String(CORPORA.ingestableRule || '').split(' — ')[0]
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
          const declarations = (walk.declarations || []).length

          // THREE DIFFERENT FACTS, AND TWO OF THEM LOOK IDENTICAL IN NUMBERS.
          //
          //   graph-rows — the CORE slate. Its rows ARE the graph's g<n>
          //     reference space, so coverage is read straight off row numbers.
          //
          //   declared — the corpus claims shapes, and the store either matches
          //     them or does not. Unresolved declarations are a real finding:
          //     this walk says it walks a shape the store cannot place.
          //
          //   no-declarations — the corpus makes NO shape claims at all, so no
          //     walk steps were ever parsed. Coverage is NOT ZERO here, it is
          //     NOT APPLICABLE, and rendering it as "0 of 36 traversed" would
          //     libel a corpus for failing a test it never sat. Aran's health
          //     corpus is the case that forces the distinction: 438 hand-written
          //     lines, and it would read as the worst-covered walk on the page.
          const mode = walk.refSpace === 'g'
            ? 'graph-rows'
            : (declarations ? 'declared' : 'no-declarations')

          coverage.value = {
            ...coverage.value,
            [pod.slug]: {
              mode,
              coverage: mode === 'no-declarations' ? null : computeCoverage(graph, walk),
              unresolved: (walk.unresolved || []).length,
              declarations,
              steps: (walk.steps || []).length,
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

/* The one thing on this page nobody is allowed to skim past. Emphasis is a
   heavier ink rule and a raised surface, not amber — amber on this page was
   also doing the active-nav-tab job and the "declared, unresolved" job, and a
   colour doing three jobs teaches the eye nothing. */
.object-box { border-color: var(--line); border-left: 3px solid var(--ink); background: var(--surface-2); }

/* One frame around the two Method cuts, so they read as one decision. The
   dashes here mean "not yet decided" — the same absence channel the metagraph
   and the walk cards use. */
.paired { border-color: var(--faint); border-style: dashed; background: none; }
</style>
