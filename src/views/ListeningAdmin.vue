<template>
  <div class="listening-admin">
    <header class="admin-header">
      <button class="back-btn" @click="goBack" title="Back">←</button>
      <div>
        <h1>Listening &amp; algorithm config</h1>
        <p class="sub">
          Global settings — applies to every course, every learner.
          Changes propagate to new sessions within ~5 min (cache TTL).
        </p>
      </div>
      <span v-if="!isAdmin && currentUser" class="admin-warn">
        Signed in as {{ currentUser.email }} (not admin) — saves will fail.
      </span>
    </header>

    <!-- Sticky course preview bar -->
    <div class="preview-bar">
      <div class="preview-bar-inner">
        <div class="picker-group">
          <label>Preview course</label>
          <select v-model="selectedCourseCode" @change="onCourseChange">
            <option value="">— pick —</option>
            <option v-for="c in allCourses" :key="c.course_code" :value="c.course_code">{{ c.course_code }}</option>
          </select>
        </div>
        <div class="picker-group round-group" v-if="selectedCourseCode">
          <label>Round</label>
          <input type="number" min="1" :max="previewRoundMax" v-model.number="previewRound" />
          <input type="range" min="1" :max="previewRoundMax" v-model.number="previewRound" />
          <span class="round-display">/ {{ previewRoundMax }}</span>
        </div>
        <div v-if="selectedCourseCode" class="preview-stats">
          <span>{{ totalSeeds }} seeds</span>
          <span>{{ graduatedQueue.length }} graduated</span>
          <span>active <strong>{{ l1ActiveFires ? '✓' : '–' }}</strong></span>
          <span>reserve <strong>{{ l1ReserveFires ? '✓' : '–' }}</strong></span>
        </div>
        <div v-if="courseLoading" class="preview-loading">Loading course data…</div>
      </div>
    </div>

    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="loadError" class="err"><strong>Failed to load:</strong> {{ loadError }}</div>

    <div v-else class="rows">
      <!-- ==================== LISTENING ==================== -->
      <section v-if="drafts.listening" class="config-row">
        <RowHeader
          title="Layer 1 listening"
          desc="Per-seed playback at the round-end listening cluster, plus the graduation + window rules that pick which seeds play."
          :row="rowMap.listening"
          :dirty="isDirty('listening')"
          :saving="savingKey === 'listening'"
          :error="rowErrors.listening"
          @save="save('listening')"
          @reset="reset('listening')"
        />

        <div class="field-block" v-if="drafts.listening.layer1StagePlaylist">
          <label>L1 staged playlist <span class="hint">each seed advances stage on each L1 fire — eternal stage is the highest-numbered</span></label>
          <div class="stage-grid">
            <template v-for="(stage, idx) in l1StageKeys" :key="`l1-${stage}`">
              <div class="stage-row">
                <span class="stage-label">
                  stage {{ stage }}
                  <span v-if="idx === l1StageKeys.length - 1" class="stage-eternal">eternal</span>
                </span>
                <PlaylistEditor :modelValue="getL1StageList(stage)" @update:modelValue="setL1StageList(stage, $event)" :compact="true" />
                <button
                  class="stage-remove-btn"
                  :disabled="l1StageKeys.length <= 1"
                  @click="removeL1Stage(stage)"
                  title="Remove this stage"
                >×</button>
              </div>
              <button class="stage-insert-btn" @click="addL1StageAfter(stage)" :title="`Insert L1 stage after ${stage}`">
                + insert L1 stage after {{ stage }}
              </button>
            </template>
          </div>
        </div>

        <div class="field-block" v-else>
          <label>Per-seed playlist (legacy) <span class="hint">staged playlist not configured — every fire uses this flat playlist</span></label>
          <PlaylistEditor v-model="drafts.listening.layer1Playlist" />
        </div>

        <div class="field-grid">
          <NumField v-model="drafts.listening.layer1StageDuration" label="L1 stage duration" suffix="fires per stage"
            help="How many L1 emissions a seed spends in each transitional stage before promoting." />
          <NumField v-model="drafts.listening.offset" label="Graduation offset" suffix="rounds"
            help="Rounds after a seed's last LEGO before it graduates into Layer 1 listening." />
          <NumField v-model="drafts.listening.l1ActiveSize" label="Active window size" suffix="seeds"
            help="Most-recently-graduated seeds in the active rotation." />
          <NumField v-model="drafts.listening.l1ActiveInterval" label="Active fires every" suffix="rounds" />
          <NumField v-model="drafts.listening.l1ReserveSize" label="Reserve window size" suffix="seeds"
            help="Older graduated seeds (next slice after active)." />
          <NumField v-model="drafts.listening.l1ReserveInterval" label="Reserve fires every" suffix="rounds" />
          <NumField v-model="drafts.listening.podActivationRound" label="Pod activation default" suffix="rounds"
            help="First main-round at which Layer 2 pods fire (per-learner pin still wins)." />
        </div>

        <!-- Live preview: what would Layer 1 play right now? -->
        <div v-if="selectedCourseCode && !courseLoading" class="preview-block">
          <div class="preview-block-head">
            <span class="preview-block-title">Preview · {{ selectedCourseCode }} @ round {{ previewRound }}</span>
            <span class="preview-block-meta">
              Active window — {{ activeWindow.length }} seeds
              {{ l1ActiveFires ? '· playing this round' : '· not firing this round' }}
            </span>
          </div>
          <div v-if="!activeWindow.length" class="preview-empty">
            No seeds graduated yet at this round (need {{ drafts.listening.offset }} rounds since each seed's last LEGO).
          </div>
          <div v-else class="preview-seeds">
            <div v-for="sNum in activeWindow" :key="sNum" class="preview-seed">
              <div class="preview-seed-head">
                <span class="seed-id">S{{ String(sNum).padStart(4, '0') }}</span>
                <span v-if="seedL1Stage(sNum) != null" class="seed-stage" :title="`${seedL1PriorFires(sNum)} prior L1 fires`">
                  stage {{ seedL1Stage(sNum) }}
                </span>
                <span class="seed-target">{{ seedDisplayTarget(sNum) }}</span>
                <span class="seed-known">{{ seedDisplayKnown(sNum) }}</span>
              </div>
              <div class="preview-seed-pills">
                <button
                  v-for="(role, idx) in seedL1Playlist(sNum)"
                  :key="idx"
                  class="preview-pill"
                  :class="`role-${role}`"
                  :disabled="!seedAudioId(sNum, role)"
                  :title="ROLE_DESC[role]"
                  @click="playOne(sNum, role)"
                >
                  <span class="pill-num">{{ idx + 1 }}</span>
                  <span class="pill-icon">▶</span>
                  {{ ROLE_LABEL[role] }}
                </button>
                <button class="preview-sequence" @click="playSequence(sNum)" title="Play full sequence with bookends">
                  ▶▶ play full
                </button>
              </div>
            </div>
          </div>
          <div v-if="reserveWindow.length" class="preview-reserve">
            <details>
              <summary>+{{ reserveWindow.length }} seeds in reserve window (every {{ drafts.listening.l1ReserveInterval }} rounds)</summary>
              <div class="preview-seeds compact">
                <div v-for="sNum in reserveWindow" :key="sNum" class="preview-seed compact">
                  <div class="preview-seed-head">
                    <span class="seed-id">S{{ String(sNum).padStart(4, '0') }}</span>
                    <span class="seed-target">{{ seedDisplayTarget(sNum) }}</span>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>
      </section>

      <!-- ==================== PODS ==================== -->
      <section v-if="drafts.pods" class="config-row">
        <RowHeader
          title="Layer 2 pods"
          desc="Per-stage playlist progression for the runtime pod scheduler, plus the inter-play timing matrix."
          :row="rowMap.pods"
          :dirty="isDirty('pods')"
          :saving="savingKey === 'pods'"
          :error="rowErrors.pods"
          @save="save('pods')"
          @reset="reset('pods')"
        />

        <div class="field-block">
          <label>Stage playlists <span class="hint">highest-numbered stage is the eternal hold · + adds, × removes, drag rows by editing the playlist</span></label>
          <div class="stage-grid">
            <template v-for="(stage, idx) in podsStageKeys" :key="stage">
              <div class="stage-row">
                <span class="stage-label">
                  stage {{ stage }}
                  <span v-if="idx === podsStageKeys.length - 1" class="stage-eternal">eternal</span>
                </span>
                <PlaylistEditor :modelValue="getStageList(stage)" @update:modelValue="setStageList(stage, $event)" :compact="true" />
                <button
                  class="stage-remove-btn"
                  :disabled="podsStageKeys.length <= 1"
                  @click="removeStage(stage)"
                  title="Remove this stage"
                >×</button>
              </div>
              <button class="stage-insert-btn" @click="addStageAfter(stage)" :title="`Insert new stage after stage ${stage}`">
                + insert stage after {{ stage }}
              </button>
            </template>
          </div>
        </div>

        <div class="field-grid">
          <NumField v-model="drafts.pods.stageDuration" label="Stage duration" suffix="pod-rounds"
            help="Pod-rounds spent in each of stages 1–6 before promoting (stage 7 is eternal)." />
          <NumField v-model="drafts.pods.gapSuperTightMs" label="Gap: super tight" suffix="ms"
            help="known→target, target→target inside one chunk." />
          <NumField v-model="drafts.pods.gapTightMs" label="Gap: tight" suffix="ms"
            help="target→known inside one chunk." />
          <NumField v-model="drafts.pods.gapGluedMs" label="Gap: glued" suffix="ms"
            help="Between chunks marked glue_to_next (early stages)." />
          <NumField v-model="drafts.pods.gapBetweenMs" label="Gap: between" suffix="ms"
            help="Default chunk gap. Also intro→first play and last play→outro." />
        </div>
      </section>

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

      <!-- ==================== TURBO ==================== -->
      <section v-if="drafts.turbo_boost" class="config-row">
        <RowHeader
          title="Turbo boost"
          desc="What Turbo culls (script side) and how it tightens timing (runtime). fibKeep gates which fib-offset spaced-rep cycles survive."
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
          <NumField v-model="drafts.turbo_boost.playback_speed" label="Playback speed" suffix="×" :step="0.05" />
          <NumField v-model="drafts.turbo_boost.pause_base_ms" label="Pause base" suffix="ms" />
          <NumField v-model="drafts.turbo_boost.pause_multiplier" label="Pause multiplier" suffix="× target dur" :step="0.05" />
          <NumField v-model="drafts.turbo_boost.min_pause_ms" label="Pause floor" suffix="ms" />
          <NumField v-model="drafts.turbo_boost.max_pause_ms" label="Pause ceiling" suffix="ms" />
        </div>
      </section>

      <!-- ==================== NORMAL ==================== -->
      <section v-if="drafts.normal_mode" class="config-row">
        <RowHeader
          title="Normal mode"
          desc="Default playback timing — pauses are computed from these. The other ModeConfig fields aren't read in normal mode (kept for parity)."
          :row="rowMap.normal_mode"
          :dirty="isDirty('normal_mode')"
          :saving="savingKey === 'normal_mode'"
          :error="rowErrors.normal_mode"
          @save="save('normal_mode')"
          @reset="reset('normal_mode')"
        />

        <div class="field-grid">
          <NumField v-model="drafts.normal_mode.playback_speed" label="Playback speed" suffix="×" :step="0.05" />
          <NumField v-model="drafts.normal_mode.pause_base_ms" label="Pause base" suffix="ms" />
          <NumField v-model="drafts.normal_mode.pause_multiplier" label="Pause multiplier" suffix="× target dur" :step="0.05" />
          <NumField v-model="drafts.normal_mode.min_pause_ms" label="Pause floor" suffix="ms" />
          <NumField v-model="drafts.normal_mode.max_pause_ms" label="Pause ceiling" suffix="ms" />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, defineComponent, h, toRef } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { getAccessToken, isAdmin, learner: currentUser } = useAuth()

