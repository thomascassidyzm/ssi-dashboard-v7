<script setup>
/**
 * LANGUAGES — the Voice Lab's per-language view.
 *
 * Tom, 2026-08-28: "a single place to check configured voices per language …
 * each language needs 2 voices, 1 male and 1 female as standard, with backups
 * in case for whatever reason there's a problem … human voices will also be
 * configured here as well".
 *
 * ONE ROW PER LANGUAGE, WORST FIRST. The screen's whole value is that a gap is
 * obvious without being worked out, so the sort puts uncast languages at the
 * top and complete ones at the bottom, and an empty slot is drawn as an empty
 * slot rather than omitted.
 *
 * THE STATUSES ARE NOT INTERCHANGEABLE, and the colours say so:
 *   complete  both primary slots (1 male, 1 female) cast — read as written
 *             (Tom, 2026-08-28): TWO voices make a language complete, full
 *             stop. A missing backup never counts against this — it shows as
 *             a quiet "no fallback" flag beside the status, not a colour.
 *   partial   some primary slots cast, some not
 *   uncast    a provider could speak it; nobody is cast — the real blocker
 *   nocover   Cartesia does not publish this language; the ladder uses Azure
 *   human     human-recorded only. NOT a gap: a human recording wins wherever
 *             it exists, so Welsh reads as human, never as a missing voice.
 *
 * Casting writes voice_language_roles and NOTHING else — no render is
 * triggered, no course_audio row is touched, no course voice_config is written.
 */
import { ref, computed, onMounted } from 'vue'
import { api } from './labApi'

const data = ref(null)
const loading = ref(true)
const error = ref('')
const filter = ref('all')
const q = ref('')
const busy = ref('')
const expanded = ref(null)

// ── Cloning ────────────────────────────────────────────────────────────────
// One sample in, one voice id out. This RENDERS NOTHING: the new voice is
// registered so it can be cast, and hearing it is a separate, capped audition
// through Play. Keeping the two apart is what stops one click becoming a bill.
const showClone = ref(false)
const cloneName = ref('')
const cloneLang = ref('eng')
const cloneGender = ref('')
const cloneFile = ref(null)
const cloneBusy = ref(false)
const cloneResult = ref(null)

function pickFile (e) { cloneFile.value = e.target.files?.[0] || null }

async function submitClone () {
  if (!cloneFile.value || !cloneName.value) return
  cloneBusy.value = true
  cloneResult.value = null
  error.value = ''
  try {
    const fd = new FormData()
    fd.append('clip', cloneFile.value)
    fd.append('name', cloneName.value)
    fd.append('language', cloneLang.value)
    if (cloneGender.value) fd.append('gender', cloneGender.value)
    const out = await api.cloneVoice(fd)
    cloneResult.value = out
    cloneName.value = ''
    cloneFile.value = null
    await load()
  } catch (e) { error.value = e.message }
  cloneBusy.value = false
}

async function load () {
  loading.value = true
  error.value = ''
  try {
    data.value = await api.languages()
  } catch (e) {
    error.value = e.message
  }
  loading.value = false
}
onMounted(load)

const rows = computed(() => {
  const all = data.value?.languages || []
  const needle = q.value.trim().toLowerCase()
  return all
    .filter((l) => filter.value === 'all' || l.status === filter.value)
    .filter((l) => !needle || l.code.toLowerCase().includes(needle))
})

const summary = computed(() => data.value?.summary || null)

/**
 * THE STATUS CHIPS ARE THE SUMMARY. One row instead of two: each chip says how
 * many languages are in that state and filters to them when clicked, so the
 * count and the way to act on it are the same object. `hue` carries the meaning
 * the header comment sets out — these are not interchangeable, and the colour
 * is how a gap reads as a gap without being worked out.
 */
