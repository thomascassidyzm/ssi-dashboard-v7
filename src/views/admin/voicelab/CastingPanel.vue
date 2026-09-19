<script setup>
/**
 * CASTING — the Voice Lab's one screen.
 *
 * Tom, 2026-09-19: "the voice lab tool needs rethinking / I can't easily
 * select a new voice for each language / it's a bit all over the place …
 * what I want is simple / for any language / I want to be able to select from
 * the best Cartesia voices … audition them / and then cast them".
 *
 * This merges the old LANGUAGES, POD VOICES and PLAY lanes into one flow and
 * retires ENGINEERING from the front door. Everything it reads and writes
 * already existed: the per-language registry (registry.cjs), the governed
 * sample path (samples.cjs — the free read on open, the metered render on a
 * press), the phrase/guide slots (castSlot/clearSlot) and the per-language pod
 * pick from job #273. Nothing here renders course or pod audio.
 *
 * THE SHAPE: one row per LANGUAGE (dialects are their own rows — Mexican
 * Spanish is not a sub-option of Spanish), each row stating by NAME and
 * PROVIDER what is cast for every role, and "nothing cast" where nothing is.
 * Opening a row puts the picker and the audition in the same place: filters
 * for gender and accent over Cartesia's own facts, a play button on every
 * voice, and one tap per role. Saving is one press for the whole language
 * (stagedCast.js / stagedPicks.js, Tom's 2026-09-08 single-press shape).
 *
 * The rules live in casting.js, with tests. This file only draws them.
 */
import { ref, computed, onMounted } from 'vue'
import { api, clipUrl } from './labApi'
import { languageName } from '@/utils/languageNames'
import { planCast, commitCast } from './stagedCast'
import { planPicks, commitPicks } from './stagedPicks'
import {
  ROLES, SLOT_ORDER, slotKey, isFixedEnglish, FIXED_ENGLISH,
  shelfFor, accentsOf, filterShelf, rolesFor,
  stageRole, stageClear, unstageRole, stagedCount,
  castFacts, podFacts, rowSummary, sortRows, labVoiceId, providerLabel,
} from './casting'

defineProps({ params: { type: Object, default: null } })

const langs = ref([])
const pods = ref(new Map())
const loading = ref(true)
const error = ref('')
const search = ref('')
const onlyGaps = ref(false)

const open = ref('')
const samples = ref(null)        // { line, samples, missing, unrenderable, unrenderableWhy, chars }
const samplesBusy = ref(false)
const renderRun = ref(null)      // { done, total } while a batch renders
const rendering = ref('')        // voiceId being rendered one at a time
const playing = ref('')
let audio = null

const gender = ref('')
const accent = ref(null)
const query = ref('')

const staged = ref({ slots: {}, picks: {} })
const saving = ref(false)
const saveReport = ref(null)

async function load ({ force = false } = {}) {
  loading.value = true
  error.value = ''
  try {
    const [l, p] = await Promise.all([
      api.languages({ force }),
      api.podVoices({ force }).catch(() => ({ languages: [] })),
    ])
    langs.value = l.languages || []
    pods.value = new Map((p.languages || []).map((r) => [r.language, r]))
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
onMounted(load)

const nameOf = (lang) => lang.dialectName || languageName(lang.code) || lang.code
const podOf = (lang) => pods.value.get(lang.code) || null

const rows = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = langs.value
    .filter((l) => !q || l.code.includes(q) || String(nameOf(l)).toLowerCase().includes(q))
    .filter((l) => {
      if (!onlyGaps.value) return true
      if (l.human || isFixedEnglish(l.code)) return false
      const f = castFacts(l)
      const pod = podFacts(podOf(l))
      return f.male.state !== 'cast' || f.female.state !== 'cast' || pod.genders.some((g) => !g.pick)
    })
  return sortRows(list, nameOf)
})

