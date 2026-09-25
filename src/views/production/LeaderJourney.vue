<template>
  <div class="leader-journey">
    <!-- THREE DOORS FIRST (Tom and Aran, 2026-09-25): "a kind of simplification
         and a permission to be just doing that thing". Each card goes STRAIGHT
         to where that work is done; the pick is remembered, shown alone, and
         changed with one tap. The numbered steps below stay as the map. -->
    <section class="pick" aria-label="What do you want to do?" data-surface="journey-three-cards-2026-09-25">
      <div class="pick-head">
        <h2 class="journey-title">{{ pick && !choosing ? 'Carry on' : 'What do you want to do?' }}</h2>
        <button v-if="pick && !choosing" type="button" class="pick-change" @click="choosing = true">Change</button>
        <button v-else-if="pick && choosing" type="button" class="pick-change" @click="choosing = false">Keep {{ pickedCard.short }}</button>
      </div>
      <div class="pick-cards" :class="{ single: pick && !choosing }">
        <div
          v-for="card in visibleCards"
          :key="card.key"
          class="pick-card"
          :class="[card.key, { picked: card.key === pick }]"
        >
          <router-link :to="card.to" class="pick-main" :data-card="card.key" @click="choose(card.key)">
            <span class="pick-title">{{ card.title }}</span>
            <span class="pick-sub">{{ card.sub }}</span>
            <span class="pick-go">{{ card.action }} <span aria-hidden="true">&rarr;</span></span>
          </router-link>
          <router-link
            v-for="extra in card.extras"
            :key="extra.label"
            :to="extra.to"
            class="pick-extra"
            @click="choose(card.key)"
          >{{ extra.label }} <span aria-hidden="true">&rarr;</span></router-link>
        </div>
      </div>
    </section>

    <header class="journey-header">
      <h2 class="journey-title">Your course, step by step</h2>
      <p class="journey-intro">
        {{ pick && !showAllSteps
          ? `The steps for ${pickedCard.gerund}. Nothing here has to be done in order.`
          : 'The whole journey, from first translation to a published course. Each step shows where you are and takes you to the right place.' }}
      </p>
      <button v-if="pick" type="button" class="pick-change" @click="showAllSteps = !showAllSteps">
        {{ showAllSteps ? `Just the ${pickedCard.short} steps` : 'Show the whole journey' }}
      </button>
    </header>

    <ol class="journey-steps">
      <li
        v-for="step in shownSteps"
        :key="step.key"
        class="journey-step"
        :class="{ current: step.key === currentStepKey, done: step.state === 'done', na: step.state === 'na' }"
      >
        <div class="step-marker" :class="step.state">
          <span v-if="step.state === 'done'">&#10003;</span>
          <span v-else-if="step.state === 'na'">&ndash;</span>
          <span v-else>{{ step.num }}</span>
        </div>

        <div class="step-body">
          <div class="step-head">
            <h3 class="step-title">{{ step.title }}</h3>
            <span class="step-status" :class="step.state">{{ step.statusText }}</span>
          </div>
          <p class="step-blurb">{{ step.blurb }}</p>

          <!-- Voice slots (record step only) -->
          <ul v-if="step.key === 'record'" class="voice-slots">
            <li v-for="slot in voiceSlots" :key="slot.key" class="voice-slot">
              <span class="slot-name">{{ slot.label }}</span>
              <span class="slot-assignment" :class="{ unassigned: !slot.assigned }">{{ slot.text }}</span>
              <span v-if="slot.coverageText" class="slot-coverage">{{ slot.coverageText }}</span>
            </li>
          </ul>

          <div v-if="step.links.length" class="step-links">
            <router-link
              v-for="link in step.links"
              :key="link.label"
              :to="link.to"
              class="step-link"
              :class="{ primary: link.primary }"
            >
              {{ link.label }} <span aria-hidden="true">&rarr;</span>
            </router-link>
          </div>
        </div>
      </li>
    </ol>

    <p v-if="loadError" class="journey-note">
      Some progress numbers could not be loaded right now — the steps still work; refresh to retry.
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getApiUrl } from '@/services/api'
import { isConfigured as isSupabaseConfigured, getQASummary } from '@/services/supabase'
import { useProductionStore } from '@/stores/production'
import { useAuth } from '@/composables/useAuth'
import { readPick, writePick, JOURNEY_CARDS, stepsForPick } from './journeyPick.js'

