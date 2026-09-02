<template>
  <div class="chunk-notes">
    <!-- ══ CLOSED — ONE SCANNABLE LINE ══
         Deterministic is 142 of the 205 Welsh chunks, so the eye must not land
         on it. Split, inversion and erasure carry the weight, because those are
         the cuts somebody argued about and the ones Tom is here to review. -->
    <button type="button" class="chip notes-chip" :class="{ on: open }" @click="open = !open">
      <span class="chip-lead">chunk mapping</span>
      <template v-if="parsed.ok">
        <span
          v-for="seg in segments"
          :key="seg.key"
          class="seg"
          :class="{ contested: seg.contested }"
          :title="seg.label || ''"
        >{{ seg.text }}</span>
      </template>
      <span v-else class="seg contested" title="the note does not read as a chunk table">note, unparsed</span>
      <span v-if="dirty" class="seg unsaved-seg">unsaved</span>
      <span class="text-faint">{{ open ? '▲' : '▼' }}</span>
    </button>

    <div v-if="open" class="notes-body">
      <!-- ══ EDITING — THE RAW NOTE, NEVER A REGENERATED GRID ══
           ScriptLineCell is the SAME editor as the canonical and target fields:
           same parked draft, same explicit Save, same Esc and Ctrl/⌘+Enter, same
           versioned route. What it holds is the stored string exactly as stored,
           so a save writes the author's own words back and nothing of ours. -->
      <ScriptLineCell v-if="ed.isEditing(step, 'notes')" :step="step" :col="NOTES_COLUMN" :ed="ed" />

      <template v-else>
        <p v-if="parsed.header" class="notes-header text-faint">{{ parsed.header }}</p>

        <table v-if="parsed.ok" class="chunk-table">
          <tbody>
            <tr v-for="(c, i) in parsed.chunks" :key="i">
              <td class="c-chunk">{{ c.chunk || '—' }}</td>
              <td class="c-arrow text-faint">→</td>
              <td class="c-target">{{ c.target || '—' }}</td>
              <td class="c-class">
                <span v-if="c.klass" class="klass" :class="'k-' + c.klass" :title="c.label">{{ c.klass }}</span>
                <span v-else class="klass k-none" title="no class recorded on this chunk">·</span>
              </td>
              <td class="c-note text-muted">{{ c.note }}</td>
            </tr>
          </tbody>
        </table>

        <!-- An unreadable note is shown as the words it is. Blanking the panel
             or throwing would hide a human's working text behind our parser. -->
        <pre v-if="!parsed.ok" class="raw-note">{{ text }}</pre>
        <div v-else-if="parsed.unparsed.length" class="raw-note leftover">
          <p class="text-faint text-xs">not read as chunk rows, shown as written:</p>
          <p v-for="(l, i) in parsed.unparsed" :key="i">{{ l }}</p>
        </div>

        <div class="notes-foot">
          <button type="button" class="btn-raw" @click="ed.startEdit(step, 'notes', $event)">
            {{ dirty ? 'Carry on editing the raw note' : 'Edit the raw note' }}
          </button>
          <span class="text-xs text-faint">the note is saved as text, exactly as written — nothing above is written back</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
/**
 * THE CHUNK MAPPING A POD LINE CARRIES, MADE REVIEWABLE.
 *
 * Every Welsh health seed records WHY each English chunk maps to the Welsh it
 * maps to — 205 decisions across 57 lines — on the row's author_notes, versioned
 * and editable through a route that already works, and until now rendered
 * nowhere. This panel is the render path. Tom reviews DECISIONS here, not just
 * sentences; Aran and Catrin correct them.
 *
 * IT KEYS OFF THE PRESENCE OF THE NOTE, NEVER OFF A POD SLUG. The Italian pair
 * overlay lands next and must light this up with nobody touching this file.
 *
 * AND IT NEVER WRITES THE GRID BACK. The table above is a reading of the note;
 * the editor below holds the raw string. A structured editor that re-serialised
 * would replace a human's working words with our format, silently, for every
 * later reader — which is the one outcome this panel exists to avoid.
 */
