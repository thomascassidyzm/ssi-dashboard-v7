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
        <p class="text-sm text-slate-500 mt-2">Date: 2025-11-20 | APML v8.2.0 | Status: Current definitions</p>
      </div>

      <!-- Quick Reference -->
      <div class="bg-emerald-900/20 border border-emerald-500/50 rounded-lg p-6 mb-12">
        <h2 class="text-xl font-semibold text-emerald-300 mb-4">🎯 Quick Reference</h2>
        <div class="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <p class="text-emerald-400 font-semibold mb-2">The 3 Core Concepts</p>
            <ul class="text-slate-300 space-y-1">
              <li>• SEED_PAIRS (668 per course)</li>
              <li>• LEGO_PAIRS (~3000 per course)</li>
              <li>• LEGO_BASKETS (one per new LEGO)</li>
            </ul>
          </div>
          <div>
            <p class="text-amber-400 font-semibold mb-2">LEGO Types</p>
            <ul class="text-slate-300 space-y-1">
              <li>• <strong>A-type:</strong> ATOMIC (simple chunks)</li>
              <li>• <strong>M-type:</strong> MOLECULAR (with components)</li>
            </ul>
          </div>
          <div>
            <p class="text-blue-400 font-semibold mb-2">Storage Format</p>
            <ul class="text-slate-300 space-y-1">
              <li>• seed_pairs.json</li>
              <li>• lego_pairs.json</li>
              <li>• lego_baskets.json</li>
              <li>• introductions.json</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Core Concepts Section -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-6">The 3 Core Concepts</h2>

        <!-- SEED_PAIRS -->
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          <h3 class="text-xl font-semibold text-emerald-300 mb-3">1. SEED_PAIRS</h3>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Definition:</span>
            <p class="text-slate-200 mt-1">Pedagogically optimized translation of a canonical seed into both target and known languages</p>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Example:</span>
            <div class="bg-slate-900 p-4 rounded mt-2">
              <p class="text-slate-300 text-sm mb-2"><strong>Canonical:</strong> "I want to speak {target} with you now."</p>
              <p class="text-slate-300 text-sm mb-2"><strong>Known (English):</strong> "I want to speak Spanish with you now."</p>
              <p class="text-slate-300 text-sm"><strong>Target (Spanish):</strong> "Quiero hablar español contigo ahora."</p>
            </div>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Reference Format:</span>
            <p class="text-slate-200 mt-1">S0001 to S0668 (S + 4-digit number)</p>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Key Properties:</span>
            <ul class="list-disc list-inside text-slate-200 mt-2 space-y-1">
              <li>Total: 668 per course (pedagogically ordered)</li>
              <li>Language-pair specific (spa_for_eng ≠ spa_for_fra)</li>
              <li>Must be "LEGO complete" - decomposes into LEGOs that tile back perfectly</li>
            </ul>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-slate-400">Phase:</span>
              <span class="text-emerald-400 ml-2 font-medium">Phase 1 (Pedagogical Translation)</span>
            </div>
            <div>
              <span class="text-slate-400">Storage:</span>
              <span class="text-slate-300 ml-2 font-mono text-xs">vfs/courses/{course_code}/seed_pairs.json</span>
            </div>
          </div>
        </div>

        <!-- LEGO_PAIRS -->
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          <h3 class="text-xl font-semibold text-emerald-300 mb-3">2. LEGO_PAIRS</h3>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Definition:</span>
            <p class="text-slate-200 mt-1">Teaching units extracted from SEED_PAIRS. A LEGO is a pedagogically-sound chunk that removes learner uncertainty.</p>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">The Two Heuristics:</span>
            <div class="bg-slate-900 p-4 rounded mt-2 space-y-3">
              <div>
                <p class="text-emerald-400 font-semibold text-sm">1. Remove Learner Uncertainty</p>
                <p class="text-slate-300 text-xs">When learner hears KNOWN phrase → ZERO uncertainty about TARGET phrase</p>
              </div>
              <div>
                <p class="text-amber-400 font-semibold text-sm">2. Maximize Patterns with Minimum Vocab</p>
                <p class="text-slate-300 text-xs">Create overlapping chunks → each LEGO generates multiple sentence patterns</p>
              </div>
            </div>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Reference Format:</span>
            <p class="text-slate-200 mt-1">S0001L01, S0001L02... (seed + L + position)</p>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Example Breakdown:</span>
            <div class="bg-slate-900 p-4 rounded mt-2 text-sm">
              <p class="text-slate-300 mb-2"><strong>SEED_PAIR S0001:</strong></p>
              <p class="text-slate-400 mb-1">Known: "I want to speak Spanish with you now."</p>
              <p class="text-slate-400 mb-3">Target: "Quiero hablar español contigo ahora."</p>

              <p class="text-emerald-400 mb-2">Decomposes into 5 LEGO_PAIRS:</p>
              <ul class="space-y-1 text-slate-300 ml-4">
                <li>• <strong>S0001L01:</strong> "quiero" = "I want" <span class="text-xs text-blue-400">(A-type: ATOMIC)</span></li>
                <li>• <strong>S0001L02:</strong> "hablar" = "to speak" <span class="text-xs text-blue-400">(A-type: ATOMIC)</span></li>
                <li>• <strong>S0001L03:</strong> "español" = "Spanish" <span class="text-xs text-blue-400">(A-type: ATOMIC)</span></li>
                <li>• <strong>S0001L04:</strong> "contigo" = "with you" <span class="text-xs text-blue-400">(A-type: ATOMIC)</span></li>
                <li>• <strong>S0001L05:</strong> "ahora" = "now" <span class="text-xs text-blue-400">(A-type: ATOMIC)</span></li>
              </ul>

              <p class="text-emerald-400 mt-3 text-xs">✓ These 5 LEGOs tile perfectly to reconstruct the SEED_PAIR (LEGO complete)</p>
            </div>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Key Properties:</span>
            <ul class="list-disc list-inside text-slate-200 mt-2 space-y-1">
              <li>Course-specific AND language-pair specific</li>
              <li>Two types: A-type (ATOMIC) and M-type (MOLECULAR)</li>
              <li>Count: ~2500-3500 per course (depends on language complexity)</li>
              <li>Overlapping allowed - maximizes recombination power</li>
            </ul>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-slate-400">Phase:</span>
              <span class="text-emerald-400 ml-2 font-medium">Phase 3 (LEGO Extraction)</span>
            </div>
            <div>
              <span class="text-slate-400">Storage:</span>
              <span class="text-slate-300 ml-2 font-mono text-xs">vfs/courses/{course_code}/lego_pairs.json</span>
            </div>
          </div>
        </div>

        <!-- LEGO_BASKETS -->
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          <h3 class="text-xl font-semibold text-emerald-300 mb-3">3. LEGO_BASKETS</h3>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Definition:</span>
            <p class="text-slate-200 mt-1">10 practice phrases for ONE LEGO, showing how it plugs into previously-learned LEGOs</p>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Structure:</span>
            <div class="bg-slate-900 p-4 rounded mt-2 text-sm">
              <p class="text-slate-300 mb-3"><strong>10 practice phrases in progressive complexity:</strong></p>
              <div class="space-y-2">
                <div class="bg-slate-800 p-3 rounded border-l-4 border-blue-500">
                  <p class="text-blue-300 font-semibold mb-1">Phrases 1-8: Scaffolding (Debut Practice)</p>
                  <p class="text-slate-300 text-xs mb-2">Used ONCE during first introduction of this LEGO</p>
                  <p class="text-slate-400 text-xs">Progressive complexity: 2 short → 2 medium → 2 longer → 2 more complex</p>
                </div>
                <div class="bg-slate-800 p-3 rounded border-l-4 border-emerald-500">
                  <p class="text-emerald-300 font-semibold mb-1">Phrases 9-10: Eternal Practice</p>
                  <p class="text-slate-300 text-xs mb-2">Used FOREVER - practiced hundreds of times throughout course</p>
                  <p class="text-slate-400 text-xs">Most complex, natural, conversational phrases (7-10 words)</p>
                </div>
              </div>
              <p class="text-amber-400 text-xs mt-3">App "pulls from both ends" - phrase #1 for simplest, phrase #10 for most complex</p>
            </div>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Example for "quiero" (I want):</span>
            <pre class="bg-slate-900 p-4 rounded mt-2 text-xs overflow-x-auto"><code>[
  {"known": "I want", "target": "Quiero"},                                    // Phrase 1: bare LEGO
  {"known": "I want to speak", "target": "Quiero hablar"},                    // Phrase 2: 2 LEGOs
  {"known": "I want to speak Spanish", "target": "Quiero hablar español"},    // Phrase 3: 3 LEGOs
  {"known": "I want to speak with you", "target": "Quiero hablar contigo"},   // Phrase 4: 3 LEGOs
  {"known": "I want to speak Spanish with you", "target": "Quiero hablar español contigo"},  // Phrase 5: 4 LEGOs
  ...                                                                          // Phrases 6-8: continue building
  {"known": "I want to speak Spanish with you now and tomorrow", "target": "Quiero hablar español contigo ahora y mañana"},  // Phrase 9: ETERNAL
  {"known": "I want to speak Spanish with you now", "target": "Quiero hablar español contigo ahora"}  // Phrase 10: ETERNAL (complete seed)
]</code></pre>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Key Properties:</span>
            <ul class="list-disc list-inside text-slate-200 mt-2 space-y-1">
              <li><strong>One basket per new LEGO</strong> (1:1 relationship)</li>
              <li>Exactly 10 phrases per basket (2-2-2-4 distribution: 2 simple, 2 medium, 2 longer, 4 longest)</li>
              <li><strong>Vocabulary constraint:</strong> Can ONLY use LEGOs learner already knows</li>
              <li>Final LEGO in seed → phrase #10 = complete seed sentence</li>
              <li>Count: Matches new LEGO count (~2500-3500 baskets per course)</li>
            </ul>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-slate-400">Phase:</span>
              <span class="text-emerald-400 ml-2 font-medium">Phase 5 (Basket Generation)</span>
            </div>
            <div>
              <span class="text-slate-400">Storage:</span>
              <span class="text-slate-300 ml-2 font-mono text-xs">vfs/courses/{course_code}/lego_baskets.json</span>
            </div>
          </div>
        </div>
      </section>

      <!-- LEGO Types Section -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-6">LEGO Types (ATOMIC vs MOLECULAR)</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- ATOMIC -->
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-blue-300 mb-3">A-type: ATOMIC</h3>
            <ul class="list-disc list-inside text-slate-200 space-y-2 text-sm">
              <li>Cannot be split, even in principle</li>
              <li>Like an atom - indivisible</li>
              <li>Must be 2+ words in at least one language</li>
              <li>No component breakdown possible</li>
            </ul>
            <div class="mt-4 bg-slate-900 p-3 rounded">
              <p class="text-sm text-slate-400 mb-1">Examples:</p>
              <p class="text-slate-200 text-sm">"quiero" = "I want" <span class="text-xs text-slate-500">(can't split "I want")</span></p>
              <p class="text-slate-200 text-sm">"hablar" = "to speak" <span class="text-xs text-slate-500">(can't split "to speak")</span></p>
              <p class="text-slate-200 text-sm">"que hables" = "you to speak" <span class="text-xs text-slate-500">(indivisible)</span></p>
            </div>
          </div>

          <!-- MOLECULAR -->
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-emerald-300 mb-3">M-type: MOLECULAR</h3>
            <ul class="list-disc list-inside text-slate-200 space-y-2 text-sm">
              <li>The MOLECULE is the unit that passes LUT</li>
              <li>Shows component breakdown for pedagogy</li>
              <li>Components reveal patterns and word order</li>
              <li>You chunk UP to get consistent meaning</li>
            </ul>
            <div class="mt-4 bg-slate-900 p-3 rounded space-y-3">
              <div>
                <p class="text-sm text-slate-400 mb-1">Example: "you to speak"</p>
                <p class="text-slate-200 text-sm mb-1"><strong>Target:</strong> "que hables"</p>
                <p class="text-amber-400 text-xs mb-1">Components:</p>
                <p class="text-slate-300 text-xs ml-2">• "you" → "que"</p>
                <p class="text-slate-300 text-xs ml-2">• "to speak" → "hables"</p>
                <p class="text-emerald-400 text-xs mt-2">→ Different pattern! Molecule is the unit.</p>
              </div>
              <div>
                <p class="text-sm text-slate-400 mb-1">Example: "ready to go"</p>
                <p class="text-slate-200 text-sm mb-1"><strong>Target:</strong> "preparado para ir"</p>
                <p class="text-amber-400 text-xs mb-1">Components:</p>
                <p class="text-slate-300 text-xs ml-2">• "ready" → "preparado"</p>
                <p class="text-slate-300 text-xs ml-2">• "to go" → "para ir"</p>
                <p class="text-emerald-400 text-xs mt-2">→ Components show pattern, molecule is the teaching unit.</p>
              </div>
              <div>
                <p class="text-sm text-slate-400 mb-1">Example: "I've been learning"</p>
                <p class="text-slate-200 text-sm mb-1"><strong>Target:</strong> "llevo aprendiendo"</p>
                <p class="text-amber-400 text-xs mb-1">Components:</p>
                <p class="text-slate-300 text-xs ml-2">• "I've been" → "llevo"</p>
                <p class="text-slate-300 text-xs ml-2">• "learning" → "aprendiendo"</p>
                <p class="text-emerald-400 text-xs mt-2">→ Idiom/pattern needs the whole molecule!</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Componentization -->
        <div class="bg-gradient-to-r from-emerald-900/30 to-blue-900/30 border-2 border-emerald-500/50 rounded-lg p-6 mt-6">
          <h3 class="text-xl font-semibold text-emerald-300 mb-4">🔬 Componentization: The Pedagogical Superpower</h3>

          <p class="text-slate-200 mb-4">M-type LEGOs show <strong>literal translations</strong> component-by-component. Learners discover grammar patterns through transparent literal meanings.</p>

          <div class="bg-slate-900 p-4 rounded-lg">
            <p class="text-emerald-400 font-semibold mb-3">Example: "as often as possible"</p>

            <div class="space-y-3">
              <div>
                <p class="text-blue-300 text-sm font-medium">Target (Spanish):</p>
                <p class="text-white text-lg font-mono">"lo más frecuentemente posible"</p>
              </div>

              <div>
                <p class="text-amber-300 text-sm font-medium">Literal Component Breakdown:</p>
                <div class="ml-4 space-y-1 text-slate-200 text-sm">
                  <p><span class="text-emerald-400">lo más</span> = <span class="text-slate-300">the most</span></p>
                  <p><span class="text-emerald-400">frecuentemente</span> = <span class="text-slate-300">often</span></p>
                  <p><span class="text-emerald-400">posible</span> = <span class="text-slate-300">possible</span></p>
                </div>
              </div>

              <div class="bg-emerald-900/30 border border-emerald-700 p-3 rounded mt-3">
                <p class="text-emerald-300 text-sm font-semibold mb-2">✨ The Magic: Pattern Discovery</p>
                <ul class="text-slate-200 text-sm space-y-1">
                  <li>📍 Learner knows: <strong>"lo más"</strong> = "the most"</li>
                  <li>📍 Learner knows: <strong>"posible"</strong> = "possible"</li>
                  <li>🎯 <strong>Learner can now say</strong>: <strong>"lo más posible"</strong> = "the most possible"</li>
                  <li>🎯 <strong>Learner understands</strong>: Spanish uses "the most" + adjective pattern</li>
                </ul>
                <p class="text-amber-200 text-xs mt-3 italic">↑ No grammar rules explained! They SEE the pattern through literal meanings.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Supporting Concepts -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-6">Supporting Concepts</h2>

        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 class="text-lg font-semibold text-emerald-300 mb-3">LEGO_INTRODUCTIONS</h3>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Definition:</span>
            <p class="text-slate-200 mt-1">Natural language presentations explaining LEGOs in the known language</p>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Example:</span>
            <div class="bg-slate-900 p-4 rounded mt-2 text-sm">
              <p class="text-slate-300 italic">"The Spanish for 'I want', as in 'I want to speak Spanish with you now', is: ... 'quiero' ... 'quiero'"</p>
            </div>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-slate-400">Key Properties:</span>
            <ul class="list-disc list-inside text-slate-200 mt-2 space-y-1">
              <li>Spoken in known language (source language)</li>
              <li>Provides context for where LEGO appears</li>
              <li>Generated automatically by Phase 3 (<1s overhead)</li>
            </ul>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-slate-400">Phase:</span>
              <span class="text-emerald-400 ml-2 font-medium">Phase 3 (includes Phase 6)</span>
            </div>
            <div>
              <span class="text-slate-400">Storage:</span>
              <span class="text-slate-300 ml-2 font-mono text-xs">vfs/courses/{course_code}/introductions.json</span>
            </div>
          </div>
          <div class="mt-3 bg-teal-900/20 border border-teal-500/50 rounded p-3">
            <p class="text-xs text-teal-300"><strong>Note:</strong> As of APML v8.2.0, introduction generation is integrated into Phase 3 and runs automatically after LEGO extraction (<1s overhead).</p>
          </div>
        </div>
      </section>

      <!-- Reference Formats -->
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
              <li><strong>Format:</strong> S{seed}L{position}</li>
              <li><strong>Example:</strong> <code class="bg-slate-900 px-2 py-1 rounded">S0041L02</code></li>
              <li class="text-slate-400 text-sm">(Seed 41, LEGO position 2)</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Terminology to Avoid -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-red-400 mb-6">Deprecated Terminology (Don't Use)</h2>

        <div class="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
          <ul class="space-y-2 text-slate-200">
            <li>❌ <strong>"BASE" and "COMPOSITE"</strong> → Use <span class="text-emerald-400">ATOMIC (A-type)</span> and <span class="text-emerald-400">MOLECULAR (M-type)</span></li>
            <li>❌ <strong>"FEEDER"</strong> → No longer exists (componentization replaced this)</li>
            <li>❌ <strong>"D-phrases" and "E-phrases"</strong> → Use <span class="text-emerald-400">scaffolding phrases (1-8)</span> and <span class="text-emerald-400">eternal phrases (9-10)</span></li>
            <li>❌ <strong>"Amino acids"</strong> → Never use (old metaphor)</li>
            <li>❌ <strong>"Translations"</strong> → Use <span class="text-emerald-400">SEED_PAIRS</span></li>
            <li>❌ <strong>"Lessons"</strong> → Use <span class="text-emerald-400">LEGO_BASKETS</span></li>
          </ul>
        </div>
      </section>

    </div>
  </div>
</template>

<script setup>
// Pure presentation component - no logic needed
</script>
