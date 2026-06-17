<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8">
    <div class="max-w-6xl mx-auto">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-3 mb-6 text-sm">
        <router-link to="/" class="text-emerald-400 hover:text-emerald-300">Home</router-link>
        <span class="text-slate-600">/</span>
        <router-link :to="`/production/${courseCode}`" class="text-emerald-400 hover:text-emerald-300">{{ courseCode }}</router-link>
        <span class="text-slate-600">/</span>
        <router-link :to="`/production/${courseCode}/pods`" class="text-emerald-400 hover:text-emerald-300">Pods</router-link>
        <span class="text-slate-600">/</span>
        <span class="text-slate-400">{{ slug }}</span>
      </div>

      <div v-if="loading" class="text-slate-500 text-center py-12">Loading pod…</div>

      <div v-else-if="error" class="bg-red-900/40 border border-red-700 rounded-lg p-4 text-red-200">
        {{ error }}
      </div>

      <div v-else-if="pod">
        <!-- Pod header -->
        <div class="mb-8">
          <div class="flex items-center gap-3 mb-2">
            <h1 class="text-3xl font-bold text-emerald-400">{{ pod.title }}</h1>
            <span :class="podTypeClass(pod.pod_type)" class="text-xs px-2 py-0.5 rounded-full">{{ pod.pod_type }}</span>
          </div>
          <div class="text-slate-400 text-sm">
            <code class="text-emerald-400">{{ pod.id }}</code>
            · {{ sentences.length }} sentences
            <span v-if="pod.source_file"> · from <code>{{ pod.source_file }}</code></span>
          </div>
        </div>

        <!-- Metadata (hosts / design notes) -->
        <div v-if="hasMetadata" class="mb-6 bg-slate-800/60 border border-slate-700 rounded-lg p-4 text-sm">
          <details>
            <summary class="cursor-pointer text-slate-300 font-semibold">Pod metadata</summary>
            <div class="mt-3 space-y-2 text-slate-400">
              <div v-if="pod.metadata?.hosts?.length">
                <span class="text-slate-300">Hosts:</span>
                <ul class="ml-4 mt-1">
                  <li v-for="h in pod.metadata.hosts" :key="h.name">
                    <span class="text-emerald-400">{{ h.name }}</span>
                    <span v-if="h.description"> — {{ h.description }}</span>
                  </li>
                </ul>
              </div>
              <div v-if="pod.metadata?.register">
                <span class="text-slate-300">Register:</span> {{ pod.metadata.register }}
              </div>
              <div v-if="pod.metadata?.status">
                <span class="text-slate-300">Status:</span> {{ pod.metadata.status }}
              </div>
            </div>
          </details>
        </div>

        <!-- Speaker → voice mapping -->
        <div class="mb-6 bg-slate-800/60 border border-slate-700 rounded-lg p-4 text-sm">
          <details open>
            <summary class="cursor-pointer text-slate-300 font-semibold">Speaker voice mapping</summary>
            <div class="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2">
              <div v-for="(v, spk) in pod.speakers" :key="spk" class="flex justify-between px-2 py-1 bg-slate-900/50 rounded">
                <span :class="spk === '_default' ? 'text-slate-500 italic' : 'text-slate-300'">{{ spk }}</span>
                <span class="text-emerald-400 font-mono text-xs">{{ v.voice_id }} <span class="text-slate-500">({{ v.provider }})</span></span>
              </div>
            </div>
          </details>
        </div>

        <!-- Explainer generation panel
             Stage-1 sequence is target → known → explainer → target → target.
             Generate the per-sentence narration text via Haiku (Max Plan),
             store on the row. Audio rendering is a separate pass once the
             text looks good. -->
        <div class="mb-6 bg-slate-800/60 border border-slate-700 rounded-lg p-4 text-sm">
          <div class="flex items-center justify-between gap-3">
            <div class="flex flex-col gap-1 min-w-0">
              <div class="text-slate-300 font-semibold">Stage-1 explainer text</div>
              <div class="text-slate-500 text-xs">
                {{ explainerCovered }}/{{ sentences.length }} sentences have explainer text
                <span v-if="explainerAudioCovered > 0">
                  · {{ explainerAudioCovered }} with audio
                </span>
              </div>
            </div>
            <div class="flex gap-2">
              <button
                @click="generateExplainers(false)"
                :disabled="explainerBusy || allExplained"
                class="px-3 py-1.5 text-xs rounded bg-emerald-700 hover:bg-emerald-600 text-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Generate explainer text for sentences that don't have one yet"
              >{{ explainerBusy ? 'Generating…' : 'Generate' }}</button>
              <button
                @click="generateExplainers(true)"
                :disabled="explainerBusy || sentences.length === 0"
                class="px-3 py-1.5 text-xs rounded bg-amber-700 hover:bg-amber-600 text-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Re-run for ALL sentences in this pod, overwriting existing explainer text (use after a prompt change)"
              >Regenerate all</button>
            </div>
          </div>
          <div v-if="explainerStatus" class="mt-3 text-xs text-slate-400">{{ explainerStatus }}</div>
          <div v-if="explainerError" class="mt-3 text-xs text-red-300 bg-red-900/30 border border-red-800 rounded px-2 py-1">{{ explainerError }}</div>
        </div>

        <!-- Scenes and sentences -->
        <div v-for="scene in groupedScenes" :key="scene.number" class="mb-8">
          <h2 class="text-sm uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-3">
            <span class="bg-slate-800 px-2 py-0.5 rounded text-slate-400">{{ scene.number }}</span>
            <span>{{ scene.title || `Scene ${scene.number}` }}</span>
            <span class="text-slate-600 text-xs">({{ scene.sentences.length }} sentences)</span>
          </h2>

          <!-- Sentences -->
          <div class="space-y-1">
            <template v-for="sent in scene.sentences" :key="sent.id">
              <!-- Beat label separator -->
              <div v-if="sent._showBeat" class="text-xs text-slate-500 italic py-2 pl-4 border-l-2 border-slate-700">
                {{ sent.beat_label }}
              </div>
              <!-- Sentence row -->
              <div class="bg-slate-800/40 border border-slate-800 hover:border-slate-600 rounded px-3 py-2 grid grid-cols-[32px_110px_1fr_auto] gap-3 items-start text-sm">
                <div class="text-slate-600 font-mono text-xs tabular-nums pt-0.5">{{ sent.global_order }}</div>
                <div class="text-slate-400 text-xs truncate pt-0.5" :title="sent.speaker">{{ sent.speaker }}</div>
                <div class="min-w-0">
                  <div class="text-slate-100 truncate" :title="sent.target_text">{{ sent.target_text }}</div>
                  <div class="text-slate-500 text-xs truncate" :title="sent.known_text">{{ sent.known_text }}</div>
                  <!-- Stage-1 explainer (inline, only when populated) -->
                  <div
                    v-if="sent.explainer_text"
                    class="text-amber-300/80 text-xs mt-1 italic leading-snug"
                    :title="sent.explainer_text"
                  >
                    <span class="text-amber-500/60 not-italic mr-1">ⓘ</span>{{ sent.explainer_text }}
                  </div>
                </div>
                <div class="flex gap-1 items-center pt-0.5">
                  <button
                    v-if="sent.target_audio_id"
                    @click="playAudio(sent.target_audio_id)"
                    :class="['px-2 py-1 text-xs rounded transition-colors', playingId === sent.target_audio_id ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-700 hover:bg-emerald-700 text-slate-300 hover:text-emerald-100']"
                    :title="`Play target (${targetName})`"
                  >{{ targetFlag }}</button>
                  <span v-else class="px-2 py-1 text-xs text-slate-600" title="No target audio">{{ targetFlag }}</span>
                  <button
                    v-if="sent.known_audio_id"
                    @click="playAudio(sent.known_audio_id)"
                    :class="['px-2 py-1 text-xs rounded transition-colors', playingId === sent.known_audio_id ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-700 hover:bg-emerald-700 text-slate-300 hover:text-emerald-100']"
                    :title="`Play known (${knownName})`"
                  >{{ knownFlag }}</button>
                  <span v-else class="px-2 py-1 text-xs text-slate-600" title="No known audio">{{ knownFlag }}</span>
                  <button
                    v-if="sent.explainer_audio_id"
                    @click="playAudio(sent.explainer_audio_id)"
                    :class="['px-2 py-1 text-xs rounded transition-colors', playingId === sent.explainer_audio_id ? 'bg-amber-700 text-amber-100' : 'bg-slate-700 hover:bg-amber-700 text-slate-300 hover:text-amber-100']"
                    title="Play Stage-1 explainer (mixed-language narration)"
                  >ⓘ</button>
                  <span
                    v-else-if="sent.explainer_text"
                    class="px-2 py-1 text-xs text-amber-500/40"
                    title="Explainer text generated; audio not yet rendered"
                  >ⓘ</span>
                  <button
                    v-if="sent.target_audio_id && sent.known_audio_id"
                    @click="playPair(sent.target_audio_id, sent.known_audio_id)"
                    :class="['px-2 py-1 text-xs rounded transition-colors bg-slate-700 hover:bg-emerald-700 text-slate-300 hover:text-emerald-100']"
                    title="Play target then known"
                  >⇉</button>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Hidden audio element -->
        <audio ref="audioEl" @ended="onAudioEnded"></audio>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { getApiUrl } from '@/services/api.js'
