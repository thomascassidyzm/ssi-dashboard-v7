<template>
  <!-- "EDIT THIS LINE" (Aran, 2026-10-15, job #709): the words of a seed, LEGO or phrase, for
       Tom, Aran and Kai only. CHECK FIRST, THEN SAVE: Save does not exist until the change has
       been checked, and changing a word after the check takes Save away again. -->
  <div class="ble-scrim" data-test="line-editor" @click.self="$emit('close')">
    <section class="ble" role="dialog" aria-label="Edit this line">
      <header class="ble-head">
        <strong>Edit this line</strong>
        <button type="button" class="ble-x" aria-label="Close" data-test="ble-close" @click="$emit('close')">✕</button>
      </header>

      <p v-if="state === 'loading'" class="ble-note">Reading the line…</p>
      <p v-else-if="loadError" class="ble-error">{{ loadError }}</p>

      <template v-else-if="row">
        <p class="ble-where">{{ whereWords }}</p>

        <!-- A LIVE COURSE: the words, and nothing to change them with. -->
        <template v-if="!row.editable">
          <p class="ble-ro-label">Welsh</p>
          <p class="ble-ro" data-test="ble-ro-target">{{ row.targetText }}</p>
          <template v-if="row.knownText">
            <p class="ble-ro-label">English</p>
            <p class="ble-ro">{{ row.knownText }}</p>
          </template>
          <p class="ble-live" data-test="ble-live-note">This is a live course — {{ row.note }}.</p>
        </template>

        <template v-else-if="state !== 'saved' && state !== 'undone'">
          <label class="ble-label" for="ble-target">Welsh</label>
          <textarea id="ble-target" v-model="draftTarget" class="ble-box" rows="2" data-test="ble-target" :disabled="busy"></textarea>
          <template v-if="row.knownText">
            <label class="ble-label" for="ble-known">English</label>
            <textarea id="ble-known" v-model="draftKnown" class="ble-box" rows="2" data-test="ble-known" :disabled="busy"></textarea>
          </template>

          <div v-if="preview" class="ble-preview" data-test="ble-preview">
            <p v-for="c in preview.changes" :key="c.side" class="ble-change">
              <span class="ble-side">{{ c.side === 'target' ? 'Welsh' : 'English' }}</span>
              <s>{{ c.before }}</s> → <strong>{{ c.after }}</strong>
              <em>{{ c.wordsChanged ? 'the words change' : 'only capitals or punctuation change' }}</em>
            </p>
            <p class="ble-tiling" :class="tilingClass" data-test="ble-tiling">{{ tilingWords }}</p>
            <p class="ble-sub">Recordings</p>
            <ul v-if="preview.recordings.length" class="ble-recs" data-test="ble-recordings">
              <li v-for="r in preview.recordings" :key="r.slot" :class="'fate-' + r.fate">{{ cap(r.words) }}.</li>
            </ul>
            <p v-else class="ble-note">No recording of this line exists yet, so none is affected.</p>
          </div>

          <p v-if="error" class="ble-error" data-test="ble-error">{{ error }}</p>

          <div class="ble-actions">
            <button v-if="!preview" type="button" class="ble-go" data-test="ble-check" :disabled="busy || !dirty" @click="check">
              {{ state === 'checking' ? 'Checking…' : 'Check the change' }}
            </button>
            <button v-else type="button" class="ble-go" :class="{ warn: tilingBroken }" data-test="ble-save" :disabled="busy" @click="save">
              {{ state === 'saving' ? 'Saving…' : (tilingBroken ? 'Save anyway' : 'Save') }}
            </button>
            <button type="button" class="ble-ghost" :disabled="busy" @click="$emit('close')">Cancel</button>
          </div>
        </template>

        <!-- SAVED: what happened, and a one-tap Undo that replays the door's own undo. -->
        <template v-else-if="state === 'saved'">
          <p class="ble-done" data-test="ble-saved">Saved.</p>
          <ul v-if="saved.recordings.length" class="ble-recs">
            <li v-for="r in saved.recordings" :key="r.slot" :class="'fate-' + r.fate">{{ cap(r.words) }}.</li>
          </ul>
          <p v-if="!saved.undoFile" class="ble-error">The edit door kept no undo for this edit{{ saved.undoFileError ? `: ${saved.undoFileError}` : '' }}.</p>
          <p v-if="error" class="ble-error">{{ error }}</p>
          <div class="ble-actions">
            <button v-if="saved.undoFile" type="button" class="ble-ghost" data-test="ble-undo" :disabled="busy" @click="undo">
              {{ busy ? 'Undoing…' : 'Undo' }}
            </button>
            <button type="button" class="ble-go" @click="$emit('close')">Done</button>
          </div>
        </template>
        <template v-else>
          <p class="ble-done" data-test="ble-undone">Undone — the line and its takes are as they were.</p>
          <div class="ble-actions"><button type="button" class="ble-go" @click="$emit('close')">Done</button></div>
        </template>
      </template>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { readLine, previewEdit, applyEdit, undoEdit } from './line-edit-api.js'

const props = defineProps({ line: { type: Object, required: true } })
const emit = defineEmits(['close', 'applied', 'undone'])

const state = ref('loading') // loading | ready | checking | saving | saved | undoing | undone
const row = ref(null)
const loadError = ref(null)
const error = ref(null)
const draftTarget = ref('')
const draftKnown = ref('')
const preview = ref(null)
const saved = ref(null)
const busy = computed(() => ['checking', 'saving', 'undoing'].includes(state.value))

const KIND = { seed: 'Seed sentence', lego: 'LEGO', phrase: 'Practice phrase' }
const whereWords = computed(() => {
  const r = row.value
  if (!r) return ''
  const bits = [KIND[r.kind] || 'Line']
  if (r.seedNumber) bits.push(`seed ${r.seedNumber}`)
  if (r.legoId) bits.push(r.legoId)
  bits.push(r.courseCode)
  return bits.join(' · ')
})
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s)

