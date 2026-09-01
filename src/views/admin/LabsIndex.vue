<template>
  <div class="hub">
    <!-- Ambient Background -->
    <div class="ambient-bg">
      <div class="grid-overlay"></div>
      <div class="glow-orb glow-orb-1"></div>
      <div class="glow-orb glow-orb-2"></div>
    </div>

    <header class="hub-header">
      <nav class="admin-crumbs">
        <router-link to="/" class="crumb-link">Home</router-link>
        <span class="crumb-sep">/</span>
        <router-link to="/admin" class="crumb-link">Admin</router-link>
        <span class="crumb-sep">/</span>
        <span class="crumb-here">Labs</span>
      </nav>
      <div class="header-titles">
        <div>
          <h1 class="page-title">Labs</h1>
          <p class="page-subtitle">
            Every lab in one place, grouped by <strong>blast radius</strong> — who a change here
            reaches, and when it reaches them.
          </p>
        </div>
      </div>
    </header>

    <main class="hub-main">
      <section v-for="group in groups" :key="group.tier.id" class="hub-section">
        <div class="section-header">
          <span class="section-label" :style="{ color: group.tier.accent }">{{ group.tier.label }}</span>
          <div class="section-line"></div>
        </div>
        <p class="section-detail">{{ group.tier.detail }}</p>

        <div class="hub-grid">
          <router-link
            v-for="lab in group.labs"
            :key="lab.key"
            :to="lab.to"
            class="hub-card"
            :style="{ '--hub-accent': group.tier.accent, '--hub-glow': group.tier.glow }"
          >
            <div class="card-glow"></div>
            <div class="card-content">
              <div class="card-header">
                <div class="card-icon" v-html="lab.icon"></div>
                <div class="card-badge">
                  <span class="badge-label">{{ group.tier.short }}</span>
                </div>
              </div>
              <div class="card-body">
                <h2 class="card-title">{{ lab.title }}</h2>
                <p class="card-description">{{ lab.description }}</p>
                <p class="card-writes"><span class="writes-key">writes</span> {{ lab.writes }}</p>
              </div>
              <div class="card-footer">
                <span class="card-action">Open {{ lab.title }}</span>
                <svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </router-link>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
/**
 * LABS INDEX — /admin/labs. The front door to the script lab, and to the other
 * seven.
 *
 * WHY THE PAGE EXISTS (Tom, 2026-09-01): "there is no front door to the script
 * lab. This page isn't findable from admin/configs. I wonder if
 * admin/configs/labs is a bit much — maybe we should just have it as
 * admin/labs? we have 7 labs now."
 *
 * The evidence that the complaint is real is in the data: canonical_script_versions
 * held exactly six rows, all on the sacked slate pod-0.5, all saved between
 * 10:54:25 and 10:55:28 on 2026-08-31 — four rewrites of one line and then a
 * revert. He reached the lab through the one door that existed, edited the
 * first script it offered, discovered it was a sacked slate, and put it back
 * inside 63 seconds. A lab you can only reach sideways is a lab you arrive at
 * without knowing what you have walked into.
 *
 * WHY A LAB IS NOT A CONFIG. These lived under /admin/configs, which made a
 * category claim that was wrong in both directions: Basket Lab sat under a
 * heading promising everything beneath it "applies across every course and every
 * learner" while being mounted readOnly and unable to write a single byte, and
 * Capture A/B — which stores nothing at all — had no link anywhere in src/ and
 * so sat under no heading whatsoever. Configs was never the axis. Blast radius
 * is, and the labels live in components/admin/blastRadius.js so the tile here
 * and the banner on the page cannot drift apart.
 *
 * TWO LABS ARE HERE THAT WERE NOT ON THE OLD CONFIGS PAGE: the Script Lab,
 * previously reachable only from inside /courses or /canonical/*, and Capture
 * A/B, previously reachable from nowhere.
 *
 * PLACEMENTS THAT MAY SURPRISE: Pod Lab and Script Lab are DEFERRED, not
 * read-only. Pod Lab's own header says it never writes algorithm_config, which
 * is true and is not the whole story — it also posts /api/pod-cast-voices and
 * can fill missing clips through /api/admin/pods/:course/generate-audio, which
 * is real spend and real audio. Script Lab edits the language-neutral English
 * masters every course flexes from; nothing regenerates on save, so the change
 * is OWED to every course rather than applied to it, which is the most deferred
 * write in the estate. Each card carries the write it was classified on, so the
 * claim is checkable rather than merely asserted.
 */
