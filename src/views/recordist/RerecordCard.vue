<template>
  <!-- THE RE-RECORD CARD (Aran, 2026-10-15, jobs #788, #806): every miss in ONE card, one tap to read
       them all. Skipped lines, text changes AND the device's refused takes are rows of this card,
       never cards of their own. Sits at the top of the booth home; hidden when there is nothing.
       The list is built in rerecord-list.js. -->
  <!-- With nothing to re-record the card is not drawn (it would open an empty batch); old refused copies keep one quiet line. -->
  <section v-if="rows.length || oldIds.length" class="rr" :class="{ quiet: !rows.length }" :data-test="rows.length ? 'rerecord-card' : 'rerecord-old-only'">
    <span v-if="rows.length" class="rr-kind">Re-record</span>
    <template v-if="rows.length">
      <h2 class="rr-h2" data-test="rerecord-count">{{ rows.length }} {{ rows.length === 1 ? 'line' : 'lines' }} to re-record</h2>
      <p class="rr-sub" data-test="rerecord-breakdown">{{ breakdown }}</p>
      <button type="button" class="rr-go" data-test="rerecord-start" @click="$emit('open')">Start re-recording ›</button>
      <button type="button" class="rr-toggle" :aria-expanded="open ? 'true' : 'false'" data-test="rerecord-toggle" @click="open = !open">
        {{ open ? '▾ Hide the list' : '▸ Show the list' }}
      </button>
      <ol v-if="open" class="rr-list">
        <li v-for="r in rows" :key="r.lineId" class="rr-row" :data-test="`rerecord-row-${r.lineId}`">
          <button v-if="r.hasTake" type="button" class="rr-play" data-test="rerecord-play" aria-label="Play the take that did not save" @click="$emit('play', r.lineId)">▶</button>
          <!-- A take that saved but did not match its words (job #842): it is on the server, so ▶ plays the stored take. -->
          <button v-else-if="r.why === 'didnt_match'" type="button" class="rr-play" data-test="rerecord-play-stored" aria-label="Play the saved take" @click="$emit('play-stored', r.lineId)">▶</button>
          <span v-else class="rr-play-gap"></span>
          <span class="rr-text">{{ r.text }}</span>
          <small class="rr-why" :class="`w-${r.why}`" data-test="rerecord-why" :title="r.reasonFull || null">{{ r.words }}</small>
          <small v-if="r.oldText" class="rr-old">was: {{ r.oldText }}</small>
          <small v-if="r.why === 'didnt_match' && r.heard" class="rr-old" data-test="rerecord-heard">we heard: {{ r.heard }}</small>
          <!-- The check mishears dialect and elision; if the take is right, he keeps it and it leaves the list. -->
          <button v-if="r.why === 'didnt_match' && r.takeId" type="button" class="rr-keep" data-test="rerecord-keep" @click="$emit('keep', r)">It's fine — keep it</button>
        </li>
      </ol>
    </template>
    <details v-if="oldIds.length" class="rr-old-box" data-test="rerecord-old">
      <summary data-test="rerecord-old-toggle">Clear old ones ({{ oldIds.length }})</summary>
      <p class="rr-old-note">Refused takes on this device for lines that are already recorded or no longer in your lines. Clearing removes only these copies from this device.</p>
      <button type="button" class="rr-clear" data-test="rerecord-old-clear" @click="$emit('clear-old', oldIds)">Clear {{ oldIds.length }} old {{ oldIds.length === 1 ? 'one' : 'ones' }}</button>
    </details>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { breakdownWords } from './rerecord-list.js'
const props = defineProps({
  rows: { type: Array, required: true },
  oldIds: { type: Array, default: () => [] },
})
defineEmits(['open', 'play', 'play-stored', 'keep', 'clear-old'])
const open = ref(false)
const breakdown = computed(() => breakdownWords(props.rows))
</script>

<style scoped>
.rr.quiet { background: transparent; border-style: dashed; padding: 0.4rem 0.9rem; color: inherit; }
.rr.quiet .rr-old-box { margin-top: 0; }
.rr { background: #3a1d0d; border: 1px solid #c2410c; color: #fde7d6; border-radius: 18px; padding: 1.1rem; margin: 1rem 0 0.5rem; }
.rr-kind { display: inline-block; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; padding: 0.1rem 0.55rem; border-radius: 99px; margin-bottom: 0.3rem; background: #7c2d12; color: #fed7aa; }
.rr-h2 { margin: 0.1rem 0 0.25rem; font-size: 1.35rem; line-height: 1.25; }
.rr-sub { margin: 0; font-size: 0.95rem; opacity: 0.9; }
.rr-go { display: block; width: 100%; min-height: 56px; margin-top: 0.9rem; border: 0; border-radius: 12px; font: inherit; font-size: 1.1rem; font-weight: 700; background: #fb923c; color: #431407; cursor: pointer; }
.rr-toggle { margin-top: 0.6rem; min-height: 44px; background: transparent; border: 0; color: inherit; font: inherit; font-size: 0.95rem; cursor: pointer; padding: 0; }
.rr-list { list-style: none; margin: 0.4rem 0 0; padding: 0; display: grid; gap: 0.45rem; max-height: 22rem; overflow-y: auto; }
/* ▶ is a 44px target on a phone (job #834); it was 32px. */
.rr-row { display: grid; grid-template-columns: 44px 1fr; gap: 0 0.5rem; align-items: center; padding: 0.3rem 0; border-top: 1px solid rgba(255,255,255,0.15); }
.rr-play, .rr-play-gap { width: 44px; height: 44px; grid-row: 1 / span 2; }
.rr-play { border: 0; border-radius: 99px; background: #7c2d12; color: #fed7aa; cursor: pointer; font-size: 0.8rem; padding: 0; }
.rr-old-box { margin-top: 0.7rem; font-size: 0.9rem; }
.rr-old-box summary { cursor: pointer; min-height: 44px; display: flex; align-items: center; }
.rr-old-note { margin: 0.3rem 0 0.5rem; opacity: 0.85; }
.rr-clear { min-height: 44px; padding: 0 1rem; border-radius: 10px; border: 1px solid currentColor; background: transparent; color: inherit; font: inherit; font-weight: 600; cursor: pointer; }
.rr-why { grid-column: 2; font-size: 0.75rem; opacity: 0.85; }
.rr-text { font-size: 0.95rem; line-height: 1.35; overflow-wrap: anywhere; }
.rr-old { grid-column: 2; font-size: 0.85rem; opacity: 0.8; overflow-wrap: anywhere; }
.rr-keep { grid-column: 2; justify-self: start; min-height: 36px; margin-top: 0.2rem; padding: 0 0.8rem; border-radius: 10px; border: 1px solid currentColor; background: transparent; color: inherit; font: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
:root[data-theme="light"] .rr { background: #fff1e6; border-color: #ea580c; color: #431407; }
:root[data-theme="light"] .rr-kind, :root[data-theme="light"] .rr-play { background: #fed7aa; color: #7c2d12; }
:root[data-theme="light"] .rr-go { background: #c2410c; color: #fff; }
:root[data-theme="light"] .rr-row { border-top-color: rgba(67,20,7,0.15); }
:root[data-theme="light"] .rr.quiet { background: transparent; }
</style>
