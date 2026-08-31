<script setup>
/**
 * CANDIDATE VOICES — hear it, then cast it, one tap each.
 *
 * Tom, 2026-08-31: "help me find a way to assign new Cartesia voices to existing
 * languages - without any fuss or bother", and on the affordance: no drag, no
 * multi-step wizard, tap is the only one.
 *
 * This replaces a <select> dropdown, and the reason is the failure it invited. A
 * dropdown offers a NAME. A name is not a voice, so casting from a dropdown is
 * casting a voice nobody has heard — which is the exact thing this screen exists
 * to stop. Every row here carries its own play button on a REAL course line, and
 * the cast is the second tap, never the first.
 *
 * No confirmation dialog: a cast is undone by one tap on `Clear`, and a guard on a
 * reversible action is a guard that trains people to click through guards.
 */
import ConsentBadge from './ConsentBadge.vue'

defineProps({
  candidates: { type: Array, default: () => [] },
  /** voiceId -> { url, free, cached, durationMs } for the samples that exist. */
  samples: { type: Object, default: () => ({}) },
  /** Which voice is currently sounding, so the row can say so. */
  playing: { type: String, default: '' },
  busy: { type: Boolean, default: false },
  /** Per-voice pace tooltip, passed in so the panel keeps one copy of that logic. */
  paceTitle: { type: Function, default: () => '' },
  paceSuffix: { type: Function, default: () => '' },
  emptyText: { type: String, default: 'no voice in the estate declares this language' },
  /**
   * voiceId -> why this box cannot render it. A dot that means "not rendered yet"
   * and a dot that means "nothing here can ever render this" are different facts,
   * and the second one must say so where it sits rather than only in a summary
   * line under the block.
   */
  unrenderableWhy: { type: Object, default: () => ({}) },
})

defineEmits(['play', 'cast'])

/**
 * NO CONSENT, NO CAST BUTTON (Tom's ruling, 2026-08-31).
 *
 * This screen used to show a confirm dialog with "Cast it anyway?" behind it.
 * Tom has ruled that out: "we are never going to use a voice without consent".
 * A dialog with a way through is a warning, and a warning is what was already
 * there.
 *
 * The DECISION is still the backend's — `c.consent` is the block
 * services/voicelab/consent.cjs computed, and this reads the two flags it
 * publishes rather than forming a second opinion about consent in a Vue file.
 * `aboutAPerson` is false for every vendor stock voice, so nothing changes for
 * the 290 catalogue voices; only a clone or a real recordist can be blocked.
 */
function blockedFor (c) {
  const k = c && c.consent
  if (!k || !k.aboutAPerson || k.authorised) return ''
  return k.castWarning || k.summary || 'No consent is recorded for this voice.'
}
</script>

<template>
  <div class="vl-cands">
    <p v-if="!candidates.length" class="vl-muted vl-cands-empty">{{ emptyText }}</p>

    <div v-for="c in candidates" :key="c.voiceId" class="vl-cand">
      <!-- HEAR IT. A voice with no sample yet says so plainly rather than
           offering a dead button: "we have not rendered this one" and "this one
           is silent" are different facts and must not look the same. -->
      <button
        v-if="samples[c.voiceId]"
        class="vl-cand-play"
        :class="{ 'is-playing': playing === c.voiceId }"
        :title="samples[c.voiceId].free
          ? 'A take that already exists in the estate — free to hear'
          : 'Rendered for this page and cached; hearing it again costs nothing'"
        @click="$emit('play', c.voiceId)"
      >{{ playing === c.voiceId ? '■' : '▶' }}</button>
      <span
        v-else
        class="vl-cand-nosample"
        :class="{ 'is-never': Boolean(unrenderableWhy[c.voiceId]) }"
        :title="unrenderableWhy[c.voiceId]
          ? `Cannot be previewed here — ${unrenderableWhy[c.voiceId]}. It can still be cast.`
          : 'No clip yet. Generate preview clips for this language to hear it.'"
      >{{ unrenderableWhy[c.voiceId] ? '—' : '·' }}</span>

      <span class="vl-cand-name" :title="paceTitle(c)">{{ c.name }}</span>
      <span class="vl-cand-kind ui-pill ui-hue-quiet">{{ c.kind }}</span>
      <!-- CONSENT, ON THE VOICE, WHEREVER THE VOICE APPEARS (Tom, 2026-08-31).
           A clone nobody has authorised must not look like an authorised one at
           a glance, and this is the list a cast is made from. Vendor stock
           voices carry no badge — there is nobody behind them to ask. -->
      <ConsentBadge v-if="c.consent && c.consent.aboutAPerson" :consent="c.consent" />
      <span v-if="paceSuffix(c)" class="vl-cand-pace">{{ paceSuffix(c) }}</span>
      <span v-if="samples[c.voiceId] && samples[c.voiceId].free" class="vl-cand-free" title="Already in the estate — hearing it spends nothing">free</span>

      <!-- CAST IT. One tap, no confirm, reversible with Clear.
           UNLESS NOBODY HAS CONSENTED (Tom, 2026-08-31: "we are never going to
           use a voice without consent"). Then there is no button at all — not a
           disabled one you can argue with, and not a dialog you can click
           through. The row says what is missing and what to do about it, and
           the `consent…` editor beside it is the way through. The server
           refuses this identically, so a stale tab cannot cast either. -->
      <span v-if="blockedFor(c)" class="vl-cand-noconsent" :title="blockedFor(c)">consent needed</span>
      <button v-else class="vl-cand-cast" :disabled="busy" @click="$emit('cast', c.voiceId)">Cast</button>
    </div>
  </div>
</template>

<style scoped>
.vl-cands { display: flex; flex-direction: column; gap: .25rem; max-height: 19rem; overflow-y: auto; }
.vl-cands-empty { margin: 0; }
.vl-cand {
  display: flex; align-items: center; gap: .5rem;
  padding: .25rem .4rem; border-radius: 6px;
}
.vl-cand:hover { background: var(--surface-2, rgba(127, 127, 127, .08)); }
.vl-cand-play, .vl-cand-cast {
  border: 1px solid var(--line); background: transparent; color: inherit;
  border-radius: 6px; cursor: pointer; font: inherit; line-height: 1;
}
.vl-cand-play { width: 1.9rem; height: 1.9rem; flex: none; font-size: .8125rem; }
.vl-cand-play.is-playing { background: var(--accent, #6366f1); border-color: var(--accent, #6366f1); color: #fff; }
.vl-cand-nosample { width: 1.9rem; flex: none; text-align: center; opacity: .35; }
/* Quieter still: this one is not waiting for a press, it is never coming. */
.vl-cand-nosample.is-never { opacity: .22; }
.vl-cand-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vl-cand-kind { flex: none; font-size: .6875rem; }
.vl-cand-pace, .vl-cand-free { flex: none; font-size: .75rem; opacity: .7; }
.vl-cand-cast { flex: none; padding: .25rem .7rem; font-size: .8125rem; font-weight: 600; }
.vl-cand-cast:hover:not(:disabled) { background: var(--accent, #6366f1); border-color: var(--accent, #6366f1); color: #fff; }
.vl-cand-cast:disabled { opacity: .5; cursor: default; }
/* Not a disabled button — a statement. A greyed-out control invites a hunt for
   the way to enable it; this says what is missing instead. */
.vl-cand-noconsent {
  flex: none; padding: .25rem .5rem; font-size: .75rem; font-weight: 600;
  border-radius: 6px; color: var(--hue-warn-fg, #b45309);
  background: var(--hue-warn-bg, rgba(245, 158, 11, .14));
}
</style>
