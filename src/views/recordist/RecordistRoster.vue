<template>
  <div class="roster" data-surface="recordist-roster-2026-09-03">
    <!-- THE HONEST TOTAL, IN WORDS, AND NO MARKS ABOVE IT ANY MORE. There used
         to be ONE strip of 385 marks here, over the whole run. Tom, 2026-09-03:
         "I really like the completeness grid, but I suspect it would be more
         helpful if it's done in sections - i.e. PODS are one section and so
         on." One block of marks hid that this is two different jobs, and it
         contradicted the page's own headings directly underneath it. So the
         marks moved down into the sections, where each one carries its own
         count, and this line stays as the only whole-run number. -->
    <p class="strip-words">
      <strong>{{ takeCount }} recorded</strong> · {{ freshCount }} still to read
    </p>

    <!-- THE MAP, AND IT IS THE POINT OF THIS COMPONENT. Tom, 2026-09-02, looking
         at Aran's link: "441 lines? why so many??? there's only 231 lines in
         POD-1". One total answered nothing, because the number was three
         different jobs stacked on top of each other. So the jobs are named
         here, in a recordist's own words, each carrying its OWN headline count,
         its own recorded-so-far AND SINCE 2026-09-03 ITS OWN GRID, so that "my
         pod half is nearly done and the seeds are the mountain" is read off the
         marks without reading a number at all. None of them is named for a
         judgement we have made about the reader's earlier takes (Tom,
         2026-09-02). -->
    <ul class="section-map">
      <li v-for="s in sections" :key="s.key" class="section-map-row">
        <!-- THE NUMBER IS THE HEADLINE. Tom, 2026-09-02: "each section should
             have a headline number of recordings in there". It was a small grey
             span at the end of a line; on a phone the eye has to land on it. -->
        <span class="sm-count">{{ s.rows.length }}</span>
        <span class="sm-name">{{ s.heading }}</span>
        <span class="sm-tally">{{ tallyWords(s) }}</span>

        <!-- THIS SECTION'S RUN, AT A GLANCE. One mark per line, filled for done
             and hollow for outstanding, in queue order.
             EVERY MARK IS A BUTTON. Tom, 2026-09-03: "rolling over/clicking on
             the squares in the grid should show that item's detail, like in the
             seed grid… tapping should take you there". A button and not a
             hover-only tooltip because the artists record on PHONES, where
             there is no hover at all — the seed grid's own tooltip
             (components/generation/SeedProgressGrid.vue) is mouse-tracked and
             would never open under a thumb. Hover is kept as the desktop
             nicety it is: it previews, tap decides. -->
        <div class="strip">
          <template v-for="r in s.rows" :key="r.id">
            <button
              type="button"
              class="tick"
              :class="{ done: r.done, on: peekId === r.id }"
              :title="r.text"
              :aria-label="`${r.text} — ${r.done ? 'recorded' : 'not recorded'}`"
              @mouseenter="hoverId = r.id"
              @mouseleave="hoverId === r.id && (hoverId = null)"
              @click="peekId = peekId === r.id ? null : r.id"
            ></button>

            <!-- WHICH LINE IS THAT. The one question a mark cannot answer on
                 its own — answered ON THE ROW THE MARK IS IN, because it is a
                 full-width item inside the same wrapping strip. It first opened
                 under the whole section and that was wrong on a phone: tapping
                 a mark in the third row of 23 put the answer twenty rows below
                 the thumb, off the screen entirely.
                 IT SAYS TWO THINGS AND ONLY TWO: the words, and recorded or
                 not. Tom's ruling of 2026-09-02 stands over this panel in
                 particular — a take we have ruled unusable is shown as a line
                 that still needs recording and NOTHING else, so there is no
                 flag, no reason, no score and no "re-record this" state to leak
                 in here. -->
            <div v-if="peekedId === r.id" class="peek">
              <span v-if="r.speaker" class="peek-speaker">{{ r.speaker }}</span>
              <span class="peek-text">{{ r.text }}</span>
              <span class="peek-state">{{ r.done ? 'Recorded' : 'Not recorded' }}</span>
              <!-- AND THIS IS THE PRIZE. "I want to read that one again" is
                   what an artist actually wants from a picture of their
                   progress, so the mark is a way back onto the line and not
                   just a report about it. It opens the mic on that line and
                   nothing else; the last take is the accepted take, so
                   re-reading simply replaces it and there is no confirm step
                   here on purpose. -->
              <button class="peek-record" type="button" @click="$emit('record', r.id)">
                {{ r.done ? 'Read it again' : 'Record this line' }}
              </button>
            </div>
          </template>
        </div>

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
      <!-- SHUT UNTIL HE OPENS ONE. Tom, 2026-09-04, looking at this list opened
           to 769 rows in one continuous scroll: "the same logic shoudl apply to
           the see all my lines I think — I think that would be clearer". The
           wall of rows behind one tap was already the point of this panel; it
           was still a wall once you were inside it. So the panel now opens onto
           headings, and a section's rows arrive when he asks for that section.
           THE HEADING IS THE BUTTON — no chevron, no hover, no long-press —
           because the artists work on a phone with a thumb, and the same
           reasoning that made every mark in the grid above a button applies
           here. The mark, then the count, then the name, in the same shape as
           the already-recorded list on the settings panel: the two lists on
           this screen are the same lines, so they read the same way. -->
      <h3 class="section-head">
        <button
          type="button"
          class="sh-btn"
          :aria-expanded="isOpen(s) ? 'true' : 'false'"
          @click="toggle(s.key)"
        >
          <span class="sh-mark" aria-hidden="true">{{ isOpen(s) ? '–' : '+' }}</span>
          <span class="sh-count">{{ s.rows.length }}</span>
          <span class="sh-name">{{ s.heading }}</span>
          <!-- Kept on the shut heading on purpose (Tom asked for it on
               2026-09-02): it is this section's own two numbers, and it is the
               one thing worth knowing about a section you have not opened. The
               queue's explanatory blurb is NOT repeated here — that would undo
               the shortening this change exists for; it is on the map above. -->
          <small class="sh-tally">{{ tallyWords(s) }}</small>
        </button>
      </h3>
      <ol v-if="isOpen(s)" class="section-rows">
      <li v-for="r in s.rows" :key="r.id" :class="['row', r.done ? 'is-done' : 'is-todo', { playing: playingId === r.id, editing: editingId === r.id }]">
          <span class="row-mark" aria-hidden="true"></span>
          <!-- WHO IS SPEAKING. A two-hander read without the character names is
               one man talking to himself; the name is on the row so it never is. -->
          <span v-if="r.speaker" class="row-speaker">{{ r.speaker }}</span>
          <!-- TAP THE WORDS TO CHANGE THEM, and ONLY the words change: the mark,
               the character and the state stay exactly where they are, so the
               row does not jump under the thumb that just tapped it. The
               textarea inherits the span's own slot and type size. -->
          <textarea
            v-if="editingId === r.id"
            ref="rowBox"
            v-model="draft"
            class="row-text row-edit"
            rows="1"
            :style="{ height: rowBoxHeight, flex: rowBoxFlex }"
            :disabled="saving"
            @input="sizeRowBox"
            @keydown.esc.prevent="abandon"
            @keydown.enter.prevent="commit(r.id)"
            @blur="commit(r.id)"
          ></textarea>
          <span v-else class="row-text" :class="{ tappable: r.canEdit }"
                @click="onTextTap(r, $event)">{{ r.text }}</span>
          <span class="row-state">{{ r.done ? 'Recorded' : 'To record' }}</span>
          <p v-if="error && editingId === r.id" class="row-error">{{ error }}</p>
          <!-- ON THE ROW, not under the list. It first rendered after the whole
               roster, which on Catrin's 466 lines put it several screens below
               the row she had just edited — a message nobody will ever see is
               the same as no message. -->
          <p v-if="savedNote && savedId === r.id" class="row-saved">{{ savedNote }}</p>
        <template v-if="editingId !== r.id">
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
import { ref, computed, watch, nextTick } from 'vue'
import { caretOffsetFromPoint, openEditorAt } from '@/utils/caretFromPoint'
import { useSectionCollapse } from './section-collapse'

