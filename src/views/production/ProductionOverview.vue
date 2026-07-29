<template>
  <div class="production-overview">
    <!-- Header: Status + Stats in one row -->
    <header class="overview-header">
      <div class="status-pills">
        <button
          v-for="status in statuses"
          :key="status.value"
          @click="setStatus(status.value)"
          class="status-pill"
          :class="{ active: currentStatus === status.value, [status.value]: true }"
          :disabled="isUpdating || store.isLoadingInfo"
        >
          <span v-if="store.isLoadingInfo && currentStatus === status.value" class="loading-dot"></span>
          {{ status.label }}
        </button>
      </div>

      <div class="pricing-pills">
        <button
          v-for="tier in pricingTiers"
          :key="tier.value"
          @click="setPricingTier(tier.value)"
          class="status-pill pricing-tier"
          :class="{ active: currentPricingTier === tier.value, [tier.value]: true }"
          :disabled="isUpdatingTier || store.isLoadingInfo"
        >
          {{ tier.label }}
        </button>
      </div>

      <div class="header-stats">
        <div class="mini-stat primary">
          <template v-if="isLoadingStats">
            <span class="mini-value loading-placeholder">--</span>
            <span class="mini-total">/--</span>
          </template>
          <template v-else>
            <span class="mini-value">{{ stats.completeSeeds }}</span>
            <span class="mini-total">/{{ stats.totalSeeds }}</span>
          </template>
          <span class="mini-label">seeds</span>
        </div>
        <div class="mini-stat">
          <span class="mini-value" :class="{ 'loading-placeholder': isLoadingStats }">
            {{ isLoadingStats ? '--' : stats.legos.toLocaleString() }}
          </span>
          <span class="mini-label">LEGOs</span>
        </div>
        <div class="mini-stat">
          <span class="mini-value" :class="{ 'loading-placeholder': isLoadingStats }">
            {{ isLoadingStats ? '--' : stats.phrases.toLocaleString() }}
          </span>
          <span class="mini-label">phrases</span>
        </div>
        <div class="mini-stat" :class="ratioClass">
          <span class="mini-value" :class="{ 'loading-placeholder': isLoadingStats }">
            {{ isLoadingStats ? '--' : stats.ratio }}
          </span>
          <span class="mini-label" title="Average practice phrases per LEGO">phrases/LEGO</span>
        </div>
        <div class="mini-stat accent">
          <template v-if="audioStats.total === 0 && !audioStatsLoaded">
            <span class="mini-spinner"></span>
          </template>
          <template v-else>
            <span class="mini-value">{{ audioStats.existing.toLocaleString() }}</span>
            <span class="mini-total">/{{ audioStats.total.toLocaleString() }}</span>
          </template>
          <span class="mini-label">audio</span>
        </div>
      </div>
    </header>

    <!-- The explanation lives where the doing is (founder ruling 2026-07-29) -->
    <HowThisWorks section="course-overview" class="overview-htw" />

    <!-- Language-Pair Learnings (collapsible) -->
    <section v-if="learnings.length > 0" class="learnings-section">
      <button class="learnings-header" @click="showLearnings = !showLearnings">
        <span class="learnings-icon">L</span>
        <span class="learnings-title">{{ learnings.length }} Language-Pair Learning{{ learnings.length > 1 ? 's' : '' }}</span>
        <span class="learnings-toggle">{{ showLearnings ? '−' : '+' }}</span>
      </button>
      <div v-if="showLearnings" class="learnings-content">
        <div v-for="(items, category) in learningsByCategory" :key="category" class="learning-category">
          <span class="category-label">{{ category }}</span>
          <ul class="learning-list">
            <li v-for="(item, idx) in items" :key="idx" class="learning-item">{{ item.learning }}</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Main Workflow — grouped into pipeline stages -->

    <!-- Guide -->
    <section class="workflow-stage">
      <div class="stage-head">
        <span class="stage-label">Guide</span>
        <div class="stage-line"></div>
      </div>
      <div class="workflow-grid">
        <router-link :to="`/production/${courseCode}/journey`" class="workflow-card">
          <div class="card-icon journey">J</div>
          <div class="card-content">
            <h3>Course Journey</h3>
            <p>Step-by-step guide from translation to publish</p>
          </div>
          <span class="card-arrow">&rarr;</span>
        </router-link>
      </div>
    </section>

    <!-- 1 · Text generation -->
    <section class="workflow-stage">
      <div class="stage-head">
        <span class="stage-num">1</span>
        <span class="stage-label">Text</span>
        <span class="stage-hint">Seeds &rarr; LEGOs &amp; phrases &middot; Pods are a separate track</span>
        <div class="stage-line"></div>
      </div>
      <div class="workflow-grid">
        <router-link :to="`/production/${courseCode}/seeds`" class="workflow-card">
          <div class="card-icon seeds">Se</div>
          <div class="card-content">
            <h3>Seed Editor</h3>
            <p>Review and approve translations</p>
          </div>
          <span class="card-arrow">&rarr;</span>
        </router-link>

        <router-link :to="`/production/${courseCode}/text`" class="workflow-card">
          <div class="card-icon text">T</div>
          <div class="card-content">
            <h3>Text Generation</h3>
            <p>Build seeds, LEGOs, and phrases</p>
          </div>
          <span class="card-arrow">&rarr;</span>
        </router-link>

        <router-link :to="`/production/${courseCode}/pods`" class="workflow-card">
          <div class="card-icon pods">P</div>
          <div class="card-content">
            <h3>Listening Pods</h3>
            <p>Layer 2 pod sentences (separate text track)</p>
          </div>
          <span class="card-arrow">&rarr;</span>
        </router-link>
      </div>
    </section>

    <!-- 2 · Audio generation -->
    <section class="workflow-stage">
      <div class="stage-head">
        <span class="stage-num">2</span>
        <span class="stage-label">Audio</span>
        <span class="stage-hint">All audio for the course &amp; pods</span>
        <div class="stage-line"></div>
      </div>
      <div class="workflow-grid">
        <router-link :to="`/production/${courseCode}/pipeline`" class="workflow-card">
          <div class="card-icon audio">A</div>
          <div class="card-content">
            <h3>Audio Generation</h3>
            <p>TTS synthesis for the course and pods</p>
          </div>
          <span class="card-arrow">&rarr;</span>
        </router-link>

        <router-link :to="`/production/${courseCode}/recording`" class="workflow-card">
          <div class="card-icon record">H</div>
          <div class="card-content">
            <h3>Human Recording <span class="card-tag">optional</span></h3>
            <p>Only for pairs without strong TTS voices</p>
          </div>
          <span class="card-arrow">&rarr;</span>
        </router-link>
      </div>
    </section>

    <!-- 3 · Review & QA -->
    <section class="workflow-stage">
      <div class="stage-head">
        <span class="stage-num">3</span>
        <span class="stage-label">Review &amp; QA</span>
        <span class="stage-hint">The course as the learner hears it &mdash; fix text &amp; audio in place</span>
        <div class="stage-line"></div>
      </div>
      <div class="workflow-grid">
        <router-link
          :to="{ name: 'ScriptViewer', params: { courseCode }, query: { view: 'journey' } }"
          class="workflow-card"
        >
          <div class="card-icon script">S</div>
          <div class="card-content">
            <h3>Script View</h3>
            <p>Read the learner journey; fix phrases &amp; regenerate audio inline</p>
          </div>
          <span class="card-arrow">&rarr;</span>
        </router-link>

        <button @click="launchLearningApp" class="workflow-card action">
          <div class="card-icon launch">L</div>
          <div class="card-content">
            <h3>Open Learning App</h3>
            <p>Preview course in app</p>
          </div>
          <span class="card-arrow">&nearr;</span>
        </button>
      </div>
    </section>

    <!-- Secondary Tools -->
    <section class="secondary-tools">
      <router-link :to="`/production/${courseCode}/recording-optimizer`" class="tool-link">
        Recording Optimizer
      </router-link>
      <button @click="runAudit" :disabled="auditing" class="tool-link">
        {{ auditing ? 'Starting Audit...' : 'Run QA Audit' }}
      </button>
      <button @click="showExportDialog = true" class="tool-link">
        Export Legacy
      </button>
    </section>

    <!-- Export Dialog -->
    <LegacyExportDialog
      :visible="showExportDialog"
      :course-code="courseCode"
      @close="showExportDialog = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getApiUrl } from '@/services/api'
