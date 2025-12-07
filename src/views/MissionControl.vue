<template>
  <div class="mission-control">
    <!-- Ambient Background -->
    <div class="ambient-bg">
      <div class="grid-overlay"></div>
      <div class="glow-orb glow-orb-1"></div>
      <div class="glow-orb glow-orb-2"></div>
      <div class="glow-orb glow-orb-3"></div>
    </div>

    <!-- Header -->
    <header class="mc-header">
      <div class="header-inner">
        <div class="header-left">
          <div class="logo-mark">
            <svg viewBox="0 0 40 40" class="logo-icon">
              <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
              <circle cx="20" cy="20" r="12" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
              <circle cx="20" cy="20" r="6" fill="currentColor" opacity="0.8"/>
              <circle cx="20" cy="20" r="3" fill="currentColor"/>
            </svg>
          </div>
          <div class="header-titles">
            <h1 class="page-title">Mission Control</h1>
            <p class="page-subtitle">SSi Course Production System</p>
          </div>
        </div>
        <div class="header-right">
          <div class="system-status">
            <span class="status-dot"></span>
            <span class="status-text">Systems Online</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="mc-main">
      <!-- Primary Actions Grid -->
      <section class="actions-section">
        <div class="section-header">
          <span class="section-label">PRIMARY OPERATIONS</span>
          <div class="section-line"></div>
        </div>

        <div class="actions-grid">
          <!-- Course Library Card -->
          <router-link to="/courses" class="action-card card-library">
            <div class="card-glow"></div>
            <div class="card-content">
              <div class="card-header">
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    <path d="M8 7h8M8 11h6"/>
                  </svg>
                </div>
                <div class="card-badge" v-if="!loadingCourses">
                  <span class="badge-value">{{ courseCount }}</span>
                  <span class="badge-label">courses</span>
                </div>
                <div class="card-badge loading" v-else>
                  <span class="badge-skeleton"></span>
                </div>
              </div>
              <div class="card-body">
                <h2 class="card-title">Course Library</h2>
                <p class="card-description">Browse, edit, and manage existing courses at any production stage</p>
              </div>
              <div class="card-footer">
                <span class="card-action">Open Library</span>
                <svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </router-link>

          <!-- New Course Card -->
          <router-link to="/courses/new" class="action-card card-create">
            <div class="card-glow"></div>
            <div class="card-content">
              <div class="card-header">
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v8M8 12h8"/>
                  </svg>
                </div>
                <div class="card-badge new">
                  <span class="badge-pulse"></span>
                  <span class="badge-label">wizard</span>
                </div>
              </div>
              <div class="card-body">
                <h2 class="card-title">New Course</h2>
                <p class="card-description">Initialize a new language course with guided configuration</p>
              </div>
              <div class="card-footer">
                <span class="card-action">Start Wizard</span>
                <svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </router-link>

          <!-- Production Suite Card -->
          <router-link to="/production/courses" class="action-card card-production">
            <div class="card-glow"></div>
            <div class="card-content">
              <div class="card-header">
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/>
                  </svg>
                </div>
                <div class="card-badge production">
                  <span class="badge-label">audio & QA</span>
                </div>
              </div>
              <div class="card-body">
                <h2 class="card-title">Production Suite</h2>
                <p class="card-description">Audio generation, quality review, and manifest compilation</p>
              </div>
              <div class="card-footer">
                <span class="card-action">Open Suite</span>
                <svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </router-link>

          <!-- Documentation Card -->
          <router-link to="/docs" class="action-card card-docs">
            <div class="card-glow"></div>
            <div class="card-content">
              <div class="card-header">
                <div class="card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <path d="M9 13h6M9 17h4"/>
                  </svg>
                </div>
                <div class="card-badge docs">
                  <span class="badge-label">reference</span>
                </div>
              </div>
              <div class="card-body">
                <h2 class="card-title">Documentation</h2>
                <p class="card-description">APML specification, methodology guides, and system architecture</p>
              </div>
              <div class="card-footer">
                <span class="card-action">Browse Docs</span>
                <svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </router-link>
        </div>
      </section>

      <!-- Activity Feed -->
      <section class="activity-section">
        <div class="section-header">
          <span class="section-label">RECENT ACTIVITY</span>
          <div class="section-line"></div>
        </div>

        <div class="activity-panel">
          <!-- Loading State -->
          <div v-if="loadingActivity" class="activity-loading">
            <div v-for="i in 3" :key="i" class="activity-skeleton">
              <div class="skeleton-icon"></div>
              <div class="skeleton-content">
                <div class="skeleton-line long"></div>
                <div class="skeleton-line short"></div>
              </div>
            </div>
          </div>

          <!-- Activity List -->
          <div v-else-if="recentActivity.length > 0" class="activity-list">
            <div
              v-for="(activity, index) in recentActivity"
              :key="activity.id"
              class="activity-item"
              :style="{ '--delay': index * 0.1 + 's' }"
            >
              <div class="activity-indicator" :class="activity.type"></div>
              <div class="activity-content">
                <p class="activity-text">{{ activity.description }}</p>
                <div class="activity-meta">
                  <span class="activity-time">{{ formatTime(activity.timestamp) }}</span>
                  <span v-if="activity.courseCode" class="activity-course">{{ activity.courseCode }}</span>
                </div>
              </div>
              <div class="activity-icon" :class="activity.type">
                {{ getActivityIcon(activity.type) }}
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="activity-empty">
            <div class="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
            </div>
            <p class="empty-title">No recent activity</p>
            <p class="empty-text">Course updates and generation progress will appear here</p>
          </div>
        </div>
      </section>

      <!-- Quick Stats Bar -->
      <section class="stats-section">
        <div class="stats-bar">
          <div class="stat-item">
            <span class="stat-value">{{ courseCount }}</span>
            <span class="stat-label">Total Courses</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">668</span>
            <span class="stat-label">Seeds per Course</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">v2.1</span>
            <span class="stat-label">APML Version</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value status-online">●</span>
            <span class="stat-label">Pipeline Ready</span>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../services/api'

