<template>
  <div class="apml-spec-view">
    <!-- Page Header (within DocsLayout) -->
    <div class="page-header">
      <h1 class="page-title">APML v14 Specification</h1>
      <p class="page-subtitle">
        Course Builder Consolidation - Simplified content creation pipeline
      </p>
      <p class="page-meta">Build: v14.0.0 | Jan 15, 2026</p>
    </div>

    <!-- Main Content -->
    <main class="content-area">
      <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8">

        <!-- Breaking Change Banner -->
        <div class="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mb-8">
          <h3 class="text-emerald-400 font-semibold flex items-center gap-2">
            <span>&#9733;</span> v14 Architecture: Course Builder Consolidation
          </h3>
          <p class="text-sm text-slate-300 mt-2">
            Phases 0-3 (translation, conflict resolution, basket generation) are now <strong>consolidated into the Course Builder API</strong>.
            Single endpoint <code class="text-emerald-300">POST /api/seed/complete</code> validates atomically (tiling, ZUT, vocabulary).
            Pipeline is now: <strong>Course Builder → Phase 8 (Audio) → Phase 9 (Manifest)</strong>.
          </p>
        </div>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">The 12 Directions</h2>
          <p class="text-slate-300 mb-4">APML v14 is guided by these architectural principles:</p>

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
            <p><strong>Core Principle:</strong> Courses own their audio. Simple is better.</p>

            <div class="bg-slate-900/50 border border-emerald-500/30 rounded p-4 my-4 font-mono text-xs">
              <pre class="text-slate-300">
