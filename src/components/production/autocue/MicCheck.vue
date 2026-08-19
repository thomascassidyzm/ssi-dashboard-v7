<template>
  <!-- The microphone check. Two steps, one screen, phone-first: at 390px this
       is the whole viewport width and nothing here scrolls sideways. -->
  <div class="mic-check" :class="{ 'is-modal': modal }">
    <div class="mc-panel">
      <div class="mc-head">
        <h3>Check your microphone</h3>
        <button v-if="modal" class="mc-x" type="button" @click="$emit('close')" aria-label="Close">×</button>
      </div>

      <!-- Idle: say what it is for and what it will ask, before asking. -->
      <template v-if="cal.step.value === 'idle'">
        <p class="mc-why">
          Takes about five seconds. I listen to your room, then to your voice, and set
          the recorder's silence detection to the difference between them — so it knows
          where your phrases end on <em>this</em> microphone.
        </p>
        <p v-if="existing" class="mc-existing" :class="`quality-${existing.quality}`">
          Last checked {{ agoLabel }} on <strong>{{ existing.label }}</strong>.
          <span v-if="stale">Worth re-checking.</span>
        </p>
        <div class="mc-actions">
          <button class="mc-go" type="button" @click="start">Start the check</button>
          <button class="mc-skip" type="button" @click="skip">Skip</button>
        </div>
      </template>

      <!-- Running: one instruction at a time, and a live meter so they can see
           the mic is alive. A recordist staring at a dead bar knows instantly
           that something is wrong; a spinner tells them nothing. -->
      <template v-else-if="cal.isRunning.value">
        <div class="mc-step" :class="`step-${cal.step.value}`">
          <span class="mc-dot" />
          {{ cal.instruction.value }}
        </div>
        <div class="mc-meter"><div class="mc-bar" :style="{ width: meterPercent + '%' }" /></div>
        <p class="mc-hint">
          {{ cal.step.value === 'room'
            ? 'Not a sound — this is the bit that measures your background noise.'
            : 'Anything will do. Read the line you are about to record, at your normal volume.' }}
        </p>
      </template>

      <!-- Done: the verdict, in words, first. -->
      <template v-else-if="cal.step.value === 'done' && cal.result.value">
        <div class="mc-verdict" :class="`quality-${cal.result.value.quality}`">
          <strong>{{ verdictHeading }}</strong>
          <span>{{ cal.result.value.message }}</span>
        </div>
        <p class="mc-numbers">
          Your voice sits {{ Math.round(cal.result.value.headroomDb) }}dB above your room.
          Silence detection set to {{ cal.result.value.threshold.toFixed(4) }}.
        </p>
        <div class="mc-actions">
          <button class="mc-go" type="button" @click="$emit('done', cal.profile.value)">
            {{ cal.result.value.quality === 'too-loud' ? 'Record anyway' : 'Done' }}
          </button>
          <button class="mc-skip" type="button" @click="restart">Check again</button>
        </div>
      </template>

      <!-- Failed: never a wall. Say what happened, say what will be used
           instead, and give them the door out. -->
      <template v-else-if="cal.step.value === 'failed'">
        <div class="mc-verdict quality-too-loud">
          <strong>Mic check did not finish</strong>
          <span>{{ cal.error.value }}</span>
        </div>
        <p class="mc-numbers">
          Recording will use the standard silence setting instead. That is exactly how the
          recorder behaved before this check existed, so nothing is lost — it is just not
          tuned to your mic.
        </p>
        <div class="mc-actions">
          <button class="mc-go" type="button" @click="restart">Try again</button>
          <button class="mc-skip" type="button" @click="skip">Carry on without it</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
/**
 * The microphone check, as a component the studio AND the recordist tutorial
 * can both mount. It holds no studio state and knows nothing about queues,
 * courses or takes: give it a live VAD to drive (mid-session) or nothing at all
 * (standalone), and it emits `done` with the stored profile or `skip`.
 *
 * See useMicCalibration.ts for why this exists at all.
 */
import { computed, ref, onMounted } from 'vue'
import { useMicCalibration, loadProfile, deviceKeyFor, isStale } from '@/composables/useMicCalibration'

const props = defineProps({
  // Drive an already-listening VAD instead of opening our own microphone. The
  // studio passes its recorder's; the tutorial passes nothing.
  existingVad: { type: Object, default: null },
  stream: { type: Object, default: null },
  // Render as an overlay with a close button (mid-session re-check) rather than
  // as an inline step (tutorial, or before the first take).
  modal: { type: Boolean, default: false },
  // Start measuring the moment it appears, for a flow that has already told the
  // recordist what is about to happen.
  autoStart: { type: Boolean, default: false }
})

