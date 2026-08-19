<template>
  <!--
    EVERY WORD OF TEACHING COPY IN THE STUDIO LIVES IN THIS FILE.

    It is rendered from exactly one place — AutocueStudio.vue, behind
    `v-if="tutorial"` — and `tutorial` is only ever true for the /recording-
    tutorial route. So a real recordist cannot be shown any of this: there is no
    other mount, and nothing here is imported anywhere else. If you need to say
    something to a learner-recordist, say it HERE and nowhere else.
  -->
  <section class="tutorial-coach" data-tutorial-coach :data-tutorial-step="step">
    <div class="coach-dots" v-if="step !== 'intro'">
      <i v-for="s in ['natural', 'slow', 'pieces', 'splice']" :key="s" :class="{ on: reached(s) }"></i>
    </div>

    <!-- ── Step 1: before the microphone ─────────────────────────────────── -->
    <template v-if="step === 'intro'">
      <span class="coach-badge">Practice · step 1 of 4</span>
      <h2>This is a practice run of the real recorder</h2>
      <p>
        Same screen, same buttons, same feedback as a real session — the only
        difference is the words, and that <strong>nothing you record here is
        kept</strong>. Three or four minutes. You will hear what actually
        happens to your voice.
      </p>
      <p class="coach-note">
        This lesson is about <strong>course phrases</strong> — the single lines a
        learner hears one at a time. Recording a listening pod is a different job
        with the opposite instruction: there you perform, you play a character,
        you are alive. Nothing on this page applies to pods.
      </p>

      <label class="coach-label" for="tutorial-pack">The language you'll be reading</label>
      <select id="tutorial-pack" class="coach-select" :value="packId" @change="$emit('select-pack', $event.target.value)">
        <option v-for="p in packs" :key="p.id" :value="p.id">{{ p.label }}</option>
      </select>

      <p>
        You'll read four short things. Two at normal speaking speed, then two
        slowly. After the slow ones you'll hear what we actually do with them —
        that's the part that matters, and it's much easier to hear than to
        explain.
      </p>
      <p class="coach-muted">Headphones help. A quiet room helps more.</p>

      <!--
        SEAM FOR JOB #374 — microphone calibration.
        The calibration step (measure the room noise floor, set the silence
        threshold relative to it) is being built separately as a reusable piece,
        precisely so the tutorial can call it as its FIRST step. It mounts HERE,
        above "Begin Recording", and nothing in this file should grow its own
        version in the meantime. Until it lands, the studio's own in-session
        room measurement (the "Listening to the room" bar, useContinuousRecorder
        .isCalibrating) is what the recordist gets, one screen later.
      -->
      <p class="coach-seam">
        Mic check: the studio listens to your room for a moment when recording
        starts, and says so if it is too noisy to cut takes out of.
      </p>
    </template>

    <!-- ── Step 2: natural speed ─────────────────────────────────────────── -->
    <template v-else-if="step === 'natural'">
      <span class="coach-badge">Practice · step 2 of 4 · natural speed</span>
      <h2>
        Say this the way you'd say it to someone
        <button type="button" class="coach-toggle" @click="open = !open">{{ open ? 'Hide' : 'Why?' }}</button>
      </h2>
      <p v-show="open">
        We're not after a performance. We're after you, talking. If it sounds
        like you're reading, it will sound like reading to the learner too — so
        glance at the line, look up, and say it.
      </p>
      <p v-show="open" class="coach-muted">
        It records continuously: read the line, pause, and it moves on by itself.
      </p>
    </template>

    <!-- ── Step 3: slow, with beats ──────────────────────────────────────── -->
    <template v-else-if="step === 'slow'">
      <span class="coach-badge">Practice · step 3 of 4 · slow</span>
      <h2>
        Now read this in pieces
        <button type="button" class="coach-toggle" @click="open = !open">{{ open ? 'Hide' : 'Why?' }}</button>
      </h2>
      <p v-show="open">
        Leave a clear beat where the gaps are — <strong>hold half a second; long
        costs nothing</strong>. Say each piece <strong>flat and even</strong>: no
        rising at the end, no leaning on a word, same pitch and pace for all
        three. We are going to cut these apart and use the pieces inside other
        sentences, so a piece that "goes somewhere" will sound wrong everywhere
        it lands.
      </p>
      <p v-show="open" class="coach-note">
        Watch the row of pips above the line: one greens each time a pause lands.
        If they don't all light, the studio will stop and say so in red — that is
        the same refusal a real take gets, and it is not a test you can fail.
        Read it again.
      </p>
    </template>

    <!-- ── Step 4a: the cuts, on the review screen ───────────────────────── -->
    <template v-else-if="step === 'pieces'">
      <span class="coach-badge">Practice · step 4 of 4</span>
      <h2>These are your pieces now</h2>
      <p>
        Under each slow take is the row of LEGO pieces we cut out of it. Tap one:
        that is exactly what a learner would hear if this piece turned up on its
        own, in a sentence you never read.
      </p>
      <p class="coach-muted">
        The natural-speed takes have no pieces — they are never cut up, only
        played whole.
      </p>
    </template>

    <!-- ── Between: the session ended ────────────────────────────────────── -->
    <template v-else-if="step === 'summary'">
      <span class="coach-badge">Practice</span>
      <h2>That's the reading done — and nothing was saved</h2>
      <p>
        In a real session those takes would now be filed as clips. This one files
        nothing: there is no course attached, no upload, and the takes only exist
        in this tab until you close it.
      </p>
      <p>
        Press <strong>Review Recordings</strong> to hear where your slow reads
        were cut — that is the part worth staying for.
      </p>
    </template>

    <!-- ── Listen back to the take just captured ─────────────────────────── -->
    <div v-if="lastSegment && (step === 'natural' || step === 'slow')" class="coach-hear">
      <span class="coach-hear-text">You just read “{{ lastSegment.text }}”</span>
      <button type="button" class="coach-hear-btn" @click="$emit('play-last')">
        {{ playing ? '⏸ Playing' : '▶ Hear it back' }}
      </button>
    </div>

    <p v-show="open" class="coach-footer">
      Practice only. Nothing recorded here goes into a course, and none of it
      leaves this tab.
    </p>
  </section>
