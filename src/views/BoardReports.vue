<template>
  <div class="hub">
    <div class="ambient-bg">
      <div class="grid-overlay"></div>
      <div class="glow-orb glow-orb-1"></div>
      <div class="glow-orb glow-orb-2"></div>
    </div>

    <header class="hub-header">
      <div class="header-titles">
        <div>
          <router-link to="/admin" class="back-link">&larr; Admin</router-link>
          <h1 class="page-title">Board reports</h1>
          <p class="page-subtitle">Monthly SSi board reports, published here behind admin login.</p>
        </div>
      </div>
    </header>

    <main class="hub-main">
      <section class="hub-section">
        <div class="section-header">
          <span class="section-label">REPORTS</span>
          <div class="section-line"></div>
        </div>

        <div class="hub-grid">
          <router-link
            v-for="report in boardReports"
            :key="report.slug"
            :to="`/admin/board/${report.slug}`"
            class="hub-card"
            style="--hub-accent: #c23a3a; --hub-glow: rgba(194, 58, 58, 0.15)"
          >
            <div class="card-glow"></div>
            <div class="card-content">
              <div class="card-body">
                <h2 class="card-title">{{ report.title }}</h2>
                <p class="card-description">{{ report.period }}</p>
              </div>
              <div class="card-footer">
                <span class="card-action">Read report</span>
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
import { boardReports } from '../content/board-reports'
</script>

<style scoped>
@import './hub.css';

.back-link {
  display: inline-block;
  color: var(--accent-2);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.75rem;
}

.back-link:hover {
  text-decoration: underline;
}
</style>