const KEYS = ['listening', 'pods', 'script_shape', 'turbo_boost', 'normal_mode']
const ROLE_LABEL = { ps: '1×', ps2x: '2×', trans: 'EN' }
const ROLE_DESC = {
  ps: 'target at 1.0× — slow listen for clarity',
  ps2x: 'target at 2.0× — fast rep for retention',
  trans: 'known-language audio at 1.0×',
}
// The audio proxy lives on saysomethingin.app (CORS *). popty.app doesn't
// serve /api/audio so we hit the deployed learning-app endpoint directly.
const AUDIO_BASE = 'https://saysomethingin.app/api/audio'

const rows = ref([])
const loading = ref(true)
const loadError = ref(null)
const savingKey = ref(null)
const rowErrors = reactive({})

// ============================================================================
// Course preview state
// ============================================================================
const allCourses = ref([])
const selectedCourseCode = ref('')
const previewRound = ref(100)
const courseLoading = ref(false)
const courseLegos = ref([])           // is_new only, ordered by seed,lego_index
const courseSeeds = ref([])           // course_seeds rows for picked course

const seedLastRound = computed(() => {
  // Mirrors generateLearningScript.ts: seeds processed in seed_number order;
  // within a seed, is_new LEGOs in lego_index order; each = one round.
  const bySeed = new Map()
  for (const l of courseLegos.value) {
    if (!l.is_new) continue
    if (!bySeed.has(l.seed_number)) bySeed.set(l.seed_number, [])
    bySeed.get(l.seed_number).push(l)
  }
  const sortedSeeds = [...bySeed.keys()].sort((a, b) => a - b)
  const map = new Map()
  let round = 0
  for (const sNum of sortedSeeds) {
    const inSeed = bySeed.get(sNum).sort((a, b) => a.lego_index - b.lego_index)
    for (const _ of inSeed) round++
    map.set(sNum, round)
  }
  return map
})
const totalSeeds = computed(() => seedLastRound.value.size)
const previewRoundMax = computed(() => {
  const r = courseLegos.value.filter(l => l.is_new).length
  return Math.max(r, 100)
})

