<template>
  <div class="insights-view">
    <header class="iv-head">
      <h2>Insights</h2>
      <p class="iv-sub">
        Claude's "before you asked" deep-run over real learner telemetry — school-demo accounts excluded.
        Runs on the SSi Machine via the Max subscription; findings persist to the shared DB and also show in the
        learning app at <code>/admin/insights</code>.
      </p>
    </header>

    <section class="iv-controls">
      <button class="iv-btn" :disabled="running" @click="run(false)">
        {{ running ? 'Running deep-run…' : 'Run discovery' }}
      </button>
      <button class="iv-btn iv-btn--ghost" :disabled="running" @click="run(true)" title="Synthetic populated run for presentations">
        Demo run
      </button>
      <button class="iv-btn iv-btn--ghost" :disabled="loadingLatest" @click="refresh">Refresh</button>
      <span v-if="status" class="iv-status" :class="{ 'iv-status--err': !!error }">{{ status }}</span>
    </section>

    <section class="iv-relnotes">
      <h3 class="iv-relnotes-h">App release notes</h3>
      <p class="iv-relnotes-sub">
        Turn the learning-app's <code>main..staging</code> changes into a plain, learner-facing note.
        Generate a draft, edit it, then publish — it appears for learners at <code>/admin/release-notes</code>.
      </p>
      <ReleaseNotesTrigger />
    </section>

    <section v-if="meta" class="iv-meta">
      What Claude surfaced · {{ relTime(meta.generated_at) }} · {{ (latest?.findings || []).length }} findings ·
      {{ meta.source }} · {{ meta.window_days }}d window
    </section>

    <section class="iv-feed">
      <p v-if="loadingLatest && !latest" class="iv-empty">Loading…</p>
      <p v-else-if="!latest" class="iv-empty">No discovery run yet — hit <strong>Run discovery</strong> (takes ~1–2 min).</p>
      <article v-for="(f, i) in (latest?.findings || [])" :key="i" class="iv-card" :class="`tone-${(f.tone || 'neutral')}`">
        <div class="iv-card-top">
          <span class="iv-badge">{{ (f.tone || 'neutral').toUpperCase() }}</span>
          <h3>{{ f.title }}</h3>
        </div>
        <p class="iv-story">{{ f.story }}</p>
        <p v-if="f.annotate" class="iv-annotate">{{ f.annotate }}</p>
        <div v-if="f.actions && f.actions.length" class="iv-actions">
          <span v-for="(a, j) in f.actions" :key="j" class="iv-action">
            <strong>{{ a.tier }} · {{ a.owner }}</strong> {{ a.text }}
          </span>
        </div>
        <span class="iv-tags">{{ f.frame }} · {{ f.metric }} · {{ f.widget }}</span>
      </article>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useInsightDiscovery } from '@/composables/useInsightDiscovery'
import ReleaseNotesTrigger from '@/components/ReleaseNotesTrigger.vue'

const { running, error, latest, loadingLatest, trigger, fetchLatest } = useInsightDiscovery()
const status = ref('')
const meta = computed(() => latest.value ? { generated_at: latest.value.generated_at, source: latest.value.source, window_days: latest.value.window_days } : null)

onMounted(() => fetchLatest('real'))

async function refresh() { await fetchLatest('real') }

async function run(demo) {
  status.value = ''
  try {
    const data = await trigger(demo)
    status.value = data?.note || `Started (${demo ? 'demo' : 'real'}). Refreshing as it lands…`
    // the deep-run takes ~1-2 min; poll a few times to pick up the new findings
    ;[30000, 60000, 90000, 120000].forEach((ms) => setTimeout(() => fetchLatest(demo ? 'demo' : 'real'), ms))
  } catch (e) {
    status.value = `Failed: ${e.message}`
  }
}