// Course count
const courseCount = ref(0)
const loadingCourses = ref(true)

// Recent activity
const recentActivity = ref([])
const loadingActivity = ref(true)

// Load course count
async function loadCourseCount() {
  loadingCourses.value = true
  try {
    const response = await api.course.list()
    courseCount.value = response.courses?.length || 0
  } catch (err) {
    console.error('Failed to load course count:', err)
    courseCount.value = 0
  } finally {
    loadingCourses.value = false
  }
}

// Load recent activity
async function loadRecentActivity() {
  loadingActivity.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 500))
    recentActivity.value = [
      {
        id: 1,
        type: 'update',
        description: 'Updated lego_pairs.json with conflict resolution',
        courseCode: 'spa_for_eng',
        timestamp: new Date(Date.now() - 1000 * 60 * 30)
      },
      {
        id: 2,
        type: 'complete',
        description: 'Phase 3 basket generation completed successfully',
        courseCode: 'fra_for_eng',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2)
      },
      {
        id: 3,
        type: 'create',
        description: 'New course initialized with 668 seeds',
        courseCode: 'cmn_for_eng',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24)
      },
      {
        id: 4,
        type: 'audio',
        description: 'Audio generation batch completed (245 samples)',
        courseCode: 'ita_for_eng',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48)
      }
    ]
  } catch (err) {
    console.error('Failed to load recent activity:', err)
    recentActivity.value = []
  } finally {
    loadingActivity.value = false
  }
}

function getActivityIcon(type) {
  const icons = { update: '↻', complete: '✓', create: '+', audio: '♪', manifest: '◈' }
  return icons[type] || '•'
}

