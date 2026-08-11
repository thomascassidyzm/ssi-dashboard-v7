<template>
  <div class="cutoff-panel">
    <div class="panel-head">
      <span class="panel-icon">📖</span>
      <div>
        <h2 class="panel-title">Record in full — how far?</h2>
        <p class="panel-sub">
          Seeds 1 to your cutoff get recorded as complete whole lines — nothing cut up,
          nothing glued back together, so there are no joins to hear. Past the cutoff,
          recording carries on exactly as it does today: fast-and-slow, spliced.
        </p>
      </div>
    </div>

    <div v-if="loading" class="panel-state">Counting what's actually in this course…</div>
    <div v-else-if="error" class="panel-state error">{{ error }}</div>

    <template v-else-if="estimate">
      <!-- THE ESTIMATE. This is the whole point of the panel: nobody picks a
           cutoff without seeing what they just signed up for. -->
      <div class="estimate">
        <div class="estimate-headline">
          <div class="big-number">{{ fmt(atCutoff.distinct) }}</div>
          <div class="big-label">things to say</div>
        </div>
        <div class="estimate-headline">
          <div class="big-number">{{ hoursLabel }}</div>
          <div class="big-label">of recording</div>
        </div>
        <div class="estimate-headline" v-if="atCutoff.stillNeeded !== atCutoff.distinct">
          <div class="big-number">{{ fmt(atCutoff.stillNeeded) }}</div>
          <div class="big-label">
            still to do — {{ hours(atCutoff.hoursStillNeeded) }}
            <br /><span class="dim">the rest are already recorded for {{ estimate.role }}</span>
          </div>
        </div>
      </div>

      <div class="cutoff-control">
        <label class="control-label" for="cutoff-range">
          Cutoff: seeds 1–<strong>{{ cutoff }}</strong> of {{ estimate.lastSeed }}
          <span v-if="cutoff === 0" class="dim">— off, everything uses fast-and-slow</span>
          <span v-else-if="cutoff >= builtTo" class="dim">— everything this course has, in full</span>
        </label>
        <p v-if="builtTo < estimate.lastSeed" class="built-note">
          This course has {{ estimate.lastSeed }} seeds but real target-language text only to
          seed {{ builtTo }} — seeds {{ builtTo + 1 }}–{{ estimate.lastSeed }} are empty, so a
          cutoff past {{ builtTo }} costs nothing extra.
        </p>
        <input
          id="cutoff-range"
          v-model.number="cutoff"
          class="cutoff-range"
          type="range"
          min="0"
          :max="builtTo"
          step="1"
        />
        <div class="cutoff-row">
          <input v-model.number="cutoff" class="cutoff-number" type="number" min="0" :max="builtTo" />
          <button
            v-for="p in presets"
            :key="p"
            class="preset-btn"
            :class="{ active: cutoff === p }"
            @click="cutoff = p"
          >{{ p === 0 ? 'Off' : p === builtTo ? 'All' : p }}</button>
        </div>
      </div>

      <!-- The breakdown, so the headline number is checkable rather than trusted. -->
      <div class="breakdown" v-if="cutoff > 0">
        <span>{{ fmt(atCutoff.seedSentences) }} seed sentences</span>
        <span>{{ fmt(atCutoff.legos) }} LEGOs</span>
        <span>{{ fmt(atCutoff.buildPhrases) }} build phrases</span>
        <span>{{ fmt(atCutoff.usePhrases) }} use phrases</span>
        <span v-if="atCutoff.componentRows">{{ fmt(atCutoff.componentRows) }} component rows</span>
        <span class="dim">
          {{ fmt(atCutoff.rows) }} rows in total, {{ fmt(atCutoff.distinct) }} of them distinct —
          a line repeated across seeds is one recording, said once
        </span>
      </div>

      <div class="actions">
        <button class="save-btn" :disabled="saving || cutoff === estimate.savedCutoff" @click="save">
          {{ saving ? 'Saving…' : cutoff === estimate.savedCutoff ? 'Saved' : `Set cutoff to ${cutoff === 0 ? 'off' : `seed ${cutoff}`}` }}
        </button>
        <span v-if="savedMsg" class="saved-msg">{{ savedMsg }}</span>
      </div>

      <!-- Provenance. Kai asked to be able to confirm these are the course's real
           numbers and not a stored guess, so the row counts they came from are on
           screen next to the estimate. -->
      <p class="provenance">
        Counted live from this course:
        {{ fmt(estimate.sourceRowCounts.course_seeds) }} rows in course_seeds,
        {{ fmt(estimate.sourceRowCounts.course_legos_is_new) }} new LEGOs in course_legos,
        {{ fmt(estimate.sourceRowCounts.course_practice_phrases) }} rows in course_practice_phrases.
        Time at {{ estimate.rates.SECONDS_PER_FULL_UTTERANCE }}s per line, read once.
      </p>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { getApiUrl } from '@/services/api'

const props = defineProps({
  courseCode: { type: String, required: true },
  role: { type: String, default: 'target1' },
})

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const savedMsg = ref('')
const estimate = ref(null)
const cutoff = ref(0)

const baseUrl = () => localStorage.getItem('api_base_url') || getApiUrl()
const FETCH_HEADERS = { 'ngrok-skip-browser-warning': 'true' }

const fmt = (n) => (n ?? 0).toLocaleString('en-GB')

// Zero is a real answer here ("off"), so the empty point has to be a real object
// rather than a null the template has to guard on every line.
const ZERO = {
  distinct: 0, rows: 0, stillNeeded: 0, hours: 0, hoursStillNeeded: 0, hoursIfEveryRow: 0,
  seedSentences: 0, legos: 0, buildPhrases: 0, usePhrases: 0, componentRows: 0,
}