function edit() {
  const out = {}
  if (draftTarget.value.trim() !== (row.value.targetText || '').trim()) out.targetText = draftTarget.value
  if (row.value.knownText && draftKnown.value.trim() !== (row.value.knownText || '').trim()) out.knownText = draftKnown.value
  return out
}
const dirty = computed(() => !!row.value && Object.keys(edit()).length > 0)
// A word changed after the check: the check no longer describes what Save would do.
watch([draftTarget, draftKnown], () => { if (state.value === 'ready') preview.value = null })

const tilingBroken = computed(() => !!(preview.value && preview.value.tiling && preview.value.tiling.checked && !preview.value.tiling.valid))
const tilingWords = computed(() => {
  const t = preview.value && preview.value.tiling
  if (!t) return ''
  return t.checked ? t.message : `Tiling not checked: ${t.reason}`
})
const tilingClass = computed(() => (tilingBroken.value ? 'bad' : (preview.value?.tiling?.checked ? 'good' : 'plain')))

onMounted(async () => {
  try {
    row.value = await readLine(props.line.id)
    draftTarget.value = row.value.targetText || ''
    draftKnown.value = row.value.knownText || ''
    state.value = 'ready'
  } catch (e) {
    loadError.value = e.message
    state.value = 'ready'
  }
})

async function check() {
  error.value = null
  state.value = 'checking'
  try {
    preview.value = await previewEdit(props.line.id, edit())
  } catch (e) {
    error.value = e.message
  }
  state.value = 'ready'
}

