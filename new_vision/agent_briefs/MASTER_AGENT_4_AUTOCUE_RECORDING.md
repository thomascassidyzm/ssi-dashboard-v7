# MASTER AGENT 4: Autocue Recording System

## Mission Brief

You are **Master Agent 4** of 4, responsible for building the Autocue Recording System - the teleprompter-style human recording interface. You can begin work **after Master Agent 1 merges** (infrastructure dependency).

---

## Project Context

You are working on the SSi Dashboard v7 project. After cloning, your working directory is:
```
/Users/tomcassidy/SSi/ssi-dashboard-v7-clean
```

This is a Vue 3 + Vite application with Tailwind CSS.

**Read these files first - they are CRITICAL:**
- `CLAUDE.md` - Agent onboarding guide
- `new_vision/AUTOCUE_TWO_MODE_SYSTEM.md` - **YOUR PRIMARY SPEC** - Detailed system design
- `new_vision/autocue-teleprompter-prototype.html` - **DESIGN REFERENCE** - Working prototype to match
- `new_vision/MASTER_ORCHESTRATION_BRIEF.md` - Full architecture vision
- `src/stores/production.js` - Pinia store (from Master 1)

---

## The Two-Mode System

This is not a simple recording interface. It's a **professional teleprompter studio** with two distinct modes:

### Mode 1: New Course Recording (Two-Pass Flow)
- **Pass 1**: Natural speed continuous recording (teleprompter scroll)
- **Pass 2**: Slow with gaps for LEGO component extraction
- AI-powered segmentation post-recording
- Batch review and approval

### Mode 2: Regeneration Recording (Targeted Fixes)
- Queue of flagged items from QA review
- Show original recording for context
- Quick re-record and compare workflow

---

## Your Deliverables

### 1. Branch Setup
```bash
git checkout main
git pull origin main
git checkout -b feature/autocue-recording
```

### 2. Component Overview

```
src/components/production/
├── autocue/
│   ├── AutocueStudio.vue           # Main orchestrator component
│   ├── ModeSelector.vue            # Choose Mode 1 or Mode 2
│   ├── RoleSelector.vue            # Choose recording role (Known/Target)
│   │
│   ├── teleprompter/
│   │   ├── TeleprompterDisplay.vue # Core scrolling display
│   │   ├── PhraseCard.vue          # Individual phrase in prompter
│   │   ├── PassIndicator.vue       # "Pass 1 of 2" display
│   │   └── GapMarkers.vue          # Visual gap markers for Pass 2
│   │
│   ├── recording/
│   │   ├── RecordingControls.vue   # Start/stop/pause controls
│   │   ├── RecordingStatus.vue     # REC indicator + timer
│   │   └── AudioLevelMeter.vue     # Real-time audio level
│   │
│   └── review/
│       ├── SessionReview.vue       # Post-recording review
│       ├── SegmentCard.vue         # Individual segment review
│       └── WaveformPreview.vue     # Mini waveform display
```

---

### 3. ModeSelector Component: `src/components/production/autocue/ModeSelector.vue`

```vue
<template>
  <div class="mode-selector">
    <div
      class="mode-card"
      :class="{ selected: selectedMode === 'new-course' }"
      @click="selectMode('new-course')"
    >
      <span class="mode-icon">🎬</span>
      <h2 class="mode-title">Mode 1: New Course</h2>
      <p class="mode-description">
        Record a complete course section with two-pass flow. Natural speed first,
        then slow with gaps for LEGO extraction.
      </p>
      <ul class="mode-features">
        <li>Continuous teleprompter recording</li>
        <li>Pass 1: Natural prosody</li>
        <li>Pass 2: Slow with gaps</li>
        <li>AI-powered segmentation</li>
        <li>Batch review and approval</li>
      </ul>
    </div>

    <div
      class="mode-card"
      :class="{ selected: selectedMode === 'regeneration' }"
      @click="selectMode('regeneration')"
    >
      <span class="mode-icon">🔧</span>
      <h2 class="mode-title">Mode 2: Regeneration</h2>
      <p class="mode-description">
        Re-record specific flagged items from QA review. Targeted fixes without
        re-recording the entire course.
      </p>
      <ul class="mode-features">
        <li>Queue of flagged items only</li>
        <li>See original recording context</li>
        <li>Compare old vs. new versions</li>
        <li>Skip and return to items</li>
        <li>Quick targeted workflow</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['select'])
const selectedMode = ref(null)

function selectMode(mode) {
  selectedMode.value = mode
  emit('select', mode)
}
</script>

<style scoped>
.mode-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.mode-card {
  background: linear-gradient(135deg, var(--color-shadow, #16181f), var(--color-slate, #23262f));
  border: 2px solid var(--color-graphite, #34384a);
  border-radius: 16px;
  padding: 2rem;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  position: relative;
  overflow: hidden;
}

.mode-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, transparent, rgba(255, 166, 48, 0.1));
  opacity: 0;
  transition: opacity 0.4s ease;
}

.mode-card:hover {
  border-color: var(--color-tungsten, #ffa630);
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(255, 166, 48, 0.3);
}

.mode-card:hover::before {
  opacity: 1;
}

.mode-card.selected {
  border-color: var(--color-tungsten, #ffa630);
  box-shadow: 0 0 40px rgba(255, 166, 48, 0.4);
}

.mode-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
}

.mode-title {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-paper, #f7f7f2);
  margin: 0 0 0.75rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.mode-description {
  color: var(--color-paper-dim, #c1c1bb);
  font-size: 0.95rem;
  line-height: 1.7;
  margin-bottom: 1rem;
}

.mode-features {
  list-style: none;
  padding: 0;
  margin: 0;
}

.mode-features li {
  padding-left: 1.5rem;
  position: relative;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-paper-dim, #c1c1bb);
}

.mode-features li::before {
  content: '▸';
  position: absolute;
  left: 0;
  color: var(--color-tungsten, #ffa630);
  font-weight: bold;
}

@media (max-width: 768px) {
  .mode-selector {
    grid-template-columns: 1fr;
  }
}
</style>
```

