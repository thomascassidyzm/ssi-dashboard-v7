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
            counts, the Fibonacci spaced-rep schedule, and the Easy / Fast
            playback modes. Script shape is global: every course, every learner.
            Each mode can override it. Changes propagate to new sessions within
            ~5 min (cache TTL).
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

      <!-- ==================== PER-MODE ROUND SHAPE ==================== -->
      <section v-if="labCfg" class="config-row">
        <RowHeader
          :title="`Round shape — ${modeLabel} overrides`"
          desc="How THIS mode reshapes the global script shape above. Blank = inherit the global value. Easy's seeds are pitched at roughly a learner's FIRST 10 HOURS and are expected to adjust upwards from there — double the reps, half the phrase length. Fast inherits everything, which is what makes it identical to the old Normal mode."
          :row="rowMap[labMode]"
          :dirty="isDirty(labMode)"
          :saving="savingKey === labMode"
          :error="rowErrors[labMode]"
          @save="save(labMode)"
          @reset="reset(labMode)"
        />

        <div class="lab-modeswitch-row">
          <div class="lab-modeswitch">
            <button :class="{ on: labMode === 'easy_mode' }" @click="labMode = 'easy_mode'">Easy</button>
            <button :class="{ on: labMode === 'fast_mode' }" @click="labMode = 'fast_mode'">Fast</button>
          </div>
        </div>

        <div class="field-grid">
          <NumField v-model="modeShape.n1PhraseCount" label="N-1 phrase count" suffix="reps"
            :help="inheritHelp('n1PhraseCount', 'Phrases at the N-1 review (1st-back).')" />
          <NumField v-model="modeShape.maxBuildPhrases" label="Max BUILD phrases" suffix="per round"
            :help="inheritHelp('maxBuildPhrases', 'Repetitions of each new item per round.')" />
          <NumField v-model="modeShape.useConsolidationCount" label="USE consolidation count" suffix="per LEGO"
            :help="inheritHelp('useConsolidationCount', 'Reserved USE phrases at the end of a round.')" />
          <NumField v-model="modeShape.maxSpacedRepPhrases" label="Max spaced-rep phrases" suffix="per round"
            :help="inheritHelp('maxSpacedRepPhrases', 'Ceiling on the review block.')" />
        </div>

        <div class="field-block">
          <label>Spaced-rep offsets for this mode <span class="hint">blank = inherit the global schedule</span></label>
          <NumListField :modelValue="modeShape.spacedRepOffsets" @update:modelValue="modeShape.spacedRepOffsets = $event" />
        </div>

        <div class="field-block">
          <div class="knob-top">
            <label>Maximum phrase length <span class="hint">share of the course's longest phrase</span></label>
            <span class="knob-val">{{ Math.round(maxPhraseLengthFraction * 100) }}%{{ maxPhraseLengthFraction >= 1 ? ' — no limit' : '' }}</span>
          </div>
          <input
            type="range" min="0.1" max="1" step="0.05"
            :value="maxPhraseLengthFraction"
            @input="labCfg.maxPhraseLengthFraction = Number($event.target.value)"
          />
          <p class="field-note">
            Caps how long a phrase this mode will use, as a share of the longest
            phrase in the whole course — so it means the same thing in a course of
            short sentences as a long one. <strong>100% = no limit</strong>, which is
            Fast and is exactly the historic behaviour. Easy sits at
            <strong>50%</strong>: half the longest possible phrase. Length is measured
            on the target text. If the cap would leave a LEGO short of phrases it
            yields and that LEGO's shortest are used instead — the phrase floor always
            wins, so an over-tight cap degrades gently rather than emptying rounds.
          </p>
        </div>

        <div class="field-block">
          <div class="knob-top">
            <label>Maximum phrase syllables <span class="hint">absolute ceiling — blank or 0 = no limit</span></label>
            <span class="knob-val">{{ maxPhraseSyllables > 0 ? maxPhraseSyllables + ' syllables' : 'no limit' }}</span>
          </div>
          <input
            class="syll-input"
            type="number" min="0" step="1" placeholder="0 = no limit"
            :value="labCfg.maxPhraseSyllables ?? 0"
            @input="labCfg.maxPhraseSyllables = Number($event.target.value) || 0"
          />
          <p class="field-note">
            A hard ceiling on a phrase's target syllable count — above it the phrase
            is skipped entirely. Unlike the cap above this is <strong>absolute</strong>,
            not a share of the course, so a short course and a long one get the same
            ceiling. <strong>Blank or 0 = no limit</strong>, which is Fast and is the
            historic behaviour. The phrase floor still wins: if the ceiling would leave
            a LEGO short, that LEGO's shortest phrases are used anyway.
          </p>
          <p class="field-warn">
            <strong>Read this before setting a number.</strong> Syllables are counted
            approximately, and only for some scripts: Latin-alphabet targets are counted
            by vowel clusters and CJK counts characters, but <strong>every other script —
            Arabic, Hebrew, Devanagari, Cyrillic, Greek, Thai — measures 1 syllable per
            phrase</strong>, so no phrase can ever exceed the ceiling and this knob does
            <strong>nothing at all</strong> on those courses. Of 143 courses, 59 have a
            target language the counter handles. The stored per-phrase count that would
            fix this is populated on 1.3% of phrases estate-wide (10,813 of 818,220), so
            the approximation is the live path almost everywhere. On a course where this
            is inert, <strong>Maximum phrase length</strong> above is the only length
            control that bites.
          </p>
        </div>
      </section>

      <!-- ==================== PAUSE LAB ==================== -->
      <section v-if="labCfg" class="config-row">
        <RowHeader
          :title="`Pause lab — ${modeLabel} timing`"
          desc="The learner 'say-it-yourself' gap. pause = BOOT (fixed reaction, short phrases) + ASSEMBLY (piecing parts together — grows super-linearly with length). Two belt knobs split the taper: short-phrase gaps shrink hard as the learner climbs, long-phrase gaps shrink gently. Watch it across sentence lengths (in syllables) and belts below. 'Hold after answer' is the odd one out — it sits AFTER the second target voice rather than before it, so it does not appear in the curve."
          :row="rowMap[labMode]"
          :dirty="isDirty(labMode)"
          :saving="savingKey === labMode"
          :error="rowErrors[labMode]"
          @save="save(labMode)"
          @reset="reset(labMode)"
        />

        <div class="lab-modeswitch-row">
          <div class="lab-modeswitch">
            <button :class="{ on: labMode === 'easy_mode' }" @click="labMode = 'easy_mode'">Easy</button>
            <button :class="{ on: labMode === 'fast_mode' }" @click="labMode = 'fast_mode'">Fast</button>
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
            <span class="lab-preview-title">Live preview · {{ modeLabel }}</span>
            <div class="lab-belt">
              <span class="lab-belt-label">Belt</span>
              <button v-for="b in BELTS" :key="b.key" class="belt-pill" :class="['belt-' + b.key, { on: belt === b.key }]" @click="belt = b.key">
                {{ b.label }} <span class="belt-spd">{{ b.speed }}×</span>
              </button>
            </div>
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
// Easy is the gentler mode, so where a row predates a knob its backfill is the
// slower value; Fast keeps the values Normal used to carry (2026-08-06 mode
// restructure). Both rows are seeded on creation, so this only fires for a row
// hand-edited to drop a key.
function backfillPauseRow(key, d) {
  const c = d[key]
  if (!c) return
  if (c.pause_reference == null) c.pause_reference = 'avg'
  const isEasy = key === 'easy_mode'
  if (c.pause_boot_ms == null) c.pause_boot_ms = isEasy ? 2000 : 1000
  if (c.pause_assembly_threshold_ms == null) c.pause_assembly_threshold_ms = 1000
  if (c.pause_assembly_lin == null) c.pause_assembly_lin = 2.5
  if (c.pause_assembly_quad == null) c.pause_assembly_quad = 0
  if (c.pause_belt_boot == null) c.pause_belt_boot = 1.0
  if (c.pause_belt_assembly == null) c.pause_belt_assembly = 0.8
  if (c.min_pause_ms == null) c.min_pause_ms = isEasy ? 1400 : 700
  if (c.max_pause_ms == null) c.max_pause_ms = 15000
  // The two fields the mode restructure added. Absent = inherit the global
  // script shape / no length cap — never a silent reshape.
  if (c.scriptShape == null) c.scriptShape = {}
  // 1.0 = uncapped = the historic behaviour. Easy halves the longest phrase
  // (Aran 2026-08-06); a missing value must never invent a cap.
  if (c.maxPhraseLengthFraction == null) c.maxPhraseLengthFraction = isEasy ? 0.5 : 1.0
  // The post-voice2 hold. Backfilled to what the learner app's own DEFAULT_EASY
  // / DEFAULT_FAST already merge in for a row missing the key, so opening the
  // page shows the gap that is ACTUALLY being played rather than a 0 that a
  // Save would then make true. Easy 1000, Fast 0 (Tom, 2026-08-07).
  if (c.post_voice2_gap_ms == null) c.post_voice2_gap_ms = isEasy ? 1000 : 0
  // 0 = NO LIMIT, for BOTH modes, deliberately. Unlike the two above, no live
  // default exists to mirror: nothing anywhere caps syllables today, so any
  // non-zero backfill would invent a ceiling a row never had and silently
  // shorten a course. The number is Tom's to set, on this page.
  if (c.maxPhraseSyllables == null) c.maxPhraseSyllables = 0
}
function backfillPause(d) {
  backfillPauseRow('easy_mode', d)
  backfillPauseRow('fast_mode', d)
}

