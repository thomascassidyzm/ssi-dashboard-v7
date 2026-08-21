<template>
  <div class="recording-controls">
    <div class="controls-row primary">
      <button class="control-btn" @click="$emit('slower')" :disabled="isRecording">
        <span class="btn-icon">⏪</span> Slower
      </button>

      <button
        class="control-btn record"
        :class="{ recording: isRecording }"
        @click="$emit('toggle-recording')"
      >
        <span v-if="!isRecording"><span class="btn-icon">⏺️</span> Start Recording</span>
        <span v-else><span class="btn-icon">⏹️</span> Stop Recording</span>
      </button>

      <button class="control-btn" @click="$emit('faster')" :disabled="isRecording">
        <span class="btn-icon">⏩</span> Faster
      </button>
    </div>

    <div class="controls-row secondary">
      <!-- One button, two meanings — so it has to say both. See backTap.js:
           a single tap restarts the take being read, a double tap is the only
           thing that moves the script backwards. -->
      <button class="control-btn" @click="$emit('previous')" :disabled="!isRecording">
        <span class="btn-icon">⬅️</span>
        <span v-if="backRestartsTake" class="btn-stack">
          <span>Take it again</span>
          <span class="btn-sub">double-tap = previous</span>
        </span>
        <span v-else>Previous</span>
      </button>

      <button class="control-btn" @click="$emit('pause')" :disabled="!isRecording">
        <span class="btn-icon">{{ isPaused ? '▶️' : '⏸️' }}</span>
        {{ isPaused ? 'Resume' : 'Pause' }}
      </button>

      <button class="control-btn" @click="$emit('next')" :disabled="!isRecording">
        <span class="btn-icon">➡️</span> Next
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
  font-size: 0.62rem;
  opacity: 0.65;
  letter-spacing: 0.02em;
}

.recording-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.controls-row {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.control-btn {
  background: var(--color-slate, var(--surface-2));
  border: 2px solid var(--color-graphite, var(--surface-3));
  color: var(--color-paper, var(--ink));
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-family: 'Josefin Sans', sans-serif;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 140px;
  justify-content: center;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.btn-icon {
  font-size: 1.2em;
}

.control-btn:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
  border-color: var(--color-tungsten, var(--accent));
}

.control-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.control-btn.record {
  background: linear-gradient(135deg, var(--color-film-red, #e63946), #c4313d);
  border-color: var(--color-film-red, #e63946);
  font-size: 1.1rem;
  padding: 1rem 2rem;
  min-width: 200px;
  box-shadow: 0 4px 16px rgba(230, 57, 70, 0.4);
}

.control-btn.record:hover:not(:disabled) {
  box-shadow: 0 8px 32px rgba(230, 57, 70, 0.6);
}

.control-btn.record.recording {
  background: var(--color-graphite, var(--surface-3));
  border-color: var(--color-graphite, var(--surface-3));
  box-shadow: none;
}

.keyboard-hints {
  display: flex;
  gap: 1.5rem;
  margin-top: 0.5rem;
}

.hint {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  color: var(--color-paper-dim, var(--muted));
}

kbd {
  background: var(--color-void, var(--canvas));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 4px;
  padding: 0.15rem 0.4rem;
  margin-right: 0.25rem;
  font-size: 0.7rem;
}

/* Light mode: faint surface-3 borders (~1.1:1) are invisible on near-white
   surfaces, so the buttons/keys lose their shape. Use the stronger --line
   border token plus a subtle shadow for separation. Scoped to light so dark
   mode keeps its original surface-3 borders untouched. */
:root[data-theme="light"] .control-btn {
  border-color: var(--line);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

:root[data-theme="light"] .control-btn.record,
:root[data-theme="light"] .control-btn.record.recording {
  border-color: var(--color-film-red, #e63946);
  box-shadow: 0 4px 16px rgba(230, 57, 70, 0.3);
}

:root[data-theme="light"] .control-btn.record.recording {
  border-color: var(--line);
}

:root[data-theme="light"] kbd {
  border-color: var(--line);
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
