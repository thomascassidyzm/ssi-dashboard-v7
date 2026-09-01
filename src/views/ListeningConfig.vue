<template>
  <div class="listening-admin">
    <header class="admin-header">
      <nav class="admin-crumbs">
        <router-link to="/" class="crumb-link">Home</router-link>
        <span class="crumb-sep">/</span>
        <router-link to="/admin/labs" class="crumb-link">Labs</router-link>
        <span class="crumb-sep">/</span>
        <span class="crumb-here">Listening</span>
      </nav>
      <div class="admin-head-main">
        <div class="admin-head-titles">
          <h1>Listening config</h1>
          <p class="sub">
            One home for all listening behaviour — Layer 1 (seeds), Stage 0 (pod
            breakdown), Stages 1-9 (pod escalation). Global: every course, every
            learner. Changes propagate to new sessions within ~5 min (cache TTL).
          </p>
        </div>
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
          <CoursePicker :modelValue="selectedCourseCode" @update:modelValue="onCoursePick" placeholder="Search courses…" />
        </div>
        <div v-if="selectedCourseCode" class="preview-stats">
          <span>{{ totalSeeds }} seeds</span>
        </div>
        <div v-if="courseLoading" class="preview-loading">Loading course data…</div>
      </div>
    </div>

    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="loadError" class="err"><strong>Failed to load:</strong> {{ loadError }}</div>

    <div v-else class="rows">
      <!-- ==================== LAYER 1 (seed listening) ==================== -->
      <section v-if="drafts.listening" class="config-row">
        <RowHeader
          title="Layer 1 — seed listening (cup wheel)"
          desc="Fluency maintenance through input: introduced seeds collect into cups, one cup poured at the end of every round. These knobs + the per-seed sandwich below drive useLayer1Scheduler live (the cup placement/cluster logic itself stays in code)."
          :row="rowMap.listening"
          :dirty="isDirty('listening')"
          :saving="savingKey === 'listening'"
          :error="rowErrors.listening"
          @save="save('listening')"
          @reset="reset('listening')"
        />
        <div class="field-grid">
          <NumField v-model="drafts.listening.cups" label="Cups in the wheel" suffix="cups" help="One cup poured per round. Batch size = cups." />
          <NumField v-model="drafts.listening.activationCount" label="Activation count" suffix="seeds" help="Introduced-seed count before the first lap fires (also the one-seed-per-cup point)." />
          <NumField v-model="drafts.listening.maxSeedsPerCup" label="Max seeds / cup" suffix="seeds" help="Cup-fill caps at cups × this (e.g. 30 × 20 = 600 introduced)." />
          <NumField v-model="drafts.listening.clusterStep" label="Re-cluster every" suffix="seeds/cup" help="Re-cluster at each multiple of this many seeds per cup (5, 10, 15, 20…)." />
        </div>

        <div class="field-block">
          <label>Per-seed sandwich <span class="hint">what each seed plays in the poured cup · tap a pill to cycle its role · ↔ reorder · default: V1 → known → V2 → V1·2×</span></label>
          <L1PlaylistEditor :modelValue="seedPlaylist" @update:modelValue="setSeedPlaylist" />
          <p class="row-desc l1-roles-key">
            <strong>V1</strong> target voice 1 · <strong>V2</strong> target voice 2 · <strong>known</strong> the meaning (known-language clip) · <strong>·2×</strong> double-speed stretch rep. A seed with no second voice plays V1 for V2; no known audio drops the known slot.
          </p>
        </div>

        <!-- Lives on the LAYER 1 row, governs LAYER 2 — so it sits in this card,
             whose Save is the one that writes it. Until 2026-08-24 this field was
             absent from the row entirely, which defaults it false, which is why
             the pod fade below existed for eight weeks and reached nobody. -->
        <div class="field-block">
          <label>Layer 2 pod fade <span class="hint">the master switch for the stage ladder in the Pods card below · lives on this row, so Save this card</span></label>
          <label class="master-switch">
            <input type="checkbox" v-model="drafts.listening.listeningUseStagePlaylist" />
            <span>
              <strong>Run the stage playlist.</strong>
              On — each pod sentence climbs the stage ladder as it ages: t·k·t·t at 1×, thinning
              rung by rung to bare target at 2×, for ever. Off — every sentence, at every age,
              plays the same single four-slot pattern at 1×.
            </span>
          </label>
        </div>
      </section>

      <!-- ==================== STAGE 0 (pod breakdown ladder) ==================== -->
      <section v-if="drafts.stage0" class="config-row">
        <RowHeader
          title="Layer 2 · Stage 0 — breakdown ladder"
          desc="The whole-part-whole tiers a pod sentence climbs BEFORE Stages 1-9: whole take → per-atom 'X means Y' → fused pairs → whole intention. Plays only where a sentence resolves to atoms."
          :row="rowMap.stage0"
          :dirty="isDirty('stage0')"
          :saving="savingKey === 'stage0'"
          :error="rowErrors.stage0"
          @save="save('stage0')"
          @reset="reset('stage0')"
        />

        <div class="field-block">
          <label>Tiers <span class="hint">in play order · granularity = how the sentence is chunked · visits = times this tier repeats · T-reps = target reps after the known (1 = symmetric T·M·T) · fuse = pair fusion gap (ms, 'pairs' only) · reorder with ↑↓</span></label>
          <div class="tier-grid">
            <div v-for="(tier, idx) in stage0Tiers" :key="idx" class="tier-row">
              <span class="tier-idx">0:{{ idx + 1 }}</span>
              <input class="tier-key" v-model="tier.key" placeholder="key" title="Tier key — cosmetic label for the badge" />
              <select class="tier-gran" v-model="tier.granularity" title="Chunking granularity">
                <option v-for="g in GRANULARITIES" :key="g" :value="g">{{ g }}</option>
              </select>
              <label class="tier-num" title="Times this tier repeats">visits
                <input type="number" min="1" v-model.number="tier.visits" />
              </label>
              <label class="tier-num" title="Target reps AFTER the known (1 = symmetric T·M·T)">T-reps
                <input type="number" min="0" v-model.number="tier.targetRepeats" />
              </label>
              <label class="tier-num" title="Pair fusion gap (ms) — only meaningful for 'pairs' granularity. Blank = use the gaps matrix.">fuse
                <input type="number" min="0" :value="tier.fusionGap ?? ''" @input="setTierFusion(idx, $event.target.value)" placeholder="—" />
              </label>
              <button class="tier-move" :disabled="idx === 0" @click="moveStage0Tier(idx, -1)" title="Move up">↑</button>
              <button class="tier-move" :disabled="idx === stage0Tiers.length - 1" @click="moveStage0Tier(idx, 1)" title="Move down">↓</button>
              <button class="tier-remove" :disabled="stage0Tiers.length <= 1" @click="removeStage0Tier(idx)" title="Remove tier">×</button>
            </div>
            <button class="stage-insert-btn" @click="addStage0Tier()">+ add tier</button>
          </div>
        </div>

        <div class="field-grid">
          <NumField v-model="drafts.stage0.gaps.afterCue" label="Gap: after cue" suffix="ms" help="After the 'breaking it down' cue, before the first breakdown." />
          <NumField v-model="drafts.stage0.gaps.beforeMeans" label="Gap: before means" suffix="ms" help="Live cast→known voice change before the merged 'means …' clip. 0 = tight." />
          <NumField v-model="drafts.stage0.gaps.targetMeaning" label="Gap: target→meaning" suffix="ms" help="Between an atom's target slice and its meaning." />
          <NumField v-model="drafts.stage0.gaps.betweenRepeats" label="Gap: between repeats" suffix="ms" help="Between repeated target reps within a tier." />
          <NumField v-model="drafts.stage0.gaps.betweenChunks" label="Gap: between chunks" suffix="ms" help="Between atoms/chunks in the breakdown." />
          <NumField v-model="drafts.stage0.gaps.fusionPairs" label="Gap: fusion pairs" suffix="ms" help="Default gap inside a fused pair (per-tier 'fuse' overrides this)." />
          <NumField v-model="drafts.stage0.gaps.betweenIntentions" label="Gap: between intentions" suffix="ms" help="Between whole-intention takes." />
        </div>
      </section>

      <!-- ==================== FULL-ARC PREVIEW ==================== -->
      <section v-if="selectedCourseCode && coursePodSentences.length" class="config-row">
        <RowHeader
          title="Full escalation preview"
          desc="Hear one real sentence climb the WHOLE arc — Stage-0 tiers → Stages 1-N — composed with the shared learner composer, so the preview can't drift from delivery. Uses the live UNSAVED config (edit above, hear it here)."
        />
        <div class="arc-controls">
          <label class="arc-pick">Sentence
            <select v-model.number="arcSentenceIdx">
              <!-- An <option> holds text, not elements, so there is no child to
                   bind `dir` on and the LTR "12. " index would move if we
                   directed the option itself. `isolateText` wraps the sentence
                   in Unicode isolate controls instead — the plaintext form of
                   the same fix, index stays put, trailing `!` lands correctly. -->
              <option v-for="(s, i) in coursePodSentences" :key="i" :value="i">{{ i + 1 }}. {{ isolateText(s.target_text) }}</option>
            </select>
          </label>
          <button class="arc-play" :disabled="!arcIndexed.length || arcPlayingIdx >= 0" @click="playArc">▶ Play {{ showFullArc ? 'full arc' : 'breakdown' }} · {{ arcIndexed.length }} plays</button>
          <button class="arc-stop" :disabled="arcPlayingIdx < 0" @click="stopArc">■ Stop</button>
          <label class="arc-fulltoggle"><input type="checkbox" v-model="showFullArc" /> show Stages 1-N</label>
          <span v-if="!arcPlays.length" class="arc-empty">No playable arc — this sentence has no resolvable atoms/clips.</span>
        </div>
        <div class="arc-rows">
          <div v-for="(row, r) in arcRows" :key="r" class="arc-row">
            <span class="arc-row-label">{{ row.stageLabel }}</span>
            <div class="arc-row-chips">
              <span
                v-for="{ p, i } in row.plays" :key="i"
                class="arc-chip"
                :class="[String(p.stageLabel).includes('0·') ? 'arc-chip--s0' : 'arc-chip--sn', { playing: arcPlayingIdx === i }]"
                :title="`${p.stageLabel} · ${p.role} · ${p.speed}×`"
              >
                <span class="arc-chip-label">{{ p.label }}</span>
                <span v-if="p.speed !== 1" class="arc-chip-speed">{{ p.speed }}×</span>
              </span>
            </div>
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
          <label>Stage playlists <span class="hint">highest-numbered stage is the eternal hold · per-stage rounds box overrides the default duration · ⓘ = explainer (plays INSTEAD of the translation; sentences without one fall back to EN in that slot)</span></label>
          <div class="stage-grid">
            <template v-for="(stage, idx) in podsStageKeys" :key="stage">
              <div class="stage-row">
                <span class="stage-label">
                  stage {{ stage }}
                  <span v-if="idx === podsStageKeys.length - 1" class="stage-eternal">eternal</span>
                </span>
                <span v-if="idx < podsStageKeys.length - 1" class="stage-rounds" title="Pod-rounds in this stage before promoting. Empty = the default stage duration below.">
                  <input
                    type="number" min="1"
                    :placeholder="String(drafts.pods.stageDuration ?? 5)"
                    :value="getStageRounds(stage)"
                    @input="setStageRounds(stage, $event.target.value)"
                  /><span class="stage-rounds-suffix">r</span>
                </span>
                <span v-else class="stage-rounds eternal-spacer">∞</span>
                <PlaylistEditor :modelValue="getStageList(stage)" @update:modelValue="setStageList(stage, $event)" :compact="true" />
                <button
                  class="stage-audition-btn"
                  :disabled="!auditionExamplePodSentence"
                  @click="auditionPodStage(stage)"
                  :title="auditionExamplePodSentence ? `Audition stage ${stage} with pod sentence 1` : 'Pick a course with a pod loaded to audition'"
                >▶</button>
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
          <NumField v-model="drafts.pods.podActivationRound" label="Pod activation default" suffix="rounds"
            help="First main-round at which Layer 2 pods fire (per-learner pin still wins)." />
          <NumField v-model="drafts.pods.roundInterval" label="Pod fires every" suffix="rounds"
            help="1 = every round (default). 2 = every other round, 3 = every third, etc. Stretches every pod stage proportionally — pod-rounds only tick on actual fires." />
          <NumField v-model="drafts.pods.stageDuration" label="Default stage duration" suffix="pod-rounds"
            help="Fallback pod-rounds for stages without their own rounds value (set per-stage in the rows above — e.g. Phase 0 = 2, Phase 1 = 3). The highest stage is eternal." />
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

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, defineComponent, h } from 'vue'
import { useAuth } from '../composables/useAuth'
import { composeArc, normSurface } from '../lib/podArcCompose'
import { fetchServingPodId } from '../lib/servingPod'
import CoursePicker from '../components/CoursePicker.vue'
import { useAlgorithmConfig, NumField, NumListField, RowHeader } from './admin/algorithmConfigShared'
import { isolateText } from '../utils/textDirection.js'

