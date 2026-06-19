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

    <!-- Several rooms (recording for more than one course) — pick one -->
    <section v-if="!courseCode && myRooms.length > 1" class="room-card">
      <h2>Your recording rooms</h2>
      <p>You're recording for more than one course — pick a room:</p>
      <nav class="room-list">
        <router-link
          v-for="code in myRooms"
          :key="code"
          :to="`/record/${code}`"
          class="room-list-item"
        >
          <span class="room-list-name">{{ getCourseName(code) || code }}</span>
          <span class="room-list-arrow" aria-hidden="true">&rarr;</span>
        </router-link>
      </nav>
    </section>

    <!-- No course linked yet -->
    <section v-else-if="!courseCode" class="room-card center">
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
        <!-- Mode switch: script reading vs dialogue recording (only when both exist) -->
        <div v-if="dialogueAvailable && assignedSlot" class="room-mode-switch">
          <button
            class="mode-tab"
            :class="{ active: roomMode === 'script' }"
            @click="modeOverride = 'script'"
          >Reading script</button>
          <button
            class="mode-tab"
            :class="{ active: roomMode === 'dialogue' }"
            @click="modeOverride = 'dialogue'"
          >Dialogue lines</button>
        </div>

        <!-- ── DIALOGUE MODE: pod lines on the cue, per-voice queue ── -->
        <template v-if="roomMode === 'dialogue'">
          <div class="room-strip">
            <div class="room-card slot-card">
              <span class="card-label">Your dialogue part</span>
              <template v-if="myCharacters.length > 0">
                <span class="card-value slot-assigned">{{ myCharacters.join(', ') }}</span>
                <span class="card-hint">Every line you record is saved under your voice.</span>
              </template>
              <template v-else>
                <span class="card-value slot-assigned">Dialogue voice</span>
                <span class="card-hint">Recording as {{ podVoiceId }}</span>
              </template>
            </div>
            <div class="room-card progress-card">
              <span class="card-label">Your lines</span>
              <template v-if="dialogueProgress">
                <span class="card-value">
                  {{ dialogueProgress.recorded }} <span class="value-dim">of {{ dialogueProgress.total }} recorded</span>
                </span>
                <span class="card-hint">Lines already recorded are skipped — you can stop and pick up any time.</span>
              </template>
              <template v-else>
                <span class="card-value value-dim">—</span>
              </template>
            </div>
          </div>

          <section class="room-studio">
            <PodLongTakeStudio
              :course-code="courseCode"
              :voice-id="podVoiceId"
              @progress="dialogueProgress = $event"
            />
          </section>
        </template>

        <!-- ── SCRIPT MODE: the existing reading-script room, untouched ── -->
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
          <p v-if="dialogueAvailable" class="card-hint dialogue-nudge">
            You do have dialogue lines to record —
            <a href="#" @click.prevent="modeOverride = 'dialogue'">switch to dialogue mode</a>.
          </p>
        </section>
        </template>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useCourses } from '@/composables/useCourses'
import { useAutocueState } from '@/composables/useAutocueState'
import { useUploadQueue } from '@/composables/useAudioUpload'
import { getApiUrl } from '@/services/api'
import AutocueStudio from '@/components/production/autocue/AutocueStudio.vue'
// Dialogue mode uses the long-take recorder: one continuous lossless take,
// tap-to-advance autocue, sliced per line into the proven upload pipeline.
import PodLongTakeStudio from '@/components/production/autocue/PodLongTakeStudio.vue'

const props = defineProps({
  courseCode: { type: String, default: null }
})

const router = useRouter()
const route = useRoute()
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

// Rooms this person records in: their explicit course list (admins/editors
// hold '*' which isn't enumerable — they arrive via per-course links anyway).
const myRooms = computed(() => {
  const c = learner.value?.courses
  return Array.isArray(c) ? c : []
})

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

// ── Dialogue (pod) recording mode ────────────────────────────────────────────
// Activated by ?podVoice=<voiceId> (leader-sent link) or automatically when
// courses.voice_config.podCast — the additive cast map written by the casting
// build: { "<speakerName>": { voiceId, name, email } } — has an entry for
// this user's email. Keystone: pods-recording-model.md §1/§3.

