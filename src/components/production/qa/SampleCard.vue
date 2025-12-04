<template>
  <div
    class="sample-card"
    :class="[`confidence-${confidenceLevel}`, { playing: isPlaying }]"
  >
    <div class="card-header">
      <span class="sample-id">{{ sample.seedId || 'Sample' }}</span>
      <StatusBadge :status="sample.status || 'pending'" size="sm" />
    </div>

    <div class="card-body">
      <p class="sample-text target">{{ sample.targetText }}</p>
      <p class="sample-text known">{{ sample.knownText }}</p>
    </div>

    <div class="card-waveform" @click="togglePlayback">
      <!-- Hidden audio element for playback -->
      <audio
        ref="audioRef"
        :src="audioUrl"
        @ended="onAudioEnded"
        preload="none"
      />
      <div class="waveform-bars">
        <div
          v-for="(height, i) in waveformBars"
          :key="i"
          class="waveform-bar"
          :style="{ height: `${height}%` }"
        ></div>
      </div>
      <div class="play-overlay">
        <span class="play-icon">{{ isPlaying ? '⏸' : '▶' }}</span>
      </div>
    </div>

    <div class="card-meta">
      <span class="meta-item">
        <span class="meta-icon">⏱</span>
        {{ formatDuration(sample.duration) }}
      </span>
      <span class="meta-item confidence" :class="confidenceLevel">
        {{ confidencePercent }}%
      </span>
    </div>

    <div class="card-actions">
      <button class="action-btn play" @click="togglePlayback">
        {{ isPlaying ? '⏸ Pause' : '▶ Play' }}
      </button>
      <FlagMenu
        :uuid="sample.uuid"
        :current-status="sample.status"
        @flagged="onFlagged"
        @cleared="onCleared"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useProductionStore } from '@/stores/production'
import StatusBadge from './StatusBadge.vue'
import FlagMenu from './FlagMenu.vue'

const props = defineProps({
  sample: { type: Object, required: true }
})

const emit = defineEmits(['play', 'pause', 'flagged', 'cleared'])

const store = useProductionStore()
const isPlaying = ref(false)
const audioRef = ref(null)

// Construct audio URL based on course and sample UUID
const audioUrl = computed(() => {
  const courseCode = store.currentCourseCode
  if (!courseCode || !props.sample.uuid) return null
  return `/api/production/${courseCode}/audio/${props.sample.uuid}.mp3`
})

// Generate fake waveform for visual
const waveformBars = computed(() => {
  const bars = []
  for (let i = 0; i < 20; i++) {
    bars.push(30 + Math.random() * 70)
  }
  return bars
})

const confidenceLevel = computed(() => {
  const conf = props.sample.confidence || 0.8
  if (conf >= 0.9) return 'high'
  if (conf >= 0.7) return 'medium'
  return 'low'
})

const confidencePercent = computed(() => {
  return Math.round((props.sample.confidence || 0.8) * 100)
})

function formatDuration(seconds) {
  if (!seconds) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function togglePlayback() {
  if (!audioRef.value) return

  if (isPlaying.value) {
    audioRef.value.pause()
    isPlaying.value = false
    emit('pause', props.sample)
  } else {
    audioRef.value.play().catch(err => {
      console.error('Audio playback failed:', err)
    })
    isPlaying.value = true
    emit('play', props.sample)
  }
}

function onAudioEnded() {
  isPlaying.value = false
}

function onFlagged(data) {
  emit('flagged', data)
}

function onCleared(data) {
  emit('cleared', data)
}
</script>

<style scoped>
.sample-card {
  background: var(--color-shadow, #16181f);
  border: 1px solid var(--color-graphite, #34384a);
  border-radius: 12px;
  padding: 1rem;
  transition: all 0.3s ease;
}

.sample-card:hover {
  border-color: var(--color-tungsten, #ffa630);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.sample-card.playing {
  border-color: var(--color-emerald, #06ffa5);
  box-shadow: 0 0 20px rgba(6, 255, 165, 0.2);
}

/* Confidence border indicators */
.sample-card.confidence-high {
  border-left: 3px solid var(--color-emerald, #06ffa5);
}

.sample-card.confidence-medium {
  border-left: 3px solid var(--color-tungsten, #ffa630);
}

.sample-card.confidence-low {
  border-left: 3px solid var(--color-film-red, #e63946);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.sample-id {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  color: var(--color-paper-dim, #c1c1bb);
}

.card-body {
  margin-bottom: 0.75rem;
}

.sample-text {
  margin: 0;
  line-height: 1.4;
}

.sample-text.target {
  font-family: 'Crimson Pro', serif;
  font-size: 1.1rem;
  color: var(--color-paper, #f7f7f2);
  margin-bottom: 0.25rem;
}

.sample-text.known {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.85rem;
  color: var(--color-paper-dim, #c1c1bb);
  font-style: italic;
}

.card-waveform {
  position: relative;
  height: 48px;
  background: var(--color-void, #0a0b0f);
  border-radius: 6px;
  margin-bottom: 0.75rem;
  cursor: pointer;
  overflow: hidden;
}

.waveform-bars {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 2px;
  padding: 0 8px;
}

.waveform-bar {
  flex: 1;
  background: var(--color-emerald, #06ffa5);
  border-radius: 2px;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.sample-card.playing .waveform-bar {
  opacity: 1;
  animation: waveAnimate 0.5s ease-in-out infinite alternate;
}

@keyframes waveAnimate {
  from { transform: scaleY(0.8); }
  to { transform: scaleY(1); }
}

.play-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.card-waveform:hover .play-overlay {
  opacity: 1;
}

.play-icon {
  font-size: 1.5rem;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.meta-item {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  color: var(--color-paper-dim, #c1c1bb);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.meta-item.confidence.high { color: var(--color-emerald, #06ffa5); }
.meta-item.confidence.medium { color: var(--color-tungsten, #ffa630); }
.meta-item.confidence.low { color: var(--color-film-red, #e63946); }

.card-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  flex: 1;
  padding: 0.5rem;
  background: var(--color-slate, #23262f);
  border: 1px solid var(--color-graphite, #34384a);
  border-radius: 6px;
  color: var(--color-paper, #f7f7f2);
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--color-graphite, #34384a);
}

.action-btn.play {
  background: var(--color-void, #0a0b0f);
}
</style>