const { isAdmin, learner: currentUser } = useAuth()

// The script/playback rows (script_shape, easy_mode, fast_mode) live on a
// SEPARATE page now (/admin/labs/speaking) — they govern the speaking
// practice script, not listening. This page still LOADS them (the preview's
// listening/speaking ratio reads script_shape) but renders no editor for them.
//
// ROLE_SPEED drives the pod-stage audition playback rate (Layer-2 preview).
const ROLE_SPEED = { ps08x: 0.8, ps: 1.0, ps15x: 1.5, ps2x: 2.0, trans: 1.0, explainer: 1.0 }
// The audio proxy lives on saysomethingin.app (CORS *). popty.app doesn't
// serve /api/audio so we hit the deployed learning-app endpoint directly.
const AUDIO_BASE = 'https://saysomethingin.app/api/audio'

// Shared algorithm_config plumbing — drafts, dirty-tracking, keyed save.
// onLoaded / onReset backfill the listening-specific defaults (pods, L1 cup
// knobs, stage0 gaps) that may be absent on rows saved before those fields
// existed.
const {
  rows, loading, loadError, savingKey, rowErrors,
  drafts, rowMap, isDirty, reset, save, loadAll,
} = useAlgorithmConfig({ onLoaded: backfillDefaults, onReset: onResetRow })

