<template>
  <div class="min-h-screen bg-slate-900">
    <!-- Header -->
    <header class="bg-slate-800/50 border-b border-slate-400/10 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 class="text-3xl font-bold text-emerald-400">
          SSI Course Production Dashboard v7.0
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

      <!-- Phase Training Pages -->
      <section class="mb-12">
        <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8">
          <h2 class="text-2xl font-semibold text-slate-100 mb-2">Phase Training Pages</h2>
          <p class="text-slate-400 mb-6">Detailed instructions for each phase of course production:</p>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Phase 0 -->
            <router-link to="/phase/0" class="flex items-center gap-3 p-4 bg-slate-900/80 border border-slate-400/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-slate-900">
                0
              </div>
              <div>
                <h3 class="font-semibold text-slate-100">Corpus Pre-Analysis</h3>
                <p class="text-sm text-slate-400">Translation intelligence</p>
              </div>
            </router-link>

            <!-- Phase 1 -->
            <router-link to="/phase/1" class="flex items-center gap-3 p-4 bg-slate-900/80 border border-slate-400/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-slate-900">
                1
              </div>
              <div>
                <h3 class="font-semibold text-slate-100">Pedagogical Translation</h3>
                <p class="text-sm text-slate-400">6 heuristics optimization</p>
              </div>
            </router-link>

            <!-- Phase 2 -->
            <router-link to="/phase/2" class="flex items-center gap-3 p-4 bg-slate-900/80 border border-slate-400/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-slate-900">
                2
              </div>
              <div>
                <h3 class="font-semibold text-slate-100">Corpus Intelligence</h3>
                <p class="text-sm text-slate-400">FCFS mapping + utility</p>
              </div>
            </router-link>

            <!-- Phase 3 -->
            <router-link to="/phase/3" class="flex items-center gap-3 p-4 bg-slate-900/80 border border-slate-400/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-slate-900">
                3
              </div>
              <div>
                <h3 class="font-semibold text-slate-100">LEGO Extraction</h3>
                <p class="text-sm text-slate-400">FCFS vs Utility + IRON RULE</p>
              </div>
            </router-link>

            <!-- Phase 3.5 -->
            <router-link to="/phase/3.5" class="flex items-center gap-3 p-4 bg-slate-900/80 border border-slate-400/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-slate-900">
                3.5
              </div>
              <div>
                <h3 class="font-semibold text-slate-100">Graph Construction</h3>
                <p class="text-sm text-slate-400">LEGO adjacency edges</p>
              </div>
            </router-link>

            <!-- Phase 4 -->
            <router-link to="/phase/4" class="flex items-center gap-3 p-4 bg-slate-900/80 border border-slate-400/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-slate-900">
                4
              </div>
              <div>
                <h3 class="font-semibold text-slate-100">Deduplication</h3>
                <p class="text-sm text-slate-400">Provenance preservation</p>
              </div>
            </router-link>

            <!-- Phase 5 -->
            <router-link to="/phase/5" class="flex items-center gap-3 p-4 bg-slate-900/80 border border-slate-400/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-slate-900">
                5
              </div>
              <div>
                <h3 class="font-semibold text-slate-100">Pattern-Aware Baskets</h3>
                <p class="text-sm text-slate-400">Graph-driven edge coverage</p>
              </div>
            </router-link>

            <!-- Phase 6 -->
            <router-link to="/phase/6" class="flex items-center gap-3 p-4 bg-slate-900/80 border border-slate-400/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-slate-900">
                6
              </div>
              <div>
                <h3 class="font-semibold text-slate-100">Introductions</h3>
                <p class="text-sm text-slate-400">Known-only priming</p>
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
                <p class="text-sm text-slate-400">All 574 canonical seed pairs (16 years empirical optimization)</p>
              </div>
            </router-link>

            <!-- APML v7.0 Specification -->
            <router-link to="/reference/apml" class="flex items-center gap-4 p-4 bg-slate-900/80 border border-slate-400/20 rounded-lg hover:border-emerald-500/50 transition hover:-translate-y-0.5 cursor-pointer">
              <div class="text-3xl">📋</div>
              <div>
                <h3 class="font-semibold text-slate-100">APML v7.0 Specification</h3>
                <p class="text-sm text-slate-400">Complete architectural specification with amino acid storage model</p>
              </div>
            </router-link>
          </div>
        </div>
      </section>

      <!-- Footer Note -->
      <div class="mt-12 text-center text-slate-400 text-sm">
        <p>SSi Course Production Dashboard v7.0 • Graph Intelligence + Pattern Coverage</p>
        <p class="mt-1">Clean build • No legacy dependencies</p>
      </div>
    </main>
  </div>
</template>

<script setup>
console.log('🚀 Dashboard View Loaded')
</script>