function relTime(iso) {
  if (!iso) return ''
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 90) return 'just now'
  if (s < 5400) return `${Math.round(s / 60)} min ago`
  if (s < 172800) return `${Math.round(s / 3600)} h ago`
  return `${Math.round(s / 86400)} d ago`
}
</script>

<style scoped>
.insights-view { max-width: 1100px; margin: 0 auto; padding: 1.5rem; color: var(--ink); }
.iv-head h2 { font-size: 1.5rem; font-weight: 700; margin: 0 0 0.25rem; }
.iv-sub { color: var(--muted); font-size: 0.9rem; margin: 0 0 1.25rem; max-width: 70ch; }
.iv-sub code { background: var(--surface-2); border: 1px solid var(--line); padding: 0.05rem 0.35rem; border-radius: 0.25rem; }
.iv-controls { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; margin-bottom: 1rem; }
.iv-btn { padding: 0.5rem 1rem; border-radius: 0.5rem; border: 1px solid transparent; background: #4f46e5; color: #fff; font-weight: 600; cursor: pointer; }
.iv-btn:disabled { opacity: 0.55; cursor: default; }
.iv-btn--ghost { background: transparent; color: #4f46e5; border-color: #4f46e5; }
.iv-status { font-size: 0.85rem; color: var(--muted); }
.iv-status--err { color: var(--danger); }
.iv-relnotes { background: var(--surface); border: 1px solid var(--line); border-radius: 0.6rem; padding: 1rem 1.1rem; margin-bottom: 1.25rem; }
.iv-relnotes-h { font-size: 1.05rem; font-weight: 650; margin: 0 0 0.25rem; }
.iv-relnotes-sub { color: var(--muted); font-size: 0.82rem; margin: 0 0 0.75rem; max-width: 70ch; }
.iv-relnotes-sub code { background: var(--surface-2); border: 1px solid var(--line); padding: 0.05rem 0.35rem; border-radius: 0.25rem; }
.iv-meta { font-size: 0.8rem; color: var(--faint); margin-bottom: 0.75rem; }
.iv-feed { display: flex; flex-direction: column; gap: 0.75rem; }
.iv-empty { color: var(--muted); }
.iv-card { background: var(--surface); border: 1px solid var(--line); border-left-width: 3px; border-radius: 0.6rem; padding: 0.9rem 1rem; }
.iv-card-top { display: flex; align-items: baseline; gap: 0.6rem; }
.iv-card-top h3 { font-size: 1.02rem; font-weight: 650; margin: 0; }
.iv-badge { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.04em; padding: 0.1rem 0.4rem; border-radius: 0.25rem; background: var(--surface-2); border: 1px solid var(--line); color: var(--muted); }
.iv-story { margin: 0.4rem 0 0; color: var(--ink); font-size: 0.92rem; }
.iv-annotate { margin: 0.3rem 0 0; color: var(--muted); font-size: 0.82rem; }
.iv-actions { display: flex; flex-direction: column; gap: 0.2rem; margin-top: 0.5rem; }
.iv-action { font-size: 0.82rem; color: var(--ink); }
.iv-action strong { color: #4f46e5; font-weight: 600; }
.iv-tags { display: inline-block; margin-top: 0.5rem; font-size: 0.72rem; color: var(--faint); }
.tone-alarm { border-left-color: var(--danger); } .tone-alarm .iv-badge { background: #7f1d1d; border-color: #7f1d1d; color: #fecaca; }
.tone-warn  { border-left-color: var(--accent); } .tone-warn .iv-badge  { background: #78350f; border-color: #78350f; color: #fde68a; }
.tone-good  { border-left-color: var(--accent-2); } .tone-good .iv-badge  { background: #064e3b; border-color: #064e3b; color: #a7f3d0; }
.tone-neutral { border-left-color: var(--line); }

/* Tone pills use dark saturated fills with light text; keep that recipe in BOTH themes
   (dark fill + light text reads fine on a white card, ~9:1+, and matches dark-mode hue identity). */
</style>
