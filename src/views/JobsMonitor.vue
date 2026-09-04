<template>
  <div class="activity-monitor">
    <!-- Ambient Background -->
    <div class="ambient-bg">
      <div class="grid-overlay"></div>
      <div class="glow-orb glow-orb-1"></div>
      <div class="glow-orb glow-orb-2"></div>
    </div>

    <!-- Header -->
    <header class="am-header">
      <div class="header-inner">
        <div class="header-left">
          <router-link to="/" class="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </router-link>
          <div class="header-titles">
            <h1 class="page-title">Activity</h1>
            <p class="page-subtitle" v-if="activeCourses.length > 0">
              {{ activeCourses.length }} course{{ activeCourses.length !== 1 ? 's' : '' }} active
            </p>
            <p class="page-subtitle" v-else>Watching for changes</p>
          </div>
        </div>
        <div class="header-right">
          <span class="live-dot" :class="{ connected: realtimeConnected }"></span>
          <span class="live-label">{{ realtimeConnected ? 'Live' : 'Polling' }}</span>
        </div>
      </div>
    </header>

    <main class="am-content">
      <!-- Current -->
      <section v-if="activeCourses.length > 0" class="section">
        <h2 class="section-title">Current</h2>
        <router-link
          v-for="course in activeCourses"
          :key="course.code"
          :to="course.audioActive ? `/production/${course.code}/audio` : `/production/${course.code}/text`"
          class="course-row active"
        >
          <div class="course-row-inner">
            <div class="course-info">
              <span class="course-name">{{ course.displayName }}</span>
              <span class="course-code">{{ course.code }}</span>
            </div>

            <div class="course-stats">
              <template v-if="course.stats.seedsTranslated > 0 && course.stats.seedsTranslated < course.stats.seeds">
                <span class="stat"><span class="stat-num">{{ course.stats.seedsTranslated }}/{{ course.stats.seeds }}</span> translated</span>
                <span class="stat-sep">&middot;</span>
              </template>
              <span class="stat"><span class="stat-num">{{ course.stats.completedSeeds }}/300</span> built</span>
              <span class="stat-sep">&middot;</span>
              <span class="stat"><span class="stat-num">{{ course.stats.legos }}</span> LEGOs</span>
              <span class="stat-sep">&middot;</span>
              <span class="stat"><span class="stat-num">{{ course.stats.phrases }}</span> phrases</span>
              <template v-if="course.stats.audio > 0">
                <span class="stat-sep">&middot;</span>
                <span class="stat"><span class="stat-num">{{ course.stats.audio }}</span> audio</span>
              </template>
            </div>

            <div class="course-activity">
              <span class="last-change" :class="ageClass(course.lastChanged)">
                {{ timeAgo(course.lastChanged) }}
              </span>
              <span v-if="course.audioActive" class="audio-badge">Audio generating</span>
              <span v-else-if="course.delta" class="delta">
                {{ course.delta }}
              </span>
            </div>
          </div>
        </router-link>
      </section>

      <!-- Recent -->
      <section class="section">
        <h2 class="section-title">Recent</h2>
        <div v-if="loadingRecent" class="loading-state">
          <span class="loading-spinner"></span>
          <span>Loading recent activity...</span>
        </div>
        <div v-else-if="recentCourses.length === 0 && activeCourses.length === 0" class="empty-state">
          <p>No activity yet.</p>
        </div>
        <div v-else-if="recentCourses.length === 0" class="empty-state-small">
          <p>No other recent activity.</p>
        </div>
        <router-link
          v-for="course in recentCourses"
          :key="course.code"
          :to="`/production/${course.code}/text`"
          class="course-row recent"
        >
          <div class="course-row-inner">
            <div class="course-info">
              <span class="course-name">{{ course.displayName }}</span>
              <span class="course-code">{{ course.code }}</span>
            </div>

            <div class="course-stats">
              <template v-if="course.stats.seedsTranslated > 0 && course.stats.seedsTranslated < course.stats.seeds">
                <span class="stat"><span class="stat-num">{{ course.stats.seedsTranslated }}/{{ course.stats.seeds }}</span> translated</span>
                <span class="stat-sep">&middot;</span>
              </template>
              <span class="stat"><span class="stat-num">{{ course.stats.completedSeeds }}/300</span> built</span>
              <span class="stat-sep">&middot;</span>
              <span class="stat"><span class="stat-num">{{ course.stats.legos }}</span> LEGOs</span>
              <span class="stat-sep">&middot;</span>
              <span class="stat"><span class="stat-num">{{ course.stats.phrases }}</span> phrases</span>
              <template v-if="course.stats.audio > 0">
                <span class="stat-sep">&middot;</span>
                <span class="stat"><span class="stat-num">{{ course.stats.audio }}</span> audio</span>
              </template>
            </div>

            <div class="course-activity">
              <span class="recent-time">{{ formatRecentTime(course.updatedAt) }}</span>
            </div>
          </div>
        </router-link>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase, getCourseStats } from '@/services/supabase'
