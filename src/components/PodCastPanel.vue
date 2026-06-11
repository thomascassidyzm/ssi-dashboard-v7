<template>
  <div class="bg-slate-800 border border-slate-700 rounded-lg p-5 mb-6">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4 flex-wrap mb-1">
      <div>
        <h2 class="text-sm font-semibold text-slate-200">Cast — who records each character</h2>
        <p class="text-xs text-slate-400 mt-0.5">
          Give each character in the dialogues a real person's voice. One person can play several characters,
          as long as two characters in the same conversation never share a voice.
        </p>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <label class="text-xs text-slate-400">Voices:</label>
        <select v-model.number="proposeN" class="bg-slate-900 border border-slate-600 rounded text-xs px-2 py-1.5 text-slate-200">
          <option v-for="n in [2,3,4,5,6]" :key="n" :value="n">{{ n }}</option>
        </select>
        <button
          :disabled="proposing || loading"
          @click="proposeCast"
          class="text-xs px-3 py-1.5 rounded border border-emerald-700 text-emerald-300 hover:border-emerald-500 disabled:opacity-50"
          title="Suggest a fair split of characters across this many voices"
        >
          {{ proposing ? 'Working…' : 'Suggest a cast' }}
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
      <div v-if="generationColouring" class="text-xs text-sky-300/90 mt-2">
        This course's dialogues already come with a voice plan from generation — the suggestion button is only a fallback.
      </div>

      <!-- Characters table -->
      <div v-if="speakerRows.length" class="mt-4 overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="text-slate-500 text-left border-b border-slate-700">
              <th class="py-1.5 pr-3 font-medium">Character</th>
              <th class="py-1.5 pr-3 font-medium">Lines</th>
              <th class="py-1.5 pr-3 font-medium">Recorded by</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in speakerRows" :key="row.speaker" class="border-b border-slate-700/50">
              <td class="py-2 pr-3">
                <span class="text-slate-200">{{ row.label }}</span>
                <span v-if="row.gender === 'f'" class="text-pink-300/70 ml-1" title="Female character">♀</span>
                <span v-else-if="row.gender === 'm'" class="text-sky-300/70 ml-1" title="Male character">♂</span>
              </td>
              <td class="py-2 pr-3 text-slate-400">{{ row.lineCount }}</td>
              <td class="py-2 pr-3">
                <select
                  :value="assignments[row.speaker] || ''"
                  @change="setAssignment(row.speaker, $event.target.value)"
                  class="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-200 min-w-[12rem]"
                >
                  <option value="">— not assigned yet —</option>
                  <option v-for="v in voiceOptions" :key="v.voiceId" :value="v.voiceId">
                    {{ v.name }}{{ v.placeholder ? ' (placeholder)' : '' }}
                  </option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="text-xs text-slate-500 mt-4">
        No dialogue characters yet — generate or sync a pod first.
      </div>

      <!-- Per-voice summary: progress placeholders + record links -->
      <div v-if="voiceSummary.length" class="mt-5 border-t border-slate-700 pt-4">
        <h3 class="text-xs font-semibold text-slate-300 mb-2">Each voice's recording session</h3>
        <div class="grid gap-2 sm:grid-cols-2">
          <div v-for="v in voiceSummary" :key="v.voiceId" class="bg-slate-900/60 border border-slate-700 rounded p-3">
            <div class="flex items-center justify-between gap-2">
              <div class="text-sm text-slate-200 font-medium truncate">{{ v.name }}</div>
              <button
                @click="copyRecordLink(v.voiceId)"
                class="text-[11px] px-2 py-1 rounded border border-slate-600 text-slate-300 hover:border-emerald-500 flex-shrink-0"
                :title="recordLink(v.voiceId)"
              >
                {{ copiedVoiceId === v.voiceId ? 'Copied ✓' : 'Copy record link' }}
              </button>
            </div>
            <div class="text-[11px] text-slate-400 mt-1 truncate">
              Plays: {{ v.characters.join(', ') || '—' }}
            </div>
            <div class="text-[11px] text-slate-500 mt-1.5">
              <!-- Placeholder until per-voice recorded counts land (keystone §5) -->
              0 of {{ v.lines }} lines recorded
              <span class="text-slate-600">· progress appears here once recording starts</span>
            </div>
          </div>
        </div>
        <p class="text-[11px] text-slate-500 mt-2">
          Send each person their record link — it opens their lines, with the conversation shown for context.
        </p>
      </div>
    </template>
  </div>
</template>

