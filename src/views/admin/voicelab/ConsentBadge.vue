<script setup>
/**
 * CONSENT BADGE — whose voice this is, who authorised it, and when.
 *
 * Tom, 2026-08-31: consent must be "shown on the voice itself, because these
 * are real people". So this one badge goes wherever a voice appears — the
 * candidate list, the cast slot, the clone result — and it renders the STORED
 * FACT the backend computed (services/voicelab/consent.cjs `describe`). It
 * never decides anything: a second opinion about consent living in a Vue
 * component is exactly how a screen starts disagreeing with its database.
 *
 * A voice with no consent record must read as UNMISTAKABLY different from an
 * authorised one, which is why "no consent recorded" is drawn as a warning
 * rather than as an absence. An absence looks like a loading state.
 */
defineProps({
  /** The `consent` block from the API. Null means the voice carries none. */
  consent: { type: Object, default: null },
  /** `full` prints the whole sentence; `pill` is the one-word chip for a row. */
  mode: { type: String, default: 'pill' },
})

const HUE = {
  authorised: 'ui-hue-good',
  awaiting_authorisation: 'ui-hue-warn',
  refused: 'ui-hue-bad',
  withdrawn: 'ui-hue-bad',
  not_recorded: 'ui-hue-warn',
}
</script>

<template>
  <span v-if="consent && mode === 'pill'" class="ui-pill vl-consent-pill" :class="HUE[consent.status]" :title="consent.summary">
    {{ consent.label }}
  </span>
  <span v-else-if="consent" class="vl-consent-full" :class="`is-${consent.status}`">
    <span class="ui-pill" :class="HUE[consent.status]">{{ consent.label }}</span>
    <span class="vl-consent-line">{{ consent.summary }}</span>
    <span v-if="consent.source" class="vl-consent-src">Sample: {{ consent.source }}</span>
    <!-- THE WORDS THEY ACTUALLY AGREED TO, verbatim off the voice — never the
         copy in the code, which will be redlined and would then quietly
         misreport what an older voice's person was shown. This is the thing
         that has to be producible later, so it is on the voice, not in a log. -->
    <span v-if="consent.declaration" class="vl-consent-decl">
      “{{ consent.declaration.words }}”
      <em v-if="consent.declaration.kind === 'spoken'">— read aloud on the recording</em>
      <em v-else>— agreed to when the recording was uploaded</em>
    </span>
  </span>
</template>

<style scoped>
.vl-consent-pill { flex: none; font-size: .6875rem; }
.vl-consent-full { display: flex; align-items: baseline; gap: .5rem; flex-wrap: wrap; font-size: .8125rem; }
.vl-consent-line { opacity: .85; }
.vl-consent-src { opacity: .6; font-size: .75rem; }
.vl-consent-decl { flex-basis: 100%; opacity: .8; font-size: .75rem; }
.vl-consent-decl em { opacity: .7; font-style: normal; }
</style>
