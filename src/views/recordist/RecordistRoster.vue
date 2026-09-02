<template>
  <div class="roster" data-surface="recordist-roster-2026-09-02">
    <!-- THE RUN, AT A GLANCE. One mark per line, filled for done and hollow for
         outstanding, in queue order. A phone at arm's length reads this without
         reading anything: Catrin's 161 Welsh lines fit in a few rows of marks,
         and "how far am I" is answered before any words are. -->
    <div class="strip" :title="`${takeCount} recorded, ${freshCount} still to read`">
      <span
        v-for="r in allRows"
        :key="r.id"
        class="tick"
        :class="{ done: r.done }"
      ></span>
    </div>
    <!-- THE CAPTION FOR THE MARKS, AND THE HONEST TOTAL. Two numbers that add
         up to the whole run, and no third. It briefly carried "N of those to
         read again", which was true of the takes we had rejected — and Tom
         ruled on 2026-09-02 that a rejected take is not something the reader
         is shown at all. Recorded, and still to read. -->
    <p class="strip-words">
      <strong>{{ takeCount }} recorded</strong> · {{ freshCount }} still to read
    </p>

    <!-- THE MAP, AND IT IS THE POINT OF THIS COMPONENT. Tom, 2026-09-02, looking
         at Aran's link: "441 lines? why so many??? there's only 231 lines in
         POD-1". One total answered nothing, because the number was three
         different jobs stacked on top of each other. So the three jobs are named
         here, in a recordist's own words, each carrying its OWN headline count
         and its own recorded-so-far, and a job the reader does not have is not
         shown at all. None of them is named for a judgement we have made about
         the reader's earlier takes (Tom, 2026-09-02). -->
    <ul class="section-map">
      <li v-for="s in sections" :key="s.key" class="section-map-row">
        <!-- THE NUMBER IS THE HEADLINE. Tom, 2026-09-02: "each section should
             have a headline number of recordings in there". It was a small grey
             span at the end of a line; on a phone the eye has to land on it. -->
        <span class="sm-count">{{ s.rows.length }}</span>
        <span class="sm-name">{{ s.heading }}</span>
        <span class="sm-tally">{{ tallyWords(s) }}</span>
        <span class="sm-blurb">{{ s.blurb }}</span>
      </li>
    </ul>

    <!-- The whole list is one tap away and CLOSED by default. The page it
         replaced was a wall of rows and that is exactly what made it unreadable;
         the wall is still worth having, it is just not what you land on. -->
    <button class="roster-toggle" type="button" @click="open = !open">
      {{ open ? 'Hide every line' : `See every line (${allRows.length})` }}
    </button>

    <ol v-if="open" class="roster-list">
     <li v-for="s in sections" :key="s.key" class="section">
      <h3 class="section-head">
        <span class="sh-count">{{ s.rows.length }}</span> {{ s.heading }}
        <small>{{ tallyWords(s) }}</small>
      </h3>
      <ol class="section-rows">
      <li v-for="r in s.rows" :key="r.id" :class="['row', r.done ? 'is-done' : 'is-todo', { playing: playingId === r.id, editing: editingId === r.id }]">
        <!-- Rewriting a line from the list: the row becomes the editor, in
             place, so the line being changed never leaves the eye. Test courses
             only — `canEdit` is the server's word and the write is checked
             again there. -->
        <template v-if="editingId === r.id">
          <textarea v-model="draft" class="row-edit" rows="3" :disabled="saving"></textarea>
          <div class="row-edit-actions">
            <button class="row-cancel" type="button" :disabled="saving" @click="$emit('cancel-edit')">Cancel</button>
            <button class="row-save" type="button" :disabled="saving" @click="$emit('save', { id: r.id, text: draft })">
              {{ saving ? 'Saving…' : 'Save' }}
            </button>
          </div>
          <p v-if="error" class="row-error">{{ error }}</p>
        </template>
        <template v-else>
          <span class="row-mark" aria-hidden="true"></span>
          <!-- WHO IS SPEAKING. A two-hander read without the character names is
               one man talking to himself; the name is on the row so it never is. -->
          <span v-if="r.speaker" class="row-speaker">{{ r.speaker }}</span>
          <span class="row-text">{{ r.text }}</span>
          <span class="row-state">{{ r.done ? 'Recorded' : 'To record' }}</span>
          <!-- ONE TAP BACK ONTO A LINE. Re-reading something used to mean
               ticking the re-read switch and starting the whole queue again;
               through a hundred lines that is the difference between a run and
               a chore. This opens the mic on this line and nothing else, and the
               run carries on from the next outstanding line afterwards. -->
          <button
            class="row-record"
            type="button"
            @click="$emit('record', r.id)"
          >{{ r.done ? 'Record again' : 'Record' }}</button>
          <button
            v-if="r.canEdit"
            class="row-edit-btn"
            type="button"
            @click="startEdit(r)"
          >Edit</button>
          <button
            v-if="r.url"
            class="row-play"
            type="button"
            @click="$emit('play', r.id)"
          >{{ playingId === r.id ? 'Stop' : 'Listen' }}</button>
          <!-- The reason a take was rejected used to print here, under the
               row. Tom, 2026-09-02: a line whose take we have ruled unusable
               must read as a line that still needs recording, and nothing more.
               The booth no longer passes a reason and the server no longer
               sends one. -->
          <!-- One take, several copies of the same sentence filled. True, cheap,
               and the most encouraging number on the page. -->
          <p v-if="r.alsoFills" class="row-also">This take also fills {{ r.alsoFills }} other {{ r.alsoFills === 1 ? 'line' : 'lines' }}.</p>
        </template>
      </li>
      </ol>
     </li>
    </ol>
  </div>
