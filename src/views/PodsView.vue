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

const route = useRoute()
const courseCode = route.params.courseCode

const pods = ref([])
const loading = ref(true)
const error = ref(null)

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
