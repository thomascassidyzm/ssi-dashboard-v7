<template>
  <!-- No pair for this text: render exactly what the caller would have rendered. -->
  <span v-if="!pair">{{ text }}</span>

  <!-- Known-side gender pair: both speaker wordings, marked. -->
  <span v-else class="inline-flex flex-col gap-0.5">
    <span class="flex items-baseline gap-1.5">
      <span class="gender-tag text-sky-400 bg-sky-500/15" title="Male-speaker wording" aria-label="male-speaker wording">♂</span>
      <span>{{ pair.m }}</span>
    </span>
    <span class="flex items-baseline gap-1.5">
      <span class="gender-tag text-fuchsia-400 bg-fuchsia-500/15" title="Female-speaker wording" aria-label="female-speaker wording">♀</span>
      <span>{{ pair.f }}</span>
    </span>
  </span>
</template>

<script setup>
/**
 * Known-side text that may exist in two speaker-gender wordings.
 *
 * Display only: the alternation between the two wordings is applied at audio
 * generation time, not here. `pair` is null for the ~80% of cues with no
 * gendered wording, and this then renders the plain text unchanged.
 */
defineProps({
  text: { type: String, default: '' },
  pair: { type: Object, default: null } // { m, f } or null
})
</script>

<style scoped>
.gender-tag {
  font-size: 0.6rem;
  line-height: 1.1;
  font-family: ui-monospace, monospace;
  padding: 0 0.25rem;
  border-radius: 0.2rem;
  flex-shrink: 0;
}
:root[data-theme="light"] .gender-tag.text-sky-400 { color: #0369a1; }
:root[data-theme="light"] .gender-tag.text-fuchsia-400 { color: #a21caf; }
</style>