const seedRowMap = computed(() => new Map(courseSeeds.value.map(s => [s.seed_number, s])))

const graduatedQueue = computed(() => {
  const off = drafts.listening?.offset ?? 56
  const r = previewRound.value
  return [...seedLastRound.value.entries()]
    .filter(([, last]) => r - last >= off)
    .sort((a, b) => a[1] - b[1] || a[0] - b[0])
    .map(([s]) => s)
})
const activeWindow = computed(() => {
  const size = drafts.listening?.l1ActiveSize ?? 10
  return graduatedQueue.value.slice(-size)
})
const reserveWindow = computed(() => {
  const aSize = drafts.listening?.l1ActiveSize ?? 10
  const rSize = drafts.listening?.l1ReserveSize ?? 50
  if (graduatedQueue.value.length <= aSize) return []
  const end = graduatedQueue.value.length - aSize
  const start = Math.max(0, end - rSize)
  return graduatedQueue.value.slice(start, end)
})
const l1ActiveFires = computed(() => {
  const r = previewRound.value
  const interval = drafts.listening?.l1ActiveInterval ?? 3
  return r > 0 && r % interval === 0 && graduatedQueue.value.length > 0
})
const l1ReserveFires = computed(() => {
  const r = previewRound.value
  const interval = drafts.listening?.l1ReserveInterval ?? 13
  const aSize = drafts.listening?.l1ActiveSize ?? 10
  return r > 0 && r % interval === 0 && graduatedQueue.value.length > aSize
})

function seedDisplayTarget(sNum) {
  const row = seedRowMap.value.get(sNum)
  if (!row) return '— missing in course_seeds —'
  return row.target_text_roman || row.target_text || ''
}
function seedDisplayKnown(sNum) {
  const row = seedRowMap.value.get(sNum)
  return row?.known_text || ''
}
function seedAudioId(sNum, role) {
  const row = seedRowMap.value.get(sNum)
  if (!row) return null
  // 'trans' plays known audio; 'ps' / 'ps2x' play target.
  return role === 'trans' ? row.known_audio_id : row.target1_audio_id
}

// ---------------------------------------------------------------------
// Per-seed L1 stage progression (mirrors generateLearningScript.ts)
// ---------------------------------------------------------------------
// Each L1 emit increments a per-seed fire counter; stage = layer1StageFor
// (fireCount), capped at the eternal stage. Active-window seeds sit in
// the active window from graduation onward, so prior fires = number of
// active-interval-multiples between graduation and (R - 1).
function seedL1PriorFires(sNum) {
  const last = seedLastRound.value.get(sNum)
  if (last == null) return 0
  const off = drafts.listening?.offset ?? 56
  const gR = last + off
  const interval = drafts.listening?.l1ActiveInterval ?? 3
  const R = previewRound.value
  if (R < gR || interval <= 0) return 0
  return Math.floor((R - 1) / interval) - Math.floor((gR - 1) / interval)
}

