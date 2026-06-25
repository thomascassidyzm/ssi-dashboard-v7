<template>
  <div class="speaking-admin">
    <header class="admin-header">
      <nav class="admin-crumbs">
        <router-link to="/" class="crumb-link">Home</router-link>
        <span class="crumb-sep">/</span>
        <router-link to="/admin/configs" class="crumb-link">Configs</router-link>
        <span class="crumb-sep">/</span>
        <span class="crumb-here">Speaking</span>
      </nav>
      <div class="admin-head-main">
        <div class="admin-head-titles">
          <h1>Speaking config</h1>
          <p class="sub">
            The speaking practice script + playback timing — per-round phrase
            counts, the Fibonacci spaced-rep schedule, and the Turbo / Normal
            playback modes. Global: every course, every learner. Changes
            propagate to new sessions within ~5 min (cache TTL).
          </p>
        </div>
      </div>
      <span v-if="!isAdmin && currentUser" class="admin-warn">
        Signed in as {{ currentUser.email }} (not admin) — saves will fail.
      </span>
    </header>

    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="loadError" class="err"><strong>Failed to load:</strong> {{ loadError }}</div>

    <div v-else class="rows">
      <!-- ==================== SCRIPT SHAPE ==================== -->
      <section v-if="drafts.script_shape" class="config-row">
        <RowHeader
          title="Script shape"
          desc="Per-round phrase counts and the Fibonacci spaced-rep schedule. Changing these reshapes every round generated after the change."
          :row="rowMap.script_shape"
          :dirty="isDirty('script_shape')"
          :saving="savingKey === 'script_shape'"
          :error="rowErrors.script_shape"
          @save="save('script_shape')"
          @reset="reset('script_shape')"
        />

        <div class="field-block">
          <label>Spaced-rep offsets <span class="hint">comma-separated, ascending</span></label>
          <NumListField :modelValue="drafts.script_shape.spacedRepOffsets" @update:modelValue="drafts.script_shape.spacedRepOffsets = $event" />
        </div>

        <div class="field-grid">
          <NumField v-model="drafts.script_shape.maxBuildPhrases" label="Max BUILD phrases" suffix="per round" />
          <NumField v-model="drafts.script_shape.useConsolidationCount" label="USE consolidation count" suffix="per LEGO" />
          <NumField v-model="drafts.script_shape.maxSpacedRepPhrases" label="Max spaced-rep phrases" suffix="per round" />
          <NumField v-model="drafts.script_shape.n1PhraseCount" label="N-1 phrase count" suffix="reps"
            help="Phrases at the N-1 review (1st-back). Other offsets get 1." />
        </div>
      </section>

      <!-- ==================== TURBO (script-side culling) ==================== -->
      <section v-if="drafts.turbo_boost" class="config-row">
        <RowHeader
          title="Turbo boost — script culling"
          desc="What Turbo drops on the script side. fibKeep gates which fib-offset spaced-rep cycles survive; BUILD/USE keep cap phrases per LEGO. (Turbo's pause timing lives in the Pause lab below.)"
          :row="rowMap.turbo_boost"
          :dirty="isDirty('turbo_boost')"
          :saving="savingKey === 'turbo_boost'"
          :error="rowErrors.turbo_boost"
          @save="save('turbo_boost')"
          @reset="reset('turbo_boost')"
        />

        <div class="field-block" v-if="scriptShapeOffsets.length">
          <label>Fib offsets Turbo keeps <span class="hint">tap to toggle</span></label>
          <div class="fib-row">
            <button
              v-for="(off, idx) in scriptShapeOffsets" :key="idx"
              class="fib-pill"
              :class="{ on: (drafts.turbo_boost.fibKeep || []).includes(idx) }"
              @click="toggleFib(idx)"
            >N-{{ off }}</button>
          </div>
        </div>

        <div class="field-grid">
          <NumField v-model="drafts.turbo_boost.buildKeep" label="BUILD keep" suffix="phrases"
            help="Turbo plays the first N BUILD phrases per LEGO; the rest get tagged for skip." />
          <NumField v-model="drafts.turbo_boost.useKeep" label="USE keep" suffix="phrases"
            help="Turbo plays the first N USE phrases per LEGO." />
        </div>
      </section>

      <!-- ==================== PAUSE LAB ==================== -->
      <section v-if="labCfg" class="config-row">
        <RowHeader
          :title="`Pause lab — ${labMode === 'normal_mode' ? 'Normal' : 'Turbo'} timing`"
          desc="The learner 'say-it-yourself' gap. Tweak the knobs and watch the pause across sentence lengths (in syllables — a far better length proxy than words). pause = clamp(floor, ceiling, base + shaped(reference)), where the knee lets long sentences stop scaling at the full multiplier."
          :row="rowMap[labMode]"
          :dirty="isDirty(labMode)"
          :saving="savingKey === labMode"
          :error="rowErrors[labMode]"
          @save="save(labMode)"
          @reset="reset(labMode)"
        />

        <div class="lab-modeswitch">
          <button :class="{ on: labMode === 'normal_mode' }" @click="labMode = 'normal_mode'">Normal</button>
          <button :class="{ on: labMode === 'turbo_boost' }" @click="labMode = 'turbo_boost'">Turbo</button>
        </div>

        <!-- Reference: what duration the pause scales with -->
        <div class="field-block">
          <label>Scale pause with <span class="hint">which spoken duration drives the gap</span></label>
          <div class="seg-row">
            <button class="seg-pill" :class="{ on: (labCfg.pause_reference || 'sum') === 'avg' }" @click="labCfg.pause_reference = 'avg'">Average of both voices</button>
            <button class="seg-pill" :class="{ on: (labCfg.pause_reference || 'sum') === 'target1' }" @click="labCfg.pause_reference = 'target1'">target1 only</button>
            <button class="seg-pill" :class="{ on: (labCfg.pause_reference || 'sum') === 'sum' }" @click="labCfg.pause_reference = 'sum'">Both summed (legacy)</button>
          </div>
        </div>

        <div class="field-grid">
          <NumField v-model="labCfg.min_pause_ms" label="Floor (boot / reaction)" suffix="ms"
            help="Hard minimum — the pause can never go below this, however short the phrase." />
          <NumField v-model="labCfg.pause_base_ms" label="Base" suffix="ms"
            help="Flat amount added before the length-proportional part." />
          <NumField v-model="labCfg.pause_multiplier" label="Multiplier (short/med)" suffix="× ref dur" :step="0.05"
            help="Slope up to the knee — how much pause per ms of reference duration." />
          <NumField v-model="labCfg.pause_knee_ms" label="Knee" suffix="ms ref"
            help="Reference-duration point where the slope relaxes. Below it = full multiplier; above it = the gentler tail multiplier. Set very high for a straight line." />
          <NumField v-model="labCfg.pause_tail_multiplier" label="Tail multiplier (long)" suffix="× ref dur" :step="0.05"
            help="Gentler slope beyond the knee, so long sentences don't keep scaling at the full rate." />
          <NumField v-model="labCfg.max_pause_ms" label="Ceiling" suffix="ms"
            help="Hard maximum the pause is clamped to." />
        </div>

        <!-- Live preview across syllable buckets -->
        <div class="lab-preview">
          <div class="lab-preview-head">
            <span class="lab-preview-title">Live preview · {{ labMode === 'normal_mode' ? 'Normal' : 'Turbo' }}</span>
            <label class="lab-rate">~ms / syllable
              <input type="number" min="50" step="10" v-model.number="msPerSyllable" />
            </label>
            <span class="lab-rate-note">at {{ (labCfg.playback_speed || 1) }}× playback · each voice ≈ syllables × this</span>
          </div>

          <div class="lab-buckets">
            <div v-for="b in previewBuckets" :key="b.key" class="lab-bucket">
              <div class="lab-bucket-label">{{ b.label }} <span class="lab-bucket-range">{{ b.range }}</span></div>
              <div class="lab-rows">
                <div v-for="r in b.rows" :key="r.syll" class="lab-bar-row">
                  <span class="lab-syll">{{ r.syll }} syl</span>
                  <div class="lab-track">
                    <div class="lab-floor" :style="{ left: pct(labCfg.min_pause_ms) }" title="floor"></div>
                    <div class="lab-bar" :class="{ atfloor: r.pause <= (labCfg.min_pause_ms || 0), atceil: r.pause >= (labCfg.max_pause_ms || Infinity) }" :style="{ width: pct(r.pause) }"></div>
                  </div>
                  <span class="lab-pause">{{ (r.pause / 1000).toFixed(1) }}s</span>
                </div>
              </div>
            </div>
          </div>
          <div class="lab-axis">
            <span>0s</span><span>floor {{ ((labCfg.min_pause_ms||0)/1000).toFixed(1) }}s</span><span>{{ (labAxisMaxMs/1000).toFixed(0) }}s</span>
          </div>
        </div>

        <!-- Audible preview — hear the gap on real sentences -->
        <div class="lab-hear">
          <div class="lab-hear-head">
            <span class="lab-hear-title">Hear it</span>
            <CoursePicker :modelValue="previewCourse" @update:modelValue="onPreviewCourse" placeholder="Pick a course to hear real sentences…" />
            <span v-if="playingPhase" class="lab-phase" :class="`ph-${playingPhase}`">
              {{ playingPhase === 'known' ? '▶ prompt' : playingPhase === 'pause' ? '● your turn — speak' : playingPhase === 'target1' ? '▶ answer 1' : '▶ answer 2' }}
            </span>
            <button v-if="playingPhase" class="lab-stop" @click="stopPreview">■ stop</button>
          </div>
          <div v-if="sampleLoading" class="lab-hear-note">Loading sentences…</div>
          <div v-else-if="sampleError" class="lab-hear-err">{{ sampleError }}</div>
          <div v-else-if="previewCourse && sampleSentences.length" class="lab-hear-rows">
            <div v-for="b in sampleByBucket" :key="b.key" class="lab-hear-row">
              <button
                class="lab-play"
                :class="{ playing: playingKey === b.key }"
                :disabled="!b.sentence"
                @click="playWithPause(b.sentence, b.key)"
                :title="b.sentence ? 'Play known → pause → target1 → target2' : 'No sentence in this length range'"
              >▶</button>
              <span class="lab-hear-bucket">{{ b.label }} <span class="lab-bucket-range">{{ b.range }}</span></span>
              <span class="lab-hear-sentence">{{ b.sentence ? b.sentence.text : '—' }}</span>
              <span class="lab-hear-pause">
                <span v-if="b.sentence" class="lab-hear-dur">{{ (b.sentence.t1ms / 1000).toFixed(1) }}s say</span>
                <span v-if="b.sentence" class="lab-hear-gap">{{ (computePauseFor(b.sentence) / 1000).toFixed(1) }}s gap</span>
              </span>
            </div>
          </div>
          <div v-else-if="previewCourse" class="lab-hear-note">No playable sentences found for this course.</div>
          <div v-else class="lab-hear-note">Pick a course to hear the configured pause on real sentences.</div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { useAlgorithmConfig, NumField, NumListField, RowHeader } from './algorithmConfigShared'
