<script setup>
/**
 * The blast-radius banner a lab page wears.
 *
 * It says the same three things the Labs index says, in the same words, from
 * the same source (blastRadius.js) — so the label you chose the lab by on the
 * index is the label still standing over the controls when you get there.
 *
 * `note` is for the one extra sentence a particular lab needs. The tier text is
 * not overridable: a lab does not get to soften its own tier.
 */
import { computed } from 'vue'
import { BLAST_RADIUS } from './blastRadius'

const props = defineProps({
  tier: { type: String, required: true },   // 'live' | 'deferred' | 'none'
  note: { type: String, default: '' },
})

const radius = computed(() => BLAST_RADIUS[props.tier] || BLAST_RADIUS.none)
</script>

<template>
  <div
    class="blast-banner"
    :style="{ '--blast-accent': radius.accent, '--blast-glow': radius.glow }"
    role="note"
  >
    <span class="blast-label">{{ radius.label }}</span>
    <span class="blast-text">
      {{ radius.detail }}<template v-if="note"> {{ note }}</template>
    </span>
  </div>
</template>

<style scoped>
.blast-banner {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  padding: 0.6rem 0.85rem;
  border: 1px solid var(--blast-accent);
  border-left-width: 3px;
  border-radius: 8px;
  background: var(--blast-glow);
  font-size: 0.8125rem;
  line-height: 1.5;
}
.blast-label {
  flex: none;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--blast-accent);
  white-space: nowrap;
}
.blast-text { color: var(--ink, inherit); opacity: 0.9; }
</style>
