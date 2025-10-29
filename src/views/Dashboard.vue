<template>
  <div class="min-h-screen bg-slate-900">
    <!-- Header -->
    <header class="bg-slate-800/50 border-b border-slate-400/10 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 class="text-3xl font-bold text-emerald-400">
          SSI Course Production Dashboard v7.8.3
        </h1>
        <p class="mt-2 text-slate-400">
          Phase 3 v4.0.2 (simplified) + Smart Resume
        </p>
        <p class="mt-1 text-xs text-slate-500">
          Build: cb4aa8b9 | APML v7.8.3 | Phase 3 v4.0.2 🔒
        </p>
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

      <!-- AI Agent Training (Phase Instructions) -->
      <section class="mb-12">
        <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8">
          <h2 class="text-2xl font-semibold text-slate-100 mb-2">AI Agent Training (Phase Instructions)</h2>
          <p class="text-slate-400 mb-6">Runtime prompts Claude visits during course generation - Single Source of Truth:</p>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Phase 1 -->
            <router-link to="/phase/1" class="flex items-center gap-3 p-4 bg-slate-900/80 border border-slate-400/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-slate-900">
                1
              </div>
              <div>
                <h3 class="font-semibold text-slate-100">Translation</h3>
                <p class="text-sm text-slate-400">6 heuristics</p>
              </div>
            </router-link>

            <!-- Phase 3 -->
            <router-link to="/phase/3" class="flex items-center gap-3 p-4 bg-slate-900/80 border border-slate-400/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-slate-900">
                3
              </div>
              <div>
                <h3 class="font-semibold text-slate-100">LEGO Breakdown</h3>
                <p class="text-sm text-slate-400">BASE/COMPOSITE</p>
              </div>
            </router-link>

            <!-- Phase 5 -->
            <router-link to="/phase/5" class="flex items-center gap-3 p-4 bg-slate-900/80 border border-slate-400/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-slate-900">
                5
              </div>
              <div>
                <h3 class="font-semibold text-slate-100">Basket Gen</h3>
                <p class="text-sm text-slate-400">e + d phrases</p>
              </div>
            </router-link>

            <!-- Phase 5.5 -->
            <router-link to="/phase/5.5" class="flex items-center gap-3 p-4 bg-slate-900/80 border border-slate-400/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-slate-900 text-xs">
                5.5
              </div>
              <div>
                <h3 class="font-semibold text-slate-100">Deduplication</h3>
                <p class="text-sm text-slate-400">Provenance</p>
              </div>
            </router-link>

            <!-- Phase 6 -->
            <router-link to="/phase/6" class="flex items-center gap-3 p-4 bg-slate-900/80 border border-slate-400/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-slate-900">
                6
              </div>
              <div>
                <h3 class="font-semibold text-slate-100">Introductions</h3>
                <p class="text-sm text-slate-400">Contextual</p>
              </div>
            </router-link>

            <!-- Phase 7 -->
            <router-link to="/phase/7" class="flex items-center gap-3 p-4 bg-slate-900/80 border border-blue-400/20 rounded-lg hover:border-blue-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center font-bold text-slate-900">
                7
              </div>
              <div>
                <h3 class="font-semibold text-slate-100">Compilation</h3>
                <p class="text-sm text-slate-400">To app JSON</p>
              </div>
            </router-link>

            <!-- Phase 8 -->
            <router-link to="/phase/8" class="flex items-center gap-3 p-4 bg-slate-900/80 border border-blue-400/20 rounded-lg hover:border-blue-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center font-bold text-slate-900">
                8
              </div>
              <div>
                <h3 class="font-semibold text-slate-100">Audio Gen</h3>
                <p class="text-sm text-slate-400">TTS + S3</p>
              </div>
            </router-link>
          </div>
        </div>
      </section>

      <!-- Visualization Tools -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-6">Visualization Tools</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">

          <!-- SEED → LEGO Breakdown (Spanish) -->
          <router-link to="/courses/spa_for_eng_30seeds"
                       class="bg-slate-800/50 border border-slate-400/20 rounded-lg p-6 hover:border-emerald-500/50 transition group">
            <div class="flex items-center gap-3 mb-3">
              <svg class="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/>
              </svg>
              <h3 class="text-xl font-semibold text-slate-100">SEED → LEGO Breakdown</h3>
            </div>
            <p class="text-slate-400 mb-4">
              How SEED_PAIRS decompose into LEGO_PAIRS (Spanish course example)
            </p>
            <div class="text-emerald-400 group-hover:translate-x-1 transition">
              View Spanish Course →
            </div>
          </router-link>

          <!-- LEGO Basket Phrases (Italian) -->
          <router-link to="/courses/ita_for_eng_30seeds"
                       class="bg-slate-800/50 border border-slate-400/20 rounded-lg p-6 hover:border-emerald-500/50 transition group">
            <div class="flex items-center gap-3 mb-3">
              <svg class="w-8 h-8 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
              </svg>
              <h3 class="text-xl font-semibold text-slate-100">LEGO Basket Phrases</h3>
            </div>
            <p class="text-slate-400 mb-4">
              Eternal & debut practice phrases for each LEGO (Italian - 115 baskets!)
            </p>
            <div class="text-emerald-400 group-hover:translate-x-1 transition">
              View Italian Course →
            </div>
          </router-link>

          <!-- Complete Course View (French) -->
          <router-link to="/courses/fra_for_eng_30seeds"
                       class="bg-slate-800/50 border border-slate-400/20 rounded-lg p-6 hover:border-emerald-500/50 transition group">
            <div class="flex items-center gap-3 mb-3">
              <svg class="w-8 h-8 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              <h3 class="text-xl font-semibold text-slate-100">Complete Course View</h3>
            </div>
            <p class="text-slate-400 mb-4">
              Full editor with all tabs: SEED_PAIRS, LEGO_PAIRS, LEGO_BASKETS (French course)
            </p>
            <div class="text-emerald-400 group-hover:translate-x-1 transition">
              View French Course →
            </div>
          </router-link>

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
                <p class="text-sm text-slate-400">Live methodology for each phase - the single source of truth agents read during runtime</p>
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
console.log('🚀 Dashboard View Loaded')
</script>