<script setup>
/**
 * Pod casting panel (keystone: pods-recording-model.md §1).
 * Talks to GET/PUT /api/production/:courseCode/pods/cast. Plain language —
 * community leaders run this, not engineers.
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
const proposeN = ref(5) // 4-5 voices is the sweet spot

const speakers = ref([])          // [{ speaker, gender, lineCount, ... }]
const explainerInfo = ref(null)   // { speaker, knownLines, explainerLines }
const rosterVoices = ref([])      // [{ voiceId, name, email }]
const savedCast = ref({})         // server's podCast
const assignments = ref({})       // speaker → voiceId (editable)
const proposalNames = ref({})     // voiceId → display name (from proposals/saved cast)
const generationColouring = ref(false)

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

function applyCastToAssignments(podCast) {
  const map = {}
  for (const [speaker, entry] of Object.entries(podCast || {})) {
    if (entry && entry.voiceId) {
      map[speaker] = entry.voiceId
      if (entry.name) proposalNames.value[entry.voiceId] = entry.name
    }
  }
  assignments.value = map
}

async function loadCast() {
  loading.value = true
  try {
    const data = await authedFetch(`/api/production/${props.courseCode}/pods/cast`)
    speakers.value = data.speakers || []
    explainerInfo.value = data.explainer || null
    rosterVoices.value = data.rosterVoices || []
    generationColouring.value = !!data.generationColouring
    savedCast.value = data.podCast || {}
    applyCastToAssignments(savedCast.value)
    note('')
  } catch (err) {
    note(err.message || String(err), true)
  } finally {
    loading.value = false
  }
}

async function proposeCast() {
  proposing.value = true
  try {
    const data = await authedFetch(`/api/production/${props.courseCode}/pods/cast?voices=${proposeN.value}`)
    const proposal = data.proposal
    if (!proposal) throw new Error('No suggestion returned')
    const map = { ...assignments.value }
    for (const [speaker, entry] of Object.entries(proposal.castBySpeaker || {})) {
      map[speaker] = entry.voiceId
      if (entry.name) proposalNames.value[entry.voiceId] = entry.name
    }
    assignments.value = map
    const forced = proposal.report?.forced?.length || 0
    note(forced
      ? `Suggestion ready — but ${forced} character(s) had to share a voice with someone they talk to. More voices would fix that. Review, then Save.`
      : 'Suggestion ready — review the names, then press Save cast.')
  } catch (err) {
    note(err.message || String(err), true)
  } finally {
    proposing.value = false
  }
}

const dirty = computed(() => {
  const saved = {}
  for (const [sp, e] of Object.entries(savedCast.value || {})) saved[sp] = e?.voiceId || ''
  const cur = assignments.value
  const keys = new Set([...Object.keys(saved), ...Object.keys(cur)])
  for (const k of keys) if ((saved[k] || '') !== (cur[k] || '')) return true
  return false
})

function setAssignment(speaker, voiceId) {
  assignments.value = { ...assignments.value, [speaker]: voiceId }
}

async function saveCast() {
  saving.value = true
  try {
    // Surgical: send only the changed speakers; null clears an entry.
    const updates = {}
    const saved = savedCast.value || {}
    const keys = new Set([...Object.keys(saved), ...Object.keys(assignments.value)])
    for (const speaker of keys) {
      const cur = assignments.value[speaker] || ''
      const was = saved[speaker]?.voiceId || ''
      if (cur === was) continue
      if (!cur) { updates[speaker] = null; continue }
      const voice = voiceOptions.value.find(v => v.voiceId === cur)
      updates[speaker] = {
        voiceId: cur,
        name: voice?.name || cur,
        ...(voice?.email ? { email: voice.email } : {}),
      }
    }
    if (!Object.keys(updates).length) { note('Nothing to save.'); return }
    const data = await authedFetch(`/api/production/${props.courseCode}/pods/cast`, {
      method: 'PUT',
      body: JSON.stringify({ podCast: updates }),
    })
    savedCast.value = data.podCast || {}
    applyCastToAssignments(savedCast.value)
    note('Cast saved ✓')
  } catch (err) {
    note(err.message || String(err), true)
  } finally {
    saving.value = false
  }
}

// ── Display rows ─────────────────────────────────────────────────────────────

const speakerRows = computed(() => {
  const rows = speakers.value.map(s => ({
    speaker: s.speaker,
    label: s.speaker,
    gender: s.gender,
    lineCount: s.lineCount,
  }))
  const ex = explainerInfo.value
  if (ex && (ex.knownLines || ex.explainerLines)) {
    rows.push({
      speaker: EXPLAINER,
      label: 'English helper (translations + explanations)',
      gender: 'n',
      lineCount: (ex.knownLines || 0) + (ex.explainerLines || 0),
    })
  }
  return rows
})

const voiceOptions = computed(() => {
  const seen = new Map()
  for (const v of rosterVoices.value) {
    seen.set(v.voiceId, { voiceId: v.voiceId, name: v.name || v.voiceId, email: v.email || null, placeholder: false })
  }
  // Voices referenced by the saved cast or a suggestion but not (yet) on the
  // roster — keep them selectable so a suggestion is usable before everyone
  // has joined.
  const referenced = new Set([
    ...Object.values(assignments.value).filter(Boolean),
    ...Object.values(savedCast.value || {}).map(e => e?.voiceId).filter(Boolean),
  ])
  for (const vid of referenced) {
    if (!seen.has(vid)) {
      seen.set(vid, {
        voiceId: vid,
        name: proposalNames.value[vid] || vid,
        email: null,
        placeholder: vid.startsWith('pod_voice_'),
      })
    }
  }
  return [...seen.values()]
})

const voiceSummary = computed(() => {
  const byVoice = new Map()
  for (const row of speakerRows.value) {
    const vid = assignments.value[row.speaker]
    if (!vid) continue
    if (!byVoice.has(vid)) {
      const v = voiceOptions.value.find(o => o.voiceId === vid)
      byVoice.set(vid, { voiceId: vid, name: v?.name || vid, characters: [], lines: 0 })
    }
    const rec = byVoice.get(vid)
    rec.characters.push(row.speaker === EXPLAINER ? 'English helper' : row.label)
    rec.lines += row.lineCount
  }
  return [...byVoice.values()].sort((a, b) => b.lines - a.lines)
})

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
