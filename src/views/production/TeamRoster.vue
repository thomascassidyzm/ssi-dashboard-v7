<template>
  <div class="team-roster">
    <header class="roster-header">
      <div>
        <h1>Your team</h1>
        <p class="subtitle">
          The people helping you build <strong>{{ getCourseName(courseCode) }}</strong> — and who records each voice.
        </p>
      </div>
      <button class="btn primary" @click="showInvite = !showInvite">
        {{ showInvite ? 'Close invite' : 'Invite a recorder' }}
      </button>
    </header>

    <p v-if="error" class="error-banner">{{ error }}</p>

    <!-- Invite panel -->
    <section v-if="showInvite" class="card invite-card">
      <h2>Invite a recorder</h2>
      <p class="hint">
        Create a one-time code for someone who will record their voice for this course.
        Send them the recording link and the code — that's all they need.
      </p>
      <button class="btn primary" :disabled="inviting" @click="createInvite">
        {{ inviting ? 'Creating…' : 'Create invite code' }}
      </button>

      <div v-if="invite" class="invite-result">
        <div class="invite-row">
          <span class="invite-label">Code</span>
          <code class="invite-code">{{ invite.code }}</code>
        </div>
        <div class="invite-row">
          <span class="invite-label">Recording link</span>
          <code class="invite-link">{{ recordLink }}</code>
        </div>
        <button class="btn" @click="copyInvite">
          {{ copied ? 'Copied!' : 'Copy link + code' }}
        </button>
        <p class="hint" v-if="invite.expires_at">
          This code works once and expires {{ formatDate(invite.expires_at) }}.
        </p>
      </div>
    </section>


    <!-- THE SECOND STAMP, when it is what the assignment is waiting on. They
         have already said yes once; nobody is asked to say it twice. -->
    <section v-if="awaitingConfirmation" class="card consent-card">
      <h2>{{ memberName(awaitingConfirmation.email) }} still has to hear their voice</h2>
      <p class="hint">{{ awaitingConfirmation.message }}</p>
      <!-- ASK THEM HERE, not somewhere else (Tom, 2026-08-31). For a
           human-voiced recordist — Welsh, Breton, Cornish — there is no clone
           to go and make in the Voice Lab, because Cartesia cannot clone those
           languages at all. What they consent to is their OWN take, the estate
           already holds it, and this strip plays it back and takes the answer.
           The same strip, the same two buttons, the same server route as the
           clone path: only the audio is different. -->
      <CloneConfirm
        v-if="awaitingConfirmation.voiceId"
        :voice-id="awaitingConfirmation.voiceId"
        @decided="onConfirmed"
      />
      <p v-else class="hint">
        Their clone is made in the Voice Lab, and the confirm and reject buttons sit under it
        there — play it to them, and this assignment goes through the moment they say yes.
      </p>
      <button class="btn" @click="awaitingConfirmation = null">close</button>
    </section>

    <!-- Consent — a step of onboarding, not a screen you can click past -->
    <section v-if="consentFor" class="card consent-card">
      <h2>Before {{ memberName(consentFor.email) }} records: their permission</h2>
      <p class="hint">
        We are about to create a voice for {{ memberName(consentFor.email) }} and put it in front of
        learners. They need to say, on the record, that they are happy with that. It takes ten seconds.
      </p>

      <div class="consent-line">{{ wording.spoken_phrase }}</div>
      <p class="hint">
        With {{ memberName(consentFor.email) }} at the microphone, press record and let them read that
        line aloud. We listen to the recording to check it was really read.
      </p>

      <div class="consent-actions">
        <button v-if="!recording" class="btn primary" :disabled="consentBusy" @click="startConsentRecording">
          {{ consentClip ? 'Record again' : 'Record them reading it' }}
        </button>
        <button v-else class="btn danger" @click="stopConsentRecording">Stop recording</button>
        <span v-if="recording" class="recording-dot">Recording…</span>
        <button
          v-if="consentClip && !recording"
          class="btn primary"
          :disabled="consentBusy"
          @click="submitSpokenConsent"
        >{{ consentBusy ? 'Checking…' : 'Save their permission' }}</button>
      </div>

      <p v-if="consentHeard !== null" class="consent-heard">
        We listened, and what came through was: “{{ consentHeard || 'nothing at all' }}”.
      </p>
      <p v-if="consentError" class="error-banner">{{ consentError }}</p>

      <details class="consent-written" :open="attestOpen">
        <summary>They are not at a microphone</summary>
        <p class="hint">
          Then somebody has to state it in writing instead. This is a weaker record — it says who made
          the statement, not who spoke — so use the recording whenever you can.
        </p>
        <label class="consent-tick">
          <input type="checkbox" v-model="attestAgreed" />
          <span>{{ wording.attestation }}</span>
        </label>
        <input
          v-model="attestBy"
          class="consent-name"
          type="text"
          placeholder="Who is making this statement? Full name"
        />
        <button
          class="btn"
          :disabled="consentBusy || !attestAgreed || !attestBy.trim()"
          @click="submitAttestedConsent"
        >Save the written statement</button>
      </details>

      <button class="btn small" :disabled="consentBusy" @click="cancelConsent">Cancel</button>
    </section>

    <!-- Voice slots -->
    <section class="card">
      <h2>Voices</h2>
      <p class="hint">
        Every course needs two recorded voices in the language being learned.
        Each voice is one person reading the whole recording script — roughly
        half an hour of reading (their Record Room shows the exact estimate).
      </p>
      <div class="slots">
        <div v-for="(s, i) in slots" :key="s.slot" class="slot-card" :class="{ filled: s.isHuman }">
          <div class="slot-title">Voice {{ i + 1 }}</div>
          <template v-if="s.isHuman">
            <div class="slot-person">{{ memberName(s.assigned_email) }}</div>
            <div class="slot-voice-id">{{ s.assigned_email || 'Assigned' }}</div>
            <button class="btn small" :disabled="saving" @click="unassign(s.assigned_email)">Unassign</button>
          </template>
          <template v-else>
            <div class="slot-empty">
              <span v-if="s.voiceId">Currently a computer voice</span>
              <span v-else>Not assigned yet</span>
            </div>
            <select v-model="slotPick[s.slot]" class="slot-select" :disabled="saving">
              <option value="">Choose a team member…</option>
              <option v-for="m in unassignedMembers" :key="m.email" :value="m.email">
                {{ m.name || m.email }}
              </option>
            </select>
            <button
              class="btn small primary"
              :disabled="saving || !slotPick[s.slot]"
              @click="assign(slotPick[s.slot], s.slot)"
            >Assign</button>
          </template>
        </div>
      </div>
    </section>

    <!-- Members table -->
    <section class="card">
      <h2>Team members</h2>
      <p v-if="loading" class="hint">Loading…</p>
      <p v-else-if="members.length === 0" class="hint">
        No one else is on this course yet. Use “Invite a recorder” to bring someone in.
      </p>
      <table v-else class="members-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Voice</th>
            <th>Recordings</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in members" :key="m.email">
            <td>{{ m.name || '—' }}</td>
            <td>{{ m.email }}</td>
            <td><span class="role-chip" :class="m.role">{{ roleLabel(m.role) }}</span></td>
            <td>
              <span v-if="m.slot" class="slot-chip">Voice {{ m.slot === 'target1' ? 1 : 2 }}</span>
              <span v-else class="muted">—</span>
            </td>
            <td><span class="muted">{{ m.recorded_count ?? '—' }}</span></td>
            <td class="row-actions">
              <button
                class="btn small danger"
                :disabled="saving"
                @click="removeMember(m)"
              >Remove</button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { getApiUrl } from '../../services/api'
