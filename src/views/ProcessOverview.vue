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
            <p>The SSi Course Production system uses APML v7.0 specification to generate complete language courses from canonical seed pairs through an 8-phase pipeline.</p>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Architecture Overview</h3>
            <ul class="space-y-2">
              <li><strong>Dashboard → ngrok → automation_server.js → osascript → Claude Code agents</strong></li>
              <li><strong>Amino Acid Storage Model:</strong> Discrete components (translations, LEGOs, baskets) stored as immutable amino acids</li>
              <li><strong>Protein Compilation:</strong> Amino acids compile into manifest proteins (final courses)</li>
              <li><strong>Deterministic UUIDs:</strong> Content-based UUIDs for all amino acids enable edit propagation</li>
              <li><strong>VFS Structure:</strong> Local virtual file system with amino_acids/ and proteins/ directories</li>
            </ul>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Phase Flow</h3>
            <div class="space-y-4 mt-4">
              <router-link to="/phase/0" class="block bg-slate-900/80 border border-slate-400/20 hover:border-emerald-500/50 rounded p-4 transition group">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-emerald-300">Phase 0: Corpus Pre-Analysis</h4>
                    <p class="text-sm text-slate-400 mt-1">Input: Source corpus → Output: Intelligence report (frequency, complexity)</p>
                  </div>
                  <span class="text-emerald-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </router-link>
              <router-link to="/phase/1" class="block bg-slate-900/80 border border-slate-400/20 hover:border-emerald-500/50 rounded p-4 transition group">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-emerald-300">Phase 1: Pedagogical Translation</h4>
                    <p class="text-sm text-slate-400 mt-1">Input: 574 seed pairs + intelligence → Output: Translation amino acids</p>
                  </div>
                  <span class="text-emerald-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </router-link>
              <router-link to="/phase/2" class="block bg-slate-900/80 border border-slate-400/20 hover:border-emerald-500/50 rounded p-4 transition group">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-emerald-300">Phase 2: Corpus Intelligence</h4>
                    <p class="text-sm text-slate-400 mt-1">Input: Translations → Output: FCFS mappings + utility scores</p>
                  </div>
                  <span class="text-emerald-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </router-link>
              <router-link to="/phase/3" class="block bg-slate-900/80 border border-slate-400/20 hover:border-emerald-500/50 rounded p-4 transition group">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-emerald-300">Phase 3: LEGO Extraction</h4>
                    <p class="text-sm text-slate-400 mt-1">Input: Translations + corpus intelligence → Output: LEGO amino acids with provenance</p>
                  </div>
                  <span class="text-emerald-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </router-link>
              <router-link to="/phase/3.5" class="block bg-slate-900/80 border border-slate-400/20 hover:border-emerald-500/50 rounded p-4 transition group">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-emerald-300">Phase 3.5: Graph Construction (NEW v7.0)</h4>
                    <p class="text-sm text-slate-400 mt-1">Input: LEGO amino acids → Output: Adjacency graph with edges</p>
                  </div>
                  <span class="text-emerald-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </router-link>
              <router-link to="/phase/4" class="block bg-slate-900/80 border border-slate-400/20 hover:border-emerald-500/50 rounded p-4 transition group">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-emerald-300">Phase 4: Deduplication</h4>
                    <p class="text-sm text-slate-400 mt-1">Input: LEGO amino acids → Output: Deduplicated LEGOs with merged provenance</p>
                  </div>
                  <span class="text-emerald-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </router-link>
              <router-link to="/phase/5" class="block bg-slate-900/80 border border-slate-400/20 hover:border-emerald-500/50 rounded p-4 transition group">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-emerald-300">Phase 5: Pattern-Aware Baskets</h4>
                    <p class="text-sm text-slate-400 mt-1">Input: Deduplicated LEGOs + graph → Output: Basket amino acids</p>
                  </div>
                  <span class="text-emerald-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </router-link>
              <router-link to="/phase/6" class="block bg-slate-900/80 border border-slate-400/20 hover:border-emerald-500/50 rounded p-4 transition group">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-emerald-300">Phase 6: Introductions</h4>
                    <p class="text-sm text-slate-400 mt-1">Input: Baskets → Output: Known-only introduction phrases</p>
                  </div>
                  <span class="text-emerald-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </router-link>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Key Innovations in v7.0</h3>
            <ul class="space-y-2">
              <li><strong>Graph Intelligence (Phase 3.5):</strong> LEGO adjacency edges for pattern coverage</li>
              <li><strong>Amino Acid Storage:</strong> Immutable discrete components enable surgical edits</li>
              <li><strong>Pattern-Aware Baskets:</strong> Replaces DEBUT/ETERNAL with graph-driven edge coverage</li>
              <li><strong>Provenance Tracking:</strong> S{seed}L{position} format preserves birth-parent relationships</li>
              <li><strong>Deterministic UUIDs:</strong> Content-based UUIDs enable automatic edit propagation</li>
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