import { ref, computed } from 'vue'
import ScriptLineCell from './ScriptLineCell.vue'
import { parseChunkNote, chipSegments } from '@/lib/scriptlab/chunkNotes.js'

const props = defineProps({
  step: { type: Object, required: true },
  /** The parent view's editing surface — the same handlers the other fields use. */
  ed: { type: Object, required: true }
})

const open = ref(false)

const NOTES_COLUMN = {
  key: 'notes',
  label: 'Chunk mapping — raw note',
  field: 'notes',
  editable: true,
  saveLabel: 'Save chunk mapping'
}

/* A parked draft is what the panel reads, so the grid shows the words you typed
   and have not yet saved — the same rule the canonical and target cells follow. */
const text = computed(() => props.ed.displayText(props.step, 'notes') || '')
const parsed = computed(() => parseChunkNote(text.value))
const segments = computed(() => chipSegments(parsed.value))
const dirty = computed(() => props.ed.isDirty(props.step, 'notes'))
</script>

<style scoped>
@import '@/styles/script-rows.css';

.chunk-notes { padding: 2px 0 8px; }

/* .chip lives in ScriptLabScriptView's SCOPED styles, so it does not reach a
   child component's inner elements. The pill is restated here rather than
   hoisted into script-rows.css, which CanonicalPodView also reads. */
.notes-chip {
  min-height: 32px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 1.2;
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 8px;
  text-align: left;
  cursor: pointer;
}
.notes-chip.on { background: color-mix(in srgb, var(--accent) 22%, transparent); }
.chip-lead { color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; font-size: 10px; }
.seg { color: var(--muted); }
/* Split, inversion and erasure are 63 of 205 and are the whole reason to look. */
.seg.contested { color: var(--accent-2); font-weight: 700; }
.seg.unsaved-seg { color: var(--accent); font-weight: 700; }

.notes-body {
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--surface-2);
}
.notes-header { font-size: 0.68rem; margin-bottom: 6px; }

.chunk-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
.chunk-table td { padding: 4px 8px 4px 0; vertical-align: top; border-bottom: 1px solid color-mix(in srgb, var(--line) 55%, transparent); }
.chunk-table tr:last-child td { border-bottom: 0; }
.c-chunk { color: var(--ink); width: 22%; }
.c-arrow { width: 1.2rem; text-align: center; }
.c-target { color: var(--ink); width: 26%; }
.c-class { width: 1.8rem; text-align: center; }
.c-note { width: 44%; font-size: 0.74rem; line-height: 1.45; }

.klass {
  display: inline-block;
  min-width: 1.25rem;
  padding: 1px 4px;
  border-radius: 4px;
  font-size: 0.68rem;
  font-weight: 700;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
}
/* Deterministic recedes; the three contested classes are the ones that read. */
.k-D { color: var(--faint); }
.k-S, .k-I, .k-E {
  color: var(--accent-2);
  background: color-mix(in srgb, var(--accent-2) 14%, transparent);
}
.k-none { color: var(--faint); }

.raw-note { white-space: pre-wrap; font-size: 0.75rem; color: var(--muted); margin: 0; }
.raw-note.leftover { margin-top: 8px; }

.notes-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 10px; }
.btn-raw {
  min-height: 32px;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
  background: transparent;
}

@media (max-width: 760px) {
  .chunk-table, .chunk-table tbody, .chunk-table tr, .chunk-table td { display: block; width: auto; }
  .chunk-table tr { padding: 6px 0; border-bottom: 1px solid color-mix(in srgb, var(--line) 55%, transparent); }
  .chunk-table td { border-bottom: 0; padding: 1px 0; }
  .chunk-table .c-arrow { display: none; }
  .c-target::before { content: '→ '; color: var(--faint); }
  .c-class { text-align: left; }
}
</style>
