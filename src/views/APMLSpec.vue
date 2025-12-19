<template>
  <div class="min-h-screen bg-slate-900">
    <!-- Header -->
    <header class="bg-slate-800/50 border-b border-slate-400/10 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <router-link to="/docs" class="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition mb-4">
          <span>&larr;</span>
          <span>Back to Documentation</span>
        </router-link>
        <h1 class="text-3xl font-bold text-emerald-400">
          APML v12.0.0 Specification
        </h1>
        <p class="mt-2 text-slate-400">
          Registry-based audio architecture with database-assigned UUIDs
        </p>
        <p class="mt-1 text-xs text-slate-500">
          Build: v12.0.0 | Dec 19, 2025
        </p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8">

        <!-- Breaking Change Banner -->
        <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-8">
          <h3 class="text-amber-400 font-semibold flex items-center gap-2">
            <span>&#9888;</span> v12 Breaking Change: Hash-Based UUIDs Removed
          </h3>
          <p class="text-sm text-slate-300 mt-2">
            Audio identity is now <strong>database-assigned</strong>, not hash-computed.
            This eliminates the fragility of hash mismatches from parameter variations
            (voice ID formats, language codes, text normalization).
          </p>
        </div>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">The 12 Directions</h2>
          <p class="text-slate-300 mb-4">APML v12 is guided by these architectural principles:</p>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div class="bg-slate-900/50 border border-slate-600/30 rounded p-3">
              <h4 class="text-emerald-300 font-semibold text-sm">D01: Parameterization</h4>
              <p class="text-xs text-slate-400 mt-1">Everything is a parameter. No magic numbers.</p>
            </div>
            <div class="bg-slate-900/50 border border-slate-600/30 rounded p-3">
              <h4 class="text-emerald-300 font-semibold text-sm">D02: Separation of Concerns</h4>
              <p class="text-xs text-slate-400 mt-1">Each component does one thing well.</p>
            </div>
            <div class="bg-slate-900/50 border border-slate-600/30 rounded p-3">
              <h4 class="text-emerald-300 font-semibold text-sm">D03: Immutability of Source</h4>
              <p class="text-xs text-slate-400 mt-1">Source data is never mutated, only extended.</p>
            </div>
            <div class="bg-slate-900/50 border border-slate-600/30 rounded p-3">
              <h4 class="text-emerald-300 font-semibold text-sm">D04: Idempotency</h4>
              <p class="text-xs text-slate-400 mt-1">Same operation twice = same result.</p>
            </div>
            <div class="bg-slate-900/50 border border-slate-600/30 rounded p-3">
              <h4 class="text-emerald-300 font-semibold text-sm">D05: Store Raw, Compute Derived</h4>
              <p class="text-xs text-slate-400 mt-1">Persist source of truth, compute the rest.</p>
            </div>
            <div class="bg-slate-900/50 border border-slate-600/30 rounded p-3">
              <h4 class="text-emerald-300 font-semibold text-sm">D06: Explicit over Implicit</h4>
              <p class="text-xs text-slate-400 mt-1">Make relationships and dependencies visible.</p>
            </div>
            <div class="bg-slate-900/50 border border-slate-600/30 rounded p-3">
              <h4 class="text-emerald-300 font-semibold text-sm">D07: Context-Agnostic</h4>
              <p class="text-xs text-slate-400 mt-1">Components work regardless of context.</p>
            </div>
            <div class="bg-slate-900/50 border border-slate-600/30 rounded p-3">
              <h4 class="text-emerald-300 font-semibold text-sm">D08: Explicit Feedback</h4>
              <p class="text-xs text-slate-400 mt-1">Errors include reasons, not just status.</p>
            </div>
            <div class="bg-slate-900/50 border border-slate-600/30 rounded p-3">
              <h4 class="text-emerald-300 font-semibold text-sm">D09: Progressive Enhancement</h4>
              <p class="text-xs text-slate-400 mt-1">Core works without optional features.</p>
            </div>
            <div class="bg-slate-900/50 border border-slate-600/30 rounded p-3">
              <h4 class="text-emerald-300 font-semibold text-sm">D10: Observability</h4>
              <p class="text-xs text-slate-400 mt-1">Everything can be queried and inspected.</p>
            </div>
            <div class="bg-slate-900/50 border border-slate-600/30 rounded p-3">
              <h4 class="text-emerald-300 font-semibold text-sm">D11: Reversibility</h4>
              <p class="text-xs text-slate-400 mt-1">Actions can be undone or understood.</p>
            </div>
            <div class="bg-slate-900/50 border border-slate-600/30 rounded p-3">
              <h4 class="text-emerald-300 font-semibold text-sm">D12: Composition over Config</h4>
              <p class="text-xs text-slate-400 mt-1">Build complex from simple, composable parts.</p>
            </div>
          </div>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">Audio Registry Architecture</h2>
          <div class="prose prose-invert prose-emerald max-w-none text-slate-300">
            <p><strong>Core Principle:</strong> Text exists. Audio is a rendering of text with a specific voice.</p>

            <div class="bg-slate-900/50 border border-emerald-500/30 rounded p-4 my-4 font-mono text-xs">
              <pre class="text-slate-300">
