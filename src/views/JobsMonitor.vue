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

    <!-- Active Courses -->
    <main class="am-content">
      <div v-if="activeCourses.length === 0" class="empty-state">
        <p>No active builds. Start a build from a course's Text page.</p>
      </div>

      <router-link
        v-for="course in activeCourses"
        :key="course.code"
        :to="`/production/${course.code}/text`"
        class="course-row"
      >
        <div class="course-row-inner">
          <div class="course-info">
            <span class="course-name">{{ course.displayName }}</span>
            <span class="course-code">{{ course.code }}</span>
          </div>

          <div class="course-stats">
            <span class="stat"><span class="stat-num">{{ course.stats.completedSeeds }}/300</span> built</span>
            <span class="stat-sep">&middot;</span>
            <span class="stat"><span class="stat-num">{{ course.stats.legos }}</span> LEGOs</span>
            <span class="stat-sep">&middot;</span>
            <span class="stat"><span class="stat-num">{{ course.stats.phrases }}</span> phrases</span>
          </div>

          <div class="course-activity">
            <span class="last-change" :class="ageClass(course.lastChanged)">
              {{ timeAgo(course.lastChanged) }}
            </span>
            <span v-if="course.delta" class="delta">
              {{ course.delta }}
            </span>
          </div>
        </div>
      </router-link>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase, getCourseStats } from '@/services/supabase'
import { useCourses } from '@/composables/useCourses'

const { getCourseName, loadCourses } = useCourses()

// Snapshots: { [courseCode]: { stats, lastChanged, firstStats, firstSeen } }
const snapshots = ref({})
const realtimeConnected = ref(false)
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
      delta: formatDelta(snap)
    }))
})

function formatDelta(snap) {
  if (!snap.firstStats || !snap.firstSeen) return null
  const seedDiff = (snap.stats.completedSeeds || 0) - (snap.firstStats.completedSeeds || 0)
  const phraseDiff = (snap.stats.phrases || 0) - (snap.firstStats.phrases || 0)
  const legoDiff = (snap.stats.legos || 0) - (snap.firstStats.legos || 0)
  if (seedDiff === 0 && phraseDiff === 0 && legoDiff === 0) return null

  const elapsed = Date.now() - snap.firstSeen
  const mins = Math.round(elapsed / 60000)
  const parts = []
  if (seedDiff > 0) parts.push(`+${seedDiff} seed${seedDiff !== 1 ? 's' : ''}`)
  if (legoDiff > 0) parts.push(`+${legoDiff} LEGOs`)
  if (phraseDiff > 0) parts.push(`+${phraseDiff} phrases`)
  if (parts.length === 0) return null
  return `${parts.join(', ')} in ${mins < 1 ? '<1' : mins} min`
}

function timeAgo(ts) {
  if (!ts) return ''
  void tick.value // reactive dependency for re-render
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const mins = Math.floor(seconds / 60)
  return `${mins}m ago`
}

function ageClass(ts) {
  if (!ts) return 'dim'
  void tick.value // reactive dependency for re-render
  const seconds = (Date.now() - ts) / 1000
  if (seconds < 60) return 'green'
  if (seconds < 300) return 'amber'
  return 'dim'
}

function updateSnapshot(courseCode, newStats) {
  const prev = snapshots.value[courseCode]
  const now = Date.now()

  if (!prev) {
    // First time seeing this course — record baseline, no lastChanged yet
    snapshots.value[courseCode] = {
      stats: newStats,
      lastChanged: null,
      firstStats: { ...newStats },
      firstSeen: now
    }
    return
  }

  // Check if counts differ from previous snapshot
  const changed =
    prev.stats.completedSeeds !== newStats.completedSeeds ||
    prev.stats.legos !== newStats.legos ||
    prev.stats.phrases !== newStats.phrases ||
    prev.stats.seeds !== newStats.seeds ||
    prev.stats.audio !== newStats.audio

  if (changed) {
    // Set firstStats/firstSeen on the first real change (not baseline)
    const firstStats = prev.lastChanged ? prev.firstStats : { ...prev.stats }
    const firstSeen = prev.lastChanged ? prev.firstSeen : now
    snapshots.value[courseCode] = {
      stats: newStats,
      lastChanged: now,
      firstStats,
      firstSeen
    }
  }
  // If not changed, leave lastChanged as-is (will age out after 10 min)
}

