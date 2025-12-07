<template>
  <div class="recording-controls">
    <!-- Waveform Visualizer -->
    <WaveformVisualizer
      :is-recording="isRecording"
      :audio-level="audioLevel"
      :has-recording="hasRecording"
    />

    <!-- Control Buttons -->
    <div class="control-buttons">
      <!-- Record/Stop Button -->
      <button
        v-if="!hasRecording"
        class="control-btn record-btn"
        :class="{ recording: isRecording, paused: isPaused }"
        @click="emit('record')"
      >
        <svg v-if="!isRecording" class="btn-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="8"/>
        </svg>
        <svg v-else-if="isPaused" class="btn-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
        <svg v-else class="btn-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="4" height="12" rx="1"/>
          <rect x="14" y="6" width="4" height="12" rx="1"/>
        </svg>
        <span class="btn-label">
          {{ isRecording ? (isPaused ? 'Resume' : 'Pause') : 'Record' }}
        </span>
      </button>

      <button
        v-if="isRecording && !isPaused"
        class="control-btn stop-btn"
        @click="emit('stop')"
      >
        <svg class="btn-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2"/>
        </svg>
        <span class="btn-label">Stop</span>
      </button>

      <!-- Playback Controls (when recording exists) -->
      <template v-if="hasRecording && !isRecording">
        <button class="control-btn play-btn" @click="emit('play')">
          <svg class="btn-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <span class="btn-label">Play</span>
        </button>

        <button class="control-btn re-record-btn" @click="emit('re-record')">
          <svg class="btn-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          <span class="btn-label">Re-record</span>
        </button>

        <button
          class="control-btn upload-btn"
          :disabled="uploadStatus.isUploading"
          @click="emit('upload')"
        >
          <svg v-if="!uploadStatus.isUploading" class="btn-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>
          <svg v-else class="btn-icon spinner" width="24" height="24" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="31.4" stroke-dashoffset="10" />
          </svg>
          <span class="btn-label">
            {{ uploadStatus.isUploading ? 'Uploading...' : 'Upload' }}
          </span>
        </button>
      </template>
    </div>

    <!-- Upload Error -->
    <div v-if="uploadStatus.error" class="upload-error">
      {{ uploadStatus.error }}
    </div>

    <!-- Keyboard Shortcuts Hint -->
    <div class="keyboard-hints">
      <span class="hint"><kbd>Space</kbd> Record/Pause</span>
      <span class="hint"><kbd>Enter</kbd> Upload</span>
      <span class="hint"><kbd>R</kbd> Re-record</span>
      <span class="hint"><kbd>P</kbd> Play</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import WaveformVisualizer from './WaveformVisualizer.vue'

interface UploadStatus {
  isUploading: boolean
  progress: { loaded: number; total: number; percentage: number }
  error: string | null
}

defineProps<{
  isRecording: boolean
  isPaused: boolean
  hasRecording: boolean
  audioLevel?: number
  uploadStatus: UploadStatus
}>()

const emit = defineEmits<{
  (e: 'record'): void
  (e: 'stop'): void
  (e: 'play'): void
  (e: 'upload'): void
  (e: 're-record'): void
}>()
</script>

<style scoped>
.recording-controls {
  background: var(--color-shadow, #1e293b);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 12px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.control-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 140px;
  justify-content: center;
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  flex-shrink: 0;
}

.btn-label {
  white-space: nowrap;
}

.record-btn {
  background: var(--color-film-red, #e63946);
  color: white;
  box-shadow: 0 0 20px rgba(230, 57, 70, 0.3);
}

.record-btn:hover:not(:disabled) {
  background: #c4313d;
  box-shadow: 0 0 30px rgba(230, 57, 70, 0.5);
  transform: scale(1.05);
}

.record-btn.recording {
  animation: recordPulse 2s ease-in-out infinite;
}

.record-btn.paused {
  background: var(--color-tungsten, #ffa630);
  box-shadow: 0 0 20px rgba(255, 166, 48, 0.3);
}

@keyframes recordPulse {
  0%, 100% {
    box-shadow: 0 0 20px rgba(230, 57, 70, 0.3);
  }
  50% {
    box-shadow: 0 0 40px rgba(230, 57, 70, 0.6);
  }
}

.stop-btn {
  background: var(--color-graphite, #475569);
  color: var(--color-paper, #f7f7f2);
}

.stop-btn:hover {
  background: var(--color-slate, #334155);
}

.play-btn {
  background: var(--color-emerald, #06ffa5);
  color: var(--color-void, #0f172a);
}

.play-btn:hover {
  background: #05d689;
  transform: scale(1.05);
}

.re-record-btn {
  background: var(--color-slate, #334155);
  color: var(--color-paper-dim, #c1c1bb);
  border: 1px solid var(--color-graphite, #475569);
}

.re-record-btn:hover {
  background: var(--color-graphite, #475569);
  color: var(--color-paper, #f7f7f2);
}

.upload-btn {
  background: var(--color-tungsten, #ffa630);
  color: var(--color-void, #0f172a);
  box-shadow: 0 0 20px rgba(255, 166, 48, 0.3);
}

.upload-btn:hover:not(:disabled) {
  background: #e69220;
  box-shadow: 0 0 30px rgba(255, 166, 48, 0.5);
  transform: scale(1.05);
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.upload-error {
  padding: 0.75rem 1rem;
  background: var(--color-film-red, #e63946);
  color: white;
  border-radius: 6px;
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 0.875rem;
  text-align: center;
}

.keyboard-hints {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-graphite, #475569);
  flex-wrap: wrap;
}

.hint {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 0.75rem;
  color: var(--color-paper-dim, #c1c1bb);
}

kbd {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: var(--color-slate, #334155);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 4px;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.75rem;
  color: var(--color-emerald, #06ffa5);
  margin-right: 0.25rem;
}

@media (max-width: 768px) {
  .control-buttons {
    flex-direction: column;
  }

  .control-btn {
    width: 100%;
  }
}
</style>
