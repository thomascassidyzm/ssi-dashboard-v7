<template>
  <div class="bg-slate-800 border border-slate-700 rounded-lg p-5 mb-6">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4 flex-wrap mb-1">
      <div>
        <h2 class="text-sm font-semibold text-slate-200">Cast — who can record voices?</h2>
        <p class="text-xs text-slate-400 mt-0.5">
          List the real people who can record, then let us work out the parts. One person can play
          several characters — we just make sure two characters in the same conversation never share a voice.
        </p>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <button
          :disabled="proposing || loading || !canSolve"
          @click="workOutParts"
          class="text-xs px-3 py-1.5 rounded border border-emerald-700 text-emerald-300 hover:border-emerald-500 disabled:opacity-50"
          title="Split the characters fairly across your people"
        >
          {{ proposing ? 'Working…' : 'Work out the parts' }}
        </button>
        <button
          :disabled="saving || !dirty"
          @click="saveCast"
          class="text-xs px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium"
        >
          {{ saving ? 'Saving…' : 'Save cast' }}
        </button>
      </div>
    </div>

    <div v-if="status" class="text-xs mt-2" :class="statusIsError ? 'text-red-300' : 'text-emerald-300'">{{ status }}</div>

    <div v-if="loading" class="text-slate-500 text-xs py-4">Loading cast…</div>

    <template v-else>
      <!-- People rows -->
      <div class="mt-4">
        <div class="grid gap-2">
          <div
            v-for="(person, i) in people"
            :key="i"
            class="flex items-center gap-2 flex-wrap bg-slate-900/60 border border-slate-700 rounded p-2"
          >
            <input
              v-model.trim="person.name"
              placeholder="Name"
              class="bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 w-36"
            />
            <select
              v-model="person.gender"
              class="bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200"
              title="Only a preference — it never blocks the casting"
            >
              <option value="">Voice: no preference</option>
              <option value="f">Female voice</option>
              <option value="m">Male voice</option>
            </select>
            <input
              v-model.trim="person.email"
              placeholder="Email (optional — gives them access automatically)"
              class="bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 flex-1 min-w-[14rem]"
            />
            <label
              class="flex items-center gap-1.5 text-[11px] cursor-pointer select-none"
              :class="person.guide ? 'text-sky-300' : 'text-slate-400'"
              title="The bilingual guide reads the translations and explanations"
            >
              <input type="radio" name="pod-guide" :checked="person.guide" @change="setGuide(i)" class="accent-sky-500" />
              bilingual guide
            </label>
            <button
              @click="removePerson(i)"
              class="text-slate-500 hover:text-red-300 text-sm px-1.5"
              title="Remove this person"
            >✕</button>
          </div>
        </div>
        <div class="flex items-center gap-3 mt-2">
          <button
            @click="addPerson"
            class="text-[11px] px-2.5 py-1 rounded border border-slate-600 text-slate-300 hover:border-emerald-500"
          >+ Add a person</button>
          <span class="text-[11px] text-slate-500">
            The bilingual guide reads the English lines. If nobody's marked, we'll suggest whoever has the lightest load
            — a guide can also play a character, though a separate voice is nicer.
          </span>
        </div>
      </div>

      <!-- Generation-side colouring: demoted to a default suggestion -->
      <div v-if="generationColouring" class="text-[11px] text-slate-500 mt-3">
        This course came with a ready-made 5-voice plan from generation — a handy default when you have
        5 people. Your list above always wins.
      </div>

      <!-- Warnings from the solve -->
      <div v-if="proposal && proposal.warnings?.length" class="mt-4 grid gap-1.5">
        <div
          v-for="(w, i) in proposal.warnings"
          :key="i"
          class="text-xs rounded px-3 py-2 border"
          :class="w.type === 'need-more-people'
            ? 'bg-amber-900/30 border-amber-700 text-amber-200'
            : 'bg-slate-900/60 border-slate-700 text-slate-300'"
        >{{ w.message }}</div>
      </div>

      <!-- The allocation: who plays what -->
      <div v-if="allocation.length" class="mt-5 border-t border-slate-700 pt-4">
        <h3 class="text-xs font-semibold text-slate-300 mb-2">
          {{ proposal ? 'The parts — review, then Save cast' : 'Saved cast' }}
        </h3>
        <div class="grid gap-2 sm:grid-cols-2">
          <div v-for="a in allocation" :key="a.voiceId" class="bg-slate-900/60 border border-slate-700 rounded p-3">
            <div class="flex items-center justify-between gap-2">
              <div class="text-sm text-slate-200 font-medium truncate">
                {{ a.name }}
                <span v-if="a.isGuide" class="text-[10px] text-sky-300 border border-sky-700 rounded-full px-1.5 py-0.5 ml-1 align-middle">
                  bilingual guide{{ a.guideSuggested ? ' (suggested)' : '' }}
                </span>
              </div>
              <div class="flex items-center gap-1.5 flex-shrink-0">
                <template v-if="savedVoiceIds.has(a.voiceId)">
                  <button
                    @click="copyRecordLink(a.voiceId)"
                    class="text-[11px] px-2 py-1 rounded border border-slate-600 text-slate-300 hover:border-emerald-500"
                    :title="recordLink(a.voiceId)"
                  >
                    {{ copiedVoiceId === a.voiceId ? 'Copied ✓' : 'Copy record link' }}
                  </button>
                  <a
                    :href="recordLink(a.voiceId)"
                    target="_blank"
                    class="text-[11px] px-2 py-1 rounded border border-emerald-700 text-emerald-300 hover:border-emerald-500"
                  >Open ↗</a>
                </template>
                <span
                  v-else
                  class="text-[11px] px-2 py-1 rounded border border-slate-700/60 text-slate-500"
                  title="Record links only work once the cast is saved"
                >
                  Save cast to get the link
                </span>
              </div>
            </div>
            <div class="text-[11px] text-slate-400 mt-1">
              Plays: {{ a.characters.length ? a.characters.join(', ') : (a.isGuide ? 'just the guide lines' : '—') }}
            </div>
            <div class="text-[11px] text-slate-500 mt-1">
              {{ a.lineCount }} line{{ a.lineCount === 1 ? '' : 's' }}
              <span v-if="a.estimatedMinutes != null"> · about {{ a.estimatedMinutes }} min of recording</span>
            </div>
            <div v-if="a.email" class="text-[11px] text-slate-500 mt-1.5 truncate">
              Send the link to <span class="text-slate-400">{{ a.email }}</span> — they'll get access automatically when you save.
            </div>
          </div>
        </div>
        <p class="text-[11px] text-slate-500 mt-2">
          Each record link opens that person's lines, with the conversation shown around them for context.
          Links go live when you save the cast.
        </p>
      </div>
      <div v-else-if="!speakerCount" class="text-xs text-slate-500 mt-4">
        No dialogue characters yet — generate or sync a pod first.
      </div>

      <!-- Provisioning results after a save -->
      <div v-if="provisioningNotes.length" class="mt-3 grid gap-1">
        <div v-for="(n, i) in provisioningNotes" :key="i" class="text-[11px] text-slate-400">{{ n }}</div>
      </div>
    </template>
  </div>