import { useCourses } from '@/composables/useCourses'

const { getCourseName, loadCourses } = useCourses()

// Snapshots: { [courseCode]: { stats, lastChanged, firstStats, firstSeen, audioActive } }
const snapshots = ref({})
const realtimeConnected = ref(false)
const loadingRecent = ref(true)
let pollTimer = null
let subscriptions = []

// Active = changed in last 10 minutes
const TEN_MINUTES = 10 * 60 * 1000

const activeCourses = computed(() => {
  const now = Date.now()
  return Object.entries(snapshots.value)
    .filter(([, snap]) => snap.lastChanged && (now - snap.lastChanged) < TEN_MINUTES)
    .sort((a, b) => b[1].lastChanged - a[1].lastChanged)
    .map(([code, snap]) => ({
      code,
      displayName: getCourseName(code),
      stats: snap.stats,
      lastChanged: snap.lastChanged,
      delta: formatDelta(snap),
      audioActive: snap.audioActive || false
    }))
})

function formatDelta(snap) {
  if (!snap.firstStats || !snap.firstSeen) return null
  const seedDiff = (snap.stats.completedSeeds || 0) - (snap.firstStats.completedSeeds || 0)
  const translateDiff = (snap.stats.seedsTranslated || 0) - (snap.firstStats.seedsTranslated || 0)
  const phraseDiff = (snap.stats.phrases || 0) - (snap.firstStats.phrases || 0)
  const legoDiff = (snap.stats.legos || 0) - (snap.firstStats.legos || 0)
  const audioDiff = (snap.stats.audio || 0) - (snap.firstStats.audio || 0)
  if (seedDiff === 0 && translateDiff === 0 && phraseDiff === 0 && legoDiff === 0 && audioDiff === 0) return null

  const elapsed = Date.now() - snap.firstSeen
  const mins = Math.round(elapsed / 60000)
  const parts = []
  if (translateDiff > 0) parts.push(`+${translateDiff} translated`)
  if (seedDiff > 0) parts.push(`+${seedDiff} seed${seedDiff !== 1 ? 's' : ''}`)
  if (legoDiff > 0) parts.push(`+${legoDiff} LEGOs`)
  if (phraseDiff > 0) parts.push(`+${phraseDiff} phrases`)
  if (audioDiff > 0) parts.push(`+${audioDiff} audio`)
  if (parts.length === 0) return null
  return `${parts.join(', ')} in ${mins < 1 ? '<1' : mins} min`
}

function timeAgo(ts) {
  if (!ts) return ''
  void tick.value
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const mins = Math.floor(seconds / 60)
  return `${mins}m ago`
}

function ageClass(ts) {
  if (!ts) return 'dim'
  void tick.value
  const seconds = (Date.now() - ts) / 1000
  if (seconds < 60) return 'green'
  if (seconds < 300) return 'amber'
  return 'dim'
}

