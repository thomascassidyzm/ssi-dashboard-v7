<template>
  <section class="tutorial-splice" data-tutorial-splice>
    <h2>You never said any of these</h2>
    <p class="splice-note">
      Every one of these is your own voice, cut up and stuck back together out of
      the pieces above. If they sound like one person saying one sentence, your
      slow read was neutral enough. If a word jumps out, or the pitch steps up
      and down between pieces, that's the thing to fix — and it's the only
      feedback that's ever really worked.
    </p>

    <p v-if="!ready" class="splice-blocked">
      {{ blockedReason }}
    </p>

    <div v-else class="splice-list">
      <div v-for="(r, i) in recombine" :key="i" class="splice-row">
        <span class="splice-label">{{ r.label }}</span>
        <button
          type="button"
          class="splice-btn"
          :disabled="building"
          @click="play(i)"
        >{{ playingIndex === i ? '⏸ Playing' : (built[i] ? '▶ Play again' : '▶ Hear it') }}</button>
      </div>
      <p v-if="error" class="splice-blocked">{{ error }}</p>
    </div>

    <p class="splice-footer">
      Happy with how those sound? Then you're ready. Nothing you just recorded
      was kept — open your real recording set and the queue is exactly as you
      left it.
    </p>
  </section>
</template>

<script setup>
/**
 * The lesson's last beat: pieces of the recordist's own two slow takes,
 * recombined into sentences they never read.
 *
 * WHY THIS IS A TUTORIAL-ONLY COMPONENT and not a studio feature: the real
 * studio's job is to capture and file takes. This exists to prove, in the
 * recordist's ear, why a slow read has to be neutral — a sentence assembled
 * from three pieces that each "went somewhere" sounds broken, and no amount of
 * written instruction lands that. It is the pedagogy Kai approved, moved inside
 * the real screen.
 *
 * WHERE THE PIECES COME FROM: the takes' own chunk ranges as the REVIEW SCREEN
 * computed them (buildTakeChunks over the VAD's live pause timings) — the same
 * ranges the ▶ buttons on each SegmentCard play. So what is spliced here is
 * exactly what the product would cut, not a second opinion.
 *
 * The cutting/joining maths is src/utils/takeSplice.js, brought over unchanged
 * from the standalone tutorial: it is an in-browser port of align-audio.cjs's
 * extract and audio-processor.cjs's concatenate, with its own note on what is
 * faithful and what differs.
 *
 * NOTHING HERE UPLOADS. It decodes blobs already in memory and makes new ones.
 * There is no fetch in this file.
 */
import { ref, computed, onBeforeUnmount } from 'vue'
import { decodeMono, sliceChunk, concatChunks, encodeWavMono } from '@/utils/takeSplice'

const props = defineProps({
  // In reading order: the two slow takes, each { blob, chunks: [{startMs,endMs}] }
  takes: { type: Array, default: () => [] },
  // The pack's plan: [{ label, pieces: [[takeIndex, chunkIndex], ...] }]
  recombine: { type: Array, default: () => [] }
})

const building = ref(false)
const error = ref('')
const playingIndex = ref(null)
const built = ref({})

let audioEl = null
const urls = []

// Splicing needs BOTH slow takes cut into the same number of pieces as the
// plan expects. A take the studio refused was never stored, so in practice
// this only fires when someone skipped one — say which, rather than offering a
// button that plays half a sentence.
const usable = computed(() =>
  props.takes.length >= 2 && props.takes.every(t => t?.blob && (t.chunks?.length || 0) >= 3)
)
const ready = computed(() => usable.value && props.recombine.length > 0)

const blockedReason = computed(() => {
  if (!props.takes.length) return 'The two slow reads are missing — record them and come back.'
  if (props.takes.length < 2) return 'Only one slow read was kept. Both are needed to build a sentence you never said.'
  const short = props.takes.findIndex(t => (t.chunks?.length || 0) < 3)
  if (short !== -1) return `Slow read ${short + 1} did not come out in three pieces, so there is nothing to swap. Record it again with a clearer pause.`
  return 'Nothing to splice.'
})

