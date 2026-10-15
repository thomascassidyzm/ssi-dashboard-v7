<template>
  <!-- BLOCK N OF M, AND WHERE A FINISHED POD LEADS (Kai, 2026-10-15, job #682).
       Eleri and Dan hold one pod-1 link each and must never need another: when
       the pod on the address is finished, this offers the next pod in course
       order and the booth loads it in place. Every block is tappable, so a
       finished one can be opened again to redo a take. -->
  <div class="pod-blocks" data-test="pod-blocks">
    <p class="pb-kicker">Block {{ nav.number }} of {{ nav.count }}</p>
    <div v-if="nav.count > 1" class="pb-row">
      <button
        v-for="b in nav.blocks" :key="b.podId" type="button"
        class="pb-chip" :class="{ here: b.here, done: b.done }"
        :aria-current="b.here ? 'true' : undefined"
        :disabled="b.here || busy"
        :title="nameOf(b)"
        @click="$emit('open', b.slug)"
      >Pod {{ b.number }} · {{ b.done ? '✓' : `${b.recorded} of ${b.total}` }}</button>
    </div>
    <template v-if="nav.currentDone">
      <h3 class="pb-done" data-test="pod-done">Pod {{ nav.number }} done</h3>
      <button
        v-if="nav.next" type="button" class="btn-begin pb-next" data-test="pod-next"
        :disabled="busy" @click="$emit('open', nav.next.slug)"
      >{{ nav.next.earlier ? 'Back to' : 'Start' }} Pod {{ nav.next.number }} — {{ nameOf(nav.next) }} ({{ nav.next.total - nav.next.recorded }} {{ nav.next.total - nav.next.recorded === 1 ? 'line' : 'lines' }})</button>
      <p v-else class="pb-soon" data-test="pod-soon">Next block coming soon. Thank you — everything you have been given is read.</p>
    </template>
  </div>
</template>

<script setup>
defineProps({
  nav: { type: Object, required: true },
  busy: { type: Boolean, default: false },
  nameOf: { type: Function, required: true },
})
defineEmits(['open'])
</script>

<style scoped>
.pod-blocks { margin: 0.75rem 0; padding: 0.75rem; border-radius: 10px; background: rgba(127, 127, 127, 0.08); }
.pb-kicker { margin: 0 0 0.4rem; font-size: 0.85rem; opacity: 0.8; letter-spacing: 0.02em; }
.pb-row { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.pb-chip { padding: 0.3rem 0.6rem; border-radius: 999px; border: 1px solid currentColor; background: transparent; color: inherit; font-size: 0.85rem; cursor: pointer; }
.pb-chip.done { opacity: 0.75; }
.pb-chip.here { font-weight: 700; cursor: default; }
.pb-done { margin: 0.75rem 0 0.4rem; }
.pb-next { width: 100%; }
.pb-soon { margin: 0.4rem 0 0; }
</style>