const STATUSES = [
  { value: 'all',      label: 'Every status', hue: 'ui-hue-quiet', key: null },
  { value: 'complete', label: 'Complete',     hue: 'ui-hue-good',  key: 'complete' },
  { value: 'partial',  label: 'Partial',      hue: 'ui-hue-warn',  key: 'partial' },
  { value: 'uncast',   label: 'Uncast',       hue: 'ui-hue-bad',   key: 'uncast' },
  { value: 'nocover',  label: 'No Cartesia',  hue: 'ui-hue-warn',  key: 'nocover' },
  { value: 'human',    label: 'Human-voiced', hue: 'ui-hue-info',  key: 'human' },
]

const statusChips = computed(() =>
  STATUSES.map((st) => ({
    ...st,
    count: st.key ? (summary.value?.[st.key] ?? null) : (summary.value?.languages ?? null),
  }))
)

const HUE = {
  complete: 'ui-hue-good',
  partial: 'ui-hue-warn',
  nocover: 'ui-hue-warn',
  uncast: 'ui-hue-bad',
  human: 'ui-hue-info',
}
function hueFor (status) { return HUE[status] || 'ui-hue-quiet' }

/** The status word as Tom reads it, not as the API stores it. */
function statusLabel (status) {
  if (status === 'nocover') return 'no Cartesia'
  return status
}

function slotsOf (lang) {
  // Male then female, each in rank order — one stable reading order, so the eye
  // can scan down a column rather than re-learning the layout per row.
  return [
    ...lang.slots.m.map((s) => ({ ...s, gender: 'm' })),
    ...lang.slots.f.map((s) => ({ ...s, gender: 'f' })),
  ]
}

async function cast (lang, slot, voiceId) {
  if (!voiceId) return
  busy.value = `${lang.code}:${slot.gender}:${slot.rank}`
  try {
    await api.castSlot(lang.code, { gender: slot.gender, rank: slot.rank, voiceId })
    await load()
  } catch (e) { error.value = e.message }
  busy.value = ''
}

async function clear (lang, slot) {
  busy.value = `${lang.code}:${slot.gender}:${slot.rank}`
  try {
    await api.clearSlot(lang.code, { gender: slot.gender, rank: slot.rank })
    await load()
  } catch (e) { error.value = e.message }
  busy.value = ''
}

/** Candidates that make sense for a slot: right gender, or gender unknown. */
function candidatesFor (lang, slot) {
  return (lang.candidates || []).filter((c) => !c.gender || c.gender === slot.gender)
}
</script>