┌─────────────────────────────────────────────────────────────────┐
│                     SIMPLE OWNERSHIP                            │
│                                                                 │
│  courses ──────────── course_audio ──────────── S3             │
│  (voice_config)       (text, role, s3_key)      (bytes)        │
│                                                                 │
│  shared_audio ─────────────────────────────────── S3           │
│  (encouragements, instructions)                  (bytes)        │
└─────────────────────────────────────────────────────────────────┘</pre>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Database Schema (v13)</h3>
            <div class="space-y-3 mt-4">
              <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
                <h4 class="font-semibold text-emerald-300">courses</h4>
                <p class="text-sm text-slate-400 mt-1">
                  Course metadata with voice configuration<br/>
                  <code class="text-xs">code (PK) | display_name | known_lang | target_lang | voice_config (JSONB)</code><br/>
                  <span class="text-xs text-amber-400">PRIMARY KEY(code)</span>
                </p>
              </div>
              <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
                <h4 class="font-semibold text-emerald-300">course_audio</h4>
                <p class="text-sm text-slate-400 mt-1">
                  Audio owned by courses (flat, no joins)<br/>
                  <code class="text-xs">id (UUID) | course_code | text | language | role | voice_id | origin | s3_key</code><br/>
                  <span class="text-xs text-amber-400">UNIQUE(course_code, text_normalized, language, role)</span>
                </p>
              </div>
              <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
                <h4 class="font-semibold text-emerald-300">shared_audio</h4>
                <p class="text-sm text-slate-400 mt-1">
                  Shared content (encouragements, instructions only)<br/>
                  <code class="text-xs">id (UUID) | text | language | audio_type | voice_id | origin | s3_key</code><br/>
                  <span class="text-xs text-amber-400">UNIQUE(text_normalized, language, audio_type)</span>
                </p>
              </div>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">v12 vs v13 Comparison</h3>
            <div class="overflow-x-auto">
              <table class="w-full text-sm border border-slate-600">
                <thead class="bg-slate-800">
                  <tr>
                    <th class="border border-slate-600 px-3 py-2 text-left text-emerald-300">Aspect</th>
                    <th class="border border-slate-600 px-3 py-2 text-left text-red-300">v12 (Join-based)</th>
                    <th class="border border-slate-600 px-3 py-2 text-left text-emerald-300">v13 (Flat)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="border border-slate-600 px-3 py-2">Tables</td>
                    <td class="border border-slate-600 px-3 py-2 text-red-300">texts + audio_files + course_audio</td>
                    <td class="border border-slate-600 px-3 py-2 text-emerald-300">course_audio + shared_audio</td>
                  </tr>
                  <tr>
                    <td class="border border-slate-600 px-3 py-2">Lookup</td>
                    <td class="border border-slate-600 px-3 py-2 text-red-300">JOIN across 3 tables</td>
                    <td class="border border-slate-600 px-3 py-2 text-emerald-300">Single table query</td>
                  </tr>
                  <tr>
                    <td class="border border-slate-600 px-3 py-2">Voice Config</td>
                    <td class="border border-slate-600 px-3 py-2 text-red-300">voices table</td>
                    <td class="border border-slate-600 px-3 py-2 text-emerald-300">courses.voice_config JSONB</td>
                  </tr>
                  <tr>
                    <td class="border border-slate-600 px-3 py-2">S3 Storage</td>
                    <td class="border border-slate-600 px-3 py-2 text-red-300">mastered/{uuid}.mp3</td>
                    <td class="border border-slate-600 px-3 py-2 text-emerald-300">{uuid}.mp3 (flat)</td>
                  </tr>
                  <tr>
                    <td class="border border-slate-600 px-3 py-2">Origin Tracking</td>
                    <td class="border border-slate-600 px-3 py-2 text-red-300">Inferred from voice</td>
                    <td class="border border-slate-600 px-3 py-2 text-emerald-300">Explicit: tts/human</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Audio Roles</h3>
            <div class="space-y-2 mt-4">
              <p class="text-sm"><strong class="text-emerald-300">known</strong> - Prompt in learner's known language</p>
              <p class="text-sm"><strong class="text-emerald-300">target1</strong> - First target language voice</p>
              <p class="text-sm"><strong class="text-emerald-300">target2</strong> - Second target language voice</p>
              <p class="text-sm"><strong class="text-emerald-300">presentation</strong> - LEGO introduction narration</p>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Origin Values</h3>
            <div class="space-y-2 mt-4">
              <p class="text-sm"><strong class="text-emerald-300">tts</strong> - Generated via TTS API (regenerable)</p>
              <p class="text-sm"><strong class="text-emerald-300">human</strong> - Recorded by human (precious, not regenerable)</p>
            </div>
          </div>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">Pipeline Architecture (v14)</h2>
          <div class="prose prose-invert prose-emerald max-w-none text-slate-300">

            <div class="bg-slate-900/50 border border-emerald-500/30 rounded p-3 my-3">
              <p class="text-xs text-slate-400">Pipeline v14: <span class="text-emerald-400">Course Builder (3471) → Phase 8 Audio (3465) → Phase 9 Manifest (3466)</span></p>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Service Pipeline</h3>
            <div class="overflow-x-auto">
              <table class="w-full text-sm border border-slate-600">
                <thead class="bg-slate-800">
                  <tr>
                    <th class="border border-slate-600 px-3 py-2 text-left text-emerald-300">Service</th>
                    <th class="border border-slate-600 px-3 py-2 text-left text-emerald-300">Port</th>
                    <th class="border border-slate-600 px-3 py-2 text-left text-emerald-300">Endpoint</th>
                    <th class="border border-slate-600 px-3 py-2 text-left text-emerald-300">Output</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="bg-emerald-900/20">
                    <td class="border border-slate-600 px-3 py-2 text-emerald-400 font-semibold">Course Builder</td>
                    <td class="border border-slate-600 px-3 py-2 font-mono text-xs">3471</td>
                    <td class="border border-slate-600 px-3 py-2 font-mono text-xs">POST /api/seed/complete</td>
                    <td class="border border-slate-600 px-3 py-2 font-mono text-xs">course_seeds, course_legos, course_practice_phrases</td>
                  </tr>
                  <tr class="bg-purple-900/20">
                    <td class="border border-slate-600 px-3 py-2 text-purple-400">Phase 8 Audio</td>
                    <td class="border border-slate-600 px-3 py-2 font-mono text-xs">3465</td>
                    <td class="border border-slate-600 px-3 py-2 font-mono text-xs">POST /generate</td>
                    <td class="border border-slate-600 px-3 py-2 font-mono text-xs">course_audio + S3</td>
                  </tr>
                  <tr class="bg-amber-900/20">
                    <td class="border border-slate-600 px-3 py-2 text-amber-400">Phase 9 Manifest</td>
                    <td class="border border-slate-600 px-3 py-2 font-mono text-xs">3466</td>
                    <td class="border border-slate-600 px-3 py-2 font-mono text-xs">POST /compile</td>
                    <td class="border border-slate-600 px-3 py-2 font-mono text-xs">course_manifest.json</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded">
              <p class="text-xs text-amber-300"><strong>Deprecated (v13):</strong> Phase 1 (3457), Phase 2 (3458), Phase 3 (3459) - all replaced by Course Builder</p>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Course Builder Validation</h3>
            <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4 font-mono text-xs">
              <pre class="text-slate-300">
