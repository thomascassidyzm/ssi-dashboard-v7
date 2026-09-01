<template>
  <div class="min-h-screen bg-canvas text-ink p-8">
    <div class="max-w-6xl mx-auto">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-3 mb-4 text-sm">
        <router-link to="/" class="text-accent-2 hover:opacity-80">Home</router-link>
        <span class="text-faint">/</span>
        <router-link :to="`/production/${courseCode}/pods`" class="text-accent-2 hover:opacity-80">Pods</router-link>
        <span class="text-faint">/</span>
        <span class="text-muted">Canonical · {{ slug }}</span>
      </div>

      <h1 class="text-3xl font-bold text-accent-2 mb-1">Canonical scenarios</h1>
      <p class="text-muted text-sm mb-1">
        The language-neutral <strong>English master</strong> for <code class="text-accent-2">{{ slug }}</code>.
        Edit these and every course's generated pod flexes from them.
      </p>
      <p class="text-accent text-xs mb-6">
        Shared across all courses — edits here change the source, not any generated pod (regenerate a pod to pull changes).
      </p>

      <div v-if="loading" class="text-faint py-12 text-center">Loading…</div>
      <div v-else-if="error" class="error-box border rounded-lg p-4">{{ error }}</div>

      <div v-else class="space-y-6">
        <div class="text-xs text-faint -mt-3">{{ scenes.length }} scenes · {{ scenes.reduce((a, s) => a + s.lines.length, 0) }} lines</div>
        <div v-for="(scene, idx) in scenes" :key="scene.number" class="bg-surface border border-line rounded-lg overflow-hidden">
          <div class="px-5 py-3 border-b border-line flex items-baseline gap-3">
            <span class="text-xs font-mono text-accent-2 bg-surface-2 border border-line px-1.5 py-0.5 rounded flex-shrink-0" title="position in the pod">{{ idx + 1 }}/{{ scenes.length }}</span>
            <span class="text-xs font-mono text-faint" title="canonical scenario label">{{ scene.label || ('Scene ' + scene.number) }}</span>
            <span class="font-semibold text-ink">{{ scene.title }}</span>
            <span v-if="scene.subtitle" class="text-xs italic text-faint">{{ scene.subtitle }}</span>
            <span class="ml-auto text-xs text-faint">{{ scene.lines.length }} lines</span>
          </div>
          <table class="script-table">
            <thead>
              <tr>
                <th class="col-ref">#</th>
                <th class="col-speaker">Speaker</th>
                <th class="col-canonical">Canonical English</th>
                <th class="col-state">State</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, i) in scene.lines" :key="line.id" class="script-row" :class="{ 'row-alt': i % 2 === 1, dirty: isDirty(line) }">
                <td class="col-ref"><span class="ref-num">{{ line.global_order }}</span></td>
                <td class="col-speaker" :title="line.speaker">{{ line.speaker }}</td>
                <td class="col-canonical">
                  <!-- RESTING: the whole line, wrapped, never clipped. -->
                  <div v-if="!isEditing(line)" class="canonical-read" @click="startEdit(line)">
                    <span class="canonical-text">{{ line.english_text }}</span>
                    <span class="edit-hint">tap to edit</span>
                  </div>
                  <!-- EDITING: the draft is local; only the explicit button writes. -->
                  <div v-else class="canonical-edit">
                    <textarea
                      :ref="el => registerGrower(el, line.id)"
                      v-model="drafts[line.id]"
                      class="canonical-input"
                      rows="1"
                      @input="autoGrow($event.target)"
                      @keydown.escape.prevent="discardEdit(line)"
                      @keydown.enter.ctrl.prevent="commitEdit(line)"
                      @keydown.enter.meta.prevent="commitEdit(line)"
                    />
                    <p v-if="isDirty(line)" class="was-line"><span class="was-label">was</span> {{ line.english_text }}</p>
                    <div class="confirm-bar">
                      <button type="button" class="btn-confirm" :disabled="!isDirty(line) || line._saving" @click="commitEdit(line)">
                        {{ line._saving ? 'Saving…' : 'Save canonical' }}
                      </button>
                      <button type="button" class="btn-discard" @click="discardEdit(line)">Discard</button>
                      <span v-if="isDirty(line)" class="unsaved-flag">unsaved — nothing is written until you save</span>
                      <span v-else class="text-xs text-faint">no change yet · Esc closes · Ctrl/⌘+Enter saves</span>
                    </div>
                  </div>
                </td>
                <td class="col-state">
                  <div class="state-stack">
                    <span v-if="line._saving" class="text-accent text-xs">saving…</span>
                    <span v-else-if="line._saved" class="text-accent-2 text-xs">saved ✓</span>
                    <span v-else-if="line._err" class="text-danger text-xs" :title="line._err">error</span>
                    <span v-else-if="isDirty(line)" class="text-accent text-xs">unsaved</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { getApiUrl } from '@/services/api.js'
import { useAuth } from '@/composables/useAuth.js'

const route = useRoute()
const courseCode = route.params.courseCode
const slug = route.params.slug || 'pod-1'

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

/*
 * CANONICAL EDITING IS EXPLICIT — TWO STEPS, ALWAYS.
 *
 * This screen writes the English master every course's pod flexes from, over an
 * UNVERSIONED PATCH: there is no history to walk back to. So a blur, a stray
 * click or an accidental paste must never write. Tapping opens a draft held only
 * in `drafts`; the Save canonical button (or Ctrl/Cmd+Enter) is the only path to
 * the API; Escape discards.
 */
const drafts = reactive({})
const isEditing = line => Object.prototype.hasOwnProperty.call(drafts, line.id)
const isDirty = line => isEditing(line) && drafts[line.id] !== line.english_text

function startEdit(line) {
  drafts[line.id] = line.english_text ?? ''
  line._err = ''
  nextTick(() => autoGrow(growers[line.id]))
}
function discardEdit(line) {
  delete drafts[line.id]
}
async function commitEdit(line) {
  if (!isDirty(line)) { discardEdit(line); return }
  if (await saveLine(line, drafts[line.id])) delete drafts[line.id]
}

/* The row grows with its content — that is the point of the change. */
const growers = {}
function registerGrower(el, id) {
  if (el) { growers[id] = el; autoGrow(el) } else { delete growers[id] }
}
function autoGrow(el) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

function warnUnsaved(e) {
  if (!Object.keys(drafts).length) return
  e.preventDefault()
  e.returnValue = ''
}
onMounted(() => window.addEventListener('beforeunload', warnUnsaved))
onBeforeUnmount(() => window.removeEventListener('beforeunload', warnUnsaved))

/** Called ONLY from commitEdit — never from a blur. Returns true when stored. */
async function saveLine(line, value) {
  const text = String(value ?? '')
  if (text === line.english_text) return true
  line._saving = true; line._saved = false; line._err = ''
  try {
    const res = await authedFetch(`/api/admin/canonical-pods/${encodeURIComponent(line.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ english_text: text }),
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
    line.english_text = text
    line._saved = true
    setTimeout(() => { line._saved = false }, 2000)
    return true
  } catch (err) {
    line._err = err.message
    return false
  } finally {
    line._saving = false
  }
}

onMounted(load)
</script>

<style scoped>
@import '@/styles/script-rows.css';
/* Theme-aware error banner. Dark: deep red wash on dark; light: pale red wash, dark-red text. */
.error-box {
  color: var(--danger);
  border-color: var(--danger);
  background: color-mix(in srgb, var(--danger) 14%, var(--surface));
}
:root[data-theme="light"] .error-box {
  background: color-mix(in srgb, var(--danger) 8%, #ffffff);
}
</style>