import { pauseFromRef, referenceMs, computePauseDuration, SYLLABLE_BUCKETS } from './pauseModel'
import CoursePicker from '../../components/CoursePicker.vue'
import { getApiBaseUrl } from '../../services/api'

const { isAdmin, learner: currentUser } = useAuth()

const {
  loading, loadError, savingKey, rowErrors,
  drafts, rowMap, isDirty, reset, save, loadAll,
} = useAlgorithmConfig({ onLoaded: backfillPause, onReset: backfillPauseRow })

// The pause model gained a knee + tail multiplier + reference selector
// (2026-06-25). Rows saved before that lack the fields; backfill them to values
// that REPRODUCE the old linear behaviour (knee huge, tail = multiplier,
// reference = 'sum'), so the runtime is untouched until an admin deliberately
// tunes in the lab and saves.
function backfillPauseRow(key, d) {
  const c = d[key]
  if (!c) return
  if (c.pause_reference == null) c.pause_reference = 'sum'
  if (c.pause_knee_ms == null) c.pause_knee_ms = 99999
  if (c.pause_tail_multiplier == null) c.pause_tail_multiplier = c.pause_multiplier ?? 0
}
function backfillPause(d) {
  backfillPauseRow('normal_mode', d)
  backfillPauseRow('turbo_boost', d)
}

