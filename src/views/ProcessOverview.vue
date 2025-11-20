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
            <p>The SSi Course Production system uses APML v8.2.1 specification to generate complete language courses from canonical seed pairs through a streamlined microservices pipeline with integrated Phase 6, self-contained documentation, and human quality review strategy.</p>

            <div class="bg-slate-900/50 border border-emerald-500/30 rounded p-4 my-4">
              <p class="text-xs text-slate-400 mb-1">Build: <span class="text-emerald-400 font-mono">7646bca3</span></p>
              <p class="text-xs text-slate-400">APML: <span class="text-emerald-400">v8.2.1</span> | Phase Intelligence: <span class="text-emerald-400">1 v2.6, 3 v7.1 (includes 6 v2.1), 5 v6.1, 7 v1.1, 8 v1.1 🔒</span></p>
              <p class="text-xs text-amber-400 mt-1">⚠️ Phase 5.5 deprecated - human review for first 100 seeds</p>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Architecture Overview</h3>
            <ul class="space-y-2">
              <li><strong>Dashboard → ngrok → automation_server.cjs → osascript → Claude Code agents</strong></li>
              <li><strong>v7.7+ Format:</strong> Compact JSON files (seed_pairs.json, lego_pairs.json, lego_baskets.json)</li>
              <li><strong>Batch-Aware Generation:</strong> Each batch reads validator output and self-corrects</li>
              <li><strong>Pattern Coverage:</strong> Validators measure LEGO combination diversity, feed next batch</li>
              <li><strong>VFS Structure:</strong> vfs/courses/{course_code}/ with v7.7 format files</li>
              <li><strong>Immutable Contract:</strong> Phase 7 transforms to fixed app manifest format</li>
            </ul>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Active Phase Flow</h3>
            <div class="space-y-4 mt-4">
              <router-link to="/intelligence" class="block bg-slate-900/80 border border-slate-400/20 hover:border-emerald-500/50 rounded p-4 transition group">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-emerald-300">Phase 1: Pedagogical Translation <span class="text-xs text-emerald-400">v2.6 🔒</span></h4>
                    <p class="text-sm text-slate-400 mt-1">Input: canonical_seeds.json → Output: seed_pairs.json (TWO ABSOLUTE RULES, synonym flexibility)</p>
                  </div>
                  <span class="text-emerald-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </router-link>
              <router-link to="/intelligence" class="block bg-slate-900/80 border border-emerald-500/50 hover:border-emerald-400 rounded p-4 transition group">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-emerald-300">Phase 3: LEGO Extraction (includes Phase 6) <span class="text-xs text-emerald-400">v7.1 🔒</span></h4>
                    <p class="text-sm text-slate-400 mt-1">Input: seed_pairs.json → Output: lego_pairs.json + introductions.json (dual output, &lt;1s overhead)</p>
                  </div>
                  <span class="text-emerald-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </router-link>
              <router-link to="/intelligence" class="block bg-slate-900/80 border border-slate-400/20 hover:border-emerald-500/50 rounded p-4 transition group">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-emerald-300">Phase 5: Basket Generation <span class="text-xs text-emerald-400">v6.1 🔒</span></h4>
                    <p class="text-sm text-slate-400 mt-1">Input: lego_pairs.json → Output: lego_baskets.json (practice phrase generation)</p>
                  </div>
                  <span class="text-emerald-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </router-link>
              <router-link to="/intelligence" class="block bg-slate-900/80 border border-slate-400/20 hover:border-amber-500/50 rounded p-4 transition group">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-amber-300">Phase 7: Compilation <span class="text-xs text-amber-400">v1.1 🔒</span></h4>
                    <p class="text-sm text-slate-400 mt-1">Input: all phase outputs → Output: course_manifest.json (with duration placeholders for Phase 8)</p>
                  </div>
                  <span class="text-amber-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </router-link>
              <router-link to="/intelligence" class="block bg-slate-900/80 border border-slate-400/20 hover:border-purple-500/50 rounded p-4 transition group">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-purple-300">Phase 8: Audio Generation <span class="text-xs text-purple-400">v1.1 📋</span></h4>
                    <p class="text-sm text-slate-400 mt-1">Input: course_manifest.json → Output: audio/*.mp3 + duration population (assigned to Kai)</p>
                  </div>
                  <span class="text-purple-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </router-link>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Key Features in v8.2.1</h3>
            <ul class="space-y-2">
              <li><strong>Phase 5.5 Deprecated (NEW in v8.2.1):</strong> Automated grammar validation removed. Human review strategy for first 100 seeds (~20k phrases). Ship faster, iterate based on real usage.</li>
              <li><strong>Phase 3 v7.1 Complete:</strong> Hierarchical lego_pairs.json (seed_pair → legos) with 668 seeds, 2,965 unique LEGOs, zero Pragmatic FD violations, includes integrated Phase 6 (<1s overhead)</li>
              <li><strong>Overlapping LEGOs:</strong> Chunks share components for maximum recombination power (e.g., "tardaron" in multiple LEGOs)</li>
              <li><strong>Two Heuristics Edition:</strong> Remove learner uncertainty + Maximize patterns with minimum vocab</li>
              <li><strong>Batch-Aware Generation:</strong> Phase 5 reads validator output from previous batches, targets pattern gaps</li>
              <li><strong>Self-Healing Pattern Coverage:</strong> Each batch improves on previous weaknesses (missing edges, underused LEGOs)</li>
              <li><strong>Course Validators:</strong> 3 validators measure vocabulary, patterns, completeness (0-100% score)</li>
              <li><strong>Literal Componentization:</strong> M-type LEGOs show word-by-word mappings with compact component arrays</li>
              <li><strong>Synonym Flexibility:</strong> Canonical known uses natural wording, target uses cognates, Phase 6 reveals synonyms</li>
              <li><strong>Manifest Format v1.1:</strong> Phase 7 creates duration placeholders (0) and introduction field for Phase 8 population</li>
              <li><strong>Architectural Boundary:</strong> Phases 1-5 evolvable 🔒, Phase 6 integrated into Phase 3 🔗, Phase 7+ immutable contract 🔐</li>
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