const lang = computed(() => langs.value.find((l) => l.code === open.value) || null)
const pod = computed(() => (lang.value ? podOf(lang.value) : null))
const facts = computed(() => (lang.value ? castFacts(lang.value) : {}))
const podView = computed(() => podFacts(pod.value))
const shelf = computed(() => (lang.value && !isFixedEnglish(lang.value.code) && !lang.value.human ? shelfFor(lang.value) : { provider: null, fallback: false, voices: [] }))
const accents = computed(() => accentsOf(shelf.value.voices))
const shown = computed(() => filterShelf(shelf.value.voices, { gender: gender.value, accent: accent.value, query: query.value }))
const nStaged = computed(() => stagedCount(staged.value))

/** The roles this row offers: only the guide on a language nobody is taught. */
function rolesOffered (c) {
  const l = lang.value
  if (!l) return []
  const list = rolesFor(c, l)
  return l.status === 'knownonly' ? list.filter((r) => r.slot === 'guide') : list
}

/** Which role cards to draw for this language. */
const roleCards = computed(() => {
  const l = lang.value
  if (!l) return []
  if (l.status === 'knownonly') return ROLES.filter((r) => r.slot === 'guide')
  return ROLES.filter((r) => r.slot !== 'guide' || (l.knownCourses || 0) > 0)
})

function stagedFor (role) { return staged.value.slots[slotKey(role)] || null }
function isStagedOn (c, role) { const s = stagedFor(role); return Boolean(s && s.action === 'cast' && s.voiceId === c.voiceId) }

async function openRow (l) {
  if (audio) { audio.pause(); audio = null; playing.value = '' }
  staged.value = { slots: {}, picks: {} }
  saveReport.value = null
  gender.value = ''; accent.value = null; query.value = ''
  if (open.value === l.code) { open.value = ''; samples.value = null; return }
  open.value = l.code
  samples.value = null
  await loadSamples()
}

/** SPENDS NOTHING: what is cached here or free in the estate, and the line. */
async function loadSamples () {
  const l = lang.value
  if (!l) return
  const ids = new Set()
  for (const r of ROLES) { const f = facts.value[r.key]; if (f && f.voiceId) ids.add(f.voiceId) }
  for (const g of podView.value.genders || []) { if (g.pick) ids.add(g.pick.voiceId); for (const s of g.speaking) ids.add(s.voiceId) }
  for (const v of shelf.value.voices) ids.add(v.voiceId)
  if (!ids.size) return
  samplesBusy.value = true
  try {
    samples.value = await api.samples(l.code, [...ids].slice(0, 200))
  } catch (e) {
    samples.value = { error: e.message, samples: {}, missing: [] }
  } finally {
    samplesBusy.value = false
  }
}

const sampleOf = (voiceId) => (samples.value && samples.value.samples && samples.value.samples[voiceId]) || null
const line = computed(() => (samples.value && samples.value.line) || null)
const lineChars = computed(() => (line.value ? line.value.text.length : 0))
/** The unheard voices on the SHOWN shelf — what one press would render. */
const unheard = computed(() => shown.value.filter((v) => !sampleOf(v.voiceId) && !(samples.value?.unrenderable || []).includes(v.voiceId)).map((v) => v.voiceId))

function addSample (voiceId, sample) {
  const cur = samples.value || { samples: {}, missing: [] }
  samples.value = { ...cur, samples: { ...(cur.samples || {}), [voiceId]: sample }, missing: (cur.missing || []).filter((v) => v !== voiceId) }
}

/** One <audio> for the page — two voices at once is not a comparison. */
async function play (voiceId, url) {
  if (audio) { audio.pause(); audio = null }
  if (playing.value === voiceId) { playing.value = ''; return }
  const src = /^https?:/.test(url) ? url : await clipUrl(url)
  audio = new Audio(src)
  audio.onended = () => { playing.value = '' }
  audio.onerror = () => { playing.value = ''; error.value = `Could not play ${voiceId}.` }
  playing.value = voiceId
  audio.play().catch((e) => { playing.value = ''; error.value = e.message })
}

/**
 * ONE TAP ENDS IN AUDIO. A cached or estate clip plays for nothing; a voice
 * with none renders ONE clip on the same line (metered, ledgered, refused by
 * the daily ceiling) and then plays it. The button says the cost before it spends.
 */
