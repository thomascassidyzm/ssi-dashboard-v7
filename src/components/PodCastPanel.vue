<template>
  <div class="bg-surface border border-line rounded-lg p-5 mb-6">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4 flex-wrap mb-1">
      <div>
        <h2 class="text-sm font-semibold text-ink">Cast — two voices</h2>
        <p class="text-xs text-muted mt-0.5">
          A pod is recorded with two voices — one male, one female. Between them they play every
          character in every scenario; when a scene has two characters of the same gender, that
          voice just plays both.
        </p>
      </div>
      <button
        v-if="mode === 'saved'"
        @click="startEditing"
        class="cast-outline-btn text-xs px-3 py-1.5 rounded border border-emerald-700 text-emerald-300 hover:border-emerald-500 flex-shrink-0"
      >Edit cast</button>
    </div>

    <div v-if="status" class="cast-status text-xs mt-2" :class="statusIsError ? 'text-red-300' : 'text-emerald-300'">{{ status }}</div>

    <div v-if="loading" class="text-faint text-xs py-4">Loading cast…</div>

    <!-- ═══ SAVED: the cast is live ═══ -->
    <template v-else-if="mode === 'saved'">
      <div class="mt-4 flex items-center gap-2">
        <h3 class="text-xs font-semibold text-ink">Your cast</h3>
        <span class="text-[11px] text-emerald-300 cast-status">saved ✓ — record links are live</span>
      </div>
      <div class="grid gap-2 sm:grid-cols-2 mt-2">
        <div v-for="a in allocation" :key="a.voiceId" class="cast-row bg-canvas/60 border border-line rounded p-3">
          <!-- flex-wrap + min-w-0: `truncate` alone cannot shrink a flex child
               below its content width, so next to the flex-shrink-0 button pair
               this row measured 395px inside a 236px grid and pushed the whole
               pods page to 519px on a 390px phone. -->
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div class="text-sm text-ink font-medium truncate min-w-0">
              {{ a.name }}
              <span v-if="a.gender" class="text-[10px] text-muted border border-line rounded-full px-1.5 py-0.5 ml-1 align-middle">
                {{ a.gender === 'f' ? 'female voice' : 'male voice' }}
              </span>
              <span v-if="a.isGuide" class="cast-guide-pill text-[10px] text-sky-300 border border-sky-700 rounded-full px-1.5 py-0.5 ml-1 align-middle">
                bilingual guide
              </span>
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <button
                @click="copyRecordLink(a.voiceId)"
                class="text-[11px] px-2 py-1 rounded border border-line text-ink hover:border-emerald-500"
                :title="recordLink(a.voiceId)"
              >
                {{ copiedVoiceId === a.voiceId ? 'Copied ✓' : 'Copy record link' }}
              </button>
              <a
                :href="recordLink(a.voiceId)"
                target="_blank"
                class="cast-outline-btn text-[11px] px-2 py-1 rounded border border-emerald-700 text-emerald-300 hover:border-emerald-500"
              >Open ↗</a>
            </div>
          </div>
          <div class="text-[11px] text-muted mt-1">
            Plays: {{ a.characters.length ? a.characters.join(', ') : (a.isGuide ? 'just the guide lines' : '—') }}
          </div>
          <div class="text-[11px] text-faint mt-1">
            {{ a.lineCount }} line{{ a.lineCount === 1 ? '' : 's' }}
            <span v-if="a.estimatedMinutes != null"> · about {{ a.estimatedMinutes }} min of recording</span>
          </div>
          <div v-if="a.email" class="text-[11px] text-faint mt-1.5 truncate">
            Send the link to <span class="text-muted">{{ a.email }}</span>.
          </div>
        </div>
      </div>
      <p class="text-[11px] text-faint mt-2">
        Each record link opens that person's lines, with the conversation shown around them for context.
      </p>

      <!-- Provisioning results after a save -->
      <div v-if="provisioningNotes.length" class="mt-3 grid gap-1">
        <div v-for="(n, i) in provisioningNotes" :key="i" class="text-[11px] text-muted">{{ n }}</div>
      </div>
    </template>

    <!-- ═══ EDITING: choose the two people, preview updates as you type ═══ -->
    <template v-else>
      <div class="mt-4">
        <div class="grid gap-2">
          <div
            v-for="(person, i) in people"
            :key="i"
            class="cast-row flex items-center gap-2 flex-wrap bg-canvas/60 border border-line rounded p-2"
          >
            <input
              v-model.trim="person.name"
              placeholder="Name"
              class="bg-canvas border border-line rounded px-2 py-1.5 text-xs text-ink w-36"
            />
            <select
              v-model="person.gender"
              class="bg-canvas border border-line rounded px-2 py-1.5 text-xs text-ink"
              title="Every pod needs exactly one male voice and one female voice"
            >
              <option value="" disabled>Choose voice…</option>
              <option value="f">Female voice</option>
              <option value="m">Male voice</option>
            </select>
            <input
              v-model.trim="person.email"
              placeholder="Email (optional — gives them access automatically)"
              class="bg-canvas border border-line rounded px-2 py-1.5 text-xs text-ink flex-1 min-w-[14rem]"
            />
            <label
              class="cast-guide-label flex items-center gap-1.5 text-[11px] cursor-pointer select-none"
              :class="person.guide ? 'text-sky-300' : 'text-muted'"
              title="The bilingual guide reads the English lines"
            >
              <input type="radio" name="pod-guide" :checked="person.guide" @change="setGuide(i)" class="accent-sky-500" />
              bilingual guide
            </label>
            <button
              @click="removePerson(i)"
              class="text-faint hover:text-red-300 text-sm px-1.5"
              title="Remove this person"
            >✕</button>
          </div>
        </div>
        <div class="flex items-center gap-3 mt-2">
          <button
            v-if="people.length < 2"
            @click="addPerson"
            class="text-[11px] px-2.5 py-1 rounded border border-line text-ink hover:border-emerald-500"
          >+ Add the {{ people.length === 0 ? 'first' : 'second' }} voice</button>
          <span class="text-[11px] text-faint">
            The bilingual guide reads the English lines — it's one of the same people. If
            nobody's marked, we'll suggest whoever has the lightest load.
          </span>
        </div>
        <!-- The opt-in upgrade (Tom 2026-08-06). Deliberately quiet and off the
             default path: two voices records a whole course, so a leader who
             does nothing never meets an N-voice concept. It only appears once
             both default voices are in, and only when there's room left. -->
        <div v-if="people.length >= 2 && people.length < maxVoices" class="mt-2">
          <button
            @click="addPerson"
            class="text-[11px] text-faint hover:text-ink underline decoration-dotted underline-offset-2"
          >Add another voice</button>
          <span class="text-[11px] text-faint ml-2">
            — only if you've got another recorder. Two voices records a whole course.
          </span>
        </div>
      </div>

      <!-- Generation-side colouring: demoted to a default suggestion -->
      <div v-if="generationColouring" class="text-[11px] text-faint mt-3">
        This course came with a ready-made voice plan from generation — a handy default. Your two
        voices above always win.
      </div>

      <!-- Warnings from the solve. 'need-more-people' is suppressed here: every
           pod is two voices by design (founder ruling 2026-07-17), so a
           character sharing a voice with someone it talks to is the expected
           outcome, not a shortfall to grow the cast out of. -->
      <div v-if="visibleWarnings.length" class="mt-4 grid gap-1.5">
        <div
          v-for="(w, i) in visibleWarnings"
          :key="i"
          class="text-xs rounded px-3 py-2 border cast-row bg-canvas/60 border-line text-ink"
        >{{ w.message }}</div>
      </div>

      <!-- Live preview of the routing — not a state of its own, just what
           saving would mean. Links stay visibly dead until the save. -->
      <div v-if="allocation.length" class="mt-5 border-t border-line pt-4">
        <h3 class="text-xs font-semibold text-ink mb-2">
          Preview — who records what
          <span v-if="proposing" class="text-faint font-normal">(updating…)</span>
        </h3>
        <div class="grid gap-2 sm:grid-cols-2">
          <div v-for="a in allocation" :key="a.voiceId" class="cast-row bg-canvas/60 border border-line rounded p-3">
            <div class="flex items-center justify-between gap-2">
              <div class="text-sm text-ink font-medium truncate">
                {{ a.name }}
                <span v-if="a.gender" class="text-[10px] text-muted border border-line rounded-full px-1.5 py-0.5 ml-1 align-middle">
                  {{ a.gender === 'f' ? 'female voice' : 'male voice' }}
                </span>
                <span v-if="a.isGuide" class="cast-guide-pill text-[10px] text-sky-300 border border-sky-700 rounded-full px-1.5 py-0.5 ml-1 align-middle">
                  bilingual guide{{ a.guideSuggested ? ' (suggested)' : '' }}
                </span>
              </div>
              <span
                class="text-[11px] px-2 py-1 rounded border border-line text-faint flex-shrink-0"
              >Record link comes with saving</span>
            </div>
            <div class="text-[11px] text-muted mt-1">
              Plays: {{ a.characters.length ? a.characters.join(', ') : (a.isGuide ? 'just the guide lines' : '—') }}
            </div>
            <div class="text-[11px] text-faint mt-1">
              {{ a.lineCount }} line{{ a.lineCount === 1 ? '' : 's' }}
              <span v-if="a.estimatedMinutes != null"> · about {{ a.estimatedMinutes }} min of recording</span>
            </div>
            <div v-if="a.email" class="text-[11px] text-faint mt-1.5 truncate">
              Saving gives <span class="text-muted">{{ a.email }}</span> access automatically.
            </div>
          </div>
        </div>
        <!-- The ONE primary action, where the user actually is after reviewing
             the parts (phone viewports lose a header button: Tom's mobile
             test, 2026-06-12). -->
        <div class="flex items-center gap-2 mt-3">
          <button
            :disabled="saving || !proposal || !dirty"
            @click="saveCast"
            class="text-xs px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium"
          >
            {{ saving ? 'Saving…' : 'Save cast — make the links live' }}
          </button>
          <button
            v-if="hasSavedCast"
            @click="cancelEditing"
            class="text-xs px-3 py-2 rounded border border-line text-muted hover:text-ink"
          >Cancel</button>
          <span v-if="proposal && !dirty" class="text-[11px] text-faint">This matches the saved cast — nothing to save.</span>
        </div>
      </div>
      <div v-else-if="!speakerCount" class="text-xs text-faint mt-4">
        No dialogue characters yet — generate or sync a pod first.
      </div>
      <div v-else class="text-[11px] text-faint mt-4">
        Name your two voices — one male, one female — and the parts work themselves out here.
      </div>
    </template>
  </div>