// ============================================================================
// Pause lab — tweak a mode's pause knobs and see the resulting gap across
// syllable-bucketed sentence lengths. msPerSyllable maps a syllable count to an
// estimated per-voice audio duration (preview only; the runtime uses real clip
// durations). Default ~280ms/syll for slow SSi learner audio — tunable.
// ============================================================================
// Exactly two modes (Aran's ruling relayed by Tom, 2026-08-06). Fast is what
// Normal was; Easy is new. The switch drives both the round-shape overrides and
// the pause knobs, so one selection tunes the whole mode.
const labMode = ref('fast_mode')
const msPerSyllable = ref(280)
const labCfg = computed(() => drafts[labMode.value] || null)
const modeLabel = computed(() => (labMode.value === 'easy_mode' ? 'Easy' : 'Fast'))

// The mode's scriptShape override block, created lazily so an untouched mode
// never writes an override it does not have. Blank field = inherit the global.
const modeShape = computed(() => {
  const cfg = labCfg.value
  if (!cfg) return {}
  if (!cfg.scriptShape) cfg.scriptShape = {}
  return cfg.scriptShape
})
const maxPhraseLengthFraction = computed(() => {
  const f = labCfg.value?.maxPhraseLengthFraction
  return typeof f === 'number' && f > 0 && f <= 1 ? f : 1
})
// Mirrors resolveMaxPhraseSyllables in services/learning-modes.cjs: anything
// absent, blank or invalid reads as 0 = NO LIMIT. A cap must never appear by
// omission, so the display agrees with the runtime on what "blank" means.
const maxPhraseSyllables = computed(() => {
  const n = labCfg.value?.maxPhraseSyllables
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
})