const emit = defineEmits(['done', 'skip', 'close'])

const cal = useMicCalibration({ existingVad: props.existingVad, stream: props.stream })

// Any profile already stored for the mic currently in use, so a returning
// recordist sees what is in force rather than a blank check.
const existing = ref(null)
const stale = computed(() => isStale(existing.value))
onMounted(() => {
  const track = props.stream?.getAudioTracks?.()[0]
  existing.value = loadProfile(deviceKeyFor(track).key)
  if (props.autoStart) start()
})

const agoLabel = computed(() => {
  if (!existing.value) return ''
  const days = Math.floor((Date.now() - existing.value.at) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
})

// Same scaling the studio's own level meter uses, so the two bars agree.
const meterPercent = computed(() => Math.min(100, Math.round(cal.level.value * 300)))

const verdictHeading = computed(() => ({
  quiet: 'Microphone is good',
  ok: 'Microphone is good',
  loud: 'Usable, with care',
  'too-loud': 'Too much room noise'
}[cal.result.value?.quality] || 'Checked'))

async function start() {
  const saved = await cal.run()
  if (saved) existing.value = saved
}
function restart() { cal.reset(); start() }
function skip() { cal.reset(); emit('skip') }
</script>

<style scoped>
.mic-check { width: 100%; }

/* Overlay form, for a re-check in the middle of a session. Full-bleed on a
   phone: at 390px a centred card with margins leaves the text column too
   narrow to read a two-line instruction in. */
.mic-check.is-modal {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.mc-panel {
  width: 100%;
  max-width: 420px;
  background: var(--color-shadow, #14161a);
  border: 1px solid var(--color-tungsten, var(--accent, #888));
  border-radius: 10px;
  padding: 1rem;
}

.mc-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.mc-head h3 { margin: 0; font-size: 1rem; letter-spacing: 0.01em; }
.mc-x { background: none; border: 0; color: inherit; font-size: 1.5rem; line-height: 1; padding: 0 0.25rem; cursor: pointer; }

.mc-why, .mc-hint, .mc-numbers, .mc-existing {
  font-size: 0.82rem;
  line-height: 1.4;
  margin: 0.6rem 0 0;
  opacity: 0.85;
}
.mc-existing.quality-too-loud { color: var(--color-crimson, #ff5c5c); opacity: 1; }

.mc-step {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.8rem;
  font-size: 0.95rem;
  font-weight: 600;
}
.mc-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--color-tungsten, var(--accent, #888));
  animation: mc-pulse 1.1s ease-in-out infinite;
  flex: none;
}
.step-voice .mc-dot { background: var(--color-crimson, #ff5c5c); }
@keyframes mc-pulse { 0%, 100% { opacity: 0.3 } 50% { opacity: 1 } }

.mc-meter {
  margin-top: 0.6rem;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.mc-bar { height: 100%; background: var(--color-tungsten, var(--accent, #888)); transition: width 60ms linear; }

.mc-verdict {
  margin-top: 0.8rem;
  border-radius: 8px;
  padding: 0.55rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.82rem;
  line-height: 1.35;
}
.mc-verdict strong { font-family: 'IBM Plex Mono', monospace; font-size: 0.72rem; letter-spacing: 0.04em; text-transform: uppercase; }
.mc-verdict.quality-quiet, .mc-verdict.quality-ok {
  background: rgba(92, 200, 130, 0.12);
  border: 1px solid var(--color-verdigris, #5cc882);
  color: var(--color-verdigris, #5cc882);
}
.mc-verdict.quality-loud {
  background: rgba(255, 186, 92, 0.12);
  border: 1px solid var(--color-tungsten, var(--accent, #ffba5c));
  color: var(--color-tungsten, var(--accent, #ffba5c));
}
.mc-verdict.quality-too-loud {
  background: rgba(255, 92, 92, 0.14);
  border: 1px solid var(--color-crimson, #ff5c5c);
  color: var(--color-crimson, #ff5c5c);
}

.mc-actions { display: flex; gap: 0.6rem; margin-top: 0.9rem; }
.mc-go, .mc-skip {
  flex: 1;
  /* 44px is the iOS minimum tap target; this whole surface is used on a phone
     held in one hand while the other holds a script. */
  min-height: 44px;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
}
.mc-go { background: var(--color-tungsten, var(--accent, #888)); border: 0; color: #111; font-weight: 600; }
.mc-skip { background: transparent; border: 1px solid rgba(255, 255, 255, 0.25); color: inherit; }
</style>