function seedL1Stage(sNum) {
  const sp = drafts.listening?.layer1StagePlaylist || {}
  const keys = Object.keys(sp).map(Number).filter(n => !Number.isNaN(n)).sort((a, b) => a - b)
  if (keys.length === 0) return null
  const eternal = keys[keys.length - 1]
  const duration = drafts.listening?.layer1StageDuration ?? 3
  // Fire count for this emission = prior + 1 — the playlist for the
  // next/current fire slot, which is what the admin wants to audition.
  const fireCount = seedL1PriorFires(sNum) + 1
  for (const stage of keys) {
    if (stage === eternal) return stage
    if (fireCount <= stage * duration) return stage
  }
  return eternal
}

function seedL1Playlist(sNum) {
  const stage = seedL1Stage(sNum)
  if (stage == null) return drafts.listening?.layer1Playlist || []
  const list = getL1StageList(stage)
  if (list && list.length) return list
  return drafts.listening?.layer1Playlist || []
}
function audioUrl(audioId) {
  if (!audioId || !selectedCourseCode.value) return null
  return `${AUDIO_BASE}/${audioId}?courseId=${encodeURIComponent(selectedCourseCode.value)}`
}

let currentAudio = null
function playOne(sNum, role) {
  const id = seedAudioId(sNum, role)
  const url = audioUrl(id)
  if (!url) return
  if (currentAudio) { try { currentAudio.pause() } catch {} }
  const a = new Audio(url)
  a.playbackRate = role === 'ps2x' ? 2.0 : 1.0
  a.play().catch(err => console.warn('audio play failed:', err))
  currentAudio = a
}
async function playSequence(sNum) {
  if (currentAudio) { try { currentAudio.pause() } catch {} }
  const playlist = seedL1Playlist(sNum)
  for (const role of playlist) {
    const id = seedAudioId(sNum, role)
    const url = audioUrl(id)
    if (!url) continue
    await new Promise((resolve) => {
      const a = new Audio(url)
      a.playbackRate = role === 'ps2x' ? 2.0 : 1.0
      currentAudio = a
      a.onended = resolve
      a.onerror = resolve
      a.play().catch(resolve)
    })
    // Inter-pill gap: small breath between plays in the preview.
    await new Promise((r) => setTimeout(r, 250))
  }
}

async function loadCoursePreview(courseCode) {
  courseLoading.value = true
  courseLegos.value = []
  courseSeeds.value = []
  try {
    const sb = await import('../services/supabase').then(m => m.supabase)
    if (!sb) throw new Error('Supabase not configured')

    // is_new LEGOs (paginated — Supabase REST defaults to 1000 rows)
    const legos = []
    let from = 0
    const limit = 1000
    while (true) {
      const { data, error } = await sb
        .from('course_legos')
        .select('seed_number, lego_index, is_new')
        .eq('course_code', courseCode)
        .order('seed_number', { ascending: true })
        .order('lego_index', { ascending: true })
        .range(from, from + limit - 1)
      if (error) throw error
      legos.push(...(data || []))
      if (!data || data.length < limit) break
      from += limit
    }
    courseLegos.value = legos

    // Seed sentences
    const seeds = []
    from = 0
    while (true) {
      const { data, error } = await sb
        .from('course_seeds')
        .select('seed_number, known_text, target_text, target_text_roman, known_audio_id, target1_audio_id, target2_audio_id')
        .eq('course_code', courseCode)
        .order('seed_number', { ascending: true })
        .range(from, from + limit - 1)
      if (error) throw error
      seeds.push(...(data || []))
      if (!data || data.length < limit) break
      from += limit
    }
    courseSeeds.value = seeds
  } catch (e) {
    console.warn('[preview] load failed:', e)
  } finally {
    courseLoading.value = false
  }
}

async function onCourseChange() {
  if (selectedCourseCode.value) {
    await loadCoursePreview(selectedCourseCode.value)
    if (previewRound.value > previewRoundMax.value) previewRound.value = previewRoundMax.value
  } else {
    courseLegos.value = []
    courseSeeds.value = []
  }
}

async function loadCourseList() {
  try {
    const sb = await import('../services/supabase').then(m => m.supabase)
    if (!sb) return
    const { data, error } = await sb.from('courses').select('course_code').order('course_code')
    if (error) throw error
    allCourses.value = data || []
  } catch (e) {
    console.warn('[preview] course list load failed:', e)
  }
}

// `drafts` mirrors each row's config and is what the form mutates.
// `rowMap` is the pristine server state — used for dirty-checks and Reset.
const drafts = reactive({})
const rowMap = computed(() => Object.fromEntries(rows.value.map(r => [r.key, r])))

const scriptShapeOffsets = computed(() => drafts.script_shape?.spacedRepOffsets || [])

function deepClone(v) { return JSON.parse(JSON.stringify(v)) }

function isDirty(key) {
  if (!drafts[key] || !rowMap.value[key]) return false
  return JSON.stringify(drafts[key]) !== JSON.stringify(rowMap.value[key].config)
}

function reset(key) {
  if (!rowMap.value[key]) return
  drafts[key] = deepClone(rowMap.value[key].config)
  rowErrors[key] = null
}

