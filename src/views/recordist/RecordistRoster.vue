<template>
  <div class="roster" data-surface="recordist-roster-2026-09-02">
    <!-- THE RUN, AT A GLANCE. One mark per line, filled for done and hollow for
         outstanding, in queue order. A phone at arm's length reads this without
         reading anything: Catrin's 161 Welsh lines fit in a few rows of marks,
         and "how far am I" is answered before any words are. -->
    <div class="strip" :title="`${doneCount} recorded, ${todoCount} still to read`">
      <span
        v-for="r in rows"
        :key="r.id"
        class="tick"
        :class="{ done: r.done }"
      ></span>
    </div>
    <p class="strip-words">
      <strong>{{ doneCount }} recorded</strong> · {{ todoCount }} still to read
    </p>

    <!-- The whole list is one tap away and CLOSED by default. The page it
         replaced was a wall of rows and that is exactly what made it unreadable;
         the wall is still worth having, it is just not what you land on. -->
    <button class="roster-toggle" type="button" @click="open = !open">
      {{ open ? 'Hide every line' : `See every line (${rows.length})` }}
    </button>

    <ol v-if="open" class="roster-list">
      <li v-for="r in rows" :key="r.id" :class="['row', r.done ? 'is-done' : 'is-todo', { playing: playingId === r.id, editing: editingId === r.id }]">
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
          <span class="row-text">{{ r.text }}</span>
          <span class="row-state">{{ r.done ? 'Recorded' : 'To record' }}</span>
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
        </template>
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
 * Rows come in already flattened (id, text, done, url) so this component knows
 * nothing about markup parsing, clip precedence or the queue: the booth owns all
 * three and there is one definition of each.
 */
import { ref, computed, watch } from 'vue'

const props = defineProps({
  rows: { type: Array, required: true },      // [{ id, text, done, url, canEdit }]
  playingId: { type: String, default: null },
  editingId: { type: String, default: null },
  saving: { type: Boolean, default: false },
  error: { type: String, default: null },
  startOpen: { type: Boolean, default: false },
})
const emit = defineEmits(['play', 'edit', 'save', 'cancel-edit'])

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
const doneCount = computed(() => props.rows.reduce((n, r) => n + (r.done ? 1 : 0), 0))
const todoCount = computed(() => props.rows.length - doneCount.value)
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
  align-items: center;
  gap: 0.6rem;
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
.row-error { flex: 1 1 100%; margin: 0.4rem 0 0; color: var(--color-film-red, #e63946); font-size: 0.85rem; }
</style>