</template>

<script setup>
/**
 * Pod casting panel — PEOPLE-FIRST (Tom's design 2026-06-11; keystone
 * pods-recording-model.md §1 + softened addendum). The leader lists who can
 * actually record; POST /pods/cast/propose works out the parts; PUT /pods/cast
 * saves and auto-provisions access for entries carrying an email.
 * Plain language — community leaders run this, not engineers.
 */
import { ref, computed, onMounted } from 'vue'
import { getApiUrl } from '@/services/api.js'
import { useAuth } from '@/composables/useAuth.js'

const props = defineProps({
  courseCode: { type: String, required: true },
})

const EXPLAINER = '__explainer__'

const { getAccessToken } = useAuth()
const loading = ref(true)
const proposing = ref(false)
const saving = ref(false)
const status = ref('')
const statusIsError = ref(false)
const copiedVoiceId = ref(null)

const people = ref([])            // [{ name, gender, email, guide }]
const proposal = ref(null)        // POST /cast/propose response
const speakers = ref([])          // [{ speaker, gender, lineCount, estimatedSeconds }]
const explainerInfo = ref(null)   // { speaker, knownLines, explainerLines, estimatedSeconds }
const rosterVoices = ref([])      // [{ voiceId, name, email }]
const savedCast = ref({})         // server's podCast
const generationColouring = ref(false)
const provisioningNotes = ref([])

