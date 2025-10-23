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
          Current format specification - Ultra-compact consolidated JSON (Oct 22, 2024)
        </p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8">

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">APML Architecture</h2>
          <div class="prose prose-invert prose-emerald max-w-none text-slate-300">
            <p><strong>APML (Autonomous Parallel Markup Language)</strong> v7.0 is the current architectural specification for the SSi Course Production system. It defines the ultra-compact consolidated JSON format, phase pipeline, and orchestration protocols.</p>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Core Principles</h3>
            <ul class="space-y-2">
              <li><strong>Consolidated Storage:</strong> Courses stored as 3 consolidated JSON files (seed_pairs.json, lego_pairs.json, lego_baskets.json)</li>
              <li><strong>Ultra-Compact Arrays:</strong> Space-efficient array format with single-letter type codes (B/C/F)</li>
              <li><strong>Seed-Centric Structure:</strong> All data organized by seed ID, preserving breakdown relationships</li>
              <li><strong>Provenance Tracking:</strong> S{seed}L{position} IDs preserve birth-parent relationships</li>
              <li><strong>Parallel Orchestration:</strong> osascript spawns multiple Claude Code agents in parallel</li>
            </ul>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Core Data Files</h3>
            <div class="space-y-3 mt-4">
              <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
                <h4 class="font-semibold text-emerald-300">seed_pairs.json</h4>
                <p class="text-sm text-slate-400 mt-1">
                  Pedagogically optimized translations (Phase 1 output)<br/>
                  <code class="text-xs">{"version": "7.0", "translations": {"S0001": [target, known]}}</code>
                </p>
              </div>
              <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
                <h4 class="font-semibold text-emerald-300">lego_pairs.json</h4>
                <p class="text-sm text-slate-400 mt-1">
                  LEGO breakdowns with composites and feeders (Phase 3 output)<br/>
                  <code class="text-xs">{"version": "7.0", "seeds": [[seed_id, [t,k], [[lego_id, type, t, k]]]]}</code>
                </p>
              </div>
              <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
                <h4 class="font-semibold text-emerald-300">lego_baskets.json</h4>
                <p class="text-sm text-slate-400 mt-1">
                  Learning baskets with enabling/discovery phrases (Phase 5 output)<br/>
                  <code class="text-xs">{"version": "7.0", "baskets": {lego_id: [[lego], [e-phrases], [d-phrases]]}}</code>
                </p>
              </div>
              <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
                <h4 class="font-semibold text-emerald-300">introductions.json</h4>
                <p class="text-sm text-slate-400 mt-1">
                  Known-only priming phrases for basket entry (Phase 6 output)<br/>
                  <code class="text-xs">{"version": "7.0", "introductions": [...]}</code>
                </p>
              </div>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">VFS Structure</h3>
            <pre class="bg-slate-900/80 border border-slate-400/20 rounded p-4 text-xs overflow-x-auto"><code>vfs/
└── courses/
    └── {course_code}/
        ├── seed_pairs.json           # Phase 1: Translations
        ├── lego_pairs.json            # Phase 3: LEGO breakdowns
        ├── lego_baskets.json          # Phase 5: Learning baskets
        ├── introductions.json         # Phase 6: Introduction phrases
        ├── course_manifest.json       # Phase 7: Compiled course
        └── _backup_pre_v7.0/          # Old format backups</code></pre>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Type Codes</h3>
            <div class="space-y-2 mt-4 bg-slate-900/80 border border-slate-400/20 rounded p-4">
              <p class="text-sm"><strong class="text-emerald-300">"B"</strong> = BASE LEGO (atomic, indivisible teaching chunk)</p>
              <p class="text-sm"><strong class="text-emerald-300">"C"</strong> = COMPOSITE LEGO (multi-word phrase with feeder components)</p>
              <p class="text-sm"><strong class="text-emerald-300">"F"</strong> = FEEDER (component of a composite, taught before the whole)</p>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Phase Pipeline</h3>
            <ol class="space-y-2 text-sm">
              <li><strong>Phase 1:</strong> Translation Generation → seed_pairs.json</li>
              <li><strong>Phase 2:</strong> Corpus Analysis (FCFS + utility scoring)</li>
              <li><strong>Phase 3:</strong> LEGO Extraction → lego_pairs.json</li>
              <li><strong>Phase 4:</strong> Deduplication (merges duplicate LEGOs across seeds)</li>
              <li><strong>Phase 5:</strong> Basket Construction → lego_baskets.json</li>
              <li><strong>Phase 6:</strong> Introduction Phrases → introductions.json</li>
              <li><strong>Phase 7:</strong> Course Compilation → course_manifest.json</li>
              <li><strong>Phase 8:</strong> Audio Generation (TTS for all phrases)</li>
            </ol>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">API Endpoints</h3>
            <div class="space-y-3 mt-4">
              <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
                <h4 class="font-semibold text-emerald-300">GET /api/courses</h4>
                <p class="text-sm text-slate-400 mt-1">List all courses from VFS with metadata and phase completion status</p>
              </div>
              <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
                <h4 class="font-semibold text-emerald-300">GET /api/courses/:courseCode</h4>
                <p class="text-sm text-slate-400 mt-1">Get full course data - reads seed_pairs.json, lego_pairs.json, lego_baskets.json</p>
              </div>
              <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
                <h4 class="font-semibold text-emerald-300">POST /api/courses/:courseCode/phase/:phaseNum</h4>
                <p class="text-sm text-slate-400 mt-1">Spawn Claude Code agent for specific phase (1-8) - orchestrates via osascript</p>
              </div>
              <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
                <h4 class="font-semibold text-emerald-300">GET /api/courses/:courseCode/job</h4>
                <p class="text-sm text-slate-400 mt-1">Check generation job status and progress</p>
              </div>
              <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
                <h4 class="font-semibold text-emerald-300">GET /api/training/phase/:phaseNum</h4>
                <p class="text-sm text-slate-400 mt-1">Get runtime prompt for phase execution (fetched by Claude agents)</p>
              </div>
            </div>
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
