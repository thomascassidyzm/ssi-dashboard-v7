<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center gap-4 mb-4 text-sm">
          <router-link to="/" class="text-emerald-400 hover:text-emerald-300">Home</router-link>
          <span class="text-slate-600">/</span>
          <router-link :to="`/production/${courseCode}`" class="text-emerald-400 hover:text-emerald-300">
            {{ formatCourseCode(courseCode) }}
          </router-link>
          <span class="text-slate-600">/</span>
          <span class="text-slate-400">Listening Pods</span>
        </div>
        <h1 class="text-3xl font-bold text-emerald-400 mb-2">Listening Pods</h1>
        <p class="text-slate-400 text-sm">
          Layer 2 podcast content · {{ courseCode }}
        </p>
      </div>

      <!-- Generate from canonical -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-5 mb-6 flex items-center gap-4 flex-wrap">
        <div class="flex-1 min-w-0">
          <!-- No pod-0 yet: this is the create step -->
          <template v-if="!pod0">
            <div class="text-sm font-semibold text-slate-200">Generate Pod 0 from canonical scenarios</div>
            <div class="text-xs text-slate-400 mt-0.5">
              Flexes the 10 English scenarios into {{ courseCode }} (target dialogue + translation) via Claude. Generated text has no audio yet — review &amp; edit it, then run audio.
            </div>
          </template>
          <!-- pod-0 exists: this is the manage/re-flex step -->
          <template v-else>
            <div class="text-sm font-semibold text-slate-200">Pod 0 — already generated</div>
            <div class="text-xs text-slate-400 mt-0.5">
              {{ pod0.sentence_count }} sentences · audio {{ pod0.audio_coverage.target }}/{{ pod0.audio_coverage.total_sentences }} target, {{ pod0.audio_coverage.known }}/{{ pod0.audio_coverage.total_sentences }} known.
              Edit sentences in the pod below, or re-flex the English in <span class="text-slate-300">Edit canonical</span>.
              <span class="text-amber-300/90">Regenerate replaces all sentences{{ pod0HasAudio ? ' and clears their audio' : '' }}.</span>
            </div>
          </template>
          <div v-if="genStatus" class="text-xs mt-2" :class="genError ? 'text-red-300' : 'text-emerald-300'">{{ genStatus }}</div>
          <div v-if="genError" class="text-xs text-red-300 mt-1">{{ genError }}</div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <router-link :to="`/production/${courseCode}/canonical/pod-0`" class="text-xs px-3 py-2 rounded border border-slate-600 text-slate-300 hover:border-emerald-500">Edit canonical</router-link>
          <!-- Create (green) only when there's no pod-0 -->
          <button
            v-if="!pod0"
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
            :title="pod0HasAudio ? 'Wipe all sentences + audio and re-flex from canonical' : 'Wipe all sentences and re-flex from canonical'"
            class="text-sm px-4 py-2 rounded border border-amber-700 text-amber-300 hover:border-amber-500 disabled:opacity-50 font-medium"
          >
            {{ generating ? 'Regenerating…' : 'Regenerate' }}
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-slate-500 text-center py-12">Loading pods…</div>

      <!-- Error -->
      <div v-else-if="error" class="bg-red-900/40 border border-red-700 rounded-lg p-4 text-red-200">
        {{ error }}
      </div>

      <!-- Empty -->
      <div v-else-if="pods.length === 0" class="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
        <p class="text-slate-400 mb-2">No pods for this course yet.</p>
        <p class="text-slate-500 text-sm">Author a pod markdown file then run <code class="text-emerald-400">node tools/pod-sync.cjs</code> to populate.</p>
      </div>

      <!-- Pod cards -->
      <div v-else class="grid gap-4">
        <router-link
          v-for="pod in pods"
          :key="pod.id"
          :to="`/production/${courseCode}/pods/${pod.slug}`"
          class="block bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-emerald-500 transition-colors"
        >
          <div class="flex items-start justify-between gap-6">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 mb-2">
                <h2 class="text-xl font-semibold text-slate-100 truncate">{{ pod.title }}</h2>
                <span :class="podTypeClass(pod.pod_type)" class="text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                  {{ pod.pod_type }}
                </span>
              </div>
              <div class="text-sm text-slate-400 mb-3">
                <code class="text-emerald-400">{{ pod.slug }}</code>
                · {{ pod.sentence_count }} sentences
                <span v-if="pod.metadata?.hosts?.length">
                  · hosts: {{ pod.metadata.hosts.map(h => h.name).join(', ') }}
                </span>
                <span v-else-if="Object.keys(pod.speakers || {}).filter(k => k !== '_default').length">
                  · {{ Object.keys(pod.speakers).filter(k => k !== '_default').length }} speakers
                </span>
              </div>
              <div class="flex gap-4 text-xs">
                <div class="flex items-center gap-1.5">
                  <span class="text-slate-500">Target:</span>
                  <span :class="coverageClass(pod.audio_coverage.target, pod.audio_coverage.total_sentences)">
                    {{ pod.audio_coverage.target }}/{{ pod.audio_coverage.total_sentences }}
                  </span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="text-slate-500">Known:</span>
                  <span :class="coverageClass(pod.audio_coverage.known, pod.audio_coverage.total_sentences)">
                    {{ pod.audio_coverage.known }}/{{ pod.audio_coverage.total_sentences }}
                  </span>
                </div>
              </div>
            </div>
            <svg class="w-5 h-5 text-slate-600 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </router-link>
      </div>

      <!-- Footer stats -->
      <div v-if="pods.length > 0" class="mt-8 text-center text-xs text-slate-500">
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
async function generatePod(force = false) {
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
        body: JSON.stringify({ courseCode, slug: 'pod-0', force: force && pass === 0 }),
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

const pod0 = computed(() => pods.value.find(p => p.slug === 'pod-0') || null)
const pod0HasAudio = computed(() => {
  const c = pod0.value?.audio_coverage
  return !!c && (c.target > 0 || c.known > 0)
})

// Regenerate is destructive (wipes sentences, and audio if any) — confirm first,
// and make the audio cost explicit when the pod is already voiced.
function regenerate() {
  if (generating.value) return
  const p = pod0.value
  if (!p) return
  const c = p.audio_coverage || {}
  const msg = pod0HasAudio.value
    ? `Regenerate Pod 0 for ${courseCode}?\n\nThis DELETES all ${p.sentence_count} sentences and their audio (${c.target}/${c.total_sentences} target, ${c.known}/${c.total_sentences} known voiced), then re-flexes from the canonical English. Audio will need re-recording (TTS cost).`
    : `Regenerate Pod 0 for ${courseCode}?\n\nThis replaces all ${p.sentence_count} sentences by re-flexing from the canonical English.`
  if (!window.confirm(msg)) return
  generatePod(true)
}

const totalSentences = computed(() =>
  pods.value.reduce((a, p) => a + (p.sentence_count || 0), 0)
)

function formatCourseCode(code) {
  return code || '(unknown)'
}

function podTypeClass(type) {
  if (type === 'core') return 'bg-emerald-900/40 text-emerald-300 border border-emerald-700'
  return 'bg-purple-900/40 text-purple-300 border border-purple-700'
}

function coverageClass(covered, total) {
  if (total === 0) return 'text-slate-500'
  if (covered === total) return 'text-emerald-400'
  if (covered === 0) return 'text-slate-500'
  return 'text-amber-400'
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

onMounted(loadPods)
</script>