---

### 4. RoleSelector Component: `src/components/production/autocue/RoleSelector.vue`

```vue
<template>
  <div class="role-selector">
    <div class="role-setup-card">
      <h2 class="setup-title">Recording Session Setup</h2>

      <div class="course-info">
        <span class="course-label">Course:</span>
        <span class="course-name">{{ courseName }}</span>
      </div>

      <div class="role-selection">
        <label class="selection-label">Recording Role:</label>

        <div class="role-options">
          <div
            v-for="role in roles"
            :key="role.id"
            class="role-option"
            :class="{ selected: selectedRole === role.id }"
            @click="selectRole(role.id)"
          >
            <div class="role-type">{{ role.type }}</div>
            <div class="role-language">{{ role.language }}</div>
            <div class="role-radio"></div>
          </div>
        </div>
      </div>

      <div class="session-summary">
        <div class="summary-line">
          This session: <strong>{{ phraseCount }} {{ targetLanguage }} phrases</strong>
        </div>
        <div class="summary-line">
          Estimated time: <strong>~{{ estimatedTime }} minutes</strong>
        </div>
      </div>

      <button
        class="begin-btn"
        :disabled="!selectedRole"
        @click="beginSession"
      >
        Begin Session
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  courseName: { type: String, default: 'Welsh for English Speakers' },
  knownLanguage: { type: String, default: 'English' },
  targetLanguage: { type: String, default: 'Welsh' },
  phraseCount: { type: Number, default: 287 }
})

const emit = defineEmits(['begin'])

const selectedRole = ref(null)

const roles = computed(() => [
  { id: 'known', type: 'Known', language: props.knownLanguage },
  { id: 'target1', type: 'Target 1', language: props.targetLanguage },
  { id: 'target2', type: 'Target 2', language: props.targetLanguage }
])

const estimatedTime = computed(() => {
  // Rough estimate: 3 seconds per phrase for both passes
  return Math.round((props.phraseCount * 6) / 60)
})

function selectRole(roleId) {
  selectedRole.value = roleId
}

function beginSession() {
  if (selectedRole.value) {
    emit('begin', {
      role: selectedRole.value,
      language: roles.value.find(r => r.id === selectedRole.value)?.language
    })
  }
}
</script>

<style scoped>
.role-selector {
  max-width: 600px;
  margin: 0 auto;
}

.role-setup-card {
  background: linear-gradient(135deg, var(--color-shadow, #16181f), var(--color-slate, #23262f));
  border: 2px solid var(--color-graphite, #34384a);
  border-radius: 16px;
  padding: 2.5rem;
}

.setup-title {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-paper, #f7f7f2);
  margin: 0 0 2rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: center;
}

.course-info {
  text-align: center;
  margin-bottom: 2rem;
}

.course-label {
  font-size: 1rem;
  color: var(--color-paper-dim, #c1c1bb);
}

.course-name {
  font-weight: 600;
  color: var(--color-paper, #f7f7f2);
}

.selection-label {
  display: block;
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-paper-dim, #c1c1bb);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 1rem;
  text-align: center;
}

.role-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.role-option {
  background: var(--color-void, #0a0b0f);
  border: 2px solid var(--color-graphite, #34384a);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.role-option:hover {
  border-color: var(--color-tungsten, #ffa630);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(255, 166, 48, 0.3);
}

.role-option.selected {
  border-color: var(--color-tungsten, #ffa630);
  background: linear-gradient(135deg, rgba(255, 166, 48, 0.15), transparent);
  box-shadow: 0 0 30px rgba(255, 166, 48, 0.3);
}

.role-type {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-paper, #f7f7f2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.role-language {
  font-size: 1.2rem;
  color: var(--color-paper-dim, #c1c1bb);
  margin-bottom: 1rem;
}

.role-radio {
  width: 24px;
  height: 24px;
  border: 3px solid var(--color-graphite, #34384a);
  border-radius: 50%;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.role-option.selected .role-radio {
  border-color: var(--color-tungsten, #ffa630);
  background: var(--color-tungsten, #ffa630);
  box-shadow: 0 0 16px rgba(255, 166, 48, 0.6);
}

.role-option.selected .role-radio::after {
  content: '';
  width: 8px;
  height: 8px;
  background: var(--color-void, #0a0b0f);
  border-radius: 50%;
}

.session-summary {
  background: var(--color-void, #0a0b0f);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  text-align: center;
}

.summary-line {
  font-size: 1rem;
  color: var(--color-paper-dim, #c1c1bb);
  margin-bottom: 0.5rem;
}

.summary-line:last-child {
  margin-bottom: 0;
}

.summary-line strong {
  color: var(--color-emerald, #06ffa5);
  font-family: 'IBM Plex Mono', monospace;
}

.begin-btn {
  width: 100%;
  background: linear-gradient(135deg, var(--color-film-red, #e63946), #c4313d);
  border: 2px solid var(--color-film-red, #e63946);
  color: var(--color-paper, #f7f7f2);
  padding: 1rem 2rem;
  border-radius: 12px;
  font-family: 'Josefin Sans', sans-serif;
  font-weight: 700;
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: 0 4px 16px rgba(230, 57, 70, 0.4);
}

.begin-btn:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 8px 32px rgba(230, 57, 70, 0.6);
}

.begin-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .role-options {
    grid-template-columns: 1fr;
  }
}
</style>
```