async function save(key) {
  savingKey.value = key
  rowErrors[key] = null
  try {
    const token = await getAccessToken()
    if (!token) throw new Error('Not signed in')
    const res = await fetch('/api/algorithm-config', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ key, config: deepClone(drafts[key]) }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`)
    const idx = rows.value.findIndex(r => r.key === key)
    if (idx >= 0 && data.row) rows.value[idx] = data.row
  } catch (e) {
    rowErrors[key] = e.message || String(e)
  } finally {
    savingKey.value = null
  }
}

// Sorted numeric stage keys. Stages are dynamic — admins can add or
// remove stages from this page; the highest-numbered stage is the
// eternal hold and the rest are transitional in order.
const podsStageKeys = computed(() => {
  const sp = drafts.pods?.stagePlaylist
  if (!sp) return []
  return Object.keys(sp).map(Number).filter(n => !Number.isNaN(n)).sort((a, b) => a - b)
})
const l1StageKeys = computed(() => {
  const sp = drafts.listening?.layer1StagePlaylist
  if (!sp) return []
  return Object.keys(sp).map(Number).filter(n => !Number.isNaN(n)).sort((a, b) => a - b)
})

function getStageList(stage) {
  if (!drafts.pods) return []
  const sp = drafts.pods.stagePlaylist || {}
  return sp[String(stage)] || sp[stage] || []
}
function setStageList(stage, list) {
  if (!drafts.pods) return
  if (!drafts.pods.stagePlaylist) drafts.pods.stagePlaylist = {}
  drafts.pods.stagePlaylist[String(stage)] = list
}

/** Insert a new stage immediately after `stage`. Shifts all higher
 *  keys up by 1; new stage seeds with a sensible playlist. */
function addStageAfter(stage) {
  if (!drafts.pods) return
  const sp = drafts.pods.stagePlaylist || {}
  const keys = podsStageKeys.value
  const next = {}
  for (const k of keys) {
    const newKey = k > stage ? k + 1 : k
    next[String(newKey)] = sp[String(k)] || sp[k] || []
  }
  next[String(stage + 1)] = ['ps', 'trans', 'ps', 'ps2x']
  drafts.pods.stagePlaylist = next
}

/** Remove a stage. Shifts all higher keys down by 1 so the sequence
 *  stays contiguous. Refuses to remove the last remaining stage. */
function removeStage(stage) {
  if (!drafts.pods) return
  const keys = podsStageKeys.value
  if (keys.length <= 1) return
  const sp = drafts.pods.stagePlaylist || {}
  const next = {}
  for (const k of keys) {
    if (k === stage) continue
    const newKey = k > stage ? k - 1 : k
    next[String(newKey)] = sp[String(k)] || sp[k] || []
  }
  drafts.pods.stagePlaylist = next
}

// L1 staged-playlist helpers — identical shape to the pods ones above
// (mirror Layer 2's stage UX). Per-seed fire counter advances on each L1
// emit; stage = floor((fireCount-1)/layer1StageDuration)+1, capped at
// the highest key (eternal hold).
function getL1StageList(stage) {
  if (!drafts.listening) return []
  const sp = drafts.listening.layer1StagePlaylist || {}
  return sp[String(stage)] || sp[stage] || []
}
function setL1StageList(stage, list) {
  if (!drafts.listening) return
  if (!drafts.listening.layer1StagePlaylist) drafts.listening.layer1StagePlaylist = {}
  drafts.listening.layer1StagePlaylist[String(stage)] = list
}
function addL1StageAfter(stage) {
  if (!drafts.listening) return
  const sp = drafts.listening.layer1StagePlaylist || {}
  const keys = l1StageKeys.value
  const next = {}
  for (const k of keys) {
    const newKey = k > stage ? k + 1 : k
    next[String(newKey)] = sp[String(k)] || sp[k] || []
  }
  next[String(stage + 1)] = ['ps2x', 'ps2x']
  drafts.listening.layer1StagePlaylist = next
}
function removeL1Stage(stage) {
  if (!drafts.listening) return
  const keys = l1StageKeys.value
  if (keys.length <= 1) return
  const sp = drafts.listening.layer1StagePlaylist || {}
  const next = {}
  for (const k of keys) {
    if (k === stage) continue
    const newKey = k > stage ? k - 1 : k
    next[String(newKey)] = sp[String(k)] || sp[k] || []
  }
  drafts.listening.layer1StagePlaylist = next
}

function toggleFib(idx) {
  const tb = drafts.turbo_boost
  if (!tb) return
  const set = new Set(tb.fibKeep || [])
  if (set.has(idx)) set.delete(idx)
  else set.add(idx)
  tb.fibKeep = [...set].sort((a, b) => a - b)
}

async function loadAll() {
  loading.value = true
  loadError.value = null
  try {
    const res = await fetch('/api/algorithm-config')
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    const data = await res.json()
    rows.value = data.rows || []
    for (const r of rows.value) {
      drafts[r.key] = deepClone(r.config)
      rowErrors[r.key] = null
    }
  } catch (e) {
    loadError.value = e.message || String(e)
  } finally {
    loading.value = false
  }
}

function goBack() { router.back() }

onMounted(() => {
  loadAll()
  loadCourseList()
})

// ============================================================================
// PlaylistEditor — pills for ['ps','ps2x','trans']. Tap to cycle role,
// arrows to reorder, × to remove, + to add. Reusable for layer1Playlist
// and the 7 stage playlists.
// ============================================================================
const PlaylistEditor = defineComponent({
  name: 'PlaylistEditor',
  props: {
    modelValue: { type: Array, required: true },
    compact: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const ROLES = ['ps', 'ps2x', 'trans']
    const ROLE_LABEL = { ps: '1×', ps2x: '2×', trans: 'EN' }

    function update(next) { emit('update:modelValue', next) }
    function cycle(idx) {
      const cur = props.modelValue[idx]
      const nextRole = ROLES[(ROLES.indexOf(cur) + 1) % ROLES.length]
      const next = [...props.modelValue]
      next[idx] = nextRole
      update(next)
    }
    function moveLeft(idx) {
      if (idx === 0) return
      const next = [...props.modelValue]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      update(next)
    }
    function moveRight(idx) {
      if (idx === props.modelValue.length - 1) return
      const next = [...props.modelValue]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      update(next)
    }
    function removeAt(idx) {
      const next = [...props.modelValue]
      next.splice(idx, 1)
      update(next)
    }
    function add() {
      update([...props.modelValue, 'ps'])
    }

    return () => h('div', { class: ['playlist-editor', { compact: props.compact }] },
      [
        ...props.modelValue.map((role, idx) =>
          h('div', { class: 'pill-wrap', key: `${idx}-${role}` }, [
            h('button', {
              class: ['role-pill', `role-${role}`],
              title: 'Tap to cycle role',
              onClick: () => cycle(idx),
            }, [
              h('span', { class: 'pill-num' }, String(idx + 1)),
              ROLE_LABEL[role] || role,
            ]),
            h('div', { class: 'pill-controls' }, [
              h('button', {
                class: 'micro', title: 'Move left',
                disabled: idx === 0, onClick: () => moveLeft(idx),
              }, '←'),
              h('button', {
                class: 'micro', title: 'Move right',
                disabled: idx === props.modelValue.length - 1, onClick: () => moveRight(idx),
              }, '→'),
              h('button', {
                class: 'micro remove', title: 'Remove',
                disabled: props.modelValue.length <= 1, onClick: () => removeAt(idx),
              }, '×'),
            ]),
          ])
        ),
        h('button', { class: 'add-pill', title: 'Add', onClick: add }, '+'),
      ]
    )
  },
})

// ============================================================================
// NumField — labelled number input with suffix + tooltip help.
// ============================================================================
const NumField = defineComponent({
  name: 'NumField',
  props: {
    modelValue: { type: [Number, String], default: 0 },
    label: { type: String, required: true },
    suffix: { type: String, default: '' },
    step: { type: Number, default: 1 },
    help: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () => h('div', { class: 'num-field', title: props.help || undefined }, [
      h('label', null, props.label),
      h('div', { class: 'num-input-wrap' }, [
        h('input', {
          type: 'number',
          step: props.step,
          value: props.modelValue,
          onInput: (e) => {
            const n = Number(e.target.value)
            emit('update:modelValue', Number.isNaN(n) ? e.target.value : n)
          },
        }),
        props.suffix ? h('span', { class: 'suffix' }, props.suffix) : null,
      ]),
    ])
  },
})

// ============================================================================
// NumListField — comma-separated number list (for spacedRepOffsets).
// ============================================================================
const NumListField = defineComponent({
  name: 'NumListField',
  props: { modelValue: { type: Array, required: true } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const text = ref(props.modelValue.join(', '))
    return () => h('input', {
      type: 'text',
      class: 'num-list-input',
      value: text.value,
      onInput: (e) => {
        text.value = e.target.value
        const parts = e.target.value.split(',').map(s => s.trim()).filter(Boolean)
        const nums = parts.map(s => Number(s)).filter(n => !Number.isNaN(n))
        emit('update:modelValue', nums)
      },
    })
  },
})

// ============================================================================
// RowHeader — title + last-saved meta + Save/Reset buttons + error display.
// ============================================================================
const RowHeader = defineComponent({
  name: 'RowHeader',
  props: {
    title: String,
    desc: String,
    row: Object,
    dirty: Boolean,
    saving: Boolean,
    error: String,
  },
  emits: ['save', 'reset'],
  setup(props, { emit }) {
    function fmt(t) { try { return new Date(t).toLocaleString() } catch { return t } }
    return () => h('div', { class: 'row-header' }, [
      h('div', { class: 'row-title-line' }, [
        h('h2', null, props.title),
        h('div', { class: 'row-actions' }, [
          h('button', {
            class: 'btn-secondary',
            disabled: !props.dirty || props.saving,
            onClick: () => emit('reset'),
          }, 'Reset'),
          h('button', {
            class: 'btn-primary',
            disabled: !props.dirty || props.saving,
            onClick: () => emit('save'),
          }, props.saving ? 'Saving…' : 'Save'),
        ]),
      ]),
      h('div', { class: 'row-meta' },
        `Last saved: ${props.row ? fmt(props.row.updated_at) : '—'}` +
        (props.row?.updated_by ? ` by ${props.row.updated_by}` : '')
      ),
      props.desc ? h('p', { class: 'row-desc' }, props.desc) : null,
      props.error ? h('div', { class: 'save-err' }, ['Save failed: ', props.error]) : null,
    ])
  },
})
</script>

<style scoped>
.listening-admin {
  padding: 1.5rem;
  max-width: 1100px;
  margin: 0 auto;
  color: var(--color-paper, #f7f7f2);
}

.admin-header {
  margin-bottom: 1.5rem;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: start;
  column-gap: 0.75rem;
  row-gap: 0.5rem;
}
.admin-header > .admin-warn { grid-column: 1 / -1; }
.back-btn {
  background: transparent;
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 8px;
  color: var(--color-paper-dim, #94a3b8);
  font-size: 1rem;
  width: 36px; height: 36px;
  cursor: pointer;
}
.back-btn:hover { border-color: var(--color-paper-dim, #94a3b8); color: var(--color-paper, #f7f7f2); }
h1 { font-size: 1.25rem; margin: 0 0 0.25rem; letter-spacing: -0.01em; }
.sub { margin: 0; color: var(--color-paper-dim, #94a3b8); font-size: 0.875rem; line-height: 1.5; max-width: 700px; }
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
  color: var(--color-paper-dim, #94a3b8);
}
.err { color: #f87171; background: rgba(248, 113, 113, 0.08); border-radius: 8px; }

.rows {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.config-row {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--color-graphite, #334155);
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
:deep(.row-title-line h2) {
  margin: 0;
  font-size: 1rem;
  letter-spacing: -0.01em;
}
:deep(.row-actions) { display: flex; gap: 0.5rem; }
:deep(.row-meta) {
  margin-top: 0.25rem;
  font-size: 0.7rem;
  color: var(--color-paper-dim, #94a3b8);
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
}
:deep(.row-desc) {
  margin: 0.5rem 0 0;
  color: var(--color-paper-dim, #94a3b8);
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
  color: var(--color-paper-dim, #94a3b8);
  margin-bottom: 0.5rem;
}
.hint {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 400;
  color: var(--color-paper-dim, #64748b);
  margin-left: 0.5rem;
  font-size: 0.7rem;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem 1rem;
}

/* NumField */
:deep(.num-field) {
  display: flex;
  flex-direction: column;
}
:deep(.num-field label) {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-paper-dim, #94a3b8);
  margin-bottom: 0.25rem;
}
:deep(.num-input-wrap) {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--color-graphite, #334155);
  border-radius: 6px;
  overflow: hidden;
}
:deep(.num-input-wrap:focus-within) { border-color: #60a5fa; }
:deep(.num-input-wrap input) {
  flex: 1;
  background: transparent;
  border: 0;
  outline: none;
  color: var(--color-paper, #f7f7f2);
  padding: 0.5rem 0.75rem;
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  font-size: 0.875rem;
}
:deep(.suffix) {
  padding: 0 0.75rem;
  font-size: 0.75rem;
  color: var(--color-paper-dim, #94a3b8);
  white-space: nowrap;
}

/* NumListField */
:deep(.num-list-input) {
  width: 100%;
  background: rgba(0, 0, 0, 0.25);
  color: var(--color-paper, #f7f7f2);
  border: 1px solid var(--color-graphite, #334155);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  font-size: 0.875rem;
  outline: none;
  box-sizing: border-box;
}
:deep(.num-list-input:focus) { border-color: #60a5fa; }

/* PlaylistEditor */
:deep(.playlist-editor) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: flex-start;
}
:deep(.pill-wrap) {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
:deep(.role-pill) {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem 0.4rem 0.5rem;
  border-radius: 999px;
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: transform 0.1s ease, filter 0.15s ease;
}
:deep(.role-pill:active) { transform: scale(0.96); }
:deep(.role-pill:hover) { filter: brightness(1.1); }
:deep(.role-pill.role-ps)    { background: #fbbf24; color: #422006; }
:deep(.role-pill.role-ps2x)  { background: #f97316; color: #431407; }
:deep(.role-pill.role-trans) { background: #6b7280; color: #f9fafb; }
:deep(.pill-num) {
  background: rgba(0,0,0,0.18);
  color: inherit;
  font-size: 0.65rem;
  border-radius: 999px;
  width: 16px; height: 16px;
  display: inline-flex;
  align-items: center; justify-content: center;
}
:deep(.pill-controls) { display: inline-flex; gap: 2px; }
:deep(.micro) {
  width: 22px; height: 18px;
  border-radius: 4px;
  border: 1px solid var(--color-graphite, #475569);
  background: transparent;
  color: var(--color-paper-dim, #94a3b8);
  font-size: 0.7rem;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center; justify-content: center;
}
:deep(.micro:hover:not(:disabled)) { color: var(--color-paper, #f7f7f2); border-color: var(--color-paper-dim, #94a3b8); }
:deep(.micro:disabled) { opacity: 0.3; cursor: not-allowed; }
:deep(.micro.remove:hover:not(:disabled)) { color: #f87171; border-color: #f87171; }
:deep(.add-pill) {
  width: 32px; height: 32px;
  border-radius: 999px;
  border: 1px dashed var(--color-graphite, #475569);
  background: transparent;
  color: var(--color-paper-dim, #94a3b8);
  font-size: 1rem;
  cursor: pointer;
}
:deep(.add-pill:hover) { color: var(--color-paper, #f7f7f2); border-color: var(--color-paper-dim, #94a3b8); }

:deep(.playlist-editor.compact .role-pill) { padding: 0.25rem 0.6rem 0.25rem 0.35rem; font-size: 0.7rem; }
:deep(.playlist-editor.compact .pill-num) { width: 14px; height: 14px; font-size: 0.6rem; }
:deep(.playlist-editor.compact .micro) { height: 16px; font-size: 0.65rem; }
:deep(.playlist-editor.compact .add-pill) { width: 26px; height: 26px; font-size: 0.85rem; }

/* Stage grid */
.stage-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.stage-row {
  display: grid;
  grid-template-columns: 90px 1fr 28px;
  gap: 0.75rem;
  align-items: center;
  padding: 0.4rem 0.5rem;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 6px;
}
.stage-label {
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  font-size: 0.75rem;
  color: var(--color-paper-dim, #94a3b8);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stage-eternal {
  font-size: 0.6rem;
  color: #93c5fd;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.stage-remove-btn {
  width: 28px; height: 28px;
  border-radius: 6px;
  border: 1px solid var(--color-graphite, #475569);
  background: transparent;
  color: var(--color-paper-dim, #94a3b8);
  font-size: 1rem;
  cursor: pointer;
}
.stage-remove-btn:hover:not(:disabled) {
  border-color: #f87171;
  color: #f87171;
}
.stage-remove-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.stage-insert-btn {
  align-self: stretch;
  margin: 0;
  padding: 4px;
  border-radius: 4px;
  border: 1px dashed transparent;
  background: transparent;
  color: var(--color-paper-dim, #64748b);
  font-size: 0.7rem;
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  cursor: pointer;
  transition: all 0.15s;
}
.stage-insert-btn:hover {
  border-color: var(--color-graphite, #475569);
  color: var(--color-paper, #f7f7f2);
}

/* Fib pills */
.fib-row {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.fib-pill {
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--color-graphite, #475569);
  background: transparent;
  color: var(--color-paper-dim, #94a3b8);
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}
.fib-pill:hover { color: var(--color-paper, #f7f7f2); border-color: var(--color-paper-dim, #94a3b8); }
.fib-pill.on {
  background: rgba(96, 165, 250, 0.15);
  border-color: #60a5fa;
  color: #93c5fd;
}

/* Preview bar (sticky) */
.preview-bar {
  position: sticky;
  top: 0;
  z-index: 5;
  margin: 0 -1.5rem 1rem;
  padding: 0 1.5rem;
  background: rgba(15, 23, 42, 0.92);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--color-graphite, #334155);
}
.preview-bar-inner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 0.65rem 0;
}
.picker-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.picker-group label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-paper-dim, #94a3b8);
}
.picker-group select,
.picker-group input[type="number"] {
  background: rgba(0,0,0,0.3);
  border: 1px solid var(--color-graphite, #334155);
  border-radius: 6px;
  color: var(--color-paper, #f7f7f2);
  padding: 0.35rem 0.5rem;
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  font-size: 0.8125rem;
  outline: none;
}
.picker-group select:focus,
.picker-group input:focus { border-color: #60a5fa; }
.picker-group input[type="number"] { width: 70px; text-align: center; }
.round-group { flex: 1; min-width: 280px; }
.round-group input[type="range"] {
  flex: 1;
  accent-color: #60a5fa;
  min-width: 120px;
}
.round-display {
  font-size: 0.75rem;
  color: var(--color-paper-dim, #94a3b8);
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
}
.preview-stats {
  display: flex;
  gap: 0.85rem;
  font-size: 0.75rem;
  color: var(--color-paper-dim, #94a3b8);
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
}
.preview-stats strong { color: var(--color-paper, #f7f7f2); }
.preview-loading {
  font-size: 0.75rem;
  color: var(--color-paper-dim, #94a3b8);
  font-style: italic;
}

/* Preview block (inside Layer 1 section) */
.preview-block {
  margin-top: 1.5rem;
  padding: 1rem 1.25rem;
  background: rgba(96, 165, 250, 0.06);
  border: 1px solid rgba(96, 165, 250, 0.2);
  border-radius: 8px;
}
.preview-block-head {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: baseline;
  margin-bottom: 0.75rem;
}
.preview-block-title {
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #93c5fd;
}
.preview-block-meta {
  font-size: 0.75rem;
  color: var(--color-paper-dim, #94a3b8);
}
.preview-empty {
  font-style: italic;
  color: var(--color-paper-dim, #94a3b8);
  font-size: 0.8125rem;
  padding: 0.5rem 0;
}
.preview-seeds {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.preview-seeds.compact { gap: 0.25rem; }
.preview-seed {
  background: rgba(0, 0, 0, 0.18);
  border-radius: 6px;
  padding: 0.6rem 0.8rem;
}
.preview-seed.compact { padding: 0.35rem 0.6rem; }
.preview-seed-head {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.seed-id {
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  font-size: 0.7rem;
  color: var(--color-paper-dim, #94a3b8);
  min-width: 56px;
}
.seed-stage {
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-paper-dim, #94a3b8);
  background: rgba(255, 255, 255, 0.06);
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
}
.seed-target { font-weight: 500; }
.seed-known {
  color: var(--color-paper-dim, #94a3b8);
  font-style: italic;
  font-size: 0.875rem;
}
.preview-seed-pills {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}
.preview-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.65rem 0.3rem 0.4rem;
  border-radius: 999px;
  border: 1px solid transparent;
  cursor: pointer;
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  font-size: 0.75rem;
  font-weight: 600;
  transition: filter 0.15s ease, transform 0.1s ease;
}
.preview-pill:hover:not(:disabled) { filter: brightness(1.1); }
.preview-pill:active { transform: scale(0.96); }
.preview-pill:disabled { opacity: 0.3; cursor: not-allowed; }
.preview-pill .pill-num {
  background: rgba(0,0,0,0.18);
  font-size: 0.6rem;
  border-radius: 999px;
  width: 14px; height: 14px;
  display: inline-flex;
  align-items: center; justify-content: center;
}
.preview-pill .pill-icon { font-size: 0.65rem; opacity: 0.7; }
.preview-pill.role-ps    { background: #fbbf24; color: #422006; }
.preview-pill.role-ps2x  { background: #f97316; color: #431407; }
.preview-pill.role-trans { background: #6b7280; color: #f9fafb; }
.preview-sequence {
  margin-left: auto;
  background: transparent;
  border: 1px solid var(--color-graphite, #475569);
  color: var(--color-paper-dim, #94a3b8);
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  font-size: 0.7rem;
  cursor: pointer;
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
}
.preview-sequence:hover { border-color: var(--color-paper, #f7f7f2); color: var(--color-paper, #f7f7f2); }
.preview-reserve {
  margin-top: 0.75rem;
  font-size: 0.75rem;
}
.preview-reserve summary {
  color: var(--color-paper-dim, #94a3b8);
  cursor: pointer;
  padding: 0.4rem 0;
}
.preview-reserve summary:hover { color: var(--color-paper, #f7f7f2); }
.preview-reserve[open] .preview-seeds { margin-top: 0.5rem; }

/* Buttons (primary / secondary) */
.btn-primary, .btn-secondary,
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
:deep(.btn-primary:disabled) { background: #334155; border-color: #334155; cursor: not-allowed; opacity: 0.5; }
:deep(.btn-secondary) {
  background: transparent;
  border-color: var(--color-graphite, #475569);
  color: var(--color-paper-dim, #94a3b8);
}
:deep(.btn-secondary:hover:not(:disabled)) { border-color: var(--color-paper, #f7f7f2); color: var(--color-paper, #f7f7f2); }
:deep(.btn-secondary:disabled) { opacity: 0.4; cursor: not-allowed; }
</style>
