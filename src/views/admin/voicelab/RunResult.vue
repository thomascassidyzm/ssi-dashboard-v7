<script setup>
/**
 * One experiment's result, rendered the same way whether it has just run or is
 * being re-opened from the shelf weeks later. That sameness is the point of
 * saving runs at all — a result you cannot re-read is not a record.
 *
 * BLIND IS A PROPERTY OF THE RECORD, NOT OF THE MOMENT. For an A/B the backend
 * assigns each sentence a presentation order (`slots[].left`), so the answer
 * does not leak by position, and the labels stay hidden until Reveal is pressed
 * here. Taste is spent before the label is known, which is the only way an A/B
 * is worth running.
 */
import { ref, computed } from 'vue'
import { clipUrl } from './labApi'
import { dirFor } from '@/utils/textDirection.js'

const props = defineProps({
  experiment: { type: Object, required: true },
  /** Compact mode drops the per-gate detail — used in the side-by-side compare. */
  compact: { type: Boolean, default: false },
})

const revealed = ref(false)
const playingId = ref('')
let audioEl = null

async function play (clip) {
  if (!clip?.url) return
  if (audioEl) audioEl.pause()
  audioEl = new Audio(await clipUrl(clip.url))
  playingId.value = clip.id
  audioEl.onended = () => { playingId.value = '' }
  audioEl.play().catch(() => { playingId.value = '' })
}

const isAb = computed(() => props.experiment.kind === 'ab')
const blind = computed(() => isAb.value && props.experiment.blind !== false && !revealed.value)

function configFor (key) {
  return (props.experiment.configs || []).find((c) => c.key === key) || null
}

function describeConfig (c) {
  if (!c) return '—'
  return [c.provider, c.voiceName || c.voiceId, c.language].filter(Boolean).join(' · ')
}

/** What to call a side while it is still blind. */
function sideLabel (key, side) {
  return blind.value ? side : `${key} — ${describeConfig(configFor(key))}`
}

function clipFor (sentenceIndex, configKey) {
  return (props.experiment.clips || []).find(
    (c) => c.sentenceIndex === sentenceIndex && c.configKey === configKey) || null
}

/** Which config sits on the left for this sentence — the server decided, not us. */
function leftKey (i) {
  const slot = (props.experiment.slots || []).find((s) => s.sentenceIndex === i)
  return slot?.left || 'A'
}
function rightKey (i) {
  return leftKey(i) === 'A' ? 'B' : 'A'
}

function gateChips (clip) {
  const v = clip?.verdict
  if (!v) return []
  return (v.order || []).map((id) => {
    const g = v.gates[id]
    if (!g.applicable) return { id, cls: 'na', text: 'n/a' }
    if (g.pass === null) return { id, cls: 'unchecked', text: 'unchecked' }
    return { id, cls: g.pass ? 'pass' : 'fail', text: g.pass ? 'pass' : 'FAIL' }
  })
}

// The backend distinguishes "still rendering" from "gates still thinking" from
// "failed" on clips[].status, so the screen says which rather than inferring a
// spinner from a null verdict.
function outcomeClass (clip) {
  if (!clip || clip.status === 'failed' || clip.error) return 'fail'
  if (!clip.verdict) return 'unchecked'
  return clip.verdict.admit ? 'pass' : 'fail'
}
function outcomeText (clip) {
  if (!clip) return '—'
  if (clip.status === 'failed' || clip.error) return 'render failed'
  if (clip.status === 'pending') return 'rendering…'
  if (!clip.verdict) return 'gating…'
  return clip.verdict.outcome
}

const byConfig = computed(() => {
  const totals = props.experiment.totals?.byConfig || {}
  return (props.experiment.configs || []).map((c) => ({
    key: c.key,
    label: blind.value ? `Config ${c.key}` : describeConfig(c),
    ...(totals[c.key] || {}),
  }))
})
</script>