---

### 5. TeleprompterDisplay Component: `src/components/production/autocue/teleprompter/TeleprompterDisplay.vue`

```vue
<template>
  <div
    class="teleprompter-viewport"
    :class="{ recording: isRecording }"
  >
    <div
      class="teleprompter-scroller"
      ref="scrollerRef"
      :style="{ transform: `translateY(-${scrollOffset}px)` }"
    >
      <PhraseCard
        v-for="(phrase, index) in phrases"
        :key="phrase.id"
        :phrase="phrase"
        :state="getPhraseState(index)"
        :show-gaps="currentPass === 2"
      />
    </div>

    <!-- Gradient overlays for smooth edges -->
    <div class="gradient-top"></div>
    <div class="gradient-bottom"></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import PhraseCard from './PhraseCard.vue'

const props = defineProps({
  phrases: { type: Array, required: true },
  currentIndex: { type: Number, default: 0 },
  currentPass: { type: Number, default: 1 },
  isRecording: { type: Boolean, default: false },
  scrollSpeed: { type: Number, default: 3 } // seconds per phrase
})

const emit = defineEmits(['phrase-change'])

const scrollerRef = ref(null)
const scrollOffset = ref(0)

// Calculate phrase state (done, current, upcoming)
function getPhraseState(index) {
  if (index < props.currentIndex) return 'done'
  if (index === props.currentIndex) return 'current'
  return 'upcoming'
}

// Auto-scroll to keep current phrase centered
watch(() => props.currentIndex, (newIndex) => {
  scrollToPhraseIndex(newIndex)
})

function scrollToPhraseIndex(index) {
  if (!scrollerRef.value) return

  const phraseCards = scrollerRef.value.querySelectorAll('.phrase-card')
  if (phraseCards[index]) {
    const card = phraseCards[index]
    const viewportHeight = scrollerRef.value.parentElement.clientHeight
    const cardTop = card.offsetTop
    const cardHeight = card.clientHeight

    // Center the card in the viewport
    scrollOffset.value = cardTop - (viewportHeight / 2) + (cardHeight / 2)
  }
}

onMounted(() => {
  scrollToPhraseIndex(props.currentIndex)
})
</script>

<style scoped>
.teleprompter-viewport {
  position: relative;
  background: var(--color-void, #0a0b0f);
  border: 3px solid var(--color-graphite, #34384a);
  border-radius: 20px;
  padding: 2rem;
  height: 500px;
  overflow: hidden;
  box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.8);
  transition: all 0.3s ease;
}

.teleprompter-viewport.recording {
  border-color: var(--color-tungsten, #ffa630);
  box-shadow:
    inset 0 0 60px rgba(0, 0, 0, 0.8),
    0 0 40px rgba(255, 166, 48, 0.3);
}

/* Recording indicator bar */
.teleprompter-viewport.recording::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, transparent, var(--color-tungsten, #ffa630), transparent);
  animation: shimmer 3s linear infinite;
  z-index: 10;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.teleprompter-scroller {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition: transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  padding: 200px 0; /* Space for centering */
}

/* Gradient overlays */
.gradient-top,
.gradient-bottom {
  position: absolute;
  left: 0;
  right: 0;
  height: 100px;
  pointer-events: none;
  z-index: 5;
}

.gradient-top {
  top: 0;
  background: linear-gradient(to bottom, var(--color-void, #0a0b0f), transparent);
}

.gradient-bottom {
  bottom: 0;
  background: linear-gradient(to top, var(--color-void, #0a0b0f), transparent);
}
</style>
```

