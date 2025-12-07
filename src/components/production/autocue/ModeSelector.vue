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
  background: linear-gradient(135deg, var(--color-shadow, #1e293b), var(--color-slate, #334155));
  border: 2px solid var(--color-graphite, #475569);
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