function updateSnapshot(courseCode, newStats, isAudio = false) {
  const prev = snapshots.value[courseCode]
  const now = Date.now()

  if (!prev) {
    snapshots.value[courseCode] = {
      stats: newStats,
      lastChanged: null,
      firstStats: { ...newStats },
      firstSeen: now,
      audioActive: isAudio
    }
    return
  }

  const changed =
    prev.stats.completedSeeds !== newStats.completedSeeds ||
    prev.stats.seedsTranslated !== newStats.seedsTranslated ||
    prev.stats.legos !== newStats.legos ||
    prev.stats.phrases !== newStats.phrases ||
    prev.stats.seeds !== newStats.seeds ||
    prev.stats.audio !== newStats.audio

  if (changed) {
    const firstStats = prev.lastChanged ? prev.firstStats : { ...prev.stats }
    const firstSeen = prev.lastChanged ? prev.firstSeen : now
    snapshots.value[courseCode] = {
      stats: newStats,
      lastChanged: now,
      firstStats,
      firstSeen,
      audioActive: isAudio || prev.audioActive
    }
  }
}

async function refreshKnownCourses() {
  const codes = Object.keys(snapshots.value)
  for (const code of codes) {
    await fetchSingleCourseStats(code)
  }
}

async function detectRecentActivity() {
  if (!supabase) return
  try {
    const tenMinAgo = new Date(Date.now() - TEN_MINUTES).toISOString()

    // Check seed + audio activity in parallel
    const [built, approved, flagged, audioRecent] = await Promise.all([
      supabase.from('course_seeds').select('course_code, decomposed_at')
        .gte('decomposed_at', tenMinAgo).order('decomposed_at', { ascending: false }),
      supabase.from('course_seeds').select('course_code, approved_at')
        .gte('approved_at', tenMinAgo).order('approved_at', { ascending: false }),
      supabase.from('course_seeds').select('course_code, flagged_at')
        .gte('flagged_at', tenMinAgo).order('flagged_at', { ascending: false }),
      supabase.from('course_audio').select('course_code, created_at')
        .gte('created_at', tenMinAgo).order('created_at', { ascending: false }).limit(100)
    ])

    // Merge into a map of course_code → { latestTs, audioActive }
    const recentMap = {}
    function track(code, ts, audio = false) {
      if (!recentMap[code]) recentMap[code] = { ts: 0, audioActive: false }
      if (ts > recentMap[code].ts) recentMap[code].ts = ts
      if (audio) recentMap[code].audioActive = true
    }

    for (const row of (built.data || [])) track(row.course_code, new Date(row.decomposed_at).getTime())
    for (const row of (approved.data || [])) track(row.course_code, new Date(row.approved_at).getTime())
    for (const row of (flagged.data || [])) track(row.course_code, new Date(row.flagged_at).getTime())
    for (const row of (audioRecent.data || [])) track(row.course_code, new Date(row.created_at).getTime(), true)

    for (const [code, info] of Object.entries(recentMap)) {
      await fetchSingleCourseStats(code, info.audioActive)
      if (snapshots.value[code]) {
        snapshots.value[code].lastChanged = info.ts
        if (info.audioActive) snapshots.value[code].audioActive = true
      }
    }
  } catch (err) {
    console.warn('[Activity] detectRecentActivity failed:', err.message)
  }
}

async function fetchSingleCourseStats(courseCode, audioActive = false) {
  try {
    const stats = await getCourseStats(courseCode)
    updateSnapshot(courseCode, {
      seeds: stats.seeds || 0,
      completedSeeds: stats.completeSeeds || 0,
      seedsTranslated: stats.seedsTranslated || 0,
      legos: stats.legos || 0,
      phrases: stats.practicePhrases || 0,
      audio: stats.audio || 0
    }, audioActive)
  } catch (err) {
    console.warn(`[Activity] Failed to fetch stats for ${courseCode}:`, err.message)
  }
}