// Turbo's fibKeep is an index list into the script-shape offsets, so the pills
// read their labels off the live script_shape draft (same endpoint, same load).
const scriptShapeOffsets = computed(() => drafts.script_shape?.spacedRepOffsets || [])
function toggleFib(idx) {
  const tb = drafts.turbo_boost
  if (!tb) return
  const set = new Set(tb.fibKeep || [])
  if (set.has(idx)) set.delete(idx)
  else set.add(idx)
  tb.fibKeep = [...set].sort((a, b) => a - b)
}

// ============================================================================
// Pause lab — tweak a mode's pause knobs and see the resulting gap across
// syllable-bucketed sentence lengths. msPerSyllable maps a syllable count to an
// estimated per-voice audio duration (preview only; the runtime uses real clip
// durations). Default ~280ms/syll for slow SSi learner audio — tunable.
// ============================================================================
const labMode = ref('normal_mode')
const msPerSyllable = ref(280)
const labCfg = computed(() => drafts[labMode.value] || null)

// Per syllable count, estimate each answer voice's duration then run the live
// (unsaved) config through the real pause formula.
function pauseForSyllables(syll) {
  const cfg = labCfg.value
  if (!cfg) return 0
  const perVoiceMs = syll * (msPerSyllable.value || 0)
  const ref = referenceMs(perVoiceMs, perVoiceMs, cfg)
  return pauseFromRef(ref, cfg)
}

