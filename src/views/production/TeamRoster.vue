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
  if (!resp.ok) throw new Error(data.error || `Request failed (${resp.status})`)
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
    await loadTeam()
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
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
</style>
