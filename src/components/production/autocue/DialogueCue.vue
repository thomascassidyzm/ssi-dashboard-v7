<template>
  <div class="dialogue-cue" :class="{ recording: isRecording, capturing: isCapturing }">
    <!-- Pod boundary -->
    <div v-if="showPodTitle" class="cue-pod-title">
      <span class="pod-eyebrow">Conversation</span>
      <h2>{{ item.podTitle || item.podId }}</h2>
    </div>

    <!-- Scene boundary -->
    <div v-if="showSceneTitle" class="cue-scene-title">
      <span class="scene-rule"></span>
      <span class="scene-text">
        <template v-if="item.sceneTitle">{{ item.sceneTitle }}</template>
        <template v-else>Scene {{ item.sceneNumber }}</template>
      </span>
      <span class="scene-rule"></span>
    </div>

    <!-- The preceding lines: greyed context the reader hears in their head -->
    <transition-group name="cue-line" tag="div" class="cue-context">
      <div
        v-for="(cue, i) in item.cues"
        :key="`${item.sentenceId}-cue-${i}`"
        class="cue-line"
      >
        <span
          v-if="cue.speaker"
          class="speaker-chip"
          :style="chipStyle(cue.speaker)"
        >{{ cue.speaker }}</span>
        <div class="cue-line-text">
          <p class="cue-target">{{ cue.targetText }}</p>
          <p v-if="cue.knownText" class="cue-gloss">{{ cue.knownText }}</p>
        </div>
      </div>
    </transition-group>

    <!-- THEIR line: large, highlighted, unmissable on a phone -->
    <div class="my-line" :class="{ explainer: item.kind !== 'target' }">
      <div class="my-line-header">
        <span class="speaker-chip mine" :style="chipStyle(item.speaker)">
          {{ myChipLabel }}
        </span>
        <span class="you-marker">you read this</span>
      </div>
      <p class="my-line-text" :class="sizeClass">{{ item.lineText }}</p>
      <p v-if="item.lineGloss" class="my-line-gloss">{{ item.lineGloss }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { speakerColor } from '@/utils/podRecordingPlan'

// Pure cue teleprompter for dialogue (pod) recording. One normalized plan
// item at a time (src/utils/podRecordingPlan.js shape); the studio shell owns
// capture, upload and advancement — this component only renders the cue.
const props = defineProps({
  item: { type: Object, required: true },
  // previous item rendered (null at session start) — drives boundary headers
  previousItem: { type: Object, default: null },
  isRecording: { type: Boolean, default: false },
  isCapturing: { type: Boolean, default: false }
})

const showPodTitle = computed(() =>
  !props.previousItem || props.previousItem.podId !== props.item.podId
)

// Scene title on boundaries: the plan stamps sceneTitle on boundary items;
// fall back to detecting a scene-number change so degraded payloads still cue.
const showSceneTitle = computed(() => {
  if (props.item.sceneTitle) return true
  if (props.item.sceneNumber == null) return false
  return !props.previousItem ||
    props.previousItem.podId !== props.item.podId ||
    props.previousItem.sceneNumber !== props.item.sceneNumber
})

const myChipLabel = computed(() => {
  const s = props.item.speaker
  if (!s || s === '__explainer__') return props.item.kind === 'explainer' ? 'Explainer' : 'You'
  return s
})

// Long utterances shrink so they never scroll off a phone screen
const sizeClass = computed(() => {
  const len = (props.item.lineText || '').length
  if (len > 140) return 'size-s'
  if (len > 70) return 'size-m'
  return 'size-l'
})

function chipStyle(speaker) {
  const color = speakerColor(speaker)
  return {
    color,
    borderColor: color,
    background: `color-mix(in srgb, ${color} 12%, transparent)`
  }
}
</script>

<style scoped>
.dialogue-cue {
  position: relative;
  background: var(--color-void, var(--canvas));
  border: 3px solid var(--color-graphite, var(--surface-3));
  border-radius: 20px;
  padding: 1.5rem 1.25rem 2rem;
  min-height: 380px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.8);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  overflow: hidden;
}

