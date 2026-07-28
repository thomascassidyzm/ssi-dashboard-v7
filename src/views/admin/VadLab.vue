<script setup>
/**
 * VAD Lab — /admin/configs/vad
 *
 * The prosody-measurement work made audible and visible. Sibling to the Pod
 * Lab. Data is the 2026-07-28 invariance study (774 clips, 388 pairs) baked
 * to public/vad-lab/lab-data.json by tools/prosody-lab/build-lab-data.cjs;
 * findings doc: docs/course-optimization/prosody-lab-poc.md; parent theory:
 * ssi-learning-app/docs/vad-feedback-design.md.
 *
 * Honest-science surface, not a marketing toy: the voice-dominated dimensions
 * are shown AS failures, the deceptive pair is curated on purpose, and the
 * confounded Welsh comparison carries its confound in the copy.
 *
 * Zero LLM at runtime. Audio streams from the deployed learning-app proxy —
 * every study clip is a course_audio row, so nothing is copied anywhere.
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const AUDIO_BASE = 'https://saysomethingin.app/api/audio'

// ── data ────────────────────────────────────────────────────────────────────
const loading = ref(true)
const loadError = ref('')
const lab = ref(null) // lab-data.json payload

onMounted(async () => {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}vad-lab/lab-data.json`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    lab.value = await res.json()
  } catch (e) {
    loadError.value = `Could not load lab data: ${e.message}`
  } finally {
    loading.value = false
  }
})

const pairById = computed(() => {
  const m = new Map()
  if (lab.value) for (const p of lab.value.pairs) m.set(p.pair_id, p)
  return m
})

// ── tabs ────────────────────────────────────────────────────────────────────
const tab = ref('tour') // tour | lab | proves

// ── labels ──────────────────────────────────────────────────────────────────
const CATEGORY_META = {
  rerender: { label: 'Same voice, re-rendered', short: 'RE-RENDER' },
  crossvoice: { label: 'Same phrase, new voice', short: 'NEW VOICE' },
  crossprovider: { label: 'Same phrase, new provider', short: 'NEW PROVIDER' },
  diffphrase: { label: 'Different phrases', short: 'DIFF PHRASE' },
  human_tts_eng: { label: 'Human vs TTS · English', short: 'HUMAN v TTS' },
  human_tts_cym: { label: 'Human vs TTS · Welsh', short: 'HUMAN v TTS' },
}
const catMeta = (c) => CATEGORY_META[c] || { label: c, short: c }

function voiceLabel(side) {
  if (side.origin === 'human') return 'Human recording'
  const v = side.voice || ''
  const az = v.match(/^azure_([a-z]{2}-[A-Z]{2})-(.+?)(Neural)?$/)
  if (az) return `Azure · ${az[2]} (${az[1]})`
  if (v.startsWith('xai_') || side.provider === 'xai') return `xAI · ${v.replace(/^xai_/, '')}`
  if (v === 'eve') return 'xAI · eve'
  return v || side.provider || 'TTS'
}

// ── audio playback (one shared element; tap toggles) ───────────────────────
const playingId = ref('')
let audioEl = null
function play(clipId) {
  if (playingId.value === clipId) {
    audioEl?.pause()
    playingId.value = ''
    return
  }
  if (!audioEl) {
    audioEl = new Audio()
    audioEl.addEventListener('ended', () => (playingId.value = ''))
    audioEl.addEventListener('error', () => (playingId.value = ''))
  }
  audioEl.src = `${AUDIO_BASE}/${clipId}`
  audioEl.play()
  playingId.value = clipId
}
onBeforeUnmount(() => audioEl?.pause())

// ── contour overlay ─────────────────────────────────────────────────────────
// Energy contours are z-scored, 150 points. DTW alignment (same cost as the
// study: mean |a-b| along the optimal path) is cheap at 150×150, computed on
// demand and cached per pair.
const dtwCache = new Map()
function dtwWarp(a, b) {
  const n = a.length
  const m = b.length
  const INF = Infinity
  const cost = new Float64Array((n + 1) * (m + 1)).fill(INF)
  cost[0] = 0
  const idx = (i, j) => i * (m + 1) + j
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const d = Math.abs(a[i - 1] - b[j - 1])
      cost[idx(i, j)] =
        d + Math.min(cost[idx(i - 1, j)], cost[idx(i, j - 1)], cost[idx(i - 1, j - 1)])
    }
  }
  // backtrack: for each a-index collect matched b values
  const matched = Array.from({ length: n }, () => [])
  let i = n
  let j = m
  while (i > 0 && j > 0) {
    matched[i - 1].push(b[j - 1])
    const diag = cost[idx(i - 1, j - 1)]
    const up = cost[idx(i - 1, j)]
    const left = cost[idx(i, j - 1)]
    if (diag <= up && diag <= left) {
      i--
      j--
    } else if (up <= left) i--
    else j--
  }
  return matched.map((vals, k) => (vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : a[k]))
}
function contourPair(pair, aligned) {
  const ca = lab.value?.contours?.[pair.a.id]
  const cb = lab.value?.contours?.[pair.b.id]
  if (!ca?.e?.length || !cb?.e?.length) return null
  let bSeries = cb.e
  if (aligned) {
    const key = pair.pair_id
    if (!dtwCache.has(key)) dtwCache.set(key, dtwWarp(ca.e, cb.e))
    bSeries = dtwCache.get(key)
  }
  return { a: ca.e, b: bSeries, durA: ca.dur, durB: cb.dur }
}
const W = 640
const H = 150
const PAD = 8
function polyPoints(series) {
  const lo = -2.6
  const hi = 2.6
  return series
    .map((v, i) => {
      const x = PAD + (i / (series.length - 1)) * (W - 2 * PAD)
      const clamped = Math.max(lo, Math.min(hi, v))
      const y = H - PAD - ((clamped - lo) / (hi - lo)) * (H - 2 * PAD)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

// ── score display ───────────────────────────────────────────────────────────
// Each dimension is shown as a dot on a track anchored by the study's own
// near (re-render) and far (different phrase) medians — the honest scale.
const DIM_META = {
  energy_dtw: { label: 'Energy contour (DTW)', hint: 'stress & prominence rhythm — the phrase carrier' },
  dur_log_ratio: { label: 'Duration (log-ratio)', hint: 'overall pacing' },
  syl_count_diff: { label: 'Syllable count Δ', hint: 'how many beats' },
  syl_rate_diff: { label: 'Syllable rate Δ', hint: 'voice-dominated — not scored' },
  f0_dtw: { label: 'F0 contour (DTW)', hint: 'melody — voice-dominated, never scored' },
  f0_range_diff_st: { label: 'F0 range Δ (st)', hint: 'voice-dominated — not scored' },
  f0_register_gap_st: { label: 'Register gap (st)', hint: 'pure voice identity' },
  voiced_frac_diff: { label: 'Voiced fraction Δ', hint: 'voice-dominated — not scored' },
}
const PHRASE_DIMS = ['energy_dtw', 'dur_log_ratio', 'syl_count_diff']
function anchors(dim) {
  const d = lab.value?.dimension_discrimination?.[dim]
  return d ? { near: d.near_p50, far: d.far_p50 } : null
}
function trackPos(dim, value) {
  const a = anchors(dim)
  if (!a || value == null) return null
  const max = Math.max(a.far * 1.4, value, 1e-6)
  return {
    v: Math.min(100, (value / max) * 100),
    near: Math.min(100, (a.near / max) * 100),
    far: Math.min(100, (a.far / max) * 100),
  }
}
function fmt(v, dp = 3) {
  if (v == null) return '—'
  return Number.isInteger(v) ? String(v) : v.toFixed(dp)
}
// Combined score verdict against the study's own category medians.
function combinedVerdict(p) {
  if (p.combined == null) return { text: 'no score', cls: 'v-na' }
  const cs = lab.value.combined_score
  const mid = (cs.p50_by_category.crossprovider + cs.p50_by_category.diffphrase) / 2
  if (p.combined <= cs.p50_by_category.crossvoice) return { text: 'same-phrase range', cls: 'v-same' }
  if (p.combined <= mid) return { text: 'borderline', cls: 'v-mid' }
  return { text: 'different-phrase range', cls: 'v-diff' }
}

// ── the listening tour (curated) ────────────────────────────────────────────
// Pair ids are stable: the study samples deterministically (order by md5).
const TOUR = [
  {
    pair_id: 'crossvoice:8a3eb330:8cfcd10d',
    title: '1 · Same phrase, new speaker — the metric barely moves',
    teaches:
      'Two different Azure voices, one female and one male, saying “para tener”. The energy contour distance is 0.031 — inside re-render territory. What survives a change of speaker is the phrase itself: this is the understandability core the whole design measures.',
  },
  {
    pair_id: 'crossprovider:344e0301:e1e31a00',
    title: '2 · Same phrase, different provider — still recognisably the same',
    teaches:
      'Azure’s Henri against xAI’s eve on “entendre la vérité” — different companies, different synthesis stacks, energy distance 0.062. Swapping vendor moves prosody more than swapping voice within one vendor, but the phrase still reads through.',
  },
  {
    pair_id: 'diffphrase:476f55ba:9606cf67',
    title: '3 · The deceptive pair — the metric hears HOW, not WHAT',
    teaches:
      'Two completely different phrases — “eres joven todavía” and “cambia nuestro cerebro” — with near-identical length and rhythm. Energy distance is a low 0.125 and the combined score sits in the same-phrase range. A contour metric confirms how something was said; it cannot confirm what was said. It must always be paired with a content check, never asked to do word recognition.',
    caution: true,
  },
  {
    pair_id: 'diffphrase:4fbfa1b9:4c22377b',
    title: '4 · Genuinely different phrases — the far anchor',
    teaches:
      'A two-word phrase against a nine-word sentence, same voice. Every dimension is far apart and the combined score is over 6 — this is what “said a different phrase” looks like, and the reference the same-phrase pairs are judged against.',
  },
  {
    pair_id: 'human_tts_cym:89ee6e14:2db912f9',
    title: '5 · Human Welsh vs TTS Welsh',
    teaches:
      'A human SSi recording against the TTS render of the same Welsh words. The contours land closer than different phrases would — evidence the core survives the human-to-synthetic gap.',
    footnote:
      'Honest footnote: in all 12 Welsh pairs the human side is the declarative and the TTS side the question form of the same words, so a real intonation difference rides along with the human-versus-TTS difference. Twelve pairs, confounded — listed as anecdote, load-bearing on nothing.',
  },
  {
    pair_id: 'human_tts_eng:4f4a89a8:5cce06c8',
    title: '6 · Human tempo vs TTS tempo — why calibration bands are load-bearing',
    teaches:
      'A human recording of “I was trying” against the TTS render. Same words, but the human pace is so different that the duration ratio scores as far as a wrong phrase would. Read straight, duration would punish a learner for speaking at a human tempo — which is exactly why the design calibrates variance bands per CEFR level before any dimension reaches a learner as a score.',
    caution: true,
  },
]
const tourPairs = computed(() =>
  TOUR.map((t) => ({ ...t, pair: pairById.value.get(t.pair_id) })).filter((t) => t.pair)
)

// ── the lab browser ─────────────────────────────────────────────────────────
const catFilter = ref('all')
const search = ref('')
const selectedPairId = ref('')
const alignedView = ref(true)

const CATEGORY_ORDER = ['crossvoice', 'crossprovider', 'human_tts_eng', 'human_tts_cym', 'rerender', 'diffphrase']
const filteredPairs = computed(() => {
  if (!lab.value) return []
  const q = search.value.trim().toLowerCase()
  return lab.value.pairs
    .filter((p) => catFilter.value === 'all' || p.category === catFilter.value)
    .filter(
      (p) =>
        !q ||
        p.text_a.toLowerCase().includes(q) ||
        (p.text_b || '').toLowerCase().includes(q) ||
        (p.a.voice || '').toLowerCase().includes(q) ||
        (p.b.voice || '').toLowerCase().includes(q)
    )
    .sort(
      (x, y) =>
        CATEGORY_ORDER.indexOf(x.category) - CATEGORY_ORDER.indexOf(y.category) ||
        (x.combined ?? 99) - (y.combined ?? 99)
    )
})
const selectedPair = computed(() => pairById.value.get(selectedPairId.value) || null)

const aucTable = computed(() => {
  const dd = lab.value?.dimension_discrimination
  if (!dd) return []
  return Object.entries(dd)
    .map(([dim, s]) => ({ dim, ...s }))
    .sort((a, b) => (b.same_vs_diff_auc ?? -1) - (a.same_vs_diff_auc ?? -1))
})
</script>

<template>
  <div class="vadlab">
    <nav class="admin-crumbs">
      <router-link to="/">Home</router-link><span class="sep">/</span>
      <router-link to="/admin">Admin</router-link><span class="sep">/</span>
      <router-link to="/admin/configs">Configs</router-link><span class="sep">/</span>
      <span class="cur">VAD Lab</span>
    </nav>

    <header class="lab-head">
      <h1>VAD Lab — prosody made audible</h1>
      <p class="sub">
        The invariance study, by ear: 774 clips, 388 pairs from the live audio estate. Across
        voices saying the <em>same</em> phrase, energy-contour shape, duration and syllable count
        stay put while melody, register and range move with the speaker — so the first three are
        the measurable core of a phrase, and the rest is the voice, which is never scored.
        Findings: <code>docs/course-optimization/prosody-lab-poc.md</code>.
      </p>
      <div class="tabs">
        <button :class="{ on: tab === 'tour' }" @click="tab = 'tour'">Listening tour</button>
        <button :class="{ on: tab === 'lab' }" @click="tab = 'lab'">Browse the lab</button>
        <button :class="{ on: tab === 'proves' }" @click="tab = 'proves'">What this proves</button>
      </div>
    </header>

    <div v-if="loading" class="notice">Loading study data…</div>
    <div v-else-if="loadError" class="notice err">{{ loadError }}</div>

    <!-- ═══════════ LISTENING TOUR ═══════════ -->
    <main v-else-if="tab === 'tour'" class="tour">
      <p class="tour-intro">
        Six pairs chosen to be heard in order. Each teaches one thing the numbers alone can’t.
        Tap a phrase to hear it; the chart underneath is the loudness-shape of each clip — the
        stress rhythm a learner actually copies.
      </p>

      <section v-for="t in tourPairs" :key="t.pair_id" class="tour-card" :class="{ caution: t.caution }">
        <h2>{{ t.title }}</h2>
        <p class="teaches">{{ t.teaches }}</p>

        <div class="players">
          <button
            class="clip"
            :class="{ playing: playingId === t.pair.a.id }"
            @click="play(t.pair.a.id)"
          >
            <span class="clip-icon">{{ playingId === t.pair.a.id ? '■' : '▶' }}</span>
            <span class="clip-text">“{{ t.pair.text_a }}”</span>
            <span class="clip-voice">{{ voiceLabel(t.pair.a) }}</span>
          </button>
          <button
            class="clip clip-b"
            :class="{ playing: playingId === t.pair.b.id }"
            @click="play(t.pair.b.id)"
          >
            <span class="clip-icon">{{ playingId === t.pair.b.id ? '■' : '▶' }}</span>
            <span class="clip-text">“{{ t.pair.text_b }}”</span>
            <span class="clip-voice">{{ voiceLabel(t.pair.b) }}</span>
          </button>
        </div>

        <div v-if="contourPair(t.pair, true)" class="contour">
          <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" role="img"
            :aria-label="`Energy contour overlay for ${t.pair.text_a}`">
            <line :x1="PAD" :y1="H / 2" :x2="W - PAD" :y2="H / 2" class="midline" />
            <polyline :points="polyPoints(contourPair(t.pair, true).a)" class="line-a" />
            <polyline :points="polyPoints(contourPair(t.pair, true).b)" class="line-b" />
          </svg>
          <div class="legend">
            <span><i class="sw sw-a"></i>{{ voiceLabel(t.pair.a) }} · {{ contourPair(t.pair, true).durA }}s</span>
            <span><i class="sw sw-b"></i>{{ voiceLabel(t.pair.b) }} · {{ contourPair(t.pair, true).durB }}s</span>
            <span class="legend-note">energy shape, time-aligned</span>
          </div>
        </div>

        <div class="scores">
          <div v-for="dim in PHRASE_DIMS" :key="dim" class="score-row">
            <span class="score-label" :title="DIM_META[dim].hint">{{ DIM_META[dim].label }}</span>
            <span class="score-val">{{ fmt(t.pair.dims[dim]) }}</span>
            <div class="track" v-if="trackPos(dim, t.pair.dims[dim])">
              <div class="tick tick-near" :style="{ left: trackPos(dim, t.pair.dims[dim]).near + '%' }" title="re-render median (noise floor)"></div>
              <div class="tick tick-far" :style="{ left: trackPos(dim, t.pair.dims[dim]).far + '%' }" title="different-phrase median"></div>
              <div class="dot" :style="{ left: trackPos(dim, t.pair.dims[dim]).v + '%' }"></div>
            </div>
          </div>
          <div class="score-row combined-row">
            <span class="score-label">Combined phrase-identity score</span>
            <span class="score-val">{{ fmt(t.pair.combined, 2) }}</span>
            <span class="verdict" :class="combinedVerdict(t.pair).cls">{{ combinedVerdict(t.pair).text }}</span>
          </div>
        </div>

        <p v-if="t.footnote" class="footnote">{{ t.footnote }}</p>
      </section>

      <p class="track-key">
        Score tracks: <i class="tick-demo tick-near"></i> re-render median — the metric’s noise
        floor — and <i class="tick-demo tick-far"></i> different-phrase median — the far anchor.
        A dot near the left tick means “indistinguishable from the same recording”; near the
        right tick, “as far apart as two different phrases”.
      </p>
    </main>

    <!-- ═══════════ THE LAB ═══════════ -->
    <main v-else-if="tab === 'lab'" class="labmain">
      <div class="filters">
        <button :class="{ on: catFilter === 'all' }" @click="catFilter = 'all'">
          All ({{ lab.pairs.length }})
        </button>
        <button
          v-for="c in CATEGORY_ORDER"
          :key="c"
          :class="{ on: catFilter === c }"
          @click="catFilter = c"
        >
          {{ catMeta(c).label }} ({{ lab.pairs.filter((p) => p.category === c).length }})
        </button>
        <input v-model="search" class="search" type="search" placeholder="search text or voice…" />
      </div>

      <div class="lab-split">
        <div class="pair-list">
          <button
            v-for="p in filteredPairs"
            :key="p.pair_id"
            class="pair-row"
            :class="{ sel: p.pair_id === selectedPairId }"
            @click="selectedPairId = p.pair_id"
          >
            <span class="pr-cat">{{ catMeta(p.category).short }}</span>
            <span class="pr-text">
              “{{ p.text_a }}”<template v-if="p.category === 'diffphrase'"> · “{{ p.text_b }}”</template>
            </span>
            <span class="pr-score" :class="combinedVerdict(p).cls">{{ fmt(p.combined, 2) }}</span>
          </button>
          <p v-if="!filteredPairs.length" class="notice">No pairs match.</p>
        </div>

        <div class="pair-detail" v-if="selectedPair">
          <h3>{{ catMeta(selectedPair.category).label }} <span class="lang">· {{ selectedPair.language }}</span></h3>
          <p v-if="selectedPair.same_bytes" class="footnote">
            Flagged <code>same_bytes</code>: the two s3 keys hold byte-identical audio — excluded
            from the study’s noise floor.
          </p>

          <div class="players">
            <button class="clip" :class="{ playing: playingId === selectedPair.a.id }" @click="play(selectedPair.a.id)">
              <span class="clip-icon">{{ playingId === selectedPair.a.id ? '■' : '▶' }}</span>
              <span class="clip-text">“{{ selectedPair.text_a }}”</span>
              <span class="clip-voice">{{ voiceLabel(selectedPair.a) }}</span>
            </button>
            <button class="clip clip-b" :class="{ playing: playingId === selectedPair.b.id }" @click="play(selectedPair.b.id)">
              <span class="clip-icon">{{ playingId === selectedPair.b.id ? '■' : '▶' }}</span>
              <span class="clip-text">“{{ selectedPair.text_b }}”</span>
              <span class="clip-voice">{{ voiceLabel(selectedPair.b) }}</span>
            </button>
          </div>

          <div v-if="contourPair(selectedPair, alignedView)" class="contour">
            <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" role="img" aria-label="Energy contour overlay">
              <line :x1="PAD" :y1="H / 2" :x2="W - PAD" :y2="H / 2" class="midline" />
              <polyline :points="polyPoints(contourPair(selectedPair, alignedView).a)" class="line-a" />
              <polyline :points="polyPoints(contourPair(selectedPair, alignedView).b)" class="line-b" />
            </svg>
            <div class="legend">
              <span><i class="sw sw-a"></i>{{ voiceLabel(selectedPair.a) }} · {{ contourPair(selectedPair, alignedView).durA }}s</span>
              <span><i class="sw sw-b"></i>{{ voiceLabel(selectedPair.b) }} · {{ contourPair(selectedPair, alignedView).durB }}s</span>
              <button class="align-toggle" @click="alignedView = !alignedView">
                {{ alignedView ? 'time-aligned (DTW) — show raw' : 'raw shape — show aligned' }}
              </button>
            </div>
          </div>
          <p v-else class="notice">No contour for this pair — one clip failed feature extraction.</p>

          <h4>Phrase-carrying dimensions <span class="h4-note">— what a learner would be measured on</span></h4>
          <div class="scores">
            <div v-for="dim in PHRASE_DIMS" :key="dim" class="score-row">
              <span class="score-label" :title="DIM_META[dim].hint">{{ DIM_META[dim].label }}</span>
              <span class="score-val">{{ fmt(selectedPair.dims[dim]) }}</span>
              <div class="track" v-if="trackPos(dim, selectedPair.dims[dim])">
                <div class="tick tick-near" :style="{ left: trackPos(dim, selectedPair.dims[dim]).near + '%' }"></div>
                <div class="tick tick-far" :style="{ left: trackPos(dim, selectedPair.dims[dim]).far + '%' }"></div>
                <div class="dot" :style="{ left: trackPos(dim, selectedPair.dims[dim]).v + '%' }"></div>
              </div>
            </div>
            <div class="score-row combined-row">
              <span class="score-label">Combined phrase-identity score</span>
              <span class="score-val">{{ fmt(selectedPair.combined, 2) }}</span>
              <span class="verdict" :class="combinedVerdict(selectedPair).cls">{{ combinedVerdict(selectedPair).text }}</span>
            </div>
          </div>

          <h4>Voice-dominated dimensions <span class="h4-note">— shown for honesty, never scored</span></h4>
          <div class="scores muted-scores">
            <div v-for="dim in ['f0_dtw', 'f0_range_diff_st', 'f0_register_gap_st', 'voiced_frac_diff', 'syl_rate_diff']" :key="dim" class="score-row">
              <span class="score-label" :title="DIM_META[dim].hint">{{ DIM_META[dim].label }}</span>
              <span class="score-val">{{ fmt(selectedPair.dims[dim]) }}</span>
              <span class="dim-hint">{{ DIM_META[dim].hint }}</span>
            </div>
          </div>
        </div>
        <div class="pair-detail empty" v-else>
          <p class="notice">Pick a pair on the left — players, contour overlay and every dimension appear here.</p>
        </div>
      </div>

      <section class="auc-section">
        <h3>The dimension table — what survives a change of voice</h3>
        <p class="sub">
          <strong>AUC</strong>: the probability the dimension still recognises “same phrase” through
          a voice change — above 0.5 it tracks the phrase; below 0.5 two voices saying the
          <em>same</em> phrase are further apart than one voice saying two <em>different</em>
          phrases, which is the definition of measuring the speaker.
          <strong>vsens</strong>: how far a voice change moves the dimension, as a fraction of a
          phrase change.
        </p>
        <table class="auc-table">
          <thead>
            <tr><th>Dimension</th><th>near (re-render)</th><th>cross (new voice)</th><th>far (diff phrase)</th><th>vsens</th><th>AUC</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="row in aucTable" :key="row.dim" :class="{ carrier: PHRASE_DIMS.includes(row.dim), degenerate: row.dim === 'pause_diff' }">
              <td>{{ DIM_META[row.dim]?.label || row.dim }}</td>
              <td>{{ fmt(row.near_p50) }}</td>
              <td>{{ fmt(row.cross_p50) }}</td>
              <td>{{ fmt(row.far_p50) }}</td>
              <td>{{ fmt(row.voice_sensitivity, 2) }}</td>
              <td>{{ fmt(row.same_vs_diff_auc, 3) }}</td>
              <td class="tag-cell">
                <span v-if="row.dim === 'pause_diff'" class="tag t-na">degenerate at this phrase length</span>
                <span v-else-if="PHRASE_DIMS.includes(row.dim)" class="tag t-carrier">phrase carrier</span>
                <span v-else class="tag t-voice">voice — never scored</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>

    <!-- ═══════════ WHAT THIS PROVES ═══════════ -->
    <main v-else class="proves">
      <section class="prove-card can">
        <h2>What the metric can do</h2>
        <p>
          Recognise that the <em>same phrase</em> was said, through a change of speaker, using no
          timbre information at all. Energy-contour shape alone separates same-phrase-new-voice
          from different-phrase at AUC 0.845; combined with duration and syllable count, 0.813.
          The category ordering is monotonic and matches the physical story end to end: same
          render &lt; new voice &lt; new provider &lt; human vs TTS &lt; different phrase.
        </p>
      </section>
      <section class="prove-card cannot">
        <h2>What it cannot do</h2>
        <p>
          It cannot recognise <em>words</em> — the deceptive pair in the tour scores two different
          phrases as rhythmically near-identical, so it must always be paired with a content
          check. And it must not score <em>melody</em>: even with the speaker’s register
          normalised out, the residual F0 shape still tracks the voice, not the phrase — AUC
          0.464, chance. On this evidence, scoring a learner’s pitch contour is scoring their
          larynx. Melody is voice; voice is identity; identity is never graded.
        </p>
      </section>
      <section class="prove-card next">
        <h2>What comes next</h2>
        <p>
          A residual voice-sensitivity remains — a learner scored raw would pay a small penalty
          just for not being the model voice, and the human-tempo example shows duration scoring
          a natural pace as far as a wrong phrase. So the next step is the CEFR calibration
          cohort: recordings of real speakers at known levels set variance bands per level, so
          the score reads “within the band for your stage”, not “identical to the machine”.
          Calibration is not polish; it is what makes the residual honest.
        </p>
      </section>
      <p class="prove-src">
        Study: 774 clips, 388 pairs, 2026-07-28 · methods and full results in
        <code>docs/course-optimization/prosody-lab-poc.md</code> · re-runnable via
        <code>tools/prosody-lab/run-study.sh</code> · theory:
        <code>ssi-learning-app/docs/vad-feedback-design.md</code>.
      </p>
    </main>
  </div>
</template>

<style scoped>
.vadlab {
  max-width: 1180px;
  margin: 0 auto;
  padding: 20px 22px 60px;
  color: var(--color-paper, var(--ink));
}
.admin-crumbs { font-size: 0.8125rem; margin-bottom: 10px; }
.admin-crumbs a { color: var(--accent-2); text-decoration: none; }
.admin-crumbs a:hover { color: #6ee7b7; }
.admin-crumbs .sep { margin: 0 6px; color: var(--surface-3); }
.admin-crumbs .cur { color: var(--muted); }
.lab-head h1 { margin: 0 0 6px; font-size: 1.25rem; letter-spacing: -0.01em; }
.lab-head .sub { margin: 0 0 14px; max-width: 820px; color: var(--muted); font-size: 0.875rem; line-height: 1.5; }
code { background: var(--surface-2); padding: 1px 5px; border-radius: 4px; font-size: 0.9em; font-family: var(--font-mono, ui-monospace, Menlo, monospace); }

.tabs { display: flex; gap: 8px; margin-bottom: 18px; }
.tabs button {
  background: var(--surface-2); color: var(--muted); border: 1px solid var(--surface-3);
  border-radius: 8px; padding: 7px 14px; font-size: 0.875rem; cursor: pointer;
}
.tabs button.on { background: rgba(59, 130, 246, 0.15); border-color: #3b82f6; color: var(--color-paper, var(--ink)); }

.notice { color: var(--muted); font-size: 0.875rem; padding: 12px 0; }
.notice.err { color: #f87171; }

/* ── tour ── */
.tour-intro { max-width: 820px; color: var(--muted); font-size: 0.875rem; line-height: 1.5; margin: 0 0 18px; }
.tour-card {
  background: var(--surface-1, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--surface-3);
  border-radius: 12px; padding: 18px 20px; margin-bottom: 18px;
}
.tour-card.caution { border-color: rgba(251, 146, 60, 0.4); }
.tour-card h2 { margin: 0 0 8px; font-size: 1rem; }
.teaches { margin: 0 0 14px; max-width: 780px; color: var(--muted); font-size: 0.875rem; line-height: 1.55; }
.footnote { margin: 12px 0 0; font-size: 0.8125rem; color: #fbbf24; background: rgba(251, 146, 60, 0.1); border: 1px solid rgba(251, 146, 60, 0.25); border-radius: 8px; padding: 8px 12px; max-width: 780px; line-height: 1.5; }
[data-theme='light'] .footnote { color: #92400e; }

/* players */
.players { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.clip {
  flex: 1 1 260px; display: flex; align-items: center; gap: 10px; text-align: left;
  background: var(--surface-2); border: 1px solid var(--surface-3); border-radius: 10px;
  padding: 10px 14px; cursor: pointer; color: inherit; min-height: 52px;
}
.clip:hover { border-color: #3987e5; }
.clip.playing { border-color: #3987e5; background: rgba(57, 135, 229, 0.12); }
.clip-b:hover, .clip-b.playing { border-color: #d95926; background: rgba(217, 89, 38, 0.1); }
.clip-icon { font-size: 0.8rem; width: 1.2em; color: #3987e5; }
.clip-b .clip-icon { color: #d95926; }
.clip-text { font-size: 0.9rem; flex: 1; }
.clip-voice { font-size: 0.75rem; color: var(--muted); white-space: nowrap; }

/* contour chart */
.contour { margin: 4px 0 12px; }
.contour svg { width: 100%; height: 150px; display: block; background: var(--surface-1, rgba(255, 255, 255, 0.02)); border: 1px solid var(--surface-3); border-radius: 8px; }
.midline { stroke: var(--surface-3); stroke-width: 1; stroke-dasharray: 3 4; }
.line-a { fill: none; stroke: #3987e5; stroke-width: 2; stroke-linejoin: round; }
.line-b { fill: none; stroke: #d95926; stroke-width: 2; stroke-linejoin: round; }
[data-theme='light'] .line-a { stroke: #2a78d6; }
[data-theme='light'] .line-b { stroke: #eb6834; }
.legend { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; font-size: 0.75rem; color: var(--muted); margin-top: 6px; }
.sw { display: inline-block; width: 14px; height: 3px; border-radius: 2px; margin-right: 5px; vertical-align: middle; }
.sw-a { background: #3987e5; }
.sw-b { background: #d95926; }
.legend-note { margin-left: auto; font-style: italic; }
.align-toggle { margin-left: auto; background: none; border: 1px solid var(--surface-3); border-radius: 6px; color: var(--muted); font-size: 0.75rem; padding: 3px 8px; cursor: pointer; }
.align-toggle:hover { border-color: #3987e5; color: inherit; }

/* score rows */
.scores { display: flex; flex-direction: column; gap: 7px; max-width: 780px; }
.score-row { display: grid; grid-template-columns: 200px 64px 1fr; gap: 12px; align-items: center; font-size: 0.8125rem; }
.score-label { color: var(--muted); }
.score-val { font-family: var(--font-mono, ui-monospace, Menlo, monospace); text-align: right; }
.track { position: relative; height: 8px; background: var(--surface-2); border-radius: 4px; }
.tick { position: absolute; top: -2px; width: 2px; height: 12px; border-radius: 1px; }
.tick-near { background: #6ee7b7; }
.tick-far { background: #f87171; }
.dot { position: absolute; top: 50%; width: 10px; height: 10px; border-radius: 50%; background: var(--color-paper, #fff); border: 2px solid #3987e5; transform: translate(-50%, -50%); }
.combined-row { border-top: 1px solid var(--surface-3); padding-top: 8px; margin-top: 4px; }
.verdict { font-size: 0.75rem; padding: 2px 8px; border-radius: 999px; justify-self: start; }
.v-same { background: rgba(110, 231, 183, 0.15); color: #6ee7b7; }
.v-mid { background: rgba(251, 191, 36, 0.15); color: #fbbf24; }
.v-diff { background: rgba(248, 113, 113, 0.15); color: #f87171; }
[data-theme='light'] .v-same { color: #047857; }
[data-theme='light'] .v-mid { color: #92400e; }
[data-theme='light'] .v-diff { color: #b91c1c; }
.track-key { font-size: 0.8125rem; color: var(--muted); max-width: 780px; line-height: 1.6; }
.tick-demo { display: inline-block; width: 2px; height: 11px; border-radius: 1px; vertical-align: middle; margin: 0 3px; }

/* ── lab browser ── */
.filters { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
.filters button { background: var(--surface-2); color: var(--muted); border: 1px solid var(--surface-3); border-radius: 999px; padding: 5px 12px; font-size: 0.8125rem; cursor: pointer; }
.filters button.on { background: rgba(59, 130, 246, 0.15); border-color: #3b82f6; color: var(--color-paper, var(--ink)); }
.search { margin-left: auto; background: var(--surface-2); border: 1px solid var(--surface-3); border-radius: 8px; padding: 6px 10px; font-size: 0.8125rem; color: inherit; min-width: 200px; }
.lab-split { display: grid; grid-template-columns: minmax(280px, 380px) 1fr; gap: 18px; align-items: start; }
@media (max-width: 900px) { .lab-split { grid-template-columns: 1fr; } }
.pair-list { max-height: 640px; overflow-y: auto; border: 1px solid var(--surface-3); border-radius: 10px; }
.pair-row { display: grid; grid-template-columns: 92px 1fr 48px; gap: 8px; align-items: center; width: 100%; text-align: left; background: none; border: none; border-bottom: 1px solid var(--surface-3); padding: 8px 10px; cursor: pointer; color: inherit; font-size: 0.8125rem; }
.pair-row:hover { background: var(--surface-2); }
.pair-row.sel { background: rgba(59, 130, 246, 0.12); }
.pr-cat { font-size: 0.65rem; letter-spacing: 0.04em; color: var(--muted); }
.pr-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pr-score { font-family: var(--font-mono, ui-monospace, Menlo, monospace); font-size: 0.75rem; text-align: right; border-radius: 4px; padding: 1px 4px; }
.pair-detail { background: var(--surface-1, rgba(255, 255, 255, 0.03)); border: 1px solid var(--surface-3); border-radius: 12px; padding: 16px 18px; }
.pair-detail.empty { display: flex; align-items: center; justify-content: center; min-height: 200px; }
.pair-detail h3 { margin: 0 0 10px; font-size: 0.95rem; }
.pair-detail .lang { color: var(--muted); font-weight: normal; font-size: 0.8125rem; }
.pair-detail h4 { margin: 18px 0 8px; font-size: 0.8125rem; letter-spacing: 0.02em; }
.h4-note { color: var(--muted); font-weight: normal; }
.muted-scores .score-row { grid-template-columns: 200px 64px 1fr; opacity: 0.75; }
.dim-hint { font-size: 0.75rem; color: var(--muted); font-style: italic; }

/* AUC table */
.auc-section { margin-top: 26px; }
.auc-section h3 { font-size: 1rem; margin: 0 0 6px; }
.auc-section .sub { max-width: 820px; color: var(--muted); font-size: 0.8125rem; line-height: 1.55; margin: 0 0 12px; }
.auc-table { border-collapse: collapse; font-size: 0.8125rem; width: 100%; max-width: 900px; }
.auc-table th { text-align: left; color: var(--muted); font-weight: 500; padding: 6px 10px; border-bottom: 1px solid var(--surface-3); }
.auc-table td { padding: 6px 10px; border-bottom: 1px solid var(--surface-2); font-family: var(--font-mono, ui-monospace, Menlo, monospace); }
.auc-table td:first-child { font-family: inherit; }
.auc-table tr.carrier td { color: #6ee7b7; }
[data-theme='light'] .auc-table tr.carrier td { color: #047857; }
.auc-table tr.degenerate td { opacity: 0.5; }
.tag { font-size: 0.6875rem; padding: 2px 8px; border-radius: 999px; font-family: inherit; white-space: nowrap; }
.t-carrier { background: rgba(110, 231, 183, 0.15); color: #6ee7b7; }
.t-voice { background: rgba(148, 163, 184, 0.15); color: var(--muted); }
.t-na { background: rgba(148, 163, 184, 0.1); color: var(--muted); font-style: italic; }
[data-theme='light'] .t-carrier { color: #047857; }

/* ── proves ── */
.proves { display: flex; flex-direction: column; gap: 16px; max-width: 820px; }
.prove-card { border-radius: 12px; padding: 18px 20px; border: 1px solid var(--surface-3); background: var(--surface-1, rgba(255, 255, 255, 0.03)); }
.prove-card h2 { margin: 0 0 8px; font-size: 1rem; }
.prove-card p { margin: 0; font-size: 0.9rem; line-height: 1.6; color: var(--muted); }
.prove-card.can { border-color: rgba(110, 231, 183, 0.35); }
.prove-card.cannot { border-color: rgba(248, 113, 113, 0.35); }
.prove-card.next { border-color: rgba(59, 130, 246, 0.35); }
.prove-src { font-size: 0.8125rem; color: var(--muted); line-height: 1.6; }
</style>
