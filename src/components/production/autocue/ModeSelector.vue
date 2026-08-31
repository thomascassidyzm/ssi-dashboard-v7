<template>
  <div class="mode-selector">
    <div
      class="mode-card"
      :class="{ selected: selectedMode === 'new-course' }"
      @click="selectMode('new-course')"
    >
      <span class="icon-frame" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="6" width="20" height="15" rx="2" />
          <path d="M2 11h20" />
          <path d="m4.5 6 2.2-3.2 3.3 2.4" />
          <path d="m10.5 6 2.2-3.2 3.3 2.4" />
          <path d="m16.5 6 2.2-3.2 3.3 2.4" />
        </svg>
      </span>
      <h2 class="mode-title">Record a new course</h2>
      <p class="mode-description">
        Record a complete course section with two-pass flow. Natural speed first,
        then slow with gaps for LEGO extraction.
      </p>
      <ul class="mode-features">
        <li><svg class="feature-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>Continuous teleprompter recording</li>
        <li><svg class="feature-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>Pass 1: Natural prosody</li>
        <li><svg class="feature-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>Pass 2: Slow with gaps</li>
        <li><svg class="feature-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>AI-powered segmentation</li>
        <li><svg class="feature-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>Batch review and approval</li>
      </ul>

      <!-- Which reading order this session uses. It lived ONLY in the link's
           ?order= query, so a recordist who opened the page without it had no
           way to see which of the two they were in, and no way to change it —
           which is how a session with 225 takes behind it opened mid-course
           and read as a fresh start (2026-08-23). Named by what each one asks
           of the reader, never by its internal name: nobody will be standing
           next to a volunteer to explain "coverage". -->
      <div class="order-choice" @click.stop>
        <span class="order-choice-label" id="order-choice-label">How would you like to read?</span>
        <div class="order-options" role="radiogroup" aria-labelledby="order-choice-label">
          <button
            v-for="opt in ORDER_OPTIONS"
            :key="opt.value"
            class="order-option"
            :class="{ active: scriptOrder === opt.value }"
            type="button"
            role="radio"
            :aria-checked="scriptOrder === opt.value"
            @click.stop="chooseOrder(opt.value)"
          >
            <span class="order-option-title">
              <svg v-if="scriptOrder === opt.value" class="order-option-tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
              {{ opt.title }}
            </span>
            <span class="order-option-detail">{{ opt.detail }}</span>
          </button>
        </div>
      </div>

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
      <span class="icon-frame" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      </span>
      <h2 class="mode-title">Re-record flagged lines</h2>
      <p class="mode-description">
        Re-record specific flagged items from QA review. Targeted fixes without
        re-recording the entire course.
      </p>
      <ul class="mode-features">
        <li><svg class="feature-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>Queue of flagged items only</li>
        <li><svg class="feature-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>See original recording context</li>
        <li><svg class="feature-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>Compare old vs. new versions</li>
        <li><svg class="feature-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>Skip and return to items</li>
        <li><svg class="feature-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>Quick targeted workflow</li>
      </ul>
    </div>

    <div
      v-if="courseCode"
      class="mode-card"
      @click="goToPods"
    >
      <span class="icon-frame" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 3h6a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-1v3l-3.5-3H13a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
          <path d="M8 10H5a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h1v3l3.5-3H11" />
        </svg>
      </span>
      <h2 class="mode-title">Record listening pods</h2>
      <p class="mode-description">
        Record the dialogue listening exercises with real voices. Every pod is
        cast with exactly two voices — one male, one female — who between them
        read every character in the scenario.
      </p>
      <ul class="mode-features">
        <li><svg class="feature-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>Two voices: one male, one female, every pod</li>
        <li><svg class="feature-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>One link per voice — read all your lines in one sitting</li>
        <li><svg class="feature-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>Cue lines show what was just said</li>
        <li><svg class="feature-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>Works on a phone</li>
        <li><svg class="feature-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>Starts at the cast panel (Listening Pods page)</li>
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