async function hear (voiceId) {
  const s = sampleOf(voiceId)
  if (s) return play(voiceId, s.url)
  const l = lang.value
  if (!l || rendering.value) return
  rendering.value = voiceId
  error.value = ''
  try {
    const out = await api.renderVoiceClip(l.code, voiceId, 0)
    addSample(voiceId, { url: out.clip.url, durationMs: out.clip.durationMs || null, free: false, cached: true })
    await play(voiceId, out.clip.url)
  } catch (e) { error.value = e.message }
  rendering.value = ''
}

/** SPENDS: every unheard voice on the shown shelf, streamed clip by clip. */
async function renderUnheard () {
  const l = lang.value
  const ids = unheard.value
  if (!l || !ids.length) return
  renderRun.value = { done: 0, total: ids.length }
  error.value = ''
  try {
    const onClip = (ev) => {
      if (renderRun.value) renderRun.value = { ...renderRun.value, done: ev.done ?? renderRun.value.done, total: ev.total ?? renderRun.value.total }
      if (ev.url) addSample(ev.voiceId, { url: ev.url, durationMs: ev.durationMs || null, free: false, cached: true })
    }
    let out
    try { out = await api.prepareSamplesStream(l.code, ids, {}, onClip) } catch (e) {
      if (!e.noStream) throw e
      out = await api.prepareSamples(l.code, ids, {})
    }
    if (out && out.samples) samples.value = out
    const failed = (out && out.failed) || []
    if (failed.length) error.value = `${failed.length} voice(s) would not render: ` + failed.slice(0, 3).map((f) => `${f.voiceId} (${f.error})`).join('; ')
  } catch (e) { error.value = e.message }
  renderRun.value = null
}

// ── Casting: staged, then one press ───────────────────────────────────────
function tapRole (c, role) {
  const l = lang.value
  if (!l) return
  if (isStagedOn(c, role)) { staged.value = unstageRole(staged.value, role); return }
  staged.value = stageRole(staged.value, role, c, { podRow: pod.value, langName: nameOf(l) })
}
function tapClear (role) {
  const l = lang.value
  if (!l) return
  if (stagedFor(role)) { staged.value = unstageRole(staged.value, role); return }
  staged.value = stageClear(staged.value, role, { podRow: pod.value, langName: nameOf(l) })
}
function discard () { staged.value = { slots: {}, picks: {} }; saveReport.value = null }

/**
 * NO CONSENT, NO CAST (Tom, 2026-08-31). The backend refuses identically; the
 * consent flow itself lives in the legacy view, linked from the row.
 */
function consentBlock (c) {
  const k = c && c.consent
  if (!k || !k.aboutAPerson || k.authorised || !k.needsAsking) return ''
  return k.castWarning || 'No consent is recorded for this voice.'
}

/**
 * ENGLISH IS SET. The only write the English row offers is recording the fixed
 * cast as the pod pick — not a choice, a confirmation of the settled fact, and
 * what lets phase8 render the English pod at all.
 */
const englishPodMissing = computed(() => {
  const l = lang.value
  if (!l || !isFixedEnglish(l.code) || !pod.value || pod.value.human) return false
  return (podView.value.genders || []).some((g) => !g.pick)
})
function stageFixedEnglishPod () {
  const l = lang.value
  const fixed = { m: FIXED_ENGLISH.male, f: FIXED_ENGLISH.female }
  let next = staged.value
  for (const g of podView.value.genders || []) {
    if (g.pick) continue
    const role = ROLES.find((r) => r.pod === g.gender)
    const c = { voiceId: fixed[g.gender].voiceId, name: fixed[g.gender].name, engine: 'cartesia', kind: 'cartesia' }
    next = stageRole(next, role, c, { podRow: pod.value, langName: nameOf(l) })
    // The phrase slot is already that voice; only the pod pick is missing.
    delete next.slots[slotKey(role)]
  }
  staged.value = next
}

