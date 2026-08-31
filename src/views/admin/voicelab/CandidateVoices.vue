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
 *
 * ── THREE TAPS, AND WHAT EACH ONE IS FOR (Tom's three gaps, 2026-08-31) ──────
 *   ▶  on the left    hear this voice. If it has no clip, one tap renders one and
 *                     plays it — "no clip yet" is no longer a dead end, which was
 *                     gap two.
 *   the NAME          hear it properly: the judging set, several different lines,
 *                     each with its own tap. One clip may flatter a voice; that
 *                     was gap three.
 *   the consent chip  give consent to this voice. It is the same chip that says
 *                     the voice has none, so the state and the door are one
 *                     control rather than a state and a hunt. That was gap one,
 *                     and it was ours: casting was blocked estate-wide on the day
 *                     nothing here could satisfy the block.
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
  /**
   * Which list this is. The same voice appears in the primary and the backup
   * list of the same language, so without this, opening a voice in one of them
   * opens it in BOTH — two identical strips, and, worse, two consent panels
   * with two microphones in them.
   */
  listKey: { type: String, default: '' },
  /** The voice whose judging set is open, in which list. Only ever one at a time. */
  openVoice: { type: String, default: '' },
  openIn: { type: String, default: '' },
  /** The voice whose consent panel is open, in which list. */
  consentFor: { type: String, default: '' },
  consentIn: { type: String, default: '' },
  openClips: { type: Object, default: null },
  /** The voice currently being rendered, so its row can say so rather than freeze. */
  rendering: { type: String, default: '' },
})