</template>

<script setup>
/**
 * Pod casting panel — PEOPLE-FIRST (Tom's design 2026-06-11; keystone
 * pods-recording-model.md §1 + softened addendum), TWO-STATE (founder ask
 * 2026-07-17: "two voices, one saved cast, obvious"):
 *
 *   SAVED    the cast is live — a person card per voice, live record links,
 *            one Edit-cast door back into editing.
 *   EDITING  the person rows + a live PREVIEW of who-plays-what that
 *            re-solves itself as you type (POST /pods/cast/propose, debounced
 *            — no "Work out the parts" button, the preview is not a state).
 *            Links are visibly dead; ONE primary action: Save cast.
 *
 * TWO VOICES IS THE DEFAULT (Tom, voice note 2026-08-06): "probably do it for
 * two voices as the default. And then if you want to try it with three or four
 * voices because you do have additional human voice recorders, then fantastic,
 * we can do that." So the panel opens on two rows — one female, one male —
 * and the third/fourth voice is a quiet opt-in that never appears on the
 * default path. The principle behind it, same note: "If we are making it a lot
 * more complicated to even get the recordings done, it's going to be harder for
 * people to do community courses, isn't it?"
 *
 * PUT /pods/cast saves and auto-provisions access for entries carrying an
 * email. The server still collapses LEGACY multi-identity casts
 * (Aranv2/Aranv3…) to the two-voice shape on load; a cast that deliberately
 * declared three or four voices is left alone. Plain language — community
 * leaders run this, not engineers.
 */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { getApiUrl } from '@/services/api.js'
