<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8">
    <div class="max-w-5xl mx-auto">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p class="text-slate-400">Loading documentation...</p>
        </div>
      </div>

      <!-- Content (Database or Fallback) -->
      <template v-else>
        <!-- Database Source Indicator (development only) -->
        <div v-if="dataSource === 'database'" class="bg-emerald-900/20 border border-emerald-600 rounded-lg p-3 mb-4 flex items-center gap-2">
          <div class="w-2 h-2 bg-emerald-500 rounded-full"></div>
          <p class="text-emerald-300 text-sm">
            Content loaded from database
            <span v-if="document?.updated_at" class="text-slate-400"> - Last updated: {{ formatDate(document.updated_at) }}</span>
          </p>
        </div>

        <!-- Header -->
        <div class="mb-8">
          <router-link to="/" class="text-emerald-400 hover:text-emerald-300 mb-4 inline-block">
            &larr; Back to Dashboard
          </router-link>
          <h1 class="text-4xl font-bold text-emerald-400 mb-2">{{ title }}</h1>
          <p class="text-slate-400">{{ subtitle }}</p>
          <p class="text-sm text-slate-500 mt-2">{{ versionInfo }}</p>
        </div>

        <!-- Core Philosophy -->
        <div class="bg-gradient-to-r from-emerald-900/30 to-blue-900/30 border-2 border-emerald-500/50 rounded-lg p-6 mb-12">
          <h2 class="text-2xl font-semibold text-emerald-300 mb-4">Core Philosophy</h2>
          <div class="text-slate-200 space-y-3">
            <p class="text-lg"><strong>SSi teaches language as building blocks that recombine infinitely.</strong></p>
            <ul class="list-disc list-inside space-y-2 ml-4">
              <li><strong>Not memorization</strong> &rarr; Pattern recognition through transparent literal meanings</li>
              <li><strong>Not grammar rules</strong> &rarr; Discovery through component-by-component breakdown</li>
              <li><strong>Not random phrases</strong> &rarr; Systematic recombination of known elements</li>
            </ul>
            <p class="text-emerald-400 italic mt-4">Like learning to code: Master individual functions, then combine them into infinite programs.</p>
          </div>
        </div>

        <!-- Section 1: What is a LEGO? -->
        <section class="mb-12">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-6">What is a LEGO?</h2>

          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
            <p class="text-slate-200 mb-4">
              A <strong>LEGO</strong> is a pedagogically-sound chunk of language that removes learner uncertainty. When a learner hears the KNOWN phrase, they know EXACTLY what to say in the TARGET language - zero guessing, zero ambiguity.
            </p>

            <div class="bg-blue-900/20 border border-blue-500/50 rounded p-4">
              <p class="text-blue-300 font-semibold mb-2">The Two Heuristics (Extraction Principles)</p>
              <div class="space-y-2 text-sm text-slate-300">
                <p><strong>1. Remove Learner Uncertainty:</strong> Known phrase &rarr; ZERO uncertainty about target</p>
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
                <h3 class="text-lg font-semibold text-blue-300">A-type: ATOMIC LEGO</h3>
              </div>

              <div class="bg-blue-900/20 border border-blue-500/50 rounded p-3 mb-4">
                <p class="text-blue-300 text-xs font-semibold mb-1">Definition:</p>
                <p class="text-slate-300 text-xs">Smallest teachable unit that passes ZUT (Zero Uncertainty Test). Can be single-word or multi-word. The learner hears the known text and produces the target with zero ambiguity.</p>
              </div>

              <div class="bg-slate-900 p-4 rounded space-y-2">
                <p class="text-sm text-slate-400 mb-2"><strong>Examples:</strong></p>
                <div class="space-y-2 text-sm">
                  <div>
                    <p class="text-slate-200">"quiero" = "I want"</p>
                    <p class="text-xs text-slate-500">Single target word, passes ZUT</p>
                  </div>
                  <div>
                    <p class="text-slate-200">"hablar" = "to speak"</p>
                    <p class="text-xs text-slate-500">Single target word, passes ZUT</p>
                  </div>
                  <div>
                    <p class="text-slate-200">"speak Chinese" = "shuo zhongwen"</p>
                    <p class="text-xs text-emerald-500">A-types tile perfectly - no M-type needed!</p>
                  </div>
                </div>
              </div>

              <p class="text-xs text-slate-400 mt-3 italic">No component breakdown - the LEGO is the minimum viable unit that passes ZUT.</p>
            </div>

            <!-- MOLECULAR -->
            <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <div class="flex items-center gap-2 mb-4">
                <div class="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <h3 class="text-lg font-semibold text-emerald-300">M-type: MOLECULAR LEGO</h3>
              </div>

              <div class="bg-emerald-900/20 border border-emerald-500/50 rounded p-3 mb-4">
                <p class="text-emerald-300 text-xs font-semibold mb-1">Definition:</p>
                <p class="text-slate-300 text-xs">An introducible unit that CANNOT be inferred by the learner from what they already know. Requires explicit introduction.</p>
              </div>

              <div class="bg-amber-900/20 border border-amber-500/50 rounded p-3 mb-4">
                <p class="text-amber-300 text-xs font-semibold mb-2">An M-type is needed when:</p>
                <ul class="text-slate-300 text-xs space-y-1">
                  <li>1. <strong>Missing components</strong> - some pieces are not learned yet as standalone LEGOs</li>
                  <li>2. <strong>Glue/filler words</strong> - only some parts are A-types, others are idiomatic/grammatical glue</li>
                  <li>3. <strong>Order mismatch</strong> - all A-types known but order differs between languages</li>
                </ul>
              </div>

              <div class="bg-slate-900 p-4 rounded space-y-3">
                <p class="text-sm text-slate-400 mb-2"><strong>Examples requiring M-type:</strong></p>
                <div>
                  <p class="text-slate-200 text-sm">"blue thing" = "cosa azul"</p>
                  <p class="text-xs text-amber-400">Order reversed - learner cannot infer</p>
                </div>

                <div>
                  <p class="text-slate-200 text-sm">"tengo ganas de" = "I feel like"</p>
                  <p class="text-xs text-amber-400">Contains idiomatic glue - cannot tile from A-types</p>
                </div>

                <div>
                  <p class="text-slate-200 text-sm">"the cat" = "y gath" (Welsh)</p>
                  <p class="text-xs text-amber-400">Mutation triggered - learner cannot infer</p>
                </div>
              </div>

              <p class="text-xs text-slate-400 mt-3 italic">The Inferability Test: Can the learner figure this out from what they already know? No = M-type needed.</p>
            </div>
          </div>

          <!-- The Inferability Test Box -->
          <div class="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-2 border-amber-500/50 rounded-lg p-6 mb-6">
            <h3 class="text-xl font-semibold text-amber-300 mb-4">The Inferability Test</h3>
            <p class="text-slate-200 mb-4"><strong>Given what the learner already knows, can they figure this out themselves?</strong></p>
            <div class="grid md:grid-cols-2 gap-4">
              <div class="bg-emerald-900/30 border border-emerald-600 p-4 rounded">
                <p class="text-emerald-300 font-semibold mb-2">Yes = Not a new LEGO</p>
                <p class="text-slate-300 text-sm">Just tile existing A-types</p>
              </div>
              <div class="bg-amber-900/30 border border-amber-600 p-4 rounded">
                <p class="text-amber-300 font-semibold mb-2">No = M-type needed</p>
                <p class="text-slate-300 text-sm">Requires explicit introduction</p>
              </div>
            </div>
          </div>

          <!-- Componentization: The Pedagogical Superpower -->
          <div class="bg-gradient-to-r from-emerald-900/30 to-purple-900/30 border-2 border-emerald-500/50 rounded-lg p-6">
            <h3 class="text-xl font-semibold text-emerald-300 mb-4">Componentization: The Pedagogical Superpower</h3>

            <p class="text-slate-200 mb-4">
              M-type LEGOs use <strong>literal translations</strong> for each component. This transparency lets learners discover grammar patterns <strong>without explicit rules</strong>.
            </p>

            <div class="bg-slate-900 p-5 rounded-lg">
              <p class="text-emerald-400 font-semibold mb-3">Example: "as often as possible"</p>

              <div class="space-y-4">
                <div>
                  <p class="text-blue-300 text-sm font-medium">Target (Spanish):</p>
                  <p class="text-white text-lg font-mono">"lo mas frecuentemente posible"</p>
                </div>

                <div>
                  <p class="text-amber-300 text-sm font-medium">Component Breakdown (Literal Translations):</p>
                  <div class="ml-4 space-y-1 text-slate-200">
                    <p class="text-sm"><span class="text-emerald-400 font-mono">lo mas</span> = <span class="text-slate-300">"the most"</span></p>
                    <p class="text-sm"><span class="text-emerald-400 font-mono">frecuentemente</span> = <span class="text-slate-300">"often"</span></p>
                    <p class="text-sm"><span class="text-emerald-400 font-mono">posible</span> = <span class="text-slate-300">"possible"</span></p>
                  </div>
                </div>

                <div class="bg-emerald-900/40 border border-emerald-700 p-4 rounded">
                  <p class="text-emerald-300 font-semibold mb-3">What the Learner Discovers:</p>
                  <ul class="text-slate-200 space-y-2 text-sm">
                    <li>Because they know: <strong>"lo mas"</strong> = "the most"</li>
                    <li>And they know: <strong>"posible"</strong> = "possible"</li>
                    <li><strong>They can now create</strong>: "lo mas posible" = "the most possible"</li>
                    <li><strong>They understand</strong>: Spanish builds superlatives with "lo mas" + adjective</li>
                  </ul>
                  <p class="text-amber-200 text-xs mt-4 italic">
                    No grammar explanation needed. The pattern emerges from transparent literal meanings.
                  </p>
                </div>
              </div>
            </div>

            <div class="mt-4 bg-slate-800 border border-slate-600 p-4 rounded">
              <p class="text-blue-300 font-semibold text-sm mb-2">Why Literal Translations &gt; Natural Equivalents</p>
              <div class="grid md:grid-cols-2 gap-4 text-xs">
                <div>
                  <p class="text-red-300 mb-1">Natural Translation:</p>
                  <p class="text-slate-400">"frecuentemente" = "frequently"</p>
                  <p class="text-slate-500 mt-1">Learner cannot discover "often" = "frecuentemente"</p>
                </div>
                <div>
                  <p class="text-emerald-300 mb-1">Literal Translation:</p>
                  <p class="text-slate-300">"frecuentemente" = "often"</p>
                  <p class="text-emerald-500 mt-1">Transparent! Learner bridges "often" to "frequently"</p>
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
              <p class="text-blue-300 font-semibold mb-2">The API Documentation Metaphor</p>
              <div class="space-y-2 text-sm text-slate-300">
                <p>&bull; <strong>LEGO</strong> = new function you are learning (e.g., <code class="bg-slate-800 px-2 py-1 rounded font-mono">filter()</code>)</p>
                <p>&bull; <strong>Basket</strong> = code examples showing how to use this function</p>
                <p>&bull; <strong>Available vocabulary</strong> = variables/functions already defined in previous code</p>
                <p class="text-red-400">&bull; <strong>Iron Rule</strong> = You cannot use undefined variables in your examples</p>
              </div>
            </div>
          </div>

          <!-- 10 Phrases Structure -->
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
            <h3 class="text-xl font-semibold text-emerald-300 mb-4">Approximately 10 Phrases per Basket</h3>

            <p class="text-slate-300 mb-4">Every basket contains <strong>approximately 10 practice phrases</strong> in progressive complexity.</p>

            <div class="space-y-4">
              <!-- Shorter Phrases (First Introduction) -->
              <div class="bg-slate-900 p-4 rounded border-l-4 border-blue-500">
                <div class="flex items-start justify-between mb-2">
                  <h4 class="text-blue-300 font-semibold">Shorter Phrases (Up to 8 Shortest)</h4>
                  <span class="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">FIRST TIME ONLY</span>
                </div>
                <p class="text-slate-300 text-sm mb-3">Practiced ONLY during first introduction of this LEGO. Progressive complexity helps learner build confidence.</p>
                <div class="bg-slate-800 p-3 rounded">
                  <p class="text-xs text-slate-400 mb-2">Characteristics:</p>
                  <ul class="text-xs text-slate-300 space-y-1">
                    <li>&bull; Simpler, shorter practice phrases</li>
                    <li>&bull; Build gradually from simple to more complex</li>
                    <li>&bull; Help learner gain initial confidence</li>
                    <li>&bull; Discarded after first introduction</li>
                  </ul>
                </div>
                <p class="text-xs text-slate-400 mt-3 italic">Like training wheels - used during initial learning, then removed.</p>
              </div>

              <!-- Longer Phrases (Eternal Practice) -->
              <div class="bg-slate-900 p-4 rounded border-l-4 border-emerald-500">
                <div class="flex items-start justify-between mb-2">
                  <h4 class="text-emerald-300 font-semibold">Longer Phrases (Spaced Repetition)</h4>
                  <span class="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">USED FOREVER</span>
                </div>
                <p class="text-slate-300 text-sm mb-3">Practiced <strong>every time this LEGO is revisited</strong> via the app spaced repetition logic. Must be excellent, natural, conversational.</p>
                <div class="bg-slate-800 p-3 rounded">
                  <p class="text-xs text-slate-400 mb-2">Quality Requirements:</p>
                  <ul class="text-xs text-slate-300 space-y-1">
                    <li>&bull; <strong>Most complex</strong> and longest phrases in basket</li>
                    <li>&bull; <strong>Natural</strong> in BOTH languages</li>
                    <li>&bull; <strong>Perfect grammar</strong> (errors here = disaster)</li>
                    <li>&bull; Final LEGO in seed &rarr; longest phrase = complete seed sentence</li>
                  </ul>
                </div>
                <p class="text-xs text-slate-400 mt-3 italic">Like actual cycling - used forever after you have learned.</p>
              </div>
            </div>

            <div class="mt-4 bg-amber-900/20 border border-amber-600 p-4 rounded">
              <p class="text-amber-300 font-semibold text-sm mb-2">How the App Uses Baskets</p>
              <p class="text-slate-300 text-sm mb-2">
                The app uses different phrases from the basket depending on context:
              </p>
              <ul class="text-slate-300 text-sm mt-2 space-y-1">
                <li>&bull; <strong>First time learning?</strong> &rarr; Practice the shorter phrases (up to 8 shortest)</li>
                <li>&bull; <strong>Spaced repetition?</strong> &rarr; Practice the longer phrases (revisited forever)</li>
                <li>&bull; <strong>Need easy practice?</strong> &rarr; Pull shorter phrases</li>
                <li>&bull; <strong>Need hard practice?</strong> &rarr; Pull longest phrases</li>
              </ul>
            </div>
          </div>

          <!-- Example Basket -->
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 class="text-xl font-semibold text-emerald-300 mb-4">Example: Basket for "decir algo" (to say something) - S0004L02</h3>

            <p class="text-slate-400 text-sm mb-4">
              This basket demonstrates the vocabulary constraint: all practice phrases use LEGOs the learner already knows from earlier seeds.
            </p>

            <div class="bg-slate-900 p-4 rounded overflow-x-auto">
              <pre class="text-xs text-slate-300"><code>[
  {"known": "to say something", "target": "decir algo"},                                              <span class="text-blue-400">// 1: Bare LEGO (shorter)</span>
  {"known": "I want to say something", "target": "Quiero decir algo"},                                <span class="text-blue-400">// 2: 2 LEGOs (shorter)</span>
  {"known": "I want to learn how to say something", "target": "Quiero aprender como decir algo"},     <span class="text-blue-400">// 3: 4 LEGOs (shorter)</span>
  {"known": "I am trying to say something", "target": "Estoy intentando decir algo"},                  <span class="text-blue-400">// 4: 3 LEGOs (shorter)</span>
  {"known": "I am trying to learn how to say something", "target": "Estoy intentando aprender como decir algo"},  <span class="text-blue-400">// 5: 5 LEGOs (shorter)</span>
  {"known": "I want to say something now", "target": "Quiero decir algo ahora"},                      <span class="text-emerald-400">// 6: Longer phrase (eternal)</span>
  {"known": "I want to learn how to say something now", "target": "Quiero aprender como decir algo ahora"}      <span class="text-emerald-400">// 7: Longest phrase (eternal)</span>
]</code></pre>
            </div>

            <div class="mt-4 bg-blue-900/20 border border-blue-500/50 rounded p-3">
              <p class="text-blue-300 text-xs font-semibold mb-2">Notice:</p>
              <ul class="text-slate-300 text-xs space-y-1">
                <li>&bull; All LEGOs used ("quiero", "aprender", "como", "estoy intentando", "ahora") were learned in earlier seeds</li>
                <li>&bull; Only "decir algo" is new - everything else is already mastered vocabulary</li>
                <li>&bull; Shorter phrases (1-5) used for first introduction only</li>
                <li>&bull; Longer phrases (6-7) practiced forever via spaced repetition</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Section 3: The Vocabulary Constraint -->
        <section class="mb-12">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-6">The Vocabulary Constraint &amp; Learner Uncertainty Test</h2>

          <div class="bg-red-900/20 border border-red-600 rounded-lg p-6 mb-6">
            <h3 class="text-red-300 font-semibold mb-3 text-lg">The Vocabulary Constraint</h3>
            <p class="text-slate-200 text-lg mb-4">
              A basket can <strong>ONLY</strong> use LEGOs the learner has <strong>ALREADY</strong> mastered.
            </p>
            <p class="text-slate-300 text-sm">
              Every practice phrase must contain ZERO unknowns except the LEGO being taught.
            </p>
          </div>

          <div class="bg-blue-900/20 border border-blue-600 rounded-lg p-6 mb-6">
            <h3 class="text-blue-300 font-semibold mb-3 text-lg">The ZUT (Zero Uncertainty Test)</h3>
            <p class="text-slate-200 mb-4">
              Also called "Functional Determinism" - the ZUT is the guiding principle for LEGO extraction in Phase 1 and basket generation in Phase 3.
            </p>
            <div class="bg-slate-900 p-4 rounded">
              <p class="text-emerald-400 font-semibold mb-2">The Test:</p>
              <p class="text-slate-300 text-sm mb-3">
                When a learner hears the KNOWN phrase, is there <strong>ZERO uncertainty</strong> about what to say in the TARGET language?
              </p>
              <div class="space-y-2 text-xs">
                <div class="flex items-start gap-2">
                  <span class="text-emerald-400">PASS</span>
                  <p class="text-slate-300"><strong>Passes ZUT:</strong> "to say something" &rarr; "decir algo" (no ambiguity)</p>
                </div>
                <div class="flex items-start gap-2">
                  <span class="text-red-400">FAIL</span>
                  <p class="text-slate-300"><strong>Fails ZUT:</strong> "say" &rarr; decir? digo? dice? (learner uncertain which form)</p>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-2 border-purple-500/50 rounded-lg p-6 mb-6">
            <h3 class="text-xl font-semibold text-purple-300 mb-4">Minimum Viable Unit of Consistent Meaning</h3>

            <p class="text-slate-200 mb-4">
              <strong>We do NOT break seed pairs down to individual words</strong> - that would fail the ZUT.
            </p>

            <p class="text-slate-300 text-sm mb-4">
              LEGOs are the <strong>minimum viable unit</strong> where meaning is consistent and learner uncertainty is ZERO.
            </p>

            <div class="bg-slate-900 p-5 rounded-lg">
              <p class="text-emerald-400 font-semibold mb-3">Example Breakdown:</p>

              <div class="space-y-4">
                <div>
                  <p class="text-slate-400 text-sm mb-2">Seed Pair (English):</p>
                  <p class="text-white text-lg">"I want you to speak Spanish with me tomorrow"</p>
                </div>

                <div>
                  <p class="text-amber-400 text-sm mb-2">LEGO Breakdown (passing ZUT):</p>
                  <div class="font-mono text-sm text-slate-200 space-y-1">
                    <p><span class="text-blue-400">I want</span> | <span class="text-emerald-400">you to speak</span> | <span class="text-purple-400">Spanish</span> | <span class="text-pink-400">with me</span> | <span class="text-amber-400">tomorrow</span></p>
                  </div>
                </div>

                <div>
                  <p class="text-amber-400 text-sm mb-2">Target (Spanish):</p>
                  <div class="font-mono text-sm text-slate-200 space-y-1">
                    <p><span class="text-blue-400">quiero</span> | <span class="text-emerald-400">que hables</span> | <span class="text-purple-400">espanol</span> | <span class="text-pink-400">conmigo</span> | <span class="text-amber-400">manana</span></p>
                  </div>
                </div>

                <div class="bg-emerald-900/30 border border-emerald-700 p-3 rounded mt-3">
                  <p class="text-emerald-300 text-sm font-semibold mb-2">Why This Works:</p>
                  <ul class="text-slate-200 text-xs space-y-1">
                    <li>&bull; <strong>"you to speak"</strong> is ATOMIC - breaking it down would fail ZUT</li>
                    <li>&bull; Learner hears "you to speak" &rarr; knows instantly: "que hables"</li>
                    <li>&bull; Breaking to "you" | "to" | "speak" would create uncertainty</li>
                    <li>&bull; <strong>"with me"</strong> = one LEGO "conmigo" (not "con" + "mi")</li>
                  </ul>
                </div>

                <div class="bg-red-900/30 border border-red-700 p-3 rounded mt-3">
                  <p class="text-red-300 text-sm font-semibold mb-2">What Would Fail ZUT:</p>
                  <ul class="text-slate-300 text-xs space-y-1">
                    <li>Breaking "you to speak" &rarr; "you" | "to" | "speak" (too much uncertainty)</li>
                    <li>Breaking "with me" &rarr; "with" | "me" (does not map to "con" + "mi", it is "conmigo")</li>
                    <li>Individual words lose grammatical context needed for correct translation</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
            <h3 class="text-xl font-semibold text-emerald-300 mb-4">Why This Matters</h3>
            <ul class="space-y-3 text-slate-200">
              <li class="flex items-start gap-3">
                <span class="text-emerald-400 text-xl">+</span>
                <div>
                  <p class="font-semibold">Zero cognitive overload</p>
                  <p class="text-sm text-slate-400">Learner focuses 100% on the new LEGO, not distracted by unknown words</p>
                </div>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-emerald-400 text-xl">+</span>
                <div>
                  <p class="font-semibold">Immediate comprehension</p>
                  <p class="text-sm text-slate-400">Every practice phrase is instantly understandable</p>
                </div>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-emerald-400 text-xl">+</span>
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
                <p><span class="text-blue-400">Position #1:</span> LEGO A &rarr; Available vocabulary: <span class="text-amber-400">[]</span> (empty)</p>
                <p><span class="text-blue-400">Position #2:</span> LEGO B &rarr; Available vocabulary: <span class="text-amber-400">[A]</span></p>
                <p><span class="text-blue-400">Position #3:</span> LEGO C &rarr; Available vocabulary: <span class="text-amber-400">[A, B]</span></p>
                <p><span class="text-blue-400">Position #4:</span> LEGO D &rarr; Available vocabulary: <span class="text-amber-400">[A, B, C]</span></p>
                <p class="text-emerald-400">...</p>
                <p><span class="text-blue-400">Position #2965:</span> LEGO Z &rarr; Available vocabulary: <span class="text-amber-400">[A, B, C, ..., Y]</span></p>
              </div>
              <p class="text-amber-400 mt-4 text-xs">LEGO type (ATOMIC vs MOLECULAR) has ZERO effect on availability!</p>
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
                  <span class="text-emerald-400">&bull;</span>
                  <p>Each LEGO introduces exactly ONE new concept</p>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-emerald-400">&bull;</span>
                  <p>Practice phrases contain ZERO unknowns except the LEGO being taught</p>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-emerald-400">&bull;</span>
                  <p>Learner never overwhelmed - always in the "zone of proximal development"</p>
                </li>
              </ul>
            </div>

            <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 class="text-lg font-semibold text-emerald-300 mb-3">2. Pattern Discovery (Not Rules)</h3>
              <ul class="space-y-2 text-slate-200 text-sm">
                <li class="flex items-start gap-2">
                  <span class="text-emerald-400">&bull;</span>
                  <p>Componentization shows HOW target language builds patterns</p>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-emerald-400">&bull;</span>
                  <p>Literal translations reveal grammar structure transparently</p>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-emerald-400">&bull;</span>
                  <p>Learners acquire patterns implicitly through exposure, not memorization</p>
                </li>
              </ul>
            </div>

            <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 class="text-lg font-semibold text-emerald-300 mb-3">3. Cumulative Knowledge Building</h3>
              <ul class="space-y-2 text-slate-200 text-sm">
                <li class="flex items-start gap-2">
                  <span class="text-emerald-400">&bull;</span>
                  <p>Each new LEGO builds on all previous LEGOs</p>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-emerald-400">&bull;</span>
                  <p>No "islands" of knowledge - everything connects</p>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-emerald-400">&bull;</span>
                  <p>Confidence compounds exponentially over time</p>
                </li>
              </ul>
            </div>

            <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h3 class="text-lg font-semibold text-emerald-300 mb-3">4. Infinite Recombination Power</h3>
              <ul class="space-y-2 text-slate-200 text-sm">
                <li class="flex items-start gap-2">
                  <span class="text-emerald-400">&bull;</span>
                  <p>2965 LEGOs &rarr; millions of possible sentence combinations</p>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-emerald-400">&bull;</span>
                  <p>Overlapping chunks maximize pattern exposure</p>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-emerald-400">&bull;</span>
                  <p>Learners can say things they have never been explicitly taught</p>
                </li>
              </ul>
            </div>
          </div>

          <div class="mt-6 bg-gradient-to-r from-emerald-900/30 to-purple-900/30 border-2 border-emerald-500/50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-emerald-300 mb-3">The Result: True Language Acquisition</h3>
            <p class="text-slate-200 mb-4">
              Learners do not memorize phrases - they <strong>acquire the ability to generate language</strong>.
            </p>
            <div class="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-red-300 mb-2">Traditional Phrasebook Approach:</p>
                <ul class="text-slate-400 space-y-1 ml-4">
                  <li>&bull; Memorize: "Where is the bathroom?"</li>
                  <li>&bull; Can ONLY say that exact phrase</li>
                  <li>&bull; Helpless if situation varies slightly</li>
                </ul>
              </div>
              <div>
                <p class="text-emerald-300 mb-2">SSi LEGO Approach:</p>
                <ul class="text-slate-300 space-y-1 ml-4">
                  <li>&bull; Learn: "where", "is", "the", "bathroom"</li>
                  <li>&bull; Can say: "Where is the train?"</li>
                  <li>&bull; Can say: "Where is she?"</li>
                  <li>&bull; Can say: "The bathroom is here"</li>
                  <li>&bull; <strong>Infinite recombination</strong></li>
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
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api.js'

// State
const loading = ref(true)
const document = ref(null)
const dataSource = ref('fallback')

// Default values (fallback content)
const defaults = {
  title: 'SSi Pedagogical Model',
  subtitle: 'The "why" behind the SSi teaching system',
  versionInfo: 'APML v11.2.0 | Conceptual foundation for language learning through LEGO recombination'
}

// Computed properties that use database or fallback
const title = computed(() => document.value?.title || defaults.title)
const subtitle = computed(() => document.value?.subtitle || defaults.subtitle)
const versionInfo = computed(() => document.value?.content?.header?.version_info || defaults.versionInfo)

// Format date for display
function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

// Fetch documentation on mount
onMounted(async () => {
  try {
    const response = await api.getDocumentation('pedagogy')
    if (response.success && response.document) {
      document.value = response.document
      dataSource.value = 'database'
      console.log('[Pedagogy] Loaded content from database')
    }
  } catch (err) {
    console.warn('[Pedagogy] Failed to load from database, using fallback:', err.message)
    dataSource.value = 'fallback'
  } finally {
    loading.value = false
  }
})
</script>