---

### 6. PhraseCard Component: `src/components/production/autocue/teleprompter/PhraseCard.vue`

```vue
<template>
  <div class="phrase-card" :class="state">
    <div class="phrase-marker">
      <span v-if="state === 'done'">✓</span>
      <span v-else-if="state === 'current'" class="current-marker">══►</span>
      <span v-else>○</span>
    </div>

    <div class="phrase-content">
      <!-- Normal display -->
      <div v-if="!showGaps" class="phrase-text">
        {{ phrase.text }}
      </div>

      <!-- Gap markers for Pass 2 -->
      <div v-else class="phrase-with-gaps">
        <template v-for="(segment, i) in gapSegments" :key="i">
          <span class="word-segment">{{ segment }}</span>
          <span v-if="i < gapSegments.length - 1" class="gap-marker"></span>
        </template>
      </div>

      <div class="phrase-translation" v-if="phrase.translation">
        {{ phrase.translation }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  phrase: { type: Object, required: true },
  state: { type: String, default: 'upcoming' }, // done, current, upcoming
  showGaps: { type: Boolean, default: false }
})

// Split text into segments for gap display
const gapSegments = computed(() => {
  if (!props.phrase.text) return []
  // Split by spaces for simple word-by-word gaps
  return props.phrase.text.split(' ')
})
</script>

<style scoped>
.phrase-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  border-left: 3px solid transparent;
}

.phrase-marker {
  font-size: 1.2rem;
  min-width: 50px;
  text-align: center;
  flex-shrink: 0;
}

/* State: Done */
.phrase-card.done {
  opacity: 0.35;
}

.phrase-card.done .phrase-marker {
  color: var(--color-emerald, #06ffa5);
}

.phrase-card.done .phrase-text {
  color: var(--color-paper-dim, #c1c1bb);
  text-decoration: line-through;
  text-decoration-color: var(--color-emerald, #06ffa5);
  text-decoration-thickness: 1px;
}

/* State: Current */
.phrase-card.current {
  opacity: 1;
  background: linear-gradient(90deg, transparent, rgba(255, 166, 48, 0.1), transparent);
  border-left-color: var(--color-tungsten, #ffa630);
  box-shadow: 0 0 20px rgba(255, 166, 48, 0.2);
}

.phrase-card.current .phrase-marker {
  color: var(--color-tungsten, #ffa630);
  font-size: 1.5rem;
}

.phrase-card.current .phrase-text,
.phrase-card.current .phrase-with-gaps {
  font-size: 2rem;
  font-weight: 600;
  color: var(--color-tungsten, #ffa630);
  text-shadow: 0 0 20px rgba(255, 186, 92, 0.4);
}

/* State: Upcoming */
.phrase-card.upcoming {
  opacity: 0.6;
}

.phrase-card.upcoming .phrase-marker {
  color: var(--color-paper-dim, #c1c1bb);
}

.phrase-content {
  flex: 1;
}

.phrase-text {
  font-family: 'Crimson Pro', serif;
  font-size: 1.6rem;
  font-weight: 500;
  color: var(--color-paper, #f7f7f2);
  line-height: 1.4;
  transition: all 0.5s ease;
}

.phrase-with-gaps {
  font-family: 'Crimson Pro', serif;
  font-size: 1.6rem;
  font-weight: 500;
  color: var(--color-paper, #f7f7f2);
  line-height: 1.8;
}

.word-segment {
  display: inline-block;
  padding: 0.2rem 0.4rem;
}

.gap-marker {
  display: inline-block;
  width: 40px;
  height: 4px;
  background: var(--color-tungsten, #ffa630);
  margin: 0 0.75rem;
  border-radius: 2px;
  vertical-align: middle;
  animation: gapPulse 2.5s ease-in-out infinite;
  box-shadow: 0 0 8px rgba(255, 166, 48, 0.6);
}

@keyframes gapPulse {
  0%, 100% { opacity: 0.5; transform: scaleX(1); }
  50% { opacity: 1; transform: scaleX(1.15); }
}

.phrase-translation {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1rem;
  color: var(--color-paper-dim, #c1c1bb);
  font-style: italic;
  margin-top: 0.5rem;
}
</style>
```