async function save () {
  const l = lang.value
  if (!l || saving.value || !nStaged.value) return
  saving.value = true
  saveReport.value = null
  try {
    const cast = await commitCast(planCast(staged.value.slots, SLOT_ORDER), {
      castSlot: (b) => api.castSlot(l.code, b),
      clearSlot: (b) => api.clearSlot(l.code, b),
    })
    const picks = await commitPicks(planPicks(staged.value.picks), {
      savePick: (b) => api.pickPodVoice(l.code, b),
      clearPick: (b) => api.clearPodVoice(l.code, b),
    })
    saveReport.value = {
      landed: cast.landed.length + picks.landed.length,
      skipped: cast.skipped || [],
      failed: [
        ...cast.failed.map((f) => ({ label: f.label, error: f.message })),
        ...picks.failed.map((f) => ({ label: f.label, error: f.error })),
      ],
    }
    // A refused slot stays staged — visibly unsaved — never cleared and read as landed.
    const keep = { slots: {}, picks: {} }
    for (const f of cast.failed) keep.slots[f.key] = staged.value.slots[f.key]
    for (const f of picks.failed) keep.picks[f.gender] = staged.value.picks[f.gender]
    staged.value = keep
    await load({ force: true })
  } finally {
    saving.value = false
  }
}

const GLYPH = { m: '♂', f: '♀' }
function short (s, n = 90) { const t = String(s || '').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t }
</script>

