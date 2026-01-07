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
          Complete Process Overview
        </h1>
        <p class="mt-2 text-slate-400">
          Comprehensive documentation of the entire SSi Course Production pipeline
        </p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8">

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">End-to-End Pipeline</h2>
          <div class="prose prose-invert prose-emerald max-w-none text-slate-300">
            <p>The SSi Course Production system uses APML v13 specification to generate complete language courses from canonical seed pairs through an audio-first pipeline. A phase triggers agents. Scripts run instantly.</p>

            <div class="bg-slate-900/50 border border-emerald-500/30 rounded p-4 my-4">
              <p class="text-xs text-slate-400 mb-1">Build: <span class="text-emerald-400 font-mono">v13.0.0</span></p>
              <p class="text-xs text-slate-400">APML: <span class="text-emerald-400">v13.0.0</span> | Pipeline: <span class="text-emerald-400">Phase 1 → Phase 2 → Phase 3 → Audio → Manifest</span></p>
              <p class="text-xs text-emerald-400 mt-1">Audio-first with Supabase | lego_pairs.json embeds seed_pairs</p>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Deployment Architecture</h3>

            <div class="bg-slate-900/80 border border-emerald-500/30 rounded-lg p-4 my-4">
              <h4 class="text-lg font-semibold text-emerald-300 mb-3">Hybrid Cloud + Local Architecture</h4>
              <p class="text-slate-300 mb-4">Popty uses a hybrid architecture: the dashboard runs on Vercel for global access, but content creation requires a local machine running the orchestrator.</p>

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
                    <li>• Run generation phases (1, 2, 3)</li>
                    <li>• Generate TTS audio</li>
                    <li>• Any content creation</li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="bg-slate-900/80 border border-slate-400/20 rounded-lg p-4 my-4">
              <h4 class="text-lg font-semibold text-slate-200 mb-3">Why Local Machines?</h4>
              <p class="text-slate-400 mb-3">Claude Code agents run via browser automation on local machines using Pro Max subscriptions ($200/month). This is far more cost-effective than API calls for course generation.</p>
              <div class="text-sm text-slate-500">
                <p><strong>Data Flow:</strong> Dashboard → ngrok tunnel → Local Orchestrator → Claude Code Agents → Supabase Database</p>
              </div>
            </div>

            <div class="bg-slate-900/80 border border-slate-400/20 rounded-lg p-4 my-4">
              <h4 class="text-lg font-semibold text-slate-200 mb-3">Environment Switcher</h4>
              <p class="text-slate-400">Use the environment switcher (top right) to connect to different local machines:</p>
              <ul class="text-sm text-slate-400 mt-2 space-y-1">
                <li>• <span class="text-emerald-400">Local Development</span> - Direct connection to localhost:3456</li>
                <li>• <span class="text-emerald-400">Team Member's Machine</span> - Connect via their ngrok tunnel</li>
              </ul>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Data Storage</h3>
            <ul class="space-y-2">
              <li><strong>Supabase:</strong> Single source of truth for all content (seeds, LEGOs, practice phrases, audio metadata)</li>
              <li><strong>AWS S3:</strong> Audio file storage (ssi-audio-stage bucket)</li>
              <li><strong>Local JSON:</strong> Phase outputs also written locally for backup/debugging</li>
            </ul>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Active Phase Flow</h3>
            <div class="space-y-4 mt-4">
              <router-link to="/intelligence" class="block bg-slate-900/80 border border-slate-400/20 hover:border-emerald-500/50 rounded p-4 transition group">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-emerald-300">Phase 1: Translation + LEGO Extraction</h4>
                    <p class="text-sm text-slate-400 mt-1">Input: canonical_seeds.json → Output: draft_lego_pairs.json</p>
                  </div>
                  <span class="text-emerald-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </router-link>
              <router-link to="/intelligence" class="block bg-slate-900/80 border border-emerald-500/50 hover:border-emerald-400 rounded p-4 transition group">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-emerald-300">Phase 2: Conflict Resolution</h4>
                    <p class="text-sm text-slate-400 mt-1">Input: draft_lego_pairs.json → Output: lego_pairs.json (intros auto-scripted at end)</p>
                  </div>
                  <span class="text-emerald-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </router-link>
              <router-link to="/intelligence" class="block bg-slate-900/80 border border-slate-400/20 hover:border-emerald-500/50 rounded p-4 transition group">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-emerald-300">Phase 3: Basket Generation</h4>
                    <p class="text-sm text-slate-400 mt-1">Input: lego_pairs.json → Output: lego_baskets.json (DO NOT MODIFY - works perfectly)</p>
                  </div>
                  <span class="text-emerald-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </router-link>
              <router-link to="/intelligence" class="block bg-slate-900/80 border border-slate-400/20 hover:border-amber-500/50 rounded p-4 transition group">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-amber-300">Manifest (Script)</h4>
                    <p class="text-sm text-slate-400 mt-1">Input: all phase outputs → Output: course_manifest.json (runs instantly)</p>
                  </div>
                  <span class="text-amber-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </router-link>
              <router-link to="/intelligence" class="block bg-slate-900/80 border border-slate-400/20 hover:border-purple-500/50 rounded p-4 transition group">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-purple-300">Audio (Separate Process)</h4>
                    <p class="text-sm text-slate-400 mt-1">Input: course_manifest.json → Output: audio/*.mp3</p>
                  </div>
                  <span class="text-purple-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </router-link>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Key Features in v13</h3>
            <ul class="space-y-2">
              <li><strong>Simplified Pipeline:</strong> Phase 1 → Phase 2 → Phase 3 → Manifest → Audio. A phase triggers agents. Scripts run instantly.</li>
              <li><strong>Embedded Seed Pairs:</strong> lego_pairs.json embeds seed_pairs (no separate file needed)</li>
              <li><strong>Phase 2 Conflict Resolution:</strong> Resolves LEGO conflicts from draft output, auto-scripts intros at end</li>
              <li><strong>Phase 3 Basket Generation:</strong> DO NOT MODIFY - works perfectly</li>
              <li><strong>Overlapping LEGOs:</strong> Chunks share components for maximum recombination power (e.g., "tardaron" in multiple LEGOs)</li>
              <li><strong>Two Heuristics Edition:</strong> Remove learner uncertainty + Maximize patterns with minimum vocab</li>
              <li><strong>Batch-Aware Generation:</strong> Phase 3 reads validator output from previous batches, targets pattern gaps</li>
              <li><strong>Self-Healing Pattern Coverage:</strong> Each batch improves on previous weaknesses (missing edges, underused LEGOs)</li>
              <li><strong>Course Validators:</strong> 3 validators measure vocabulary, patterns, completeness (0-100% score)</li>
              <li><strong>Manifest Script:</strong> Not a phase - transforms outputs to fixed app manifest format instantly</li>
              <li><strong>Audio Process:</strong> Separate from pipeline phases, generates audio/*.mp3 from course_manifest.json</li>
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