---

### 7. RecordingStatus Component: `src/components/production/autocue/recording/RecordingStatus.vue`

```vue
<template>
  <div class="recording-status" :class="{ active: isRecording }">
    <div class="rec-indicator">
      <div class="rec-dot"></div>
      <span class="rec-label">REC</span>
    </div>
    <span class="rec-timer">{{ formattedTime }}</span>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps({
  isRecording: { type: Boolean, default: false }
})

const elapsedSeconds = ref(0)
let timerInterval = null

const formattedTime = computed(() => {
  const hours = Math.floor(elapsedSeconds.value / 3600)
  const minutes = Math.floor((elapsedSeconds.value % 3600) / 60)
  const seconds = elapsedSeconds.value % 60

  return [hours, minutes, seconds]
    .map(v => v.toString().padStart(2, '0'))
    .join(':')
})

watch(() => props.isRecording, (recording) => {
  if (recording) {
    elapsedSeconds.value = 0
    timerInterval = setInterval(() => {
      elapsedSeconds.value++
    }, 1000)
  } else {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }
})

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
})
</script>

<style scoped>
.recording-status {
  position: fixed;
  top: 1rem;
  right: 1rem;
  background: var(--color-shadow, #16181f);
  border: 1px solid var(--color-graphite, #34384a);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 1000;
  opacity: 0;
  transform: translateY(-10px);
  transition: all 0.3s ease;
}

.recording-status.active {
  opacity: 1;
  transform: translateY(0);
}

.rec-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rec-dot {
  width: 12px;
  height: 12px;
  background: var(--color-film-red, #e63946);
  border-radius: 50%;
  box-shadow: 0 0 16px var(--color-film-red, #e63946);
  animation: recPulse 2s ease-in-out infinite;
}

@keyframes recPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.9); }
}

.rec-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-film-red, #e63946);
  text-transform: uppercase;
}

.rec-timer {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 1rem;
  color: var(--color-paper, #f7f7f2);
}
</style>
```

---

### 8. RecordingControls Component: `src/components/production/autocue/recording/RecordingControls.vue`

```vue
<template>
  <div class="recording-controls">
    <div class="controls-row primary">
      <button class="control-btn" @click="$emit('slower')" :disabled="isRecording">
        ⏪ Slower
      </button>

      <button
        class="control-btn record"
        :class="{ recording: isRecording }"
        @click="$emit('toggle-recording')"
      >
        <span v-if="!isRecording">⏺️ Start Recording</span>
        <span v-else>⏹️ Stop Recording</span>
      </button>

      <button class="control-btn" @click="$emit('faster')" :disabled="isRecording">
        ⏩ Faster
      </button>
    </div>

    <div class="controls-row secondary">
      <button class="control-btn" @click="$emit('previous')" :disabled="!isRecording">
        ⬅️ Previous
      </button>

      <button class="control-btn" @click="$emit('pause')" :disabled="!isRecording">
        {{ isPaused ? '▶️ Resume' : '⏸️ Pause' }}
      </button>

      <button class="control-btn" @click="$emit('next')" :disabled="!isRecording">
        ➡️ Next
      </button>
    </div>

    <div class="keyboard-hints">
      <span class="hint"><kbd>Space</kbd> Record</span>
      <span class="hint"><kbd>←</kbd><kbd>→</kbd> Navigate</span>
      <span class="hint"><kbd>↑</kbd><kbd>↓</kbd> Speed</span>
      <span class="hint"><kbd>P</kbd> Pause</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isRecording: { type: Boolean, default: false },
  isPaused: { type: Boolean, default: false }
})

defineEmits(['toggle-recording', 'pause', 'previous', 'next', 'slower', 'faster'])
</script>

<style scoped>
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
  background: var(--color-slate, #23262f);
  border: 2px solid var(--color-graphite, #34384a);
  color: var(--color-paper, #f7f7f2);
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

.control-btn:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
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
  background: var(--color-graphite, #34384a);
  border-color: var(--color-graphite, #34384a);
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
  color: var(--color-paper-dim, #c1c1bb);
}

kbd {
  background: var(--color-void, #0a0b0f);
  border: 1px solid var(--color-graphite, #34384a);
  border-radius: 4px;
  padding: 0.15rem 0.4rem;
  margin-right: 0.25rem;
  font-size: 0.7rem;
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
```