import { BLAST_ORDER, BLAST_RADIUS, LAB_BLAST_RADIUS } from '@/components/admin/blastRadius'

const LABS = [
  {
    key: 'listening',
    title: 'Listening Lab',
    to: '/admin/labs/listening',
    description: 'Layer 1 seed listening, Layer 2 pods, the Stage-0 breakdown ladder, and the full 0→9 arc preview.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>',
  },
  {
    key: 'speaking',
    title: 'Speaking Lab',
    to: '/admin/labs/speaking',
    description: 'The speaking practice script + playback timing — phrase counts, the Fibonacci spaced-rep schedule, and the Easy / Fast modes.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
  },
  {
    key: 'voice',
    title: 'Voice Lab',
    to: '/admin/labs/voice',
    description: 'Parameters, tests and a record of every run — provider, voice and the six gate thresholds; single, blind A/B and batch runs on real course sentences with the cost shown first.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 1a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="22"/><circle cx="19" cy="4" r="2"/><circle cx="5" cy="4" r="2"/></svg>',
  },
  {
    key: 'pods',
    title: 'Pod Lab',
    to: '/admin/labs/pods',
    description: 'Audition one pod line\'s whole acquisition arc — the Stage-0 breakdown then every whole-sentence stage — assembled by the real @ssi/core engine. Tune the ladder, hear it, cast it.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="13" y2="13"/></svg>',
  },
  {
    key: 'scripts',
    title: 'Script Lab',
    to: '/canonical/scripts',
    description: 'The canonical pod scripts, whole and editable, with no course loaded — each one a walk over the shape metagraph, read out as coverage. These are the language-neutral English masters, not any course\'s known text.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  },
  {
    key: 'vad',
    title: 'VAD Lab',
    to: '/admin/labs/vad',
    description: 'The prosody invariance study made audible — a curated listening tour, every pair browsable with energy-contour overlays, and the honest read on what the metric can and cannot do.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 12h3l2-7 4 14 3-10 2 3h6"/></svg>',
  },
  {
    key: 'basket',
    title: 'Basket Lab',
    to: '/admin/labs/basket',
    description: 'One LEGO\'s phrases, live in the course today beside a newly generated candidate set, both scored against the same machine floors, with a box for a verbatim verdict.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 11h14l-1.5 9h-11z"/><path d="M9 11 12 3l3 8"/><line x1="3" y1="11" x2="21" y2="11"/></svg>',
  },
  {
    key: 'capture-ab',
    title: 'Capture A/B',
    to: '/admin/labs/capture-ab',
    description: 'The same read, twice, on the phone that does the recording — each mic profile measured for peak, RMS, room floor and the margin between voice and room.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M5 10v1a7 7 0 0 0 14 0v-1"/><line x1="12" y1="18" x2="12" y2="22"/><path d="M3 4l18 16"/></svg>',
  },
]

// Grouped by tier, tiers in descending reach. An empty tier renders nothing
// rather than an empty heading — the page is a list of labs, not of tiers.
const groups = BLAST_ORDER
  .map(id => ({
    tier: BLAST_RADIUS[id],
    labs: LABS
      .filter(l => (LAB_BLAST_RADIUS[l.key]?.tier || 'none') === id)
      .map(l => ({ ...l, writes: LAB_BLAST_RADIUS[l.key]?.writes || 'nothing' })),
  }))
  .filter(g => g.labs.length)
</script>

<style scoped>
@import '../hub.css';

.admin-crumbs { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; margin-bottom: 0.75rem; }
.admin-crumbs .crumb-link { color: var(--accent-2); text-decoration: none; }
.admin-crumbs .crumb-link:hover { color: #6ee7b7; }
.admin-crumbs .crumb-sep { color: var(--surface-3); }
.admin-crumbs .crumb-here { color: var(--muted); }
[data-theme="light"] .admin-crumbs .crumb-link:hover { color: var(--accent-2); }

.section-detail {
  margin: -0.25rem 0 1rem;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: var(--muted);
  max-width: 62ch;
}

/* The write each classification rests on, so a placement is checkable on the
   page rather than only in the source. */
.card-writes {
  margin-top: 0.55rem;
  font-size: 0.6875rem;
  line-height: 1.45;
  color: var(--faint);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.card-writes .writes-key {
  color: var(--hub-accent);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-right: 0.35rem;
}
</style>
