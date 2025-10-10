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
          APML v7.0 Specification
        </h1>
        <p class="mt-2 text-slate-400">
          Complete architectural specification with amino acid storage model
        </p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8">

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">APML Architecture</h2>
          <div class="prose prose-invert prose-emerald max-w-none text-slate-300">
            <p><strong>APML (Autonomous Parallel Markup Language)</strong> v7.0 is the architectural specification for the SSi Course Production system. It defines the amino acid storage model, phase pipeline, and orchestration protocols.</p>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Core Principles</h3>
            <ul class="space-y-2">
              <li><strong>Amino Acid Storage:</strong> Discrete, immutable components stored as JSON amino acids</li>
              <li><strong>Protein Compilation:</strong> Amino acids compile into manifest proteins (courses)</li>
              <li><strong>Deterministic UUIDs:</strong> Content-based UUIDs enable automatic edit propagation</li>
              <li><strong>Provenance Tracking:</strong> S{seed}L{position} labels preserve birth-parent relationships</li>
              <li><strong>Parallel Orchestration:</strong> osascript spawns multiple Claude Code agents in parallel</li>
            </ul>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Amino Acid Types</h3>
            <div class="space-y-3 mt-4">
              <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
                <h4 class="font-semibold text-emerald-300">Translations</h4>
                <p class="text-sm text-slate-400 mt-1">
                  Pedagogically optimized translations of seed pairs<br/>
                  <code class="text-xs">amino_acids/translations/{uuid}.json</code>
                </p>
              </div>
              <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
                <h4 class="font-semibold text-emerald-300">LEGOs</h4>
                <p class="text-sm text-slate-400 mt-1">
                  Teaching phrases extracted from translations with provenance<br/>
                  <code class="text-xs">amino_acids/legos/{uuid}.json</code>
                </p>
              </div>
              <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
                <h4 class="font-semibold text-emerald-300">Baskets</h4>
                <p class="text-sm text-slate-400 mt-1">
                  Learning lessons with LEGO manifests and graph coverage<br/>
                  <code class="text-xs">amino_acids/baskets/{uuid}.json</code>
                </p>
              </div>
              <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
                <h4 class="font-semibold text-emerald-300">Introductions</h4>
                <p class="text-sm text-slate-400 mt-1">
                  Known-only priming phrases for basket entry<br/>
                  <code class="text-xs">amino_acids/introductions/{uuid}.json</code>
                </p>
              </div>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">VFS Structure</h3>
            <pre class="bg-slate-900/80 border border-slate-400/20 rounded p-4 text-xs overflow-x-auto"><code>vfs/
├── amino_acids/
│   ├── translations/
│   │   └── {uuid}.json
│   ├── legos/
│   │   └── {uuid}.json
│   ├── baskets/
│   │   └── {uuid}.json
│   └── introductions/
│       └── {uuid}.json
└── proteins/
    └── {course_id}/
        ├── manifest.json
        ├── baskets.json
        └── metadata.json</code></pre>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Edit Propagation</h3>
            <p>When a seed is edited:</p>
            <ol class="space-y-1">
              <li>1. Provenance tracking identifies affected LEGOs (S{seed}L{position})</li>
              <li>2. Only affected amino acids are regenerated with new UUIDs</li>
              <li>3. Downstream phases recompile using new amino acids</li>
              <li>4. Protein manifests update references automatically</li>
            </ol>
          </div>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">Key Algorithms</h2>
          <div class="space-y-4">
            <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
              <h4 class="font-semibold text-emerald-300">FCFS vs Utility</h4>
              <p class="text-sm text-slate-400 mt-2">
                Balances First-Can-First-Say chronological order against pedagogical utility scores. Used in Phase 3 (LEGO Extraction) and Phase 5 (Basket Construction).
              </p>
            </div>
            <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
              <h4 class="font-semibold text-emerald-300">IRON RULE</h4>
              <p class="text-sm text-slate-400 mt-2">
                No LEGO begins or ends with a preposition. Absolute rule enforced during Phase 3 extraction.
              </p>
            </div>
            <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
              <h4 class="font-semibold text-emerald-300">Graph Edge Coverage</h4>
              <p class="text-sm text-slate-400 mt-2">
                Pattern-aware basket construction maximizes unique LEGO adjacency edge coverage (Phase 5). Replaces old DEBUT/ETERNAL terminology.
              </p>
            </div>
          </div>
        </section>

      </div>
    </main>
  </div>
</template>

<script setup>
console.log('📋 APML Specification Loaded')
</script>