import { useAuth } from '@/composables/useAuth.js'

const route = useRoute()
const courseCode = route.params.courseCode
const slug = route.params.slug

// Flag + name for each SSi language code. England/Wales/Scotland use regional
// tag sequences — NOT 🇬🇧 — so an English course shows St George's cross.
const LANG_FLAGS = {
  eng: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', cym: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', gae: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  spa: '🇪🇸', fra: '🇫🇷', deu: '🇩🇪', ita: '🇮🇹',
  por: '🇵🇹', por_br: '🇧🇷',
  zho: '🇨🇳', jpn: '🇯🇵', kor: '🇰🇷',
  ara: '🇸🇦', ara_sy: '🇸🇾', ara_eg: '🇪🇬', ara_lb: '🇱🇧',
  gle: '🇮🇪', nld: '🇳🇱', hrv: '🇭🇷',
}
const LANG_NAMES = {
  eng: 'English', cym: 'Welsh', gae: 'Scottish Gaelic',
  spa: 'Spanish', fra: 'French', deu: 'German', ita: 'Italian',
  por: 'Portuguese', por_br: 'Brazilian Portuguese',
  zho: 'Chinese', jpn: 'Japanese', kor: 'Korean',
  ara: 'Modern Standard Arabic', ara_sy: 'Syrian Arabic', ara_eg: 'Egyptian Arabic', ara_lb: 'Lebanese Arabic',
  gle: 'Irish', nld: 'Dutch', hrv: 'Croatian',
}
const [targetLang, knownLang] = String(courseCode).split('_for_')
const targetFlag = LANG_FLAGS[targetLang] || '🌐'
const knownFlag = LANG_FLAGS[knownLang] || '🌐'
const targetName = LANG_NAMES[targetLang] || targetLang || 'target'
const knownName = LANG_NAMES[knownLang] || knownLang || 'known'

