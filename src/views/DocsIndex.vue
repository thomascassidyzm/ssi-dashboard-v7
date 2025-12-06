<template>
  <div class="min-h-screen bg-slate-900">
    <!-- Header -->
    <header class="bg-slate-800/50 border-b border-slate-400/10 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <router-link to="/" class="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition mb-4">
          <span>←</span>
          <span>Back to Mission Control</span>
        </router-link>
        <h1 class="text-3xl font-bold text-emerald-400">
          Documentation
        </h1>
        <p class="mt-2 text-slate-400">
          Reference materials and specifications
        </p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        <!-- APML Specification -->
        <router-link
          to="/reference/apml"
          class="block bg-slate-800/50 hover:bg-slate-800/70 border border-slate-400/20 hover:border-emerald-500/50 rounded-lg p-6 transition hover:-translate-y-1 shadow-lg hover:shadow-emerald-500/10"
        >
          <div class="flex items-start gap-4">
            <div class="text-3xl flex-shrink-0">📋</div>
            <div class="flex-1 min-w-0">
              <h3 class="text-lg font-semibold text-slate-100 mb-2">
                APML Specification
              </h3>
              <p class="text-sm text-slate-400 leading-relaxed">
                Adaptive Pedagogy Markup Language v2.1
              </p>
            </div>
          </div>
        </router-link>

        <!-- Pedagogical Model -->
        <router-link
          to="/reference/pedagogy"
          class="block bg-slate-800/50 hover:bg-slate-800/70 border border-slate-400/20 hover:border-emerald-500/50 rounded-lg p-6 transition hover:-translate-y-1 shadow-lg hover:shadow-emerald-500/10"
        >
          <div class="flex items-start gap-4">
            <div class="text-3xl flex-shrink-0">🎓</div>
            <div class="flex-1 min-w-0">
              <h3 class="text-lg font-semibold text-slate-100 mb-2">
                Pedagogical Model
              </h3>
              <p class="text-sm text-slate-400 leading-relaxed">
                SSi teaching methodology and learning science
              </p>
            </div>
          </div>
        </router-link>

        <!-- Terminology Glossary -->
        <router-link
          to="/reference/terminology"
          class="block bg-slate-800/50 hover:bg-slate-800/70 border border-slate-400/20 hover:border-emerald-500/50 rounded-lg p-6 transition hover:-translate-y-1 shadow-lg hover:shadow-emerald-500/10"
        >
          <div class="flex items-start gap-4">
            <div class="text-3xl flex-shrink-0">📖</div>
            <div class="flex-1 min-w-0">
              <h3 class="text-lg font-semibold text-slate-100 mb-2">
                Terminology Glossary
              </h3>
              <p class="text-sm text-slate-400 leading-relaxed">
                Key terms and definitions
              </p>
            </div>
          </div>
        </router-link>

        <!-- Canonical Seeds -->
        <router-link
          to="/reference/seeds"
          class="block bg-slate-800/50 hover:bg-slate-800/70 border border-slate-400/20 hover:border-emerald-500/50 rounded-lg p-6 transition hover:-translate-y-1 shadow-lg hover:shadow-emerald-500/10"
        >
          <div class="flex items-start gap-4">
            <div class="text-3xl flex-shrink-0">🌱</div>
            <div class="flex-1 min-w-0">
              <h3 class="text-lg font-semibold text-slate-100 mb-2">
                Canonical Seeds
              </h3>
              <p class="text-sm text-slate-400 leading-relaxed">
                Master seed phrase library
              </p>
            </div>
          </div>
        </router-link>

        <!-- Canonical Content -->
        <router-link
          to="/reference/canonical"
          class="block bg-slate-800/50 hover:bg-slate-800/70 border border-slate-400/20 hover:border-emerald-500/50 rounded-lg p-6 transition hover:-translate-y-1 shadow-lg hover:shadow-emerald-500/10"
        >
          <div class="flex items-start gap-4">
            <div class="text-3xl flex-shrink-0">📚</div>
            <div class="flex-1 min-w-0">
              <h3 class="text-lg font-semibold text-slate-100 mb-2">
                Canonical Content
              </h3>
              <p class="text-sm text-slate-400 leading-relaxed">
                Reference content and translations
              </p>
            </div>
          </div>
        </router-link>

        <!-- Process Overview -->
        <router-link
          to="/reference/overview"
          class="block bg-slate-800/50 hover:bg-slate-800/70 border border-slate-400/20 hover:border-emerald-500/50 rounded-lg p-6 transition hover:-translate-y-1 shadow-lg hover:shadow-emerald-500/10"
        >
          <div class="flex items-start gap-4">
            <div class="text-3xl flex-shrink-0">🔄</div>
            <div class="flex-1 min-w-0">
              <h3 class="text-lg font-semibold text-slate-100 mb-2">
                Process Overview
              </h3>
              <p class="text-sm text-slate-400 leading-relaxed">
                End-to-end pipeline documentation
              </p>
            </div>
          </div>
        </router-link>

      </div>
    </main>
  </div>
</template>

<script setup>
console.log('📚 Documentation Index Loaded')
</script>