const props = defineProps({
  // [{ key, heading, blurb, rows: [{ id, text, done, hasTake, url, canEdit, speaker, alsoFills }] }]
  // Sections arrive already split, ordered and pruned of empties: the booth owns
  // what a KIND of line is, this component owns only how it reads.
  sections: { type: Array, required: true },
  playingId: { type: String, default: null },
  editingId: { type: String, default: null },
  // The one short line, and which row it belongs to. Empty in the common case,
  // which is the ruling: fixing a line nobody has read says nothing.
  savedNote: { type: String, default: '' },
  savedId: { type: String, default: null },
  saving: { type: Boolean, default: false },
  error: { type: String, default: null },
  startOpen: { type: Boolean, default: false },
})
const emit = defineEmits(['play', 'edit', 'save', 'cancel-edit', 'record'])

const open = ref(props.startOpen)
// WHICH MARK IS OPEN. Two separate pieces of state on purpose: `peekId` is a
// decision the reader made with a tap and survives the pointer leaving, and
// `hoverId` is a desktop preview that must never survive it. Everything on this
// component works with `hoverId` permanently null — that is the phone.
const peekId = ref(null)
const hoverId = ref(null)
// The mark whose line is open: a tap wins over a hover, and the panel is drawn
// inline next to that mark rather than in a floating box a thumb would cover.
const peekedId = computed(() => peekId.value || hoverId.value)
// A section that disappears (the queue reloaded, the volume changed) must not
// leave a panel open over somebody else's line.
watch(() => props.sections, (list) => {
  const ids = new Set(list.flatMap(s => s.rows.map(r => r.id)))
  if (peekId.value && !ids.has(peekId.value)) peekId.value = null
  if (hoverId.value && !ids.has(hoverId.value)) hoverId.value = null
})
// The draft lives here rather than in the booth: it is throwaway text that only
// matters until Save, and the booth owns the request, not the keyboard.
const draft = ref('')
const rowBox = ref(null)
const rowBoxHeight = ref('auto')
// The width the WORDS had, measured before they are swapped for the box. A
// textarea's intrinsic width comes from `cols`, so without this it sits up
// beside the character chip while the long span it replaced had wrapped onto its
// own line — the row jumps under the thumb that just tapped it.
const rowBoxFlex = ref('1 1 auto')
// Esc blurs the box on its way out, and blur is what saves. This says which of
// the two just happened.
let abandoning = false

