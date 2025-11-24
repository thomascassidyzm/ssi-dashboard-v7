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
          APML v9.0.0 Specification
        </h1>
        <p class="mt-2 text-slate-400">
          Streamlined pipeline: Phase 1 → Phase 2 → Phase 3 → Manifest → Audio
        </p>
        <p class="mt-1 text-xs text-slate-500">
          Build: v9.0.0 | Nov 24, 2025
        </p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8">

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">APML Architecture</h2>
          <div class="prose prose-invert prose-emerald max-w-none text-slate-300">
            <p><strong>APML (Adaptive Pedagogy Markup Language)</strong> v9.0.0 is the current architectural specification for the SSi Course Production system. It introduces a streamlined pipeline (Phase 1 → Phase 2 → Phase 3 → Manifest → Audio). A phase triggers agents. Scripts run instantly.</p>

            <div class="bg-slate-900/50 border border-emerald-500/30 rounded p-3 my-3">
              <p class="text-xs text-slate-400">Pipeline: <span class="text-emerald-400">Phase 1 (Translation + LEGO) → Phase 2 (Conflict Resolution) → Phase 3 (Baskets) → Manifest (Script) → Audio (Process)</span></p>
              <p class="text-xs text-emerald-400 mt-1">lego_pairs.json embeds seed_pairs (no separate file)</p>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Core Principles</h3>
            <ul class="space-y-2">
              <li><strong>Consolidated Storage:</strong> Courses stored as 2 consolidated JSON files (lego_pairs.json embeds seed_pairs, lego_baskets.json)</li>
              <li><strong>Ultra-Compact Arrays:</strong> Space-efficient array format with single-letter type codes (B/C/F)</li>
              <li><strong>Seed-Centric Structure:</strong> All data organized by seed ID, preserving breakdown relationships</li>
              <li><strong>Provenance Tracking:</strong> S{seed}L{position} IDs preserve birth-parent relationships</li>
              <li><strong>Parallel Orchestration:</strong> osascript spawns multiple Claude Code agents in parallel</li>
              <li><strong>Phases vs Scripts:</strong> A phase triggers agents. Scripts run instantly.</li>
            </ul>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Core Data Files</h3>
            <div class="space-y-3 mt-4">
              <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
                <h4 class="font-semibold text-emerald-300">draft_lego_pairs.json</h4>
                <p class="text-sm text-slate-400 mt-1">
                  Phase 1 output: translations with LEGO extraction (may have conflicts)<br/>
                  <code class="text-xs">{"version": "9.0", "seeds": [[seed_id, [t,k], [[lego_id, type, t, k]]]]}</code>
                </p>
              </div>
              <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
                <h4 class="font-semibold text-emerald-300">lego_pairs.json</h4>
                <p class="text-sm text-slate-400 mt-1">
                  Phase 2 output: conflict-free LEGOs with embedded seed_pairs (SINGLE SOURCE OF TRUTH)<br/>
                  <code class="text-xs">{"version": "9.0", "seeds": [[seed_id, [t,k], [[lego_id, type, t, k]]]]}</code>
                </p>
              </div>
              <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
                <h4 class="font-semibold text-emerald-300">lego_baskets.json</h4>
                <p class="text-sm text-slate-400 mt-1">
                  Phase 3 output: learning baskets with enabling/discovery phrases (DO NOT MODIFY - works perfectly)<br/>
                  <code class="text-xs">{"version": "9.0", "baskets": {lego_id: [[lego], [e-phrases], [d-phrases]]}}</code>
                </p>
              </div>
              <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
                <h4 class="font-semibold text-emerald-300">course_manifest.json</h4>
                <p class="text-sm text-slate-400 mt-1">
                  Manifest script output: compiled course for audio generation<br/>
                  <code class="text-xs">{"version": "9.0", ...}</code>
                </p>
              </div>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">VFS Structure</h3>
            <pre class="bg-slate-900/80 border border-slate-400/20 rounded p-4 text-xs overflow-x-auto"><code>vfs/