import { useCourses } from '../../composables/useCourses'
// The SAME strip the Voice Lab uses, deliberately — one confirm/reject
// mechanism in the estate, not two that can drift apart.
import CloneConfirm from '../admin/voicelab/CloneConfirm.vue'

const props = defineProps({
  courseCode: { type: String, required: true },
})

const { getAccessToken } = useAuth()
const { getCourseName } = useCourses()

const loading = ref(true)
const saving = ref(false)
const error = ref(null)
const members = ref([])
const slots = ref([])
const slotPick = ref({ target1: '', target2: '' })

// ── CONSENT, THE ONBOARDING STEP (Tom, 2026-08-31) ────────────────────────
// "A person being onboarded to record for us is exactly who should be stating,
// on the record, that they agree to their voice being used and cloned."
//
// So this is not a warning bolted onto Assign. Assigning a slot mints a voice
// for a real person, the server refuses to mint one without a recorded yes, and
// this panel is how the yes gets recorded — in the same breath, with the person
// sitting there, rather than as a chore somebody does later or never.
const consentFor = ref(null)          // { email, slot } — the assignment waiting on it
const awaitingConfirmation = ref(null) // { email, message, voiceId, slot } — waiting on them hearing it
const consentBusy = ref(false)
const consentError = ref(null)
const consentHeard = ref(null)        // what whisper heard, quoted back on a refusal
const consentClip = ref(null)
const recording = ref(false)
const attestOpen = ref(false)
const attestAgreed = ref(false)
const attestBy = ref('')
const wording = ref({ spoken_phrase: '', attestation: '' })
let mediaRecorder = null
let mediaStream = null