.dialogue-cue.recording {
  border-color: var(--color-tungsten, var(--accent));
  box-shadow:
    inset 0 0 60px rgba(0, 0, 0, 0.8),
    0 0 40px rgba(255, 166, 48, 0.25);
}

.dialogue-cue.recording::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, transparent, var(--color-tungsten, var(--accent)), transparent);
  animation: cue-shimmer 3s linear infinite;
}

@keyframes cue-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* Pod boundary */
.cue-pod-title {
  text-align: center;
  margin-bottom: 1rem;
}

.pod-eyebrow {
  display: block;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--color-paper-dim, var(--muted));
}

.cue-pod-title h2 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-paper, var(--ink));
  margin: 0.25rem 0 0;
}

/* Scene boundary */
.cue-scene-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.scene-rule {
  flex: 1;
  height: 1px;
  background: var(--color-graphite, var(--surface-3));
}

.scene-text {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8rem;
  color: var(--color-tungsten, var(--accent));
  white-space: nowrap;
}

/* Cue context lines */
.cue-context {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.cue-line {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  opacity: 0.55;
}

.cue-line-enter-active {
  transition: all 0.4s ease;
}

.cue-line-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.cue-line-text {
  min-width: 0;
}

.cue-target {
  font-size: 1rem;
  line-height: 1.45;
  color: var(--color-paper, var(--ink));
  margin: 0;
}

.cue-gloss {
  font-size: 0.8rem;
  line-height: 1.4;
  color: var(--color-paper-dim, var(--muted));
  margin: 0.15rem 0 0;
  font-style: italic;
}

/* Speaker chips */
.speaker-chip {
  flex-shrink: 0;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 0.2rem 0.55rem;
  border: 1px solid;
  border-radius: 999px;
  white-space: nowrap;
  margin-top: 0.1rem;
}

/* Their line */
.my-line {
  background: var(--color-shadow, var(--surface));
  border: 1px solid var(--color-tungsten, var(--accent));
  border-radius: 14px;
  padding: 1rem 1.15rem 1.15rem;
  box-shadow: 0 0 24px rgba(255, 166, 48, 0.12);
}

.my-line.explainer {
  border-color: var(--color-emerald, #06ffa5);
  box-shadow: 0 0 24px rgba(6, 255, 165, 0.1);
}

.my-line-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.6rem;
}

.speaker-chip.mine {
  font-size: 0.75rem;
}

.you-marker {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-paper-dim, var(--muted));
}

.my-line-text {
  font-family: 'Josefin Sans', sans-serif;
  font-weight: 700;
  color: var(--color-paper, var(--ink));
  line-height: 1.3;
  margin: 0;
  overflow-wrap: break-word;
}

.my-line-text.size-l { font-size: clamp(1.6rem, 6vw, 2.4rem); }
.my-line-text.size-m { font-size: clamp(1.3rem, 5vw, 1.9rem); }
.my-line-text.size-s { font-size: clamp(1.1rem, 4vw, 1.5rem); }

.dialogue-cue.capturing .my-line-text {
  color: var(--color-emerald, #06ffa5);
}

.my-line-gloss {
  font-size: 0.9rem;
  color: var(--color-paper-dim, var(--muted));
  font-style: italic;
  margin: 0.55rem 0 0;
  line-height: 1.45;
}

/* Light mode: the heavy black inset "void" vignette is built for the dark
   theme; on the light canvas it paints a muddy dark halo and hurts edge text.
   Soften the inset to a faint neutral and lean on the visible border instead.
   Dark mode is untouched. */
:root[data-theme="light"] .dialogue-cue {
  box-shadow: inset 0 0 40px rgba(15, 23, 42, 0.04);
}

:root[data-theme="light"] .dialogue-cue.recording {
  box-shadow:
    inset 0 0 40px rgba(15, 23, 42, 0.04),
    0 0 28px rgba(255, 166, 48, 0.3);
}

/* Phone-first tightening */
@media (max-width: 480px) {
  .dialogue-cue {
    padding: 1.1rem 0.9rem 1.4rem;
    min-height: 320px;
    border-radius: 16px;
  }

  .cue-context {
    gap: 0.55rem;
  }

  .cue-target {
    font-size: 0.9rem;
  }

  .cue-gloss {
    font-size: 0.72rem;
  }
}
</style>