</template>

<script setup>
/**
 * RecordistRoster — done vs outstanding, for the whole queue, at a glance.
 *
 * Tom, 2026-09-02, on what was missing from the recording surfaces: "hard to
 * know what you have recorded". The booth already counted ("1 of 9 recorded")
 * and already showed what was coming up next, but nothing on it let you SEE the
 * run: which lines are done, which are still owed, all of it at once.
 *
 * Two layers, deliberately: a strip of marks that is read in one glance and
 * costs no vertical space, and the full list behind one tap for when the
 * question is "which line", not "how many". The list stays closed by default —
 * a wall of rows is what sank the page this replaced.
 *
 * Rows come in already split into their sections and already flattened, so this
 * component knows nothing about markup parsing, clip precedence, what a KIND of
 * line is, or the queue: the booth owns all four and there is one definition of
 * each.
 */
import { ref, computed, watch } from 'vue'

const props = defineProps({
  // [{ key, heading, blurb, rows: [{ id, text, done, hasTake, url, canEdit, speaker, alsoFills }] }]
  // Sections arrive already split, ordered and pruned of empties: the booth owns
  // what a KIND of line is, this component owns only how it reads.
  sections: { type: Array, required: true },
  playingId: { type: String, default: null },
  editingId: { type: String, default: null },
  saving: { type: Boolean, default: false },
  error: { type: String, default: null },
  startOpen: { type: Boolean, default: false },
})
const emit = defineEmits(['play', 'edit', 'save', 'cancel-edit', 'record'])

const open = ref(props.startOpen)
// The draft lives here rather than in the booth: it is throwaway text that only
// matters until Save, and the booth owns the request, not the keyboard.
const draft = ref('')
function startEdit(row) {
  draft.value = row.text
  emit('edit', row.id)
}
// Opening the list is how a done line gets edited, so an edit started from
// anywhere else must not leave it hidden.
watch(() => props.editingId, (id) => { if (id) open.value = true })

// Counted from the rows themselves rather than passed in: two numbers that can
// disagree with the marks above them is precisely the confusion being fixed.
const allRows = computed(() => props.sections.flatMap(s => s.rows))
// ONE TRUTH. There were briefly two — `done` ("we are not asking for this
// again") and `hasTake` ("a recording of this exists") — because a line could be
// read AND queued to be read again, and calling that untouched told Aran he had
// done 26 of 441 when he had really read 71. Tom's ruling of 2026-09-02 removes
// the state that made two numbers necessary: a take we have rejected is not a
// take the reader has, it is a line still to read. So every count on this
// component is `done`, and the sections always sum to the whole run.
function takes(rows) { return rows.reduce((n, r) => n + (r.hasTake || r.done ? 1 : 0), 0) }
const takeCount = computed(() => takes(allRows.value))
const freshCount = computed(() => allRows.value.length - takeCount.value)
function tallyWords(section) {
  const t = takes(section.rows)
  return t ? `${t} recorded` : 'none recorded yet'
}
</script>