const props = defineProps({
  courseCode: { type: String, required: true }
})

const router = useRouter()
const store = useProductionStore()
const { learner, isAdmin } = useAuth()
const apiBase = getApiUrl()
const headers = { 'ngrok-skip-browser-warning': 'true' }

// ---------------------------------------------------------------------------
// Live status data — the SAME data the existing pages read, no new state.
// stats:      /api/stats/:courseCode            (Text Generation / Overview)
// flags:      getQASummary | /api/qa/summary    (Overview)
// audio:      /api/production/:c/audio-stats    (production store / Overview)
// voices:     /api/courses/:c/voice-config      (Audio pipeline voice config)
// synthesis:  /api/production/:c/voice-engine/coverage (parallel build; 404 = not installed yet)
// publish:    store.courseInfo.status           (Overview status pills)
// ---------------------------------------------------------------------------
const stats = ref(null)        // { total_seeds, completed_seeds, seeds_with_legos, phrases }
const flaggedCount = ref(null) // number | null (unknown)
const audioStats = ref(null)   // { total, existing, missing }
const voiceConfig = ref(null)  // { voices: { target1, target2, known, presentation } }
const humanVoiceOnly = ref(false) // the course's standing no-TTS rule (server's answer)
const podDraftTotal = ref(0)      // pod lines still a machine draft nobody has read
const coverage = ref(null)     // synthesis-engine coverage payload (shape owned by the engine build)
const engineInstalled = ref(false)
const loadError = ref(false)