// The whole curve arrives in one response, so dragging the slider costs nothing
// and every value on screen still comes from the DB read, not from arithmetic on
// a headline figure.
const atCutoff = computed(() => {
  if (!estimate.value || cutoff.value < 1) return ZERO
  let match = ZERO
  for (const point of estimate.value.curve) {
    if (point.seed <= cutoff.value) match = point
    else break
  }
  return match
})

// Where the course actually stops having anything to say. Presets and the "all"
// end of the dial aim here, not at a seed count padded with empty rows.
const builtTo = computed(() => estimate.value?.lastContentSeed || estimate.value?.lastSeed || 0)

const presets = computed(() => {
  if (!estimate.value) return []
  const last = builtTo.value
  return [0, 10, 25, 50, 100, 200, last].filter((p, i, a) => p <= last && a.indexOf(p) === i)
})

function hours(h) {
  if (!h) return '0 min'
  if (h < 1) return `${Math.round(h * 60)} min`
  return `${h.toFixed(1)} h`
}
const hoursLabel = computed(() => hours(atCutoff.value.hours))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(
      `${baseUrl()}/api/production/${props.courseCode}/recording-estimate?role=${props.role}`,
      { headers: FETCH_HEADERS }
    )
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `Could not load the estimate (${res.status})`)
    }
    estimate.value = await res.json()
    cutoff.value = estimate.value.savedCutoff || 0
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  savedMsg.value = ''
  try {
    const res = await fetch(
      `${baseUrl()}/api/production/${props.courseCode}/record-full-cutoff`,
      {
        method: 'PATCH',
        headers: { ...FETCH_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxSeed: cutoff.value }),
      }
    )
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `Could not save the cutoff (${res.status})`)
    }
    const data = await res.json()
    estimate.value = { ...estimate.value, savedCutoff: data.maxSeed }
    cutoff.value = data.maxSeed
    savedMsg.value = data.maxSeed === 0
      ? 'Cutoff off — this course records fast-and-slow throughout.'
      : `Seeds 1–${data.maxSeed} will be recorded in full from now on.`
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

watch(() => [props.courseCode, props.role], load)
onMounted(load)
</script>

<style scoped>
.cutoff-panel {
  grid-column: 1 / -1;
  background: linear-gradient(135deg, var(--color-shadow, var(--surface)), var(--color-slate, var(--surface-2)));
  border: 2px solid var(--color-graphite, var(--surface-3));
  border-radius: 16px;
  padding: 2rem;
}

:root[data-theme="light"] .cutoff-panel {
  border-color: var(--line);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(15, 23, 42, 0.05);
}

.panel-head {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.panel-icon { font-size: 2rem; }

.panel-title {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-paper, var(--ink));
  margin: 0 0 0.35rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.panel-sub {
  color: var(--color-paper-dim, var(--muted));
  font-size: 0.9rem;
  line-height: 1.6;
  margin: 0;
  max-width: 70ch;
}

.panel-state {
  color: var(--color-paper-dim, var(--muted));
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem;
}

.panel-state.error { color: #ff6b6b; }

.estimate {
  display: flex;
  flex-wrap: wrap;
  gap: 2.5rem;
  padding: 1.25rem 0 1.5rem;
}

.big-number {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 2.75rem;
  font-weight: 700;
  line-height: 1;
  color: var(--color-tungsten, var(--accent));
}

.big-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-paper-dim, var(--muted));
  margin-top: 0.4rem;
}

.dim { color: var(--color-paper-dim, var(--muted)); text-transform: none; letter-spacing: 0; }

.control-label {
  display: block;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem;
  color: var(--color-paper, var(--ink));
  margin-bottom: 0.6rem;
}

.cutoff-range { width: 100%; accent-color: var(--color-tungsten, var(--accent)); }

.cutoff-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.75rem;
}

.cutoff-number {
  width: 6rem;
  padding: 0.4rem 0.6rem;
  background: var(--surface-2, rgba(255, 255, 255, 0.04));
  border: 1px solid var(--color-graphite, var(--line));
  border-radius: 6px;
  color: var(--color-paper, var(--ink));
  font-family: 'IBM Plex Mono', monospace;
}

.preset-btn {
  padding: 0.4rem 0.75rem;
  background: transparent;
  border: 1px solid var(--color-graphite, var(--line));
  border-radius: 6px;
  color: var(--color-paper-dim, var(--muted));
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8rem;
  cursor: pointer;
}

.preset-btn.active,
.preset-btn:hover {
  border-color: var(--color-tungsten, var(--accent));
  color: var(--color-tungsten, var(--accent));
}

.breakdown {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.25rem;
  margin-top: 1.25rem;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8rem;
  color: var(--color-paper, var(--ink));
}

.breakdown .dim { flex-basis: 100%; }

.built-note {
  margin: 0.6rem 0 0;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  line-height: 1.6;
  color: var(--color-paper-dim, var(--muted));
}

.actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}

.save-btn {
  padding: 0.625rem 1.25rem;
  background: var(--color-tungsten, var(--accent));
  border: 1px solid var(--color-tungsten, var(--accent));
  border-radius: 8px;
  color: var(--color-void, var(--canvas));
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem;
  cursor: pointer;
}

.save-btn:disabled { opacity: 0.5; cursor: default; }

.saved-msg {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8rem;
  color: var(--color-emerald, #06ffa5);
}

:root[data-theme="light"] .saved-msg { color: #0f7a4f; }

.provenance {
  margin: 1.5rem 0 0;
  padding-top: 1rem;
  border-top: 1px solid var(--color-graphite, var(--line));
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.72rem;
  line-height: 1.7;
  color: var(--color-paper-dim, var(--muted));
}
</style>