// The two reading orders, said in words a volunteer can act on without anyone
// there to explain them. 'coverage' stays the default (Kai's ruling,
// 2026-08-24: the toggle exists so the mode is visible and changeable, NOT to
// change which mode is normal).
const ORDER_OPTIONS = [
  {
    value: 'coverage',
    title: 'A shorter set of lines, cut up afterwards',
    detail: 'You read the fewest lines that between them contain every piece of the course. They jump around rather than starting at the beginning, and afterwards we cut them into pieces and reassemble them to voice everything else. This is the usual choice.'
  },
  {
    value: 'course',
    title: 'The course itself, straight through from the start',
    detail: 'You read every line in the order a learner meets it, beginning at seed 1. Each line is used exactly as you read it — nothing is cut up. Stop whenever you like; next time picks up where you left off.'
  }
]

// Reflects the link on load, so an existing ?order=course link still opens in
// course mode and the toggle SHOWS that rather than contradicting it.
const scriptOrder = ref(route.query.order === 'course' ? 'course' : 'coverage')

// The URL stays the source of truth (RecordRoom sizes its own totals from
// ?order, and the link is what gets shared), so a choice here is written back
// to the query — dropping the param entirely for the default, which is exactly
// what a plain link looks like today.
function chooseOrder(order) {
  const next = order === 'course' ? 'course' : 'coverage'
  scriptOrder.value = next
  const query = { ...route.query }
  if (next === 'course') query.order = 'course'
  else delete query.order
  router.replace({ query })
}

function selectMode(mode) {
  selectedMode.value = mode
  emit('select', mode, { order: scriptOrder.value })
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

  emit('select', 'new-course', { maxSeed, order: scriptOrder.value })
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
  gap: 1.5rem;
  max-width: 1500px;
  margin: 0 auto;
}

/* House card: flat --surface, one quiet 1px line, 16px radius. The old
   gradient + amber sheen ::before overlay is gone — it was also swallowing
   pointer events across the whole card. */
.mode-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 1.5rem;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.mode-card:hover {
  border-color: var(--accent);
}

.mode-card.selected {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--surface));
}

/* House icon frame: 44px raised square, 1px line, 22px stroke-1.5 glyph. */
.icon-frame {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 10px;
  color: var(--accent);
  margin-bottom: 1rem;
}

.icon-frame svg {
  width: 22px;
  height: 22px;
}

.mode-title {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ink);
  margin: 0 0 0.625rem 0;
}

.mode-description {
  color: var(--muted);
  font-size: 0.875rem;
  line-height: 1.6;
  margin: 0 0 1rem;
}

.mode-features {
  list-style: none;
  padding: 0;
  margin: 0;
}

.mode-features li {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--muted);
}

.feature-mark {
  width: 14px;
  height: 14px;
  flex: none;
  margin-top: 0.2rem;
  color: var(--accent);
}

/* Reading-order chooser. Stacked full-width rows rather than a segmented pill:
   each option carries its own explanation, and a phone has no room to put two
   sentences side by side. */
.order-choice {
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--line);
}

.order-choice-label {
  display: block;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ink);
}

.order-options {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.order-option {
  display: block;
  width: 100%;
  /* Comfortably tappable on a phone — the whole row is the target, not a
     radio dot. */
  min-height: 44px;
  padding: 0.75rem 0.875rem;
  text-align: left;
  font: inherit;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.order-option:hover {
  border-color: var(--accent);
}

.order-option.active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, var(--surface-2));
}

.order-option-title {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--ink);
}

.order-option-tick {
  width: 14px;
  height: 14px;
  vertical-align: -0.15em;
  margin-right: 0.15rem;
  color: var(--accent);
}

.order-option-detail {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--muted);
}

/* Secondary to the card itself — this is the cautious path, not the headline
   action, so it reads as an outline button rather than competing with the card. */
.test-batch-btn {
  width: 100%;
  margin-top: 1.5rem;
  padding: 0.625rem 1rem;
  background: transparent;
  border: 1px solid var(--accent);
  border-radius: 8px;
  color: var(--accent);
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  min-height: 44px;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.test-batch-btn:hover {
  background: var(--accent);
  color: var(--canvas);
}

@media (max-width: 768px) {
  .mode-selector {
    grid-template-columns: 1fr;
  }
}
</style>
