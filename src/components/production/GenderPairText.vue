<template>
  <!-- No pair for this text: render exactly what the caller would have rendered. -->
  <span v-if="!pair" :dir="dir || null" :style="bidi">{{ text }}</span>

  <!-- Gender pair: ONE wording at a time. The sentence is the tap target. -->
  <span
    v-else
    class="gp-tap"
    :class="showF ? 'gp-f' : 'gp-m'"
    :dir="dir || null"
    :style="bidi"
    role="button"
    tabindex="0"
    :aria-label="label"
    :title="label"
    @click.stop="toggle"
    @keydown.enter.prevent="toggle"
    @keydown.space.prevent="toggle"
  >{{ showF ? pair.f : pair.m }}<span class="gp-swap" aria-hidden="true">⇄</span></span>
</template>

<script setup>
import { ref, computed } from 'vue'

/**
 * Text that may exist in two gendered wordings — shown ONE at a time, the
 * sentence itself being the control (dashed underline + a small ⇄). Tapping
 * swaps to the other wording; the showing wording is tinted, blue for the
 * male reading and pink for the female.
 *
 * Each instance owns its own state, which is what makes the two axes
 * independent: a row paired on BOTH sides renders two of these, and the known
 * side (who is speaking) and the target side (who is spoken about) swap
 * separately. Coupling them could only ever reach 2 of the 4 combinations.
 *
 * Display only: the alternation between the two wordings is applied at audio
 * generation time, not here. `pair` is null for the great majority of texts,
 * and this then renders the plain text unchanged.
 */
const props = defineProps({
  text: { type: String, default: '' },
  pair: { type: Object, default: null }, // { m, f } or null
  // Which axis this pair varies on — labels only, never behaviour.
  axis: { type: String, default: 'speaker' }, // 'speaker' | 'referent'
  dir: { type: String, default: '' }
})

const showF = ref(false)
const toggle = () => { showF.value = !showF.value }

const bidi = computed(() => (props.dir ? { unicodeBidi: 'isolate' } : null))

const label = computed(() => {
  const who = props.axis === 'referent'
    ? (showF.value ? 'talking about a woman' : 'talking about a man')
    : (showF.value ? 'female speaker' : 'male speaker')
  return `${who} — tap to swap`
})
</script>

<style scoped>
.gp-tap {
  display: inline-block;
  /* Shrink to the wording, so a two-word chunk gets a two-word underline and
     not a full-bleed rule that reads like a row divider. */
  align-self: flex-start;
  max-width: 100%;
  cursor: pointer;
  padding: 6px 0;
  min-height: 34px;
  border-bottom: 1px dashed rgba(159, 176, 195, 0.45);
  -webkit-tap-highlight-color: transparent;
}
.gp-tap:focus-visible {
  outline: 2px solid rgba(159, 176, 195, 0.7);
  outline-offset: 2px;
  border-radius: 2px;
}
.gp-swap {
  font-size: 11px;
  opacity: 0.8;
  margin-left: 6px;
  unicode-bidi: isolate;
}
/* The showing wording is tinted: blue = male reading, pink = female. The tint
   is the state indicator, so it has to beat whatever colour class the caller
   put on this text — TextGeneration's light-theme overrides are !important, so
   these are too. */
.gp-tap.gp-m { color: #60a5fa !important; }
.gp-tap.gp-f { color: #f472b6 !important; }
:root[data-theme="light"] .gp-tap.gp-m { color: #1d4ed8 !important; }
:root[data-theme="light"] .gp-tap.gp-f { color: #be185d !important; }
:root[data-theme="light"] .gp-tap { border-bottom-color: rgba(71, 85, 105, 0.45); }
</style>
