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
        <span class="crumb-here">Configs</span>
      </nav>
      <div class="header-titles">
        <div>
          <h1 class="page-title">Configs</h1>
          <p class="page-subtitle">Global algorithm config — applies across every course and every learner.</p>
        </div>
      </div>
    </header>

    <main class="hub-main">
      <section class="hub-section">
        <div class="section-header">
          <span class="section-label">GLOBAL CONFIGS</span>
          <div class="section-line"></div>
        </div>

        <div class="hub-grid">
          <router-link
            v-for="card in cards"
            :key="card.title"
            :to="card.to"
            class="hub-card"
            :style="{ '--hub-accent': card.accent, '--hub-glow': card.glow }"
          >
            <div class="card-glow"></div>
            <div class="card-content">
              <div class="card-header">
                <div class="card-icon" v-html="card.icon"></div>
                <div class="card-badge">
                  <span class="badge-label">{{ card.badge }}</span>
                </div>
              </div>
              <div class="card-body">
                <h2 class="card-title">{{ card.title }}</h2>
                <p class="card-description">{{ card.description }}</p>
              </div>
              <div class="card-footer">
                <span class="card-action">{{ card.action }}</span>
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
// Configs index — the landing for global algorithm config, split by domain so
// each surface only shows what it owns. More global configs land here as
// siblings rather than piling onto one page.
//
// LISTENING and SPEAKING are labelled LABS (2026-08-06). Both already are one:
// Speaking titles its own section "Pause lab" at SpeakingConfig.vue:121, plots
// real sample sentences against the synthetic curve, and plays a real sentence
// with the computed gap so you HEAR the parameter. Listening previews the full
// 0-9 arc on real pod sentences. Only the label was wrong. The routes and the
// component filenames are deliberately unchanged, so no link and no import
// breaks on a rename that is presentational.
const cards = [
  {
    title: 'Listening Lab',
    to: '/admin/configs/listening',
    badge: 'listening',
    description: 'Layer 1 seed listening, Layer 2 pods, the Stage-0 breakdown ladder, and the full 0→9 arc preview.',
    action: 'Open Listening Lab',
    accent: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.15)',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>',
  },
  {
    title: 'Speaking Lab',
    to: '/admin/configs/speaking',
    badge: 'speaking',
    description: 'The speaking practice script + playback timing — phrase counts, the Fibonacci spaced-rep schedule, and the Easy / Fast modes.',
    action: 'Open Speaking Lab',
    accent: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.15)',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
  },
  {
    title: 'Pod Lab',
    to: '/admin/configs/pods',
    badge: 'pods',
    description: 'Audition one pod line\'s whole acquisition arc — the Stage-0 breakdown then every whole-sentence stage — assembled by the real @ssi/core engine. Tune the ladder, hear it, export the config.',
    action: 'Open Pod Lab',
    accent: '#10b981',
    glow: 'rgba(16, 185, 129, 0.15)',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="13" y2="13"/></svg>',
  },
  {
    title: 'Voice Lab',
    to: '/admin/configs/voice',
    badge: 'voice',
    description: 'Parameters, tests and a record of every run — provider, voice and the six gate thresholds; single, blind A/B and batch runs on real course sentences with the cost shown first; every experiment saved, comparable and exportable.',
    action: 'Open Voice Lab',
    accent: '#ec4899',
    glow: 'rgba(236, 72, 153, 0.15)',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 1a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="22"/><circle cx="19" cy="4" r="2"/><circle cx="5" cy="4" r="2"/></svg>',
  },
  {
    title: 'VAD Lab',
    to: '/admin/configs/vad',
    badge: 'prosody',
    description: 'The prosody invariance study made audible — a curated listening tour, every pair browsable with energy-contour overlays, and the honest read on what the metric can and cannot do.',
    action: 'Open VAD Lab',
    accent: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.15)',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 12h3l2-7 4 14 3-10 2 3h6"/></svg>',
  },
  {
    title: 'Basket Lab',
    to: '/admin/configs/basket',
    badge: 'baskets',
    description: 'The unit being judged is the BASKET: one LEGO\u2019s phrases, live in the course today beside a newly generated candidate set, both scored against the same machine floors, with a box for a verbatim verdict.',
    action: 'Open Basket Lab',
    accent: '#a78bfa',
    glow: 'rgba(167, 139, 250, 0.15)',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9h18l-1.6 9.2a2 2 0 0 1-2 1.8H6.6a2 2 0 0 1-2-1.8L3 9Z"/><path d="M8 9 10.5 3M16 9 13.5 3"/><path d="M9.5 13v3M14.5 13v3"/></svg>',
  },
]
</script>

<style scoped>
@import '../hub.css';

.admin-crumbs { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; margin-bottom: 0.75rem; }
.admin-crumbs .crumb-link { color: var(--accent-2); text-decoration: none; }
.admin-crumbs .crumb-link:hover { color: #6ee7b7; }
.admin-crumbs .crumb-sep { color: var(--surface-3); }
.admin-crumbs .crumb-here { color: var(--muted); }
[data-theme="light"] .admin-crumbs .crumb-link:hover { color: var(--accent-2); }
</style>
