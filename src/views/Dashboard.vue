<template>
  <div class="min-h-screen bg-slate-900">
    <!-- Header -->
    <header class="bg-slate-800/50 border-b border-slate-400/10 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 class="text-3xl font-bold text-emerald-400">
          SSI Course Production Dashboard v7.6
        </h1>
        <p class="mt-2 text-slate-400">
          Complete training documentation for Claude/Sonnet AI agents
        </p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <!-- Quick Actions -->
      <section class="mb-12 grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Generate New Course -->
        <router-link to="/generate" class="block bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg border border-emerald-400/20 p-8 transition hover:-translate-y-1 shadow-lg hover:shadow-emerald-500/20">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold text-white mb-2">🚀 Generate New Course</h2>
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
              <h2 class="text-2xl font-bold text-emerald-400 mb-2">📚 Browse Courses</h2>
              <p class="text-slate-300 text-sm">
                View, edit, and manage existing courses with provenance tracking
              </p>
            </div>
            <div class="text-emerald-400">
              <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
            </div>
          </div>
        </router-link>
      </section>

      <!-- Quality Review & Self-Healing -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-6">Quality Review & Self-Healing</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">

          <!-- Quality Dashboard Card -->
          <router-link to="/quality/cym_for_eng_574seeds"
                       class="bg-slate-800/50 border border-slate-400/20 rounded-lg p-6 hover:border-emerald-500/50 transition group">
            <div class="flex items-center gap-3 mb-3">
              <svg class="w-8 h-8 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              <h3 class="text-xl font-semibold text-slate-100">Quality Dashboard</h3>
            </div>
            <p class="text-slate-400 mb-4">
              Review extraction quality, flag problematic seeds, trigger regeneration
            </p>
            <div class="text-emerald-400 group-hover:translate-x-1 transition">
              View Quality Report →
            </div>
          </router-link>

          <!-- Prompt Evolution Card -->
          <router-link to="/quality/cym_for_eng_574seeds/evolution"
                       class="bg-slate-800/50 border border-slate-400/20 rounded-lg p-6 hover:border-emerald-500/50 transition group">
            <div class="flex items-center gap-3 mb-3">
              <svg class="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/>
              </svg>
              <h3 class="text-xl font-semibold text-slate-100">Prompt Evolution</h3>
            </div>
            <p class="text-slate-400 mb-4">
              Track prompt versions, learned rules, A/B testing, self-improvement history
            </p>
            <div class="text-emerald-400 group-hover:translate-x-1 transition">
              View Evolution Log →
            </div>
          </router-link>

          <!-- Recursive Up-Regulation Card -->
          <router-link to="/recursive-upregulation"
                       class="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-400/30 rounded-lg p-6 hover:border-purple-500/60 transition group">
            <div class="flex items-center gap-3 mb-3">
              <div class="text-3xl">🧠</div>
              <h3 class="text-xl font-semibold text-purple-200">Recursive Up-Regulation</h3>
            </div>
            <p class="text-purple-200/80 mb-4">
              AI OS self-improvement: Track generations, fine-tune models, prove self-healing
            </p>
            <div class="text-purple-300 group-hover:translate-x-1 transition">
              View AI OS Dashboard →
            </div>
          </router-link>

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

      <!-- Phase Training Pages -->
      <section class="mb-12">
        <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8">
          <h2 class="text-2xl font-semibold text-slate-100 mb-2">Phase Training Pages</h2>
          <p class="text-slate-400 mb-6">Detailed instructions for each phase of course production:</p>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Phase 1 -->
            <router-link to="/phase/1" class="flex items-center gap-3 p-4 bg-slate-900/80 border border-slate-400/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-slate-900">
                1
              </div>
              <div>
                <h3 class="font-semibold text-slate-100">Pedagogical Translation</h3>
                <p class="text-sm text-slate-400">6 pedagogical heuristics</p>
              </div>
            </router-link>

            <!-- Phase 3 -->
            <router-link to="/phase/3" class="flex items-center gap-3 p-4 bg-slate-900/80 border border-slate-400/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-slate-900">
                3
              </div>
              <div>
                <h3 class="font-semibold text-slate-100">LEGO Breakdowns</h3>
                <p class="text-sm text-slate-400">BASE/COMPOSITE/FEEDER</p>
              </div>
            </router-link>

            <!-- Phase 5 -->
            <router-link to="/phase/5" class="flex items-center gap-3 p-4 bg-slate-900/80 border border-slate-400/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-slate-900">
                5
              </div>
              <div>
                <h3 class="font-semibold text-slate-100">Basket Generation</h3>
                <p class="text-sm text-slate-400">e-phrases + d-phrases</p>
              </div>
            </router-link>

            <!-- Phase 5.5 -->
            <router-link to="/phase/5.5" class="flex items-center gap-3 p-4 bg-slate-900/80 border border-slate-400/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-slate-900">
                5.5
              </div>
              <div>
                <h3 class="font-semibold text-slate-100">Basket Deduplication</h3>
                <p class="text-sm text-slate-400">Provenance preservation</p>
              </div>
            </router-link>

            <!-- Phase 6 -->
            <router-link to="/phase/6" class="flex items-center gap-3 p-4 bg-slate-900/80 border border-slate-400/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-slate-900">
                6
              </div>
              <div>
                <h3 class="font-semibold text-slate-100">Introductions</h3>
                <p class="text-sm text-slate-400">Contextual with provenance</p>
              </div>
            </router-link>
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
          </div>
        </div>
      </section>

      <!-- Footer Note -->
      <div class="mt-12 text-center text-slate-400 text-sm">
        <p>SSi Course Production Dashboard v7.6 • Streamlined 5-Phase Pipeline</p>
        <p class="mt-1">BASE/COMPOSITE/FEEDER LEGOs • Provenance-Aware Introductions</p>
      </div>
    </main>
  </div>
</template>

<script setup>
console.log('🚀 Dashboard View Loaded')
</script>