// ============================================================================
// Course preview state
// ============================================================================
const allCourses = ref([])
const selectedCourseCode = ref('')
const courseLoading = ref(false)
const courseLegos = ref([])           // is_new only, ordered by seed,lego_index
const coursePodSentences = ref([])    // listening_pod_sentences rows, ordered by global_order
// Stage-0 clip maps for the full-arc preview (loaded per course in loadCoursePreview).
const stage0GlossMap = ref(new Map())       // lego_key → merged "means" clip id
const stage0TargetClipMap = ref(new Map())  // target surface → "[atom]" slice clip id
// Full-arc preview state.
const arcSentenceIdx = ref(0)               // index into coursePodSentences
const arcPlayingIdx = ref(-1)               // currently-sounding play, -1 = idle
const arcStopFlag = ref(false)

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

// Per-seed sandwich playlist (admin-tunable; saved on the 'listening' row).
const DEFAULT_SEED_PLAYLIST = ['t1', 'known', 't2', 't1x2']
const seedPlaylist = computed(() => drafts.listening?.seedPlaylist || DEFAULT_SEED_PLAYLIST)
function setSeedPlaylist(next) {
  if (drafts.listening) drafts.listening.seedPlaylist = next
}

function audioUrl(audioId) {
  if (!audioId || !selectedCourseCode.value) return null
  return `${AUDIO_BASE}/${audioId}?courseId=${encodeURIComponent(selectedCourseCode.value)}`
}

let currentAudio = null

// Example pod sentence for L2 stage audition — first sentence of the
// pod (global_order = 1). Null if the course has no pod loaded.
const auditionExamplePodSentence = computed(() => {
  return coursePodSentences.value[0] || null
})

// Play one pod sentence through a stage playlist. Mirrors the runtime
// pod-lap builder: trans → known audio, ps/ps2x → target audio (at 1×
// or 2× respectively). No bookends, no inter-chunk gap matrix — admin
// preview, not a faithful lap simulation.
async function playPodPlaylistForSentence(playlist, sentence) {
  if (currentAudio) { try { currentAudio.pause() } catch {} }
  for (const role of playlist) {
    // Mirrors the runtime: explainer slot falls back to the translation when
    // the sentence has no explainer audio (fully-repeat lines, vocab codas).
    const id = role === 'explainer'
      ? (sentence.explainer_audio_id || sentence.known_audio_id)
      : role === 'trans'
        ? sentence.known_audio_id
        : sentence.target_audio_id
    const url = audioUrl(id)
    if (!url) continue
    await new Promise((resolve) => {
      const a = new Audio(url)
      a.playbackRate = ROLE_SPEED[role] ?? 1.0
      currentAudio = a
      a.onended = resolve
      a.onerror = resolve
      a.play().catch(resolve)
    })
    await new Promise((r) => setTimeout(r, 250))
  }
}

function auditionPodStage(stage) {
  const sentence = auditionExamplePodSentence.value
  if (!sentence) return
  playPodPlaylistForSentence(getStageList(stage), sentence)
}


