<script setup>
/**
 * POD VOICES — one row per LANGUAGE, and Tom picks the voice himself.
 *
 * Tom, 2026-09-19, after hearing a pod on a plane:
 *
 *   "But I want to choose proper voices for them. I listened to the Italian one
 *    on the plane yesterday and the female Italian voice was a shocker. So I am
 *    going to choose all the voices carefully myself. We CAN do all the
 *    translations and leave the pod TTS as pending."
 *
 * and, the same day, the unit the decision is made in:
 *
 *   "Of course you know that pods are per language and not per course? And so
 *    anytime a language has been done once, then it never needs doing again."
 *
 * So: ONE ROW PER LANGUAGE, never per course. This lane is a sibling of the
 * Languages lane beside it, not a rework of it, and it obeys the same three
 * rulings that one carries in its own header:
 *
 *   LIVE COURSES FIRST, THEN COURSE COUNT DESCENDING, THEN ALPHABETICAL BY
 *   LANGUAGE NAME (Tom, 2026-08-29). The server emits the first two legs; the
 *   name leg happens here, because the name lookup is a front-end module.
 *
 *   EVERY LANGUAGE IS NAMED, not just coded — both, because the code is what
 *   the rest of the estate is keyed on.
 *
 *   COLOUR MEANS ONE THING (Tom, 2026-09-04: "it's also colour nightmare
 *   times"). Here it means A POD VOICE IS PICKED and nothing else. Held,
 *   unrendered and human-recorded are all drawn rather than painted.
 *
 * ── THE EAR, NOT THE TABLE ──────────────────────────────────────────────────
 * The point of this screen is hearing, so every voice on it is playable:
 *   CURRENT   the clip the pod ALREADY has, played straight from the estate's
 *             bucket. Free, and the honest answer to "what does this sound like
 *             today". A held pod has no audio; the row says so rather than
 *             rendering one to fill the gap — nothing here renders pod audio.
 *   CANDIDATE the same pod sentence, in a voice that is not cast, rendered
 *             through the lab's governed sample path (daily ceiling, ledger,
 *             on-disk cache) and never written to course_audio. The SAME
 *             sentence for every candidate in a language, because "must be the
 *             same phrases for a fair test" (Tom, 2026-08-31).
 *
 * ── WHAT A PICK DOES ────────────────────────────────────────────────────────
 * It writes one app_config row and renders nothing. It is then read in two
 * places, which is what stops this being a screen that lies: tools/pod-sync.cjs
 * casts THROUGH the pick, and phase8 REFUSES to generate pod audio for a
 * language that has none. Pick nothing and nothing renders — which is the
 * ruling, stated as a gate.
 *
 * ── SOUTH WELSH IS NOT A GAP (Tom, 2026-09-19) ──────────────────────────────
 * "South Welsh is a different beast. It's been written and signed off by Aran
 * but not recorded yet because we don't have TTS for Welsh so we have to get
 * human recordings done." A human-voiced language reads as HUMAN RECORDING
 * PENDING and offers no synthetic pick; the backend refuses one anyway.
 */
import { ref, computed, onMounted } from 'vue'
import { api, clipUrl } from './labApi'
import { languageName } from '@/utils/languageNames'
import { planPicks, commitPicks } from './stagedPicks'

const rows = ref([])
const summary = ref(null)
const loading = ref(true)
const error = ref('')
const filter = ref('all')
const search = ref('')

/** The Languages lane's payload, reused for its candidate lists. */
const candidatesByLang = ref(new Map())

const open = ref('')
const openState = ref(null)   // { samples, missing, unrenderable, line, busy, note }
const staged = ref({})
const saving = ref(false)
const saveReport = ref(null)

const GENDER_LABEL = { f: 'female', m: 'male' }