import { useAuth } from '@/composables/useAuth.js'

const props = defineProps({
  courseCode: { type: String, required: true },
})

// Cast key for the bilingual guide — the voice that reads the KNOWN-language
// (English) pod lines. The key is historical; the workload is known lines only.
const EXPLAINER = '__explainer__'

const { getAccessToken } = useAuth()
const loading = ref(true)
const proposing = ref(false)
const saving = ref(false)
const status = ref('')
const statusIsError = ref(false)
const copiedVoiceId = ref(null)
const editing = ref(false)

const people = ref([])            // [{ name, gender, email, guide }]
const proposal = ref(null)        // POST /cast/propose response
const speakers = ref([])          // [{ speaker, gender, lineCount, estimatedSeconds }]
const explainerInfo = ref(null)   // { speaker, knownLines, estimatedSeconds } — guide workload
const rosterVoices = ref([])      // [{ voiceId, name, email }]
const savedCast = ref({})         // server's podCast (already two-voice collapsed)
const generationColouring = ref(false)
const provisioningNotes = ref([])
// Server-declared cast shape: two voices by default, `max` the opt-in ceiling
// (GET /cast castDefaults). Falls back to the same numbers if an older server
// doesn't send it.
const castDefaults = ref(null)
const maxVoices = computed(() => castDefaults.value?.max || 5)

