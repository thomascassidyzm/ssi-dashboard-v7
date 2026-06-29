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
          <p class="page-subtitle">Platform-wide tooling — applies across every course and learner.</p>
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
// Admin hub. Cards are platform-wide surfaces — global configs first,
// then the operational boards. Writes everywhere are RLS-gated to admins;
// non-admins can browse but saves fail (same convention as ListeningAdmin).
const cards = [
  {
    title: 'Configs',
    to: '/admin/configs',
    badge: 'global',
    description: 'Global algorithm config — Listening and Speaking surfaces, applied to every course, every learner.',
    action: 'Open Configs',
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
]
</script>

<style scoped>
@import './hub.css';
</style>