<template>
  <div class="vl-langs">
    <p class="vl-muted vl-intro">
      One row per language the estate actually teaches, read live from
      <code>courses</code>, <code>voices</code> and the same provider policy the render path uses.
    </p>

    <div class="vl-search">
      <input
        v-model="q"
        class="ui-search"
        type="text"
        placeholder="Search languages (e.g. 'cym', 'fra', 'zho')…"
      />
    </div>

    <div class="ui-filter-row vl-filters">
      <span class="ui-filter-label">Status</span>
      <button
        v-for="st in statusChips"
        :key="st.value"
        class="ui-chip"
        :class="filter === st.value ? st.hue : 'ui-chip-off'"
        @click="filter = st.value"
      >
        {{ st.label }}<span v-if="st.count !== null" class="chip-no">{{ st.count }}</span>
      </button>

      <button class="ui-sort-btn" :disabled="loading" @click="load">↻ Refresh</button>

      <span class="ui-count">{{ rows.length }} of {{ summary?.languages ?? 0 }} languages</span>
    </div>

    <p v-if="summary" class="vl-tail vl-muted">
      Complete means {{ summary.requiredPerLanguage }} voices — one male, one female. Backups are
      insurance, not required<span v-if="summary.noBackup">, and {{ summary.noBackup }} complete
      language{{ summary.noBackup === 1 ? ' has' : 's have' }} none</span>.
    </p>

    <p v-if="error" class="vl-error">{{ error }}</p>
    <p v-if="loading" class="vl-muted">Reading the estate…</p>

    <div v-else class="ui-table-wrap">
      <table class="ui-table">
        <thead>
          <tr>
            <th>Language</th>
            <th>Courses</th>
            <th>Default provider</th>
            <th>Voices cast</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="lang in rows" :key="lang.code">
            <tr class="ui-row" :class="lang.status">
              <td class="vl-code">{{ lang.code }}</td>
              <td class="vl-muted">{{ lang.courses }}<span v-if="lang.released"> · {{ lang.released }} live</span></td>
              <td class="vl-muted">{{ lang.defaultProvider || '—' }}</td>
              <td>
                <span :class="['vl-count', lang.filled >= lang.required ? 'ok' : lang.filled ? 'warn' : 'fail']">
                  {{ lang.filled }} / {{ lang.required }}
                </span>
              </td>
              <td>
                <span class="ui-pill" :class="hueFor(lang.status)">{{ statusLabel(lang.status) }}</span>
                <span
                  v-if="lang.status === 'complete' && !lang.hasFullBackup"
                  class="ui-pill ui-hue-quiet vl-flag"
                  title="No fallback cast — insurance only, does not affect completeness"
                >no fallback</span>
              </td>
              <td>
                <button class="ui-sort-btn" @click="expanded = expanded === lang.code ? null : lang.code">
                  {{ expanded === lang.code ? 'Hide' : 'Voices' }}
                </button>
              </td>
            </tr>

            <tr v-if="expanded === lang.code" :key="lang.code + ':slots'" class="vl-detail">
              <td colspan="6">
                <p v-if="lang.human" class="vl-note">
                  <strong>{{ lang.code }} is human-recorded only.</strong> A human recording wins
                  wherever it exists, so empty slots here are a recording worklist for its
                  recordists, not a casting gap. No TTS provider may ever be selected for it.
                </p>
                <p v-else-if="!lang.cartesiaCovers" class="vl-note">
                  Cartesia does not publish <strong>{{ lang.code }}</strong>, so a new render falls to
                  Azure. That is covered, just not by the default provider.
                </p>

                <div class="vl-slots">
                  <div v-for="slot in slotsOf(lang)" :key="slot.gender + slot.rank" class="vl-slot">
                    <div class="vl-slot-label">
                      {{ slot.gender === 'm' ? 'male' : 'female' }} · {{ slot.rankName }}
                    </div>

                    <div v-if="slot.filled" class="vl-slot-filled">
                      <span class="vl-voice">{{ slot.voiceName }}</span>
                      <span class="vl-kind">{{ slot.kind }}</span>
                      <span v-if="slot.active === false" class="ui-pill ui-hue-bad">voice inactive</span>
                      <button
                        class="ui-sort-btn"
                        :disabled="busy === `${lang.code}:${slot.gender}:${slot.rank}`"
                        @click="clear(lang, slot)"
                      >Clear</button>
                    </div>

                    <div v-else class="vl-slot-empty">
                      <select
                        class="ui-select"
                        :disabled="busy === `${lang.code}:${slot.gender}:${slot.rank}`"
                        @change="cast(lang, slot, $event.target.value)"
                      >
                        <option value="">— empty — choose a voice</option>
                        <option v-for="c in candidatesFor(lang, slot)" :key="c.voiceId" :value="c.voiceId">
                          {{ c.name }} ({{ c.kind }})
                        </option>
                      </select>
                      <span v-if="!candidatesFor(lang, slot).length" class="vl-muted">
                        no voice in the estate declares this language
                      </span>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <section class="vl-clone">
      <button class="vl-btn" @click="showClone = !showClone">
        {{ showClone ? 'Hide' : 'Clone a voice with Cartesia' }}
      </button>

      <div v-if="showClone" class="vl-clone-body">
        <p class="vl-muted">
          Upload one clean sample and Cartesia returns a new voice, which is registered here
          straight away so it can be cast into a slot below.
          <strong>This renders no audio and costs no render</strong> — to hear the clone, cast it
          or pick it in Play, where the daily character ceiling still applies.
          Cartesia cannot clone a language it does not support, so Welsh, Breton and Cornish are
          refused with a message rather than a failure.
        </p>
        <div class="vl-clone-row">
          <input v-model="cloneName" class="ui-field" placeholder="name for the new voice" />
          <input v-model="cloneLang" class="ui-field vl-narrow" placeholder="language e.g. eng" />
          <select v-model="cloneGender" class="ui-field vl-narrow">
            <option value="">gender unknown</option>
            <option value="m">male</option>
            <option value="f">female</option>
          </select>
          <input type="file" accept="audio/*" class="ui-field" @change="pickFile" />
          <button class="vl-btn" :disabled="cloneBusy || !cloneFile || !cloneName" @click="submitClone">
            {{ cloneBusy ? 'Cloning…' : 'Create clone' }}
          </button>
        </div>
        <p v-if="cloneResult" class="vl-ok">
          Created <strong>{{ cloneResult.voice?.display_name }}</strong>
          — registered as <code>{{ cloneResult.voice?.voice_id }}</code>. It is now castable below.
        </p>
      </div>
    </section>

    <div v-if="data?.notes" class="vl-notes">
      <p v-for="(text, key) in data.notes" :key="key" class="vl-muted">{{ text }}</p>
    </div>
  </div>