function formatTime(timestamp) {
  const now = new Date()
  const diff = now - new Date(timestamp)
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

onMounted(() => {
  loadCourseCount()
  loadRecentActivity()
})
</script>

<style scoped>
/* ============================================
   MISSION CONTROL - Premium Control Room Design
   ============================================ */

/* CSS Custom Properties - Harmonized with slate palette */
.mission-control {
  --mc-void: #0f172a;        /* slate-900 - matches existing pages */
  --mc-deep: #1e293b;        /* slate-800 */
  --mc-surface: #1e293b;     /* slate-800 */
  --mc-elevated: #334155;    /* slate-700 */
  --mc-border: #334155;      /* slate-700 */
  --mc-border-light: #475569; /* slate-600 */
  --mc-text: #f1f5f9;        /* slate-100 */
  --mc-text-dim: #94a3b8;    /* slate-400 */
  --mc-text-muted: #64748b;  /* slate-500 */
  --mc-accent: #10b981;
  --mc-accent-dim: #059669;
  --mc-accent-glow: rgba(16, 185, 129, 0.15);
  --mc-create: #3b82f6;
  --mc-create-glow: rgba(59, 130, 246, 0.15);
  --mc-production: #f59e0b;
  --mc-production-glow: rgba(245, 158, 11, 0.15);
  --mc-docs: #a855f7;
  --mc-docs-glow: rgba(168, 85, 247, 0.15);

  min-height: 100vh;
  background: var(--mc-void);
  color: var(--mc-text);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  overflow-x: hidden;
}

/* Ambient Background Effects */
.ambient-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--mc-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--mc-border) 1px, transparent 1px);
  background-size: 60px 60px;
  opacity: 0.03;
}

.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.4;
  animation: float 20s ease-in-out infinite;
}

.glow-orb-1 {
  width: 600px;
  height: 600px;
  background: var(--mc-accent);
  top: -200px;
  right: -100px;
  opacity: 0.08;
  animation-delay: 0s;
}

.glow-orb-2 {
  width: 400px;
  height: 400px;
  background: var(--mc-create);
  bottom: -100px;
  left: -100px;
  opacity: 0.06;
  animation-delay: -7s;
}

.glow-orb-3 {
  width: 300px;
  height: 300px;
  background: var(--mc-docs);
  top: 50%;
  left: 50%;
  opacity: 0.04;
  animation-delay: -14s;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -30px) scale(1.05); }
  66% { transform: translate(-20px, 20px) scale(0.95); }
}

/* Header */
.mc-header {
  position: relative;
  z-index: 10;
  border-bottom: 1px solid var(--mc-border);
  background: linear-gradient(180deg, var(--mc-deep) 0%, transparent 100%);
}

.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem 2.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.logo-mark {
  width: 48px;
  height: 48px;
  color: var(--mc-accent);
}

.logo-icon {
  width: 100%;
  height: 100%;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--mc-text);
  margin: 0;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 0.875rem;
  color: var(--mc-text-dim);
  margin: 0;
  letter-spacing: 0.02em;
}

.system-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: 100px;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: var(--mc-accent);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 var(--mc-accent-glow); }
  50% { opacity: 0.7; box-shadow: 0 0 0 8px transparent; }
}

.status-text {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--mc-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Main Content */
.mc-main {
  position: relative;
  z-index: 10;
  max-width: 1400px;
  margin: 0 auto;
  padding: 3rem 2.5rem 4rem;
}

/* Section Headers */
.section-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.section-label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  color: var(--mc-text-muted);
  white-space: nowrap;
}

.section-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--mc-border) 0%, transparent 100%);
}

/* Actions Grid */
.actions-section {
  margin-bottom: 3rem;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
}

@media (max-width: 1280px) {
  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .actions-grid {
    grid-template-columns: 1fr;
  }
}