async function loadCoursePreview(courseCode) {
  courseLoading.value = true
  courseLegos.value = []
  coursePodSentences.value = []
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

    // Pod sentences (for L2 audition). One serving pod per course; load
    // whatever exists. Courses without pods still preview L1 fine.
    //
    // The serving slug is per-course since Tom's 1-based ruling of 2026-08-22 —
    // hrv_for_eng serves `pod-1`, the rest still serve `pod-0` — so resolve it
    // rather than hard-coding `<course>:pod-0`, which reads EMPTY for Croatian.
    coursePodSentences.value = []
    try {
      // includeHeld: this is an ADMIN audition, and auditioning a pod before
      // you release it is the entire point of holding one (Tom, 2026-08-23).
      // Learner reachability is gated in RLS and in the resolver's default;
      // neither is what this preview is.
      const podId = await fetchServingPodId(sb, courseCode, { includeHeld: true })
      if (podId) {
        const { data: podRows, error: podErr } = await sb
          .from('listening_pod_sentences')
          .select('global_order, target_text, known_text, target_audio_id, known_audio_id, explainer_audio_id, atom_map, sentence_audio_ids, sentence_known_audio_ids')
          .eq('pod_id', podId)
          .order('global_order', { ascending: true })
        if (podErr) throw podErr
        coursePodSentences.value = podRows || []
      }
    } catch (podErr) {
      console.warn('[preview] pod load failed:', podErr)
    }

    // Stage-0 clip maps for the full-arc preview — the SAME course-wide lookups
    // the learner's composer uses (lego_key→merged "means" clip, target surface→
    // "[atom]" slice clip), so the preview resolves atoms identically.
    stage0GlossMap.value = new Map()
    stage0TargetClipMap.value = new Map()
    const [legoRes, atomRes] = await Promise.all([
      sb.from('pod_legos').select('lego_key, explainer_audio_id').eq('course_code', courseCode),
      sb.from('course_audio').select('id, text').eq('course_code', courseCode).eq('role', 'pod_explainer').like('text', '[atom] %'),
    ])
    for (const l of (legoRes.data || [])) if (l.explainer_audio_id) stage0GlossMap.value.set(l.lego_key, l.explainer_audio_id)
    for (const a of (atomRes.data || [])) {
      // Normalised key (case-insensitive, accent-preserving) so the composer's
      // normSurface lookup resolves capitalised atoms to lowercase slices.
      const surface = normSurface(a.text.slice('[atom] '.length))
      if (!stage0TargetClipMap.value.has(surface)) stage0TargetClipMap.value.set(surface, a.id)
    }
  } catch (e) {
    console.warn('[preview] load failed:', e)
  } finally {
    courseLoading.value = false
  }
}

