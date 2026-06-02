<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8">
    <div class="max-w-4xl mx-auto">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-3 mb-4 text-sm">
        <router-link to="/" class="text-emerald-400 hover:text-emerald-300">Home</router-link>
        <span class="text-slate-600">/</span>
        <router-link :to="`/production/${courseCode}/pods`" class="text-emerald-400 hover:text-emerald-300">Pods</router-link>
        <span class="text-slate-600">/</span>
        <span class="text-slate-400">Canonical · {{ slug }}</span>
      </div>

      <h1 class="text-3xl font-bold text-emerald-400 mb-1">Canonical scenarios</h1>
      <p class="text-slate-400 text-sm mb-1">
        The language-neutral <strong>English master</strong> for <code class="text-emerald-400">{{ slug }}</code>.
        Edit these and every course's generated pod flexes from them.
      </p>
      <p class="text-amber-300/80 text-xs mb-6">
        Shared across all courses — edits here change the source, not any generated pod (regenerate a pod to pull changes).
      </p>

      <div v-if="loading" class="text-slate-500 py-12 text-center">Loading…</div>
      <div v-else-if="error" class="bg-red-900/40 border border-red-700 rounded-lg p-4 text-red-200">{{ error }}</div>

      <div v-else class="space-y-6">
        <div v-for="scene in scenes" :key="scene.number" class="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div class="px-5 py-3 border-b border-slate-700 flex items-baseline gap-3">
            <span class="text-xs font-mono text-slate-500">{{ scene.label || ('Scene ' + scene.number) }}</span>
            <span class="font-semibold text-slate-100">{{ scene.title }}</span>
            <span v-if="scene.subtitle" class="text-xs italic text-slate-500">{{ scene.subtitle }}</span>
            <span class="ml-auto text-xs text-slate-600">{{ scene.lines.length }} lines</span>
          </div>
          <div class="divide-y divide-slate-700/60">
            <div v-for="line in scene.lines" :key="line.id" class="px-5 py-2.5 flex items-start gap-3 hover:bg-slate-700/20">
              <span class="text-xs font-mono text-slate-600 w-6 flex-shrink-0 pt-2">{{ line.global_order }}</span>
              <span class="text-xs text-slate-400 w-32 flex-shrink-0 truncate pt-2" :title="line.speaker">{{ line.speaker }}</span>
              <textarea
                v-model="line.english_text"
                rows="1"
                @focus="line._orig = line.english_text"
                @blur="saveLine(line)"
                class="flex-1 bg-slate-900/60 border border-slate-700 focus:border-emerald-500 rounded px-2 py-1.5 text-sm text-slate-100 resize-y outline-none"
              />
              <span class="w-16 flex-shrink-0 text-right pt-2 text-xs">
                <span v-if="line._saving" class="text-amber-400">saving…</span>
                <span v-else-if="line._saved" class="text-emerald-400">saved ✓</span>
                <span v-else-if="line._err" class="text-red-400" :title="line._err">error</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getApiUrl } from '@/services/api.js'
import { useAuth } from '@/composables/useAuth.js'

const route = useRoute()
const courseCode = route.params.courseCode
const slug = route.params.slug || 'pod-0'

const scenes = ref([])
const loading = ref(true)
const error = ref(null)

const { getAccessToken } = useAuth()
async function authedFetch(path, init = {}) {
  const token = await getAccessToken()
  const headers = { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json', ...(init.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${getApiUrl()}${path}`, { ...init, headers })
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await authedFetch(`/api/admin/canonical-pods/${slug}`)
    const body = await res.json()
    if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
    const byScene = new Map()
    for (const r of body.scenarios || []) {
      if (!byScene.has(r.scene_number)) {
        byScene.set(r.scene_number, { number: r.scene_number, label: r.scene_label, title: r.scene_title, subtitle: r.scene_subtitle, lines: [] })
      }
      byScene.get(r.scene_number).lines.push({ ...r, _saving: false, _saved: false, _err: '', _orig: r.english_text })
    }
    scenes.value = [...byScene.values()]
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function saveLine(line) {
  if (line.english_text === line._orig) return // unchanged
  line._saving = true; line._saved = false; line._err = ''
  try {
    const res = await authedFetch(`/api/admin/canonical-pods/${encodeURIComponent(line.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ english_text: line.english_text }),
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
    line._orig = line.english_text
    line._saved = true
    setTimeout(() => { line._saved = false }, 2000)
  } catch (err) {
    line._err = err.message
  } finally {
    line._saving = false
  }
}

onMounted(load)
</script>