<template>
  <section class="cast">
    <div class="cast-controls">
      <input v-model="search" class="cast-search" placeholder="Find a language…" />
      <label class="cast-gaps"><input type="checkbox" v-model="onlyGaps" /> only languages still missing a voice</label>
      <button class="vl-btn" :disabled="loading" @click="load({ force: true })">Refresh</button>
    </div>

    <p v-if="error" class="vl-err">{{ error }}</p>
    <p v-else-if="loading" class="vl-muted">Reading every language's cast…</p>

    <table v-else class="cast-table">
      <thead>
        <tr><th>Language</th><th>Male</th><th>Female</th><th>Second male</th><th>Guide</th><th>Pod voice</th></tr>
      </thead>
      <tbody>
        <template v-for="l in rows" :key="l.code">
          <tr class="cast-row" :class="{ open: open === l.code }" @click="openRow(l)">
            <td class="cast-name">
              <strong>{{ nameOf(l) }}</strong>
              <code>{{ l.code }}</code>
              <span class="cast-courses">{{ l.courses }} course{{ l.courses === 1 ? '' : 's' }}<template v-if="l.released"> · {{ l.released }} live</template></span>
            </td>

            <!-- HUMAN-RECORDED: one sentence, no slots to fill. -->
            <td v-if="l.human" colspan="5" class="cast-sentence">Human recordings only — nothing synthetic is ever cast here.</td>

            <template v-else>
              <td v-for="r in ROLES" :key="r.key" class="cast-cell" :class="castFacts(l)[r.key].state">
                <template v-if="isFixedEnglish(l.code) && r.key !== 'guide'">
                  <span class="cast-fixed">{{ FIXED_ENGLISH[r.key].who }}</span>
                  <span class="cast-sub">{{ castFacts(l)[r.key].state === 'cast' ? castFacts(l)[r.key].text : 'nothing cast' }}</span>
                </template>
                <template v-else-if="castFacts(l)[r.key].state === 'na'"><span class="cast-na">—</span></template>
                <template v-else>
                  <span>{{ castFacts(l)[r.key].text }}</span>
                  <span v-if="castFacts(l)[r.key].accent" class="cast-sub">{{ castFacts(l)[r.key].accent.replace(/-/g, ' ') }}</span>
                </template>
              </td>
              <td class="cast-cell cast-pod">
                <template v-if="podFacts(podOf(l)).state === 'none'"><span class="cast-na">no pod</span></template>
                <template v-else-if="podFacts(podOf(l)).state === 'human'"><span class="cast-na">human recording pending</span></template>
                <template v-else>
                  <span v-for="g in podFacts(podOf(l)).genders" :key="g.gender" class="cast-podline">
                    <span class="cast-g">{{ GLYPH[g.gender] }}</span>
                    <template v-if="g.pick"><span>{{ g.pick.name }} · {{ g.pick.provider }}</span><span class="cast-sub">picked</span></template>
                    <template v-else-if="g.speaking.length"><span>{{ g.speaking[0].name }} · {{ g.speaking[0].provider }}</span><span class="cast-sub">speaking today · not picked</span></template>
                    <template v-else><span>nothing cast</span></template>
                  </span>
                  <span v-if="podFacts(podOf(l)).state === 'held'" class="cast-sub">audio held</span>
                </template>
              </td>
            </template>
          </tr>

          <tr v-if="open === l.code && lang" class="cast-detail">
            <td colspan="6">
              <p class="cast-summary">{{ rowSummary(lang, pod) }}
                <span v-if="lang.dialectOf" class="cast-sub">· its own language, cast apart from {{ languageName(lang.dialectOf) || lang.dialectOf }}</span>
              </p>

              <!-- THE CAST — one card per role, the fact and the staged change side by side. -->
              <div v-if="!lang.human" class="cast-cards">
                <div v-for="r in roleCards" :key="r.key" class="cast-card" :class="{ staged: stagedFor(r) }">
                  <span class="cast-card-label">{{ r.label }}<template v-if="r.pod"> · also the pod {{ r.pod === 'f' ? 'female' : 'male' }} voice</template></span>
                  <span class="cast-card-fact">
                    <button v-if="facts[r.key].voiceId && sampleOf(facts[r.key].voiceId)" class="cast-play" :class="{ on: playing === facts[r.key].voiceId }" @click="play(facts[r.key].voiceId, sampleOf(facts[r.key].voiceId).url)">{{ playing === facts[r.key].voiceId ? '■' : '▶' }}</button>
                    {{ facts[r.key].text }}
                  </span>
                  <span v-if="stagedFor(r)" class="cast-card-staged">
                    → {{ stagedFor(r).action === 'clear' ? 'cleared' : stagedFor(r).voiceName.split(' — ')[0] }} <em>unsaved</em>
                    <button class="cast-link" @click="tapClear(r)">undo</button>
                  </span>
                  <button v-else-if="facts[r.key].state === 'cast' && !isFixedEnglish(lang.code)" class="cast-link" @click="tapClear(r)">clear</button>
                </div>

                <!-- THE POD — what it speaks today, and what is picked; two facts, never merged. -->
                <div v-if="podView.state !== 'none'" class="cast-card cast-card-pod">
                  <span class="cast-card-label">Pod <span class="cast-sub">· {{ podView.text }}</span></span>
                  <template v-for="g in podView.genders" :key="g.gender">
                    <span class="cast-card-fact">
                      <span class="cast-g">{{ GLYPH[g.gender] }}</span>
                      <template v-if="g.pick">
                        <button v-if="sampleOf(g.pick.voiceId)" class="cast-play" :class="{ on: playing === g.pick.voiceId }" @click="play(g.pick.voiceId, sampleOf(g.pick.voiceId).url)">▶</button>
                        picked {{ g.pick.name }} · {{ g.pick.provider }}
                        <span v-if="g.drifted" class="cast-sub">· the pod still speaks {{ g.speaking.map(s => s.name).join(', ') }}</span>
                      </template>
                      <template v-else-if="g.speaking.length">
                        <button v-if="g.speaking[0].clip" class="cast-play" :class="{ on: playing === 'pod:' + g.speaking[0].voiceId }" title="the clip the pod already has — free" @click="play('pod:' + g.speaking[0].voiceId, g.speaking[0].clip.url)">▶</button>
                        speaks {{ g.speaking[0].name }} · {{ g.speaking[0].provider }} <span class="cast-sub">· not picked</span>
                      </template>
                      <template v-else>nothing cast</template>
                    </span>
                    <span v-if="staged.picks[g.gender]" class="cast-card-staged">→ {{ staged.picks[g.gender].action === 'clear' ? 'pick cleared' : staged.picks[g.gender].voice.name }} <em>unsaved</em></span>
                  </template>
                  <button v-if="englishPodMissing && !Object.keys(staged.picks).length" class="vl-btn" @click="stageFixedEnglishPod">Record the fixed English cast as the pod pick</button>
                </div>
              </div>

              <p v-if="lang.human" class="cast-summary">{{ nameOf(lang) }} is voiced by its recordists; its gaps are a recording worklist, not a casting one.</p>

              <!-- ENGLISH IS SET: no shelf. -->
              <p v-else-if="isFixedEnglish(lang.code)" class="cast-note">
                No picker for English: Tom's clone is the male voice, Gemma the female, Aran's clone the second male if needed.
                <span v-if="facts.male2.state === 'cast' && facts.male2.voiceId !== FIXED_ENGLISH.male2.voiceId" class="cast-warn">The second male slot currently holds {{ facts.male2.name }}, not Aran's clone.</span>
              </p>

              <template v-else>
                <!-- THE AUDITION LINE — the same real course sentence for every voice. -->
                <div class="cast-line">
                  <template v-if="line">
                    <strong>{{ line.text }}</strong>
                    <span class="cast-sub">{{ line.knownText }}<template v-if="line.course"> · from {{ line.course }}</template></span>
                  </template>
                  <span v-else-if="samplesBusy" class="cast-sub">finding a line to audition on…</span>
                  <span v-else class="cast-sub">no course line to audition on yet</span>
                </div>

                <!-- THE PICKER — Cartesia by gender and accent; Azure only as the fallback. -->
                <div class="cast-filters">
                  <span class="cast-shelf">
                    <template v-if="shelf.provider === 'cartesia'">Cartesia · {{ shelf.voices.length }} voice{{ shelf.voices.length === 1 ? '' : 's' }}</template>
                    <template v-else-if="shelf.provider === 'azure'">Cartesia has no voice for {{ nameOf(lang) }} — Azure fallback · {{ shelf.voices.length }}</template>
                    <template v-else>no synthetic voice is published for {{ nameOf(lang) }}</template>
                  </span>
                  <span class="cast-seg">
                    <button :class="{ on: gender === '' }" @click="gender = ''">any</button>
                    <button :class="{ on: gender === 'f' }" @click="gender = 'f'">female</button>
                    <button :class="{ on: gender === 'm' }" @click="gender = 'm'">male</button>
                  </span>
                  <span v-if="accents.length > 1" class="cast-seg">
                    <button :class="{ on: accent === null }" @click="accent = null">every accent</button>
                    <button v-for="a in accents" :key="a.accent" :class="{ on: accent === a.accent }" @click="accent = a.accent">{{ a.label }} <i>{{ a.count }}</i></button>
                  </span>
                  <input v-model="query" class="cast-search small" placeholder="search name, accent, description…" />
                </div>

                <p class="cast-render">
                  <button v-if="unheard.length" class="vl-btn" :disabled="Boolean(renderRun) || !line" @click="renderUnheard">
                    <template v-if="renderRun">rendering {{ renderRun.done }} / {{ renderRun.total }}…</template>
                    <template v-else>Render the {{ unheard.length }} unheard · {{ unheard.length * lineChars }} chars</template>
                  </button>
                  <span v-else-if="shown.length" class="cast-sub">every voice shown has a clip — playing costs nothing</span>
                  <span v-if="samples && samples.error" class="vl-err">{{ samples.error }}</span>
                </p>

                <div class="cast-shelf-list">
                  <p v-if="!shown.length" class="cast-sub">no voice matches these filters</p>
                  <div v-for="c in shown" :key="c.voiceId" class="cast-voice">
                    <button
                      class="cast-play"
                      :class="{ on: playing === c.voiceId, empty: !sampleOf(c.voiceId) }"
                      :disabled="rendering === c.voiceId || (samples?.unrenderable || []).includes(c.voiceId)"
                      :title="sampleOf(c.voiceId) ? (sampleOf(c.voiceId).free ? 'a take the estate already has — free' : 'cached — free') : (samples?.unrenderableWhy?.[c.voiceId] || `no clip yet — renders one (${lineChars} chars) and plays it`)"
                      @click="hear(c.voiceId)"
                    >{{ playing === c.voiceId ? '■' : rendering === c.voiceId ? '·' : sampleOf(c.voiceId) ? '▶' : '▷' }}</button>
                    <span class="cast-voice-main">
                      <span class="cast-voice-name">{{ c.name.split(' — ')[0] }}</span>
                      <span v-if="c.owned" class="ui-pill ui-hue-quiet">our clone</span>
                      <span class="cast-sub">
                        {{ c.gender ? (c.gender === 'f' ? 'female' : 'male') : 'gender not listed' }}
                        · {{ c.accent ? c.accent.replace(/-/g, ' ') : 'accent not listed' }}<template v-if="c.country"> · {{ c.country }}</template>
                        <template v-if="!sampleOf(c.voiceId)"> · {{ lineChars }} chars to hear</template>
                      </span>
                      <span v-if="c.tagline || c.description" class="cast-voice-desc">{{ short(c.tagline || c.description) }}</span>
                    </span>
                    <span v-if="consentBlock(c)" class="cast-sub cast-warn" :title="consentBlock(c)">consent needed — see the legacy view</span>
                    <span v-else class="cast-targets">
                      <button v-for="r in rolesOffered(c)" :key="r.key" class="cast-target" :class="{ on: isStagedOn(c, r) }" :disabled="saving" @click="tapRole(c, r)">
                        {{ isStagedOn(c, r) ? '✓ ' : '' }}{{ r.label }}
                      </button>
                    </span>
                  </div>
                </div>
              </template>

              <!-- ONE PRESS FOR THE WHOLE LANGUAGE. A refusal is named and left unsaved. -->
              <div v-if="!lang.human" class="cast-save">
                <button class="cast-save-btn" :disabled="!nStaged || saving" @click="save">
                  {{ saving ? 'Saving…' : nStaged ? `Save ${nStaged} change${nStaged === 1 ? '' : 's'} for ${nameOf(lang)}` : 'Nothing staged' }}
                </button>
                <button v-if="nStaged && !saving" class="cast-link" @click="discard">discard</button>
                <span v-if="saveReport" class="cast-report">
                  <span v-if="saveReport.landed">{{ saveReport.landed }} saved</span>
                  <span v-if="saveReport.skipped.length" class="cast-sub">· not spoken over: {{ saveReport.skipped.map(s => s.course || s).join(', ') }}</span>
                  <span v-for="f in saveReport.failed" :key="f.label" class="vl-err">{{ f.label }} REFUSED — {{ f.error }}</span>
                </span>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