// Characters in the cast that belong to me (by email)
const myPodCastEntries = computed(() => {
  const cast = voiceConfig.value?.podCast
  if (!cast || typeof cast !== 'object') return []
  const myEmail = learner.value?.email || null
  if (!myEmail) return []
  return Object.entries(cast)
    .filter(([, v]) => v && v.email === myEmail && v.voiceId)
    .map(([speaker, v]) => ({ speaker, voiceId: v.voiceId, name: v.name || null }))
})

// The voice the dialogue session records under: explicit query wins
// (works even before the cast carries emails); otherwise my cast entry.
const podVoiceId = computed(() => {
  const q = route.query.podVoice
  if (typeof q === 'string' && q.trim()) return q.trim()
  return myPodCastEntries.value[0]?.voiceId || null
})

const dialogueAvailable = computed(() => Boolean(podVoiceId.value))

// Character names this voice plays (explainer cast entry shown in plain words)
const myCharacters = computed(() => {
  const mine = myPodCastEntries.value.filter(e => !podVoiceId.value || e.voiceId === podVoiceId.value)
  return mine.map(e => (e.speaker === '__explainer__' ? 'Explainer voice' : e.speaker))
})

// Mode: explicit user toggle wins; otherwise a podVoice link opens dialogue,
// a script slot opens the reading script, and a cast-only recorder lands in dialogue.
const modeOverride = ref(null)
const roomMode = computed(() => {
  if (modeOverride.value === 'dialogue' && dialogueAvailable.value) return 'dialogue'
  if (modeOverride.value === 'script') return 'script'
  if (typeof route.query.podVoice === 'string' && route.query.podVoice) return 'dialogue'
  if (assignedSlot.value) return 'script'
  return dialogueAvailable.value ? 'dialogue' : 'script'
})

// Live { recorded, total } emitted by the dialogue studio for the status strip
const dialogueProgress = ref(null)

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
  background: var(--color-void, var(--canvas));
  color: var(--color-paper, var(--ink));
  padding: 1.5rem 2rem;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1.25rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--line);
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
  color: var(--color-paper-dim, var(--muted));
  margin: 0.25rem 0 0;
}

.room-user {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-name {
  font-size: 0.875rem;
  color: var(--color-paper-dim, var(--muted));
}

.btn-signout {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.8125rem;
  color: var(--color-paper-dim, var(--muted));
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 0.4rem 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-signout:hover {
  color: var(--color-paper, var(--ink));
  border-color: var(--color-paper-dim, var(--muted));
}

.room-mode-switch {
  display: inline-flex;
  gap: 0;
  margin-bottom: 1.25rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
}

.mode-tab {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--color-paper-dim, var(--muted));
  background: transparent;
  border: none;
  padding: 0.65rem 1.25rem;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s ease;
}

.mode-tab + .mode-tab {
  border-left: 1px solid var(--line);
}

.mode-tab.active {
  color: var(--color-void, var(--canvas));
  background: var(--color-emerald, #06ffa5);
}

.dialogue-nudge {
  margin-top: 1rem;
}

.dialogue-nudge a {
  color: var(--color-emerald, #06ffa5);
}

.room-strip {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.room-card {
  background: var(--color-shadow, var(--surface));
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
}

/* Light mode: white cards on a slate canvas need a touch of shadow to lift */
:root[data-theme="light"] .room-card {
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.08);
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
  color: var(--color-paper-dim, var(--muted));
  font-size: 0.9rem;
  line-height: 1.6;
  margin: 0;
}

.card-label {
  display: block;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-paper-dim, var(--muted));
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
  color: var(--color-tungsten, var(--accent));
}

.value-dim {
  color: var(--color-paper-dim, var(--muted));
  font-weight: 400;
  font-size: 1rem;
}

.card-hint {
  display: block;
  font-size: 0.8rem;
  color: var(--color-paper-dim, var(--muted));
  margin-top: 0.5rem;
  line-height: 1.5;
}

.room-spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 1rem;
  border: 3px solid var(--line);
  border-top-color: var(--color-tungsten, var(--accent));
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
.room-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 1rem;
}

.room-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1.1rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  color: var(--color-paper, var(--ink));
  text-decoration: none;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.room-list-item:hover {
  border-color: var(--color-tungsten, var(--accent));
  transform: translateY(-1px);
}

.room-list-name {
  font-weight: 600;
}

.room-list-arrow {
  color: var(--color-tungsten, var(--accent));
}
</style>
