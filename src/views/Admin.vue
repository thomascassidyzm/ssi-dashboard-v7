<template>
  <div class="hub">
    <!-- Ambient Background -->
    <div class="ambient-bg">
      <div class="grid-overlay"></div>
      <div class="glow-orb glow-orb-1"></div>
      <div class="glow-orb glow-orb-2"></div>
    </div>

    <header class="hub-header">
      <div class="header-titles">
        <div>
          <h1 class="page-title">Admin</h1>
          <p class="page-subtitle">Platform-wide tooling. What each surface reaches varies — the Labs index says so per lab.</p>
        </div>
      </div>
    </header>

    <main class="hub-main">
      <section class="hub-section">
        <div class="section-header">
          <span class="section-label">PLATFORM</span>
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
// Admin hub. Cards are platform-wide surfaces — the Labs index first, then the
// operational boards. Writes everywhere are RLS-gated to admins; non-admins can
// browse but saves fail (same convention as ListeningAdmin).
const cards = [
  {
    // Was "Configs" until 2026-09-01. The card promised "global … every course,
    // every learner", which was true of two of the surfaces underneath it and
    // false of the other four — Basket Lab is mounted readOnly and writes
    // nothing at all. Labs, grouped by blast radius, is the honest heading.
    title: 'Labs',
    to: '/admin/labs',
    badge: 'eight',
    description: 'Every lab in one place — Listening, Speaking, Voice, Pod, Script, VAD, Basket and Capture A/B — grouped by blast radius: who a change reaches, and when.',
    action: 'Open Labs',
    accent: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.15)',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>',
  },
  {
    title: 'Insights',
    to: '/insights',
    badge: 'analytics',
    description: 'Cross-course insight boards — lifecycle, rate, coverage, content, and ops signals.',
    action: 'View Insights',
    accent: '#10b981',
    glow: 'rgba(16, 185, 129, 0.15)',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>',
  },
  {
    title: 'Activity',
    to: '/jobs',
    badge: 'live',
    description: 'Running and recent jobs across the production pipeline — what is building right now.',
    action: 'View Activity',
    accent: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.15)',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  },
  {
    title: 'Maintenance',
    to: '/maintenance',
    badge: 'ops',
    description: 'Housekeeping and health — audit log, archive, and platform upkeep.',
    action: 'Open Maintenance',
    accent: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.15)',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  },
  {
    title: 'Users',
    to: '/users',
    badge: 'access',
    description: 'Manage dashboard accounts, recorders, roles, and invite codes.',
    action: 'Manage Users',
    accent: '#14b8a6',
    glow: 'rgba(20, 184, 166, 0.15)',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  },
  {
    title: 'Board Reports',
    to: '/admin/board',
    badge: 'monthly',
    description: 'Monthly SSi board reports for internal reference.',
    action: 'View Reports',
    accent: '#c23a3a',
    glow: 'rgba(194, 58, 58, 0.15)',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>',
  },
  {
    // Human Recording (2026-09-02). The page was reachable by URL only; it is
    // where each recordist's /r/ link comes from, so it belongs with its
    // siblings rather than in a bookmark.
    title: 'Human Recording',
    to: '/admin/recording',
    badge: 'voices',
    description: 'Which languages we record with people instead of TTS, how far each has got, and the link to send each recordist.',
    action: 'Open Recording',
    accent: '#ec4899',
    glow: 'rgba(236, 72, 153, 0.15)',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
  },
  {
    // Test builds (2026-09-04). It lived in the avatar dropdown, which is the
    // personal account menu — things belong here by what they do, and handing
    // someone the Android test build is an admin job.
    title: 'Test builds',
    to: '/builds',
    badge: 'android',
    description: 'The current Android test build, how to install it, and where it came from.',
    action: 'Open Test builds',
    accent: '#6366f1',
    glow: 'rgba(99, 102, 241, 0.15)',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  },
]
</script>

<style scoped>
@import './hub.css';
</style>
