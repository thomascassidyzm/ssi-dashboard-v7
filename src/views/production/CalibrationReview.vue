<template>
  <div class="calibration-review">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <h2 class="text-lg font-semibold text-ink">Calibration Review</h2>
        <span class="px-3 py-1 bg-surface-2/50 border border-line/50 rounded text-sm font-mono text-emerald-400">
          {{ getCourseName(courseCode) }}
        </span>
      </div>
      <div class="flex items-center gap-3 text-sm">
        <span class="text-emerald-400 font-mono">{{ summary.approved }}</span>
        <span class="text-faint">approved</span>
        <span class="text-faint">|</span>
        <span class="text-amber-400 font-mono">{{ summary.pending }}</span>
        <span class="text-faint">pending</span>
        <span class="text-faint">|</span>
        <span class="text-red-400 font-mono">{{ summary.redo }}</span>
        <span class="text-faint">redo</span>
        <span class="text-faint">|</span>
        <span class="text-muted font-mono">{{ summary.approved }}/{{ goldenSeedCount }}</span>
      </div>
    </div>

    <!-- Progress bar -->
    <div class="h-1.5 bg-surface-2/50 rounded-full overflow-hidden mb-6 flex">
      <div class="h-full bg-emerald-500 transition-all duration-500"
        :style="{ width: `${goldenSeedCount > 0 ? (summary.approved / goldenSeedCount * 100) : 0}%` }">
      </div>
      <div class="h-full bg-amber-500 transition-all duration-500"
        :style="{ width: `${goldenSeedCount > 0 ? (summary.pending / goldenSeedCount * 100) : 0}%` }">
      </div>
    </div>

    <!-- Seed navigation pills -->
    <div class="flex gap-1.5 mb-6 flex-wrap">
      <button
        v-for="draft in drafts"
        :key="draft.seed_number"
        @click="selectSeed(draft.seed_number)"
        class="w-8 h-8 rounded text-xs font-mono font-medium transition-all"
        :class="seedPillClass(draft)"
      >
        {{ draft.seed_number }}
      </button>
      <button
        v-for="n in unsubmittedSeeds"
        :key="'empty-' + n"
        class="w-8 h-8 rounded text-xs font-mono font-medium bg-surface/50 text-faint cursor-default"
      >
        {{ n }}
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="text-center py-12 text-faint">
      Loading review queue...
    </div>

    <!-- Empty state -->
    <div v-else-if="drafts.length === 0" class="text-center py-12">
      <div class="text-faint mb-2">No seeds submitted for review yet.</div>
      <div class="text-sm text-faint">The calibration agent will submit seeds here as it works.</div>
    </div>

    <!-- Selected seed review -->
    <div v-else-if="selectedDraft" class="grid grid-cols-3 gap-6">
      <!-- Left: Seed content (2 cols) -->
      <div class="col-span-2 space-y-4">
        <!-- Seed sentence -->
        <div class="bg-surface/30 border border-line/50 rounded-lg p-5">
          <div class="text-xs text-faint uppercase tracking-wide mb-2">Seed {{ selectedDraft.seed_number }}</div>
          <div class="text-ink mb-1">{{ selectedDraft.known_text }}</div>
          <div
            class="text-lg text-emerald-400 font-medium text-left"
            :dir="dirFor(selectedDraft.target_text)"
            style="unicode-bidi: isolate"
          >{{ selectedDraft.target_text }}</div>
          <div v-if="selectedDraft.attempt_number > 1" class="mt-2 text-xs text-amber-400">
            Attempt {{ selectedDraft.attempt_number }}
          </div>
        </div>

        <!-- LEGOs -->
        <div
          v-for="(lego, idx) in selectedLegos"
          :key="idx"
          class="bg-surface/30 border rounded-lg p-5"
          :class="lego.is_new === false ? 'border-line/30 opacity-70' : 'border-line/50'"
        >
          <div class="flex items-center gap-3 mb-3">
            <span class="px-2 py-0.5 rounded text-xs font-mono font-bold"
              :class="lego.type === 'M' ? 'bg-purple-500/20 text-purple-400' : 'bg-cyan-500/20 text-cyan-400'"
            >
              {{ lego.type }}
            </span>
            <span class="text-muted text-sm">{{ lego.known }}</span>
            <span class="text-faint">&rarr;</span>
            <span
              class="text-ink font-medium"
              :dir="dirFor(lego.target)"
              style="unicode-bidi: isolate"
            >{{ lego.target }}</span>
            <span v-if="lego.is_new === false" class="text-xs text-faint ml-auto">reused</span>
          </div>

          <!-- Components (M-LEGO) -->
          <div v-if="lego.components && lego.components.length" class="mb-3 pl-4 border-l-2 border-purple-500/20">
            <div class="text-xs text-faint uppercase tracking-wide mb-1">Components</div>
            <div v-for="(comp, ci) in lego.components" :key="ci" class="text-sm text-muted">
              {{ comp.known }} &rarr; <span
                class="text-ink"
                :dir="dirFor(comp.target)"
                style="unicode-bidi: isolate"
              >{{ comp.target }}</span>
            </div>
          </div>

          <!-- BUILD phrases -->
          <div v-if="buildPhrases(lego).length" class="mb-3">
            <div class="text-xs text-faint uppercase tracking-wide mb-1">BUILD</div>
            <div v-for="(p, pi) in buildPhrases(lego)" :key="'b-'+pi" class="text-sm py-0.5">
              <span class="text-muted">{{ p.known_text }}</span>
              <span class="text-faint mx-1">&rarr;</span>
              <span
                class="text-ink"
                :dir="dirFor(p.target_text)"
                style="unicode-bidi: isolate"
              >{{ p.target_text }}</span>
            </div>
          </div>

          <!-- USE phrases -->
          <div v-if="usePhrases(lego).length">
            <div class="text-xs text-faint uppercase tracking-wide mb-1">
              USE <span class="text-faint">({{ usePhrases(lego).length }})</span>
            </div>
            <div v-for="(p, pi) in usePhrases(lego)" :key="'u-'+pi" class="text-sm py-0.5">
              <span class="text-muted">{{ p.known_text }}</span>
              <span class="text-faint mx-1">&rarr;</span>
              <span
                class="text-ink"
                :dir="dirFor(p.target_text)"
                style="unicode-bidi: isolate"
              >{{ p.target_text }}</span>
              <span v-if="p.score" class="text-xs text-faint ml-2">{{ p.score }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Review controls (1 col) -->
      <div class="space-y-4">
        <!-- Status -->
        <div class="bg-surface/30 border border-line/50 rounded-lg p-5">
          <div class="text-xs text-faint uppercase tracking-wide mb-3">Review</div>

          <div v-if="selectedDraft.review_status === 'approved'" class="text-emerald-400 font-medium mb-3">
            Approved
          </div>
          <div v-else-if="selectedDraft.review_status === 'redo'" class="text-amber-400 font-medium mb-3">
            Redo requested
          </div>
          <div v-else class="text-muted text-sm mb-4">
            Awaiting your review
          </div>

          <!-- Previous reviewer notes -->
          <div v-if="selectedDraft.reviewer_notes && selectedDraft.review_status !== 'pending_review'" class="mb-4 p-3 bg-surface-2/30 rounded text-sm text-muted">
            <div class="text-xs text-faint uppercase tracking-wide mb-1">Previous notes</div>
            {{ selectedDraft.reviewer_notes }}
          </div>

          <!-- Notes textarea -->
          <textarea
            v-model="reviewNotes"
            placeholder="Notes for the agent (optional for approve, recommended for redo)..."
            class="w-full bg-surface-2/30 border border-line/50 rounded-lg px-3 py-2 text-sm text-ink placeholder-faint focus:outline-none focus:border-emerald-500/50 resize-none"
            rows="4"
          ></textarea>

          <!-- Action buttons -->
          <div class="flex gap-3 mt-4">
            <button
              @click="submitReview('approved')"
              :disabled="reviewing"
              class="flex-1 px-4 py-2.5 bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 rounded-lg hover:bg-emerald-600/30 transition-colors font-medium text-sm disabled:opacity-50"
            >
              Approve (A)
            </button>
            <button
              @click="submitReview('redo')"
              :disabled="reviewing"
              class="flex-1 px-4 py-2.5 bg-amber-600/20 border border-amber-500/50 text-amber-400 rounded-lg hover:bg-amber-600/30 transition-colors font-medium text-sm disabled:opacity-50"
            >
              Redo (R)
            </button>
          </div>
        </div>

        <!-- Keyboard shortcuts -->
        <div class="text-xs text-faint space-y-1">
          <div><kbd class="px-1.5 py-0.5 bg-surface-2/50 rounded">A</kbd> Approve</div>
          <div><kbd class="px-1.5 py-0.5 bg-surface-2/50 rounded">R</kbd> Redo</div>
          <div><kbd class="px-1.5 py-0.5 bg-surface-2/50 rounded">&larr;</kbd> <kbd class="px-1.5 py-0.5 bg-surface-2/50 rounded">&rarr;</kbd> Navigate seeds</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { getApiUrl } from '@/services/api'
import { useCourses } from '@/composables/useCourses'
import { dirFor } from '@/utils/textDirection.js'

const props = defineProps({
  courseCode: { type: String, required: true }
})

const { getCourseName } = useCourses()
const builderApiUrl = getApiUrl()

const loading = ref(true)
const reviewing = ref(false)
const drafts = ref([])
const goldenSeedCount = ref(10)
const summary = ref({ pending: 0, approved: 0, redo: 0, total: 0 })
const selectedSeed = ref(null)
const reviewNotes = ref('')
let pollInterval = null

const selectedDraft = computed(() => drafts.value.find(d => d.seed_number === selectedSeed.value))

const selectedLegos = computed(() => {
  if (!selectedDraft.value?.submission_data) return []
  const data = selectedDraft.value.submission_data
  // submission_data may be the full payload (with .legos) or just the legos array
  return data.legos || data || []
})

const unsubmittedSeeds = computed(() => {
  const submitted = new Set(drafts.value.map(d => d.seed_number))
  const result = []
  for (let i = 1; i <= goldenSeedCount.value; i++) {
    if (!submitted.has(i)) result.push(i)
  }
  return result
})

function buildPhrases(lego) {
  return (lego.phrases || []).filter(p => p.phrase_role === 'build' || p.role === 'build' || p.type === 'BUILD')
}

function usePhrases(lego) {
  return (lego.phrases || []).filter(p => p.phrase_role === 'use' || p.role === 'use' || p.type === 'USE')
}

function seedPillClass(draft) {
  const isSelected = draft.seed_number === selectedSeed.value
  const base = isSelected ? 'ring-2 ring-offset-1 ring-offset-surface' : ''
  if (draft.review_status === 'approved') return `${base} bg-emerald-500/20 text-emerald-400 ${isSelected ? 'ring-emerald-500' : 'hover:bg-emerald-500/30'}`
  if (draft.review_status === 'redo') return `${base} bg-amber-500/20 text-amber-400 ${isSelected ? 'ring-amber-500' : 'hover:bg-amber-500/30'}`
  if (draft.review_status === 'pending_review') return `${base} bg-cyan-500/20 text-cyan-400 ${isSelected ? 'ring-cyan-500' : 'hover:bg-cyan-500/30'} animate-pulse`
  return `${base} bg-surface-2/50 text-muted hover:bg-surface-2/70`
}

function selectSeed(n) {
  selectedSeed.value = n
  reviewNotes.value = ''
}

async function fetchQueue() {
  try {
    const resp = await fetch(`${builderApiUrl}/api/golden/review-queue/${props.courseCode}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (!resp.ok) throw new Error(await resp.text())
    const data = await resp.json()
    drafts.value = data.drafts || []
    goldenSeedCount.value = data.golden_seed_count || 10
    summary.value = data.summary || { pending: 0, approved: 0, redo: 0, total: 0 }

    // Auto-select first pending_review seed if nothing selected
    if (!selectedSeed.value || !drafts.value.find(d => d.seed_number === selectedSeed.value)) {
      const firstPending = drafts.value.find(d => d.review_status === 'pending_review')
      if (firstPending) selectedSeed.value = firstPending.seed_number
      else if (drafts.value.length > 0) selectedSeed.value = drafts.value[0].seed_number
    }
  } catch (err) {
    console.error('[CalibrationReview] fetch error:', err)
  } finally {
    loading.value = false
  }
}

async function submitReview(status) {
  if (!selectedDraft.value) return
  reviewing.value = true
  try {
    const resp = await fetch(`${builderApiUrl}/api/golden/review/${props.courseCode}/${selectedDraft.value.seed_number}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ status, notes: reviewNotes.value || null })
    })
    if (!resp.ok) throw new Error(await resp.text())

    reviewNotes.value = ''
    await fetchQueue()

    // Auto-advance to next pending seed
    const nextPending = drafts.value.find(d => d.review_status === 'pending_review')
    if (nextPending) selectedSeed.value = nextPending.seed_number
  } catch (err) {
    console.error('[CalibrationReview] review error:', err)
  } finally {
    reviewing.value = false
  }
}