</template>

<script setup>
/**
 * The recordist tutorial's teaching voice — and the ONLY place it exists.
 *
 * Deliberately dumb: it renders copy for a step and emits two events. It owns
 * no recording state, no audio and no queue, so it cannot change what the
 * studio does — which is what makes "tutorial copy can never leak onto a real
 * screen" a structural claim rather than a promise.
 */
import { ref, watch } from 'vue'

const props = defineProps({
  // 'intro' | 'natural' | 'slow' | 'summary' | 'pieces'
  step: { type: String, required: true },
  packs: { type: Array, default: () => [] },
  packId: { type: String, default: '' },
  // The take just captured, so it can be heard immediately — the lesson's
  // "hear yourself back" beat. Null before the first one.
  lastSegment: { type: Object, default: null },
  playing: { type: Boolean, default: false }
})

defineEmits(['select-pack', 'play-last'])

// On a 390px phone the tip and the line the recordist has to read cannot both
// be above the fold. So the tip is read once and then gets out of the way: it
// collapses to its headline the moment a take of this step lands, and reopens
// on demand or when the step changes. The teaching still happens BEFORE the
// first read of each step, which is the only moment it has to be there.
const open = ref(true)
watch(() => props.step, () => { open.value = true })
watch(() => props.lastSegment?.id, (id) => { if (id) open.value = false })

// Progress dots. 'summary' sits between the reading and the cuts, so it counts
// as having reached the slow step and no further.
const ORDER = ['natural', 'slow', 'summary', 'pieces', 'splice']
function reached(s) {
  const here = ORDER.indexOf(props.step)
  const there = ORDER.indexOf(s)
  return here >= 0 && there >= 0 && there <= here
}
</script>

<style scoped>
/* Phone first, 390px. The coach sits above the working screen and must never
   push the line the recordist is reading off the top of it. */
.tutorial-coach {
  background: var(--color-shadow, #1b1b2b);
  border: 1px solid var(--color-graphite, #33334d);
  border-left: 3px solid var(--color-tungsten, #ffa630);
  border-radius: 14px;
  padding: 0.9rem 1rem;
  margin: 0 0 1rem;
  color: var(--color-paper, #ececf5);
  max-width: 640px;
}
.coach-dots { display: flex; gap: 0.35rem; margin: 0 0 0.7rem; }
.coach-dots > i { flex: 1; height: 4px; border-radius: 2px; background: var(--color-graphite, #33334d); }
.coach-dots > i.on { background: var(--color-tungsten, #ffa630); }
.coach-badge {
  display: inline-block; font-size: 0.68rem; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--color-paper-dim, #9a9ab5); margin-bottom: 0.3rem;
}
.tutorial-coach h2 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.15rem; margin: 0 0 0.5rem; color: var(--color-tungsten, #ffa630);
}
.tutorial-coach p { margin: 0.5rem 0; font-size: 0.95rem; line-height: 1.55; }
.coach-muted { color: var(--color-paper-dim, #9a9ab5); font-size: 0.88rem; }
.coach-note {
  border-left: 3px solid var(--color-emerald, #06ffa5);
  padding-left: 0.75rem; color: var(--color-paper-dim, #9a9ab5); font-size: 0.9rem;
}
.coach-seam {
  border-left: 3px solid var(--color-graphite, #33334d);
  padding-left: 0.75rem; color: var(--color-paper-dim, #9a9ab5); font-size: 0.88rem;
}
.coach-toggle {
  float: right;
  font-family: 'IBM Plex Mono', monospace; font-size: 0.7rem;
  min-height: 32px; padding: 0.25rem 0.6rem; margin-left: 0.5rem;
  border-radius: 8px; cursor: pointer;
  background: transparent; color: var(--color-paper-dim, #9a9ab5);
  border: 1px solid var(--color-graphite, #33334d);
}
.coach-label {
  display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--color-paper-dim, #9a9ab5); margin: 0.9rem 0 0.3rem;
}
.coach-select {
  width: 100%; min-height: 48px; padding: 0.7rem; font-size: 1rem;
  background: var(--color-void, #12121c); color: var(--color-paper, #ececf5);
  border: 1px solid var(--color-graphite, #33334d); border-radius: 10px;
}
.coach-hear {
  display: flex; align-items: center; justify-content: space-between; gap: 0.6rem;
  flex-wrap: wrap; margin-top: 0.8rem; padding: 0.6rem 0.7rem; border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
}
.coach-hear-text { font-size: 0.85rem; min-width: 0; }
.coach-hear-btn {
  font-family: 'Josefin Sans', sans-serif; font-size: 0.9rem; font-weight: 600;
  min-height: 44px; padding: 0.5rem 0.9rem; border-radius: 10px; cursor: pointer;
  background: var(--color-emerald, #06ffa5); color: var(--color-void, #12121c); border: none;
}
.coach-footer {
  margin: 0.9rem 0 0; padding-top: 0.7rem; font-size: 0.78rem;
  color: var(--color-paper-dim, #9a9ab5);
  border-top: 1px solid var(--color-graphite, #33334d);
}
</style>