import { isConfigured as isSupabaseConfigured, getCourseProgress, getQASummary } from '@/services/supabase'
import { useProductionStore } from '@/stores/production'
import LegacyExportDialog from '@/components/production/LegacyExportDialog.vue'
import HowThisWorks from '@/components/explainer/HowThisWorks.vue'

const props = defineProps({
  courseCode: { type: String, required: true }
})

const router = useRouter()
const store = useProductionStore()
const showExportDialog = ref(false)
const isUpdating = ref(false)
const isUpdatingTier = ref(false)
const auditing = ref(false)
const showLearnings = ref(false)

// Learnings from course info
const learnings = computed(() => store.courseInfo?.learnings || [])
const learningsByCategory = computed(() => {
  const grouped = {}
  learnings.value.forEach(l => {
    const cat = l.category || 'general'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(l)
  })
  return grouped
})

const statuses = [
  { value: 'testing', label: 'Testing' },
  { value: 'beta', label: 'Beta' },
  { value: 'live', label: 'Live' }
]

const pricingTiers = [
  { value: 'free', label: 'Free' },
  { value: 'premium', label: 'Premium' },
  { value: 'community', label: 'Community' }
]

const localStats = ref({ completeSeeds: 0, totalSeeds: 0, legos: 0, phrases: 0 })
const qaStats = ref({ flags: 0, checked: 0 })
const isLoadingStats = ref(true)  // Start true, set false when loaded
const audioStatsLoaded = ref(false)  // Track if audio stats have been fetched

