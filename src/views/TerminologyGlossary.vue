<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8">
    <div class="max-w-5xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <router-link to="/" class="text-emerald-400 hover:text-emerald-300 mb-4 inline-block">
          ← Back to Dashboard
        </router-link>
        <h1 class="text-4xl font-bold text-emerald-400 mb-2">Terminology Glossary</h1>
        <p class="text-slate-400">Single source of truth for all SSi Course Production terminology</p>
        <p class="text-sm text-slate-500 mt-2">Date: 2025-10-14 | Status: User-confirmed definitions</p>
      </div>

      <!-- Core Concepts Section -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-6">The 3 Core User-Facing Concepts</h2>

        <!-- SEED_PAIRS -->
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          <h3 class="text-xl font-semibold text-emerald-300 mb-3">1. SEED_PAIRS</h3>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Definition:</span>
            <p class="text-slate-200 mt-1">Pedagogically optimized translation of a canonical seed into both target and known languages</p>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Reference Format:</span>
            <p class="text-slate-200 mt-1">S0001 to S0668 (S + 4-digit number)</p>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Structure:</span>
            <pre class="bg-slate-900 p-4 rounded mt-2 text-sm overflow-x-auto"><code>{
  "seed_id": "S0041",
  "canonical_english": "I want to speak",
  "target_language": "Voglio parlare",
  "known_language": "Je veux parler",
  "metadata": { ... }
}</code></pre>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Key Properties:</span>
            <ul class="list-disc list-inside text-slate-200 mt-2 space-y-1">
              <li>Total: 668 per course</li>
              <li>Language-direction specific (ita_for_fra has different SEED_PAIRS than ita_for_eng)</li>
              <li>Must be "lego_complete" - decomposes into LEGO_PAIRS that tile back perfectly</li>
              <li><strong>User can view/edit:</strong> See all known-target pairs</li>
            </ul>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-slate-400">Phase:</span>
              <span class="text-emerald-400 ml-2 font-medium">Phase 1 (Pedagogical Translation)</span>
            </div>
            <div>
              <span class="text-slate-400">Storage:</span>
              <span class="text-slate-300 ml-2">vfs/courses/{course_code}/amino_acids/translations/</span>
            </div>
          </div>
        </div>

        <!-- LEGO_PAIRS -->
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          <h3 class="text-xl font-semibold text-emerald-300 mb-3">2. LEGO_PAIRS</h3>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Definition:</span>
            <p class="text-slate-200 mt-1">Forward-deterministic teaching unit extracted from SEED_PAIRS. A LEGO cannot exist unless it has BOTH target and known languages mapped.</p>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Reference Format:</span>
            <p class="text-slate-200 mt-1">S0041L02 (seed reference + L + position)</p>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Structure (BASE LEGO example):</span>
            <pre class="bg-slate-900 p-4 rounded mt-2 text-sm overflow-x-auto"><code>{
  "provenance": "S0041L01",
  "target_text": "Voglio",
  "known_text": "Je veux",
  "type": "BASE",
  "metadata": { ... }
}</code></pre>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Example Breakdown:</span>
            <div class="bg-slate-900 p-4 rounded mt-2 text-sm">
              <p class="text-slate-300 mb-2">SEED_PAIR S0041: "I want to speak"</p>
              <p class="text-slate-400 mb-3">Decomposes into 2 LEGO_PAIRS:</p>
              <ul class="space-y-2 text-slate-300">
                <li>• <strong>S0041L01:</strong> "Voglio" = "Je veux" (I want) - BASE LEGO</li>
                <li>• <strong>S0041L02:</strong> "parlare" = "parler" (to speak) - BASE LEGO</li>
              </ul>
              <p class="text-emerald-400 mt-3 text-xs">✓ These 2 LEGOs tile perfectly to reconstruct the SEED_PAIR (lego_complete)</p>
            </div>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Key Properties:</span>
            <ul class="list-disc list-inside text-slate-200 mt-2 space-y-1">
              <li>Course-specific AND language-direction specific</li>
              <li>Must pass FD_LOOP test (target → known → target = IDENTICAL)</li>
              <li>Two types:
                <ul class="list-disc list-inside ml-6 mt-1">
                  <li><strong>BASE LEGO:</strong> Atomic, cannot be decomposed further</li>
                  <li><strong>COMPOSITE LEGO:</strong> Contains BASE LEGOs + glue words, needs componentization</li>
                </ul>
              </li>
              <li><strong>User can view/edit:</strong> See all SEED_PAIR to LEGO_PAIRS breakdowns with provenance</li>
              <li><strong>Editing:</strong> Movable dividers to try different decompositions</li>
              <li>Count: ~2000-3000 per course</li>
            </ul>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-slate-400">Phase:</span>
              <span class="text-emerald-400 ml-2 font-medium">Phase 3 (LEGO Decomposition)</span>
            </div>
            <div>
              <span class="text-slate-400">Storage:</span>
              <span class="text-slate-300 ml-2">vfs/courses/{course_code}/amino_acids/legos_deduplicated/</span>
            </div>
          </div>

          <div class="mt-4 bg-slate-900 p-4 rounded">
            <p class="text-sm text-slate-400 mb-2"><strong>Critical Concept: "lego_complete"</strong></p>
            <p class="text-slate-300 text-sm">LEGO_PAIRS must tile to re-form the SEED_PAIR precisely. No gaps, no overlaps, perfect reconstruction.</p>
          </div>
        </div>

        <!-- LEGO_BASKETS -->
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          <h3 class="text-xl font-semibold text-emerald-300 mb-3">3. LEGO_BASKETS</h3>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Definition:</span>
            <p class="text-slate-200 mt-1">Complete set of practice phrases associated with ONE LEGO_PAIR, showing how the new LEGO plugs into previously learned LEGOs.</p>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Structure:</span>
            <pre class="bg-slate-900 p-4 rounded mt-2 text-sm overflow-x-auto"><code>{
  "lego_pair_id": "S0041L02",
  "debut_phrases": [ ... ],    // Up to 8 d-phrases
  "eternal_phrases": [ ... ],  // Up to 5 e-phrases
  "metadata": { ... }
}</code></pre>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Contains TWO types of practice phrases with fundamentally different purposes:</span>
            <div class="space-y-3 mt-2">
              <div class="bg-slate-900 p-3 rounded border-l-4 border-emerald-500">
                <p class="text-emerald-300 font-medium mb-2">ETERNAL_PHRASES (e-phrases): Permanent Practice Material</p>
                <div class="mb-2 bg-slate-800 p-2 rounded">
                  <p class="text-xs font-semibold text-emerald-400 mb-1">⏰ WHEN USED:</p>
                  <p class="text-slate-300 text-xs">At ANY point in the course AFTER this LEGO's introduction - reusable FOREVER</p>
                </div>
                <div class="mb-2 bg-slate-800 p-2 rounded">
                  <p class="text-xs font-semibold text-amber-400 mb-1">🔁 FREQUENCY:</p>
                  <p class="text-slate-300 text-xs">Permanent practice material - practiced hundreds of times throughout entire course</p>
                </div>
                <div class="mb-2 bg-slate-800 p-2 rounded">
                  <p class="text-xs font-semibold text-blue-400 mb-1">🎯 PURPOSE:</p>
                  <p class="text-slate-300 text-xs">Long-term practice for this LEGO (e.g., learner at lesson #50 practicing LEGO #10 uses these)</p>
                </div>
                <div class="bg-red-900/30 p-2 rounded border border-red-700">
                  <p class="text-xs font-semibold text-red-300 mb-1">✅ QUALITY REQUIREMENT:</p>
                  <ul class="list-disc list-inside text-slate-300 text-xs space-y-1">
                    <li>MUST be excellent, natural, conversational (7-10 words)</li>
                    <li>Perfect grammar in BOTH languages</li>
                    <li>Quality over quantity (3 excellent > 5 forced)</li>
                    <li><strong class="text-red-400">UNFORGIVEABLE to have grammar errors</strong> - these are practiced forever!</li>
                  </ul>
                </div>
              </div>

              <div class="bg-slate-900 p-3 rounded border-l-4 border-blue-500">
                <p class="text-blue-300 font-medium mb-2">DEBUT_PHRASES (d-phrases): Temporary Scaffolding</p>
                <div class="mb-2 bg-slate-800 p-2 rounded">
                  <p class="text-xs font-semibold text-emerald-400 mb-1">⏰ WHEN USED:</p>
                  <p class="text-slate-300 text-xs">ONLY during this LEGO's FIRST introduction - used ONCE, never repeated</p>
                </div>
                <div class="mb-2 bg-slate-800 p-2 rounded">
                  <p class="text-xs font-semibold text-amber-400 mb-1">🔁 FREQUENCY:</p>
                  <p class="text-slate-300 text-xs">Temporary scaffolding - shown once during debut, then discarded forever</p>
                </div>
                <div class="mb-2 bg-slate-800 p-2 rounded">
                  <p class="text-xs font-semibold text-blue-400 mb-1">🎯 PURPOSE:</p>
                  <p class="text-slate-300 text-xs">Help learner build up to full sentences progressively (2-LEGO → 3-LEGO → 4-LEGO → 5-LEGO)</p>
                </div>
                <div class="bg-blue-900/30 p-2 rounded border border-blue-700">
                  <p class="text-xs font-semibold text-blue-300 mb-1">✅ QUALITY REQUIREMENT:</p>
                  <ul class="list-disc list-inside text-slate-300 text-xs space-y-1">
                    <li>Syntactically correct, but CAN be awkward fragments</li>
                    <li>Expanding window fragments (progressive vocabulary only)</li>
                    <li>Focus on demonstrating progressive complexity, not naturalness</li>
                    <li>Temporary learning aids - quality less critical since used once</li>
                  </ul>
                </div>
              </div>

              <div class="bg-amber-900/20 p-3 rounded border border-amber-700 mt-3">
                <p class="text-xs font-semibold text-amber-300 mb-2">🏍️ ANALOGY: Training Wheels</p>
                <p class="text-slate-300 text-xs mb-2"><strong>E-phrases</strong> = Actual cycling (used forever after you learn)</p>
                <p class="text-slate-300 text-xs"><strong>D-phrases</strong> = Training wheels (used once during initial learning, then removed)</p>
              </div>
            </div>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Key Properties:</span>
            <ul class="list-disc list-inside text-slate-200 mt-2 space-y-1">
              <li><strong>One basket per LEGO_PAIR (1:1 relationship)</strong></li>
              <li>Shows how new LEGO combines with existing LEGOs</li>
              <li>Progressive vocabulary constraint (only use previously learned LEGOs)</li>
              <li>Count: Matches LEGO_PAIRS count (if 2341 LEGO_PAIRS → 2341 LEGO_BASKETS)</li>
            </ul>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-slate-400">Phase:</span>
              <span class="text-emerald-400 ml-2 font-medium">Phase 5 (Basket Generation)</span>
            </div>
            <div>
              <span class="text-slate-400">Storage:</span>
              <span class="text-slate-300 ml-2">vfs/courses/{course_code}/amino_acids/baskets/</span>
            </div>
          </div>
        </div>
      </section>

      <!-- LEGO Types Section -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-6">LEGO Types (Critical Distinction)</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- BASE LEGO -->
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-emerald-300 mb-3">BASE LEGO</h3>
            <ul class="list-disc list-inside text-slate-200 space-y-2">
              <li>Fundamental FD unit</li>
              <li>Cannot be decomposed further</li>
              <li>Single, atomic unit</li>
            </ul>
            <div class="mt-4 bg-slate-900 p-3 rounded">
              <p class="text-sm text-slate-400 mb-1">Examples:</p>
              <p class="text-slate-200 text-sm">"Voglio" = "I want"</p>
              <p class="text-slate-200 text-sm">"voy" = "I'm going"</p>
            </div>
          </div>

          <!-- COMPOSITE LEGO -->
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-emerald-300 mb-3">COMPOSITE LEGO</h3>
            <ul class="list-disc list-inside text-slate-200 space-y-2">
              <li>FD unit comprising BASE LEGOs + glue words</li>
              <li>BASE LEGOs within DO NOT TILE (can't concatenate cleanly)</li>
              <li>Needs componentization explanation</li>
            </ul>
            <div class="mt-4 bg-slate-900 p-3 rounded">
              <p class="text-sm text-slate-400 mb-1">Examples:</p>
              <p class="text-slate-200 text-sm">"voy a decir" = "I'm going to say" (glue: "a")</p>
              <p class="text-slate-200 text-sm">"sto per esercitarmi" = "I'm going to practice" (glue: "per")</p>
            </div>
          </div>
        </div>

        <!-- FEEDERS -->
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mt-6">
          <h3 class="text-lg font-semibold text-emerald-300 mb-3">FEEDERS</h3>
          <p class="text-slate-200 mb-3">BASE LEGOs that participate in a COMPOSITE</p>
          <ul class="list-disc list-inside text-slate-200 space-y-2">
            <li>Have dual existence:
              <ol class="list-decimal list-inside ml-6 mt-1 text-slate-300">
                <li>As independent BASE LEGOs (with their own baskets)</li>
                <li>As components within COMPOSITE LEGO</li>
              </ol>
            </li>
            <li>Referenced with F## suffix in COMPOSITE context (e.g., S0041F01)</li>
          </ul>
        </div>
      </section>

      <!-- Reference Formats Section -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-6">Reference Formats</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-emerald-300 mb-3">Seed References</h3>
            <ul class="text-slate-200 space-y-2">
              <li><strong>Format:</strong> S + 4-digit number</li>
              <li><strong>Range:</strong> S0001 to S0668</li>
              <li><strong>Example:</strong> <code class="bg-slate-900 px-2 py-1 rounded">S0041</code></li>
            </ul>
          </div>

          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-emerald-300 mb-3">LEGO References</h3>
            <ul class="text-slate-200 space-y-2">
              <li><strong>Format:</strong> S{"{seed}"}L{"{position}"}</li>
              <li><strong>Example:</strong> <code class="bg-slate-900 px-2 py-1 rounded">S0041L02</code> (Seed 41, LEGO position 2)</li>
              <li><strong>Feeder Format:</strong> S{"{seed}"}F{"{position}"}</li>
              <li><strong>Example:</strong> <code class="bg-slate-900 px-2 py-1 rounded">S0041F01</code> (Seed 41, FEEDER position 1)</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Supporting Concepts Section -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-6">Supporting Concepts</h2>

        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 class="text-lg font-semibold text-emerald-300 mb-3">LEGO_INTRODUCTIONS</h3>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Definition:</span>
            <p class="text-slate-200 mt-1">Intelligence about LEGO type (BASE vs COMPOSITE) and componentization details</p>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Structure:</span>
            <pre class="bg-slate-900 p-4 rounded mt-2 text-sm overflow-x-auto"><code>{
  "lego_pair_id": "S0041L02",
  "type": "COMPOSITE",
  "feeders": [
    { "id": "F01", "target": "voy", "known": "I'm going" },
    { "id": "F02", "target": "a decir", "known": "to say" }
  ],
  "componentization": {
    "explanation": "You already know 'voy' and 'decir', just add 'a' to connect them"
  }
}</code></pre>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Key Properties:</span>
            <ul class="list-disc list-inside text-slate-200 mt-2 space-y-1">
              <li>Explains BASE vs COMPOSITE distinction</li>
              <li>For COMPOSITE LEGOs: shows how they break down into FEEDERs</li>
              <li>Helps learner understand "you already know the parts"</li>
            </ul>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-slate-400">Phase:</span>
              <span class="text-emerald-400 ml-2 font-medium">Phase 6 (Introductions)</span>
            </div>
            <div>
              <span class="text-slate-400">Storage:</span>
              <span class="text-slate-300 ml-2">vfs/courses/{course_code}/amino_acids/introductions/</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Terminology to Avoid Section -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-red-400 mb-6">Terminology to Avoid (Confusing/Ambiguous)</h2>

        <div class="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
          <ul class="space-y-2 text-slate-200">
            <li>❌ <strong>"Translations"</strong> → Use <span class="text-emerald-400">SEED_PAIRS</span></li>
            <li>❌ <strong>"LEGOs"</strong> (alone) → Use <span class="text-emerald-400">LEGO_PAIRS</span> (clearer that both languages required)</li>
            <li>❌ <strong>"Baskets"</strong> (alone) → Use <span class="text-emerald-400">LEGO_BASKETS</span> (clearer what's in them)</li>
            <li>❌ <strong>"Amino acids"</strong> → Remove (was metaphor for LEGO_PAIRS, Claude got carried away)</li>
            <li>❌ <strong>"Teaching units"</strong> → Use <span class="text-emerald-400">LEGO_PAIRS</span> (specific term)</li>
            <li>❌ <strong>"Lessons"</strong> → Use <span class="text-emerald-400">LEGO_BASKETS</span> (clearer structure)</li>
          </ul>
        </div>
      </section>

    </div>
  </div>
</template>

<script setup>
// No script needed for static content display
</script>