// Where the thumb landed, measured before the words are replaced by the box.
function onTextTap(row, ev) {
  if (!row.canEdit) return
  const w = ev.currentTarget.offsetWidth
  rowBoxFlex.value = w ? `0 0 ${w}px` : '1 1 auto'
  startEdit(row, caretOffsetFromPoint(ev.currentTarget, ev.clientX, ev.clientY))
}

function startEdit(row, caretAt = null) {
  if (props.editingId === row.id) return
  abandoning = false
  draft.value = row.text
  emit('edit', row.id)
  nextTick(() => {
    sizeRowBox()
    openEditorAt(Array.isArray(rowBox.value) ? rowBox.value[0] : rowBox.value, caretAt)
  })
}

function sizeRowBox() {
  const el = Array.isArray(rowBox.value) ? rowBox.value[0] : rowBox.value
  if (!el) return
  el.style.height = 'auto'
  rowBoxHeight.value = `${el.scrollHeight}px`
}

function abandon() {
  abandoning = true
  emit('cancel-edit')
}

// It saves itself. No Save button, and nothing to confirm.
function commit(id) {
  if (abandoning) { abandoning = false; return }
  if (props.editingId !== id || props.saving) return
  emit('save', { id, text: draft.value })
}
// WHICH SECTIONS ARE OPEN, from the one module the already-recorded list uses
// too. His taps are remembered for the life of the page: shutting "See every
// line" and opening it again puts the panel back the way he left it.
const { isOpen, toggle, openFor } = useSectionCollapse()

// Opening the list is how a done line gets edited, so an edit started from
// anywhere else must not leave it hidden — AND SINCE THE SECTIONS COLLAPSED,
// opening the list is no longer enough: the row's own section has to open too,
// or he is typing into a textarea that is not on the screen.
watch(() => props.editingId, (id) => {
  if (!id) return
  open.value = true
  const section = props.sections.find(s => s.rows.some(r => r.id === id))
  if (section) openFor(section.key)
})

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
// TWO NUMBERS PER SECTION, since 2026-09-03: the marks beside them are this
// section's own run, so the caption has to add up to this section and not to
// the page. Recorded, and still to read — never a third state.
function tallyWords(section) {
  const t = takes(section.rows)
  const left = section.rows.length - t
  return `${t ? `${t} recorded` : 'none recorded yet'} · ${left} still to read`
}
</script>