const previewBuckets = computed(() =>
  SYLLABLE_BUCKETS.map(b => ({
    ...b,
    rows: b.samples.map(syll => ({ syll, pause: pauseForSyllables(syll) })),
  }))
)

// Axis scales to the longest previewed pause (or the ceiling, whichever the
// bars actually reach), so the floor/ceiling markers stay meaningful.
const labAxisMaxMs = computed(() => {
  const cfg = labCfg.value
  if (!cfg) return 10000
  const maxPause = Math.max(...previewBuckets.value.flatMap(b => b.rows.map(r => r.pause)), cfg.min_pause_ms || 0)
  return Math.max(maxPause * 1.05, 1000)
})
function pct(ms) {
  return `${Math.max(0, Math.min(100, (100 * (ms || 0)) / labAxisMaxMs.value))}%`
}

// ============================================================================
// Audible preview — hear the gap. Plays a real sentence as the learner does:
// known prompt → THE LIVE-CONFIG PAUSE (computed from the real clip durations)
// → target1 → target2. Pick a course, pick a length, press play, feel it.
// Audio plays via popty's own production API signed-URL endpoint
// (/api/production/:course/audio/:uuid/url) — the SAME source ScriptView uses,
// so it just works on popty.app (no external proxy / CORS).
// ============================================================================
const previewCourse = ref('')
const sampleLoading = ref(false)
const sampleError = ref('')
const sampleSentences = ref([])   // { text, known_id, t1_id, t2_id, t1ms, t2ms, syll }
const playingPhase = ref('')      // '', 'known', 'pause', 'target1', 'target2'
const playingKey = ref('')        // which sample is sounding

async function onPreviewCourse(code) {
  previewCourse.value = code || ''
  sampleSentences.value = []
  sampleError.value = ''
  signedUrlCache.clear()
  if (!code) return
  sampleLoading.value = true
  try {
    const sb = await import('../../services/supabase').then(m => m.supabase)
    if (!sb) throw new Error('Supabase not configured')
    const { data: seeds, error } = await sb
      .from('course_seeds')
      .select('seed_number, known_text, target_text, target_text_roman, known_audio_id, target1_audio_id, target2_audio_id')
      .eq('course_code', code)
      .not('target1_audio_id', 'is', null)
      .order('seed_number')
      .limit(300)
    if (error) throw error
    // Pull target1/target2 durations (the pause is computed from these).
    const ids = [...new Set((seeds || []).flatMap(s => [s.target1_audio_id, s.target2_audio_id]).filter(Boolean))]
    const durMap = new Map()
    for (let i = 0; i < ids.length; i += 200) {
      const { data: aud } = await sb.from('course_audio').select('id, duration_ms').in('id', ids.slice(i, i + 200))
      for (const a of (aud || [])) durMap.set(a.id, a.duration_ms)
    }
    sampleSentences.value = (seeds || [])
      .map(s => {
        const t1ms = durMap.get(s.target1_audio_id) || 0
        const t2ms = durMap.get(s.target2_audio_id) || t1ms
        return {
          text: s.target_text_roman || s.target_text || s.known_text || `S${s.seed_number}`,
          known_id: s.known_audio_id, t1_id: s.target1_audio_id, t2_id: s.target2_audio_id,
          t1ms, t2ms,
          syll: Math.max(1, Math.round(t1ms / (msPerSyllable.value || 280))),
        }
      })
      .filter(s => s.t1ms > 0)
  } catch (e) {
    sampleError.value = e.message || String(e)
  } finally {
    sampleLoading.value = false
  }
}