// Record links only exist once the cast is SAVED — the Record Room reads the
// saved cast, so a link copied from an unsaved proposal lands on "Casting not
// set up yet" (Tom, 2026-06-12). Gate the link UI on membership here.
const savedVoiceIds = computed(() => new Set(
  Object.values(savedCast.value || {}).map(v => v?.voiceId).filter(Boolean)
))

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

function addPerson() {
  people.value = [...people.value, blankPerson()]
}

function removePerson(i) {
  people.value = people.value.filter((_, idx) => idx !== i)
  proposal.value = null // the cast no longer matches the people
}

function setGuide(i) {
  people.value = people.value.map((p, idx) => ({ ...p, guide: idx === i }))
}

const canSolve = computed(() =>
  people.value.some(p => (p.name && p.name.trim()) || (p.email && p.email.trim())))

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
    people.value = [...seen.values()]
    return
  }
  if (rosterVoices.value.length) {
    people.value = rosterVoices.value.map(v => ({
      name: v.name || '', gender: '', email: v.email || '', guide: false,
    }))
    return
  }
  people.value = [blankPerson()]
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
    savedCast.value = data.podCast || {}
    prefillPeople()
    note('')
  } catch (err) {
    note(err.message || String(err), true)
  } finally {
    loading.value = false
  }
}

async function workOutParts() {
  proposing.value = true
  provisioningNotes.value = []
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
    proposal.value = data
    const blocking = (data.warnings || []).filter(w => w.type === 'need-more-people').length
    note(blocking
      ? 'Parts worked out — see the note below about needing more people. You can still save and adjust later.'
      : 'Parts worked out — review who plays what, then press Save cast.')
  } catch (err) {
    note(err.message || String(err), true)
  } finally {
    proposing.value = false
  }
}

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
    note('Cast saved ✓ — copy each person their record link below.')
  } catch (err) {
    note(err.message || String(err), true)
  } finally {
    saving.value = false
  }
}

// ── The allocation display (proposal first, saved cast as fallback) ─────────

const allocation = computed(() => {
  if (proposal.value) {
    return (proposal.value.assignments || []).map(a => ({
      voiceId: a.voiceId,
      name: a.name,
      email: a.email,
      characters: a.characters,
      lineCount: a.lineCount + (a.isGuide
        ? (proposal.value.explainer?.knownLines || 0) + (proposal.value.explainer?.explainerLines || 0)
        : 0),
      estimatedMinutes: a.estimatedMinutes,
      isGuide: a.isGuide,
      guideSuggested: a.guideSuggested,
    }))
  }
  // Derived from the saved cast (page reload before any new solve).
  const bySpeaker = new Map(speakers.value.map(s => [s.speaker, s]))
  const byVoice = new Map()
  for (const [speaker, entry] of Object.entries(savedCast.value || {})) {
    if (!entry?.voiceId) continue
    if (!byVoice.has(entry.voiceId)) {
      byVoice.set(entry.voiceId, {
        voiceId: entry.voiceId,
        name: entry.name || entry.voiceId,
        email: entry.email || null,
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
      rec.lineCount += (explainerInfo.value?.knownLines || 0) + (explainerInfo.value?.explainerLines || 0)
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

function recordLink(voiceId) {
  return `${window.location.origin}/record/${props.courseCode}?podVoice=${encodeURIComponent(voiceId)}`
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