<style scoped>
.roster { margin-top: 1.1rem; }
/* One section's marks. It sits inside the section row so the marks are always
   read together with the name and the count they belong to. */
.strip {
  grid-column: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 0.35rem 0 0.1rem;
}
.tick {
  /* 14px with a 4px gap: the smallest mark a thumb still lands on, and 305 of
     them still fit in a phone width without scrolling. */
  width: 14px;
  height: 14px;
  padding: 0;
  border-radius: 3px;
  border: 1px solid var(--color-graphite, #475569);
  background: transparent;   /* outstanding: an empty slot looks empty */
  cursor: pointer;
  /* TAP IS THE ONLY AFFORDANCE (Tom, 2026-09-03). No drag, no swipe, no
     long-press — and this is what stops a thumb dragged across the grid from
     being read as a text selection instead of a tap. */
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.tick.done {
  background: var(--color-paper, #f7f7f2);
  border-color: var(--color-paper, #f7f7f2);
}
/* The open mark, and the ONLY third appearance a mark ever has: it says "this
   is the one you are looking at", never anything about the take. */
.tick.on {
  outline: 2px solid var(--color-emerald, #06ffa5);
  outline-offset: 1px;
}
.tick:focus-visible { outline: 2px solid var(--color-emerald, #06ffa5); outline-offset: 1px; }

/* WHICH LINE IS THAT. Deliberately quiet: it is a caption for a mark, and the
   green Start button above it stays the loudest thing on the page. */
.peek {
  /* A full-width item in the wrapping strip: it breaks the line straight after
     the mark that was tapped, so the answer appears on the row of the question. */
  flex: 1 1 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.55rem;
  margin: 0.35rem 0 0.15rem;
  padding: 0.5rem 0.6rem;
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 10px;
}
.peek-speaker {
  font-size: 0.72rem;
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
  border: 1px solid var(--color-graphite, #475569);
  opacity: 0.9;
}
.peek-text { flex: 1 1 100%; font-size: 0.98rem; }
.peek-state { font-size: 0.72rem; opacity: 0.7; text-transform: uppercase; letter-spacing: 0.03em; }
.peek-record {
  margin-left: auto;
  min-height: 44px;
  padding: 0.35rem 0.9rem;
  border-radius: 8px;
  border: 1px solid var(--color-emerald, #06ffa5);
  background: transparent;
  color: var(--color-emerald, #06ffa5);
  font-size: 0.9rem;
  cursor: pointer;
  touch-action: manipulation;
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
  /* Was centred over a two-line row. Now the row is as tall as its grid, and a
     number floating halfway down 23 rows of marks belongs to nothing. */
  align-self: start;
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
/* The whole heading is the hit target, full width and thumb-height. */
.sh-btn {
  display: grid;
  grid-template-columns: 1.1rem auto 1fr;
  align-items: baseline;
  gap: 0 0.5rem;
  width: 100%;
  min-height: 44px;
  padding: 0;
  background: none;
  border: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.sh-btn:focus-visible { outline: 2px solid var(--color-emerald, #06ffa5); outline-offset: 2px; }
.sh-mark { font-size: 1.1rem; font-weight: 700; opacity: 0.8; line-height: 1; }
.sh-count { font-size: 1.25rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.sh-name { font-weight: 700; }
.sh-tally {
  grid-column: 2 / 4;
  display: block;
  font-weight: 400;
  font-size: 0.8rem;
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
}
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
.row-text.tappable { cursor: text; -webkit-tap-highlight-color: rgba(255, 166, 48, 0.25); }
.row-text.tappable:active { color: var(--color-tungsten, #ffa630); }
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
/* The words themselves, still in their own slot on the row. No border, no
   padding, same type — the only thing that changes is that a caret appears. */
.row-edit {
  margin: 0;
  padding: 0;
  border: 0;
  resize: none;
  overflow: hidden;
  font: inherit;
  font-size: 0.95rem;
  background: transparent;
  color: var(--color-paper, #f7f7f2);
  caret-color: var(--color-tungsten, #ffa630);
}
.row-edit:focus { outline: none; }
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
.row-saved { flex: 1 1 100%; margin: 0.35rem 0 0; font-size: 0.85rem; color: var(--color-tungsten, #ffa630); }
.row-error { flex: 1 1 100%; margin: 0.4rem 0 0; color: var(--color-film-red, #e63946); font-size: 0.85rem; }
</style>