// One DISTINCT real sentence per length bucket. Buckets are defined by spoken
// length; we map the syllable range to a target1-duration range via the rate,
// then greedily assign each bucket the closest UNUSED sentence so no two
// buckets show the same clip.
const sampleByBucket = computed(() => {
  const rate = msPerSyllable.value || 280
  const used = new Set()
  return SYLLABLE_BUCKETS.map(b => {
    const lo = b.samples[0], hi = b.samples[b.samples.length - 1]
    const mid = ((lo + hi) / 2) * rate           // target centre duration (ms)
    const loMs = lo * rate, hiMs = b.key === 'vlong' ? Infinity : hi * rate
    const free = sampleSentences.value.filter(s => !used.has(s))
    const inRange = free.filter(s => s.t1ms >= loMs && s.t1ms <= hiMs)
    const pool = inRange.length ? inRange : free
    let best = null, bestD = Infinity
    for (const s of pool) { const d = Math.abs(s.t1ms - mid); if (d < bestD) { bestD = d; best = s } }
    if (best) used.add(best)
    return { ...b, sentence: best }
  })
})

// Live pause (ms) for a real sentence under the current unsaved config — for
// the per-row readout next to each play button.
function computePauseFor(sample) {
  return labCfg.value ? computePauseDuration(sample.t1ms, sample.t2ms, labCfg.value) : 0
}

