<script setup>
/**
 * HEARD IT, AND SAID SO — the second half of consent, on screen.
 *
 * Tom, 2026-08-31: "automatic consent is better and then a click to confirm or
 * something, once voice clone has been generated."
 *
 * A person cannot really consent to a clone before they have heard it. Agreeing
 * to "my voice being cloned" is agreeing to something nobody has heard yet, not
 * even us. So this strip appears under the clone's own audio, once, and asks the
 * only question that can be asked at that moment.
 *
 * ── THE TWO ANSWERS ARE THE SAME SIZE ───────────────────────────────────────
 * Same element, same class, same one tap, side by side, in the order they are
 * given. A confirm step where the yes is a button and the no is a link is not a
 * consent step, it is a funnel — and "that doesn't sound like me" is the whole
 * reason this exists: it is the person's one chance to stop the voice before a
 * learner hears it. `no` is final, and the strip says so before it is pressed.
 *
 * It decides NOTHING. The stage, the wording of the heading and both labels come
 * from the backend (services/voicelab/clone-confirmation.cjs) for the same
 * reason ConsentBadge renders rather than judges: a second opinion about consent
 * living in a component is how a screen starts disagreeing with its database.
 *
 * ── AND SOMETIMES THE THING THEY HEAR IS THEIR OWN TAKE ─────────────────────
 * Tom, 2026-08-31: "play back their OWN RECORDED TAKE as the confirmation
 * instead of a generated clone." Welsh, Breton and Cornish recordists are
 * human-voiced by design and Cartesia cannot clone those languages at all, so
 * the actual thing that will be used IS their recording. Same strip, same two
 * answers, same one tap; the audio just comes from the estate's own bucket
 * instead of from a rendered audition, and the words say so.
 *
 * WHICH ONE IT IS, THIS COMPONENT DOES NOT DECIDE either — `hearing.source`
 * comes down with everything else.
 */
import { ref, computed, watch } from 'vue'
import { api } from './labApi.js'

const props = defineProps({
  /** The voice id to decide about. */
  voiceId: { type: String, required: true },
  /**
   * The `confirmation` block from the API — describe() in
   * clone-confirmation.cjs. Optional: given a voice id and nothing else the
   * strip fetches its own, which is what a screen that never made the clone
   * (the team roster) has to be able to do.
   */
  confirmation: { type: Object, default: null },
  /**
   * True once the person has actually been able to play the clone. Only the
   * CLONE path needs this from a parent — the parent is what rendered the
   * audition. On the own-recording path the audio is inside this strip, so it
   * knows for itself whether it has been played.
   */
  heard: { type: Boolean, default: false },
})
const emit = defineEmits(['decided'])

const busy = ref('')
const error = ref('')
const state = ref(null)
const loading = ref(false)
/** Set by the <audio> element's own play event — never assumed. */
const playedOwn = ref(false)

const shown = computed(() => state.value || props.confirmation)
const answers = computed(() => (shown.value && shown.value.answers) || [])
const hearing = computed(() => (shown.value && shown.value.hearing) || null)
const ownRecording = computed(() => Boolean(hearing.value && hearing.value.source === 'own_recording'))
const clips = computed(() => (shown.value && shown.value.clips) || [])
/**
 * Has the thing actually been played? The clone path is told by its parent;
 * the own-recording path watches its own audio element. Either way this only
 * softens the wording — the ANSWERS are governed by the server, which is the
 * half that cannot be clicked past.
 */
const hasHeard = computed(() => (ownRecording.value ? playedOwn.value : props.heard))

/** Fetch when nobody handed us a block — the roster case. */
async function load () {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try { state.value = await api.cloneConfirmation(props.voiceId) } catch (e) { error.value = e.message }
  loading.value = false
}
watch(
  () => [props.voiceId, props.confirmation],
  () => { if (props.voiceId && !props.confirmation && !state.value) load() },
  { immediate: true },
)

async function decide (decision) {
  if (busy.value) return
  busy.value = decision
  error.value = ''
  try {
    const out = await api.decideCloneConfirmation(props.voiceId, { decision })
    state.value = out
    emit('decided', out)
  } catch (e) {
    error.value = e.message
  }
  busy.value = ''
}
</script>