async function save() {
  error.value = null
  const sent = edit()
  state.value = 'saving'
  try {
    const out = await applyEdit(props.line.id, sent)
    saved.value = out
    state.value = 'saved'
    emit('applied', {
      lineId: props.line.id,
      targetText: sent.targetText !== undefined ? sent.targetText.trim() : row.value.targetText,
      knownText: sent.knownText !== undefined ? sent.knownText.trim() : row.value.knownText,
      recordings: out.recordings || [],
    })
  } catch (e) {
    error.value = e.message
    state.value = 'ready'
  }
}

async function undo() {
  error.value = null
  state.value = 'undoing'
  try {
    await undoEdit(saved.value.courseCode, saved.value.undoFile)
    state.value = 'undone'
    emit('undone', { lineId: props.line.id })
  } catch (e) {
    error.value = e.message
    state.value = 'saved'
  }
}
</script>

<style scoped>
.ble-scrim { position: fixed; inset: 0; z-index: 60; display: flex; align-items: flex-start; justify-content: center; padding: 4vh 0.75rem; background: rgba(15, 23, 42, 0.45); overflow-y: auto; }
.ble { width: 100%; max-width: 34rem; background: var(--surface); color: var(--ink); border: 1px solid var(--line); border-radius: 14px; padding: 0.9rem 1rem 1rem; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.25); }
.ble-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.25rem; }
.ble-x { min-width: 44px; min-height: 44px; background: none; border: 0; color: var(--muted); font-size: 1.1rem; cursor: pointer; }
.ble-where { margin: 0 0 0.6rem; font-size: 0.8rem; color: var(--muted); }
.ble-label, .ble-ro-label, .ble-sub { display: block; margin: 0.6rem 0 0.2rem; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted); }
.ble-box { width: 100%; box-sizing: border-box; font: inherit; font-size: 1.15rem; line-height: 1.35; padding: 0.5rem 0.6rem; border-radius: 10px; border: 1px solid var(--line); background: var(--surface-2); color: var(--ink); resize: vertical; }
.ble-ro { margin: 0; font-size: 1.15rem; }
.ble-live { margin: 0.8rem 0 0; padding: 0.55rem 0.7rem; border-radius: 10px; border: 1px solid var(--accent); color: var(--ink); background: var(--surface-2); }
.ble-preview { margin-top: 0.8rem; padding: 0.6rem 0.7rem; border-radius: 10px; border: 1px solid var(--line); background: var(--surface-2); }
.ble-change { margin: 0 0 0.35rem; line-height: 1.4; }
.ble-change s { color: var(--muted); }
.ble-change em { display: block; font-size: 0.8rem; color: var(--muted); }
.ble-side { font-size: 0.75rem; font-weight: 700; color: var(--muted); margin-right: 0.35rem; }
.ble-tiling { margin: 0.35rem 0; font-weight: 600; }
.ble-tiling.good { color: var(--success); }
.ble-tiling.bad { color: var(--danger); }
.ble-tiling.plain { color: var(--muted); font-weight: 400; }
.ble-recs { margin: 0; padding-left: 1.1rem; }
.ble-recs li { margin: 0.15rem 0; }
.ble-recs .fate-requeued { color: var(--accent); font-weight: 600; }
.ble-note { color: var(--muted); margin: 0.3rem 0; }
.ble-error { color: var(--danger); margin: 0.5rem 0 0; }
.ble-done { font-weight: 700; color: var(--success); margin: 0.4rem 0; }
.ble-actions { display: flex; gap: 0.6rem; margin-top: 0.9rem; flex-wrap: wrap; }
.ble-go, .ble-ghost { min-height: 44px; padding: 0 1.1rem; border-radius: 10px; font: inherit; font-weight: 700; cursor: pointer; }
/* White on emerald-700 in both themes (Aran's ruling on every green button, job #411/#700). */
.ble-go { background: #047857; color: #fff; border: 0; }
.ble-go.warn { background: #b45309; }
.ble-go:disabled, .ble-ghost:disabled { opacity: 0.55; cursor: default; }
.ble-ghost { background: transparent; color: var(--ink); border: 1px solid var(--line); }
</style>