---

### 9. AutocueStudio Main Component: `src/components/production/autocue/AutocueStudio.vue`

```vue
<template>
  <div class="autocue-studio">
    <!-- Header -->
    <header class="studio-header">
      <div class="studio-branding">
        <div class="studio-badge">🎙️</div>
        <div class="studio-meta">
          <h1>Autocue Studio</h1>
          <p class="session-info">{{ sessionInfo }}</p>
        </div>
      </div>

      <div class="session-stats" v-if="currentPhase !== 'mode-select'">
        <div class="stat-item">
          <span class="stat-value">{{ recordedCount }}</span>
          <span class="stat-label">Recorded</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ totalPhrases }}</span>
          <span class="stat-label">Total</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ completionPercent }}%</span>
          <span class="stat-label">Complete</span>
        </div>
      </div>
    </header>

    <!-- Recording Status (Fixed) -->
    <RecordingStatus :is-recording="isRecording" />

    <!-- Phase: Mode Selection -->
    <ModeSelector
      v-if="currentPhase === 'mode-select'"
      @select="onModeSelect"
    />

    <!-- Phase: Role Selection -->
    <RoleSelector
      v-else-if="currentPhase === 'role-select'"
      :course-name="courseName"
      :known-language="knownLanguage"
      :target-language="targetLanguage"
      :phrase-count="totalPhrases"
      @begin="onBeginSession"
    />

    <!-- Phase: Recording -->
    <div v-else-if="currentPhase === 'recording'" class="recording-phase">
      <!-- Pass Indicator -->
      <div class="pass-indicator">
        <div class="pass-info">
          <span class="pass-label">Current Pass</span>
          <span class="pass-title">
            Pass {{ currentPass }}: {{ currentPass === 1 ? 'Natural Speed' : 'Slow with Gaps' }}
          </span>
        </div>
        <span class="pass-progress">
          Phrase {{ currentPhraseIndex + 1 }} / {{ totalPhrases }}
        </span>
      </div>

      <!-- Teleprompter -->
      <TeleprompterDisplay
        :phrases="phrases"
        :current-index="currentPhraseIndex"
        :current-pass="currentPass"
        :is-recording="isRecording"
      />

      <!-- Controls -->
      <RecordingControls
        :is-recording="isRecording"
        :is-paused="isPaused"
        @toggle-recording="toggleRecording"
        @pause="togglePause"
        @previous="navigatePhrase(-1)"
        @next="navigatePhrase(1)"
        @slower="adjustSpeed(-1)"
        @faster="adjustSpeed(1)"
      />
    </div>

    <!-- Phase: Review -->
    <div v-else-if="currentPhase === 'review'" class="review-phase">
      <SessionReview
        :segments="recordedSegments"
        @approve="approveSegment"
        @reject="rejectSegment"
        @finalize="finalizeSession"
        @back="currentPhase = 'recording'"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useProductionStore } from '@/stores/production'

import ModeSelector from './ModeSelector.vue'
import RoleSelector from './RoleSelector.vue'
import TeleprompterDisplay from './teleprompter/TeleprompterDisplay.vue'
import RecordingControls from './recording/RecordingControls.vue'
import RecordingStatus from './recording/RecordingStatus.vue'
import SessionReview from './review/SessionReview.vue'

const route = useRoute()
const store = useProductionStore()

// Session state
const currentPhase = ref('mode-select') // mode-select, role-select, recording, review
const selectedMode = ref(null)
const selectedRole = ref(null)
const currentPass = ref(1)
const currentPhraseIndex = ref(0)
const isRecording = ref(false)
const isPaused = ref(false)
const scrollSpeed = ref(3)
const recordedSegments = ref([])

// Course data
const courseName = ref('Welsh for English Speakers')
const knownLanguage = ref('English')
const targetLanguage = ref('Welsh')

// Sample phrases (would come from store in real app)
const phrases = ref([
  { id: 1, text: 'Sut mae! Sut dych chi heddiw?', translation: 'Hello! How are you today?' },
  { id: 2, text: 'Hoffwn i goffi os gwelwch yn dda', translation: 'I would like coffee please' },
  { id: 3, text: "Ble mae'r tŷ bach?", translation: 'Where is the bathroom?' },
  { id: 4, text: 'Diolch yn fawr iawn', translation: 'Thank you very much' },
  { id: 5, text: "Mae'n braf cwrdd â chi", translation: 'Nice to meet you' },
  { id: 6, text: "Beth yw'r amser?", translation: 'What time is it?' },
  { id: 7, text: 'Dw i ddim yn deall', translation: "I don't understand" },
  { id: 8, text: 'Allwch chi fy helpu i?', translation: 'Can you help me?' }
])

// Computed
const totalPhrases = computed(() => phrases.value.length)
const recordedCount = computed(() => recordedSegments.value.length)
const completionPercent = computed(() => {
  if (totalPhrases.value === 0) return 0
  return Math.round((recordedCount.value / totalPhrases.value) * 100)
})

const sessionInfo = computed(() => {
  if (!selectedRole.value) return 'Select a mode to begin'
  return `${targetLanguage.value} • Session 001`
})

// Event handlers
function onModeSelect(mode) {
  selectedMode.value = mode
  currentPhase.value = 'role-select'
}

function onBeginSession({ role, language }) {
  selectedRole.value = role
  currentPhase.value = 'recording'
}

function toggleRecording() {
  isRecording.value = !isRecording.value

  if (!isRecording.value) {
    // Recording stopped - go to review
    currentPhase.value = 'review'
  }
}

function togglePause() {
  isPaused.value = !isPaused.value
}

function navigatePhrase(direction) {
  const newIndex = currentPhraseIndex.value + direction
  if (newIndex >= 0 && newIndex < totalPhrases.value) {
    currentPhraseIndex.value = newIndex
  }
}

function adjustSpeed(delta) {
  scrollSpeed.value = Math.max(1, Math.min(10, scrollSpeed.value + delta))
}

function approveSegment(segment) {
  // Mark segment as approved
  console.log('Approved:', segment)
}

function rejectSegment(segment) {
  // Mark for re-recording
  console.log('Rejected:', segment)
}

function finalizeSession() {
  // Upload to S3 and update flags
  console.log('Finalizing session...')
  alert('Session finalized! Recordings uploaded to S3.')

  // Reset state
  currentPhase.value = 'mode-select'
  currentPhraseIndex.value = 0
  currentPass.value = 1
  recordedSegments.value = []
}

// Keyboard shortcuts
function handleKeydown(e) {
  if (currentPhase.value !== 'recording') return

  switch (e.key) {
    case ' ':
      e.preventDefault()
      toggleRecording()
      break
    case 'ArrowLeft':
      e.preventDefault()
      navigatePhrase(-1)
      break
    case 'ArrowRight':
      e.preventDefault()
      navigatePhrase(1)
      break
    case 'ArrowUp':
      e.preventDefault()
      adjustSpeed(-1)
      break
    case 'ArrowDown':
      e.preventDefault()
      adjustSpeed(1)
      break
    case 'p':
    case 'P':
      togglePause()
      break
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)

  // Load course data if available
  const courseCode = route.params.courseCode
  if (courseCode && store.currentCourseCode !== courseCode) {
    store.loadCourse(courseCode)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.autocue-studio {
  min-height: 100vh;
  background: var(--color-void, #0a0b0f);
  padding: 2rem;
}

/* Header */
.studio-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-graphite, #34384a);
}

.studio-branding {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.studio-badge {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, var(--color-film-red, #e63946), #c4313d);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  box-shadow: 0 0 40px rgba(230, 57, 70, 0.4);
  position: relative;
}

.studio-badge::after {
  content: '';
  position: absolute;
  width: 80px;
  height: 80px;
  border: 2px solid var(--color-film-red, #e63946);
  border-radius: 50%;
  opacity: 0.3;
  animation: badgePulse 3s ease-in-out infinite;
}

@keyframes badgePulse {
  0%, 100% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.15); opacity: 0; }
}

.studio-meta h1 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-paper, #f7f7f2);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.session-info {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.9rem;
  color: var(--color-paper-dim, #c1c1bb);
  margin: 0;
}

.session-stats {
  display: flex;
  gap: 1.5rem;
}

.stat-item {
  text-align: center;
  padding: 0.75rem 1.25rem;
  background: var(--color-shadow, #16181f);
  border-radius: 8px;
  border: 1px solid var(--color-graphite, #34384a);
}

.stat-value {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 2rem;
  font-weight: 500;
  color: var(--color-emerald, #06ffa5);
  display: block;
  line-height: 1;
  text-shadow: 0 0 20px rgba(6, 255, 165, 0.5);
}

.stat-label {
  font-size: 0.7rem;
  color: var(--color-paper-dim, #c1c1bb);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: 0.5rem;
  display: block;
}

/* Pass Indicator */
.pass-indicator {
  background: var(--color-shadow, #16181f);
  border: 1px solid var(--color-graphite, #34384a);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pass-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8rem;
  color: var(--color-paper-dim, #c1c1bb);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  display: block;
}

.pass-title {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-tungsten, #ffa630);
}

.pass-progress {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 1rem;
  color: var(--color-emerald, #06ffa5);
}

/* Recording Phase */
.recording-phase {
  max-width: 1000px;
  margin: 0 auto;
}

/* Responsive */
@media (max-width: 768px) {
  .studio-header {
    flex-direction: column;
    gap: 1rem;
  }

  .session-stats {
    width: 100%;
    justify-content: space-around;
  }
}
</style>
```