const pod = ref(null)
const sentences = ref([])
const loading = ref(true)
const error = ref(null)
const audioEl = ref(null)
const playingId = ref(null)
const playQueue = ref([])

// Stage-1 explainer state (text generation, audio is a separate pass)
const explainerBusy = ref(false)
const explainerStatus = ref('')
const explainerError = ref('')

const explainerCovered = computed(() =>
  sentences.value.filter(s => s.explainer_text && s.explainer_text.trim()).length
)
const explainerAudioCovered = computed(() =>
  sentences.value.filter(s => s.explainer_audio_id).length
)
const allExplained = computed(() =>
  sentences.value.length > 0 && explainerCovered.value === sentences.value.length
)

const hasMetadata = computed(() =>
  pod.value?.metadata && (pod.value.metadata.hosts?.length || pod.value.metadata.register || pod.value.metadata.status)
)

// Group sentences by scene + annotate beat-label separators
const groupedScenes = computed(() => {
  const byScene = new Map()
  for (const s of sentences.value) {
    if (!byScene.has(s.scene_number)) {
      byScene.set(s.scene_number, {
        number: s.scene_number,
        title: getSceneTitle(s.scene_number),
        sentences: [],
      })
    }
    byScene.get(s.scene_number).sentences.push(s)
  }
  // Annotate beat changes
  for (const scene of byScene.values()) {
    let prevBeat = null
    for (const s of scene.sentences) {
      s._showBeat = s.beat_label && s.beat_label !== prevBeat
      prevBeat = s.beat_label
    }
  }
  return [...byScene.values()].sort((a, b) => a.number - b.number)
})

