<template>
  <div class="record-room">
    <!-- Room header — deliberately minimal: this is a room, not a console -->
    <header class="room-header">
      <div class="room-title">
        <h1>Record Room</h1>
        <p v-if="courseCode" class="room-course">{{ courseDisplayName }}</p>
      </div>
      <div class="room-user">
        <span class="user-name">{{ userName }}</span>
        <button class="btn-signout" @click="handleSignOut">Sign out</button>
      </div>
    </header>

    <!-- No course linked yet -->
    <section v-if="!courseCode" class="room-card center">
      <h2>You're not linked to a course yet</h2>
      <p>
        Ask your course leader to add you to their course, then use the link they send you.
      </p>
    </section>

    <template v-else>
      <!-- Loading -->
      <section v-if="loading" class="room-card center">
        <div class="room-spinner"></div>
        <p>Getting your room ready...</p>
      </section>

      <template v-else>
        <!-- Status strip: voice part + reading progress -->
        <div class="room-strip">
          <div class="room-card slot-card">
            <span class="card-label">Your voice part</span>
            <template v-if="assignedSlot">
              <span class="card-value slot-assigned">{{ slotDisplayName }}</span>
              <span class="card-hint">Everything you record is saved under this voice.</span>
            </template>
            <template v-else>
              <span class="card-value slot-missing">Not yet assigned</span>
              <span class="card-hint">
                Your course leader hasn't given you a voice part yet.
                Ask them to assign you, then refresh this page.
              </span>
            </template>
          </div>

          <div class="room-card progress-card">
            <span class="card-label">Your reading</span>
            <template v-if="scriptTotal !== null">
              <span class="card-value">
                {{ sessionRecordedCount }} <span class="value-dim">of {{ scriptTotal }} read</span>
              </span>
              <span class="card-hint">
                About {{ scriptMinutes }} minutes of reading in total
                <template v-if="sessionUploadedCount > 0"> · {{ sessionUploadedCount }} saved</template>
              </span>
            </template>
            <template v-else-if="scriptError">
              <span class="card-value slot-missing">Not ready yet</span>
              <span class="card-hint">{{ scriptError }}</span>
            </template>
            <template v-else>
              <span class="card-value value-dim">—</span>
            </template>
          </div>
        </div>

        <!-- The recorder itself -->
        <section v-if="assignedSlot" class="room-studio">
          <AutocueStudio :record-slot="assignedSlot" :voice-id="myVoiceId" />
        </section>

        <!-- Not assigned: recorders wait; editors/admins get a way through -->
        <section v-else class="room-card center">
          <h2>Nothing to read just yet</h2>
          <p>As soon as you have a voice part, your reading script will appear here.</p>
          <router-link
            v-if="!isRecorder"
            :to="`/production/${courseCode}/recording`"
            class="room-link"
          >
            Open the full recording studio instead
          </router-link>
        </section>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCourses } from '@/composables/useCourses'
import { useAutocueState } from '@/composables/useAutocueState'
import { useUploadQueue } from '@/composables/useAudioUpload'
import { getApiUrl } from '@/services/api'
import AutocueStudio from '@/components/production/autocue/AutocueStudio.vue'

const props = defineProps({
  courseCode: { type: String, default: null }
})

const router = useRouter()
const { learner, isRecorder, logout } = useAuth()
const { getCourseName } = useCourses()

// Live session counters (shared singletons with the embedded studio)
const { recordedCount: sessionRecordedCount } = useAutocueState()
const { uploadedCount: sessionUploadedCount } = useUploadQueue()

const loading = ref(true)
const courseInfo = ref(null)
const voiceConfig = ref(null)
const scriptTotal = ref(null)
const scriptMinutes = ref(null)
const scriptError = ref(null)

const userName = computed(() => learner.value?.name || learner.value?.email || '')

// /api/production/:c/info returns camelCase (targetLang/knownLang); older
// payload shapes used snake_case — accept both.
const targetLangName = computed(() => courseInfo.value?.targetLang || courseInfo.value?.target_lang || null)
const knownLangName = computed(() => courseInfo.value?.knownLang || courseInfo.value?.known_lang || null)

const courseDisplayName = computed(() => {
  if (!props.courseCode) return ''
  const name = getCourseName(props.courseCode)
  if (name && name !== props.courseCode) return name
  const c = courseInfo.value
  if (c?.displayName) return c.displayName
  if (targetLangName.value && knownLangName.value) {
    return `${targetLangName.value} for ${knownLangName.value} speakers`
  }
  return props.courseCode
})

// Which voice slot (target1 / target2 / known / presentation) is mine?
// Canonical mapping lives in courses.voice_config: voices.<slot>.assignedEmail
// is THIS course's record of who holds the slot. dashboard_users.voice_id is
// only a mirror of the person's LATEST mint (a recorder assigned on a second
// course gets re-minted there), so it is the fallback, not the primary match.
const assignedSlot = computed(() => {
  const voices = voiceConfig.value?.voices
  if (!voices) return null
  const myEmail = learner.value?.email || null
  for (const slot of ['target1', 'target2', 'known', 'presentation']) {
    const v = voices[slot]
    if (!v?.voiceId) continue
    if (myEmail && v.assignedEmail && v.assignedEmail === myEmail) return slot
    if (!v.assignedEmail && learner.value?.voice_id && v.voiceId === learner.value.voice_id) return slot
  }
  return null
})

