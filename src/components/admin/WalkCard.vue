<script setup>
/**
 * One walk, as the Script Lab index shows it.
 *
 * Its own file because the index renders it twice — once as a list item, once
 * inside the paired frame that holds the two competing Method cuts — and a
 * card that differed between those two places would be a card that lies in one
 * of them.
 *
 * Everything here comes from the registry (tools/pods/pod-corpora.json) joined
 * to what the canonical store actually returned. Nothing is hardcoded per slug.
 */
import { computed } from 'vue'
import { MEASURED_ON } from '@/lib/walkFacts.js'

const props = defineProps({ walk: { type: Object, required: true } })

const CATEGORY_LABEL = {
  core: 'CORE',
  themed: 'THEMED',
  'method-cut': 'METHOD CUT',
  flagship: 'FLAGSHIP',
}

// Only the codes that actually appear. An unknown code prints as itself — a
// wrong language name on this page is worse than a bare code.
const LANG_NAMES = { ita: 'Italian', cym: 'Welsh', spa: 'Spanish', fra: 'French', eng: 'English' }

const w = computed(() => props.walk)
const categoryLabel = computed(() => CATEGORY_LABEL[w.value.category] || w.value.category)
const targetLine = computed(() => {
  const t = w.value.target
  if (t?.rows) return `target text: ${t.langs.map(c => LANG_NAMES[c] || c).join(', ')} — ${t.rows} lines`
  return w.value.inStore ? 'no target text' : ''
})
const storeLine = computed(() => {
  if (w.value.inStore) return `${w.value.scenes} scenes · ${w.value.lines} lines in the canonical store`
  if (w.value.status === 'parked') return w.value.livesIn || 'not in the canonical store'
  return 'not in the canonical store'
})

/**
 * A parked walk's real size, measured on the generated side because that is the
 * only place it exists. Said with its date, because it is a snapshot and not a
 * live read-out — and said precisely: travel-situations is ONE scene with one
 * known clip, which is not the same thing as no audio.
 */
const factsLine = computed(() => {
  const f = w.value.facts
  if (!f) return ''
  return `${f.turns} turns · ${f.scenes} ${f.scenes === 1 ? 'scene' : 'scenes'} · `
    + `${f.targetClips} target clips · ${f.knownClips} known clips rendered, in ${f.course}`
})
const measuredOn = MEASURED_ON
</script>