// Signed playback URL via popty's production API (same as ScriptView). Cached
// per uuid for the session so replays don't refetch.
const signedUrlCache = new Map()
async function audioUrl(id) {
  if (!id || !previewCourse.value) return null
  if (signedUrlCache.has(id)) return signedUrlCache.get(id)
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/api/production/${previewCourse.value}/audio/${id}/url`,
      { headers: { 'ngrok-skip-browser-warning': 'true' } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const url = data.url || null
    if (url) signedUrlCache.set(id, url)
    return url
  } catch { return null }
}
let previewAudio = null
let previewStop = false
function stopPreview() {
  previewStop = true
  playingPhase.value = ''
  playingKey.value = ''
  if (previewAudio) { try { previewAudio.pause() } catch {} }
}
async function playClip(id, rate) {
  const url = await audioUrl(id)
  if (!url || previewStop) return
  return new Promise((resolve) => {
    const a = new Audio(url)
    a.playbackRate = rate || 1
    previewAudio = a
    a.onended = resolve
    a.onerror = resolve
    a.play().catch(resolve)
  })
}
// Play one sentence as the learner hears it, with the LIVE (unsaved) pause.
async function playWithPause(sample, key) {
  if (!sample || !labCfg.value) return
  stopPreview()
  previewStop = false
  playingKey.value = key
  const rate = labCfg.value.playback_speed || 1
  const pauseMs = computePauseDuration(sample.t1ms, sample.t2ms, labCfg.value)
  playingPhase.value = 'known'
  await playClip(sample.known_id, rate)
  if (previewStop) return
  playingPhase.value = 'pause'                       // the gap under test
  await new Promise(r => setTimeout(r, pauseMs))
  if (previewStop) return
  playingPhase.value = 'target1'
  await playClip(sample.t1_id, rate)
  if (previewStop) return
  await new Promise(r => setTimeout(r, 250))
  if (previewStop) return
  playingPhase.value = 'target2'
  await playClip(sample.t2_id, rate)
  playingPhase.value = ''
  playingKey.value = ''
}

onMounted(loadAll)
</script>

<style scoped>
.speaking-admin {
  padding: 1.5rem;
  max-width: 1100px;
  margin: 0 auto;
  color: var(--color-paper, var(--ink));
}

.admin-header {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.admin-crumbs { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; }
.admin-crumbs .crumb-link { color: var(--accent-2); text-decoration: none; }
.admin-crumbs .crumb-link:hover { color: #6ee7b7; }
.admin-crumbs .crumb-sep { color: var(--surface-3); }
.admin-crumbs .crumb-here { color: var(--muted); }
.admin-head-main { display: flex; align-items: flex-start; gap: 1rem; }
.admin-head-titles { flex: 1; min-width: 0; }
h1 { font-size: 1.25rem; margin: 0 0 0.25rem; letter-spacing: -0.01em; }
.sub { margin: 0; color: var(--color-paper-dim, var(--muted)); font-size: 0.875rem; line-height: 1.5; max-width: 700px; }
.admin-warn {
  background: rgba(251, 146, 60, 0.12);
  border: 1px solid rgba(251, 146, 60, 0.3);
  color: #fbbf24;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8125rem;
}

.loading, .err {
  padding: 2rem;
  text-align: center;
  color: var(--color-paper-dim, var(--muted));
}
.err { color: #f87171; background: rgba(248, 113, 113, 0.08); border-radius: 8px; }

.rows { display: flex; flex-direction: column; gap: 1.25rem; }
.config-row {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--color-graphite, var(--surface-2));
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
}

/* RowHeader */
:deep(.row-header) { margin-bottom: 1.25rem; }
:deep(.row-title-line) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
:deep(.row-title-line h2) { margin: 0; font-size: 1rem; letter-spacing: -0.01em; }
:deep(.row-actions) { display: flex; gap: 0.5rem; }
:deep(.row-meta) {
  margin-top: 0.25rem;
  font-size: 0.7rem;
  color: var(--color-paper-dim, var(--muted));
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
}
:deep(.row-desc) {
  margin: 0.5rem 0 0;
  color: var(--color-paper-dim, var(--muted));
  font-size: 0.8125rem;
  line-height: 1.5;
}
:deep(.save-err) {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.3);
  color: #f87171;
  font-size: 0.8125rem;
}

/* Field block + grid */
.field-block { margin-bottom: 1rem; }
.field-block label,
.field-block > label {
  display: block;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-paper-dim, var(--muted));
  margin-bottom: 0.5rem;
}
.hint {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
  color: var(--color-paper-dim, var(--faint));
  margin-left: 0.5rem;
  font-size: 0.7rem;
}
.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem 1rem;
}

/* NumField */
:deep(.num-field) { display: flex; flex-direction: column; }
:deep(.num-field label) {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-paper-dim, var(--muted));
  margin-bottom: 0.25rem;
}
:deep(.num-input-wrap) {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--color-graphite, var(--surface-2));
  border-radius: 6px;
  overflow: hidden;
}
:deep(.num-input-wrap:focus-within) { border-color: #60a5fa; }
:deep(.num-input-wrap input) {
  flex: 1;
  background: transparent;
  border: 0;
  outline: none;
  color: var(--color-paper, var(--ink));
  padding: 0.5rem 0.75rem;
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  font-size: 0.875rem;
}
:deep(.suffix) {
  padding: 0 0.75rem;
  font-size: 0.75rem;
  color: var(--color-paper-dim, var(--muted));
  white-space: nowrap;
}

/* NumListField */
:deep(.num-list-input) {
  width: 100%;
  background: rgba(0, 0, 0, 0.25);
  color: var(--color-paper, var(--ink));
  border: 1px solid var(--color-graphite, var(--surface-2));
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  font-size: 0.875rem;
  outline: none;
  box-sizing: border-box;
}
:deep(.num-list-input:focus) { border-color: #60a5fa; }

/* Fib pills */
.fib-row { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.fib-pill {
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--color-graphite, var(--surface-3));
  background: transparent;
  color: var(--color-paper-dim, var(--muted));
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}
.fib-pill:hover { color: var(--color-paper, var(--ink)); border-color: var(--color-paper-dim, var(--muted)); }
.fib-pill.on { background: rgba(96, 165, 250, 0.15); border-color: #60a5fa; color: #93c5fd; }

/* Mode switch + segmented pills */
.lab-modeswitch { display: inline-flex; gap: 0; border: 1px solid var(--color-graphite, var(--surface-3)); border-radius: 8px; overflow: hidden; margin-bottom: 1rem; }
.lab-modeswitch button {
  background: transparent; border: 0; color: var(--color-paper-dim, var(--muted));
  padding: 0.4rem 1rem; font-size: 0.8125rem; cursor: pointer;
}
.lab-modeswitch button.on { background: #3b82f6; color: #fff; }
.seg-row { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.seg-pill {
  padding: 0.4rem 0.8rem; border-radius: 999px;
  border: 1px solid var(--color-graphite, var(--surface-3)); background: transparent;
  color: var(--color-paper-dim, var(--muted)); font-size: 0.75rem; cursor: pointer; transition: all 0.15s;
}
.seg-pill:hover { color: var(--color-paper, var(--ink)); border-color: var(--color-paper-dim, var(--muted)); }
.seg-pill.on { background: rgba(96, 165, 250, 0.15); border-color: #60a5fa; color: #93c5fd; }

/* Lab preview */
.lab-preview {
  margin-top: 1.25rem;
  padding: 1rem 1.25rem;
  background: rgba(96, 165, 250, 0.06);
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: 8px;
}
.lab-preview-head { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.85rem; }
.lab-preview-title {
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: #93c5fd;
}
.lab-rate { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; color: var(--color-paper-dim, var(--muted)); }
.lab-rate input {
  width: 72px; background: rgba(0,0,0,0.25); border: 1px solid var(--color-graphite, var(--surface-2));
  border-radius: 6px; color: var(--color-paper, var(--ink)); padding: 0.3rem 0.45rem;
  font-family: var(--font-mono, ui-monospace, Menlo, monospace); font-size: 0.8125rem; outline: none;
}
.lab-rate-note { font-size: 0.72rem; color: var(--color-paper-dim, var(--faint)); }
.lab-buckets { display: flex; flex-direction: column; gap: 0.85rem; }
.lab-bucket-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-paper-dim, var(--muted)); margin-bottom: 0.3rem; }
.lab-bucket-range { text-transform: none; letter-spacing: 0; color: var(--color-paper-dim, var(--faint)); margin-left: 0.3rem; }
.lab-rows { display: flex; flex-direction: column; gap: 0.25rem; }
.lab-bar-row { display: grid; grid-template-columns: 52px 1fr 44px; align-items: center; gap: 0.5rem; }
.lab-syll { font-family: var(--font-mono, ui-monospace, Menlo, monospace); font-size: 0.72rem; color: var(--color-paper-dim, var(--muted)); text-align: right; }
.lab-track { position: relative; height: 16px; background: rgba(0,0,0,0.22); border-radius: 4px; overflow: hidden; }
.lab-bar { height: 100%; background: #3b82f6; border-radius: 4px; transition: width 0.12s ease; }
.lab-bar.atfloor { background: #f59e0b; }
.lab-bar.atceil { background: #ef4444; }
.lab-floor { position: absolute; top: 0; bottom: 0; width: 0; border-left: 1px dashed rgba(255,255,255,0.45); z-index: 2; }
.lab-pause { font-family: var(--font-mono, ui-monospace, Menlo, monospace); font-size: 0.78rem; color: var(--color-paper, var(--ink)); }
.lab-axis { display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.68rem; color: var(--color-paper-dim, var(--faint)); font-family: var(--font-mono, ui-monospace, Menlo, monospace); }

/* Audible preview */
.lab-hear { margin-top: 1rem; padding-top: 0.85rem; border-top: 1px dashed var(--color-graphite, var(--surface-3)); }
.lab-hear-head { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.6rem; }
.lab-hear-title { font-family: var(--font-mono, ui-monospace, Menlo, monospace); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: #93c5fd; }
.lab-phase { font-size: 0.75rem; font-family: var(--font-mono, ui-monospace, Menlo, monospace); padding: 0.2rem 0.55rem; border-radius: 999px; }
.lab-phase.ph-pause { background: rgba(245, 158, 11, 0.18); color: #fbbf24; animation: labpulse 1s ease-in-out infinite; }
.lab-phase.ph-known, .lab-phase.ph-target1, .lab-phase.ph-target2 { background: rgba(96, 165, 250, 0.18); color: #93c5fd; }
@keyframes labpulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
.lab-stop { background: transparent; border: 1px solid var(--color-graphite, var(--surface-3)); color: var(--color-paper-dim, var(--muted)); border-radius: 6px; padding: 0.25rem 0.6rem; font-size: 0.75rem; cursor: pointer; }
.lab-stop:hover { border-color: #f87171; color: #f87171; }
.lab-hear-note, .lab-hear-err { font-size: 0.8rem; color: var(--color-paper-dim, var(--muted)); padding: 0.3rem 0; }
.lab-hear-err { color: #f87171; }
.lab-hear-rows { display: flex; flex-direction: column; gap: 0.35rem; }
.lab-hear-row { display: grid; grid-template-columns: 32px 130px 1fr auto; align-items: center; gap: 0.6rem; }
.lab-play {
  width: 28px; height: 28px; border-radius: 999px;
  border: 1px solid #60a5fa; background: rgba(96,165,250,0.12); color: #93c5fd;
  cursor: pointer; font-size: 0.7rem; display: inline-flex; align-items: center; justify-content: center;
}
.lab-play:hover:not(:disabled) { background: #3b82f6; color: #fff; }
.lab-play.playing { background: #3b82f6; color: #fff; }
.lab-play:disabled { opacity: 0.3; cursor: not-allowed; }
.lab-hear-bucket { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-paper-dim, var(--muted)); }
.lab-hear-sentence { font-size: 0.85rem; color: var(--color-paper, var(--ink)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lab-hear-pause { display: inline-flex; gap: 0.5rem; align-items: baseline; font-family: var(--font-mono, ui-monospace, Menlo, monospace); font-size: 0.75rem; white-space: nowrap; }
.lab-hear-dur { color: var(--color-paper-dim, var(--faint)); }
.lab-hear-gap { color: var(--color-paper, var(--ink)); }

/* Buttons (primary / secondary) */
:deep(.btn-primary), :deep(.btn-secondary) {
  padding: 0.45rem 0.9rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}
:deep(.btn-primary) { background: #3b82f6; border-color: #2563eb; color: white; }
:deep(.btn-primary:hover:not(:disabled)) { background: #2563eb; }
:deep(.btn-primary:disabled) { background: var(--surface-2); border-color: var(--surface-2); cursor: not-allowed; opacity: 0.5; }
:deep(.btn-secondary) {
  background: transparent;
  border-color: var(--color-graphite, var(--surface-3));
  color: var(--color-paper-dim, var(--muted));
}
:deep(.btn-secondary:hover:not(:disabled)) { border-color: var(--color-paper, var(--ink)); color: var(--color-paper, var(--ink)); }
:deep(.btn-secondary:disabled) { opacity: 0.4; cursor: not-allowed; }

/* ============================================================================
   LIGHT MODE OVERRIDES (mirror ListeningConfig — dark literals collapse on the
   light canvas; scoped to [data-theme="light"] so dark mode is untouched).
   ============================================================================ */
[data-theme="light"] .config-row {
  background: var(--surface);
  border-color: var(--line);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
}
[data-theme="light"] :deep(.num-input-wrap),
[data-theme="light"] :deep(.num-list-input) {
  background: var(--surface-2);
  border-color: var(--line);
}
[data-theme="light"] .fib-pill.on {
  color: #1d4ed8;
  background: rgba(37, 99, 235, 0.1);
  border-color: #1d4ed8;
}
[data-theme="light"] .seg-pill.on { color: #1d4ed8; background: rgba(37, 99, 235, 0.1); border-color: #1d4ed8; }
[data-theme="light"] .lab-preview { background: rgba(37, 99, 235, 0.06); border-color: rgba(37, 99, 235, 0.28); }
[data-theme="light"] .lab-preview-title { color: #1d4ed8; }
[data-theme="light"] .lab-rate input,
[data-theme="light"] .lab-track { background: var(--surface-2); border: 1px solid var(--line); }
[data-theme="light"] .lab-floor { border-left-color: rgba(15, 23, 42, 0.4); }
[data-theme="light"] .admin-warn { color: #92400e; }
[data-theme="light"] .err,
[data-theme="light"] :deep(.save-err) { color: #b91c1c; }
[data-theme="light"] .admin-crumbs .crumb-link:hover { color: var(--accent-2); }
</style>
