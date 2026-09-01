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
          <h1 class="page-title">Popty</h1>
          <p class="page-subtitle">Course production, documentation, the labs, and platform admin — one place.</p>
        </div>
      </div>
      <HowThisWorks section="home" />
    </header>

    <main class="hub-main">
      <NoticingInvitations mount="home" :payload="{ courses }" />

      <section class="hub-section">
        <div class="section-header">
          <span class="section-label">MAIN AREAS</span>
          <div class="section-line"></div>
        </div>

        <div class="hub-grid">
          <!-- Courses -->
          <router-link to="/courses" class="hub-card card-courses">
            <div class="card-glow"></div>
            <div class="card-content">
              <div class="card-header">
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                </div>
                <div class="card-badge courses">
                  <span class="badge-value">{{ courseCount }}</span>
                  <span class="badge-label">courses</span>
                </div>
              </div>
              <div class="card-body">
                <h2 class="card-title">Courses</h2>
                <p class="card-description">The production pipeline — build, translate, record, and ship every language course.</p>
              </div>
              <div class="card-footer">
                <span class="card-action">Open Pipeline</span>
                <svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </router-link>

          <!-- How & Why — the founder's "Rulings + How-to" surface -->
          <router-link to="/how" class="hub-card card-docs">
            <div class="card-glow"></div>
            <div class="card-content">
              <div class="card-header">
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                </div>
                <div class="card-badge docs">
                  <span class="badge-label">rulings + how-to</span>
                </div>
              </div>
              <div class="card-body">
                <h2 class="card-title">How &amp; Why</h2>
                <p class="card-description">How this place works, written for what you do here — and the rulings behind it: pedagogy, pod thinking, schema truth, the APML lineage.</p>
              </div>
              <div class="card-footer">
                <span class="card-action">Open How &amp; Why</span>
                <svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </router-link>

          <!-- Labs — the front door (2026-09-01). Before this, the Script Lab
               was reachable only from inside /courses or /canonical/*, and
               Capture A/B was reachable from nowhere in src/ at all. A lab you
               can only arrive at sideways is one you arrive at not knowing what
               you have walked into. -->
          <router-link to="/admin/labs" class="hub-card card-labs">
            <div class="card-glow"></div>
            <div class="card-content">
              <div class="card-header">
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M9 2v6.5L4.2 17A2 2 0 0 0 6 20h12a2 2 0 0 0 1.8-3L15 8.5V2"/>
                    <line x1="8" y1="2" x2="16" y2="2"/>
                    <line x1="6.8" y1="13" x2="17.2" y2="13"/>
                  </svg>
                </div>
                <div class="card-badge labs">
                  <span class="badge-label">by blast radius</span>
                </div>
              </div>
              <div class="card-body">
                <h2 class="card-title">Labs</h2>
                <p class="card-description">All eight labs in one place — Listening, Speaking, Voice, Pod, Script, VAD, Basket, Capture A/B — each showing who a change there reaches, and when.</p>
              </div>
              <div class="card-footer">
                <span class="card-action">Open Labs</span>
                <svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </router-link>

          <!-- Admin -->
          <router-link to="/admin" class="hub-card card-admin">
            <div class="card-glow"></div>
            <div class="card-content">
              <div class="card-header">
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </div>
                <div class="card-badge admin">
                  <span class="badge-label">platform</span>
                </div>
              </div>
              <div class="card-body">
                <h2 class="card-title">Admin</h2>
                <p class="card-description">Insights, activity, maintenance, user management and board reports.</p>
              </div>
              <div class="card-footer">
                <span class="card-action">Open Admin</span>
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
import { computed } from 'vue'
import { useCourses } from '../composables/useCourses'
import HowThisWorks from '../components/explainer/HowThisWorks.vue'
import NoticingInvitations from '../components/explainer/NoticingInvitations.vue'

const { courses } = useCourses()
const courseCount = computed(() => courses.value?.length || 0)
</script>

<style scoped>
@import './hub.css';

.card-courses { --hub-accent: #10b981; --hub-glow: rgba(16, 185, 129, 0.15); }
.card-docs    { --hub-accent: #3b82f6; --hub-glow: rgba(59, 130, 246, 0.15); }
.card-labs    { --hub-accent: #f59e0b; --hub-glow: rgba(245, 158, 11, 0.15); }
.card-admin   { --hub-accent: #a855f7; --hub-glow: rgba(168, 85, 247, 0.15); }

.hub-header :deep(.htw) { margin-top: 0.75rem; }
.hub-main :deep(.noticing) { margin-bottom: 1.5rem; }
</style>
