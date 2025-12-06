<template>
  <div class="min-h-screen bg-slate-900">
    <!-- Header -->
    <header class="bg-slate-800/50 border-b border-slate-400/10 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div>
          <h1 class="text-4xl font-bold text-emerald-400">
            Mission Control
          </h1>
          <p class="mt-2 text-lg text-slate-300">
            SSi Course Production
          </p>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      <!-- Main Action Cards -->
      <section class="mb-16">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">

          <!-- Course Library Card -->
          <router-link
            to="/courses"
            class="group relative bg-gradient-to-br from-slate-800 to-slate-800/80 hover:from-slate-700 hover:to-slate-700/80 rounded-xl border border-slate-600/50 hover:border-emerald-500/50 p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10"
          >
            <div class="flex flex-col h-full">
              <!-- Icon -->
              <div class="flex items-center justify-between mb-4">
                <div class="w-14 h-14 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                  <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                  </svg>
                </div>
                <!-- Course Count Badge -->
                <div v-if="!loadingCourses" class="px-3 py-1 rounded-full bg-slate-700/50 border border-slate-600/50 text-sm font-semibold text-slate-300">
                  {{ courseCount }}
                </div>
                <div v-else class="w-12 h-6 rounded-full bg-slate-700/50 animate-pulse"></div>
              </div>

              <!-- Content -->
              <div class="flex-1">
                <h2 class="text-2xl font-bold text-emerald-400 mb-3">Course Library</h2>
                <p class="text-slate-400 text-sm leading-relaxed">
                  Edit existing courses at whatever stage they're at
                </p>
              </div>

              <!-- Arrow indicator -->
              <div class="mt-6 text-slate-500 group-hover:text-emerald-400 transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                </svg>
              </div>
            </div>
          </router-link>

          <!-- New Course Card -->
          <router-link
            to="/courses/new"
            class="group relative bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 rounded-xl border border-emerald-400/30 hover:border-emerald-400/60 p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/30"
          >
            <div class="flex flex-col h-full">
              <!-- Icon -->
              <div class="flex items-center justify-between mb-4">
                <div class="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center text-white group-hover:bg-white/20 transition-colors">
                  <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                </div>
              </div>

              <!-- Content -->
              <div class="flex-1">
                <h2 class="text-2xl font-bold text-white mb-3">New Course</h2>
                <p class="text-emerald-100 text-sm leading-relaxed">
                  Create a new course from scratch
                </p>
              </div>

              <!-- Arrow indicator -->
              <div class="mt-6 text-emerald-200 group-hover:text-white transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                </svg>
              </div>
            </div>
          </router-link>

          <!-- All Docs Card -->
          <router-link
            to="/docs"
            class="group relative bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-xl border border-purple-400/30 hover:border-purple-400/60 p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/30"
          >
            <div class="flex flex-col h-full">
              <!-- Icon -->
              <div class="flex items-center justify-between mb-4">
                <div class="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center text-white group-hover:bg-white/20 transition-colors">
                  <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
              </div>

              <!-- Content -->
              <div class="flex-1">
                <h2 class="text-2xl font-bold text-white mb-3">All Docs</h2>
                <p class="text-purple-100 text-sm leading-relaxed">
                  APML Spec, Methodology, Phase Intelligence, Pedagogy
                </p>
              </div>

              <!-- Arrow indicator -->
              <div class="mt-6 text-purple-200 group-hover:text-white transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                </svg>
              </div>
            </div>
          </router-link>

        </div>
      </section>

      <!-- Recent Activity Section -->
      <section>
        <div class="bg-slate-800/50 rounded-xl border border-slate-400/20 p-8">
          <h2 class="text-2xl font-semibold text-slate-100 mb-6">Recent Activity</h2>

          <!-- Loading State -->
          <div v-if="loadingActivity" class="space-y-4">
            <div v-for="i in 3" :key="i" class="bg-slate-900/50 rounded-lg p-4 animate-pulse">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-slate-700 rounded-full"></div>
                <div class="flex-1 space-y-2">
                  <div class="h-4 bg-slate-700 rounded w-1/3"></div>
                  <div class="h-3 bg-slate-700 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Activity Items -->
          <div v-else-if="recentActivity.length > 0" class="space-y-3">
            <div
              v-for="activity in recentActivity"
              :key="activity.id"
              class="flex items-center gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors"
            >
              <!-- Activity Icon -->
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                :class="getActivityIconClass(activity.type)"
              >
                <span class="text-lg">{{ getActivityIcon(activity.type) }}</span>
              </div>

              <!-- Activity Details -->
              <div class="flex-1 min-w-0">
                <p class="text-slate-300 font-medium truncate">
                  {{ activity.description }}
                </p>
                <p class="text-sm text-slate-500 mt-1">
                  {{ formatTime(activity.timestamp) }}
                </p>
              </div>

              <!-- Course Badge -->
              <div
                v-if="activity.courseCode"
                class="px-3 py-1 bg-slate-800 border border-slate-600 rounded-full text-xs font-mono text-slate-400"
              >
                {{ activity.courseCode }}
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="text-center py-12">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700/50 flex items-center justify-center">
              <svg class="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <p class="text-slate-400 mb-4">No recent activity</p>
            <p class="text-sm text-slate-500">
              Course updates and generation progress will appear here
            </p>
          </div>
        </div>
      </section>

    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'

const router = useRouter()

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

// Load recent activity (placeholder data for now)
async function loadRecentActivity() {
  loadingActivity.value = true
  try {
    // TODO: Replace with actual API call when backend supports activity feed
    // For now, using placeholder data
    await new Promise(resolve => setTimeout(resolve, 500))

    recentActivity.value = [
      {
        id: 1,
        type: 'course_update',
        description: 'Updated lego_pairs.json',
        courseCode: 'spa_for_eng',
        timestamp: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
      },
      {
        id: 2,
        type: 'phase_complete',
        description: 'Phase 3 (Basket Generation) completed',
        courseCode: 'fra_for_eng',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
      },
      {
        id: 3,
        type: 'course_create',
        description: 'New course created',
        courseCode: 'cmn_for_eng',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24) // 1 day ago
      }
    ]
  } catch (err) {
    console.error('Failed to load recent activity:', err)
    recentActivity.value = []
  } finally {
    loadingActivity.value = false
  }
}

// Get activity icon based on type
function getActivityIcon(type) {
  const icons = {
    course_update: '📝',
    phase_complete: '✅',
    course_create: '🆕',
    audio_generate: '🎵',
    manifest_compile: '📦'
  }
  return icons[type] || '•'
}

// Get activity icon background class
function getActivityIconClass(type) {
  const classes = {
    course_update: 'bg-blue-500/20 text-blue-400',
    phase_complete: 'bg-emerald-500/20 text-emerald-400',
    course_create: 'bg-purple-500/20 text-purple-400',
    audio_generate: 'bg-pink-500/20 text-pink-400',
    manifest_compile: 'bg-amber-500/20 text-amber-400'
  }
  return classes[type] || 'bg-slate-700 text-slate-400'
}

// Format timestamp
function formatTime(timestamp) {
  const now = new Date()
  const diff = now - new Date(timestamp)
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  return 'Just now'
}

onMounted(async () => {
  await Promise.all([
    loadCourseCount(),
    loadRecentActivity()
  ])
})

console.log('🎯 Mission Control View Loaded')
</script>