// Recent = 10 most recently updated courses, excluding ones in Current
const recentCoursesData = ref([]) // [{ code, displayName, stats, updatedAt }]

const recentCourses = computed(() => {
  const activeCodes = new Set(activeCourses.value.map(c => c.code))
  return recentCoursesData.value.filter(c => !activeCodes.has(c.code))
})

function formatRecentTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now - d
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

async function loadRecentCourses() {
  if (!supabase) return
  loadingRecent.value = true
  try {
    // Two fast queries in parallel:
    // 1. Recently updated courses (just metadata)
    // 2. All course stats via the optimized RPC (~635ms)
    const [coursesResult, statsResult] = await Promise.all([
      supabase
        .from('courses')
        .select('course_code, display_name, updated_at')
        .order('updated_at', { ascending: false })
        .limit(15),
      supabase.rpc('get_all_course_stats')
    ])

    if (coursesResult.error || !coursesResult.data) return

    // Build stats lookup from RPC result
    const statsMap = {}
    for (const row of (statsResult.data || [])) {
      statsMap[row.course_code] = row
    }

    const results = []
    for (const course of coursesResult.data) {
      const s = statsMap[course.course_code]
      if (!s || ((s.seeds || 0) === 0 && (s.legos || 0) === 0)) continue
      results.push({
        code: course.course_code,
        displayName: getCourseName(course.course_code),
        stats: {
          seeds: s.seeds || 0,
          completedSeeds: s.completed_seeds || 0,
          seedsTranslated: 0, // Not in the RPC — populated by detectRecentActivity if active
          legos: s.legos || 0,
          phrases: s.phrases || 0,
          audio: 0 // Removed from RPC for performance
        },
        updatedAt: course.updated_at
      })
      if (results.length >= 10) break
    }
    recentCoursesData.value = results
  } catch (err) {
    console.warn('[Activity] loadRecentCourses failed:', err.message)
  } finally {
    loadingRecent.value = false
  }
}