<style scoped>
.roster { margin-top: 1.1rem; }
.strip {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 0.5rem;
}
.tick {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  border: 1px solid var(--color-graphite, #475569);
  background: transparent;   /* outstanding: an empty slot looks empty */
}
.tick.done {
  background: var(--color-paper, #f7f7f2);
  border-color: var(--color-paper, #f7f7f2);
}
.strip-words {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  opacity: 0.85;
}
.section-map {
  list-style: none;
  margin: 0 0 0.6rem;
  padding: 0;
}
.section-map-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0 0.75rem;
  padding: 0.55rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
}
/* The count is the headline, so it is drawn like one: the eye lands on the
   number, and the name and the tally hang off it. */
.sm-count {
  grid-column: 1;
  grid-row: 1 / 3;
  align-self: center;
  font-size: 1.9rem;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.sm-name { grid-column: 2; grid-row: 1; font-weight: 700; align-self: end; }
.sm-tally { grid-column: 2; grid-row: 2; font-size: 0.85rem; opacity: 0.85; font-variant-numeric: tabular-nums; }
.sm-blurb { grid-column: 2; font-size: 0.82rem; opacity: 0.62; margin-top: 0.2rem; }
.section { list-style: none; }
.section-head {
  position: sticky;
  top: 0;
  margin: 0;
  padding: 0.5rem 0 0.35rem;
  background: var(--color-void, #0f172a);
  font-size: 0.95rem;
}
.section-head small { display: block; font-weight: 400; opacity: 0.7; font-variant-numeric: tabular-nums; }
.sh-count { font-size: 1.25rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.section-rows { list-style: none; margin: 0; padding: 0; }
.roster-toggle {
  min-height: 44px;
  padding: 0.4rem 0;
  background: none;
  border: none;
  color: inherit;
  opacity: 0.8;
  text-decoration: underline;
  font-size: 0.95rem;
  cursor: pointer;
}
/* Its own scrollable panel, framed. Unframed, a list clipped by max-height reads
   as a page that has gone wrong rather than as a box you can scroll. */
.roster-list {
  list-style: none;
  margin: 0.4rem 0 0.6rem;
  padding: 0 0.6rem;
  max-height: 52vh;
  overflow-y: auto;
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 12px;
}
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
.row-mark {
  flex: 0 0 auto;
  width: 12px; height: 12px;
  border-radius: 3px;
  border: 1px solid var(--color-graphite, #475569);
}
.is-done .row-mark { background: var(--color-paper, #f7f7f2); border-color: var(--color-paper, #f7f7f2); }
.is-todo { opacity: 0.72; }
.row-text { flex: 1 1 auto; font-size: 0.95rem; }
.row-state { flex: 0 0 auto; font-size: 0.78rem; opacity: 0.7; text-transform: uppercase; letter-spacing: 0.03em; }
.row-play {
  flex: 0 0 auto;
  min-height: 40px;
  padding: 0.3rem 0.7rem;
  border-radius: 8px;
  border: 1px solid var(--color-graphite, #475569);
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.row.playing .row-play { background: var(--color-paper, #f7f7f2); color: var(--color-void, #0f172a); }
.row.editing { flex-wrap: wrap; }
.row-record {
  flex: 0 0 auto;
  min-height: 40px;
  padding: 0.3rem 0.7rem;
  border-radius: 8px;
  border: 1px solid var(--color-emerald, #06ffa5);
  background: transparent;
  color: var(--color-emerald, #06ffa5);
  cursor: pointer;
}
.row-edit-btn {
  flex: 0 0 auto;
  min-height: 40px;
  padding: 0.3rem 0.7rem;
  border-radius: 8px;
  border: 1px solid var(--color-graphite, #475569);
  background: transparent;
  color: var(--color-paper-dim, #c1c1bb);
  cursor: pointer;
}
.row-edit {
  flex: 1 1 100%;
  padding: 0.6rem;
  font-size: 1rem;
  border-radius: 8px;
  border: 1px solid var(--color-tungsten, #ffa630);
  background: var(--color-void, #0f172a);
  color: var(--color-paper, #f7f7f2);
}
.row-edit-actions { display: flex; gap: 0.5rem; flex: 1 1 100%; }
.row-cancel, .row-save {
  flex: 1 1 50%;
  min-height: 46px;
  border-radius: 8px;
  border: 1px solid var(--color-graphite, #475569);
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.row-save {
  background: var(--color-tungsten, #ffa630);
  border-color: var(--color-tungsten, #ffa630);
  color: var(--color-void, #0f172a);
  font-weight: 700;
}
.row-speaker {
  flex: 0 0 auto;
  font-size: 0.78rem;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  border: 1px solid var(--color-graphite, #475569);
  opacity: 0.9;
}
.row-reason, .row-also {
  flex: 1 1 100%;
  margin: 0.25rem 0 0;
  font-size: 0.82rem;
  opacity: 0.75;
}
.row-error { flex: 1 1 100%; margin: 0.4rem 0 0; color: var(--color-film-red, #e63946); font-size: 0.85rem; }
</style>