// Decoded takes, cached: decoding the same blob three times to build three
// sentences is three AudioContexts for no reason.
const decoded = []
async function decodeTake(i) {
  if (decoded[i]) return decoded[i]
  const bytes = await props.takes[i].blob.arrayBuffer()
  decoded[i] = await decodeMono(bytes)
  return decoded[i]
}

async function buildOne(index) {
  const plan = props.recombine[index]
  const pieces = []
  let sampleRate = 48000
  for (const [takeIndex, chunkIndex] of plan.pieces) {
    const take = props.takes[takeIndex]
    const range = take?.chunks?.[chunkIndex]
    if (!take || !range) throw new Error('A piece of that sentence is missing.')
    const { samples, sampleRate: sr } = await decodeTake(takeIndex)
    sampleRate = sr
    pieces.push(sliceChunk(samples, sr, range.startMs, range.endMs))
  }
  const joined = concatChunks(pieces, sampleRate, { gapMs: 0 })
  const url = URL.createObjectURL(encodeWavMono(joined, sampleRate))
  urls.push(url)
  return url
}

async function play(index) {
  error.value = ''
  if (playingIndex.value === index) { stop(); return }
  stop()
  try {
    if (!built.value[index]) {
      building.value = true
      built.value = { ...built.value, [index]: await buildOne(index) }
    }
  } catch (err) {
    error.value = err?.message || 'Could not put those pieces together.'
    return
  } finally {
    building.value = false
  }

  if (!audioEl) audioEl = new Audio()
  audioEl.src = built.value[index]
  playingIndex.value = index
  audioEl.onended = () => { if (playingIndex.value === index) playingIndex.value = null }
  audioEl.onerror = () => {
    playingIndex.value = null
    error.value = 'That spliced clip would not play.'
  }
  const p = audioEl.play()
  if (p?.catch) p.catch(() => { playingIndex.value = null })
}

function stop() {
  if (audioEl) { audioEl.onended = null; audioEl.onerror = null; audioEl.pause() }
  playingIndex.value = null
}

onBeforeUnmount(() => {
  stop()
  urls.forEach(URL.revokeObjectURL)
})
</script>

<style scoped>
.tutorial-splice {
  background: var(--color-shadow, #1b1b2b);
  border: 1px solid var(--color-graphite, #33334d);
  border-left: 3px solid var(--color-tungsten, #ffa630);
  border-radius: 14px;
  padding: 1rem;
  margin: 1rem 0;
  max-width: 640px;
  color: var(--color-paper, #ececf5);
}
.tutorial-splice h2 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.15rem; margin: 0 0 0.5rem; color: var(--color-tungsten, #ffa630);
}
.splice-note {
  border-left: 3px solid var(--color-emerald, #06ffa5);
  padding-left: 0.75rem; margin: 0.5rem 0 1rem;
  font-size: 0.9rem; line-height: 1.55; color: var(--color-paper-dim, #9a9ab5);
}
.splice-list { display: flex; flex-direction: column; gap: 0.6rem; }
.splice-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 0.6rem; flex-wrap: wrap;
  background: rgba(255, 255, 255, 0.05); border-radius: 10px; padding: 0.6rem 0.7rem;
}
.splice-label { font-size: 1rem; min-width: 0; }
.splice-btn {
  font-family: 'Josefin Sans', sans-serif; font-size: 0.9rem; font-weight: 600;
  min-height: 44px; padding: 0.5rem 0.9rem; border-radius: 10px; cursor: pointer;
  background: var(--color-emerald, #06ffa5); color: var(--color-void, #12121c); border: none;
}
.splice-btn:disabled { opacity: 0.5; cursor: default; }
.splice-blocked { color: var(--color-tungsten, #ffa630); font-size: 0.9rem; }
.splice-footer {
  margin: 1rem 0 0; padding-top: 0.7rem; font-size: 0.82rem;
  color: var(--color-paper-dim, #9a9ab5);
  border-top: 1px solid var(--color-graphite, #33334d);
}
</style>