// The voice id everything I record is saved under: the SLOT's voiceId for
// THIS course (per-course canonical), not my latest cross-course mint.
const myVoiceId = computed(() => {
  const slot = assignedSlot.value
  const slotVoiceId = slot ? voiceConfig.value?.voices?.[slot]?.voiceId : null
  return slotVoiceId || learner.value?.voice_id || null
})

// Jargon-free names for the voice slots
const slotDisplayName = computed(() => {
  const target = targetLangName.value || 'Course'
  const known = knownLangName.value || 'Guide'
  switch (assignedSlot.value) {
    case 'target1': return `${target} — Voice 1`
    case 'target2': return `${target} — Voice 2`
    case 'known': return `${known} voice`
    case 'presentation': return 'Presenter voice'
    default: return ''
  }
})

function apiBase() {
  return localStorage.getItem('api_base_url') || getApiUrl()
}

const FETCH_HEADERS = { 'ngrok-skip-browser-warning': 'true' }

async function loadRoom() {
  if (!props.courseCode) {
    loading.value = false
    return
  }
  loading.value = true
  const base = apiBase()

  // Course info (name + languages)
  try {
    const res = await fetch(`${base}/api/production/${props.courseCode}/info`, { headers: FETCH_HEADERS })
    if (res.ok) {
      const data = await res.json()
      courseInfo.value = data.course || data
    }
  } catch { /* non-fatal — fall back to course code */ }

  // Voice slots for this course
  try {
    const res = await fetch(`${base}/api/courses/${props.courseCode}/voice-config`, { headers: FETCH_HEADERS })
    if (res.ok) {
      const data = await res.json()
      voiceConfig.value = data.config || null
    }
  } catch { /* non-fatal — shows "not yet assigned" */ }

  loading.value = false

  // Reading script totals (slower — loads after the room renders)
  try {
    const res = await fetch(`${base}/api/production/${props.courseCode}/recording-script`, { headers: FETCH_HEADERS })
    if (res.ok) {
      const data = await res.json()
      scriptTotal.value = data.totalItems ?? null
      scriptMinutes.value = data.estimatedMinutes ?? null
    } else {
      scriptError.value = 'Your reading script is still being prepared.'
    }
  } catch {
    scriptError.value = 'Could not load your reading script. Check your connection and refresh.'
  }
}

async function handleSignOut() {
  await logout()
  router.push({ name: 'Login' })
}

onMounted(loadRoom)
</script>

<style scoped>
.record-room {
  min-height: 100vh;
  background: var(--color-void, #0f172a);
  color: var(--color-paper, #f7f7f2);
  padding: 1.5rem 2rem;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1.25rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-graphite, #475569);
}

.room-title h1 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.room-course {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.875rem;
  color: var(--color-paper-dim, #c1c1bb);
  margin: 0.25rem 0 0;
}

.room-user {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-name {
  font-size: 0.875rem;
  color: var(--color-paper-dim, #c1c1bb);
}

.btn-signout {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.8125rem;
  color: var(--color-paper-dim, #c1c1bb);
  background: transparent;
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 6px;
  padding: 0.4rem 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-signout:hover {
  color: var(--color-paper, #f7f7f2);
  border-color: var(--color-paper-dim, #c1c1bb);
}

.room-strip {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.room-card {
  background: var(--color-shadow, #1e293b);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
}

.room-card.center {
  text-align: center;
  padding: 3rem 2rem;
  max-width: 560px;
  margin: 3rem auto 0;
}

.room-card.center h2 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.25rem;
  margin: 0 0 0.75rem;
}

.room-card.center p {
  color: var(--color-paper-dim, #c1c1bb);
  font-size: 0.9rem;
  line-height: 1.6;
  margin: 0;
}

.card-label {
  display: block;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-paper-dim, #c1c1bb);
  margin-bottom: 0.5rem;
}

.card-value {
  display: block;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 1.35rem;
  font-weight: 600;
}

.slot-assigned {
  color: var(--color-emerald, #06ffa5);
}

.slot-missing {
  color: var(--color-tungsten, #ffa630);
}

.value-dim {
  color: var(--color-paper-dim, #c1c1bb);
  font-weight: 400;
  font-size: 1rem;
}

.card-hint {
  display: block;
  font-size: 0.8rem;
  color: var(--color-paper-dim, #c1c1bb);
  margin-top: 0.5rem;
  line-height: 1.5;
}

.room-spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 1rem;
  border: 3px solid var(--color-graphite, #475569);
  border-top-color: var(--color-tungsten, #ffa630);
  border-radius: 50%;
  animation: room-spin 1s linear infinite;
}

@keyframes room-spin {
  to { transform: rotate(360deg); }
}

.room-link {
  display: inline-block;
  margin-top: 1.25rem;
  color: var(--color-emerald, #06ffa5);
  font-size: 0.875rem;
  text-decoration: none;
}

.room-link:hover {
  text-decoration: underline;
}

/* The embedded studio brings its own full-bleed styling */
.room-studio {
  margin: 0 -2rem -1.5rem;
}

@media (max-width: 720px) {
  .record-room {
    padding: 1rem;
  }

  .room-strip {
    grid-template-columns: 1fr;
  }

  .room-studio {
    margin: 0 -1rem -1rem;
  }
}
</style>
