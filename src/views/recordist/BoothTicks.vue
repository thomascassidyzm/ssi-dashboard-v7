<template>
  <!-- The booth home's tick list (job #347, Option C): one box per script, and one per batch of
       new sentences. Ticks steer Up next only (booth-home.js). -->
  <div class="bt">
    <h3 class="bt-h">What I'm doing</h3>
    <p class="bt-sub">Tick what you are recording. Unticked work is hidden from the cards, and Up next only offers ticked work.</p>
    <template v-for="t in tickables" :key="t.key">
      <div class="bt-row">
        <label class="bt-chk" :data-test="`tick-${t.key}`">
          <input type="checkbox" :checked="ticked(t.key)" :disabled="t.locked" @change="$emit('tick', t.key, $event.target.checked)" />
          <span class="bt-grow"><b>{{ t.title }}</b><small>{{ (t.total - t.recorded).toLocaleString('en-GB') }} left of {{ t.total.toLocaleString('en-GB') }}{{ t.locked ? ' · opens after pass 1' : '' }}</small></span>
        </label>
        <!-- Outside the label on purpose: a tap here opens the list, it never ticks the section. -->
        <button
          v-if="hasBatchTicks(t) && ticked(t.key) && openBatches(t).length"
          type="button" class="bt-fold" :data-test="`fold-${t.key}`"
          :aria-expanded="isOpen(t.key) ? 'true' : 'false'"
          @click="toggle(t.key)"
        >{{ openBatches(t).length }} {{ openBatches(t).length === 1 ? 'batch' : 'batches' }} {{ isOpen(t.key) ? '▾' : '▸' }}</button>
      </div>
      <template v-if="hasBatchTicks(t) && ticked(t.key) && isOpen(t.key)">
        <label v-for="b in openBatches(t)" :key="b.n" class="bt-chk bt-sub-row">
          <input type="checkbox" :checked="ticked(batchTickId(t.key, b.n))" @change="$emit('tick', batchTickId(t.key, b.n), $event.target.checked)" />
          <span class="bt-grow">{{ batchName(t, b) }}<small>{{ t.kind === 'lego' ? 'LEGOs' : 'Sentences' }} {{ b.from }}–{{ b.to }} · {{ b.total - b.recorded }} left</small></span>
        </label>
      </template>
    </template>
  </div>
</template>

<script setup>
// A SECTION'S BATCHES ARE FOLDED until opened (Aran, 2026-10-14, job #392): the section tickbox
// stays in view, and its batches sit behind a "N batches ▸" button. Open or shut is remembered
// per section on this device (booth-home.js), on the wide panel and the phone's list alike.
import { ref } from 'vue'
import { batchTickId, hasBatchTicks, loadTicksOpen, saveTicksOpen } from './booth-home.js'
defineProps({
  tickables: { type: Array, required: true },
  ticked: { type: Function, required: true },
  batchName: { type: Function, required: true },
})
defineEmits(['tick'])

const open = ref(loadTicksOpen())
const isOpen = (key) => open.value.includes(key)
function toggle(key) {
  open.value = isOpen(key) ? open.value.filter((k) => k !== key) : [...open.value, key]
  saveTicksOpen(open.value)
}
const openBatches = (t) => (t.batches || []).filter((b) => b.recorded < b.total)
</script>

<style scoped>
.bt-h { font-size: 1.05rem; margin: 0 0 0.2rem; }
.bt-sub { color: var(--color-paper-dim, #c1c1bb); font-size: 0.88rem; margin: 0 0 0.4rem; }
.bt-row { display: flex; align-items: center; gap: 0.4rem; border-top: 1px solid var(--color-graphite, #475569); }
.bt-row .bt-chk { flex: 1; min-width: 0; border-top: none; }
.bt-fold {
  flex: none; min-height: 40px; padding: 0.3rem 0.65rem; font-size: 0.85rem; font-weight: 600; cursor: pointer;
  color: inherit; background: transparent; border: 1px solid var(--color-graphite, #475569); border-radius: 999px;
}
:root[data-theme="light"] .bt-row, :root[data-theme="light"] .bt-fold { border-color: var(--line, #d4d4cf); }
.bt-chk { display: flex; gap: 0.65rem; align-items: center; padding: 0.55rem 0.1rem; border-top: 1px solid var(--color-graphite, #475569); cursor: pointer; min-height: 44px; }
.bt-chk input { width: 22px; height: 22px; flex: none; accent-color: var(--color-emerald, #06ffa5); }
.bt-sub-row { padding-left: 1.6rem; border-top-style: dashed; }
.bt-grow { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.bt-grow small { color: var(--color-paper-dim, #c1c1bb); font-size: 0.82rem; }
</style>
