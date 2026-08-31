<template>
  <div class="recording-controls">
    <div class="controls-row primary">
      <button class="control-btn" @click="$emit('slower')" :disabled="isRecording">
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 19 2 12l9-7z" /><path d="M22 19l-9-7 9-7z" /></svg>
        Slower
      </button>

      <button
        class="control-btn record"
        :class="{ recording: isRecording }"
        @click="$emit('toggle-recording')"
      >
        <span v-if="!isRecording">
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none" /></svg>
          Start Recording
        </span>
        <span v-else>
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
          Stop Recording
        </span>
      </button>

      <button class="control-btn" @click="$emit('faster')" :disabled="isRecording">
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m13 19 9-7-9-7z" /><path d="M2 19l9-7-9-7z" /></svg>
        Faster
      </button>
    </div>

    <div class="controls-row secondary">
      <!-- One button, two meanings — so it has to say both. See backTap.js:
           a single tap restarts the take being read, a double tap is the only
           thing that moves the script backwards. -->
      <button class="control-btn" @click="$emit('previous')" :disabled="!isRecording">
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
        <span v-if="backRestartsTake" class="btn-stack">
          <span>Take it again</span>
          <span class="btn-sub">double-tap = previous</span>
        </span>
        <span v-else>Previous</span>
      </button>

      <button class="control-btn" @click="$emit('pause')" :disabled="!isRecording">
        <svg v-if="isPaused" class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="m7 4 13 8-13 8z" /></svg>
        <svg v-else class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
        {{ isPaused ? 'Resume' : 'Pause' }}
      </button>

      <button class="control-btn" @click="$emit('next')" :disabled="!isRecording">
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
        Next
      </button>
    </div>

    <div class="keyboard-hints">
      <span class="hint"><kbd>Space</kbd> Record</span>
      <span class="hint" v-if="backRestartsTake"><kbd>←</kbd> Take again · <kbd>←←</kbd> Previous</span>
      <span class="hint" v-else><kbd>←</kbd><kbd>→</kbd> Navigate</span>
      <span class="hint" v-if="backRestartsTake"><kbd>→</kbd> Next</span>
      <span class="hint"><kbd>↑</kbd><kbd>↓</kbd> Speed</span>
      <span class="hint"><kbd>P</kbd> Pause</span>
    </div>
  </div>
</template>


<script setup>
defineProps({
  isRecording: { type: Boolean, default: false },
  isPaused: { type: Boolean, default: false },
  // Autocue Studio gives Back the media-player behaviour (tap = restart this
  // take, double-tap = previous take). Off by default so the surfaces that
  // still step straight back — the tutorial — do not advertise a behaviour
  // they do not have.
  backRestartsTake: { type: Boolean, default: false }
})

defineEmits(['toggle-recording', 'pause', 'previous', 'next', 'slower', 'faster'])
</script>

<style scoped>
.btn-stack {
  display: inline-flex;
  flex-direction: column;
  line-height: 1.15;
}

.btn-sub {
  font-size: 0.7rem;
  font-weight: 400;
  color: var(--muted);
}

.recording-controls {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  align-items: center;
}

.controls-row {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
}

.control-btn {
  background: var(--surface);
  border: 1px solid var(--line);
  color: var(--ink);
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  font: inherit;
  font-weight: 600;
  font-size: 0.9375rem;
  min-height: 44px;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, opacity 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 140px;
  justify-content: center;
}

.control-btn span { display: inline-flex; align-items: center; gap: 0.5rem; }

.btn-icon {
  width: 18px;
  height: 18px;
  flex: none;
}

.control-btn:hover:not(:disabled) {
  border-color: var(--accent);
}

.control-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* The one loud control on the page, and deliberately so: it is what a
   recordist reaches for standing at a mic. Solid --danger, no glow. */
.control-btn.record {
  background: var(--danger);
  border-color: var(--danger);
  color: var(--canvas);
  font-size: 1rem;
  padding: 0.875rem 1.75rem;
  min-width: 200px;
}

.control-btn.record:hover:not(:disabled) {
  border-color: var(--danger);
  opacity: 0.9;
}

/* Mid-take the button means STOP, so it drops back to a neutral surface —
   the red belongs to "start", and the on-air signal is carried elsewhere. */
.control-btn.record.recording {
  background: var(--surface-2);
  border-color: var(--line);
  color: var(--ink);
}

.keyboard-hints {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.25rem;
  margin-top: 0.25rem;
}

.hint {
  font-size: 0.75rem;
  color: var(--muted);
}

kbd {
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 0.15rem 0.4rem;
  margin-right: 0.25rem;
  font-size: 0.7rem;
  font-family: inherit;
}

@media (max-width: 768px) {
  .controls-row {
    flex-direction: column;
    width: 100%;
  }

  .control-btn {
    width: 100%;
  }

  .keyboard-hints {
    display: none;
  }
}
</style>