└── courses/
    └── {course_code}/
        ├── draft_lego_pairs.json      # Phase 1: Translation + LEGO extraction
        ├── lego_pairs.json            # Phase 2: Conflict-free (embeds seed_pairs)
        ├── lego_baskets.json          # Phase 3: Learning baskets
        ├── course_manifest.json       # Manifest script: Compiled course
        └── audio/                     # Audio process: Generated MP3s</code></pre>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Type Codes</h3>
            <div class="space-y-2 mt-4 bg-slate-900/80 border border-slate-400/20 rounded p-4">
              <p class="text-sm"><strong class="text-emerald-300">"B"</strong> = BASE LEGO (atomic, indivisible teaching chunk)</p>
              <p class="text-sm"><strong class="text-emerald-300">"C"</strong> = COMPOSITE LEGO (multi-word phrase with feeder components)</p>
              <p class="text-sm"><strong class="text-emerald-300">"F"</strong> = FEEDER (component of a composite, taught before the whole)</p>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Phase Pipeline</h3>
            <p class="text-sm text-slate-400 mb-3">A phase triggers agents. Scripts run instantly.</p>
            <div class="overflow-x-auto">
              <table class="w-full text-sm border border-slate-600">
                <thead class="bg-slate-800">
                  <tr>
                    <th class="border border-slate-600 px-3 py-2 text-left text-emerald-300">Phase</th>
                    <th class="border border-slate-600 px-3 py-2 text-left text-emerald-300">Name</th>
                    <th class="border border-slate-600 px-3 py-2 text-left text-emerald-300">Input</th>
                    <th class="border border-slate-600 px-3 py-2 text-left text-emerald-300">Output</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="border border-slate-600 px-3 py-2">1</td>
                    <td class="border border-slate-600 px-3 py-2">Translation + LEGO Extraction</td>
                    <td class="border border-slate-600 px-3 py-2 font-mono text-xs">canonical_seeds.json</td>
                    <td class="border border-slate-600 px-3 py-2 font-mono text-xs">draft_lego_pairs.json</td>
                  </tr>
                  <tr>
                    <td class="border border-slate-600 px-3 py-2">2</td>
                    <td class="border border-slate-600 px-3 py-2">Conflict Resolution</td>
                    <td class="border border-slate-600 px-3 py-2 font-mono text-xs">draft_lego_pairs.json</td>
                    <td class="border border-slate-600 px-3 py-2 font-mono text-xs">lego_pairs.json</td>
                  </tr>
                  <tr>
                    <td class="border border-slate-600 px-3 py-2">3</td>
                    <td class="border border-slate-600 px-3 py-2">Basket Generation</td>
                    <td class="border border-slate-600 px-3 py-2 font-mono text-xs">lego_pairs.json</td>
                    <td class="border border-slate-600 px-3 py-2 font-mono text-xs">lego_baskets.json</td>
                  </tr>
                  <tr class="bg-slate-800/50">
                    <td class="border border-slate-600 px-3 py-2 text-amber-400">-</td>
                    <td class="border border-slate-600 px-3 py-2 text-amber-400">Manifest (Script)</td>
                    <td class="border border-slate-600 px-3 py-2 font-mono text-xs">All above</td>
                    <td class="border border-slate-600 px-3 py-2 font-mono text-xs">course_manifest.json</td>
                  </tr>
                  <tr class="bg-slate-800/50">
                    <td class="border border-slate-600 px-3 py-2 text-purple-400">-</td>
                    <td class="border border-slate-600 px-3 py-2 text-purple-400">Audio (Process)</td>
                    <td class="border border-slate-600 px-3 py-2 font-mono text-xs">course_manifest.json</td>
                    <td class="border border-slate-600 px-3 py-2 font-mono text-xs">audio/*.mp3</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="mt-3 space-y-1 text-xs text-slate-400">
              <p>* Intros auto-script at end of Phase 2</p>
              <p>* Phase 3 basket generation: DO NOT MODIFY - works perfectly</p>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">API Endpoints</h3>
            <div class="space-y-3 mt-4">
              <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
                <h4 class="font-semibold text-emerald-300">GET /api/courses</h4>
                <p class="text-sm text-slate-400 mt-1">List all courses from VFS with metadata and phase completion status</p>
              </div>
              <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
                <h4 class="font-semibold text-emerald-300">GET /api/courses/:courseCode</h4>
                <p class="text-sm text-slate-400 mt-1">Get full course data - reads lego_pairs.json (embeds seed_pairs), lego_baskets.json</p>
              </div>
              <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
                <h4 class="font-semibold text-emerald-300">POST /api/courses/:courseCode/phase/:phaseNum</h4>
                <p class="text-sm text-slate-400 mt-1">Spawn Claude Code agent for specific phase (1-3) - orchestrates via osascript</p>
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
                Balances First-Can-First-Say chronological order against pedagogical utility scores. Used in Phase 1 (LEGO Extraction) and Phase 3 (Basket Construction).
              </p>
            </div>
            <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
              <h4 class="font-semibold text-emerald-300">IRON RULE</h4>
              <p class="text-sm text-slate-400 mt-2">
                No LEGO begins or ends with a preposition. Absolute rule enforced during Phase 1 extraction.
              </p>
            </div>
            <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
              <h4 class="font-semibold text-emerald-300">Conflict Resolution</h4>
              <p class="text-sm text-slate-400 mt-2">
                Phase 2 resolves LEGO conflicts from draft output, ensuring consistent LEGO definitions across the course.
              </p>
            </div>
            <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
              <h4 class="font-semibold text-emerald-300">Graph Edge Coverage</h4>
              <p class="text-sm text-slate-400 mt-2">
                Pattern-aware basket construction maximizes unique LEGO adjacency edge coverage (Phase 3). Replaces old DEBUT/ETERNAL terminology.
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