// Help text that names the global value a blank field inherits, so the admin
// can see what "inherit" actually means without leaving the page.
function inheritHelp(key, desc) {
  const g = drafts.script_shape?.[key]
  return g === undefined ? desc : `${desc} Global is ${g}; blank inherits it.`
}

// Belt selection — early belts slow the voice, lengthening actual play time and
// thus the pause. Default White: the pause matters most at the beginning.
const belt = ref('white')
const beltSpeedVal = computed(() => (BELTS.find(b => b.key === belt.value) || {}).speed || 1)

// Effective playback speed driving actual-time pause + audio. Both modes follow
// the belt ramp — Turbo's native-1.0× override went with Turbo, and Fast keeps
// Normal's behaviour exactly. Mirrors getPlaybackSpeedMultiplier.
const effectiveSpeed = computed(() => beltSpeedVal.value)

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

// A sensible boot + assembly starting curve per mode: a real boot floor, short
// phrases near pure-boot, assembly ramping with a touch of super-linear lift
// for long sentences, and a belt taper that shortens short gaps (boot) more
// than long ones (assembly) as the learner climbs. Easy is the same curve with
// roughly double the boot and floor — the "doubling time" feel. Applied UNSAVED
// via the lab button; tweak then Save.
const SUGGESTED = {
  fast_mode: { pause_reference: 'avg', pause_boot_ms: 1000, pause_assembly_threshold_ms: 900, pause_assembly_lin: 2.4, pause_assembly_quad: 120, pause_belt_boot: 0.72, pause_belt_assembly: 0.92, min_pause_ms: 700, max_pause_ms: 16000, playback_speed: 1.0, post_voice2_gap_ms: 0 },
  easy_mode: { pause_reference: 'avg', pause_boot_ms: 2000, pause_assembly_threshold_ms: 900, pause_assembly_lin: 2.4, pause_assembly_quad: 120, pause_belt_boot: 0.72, pause_belt_assembly: 0.92, min_pause_ms: 1400, max_pause_ms: 16000, playback_speed: 1.0, post_voice2_gap_ms: 1000 },
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
  // Not part of the say-it-yourself gap — this one sits AFTER the answer, so it
  // is excluded from the curve below (which plots the pause under test only).
  { key: 'post_voice2_gap_ms', label: 'Hold after answer', min: 0, max: 4000, step: 50, unit: 'ms', fmt: v => v + 'ms',
    help: 'Extra silence held after the second target voice, before the next cycle starts — "to stop the next cycle just coming in and taking over". Voice 2 is the phase with the target text on screen, so the same beat also leaves that text up for longer. Easy holds 1s; Fast holds none. 0 = the next cycle follows immediately.' },
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
.field-note {
  margin: 0.5rem 0 0;
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--color-paper-dim, var(--muted));
  max-width: 620px;
}
/* A knob that does nothing on half the estate has to SAY so, right next to
   itself — a silent no-op is the failure mode this whole note exists to stop. */
.field-warn {
  margin: 0.6rem 0 0;
  padding: 0.6rem 0.75rem;
  border-radius: 6px;
  background: rgba(251, 146, 60, 0.1);
  border: 1px solid rgba(251, 146, 60, 0.28);
  color: #fbbf24;
  font-size: 0.75rem;
  line-height: 1.55;
  max-width: 620px;
}
.field-warn strong { color: #fdba74; }
.syll-input {
  width: 160px;
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
.syll-input:focus { border-color: #60a5fa; }

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
[data-theme="light"] .syll-input { background: var(--surface-2); border-color: var(--line); }
[data-theme="light"] .field-warn {
  background: rgba(180, 83, 9, 0.08);
  border-color: rgba(180, 83, 9, 0.3);
  color: #92400e;
}
[data-theme="light"] .field-warn strong { color: #7c2d12; }
[data-theme="light"] .admin-warn { color: #92400e; }
[data-theme="light"] .err,
[data-theme="light"] :deep(.save-err) { color: #b91c1c; }
[data-theme="light"] .admin-crumbs .crumb-link:hover { color: var(--accent-2); }
</style>