defineEmits(['play', 'cast', 'open', 'hear', 'consent'])

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
  <div class="vl-cands-wrap">
    <div class="vl-cands">
    <p v-if="!candidates.length" class="vl-muted vl-cands-empty">{{ emptyText }}</p>

    <template v-for="c in candidates" :key="c.voiceId">
    <div class="vl-cand">
      <!-- HEAR IT. A voice with no clip is no longer a dot you cannot press:
           the same tap renders one and plays it. What it CANNOT do is still
           said in place — "nothing has rendered this yet" and "nothing here can
           ever render this" are different facts and must not look the same. -->
      <button
        v-if="samples[c.voiceId]"
        class="vl-cand-play"
        :class="{ 'is-playing': playing === c.voiceId }"
        :title="samples[c.voiceId].free
          ? 'A take that already exists in the estate — free to hear'
          : 'Rendered for this page and cached; hearing it again costs nothing'"
        @click="$emit('play', c.voiceId)"
      >{{ playing === c.voiceId ? '■' : '▶' }}</button>
      <button
        v-else-if="!unrenderableWhy[c.voiceId]"
        class="vl-cand-play is-empty"
        :disabled="rendering === c.voiceId"
        title="No clip yet — this renders one and plays it"
        @click="$emit('hear', { voiceId: c.voiceId, lineIndex: 0 })"
      >{{ rendering === c.voiceId ? '·' : '▷' }}</button>
      <!-- A HUMAN VOICE IS HEARD ON ITS OWN RECORDINGS. Nothing synthesises a
           person, so the name opens what the estate actually holds of them
           rather than offering a render that cannot happen. -->
      <button
        v-else
        class="vl-cand-play is-own"
        :title="`${unrenderableWhy[c.voiceId]} — this opens the recordings the estate holds`"
        @click="$emit('open', c.voiceId)"
      >▷</button>

      <button class="vl-cand-name" :title="paceTitle(c)" @click="$emit('open', c.voiceId)">{{ c.name }}</button>
      <span class="vl-cand-kind ui-pill ui-hue-quiet">{{ c.kind }}</span>
      <!-- CONSENT, ON THE VOICE, WHEREVER THE VOICE APPEARS (Tom, 2026-08-31).
           A clone nobody has authorised must not look like an authorised one at
           a glance, and this is the list a cast is made from. Vendor stock
           voices carry no badge — there is nobody behind them to ask. -->
      <button v-if="c.consent && c.consent.aboutAPerson" class="vl-cand-badge" @click="$emit('consent', c.voiceId)">
        <ConsentBadge :consent="c.consent" />
      </button>
      <span v-if="paceSuffix(c)" class="vl-cand-pace">{{ paceSuffix(c) }}</span>
      <span v-if="samples[c.voiceId] && samples[c.voiceId].free" class="vl-cand-free" title="Already in the estate — hearing it spends nothing">free</span>

      <!-- CAST IT. One tap, no confirm, reversible with Clear.
           UNLESS NOBODY HAS CONSENTED (Tom, 2026-08-31: "we are never going to
           use a voice without consent"). Then there is no cast button — not a
           disabled one you can argue with, and not a dialog you can click
           through. What sits there instead is THE WAY THROUGH: one tap opens
           the consent panel for this voice. The server refuses the cast
           identically, so a stale tab cannot cast either. -->
      <button v-if="blockedFor(c)" class="vl-cand-noconsent" :title="blockedFor(c)" @click="$emit('consent', c.voiceId)">consent…</button>
      <button v-else class="vl-cand-cast" :disabled="busy" @click="$emit('cast', c.voiceId)">Cast</button>
    </div>

    <!-- THE JUDGING SET. Several lines, of deliberately different lengths, from
         the course this voice would actually speak — one clip can flatter a
         voice or misrepresent it. An empty pill is dashed and tappable: tapping
         renders that one line and plays it. -->
    <div v-if="openVoice === c.voiceId && openIn === listKey" class="vl-cand-set">
      <p v-if="!openClips" class="vl-muted vl-cand-setline">…</p>
      <template v-else>
        <button
          v-for="clip in (openClips.clips || [])"
          :key="clip.lineIndex"
          class="vl-cand-line"
          :class="{ 'is-empty': !clip.url, 'is-playing': playing === `${c.voiceId}:${clip.lineIndex}` }"
          :disabled="rendering === `${c.voiceId}:${clip.lineIndex}`"
          @click="$emit('hear', { voiceId: c.voiceId, lineIndex: clip.lineIndex })"
        >
          <span class="vl-cand-line-play">{{ playing === `${c.voiceId}:${clip.lineIndex}` ? '■' : '▶' }}</span>
          <span class="vl-cand-line-text">{{ (openClips.lines[clip.lineIndex] || {}).text }}</span>
        </button>
        <p v-if="openClips.why" class="vl-muted vl-cand-setline">{{ openClips.why }}</p>
        <p v-else-if="!(openClips.clips || []).length" class="vl-muted vl-cand-setline">no course line in this language yet</p>
      </template>
    </div>
    </template>
    </div>

    <!-- THE CONSENT PANEL OPENS WHERE IT WAS ASKED FOR — under this list, not
         several screens up the page where it used to render, half-hidden behind
         the sticky header. Outside the scrolling list rather than inside it: the
         list is capped at 19rem and a panel with a microphone in it does not fit
         in a 19rem scroll box. The panel itself lives in LanguagesPanel, which
         owns the recording and the writes; this is only where it is drawn. -->
    <slot v-if="consentFor && consentIn === listKey" name="consent" :voice-id="consentFor" />
  </div>
</template>

<style scoped>
.vl-cands-wrap { display: flex; flex-direction: column; gap: .5rem; }
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
/* Nothing rendered yet — an outline, and pressing it is what fills it. */
.vl-cand-play.is-empty { border-style: dashed; opacity: .6; }
.vl-cand-play.is-own { border-style: dotted; opacity: .6; }
.vl-cand-name {
  flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  border: 0; background: transparent; color: inherit; font: inherit; text-align: left;
  padding: 0; cursor: pointer;
}
.vl-cand-name:hover { text-decoration: underline; }
.vl-cand-badge { border: 0; background: transparent; padding: 0; cursor: pointer; font: inherit; }
.vl-cand-kind { flex: none; font-size: .6875rem; }
.vl-cand-pace, .vl-cand-free { flex: none; font-size: .75rem; opacity: .7; }
.vl-cand-cast { flex: none; padding: .25rem .7rem; font-size: .8125rem; font-weight: 600; }
.vl-cand-cast:hover:not(:disabled) { background: var(--accent, #6366f1); border-color: var(--accent, #6366f1); color: #fff; }
.vl-cand-cast:disabled { opacity: .5; cursor: default; }
/* The state and the door in one control: it says what is missing, and pressing
   it is how you fix it. */
.vl-cand-noconsent {
  flex: none; padding: .25rem .5rem; font-size: .75rem; font-weight: 600;
  border-radius: 6px; color: var(--hue-warn-fg, #b45309); cursor: pointer;
  background: var(--hue-warn-bg, rgba(245, 158, 11, .14)); border: 1px solid transparent;
}
.vl-cand-noconsent:hover { border-color: var(--hue-warn-fg, #b45309); }
.vl-cand-set { display: flex; flex-direction: column; gap: .25rem; padding: .1rem 0 .5rem 2.4rem; }
.vl-cand-setline { margin: 0; font-size: .75rem; }
.vl-cand-line {
  display: flex; align-items: center; gap: .5rem; text-align: left;
  border: 1px solid var(--line); background: transparent; color: inherit;
  border-radius: 999px; padding: .2rem .7rem; font: inherit; font-size: .8125rem; cursor: pointer;
}
.vl-cand-line.is-empty { border-style: dashed; opacity: .55; }
.vl-cand-line.is-playing { background: var(--accent, #6366f1); border-color: var(--accent, #6366f1); color: #fff; }
.vl-cand-line-play { flex: none; }
.vl-cand-line-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
