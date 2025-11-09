<template>
  <div class="min-h-screen bg-slate-900">
    <!-- Header -->
    <header class="bg-slate-800/50 border-b border-slate-400/10 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-3xl font-bold text-emerald-400">
              SSI Course Production Dashboard v7.8.4
            </h1>
            <p class="mt-2 text-slate-400">
              Phase 4 Architecture + Intelligent Course Detection + Dynamic Phase Tracking
            </p>
            <p class="mt-1 text-xs text-slate-500">
              Build: 9a332af7 | APML v7.8.4 | Phases: 1 v2.6, 3 v4.0.2, 4 v1.0, 5 v3.0, 6 v2.0, 7 v1.0
            </p>
          </div>
          <EnvironmentSwitcher />
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <!-- User Workflow -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-6">User Workflow</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Generate New Course -->
          <router-link to="/generate" class="block bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg border border-emerald-400/20 p-8 transition hover:-translate-y-1 shadow-lg hover:shadow-emerald-500/20">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-2xl font-bold text-white mb-2">🚀 Generate New Course</h3>
                <p class="text-emerald-100 text-sm">
                  Start the complete 8-phase pipeline to generate a new language course
                </p>
              </div>
              <div class="text-white">
                <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                </svg>
              </div>
            </div>
          </router-link>

          <!-- Browse Existing Courses -->
          <router-link to="/courses" class="block bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 border border-slate-500/30 rounded-lg p-8 transition hover:-translate-y-1 shadow-lg hover:shadow-slate-500/20">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-2xl font-bold text-emerald-400 mb-2">📚 Browse & Compile Courses</h3>
                <p class="text-slate-300 text-sm">
                  View, edit, compile courses and generate audio for app deployment
                </p>
              </div>
              <div class="text-emerald-400">
                <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
              </div>
            </div>
          </router-link>
        </div>
      </section>

      <!-- Pipeline Architecture -->
      <section class="mt-12">
        <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8">
          <h2 class="text-2xl font-semibold text-slate-100 mb-6">Pipeline Architecture</h2>

          <div class="space-y-6">
            <!-- Architecture Description -->
            <div class="bg-slate-900/50 rounded-lg p-6">
              <p class="text-slate-300 mb-4">
                The SSI Course Production Pipeline uses a streamlined orchestrator-based architecture with inline prompts for each phase.
              </p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <span class="text-slate-300">Phase orchestrators with embedded methodology</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span class="text-slate-300">Claude Code agents - no sub-agent spawning</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span class="text-slate-300">Phase Intelligence as single source of truth</span>
                  </div>
                </div>
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span class="text-slate-300">Atomic VFS operations for reliability</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-pink-500 rounded-full"></div>
                    <span class="text-slate-300">Progressive compilation with validation</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-teal-500 rounded-full"></div>
                    <span class="text-slate-300">Real-time dashboard editing & preview</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Phase Flow -->
            <div class="flex items-center justify-center gap-2 overflow-x-auto pb-4">
              <!-- Phase 1 -->
              <div class="flex items-center flex-shrink-0">
                <div class="w-28 h-28 rounded-lg border-2 border-blue-500 bg-blue-500/10 flex flex-col items-center justify-center">
                  <div class="text-blue-400 font-bold text-2xl">1</div>
                  <div class="text-blue-300 text-xs mt-1 px-2 text-center">Translation</div>
                </div>
                <svg class="w-6 h-6 mx-1" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14m-6-6l6 6-6 6" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>

              <!-- Phase 3 -->
              <div class="flex items-center flex-shrink-0">
                <div class="w-28 h-28 rounded-lg border-2 border-purple-500 bg-purple-500/10 flex flex-col items-center justify-center">
                  <div class="text-purple-400 font-bold text-2xl">3</div>
                  <div class="text-purple-300 text-xs mt-1 px-2 text-center">LEGO Extraction</div>
                </div>
                <svg class="w-6 h-6 mx-1" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14m-6-6l6 6-6 6" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>

              <!-- Phase 4 -->
              <div class="flex items-center flex-shrink-0">
                <div class="w-28 h-28 rounded-lg border-2 border-indigo-500 bg-indigo-500/10 flex flex-col items-center justify-center">
                  <div class="text-indigo-400 font-bold text-2xl">4</div>
                  <div class="text-indigo-300 text-xs mt-1 px-2 text-center">Deduplication</div>
                </div>
                <svg class="w-6 h-6 mx-1" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14m-6-6l6 6-6 6" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>

              <!-- Phase 5 -->
              <div class="flex items-center flex-shrink-0">
                <div class="w-28 h-28 rounded-lg border-2 border-pink-500 bg-pink-500/10 flex flex-col items-center justify-center">
                  <div class="text-pink-400 font-bold text-2xl">5</div>
                  <div class="text-pink-300 text-xs mt-1 px-2 text-center">Baskets</div>
                </div>
                <svg class="w-6 h-6 mx-1" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14m-6-6l6 6-6 6" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>

              <!-- Phase 6 -->
              <div class="flex items-center flex-shrink-0">
                <div class="w-28 h-28 rounded-lg border-2 border-orange-500 bg-orange-500/10 flex flex-col items-center justify-center">
                  <div class="text-orange-400 font-bold text-2xl">6</div>
                  <div class="text-orange-300 text-xs mt-1 px-2 text-center">Introductions</div>
                </div>
                <svg class="w-6 h-6 mx-1" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14m-6-6l6 6-6 6" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>

              <!-- Phase 7 -->
              <div class="flex items-center flex-shrink-0">
                <div class="w-28 h-28 rounded-lg border-2 border-teal-500 bg-teal-500/10 flex flex-col items-center justify-center">
                  <div class="text-teal-400 font-bold text-2xl">7</div>
                  <div class="text-teal-300 text-xs mt-1 px-2 text-center">Compilation</div>
                </div>
                <svg class="w-6 h-6 mx-1" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14m-6-6l6 6-6 6" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>

              <!-- Phase 8 -->
              <div class="flex items-center flex-shrink-0">
                <div class="w-28 h-28 rounded-lg border-2 border-emerald-500 bg-emerald-500/10 flex flex-col items-center justify-center">
                  <div class="text-emerald-400 font-bold text-2xl">8</div>
                  <div class="text-emerald-300 text-xs mt-1 px-2 text-center">Audio</div>
                </div>
              </div>
            </div>

            <!-- Stats -->
            <div class="grid grid-cols-3 gap-4 text-center">
              <div class="bg-slate-900/50 rounded-lg p-4">
                <div class="text-3xl font-bold text-emerald-400">8</div>
                <div class="text-sm text-slate-400 mt-1">Pipeline Phases</div>
              </div>
              <div class="bg-slate-900/50 rounded-lg p-4">
                <div class="text-3xl font-bold text-purple-400">0</div>
                <div class="text-sm text-slate-400 mt-1">Sub-Agents Spawned</div>
              </div>
              <div class="bg-slate-900/50 rounded-lg p-4">
                <div class="text-3xl font-bold text-blue-400">1</div>
                <div class="text-sm text-slate-400 mt-1">Agent per Phase</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Reference Materials -->
      <section>
        <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8">
          <h2 class="text-2xl font-semibold text-slate-100 mb-2">Reference Materials</h2>
          <p class="text-slate-400 mb-6">Supporting documentation and data sources:</p>

          <div class="space-y-4">
            <!-- Complete Process Overview -->
            <router-link to="/reference/overview" class="flex items-center gap-4 p-4 bg-slate-900/80 border border-slate-400/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="text-3xl">📚</div>
              <div>
                <h3 class="font-semibold text-slate-100">Complete Process Overview</h3>
                <p class="text-sm text-slate-400">Comprehensive documentation of the entire SSI Course Production pipeline - all phases in detail</p>
              </div>
            </router-link>

            <!-- Phase Intelligence -->
            <router-link to="/intelligence" class="flex items-center gap-4 p-4 bg-slate-900/80 border border-emerald-400/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="text-3xl">🧠</div>
              <div>
                <h3 class="font-semibold text-emerald-400">Phase Intelligence Modules</h3>
                <p class="text-sm text-slate-400">Live methodology for each phase - the single source of truth with embedded inline prompts</p>
              </div>
            </router-link>

            <!-- Canonical Seeds -->
            <router-link to="/reference/seeds" class="flex items-center gap-4 p-4 bg-slate-900/80 border border-slate-400/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="text-3xl">🌱</div>
              <div>
                <h3 class="font-semibold text-slate-100">Canonical Seeds</h3>
                <p class="text-sm text-slate-400">All 668 canonical seeds (16 years empirical optimization)</p>
              </div>
            </router-link>

            <!-- APML v7.6 Specification -->
            <router-link to="/reference/apml" class="flex items-center gap-4 p-4 bg-slate-900/80 border border-slate-400/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="text-3xl">📋</div>
              <div>
                <h3 class="font-semibold text-slate-100">APML v7.6 Specification</h3>
                <p class="text-sm text-slate-400">Complete architectural specification with streamlined 5-phase pipeline</p>
              </div>
            </router-link>

            <!-- Terminology Glossary -->
            <router-link to="/reference/terminology" class="flex items-center gap-4 p-4 bg-slate-900/80 border border-slate-400/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="text-3xl">📖</div>
              <div>
                <h3 class="font-semibold text-slate-100">Terminology Glossary</h3>
                <p class="text-sm text-slate-400">SEED_PAIRS, LEGO_PAIRS, LEGO_BASKETS - single source of truth for all terminology</p>
              </div>
            </router-link>

            <!-- Pedagogical Model -->
            <router-link to="/reference/pedagogy" class="flex items-center gap-4 p-4 bg-slate-900/80 border border-slate-400/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="text-3xl">🎓</div>
              <div>
                <h3 class="font-semibold text-slate-100">Pedagogical Model</h3>
                <p class="text-sm text-slate-400">LEGOs, Baskets, Eternal vs Debut - the "why" behind the SSi teaching system</p>
              </div>
            </router-link>
          </div>
        </div>
      </section>

      <!-- Footer Note -->
      <div class="mt-12 text-center text-slate-400 text-sm">
        <p>SSi Course Production Dashboard v7.6 • Complete 8-Phase Pipeline</p>
        <p class="mt-1">Translation → LEGOs → Baskets → Introductions → Compilation → Audio → Deploy</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import EnvironmentSwitcher from '../components/EnvironmentSwitcher.vue'

console.log('🚀 Dashboard View Loaded')
</script>