POST /api/seed/complete validates atomically:
1. Tiling: Seed translation constructable from LEGO targets
2. ZUT Conflicts: Same known → different target = REJECT
3. Vocabulary: Phrases only use introduced vocabulary
4. Phrase Count: Minimum phrases per LEGO based on position

On failure: Nothing inserted, clear error with fix suggestions
On success: All tables updated atomically (seeds, LEGOs, phrases)</pre>
            </div>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Audio Generation Flow (v14)</h3>
            <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4 font-mono text-xs">
              <pre class="text-slate-300">
1. Get course voice_config from courses table
2. Extract audio needs from course_practice_phrases (Supabase)
3. Check what's missing: get_missing_audio() RPC
4. Generate TTS for missing audio (Azure)
5. Upload to S3: {uuid}.mp3 (flat storage)
6. INSERT INTO course_audio (course_code, text, language, role, voice_id, origin, s3_key)
7. Verify completeness: get_course_audio_summary() RPC</pre>
            </div>
          </div>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">Data Architecture (v14)</h2>
          <div class="space-y-3">
            <div class="bg-emerald-900/20 border border-emerald-500/30 rounded p-4">
              <h4 class="font-semibold text-emerald-300">Supabase Tables (Source of Truth)</h4>
              <p class="text-sm text-slate-400 mt-1">
                <strong>Course Data:</strong> <code class="text-xs">course_seeds</code>, <code class="text-xs">course_legos</code>, <code class="text-xs">course_practice_phrases</code><br/>
                <strong>Audio Registry:</strong> <code class="text-xs">courses</code>, <code class="text-xs">course_audio</code>, <code class="text-xs">shared_audio</code><br/>
                <span class="text-emerald-400 text-xs">All content written by Course Builder API, read by Phase 8 & 9</span>
              </p>
            </div>
            <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
              <h4 class="font-semibold text-slate-300">course_manifest.json</h4>
              <p class="text-sm text-slate-400 mt-1">
                Phase 9 output: compiled manifest for learning app<br/>
                Generated ON-DEMAND from Supabase (not stored, regenerable)
              </p>
            </div>
            <div class="bg-amber-900/20 border border-amber-500/30 rounded p-4">
              <h4 class="font-semibold text-amber-300">Deprecated JSON Files (v13)</h4>
              <p class="text-sm text-slate-400 mt-1">
                <span class="line-through text-slate-500">draft_lego_pairs.json, lego_pairs.json, lego_baskets.json</span><br/>
                <span class="text-xs text-amber-400">Legacy artifacts only - do not read course data from JSON files</span>
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
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">LEGO Types</h2>
          <div class="space-y-4 bg-slate-900/80 border border-slate-400/20 rounded p-4">
            <div>
              <p class="text-sm"><strong class="text-blue-300">"A" (A-type)</strong> = ATOMIC LEGO</p>
              <p class="text-xs text-slate-400 mt-1 ml-4">Smallest teachable unit that passes ZUT (Zero Uncertainty Test). Can be single-word or multi-word. The learner hears the known text and produces the target with zero ambiguity.</p>
            </div>
            <div>
              <p class="text-sm"><strong class="text-emerald-300">"M" (M-type)</strong> = MOLECULAR LEGO</p>
              <p class="text-xs text-slate-400 mt-1 ml-4">An introducible unit that CANNOT be inferred by the learner from what they already know. Required when: (1) missing components, (2) glue/filler words, or (3) order mismatch between languages.</p>
            </div>
            <div class="mt-4 bg-amber-900/20 border border-amber-500/30 rounded p-3">
              <p class="text-amber-400 text-xs font-semibold mb-2">The Inferability Test:</p>
              <p class="text-slate-300 text-xs">Given what the learner already knows, can they figure this out themselves?</p>
              <ul class="text-slate-300 text-xs mt-2 space-y-1">
                <li>• <strong class="text-emerald-300">Yes</strong> = Not a new LEGO, just tile existing A-types</li>
                <li>• <strong class="text-amber-300">No</strong> = M-type needed (requires explicit introduction)</li>
              </ul>
            </div>
            <div class="mt-3 border-t border-slate-600 pt-3">
              <p class="text-xs text-slate-500 italic">Deprecated: B/C/F type codes are no longer used. Use A-type and M-type instead.</p>
            </div>
          </div>
        </section>

      </div>
    </main>
  </div>
</template>

<script setup>
</script>

<style scoped>
.apml-spec-view {
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

.page-meta {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.25rem;
}

.content-area {
  max-width: 100%;
}
</style>