async function load ({ force = false } = {}) {
  loading.value = true
  error.value = ''
  try {
    const out = await api.podVoices({ force })
    rows.value = out.languages || []
    summary.value = out.summary || null
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
onMounted(load)

/** Candidates come from the registry the Languages lane already builds. */
async function loadCandidates () {
  if (candidatesByLang.value.size) return
  try {
    const out = await api.languages()
    const map = new Map()
    for (const l of out.languages || []) map.set(l.code, l)
    candidatesByLang.value = map
  } catch { /* a backend without the registry still lists pods and clips */ }
}

const nameOf = (row) => row.label || languageName(row.baseLanguage) || row.language

const shown = computed(() => {
  const q = search.value.trim().toLowerCase()
  return rows.value
    .filter((r) => {
      if (filter.value === 'unpicked') return !r.human && r.slots.some((s) => !s.pick)
      if (filter.value === 'picked') return r.slots.length && r.slots.every((s) => s.pick)
      if (filter.value === 'held') return r.state === 'held'
      if (filter.value === 'drifted') return r.slots.some((s) => s.drifted)
      return true
    })
    .filter((r) => !q || r.language.includes(q) || String(nameOf(r)).toLowerCase().includes(q))
    .slice()
    // The third leg of Tom's order, applied where the name lookup lives.
    .sort((a, b) =>
      (a.liveCourses > 0 ? 0 : 1) - (b.liveCourses > 0 ? 0 : 1) ||
      b.courses - a.courses ||
      String(nameOf(a)).localeCompare(String(nameOf(b))))
})

const row = computed(() => rows.value.find((r) => r.language === open.value) || null)

/** Every voice the open row could play: the cast, then the candidates. */
const candidateVoices = computed(() => {
  const r = row.value
  if (!r) return []
  const lang = candidatesByLang.value.get(r.language) || candidatesByLang.value.get(r.baseLanguage)
  const cast = new Set(r.slots.flatMap((s) => s.cast.map((c) => labVoiceId(c.voice))))
  return (lang?.candidates || []).filter((c) => !cast.has(c.voiceId))
})

/**
 * The lab spells a voice '<provider>_<id>'; a pod cast spells it bare. One
 * translation, here, so the two halves of the screen talk about the same voice.
 */
function labVoiceId (voice) {
  if (!voice) return ''
  const provider = String(voice.provider || '').toLowerCase()
  const id = String(voice.voice_id || '')
  return provider && !id.startsWith(`${provider}_`) ? `${provider}_${id}` : id
}

function podVoiceOf (candidate) {
  const id = String(candidate.voiceId || '')
  const provider = String(candidate.engine || id.split('_')[0] || '').toLowerCase()
  return {
    provider,
    voice_id: id.startsWith(`${provider}_`) ? id.slice(provider.length + 1) : id,
    name: String(candidate.name || id).split(' — ')[0],
  }
}

async function openRow (r) {
  if (open.value === r.language) { open.value = ''; return }
  open.value = r.language
  staged.value = {}
  saveReport.value = null
  openState.value = { busy: true, samples: {}, missing: [], unrenderable: [], unrenderableWhy: {}, line: r.line, note: '' }
  await loadCandidates()
  if (r.human) { openState.value = { ...openState.value, busy: false }; return }
  try {
    const ids = [
      ...new Set([
        ...r.slots.flatMap((s) => s.cast.map((c) => labVoiceId(c.voice))),
        ...candidateVoices.value.map((c) => c.voiceId),
      ]),
    ].filter(Boolean).slice(0, 120)
    const out = await api.podSamples(r.language, ids)
    openState.value = { ...openState.value, ...out, busy: false }
  } catch (e) {
    openState.value = { ...openState.value, busy: false, note: e.message }
  }
}

/** SPENDS. One clip per missing candidate, on the row's own pod line. */
async function prepare (force = false) {
  const r = row.value
  if (!r) return
  const ids = (force ? candidateVoices.value.map((c) => c.voiceId) : openState.value?.missing || []).slice(0, 12)
  if (!ids.length) { openState.value = { ...openState.value, note: 'Every candidate already has a clip of this line.' }; return }
  openState.value = { ...openState.value, busy: true, note: `Rendering ${ids.length} audition clip(s)…` }
  try {
    const out = await api.preparePodSamples(r.language, ids, { force })
    openState.value = {
      ...openState.value, ...out, busy: false,
      note: `${out.rendered?.length || 0} clip(s) rendered · ${out.chars || 0} characters`
        + (out.failed?.length ? ` · refused: ${out.failed.map((f) => `${f.voiceId} (${f.error})`).join(', ')}` : ''),
    }
  } catch (e) {
    openState.value = { ...openState.value, busy: false, note: e.message }
  }
}

function sampleUrlFor (voiceId) {
  const s = openState.value?.samples?.[voiceId]
  return s?.url || ''
}

/** An estate clip is a public bucket URL; a lab clip needs the session token. */
async function play (url) {
  if (!url) return
  const src = url.startsWith('/api/') ? await clipUrl(url) : url
  new Audio(src).play().catch(() => {})
}

function stagePick (gender, voice, expect) {
  staged.value = { ...staged.value, [gender]: { action: 'pick', voice, expect, label: `${GENDER_LABEL[gender]} pod voice` } }
}
function stageClear (gender, expect) {
  staged.value = { ...staged.value, [gender]: { action: 'clear', expect, label: `${GENDER_LABEL[gender]} pod voice` } }
}
function unstage (gender) {
  const next = { ...staged.value }
  delete next[gender]
  staged.value = next
}
const stagedCount = computed(() => Object.keys(staged.value).length)

async function save () {
  const r = row.value
  if (!r || saving.value) return
  saving.value = true
  saveReport.value = null
  try {
    const report = await commitPicks(planPicks(staged.value), {
      savePick: (body) => api.pickPodVoice(r.language, body),
      clearPick: (body) => api.clearPodVoice(r.language, body),
    })
    saveReport.value = report
    // A refused slot stays staged — visibly unsaved — rather than being cleared
    // and reading as landed. Same rule the course-cast save holds.
    const keep = {}
    for (const f of report.failed) keep[f.gender] = staged.value[f.gender]
    staged.value = keep
    await load({ force: true })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="vl-panel">
    <h3>Pod voices — one row per language</h3>
    <p class="vl-note">
      Pods are per LANGUAGE, not per course: a language done once is done for every course that
      teaches it. Every voice here is playable — the CURRENT clip is one the pod already has and
      costs nothing; a CANDIDATE is rendered on the same pod sentence through the lab's metered
      sample path. <strong>Nothing on this screen renders pod audio.</strong> Picking is the only
      write, and pod generation refuses to run for a language with no pick.
    </p>

    <div class="pv-controls">
      <button class="btn-secondary" :disabled="loading" @click="load({ force: true })">Refresh</button>
      <span class="pv-filters">
        <button v-for="f in ['all', 'unpicked', 'picked', 'held', 'drifted']" :key="f"
                :class="{ on: filter === f }" @click="filter = f">{{ f }}</button>
      </span>
      <input v-model="search" class="pv-search" placeholder="language…" />
      <span v-if="summary" class="pv-summary">
        {{ summary.languages }} languages · {{ summary.picked }} picked ·
        {{ summary.unpicked }} awaiting a pick · {{ summary.held }} held · {{ summary.human }} human-recorded
      </span>
    </div>

    <p v-if="error" class="pv-error">{{ error }}</p>
    <p v-else-if="loading" class="muted">Reading every language's pod…</p>

    <table v-else class="pv-table">
      <thead>
        <tr><th>Language</th><th>Pod</th><th>Speaking today</th><th>Picked</th><th></th></tr>
      </thead>
      <tbody>
        <template v-for="r in shown" :key="r.language">
          <tr class="pv-row" :class="{ open: open === r.language }" @click="openRow(r)">
            <td>
              <strong>{{ nameOf(r) }}</strong>
              <code class="pv-code">{{ r.language }}</code>
              <span class="pv-courses">{{ r.courses }} course{{ r.courses === 1 ? '' : 's' }}<template v-if="r.liveCourses">, {{ r.liveCourses }} live</template></span>
            </td>
            <td>
              <!-- Held, live and human-recorded are DIFFERENT facts and are drawn apart. -->
              <span v-if="r.human" class="pv-state human">human recording pending</span>
              <span v-else-if="r.state === 'held'" class="pv-state held">held — text written, no audio</span>
              <span v-else class="pv-state live">live</span>
            </td>
            <td>
              <span v-for="s in r.slots" :key="s.gender" class="pv-voice-cell">
                <span class="pv-g">{{ GENDER_LABEL[s.gender] }}</span>
                <template v-for="c in s.cast" :key="c.voice.voice_id">
                  <button v-if="c.clip" class="pv-play" title="the clip this pod already has"
                          @click.stop="play(c.clip.url)">▶</button>
                  <span v-else class="pv-noclip" title="no pod audio rendered for this language yet">—</span>
                  <span class="pv-vname">{{ c.voice.name || c.voice.voice_id }}</span>
                  <span class="pv-prov">{{ c.voice.provider }}</span>
                </template>
              </span>
            </td>
            <td>
              <template v-if="r.human"><span class="muted">n/a</span></template>
              <template v-else>
                <span v-for="s in r.slots" :key="s.gender" class="pv-pick-cell">
                  <span v-if="s.pick" :class="['pv-pick', s.drifted ? 'drift' : 'ok']">
                    {{ GENDER_LABEL[s.gender] }}: {{ s.pick.name || s.pick.voice_id }}
                    <em v-if="s.drifted">cast elsewhere</em>
                  </span>
                  <span v-else class="pv-pick none">{{ GENDER_LABEL[s.gender] }}: not picked</span>
                </span>
              </template>
            </td>
            <td class="pv-chev">{{ open === r.language ? '▾' : '▸' }}</td>
          </tr>

          <tr v-if="open === r.language" class="pv-detail">
            <td colspan="5">
              <p v-if="r.human" class="vl-note">
                {{ nameOf(r) }} is human-voiced only — Aran's and Catrin's recordings are never
                replaced by synthesis (Tom, 2026-08-13). Its pod is a RECORDING worklist, not a
                voice pick, so there is nothing to choose here.
              </p>

              <template v-else>
                <p class="pv-line">
                  <strong>Audition line</strong>
                  <span v-if="openState?.line">“{{ openState.line.text }}”
                    <em v-if="openState.line.knownText">{{ openState.line.knownText }}</em>
                    <span class="muted">· {{ openState.line.source }}</span>
                  </span>
                  <span v-else class="muted">this language's pod has no sentence to audition on</span>
                </p>

                <div class="pv-slots">
                  <div v-for="s in r.slots" :key="s.gender" class="pv-slot">
                    <h4>{{ GENDER_LABEL[s.gender] }} — {{ s.cast.map(c => c.speakers.length).reduce((a, b) => a + b, 0) }} speaker(s)</h4>
                    <div v-for="c in s.cast" :key="c.voice.voice_id" class="pv-cast">
                      <button v-if="c.clip" class="pv-play" @click="play(c.clip.url)">▶</button>
                      <button v-else-if="sampleUrlFor(labVoiceId(c.voice))" class="pv-play" @click="play(sampleUrlFor(labVoiceId(c.voice)))">▶</button>
                      <span v-else class="pv-noclip">no audio yet</span>
                      <strong>{{ c.voice.name || c.voice.voice_id }}</strong>
                      <span class="pv-prov">{{ c.voice.provider }}</span>
                      <span class="muted">{{ c.speakers.slice(0, 4).join(', ') }}<template v-if="c.speakers.length > 4"> +{{ c.speakers.length - 4 }}</template></span>
                      <button class="btn-secondary pv-pickbtn"
                              @click="stagePick(s.gender, { provider: c.voice.provider, voice_id: c.voice.voice_id, name: c.voice.name, ...(c.voice.locale ? { locale: c.voice.locale } : {}) }, s.pick)">
                        Pick this
                      </button>
                    </div>
                    <p class="pv-slotpick">
                      <template v-if="staged[s.gender]">
                        <span class="pv-staged">staged: {{ staged[s.gender].action === 'clear' ? 'clear the pick' : staged[s.gender].voice.name }}</span>
                        <button class="pv-link" @click="unstage(s.gender)">undo</button>
                      </template>
                      <template v-else-if="s.pick">
                        picked {{ s.pick.name || s.pick.voice_id }} by {{ s.pick.picked_by }}
                        <span class="muted">{{ (s.pick.picked_at || '').slice(0, 10) }}</span>
                        <button class="pv-link" @click="stageClear(s.gender, s.pick)">clear</button>
                      </template>
                      <template v-else><span class="pv-pick none">no pick — pod audio for this language is held</span></template>
                    </p>
                  </div>
                </div>

                <h4>Candidates — the same line, so the comparison is fair</h4>
                <p class="pv-prep">
                  <button class="btn-primary" :disabled="openState?.busy" @click="prepare(false)">
                    Render the missing clips ({{ (openState?.missing || []).length }})
                  </button>
                  <span v-if="openState?.note" class="muted">{{ openState.note }}</span>
                  <span v-if="!candidateVoices.length" class="muted">
                    no Cartesia candidate is published for this language — the render ladder falls to Azure
                  </span>
                </p>
                <div class="pv-cands">
                  <div v-for="c in candidateVoices" :key="c.voiceId" class="pv-cand">
                    <button v-if="sampleUrlFor(c.voiceId)" class="pv-play" @click="play(sampleUrlFor(c.voiceId))">▶</button>
                    <span v-else-if="(openState?.unrenderable || []).includes(c.voiceId)" class="pv-noclip"
                          :title="openState.unrenderableWhy?.[c.voiceId]">can't render</span>
                    <span v-else class="pv-noclip">no clip yet</span>
                    <span class="pv-vname">{{ c.name }}</span>
                    <span v-if="c.gender" class="pv-prov">{{ c.gender }}</span>
                    <button v-for="g in r.slots.map(s => s.gender)" :key="g" class="btn-secondary pv-pickbtn"
                            @click="stagePick(g, podVoiceOf(c), r.slots.find(s => s.gender === g)?.pick)">
                      Pick as {{ GENDER_LABEL[g] }}
                    </button>
                  </div>
                </div>

                <div class="pv-save">
                  <button class="btn-primary" :disabled="!stagedCount || saving" @click="save">
                    {{ saving ? 'Saving…' : `Save ${stagedCount} pick${stagedCount === 1 ? '' : 's'} for ${nameOf(r)}` }}
                  </button>
                  <span v-if="saveReport" class="pv-report">
                    <span v-if="saveReport.landed.length">{{ saveReport.landed.length }} saved</span>
                    <!-- A refusal is named, never swallowed: a pick that did not
                         land is a language that silently stays blocked. -->
                    <span v-for="f in saveReport.failed" :key="f.gender" class="pv-fail">
                      {{ f.label }} REFUSED — {{ f.error }}
                    </span>
                  </span>
                </div>
              </template>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
@import './lab.css';

.pv-controls { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
.pv-filters { display: flex; border: 1px solid var(--surface-3); border-radius: 999px; overflow: hidden; }
.pv-filters button {
  background: none; border: none; color: var(--muted); font: inherit;
  font-size: 0.75rem; padding: 0.3rem 0.8rem; cursor: pointer;
}
.pv-filters button.on { background: #ec4899; color: #fff; }
.pv-search {
  padding: 0.3rem 0.55rem; border-radius: 6px; border: 1px solid var(--surface-3);
  background: var(--surface-2); color: inherit; font: inherit; font-size: 0.8125rem;
}
.pv-summary { color: var(--muted); font-size: 0.75rem; }
.pv-error { color: #f87171; font-size: 0.85rem; }

.pv-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
.pv-table th {
  text-align: left; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--muted); border-bottom: 1px solid var(--surface-3); padding: 0.4rem 0.5rem;
}
.pv-row { cursor: pointer; border-bottom: 1px solid var(--surface-2); }
.pv-row:hover, .pv-row.open { background: var(--surface-2); }
.pv-row td { padding: 0.45rem 0.5rem; vertical-align: top; }
.pv-code { color: var(--muted); margin-left: 0.4rem; font-size: 0.72rem; }
.pv-courses { display: block; color: var(--muted); font-size: 0.7rem; }

/* Colour says ONE thing on this lane: a pod voice is picked. Held, unrendered
   and human-recorded are drawn — dashed, dimmed, still in ink — never painted. */
.pv-state { font-size: 0.72rem; border-radius: 999px; padding: 0.1rem 0.5rem; white-space: nowrap; }
.pv-state.live { border: 1px solid var(--surface-3); color: var(--muted); }
.pv-state.held { border: 1px dashed var(--surface-3); color: var(--muted); opacity: 0.85; }
.pv-state.human { border: 1px dashed var(--surface-3); color: var(--muted); font-style: italic; }

.pv-voice-cell, .pv-pick-cell { display: block; white-space: nowrap; line-height: 1.7; }
.pv-g { color: var(--muted); font-size: 0.68rem; width: 3.4rem; display: inline-block; }
.pv-vname { margin: 0 0.35rem; }
.pv-prov { color: var(--muted); font-size: 0.68rem; }
.pv-play {
  background: none; border: 1px solid var(--surface-3); border-radius: 999px;
  color: inherit; cursor: pointer; font-size: 0.65rem; padding: 0.05rem 0.4rem;
}
.pv-noclip { color: var(--muted); font-size: 0.7rem; border-bottom: 1px dashed var(--surface-3); }
.pv-pick { font-size: 0.72rem; }
.pv-pick.ok { color: #34d399; }
.pv-pick.drift { color: #fbbf24; }
.pv-pick.none { color: var(--muted); opacity: 0.8; }
.pv-pick em { font-style: normal; opacity: 0.8; }
.pv-chev { color: var(--muted); }

.pv-detail td { background: var(--surface-1); padding: 0.75rem 1rem 1rem; }
.pv-line { font-size: 0.8125rem; margin: 0 0 0.75rem; }
.pv-line strong { display: block; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
.pv-line em { color: var(--muted); font-style: normal; }
.pv-slots { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 0.75rem; }
.pv-slot { border: 1px solid var(--surface-3); border-radius: 8px; padding: 0.5rem 0.7rem; }
.pv-cast { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; font-size: 0.78rem; padding: 0.15rem 0; }
.pv-pickbtn { font-size: 0.7rem; padding: 0.15rem 0.5rem; }
.pv-slotpick { font-size: 0.75rem; margin: 0.4rem 0 0; }
.pv-staged { color: #ec4899; }
.pv-link { background: none; border: none; color: var(--muted); text-decoration: underline; cursor: pointer; font: inherit; font-size: 0.72rem; }
.pv-prep { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; font-size: 0.78rem; }
.pv-cands { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 0.25rem 0.75rem; margin: 0.4rem 0 0.8rem; }
.pv-cand { display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; }
.pv-save { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; border-top: 1px solid var(--surface-2); padding-top: 0.6rem; }
.pv-report { font-size: 0.75rem; display: flex; gap: 0.6rem; flex-wrap: wrap; }
.pv-fail { color: #f87171; }
</style>