┌─────────────────────────────────────────────────────────────────┐
│                     CONTENT LIBRARY                              │
│                                                                  │
│  texts ─────────────── audio_files ─────────────── S3           │
│  (what to say)         (renderings)                (bytes)       │
│                                                                  │
│         ↑                    ↑                                   │
│         └────── courses reference what they need ────────┘       │
└─────────────────────────────────────────────────────────────────┘</pre>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Database Schema (v12)</h3>
            <div class="space-y-3 mt-4">
              <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
                <h4 class="font-semibold text-emerald-300">texts</h4>
                <p class="text-sm text-slate-400 mt-1">
                  All unique text units across all courses<br/>
                  <code class="text-xs">id (UUID) | content | language | content_normalized</code><br/>
                  <span class="text-xs text-amber-400">UNIQUE(content_normalized, language)</span>
                </p>
              </div>
              <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
                <h4 class="font-semibold text-emerald-300">audio_files</h4>
                <p class="text-sm text-slate-400 mt-1">
                  Audio renderings - each is a specific voice speaking specific text<br/>
                  <code class="text-xs">id (UUID) | text_id → texts | voice_id → voices | cadence | s3_key</code><br/>
                  <span class="text-xs text-amber-400">UNIQUE(text_id, voice_id, cadence)</span>
                </p>
              </div>
              <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
                <h4 class="font-semibold text-emerald-300">course_audio</h4>
                <p class="text-sm text-slate-400 mt-1">
                  Course-specific usage of audio (role is context, not identity)<br/>
                  <code class="text-xs">id | course_code | audio_id → audio_files | role | context</code><br/>
                  <span class="text-xs text-amber-400">UNIQUE(course_code, audio_id, role, context)</span>
                </p>
              </div>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">v11 vs v12 Comparison</h3>
            <div class="overflow-x-auto">
              <table class="w-full text-sm border border-slate-600">
                <thead class="bg-slate-800">
                  <tr>
                    <th class="border border-slate-600 px-3 py-2 text-left text-emerald-300">Aspect</th>
                    <th class="border border-slate-600 px-3 py-2 text-left text-red-300">v11 (Hash-based)</th>
                    <th class="border border-slate-600 px-3 py-2 text-left text-emerald-300">v12 (Registry-based)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="border border-slate-600 px-3 py-2">UUID Generation</td>
                    <td class="border border-slate-600 px-3 py-2 text-red-300">hash(voice:text:lang:role:cadence)</td>
                    <td class="border border-slate-600 px-3 py-2 text-emerald-300">gen_random_uuid()</td>
                  </tr>
                  <tr>
                    <td class="border border-slate-600 px-3 py-2">Lookup</td>
                    <td class="border border-slate-600 px-3 py-2 text-red-300">Compute hash, check S3</td>
                    <td class="border border-slate-600 px-3 py-2 text-emerald-300">Query database</td>
                  </tr>
                  <tr>
                    <td class="border border-slate-600 px-3 py-2">Deduplication</td>
                    <td class="border border-slate-600 px-3 py-2 text-red-300">Hash collision</td>
                    <td class="border border-slate-600 px-3 py-2 text-emerald-300">UNIQUE constraints</td>
                  </tr>
                  <tr>
                    <td class="border border-slate-600 px-3 py-2">Debugging</td>
                    <td class="border border-slate-600 px-3 py-2 text-red-300">Hash is opaque</td>
                    <td class="border border-slate-600 px-3 py-2 text-emerald-300">SELECT * FROM texts WHERE...</td>
                  </tr>
                  <tr>
                    <td class="border border-slate-600 px-3 py-2">Cross-course sharing</td>
                    <td class="border border-slate-600 px-3 py-2 text-red-300">Same hash (fragile)</td>
                    <td class="border border-slate-600 px-3 py-2 text-emerald-300">Same text_id (robust)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">Pipeline Architecture</h2>
          <div class="prose prose-invert prose-emerald max-w-none text-slate-300">

            <div class="bg-slate-900/50 border border-emerald-500/30 rounded p-3 my-3">
              <p class="text-xs text-slate-400">Pipeline: <span class="text-emerald-400">Phase 1 (Translation + LEGO) → Phase 2 (Conflict Resolution) → Phase 3 (Baskets) → Phase 8 (Audio) → Phase 9 (Manifest)</span></p>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Phase Pipeline</h3>
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
                    <td class="border border-slate-600 px-3 py-2 font-mono text-xs">lego_baskets.json + Supabase</td>
                  </tr>
                  <tr class="bg-purple-900/20">
                    <td class="border border-slate-600 px-3 py-2 text-purple-400">8</td>
                    <td class="border border-slate-600 px-3 py-2 text-purple-400">Audio Generation (v12)</td>
                    <td class="border border-slate-600 px-3 py-2 font-mono text-xs">course_practice_phrases</td>
                    <td class="border border-slate-600 px-3 py-2 font-mono text-xs">texts + audio_files + S3</td>
                  </tr>
                  <tr class="bg-amber-900/20">
                    <td class="border border-slate-600 px-3 py-2 text-amber-400">9</td>
                    <td class="border border-slate-600 px-3 py-2 text-amber-400">Manifest Compilation</td>
                    <td class="border border-slate-600 px-3 py-2 font-mono text-xs">audio_files (query)</td>
                    <td class="border border-slate-600 px-3 py-2 font-mono text-xs">course_manifest.json</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Audio Generation Flow (v12)</h3>
            <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4 font-mono text-xs">
              <pre class="text-slate-300">
