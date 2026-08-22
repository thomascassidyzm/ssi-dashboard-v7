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

      <!-- Short warm-up run so a new recorder (and whoever is reviewing them)
           can hear real audio back within a couple of minutes, instead of
           committing to the whole course before anyone has checked the mic,
           the room or the accent. -->
      <button class="test-batch-btn" @click.stop="startTestBatch">
        Test batch first — a quick sample of the course
      </button>
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

    <div
      v-if="courseCode"
      class="mode-card"
      @click="goToPods"
    >
      <span class="mode-icon">🎭</span>
      <h2 class="mode-title">Mode 3: Listening Pods</h2>
      <p class="mode-description">
        Record the dialogue listening exercises with real voices. Every pod is
        cast with exactly two voices — one male, one female — who between them
        read every character in the scenario.
      </p>
      <ul class="mode-features">
        <li>Two voices: one male, one female, every pod</li>
        <li>One link per voice — read all your lines in one sitting</li>
        <li>Cue lines show what was just said</li>
        <li>Works on a phone</li>
        <li>Starts at the cast panel (Listening Pods page)</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const emit = defineEmits(['select'])
const selectedMode = ref(null)
const route = useRoute()
const router = useRouter()
const courseCode = route.params.courseCode || null

// Seed ceiling for the warm-up run: the script optimizer picks phrases by LEGO
// coverage from seeds at or below this number, so the sample is a subset of
// them, NOT seeds 1..N in order. Small on purpose — the point is to hear
// something back quickly, not to make a dent in the course.
const TEST_BATCH_SEEDS = 5

function selectMode(mode) {
  selectedMode.value = mode
  emit('select', mode)
}

// Same flow as Mode 1, capped. @click.stop keeps the card's own handler from
// also firing and starting the uncapped run.
//
// The cap goes into the URL as well as the emitted opts: RecordRoom reads
// ?maxSeed from the route to size its own totals, so a cap that only ever
// lived in component state left the room counting the whole course.
// A narrower cap already on the link wins — pressing "test batch" must never
// widen a scope the recorder was deliberately handed.
function startTestBatch() {
  selectedMode.value = 'new-course'

  const linkCap = parseInt(route.query.maxSeed, 10)
  const maxSeed = Number.isInteger(linkCap) && linkCap > 0
    ? Math.min(linkCap, TEST_BATCH_SEEDS)
    : TEST_BATCH_SEEDS

  if (String(route.query.maxSeed ?? '') !== String(maxSeed)) {
    router.replace({ query: { ...route.query, maxSeed: String(maxSeed) } })
  }

  emit('select', 'new-course', { maxSeed })
}

// Dialogue recording is cast-first: the pods page's Cast panel hands out the
// per-voice recording links that open the dialogue autocue.
function goToPods() {
  router.push(`/production/${courseCode}/pods`)
}
</script>

<style scoped>
.mode-selector {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 1500px;
  margin: 0 auto;
}

.mode-card {
  background: linear-gradient(135deg, var(--color-shadow, var(--surface)), var(--color-slate, var(--surface-2)));
  border: 2px solid var(--color-graphite, var(--surface-3));
  border-radius: 16px;
  padding: 2rem;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  position: relative;
  overflow: hidden;
}

/* Light mode: the graphite/surface-3 border is nearly invisible on the
   slate canvas (~1.07:1). Use the stronger --line token plus a subtle
   shadow so cards separate crisply. Dark mode keeps its original border. */
:root[data-theme="light"] .mode-card {
  border-color: var(--line);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(15, 23, 42, 0.05);
}

:root[data-theme="light"] .mode-card:hover {
  box-shadow: 0 8px 32px rgba(168, 85, 8, 0.18);
}

:root[data-theme="light"] .mode-card.selected {
  box-shadow: 0 0 0 1px var(--accent), 0 4px 24px rgba(168, 85, 8, 0.2);
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
  border-color: var(--color-tungsten, var(--accent));
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(255, 166, 48, 0.3);
}

.mode-card:hover::before {
  opacity: 1;
}

.mode-card.selected {
  border-color: var(--color-tungsten, var(--accent));
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
  color: var(--color-paper, var(--ink));
  margin: 0 0 0.75rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.mode-description {
  color: var(--color-paper-dim, var(--muted));
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
  color: var(--color-paper-dim, var(--muted));
}

.mode-features li::before {
  content: '▸';
  position: absolute;
  left: 0;
  color: var(--color-tungsten, var(--accent));
  font-weight: bold;
}

/* Secondary to the card itself — this is the cautious path, not the headline
   action, so it reads as an outline button rather than competing with the card. */
.test-batch-btn {
  position: relative;
  z-index: 1;
  width: 100%;
  margin-top: 1.5rem;
  padding: 0.625rem 1rem;
  background: transparent;
  border: 1px solid var(--color-tungsten, var(--accent));
  border-radius: 8px;
  color: var(--color-tungsten, var(--accent));
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.test-batch-btn:hover {
  background: var(--color-tungsten, var(--accent));
  color: var(--color-void, var(--canvas));
}

@media (max-width: 768px) {
  .mode-selector {
    grid-template-columns: 1fr;
  }
}
</style>