---

### 10. Add Route

```javascript
// Add to routes array
{
  path: '/production/:courseCode/recording',
  name: 'AutocueStudio',
  component: () => import('@/components/production/autocue/AutocueStudio.vue'),
  props: true
}
```

---

## Design Aesthetic Reference

**CRITICAL**: Match the prototype exactly at `new_vision/autocue-teleprompter-prototype.html`

```css
:root {
  /* Cinematic Dark Palette - Film Studio Aesthetic */
  --color-void: #0a0b0f;
  --color-shadow: #16181f;
  --color-slate: #23262f;
  --color-graphite: #34384a;

  /* Accent Colors - Warm Cinematic Glow */
  --color-film-red: #e63946;
  --color-tungsten: #ffa630;
  --color-emerald: #06ffa5;

  /* Text Colors */
  --color-paper: #f7f7f2;
  --color-paper-dim: #c1c1bb;

  /* Typography */
  --font-display: 'Crimson Pro', serif;
  --font-ui: 'Josefin Sans', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
}
```

Key visual elements:
- Film grain overlay effect
- Pulsing badges and indicators
- Shimmer animation on recording bar
- Warm tungsten glow on current phrase
- Professional studio feel

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/production/autocue/AutocueStudio.vue` | Main orchestrator |
| `src/components/production/autocue/ModeSelector.vue` | Mode 1/2 selection |
| `src/components/production/autocue/RoleSelector.vue` | Role selection |
| `src/components/production/autocue/teleprompter/TeleprompterDisplay.vue` | Scrolling display |
| `src/components/production/autocue/teleprompter/PhraseCard.vue` | Individual phrase |
| `src/components/production/autocue/recording/RecordingControls.vue` | Control buttons |
| `src/components/production/autocue/recording/RecordingStatus.vue` | REC indicator |
| `src/components/production/autocue/review/SessionReview.vue` | Post-recording review |

---

## Success Criteria

Before creating your PR, verify:

- [ ] All components created in correct directories
- [ ] Mode selection works (Mode 1 and Mode 2 cards)
- [ ] Role selection works with radio buttons
- [ ] Teleprompter scrolls smoothly
- [ ] Current phrase highlighted with tungsten glow
- [ ] Recording status shows when recording
- [ ] Keyboard shortcuts work (Space, arrows, P)
- [ ] Pass indicator shows Pass 1/Pass 2
- [ ] Design matches prototype EXACTLY
- [ ] Route added to router

---

## PR Instructions

When complete:

1. Commit all changes with descriptive message
2. Push branch to origin
3. Create PR with title: `[Autocue] Two-Mode Recording System`
4. PR body should list all files created/modified
5. Tag for review by Master Orchestrator

---

## Dependencies

- **Requires Master 1 complete**: You need the Pinia store
- **Parallel with**: Masters 2 and 3 (no conflicts expected)

---

## Important Implementation Notes

1. **MediaRecorder API**: For actual recording, use the Web Audio API and MediaRecorder
2. **Chunked uploads**: For long recordings, implement chunked S3 uploads (see AUTOCUE_TWO_MODE_SYSTEM.md)
3. **Gap detection**: Pass 2 will need silence detection algorithm (future enhancement)
4. **The prototype is your bible**: Open `autocue-teleprompter-prototype.html` in a browser and match it pixel-for-pixel

---

**You are Master 4 of 4. The Autocue Studio is where the magic happens - where human voices bring courses to life. Make it feel like a professional recording studio.**
