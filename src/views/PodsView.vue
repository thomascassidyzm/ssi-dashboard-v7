<template>
  <div class="min-h-screen bg-canvas text-ink p-8">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center gap-4 mb-4 text-sm">
          <router-link to="/" class="text-accent-2 hover:opacity-80">Home</router-link>
          <span class="text-faint">/</span>
          <router-link :to="`/production/${courseCode}`" class="text-accent-2 hover:opacity-80">
            {{ formatCourseCode(courseCode) }}
          </router-link>
          <span class="text-faint">/</span>
          <span class="text-muted">Listening Pods</span>
        </div>
        <h1 class="text-3xl font-bold text-accent-2 mb-2">Listening Pods</h1>
        <p class="text-muted text-sm">
          Layer 2 podcast content · {{ courseCode }}
        </p>
      </div>

      <!-- Generate from canonical -->
      <div class="bg-surface border border-line rounded-lg p-5 mb-6 flex items-center gap-4 flex-wrap">
        <div class="flex-1 min-w-0">
          <!-- No serving core pod yet: this is the create step -->
          <template v-if="!corePod">
            <div class="text-sm font-semibold text-ink">Generate Pod 0 from canonical scenarios</div>
            <div class="text-xs text-muted mt-0.5">
              Flexes the 10 English scenarios into {{ courseCode }} (target dialogue + translation) via Claude. Generated text has no audio yet — review &amp; edit it, then run audio.
            </div>
          </template>
          <!-- a serving core pod exists: this is the manage/re-flex step -->
          <template v-else>
            <div class="text-sm font-semibold text-ink">{{ corePodLabel }} — already generated</div>
            <div class="text-xs text-muted mt-0.5">
              {{ corePod.sentence_count }} sentences · audio {{ corePod.audio_coverage.target }}/{{ corePod.audio_coverage.total_sentences }} target, {{ corePod.audio_coverage.known }}/{{ corePod.audio_coverage.total_sentences }} known.
              Edit sentences in the pod below, or re-flex the English in <span class="text-ink">Edit canonical</span>.
              <span class="pv-warn text-amber-300/90">Regenerate replaces all sentences{{ corePodHasAudio ? ' and clears their audio' : '' }}.</span>
            </div>
          </template>
          <div v-if="genStatus" class="text-xs mt-2" :class="genError ? 'text-danger' : 'text-accent-2'">{{ genStatus }}</div>
          <div v-if="genError" class="text-xs text-danger mt-1">{{ genError }}</div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <router-link :to="`/production/${courseCode}/canonical/pod-0`" class="text-xs px-3 py-2 rounded border border-line text-ink hover:border-accent-2">Edit canonical</router-link>
          <!-- Create (green) only when there's no serving core pod -->
          <button
            v-if="!corePod"
            :disabled="generating"
            @click="generatePod(false)"
            class="text-sm px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium"
          >
            {{ generating ? 'Generating…' : 'Generate Pod 0' }}
          </button>
          <!-- Regenerate (amber, confirmed) once it exists -->
          <button
            v-else
            :disabled="generating"
            @click="regenerate"
            :title="corePodHasAudio ? 'Wipe all sentences + audio and re-flex from canonical' : 'Wipe all sentences and re-flex from canonical'"
            class="pv-regen text-sm px-4 py-2 rounded border border-amber-700 text-amber-300 hover:border-amber-500 disabled:opacity-50 font-medium"
          >
            {{ generating ? 'Regenerating…' : 'Regenerate' }}
          </button>
        </div>
      </div>

      <!-- Cast: who records each character (human pod recording) -->
      <PodCastPanel :course-code="courseCode" />

      <!-- Loading -->
      <div v-if="loading" class="text-faint text-center py-12">Loading pods…</div>

      <!-- Error -->
      <div v-else-if="error" class="pv-errorbox bg-red-900/40 border border-red-700 rounded-lg p-4 text-red-200">
        {{ error }}
      </div>

      <!-- Empty -->
      <div v-else-if="pods.length === 0" class="bg-surface border border-line rounded-lg p-8 text-center">
        <p class="text-muted mb-2">No pods for this course yet.</p>
        <p class="text-faint text-sm">Author a pod markdown file then run <code class="text-accent-2">node tools/pod-sync.cjs</code> to populate.</p>
      </div>

      <!-- Pod cards -->
      <div v-else class="grid gap-4">
        <router-link
          v-for="pod in pods"
          :key="pod.id"
          :to="`/production/${courseCode}/pods/${pod.slug}`"
          class="block bg-surface border border-line rounded-lg p-6 hover:border-accent-2 transition-colors"
        >
          <div class="flex items-start justify-between gap-6">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 mb-2">
                <h2 class="text-xl font-semibold text-ink truncate">{{ pod.title }}</h2>
                <span :class="podTypeClass(pod.pod_type)" class="text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                  {{ pod.pod_type }}
                </span>
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
              <div v-if="draftCounts[pod.id] > 0" class="pv-draft mb-3 inline-flex items-center gap-2 text-xs rounded px-2 py-1">
                <span class="pv-draft-badge">DRAFT</span>
                <span>{{ draftCounts[pod.id] }} line{{ draftCounts[pod.id] === 1 ? '' : 's' }} awaiting proofread — open the pod to read them</span>
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
            <svg class="w-5 h-5 text-faint flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </router-link>
      </div>

      <!-- Footer stats -->
      <div v-if="pods.length > 0" class="mt-8 text-center text-xs text-faint">
        {{ pods.length }} pods · {{ totalSentences }} sentences total
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getApiUrl } from '@/services/api.js'
import { useAuth } from '@/composables/useAuth.js'
import PodCastPanel from '@/components/PodCastPanel.vue'
import { pickServingPod, slugOfPod } from '@/lib/servingPod.js'

const route = useRoute()
const courseCode = route.params.courseCode

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
// returns more_remaining. Mirrors the explainer-generate pattern.
// `slug` is the pod being written. Creating a course's first core pod still
// writes `pod-0`, because the generator flexes canonical_pod_scenarios rows
// keyed on that same slug and only `pod-0` has them. Regenerating passes the
// pod the course ACTUALLY serves, so a 1-based course can never have its
// pod-1 content wiped into a fresh pod-0 behind its back.
async function generatePod(force = false, slug = 'pod-0') {
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
// of 2026-08-22 put hrv_for_eng onto `pod-1`, while the other ~68 courses stay
// on `pod-0`. Hard-coding pod-0 showed Croatian the green "Generate Pod 0"
// button on a course that already has a full, recorded pod.
const corePod = computed(() => pickServingPod(pods.value))
const corePodLabel = computed(() => corePod.value?.title || `Pod ${slugOfPod(corePod.value).replace(/^pod-/, '')}`)
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
    ? `Regenerate ${corePodLabel.value} for ${courseCode}?\n\nThis DELETES all ${p.sentence_count} sentences and their audio (${c.target}/${c.total_sentences} target, ${c.known}/${c.total_sentences} known voiced), then re-flexes from the canonical English. Audio will need re-recording (TTS cost).`
    : `Regenerate ${corePodLabel.value} for ${courseCode}?\n\nThis replaces all ${p.sentence_count} sentences by re-flexing from the canonical English.`
  if (!window.confirm(msg)) return
  generatePod(true, slugOfPod(p))
}

const totalSentences = computed(() =>
  pods.value.reduce((a, p) => a + (p.sentence_count || 0), 0)
)

function formatCourseCode(code) {
  return code || '(unknown)'
}

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

onMounted(() => { loadPods(); loadDraftCounts() })
</script>

<style>
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