const stats = computed(() => {
  const legos = localStats.value.legos || 0
  const phrases = localStats.value.phrases || 0
  return {
    completeSeeds: localStats.value.completeSeeds || 0,
    totalSeeds: localStats.value.totalSeeds || 0,
    legos,
    phrases,
    ratio: legos > 0 ? (phrases / legos).toFixed(1) : '0'
  }
})

const audioStats = computed(() => store.audioCourseStats || { existing: 0, total: 0 })

// Mark audio stats as loaded once we get real data
watch(() => store.audioCourseStats?.total, (total) => {
  if (total > 0) audioStatsLoaded.value = true
}, { immediate: true })

const ratioClass = computed(() => {
  const r = parseFloat(stats.value.ratio)
  if (r >= 10) return 'good'
  if (r >= 7) return 'ok'
  return 'low'
})

const currentStatus = computed(() => {
  const s = store.courseInfo?.status || 'testing'
  if (s === 'draft') return 'testing'
  if (s === 'released') return 'live'
  return s
})

const currentPricingTier = computed(() => {
  return store.courseInfo?.pricingTier || 'premium'
})

async function loadStats() {
  isLoadingStats.value = true
  try {
    if (isSupabaseConfigured()) {
      const data = await getCourseProgress(props.courseCode)
      localStats.value = {
        completeSeeds: data.completedSeeds || 0,
        totalSeeds: data.seeds || 0,
        legos: data.legos || 0,
        phrases: data.phrases || 0
      }
    } else {
      const apiBase = getApiUrl()
      const res = await fetch(`${apiBase}/api/stats/${props.courseCode}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
      if (res.ok) {
        const data = await res.json()
        localStats.value = {
          completeSeeds: data.seeds_with_legos || data.completed_seeds || 0,
          totalSeeds: data.total_seeds || 0,
          legos: data.legos || 0,
          phrases: data.phrases || 0
        }
      }
    }
  } catch (err) {
    console.warn('Could not load stats:', err.message)
  } finally {
    isLoadingStats.value = false
  }
}

async function loadQAStats() {
  try {
    if (isSupabaseConfigured()) {
      const data = await getQASummary(props.courseCode)
      qaStats.value = { flags: data.flagged || 0, checked: 0 }
    } else {
      const apiBase = getApiUrl()
      const res = await fetch(`${apiBase}/api/qa/summary/${props.courseCode}`)
      if (res.ok) {
        const data = await res.json()
        qaStats.value = { flags: data.flags?.total || 0, checked: data.phrases?.checked || 0 }
      }
    }
  } catch (err) {
    // QA stats optional
  }
}

async function setStatus(status) {
  if (status === currentStatus.value || isUpdating.value) return
  isUpdating.value = true
  try {
    await store.updateCourseStatus(status)
  } finally {
    isUpdating.value = false
  }
}

async function setPricingTier(tier) {
  if (tier === currentPricingTier.value || isUpdatingTier.value) return
  isUpdatingTier.value = true
  try {
    await store.updatePricingTier(tier)
  } finally {
    isUpdatingTier.value = false
  }
}

function launchLearningApp() {
  const url = import.meta.env.VITE_LEARNING_APP_URL || 'https://saysomethingin.app'
  window.open(`${url}/?course=${props.courseCode}`, '_blank')
}

async function runAudit() {
  auditing.value = true
  try {
    const apiBase = getApiUrl()
    await fetch(`${apiBase}/api/qa/spawn-audit/${props.courseCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sample_size: 100 })
    })
  } catch (err) {
    console.error('Failed to spawn auditor:', err)
  } finally {
    auditing.value = false
  }
}