1. Extract audio needs from course_practice_phrases
2. For each need: call find_or_create_audio()
   → Returns audio_id + needs_generation flag
3. Batch all needing generation (s3_key IS NULL)
4. Generate TTS (Azure/ElevenLabs)
5. Upload to S3: mastered/{audio_id}.mp3
6. UPDATE audio_files SET s3_key = ... WHERE id = ...
7. Link to course via course_audio table</pre>
            </div>
          </div>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">Core Data Files</h2>
          <div class="space-y-3">
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
                Phase 2 output: conflict-free LEGOs (SINGLE SOURCE OF TRUTH)<br/>
                <code class="text-xs">{"version": "9.0", "seeds": [[seed_id, [t,k], [[lego_id, type, t, k]]]]}</code>
              </p>
            </div>
            <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
              <h4 class="font-semibold text-emerald-300">lego_baskets.json</h4>
              <p class="text-sm text-slate-400 mt-1">
                Phase 3 output: learning baskets with enabling/discovery phrases<br/>
                <code class="text-xs">{"version": "9.0", "baskets": {lego_id: [[lego], [e-phrases], [d-phrases]]}}</code>
              </p>
            </div>
            <div class="bg-slate-900/80 border border-purple-400/20 rounded p-4">
              <h4 class="font-semibold text-purple-300">Supabase Tables (v12)</h4>
              <p class="text-sm text-slate-400 mt-1">
                Audio registry: <code class="text-xs">texts</code>, <code class="text-xs">audio_files</code>, <code class="text-xs">course_audio</code><br/>
                Practice data: <code class="text-xs">course_practice_phrases</code>, <code class="text-xs">practice_cycles</code>
              </p>
            </div>
          </div>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">Key Algorithms</h2>
          <div class="space-y-4">
            <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
              <h4 class="font-semibold text-emerald-300">find_or_create_audio()</h4>
              <p class="text-sm text-slate-400 mt-2">
                Idempotent database function: finds existing audio or creates entry.<br/>
                Returns <code class="text-xs">{audio_id, s3_key, needs_generation}</code>
              </p>
            </div>
            <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
              <h4 class="font-semibold text-emerald-300">FCFS vs Utility</h4>
              <p class="text-sm text-slate-400 mt-2">
                Balances First-Can-First-Say chronological order against pedagogical utility scores.
              </p>
            </div>
            <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
              <h4 class="font-semibold text-emerald-300">IRON RULE</h4>
              <p class="text-sm text-slate-400 mt-2">
                No LEGO begins or ends with a preposition. Absolute rule enforced during Phase 1.
              </p>
            </div>
            <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
              <h4 class="font-semibold text-emerald-300">Graph Edge Coverage</h4>
              <p class="text-sm text-slate-400 mt-2">
                Pattern-aware basket construction maximizes unique LEGO adjacency edge coverage.
              </p>
            </div>
          </div>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">Type Codes</h2>
          <div class="space-y-2 bg-slate-900/80 border border-slate-400/20 rounded p-4">
            <p class="text-sm"><strong class="text-emerald-300">"B"</strong> = BASE LEGO (atomic, indivisible teaching chunk)</p>
            <p class="text-sm"><strong class="text-emerald-300">"C"</strong> = COMPOSITE LEGO (multi-word phrase with feeder components)</p>
            <p class="text-sm"><strong class="text-emerald-300">"F"</strong> = FEEDER (component of a composite, taught before the whole)</p>
          </div>
        </section>

      </div>
    </main>
  </div>
</template>

<script setup>
console.log('APML Specification Loaded')
</script>