/* Action Cards */
.action-card {
  position: relative;
  display: block;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: 16px;
  padding: 1.75rem;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.action-card:hover {
  transform: translateY(-4px);
  border-color: var(--mc-border-light);
}

.card-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 100px;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.card-library .card-glow {
  background: linear-gradient(180deg, var(--mc-accent-glow) 0%, transparent 100%);
}

.card-create .card-glow {
  background: linear-gradient(180deg, var(--mc-create-glow) 0%, transparent 100%);
}

.card-production .card-glow {
  background: linear-gradient(180deg, var(--mc-production-glow) 0%, transparent 100%);
}

.card-docs .card-glow {
  background: linear-gradient(180deg, var(--mc-docs-glow) 0%, transparent 100%);
}

.action-card:hover .card-glow {
  opacity: 1;
}

.card-library:hover {
  border-color: var(--mc-accent);
  box-shadow: 0 20px 40px -20px var(--mc-accent-glow);
}

.card-create:hover {
  border-color: var(--mc-create);
  box-shadow: 0 20px 40px -20px var(--mc-create-glow);
}

.card-production:hover {
  border-color: var(--mc-production);
  box-shadow: 0 20px 40px -20px var(--mc-production-glow);
}

.card-docs:hover {
  border-color: var(--mc-docs);
  box-shadow: 0 20px 40px -20px var(--mc-docs-glow);
}

.card-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 200px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.card-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--mc-elevated);
  border: 1px solid var(--mc-border);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.card-icon svg {
  width: 24px;
  height: 24px;
}

.card-library .card-icon {
  color: var(--mc-accent);
}

.card-create .card-icon {
  color: var(--mc-create);
}

.card-production .card-icon {
  color: var(--mc-production);
}

.card-docs .card-icon {
  color: var(--mc-docs);
}

.card-library:hover .card-icon {
  background: var(--mc-accent);
  border-color: var(--mc-accent);
  color: white;
}

.card-create:hover .card-icon {
  background: var(--mc-create);
  border-color: var(--mc-create);
  color: white;
}

.card-production:hover .card-icon {
  background: var(--mc-production);
  border-color: var(--mc-production);
  color: white;
}

.card-docs:hover .card-icon {
  background: var(--mc-docs);
  border-color: var(--mc-docs);
  color: white;
}

.card-badge {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: var(--mc-elevated);
  border: 1px solid var(--mc-border);
  border-radius: 100px;
  font-size: 0.75rem;
}

.badge-value {
  font-weight: 700;
  color: var(--mc-accent);
  font-variant-numeric: tabular-nums;
}

.badge-label {
  color: var(--mc-text-muted);
  font-weight: 500;
}

.card-badge.new {
  background: var(--mc-create-glow);
  border-color: var(--mc-create);
}

.card-badge.new .badge-label {
  color: var(--mc-create);
}

