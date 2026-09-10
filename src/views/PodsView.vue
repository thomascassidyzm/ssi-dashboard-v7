<template>
  <!-- p-8 spends 64px of a 390px phone on side padding before any content -->
  <div class="min-h-screen bg-canvas text-ink p-4 sm:p-8">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center gap-4 mb-4 text-sm">
          <router-link to="/" class="text-accent-2 hover:opacity-80">Home</router-link>
          <span class="text-faint">/</span>
          <router-link :to="`/production/${courseCode}`" class="text-accent-2 hover:opacity-80">
            {{ getCourseName(courseCode) }}
          </router-link>
          <span class="text-faint">/</span>
          <span class="text-muted">Listening Pods</span>
        </div>
        <h1 class="text-3xl font-bold text-accent-2 mb-2">Listening Pods</h1>
        <p class="text-muted text-sm">
          Layer 2 podcast content · {{ getCourseName(courseCode) }}
        </p>
      </div>

      <!-- THE CREATE STEP, and only that. This card used to be a state card
           restating the serving pod — its title, HELD badge, counts, coverage —
           directly above the pod's own row, and Tom read it as two pods ("2
           versions of the same POD? Wait, what are they? both Pod-1? What???",
           2026-09-10). A pod appears ONCE on this page: its row. What was
           genuinely unique up here — the release/hold control and its status
           line — lives on the serving pod's row now. This card is left with the
           one job no row can carry: a course with no pod at all needs the create
           button, and there is nothing below to demote it under. -->
      <div v-if="!loading && !error && !corePod" class="bg-surface border border-line rounded-lg p-5 mb-6 flex items-center gap-4 flex-wrap">
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold text-ink">Generate Pod 1 from canonical scenarios</div>
          <div class="text-xs text-muted mt-0.5">
            Flexes the 10 English scenarios into {{ getCourseName(courseCode) }} (target dialogue + translation) via Claude. Generated text has no audio yet — review &amp; edit it, then run audio.
          </div>
          <div v-if="genStatus" class="text-xs mt-2" :class="genError ? 'text-danger' : 'text-accent-2'">{{ genStatus }}</div>
          <div v-if="genError" class="text-xs text-danger mt-1">{{ genError }}</div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <button
            :disabled="generating"
            @click="generatePod(false)"
            class="text-sm px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium"
          >
            {{ generating ? 'Generating…' : 'Generate Pod 1' }}
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-faint text-center py-12">Loading pods…</div>

      <!-- Error -->
      <div v-else-if="error" class="pv-errorbox bg-red-900/40 border border-red-700 rounded-lg p-4 text-red-200">
        {{ error }}
      </div>

      <!-- Empty -->
      <div v-else-if="currentPods.length === 0" class="bg-surface border border-line rounded-lg p-8 text-center">
        <p class="text-muted mb-2">No pods for this course yet.</p>
        <p class="text-faint text-sm">Author a pod markdown file then run <code class="text-accent-2">node tools/pod-sync.cjs</code> to populate.</p>
      </div>

      <!-- Pod cards — the answer to "what is the state of this course's
           listening content", serving pod first. -->
      <div v-else class="grid gap-4">
        <router-link
          v-for="pod in currentPods"
          :key="pod.id"
          :to="`/production/${courseCode}/pods/${pod.slug}`"
          class="block bg-surface border border-line rounded-lg p-4 sm:p-6 hover:border-accent-2 transition-colors"
        >
          <!-- gap-6 + a non-wrapping right column measured 413px on a 390px phone -->
          <div class="flex items-start justify-between gap-3 sm:gap-6 flex-wrap">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 mb-2">
                <h2 class="text-xl font-semibold text-ink truncate">{{ podDisplayTitle(pod) }}</h2>
                <span :class="podTypeClass(pod.pod_type)" class="text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                  {{ pod.pod_type }}
                </span>
                <!-- HELD is loud; LIVE is quiet. A pod nobody can reach is the
                     surprising state, and it is the one that must never be
                     missed on a phone. -->
                <span v-if="isHeld(pod)" :class="visClass(pod)" class="pv-vis flex-shrink-0">HELD</span>
              </div>
              <div class="text-sm text-muted mb-3">
                <code class="text-accent-2">{{ pod.slug }}</code>
                · {{ pod.sentence_count }} sentences
                <span v-if="pod.metadata?.hosts?.length">
                  · hosts: {{ pod.metadata.hosts.map(h => h.name).join(', ') }}
                </span>
                <!-- CHARACTERS, not voices. A scene can have as many characters
                     as it likes; the cast that records them is two people (Tom
                     2026-08-06). Saying "22 speakers" on the card read as a
                     22-strong cast, which is the overkill impression this
                     ruling exists to remove. -->
                <span v-else-if="Object.keys(pod.speakers || {}).filter(k => k !== '_default').length">
                  · {{ Object.keys(pod.speakers).filter(k => k !== '_default').length }} characters
                </span>
              </div>
              <!-- Lines whose target text is an unproofread machine draft.
                   Loud on the card, because a pod with drafts in it is not
                   recordable yet however good its audio coverage looks. -->
              <div v-if="isHeld(pod)" class="pv-vis-note mb-3 text-xs rounded px-2 py-1.5">
                Held back — no learner can reach this pod or any line in it.
              </div>
              <!-- The hold gate in plain words, on the pod it gates. Tom reads
                   this on a phone, so it says what a learner can and cannot
                   reach, not what a column says (Tom, 2026-08-23). -->
              <div v-else-if="isServingPod(pod)" class="text-xs text-muted mb-3">
                Live — learners on {{ courseCode }} can reach this pod now.
              </div>
              <template v-if="isServingPod(pod)">
                <div v-if="genStatus" class="text-xs mb-3" :class="genError ? 'text-danger' : 'text-accent-2'">{{ genStatus }}</div>
                <div v-if="genError" class="text-xs text-danger mb-3">{{ genError }}</div>
              </template>
              <div v-if="draftCounts[pod.id] > 0" class="pv-draft mb-3 inline-flex items-center gap-2 text-xs rounded px-2 py-1">
                <span class="pv-draft-badge">DRAFT</span>
                <span>{{ draftCounts[pod.id] }} line{{ draftCounts[pod.id] === 1 ? '' : 's' }} awaiting proofread — open the pod to read them</span>
              </div>
              <!-- LISTEN. Hearing a pod's recordings used to mean opening the
                   recording room and ticking "Re-read lines I've already
                   recorded" (Aran, via Tom, 2026-08-23). The pod page could
                   always play them; nothing on this card said so. Voices are
                   read from the CLIPS (course_audio.voice_id via the coverage
                   endpoint), never from the cast, which is the plan for the
                   next render and routinely disagrees. -->
              <div v-if="listen[pod.id]" class="pv-listen mb-3 inline-flex items-center gap-2 text-xs rounded px-2 py-1">
                <span>▶</span>
                <span v-if="listen[pod.id].human">
                  {{ listen[pod.id].human }} human take{{ listen[pod.id].human === 1 ? '' : 's' }}<span v-if="listen[pod.id].voices.length"> by {{ listen[pod.id].voices.join(' and ') }}</span> — tap to listen
                </span>
                <span v-else>{{ listen[pod.id].voiced }} recorded line{{ listen[pod.id].voiced === 1 ? '' : 's' }} — tap to listen</span>
              </div>
              <div class="flex gap-4 text-xs">
                <div class="flex items-center gap-1.5">
                  <span class="text-faint">Target:</span>
                  <span :class="coverageClass(pod.audio_coverage.target, pod.audio_coverage.total_sentences)">
                    {{ pod.audio_coverage.target }}/{{ pod.audio_coverage.total_sentences }}
                  </span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="text-faint">Known:</span>
                  <span :class="coverageClass(pod.audio_coverage.known, pod.audio_coverage.total_sentences)">
                    {{ pod.audio_coverage.known }}/{{ pod.audio_coverage.total_sentences }}
                  </span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-3 flex-shrink-0 mt-1">
              <!-- ONE ACTION ON THE SERVING POD, and it is the one the producer
                   came to answer: can learners reach this yet? Everything that
                   SETS the pod up or destroys it lives below the pods themselves
                   (Tom, 2026-09-10: "so many different screens and different
                   ways in, and it's all quite frankly, a mess"). Holding is one
                   tap — erring towards invisible is always safe. Releasing asks
                   first: it cannot be un-seen. The row is a link, so the click
                   stops here and does not open the pod. -->
              <button
                v-if="isServingPod(pod)"
                :disabled="visBusy"
                @click.prevent.stop="setVisibility(pod, isHeld(pod) ? 'live' : 'held')"
                :class="isHeld(pod)
                  ? 'pv-release border-emerald-700 text-emerald-300 hover:border-emerald-500'
                  : 'pv-hold border-red-700 text-red-300 hover:border-red-500'"
                class="text-sm px-4 py-2 rounded border disabled:opacity-50 font-medium"
              >
                {{ visBusy ? 'Saving…' : (isHeld(pod) ? 'Release to learners' : 'Hold back from learners') }}
              </button>
              <svg class="w-5 h-5 text-faint flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </router-link>
      </div>

      <!-- SETUP AND REGENERATION, below the content and behind a disclosure.
           Regenerate deletes every sentence in the pod (and its audio), so it
           has no business sitting at eye level next to a state readout; Edit
           canonical is a different screen entirely. Neither is what anyone opens
           this page to do. -->
      <details v-if="!loading && !error" class="pv-drawer mt-6 rounded-lg border border-line bg-surface">
        <summary class="pv-summary">Cast — who records each character</summary>
        <div class="px-1 pb-1">
          <PodCastPanel :course-code="courseCode" />
        </div>
      </details>

      <details v-if="!loading && !error" class="pv-drawer mt-3 rounded-lg border border-line bg-surface">
        <summary class="pv-summary">Setup &amp; regeneration</summary>
        <div class="px-4 pb-4 pt-1 flex items-center gap-3 flex-wrap">
          <router-link :to="`/production/${courseCode}/canonical/pod-1`" class="text-xs px-3 py-2 rounded border border-line text-ink hover:border-accent-2">Edit canonical</router-link>
          <button
            v-if="corePod"
            :disabled="generating"
            @click="regenerate"
            :title="corePodHasAudio ? 'Wipe all sentences + audio and re-flex from canonical' : 'Wipe all sentences and re-flex from canonical'"
            class="pv-regen text-sm px-4 py-2 rounded border border-amber-700 text-amber-300 hover:border-amber-500 disabled:opacity-50 font-medium"
          >
            {{ generating ? 'Regenerating…' : 'Regenerate' }}
          </button>
          <span v-if="corePod" class="text-xs text-muted">
            Regenerate replaces all {{ corePod.sentence_count }} sentences{{ corePodHasAudio ? ' and clears their audio' : '' }}.
          </span>
        </div>
      </details>

      <!-- ARCHIVED, COLLAPSED, COUNTED. Tom, 2026-09-10: "why are we even
           displaying the old archived PODS?" Nothing is deleted and nothing goes
           dark — the count is on the line, so a pod parked for rollback is still
           one tap away when somebody needs to roll back. -->
      <details v-if="parkedPods.length" class="pv-drawer mt-3 rounded-lg border border-line bg-surface">
        <summary class="pv-summary">Show archived ({{ parkedPods.length }})</summary>
        <div class="px-4 pb-4 pt-1 grid gap-2">
          <p class="text-xs text-faint">
            Retired, gated, staged or empty pods, kept for rollback. Not learner-facing and not being worked on.
          </p>
          <router-link
            v-for="pod in parkedPods"
            :key="pod.id"
            :to="`/production/${courseCode}/pods/${pod.slug}`"
            class="flex items-baseline gap-2 flex-wrap text-xs hover:text-accent-2"
          >
            <span class="pv-parked-badge">{{ parkedReason(pod).toUpperCase() }}</span>
            <code class="text-accent-2">{{ pod.slug }}</code>
            <span class="text-faint">· {{ pod.sentence_count }} sentences</span>
          </router-link>
        </div>
      </details>

      <!-- Footer stats -->
      <div v-if="currentPods.length > 0" class="mt-8 text-center text-xs text-faint">
        {{ currentPods.length }} pod{{ currentPods.length === 1 ? '' : 's' }} · {{ totalSentences }} sentences total<span v-if="parkedPods.length"> · {{ parkedPods.length }} archived</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getApiUrl } from '@/services/api.js'
