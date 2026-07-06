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
          desc="The learner 'say-it-yourself' gap. pause = BOOT (fixed reaction, short phrases) + ASSEMBLY (piecing parts together — grows super-linearly with length). Two belt knobs split the taper: short-phrase gaps shrink hard as the learner climbs, long-phrase gaps shrink gently. Watch it across sentence lengths (in syllables) and belts below."
          :row="rowMap[labMode]"
          :dirty="isDirty(labMode)"
          :saving="savingKey === labMode"
          :error="rowErrors[labMode]"
          @save="save(labMode)"
          @reset="reset(labMode)"
        />

        <div class="lab-modeswitch-row">
          <div class="lab-modeswitch">
            <button :class="{ on: labMode === 'normal_mode' }" @click="labMode = 'normal_mode'">Normal</button>
            <button :class="{ on: labMode === 'turbo_boost' }" @click="labMode = 'turbo_boost'">Turbo</button>
          </div>
          <button class="lab-suggest" @click="applySuggested" title="Drop a sensible starting curve into the knobs (unsaved — tweak, then Save)">
            ✨ Load suggested
          </button>
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

        <div class="knob-grid">
          <div v-for="k in KNOBS" :key="k.key" class="knob" :title="k.help || ''">
            <div class="knob-top">
              <label>{{ k.label }}</label>
              <span class="knob-val">{{ k.fmt(labCfg[k.key] ?? 0) }}</span>
            </div>
            <input
              type="range"
              :min="k.min" :max="k.max" :step="k.step"
              :value="labCfg[k.key] ?? 0"
              @input="labCfg[k.key] = Number($event.target.value)"
            />
          </div>
        </div>

        <!-- Live preview across syllable buckets -->
        <div class="lab-preview">
          <div class="lab-preview-head">
            <span class="lab-preview-title">Live preview · {{ labMode === 'normal_mode' ? 'Normal' : 'Turbo' }}</span>
            <div v-if="!isTurbo" class="lab-belt">
              <span class="lab-belt-label">Belt</span>
              <button v-for="b in BELTS" :key="b.key" class="belt-pill" :class="['belt-' + b.key, { on: belt === b.key }]" @click="belt = b.key">
                {{ b.label }} <span class="belt-spd">{{ b.speed }}×</span>
              </button>
            </div>
            <span v-else class="lab-belt-label">Turbo · 1.0× (no belt ramp, never faster than native)</span>
            <label class="lab-rate">~ms / syllable
              <input type="number" min="50" step="10" v-model.number="msPerSyllable" />
            </label>
            <span class="lab-rate-note">voices play at {{ effectiveSpeed }}× audio; the gap is sized off the phrase's native length, then tapered at this belt — boot ×{{ beltTaper.boot.toFixed(2) }}, assembly ×{{ beltTaper.assembly.toFixed(2) }}</span>
          </div>

          <svg v-if="curve" class="lab-chart" :viewBox="`0 0 ${CHART.w} ${CHART.h}`" preserveAspectRatio="xMidYMid meet">
            <!-- y grid + labels (seconds) -->
            <g class="chart-grid">
              <line v-for="t in curve.yTicks" :key="'yl'+t.label" :x1="CHART.padL" :x2="CHART.w - CHART.padR" :y1="t.y" :y2="t.y" />
              <text v-for="t in curve.yTicks" :key="'yt'+t.label" :x="CHART.padL - 6" :y="t.y + 3" text-anchor="end" class="chart-axis-text">{{ t.label }}</text>
            </g>
            <!-- x labels (syllables) -->
            <text v-for="t in curve.xTicks" :key="'xt'+t.label" :x="t.x" :y="CHART.h - 8" text-anchor="middle" class="chart-axis-text">{{ t.label }}</text>
            <text :x="CHART.w - CHART.padR" :y="CHART.h - 8" text-anchor="end" class="chart-axis-title">syllables</text>
            <!-- floor -->
            <line class="chart-floor" :x1="CHART.padL" :x2="CHART.w - CHART.padR" :y1="curve.floorY" :y2="curve.floorY" />
            <text :x="CHART.w - CHART.padR" :y="curve.floorY - 4" text-anchor="end" class="chart-mark-text">floor</text>
            <!-- ceiling -->
            <template v-if="curve.ceilInView">
              <line class="chart-ceil" :x1="CHART.padL" :x2="CHART.w - CHART.padR" :y1="curve.ceilY" :y2="curve.ceilY" />
              <text :x="CHART.w - CHART.padR" :y="curve.ceilY - 4" text-anchor="end" class="chart-mark-text">ceiling</text>
            </template>
            <!-- knee -->
            <template v-if="curve.kneeX != null">
              <line class="chart-knee" :x1="curve.kneeX" :x2="curve.kneeX" :y1="CHART.padT" :y2="curve.baseY" />
              <text :x="curve.kneeX" :y="CHART.padT + 8" text-anchor="middle" class="chart-mark-text knee">{{ curve.kneeLabel }}</text>
            </template>
            <!-- the curve -->
            <polyline class="chart-curve" :points="curve.polyline" />
            <!-- real sample dots -->
            <g v-for="d in curve.dots" :key="d.key">
              <circle class="chart-dot" :cx="d.x" :cy="d.y" r="4" />
              <text :x="d.x" :y="d.y - 8" text-anchor="middle" class="chart-dot-text">{{ (d.ms/1000).toFixed(1) }}s</text>
            </g>
          </svg>
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
                <span v-if="b.sentence" class="lab-hear-dur">{{ (b.sentence.t1ms / effectiveSpeed / 1000).toFixed(1) }}s say</span>
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
import { computePauseDuration, computePauseForBelt, beltProgress, BELTS, SYLLABLE_BUCKETS } from './pauseModel'
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
// The pause model moved to boot + assembly (2026-06-30). Rows saved before that
// lack the new fields; backfill them to values that REPRODUCE the previous
// White-belt curve (boot 1000 + 2.5×ref-past-1000ms ≡ the old floor-1000 /
// knee-1600 / tail-2.0 curve for medium/long phrases), with a faithful belt
// taper (short belt-independent, long shrinks ~20% by Green). The runtime is
// untouched until an admin tunes in the lab and saves.
function backfillPauseRow(key, d) {
  const c = d[key]
  if (!c) return
  if (c.pause_reference == null) c.pause_reference = 'avg'
  const isTurbo = key === 'turbo_boost'
  if (c.pause_boot_ms == null) c.pause_boot_ms = isTurbo ? 2000 : 1000
  if (c.pause_assembly_threshold_ms == null) c.pause_assembly_threshold_ms = isTurbo ? 1111 : 1000
  if (c.pause_assembly_lin == null) c.pause_assembly_lin = isTurbo ? 0.9 : 2.5
  if (c.pause_assembly_quad == null) c.pause_assembly_quad = 0
  if (c.pause_belt_boot == null) c.pause_belt_boot = 1.0
  if (c.pause_belt_assembly == null) c.pause_belt_assembly = isTurbo ? 1.0 : 0.8
  if (c.min_pause_ms == null) c.min_pause_ms = isTurbo ? 2000 : 700
  if (c.max_pause_ms == null) c.max_pause_ms = isTurbo ? 12000 : 15000
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

// Belt selection — early belts slow the voice, lengthening actual play time and
// thus the pause. Default White: the pause matters most at the beginning.
const belt = ref('white')
const beltSpeedVal = computed(() => (BELTS.find(b => b.key === belt.value) || {}).speed || 1)

// Effective playback speed driving actual-time pause + audio: Normal follows
// the belt ramp; Turbo plays at native 1.0× — drops the belt ramp but is capped
// at 1.0× (never speeds the voice up). Mirrors getPlaybackSpeedMultiplier.
const isTurbo = computed(() => labMode.value === 'turbo_boost')
const effectiveSpeed = computed(() => isTurbo.value ? Math.min(labCfg.value?.playback_speed || 1, 1.0) : beltSpeedVal.value)

// Belt taper applied at the selected belt — boot/assembly multipliers the
// boot+assembly model uses (White anchors at 1.0; Green = the configured
// endpoint; between interpolated by belt speed position). Mirrors
// beltProgress() in pauseModel.js.
const beltTaper = computed(() => {
  const cfg = labCfg.value || {}
  const p = beltProgress(effectiveSpeed.value)
  return {
    boot: 1 + p * ((cfg.pause_belt_boot ?? 1) - 1),
    assembly: 1 + p * ((cfg.pause_belt_assembly ?? 1) - 1),
  }
})

// A sensible starting curve per mode — reference = average of both voices, a
// real boot floor, and a knee so long sentences level off instead of scaling
// at the full multiplier. Applied UNSAVED via the lab button; tweak then Save.
// A sensible boot + assembly starting curve per mode. Normal: a real boot
// floor, short phrases near pure-boot, assembly ramps with a touch of
// super-linear lift for long sentences, and a belt taper that shortens short
// gaps (boot) more than long ones (assembly) as the learner climbs. Applied
// UNSAVED via the lab button; tweak then Save.
const SUGGESTED = {
  normal_mode: { pause_reference: 'avg', pause_boot_ms: 1000, pause_assembly_threshold_ms: 900, pause_assembly_lin: 2.4, pause_assembly_quad: 120, pause_belt_boot: 0.72, pause_belt_assembly: 0.92, min_pause_ms: 700, max_pause_ms: 16000, playback_speed: 1.0 },
  turbo_boost: { pause_reference: 'avg', pause_boot_ms: 1500, pause_assembly_threshold_ms: 900, pause_assembly_lin: 1.3, pause_assembly_quad: 60, pause_belt_boot: 1.0, pause_belt_assembly: 1.0, min_pause_ms: 1500, max_pause_ms: 12000 },
}
function applySuggested() {
  if (labCfg.value) Object.assign(labCfg.value, SUGGESTED[labMode.value] || {})
}

// Slider specs — drag, don't type. Boot + assembly model: the gap is BOOT
// (fixed reaction, short phrases) + ASSEMBLY (piecing parts together, grows
// super-linearly with length). Two belt knobs split the taper so short phrases
// shorten more than long ones as the learner climbs. See pauseModel.js.
const KNOBS = [
  { key: 'pause_boot_ms', label: 'Boot (reaction)', min: 0, max: 4000, step: 50, unit: 'ms', fmt: v => v + 'ms',
    help: 'Fixed spin-up before producing anything. Short phrases are almost all boot.' },
  { key: 'pause_assembly_threshold_ms', label: 'Assembly start', min: 0, max: 4000, step: 50, unit: 'ms', fmt: v => v + 'ms',
    help: 'Reference duration below which there is no assembly cost (pure boot).' },
  { key: 'pause_assembly_lin', label: 'Assembly slope', min: 0, max: 5, step: 0.05, unit: '×', fmt: v => Number(v).toFixed(2) + '×',
    help: 'Linear assembly time per ms of phrase length past the start.' },
  { key: 'pause_assembly_quad', label: 'Assembly curve (long)', min: 0, max: 800, step: 25, unit: 'ms/s²', fmt: v => v + 'ms/s²',
    help: 'Super-linear cost — lifts the long end without touching short phrases.' },
  { key: 'pause_belt_boot', label: 'Belt: boot @ Green', min: 0.4, max: 1, step: 0.01, unit: '×', fmt: v => Number(v).toFixed(2) + '×',
    help: 'Boot multiplier by Green (White = 1.0). Lower = short-phrase gaps shrink as the learner advances.' },
  { key: 'pause_belt_assembly', label: 'Belt: assembly @ Green', min: 0.4, max: 1, step: 0.01, unit: '×', fmt: v => Number(v).toFixed(2) + '×',
    help: 'Assembly multiplier by Green (White = 1.0). Keep nearer 1.0 so long phrases shorten less than short ones.' },
  { key: 'min_pause_ms', label: 'Floor (hard min)', min: 0, max: 4000, step: 100, unit: 'ms', fmt: v => v + 'ms',
    help: 'Absolute floor — the gap never drops below this even after belt taper.' },
  { key: 'max_pause_ms', label: 'Ceiling', min: 4000, max: 20000, step: 500, unit: 'ms', fmt: v => v + 'ms' },
]

// ============================================================================
// Live curve — pause (y) vs sentence length in syllables (x). Redraws on every
// knob drag so "knee" et al are visible, not abstract. Real sample sentences
// are plotted as dots so the synthetic curve is anchored to actual clips.
// ============================================================================
const CHART = { w: 580, h: 220, padL: 44, padR: 14, padT: 14, padB: 30, maxSyll: 18 }
const curve = computed(() => {
  const cfg = labCfg.value
  if (!cfg) return null
  const rate = msPerSyllable.value || 280
  const yTop = Math.max(cfg.max_pause_ms || 16000, 6000)
  const plotW = CHART.w - CHART.padL - CHART.padR
  const plotH = CHART.h - CHART.padT - CHART.padB
  const xOf = syll => CHART.padL + (syll / CHART.maxSyll) * plotW
  const yOf = ms => CHART.padT + plotH - (Math.min(ms, yTop) / yTop) * plotH

  const spd = effectiveSpeed.value
  const pts = []
  for (let s = 0; s <= CHART.maxSyll; s += 0.5) {
    const perVoice = s * rate            // raw clip ms for an s-syllable phrase
    pts.push(`${xOf(s).toFixed(1)},${yOf(computePauseForBelt(perVoice, perVoice, cfg, spd)).toFixed(1)}`)
  }
  // Marker: where assembly kicks in (new model) or the knee bends (legacy).
  // New model uses the NATIVE reference (no /speed); legacy rides ref/speed.
  const refMult = cfg.pause_reference === 'sum' ? 2 : 1
  const isNew = cfg.pause_assembly_lin != null || cfg.pause_boot_ms != null
  const markerMs = isNew ? (cfg.pause_assembly_threshold_ms ?? Infinity) : (cfg.pause_knee_ms ?? Infinity)
  const kneeSyll = isNew ? markerMs / (refMult * rate) : markerMs * spd / (refMult * rate)
  const dots = sampleByBucket.value
    .filter(b => b.sentence)
    .map(b => ({ key: b.key, label: b.label, x: xOf(b.sentence.syll), y: yOf(computePauseFor(b.sentence)), s: b.sentence.syll, ms: computePauseFor(b.sentence) }))

  // Axis ticks
  const xTicks = []
  for (let s = 0; s <= CHART.maxSyll; s += 3) xTicks.push({ x: xOf(s), label: String(s) })
  const yTicks = []
  const stepS = yTop <= 8000 ? 2000 : 4000
  for (let ms = 0; ms <= yTop; ms += stepS) yTicks.push({ y: yOf(ms), label: (ms / 1000) + 's' })

  return {
    polyline: pts.join(' '),
    floorY: yOf(cfg.min_pause_ms || 0),
    ceilY: yOf(cfg.max_pause_ms || yTop),
    ceilInView: (cfg.max_pause_ms || yTop) <= yTop,
    kneeX: kneeSyll <= CHART.maxSyll && Number.isFinite(kneeSyll) ? xOf(kneeSyll) : null,
    kneeLabel: isNew ? 'assembly' : 'knee',
    baseY: CHART.padT + plotH,
    xTicks, yTicks, dots,
  }
})

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

// Live pause (ms) for a real sentence under the current unsaved config, sized
// off the ACTUAL play time at the selected belt (raw clip ms / belt speed).
function computePauseFor(sample) {
  return labCfg.value ? computePauseForBelt(sample.t1ms, sample.t2ms, labCfg.value, effectiveSpeed.value) : 0
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
// Play one sentence as a learner at the selected BELT hears it: the target
// voices play at the belt's speed ramp (slower for beginners), and the pause is
// sized off the resulting ACTUAL play time. The known prompt plays at 1.0×
// (the ramp is a target-voice effect).
async function playWithPause(sample, key) {
  if (!sample || !labCfg.value) return
  stopPreview()
  previewStop = false
  playingKey.value = key
  const spd = effectiveSpeed.value
  const pauseMs = computePauseForBelt(sample.t1ms, sample.t2ms, labCfg.value, spd)
  playingPhase.value = 'known'
  await playClip(sample.known_id, 1)
  if (previewStop) return
  playingPhase.value = 'pause'                       // the gap under test
  await new Promise(r => setTimeout(r, pauseMs))
  if (previewStop) return
  playingPhase.value = 'target1'
  await playClip(sample.t1_id, spd)
  if (previewStop) return
  await new Promise(r => setTimeout(r, 250))
  if (previewStop) return
  playingPhase.value = 'target2'
  await playClip(sample.t2_id, spd)
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
.lab-modeswitch-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
.lab-suggest {
  background: rgba(96, 165, 250, 0.12); border: 1px solid #60a5fa; color: #93c5fd;
  border-radius: 8px; padding: 0.4rem 0.85rem; font-size: 0.8rem; cursor: pointer; transition: all 0.15s;
}
.lab-suggest:hover { background: #3b82f6; color: #fff; }
.lab-modeswitch { display: inline-flex; gap: 0; border: 1px solid var(--color-graphite, var(--surface-3)); border-radius: 8px; overflow: hidden; }
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
.lab-belt { display: inline-flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; }
.lab-belt-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-paper-dim, var(--muted)); }
.belt-pill {
  display: inline-flex; align-items: baseline; gap: 0.3rem;
  padding: 0.3rem 0.6rem; border-radius: 999px; cursor: pointer; font-size: 0.74rem;
  border: 1px solid var(--color-graphite, var(--surface-3)); background: transparent;
  color: var(--color-paper-dim, var(--muted)); transition: all 0.15s;
}
.belt-pill .belt-spd { font-size: 0.64rem; opacity: 0.7; font-family: var(--font-mono, ui-monospace, Menlo, monospace); }
.belt-pill:hover { border-color: var(--color-paper-dim, var(--muted)); color: var(--color-paper, var(--ink)); }
.belt-pill.on { color: var(--color-paper, var(--ink)); border-width: 2px; }
.belt-pill.belt-white.on { border-color: #cbd5e1; background: rgba(203,213,225,0.12); }
.belt-pill.belt-yellow.on { border-color: #facc15; background: rgba(250,204,21,0.14); }
.belt-pill.belt-orange.on { border-color: #fb923c; background: rgba(251,146,60,0.14); }
.belt-pill.belt-green.on { border-color: #4ade80; background: rgba(74,222,128,0.14); }
.lab-rate { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; color: var(--color-paper-dim, var(--muted)); }
.lab-rate input {
  width: 72px; background: rgba(0,0,0,0.25); border: 1px solid var(--color-graphite, var(--surface-2));
  border-radius: 6px; color: var(--color-paper, var(--ink)); padding: 0.3rem 0.45rem;
  font-family: var(--font-mono, ui-monospace, Menlo, monospace); font-size: 0.8125rem; outline: none;
}
.lab-rate-note { font-size: 0.72rem; color: var(--color-paper-dim, var(--faint)); }
/* Knob sliders */
.knob-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.85rem 1.25rem; margin-bottom: 0.5rem; }
.knob-top { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.3rem; }
.knob-top label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-paper-dim, var(--muted)); }
.knob-val { font-family: var(--font-mono, ui-monospace, Menlo, monospace); font-size: 0.82rem; color: var(--color-paper, var(--ink)); }
.knob input[type="range"] { width: 100%; accent-color: #3b82f6; height: 20px; cursor: pointer; }

/* Live curve chart */
.lab-chart { width: 100%; height: auto; display: block; }
.chart-grid line { stroke: rgba(255,255,255,0.07); stroke-width: 1; }
.chart-axis-text { fill: var(--color-paper-dim, var(--faint)); font-size: 10px; font-family: var(--font-mono, ui-monospace, Menlo, monospace); }
.chart-axis-title { fill: var(--color-paper-dim, var(--muted)); font-size: 10px; }
.chart-curve { fill: none; stroke: #60a5fa; stroke-width: 2.5; }
.chart-floor { stroke: #f59e0b; stroke-width: 1.5; stroke-dasharray: 5 4; }
.chart-ceil { stroke: #ef4444; stroke-width: 1.5; stroke-dasharray: 5 4; }
.chart-knee { stroke: #93c5fd; stroke-width: 1.5; stroke-dasharray: 3 3; }
.chart-mark-text { fill: var(--color-paper-dim, var(--muted)); font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; font-family: var(--font-mono, ui-monospace, Menlo, monospace); }
.chart-mark-text.knee { fill: #93c5fd; }
.chart-dot { fill: #fbbf24; stroke: var(--color-ink, #0b1220); stroke-width: 1.5; }
.chart-dot-text { fill: var(--color-paper, var(--ink)); font-size: 9px; font-family: var(--font-mono, ui-monospace, Menlo, monospace); }

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
[data-theme="light"] .chart-grid line { stroke: rgba(15, 23, 42, 0.08); }
[data-theme="light"] .chart-dot { stroke: #fff; }
[data-theme="light"] .chart-knee { stroke: #1d4ed8; }
[data-theme="light"] .chart-mark-text.knee { fill: #1d4ed8; }
[data-theme="light"] .admin-warn { color: #92400e; }
[data-theme="light"] .err,
[data-theme="light"] :deep(.save-err) { color: #b91c1c; }
[data-theme="light"] .admin-crumbs .crumb-link:hover { color: var(--accent-2); }
</style>
