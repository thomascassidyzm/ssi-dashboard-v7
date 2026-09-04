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
// Admin hub. The cards ARE the admin section's sub-tabs, read from the one nav
// declaration (src/nav/navigation.js) — the row and the cards cannot list
// different pages, because they are one list read twice. Writes everywhere are
// RLS-gated to admins; non-admins can browse but saves fail.
import { hubCards } from '../nav/navigation'

const cards = hubCards('admin')
</script>

<style scoped>
@import './hub.css';
</style>