</template>

<style scoped>
/* The search field, the filter chips, the pill badges and the table itself all
   come from `src/assets/ui-tokens.css` — the same file the Course Library reads
   from, so this screen and that one are one product rather than two that nearly
   match. What is left here is only what is particular to a language row. */
.vl-intro { max-width: 60rem; margin-bottom: 1rem; }
.vl-search { max-width: 46rem; margin-bottom: .75rem; }
.vl-filters { margin-bottom: .5rem; }
.chip-no { margin-left: .35rem; opacity: .75; font-variant-numeric: tabular-nums; }
.vl-tail { font-size: .75rem; margin: 0 0 1rem; max-width: 70ch; }

.vl-code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--accent-2); }
.vl-flag { margin-left: .35rem; }
.vl-count.ok { color: var(--success); font-weight: 600; }
.vl-count.warn { color: var(--accent); font-weight: 600; }
.vl-count.fail { color: var(--danger); font-weight: 600; }

.vl-detail td { background: var(--surface-2); }
.vl-note { margin: .25rem 0 .75rem; }
.vl-slots { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: .6rem; }
.vl-slot { border: 1px solid var(--line); border-radius: .5rem; padding: .5rem; background: var(--surface); }
.vl-slot-label { font-size: .75rem; text-transform: uppercase; letter-spacing: .05em; color: var(--faint); margin-bottom: .3rem; }
.vl-slot-filled { display: flex; gap: .4rem; align-items: center; flex-wrap: wrap; }
.vl-slot-empty { display: flex; gap: .4rem; align-items: center; flex-wrap: wrap; }
.vl-voice { font-weight: 600; }
.vl-kind { font-size: .75rem; color: var(--muted); }
.vl-error { color: var(--danger); }
.vl-notes { margin-top: 1.25rem; display: grid; gap: .35rem; font-size: .75rem; }
.vl-clone { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--line); }
.vl-clone-body { margin-top: .75rem; max-width: 60rem; }
.vl-clone-row { display: flex; gap: .5rem; flex-wrap: wrap; align-items: center; margin-top: .5rem; }
.vl-narrow { max-width: 10rem; }
.vl-ok { color: var(--success); margin-top: .5rem; }

/* Phone: the table scrolls sideways inside its wrap rather than squeezing. */
@media (max-width: 640px) {
  .vl-search { max-width: none; }
  .ui-table { min-width: 34rem; }
}
</style>