@import './lab.css';

.cast-controls { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin: 0.25rem 0 0.75rem; }
.cast-search {
  padding: 0.45rem 0.7rem; border-radius: 8px; border: 1px solid var(--surface-3);
  background: var(--surface-2); color: inherit; font: inherit; font-size: 0.875rem; min-width: 18rem;
}
.cast-search.small { min-width: 12rem; font-size: 0.78rem; padding: 0.3rem 0.55rem; }
.cast-gaps { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.8125rem; color: var(--muted); }

.cast-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.cast-table th {
  text-align: left; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--muted); border-bottom: 1px solid var(--surface-3); padding: 0.45rem 0.6rem; font-weight: 500;
}
.cast-row { cursor: pointer; border-bottom: 1px solid var(--surface-2); }
.cast-row:hover, .cast-row.open { background: var(--surface-2); }
.cast-row td { padding: 0.6rem 0.6rem; vertical-align: top; }
.cast-name strong { font-size: 0.95rem; }
.cast-name code { color: var(--muted); margin-left: 0.4rem; font-size: 0.72rem; }
.cast-courses, .cast-sub { display: block; color: var(--muted); font-size: 0.72rem; line-height: 1.5; }
.cast-cell { line-height: 1.4; }
/* Reached is solid ink; not reached is dimmed. No colour says "cast" here — the words do. */
.cast-cell.empty > span:first-child { color: var(--muted); font-style: italic; }
.cast-cell.broken > span:first-child { color: var(--muted); text-decoration: line-through; }
.cast-na { color: var(--muted); opacity: 0.6; }
.cast-fixed { display: block; }
.cast-sentence { color: var(--muted); font-style: italic; }
.cast-pod .cast-podline { display: block; white-space: nowrap; }
.cast-pod .cast-podline .cast-sub { display: inline; margin-left: 0.3rem; }
.cast-g { display: inline-block; width: 1rem; color: var(--muted); }

