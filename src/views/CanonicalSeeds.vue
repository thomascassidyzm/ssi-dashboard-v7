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
          Canonical Seeds
        </h1>
        <p class="mt-2 text-slate-400">
          All 668 canonical seed pairs (16 years empirical optimization)
        </p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8">

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">About Canonical Seeds</h2>
          <div class="prose prose-invert prose-emerald max-w-none text-slate-300">
            <p>The 668 canonical seed pairs represent 16 years of empirical optimization in language course design. Each seed is a carefully selected source language sentence paired with its target language counterpart.</p>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Seed Characteristics</h3>
            <ul class="space-y-2">
              <li><strong>Empirically Optimized:</strong> Refined over 16 years of real-world learner data</li>
              <li><strong>Pedagogically Sequenced:</strong> Ordered for optimal learning progression</li>
              <li><strong>High-Frequency Coverage:</strong> Cover the most useful vocabulary and structures</li>
              <li><strong>Natural Expression:</strong> Represent authentic language usage patterns</li>
            </ul>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Seed Structure</h3>
            <p>Each canonical seed contains:</p>
            <ul class="space-y-1">
              <li><code class="text-emerald-400">seed_id</code> - Unique identifier (S1 - S668)</li>
              <li><code class="text-emerald-400">source</code> - Source language sentence (e.g., English)</li>
              <li><code class="text-emerald-400">target</code> - Target language sentence (e.g., Welsh)</li>
              <li><code class="text-emerald-400">metadata</code> - Complexity, frequency, and pedagogical notes</li>
            </ul>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Role in Pipeline</h3>
            <p>Seeds are the <strong>foundational input</strong> to the entire course production pipeline:</p>
            <ul class="space-y-1">
              <li><strong>Phase 0:</strong> Analyzed for corpus intelligence</li>
              <li><strong>Phase 1:</strong> Translated using 6 pedagogical heuristics</li>
              <li><strong>Phase 3:</strong> Extracted into LEGOs with S{seed}L{position} provenance</li>
              <li><strong>Edit Propagation:</strong> Changes to seeds automatically propagate through pipeline</li>
            </ul>
          </div>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">Example Seeds</h2>
          <div class="space-y-3">
            <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
              <div class="font-mono text-sm text-emerald-400 mb-2">S1</div>
              <div class="text-slate-300">I am / Dw i</div>
            </div>
            <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
              <div class="font-mono text-sm text-emerald-400 mb-2">S2</div>
              <div class="text-slate-300">I go / Dw i'n mynd</div>
            </div>
            <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
              <div class="font-mono text-sm text-emerald-400 mb-2">S3</div>
              <div class="text-slate-300">I want / Dw i eisiau</div>
            </div>
          </div>
          <p class="text-slate-400 text-sm mt-4">
            <em>Note: Full seed corpus is loaded from VFS during course generation</em>
          </p>
        </section>

      </div>
    </main>
  </div>
</template>

<script setup>
console.log('🌱 Canonical Seeds Loaded')
</script>