function setupRealtime() {
  if (!supabase) return

  const tables = ['course_seeds', 'course_legos', 'course_practice_phrases', 'course_audio']
  for (const table of tables) {
    const channel = supabase
      .channel(`activity-${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        const courseCode = payload.new?.course_code || payload.old?.course_code
        if (courseCode) {
          const isAudio = table === 'course_audio'
          fetchSingleCourseStats(courseCode, isAudio)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          realtimeConnected.value = true
        } else if (status === 'CHANNEL_ERROR') {
          // Silently fall back to polling — don't spam console
          realtimeConnected.value = false
        }
      })
    subscriptions.push(channel)
  }
}

function teardownRealtime() {
  for (const channel of subscriptions) {
    supabase?.removeChannel(channel)
  }
  subscriptions = []
  realtimeConnected.value = false
}

// Force re-render of timeAgo every 5 seconds
const tick = ref(0)
let tickTimer = null

onMounted(async () => {
  await loadCourses()
  await Promise.all([detectRecentActivity(), loadRecentCourses()])
  setupRealtime()
  // Poll DB stats every 30s as fallback
  pollTimer = setInterval(refreshKnownCourses, 30000)
  // Tick for timeAgo refresh
  tickTimer = setInterval(() => { tick.value++ }, 5000)
})

onUnmounted(() => {
  teardownRealtime()
  if (pollTimer) clearInterval(pollTimer)
  if (tickTimer) clearInterval(tickTimer)
})

</script>

<style scoped>
.activity-monitor {
  min-height: 100vh;
  background: var(--canvas);
  color: var(--ink);
  position: relative;
  overflow: hidden;
}

/* Ambient background */
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
    linear-gradient(rgba(148, 163, 184, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}

.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.15;
}

.glow-orb-1 {
  width: 400px;
  height: 400px;
  background: #10b981;
  top: -100px;
  right: -100px;
}

.glow-orb-2 {
  width: 300px;
  height: 300px;
  background: #6366f1;
  bottom: -50px;
  left: -50px;
}

/* Header */
.am-header {
  position: relative;
  z-index: 1;
  border-bottom: 1px solid var(--line);
}

.header-inner {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  color: var(--muted);
  transition: color 0.15s;
}

.back-link:hover {
  color: var(--ink);
}

.back-link svg {
  width: 1.25rem;
  height: 1.25rem;
}

.header-titles {
  display: flex;
  flex-direction: column;
}

/* Colour and weight come from the shared house look in
   assets/ui-tokens.css — this page sets only its own size. */
.page-title {
  font-size: 1.25rem;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 0.8rem;
  color: var(--faint);
  margin-top: 0.15rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--faint);
  transition: background 0.3s;
}

.live-dot.connected {
  background: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.5);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.live-label {
  font-size: 0.75rem;
  color: var(--faint);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Content */
.am-content {
  position: relative;
  z-index: 1;
  max-width: 960px;
  margin: 0 auto;
  padding: 1rem 1.5rem 3rem;
}

.section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--faint);
  margin-bottom: 0.75rem;
  padding-left: 0.25rem;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem 1rem;
  color: var(--faint);
  font-size: 0.8rem;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--surface-2);
  border-top-color: var(--faint);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--faint);
  font-size: 0.9rem;
}

.empty-state-small {
  text-align: center;
  padding: 1.5rem 1rem;
  color: var(--faint);
  font-size: 0.8rem;
}

/* Course cards */
.course-row {
  display: flex;
  align-items: stretch;
  gap: 0;
  margin-bottom: 0.625rem;
  border-radius: 10px;
  background: var(--surface);
  border: 1px solid var(--line);
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
  cursor: pointer;
  overflow: hidden;
}

.course-row:hover {
  background: var(--surface-3);
  border-color: var(--accent);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  transform: translateY(-1px);
}

:root[data-theme="light"] .course-row:hover {
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
}

/* Left accent bar */
.course-row::before {
  content: '';
  width: 3px;
  flex-shrink: 0;
  background: var(--line);
  border-radius: 10px 0 0 10px;
}

.course-row.active::before {
  background: #10b981;
  animation: accent-pulse 2s ease-in-out infinite;
}

@keyframes accent-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.recent-time {
  font-size: 0.75rem;
  color: var(--faint);
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-weight: 500;
}

.course-row-inner {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 1.25rem;
  flex: 1;
  min-width: 0;
}

.course-info {
  flex: 0 0 auto;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.course-name {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.course-code {
  font-size: 0.6875rem;
  color: var(--faint);
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  opacity: 0.7;
}

.course-stats {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex-wrap: wrap;
}

.stat {
  font-size: 0.8125rem;
  color: var(--muted);
  white-space: nowrap;
}

.stat-num {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  color: var(--ink);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.stat-sep {
  color: var(--faint);
  font-size: 0.5rem;
}

.course-activity {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
  min-width: 140px;
}

.last-change {
  font-size: 0.75rem;
  font-weight: 600;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
}

.last-change.green {
  color: #10b981;
}

.last-change.amber {
  color: #f59e0b;
}

.last-change.dim {
  color: var(--faint);
}

.delta {
  font-size: 0.6875rem;
  color: var(--accent-2);
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-weight: 500;
}

.audio-badge {
  font-size: 0.6875rem;
  color: #38bdf8;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-weight: 500;
}

/* Light-mode: darken hardcoded status hues for AA contrast on white rows */
:root[data-theme="light"] .last-change.green {
  color: #047857;
}

:root[data-theme="light"] .last-change.amber {
  color: #b45309;
}

:root[data-theme="light"] .audio-badge {
  color: #0369a1;
}

/* Responsive */
@media (max-width: 768px) {
  .course-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .course-info {
    min-width: unset;
    width: 100%;
    flex-direction: row;
    align-items: baseline;
    gap: 0.5rem;
  }

  .course-activity {
    align-items: flex-start;
    flex-direction: row;
    gap: 0.75rem;
  }
}
</style>
