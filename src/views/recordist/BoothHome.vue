<template>
  <!-- THE BOOTH'S HOME SCREEN (Aran, 2026-10-14, job #347): Option A's cards, with Option B's
       "Up next" on top and Option C's tickable boxes down the side. Draws from the summary only;
       a batch's lines are fetched when he opens it. Decisions live in booth-home.js. -->
  <div class="bh" data-surface="booth-home-2026-10-14">
    <nav class="rc-nav" aria-label="Booth navigation">
      <span class="rc-nav-item is-here" aria-current="page">Booth</span>
      <span class="rc-nav-dot">·</span>
      <router-link to="/" class="rc-nav-item rc-nav-home">Popty</router-link>
    </nav>

    <!-- ONE PIECE OF WORK, its batches listed. -->
    <section v-if="openTrack" class="bh-track">
      <button type="button" class="bh-back" @click="$emit('home')">‹ Back to home</button>
      <span class="bh-kind" :class="openTrack.cls">{{ openTrack.short }}</span>
      <h1 class="bh-h1">{{ openTrack.title }}</h1>
      <p class="bh-sub">{{ openTrack.what }}</p>
      <div class="bh-bar"><i :style="{ width: pct(openTrack) }"></i></div>
      <p class="bh-sub">{{ n(openTrack.recorded) }} of {{ n(openTrack.total) }} recorded</p>
      <p v-if="openTrack.kind === 'phrase'" class="bh-sub">One batch opens at a time. When a batch is finished, the next one opens.</p>
      <div class="bh-list">
        <button
          v-for="b in openBatches" :key="b.n" type="button"
          class="bh-brow"
          :class="{ lock: !canOpen(openTrack, b), next: isUpNext(openTrack, b), full: b.recorded >= b.total }"
          :disabled="!canOpen(openTrack, b)"
          :data-test="`batch-${b.n}`"
          @click="$emit('open', openTrack.key, b.n)"
        >
          <span class="bh-bn">{{ b.recorded >= b.total ? '✓' : b.n }}</span>
          <span class="bh-grow">
            <b>{{ batchName(openTrack, b) }}</b>
            <small>{{ batchWords(openTrack, b) }}<template v-if="isUpNext(openTrack, b)"> · <em>up next</em></template></small>
          </span>
          <span v-if="canOpen(openTrack, b)" class="bh-pill">›</span>
        </button>
      </div>
      <p v-if="openBatches.length < openTrack.batches.length" class="bh-note" data-test="hidden-batches">
        {{ openTrack.batches.length - openBatches.length }} unticked {{ openTrack.batches.length - openBatches.length === 1 ? 'batch is' : 'batches are' }} hidden. Tick {{ openTrack.batches.length - openBatches.length === 1 ? 'it' : 'them' }} under “What I'm doing” to show {{ openTrack.batches.length - openBatches.length === 1 ? 'it' : 'them' }} again.
      </p>
    </section>

    <!-- HOME -->
    <section v-else>
      <h1 class="bh-h1">Hello {{ displayName }}</h1>
      <p class="bh-sub">Pick what you want to record. Everything is saved as you go.</p>

      <div class="bh-cols">
        <div class="bh-main">
          <!-- UP NEXT (Option B): the first ticked batch with lines still to read, new
               sentences before practice phrases. -->
          <div v-if="next" class="bh-hero" data-test="up-next">
            <span class="bh-kind" :class="next.track.cls">Up next</span>
            <h2 class="bh-h2">{{ next.track.title }}</h2>
            <p class="bh-sub">{{ next.track.what }}</p>
            <p class="bh-big">
              <template v-if="next.track.batches.length > 1">{{ batchName(next.track, next.batch) }}<small> of {{ next.track.batches.length }}</small></template>
              <template v-else>{{ n(next.batch.total - next.batch.recorded) }}<small> lines left</small></template>
            </p>
            <div class="bh-bar"><i :style="{ width: pct(next.batch) }"></i></div>
            <p class="bh-sub">{{ batchWords(next.track, next.batch) }}</p>
            <button type="button" class="bh-go" data-test="up-next-start" @click="$emit('open', next.track.key, next.batch.n)">
              Open {{ next.track.batches.length > 1 ? batchName(next.track, next.batch).toLowerCase() : 'this' }} ›
            </button>
          </div>
          <div v-else class="bh-hero bh-hero-done">
            <h2 class="bh-h2">Nothing ticked is waiting</h2>
            <p class="bh-sub">Everything you have ticked is recorded. Tick more on the list to have it offered here.</p>
          </div>

          <!-- THE TICKS on a phone sit here, under Up next, folded until opened. -->
          <button type="button" class="bh-plan-toggle" :aria-expanded="planOpen ? 'true' : 'false'" @click="planOpen = !planOpen">
            {{ planOpen ? '▾' : '▸' }} What I'm doing — {{ tickedCount }} of {{ tickables.length }} ticked
          </button>
          <div v-if="!wide && planOpen" class="bh-side" aria-label="What I'm doing">
            <BoothTicks :tickables="tickables" :ticked="ticked" :batch-name="batchName" @tick="(id, on) => $emit('tick', id, on)" />
          </div>

          <template v-if="groups.main.length">
            <h3 class="bh-sec">{{ mainHeading }}</h3>
            <div class="bh-grid">
              <button v-for="t in groups.main" :key="t.key" type="button" class="bh-card" :class="{ lock: t.locked }" :disabled="t.locked" :data-test="`card-${t.key}`" @click="$emit('card', t.key)">
                <span class="bh-kind" :class="t.cls">{{ t.short }}</span>
                <span class="bh-h3">{{ t.title }}</span>
                <span class="bh-sub">{{ t.what }}</span>
                <span class="bh-bar"><i :style="{ width: pct(t) }"></i></span>
                <span class="bh-row"><span class="bh-sub">{{ n(t.recorded) }} of {{ n(t.total) }} recorded</span><span class="bh-pill">{{ cardPill(t) }}</span></span>
              </button>
            </div>
          </template>

          <template v-if="groups.other.length">
            <h3 class="bh-sec">Other scripts</h3>
            <div class="bh-grid">
              <button v-for="t in groups.other" :key="t.key" type="button" class="bh-card" :data-test="`card-${t.key}`" @click="$emit('card', t.key)">
                <span class="bh-kind" :class="t.cls">{{ t.short }}</span>
                <span class="bh-h3">{{ t.title }}</span>
                <span class="bh-sub">{{ t.what }}</span>
                <span class="bh-bar"><i :style="{ width: pct(t) }"></i></span>
                <span class="bh-row"><span class="bh-sub">{{ n(t.recorded) }} of {{ n(t.total) }} recorded</span><span class="bh-pill">{{ cardPill(t) }}</span></span>
              </button>
            </div>
          </template>

          <p v-if="groups.hidden.length" class="bh-note" data-test="hidden-cards">
            Hidden because you unticked {{ groups.hidden.length === 1 ? 'it' : 'them' }}: {{ groups.hidden.map(t => t.title).join(', ') }}. Tick {{ groups.hidden.length === 1 ? 'it' : 'them' }} under “What I'm doing” to show {{ groups.hidden.length === 1 ? 'it' : 'them' }} again.
          </p>

          <template v-if="groups.finished.length">
            <h3 class="bh-sec">Finished ✓</h3>
            <div class="bh-done">
              <button v-for="t in groups.finished" :key="t.key" type="button" class="bh-done-row" @click="$emit('card', t.key)">
                <span class="bh-tick">✓</span><span class="bh-grow">{{ t.title }}</span><span class="bh-pill">{{ n(t.total) }} {{ t.total === 1 ? 'line' : 'lines' }}</span>
              </button>
            </div>
          </template>

          <!-- The team, for Tom, Aran and Kai only (job #379): self-contained, see BoothTeamStats. -->
          <BoothTeamStats />

          <p v-for="m in notes" :key="m" class="bh-note">{{ m }}</p>
        </div>

        <!-- THE TICKS (Option C): which scripts and batches he is doing. Down the right on a wide
             screen; on a phone, under Up next when opened. They steer Up next and nothing else. -->
        <aside v-if="wide" class="bh-side" aria-label="What I'm doing">
          <BoothTicks :tickables="tickables" :ticked="ticked" :batch-name="batchName" @tick="(id, on) => $emit('tick', id, on)" />
        </aside>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import BoothTicks from './BoothTicks.vue'
import BoothTeamStats from './BoothTeamStats.vue'
import { groupTracks, upNext, batchOpenable, trackLocked, splitTicked, shownBatches } from './booth-home.js'

const props = defineProps({
  displayName: { type: String, default: '' },
  // Tracks from the summary, decorated by the room with title / short / what / cls.
  tracks: { type: Array, required: true },
  unticked: { type: Object, required: true }, // Set of unticked ids
  trackKey: { type: String, default: null },  // a card opened to its batch list
  mainHeading: { type: String, default: 'New work' },
  notes: { type: Array, default: () => [] },
})
defineEmits(['open', 'card', 'home', 'tick'])

const n = (x) => Number(x || 0).toLocaleString('en-GB')
const pct = (x) => `${x.total ? Math.max(Math.round(100 * x.recorded / x.total), x.recorded ? 1 : 0) : 0}%`
const withLock = (t) => ({ ...t, locked: trackLocked(t, props.tracks) })
// Unticked cards are hidden (job #378); the tick list still holds them, so ticking brings them back.
const allGroups = computed(() => {
  const g = groupTracks(props.tracks)
  return { main: g.main.map(withLock), other: g.other.map(withLock), finished: g.finished }
})
const groups = computed(() => {
  const main = splitTicked(allGroups.value.main, props.unticked)
  const other = splitTicked(allGroups.value.other, props.unticked)
  return { main: main.shown, other: other.shown, finished: allGroups.value.finished, hidden: [...main.hidden, ...other.hidden] }
})
const next = computed(() => upNext(props.tracks, props.unticked))
const ticked = (id) => !props.unticked.has(id)
const tickables = computed(() => [...allGroups.value.main, ...allGroups.value.other])
const tickedCount = computed(() => tickables.value.filter((t) => ticked(t.key)).length)
const openTrack = computed(() => {
  const t = props.trackKey && props.tracks.find((x) => x.key === props.trackKey)
  return t ? withLock(t) : null
})
const openBatches = computed(() => (openTrack.value ? shownBatches(openTrack.value, props.unticked) : []))
// Wide screens show the list down the side; a phone keeps it folded under Up next.
const isWide = () => typeof window !== 'undefined' && window.innerWidth >= 900
const wide = ref(isWide())
const planOpen = ref(false)
const onResize = () => { wide.value = isWide() }
onMounted(() => window.addEventListener('resize', onResize))
onBeforeUnmount(() => window.removeEventListener('resize', onResize))

const canOpen = (t, b) => batchOpenable(t, b, props.tracks) && !(t.kind === 'phrase' && b.recorded >= b.total)
const isUpNext = (t, b) => !!(next.value && next.value.track.key === t.key && next.value.batch.n === b.n)

function batchName(t, b) {
  if (t.kind === 'phrase') return `${b.courseLabel || ''} batch ${b.batch}`.trim().replace(/^./, (c) => c.toUpperCase())
  return t.batches.length > 1 ? `Batch ${b.n}` : t.title
}
function batchWords(t, b) {
  const done = `${n(b.recorded)} of ${n(b.total)} recorded`
  if (t.kind === 'phrase') {
    if (trackLocked(t, props.tracks)) return `${n(b.total)} phrases · opens when pass 1 is finished`
    if (b.recorded >= b.total) return `${n(b.total)} phrases · all recorded`
    // Only the batch the queue serves opens (its card number is what the batch fetch matches);
    // a later one names the batch it waits on.
    if (!b.current) {
      const prev = t.batches[t.batches.indexOf(b) - 1]
      return `${n(b.total)} phrases · ${prev ? `opens after ${batchName(t, prev)}` : 'opens when the batch before it is done'}`
    }
    return `${done}${b.held ? ` · ${b.held} held back for proofing` : ''}`
  }
  if (t.batches.length > 1) return `${t.kind === 'lego' ? 'LEGOs' : 'Sentences'} ${n(b.from)}–${n(b.to)} · ${done}`
  return done
}
function cardPill(t) {
  if (t.locked) return '🔒 after pass 1'
  if (t.batches.length > 1) return `${t.batches.length} batches ›`
  return `${n(t.total - t.recorded)} left ›`
}
</script>

<style scoped>
.bh { padding-top: 0.75rem; }
.rc-nav { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem 0.5rem; margin: 0 0 0.6rem; font-size: 0.95rem; }
.rc-nav-item { display: inline-block; min-height: 40px; line-height: 40px; padding: 0 0.6rem; border-radius: 8px; color: var(--color-emerald, #06ffa5); background: rgba(6, 255, 165, 0.08); text-decoration: none; font-weight: 600; }
.rc-nav-item.is-here { color: var(--color-paper, #f5f5f0); background: rgba(255, 255, 255, 0.12); }
.rc-nav-dot { color: var(--color-paper-dim, #c1c1bb); opacity: 0.6; }
.rc-nav-home { opacity: 0.75; font-weight: 500; }
.bh-h1 { font-family: 'Josefin Sans', sans-serif; font-size: 1.6rem; margin: 0.25rem 0 0.2rem; }
.bh-h2 { font-family: 'Josefin Sans', sans-serif; font-size: 1.3rem; margin: 0.2rem 0 0.3rem; }
.bh-h3 { display: block; font-size: 1.05rem; font-weight: 700; margin: 0.1rem 0 0.25rem; color: var(--color-paper, #f7f7f2); }
.bh-sub { display: block; color: var(--color-paper-dim, #c1c1bb); font-size: 0.9rem; line-height: 1.5; margin: 0; }
.bh-sec { font-size: 0.78rem; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--color-paper-dim, #c1c1bb); margin: 1.4rem 0 0.3rem; }
.bh-kind { display: inline-block; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; padding: 0.1rem 0.55rem; border-radius: 99px; margin-bottom: 0.3rem; background: #1f2f2a; color: #6ee7b7; }
.bh-kind.k-sent { background: #1e3a5f; color: #93c5fd; }
.bh-kind.k-p1 { background: #3b2f0b; color: #fcd34d; }
.bh-kind.k-p2 { background: #2e1f47; color: #c4b5fd; }
.bh-kind.k-lego { background: #3a1d2e; color: #f9a8d4; }
.bh-bar { display: block; height: 8px; background: var(--color-graphite, #475569); border-radius: 99px; overflow: hidden; margin: 0.5rem 0 0.25rem; }
.bh-bar > i { display: block; height: 100%; background: var(--color-emerald, #06ffa5); }
.bh-row { display: flex; align-items: center; gap: 0.75rem; justify-content: space-between; }
.bh-grow { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.bh-grow small { color: var(--color-paper-dim, #c1c1bb); font-size: 0.82rem; }
.bh-pill { font-size: 0.82rem; color: var(--color-paper-dim, #c1c1bb); white-space: nowrap; }
.bh-hero { background: linear-gradient(160deg, #1e3a5f, var(--color-shadow, #1e293b) 60%); border: 1px solid #34507a; border-radius: 18px; padding: 1.1rem; margin: 1rem 0 0.5rem; }
.bh-hero-done { background: var(--color-shadow, #1e293b); border-color: var(--color-graphite, #475569); }
.bh-big { font-size: 2rem; font-weight: 800; line-height: 1.1; margin: 0.6rem 0 0; color: var(--color-paper, #f7f7f2); }
.bh-big small { font-size: 0.95rem; font-weight: 500; color: var(--color-paper-dim, #c1c1bb); }
.bh-go { display: block; width: 100%; min-height: 56px; margin-top: 0.9rem; border: 0; border-radius: 12px; font: inherit; font-size: 1.1rem; font-weight: 700; background: var(--color-emerald, #06ffa5); color: #052e1f; cursor: pointer; }
.bh-grid { display: grid; gap: 0.75rem; }
.bh-card { display: block; width: 100%; text-align: left; font: inherit; color: inherit; background: var(--color-shadow, #1e293b); border: 1px solid var(--color-graphite, #475569); border-radius: 14px; padding: 0.95rem; cursor: pointer; }
.bh-card:hover:not(:disabled) { border-color: var(--color-emerald, #06ffa5); }
.bh-card.lock, .bh-brow.lock { opacity: 0.5; cursor: default; }
.bh-done { background: var(--color-shadow, #1e293b); border: 1px solid var(--color-graphite, #475569); border-radius: 14px; padding: 0.3rem 0.8rem; }
.bh-done-row { display: flex; width: 100%; gap: 0.6rem; align-items: center; padding: 0.55rem 0; background: none; border: 0; font: inherit; color: inherit; text-align: left; cursor: pointer; }
.bh-done-row + .bh-done-row { border-top: 1px solid var(--color-graphite, #475569); }
.bh-tick { color: var(--color-emerald, #06ffa5); }
.bh-note { color: var(--color-paper-dim, #c1c1bb); font-size: 0.85rem; margin: 0.9rem 0 0; }
.bh-plan-toggle { display: block; width: 100%; min-height: 44px; margin: 0.4rem 0 0; text-align: left; font: inherit; font-weight: 600; color: var(--color-paper, #f7f7f2); background: transparent; border: 1px solid var(--color-graphite, #475569); border-radius: 10px; padding: 0 0.8rem; cursor: pointer; }
.bh-side { background: var(--color-shadow, #1e293b); border: 1px solid var(--color-graphite, #475569); border-radius: 14px; padding: 0.9rem; margin-top: 0.5rem; }
.bh-back { background: none; border: 0; font: inherit; color: var(--color-paper-dim, #c1c1bb); padding: 0.4rem 0; min-height: 44px; cursor: pointer; }
.bh-list { background: var(--color-shadow, #1e293b); border: 1px solid var(--color-graphite, #475569); border-radius: 14px; padding: 0.2rem 0.75rem; margin-top: 0.9rem; }
.bh-brow { display: flex; width: 100%; gap: 0.75rem; align-items: center; padding: 0.7rem 0.2rem; background: none; border: 0; font: inherit; color: inherit; text-align: left; cursor: pointer; }
.bh-brow + .bh-brow { border-top: 1px solid var(--color-graphite, #475569); }
.bh-brow:hover:not(:disabled) { background: rgba(255, 255, 255, 0.04); }
.bh-brow em { color: var(--color-emerald, #06ffa5); font-style: normal; font-weight: 700; }
.bh-bn { width: 44px; height: 44px; border-radius: 10px; background: var(--color-graphite, #475569); display: flex; align-items: center; justify-content: center; font-weight: 700; flex: none; }
.bh-brow.next .bh-bn { background: var(--color-emerald, #06ffa5); color: #052e1f; }
.bh-brow.full .bh-bn { color: var(--color-emerald, #06ffa5); }
@media (min-width: 900px) {
  .bh-cols { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); gap: 1.75rem; align-items: start; }
  .bh-grid { grid-template-columns: 1fr 1fr; }
  .bh-plan-toggle { display: none; }
  .bh-side { position: sticky; top: 1rem; margin-top: 1rem; max-height: calc(100vh - 2rem); overflow: auto; }
  .bh-track { max-width: 760px; }
}
:root[data-theme="light"] .bh-card, :root[data-theme="light"] .bh-side, :root[data-theme="light"] .bh-list,
:root[data-theme="light"] .bh-done, :root[data-theme="light"] .bh-plan-toggle { border-color: var(--line); }
:root[data-theme="light"] .bh-hero { background: #e6eefb; border-color: #93b4e6; }
:root[data-theme="light"] .bh-kind.k-lego { background: #fce7f3; color: #9d174d; }
</style>