import { useAuth } from '@/composables/useAuth.js'
import { useCourses } from '@/composables/useCourses'
import PodCastPanel from '@/components/PodCastPanel.vue'
import { pickServingPod, slugOfPod, partitionPods, podParkedReason } from '@/lib/servingPod.js'
import { podDisplayTitle, podDisplayLabel } from '@/lib/podDisplayName.js'
import { voiceNamesFromCoverage, recordistNames } from '@/lib/recordistNames.js'

const route = useRoute()
const courseCode = route.params.courseCode
const { getCourseName } = useCourses()

const pods = ref([])
const loading = ref(true)
const error = ref(null)

// --- Generate Pod 0 from the canonical scenarios (admin) ---
const { getAccessToken } = useAuth()
const generating = ref(false)
const genStatus = ref('')
const genError = ref('')

async function authedFetch(path, init = {}) {
  const token = await getAccessToken()
  const headers = { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json', ...(init.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${getApiUrl()}${path}`, { ...init, headers })
}

// Resumable poll loop — the endpoint generates a few scenes per call and
// returns more_remaining.
// `slug` is the LISTENING pod being written, and only that. It used to double as
// the canonical slate to flex from, which is why creating a course's first core
// pod wrote `pod-0`: that was the only slug canonical rows existed under. Since
// 2026-09-01 the canonical slate is named separately by the API (canonicalSlug),
// so this value means one thing — and since 2026-09-03 a course's FIRST core pod
// is created on `pod-1`, per Tom's ruling of 2026-08-22: "We want to not have a
// Pod 0 from now on. We want this first one to be called Pod 1." The default is
// only ever used by the green Create button, which renders solely when the course
// has no serving core pod at all. Regenerating passes the pod the course ACTUALLY
// serves, so a 1-based course can never have its pod-1 content wiped into a fresh
// pod-0 behind its back.
async function generatePod(force = false, slug = 'pod-1') {
  if (generating.value) return
  generating.value = true
  genError.value = ''
  genStatus.value = 'Building consistency ledger + generating scenes…'
  try {
    for (let pass = 0; pass < 30; pass++) {
      const res = await authedFetch('/api/admin/pods/generate', {
        method: 'POST',
        // force is a one-shot reset: wipe + restart on the first pass only, then
        // resume normally — otherwise every pass would re-wipe scenes 1..maxScenes
        // and never advance past the first batch.
        body: JSON.stringify({ courseCode, slug, force: force && pass === 0 }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
      const done = (body.totalScenes || 0) - (body.remaining || 0)
      genStatus.value = `Generated ${done}/${body.totalScenes || '?'} scenes` +
        (body.more_remaining ? ' · continuing…' : ' · done ✓')
      await loadPods()
      if (!body.more_remaining) break
    }
  } catch (err) {
    genError.value = err?.message || String(err)
  } finally {
    generating.value = false
  }
}

// WHICH POD THIS CARD MANAGES. Not `pod-0` by assumption: Tom's 1-based ruling
// of 2026-08-22 put hrv_for_eng onto `pod-1` — 23 courses including cym_n_for_eng
// are now there, while the other 44 stay on `pod-0`. Hard-coding pod-0 showed Croatian the green "Generate Pod 0"
// button on a course that already has a full, recorded pod.
// includeHeld: this card MANAGES the pod, it does not serve it. A held pod is
// exactly the one being worked on (Tom, 2026-08-23), so hiding it here would
// show the green "Generate Pod 0" button over a pod that already exists — the
// same Croatian failure the ruling above fixed, with a different cause.
const corePod = computed(() => pickServingPod(pods.value, { includeHeld: true }))
// THE SAME NAME THE POD'S ROW USES, for the regenerate confirm. This read the
// pod's raw title, so on Welsh — then keyed `pod-0`, with a title column
// literally reading "… Pod 0" — the prompt said "Pod 0" over a row that had
// just said Pod 1. Welsh itself was re-slugged to `pod-1` on 2026-09-10 so it
// no longer needs the translation, but the 44 courses the switchover has not
// reached still do. The fallback is renamed too, for a pod with no title at all.
const corePodLabel = computed(() => podDisplayLabel(corePod.value))
// The row that carries the release/hold control and the live/held line: the
// pod this course serves (or would serve, once released). Compared by id, so
// the choice pod on cym_n_for_eng never grows a second release button.
const isServingPod = (pod) => !!pod && !!corePod.value && pod.id === corePod.value.id
const corePodHasAudio = computed(() => {
  const c = corePod.value?.audio_coverage
  return !!c && (c.target > 0 || c.known > 0)
})

// Regenerate is destructive (wipes sentences, and audio if any) — confirm first,
// and make the audio cost explicit when the pod is already voiced.
function regenerate() {
  if (generating.value) return
  const p = corePod.value
  if (!p) return
  const c = p.audio_coverage || {}
  const msg = corePodHasAudio.value
    ? `Regenerate ${corePodLabel.value} for ${getCourseName(courseCode)}?\n\nThis DELETES all ${p.sentence_count} sentences and their audio (${c.target}/${c.total_sentences} target, ${c.known}/${c.total_sentences} known voiced), then re-flexes from the canonical English. Audio will need re-recording (TTS cost).`
    : `Regenerate ${corePodLabel.value} for ${getCourseName(courseCode)}?\n\nThis replaces all ${p.sentence_count} sentences by re-flexing from the canonical English.`
  if (!window.confirm(msg)) return
  generatePod(true, slugOfPod(p))
}

// --- Hold / release (Tom, 2026-08-23) -------------------------------------
// `listening_pods.visibility`. Held means RLS hides the pod AND its sentences
// from the learner app entirely; Popty reads with the service role, so this
// page still sees it, badged. GOING LIVE IS A HUMAN ACT — this control is the
// human, and the endpoint behind it is the only write path to the column.
const visBusy = ref(false)

// Fail closed, exactly like the resolver: anything that is not explicitly
// 'live' reads as held. A pod whose row somehow arrives without the column is
// better shown as HELD-and-wrong than live-and-wrong.
const isHeld = (pod) => !!pod && pod.visibility !== 'live'
const visClass = (pod) => (isHeld(pod) ? 'pv-vis-held' : 'pv-vis-live')

async function setVisibility(pod, next) {
  if (!pod || visBusy.value) return
  // Release asks; hold does not. Undoing a hold costs a tap — undoing a release
  // means learners have already seen it.
  if (next === 'live') {
    const msg = `Release ${podDisplayTitle(pod) || pod.slug} to learners on ${courseCode}?\n\n`
      + 'From the moment you confirm, every learner on this course can hear this pod. '
      + 'Only release it if it is finished and you have listened to it.'
    if (!window.confirm(msg)) return
  }
  visBusy.value = true
  genError.value = ''
  try {
    const res = await authedFetch(`/api/admin/pods/${courseCode}/${pod.slug}/visibility`, {
      method: 'POST',
      // `confirm` is the endpoint's deliberate-act token — it must name the pod.
      body: JSON.stringify({ visibility: next, ...(next === 'live' ? { confirm: pod.id } : {}) }),
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
    genStatus.value = next === 'held'
      ? `Held — no learner can reach ${podDisplayTitle(pod) || pod.slug}.`
      : `Released — learners can now reach ${podDisplayTitle(pod) || pod.slug}.`
    await loadPods()
  } catch (err) {
    genError.value = err?.message || String(err)
  } finally {
    visBusy.value = false
  }
}

// WHAT THIS PAGE SHOWS, AND WHAT IT PUTS AWAY (Tom, 2026-09-10). The rule is
// podParkedReason in @/lib/servingPod.js, next to the serving-slug allowlist it
// is the mirror of, with its own test — not a v-if in the template, because the
// two things it must never do (park a HELD pod, park a serving slug) are exactly
// the things a template expression cannot be held to.
const partitioned = computed(() => partitionPods(pods.value))
const currentPods = computed(() => partitioned.value.current)
const parkedPods = computed(() => partitioned.value.parked)
const parkedReason = (pod) => podParkedReason(pod) || 'archived'

// Counted over what is SHOWN. A footer totalling 604 sentences over three pods
// when one of them is an empty rollback placeholder describes a page nobody is
// looking at.
const totalSentences = computed(() =>
  currentPods.value.reduce((a, p) => a + (p.sentence_count || 0), 0)
)

function podTypeClass(type) {
  if (type === 'core') return 'pv-pill-core bg-emerald-900/40 text-emerald-300 border border-emerald-700'
  return 'pv-pill-aux bg-purple-900/40 text-purple-300 border border-purple-700'
}

function coverageClass(covered, total) {
  if (total === 0) return 'text-faint'
  if (covered === total) return 'text-accent-2'
  if (covered === 0) return 'text-faint'
  return 'pv-cov-partial text-amber-400'
}

async function loadPods() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${getApiUrl()}/api/pods/${courseCode}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
    if (!res.ok) throw new Error(`Failed to load pods (${res.status})`)
    const data = await res.json()
    pods.value = data.pods || []
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Per-pod count of lines still carrying the DRAFT marker
// (listening_pod_sentences.target_text_draft), from the course-gated pods door.
const draftCounts = ref({})
async function loadDraftCounts() {
  try {
    const res = await authedFetch(`/api/production/${courseCode}/pods/drafts`)
    if (!res.ok) return   // non-fatal — the cards still show coverage
    const body = await res.json()
    draftCounts.value = body.byPod || {}
  } catch { /* non-fatal */ }
}

// Per-pod listening summary: how many clips are human takes, and whose voices.
// One read of the pods coverage endpoint (read-only; no writes anywhere on this
// path). Non-fatal — the cards render fully without it.
const listen = ref({})
async function loadListenSummary() {
  try {
    const res = await authedFetch(`/api/production/${courseCode}/pods/coverage`)
    if (!res.ok) return
    const body = await res.json()
    // PEOPLE, not voice ids. One recordist can own several ids (Aran's Welsh
    // takes sit under human_aran_cym_n and human_aran_cym_n_2); the alias map
    // on the coverage payload folds them to one name. The count is per LINE —
    // each line links one clip — so two ids never count a take twice.
    const names = voiceNamesFromCoverage(body.voices)
    const out = {}
    for (const p of body.pods || []) {
      let human = 0, voiced = 0
      const voiceIds = []
      for (const s of p.sentences || []) {
        for (const k of Object.values(s.kinds || {})) {
          if (k.audioId) voiced++
          if (k.recorded) { human++; if (k.voiceId) voiceIds.push(k.voiceId) }
        }
      }
      if (voiced > 0) out[p.podId] = { human, voiced, voices: recordistNames(voiceIds, names) }
    }
    listen.value = out
  } catch { /* non-fatal */ }
}

onMounted(() => { loadPods(); loadDraftCounts(); loadListenSummary() })
</script>

<style>
/* DRAWERS — the machinery, demoted but not hidden. A <details> keeps the whole
   thing one tap away and, crucially, keeps the COUNT on screen while closed, so
   demoting is never the same as going dark. */
.pv-summary {
  cursor: pointer;
  list-style: none;
  padding: 0.75rem 1rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted, #9ca3af);
}
.pv-summary::-webkit-details-marker { display: none; }
.pv-summary::before { content: '▸ '; }
details[open] > .pv-summary::before { content: '▾ '; }
.pv-summary:hover { color: var(--accent-2); }
.pv-parked-badge {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  border-radius: 3px;
  padding: 0.05rem 0.35rem;
  background: rgba(148, 163, 184, 0.18);
  color: var(--text-muted, #9ca3af);
  border: 1px solid rgba(148, 163, 184, 0.35);
}

/* HELD / LIVE — learner reachability (Tom, 2026-08-23). HELD borrows the DRAFT
   badge's shape but not its colour: DRAFT is amber and means "not ready to
   record", HELD is red and means "nobody can reach it". Two different facts,
   two different reads, and they routinely appear on the same card. */
.pv-vis {
  font-weight: 800;
  letter-spacing: 0.08em;
  font-size: 0.7rem;
  border-radius: 3px;
  padding: 0.1rem 0.4rem;
}
.pv-vis-held { background: #dc2626; color: #fff; }
.pv-vis-live { background: rgba(52, 211, 153, 0.15); color: var(--accent-2); border: 1px solid #047857; }
.pv-vis-note {
  background: rgba(127, 29, 29, 0.35);
  border: 1px solid #b91c1c;
  color: #fecaca;
}
:root[data-theme="light"] .pv-vis-live { background: #d1fae5; color: #065f46; border-color: #6ee7b7; }
:root[data-theme="light"] .pv-vis-note { background: #fef2f2; border-color: #dc2626; color: #991b1b; }
:root[data-theme="light"] .pv-hold { color: #991b1b; border-color: #dc2626; }
:root[data-theme="light"] .pv-release { color: #065f46; border-color: #047857; }

/* LISTEN — this pod has playable audio. Emerald and quiet: it is an invitation,
   not a warning, and it shares a card with HELD (red) and DRAFT (amber). */
.pv-listen {
  background: rgba(52, 211, 153, 0.1);
  border: 1px solid #047857;
  color: var(--accent-2);
}
:root[data-theme="light"] .pv-listen {
  background: #d1fae5; border-color: #6ee7b7; color: #065f46;
}

/* DRAFT — unproofread machine target text. Tungsten, same identity the record
   room and the pod detail page use for the same state. */
.pv-draft {
  background: rgba(255, 166, 48, 0.08);
  border: 1px solid var(--color-tungsten, #ffa630);
  color: var(--color-tungsten, #ffa630);
}
.pv-draft-badge {
  background: var(--color-tungsten, #ffa630);
  color: #1a1a17;
  font-weight: 800;
  letter-spacing: 0.07em;
  border-radius: 3px;
  padding: 0 0.3rem;
}
:root[data-theme="light"] .pv-draft {
  background: #fffbeb; border-color: #b45309; color: #92400e;
}
:root[data-theme="light"] .pv-draft-badge { background: #b45309; color: #fff; }

/* Light-mode-only fixes. Dark mode is untouched (raw Tailwind classes still apply
   under dark; these selectors only fire when data-theme="light"). */
:root[data-theme="light"] .pv-warn {
  color: #92400e; /* amber-800 on white = 7.0:1 */
}
:root[data-theme="light"] .pv-regen {
  color: #92400e;          /* amber-800 text = 7.0:1 */
  border-color: #b45309;   /* amber-700 border ~3.4:1 */
}
:root[data-theme="light"] .pv-regen:hover {
  border-color: #92400e;
}
:root[data-theme="light"] .pv-errorbox {
  background-color: #fef2f2; /* red-50 */
  border-color: #dc2626;     /* danger, 4.5:1 vs white */
  color: #991b1b;            /* red-800 on red-50 ~8:1 */
}
:root[data-theme="light"] .pv-pill-core {
  background-color: #d1fae5; /* emerald-100 */
  border-color: #6ee7b7;     /* emerald-300 */
  color: #065f46;            /* emerald-800 ~7:1 on emerald-100 */
}
:root[data-theme="light"] .pv-pill-aux {
  background-color: #f3e8ff; /* purple-100 */
  border-color: #d8b4fe;     /* purple-300 */
  color: #6b21a8;            /* purple-800 ~7:1 on purple-100 */
}
:root[data-theme="light"] .pv-cov-partial {
  color: #b45309; /* amber-700 = 4.6:1 on white card */
}
</style>
