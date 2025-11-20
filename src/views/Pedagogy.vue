<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8">
    <div class="max-w-5xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <router-link to="/" class="text-emerald-400 hover:text-emerald-300 mb-4 inline-block">
          ← Back to Dashboard
        </router-link>
        <h1 class="text-4xl font-bold text-emerald-400 mb-2">SSi Pedagogical Model</h1>
        <p class="text-slate-400">The "why" behind the SSi teaching system</p>
        <p class="text-sm text-slate-500 mt-2">APML v8.2.0 | Conceptual foundation for language learning through LEGO recombination</p>
      </div>

      <!-- Core Philosophy -->
      <div class="bg-gradient-to-r from-emerald-900/30 to-blue-900/30 border-2 border-emerald-500/50 rounded-lg p-6 mb-12">
        <h2 class="text-2xl font-semibold text-emerald-300 mb-4">🎯 Core Philosophy</h2>
        <div class="text-slate-200 space-y-3">
          <p class="text-lg"><strong>SSi teaches language as building blocks that recombine infinitely.</strong></p>
          <ul class="list-disc list-inside space-y-2 ml-4">
            <li><strong>Not memorization</strong> → Pattern recognition through transparent literal meanings</li>
            <li><strong>Not grammar rules</strong> → Discovery through component-by-component breakdown</li>
            <li><strong>Not random phrases</strong> → Systematic recombination of known elements</li>
          </ul>
          <p class="text-emerald-400 italic mt-4">Like learning to code: Master individual functions, then combine them into infinite programs.</p>
        </div>
      </div>

      <!-- Section 1: What is a LEGO? -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-6">What is a LEGO?</h2>

        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          <p class="text-slate-200 mb-4">
            A <strong>LEGO</strong> is a pedagogically-sound chunk of language that removes learner uncertainty. When a learner hears the KNOWN phrase, they know EXACTLY what to say in the TARGET language—zero guessing, zero ambiguity.
          </p>

          <div class="bg-blue-900/20 border border-blue-500/50 rounded p-4">
            <p class="text-blue-300 font-semibold mb-2">The Two Heuristics (Extraction Principles)</p>
            <div class="space-y-2 text-sm text-slate-300">
              <p><strong>1. Remove Learner Uncertainty:</strong> Known phrase → ZERO uncertainty about target</p>
              <p><strong>2. Maximize Patterns with Minimum Vocab:</strong> Overlapping chunks multiply recombination power</p>
            </div>
          </div>
        </div>

        <!-- ATOMIC vs MOLECULAR -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <!-- ATOMIC -->
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
              <h3 class="text-lg font-semibold text-blue-300">ATOMIC (A-type)</h3>
            </div>

            <p class="text-slate-300 text-sm mb-4">Simple, transparent chunks that don't need explanation.</p>

            <div class="bg-slate-900 p-4 rounded space-y-2">
              <p class="text-sm text-slate-400 mb-2"><strong>Examples:</strong></p>
              <div class="space-y-1 text-sm">
                <p class="text-slate-200">"quiero" = "I want"</p>
                <p class="text-slate-200">"hablar" = "to speak"</p>
                <p class="text-slate-200">"varias horas" = "several hours"</p>
              </div>
            </div>

            <p class="text-xs text-slate-400 mt-3 italic">Learner sees it once, knows it forever. No breakdown needed.</p>
          </div>

          <!-- MOLECULAR -->
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <h3 class="text-lg font-semibold text-emerald-300">MOLECULAR (M-type)</h3>
            </div>

            <p class="text-slate-300 text-sm mb-4">Complex chunks with component arrays showing literal word-by-word breakdown.</p>

            <div class="bg-slate-900 p-4 rounded">
              <p class="text-sm text-slate-400 mb-2"><strong>Example: "interesting things"</strong></p>
              <p class="text-slate-200 text-sm mb-2">Target: "cosas interesantes"</p>
              <div class="ml-3 space-y-1 text-xs text-slate-300 border-l-2 border-amber-500 pl-3">
                <p>• "things" → "cosas"</p>
                <p>• "interesting" → "interesantes"</p>
              </div>
              <p class="text-emerald-400 text-xs mt-3">→ Learner discovers: Spanish reverses word order!</p>
            </div>

            <p class="text-xs text-slate-400 mt-3 italic">Components teach HOW the target language builds patterns.</p>
          </div>
        </div>

        <!-- Componentization: The Pedagogical Superpower -->
        <div class="bg-gradient-to-r from-emerald-900/30 to-purple-900/30 border-2 border-emerald-500/50 rounded-lg p-6">
          <h3 class="text-xl font-semibold text-emerald-300 mb-4">🔬 Componentization: The Pedagogical Superpower</h3>

          <p class="text-slate-200 mb-4">
            M-type LEGOs use <strong>literal translations</strong> for each component. This transparency lets learners discover grammar patterns <strong>without explicit rules</strong>.
          </p>

          <div class="bg-slate-900 p-5 rounded-lg">
            <p class="text-emerald-400 font-semibold mb-3">Example: "as often as possible"</p>

            <div class="space-y-4">
              <div>
                <p class="text-blue-300 text-sm font-medium">Target (Spanish):</p>
                <p class="text-white text-lg font-mono">"lo más frecuentemente posible"</p>
              </div>

              <div>
                <p class="text-amber-300 text-sm font-medium">Component Breakdown (Literal Translations):</p>
                <div class="ml-4 space-y-1 text-slate-200">
                  <p class="text-sm"><span class="text-emerald-400 font-mono">lo más</span> = <span class="text-slate-300">"the most"</span></p>
                  <p class="text-sm"><span class="text-emerald-400 font-mono">frecuentemente</span> = <span class="text-slate-300">"often"</span></p>
                  <p class="text-sm"><span class="text-emerald-400 font-mono">posible</span> = <span class="text-slate-300">"possible"</span></p>
                </div>
              </div>

              <div class="bg-emerald-900/40 border border-emerald-700 p-4 rounded">
                <p class="text-emerald-300 font-semibold mb-3">✨ What the Learner Discovers:</p>
                <ul class="text-slate-200 space-y-2 text-sm">
                  <li>📍 Because they know: <strong>"lo más"</strong> = "the most"</li>
                  <li>📍 And they know: <strong>"posible"</strong> = "possible"</li>
                  <li>🎯 <strong>They can now create</strong>: "lo más posible" = "the most possible"</li>
                  <li>🎯 <strong>They understand</strong>: Spanish builds superlatives with "lo más" + adjective</li>
                </ul>
                <p class="text-amber-200 text-xs mt-4 italic">
                  ↑ No grammar explanation needed. The pattern emerges from transparent literal meanings.
                </p>
              </div>
            </div>
          </div>

          <div class="mt-4 bg-slate-800 border border-slate-600 p-4 rounded">
            <p class="text-blue-300 font-semibold text-sm mb-2">Why Literal Translations > Natural Equivalents</p>
            <div class="grid md:grid-cols-2 gap-4 text-xs">
              <div>
                <p class="text-red-300 mb-1">❌ Natural Translation:</p>
                <p class="text-slate-400">"frecuentemente" = "frequently"</p>
                <p class="text-slate-500 mt-1">Learner can't discover "often" = "frecuentemente"</p>
              </div>
              <div>
                <p class="text-emerald-300 mb-1">✅ Literal Translation:</p>
                <p class="text-slate-300">"frecuentemente" = "often"</p>
                <p class="text-emerald-500 mt-1">Transparent! Learner bridges "often" ↔ "frequently"</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 2: What is a Basket? -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-6">What is a Basket?</h2>

        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          <p class="text-slate-200 mb-4">
            A <strong>basket</strong> is <strong>NOT</strong> a random collection of practice phrases.
          </p>
          <p class="text-slate-200 mb-4">
            A basket is a <strong>demonstration of how THIS LEGO plugs into LEGOs the learner ALREADY knows.</strong>
          </p>

          <div class="bg-blue-900/20 border border-blue-500/50 rounded p-4 mt-4">
            <p class="text-blue-300 font-semibold mb-2">💻 The API Documentation Metaphor</p>
            <div class="space-y-2 text-sm text-slate-300">
              <p>• <strong>LEGO</strong> = new function you're learning (e.g., <code class="bg-slate-800 px-2 py-1 rounded font-mono">filter()</code>)</p>
              <p>• <strong>Basket</strong> = code examples showing how to use this function</p>
              <p>• <strong>Available vocabulary</strong> = variables/functions already defined in previous code</p>
              <p class="text-red-400">• <strong>Iron Rule</strong> = You cannot use undefined variables in your examples</p>
            </div>
          </div>
        </div>

        <!-- 10 Phrases Structure -->
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          <h3 class="text-xl font-semibold text-emerald-300 mb-4">10 Phrases per Basket</h3>

          <p class="text-slate-300 mb-4">Every basket contains <strong>exactly 10 practice phrases</strong> in progressive complexity.</p>

          <div class="space-y-4">
            <!-- Scaffolding Phrases -->
            <div class="bg-slate-900 p-4 rounded border-l-4 border-blue-500">
              <div class="flex items-start justify-between mb-2">
                <h4 class="text-blue-300 font-semibold">Phrases 1-8: Scaffolding (Debut Practice)</h4>
                <span class="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">USED ONCE</span>
              </div>
              <p class="text-slate-300 text-sm mb-3">Used ONLY during first introduction of this LEGO. Progressive complexity helps learner build confidence.</p>
              <div class="bg-slate-800 p-3 rounded">
                <p class="text-xs text-slate-400 mb-2">Distribution: <strong>2-2-2-2</strong></p>
                <ul class="text-xs text-slate-300 space-y-1">
                  <li>• Phrases 1-2: <strong>Simple</strong> (1-2 LEGOs)</li>
                  <li>• Phrases 3-4: <strong>Medium</strong> (3 LEGOs)</li>
                  <li>• Phrases 5-6: <strong>Longer</strong> (4 LEGOs)</li>
                  <li>• Phrases 7-8: <strong>Complex</strong> (5+ LEGOs)</li>
                </ul>
              </div>
              <p class="text-xs text-slate-400 mt-3 italic">Like training wheels—used during initial learning, then removed.</p>
            </div>

            <!-- Eternal Phrases -->
            <div class="bg-slate-900 p-4 rounded border-l-4 border-emerald-500">
              <div class="flex items-start justify-between mb-2">
                <h4 class="text-emerald-300 font-semibold">Phrases 9-10: Eternal Practice</h4>
                <span class="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">USED FOREVER</span>
              </div>
              <p class="text-slate-300 text-sm mb-3">Practiced <strong>hundreds of times</strong> throughout the entire course. Must be excellent, natural, conversational.</p>
              <div class="bg-slate-800 p-3 rounded">
                <p class="text-xs text-slate-400 mb-2">Quality Requirements:</p>
                <ul class="text-xs text-slate-300 space-y-1">
                  <li>• <strong>Most complex</strong> (7-10 words typical)</li>
                  <li>• <strong>Natural</strong> in BOTH languages</li>
                  <li>• <strong>Perfect grammar</strong> (errors here = disaster)</li>
                  <li>• Phrase #10 for final LEGO = complete seed sentence</li>
                </ul>
              </div>
              <p class="text-xs text-slate-400 mt-3 italic">Like actual cycling—used forever after you've learned.</p>
            </div>
          </div>

          <div class="mt-4 bg-amber-900/20 border border-amber-600 p-4 rounded">
            <p class="text-amber-300 font-semibold text-sm mb-2">📱 How the App Uses Baskets</p>
            <p class="text-slate-300 text-sm">
              The app <strong>"pulls from both ends"</strong> during practice:
            </p>
            <ul class="text-slate-300 text-sm mt-2 space-y-1">
              <li>• <strong>Need easy practice?</strong> → Pull phrase #1 (simplest)</li>
              <li>• <strong>Need hard practice?</strong> → Pull phrase #10 (most complex)</li>
              <li>• <strong>Spaced repetition?</strong> → Eternal phrases (9-10) reused forever</li>
              <li>• <strong>First time learning?</strong> → Work through phrases 1-10 progressively</li>
            </ul>
          </div>
        </div>

        <!-- Example Basket -->
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 class="text-xl font-semibold text-emerald-300 mb-4">Example: Basket for "quiero" (I want)</h3>

          <div class="bg-slate-900 p-4 rounded overflow-x-auto">
            <pre class="text-xs text-slate-300"><code>[
  {"known": "I want", "target": "Quiero"},                                             <span class="text-blue-400">// 1: Bare LEGO (scaffolding)</span>
  {"known": "I want to speak", "target": "Quiero hablar"},                             <span class="text-blue-400">// 2: 2 LEGOs (scaffolding)</span>
  {"known": "I want to speak Spanish", "target": "Quiero hablar español"},             <span class="text-blue-400">// 3: 3 LEGOs (scaffolding)</span>
  {"known": "I want to speak with you", "target": "Quiero hablar contigo"},            <span class="text-blue-400">// 4: 3 LEGOs (scaffolding)</span>
  {"known": "I want to speak Spanish with you", "target": "Quiero hablar español contigo"},       <span class="text-blue-400">// 5: 4 LEGOs (scaffolding)</span>
  {"known": "I want to speak Spanish with you now", "target": "Quiero hablar español contigo ahora"},  <span class="text-blue-400">// 6: 5 LEGOs (scaffolding)</span>
  {"known": "I want to speak a lot", "target": "Quiero hablar mucho"},                 <span class="text-blue-400">// 7: Different combination (scaffolding)</span>
  {"known": "I want to speak now and later", "target": "Quiero hablar ahora y más tarde"},  <span class="text-blue-400">// 8: More complex (scaffolding)</span>
  {"known": "I want to speak Spanish with you now and tomorrow", "target": "Quiero hablar español contigo ahora y mañana"},  <span class="text-emerald-400">// 9: ETERNAL (most complex)</span>
  {"known": "I want to speak Spanish with you now", "target": "Quiero hablar español contigo ahora"}   <span class="text-emerald-400">// 10: ETERNAL (complete seed)</span>
]</code></pre>
          </div>
        </div>
      </section>

      <!-- Section 3: The Vocabulary Constraint -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-6">The Vocabulary Constraint: The Iron Law</h2>

        <div class="bg-red-900/20 border border-red-600 rounded-lg p-6 mb-6">
          <h3 class="text-red-300 font-semibold mb-3 text-lg">📜 The Iron Law</h3>
          <p class="text-slate-200 text-lg mb-4">
            A basket can <strong>ONLY</strong> use LEGOs the learner has <strong>ALREADY</strong> mastered.
          </p>
          <p class="text-slate-300 text-sm">
            Every practice phrase must contain ZERO unknowns except the LEGO being taught.
          </p>
        </div>

        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          <h3 class="text-xl font-semibold text-emerald-300 mb-4">Why This Matters</h3>
          <ul class="space-y-3 text-slate-200">
            <li class="flex items-start gap-3">
              <span class="text-emerald-400 text-xl">✓</span>
              <div>
                <p class="font-semibold">Zero cognitive overload</p>
                <p class="text-sm text-slate-400">Learner focuses 100% on the new LEGO, not distracted by unknown words</p>
              </div>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-emerald-400 text-xl">✓</span>
              <div>
                <p class="font-semibold">Immediate comprehension</p>
                <p class="text-sm text-slate-400">Every practice phrase is instantly understandable</p>
              </div>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-emerald-400 text-xl">✓</span>
              <div>
                <p class="font-semibold">True spaced repetition</p>
                <p class="text-sm text-slate-400">Earlier LEGOs naturally reappear in later baskets</p>
              </div>
            </li>
          </ul>
        </div>

        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 class="text-xl font-semibold text-emerald-300 mb-4">Progressive Vocabulary Accumulation</h3>

          <div class="bg-slate-900 p-4 rounded font-mono text-xs">
            <p class="text-slate-400 mb-3">How vocabulary grows position-by-position:</p>
            <div class="space-y-1 text-slate-300">
              <p><span class="text-blue-400">Position #1:</span> LEGO A → Available vocabulary: <span class="text-amber-400">[]</span> (empty)</p>
              <p><span class="text-blue-400">Position #2:</span> LEGO B → Available vocabulary: <span class="text-amber-400">[A]</span></p>
              <p><span class="text-blue-400">Position #3:</span> LEGO C → Available vocabulary: <span class="text-amber-400">[A, B]</span></p>
              <p><span class="text-blue-400">Position #4:</span> LEGO D → Available vocabulary: <span class="text-amber-400">[A, B, C]</span></p>
              <p class="text-emerald-400">...</p>
              <p><span class="text-blue-400">Position #2965:</span> LEGO Z → Available vocabulary: <span class="text-amber-400">[A, B, C, ..., Y]</span></p>
            </div>
            <p class="text-amber-400 mt-4 text-xs">⚠️ LEGO type (ATOMIC vs MOLECULAR) has ZERO effect on availability!</p>
            <p class="text-slate-400 text-xs">ONLY chronological position matters.</p>
          </div>
        </div>
      </section>

      <!-- Section 4: Why This System Works -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-6">Why This System Works</h2>

        <div class="grid md:grid-cols-2 gap-6">
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-emerald-300 mb-3">1. Graduated Cognitive Load</h3>
            <ul class="space-y-2 text-slate-200 text-sm">
              <li class="flex items-start gap-2">
                <span class="text-emerald-400">•</span>
                <p>Each LEGO introduces exactly ONE new concept</p>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-emerald-400">•</span>
                <p>Practice phrases contain ZERO unknowns except the LEGO being taught</p>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-emerald-400">•</span>
                <p>Learner never overwhelmed—always in the "zone of proximal development"</p>
              </li>
            </ul>
          </div>

          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-emerald-300 mb-3">2. Pattern Discovery (Not Rules)</h3>
            <ul class="space-y-2 text-slate-200 text-sm">
              <li class="flex items-start gap-2">
                <span class="text-emerald-400">•</span>
                <p>Componentization shows HOW target language builds patterns</p>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-emerald-400">•</span>
                <p>Literal translations reveal grammar structure transparently</p>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-emerald-400">•</span>
                <p>Learners acquire patterns implicitly through exposure, not memorization</p>
              </li>
            </ul>
          </div>

          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-emerald-300 mb-3">3. Cumulative Knowledge Building</h3>
            <ul class="space-y-2 text-slate-200 text-sm">
              <li class="flex items-start gap-2">
                <span class="text-emerald-400">•</span>
                <p>Each new LEGO builds on all previous LEGOs</p>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-emerald-400">•</span>
                <p>No "islands" of knowledge—everything connects</p>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-emerald-400">•</span>
                <p>Confidence compounds exponentially over time</p>
              </li>
            </ul>
          </div>

          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-emerald-300 mb-3">4. Infinite Recombination Power</h3>
            <ul class="space-y-2 text-slate-200 text-sm">
              <li class="flex items-start gap-2">
                <span class="text-emerald-400">•</span>
                <p>2965 LEGOs → millions of possible sentence combinations</p>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-emerald-400">•</span>
                <p>Overlapping chunks maximize pattern exposure</p>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-emerald-400">•</span>
                <p>Learners can say things they've never been explicitly taught</p>
              </li>
            </ul>
          </div>
        </div>

        <div class="mt-6 bg-gradient-to-r from-emerald-900/30 to-purple-900/30 border-2 border-emerald-500/50 rounded-lg p-6">
          <h3 class="text-lg font-semibold text-emerald-300 mb-3">The Result: True Language Acquisition</h3>
          <p class="text-slate-200 mb-4">
            Learners don't memorize phrases—they <strong>acquire the ability to generate language</strong>.
          </p>
          <div class="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-red-300 mb-2">❌ Traditional Phrasebook Approach:</p>
              <ul class="text-slate-400 space-y-1 ml-4">
                <li>• Memorize: "Where is the bathroom?"</li>
                <li>• Can ONLY say that exact phrase</li>
                <li>• Helpless if situation varies slightly</li>
              </ul>
            </div>
            <div>
              <p class="text-emerald-300 mb-2">✅ SSi LEGO Approach:</p>
              <ul class="text-slate-300 space-y-1 ml-4">
                <li>• Learn: "where", "is", "the", "bathroom"</li>
                <li>• Can say: "Where is the train?"</li>
                <li>• Can say: "Where is she?"</li>
                <li>• Can say: "The bathroom is here"</li>
                <li>• <strong>Infinite recombination</strong></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <div class="text-center text-slate-500 text-sm border-t border-slate-700 pt-6">
        <p>This document explains the <strong>"why"</strong> behind the system.</p>
        <p class="mt-2">
          For technical implementation details, see
          <router-link to="/reference/terminology" class="text-emerald-400 hover:text-emerald-300">Terminology Glossary</router-link>
          and
          <router-link to="/reference/apml" class="text-emerald-400 hover:text-emerald-300">APML Specification</router-link>.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
// Pure presentation component - no logic needed
</script>