function getSceneTitle(sceneNum) {
  const sections = pod.value?.metadata?.sections
  if (Array.isArray(sections)) {
    const s = sections.find(x => x.number === sceneNum)
    if (s) return s.title
  }
  return null
}

function podTypeClass(type) {
  if (type === 'core') return 'bg-emerald-900/40 text-emerald-300 border border-emerald-700'
  return 'bg-purple-900/40 text-purple-300 border border-purple-700'
}

async function getSignedUrl(audioId) {
  const res = await fetch(`${getApiUrl()}/api/production/${courseCode}/audio/${audioId}/url`, {
    headers: { 'ngrok-skip-browser-warning': 'true' },
  })
  if (!res.ok) throw new Error(`signed url failed (${res.status})`)
  const data = await res.json()
  return data.url
}

async function playAudio(audioId) {
  try {
    playingId.value = audioId
    const url = await getSignedUrl(audioId)
    if (!audioEl.value) return
    audioEl.value.src = url
    await audioEl.value.play()
  } catch (err) {
    console.error('[Pod] play error:', err)
    playingId.value = null
  }
}

function playPair(targetId, knownId) {
  playQueue.value = [targetId, knownId]
  playNext()
}

function playNext() {
  if (playQueue.value.length === 0) {
    playingId.value = null
    return
  }
  const next = playQueue.value.shift()
  playAudio(next)
}

function onAudioEnded() {
  if (playQueue.value.length > 0) playNext()
  else playingId.value = null
}

async function loadPod() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${getApiUrl()}/api/pods/${courseCode}/${slug}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
    if (!res.ok) throw new Error(`Failed to load pod (${res.status})`)
    const data = await res.json()
    pod.value = data.pod
    sentences.value = data.sentences || []
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Admin-gated helper for the explainer endpoint. Mirrors the pattern in
// RemoteControl / Maintenance — fetch a fresh access token, attach Bearer.
const { getAccessToken } = useAuth()
async function authedFetch(path, init = {}) {
  const token = await getAccessToken()
  const headers = {
    'ngrok-skip-browser-warning': 'true',
    'Content-Type': 'application/json',
    ...(init.headers || {}),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${getApiUrl()}${path}`, { ...init, headers })
}

/**
 * Generate Stage-1 explainer text for every sentence in this pod.
 *   force=false (Generate)      — picks up only sentences with NULL explainer_text.
 *   force=true  (Regenerate all) — re-runs every sentence, overwriting existing
 *                                  text. Used after a prompt change.
 * Polls the resumable backend endpoint until more_remaining is false,
 * reloading the pod between batches so the inline display lights up live.
 */
async function generateExplainers(force) {
  if (explainerBusy.value) return
  explainerBusy.value = true
  explainerStatus.value = force ? 'Regenerating all sentences…' : 'Generating explainers…'
  explainerError.value = ''
  let totalUpdated = 0
  let totalFailed = 0
  try {
    // Resumable poll loop — endpoint caps itself at 60s wall time per call.
    // Keep going until it tells us we're exhausted, or until we hit a hard
    // failure ceiling so a runaway can't loop forever.
    for (let pass = 0; pass < 50; pass++) {
      const res = await authedFetch('/api/admin/pod-explainer-generate', {
        method: 'POST',
        body: JSON.stringify({ podId: pod.value?.id, force, limit: 200 }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
      totalUpdated += body.updated || 0
      totalFailed += body.failed || 0
      explainerStatus.value =
        `updated ${totalUpdated}, failed ${totalFailed}` +
        (body.more_remaining ? ' · more remaining, continuing…' : ' · done.')
      await loadPod() // refresh the inline rows so progress is visible
      if (!body.more_remaining) break
    }
  } catch (err) {
    explainerError.value = err?.message || String(err)
  } finally {
    explainerBusy.value = false
    if (!explainerError.value) explainerStatus.value += ' ✓'
  }
}

onMounted(loadPod)

onUnmounted(() => {
  if (audioEl.value) { audioEl.value.pause(); audioEl.value.src = '' }
})
</script>
