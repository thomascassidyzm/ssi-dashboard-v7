<template>
  <!-- THE RE-RECORD CARD (Aran, 2026-10-15, job #788): every miss in one place, one tap to read
       them all. Sits at the top of the booth home, above Up next; hidden when there are none.
       The list is built in rerecord-list.js. -->
  <section v-if="rows.length" class="rr" data-test="rerecord-card">
    <span class="rr-kind">Re-record</span>
    <h2 class="rr-h2" data-test="rerecord-count">{{ rows.length }} {{ rows.length === 1 ? 'line' : 'lines' }} to re-record</h2>
    <p class="rr-sub">Lines you skipped, takes that didn't save, and lines whose words changed after you read them. They play in course order.</p>
    <button type="button" class="rr-go" data-test="rerecord-start" @click="$emit('open')">Re-record {{ rows.length === 1 ? 'it' : 'them' }} ›</button>
    <button type="button" class="rr-toggle" :aria-expanded="open ? 'true' : 'false'" data-test="rerecord-toggle" @click="open = !open">
      {{ open ? '▾ Hide the list' : '▸ Show the list' }}
    </button>
    <ol v-if="open" class="rr-list">
      <li v-for="r in rows" :key="r.lineId" class="rr-row" :data-test="`rerecord-row-${r.lineId}`">
        <span class="rr-why" :class="`w-${r.why}`" data-test="rerecord-why">{{ r.words }}</span>
        <span class="rr-text">{{ r.text }}</span>
        <small v-if="r.oldText" class="rr-old">was: {{ r.oldText }}</small>
      </li>
    </ol>
  </section>
</template>

<script setup>
import { ref } from 'vue'
defineProps({ rows: { type: Array, required: true } })
defineEmits(['open'])
const open = ref(false)
</script>

<style scoped>
.rr { background: #3a1d0d; border: 1px solid #c2410c; color: #fde7d6; border-radius: 18px; padding: 1.1rem; margin: 1rem 0 0.5rem; }
.rr-kind { display: inline-block; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; padding: 0.1rem 0.55rem; border-radius: 99px; margin-bottom: 0.3rem; background: #7c2d12; color: #fed7aa; }
.rr-h2 { margin: 0.1rem 0 0.25rem; font-size: 1.35rem; line-height: 1.25; }
.rr-sub { margin: 0; font-size: 0.95rem; opacity: 0.9; }
.rr-go { display: block; width: 100%; min-height: 56px; margin-top: 0.9rem; border: 0; border-radius: 12px; font: inherit; font-size: 1.1rem; font-weight: 700; background: #fb923c; color: #431407; cursor: pointer; }
.rr-toggle { margin-top: 0.6rem; min-height: 44px; background: transparent; border: 0; color: inherit; font: inherit; font-size: 0.95rem; cursor: pointer; padding: 0; }
.rr-list { list-style: none; margin: 0.4rem 0 0; padding: 0; display: grid; gap: 0.45rem; max-height: 22rem; overflow-y: auto; }
.rr-row { display: grid; grid-template-columns: auto 1fr; gap: 0.15rem 0.6rem; align-items: baseline; padding: 0.45rem 0; border-top: 1px solid rgba(255,255,255,0.15); }
.rr-why { font-size: 0.75rem; font-weight: 700; white-space: nowrap; padding: 0.1rem 0.5rem; border-radius: 99px; background: #7c2d12; color: #fed7aa; }
.rr-why.w-refused { background: #7f1d1d; color: #fecaca; }
.rr-why.w-text_changed { background: #1e3a5f; color: #bfdbfe; }
.rr-text { font-size: 1rem; line-height: 1.35; overflow-wrap: anywhere; }
.rr-old { grid-column: 2; font-size: 0.85rem; opacity: 0.8; overflow-wrap: anywhere; }
:root[data-theme="light"] .rr { background: #fff1e6; border-color: #ea580c; color: #431407; }
:root[data-theme="light"] .rr-kind, :root[data-theme="light"] .rr-why { background: #fed7aa; color: #7c2d12; }
:root[data-theme="light"] .rr-why.w-refused { background: #fee2e2; color: #991b1b; }
:root[data-theme="light"] .rr-why.w-text_changed { background: #dbeafe; color: #1e3a8a; }
:root[data-theme="light"] .rr-go { background: #c2410c; color: #fff; }
:root[data-theme="light"] .rr-row { border-top-color: rgba(67,20,7,0.15); }
</style>
