<template>
  <!-- The list the "takes the server would not accept" banner points at (Aran, 2026-10-15). -->
  <section v-if="rows.length" class="rt" data-test="refused-list">
    <div v-for="r in rows" :key="r.lineId" class="rt-row" :data-test="`refused-row-${r.lineId}`">
      <p class="rt-text">{{ r.text }}</p>
      <p v-if="r.knownText" class="rt-known">{{ r.knownText }}</p>
      <p v-if="r.section || r.batchName" class="rt-where" data-test="refused-where">{{ [r.section, r.batchName].filter(Boolean).join(' · ') }}</p>
      <p class="rt-reason" data-test="refused-reason" :title="r.reasonFull || null">{{ r.reason }}</p>
      <p v-if="r.state === 'gone'" class="rt-gone" data-test="refused-gone">Already recorded, or no longer in your lines — dismiss</p>
      <div class="rt-acts">
        <button v-if="r.state === 'open'" type="button" class="rt-go" data-test="refused-rerecord" @click="$emit('rerecord', r)">Re-record</button>
        <span v-else-if="r.state === 'locating'" class="rt-wait">Finding the line…</span>
        <button type="button" class="rt-dismiss" data-test="refused-dismiss" @click="onDismiss(r)">Dismiss</button>
      </div>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({ rows: { type: Array, required: true } })
const emit = defineEmits(['rerecord', 'dismiss'])
function onDismiss(r) {
  if (window.confirm('Remove this refused take from this device?\n\nIt will be gone for good.')) emit('dismiss', r)
}
void props
</script>

<style scoped>
.rt { margin: 0 0 1rem; display: grid; gap: 0.6rem; }
.rt-row { background: #3a1212; color: #fde8e8; border: 1px solid #f87171; border-radius: 12px; padding: 0.7rem 0.8rem; }
.rt-row p { margin: 0; }
.rt-text { font-size: 1.1rem; font-weight: 700; line-height: 1.35; }
.rt-known { font-size: 0.95rem; opacity: 0.85; }
.rt-where { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.8; margin-top: 0.25rem !important; }
.rt-reason { font-size: 0.92rem; margin-top: 0.25rem !important; }
.rt-gone { font-size: 0.9rem; font-style: italic; margin-top: 0.25rem !important; }
.rt-acts { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-top: 0.55rem; }
.rt-go { min-height: 44px; padding: 0 1.1rem; border: 0; border-radius: 10px; font: inherit; font-weight: 700; background: #fff; color: #7f1d1d; cursor: pointer; }
.rt-dismiss { min-height: 44px; padding: 0 0.9rem; border: 1px solid rgba(255,255,255,0.6); border-radius: 10px; font: inherit; background: transparent; color: inherit; cursor: pointer; }
.rt-wait { font-size: 0.9rem; opacity: 0.8; }
:root[data-theme="light"] .rt-row { background: #fee2e2; color: #7f1d1d; border-color: #dc2626; }
:root[data-theme="light"] .rt-go { background: #b91c1c; color: #fff; }
:root[data-theme="light"] .rt-dismiss { border-color: #b91c1c; color: #7f1d1d; }
@media (min-width: 900px) { .rt { max-width: 46rem; } }
</style>