<template>
  <div class="vl-result">
    <div class="vl-result-head">
      <div>
        <strong>{{ experiment.title || experiment.id }}</strong>
        <span class="vl-muted"> · {{ experiment.kind }} · {{ experiment.status }}</span>
        <span v-if="experiment.rerunOf" class="vl-muted"> · re-run of {{ experiment.rerunOf }}</span>
      </div>
      <div class="vl-muted">
        {{ (experiment.clips || []).length }} clips ·
        {{ experiment.totals?.chars ?? 0 }} chars ·
        ${{ (experiment.totals?.usd ?? 0).toFixed(4) }}
        <span v-if="experiment.at"> · {{ String(experiment.at).slice(0, 16).replace('T', ' ') }}</span>
      </div>
    </div>

    <div v-if="isAb && experiment.blind !== false" class="vl-reveal">
      <button class="vl-btn" @click="revealed = !revealed">
        {{ revealed ? 'Hide the labels again' : 'Reveal which is which' }}
      </button>
      <span class="vl-muted">
        {{ revealed
          ? 'Labels shown — A and B are named against their configs.'
          : 'Blind: listen and decide first. A label is a thumb on the scale.' }}
      </span>
    </div>

    <!-- Scoreboard: how each config did across the whole run -->
    <table v-if="byConfig.length" class="vl-grid">
      <thead>
        <tr><th>config</th><th>admitted</th><th>quarantined</th><th>gate failures</th></tr>
      </thead>
      <tbody>
        <tr v-for="c in byConfig" :key="c.key">
          <td>{{ c.label }}</td>
          <td class="vl-ok">{{ c.admitted ?? 0 }}</td>
          <td :class="{ 'vl-err': (c.quarantined ?? 0) > 0 }">{{ c.quarantined ?? 0 }}</td>
          <td class="vl-muted">
            <span v-if="!c.gateFails || !Object.keys(c.gateFails).length">—</span>
            <span v-else>{{ Object.entries(c.gateFails).map(([g, n]) => `${g} ×${n}`).join(', ') }}</span>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- A/B: two sides, order chosen by the server per sentence -->
    <table v-if="isAb" class="vl-grid">
      <thead>
        <tr><th>sentence</th><th>{{ blind ? 'Left' : 'Left' }}</th><th>Right</th></tr>
      </thead>
      <tbody>
        <tr v-for="s in experiment.sentences" :key="s.i">
          <td class="vl-mono bidi-isolate" :dir="dirFor(s.text)">{{ s.text }}</td>
          <td v-for="side in [leftKey(s.i), rightKey(s.i)]" :key="side">
            <template v-if="clipFor(s.i, side)">
              <button
                class="vl-play"
                :class="{ playing: playingId === clipFor(s.i, side).id }"
                @click="play(clipFor(s.i, side))"
              >▶ {{ blind ? '' : side }}</button>
              <span class="vl-chip" :class="outcomeClass(clipFor(s.i, side))">{{ outcomeText(clipFor(s.i, side)) }}</span>
              <div v-if="!compact && !blind" class="vl-gates">
                <span v-for="g in gateChips(clipFor(s.i, side))" :key="g.id" class="vl-chip" :class="g.cls">
                  {{ g.id }}: {{ g.text }}
                </span>
              </div>
              <div v-if="clipFor(s.i, side).error" class="vl-err">{{ clipFor(s.i, side).error }}</div>
            </template>
            <span v-else class="vl-muted">rendering…</span>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- single / batch: one clip per sentence -->
    <table v-else class="vl-grid">
      <thead>
        <tr><th>sentence</th><th>clip</th><th>verdict</th><th v-if="!compact">gates</th><th>ms</th></tr>
      </thead>
      <tbody>
        <tr v-for="s in experiment.sentences" :key="s.i">
          <td class="vl-mono bidi-isolate" :dir="dirFor(s.text)">{{ s.text }}</td>
          <td>
            <button
              v-if="clipFor(s.i, 'A')"
              class="vl-play"
              :class="{ playing: playingId === clipFor(s.i, 'A').id }"
              @click="play(clipFor(s.i, 'A'))"
            >▶ play</button>
            <span v-else class="vl-muted">rendering…</span>
          </td>
          <td>
            <span class="vl-chip" :class="outcomeClass(clipFor(s.i, 'A'))">{{ outcomeText(clipFor(s.i, 'A')) }}</span>
            <div v-if="clipFor(s.i, 'A')?.error" class="vl-err">{{ clipFor(s.i, 'A').error }}</div>
            <div v-if="clipFor(s.i, 'A')?.verdict && !clipFor(s.i, 'A').verdict.admit" class="vl-muted">
              {{ clipFor(s.i, 'A').verdict.reason }}
            </div>
          </td>
          <td v-if="!compact" class="vl-gates">
            <span v-for="g in gateChips(clipFor(s.i, 'A'))" :key="g.id" class="vl-chip" :class="g.cls">
              {{ g.id }}: {{ g.text }}
            </span>
          </td>
          <td class="vl-muted">{{ clipFor(s.i, 'A')?.durationMs ?? '—' }}</td>
        </tr>
      </tbody>
    </table>

    <p v-if="experiment.caveats?.length" class="vl-caveats">
      Caveats carried with this run: {{ experiment.caveats.join(' · ') }}
    </p>
  </div>
</template>

<style scoped>
/* A directed target sentence must not drift to the other side of its cell:
   `dir` fixes the punctuation, alignment stays as it is today. */
td.vl-mono { text-align: left; }

@import './lab.css';
.vl-result-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  font-size: 0.8125rem;
  margin-bottom: 0.5rem;
}
.vl-reveal { display: flex; align-items: center; gap: 0.75rem; margin: 0.5rem 0 0.75rem; font-size: 0.78rem; }
.vl-gates { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.25rem; }
.vl-caveats { color: var(--muted); font-size: 0.72rem; font-style: italic; margin-top: 0.75rem; }
</style>