.badge-pulse {
  width: 6px;
  height: 6px;
  background: var(--mc-create);
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

.card-badge.docs {
  background: var(--mc-docs-glow);
  border-color: var(--mc-docs);
}

.card-badge.docs .badge-label {
  color: var(--mc-docs);
}

.card-badge.production {
  background: var(--mc-production-glow);
  border-color: var(--mc-production);
}

.card-badge.production .badge-label {
  color: var(--mc-production);
}

.card-badge.loading {
  min-width: 60px;
}

.badge-skeleton {
  width: 40px;
  height: 14px;
  background: var(--mc-border);
  border-radius: 4px;
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.card-body {
  flex: 1;
}

.card-title {
  font-size: 1.375rem;
  font-weight: 700;
  color: var(--mc-text);
  margin: 0 0 0.75rem 0;
  letter-spacing: -0.01em;
}

.card-description {
  font-size: 0.875rem;
  color: var(--mc-text-dim);
  line-height: 1.6;
  margin: 0;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--mc-border);
}

.card-action {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--mc-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: color 0.2s ease;
}

.card-library:hover .card-action { color: var(--mc-accent); }
.card-create:hover .card-action { color: var(--mc-create); }
.card-production:hover .card-action { color: var(--mc-production); }
.card-docs:hover .card-action { color: var(--mc-docs); }

.card-arrow {
  width: 20px;
  height: 20px;
  color: var(--mc-text-muted);
  transition: all 0.2s ease;
}

.action-card:hover .card-arrow {
  transform: translateX(4px);
}

.card-library:hover .card-arrow { color: var(--mc-accent); }
.card-create:hover .card-arrow { color: var(--mc-create); }
.card-production:hover .card-arrow { color: var(--mc-production); }
.card-docs:hover .card-arrow { color: var(--mc-docs); }

/* Activity Section */
.activity-section {
  margin-bottom: 2.5rem;
}

.activity-panel {
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: 16px;
  padding: 1.5rem;
}

.activity-loading {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.activity-skeleton {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--mc-elevated);
  border-radius: 10px;
}

.skeleton-icon {
  width: 36px;
  height: 36px;
  background: var(--mc-border);
  border-radius: 8px;
  animation: shimmer 1.5s ease-in-out infinite;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skeleton-line {
  height: 12px;
  background: var(--mc-border);
  border-radius: 4px;
  animation: shimmer 1.5s ease-in-out infinite;
}

.skeleton-line.long { width: 70%; }
.skeleton-line.short { width: 40%; }

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: var(--mc-elevated);
  border: 1px solid transparent;
  border-radius: 10px;
  transition: all 0.2s ease;
  animation: slideIn 0.3s ease forwards;
  animation-delay: var(--delay);
  opacity: 0;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.activity-item:hover {
  border-color: var(--mc-border);
  background: var(--mc-surface);
}

.activity-indicator {
  width: 4px;
  height: 32px;
  border-radius: 2px;
  flex-shrink: 0;
}

.activity-indicator.update { background: var(--mc-accent); }
.activity-indicator.complete { background: #22c55e; }
.activity-indicator.create { background: var(--mc-create); }
.activity-indicator.audio { background: #f59e0b; }
.activity-indicator.manifest { background: var(--mc-docs); }

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-text {
  font-size: 0.875rem;
  color: var(--mc-text);
  margin: 0 0 0.25rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.activity-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.75rem;
}

.activity-time {
  color: var(--mc-text-muted);
}

.activity-course {
  color: var(--mc-text-dim);
  font-family: 'SF Mono', 'Fira Code', monospace;
  background: var(--mc-surface);
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
}

.activity-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 8px;
  flex-shrink: 0;
}

.activity-icon.update { background: var(--mc-accent-glow); color: var(--mc-accent); }
.activity-icon.complete { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.activity-icon.create { background: var(--mc-create-glow); color: var(--mc-create); }
.activity-icon.audio { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.activity-icon.manifest { background: var(--mc-docs-glow); color: var(--mc-docs); }

.activity-empty {
  text-align: center;
  padding: 3rem 2rem;
}

.empty-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 1rem;
  color: var(--mc-text-muted);
}

.empty-icon svg {
  width: 100%;
  height: 100%;
}

.empty-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--mc-text-dim);
  margin: 0 0 0.5rem 0;
}

.empty-text {
  font-size: 0.875rem;
  color: var(--mc-text-muted);
  margin: 0;
}

/* Stats Bar */
.stats-section {
  margin-top: 2rem;
}

.stats-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 1.25rem 2rem;
  background: var(--mc-surface);
  border: 1px solid var(--mc-border);
  border-radius: 12px;
}

@media (max-width: 768px) {
  .stats-bar {
    flex-wrap: wrap;
    gap: 1.5rem;
  }

  .stat-divider {
    display: none;
  }
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--mc-text);
  font-variant-numeric: tabular-nums;
}

.stat-value.status-online {
  color: var(--mc-accent);
  font-size: 0.875rem;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--mc-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-divider {
  width: 1px;
  height: 24px;
  background: var(--mc-border);
}

/* Responsive */
@media (max-width: 640px) {
  .header-inner {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
    padding: 1.5rem;
  }

  .mc-main {
    padding: 2rem 1.5rem;
  }

  .card-content {
    min-height: 180px;
  }

  .card-title {
    font-size: 1.25rem;
  }
}
</style>
