<template>
  <!-- The booth home's tick list (job #347, Option C): one box per script, and one per batch of
       new sentences. Ticks steer Up next only (booth-home.js). -->
  <div class="bt">
    <h3 class="bt-h">What I'm doing</h3>
    <p class="bt-sub">Tick what you are recording. Unticked work is hidden from the cards, and Up next only offers ticked work.</p>
    <template v-for="t in tickables" :key="t.key">
      <label class="bt-chk" :data-test="`tick-${t.key}`">
        <input type="checkbox" :checked="ticked(t.key)" :disabled="t.locked" @change="$emit('tick', t.key, $event.target.checked)" />
        <span class="bt-grow"><b>{{ t.title }}</b><small>{{ (t.total - t.recorded).toLocaleString('en-GB') }} left of {{ t.total.toLocaleString('en-GB') }}{{ t.locked ? ' · opens after pass 1' : '' }}</small></span>
      </label>
      <template v-if="hasBatchTicks(t) && ticked(t.key)">
        <label v-for="b in t.batches.filter(b => b.recorded < b.total)" :key="b.n" class="bt-chk bt-sub-row">
          <input type="checkbox" :checked="ticked(batchTickId(t.key, b.n))" @change="$emit('tick', batchTickId(t.key, b.n), $event.target.checked)" />
          <span class="bt-grow">{{ batchName(t, b) }}<small>{{ t.kind === 'lego' ? 'LEGOs' : 'Sentences' }} {{ b.from }}–{{ b.to }} · {{ b.total - b.recorded }} left</small></span>
        </label>
      </template>
    </template>
  </div>
</template>

<script setup>
import { batchTickId, hasBatchTicks } from './booth-home.js'
defineProps({
  tickables: { type: Array, required: true },
  ticked: { type: Function, required: true },
  batchName: { type: Function, required: true },
})
defineEmits(['tick'])
</script>

<style scoped>
.bt-h { font-size: 1.05rem; margin: 0 0 0.2rem; }
.bt-sub { color: var(--color-paper-dim, #c1c1bb); font-size: 0.88rem; margin: 0 0 0.4rem; }
.bt-chk { display: flex; gap: 0.65rem; align-items: center; padding: 0.55rem 0.1rem; border-top: 1px solid var(--color-graphite, #475569); cursor: pointer; min-height: 44px; }
.bt-chk input { width: 22px; height: 22px; flex: none; accent-color: var(--color-emerald, #06ffa5); }
.bt-sub-row { padding-left: 1.6rem; border-top-style: dashed; }
.bt-grow { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.bt-grow small { color: var(--color-paper-dim, #c1c1bb); font-size: 0.82rem; }
</style>