onMounted(() => {
  store.loadCourseInfo(props.courseCode)
  loadStats()
  loadQAStats()
})

watch(() => props.courseCode, () => {
  audioStatsLoaded.value = false  // Reset for new course
  store.loadCourseInfo(props.courseCode)
  loadStats()
  loadQAStats()
})
</script>

<style scoped>
.production-overview {
  padding: 1.5rem;
  max-width: 1000px;
}

/* Header */
.overview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.status-pills {
  display: flex;
  gap: 0.5rem;
}

.status-pill {
  padding: 0.4rem 0.875rem;
  border-radius: 16px;
  border: 1px solid var(--color-graphite, var(--surface-3));
  background: transparent;
  color: var(--color-paper-dim, var(--muted));
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.status-pill:hover:not(:disabled) { border-color: var(--color-paper-dim, var(--muted)); }
.status-pill:disabled { opacity: 0.5; cursor: not-allowed; }
.status-pill.active.testing { background: rgba(148,163,184,0.2); border-color: var(--muted); color: var(--muted); }
.status-pill.active.beta { background: rgba(251,191,36,0.15); border-color: #fbbf24; color: #fbbf24; }
.status-pill.active.live { background: rgba(52,211,153,0.15); border-color: var(--accent-2); color: var(--accent-2); }

/* Pricing Tier Pills */
.pricing-pills {
  display: flex;
  gap: 0.5rem;
}
.status-pill.pricing-tier.active.free { background: rgba(52,211,153,0.15); border-color: var(--accent-2); color: var(--accent-2); }
.status-pill.pricing-tier.active.premium { background: rgba(251,191,36,0.15); border-color: #fbbf24; color: #fbbf24; }
.status-pill.pricing-tier.active.community { background: rgba(59,130,246,0.15); border-color: #3b82f6; color: #3b82f6; }

/* Header Stats */
.header-stats {
  display: flex;
  gap: 1.25rem;
}

.mini-stat {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  font-family: var(--font-mono, monospace);
}

.mini-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-paper, var(--ink));
}
.mini-total {
  font-size: 0.8rem;
  color: var(--color-paper-dim, var(--faint));
}
.mini-label {
  font-size: 0.65rem;
  color: var(--color-paper-dim, var(--faint));
  text-transform: uppercase;
  margin-left: 0.125rem;
}

.mini-stat.primary .mini-value { color: var(--accent-2); }
.mini-stat.accent .mini-value { color: var(--color-tungsten, var(--accent)); }
.mini-stat.good .mini-value { color: var(--accent-2); }
.mini-stat.ok .mini-value { color: #fbbf24; }
.mini-stat.low .mini-value { color: #f87171; }

.overview-htw { margin-bottom: 1rem; }

/* Language-Pair Learnings */
.learnings-section {
  margin-bottom: 1rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
}

.learnings-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
}
.learnings-header:hover {
  background: rgba(255, 255, 255, 0.03);
}
[data-theme="light"] .learnings-header:hover {
  background: var(--surface-2);
}

.learnings-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #8b5cf6;
  color: white;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.learnings-title {
  flex: 1;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-paper, var(--ink));
}

.learnings-toggle {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-paper-dim, var(--muted));
  font-size: 1.1rem;
  font-weight: 300;
}

.learnings-content {
  padding: 0 1rem 1rem;
  border-top: 1px solid var(--line);
}

.learning-category {
  margin-top: 0.75rem;
}

.category-label {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  background: rgba(139, 92, 246, 0.15);
  color: #a78bfa;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: 4px;
  margin-bottom: 0.375rem;
}

.learning-list {
  margin: 0;
  padding-left: 1rem;
  list-style: none;
}

.learning-item {
  position: relative;
  padding: 0.25rem 0;
  font-size: 0.8rem;
  color: var(--color-paper-dim, var(--muted));
  line-height: 1.4;
}
.learning-item::before {
  content: "•";
  position: absolute;
  left: -0.75rem;
  color: var(--color-graphite, var(--surface-3));
}

/* Blockers */
.blockers-section {
  margin-bottom: 1rem;
}

.blocker-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: rgba(248,113,113,0.1);
  border: 1px solid rgba(248,113,113,0.3);
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.blocker-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f87171;
  color: white;
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 700;
}

.blocker-text {
  flex: 1;
  font-size: 0.875rem;
  color: var(--color-paper, var(--ink));
}

.btn-resolve {
  padding: 0.25rem 0.5rem;
  background: #f87171;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
}

/* Workflow stages */
.workflow-stage {
  margin-bottom: 1.5rem;
}