function handleKeydown(e) {
  // Don't capture when typing in textarea
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return

  if (e.key === 'a' || e.key === 'A') {
    e.preventDefault()
    submitReview('approved')
  } else if (e.key === 'r' || e.key === 'R') {
    e.preventDefault()
    // Focus the notes textarea for redo
    const textarea = document.querySelector('.calibration-review textarea')
    if (textarea) textarea.focus()
  } else if (e.key === 'ArrowLeft') {
    navigateSeed(-1)
  } else if (e.key === 'ArrowRight') {
    navigateSeed(1)
  }
}

function navigateSeed(direction) {
  if (!drafts.value.length) return
  const currentIdx = drafts.value.findIndex(d => d.seed_number === selectedSeed.value)
  const nextIdx = Math.max(0, Math.min(drafts.value.length - 1, currentIdx + direction))
  selectedSeed.value = drafts.value[nextIdx].seed_number
  reviewNotes.value = ''
}

onMounted(() => {
  fetchQueue()
  pollInterval = setInterval(fetchQueue, 15000) // Poll every 15s
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.calibration-review {
  padding: 1.5rem;
}

kbd {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem;
}

/*
  Light-mode-only contrast fixes. The template uses hardcoded Tailwind palette
  utilities (emerald/amber/red/purple/cyan -400 text on low-opacity fills) that are
  identical in both themes; the -400 shades are illegible on light surfaces.
  Scoped under [data-theme="light"] so DARK MODE IS UNTOUCHED.
*/
:root[data-theme="light"] .calibration-review .text-emerald-400 { color: #047857; }   /* emerald-700, ~5.0:1 on white */
:root[data-theme="light"] .calibration-review .text-amber-400 { color: #b45309; }      /* amber-700, ~4.9:1 on white */
:root[data-theme="light"] .calibration-review .text-red-400 { color: #dc2626; }        /* red-600, ~4.5:1 on white */
:root[data-theme="light"] .calibration-review .text-purple-400 { color: #7e22ce; }     /* purple-700, ~5.9:1 on white */
:root[data-theme="light"] .calibration-review .text-cyan-400 { color: #0e7490; }       /* cyan-700, ~4.6:1 on white */

/* Tinted pill fills: the low-opacity /20 fills over light become near-white;
   deepen to a solid hue at ~0.14 alpha and pair with the darkened text above. */
:root[data-theme="light"] .calibration-review .bg-emerald-500\/20,
:root[data-theme="light"] .calibration-review .bg-emerald-600\/20 { background-color: rgba(5, 150, 105, 0.14); }
:root[data-theme="light"] .calibration-review .bg-amber-500\/20,
:root[data-theme="light"] .calibration-review .bg-amber-600\/20 { background-color: rgba(180, 83, 9, 0.14); }
:root[data-theme="light"] .calibration-review .bg-purple-500\/20 { background-color: rgba(126, 34, 206, 0.12); }
:root[data-theme="light"] .calibration-review .bg-cyan-500\/20 { background-color: rgba(14, 116, 144, 0.13); }

/* Action-button borders: -500/50 borders vanish on white; deepen them. */
:root[data-theme="light"] .calibration-review .border-emerald-500\/50 { border-color: rgba(4, 120, 87, 0.55); }
:root[data-theme="light"] .calibration-review .border-amber-500\/50 { border-color: rgba(180, 83, 9, 0.55); }

/* Card surfaces: bg-surface/30 + border-line/50 barely separate from canvas in
   light mode. Make cards solid white with a full-strength line + subtle shadow. */
:root[data-theme="light"] .calibration-review .bg-surface\/30 {
  background-color: var(--surface);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}
:root[data-theme="light"] .calibration-review .border-line\/50,
:root[data-theme="light"] .calibration-review .border-line\/30 { border-color: var(--line); }

/* Raised input/note/kbd chips sit on white cards; lift them off it. */
:root[data-theme="light"] .calibration-review .bg-surface-2\/30,
:root[data-theme="light"] .calibration-review .bg-surface-2\/50,
:root[data-theme="light"] .calibration-review .bg-surface-2\/70 { background-color: var(--surface-2); }

/* Faded faint tags ("reused", header chip border) — restore readable strength. */
:root[data-theme="light"] .calibration-review .bg-surface-2\/50.border-line\/50 { border-color: var(--line); }
</style>