async function fetchJson(url) {
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

async function loadAll() {
  loadError.value = false

  store.loadCourseInfo(props.courseCode)

  const tasks = [
    fetchJson(`${apiBase}/api/stats/${props.courseCode}`)
      .then(d => { stats.value = d })
      .catch(() => { loadError.value = true }),

    (async () => {
      try {
        if (isSupabaseConfigured()) {
          const d = await getQASummary(props.courseCode)
          flaggedCount.value = d.flagged || 0
        } else {
          const d = await fetchJson(`${apiBase}/api/qa/summary/${props.courseCode}`)
          flaggedCount.value = d.flags?.total ?? d.flagged ?? 0
        }
      } catch { /* flags stay unknown */ }
    })(),

    fetchJson(`${apiBase}/api/production/${props.courseCode}/audio-stats`)
      .then(d => { audioStats.value = d })
      .catch(() => {}),

    fetchJson(`${apiBase}/api/courses/${props.courseCode}/voice-config`)
      .then(d => { voiceConfig.value = d.config || d; humanVoiceOnly.value = d.humanVoiceOnly === true })
      .catch(() => {}),

    fetchJson(`${apiBase}/api/production/${props.courseCode}/pods/drafts`)
      .then(d => { podDraftTotal.value = d.total || 0 })
      .catch(() => { podDraftTotal.value = 0 }),

    // The synthesis engine lands in a parallel build — a 404 here simply means
    // "not installed yet" and the step renders its coming-soon state.
    fetchJson(`${apiBase}/api/production/${props.courseCode}/voice-engine/coverage`)
      .then(d => { coverage.value = d; engineInstalled.value = true })
      .catch(() => { coverage.value = null; engineInstalled.value = false })
  ]

  await Promise.allSettled(tasks)
}

onMounted(loadAll)
watch(() => props.courseCode, loadAll)

// --- Derived progress -------------------------------------------------------
const totalSeeds = computed(() => stats.value?.total_seeds || 0)
const translatedSeeds = computed(() => stats.value?.completed_seeds || 0)
const decomposedSeeds = computed(() => stats.value?.seeds_with_legos || 0)
const phraseCount = computed(() => stats.value?.phrases || 0)

const translateDone = computed(() => totalSeeds.value > 0 && translatedSeeds.value >= totalSeeds.value)
const decomposeDone = computed(() => totalSeeds.value > 0 && decomposedSeeds.value >= totalSeeds.value)
const verifyDone = computed(() => decomposeDone.value && flaggedCount.value === 0)

const audioDone = computed(() => {
  const a = audioStats.value
  return !!a && a.total > 0 && a.existing >= a.total
})

const courseStatus = computed(() => {
  const s = store.courseInfo?.status || 'testing'
  if (s === 'draft') return 'testing'
  if (s === 'released') return 'live'
  return s
})

// --- Record room link: prefer the dedicated record room when it exists ------
// (the minimal recorder shell is landing in a parallel build; until its route
// is registered, this resolves to the catch-all and we use the in-console
// recorder instead)
const recordRoomTo = computed(() => {
  const target = `/record/${props.courseCode}`
  const resolved = router.resolve(target)
  const isCatchAll = resolved.matched.some(r => String(r.path).includes(':pathMatch'))
  return isCatchAll ? `/production/${props.courseCode}/recording` : target
})

// --- Voice slots (keystone: target1 + target2 are THE two voice slots) ------
function describeSlot(v) {
  if (!v || (!v.voiceId && !v.provider)) return { assigned: false, text: 'Not assigned yet' }
  if (v.provider === 'human') {
    return { assigned: true, text: `${v.name || v.voiceId || 'Human voice'} (a real person on your team)` }
  }
  if (v.voiceId) {
    return { assigned: true, text: `${v.name || v.voiceId} (computer voice)` }
  }
  return { assigned: false, text: 'Not assigned yet' }
}

// Per-slot recording coverage from the synthesis engine: GET .../voice-engine/coverage
// ships { slots: [{ role, needed, covered, recordedTakes, spliced, missing, ... }] }.
function slotCoverage(slotKey) {
  const c = coverage.value
  if (!c) return null
  let v = null
  if (Array.isArray(c.slots)) v = c.slots.find(x => x.role === slotKey || x.slot === slotKey)
  else if (c.slots) v = c.slots[slotKey]
  if (!v && c.voices && !Array.isArray(c.voices)) v = c.voices[slotKey]
  if (!v) return null
  const done = v.covered ?? v.recorded ?? v.existing ?? null
  const total = v.needed ?? v.required ?? v.total ?? null
  if (typeof done !== 'number' || typeof total !== 'number' || total === 0) return null
  return `${done} of ${total} recordings`
}

const voiceSlots = computed(() => {
  const voices = voiceConfig.value?.voices || {}
  return ['target1', 'target2'].map((key, i) => {
    const d = describeSlot(voices[key])
    return {
      key,
      label: `Voice ${i + 1}`,
      assigned: d.assigned,
      text: d.text,
      coverageText: slotCoverage(key)
    }
  })
})

const humanSlotCount = computed(() =>
  ['target1', 'target2'].filter(k => voiceConfig.value?.voices?.[k]?.provider === 'human').length
)

// A HUMAN-VOICE COURSE: the standing no-TTS rule names it, or both of its
// voices are real people. Read from the voice data the page already loads —
// no new flag. Its computer-voice step is greyed out, with the reason said.
const isHumanVoiceCourse = computed(() => humanVoiceOnly.value || humanSlotCount.value >= 2)

// --- The three cards --------------------------------------------------------
// The caller's own voice on THIS course, from the casting the server attached
// to their identity (/api/auth/me). With one, "record" opens their booth; with
// none, it opens the cast, where they name a voice — theirs or anyone's.
const myVoiceId = computed(() => {
  const casting = learner.value?.casting
  const mine = Array.isArray(casting) ? casting.find(c => c && c.courseCode === props.courseCode && c.voiceId) : null
  return mine ? mine.voiceId : null
})
const castTo = computed(() => ({ path: `/production/${props.courseCode}/pods`, query: { cast: '1' } }))

const cards = computed(() => {
  const code = props.courseCode
  const record = myVoiceId.value
    ? {
        to: { name: 'RecordistRoom', params: { voiceId: myVoiceId.value }, query: { course: code } },
        sub: 'Your booth: the lines waiting on your voice, one at a time.',
        action: 'Open my booth',
        extras: [{ label: 'Ask someone else to record', to: castTo.value }],
      }
    : {
        to: castTo.value,
        sub: 'Name a voice — yours or someone else’s — add their email, and send them the link to their booth.',
        action: 'Set up the voices',
        extras: [],
      }
  return JOURNEY_CARDS.map(c => {
    if (c.key === 'record') return { ...c, ...record }
    if (c.key === 'proofread') {
      return {
        ...c,
        to: { name: 'ScriptViewer', params: { courseCode: code }, query: { view: 'journey' } },
        sub: 'Read the course in the order a learner meets it, and fix anything that reads wrong.',
        action: 'Start reading',
        extras: podDraftTotal.value > 0
          ? [{ label: `${podDraftTotal.value} pod line${podDraftTotal.value === 1 ? '' : 's'} nobody has read yet`, to: { path: `/production/${code}/pods`, query: { drafts: '1' } } }]
          : [],
      }
    }
    return {
      ...c,
      to: `/production/${code}/text`,
      sub: 'Translate the sentences and break them into the building blocks the course teaches with.',
      action: 'Open the builder',
      extras: [],
    }
  })
})

// The pick: remembered per login (journeyPick.js says where and why), shown
// alone once made, changed with one tap.
const pick = ref(null)
const choosing = ref(false)
const showAllSteps = ref(false)
const pickEmail = computed(() => learner.value?.email || '')
watch(pickEmail, (email) => { pick.value = readPick(email) }, { immediate: true })
function choose(key) {
  pick.value = key
  choosing.value = false
  writePick(pickEmail.value, key)
}
const pickedCard = computed(() => JOURNEY_CARDS.find(c => c.key === pick.value) || JOURNEY_CARDS[0])
const visibleCards = computed(() =>
  pick.value && !choosing.value ? cards.value.filter(c => c.key === pick.value) : cards.value)

// --- Synthesis coverage roll-up ----------------------------------------------
// Target slots from the engine's per-slot array (prefer the human-assigned
// ones — those are the voices the leader's team records). Shared by the
// synthesize summary AND the record/synthesize done-states.
const synthCoverageTotals = computed(() => {
  const c = coverage.value
  if (!c || !Array.isArray(c.slots)) return null
  const targets = c.slots.filter(s => s.role === 'target1' || s.role === 'target2')
  if (!targets.length) return null
  const pool = targets.some(s => s.isHuman) ? targets.filter(s => s.isHuman) : targets
  return {
    done: pool.reduce((n, s) => n + (s.covered ?? 0), 0),
    total: pool.reduce((n, s) => n + (s.needed ?? 0), 0),
  }
})

const synthCoverageComplete = computed(() => {
  const t = synthCoverageTotals.value
  return !!t && t.total > 0 && t.done >= t.total
})

const synthSummary = computed(() => {
  const c = coverage.value
  if (!c) return null
  const t = synthCoverageTotals.value
  if (t && t.total > 0) return `${t.done} of ${t.total} phrases covered`
  if (typeof c.percent === 'number') return `${c.percent}% of phrases have stitched audio`
  return 'Stitching engine connected'
})

// Step done-states: without these, currentStepKey could never advance past
// the record step — record gets its checkmark once both voices are real
// people AND their audio is fully covered; synthesize once coverage is full.
const recordDone = computed(() => humanSlotCount.value >= 2 && synthCoverageComplete.value)
const synthDone = computed(() => engineInstalled.value && synthCoverageComplete.value)

// --- The steps ---------------------------------------------------------------
const steps = computed(() => {
  const code = props.courseCode

  const translate = {
    key: 'translate', num: 1,
    title: 'Translate the course',
    blurb: 'Every sentence in the course gets a version in both of your languages. An assistant does the first draft; you correct anything it gets wrong.',
    state: translateDone.value ? 'done' : (translatedSeeds.value > 0 ? 'active' : 'todo'),
    statusText: totalSeeds.value
      ? `${translatedSeeds.value} of ${totalSeeds.value} sentences translated`
      : 'Not started',
    links: [
      { label: 'Open translation', to: `/production/${code}/text`, primary: true },
      { label: 'Review side by side', to: `/production/${code}/seeds` }
    ]
  }

  const decompose = {
    key: 'decompose', num: 2,
    title: 'Break it into building blocks',
    blurb: 'Each sentence is split into small reusable pieces, with practice phrases for every piece — this is what makes the course teach, not just list sentences.',
    state: decomposeDone.value ? 'done' : (decomposedSeeds.value > 0 ? 'active' : 'todo'),
    statusText: totalSeeds.value
      ? `${decomposedSeeds.value} of ${totalSeeds.value} sentences processed` +
        (phraseCount.value ? ` · ${phraseCount.value.toLocaleString()} practice phrases` : '')
      : 'Waiting for translations',
    links: [
      { label: 'Open the builder', to: `/production/${code}/text`, primary: true }
    ]
  }

  const verify = {
    key: 'verify', num: 3,
    title: 'Check the text',
    blurb: 'Read through the phrases and fix anything that sounds unnatural — it is much cheaper to fix words now than recordings later.',
    state: verifyDone.value
      ? 'done'
      : (flaggedCount.value > 0 ? 'attention' : (decomposeDone.value ? 'active' : 'todo')),
    statusText: flaggedCount.value === null
      ? 'Checks not run yet'
      : (flaggedCount.value > 0 ? `${flaggedCount.value} items need a look` : 'No open issues'),
    links: [
      { label: 'Review issues', to: `/production/${code}/phrase-qa`, primary: true },
      { label: 'Read the course in order', to: { name: 'ScriptViewer', params: { courseCode: code }, query: { view: 'journey' } } }
    ]
  }

  const record = {
    key: 'record', num: 4,
    title: 'Record the voices',
    blurb: 'Your course needs two different voices. Each voice reads one short script aloud — about half an hour of reading covers the whole course.',
    state: recordDone.value ? 'done' : (humanSlotCount.value >= 2 || verifyDone.value ? 'active' : 'todo'),
    statusText: humanSlotCount.value > 0
      ? `${humanSlotCount.value} of 2 voices set to a real person`
      : 'No human voices assigned yet',
    links: [
      { label: 'Open the recording room', to: recordRoomTo.value, primary: true },
      { label: 'Manage your team & voices', to: `/production/${code}/team` },
      { label: 'See the reading plan', to: `/production/${code}/recording-optimizer` }
    ]
  }

  const synthesize = isHumanVoiceCourse.value
    ? {
        // GREYED OUT FOR A HUMAN-VOICE COURSE (Tom, 2026-09-25: the "build the
        // full audio" step "could be grayed out"). Said plainly, not hidden.
        key: 'synthesize', num: 5,
        title: 'Build the full audio',
        blurb: 'Not needed for this course: it is recorded by people, so there is no computer voice to build.',
        state: 'na',
        statusText: 'Not needed — people record this course',
        links: []
      }
    : {
        key: 'synthesize', num: 5,
        title: 'Build the full audio',
        blurb: 'Your recordings are stitched together so every practice phrase is heard in your team’s voices — nobody has to read thousands of lines.',
        state: synthDone.value ? 'done' : (engineInstalled.value ? 'active' : 'pending'),
        statusText: engineInstalled.value
          ? (synthSummary.value || 'Ready')
          : 'Waiting for recordings',
        links: [
          { label: 'Open the stitching studio', to: `/production/${code}/synthesis`, primary: true }
        ]
      }

  const qa = {
    key: 'qa', num: 6,
    title: 'Listen and fix',
    blurb: 'Play the course exactly as a learner will hear it, and flag anything that needs another take.',
    state: audioDone.value ? 'done' : (audioStats.value?.existing > 0 ? 'active' : 'todo'),
    statusText: audioStats.value?.total
      ? `${(audioStats.value.existing || 0).toLocaleString()} of ${audioStats.value.total.toLocaleString()} audio clips in place`
      : 'No audio yet',
    links: [
      { label: 'Listen to the course', to: { name: 'ScriptViewer', params: { courseCode: code }, query: { view: 'journey' } }, primary: true }
    ]
  }

  const publish = {
    key: 'publish', num: 7,
    title: 'Publish',
    blurb: 'When it sounds right, switch the course on so your learners can start.',
    state: courseStatus.value === 'live' ? 'done' : (courseStatus.value === 'beta' ? 'active' : 'todo'),
    statusText: courseStatus.value === 'live'
      ? 'Live — learners can use it'
      : (courseStatus.value === 'beta' ? 'In beta — open to testers' : 'Not published yet'),
    // Community builders never go via the overview (Tom, 2026-09-25), and
    // community courses have no settings to open — so the link is admins' only.
    links: isAdmin.value
      ? [{ label: 'Open course settings', to: `/production/${code}`, primary: true }]
      : []
  }

  return [translate, decompose, verify, record, synthesize, qa, publish]
})

const shownSteps = computed(() => {
  if (!pick.value || showAllSteps.value) return steps.value
  const keys = stepsForPick(pick.value)
  return steps.value.filter(s => keys.includes(s.key))
})

// The first step that still needs attention (skipping the not-yet-installed
// synthesis engine, and a step this course does not need, so neither blocks
// the highlight).
const currentStepKey = computed(() => {
  const next = shownSteps.value.find(s => s.state !== 'done' && s.state !== 'pending' && s.state !== 'na')
  return next ? next.key : null
})
</script>

<style scoped>
.leader-journey {
  padding: 1.5rem;
  max-width: 880px;
}

.journey-header { margin-bottom: 1.75rem; }

.journey-title {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--color-paper, var(--ink));
  margin: 0 0 0.4rem;
}