.cast-detail td { background: var(--surface-1); padding: 0.9rem 1rem 1.1rem; border-bottom: 1px solid var(--surface-3); }
.cast-summary { margin: 0 0 0.8rem; font-size: 0.9rem; }
.cast-summary .cast-sub { display: inline; }
.cast-note { margin: 0.5rem 0 0; font-size: 0.85rem; color: var(--muted); }
.cast-warn { color: #fbbf24; }

.cast-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 0.6rem; margin-bottom: 1rem; }
.cast-card { border: 1px solid var(--surface-3); border-radius: 8px; padding: 0.5rem 0.7rem; display: flex; flex-direction: column; gap: 0.25rem; min-height: 4.4rem; }
.cast-card.staged { border-color: #ec4899; }
.cast-card-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
.cast-card-label .cast-sub { display: inline; text-transform: none; letter-spacing: 0; }
.cast-card-fact { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; font-size: 0.875rem; }
.cast-card-fact .cast-sub { display: inline; }
.cast-card-staged { font-size: 0.8rem; color: #ec4899; }
.cast-card-staged em { font-style: normal; opacity: 0.75; margin-left: 0.2rem; }
.cast-card-pod { grid-column: span 2; }
.cast-card-pod .vl-btn { align-self: flex-start; margin-top: 0.3rem; }

.cast-link { background: none; border: none; color: var(--muted); text-decoration: underline; cursor: pointer; font: inherit; font-size: 0.75rem; padding: 0; align-self: flex-start; }

.cast-play {
  background: none; border: 1px solid var(--surface-3); border-radius: 999px; color: inherit;
  cursor: pointer; width: 1.9rem; height: 1.9rem; flex: none; font-size: 0.8rem; line-height: 1;
}
.cast-play.empty { border-style: dashed; opacity: 0.65; }
.cast-play.on { background: #ec4899; border-color: #ec4899; color: #fff; }
.cast-play:disabled { opacity: 0.35; cursor: default; }

.cast-line { margin: 0.2rem 0 0.7rem; font-size: 1rem; }
.cast-line strong { display: block; font-weight: 600; }

.cast-filters { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
.cast-shelf { font-size: 0.8125rem; color: var(--muted); }
.cast-seg { display: inline-flex; border: 1px solid var(--surface-3); border-radius: 999px; overflow: hidden; flex-wrap: wrap; }
.cast-seg button { background: none; border: none; color: var(--muted); font: inherit; font-size: 0.75rem; padding: 0.3rem 0.75rem; cursor: pointer; }
.cast-seg button i { font-style: normal; opacity: 0.6; margin-left: 0.2rem; }
.cast-seg button.on { background: var(--surface-3); color: inherit; }

.cast-render { display: flex; align-items: center; gap: 0.7rem; margin: 0 0 0.5rem; font-size: 0.8125rem; }
.cast-shelf-list { display: flex; flex-direction: column; gap: 0.2rem; max-height: 28rem; overflow-y: auto; }
.cast-voice { display: flex; align-items: center; gap: 0.7rem; padding: 0.35rem 0.4rem; border-radius: 6px; }
.cast-voice:hover { background: var(--surface-2); }
.cast-voice-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 0.05rem; }
.cast-voice-name { font-size: 0.9rem; }
.cast-voice-main .ui-pill { align-self: flex-start; font-size: 0.65rem; }
.cast-voice-desc { font-size: 0.75rem; color: var(--muted); opacity: 0.85; }
.cast-targets { display: flex; gap: 0.25rem; flex: none; }
.cast-target {
  border: 1px dashed var(--surface-3); background: transparent; color: inherit; opacity: 0.75;
  border-radius: 6px; cursor: pointer; font: inherit; font-size: 0.72rem; padding: 0.3rem 0.55rem;
}
.cast-target:hover:not(:disabled) { opacity: 1; border-style: solid; }
.cast-target.on { border: 1px solid #ec4899; color: #ec4899; opacity: 1; font-weight: 600; }

.cast-save { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; border-top: 1px solid var(--surface-2); margin-top: 0.8rem; padding-top: 0.7rem; }
.cast-save-btn { background: #ec4899; border: none; color: #fff; padding: 0.5rem 1.1rem; border-radius: 8px; cursor: pointer; font: inherit; font-size: 0.875rem; font-weight: 600; }
.cast-save-btn:disabled { opacity: 0.4; cursor: default; }
.cast-report { display: flex; gap: 0.6rem; flex-wrap: wrap; font-size: 0.8rem; }
.cast-report .cast-sub { display: inline; }
</style>