// CoursePicker emits the chosen code; set it then load the preview.
function onCoursePick(code) {
  selectedCourseCode.value = code || ''
  onCourseChange()
}
async function onCourseChange() {
  if (selectedCourseCode.value) {
    await loadCoursePreview(selectedCourseCode.value)
  } else {
    courseLegos.value = []
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

// Reset fix-up: mirror the load-time backfill so a Reset on the pods row keeps
// NumFields bound to defined values (rows saved before a field existed).
function onResetRow(key, d) {
  if (key === 'pods' && d.pods) {
    if (d.pods.roundInterval == null) d.pods.roundInterval = 1
    if (d.pods.podActivationRound == null) {
      d.pods.podActivationRound = d.listening?.podActivationRound ?? 6
    }
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

// Per-stage duration overrides (PodsConfig.stageDurations — e.g. {'1': 2,
// '2': 3} for Phase 0 / Phase 1). Empty input = no override = the uniform
// stageDuration fallback; the key is deleted so the runtime falls back too.
function getStageRounds(stage) {
  const sd = drafts.pods?.stageDurations || {}
  const v = sd[String(stage)] ?? sd[stage]
  return v == null ? '' : v
}
function setStageRounds(stage, raw) {
  if (!drafts.pods) return
  const n = parseInt(raw, 10)
  if (!drafts.pods.stageDurations) drafts.pods.stageDurations = {}
  if (Number.isFinite(n) && n >= 1) {
    drafts.pods.stageDurations[String(stage)] = n
  } else {
    delete drafts.pods.stageDurations[String(stage)]
  }
}

/** Renumber the stageDurations map with the same key shift applied to the
 *  playlist keys, so per-stage rounds stay glued to their stage. */
function shiftStageDurations(shiftKey) {
  const sd = drafts.pods.stageDurations
  if (!sd) return
  const next = {}
  for (const [k, v] of Object.entries(sd)) {
    const n = Number(k)
    if (Number.isNaN(n)) continue
    const newKey = shiftKey(n)
    if (newKey != null) next[String(newKey)] = v
  }
  drafts.pods.stageDurations = next
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
  shiftStageDurations(n => (n > stage ? n + 1 : n))
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
  shiftStageDurations(n => (n === stage ? null : n > stage ? n - 1 : n))
}

// ============================================================================
// Stage 0 — structural tier editor (mirrors the stage0 algorithm_config shape
// consumed by the learner: tiers[] in play order, each with a granularity +
// visit/repeat counts. The runtime reads the key COUNT, not a fixed 5.)
// ============================================================================
const GRANULARITIES = ['atoms', 'pairs', 'intention']
const stage0Tiers = computed(() => drafts.stage0?.tiers || [])
function addStage0Tier() {
  if (!drafts.stage0) return
  if (!Array.isArray(drafts.stage0.tiers)) drafts.stage0.tiers = []
  drafts.stage0.tiers.push({ key: 'tier' + (drafts.stage0.tiers.length + 1), granularity: 'atoms', visits: 1, targetRepeats: 1, fusionGap: null })
}
function removeStage0Tier(idx) {
  if (drafts.stage0?.tiers) drafts.stage0.tiers.splice(idx, 1)
}
function moveStage0Tier(idx, dir) {
  const t = drafts.stage0?.tiers
  if (!t) return
  const j = idx + dir
  if (j < 0 || j >= t.length) return
  const [m] = t.splice(idx, 1)
  t.splice(j, 0, m)
}
function setTierFusion(idx, raw) {
  const t = drafts.stage0?.tiers?.[idx]
  if (!t) return
  const v = String(raw).trim()
  t.fusionGap = v === '' ? null : Number(v)
}

// ============================================================================
// Full 0→9 arc preview — compose the WHOLE escalation (Stage-0 tiers → Stages
// 1-N) for one real sentence with the SHARED composer, then play it through.
// Uses the live DRAFT config, so structural edits show immediately.
// ============================================================================
const arcSentence = computed(() => coursePodSentences.value[arcSentenceIdx.value] || null)
const arcPlays = computed(() => {
  const s = arcSentence.value
  if (!s) return []
  try {
    return composeArc(s, stage0GlossMap.value, stage0TargetClipMap.value, drafts.stage0, drafts.pods?.stagePlaylist || {})
  } catch (e) {
    console.warn('[arc] compose failed:', e)
    return []
  }
})
// In configs we care about the Stage-0 BREAKDOWN tiers (per intention). Stages
// 1-N are just the whole phrase repeated — hidden by default (toggle to show).
const showFullArc = ref(false)
const arcIndexed = computed(() =>
  arcPlays.value
    .map((p, i) => ({ p, i }))                                  // keep global index for the highlight
    .filter(x => showFullArc.value || String(x.p.stageLabel).includes('0·'))
)
// Group displayed plays into rows by stage/tier (one row per tier line).
const arcRows = computed(() => {
  const rows = []
  let cur = null
  for (const { p, i } of arcIndexed.value) {
    if (!cur || cur.stageLabel !== p.stageLabel) { cur = { stageLabel: p.stageLabel, plays: [] }; rows.push(cur) }
    cur.plays.push({ p, i })
  }
  return rows
})
function stopArc() {
  arcStopFlag.value = true
  arcPlayingIdx.value = -1
  if (currentAudio) { try { currentAudio.pause() } catch {} }
}
async function playArc() {
  const plays = arcIndexed.value.map(x => x.p)
  if (!plays.length) return
  arcStopFlag.value = false
  if (currentAudio) { try { currentAudio.pause() } catch {} }
  for (let k = 0; k < plays.length; k++) {
    if (arcStopFlag.value) break
    const p = plays[k]
    const url = audioUrl(p.audioId)
    if (!url) continue
    arcPlayingIdx.value = arcIndexed.value[k].i
    await new Promise((resolve) => {
      const a = new Audio(url)
      a.playbackRate = p.speed || 1
      currentAudio = a
      a.onended = resolve
      a.onerror = resolve
      a.play().catch(resolve)
    })
    // Longer breath (2s) at the end of each row/tier; snappy within a row.
    const next = plays[k + 1]
    const rowEnd = !next || next.stageLabel !== p.stageLabel
    const gap = rowEnd ? 2000 : Math.min(p.gapAfterMs || 0, 1500)
    if (gap > 0 && !arcStopFlag.value) await new Promise((r) => setTimeout(r, gap))
  }
  arcPlayingIdx.value = -1
}

// Backfill defaults for fields added after a row was last saved — keeps
// NumFields bound to defined values, and the first save writes the field into
// the DB row going forward. Runs once the rows land (onLoaded hook).
function backfillDefaults(d) {
  if (d.pods) {
    if (d.pods.roundInterval == null) d.pods.roundInterval = 1
    if (d.pods.podActivationRound == null) {
      // Field used to live on drafts.listening — migrate the value across
      // so existing courses keep their tuned activation round when the
      // pods row is first saved against the new schema.
      d.pods.podActivationRound = d.listening?.podActivationRound ?? 6
    }
  }
  // Layer 1: ensure the four cup knobs the learner now reads exist on the
  // listening row (it predates the cup model — legacy fields stay untouched).
  if (!d.listening) d.listening = {}
  {
    const l1d = { cups: 30, activationCount: 30, maxSeedsPerCup: 20, clusterStep: 5 }
    for (const k in l1d) if (d.listening[k] == null) d.listening[k] = l1d[k]
  }
  // The Layer-2 fade master switch. Absent ⇒ false in the learner's resolver
  // (resolveListeningPlayPolicy), so bind it to a real boolean rather than
  // undefined — an undefined v-model silently saves the field away again.
  if (typeof d.listening.listeningUseStagePlaylist !== 'boolean') {
    d.listening.listeningUseStagePlaylist = false
  }
  // Per-seed sandwich — default to the comprehensible-input order. Mirrors
  // DEFAULT_SEED_PLAYLIST in useLayer1Scheduler.ts (V1 → known → V2 → V1·2×).
  if (!Array.isArray(d.listening.seedPlaylist) || !d.listening.seedPlaylist.length) {
    d.listening.seedPlaylist = [...DEFAULT_SEED_PLAYLIST]
  }
  // Stage 0: ensure the gaps matrix + tiers array exist so the editor binds
  // to defined values (a row saved before a gap key existed backfills here).
  if (d.stage0) {
    if (!d.stage0.gaps || typeof d.stage0.gaps !== 'object') d.stage0.gaps = {}
    const gd = { afterCue: 500, beforeMeans: 0, fusionPairs: 200, betweenChunks: 1000, targetMeaning: 500, betweenRepeats: 600, betweenIntentions: 500 }
    for (const k in gd) if (d.stage0.gaps[k] == null) d.stage0.gaps[k] = gd[k]
    if (!Array.isArray(d.stage0.tiers)) d.stage0.tiers = []
  }
}

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
    // ps* = target sentence at varying speeds, trans = known-language gloss,
    // explainer = the per-sentence Stage-1 narration that decomposes the
    // target into LEGO-sized chunks ("buona means good, sera means afternoon,
    // come stai means how are you doing"). See migration
    // 20260519_listening_pod_explainer_columns.sql.
    const ROLES = ['ps08x', 'ps', 'ps15x', 'ps2x', 'trans', 'explainer']
    const ROLE_LABEL = { ps08x: '0.8×', ps: '1×', ps15x: '1.5×', ps2x: '2×', trans: 'EN', explainer: 'ⓘ' }

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
// L1PlaylistEditor — the per-seed sandwich. Roles map to Layer1SlotRole in
// useLayer1Scheduler.ts (t1/t2 = target voices, t1x2/t2x2 = same at 2×, known =
// the meaning clip). Reuses the pod pill colours (target = ps, known = trans,
// 2× = ps2x) so it reads consistently. Tap a pill to cycle role, ← → reorder,
// × remove, + add.
// ============================================================================
const L1PlaylistEditor = defineComponent({
  name: 'L1PlaylistEditor',
  props: { modelValue: { type: Array, required: true } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const ROLES = ['t1', 'known', 't2', 't1x2', 't2x2']
    const ROLE_LABEL = { t1: 'V1', t2: 'V2', known: 'known', t1x2: 'V1·2×', t2x2: 'V2·2×' }
    const ROLE_COLOR = { t1: 'ps', t2: 'ps', known: 'trans', t1x2: 'ps2x', t2x2: 'ps2x' }

    function update(next) { emit('update:modelValue', next) }
    function cycle(idx) {
      const cur = props.modelValue[idx]
      const next = [...props.modelValue]
      next[idx] = ROLES[(ROLES.indexOf(cur) + 1) % ROLES.length]
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
    function add() { update([...props.modelValue, 't1']) }

    return () => h('div', { class: 'playlist-editor' },
      [
        ...props.modelValue.map((role, idx) =>
          h('div', { class: 'pill-wrap', key: `${idx}-${role}` }, [
            h('button', {
              class: ['role-pill', `role-${ROLE_COLOR[role] || 'ps'}`],
              title: 'Tap to cycle role',
              onClick: () => cycle(idx),
            }, [
              h('span', { class: 'pill-num' }, String(idx + 1)),
              ROLE_LABEL[role] || role,
            ]),
            h('div', { class: 'pill-controls' }, [
              h('button', { class: 'micro', title: 'Move left', disabled: idx === 0, onClick: () => moveLeft(idx) }, '←'),
              h('button', { class: 'micro', title: 'Move right', disabled: idx === props.modelValue.length - 1, onClick: () => moveRight(idx) }, '→'),
              h('button', { class: 'micro remove', title: 'Remove', disabled: props.modelValue.length <= 1, onClick: () => removeAt(idx) }, '×'),
            ]),
          ])
        ),
        h('button', { class: 'add-pill', title: 'Add', onClick: add }, '+'),
      ]
    )
  },
})
</script>

<style scoped>
.listening-admin {
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
.back-btn {
  background: transparent;
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 8px;
  color: var(--color-paper-dim, var(--muted));
  font-size: 1rem;
  width: 36px; height: 36px;
  cursor: pointer;
}
.back-btn:hover { border-color: var(--color-paper-dim, var(--muted)); color: var(--color-paper, var(--ink)); }
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
.err { color: var(--danger); background: rgba(248, 113, 113, 0.08); border-radius: 8px; }

.rows {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

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
:deep(.row-title-line h2) {
  margin: 0;
  font-size: 1rem;
  letter-spacing: -0.01em;
}
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
  color: var(--danger);
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
.field-block label.master-switch {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  text-transform: none;
  letter-spacing: 0;
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--color-paper, var(--ink));
  cursor: pointer;
  margin-bottom: 0;
}
.field-block label.master-switch input {
  margin-top: 0.25rem;
  flex: none;
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
:deep(.num-field) {
  display: flex;
  flex-direction: column;
}
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
:deep(.role-pill.role-ps08x) { background: #fde047; color: #422006; }
:deep(.role-pill.role-ps)    { background: #fbbf24; color: #422006; }
:deep(.role-pill.role-ps15x) { background: #fb923c; color: #431407; }
:deep(.role-pill.role-ps2x)  { background: #f97316; color: #431407; }
:deep(.role-pill.role-trans) { background: #6b7280; color: #f9fafb; }
:deep(.role-pill.role-explainer) { background: #f59e0b; color: #422006; }
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
  border: 1px solid var(--color-graphite, var(--surface-3));
  background: transparent;
  color: var(--color-paper-dim, var(--muted));
  font-size: 0.7rem;
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center; justify-content: center;
}
:deep(.micro:hover:not(:disabled)) { color: var(--color-paper, var(--ink)); border-color: var(--color-paper-dim, var(--muted)); }
:deep(.micro:disabled) { opacity: 0.3; cursor: not-allowed; }
:deep(.micro.remove:hover:not(:disabled)) { color: var(--danger); border-color: var(--danger); }
:deep(.add-pill) {
  width: 32px; height: 32px;
  border-radius: 999px;
  border: 1px dashed var(--color-graphite, var(--surface-3));
  background: transparent;
  color: var(--color-paper-dim, var(--muted));
  font-size: 1rem;
  cursor: pointer;
}
:deep(.add-pill:hover) { color: var(--color-paper, var(--ink)); border-color: var(--color-paper-dim, var(--muted)); }

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
  grid-template-columns: 90px 1fr auto auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.4rem 0.5rem;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 6px;
}
/* Stage 0 tier editor */
.tier-grid { display: flex; flex-direction: column; gap: 0.4rem; }
.tier-row {
  display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap;
  padding: 0.4rem 0.5rem; background: rgba(0, 0, 0, 0.15); border-radius: 6px;
}
.tier-idx {
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  font-size: 0.72rem; color: var(--accent); min-width: 30px;
}
.tier-key { width: 130px; }
.tier-gran { min-width: 92px; }
.tier-num {
  display: inline-flex; align-items: center; gap: 0.3rem;
  font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--color-paper-dim, var(--muted));
}
.tier-num input { width: 48px; }
.tier-move, .tier-remove {
  width: 26px; height: 26px; border-radius: 6px;
  border: 1px solid var(--surface-3); background: transparent;
  color: var(--muted); cursor: pointer; font-size: 0.8rem;
}
.tier-move:hover:not(:disabled) { border-color: var(--accent-2); color: var(--accent-2); }
.tier-remove:hover:not(:disabled) { border-color: #c0564a; color: #c0564a; }
.tier-move:disabled, .tier-remove:disabled { opacity: 0.3; cursor: not-allowed; }
.tier-row input, .tier-row select {
  background: rgba(0,0,0,0.25); border: 1px solid var(--surface-3);
  border-radius: 5px; color: var(--ink); padding: 0.25rem 0.4rem; font-size: 0.8rem;
}
/* Full-arc preview */
.arc-controls { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.6rem; }
.arc-pick { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: var(--muted); }
.arc-pick select { max-width: 420px; background: rgba(0,0,0,0.25); border: 1px solid var(--surface-3); border-radius: 5px; color: var(--ink); padding: 0.3rem 0.45rem; }
.arc-play, .arc-stop {
  border-radius: 6px; border: 1px solid var(--surface-3); background: transparent;
  color: var(--ink); padding: 0.4rem 0.8rem; cursor: pointer; font-size: 0.82rem;
}
.arc-play:hover:not(:disabled) { border-color: var(--accent-2); color: var(--accent-2); }
.arc-play:disabled, .arc-stop:disabled { opacity: 0.35; cursor: not-allowed; }
.arc-empty { font-size: 0.78rem; color: var(--muted); }
.arc-fulltoggle { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.78rem; color: var(--muted); cursor: pointer; }
.arc-rows { display: flex; flex-direction: column; gap: 0.35rem; }
.arc-row { display: grid; grid-template-columns: 88px 1fr; align-items: start; gap: 0.5rem; }
.arc-row-label {
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  font-size: 0.68rem; color: var(--accent); padding-top: 0.28rem; text-align: right;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.arc-row-chips { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.arc-chip {
  display: inline-flex; align-items: baseline; gap: 0.35rem;
  padding: 0.2rem 0.45rem; border-radius: 5px; font-size: 0.74rem;
  border: 1px solid transparent; max-width: 260px;
}
.arc-chip--s0 { background: rgba(120, 90, 160, 0.18); }
.arc-chip--sn { background: rgba(70, 120, 90, 0.16); }
.arc-chip.playing { border-color: var(--accent-2); box-shadow: 0 0 0 2px rgba(0,0,0,0.2); }
.arc-chip-stage { font-family: var(--font-mono, ui-monospace, Menlo, monospace); color: var(--accent); font-size: 0.68rem; }
.arc-chip-label { color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.arc-chip-speed { color: var(--muted); font-size: 0.66rem; }
.stage0-link {
  margin-left: auto; align-self: center; white-space: nowrap;
  font-family: ui-monospace, "IBM Plex Mono", Menlo, monospace;
  font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--accent); text-decoration: none;
  border: 1px solid var(--surface-3); border-radius: 999px; padding: 0.4rem 0.85rem;
  transition: border-color 0.15s, color 0.15s;
}
.stage0-link:hover { border-color: var(--accent); color: var(--ink); }

.stage-audition-btn {
  width: 28px; height: 28px;
  border-radius: 6px;
  border: 1px solid var(--color-graphite, var(--surface-3));
  background: transparent;
  color: var(--color-paper-dim, var(--muted));
  font-size: 0.85rem;
  cursor: pointer;
}
.stage-audition-btn:hover:not(:disabled) {
  border-color: var(--accent-2);
  color: var(--accent-2);
}
.stage-audition-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.stage-label {
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  font-size: 0.75rem;
  color: var(--color-paper-dim, var(--muted));
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
.stage-rounds {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
}
.stage-rounds input {
  width: 44px;
  padding: 3px 4px;
  border-radius: 6px;
  border: 1px solid var(--color-graphite, var(--surface-3));
  background: transparent;
  color: var(--color-paper, var(--ink));
  font-size: 0.75rem;
  text-align: center;
}
.stage-rounds input::placeholder { color: var(--color-paper-dim, var(--faint)); }
.stage-rounds-suffix {
  font-size: 0.65rem;
  color: var(--color-paper-dim, var(--muted));
}
.stage-rounds.eternal-spacer {
  width: 50px;
  justify-content: center;
  color: #93c5fd;
  font-size: 0.8rem;
}
.fixed-badge {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--color-graphite, var(--surface-3));
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-paper-dim, var(--muted));
  vertical-align: middle;
}
.stage-remove-btn {
  width: 28px; height: 28px;
  border-radius: 6px;
  border: 1px solid var(--color-graphite, var(--surface-3));
  background: transparent;
  color: var(--color-paper-dim, var(--muted));
  font-size: 1rem;
  cursor: pointer;
}
.stage-remove-btn:hover:not(:disabled) {
  border-color: var(--danger);
  color: var(--danger);
}
.stage-remove-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.stage-insert-btn {
  align-self: stretch;
  margin: 0;
  padding: 4px;
  border-radius: 4px;
  border: 1px dashed transparent;
  background: transparent;
  color: var(--color-paper-dim, var(--faint));
  font-size: 0.7rem;
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  cursor: pointer;
  transition: all 0.15s;
}
.stage-insert-btn:hover {
  border-color: var(--color-graphite, var(--surface-3));
  color: var(--color-paper, var(--ink));
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
  border: 1px solid var(--color-graphite, var(--surface-3));
  background: transparent;
  color: var(--color-paper-dim, var(--muted));
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.15s;
}
.fib-pill:hover { color: var(--color-paper, var(--ink)); border-color: var(--color-paper-dim, var(--muted)); }
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
  border-bottom: 1px solid var(--color-graphite, var(--surface-2));
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
  color: var(--color-paper-dim, var(--muted));
}
.picker-group select,
.picker-group input[type="number"] {
  background: rgba(0,0,0,0.3);
  border: 1px solid var(--color-graphite, var(--surface-2));
  border-radius: 6px;
  color: var(--color-paper, var(--ink));
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
  color: var(--color-paper-dim, var(--muted));
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
}
.preview-stats {
  display: flex;
  gap: 0.85rem;
  font-size: 0.75rem;
  color: var(--color-paper-dim, var(--muted));
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
}
.preview-stats strong { color: var(--color-paper, var(--ink)); }
.preview-stats .cycle-ratio {
  padding: 0.1rem 0.45rem;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 3px;
  cursor: help;
}
.preview-stats .ratio-hot { color: #fb923c; }
.preview-loading {
  font-size: 0.75rem;
  color: var(--color-paper-dim, var(--muted));
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
  color: var(--color-paper-dim, var(--muted));
}
.preview-empty {
  font-style: italic;
  color: var(--color-paper-dim, var(--muted));
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
  color: var(--color-paper-dim, var(--muted));
  min-width: 56px;
}
.seed-stage {
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-paper-dim, var(--muted));
  background: rgba(255, 255, 255, 0.06);
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
}
.seed-target { font-weight: 500; }
.seed-known {
  color: var(--color-paper-dim, var(--muted));
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
.preview-pill.role-ps08x { background: #fde047; color: #422006; }
.preview-pill.role-ps    { background: #fbbf24; color: #422006; }
.preview-pill.role-ps15x { background: #fb923c; color: #431407; }
.preview-pill.role-ps2x  { background: #f97316; color: #431407; }
.preview-pill.role-trans { background: #6b7280; color: #f9fafb; }
.preview-pill.role-explainer { background: #f59e0b; color: #422006; }
.preview-sequence {
  margin-left: auto;
  background: transparent;
  border: 1px solid var(--color-graphite, var(--surface-3));
  color: var(--color-paper-dim, var(--muted));
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  font-size: 0.7rem;
  cursor: pointer;
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
}
.preview-sequence:hover { border-color: var(--color-paper, var(--ink)); color: var(--color-paper, var(--ink)); }
.preview-reserve {
  margin-top: 0.75rem;
  font-size: 0.75rem;
}
.preview-reserve summary {
  color: var(--color-paper-dim, var(--muted));
  cursor: pointer;
  padding: 0.4rem 0;
}
.preview-reserve summary:hover { color: var(--color-paper, var(--ink)); }
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
:deep(.btn-primary:disabled) { background: var(--surface-2); border-color: var(--surface-2); cursor: not-allowed; opacity: 0.5; }
:deep(.btn-secondary) {
  background: transparent;
  border-color: var(--color-graphite, var(--surface-3));
  color: var(--color-paper-dim, var(--muted));
}
:deep(.btn-secondary:hover:not(:disabled)) { border-color: var(--color-paper, var(--ink)); color: var(--color-paper, var(--ink)); }
:deep(.btn-secondary:disabled) { opacity: 0.4; cursor: not-allowed; }

/* ============================================================================
   LIGHT MODE OVERRIDES
   The base styles above were authored for dark mode and bake in dark-only
   literals (rgba(255,255,255,.03) "card" fills, rgba(0,0,0,.25) input fills,
   a hardcoded dark slate sticky bar, and faint --surface-2 borders). On the
   light canvas those collapse to ~1.03:1 separation or, in the sticky bar's
   case, a dark band that swallows the dark --ink text. These overrides are
   scoped to [data-theme="light"] so DARK MODE IS UNTOUCHED.
   ============================================================================ */

/* Cards: opaque white surface + a visible border so they lift off the canvas
   (was rgba(255,255,255,.03) on #eef2f6 ≈ 1.03:1, invisible). */
[data-theme="light"] .config-row {
  background: var(--surface);
  border-color: var(--line);                 /* #cbd5e1 on #eef2f6 ≈ 1.3:1 edge, plus shadow */
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
}

/* Sticky preview bar: was rgba(15,23,42,.92) — a DARK band on a light page
   that hid its own --muted/--ink children (≈1.4:1). Make it a frosted light
   surface with a real bottom border. */
[data-theme="light"] .preview-bar {
  background: rgba(255, 255, 255, 0.85);
  border-bottom-color: var(--line);
}

/* Inputs / selects: dark translucent fills (rgba(0,0,0,.25)/.3) → raised
   surface-2 with a readable border. Text stays --ink. */
[data-theme="light"] :deep(.num-input-wrap),
[data-theme="light"] :deep(.num-list-input),
[data-theme="light"] .picker-group select,
[data-theme="light"] .picker-group input[type="number"],
[data-theme="light"] .stage-rounds input {
  background: var(--surface-2);
  border-color: var(--line);
}

/* Inner panels (stage rows, seed cards, ratio/stage chips) used near-black
   translucent fills that muddy on white → light raised surfaces + a border. */
[data-theme="light"] .stage-row,
[data-theme="light"] .preview-seed {
  background: var(--surface-2);
  border: 1px solid var(--line);
}
[data-theme="light"] .preview-stats .cycle-ratio,
[data-theme="light"] .seed-stage {
  background: var(--surface-2);
  border: 1px solid var(--line);
}

/* pill-num counters sat on a dark rgba(0,0,0,.18) chip; on the bright pill
   fills in light mode a translucent-dark token reads better as a hairline. */
[data-theme="light"] :deep(.pill-num),
[data-theme="light"] .preview-pill .pill-num {
  background: rgba(15, 23, 42, 0.14);
}

/* "EN" / trans pill: #6b7280 fill with #f9fafb text = ~4.0:1. Bold ~12px is
   below the 18.66px large-text threshold, so nudge the fill darker to clear
   AA (#4b5563 + #f9fafb ≈ 7.0:1) while staying the same gray hue family. */
[data-theme="light"] :deep(.role-pill.role-trans),
[data-theme="light"] .preview-pill.role-trans {
  background: #4b5563;
}

/* Light-blue accent TEXT (#93c5fd ≈ 1.6:1 on white = unreadable) → a darker
   blue that clears AA on the light surfaces it sits on (#1d4ed8 ≈ 7.5:1).
   Same blue hue family as dark mode. */
[data-theme="light"] .stage-eternal,
[data-theme="light"] .stage-rounds.eternal-spacer,
[data-theme="light"] .preview-block-title,
[data-theme="light"] .fib-pill.on {
  color: #1d4ed8;
}
[data-theme="light"] .fib-pill.on {
  background: rgba(37, 99, 235, 0.1);
  border-color: #1d4ed8;
}

/* Preview block tint: the blue wash + faint blue border barely register on
   the light canvas — give it a readable tinted panel. */
[data-theme="light"] .preview-block {
  background: rgba(37, 99, 235, 0.06);
  border-color: rgba(37, 99, 235, 0.28);
}

/* Inline warning/error banners used light-bg + light text (#fbbf24/#f87171)
   on a translucent tint = washed out on white. Darken the text to clear AA. */
[data-theme="light"] .admin-warn { color: #92400e; }
[data-theme="light"] .err,
[data-theme="light"] :deep(.save-err) { color: #b91c1c; }

/* Crumb hover (#6ee7b7) is invisible on white → use the themed accent-2. */
[data-theme="light"] .admin-crumbs .crumb-link:hover { color: var(--accent-2); }
</style>