<template>
  <div class="walk-card bg-surface border border-line rounded-lg p-4" :data-slug="w.slug">
    <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span class="font-mono text-accent-2 text-sm">{{ w.slug }}</span>
      <span class="text-ink text-sm font-semibold">{{ w.name }}</span>
      <span v-if="w.category" class="chip" :class="`cat-${w.category}`">{{ categoryLabel }}</span>
      <span class="chip" :class="`st-${w.status}`">{{ String(w.status).toUpperCase() }}</span>
      <!-- A worker never signs off target-language text. Wherever the Welsh
           health overlay appears, it appears labelled. -->
      <span v-if="w.draftOverlay" class="chip st-draft">WELSH OVERLAY — DRAFT FOR ARAN</span>
      <!-- Same rule the ingest tool uses, so the two cannot disagree about
           what it will pick up. -->
      <span v-if="w.ingestable && !w.inStore" class="chip st-ingestable">INGESTABLE — NOT YET IN THE STORE</span>
      <span v-if="w.drift" class="chip st-drift">REGISTRY IS BEHIND THE DATABASE</span>
    </div>

    <p v-if="w.selector" class="mt-1 text-xs text-muted">
      <span class="text-faint">chosen for — </span>{{ w.selector }}
    </p>

    <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
      <span class="text-faint">{{ storeLine }}</span>
      <span v-if="targetLine" :class="w.target?.rows ? 'text-accent-2' : 'text-faint'">{{ targetLine }}</span>
    </div>

    <div v-if="w.cov?.coverage" class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
      <span class="text-muted">{{ w.cov.coverage.totals.traversed }}/{{ w.cov.coverage.totals.nodes }} shapes traversed</span>
      <span class="text-muted">{{ w.cov.coverage.totals.hitTwice }} hit twice+</span>
      <span :class="w.cov.coverage.totals.neverReached ? 'text-danger font-semibold' : 'text-accent-2'">
        {{ w.cov.coverage.totals.neverReached }} never reached
      </span>
      <span class="text-faint">{{ w.cov.coverage.totals.unmapped }} unmapped</span>
      <span v-if="w.cov.declarations" class="text-accent">{{ w.cov.unresolved }}/{{ w.cov.declarations }} shape declarations UNRESOLVED</span>
    </div>
    <div v-else-if="w.cov?.error" class="mt-2 text-xs text-danger">coverage unavailable — {{ w.cov.error }}</div>

    <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 prov text-faint">
      <span v-if="w.corpus">corpus <code>{{ w.corpus }}</code></span>
      <span v-if="w.mapping">mapping <code>{{ w.mapping }}</code></span>
      <span v-if="w.branch">branch <code>{{ w.branch }}</code></span>
      <span v-if="w.format">format <code>{{ w.format }}</code></span>
    </div>

    <p v-if="w.drift" class="mt-2 text-xs drift-note rounded px-2.5 py-1.5">
      The registry says <strong>{{ w.status }}</strong>, which claims this is not in the canonical store.
      The store holds <strong>{{ w.lines }} lines across {{ w.scenes }} scenes</strong> for it. One of the two is
      out of date — believe the database, and fix the registry entry.
    </p>

    <p v-if="factsLine" class="mt-2 text-xs text-muted">
      {{ factsLine }}
      <span class="text-faint">— measured {{ measuredOn }}, not a live read-out</span>
    </p>

    <!-- A pair overlay is a target-language DRAFT on a branch. It is not target
         text in the canonical store, whose only target language is Italian, and
         a worker never signs it off. -->
    <div v-if="w.overlay" class="overlay mt-2 rounded px-2.5 py-2 text-xs">
      <p class="font-semibold">
        Pair overlay {{ w.overlay.pair }} — {{ w.overlay.status }}
      </p>
      <p class="mt-1 leading-relaxed text-muted">
        On {{ w.overlay.scope }} — <strong>not</strong> on {{ w.overlay.notOn }}.
        {{ w.overlay.audio }}
      </p>
      <p class="mt-1 text-faint">
        branch <code>{{ w.overlay.branch }}</code> · <code>{{ w.overlay.file }}</code>
      </p>
    </div>

    <p v-if="w.note" class="mt-2 text-xs text-muted leading-relaxed">{{ w.note }}</p>

    <router-link v-if="w.to" :to="w.to" class="inline-block mt-3 text-xs text-accent-2 hover:opacity-80">
      Open the script →
    </router-link>
  </div>
</template>

<style scoped>
.chip {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  border: 1px solid currentColor;
  white-space: nowrap;
}
.cat-core { color: #ef4444; }
.cat-themed { color: #10b981; }
.cat-method-cut { color: #f59e0b; }
.cat-flagship { color: #a78bfa; }
.st-authored { color: var(--muted); }
.st-mapping-only { color: #f59e0b; }
.st-parked { color: #94a3b8; }
.st-draft { color: #f59e0b; }
.st-ingestable { color: #38bdf8; }
.st-drift { color: #ef4444; }
.drift-note { border: 1px solid #ef4444; border-left-width: 3px; background: rgba(239, 68, 68, 0.1); line-height: 1.5; }
.overlay { border: 1px solid #f59e0b; border-left-width: 3px; background: rgba(245, 158, 11, 0.08); }
.overlay code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; word-break: break-all; }
.st-unregistered { color: #ef4444; }
.prov { font-size: 0.6875rem; }
.prov code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; word-break: break-all; }
</style>