<template>
  <div v-if="shown" class="vl-confirm" :class="`is-${shown.stage}`">
    <p class="vl-confirm-head">{{ shown.heading }}</p>

    <!-- THEIR OWN TAKE, PLAYED HERE. Straight from the estate's bucket: nothing
         is rendered, nothing is spent, and this is the exact file a learner
         hears — which is what makes it the right thing to consent to. -->
    <div v-if="ownRecording && clips.length" class="vl-confirm-clips">
      <p class="vl-confirm-note">{{ hearing.from }}.</p>
      <div v-for="c in clips" :key="c.s3Key" class="vl-confirm-clip">
        <audio :src="c.url" controls preload="none" @play="playedOwn = true" />
        <span class="vl-confirm-clip-text">{{ c.text }}<em v-if="c.seconds"> · {{ c.seconds }}s</em></span>
      </div>
    </div>

    <!-- Said before the buttons, not after: a person deciding needs to know
         that one of the two answers closes the voice for good. -->
    <p v-if="answers.length" class="vl-confirm-note">
      Play it to them first. Until they say yes, this voice is not used anywhere.
    </p>
    <p v-if="answers.length && !hasHeard" class="vl-confirm-note vl-confirm-wait">
      Nothing heard yet — {{ hearing ? hearing.waiting : 'play the clone above, then ask.' }}
    </p>
    <div v-if="answers.length" class="vl-confirm-answers">
      <button
        v-for="a in answers"
        :key="a.decision"
        class="vl-confirm-btn"
        :class="`is-${a.decision}`"
        :disabled="Boolean(busy)"
        @click="decide(a.decision)"
      >{{ busy === a.decision ? 'saving…' : a.label }}</button>
    </div>
    <p v-if="error" class="vl-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.vl-confirm {
  /* Full width inside the flex rows it sits in: the question belongs under the
     audio it is about, never squeezed beside it. */
  flex: 1 1 100%;
  width: 100%;
  margin: .5rem 0 0;
  padding: .5rem .625rem;
  border-left: 3px solid var(--warn, #d97706);
  background: var(--surface-2, rgba(0, 0, 0, .03));
  border-radius: 4px;
}
.vl-confirm.is-confirmed { border-left-color: var(--good, #16a34a); }
.vl-confirm.is-rejected,
.vl-confirm.is-withdrawn { border-left-color: var(--bad, #dc2626); }
.vl-confirm-head { margin: 0; font-weight: 600; font-size: .875rem; }
.vl-confirm-note { margin: .25rem 0 0; font-size: .8125rem; opacity: .75; }
.vl-confirm-wait { opacity: .6; font-style: italic; }
/* Their own takes, one per row: the audio first, the words beside it, so the
   operator can see what is about to be played before they play it. */
.vl-confirm-clips { margin-top: .5rem; }
.vl-confirm-clip { display: flex; align-items: center; gap: .5rem; margin-top: .375rem; flex-wrap: wrap; }
.vl-confirm-clip audio { height: 2rem; max-width: 18rem; }
.vl-confirm-clip-text { font-size: .8125rem; opacity: .8; }
.vl-confirm-clip-text em { opacity: .6; font-style: normal; }
/* BOTH ANSWERS, ONE SHAPE. Same width, same height, same weight — the only
   difference is the word on them, which is the only difference there is. */
.vl-confirm-answers {
  display: flex;
  gap: .5rem;
  margin-top: .5rem;
  flex-wrap: wrap;
}
.vl-confirm-btn {
  flex: 1 1 12rem;
  min-height: 2.5rem;
  padding: .5rem .75rem;
  font: inherit;
  font-weight: 600;
  border: 1px solid var(--line, #cbd5e1);
  border-radius: 4px;
  background: var(--surface, #fff);
  color: inherit;
  cursor: pointer;
}
.vl-confirm-btn:hover:not(:disabled) { border-color: currentColor; }
.vl-confirm-btn:disabled { opacity: .6; cursor: default; }
.vl-error { margin: .375rem 0 0; color: var(--bad, #dc2626); font-size: .8125rem; }
</style>
