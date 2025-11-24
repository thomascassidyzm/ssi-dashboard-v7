<template>
  <div class="min-h-screen bg-slate-900">
    <!-- Header -->
    <header class="bg-slate-800/50 border-b border-slate-400/10 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <router-link to="/" class="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition mb-4">
          <span>←</span>
          <span>Back to Dashboard</span>
        </router-link>
        <h1 class="text-3xl font-bold text-emerald-400">
          Complete Process Overview
        </h1>
        <p class="mt-2 text-slate-400">
          Comprehensive documentation of the entire SSi Course Production pipeline
        </p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <!-- Active Generations Section -->
      <div v-if="activeCourses.length > 0" class="mb-8 bg-slate-800/50 rounded-lg border border-emerald-500/30 p-6">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-4">Active Course Generations</h2>
        <div class="space-y-4">
          <div v-for="course in activeCourses" :key="course.courseCode"
               class="bg-slate-900/80 border border-slate-400/20 rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
              <div>
                <h3 class="text-lg font-semibold text-slate-100">{{ course.courseCode }}</h3>
                <p class="text-sm text-slate-400">{{ course.target }} for {{ course.known }} speakers</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded text-sm font-medium">
                  {{ course.phase || 'Initializing' }}
                </span>
                <router-link :to="`/generate`"
                             class="text-sm text-emerald-400 hover:text-emerald-300">
                  View Details →
                </router-link>
              </div>
            </div>
            <div class="w-full bg-slate-700 rounded-full h-2">
              <div class="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                   :style="{ width: `${course.progress || 0}%` }"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8">

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">End-to-End Pipeline</h2>
          <div class="prose prose-invert prose-emerald max-w-none text-slate-300">
            <p>The SSi Course Production system uses APML v9.0.0 specification to generate complete language courses from canonical seed pairs through a streamlined pipeline. A phase triggers agents. Scripts run instantly.</p>

            <div class="bg-slate-900/50 border border-emerald-500/30 rounded p-4 my-4">
              <p class="text-xs text-slate-400 mb-1">Build: <span class="text-emerald-400 font-mono">v9.0.0</span></p>
              <p class="text-xs text-slate-400">APML: <span class="text-emerald-400">v9.0.0</span> | Pipeline: <span class="text-emerald-400">Phase 1 → Phase 2 → Phase 3 → Manifest → Audio</span></p>
              <p class="text-xs text-emerald-400 mt-1">lego_pairs.json embeds seed_pairs (no separate file)</p>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Architecture Overview</h3>
            <ul class="space-y-2">
              <li><strong>Dashboard → ngrok → automation_server.cjs → osascript → Claude Code agents</strong></li>
              <li><strong>v9.0 Format:</strong> Compact JSON files (lego_pairs.json embeds seed_pairs, lego_baskets.json)</li>
              <li><strong>Batch-Aware Generation:</strong> Each batch reads validator output and self-corrects</li>
              <li><strong>Pattern Coverage:</strong> Validators measure LEGO combination diversity, feed next batch</li>
              <li><strong>VFS Structure:</strong> vfs/courses/{course_code}/ with v9.0 format files</li>
              <li><strong>Manifest Script:</strong> Transforms phase outputs to fixed app manifest format (not a phase)</li>
            </ul>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Active Phase Flow</h3>
            <div class="space-y-4 mt-4">
              <router-link to="/intelligence" class="block bg-slate-900/80 border border-slate-400/20 hover:border-emerald-500/50 rounded p-4 transition group">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-emerald-300">Phase 1: Translation + LEGO Extraction</h4>
                    <p class="text-sm text-slate-400 mt-1">Input: canonical_seeds.json → Output: draft_lego_pairs.json</p>
                  </div>
                  <span class="text-emerald-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </router-link>
              <router-link to="/intelligence" class="block bg-slate-900/80 border border-emerald-500/50 hover:border-emerald-400 rounded p-4 transition group">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-emerald-300">Phase 2: Conflict Resolution</h4>
                    <p class="text-sm text-slate-400 mt-1">Input: draft_lego_pairs.json → Output: lego_pairs.json (intros auto-scripted at end)</p>
                  </div>
                  <span class="text-emerald-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </router-link>
              <router-link to="/intelligence" class="block bg-slate-900/80 border border-slate-400/20 hover:border-emerald-500/50 rounded p-4 transition group">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-emerald-300">Phase 3: Basket Generation</h4>
                    <p class="text-sm text-slate-400 mt-1">Input: lego_pairs.json → Output: lego_baskets.json (DO NOT MODIFY - works perfectly)</p>
                  </div>
                  <span class="text-emerald-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </router-link>
              <router-link to="/intelligence" class="block bg-slate-900/80 border border-slate-400/20 hover:border-amber-500/50 rounded p-4 transition group">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-amber-300">Manifest (Script)</h4>
                    <p class="text-sm text-slate-400 mt-1">Input: all phase outputs → Output: course_manifest.json (runs instantly)</p>
                  </div>
                  <span class="text-amber-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </router-link>
              <router-link to="/intelligence" class="block bg-slate-900/80 border border-slate-400/20 hover:border-purple-500/50 rounded p-4 transition group">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-purple-300">Audio (Separate Process)</h4>
                    <p class="text-sm text-slate-400 mt-1">Input: course_manifest.json → Output: audio/*.mp3</p>
                  </div>
                  <span class="text-purple-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </router-link>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Key Features in v9.0.0</h3>
            <ul class="space-y-2">
              <li><strong>Simplified Pipeline:</strong> Phase 1 → Phase 2 → Phase 3 → Manifest → Audio. A phase triggers agents. Scripts run instantly.</li>
              <li><strong>Embedded Seed Pairs:</strong> lego_pairs.json embeds seed_pairs (no separate file needed)</li>
              <li><strong>Phase 2 Conflict Resolution:</strong> Resolves LEGO conflicts from draft output, auto-scripts intros at end</li>
              <li><strong>Phase 3 Basket Generation:</strong> DO NOT MODIFY - works perfectly</li>
              <li><strong>Overlapping LEGOs:</strong> Chunks share components for maximum recombination power (e.g., "tardaron" in multiple LEGOs)</li>
              <li><strong>Two Heuristics Edition:</strong> Remove learner uncertainty + Maximize patterns with minimum vocab</li>
              <li><strong>Batch-Aware Generation:</strong> Phase 3 reads validator output from previous batches, targets pattern gaps</li>
              <li><strong>Self-Healing Pattern Coverage:</strong> Each batch improves on previous weaknesses (missing edges, underused LEGOs)</li>
              <li><strong>Course Validators:</strong> 3 validators measure vocabulary, patterns, completeness (0-100% score)</li>
              <li><strong>Manifest Script:</strong> Not a phase - transforms outputs to fixed app manifest format instantly</li>
              <li><strong>Audio Process:</strong> Separate from pipeline phases, generates audio/*.mp3 from course_manifest.json</li>
            </ul>
          </div>
        </section>

      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import api from '../services/api'

const activeCourses = ref([])
const loading = ref(false)
let pollInterval = null

// Fetch active course generations
const fetchActiveCourses = async () => {
  try {
    const response = await api.course.list()
    // Filter for courses that are currently in progress
    activeCourses.value = response.courses?.filter(c =>
      c.status === 'in_progress' || c.status === 'generating'
    ) || []
  } catch (error) {
    console.error('Failed to load active courses:', error)
  }
}

// Poll for active courses every 3 seconds
const startPolling = () => {
  fetchActiveCourses()
  pollInterval = setInterval(fetchActiveCourses, 3000)
}

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

onMounted(() => {
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})

console.log('📚 Process Overview Loaded')
</script>