.stage-head {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 0.625rem;
}

.stage-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: var(--surface-3);
  color: var(--muted);
  font-size: 0.7rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.stage-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  white-space: nowrap;
}

.stage-hint {
  font-size: 0.75rem;
  color: var(--faint);
  white-space: nowrap;
}

.stage-line {
  flex: 1;
  height: 1px;
  background: var(--line);
}

.card-tag {
  display: inline-block;
  margin-left: 0.4rem;
  padding: 0.05rem 0.4rem;
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--faint);
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 999px;
  vertical-align: middle;
}

/* Workflow Grid */
.workflow-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

@media (max-width: 640px) {
  .stage-hint { display: none; }
}

.workflow-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s;
}
.workflow-card:hover {
  background: var(--surface-2);
  border-color: var(--color-paper-dim, var(--faint));
}

.workflow-card.action {
  background: transparent;
  border-style: dashed;
}

.card-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-weight: 700;
  font-size: 1rem;
  flex-shrink: 0;
}

.card-icon.journey { background: var(--accent-2); color: var(--canvas); }
.card-icon.seeds { background: #06b6d4; color: white; }
.card-icon.text { background: #3b82f6; color: white; }
.card-icon.script { background: #f59e0b; color: white; }
.card-icon.audio { background: #8b5cf6; color: white; }
.card-icon.review { background: #ec4899; color: white; }
.card-icon.record { background: #10b981; color: white; }
.card-icon.pods { background: #a855f7; color: white; }
.card-icon.listening-config { background: #ec4899; color: white; }
.card-icon.launch { background: var(--color-graphite, var(--surface-3)); color: var(--color-tungsten, var(--accent)); }

.card-content {
  flex: 1;
  min-width: 0;
}

.card-content h3 {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-paper, var(--ink));
  margin: 0 0 0.125rem;
}

.card-content p {
  font-size: 0.75rem;
  color: var(--color-paper-dim, var(--faint));
  margin: 0;
}

.card-badge {
  padding: 0.125rem 0.4rem;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 600;
}
.card-badge.error {
  background: #f87171;
  color: white;
}

.card-arrow {
  color: var(--color-paper-dim, var(--faint));
  font-size: 1rem;
}

/* Secondary Tools */
.secondary-tools {
  display: flex;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--line);
}

.tool-link {
  font-size: 0.8rem;
  color: var(--color-paper-dim, var(--faint));
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.tool-link:hover {
  color: var(--color-paper, var(--ink));
  text-decoration: underline;
}

@media (max-width: 800px) {
  .workflow-grid { grid-template-columns: repeat(2, 1fr); }
  .overview-header { flex-direction: column; align-items: flex-start; }
}

@media (max-width: 500px) {
  .workflow-grid { grid-template-columns: 1fr; }
  .header-stats { flex-wrap: wrap; }
}

/* Loading states */
.loading-placeholder {
  opacity: 0.4;
  animation: pulse 1.5s ease-in-out infinite;
}

.loading-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  background: currentColor;
  border-radius: 50%;
  margin-right: 4px;
  animation: pulse 1s ease-in-out infinite;
}

.mini-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 166, 48, 0.3);
  border-top-color: var(--color-tungsten, var(--accent));
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Light-mode contrast fixes — dark mode untouched.
   The shared hues above (amber #fbbf24, blue #3b82f6, red #f87171/#f59e0b,
   purple #a78bfa) read fine on dark surfaces but fail WCAG on light pills/cards.
   Darken text (and tighten pill fills) for light only, keeping the same hue family. */
[data-theme="light"] .status-pill.active.beta,
[data-theme="light"] .status-pill.pricing-tier.active.premium {
  background: rgba(180, 83, 9, 0.12);
  border-color: #b45309;
  color: #92400e; /* amber-800 on light pill ≈ 6.0:1 */
}
[data-theme="light"] .status-pill.pricing-tier.active.community {
  background: rgba(37, 99, 235, 0.12);
  border-color: #1d4ed8;
  color: #1d4ed8; /* blue-700 ≈ 6.3:1 on white */
}
[data-theme="light"] .mini-stat.ok .mini-value {
  color: #b45309; /* amber-700 ≈ 5.2:1 on white */
}
[data-theme="light"] .mini-stat.low .mini-value {
  color: #dc2626; /* red ≈ 4.5:1 on white */
}
[data-theme="light"] .category-label {
  background: rgba(124, 58, 237, 0.12);
  color: #6d28d9; /* violet-700 ≈ 6.2:1 */
}
</style>
