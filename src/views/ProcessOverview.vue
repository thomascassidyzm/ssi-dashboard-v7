<template>
  <div class="process-overview-view">
    <!-- Page Header (within DocsLayout) -->
    <div class="page-header">
      <h1 class="page-title">Complete Process Overview</h1>
      <p class="page-subtitle">
        Comprehensive documentation of the entire SSi Course Production pipeline
      </p>
    </div>

    <!-- Main Content -->
    <main class="content-area">
      <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8">

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">End-to-End Pipeline</h2>
          <div class="prose prose-invert prose-emerald max-w-none text-slate-300">
            <p>The SSi Course Production system uses APML v14 specification to generate complete language courses from canonical seed pairs. The Course Builder API consolidates content creation into a single atomic operation.</p>

            <div class="bg-slate-900/50 border border-emerald-500/30 rounded p-4 my-4">
              <p class="text-xs text-slate-400 mb-1">Build: <span class="text-emerald-400 font-mono">v14.0.0</span></p>
              <p class="text-xs text-slate-400">APML: <span class="text-emerald-400">v14.0.0</span> | Pipeline: <span class="text-emerald-400">Course Builder (3471) → Phase 8 Audio (3465) → Phase 9 Manifest (3466)</span></p>
              <p class="text-xs text-emerald-400 mt-1">Database-first with Supabase | Atomic validation (tiling, ZUT, vocabulary)</p>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Deployment Architecture</h3>

            <div class="bg-slate-900/80 border border-emerald-500/30 rounded-lg p-4 my-4">
              <h4 class="text-lg font-semibold text-emerald-300 mb-3">Hybrid Cloud + Local Architecture</h4>
              <p class="text-slate-300 mb-4">Popty uses a hybrid architecture: the dashboard runs on Vercel for global access, but content creation requires a local machine running the Production API (port 3470).</p>

              <div class="grid md:grid-cols-2 gap-4 mt-4">
                <div class="bg-slate-800/50 rounded p-3">
                  <h5 class="text-emerald-400 font-medium mb-2">✓ Works Without Local Connection</h5>
                  <ul class="text-sm text-slate-400 space-y-1">
                    <li>• View course stats & progress</li>
                    <li>• Browse content in database</li>
                    <li>• Review and flag audio samples</li>
                    <li>• Access documentation</li>
                  </ul>
                </div>
                <div class="bg-slate-800/50 rounded p-3">
                  <h5 class="text-amber-400 font-medium mb-2">⚡ Requires Local Machine</h5>
                  <ul class="text-sm text-slate-400 space-y-1">
                    <li>• Spawn Claude Code agents</li>
                    <li>• Run Course Builder API</li>
                    <li>• Generate TTS audio (Phase 8)</li>
                    <li>• Any content creation</li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="bg-slate-900/80 border border-slate-400/20 rounded-lg p-4 my-4">
              <h4 class="text-lg font-semibold text-slate-200 mb-3">Why Local Machines?</h4>
              <p class="text-slate-400 mb-3">Claude Code agents run via browser automation on local machines using Pro Max subscriptions ($200/month). This is far more cost-effective than API calls for course generation.</p>
              <div class="text-sm text-slate-500">
                <p><strong>Data Flow:</strong> Dashboard → ngrok → Local Production API (3470) → Course Builder (3471) / Agents → Supabase</p>
              </div>
            </div>

            <div class="bg-slate-900/80 border border-slate-400/20 rounded-lg p-4 my-4">
              <h4 class="text-lg font-semibold text-slate-200 mb-3">Environment Switcher</h4>
              <p class="text-slate-400">Use the environment switcher (top right) to connect to different local machines:</p>
              <ul class="text-sm text-slate-400 mt-2 space-y-1">
                <li>• <span class="text-emerald-400">Local Development</span> - Direct connection to localhost:3470 (Production API)</li>
                <li>• <span class="text-emerald-400">Team Member's Machine</span> - Connect via their ngrok tunnel</li>
              </ul>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Data Storage</h3>
            <ul class="space-y-2">
              <li><strong>Supabase:</strong> Single source of truth for all content (seeds, LEGOs, component / build / use phrases, audio metadata)</li>
              <li><strong>AWS S3:</strong> Audio file storage (ssi-audio-stage bucket)</li>
              <li><strong>Local JSON:</strong> Phase outputs also written locally for backup/debugging</li>
            </ul>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">v14 Pipeline Flow</h3>
            <div class="space-y-4 mt-4">
              <router-link to="/intelligence" class="block bg-slate-900/80 border border-emerald-500/50 hover:border-emerald-400 rounded p-4 transition group">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-emerald-300">Course Builder API (Port 3471)</h4>
                    <p class="text-sm text-slate-400 mt-1">POST /api/seed/complete → Supabase: course_seeds, course_legos, course_practice_phrases</p>
                    <p class="text-xs text-emerald-400 mt-1">Atomic validation: tiling, ZUT conflicts, vocabulary, phrase counts</p>
                  </div>
                  <span class="text-emerald-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </router-link>
              <router-link to="/intelligence" class="block bg-slate-900/80 border border-slate-400/20 hover:border-purple-500/50 rounded p-4 transition group">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-purple-300">Phase 8: Audio Generation (Port 3465)</h4>
                    <p class="text-sm text-slate-400 mt-1">POST /generate/:courseCode → course_audio table + S3 storage</p>
                    <p class="text-xs text-purple-400 mt-1">TTS via Azure (default), ElevenLabs, or xAI per voice config; deduplicates across courses</p>
                  </div>
                  <span class="text-purple-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </router-link>
              <router-link to="/intelligence" class="block bg-slate-900/80 border border-slate-400/20 hover:border-amber-500/50 rounded p-4 transition group">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-amber-300">Phase 9: Manifest Compilation (Port 3466)</h4>
                    <p class="text-sm text-slate-400 mt-1">POST /compile → course_manifest.json (generated on-demand)</p>
                    <p class="text-xs text-amber-400 mt-1">Queries Supabase for audio UUIDs, validates 100% coverage</p>
                  </div>
                  <span class="text-amber-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </router-link>
            </div>

            <div class="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded">
              <p class="text-xs text-amber-300"><strong>Deprecated:</strong> Phase 1 (3457), Phase 2 (3458), Phase 3 (3459) - all consolidated into Course Builder; Orchestrator (3456) — optional, consolidated into Production API (3470)</p>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Key Features in v14</h3>
            <ul class="space-y-2">
              <li><strong>Course Builder Consolidation:</strong> Single API endpoint handles translation, LEGO extraction, conflict resolution, and basket generation atomically</li>
              <li><strong>Atomic Validation:</strong> Tiling, ZUT conflicts, vocabulary constraints, and phrase counts validated before any inserts</li>
              <li><strong>Database-First:</strong> All content stored in Supabase tables (course_seeds, course_legos, course_practice_phrases)</li>
              <li><strong>Methodology by Example:</strong> Agent learns SSi methodology from .claude/commands/ skills</li>
              <li><strong>Overlapping LEGOs:</strong> Chunks share components for maximum recombination power</li>
              <li><strong>Two Heuristics:</strong> Remove learner uncertainty (ZUT) + Maximize patterns with minimum vocab</li>
              <li><strong>M-LEGO Build-up:</strong> Automatic component→LEGO→phrases structure generation</li>
              <li><strong>Course Validators:</strong> Measure vocabulary, patterns, completeness (0-100% score)</li>
              <li><strong>Phase 8 Audio:</strong> TTS via Azure (default), ElevenLabs, or xAI per voice config, stores in S3 with Supabase registry</li>
              <li><strong>Phase 9 Manifest:</strong> On-demand compilation from Supabase, validates 100% audio coverage</li>
            </ul>
          </div>
        </section>

      </div>
    </main>
  </div>
</template>

<script setup>
// Static documentation page - no reactive data needed
</script>

<style scoped>
.process-overview-view {
  padding: 2rem;
}

.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: #10b981;
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  color: #94a3b8;
  margin: 0;
}

.content-area {
  max-width: 100%;
}
</style>