const hasSavedCast = computed(() => Object.values(savedCast.value || {}).some(v => v && v.voiceId))
const mode = computed(() => (editing.value || !hasSavedCast.value ? 'editing' : 'saved'))

async function authedFetch(path, init = {}) {
  const token = await getAccessToken()
  const headers = { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json', ...(init.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${getApiUrl()}${path}`, { ...init, headers })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
  return body
}

function note(msg, isError = false) {
  status.value = msg
  statusIsError.value = isError
}

// ── People rows ──────────────────────────────────────────────────────────────

function blankPerson() {
  return { name: '', gender: '', email: '', guide: false }
}

// Two voices is the DEFAULT, three or four an opt-in upgrade for courses that
// genuinely have extra recorders (Tom 2026-08-06). The cap stops the panel
// drifting back into the N-voice cast that made recording look like a
// production, but it is a ceiling, not a wall the leader has to reach.
function addPerson() {
  if (people.value.length >= maxVoices.value) return
  // Rows past the default carry no gender preference — the default two are
  // one female and one male, and extras are just extra hands.
  const gender = people.value.length === 0 ? 'f' : people.value.length === 1 ? 'm' : ''
  people.value = [...people.value, { ...blankPerson(), gender }]
}

function removePerson(i) {
  people.value = people.value.filter((_, idx) => idx !== i)
  proposal.value = null // the cast no longer matches the people
}

function setGuide(i) {
  people.value = people.value.map((p, idx) => ({ ...p, guide: idx === i }))
}

function startEditing() {
  prefillPeople()
  editing.value = true
  note('')
}

function cancelEditing() {
  proposal.value = null
  editing.value = false
  note('')
}

// Two named/emailed people by default, up to maxVoices when the leader has
// opted in — always covering both a male and a female voice, so every
// character has someone to read it.
const canSolve = computed(() => {
  const n = people.value.length
  if (n < 2 || n > maxVoices.value) return false
  const named = people.value.every(p => (p.name && p.name.trim()) || (p.email && p.email.trim()))
  const genders = people.value.map(p => p.gender)
  return named && genders.includes('f') && genders.includes('m')
})

// 'need-more-people' is expected under the two-voice rule, not a real warning
// — see the template note above it.
const visibleWarnings = computed(() =>
  (proposal.value?.warnings || []).filter(w => w.type !== 'need-more-people'))

const speakerCount = computed(() => speakers.value.length)

/** Prefill the people list: saved cast first, then the course roster, else one empty row. */
function prefillPeople() {
  const seen = new Map() // voiceId → person
  const guideVoiceId = savedCast.value?.[EXPLAINER]?.voiceId || null
  for (const [speaker, entry] of Object.entries(savedCast.value || {})) {
    if (!entry?.voiceId) continue
    if (!seen.has(entry.voiceId)) {
      seen.set(entry.voiceId, {
        name: entry.name || entry.voiceId,
        gender: entry.gender === 'f' || entry.gender === 'm' ? entry.gender : '',
        email: entry.email || '',
        guide: entry.voiceId === guideVoiceId,
      })
    } else if (speaker === EXPLAINER) {
      seen.get(entry.voiceId).guide = true
    }
  }
  if (seen.size) {
    people.value = [...seen.values()].slice(0, maxVoices.value)
    return
  }
  // Nothing cast yet: the course gets the two-voice default — one female row,
  // one male row, prefilled from the roster where we know who's there. A
  // leader who configures nothing still sees exactly the shape they need
  // (Tom 2026-08-06).
  if (castDefaults.value?.people?.length) {
    people.value = castDefaults.value.people.map(p => ({ ...p }))
    return
  }
  people.value = rosterVoices.value.slice(0, 2).map((v, i) => ({
    name: v.name || '', gender: i === 0 ? 'f' : 'm', email: v.email || '', guide: false,
  }))
  while (people.value.length < 2) {
    people.value = [...people.value, { ...blankPerson(), gender: people.value.length === 0 ? 'f' : 'm' }]
  }
}

// ── Load / propose / save ────────────────────────────────────────────────────

async function loadCast() {
  loading.value = true
  try {
    const data = await authedFetch(`/api/production/${props.courseCode}/pods/cast`)
    speakers.value = data.speakers || []
    explainerInfo.value = data.explainer || null
    rosterVoices.value = data.rosterVoices || []
    generationColouring.value = !!data.generationColouring
    castDefaults.value = data.castDefaults || null
    savedCast.value = data.podCast || {}
    prefillPeople()
    editing.value = !hasSavedCast.value
    note('')
  } catch (err) {
    note(err.message || String(err), true)
  } finally {
    loading.value = false
  }
}

// The preview solves itself as the form changes — "Work out the parts" is a
// consequence of typing, never a button. Debounced; stale responses (an
// earlier solve landing after a later one) are dropped by sequence number.
let proposeTimer = null
let proposeSeq = 0
async function autoPropose() {
  if (!canSolve.value) { proposal.value = null; return }
  const seq = ++proposeSeq
  proposing.value = true
  try {
    const body = {
      people: people.value
        .filter(p => (p.name && p.name.trim()) || (p.email && p.email.trim()))
        .map(p => ({
          name: p.name || undefined,
          gender: p.gender || undefined,
          email: p.email || undefined,
          guide: p.guide || undefined,
        })),
    }
    const data = await authedFetch(`/api/production/${props.courseCode}/pods/cast/propose`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    if (seq !== proposeSeq) return
    proposal.value = data
  } catch (err) {
    if (seq !== proposeSeq) return
    note(err.message || String(err), true)
  } finally {
    if (seq === proposeSeq) proposing.value = false
  }
}

watch(people, () => {
  if (mode.value !== 'editing') return
  if (proposeTimer) clearTimeout(proposeTimer)
  proposeTimer = setTimeout(autoPropose, 500)
}, { deep: true })

onBeforeUnmount(() => { if (proposeTimer) clearTimeout(proposeTimer) })

const dirty = computed(() => {
  if (!proposal.value) return false
  const proposed = proposal.value.podCast || {}
  const saved = savedCast.value || {}
  const keys = new Set([...Object.keys(proposed), ...Object.keys(saved)])
  for (const k of keys) {
    const p = proposed[k], s = saved[k]
    if (!p !== !s) return true
    if (p && s && (p.voiceId !== s.voiceId || (p.name || '') !== (s.name || '') ||
        (p.email || '') !== (s.email || '') || (p.gender || '') !== (s.gender || ''))) return true
  }
  return false
})

async function saveCast() {
  if (!proposal.value) return
  saving.value = true
  try {
    // Surgical diff: changed speakers only; null clears entries no longer cast.
    const proposed = proposal.value.podCast || {}
    const saved = savedCast.value || {}
    const updates = {}
    for (const [speaker, entry] of Object.entries(proposed)) {
      const was = saved[speaker]
      if (was && was.voiceId === entry.voiceId && (was.name || '') === (entry.name || '') &&
          (was.email || '') === (entry.email || '') && (was.gender || '') === (entry.gender || '')) continue
      updates[speaker] = {
        voiceId: entry.voiceId,
        name: entry.name || '',
        email: entry.email || '',
        gender: entry.gender || '',
      }
    }
    for (const speaker of Object.keys(saved)) {
      if (!(speaker in proposed)) updates[speaker] = null
    }
    if (!Object.keys(updates).length) { note('Nothing to save.'); return }

    const data = await authedFetch(`/api/production/${props.courseCode}/pods/cast`, {
      method: 'PUT',
      body: JSON.stringify({ podCast: updates }),
    })
    savedCast.value = data.podCast || {}
    provisioningNotes.value = (data.provisioning || []).map(p => {
      if (p.action === 'create') return `✓ ${p.email} now has recording access to this course — they can log in with this email.`
      if (p.action === 'add-course') return `✓ ${p.email} already had an account — this course was added for them.`
      if (p.action === 'error') return `⚠ Couldn't set up access for ${p.email}: ${p.error}`
      return null
    }).filter(Boolean)
    proposal.value = null
    editing.value = false
    note('Cast saved ✓ — copy each person their record link.')
  } catch (err) {
    note(err.message || String(err), true)
  } finally {
    saving.value = false
  }
}

// ── The allocation display (proposal while editing, saved cast otherwise) ───

const allocation = computed(() => {
  if (proposal.value) {
    return (proposal.value.assignments || []).map(a => ({
      voiceId: a.voiceId,
      name: a.name,
      email: a.email,
      gender: a.gender || null,
      characters: a.characters,
      lineCount: a.lineCount + (a.isGuide ? (proposal.value.explainer?.knownLines || 0) : 0),
      estimatedMinutes: a.estimatedMinutes,
      isGuide: a.isGuide,
      guideSuggested: a.guideSuggested,
    }))
  }
  // Derived from the saved cast (server-collapsed: at most two voices).
  const bySpeaker = new Map(speakers.value.map(s => [s.speaker, s]))
  const byVoice = new Map()
  for (const [speaker, entry] of Object.entries(savedCast.value || {})) {
    if (!entry?.voiceId) continue
    if (!byVoice.has(entry.voiceId)) {
      byVoice.set(entry.voiceId, {
        voiceId: entry.voiceId,
        name: entry.name || entry.voiceId,
        email: entry.email || null,
        gender: entry.gender === 'f' || entry.gender === 'm' ? entry.gender : null,
        characters: [],
        lineCount: 0,
        seconds: 0,
        isGuide: false,
        guideSuggested: false,
      })
    }
    const rec = byVoice.get(entry.voiceId)
    if (speaker === EXPLAINER) {
      rec.isGuide = true
      rec.lineCount += explainerInfo.value?.knownLines || 0
      rec.seconds += explainerInfo.value?.estimatedSeconds || 0
    } else {
      rec.characters.push(speaker)
      const sp = bySpeaker.get(speaker)
      rec.lineCount += sp?.lineCount || 0
      rec.seconds += sp?.estimatedSeconds || 0
    }
  }
  return [...byVoice.values()]
    .map(r => ({ ...r, estimatedMinutes: Math.round((r.seconds / 60) * 10) / 10 }))
    .sort((a, b) => b.lineCount - a.lineCount)
})

// ── Record links ─────────────────────────────────────────────────────────────

// The record link IS the recordist's identity, and the queue behind it is by
// LANGUAGE, not by course — so the link carries the voice and nothing else.
// Links already sent in the old /record/:course?podVoice= shape keep working:
// the router redirects them here (src/router/index.js, RecordRoom beforeEnter).
function recordLink(voiceId) {
  return `${window.location.origin}/r/${encodeURIComponent(voiceId)}`
}

async function copyRecordLink(voiceId) {
  try {
    await navigator.clipboard.writeText(recordLink(voiceId))
    copiedVoiceId.value = voiceId
    setTimeout(() => { if (copiedVoiceId.value === voiceId) copiedVoiceId.value = null }, 2000)
  } catch {
    note('Could not copy — your browser blocked clipboard access.', true)
  }
}

onMounted(loadCast)
</script>

<!--
  Light-mode legibility overrides. Dark mode keeps its light-toned accents
  (emerald-300 / sky-300 / amber-200 on dark fills) untouched — every rule
  below is scoped under [data-theme="light"], where those pale tones drop
  to ~1.4–1.9:1 on near-white. We pull them to the AA-passing, same-hue
  tokens (green→--accent-2 #047857 4.66:1, red→--danger #dc2626 4.83:1,
  sky→#0369a1 5.7:1) and give rows/pills a solid fill + readable border.
-->
<style scoped>
:global([data-theme="light"]) .cast-outline-btn {
  border-color: var(--accent-2);
  color: var(--accent-2);
}
:global([data-theme="light"]) .cast-status.text-emerald-300 {
  color: var(--accent-2);
}
:global([data-theme="light"]) .cast-status.text-red-300 {
  color: var(--danger);
}
/* Guide label/pill: sky family → darkened sky that passes AA on white. */
:global([data-theme="light"]) .cast-guide-label.text-sky-300 {
  color: #0369a1;
}
:global([data-theme="light"]) .cast-guide-pill {
  color: #0369a1;
  border-color: #7dd3fc;
}
/* Rows/cards: pale bg-canvas/60 barely separates from canvas — give them a
   solid raised surface + a full-strength line so they read as cards. */
:global([data-theme="light"]) .cast-row {
  background-color: var(--surface-2);
  border-color: var(--line);
}
/* Need-more-people warning: amber-200 on amber-900/30 ≈ 1.1:1 in light.
   Same amber hue, light fill + dark text. */
:global([data-theme="light"]) .cast-warn {
  background-color: #fef3c7;
  border-color: #d97706;
  color: #78350f;
}
</style>