async function refreshKnownCourses() {
  // Re-fetch stats for courses we've already seen
  const codes = Object.keys(snapshots.value)
  for (const code of codes) {
    await fetchSingleCourseStats(code)
  }
}

async function detectRecentActivity() {
  // Ask the DB: which courses had seeds built in the last 10 minutes?
  if (!supabase) return
  try {
    const tenMinAgo = new Date(Date.now() - TEN_MINUTES).toISOString()
    const { data, error } = await supabase
      .from('course_seeds')
      .select('course_code, decomposed_at')
      .gte('decomposed_at', tenMinAgo)
      .order('decomposed_at', { ascending: false })

    if (error || !data) return

    // Get unique course codes with recent activity
    const recentCourses = [...new Set(data.map(s => s.course_code))]

    for (const code of recentCourses) {
      // Find the most recent decomposed_at for this course
      const latest = data.find(s => s.course_code === code)
      await fetchSingleCourseStats(code)
      // Set lastChanged to the actual DB timestamp so it shows immediately
      if (snapshots.value[code]) {
        snapshots.value[code].lastChanged = new Date(latest.decomposed_at).getTime()
      }
    }
  } catch (err) {
    console.warn('[Activity] detectRecentActivity failed:', err.message)
  }
}

async function fetchSingleCourseStats(courseCode) {
  try {
    const stats = await getCourseStats(courseCode)
    updateSnapshot(courseCode, {
      seeds: stats.seeds || 0,
      completedSeeds: stats.completeSeeds || 0,
      legos: stats.legos || 0,
      phrases: stats.practicePhrases || 0,
      audio: stats.audio || 0
    })
  } catch (err) {
    console.warn(`[Activity] Failed to fetch stats for ${courseCode}:`, err.message)
  }
}

function setupRealtime() {
  if (!supabase) return

  const tables = ['course_seeds', 'course_legos', 'course_practice_phrases']
  for (const table of tables) {
    const channel = supabase
      .channel(`activity-${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        const courseCode = payload.new?.course_code || payload.old?.course_code
        if (courseCode) {
          fetchSingleCourseStats(courseCode)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          realtimeConnected.value = true
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
  // Check DB for courses with recent activity (so page isn't empty after refresh)
  await detectRecentActivity()
  setupRealtime()
  // Poll every 30s as fallback
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
  background: #0f172a;
  color: #e2e8f0;
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
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
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
  color: #94a3b8;
  transition: color 0.15s;
}

.back-link:hover {
  color: #e2e8f0;
}

.back-link svg {
  width: 1.25rem;
  height: 1.25rem;
}

.header-titles {
  display: flex;
  flex-direction: column;
}

.page-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #f1f5f9;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 0.8rem;
  color: #64748b;
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
  background: #64748b;
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
  color: #64748b;
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

.empty-state {
  text-align: center;
  padding: 4rem 1rem;
  color: #64748b;
  font-size: 0.9rem;
}

/* Course cards */
.course-row {
  display: flex;
  align-items: stretch;
  gap: 0;
  margin-bottom: 0.625rem;
  border-radius: 10px;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.1);
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
  cursor: pointer;
  overflow: hidden;
}

.course-row:hover {
  background: rgba(30, 41, 59, 0.85);
  border-color: rgba(255, 166, 48, 0.25);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  transform: translateY(-1px);
}

/* Left accent bar — green pulse when active */
.course-row::before {
  content: '';
  width: 3px;
  flex-shrink: 0;
  background: #10b981;
  border-radius: 10px 0 0 10px;
  animation: accent-pulse 2s ease-in-out infinite;
}

@keyframes accent-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
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
  color: #ffa630;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.course-code {
  font-size: 0.6875rem;
  color: #64748b;
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
  color: #94a3b8;
  white-space: nowrap;
}

.stat-num {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  color: #e2e8f0;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.stat-sep {
  color: #334155;
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
  color: #64748b;
}

.delta {
  font-size: 0.6875rem;
  color: #34d399;
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-weight: 500;
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
