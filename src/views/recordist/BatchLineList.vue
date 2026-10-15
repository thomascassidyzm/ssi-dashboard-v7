<template>
  <!-- EVERY LINE OF THIS BATCH, ONE PER ROW, READABLE WITHOUT A MOUSE (Aran, 2026-10-15: the
       Lines & settings panel drew the batch as grey squares that needed a mouse-over to read).
       Number, the words, the other language small beneath, and a dot in the rail's colours.
       Tapping the WORDS puts the cursor on that line. ▶ only plays — it never moves the cursor.
       Again / Record opens the mic on that line. -->
  <section class="bl" data-test="batch-lines">
    <ul class="bl-legend" aria-hidden="true">
      <li v-for="k in LEGEND" :key="k.state"><i class="bl-dot" :class="k.state"></i>{{ k.words }}</li>
    </ul>
    <ol class="bl-list">
      <li
        v-for="r in rows" :key="r.id"
        class="bl-row" :class="{ now: r.id === currentId, playing: playingId === r.id }"
        :data-line-id="r.id"
        data-test="batch-line"
      >
        <button type="button" class="bl-main" :aria-current="r.id === currentId ? 'true' : null"
                :aria-label="`Go to line ${r.n}: ${r.text} (${STATE_WORDS[r.state]})`"
                data-test="batch-line-go" @click="$emit('jump', r.id)">
          <span class="bl-n">{{ r.n }}</span>
          <i class="bl-dot" :class="r.state" :title="STATE_WORDS[r.state]"></i>
          <span class="bl-words">
            <span class="bl-text">{{ r.text }}</span>
            <small v-if="r.known" class="bl-known">{{ r.known }}</small>
          </span>
        </button>
        <span class="bl-acts">
          <button v-if="r.playable" type="button" class="bl-play" data-test="batch-line-play"
                  :aria-label="playingId === r.id ? 'Stop' : `Hear your take of line ${r.n}`"
                  @click="$emit('play', r.id)">{{ playingId === r.id ? '■' : '▶' }}</button>
          <button type="button" class="bl-again" data-test="batch-line-record"
                  @click="$emit('record', r.id)">{{ r.hasTake ? 'Again' : 'Record' }}</button>
        </span>
      </li>
    </ol>
  </section>
</template>

<script setup>
/**
 * BatchLineList — the batch as a list a person can read on a phone.
 *
 * Pure presentation: the booth owns what each line's state is and where the
 * cursor is, and passes rows already worked out:
 *   { id, n, text, known, state: 'saved'|'uploading'|'refused'|'not-yet', hasTake, playable }
 * The four states and their colours are the rail's (RecordistRoom RAIL_LEGEND),
 * so the two pictures of the same batch can never disagree.
 */
defineProps({
  rows: { type: Array, required: true },
  currentId: { type: String, default: null },
  playingId: { type: String, default: null },
})
defineEmits(['jump', 'play', 'record'])

const STATE_WORDS = {
  saved: 'Saved on the server',
  uploading: 'Recorded, still uploading',
  refused: 'Refused, record again',
  'not-yet': 'Not recorded yet',
}
const LEGEND = [
  { state: 'saved', words: 'Saved' },
  { state: 'uploading', words: 'Uploading' },
  { state: 'refused', words: 'Refused' },
  { state: 'not-yet', words: 'Not yet' },
]
</script>

<style scoped>
.bl { margin: 0 0 1.25rem; }
.bl-legend { display: flex; flex-wrap: wrap; gap: 0.35rem 0.9rem; list-style: none; margin: 0 0 0.6rem; padding: 0; font-size: 0.8rem; color: var(--ink-2, #cbd5e1); }
.bl-legend li { display: inline-flex; align-items: center; gap: 0.35rem; }
.bl-list { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line, #334155); }
.bl-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.15rem 0.25rem; border-bottom: 1px solid var(--line, #334155); }
.bl-row.now { background: rgba(52, 211, 153, 0.14); box-shadow: inset 4px 0 0 #34d399; }
.bl-main {
  flex: 1; min-width: 0; display: flex; align-items: flex-start; gap: 0.55rem;
  background: none; border: 0; padding: 0.55rem 0.25rem; min-height: 48px; text-align: left;
  font: inherit; color: inherit; cursor: pointer;
}
.bl-n { flex: none; min-width: 2ch; font-size: 0.85rem; font-weight: 700; color: var(--ink-2, #cbd5e1); text-align: right; padding-top: 0.1rem; font-variant-numeric: tabular-nums; }
.bl-dot { flex: none; display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-top: 0.3rem; background: #475569; }
.bl-legend .bl-dot { margin-top: 0; }
.bl-dot.saved { background: #34d399; }
.bl-dot.uploading { background: #f59e0b; }
.bl-dot.refused { background: #f87171; }
.bl-words { display: flex; flex-direction: column; min-width: 0; }
.bl-text { font-size: 1rem; font-weight: 600; line-height: 1.3; overflow-wrap: anywhere; }
.bl-known { font-size: 0.8rem; color: var(--ink-2, #cbd5e1); line-height: 1.3; margin-top: 0.1rem; overflow-wrap: anywhere; }
.bl-acts { flex: none; display: flex; gap: 0.35rem; }
.bl-play, .bl-again {
  min-height: 40px; min-width: 40px; border-radius: 10px; cursor: pointer; font: inherit; font-weight: 700;
  background: transparent; color: inherit; border: 1px solid var(--line, #334155);
}
.bl-again { padding: 0 0.7rem; font-size: 0.85rem; }
.bl-row.playing .bl-play { background: #34d399; color: #0f172a; border-color: #34d399; }

:root[data-theme="light"] .bl-legend, :root[data-theme="light"] .bl-n, :root[data-theme="light"] .bl-known { color: #475569; }
:root[data-theme="light"] .bl-list, :root[data-theme="light"] .bl-row { border-color: #cbd5e1; }
:root[data-theme="light"] .bl-row.now { background: #ecfdf5; box-shadow: inset 4px 0 0 #047857; }
:root[data-theme="light"] .bl-dot { background: #cbd5e1; }
:root[data-theme="light"] .bl-dot.saved { background: #047857; }
:root[data-theme="light"] .bl-dot.uploading { background: #d97706; }
:root[data-theme="light"] .bl-dot.refused { background: #dc2626; }
:root[data-theme="light"] .bl-play, :root[data-theme="light"] .bl-again { border-color: #94a3b8; color: #0f172a; }
:root[data-theme="light"] .bl-row.playing .bl-play { background: #047857; color: #fff; border-color: #047857; }
</style>