const showInvite = ref(false)
const inviting = ref(false)
const invite = ref(null)
const copied = ref(false)

const teamUrl = computed(() => `${getApiUrl()}/api/production/${props.courseCode}/team`)
const recordLink = computed(() =>
  invite.value ? `${window.location.origin}${invite.value.record_path}` : ''
)

const unassignedMembers = computed(() => members.value.filter(m => !m.slot))

function memberName(email) {
  const m = members.value.find(x => x.email === email)
  return m ? (m.name || m.email) : (email || 'Unknown')
}

function roleLabel(role) {
  if (role === 'admin') return 'Admin'
  if (role === 'recorder') return 'Recorder'
  return 'Editor'
}

function formatDate(iso) {
  try { return new Date(iso).toLocaleDateString() } catch { return iso }
}

/** Multipart sibling of api() — the consent recording is bytes, not JSON. */
async function apiForm(path, form) {
  const token = await getAccessToken()
  const resp = await fetch(`${teamUrl.value}${path}`, {
    method: 'POST',
    // No Content-Type: the browser must set the multipart boundary itself.
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok) throw Object.assign(new Error(data.error || `Request failed (${resp.status})`), { detail: data })
  return data
}

async function api(path, options = {}) {
  const token = await getAccessToken()
  const resp = await fetch(`${teamUrl.value}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
  const data = await resp.json().catch(() => ({}))
  // The refusal's `detail` rides along, because the screen has to BRANCH on it
  // — open the consent step, offer the written statement — and string-matching
  // English prose that Tom redlines is how a screen silently takes the wrong one.
  if (!resp.ok) throw Object.assign(new Error(data.error || `Request failed (${resp.status})`), { detail: data })
  return data
}

async function loadTeam() {
  loading.value = true
  error.value = null
  try {
    const data = await api('')
    members.value = data.members || []
    slots.value = data.slots || []
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function assign(email, slot) {
  saving.value = true
  error.value = null
  try {
    await api('/assign-slot', { method: 'POST', body: JSON.stringify({ email, slot }) })
    slotPick.value[slot] = ''
    consentFor.value = null
    awaitingConfirmation.value = null
    await loadTeam()
  } catch (err) {
    // Not an error to show and abandon — it is the next step of onboarding.
    // The server refused to create this person's voice because nobody has asked
    // them yet, so ask them, right here, and finish the assignment after.
    if (err.detail && err.detail.needsCloneConfirmation) {
      // THE SECOND STAMP IS OUTSTANDING (Tom, 2026-08-31). They have already
      // read the line aloud; what is left is hearing their own clone and saying
      // yes to it. Asking them to consent again here would look like the system
      // had lost the answer they gave, so the screen says which step is left.
      awaitingConfirmation.value = {
        email,
        slot,
        message: err.message,
        // The voice id rides on the refusal already, so the strip can ask the
        // server what this person is waiting to hear and play it right here.
        voiceId: err.detail.voice_id || null,
      }
    } else if (err.detail && err.detail.needsOnboardingConsent) {
      await openConsent(email, slot)
    } else {
      error.value = err.message
    }
  } finally {
    saving.value = false
  }
}

/**
 * They have answered. A YES unblocks the assignment that sent them here, so it
 * is retried immediately — being sent back to press the same button again after
 * consenting is how a two-step flow starts feeling like a punishment. A NO is
 * final, and the card closes on the refusal the roster will now show.
 */
async function onConfirmed (decided) {
  const pending = awaitingConfirmation.value
  awaitingConfirmation.value = null
  if (decided && decided.castable && pending && pending.slot) {
    await assign(pending.email, pending.slot)
  } else {
    await loadTeam()
  }
}

async function openConsent(email, slot) {
  consentFor.value = { email, slot }
  consentError.value = null
  consentHeard.value = null
  consentClip.value = null
  attestOpen.value = false
  attestAgreed.value = false
  attestBy.value = memberName(email) === email ? '' : memberName(email)
  if (!wording.value.spoken_phrase) {
    try { wording.value = await api('/consent-wording') } catch { /* the panel still works; the line just is not shown */ }
  }
}

function cancelConsent() {
  stopConsentRecording()
  consentFor.value = null
  consentClip.value = null
  consentError.value = null
  consentHeard.value = null
}

async function startConsentRecording() {
  consentError.value = null
  consentHeard.value = null
  consentClip.value = null
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch {
    consentError.value = 'This browser would not give us the microphone. Allow microphone access, or use the written statement below.'
    attestOpen.value = true
    return
  }
  const chunks = []
  mediaRecorder = new MediaRecorder(mediaStream)
  mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data) }
  mediaRecorder.onstop = () => {
    consentClip.value = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' })
    if (mediaStream) mediaStream.getTracks().forEach(t => t.stop())
    mediaStream = null
    recording.value = false
  }
  mediaRecorder.start()
  recording.value = true
}

function stopConsentRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop()
  else if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; recording.value = false }
}

async function submitSpokenConsent() {
  if (!consentClip.value || !consentFor.value) return
  consentBusy.value = true
  consentError.value = null
  consentHeard.value = null
  try {
    const form = new FormData()
    form.append('email', consentFor.value.email)
    form.append('person', memberName(consentFor.value.email))
    form.append('sampleFrom', 'record')
    form.append('clip', consentClip.value, 'consent.webm')
    await apiForm('/consent', form)
    await finishAfterConsent()
  } catch (err) {
    consentError.value = err.message
    const d = err.detail || {}
    // Two different refusals, two different next moves — and the screen must
    // not have to read English to tell them apart.
    if (d.declarationNotHeard) consentHeard.value = d.heard || ''
    if (d.needsAttestation) attestOpen.value = true
  } finally {
    consentBusy.value = false
  }
}

async function submitAttestedConsent() {
  if (!consentFor.value) return
  consentBusy.value = true
  consentError.value = null
  try {
    await api('/consent', {
      method: 'POST',
      body: JSON.stringify({
        email: consentFor.value.email,
        person: memberName(consentFor.value.email),
        declarationAgreed: true,
        attestedBy: attestBy.value.trim(),
      }),
    })
    await finishAfterConsent()
  } catch (err) {
    consentError.value = err.message
  } finally {
    consentBusy.value = false
  }
}

/** Consent recorded — now finish the thing they actually pressed. */
async function finishAfterConsent() {
  const { email, slot } = consentFor.value
  consentFor.value = null
  consentClip.value = null
  await assign(email, slot)
}

async function unassign(email) {
  saving.value = true
  error.value = null
  try {
    await api('/assign-slot', { method: 'POST', body: JSON.stringify({ email, slot: 'unassigned' }) })
    await loadTeam()
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

async function removeMember(m) {
  const who = m.name || m.email
  if (!window.confirm(`Remove ${who} from this course? They keep their account — they just lose access to ${getCourseName(props.courseCode)}.`)) return
  saving.value = true
  error.value = null
  try {
    await api('/member', { method: 'DELETE', body: JSON.stringify({ email: m.email }) })
    await loadTeam()
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

async function createInvite() {
  inviting.value = true
  error.value = null
  copied.value = false
  try {
    invite.value = await api('/invite', { method: 'POST', body: JSON.stringify({ role: 'recorder' }) })
  } catch (err) {
    error.value = err.message
  } finally {
    inviting.value = false
  }
}

async function copyInvite() {
  if (!invite.value) return
  const text = `Recording link: ${recordLink.value}\nInvite code: ${invite.value.code}`
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    window.prompt('Copy this:', text)
  }
}

onMounted(loadTeam)
</script>

<style scoped>
.team-roster {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
}

.roster-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.roster-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.25rem;
}

.subtitle {
  color: var(--muted);
  margin: 0;
}

.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 1.25rem;
  margin-bottom: 1.25rem;
}

.card h2 {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
}

.hint {
  color: var(--muted);
  font-size: 0.875rem;
  margin: 0 0 0.75rem;
}

.error-banner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
  border-radius: 8px;
  padding: 0.6rem 0.9rem;
  margin-bottom: 1rem;
}

.btn {
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  border-radius: 8px;
  padding: 0.45rem 0.9rem;
  font-size: 0.875rem;
  cursor: pointer;
}
.btn:hover:not(:disabled) { background: var(--surface-2); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
.btn.primary:hover:not(:disabled) { background: #1d4ed8; }
.btn.danger { color: #b91c1c; border-color: #fecaca; }
.btn.danger:hover:not(:disabled) { background: #fef2f2; }
.btn.small { padding: 0.3rem 0.7rem; font-size: 0.8rem; }

/* Slots */
.slots {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.slot-card {
  border: 1px dashed var(--line);
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
}
.slot-card.filled {
  border-style: solid;
  border-color: color-mix(in srgb, var(--accent-2) 45%, var(--line));
  background: color-mix(in srgb, var(--accent-2) 8%, var(--surface));
}

.slot-title { font-weight: 600; }
.slot-person { font-size: 1rem; }
.slot-voice-id {
  font-family: ui-monospace, monospace;
  font-size: 0.75rem;
  color: var(--muted);
}
.slot-empty { color: var(--faint); font-size: 0.875rem; }
.slot-select {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0.4rem 0.6rem;
  font-size: 0.875rem;
  background: var(--surface);
  color: var(--ink);
}

/* Members table */
.members-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.members-table th {
  text-align: left;
  color: var(--muted);
  font-weight: 500;
  padding: 0.5rem 0.6rem;
  border-bottom: 1px solid var(--line);
}
.members-table td {
  padding: 0.55rem 0.6rem;
  border-bottom: 1px solid var(--line);
}
.row-actions { text-align: right; }

.role-chip {
  display: inline-block;
  padding: 0.1rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  background: var(--surface-2);
  color: var(--ink);
}
.role-chip.admin { background: #ede9fe; color: #5b21b6; }
.role-chip.recorder { background: #ecfdf5; color: #047857; }

.slot-chip {
  display: inline-block;
  padding: 0.1rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  background: #dbeafe;
  color: #1e40af;
}

.muted { color: var(--faint); }

/* Invite */
.invite-card { border-color: color-mix(in srgb, var(--accent) 35%, var(--line)); }
.invite-result {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
}
.invite-row { display: flex; gap: 0.6rem; align-items: baseline; }
.invite-label { color: var(--muted); font-size: 0.8rem; width: 7.5rem; }
.invite-code {
  font-family: ui-monospace, monospace;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--ink);
  background: var(--surface-2);
  border-radius: 6px;
  padding: 0.2rem 0.6rem;
}
.invite-link {
  font-family: ui-monospace, monospace;
  font-size: 0.8rem;
  color: var(--ink);
  background: var(--surface-2);
  border-radius: 6px;
  padding: 0.2rem 0.6rem;
  word-break: break-all;
}

.consent-card { border-left: 4px solid #b45309; }
.consent-line {
  font-size: 1.05rem;
  line-height: 1.5;
  padding: 0.9rem 1rem;
  margin: 0.75rem 0;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 6px;
}
.consent-actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; margin: 0.75rem 0; }
.recording-dot { color: #b91c1c; font-weight: 600; }
.consent-heard { font-style: italic; color: #57534e; }
.consent-written { margin-top: 1rem; }
.consent-written summary { cursor: pointer; color: #57534e; }
.consent-tick { display: flex; gap: 0.5rem; align-items: flex-start; margin: 0.6rem 0; }
.consent-name { display: block; width: 100%; max-width: 26rem; padding: 0.5rem; margin-bottom: 0.6rem; }
</style>