.journey-intro {
  font-size: 0.9rem;
  color: var(--color-paper-dim, var(--muted));
  margin: 0;
  max-width: 60ch;
}

.journey-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.journey-step {
  display: flex;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: var(--color-shadow, var(--surface));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 10px;
  transition: border-color 0.15s;
}
/* Light mode: white cards on a near-white canvas need a stronger edge to
   separate. Promote the border to --line and add a subtle shadow.
   Scoped to light so the dark card edge is untouched. */
:root[data-theme="light"] .journey-step {
  border-color: var(--line);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
}
.journey-step.current { border-color: var(--color-emerald, #06ffa5); }
.journey-step.done { opacity: 0.75; }

.step-marker {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.85rem;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 0.1rem;
  border: 1px solid var(--color-graphite, var(--surface-3));
  color: var(--color-paper-dim, var(--muted));
}
.step-marker.done { background: rgba(52, 211, 153, 0.15); border-color: var(--accent-2); color: var(--accent-2); }
.step-marker.active { border-color: var(--color-emerald, #06ffa5); color: var(--color-emerald, #06ffa5); }
.step-marker.attention { border-color: #fb7185; color: #fb7185; }
.step-marker.pending { border-style: dashed; }
/* Light: faint marker ring + too-light rose; darken for legibility. */
:root[data-theme="light"] .step-marker { border-color: var(--line); }
:root[data-theme="light"] .step-marker.attention { border-color: #e11d48; color: #e11d48; }

.step-body { flex: 1; min-width: 0; }

.step-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.step-title {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-paper, var(--ink));
  margin: 0;
}

.step-status {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.72rem;
  color: var(--color-paper-dim, var(--muted));
  white-space: nowrap;
}
.step-status.done { color: var(--accent-2); }
.step-status.attention { color: #fb7185; }
.step-status.pending { font-style: italic; }
:root[data-theme="light"] .step-status.attention { color: #be123c; }

.step-blurb {
  font-size: 0.84rem;
  color: var(--color-paper-dim, var(--muted));
  margin: 0.35rem 0 0;
  max-width: 64ch;
}

.voice-slots {
  list-style: none;
  margin: 0.6rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.voice-slot {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  font-size: 0.8rem;
}

.slot-name {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.72rem;
  color: var(--color-paper, var(--ink));
  background: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  padding: 0.1rem 0.45rem;
  white-space: nowrap;
}
/* Light: a white-tint chip is invisible on a white card — use a real surface. */
:root[data-theme="light"] .slot-name {
  background: var(--surface-2);
  border: 1px solid var(--line);
}

.slot-assignment { color: var(--color-paper-dim, var(--muted)); }
.slot-assignment.unassigned { color: #fbbf24; }
/* Light: amber #fbbf24 is ~1.5:1 on white — unreadable. Darken the warning. */
:root[data-theme="light"] .slot-assignment.unassigned { color: #b45309; }

.slot-coverage {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.72rem;
  color: var(--accent-2);
}

.step-links {
  display: flex;
  gap: 1rem;
  margin-top: 0.6rem;
  flex-wrap: wrap;
}

.step-link {
  font-size: 0.8rem;
  color: var(--color-paper-dim, var(--muted));
  text-decoration: none;
  border-bottom: 1px solid transparent;
}
.step-link:hover { color: var(--color-paper, var(--ink)); }
.step-link.primary { color: var(--color-emerald, #06ffa5); }
.step-link.primary:hover { border-bottom-color: var(--color-emerald, #06ffa5); }

.journey-note {
  margin-top: 1rem;
  font-size: 0.78rem;
  color: #fbbf24;
}
:root[data-theme="light"] .journey-note { color: #b45309; }

/* ── The three cards ─────────────────────────────────────────────────── */
.pick { margin-bottom: 2rem; }
.pick-head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin-bottom: 0.75rem; }
.pick-change {
  background: none;
  border: 1px solid var(--color-graphite, var(--line));
  border-radius: 999px;
  color: var(--color-paper, var(--ink));
  font-size: 0.8rem;
  padding: 0.35rem 0.9rem;
  min-height: 36px;
  cursor: pointer;
}
.journey-header .pick-change { margin-top: 0.6rem; }
.pick-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; }
.pick-cards.single { grid-template-columns: minmax(0, 1fr); }
.pick-card {
  display: flex;
  flex-direction: column;
  background: var(--color-shadow, var(--surface));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 12px;
  overflow: hidden;
}
.pick-card.picked { border-color: var(--color-emerald, #06ffa5); }
:root[data-theme="light"] .pick-card { border-color: var(--line); box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06); }
:root[data-theme="light"] .pick-card.picked { border-color: #059669; }
.pick-main {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 1.1rem 1.2rem;
  text-decoration: none;
  flex: 1;
  min-height: 48px;
}
.pick-title {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-paper, var(--ink));
}
.pick-sub { font-size: 0.84rem; color: var(--color-paper-dim, var(--muted)); }
.pick-go { font-size: 0.85rem; color: var(--color-emerald, #06ffa5); margin-top: auto; padding-top: 0.3rem; }
:root[data-theme="light"] .pick-go { color: #047857; }
.pick-extra {
  font-size: 0.8rem;
  padding: 0.7rem 1.2rem;
  border-top: 1px solid var(--color-graphite, var(--line));
  color: var(--color-paper-dim, var(--muted));
  text-decoration: none;
}
.pick-extra:hover, .pick-main:hover .pick-title { color: var(--color-paper, var(--ink)); }

.journey-step.na { opacity: 0.5; }
.step-marker.na { border-style: dashed; }
.step-status.na { font-style: italic; }

@media (max-width: 640px) {
  .pick-cards { grid-template-columns: minmax(0, 1fr); }
  .step-head { flex-direction: column; gap: 0.2rem; }
  .step-status { white-space: normal; }
}
</style>
