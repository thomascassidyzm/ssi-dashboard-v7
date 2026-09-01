<template>
  <!-- The mobile-only column label. At ≤760px script-rows.css turns every <td>
       into a block and drops the <thead>, so without this the three content
       columns stack into an unlabelled wall of sentences. -->
  <span class="cell-label">{{ col.label }}</span>

  <!-- ══ READ-ONLY COLUMN ══
       A column with no field behind it in the database. It renders text and
       accepts no tap, because a cell that looks editable, is typed into and
       writes nowhere is the worst thing this page could do. -->
  <div v-if="!col.editable" class="ro-cell">
    <span class="canonical-text" :dir="dirFor(readOnlyText)">{{ readOnlyText || '—' }}</span>
    <span v-if="col.mirrorsCanonical" class="mirror-note" :title="col.mirrorNote">= canonical</span>
  </div>

  <!-- ══ EDITABLE COLUMN, WITH A FIELD PRESENT ON THIS LINE ══
       The editing behaviour is NOT reimplemented here: every handler and every
       piece of state comes from the parent view through `ed`, so tap-to-open,
       one-editor-at-a-time, the parked draft and the explicit Save are exactly
       the ones that live in ScriptLabScriptView.vue. -->
  <template v-else-if="present">
    <!-- RESTING: the whole line, wrapped, never clipped. One tap opens it. -->
    <div
      v-if="!ed.isEditing(step, col.field)"
      class="canonical-read"
      :class="{ parked: ed.isDirty(step, col.field) }"
      @click="ed.startEdit(step, col.field, $event)"
    >
      <span class="canonical-text" :dir="dirFor(ed.displayText(step, col.field))">{{ ed.displayText(step, col.field) || '—' }}</span>
      <span v-if="ed.isDirty(step, col.field)" class="edit-hint unsaved">unsaved · tap to carry on</span>
      <span v-else class="edit-hint">tap to edit</span>
    </div>

    <!-- EDITING: the draft is held locally. Blur does NOT save. -->
    <div v-else class="canonical-edit">
      <textarea
        :ref="el => ed.registerGrower(el, col.field + ':' + step.payload.id)"
        v-model="ed.drafts[col.field + ':' + step.payload.id]"
        class="canonical-input"
        :dir="dirFor(ed.drafts[col.field + ':' + step.payload.id] || '')"
        rows="1"
        @input="ed.autoGrow($event.target)"
        @keydown.escape.prevent="ed.discardEdit(step, col.field)"
        @keydown.enter.ctrl.prevent="ed.commitEdit(step, col.field)"
        @keydown.enter.meta.prevent="ed.commitEdit(step, col.field)"
      />
      <p v-if="ed.isDirty(step, col.field)" class="was-line">
        <span class="was-label">was</span> {{ ed.stored(step, col.field) }}
      </p>
      <div class="confirm-bar">
        <button
          type="button"
          class="btn-confirm"
          :disabled="!ed.isDirty(step, col.field) || step.payload._saving"
          @click="ed.commitEdit(step, col.field)"
        >{{ step.payload._saving ? 'Saving…' : saveLabel }}</button>
        <button type="button" class="btn-discard" @click="ed.discardEdit(step, col.field)">Discard</button>
        <span v-if="ed.isDirty(step, col.field)" class="unsaved-flag">unsaved — nothing is written until you save</span>
        <span v-else class="text-xs text-faint">no change yet · Esc closes · Ctrl/⌘+Enter saves</span>
      </div>
    </div>
  </template>

  <!-- ══ EDITABLE COLUMN, NOTHING ON THIS LINE ══
       A target with text but no declared language: shown, and said to be a
       specimen rather than an editable overlay, because saving it would file
       words under a language nobody declared. -->
  <p v-else-if="strandedText" class="ro-cell">
    <span class="canonical-text" :dir="dirFor(strandedText)">{{ strandedText }}</span>
    <span class="mirror-note">specimen · no language declared</span>
  </p>
  <p v-else class="empty-cell">—</p>
</template>

<script setup>
/**
 * ONE CONTENT COLUMN OF A POD LINE — canonical, known, or a target overlay.
 *
 * The page is CANONICAL || KNOWN || TARGET across the width, and the overlay
 * columns come from a LIST of descriptors rather than hand-written cells, so
 * that the day North Welsh and South Welsh sit over one canonical, that is one
 * more entry in an array and not a rebuilt component. Pod content is SHARED
 * across dialect courses — two target columns over one canonical, never a fork.
 *
 * A descriptor is:
 *   { key, label, field, editable, lang?, saveLabel?, mirrorsCanonical?, mirrorNote? }
 *
 * `field` is the key the parent's editor uses (`english` / `target`), which maps
 * to the DB column in ScriptLabScriptView's FIELDS. A descriptor with
 * `editable: false` has NO field behind it and renders read-only.
 */
import { computed } from 'vue'
import { dirFor } from '@/utils/textDirection.js'

const props = defineProps({
  step: { type: Object, required: true },
  col: { type: Object, required: true },
  /** The parent view's editing surface — handlers and state, never re-made here. */
  ed: { type: Object, required: true }
})

/** Read-only columns read from the payload key the descriptor names. */
const readOnlyText = computed(() => {
  const src = props.col.readsFrom || 'text'
  return props.step.payload[src] ?? ''
})

/** An overlay column is offered on a line only where that line HAS the layer. */
const present = computed(() => {
  if (props.col.field !== 'target') return true
  return !!props.step.payload.targetLang
})

const strandedText = computed(() =>
  props.col.field === 'target' && !props.step.payload.targetLang ? (props.step.payload.target || '') : ''
)

const saveLabel = computed(() => {
  if (typeof props.col.saveLabel === 'function') return props.col.saveLabel(props.step)
  return props.col.saveLabel || `Save ${props.col.label}`
})
</script>

<style scoped>
@import '@/styles/script-rows.css';

.ro-cell { line-height: 1.5; }
/* Canonical and known coincide on every *_for_eng course, and that duplication
   is deliberate — the point is seeing the line you cannot change beside the one
   you can. The marker says WHY the two columns read the same, so nobody reads
   it as a bug. */
.mirror-note {
  display: block;
  margin-top: 4px;
  font-size: 0.68rem;
  color: var(--faint);
  font-style: italic;
}
.empty-cell { color: var(--faint); }
/* Desktop keeps its <thead>; the per-cell label is a phone affordance only. */
.cell-label { display: none; }
@media (max-width: 760px) {
  .cell-label {
    display: block;
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--faint);
    margin-bottom: 2px;
  }
}
</style>
