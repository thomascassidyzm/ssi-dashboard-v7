<template>
  <div class="pedagogy-view">
    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">Loading documentation...</p>
    </div>

    <!-- Content (Database or Fallback) -->
    <template v-else>
      <!-- Database Source Indicator (development only) -->
      <div v-if="dataSource === 'database'" class="db-indicator">
        <div class="db-dot"></div>
        <p class="db-text">
          Content loaded from database
          <span v-if="document?.updated_at" class="db-updated"> - Last updated: {{ formatDate(document.updated_at) }}</span>
        </p>
      </div>

      <!-- Page Header (within DocsLayout) -->
      <div class="page-header">
        <h1 class="page-title">{{ title }}</h1>
        <p class="page-subtitle">{{ subtitle }}</p>
        <p class="page-meta">{{ versionInfo }}</p>
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
                <p class="text-slate-300 text-xs">A single meaningful word. No components, no build-up ladder. The learner hears the known text and produces the target with zero ambiguity.</p>
              </div>

              <div class="bg-slate-900 p-4 rounded space-y-2">
                <p class="text-sm text-slate-400 mb-2"><strong>Examples:</strong></p>
                <div class="space-y-2 text-sm">
                  <div>
                    <p class="text-slate-200">"quiero" = "I want"</p>
                    <p class="text-xs text-slate-500">A single target word, passes ZUT</p>
                  </div>
                  <div>
                    <p class="text-slate-200">"hablar" = "to speak"</p>
                    <p class="text-xs text-slate-500">A single target word, passes ZUT</p>
                  </div>
                  <div>
                    <p class="text-slate-200">"ahora" = "now"</p>
                    <p class="text-xs text-slate-500">One word in, one word out - nothing to break down</p>
                  </div>
                </div>
              </div>

              <p class="text-xs text-slate-400 mt-3 italic">An A-LEGO is a single word - no components, no build-up. The type is something the author declares, not something the system works out from the word count.</p>
            </div>

            <!-- MOLECULAR -->
            <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <div class="flex items-center gap-2 mb-4">
                <div class="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <h3 class="text-lg font-semibold text-emerald-300">M-type: MOLECULAR LEGO</h3>
              </div>

              <div class="bg-emerald-900/20 border border-emerald-500/50 rounded p-3 mb-4">
                <p class="text-emerald-300 text-xs font-semibold mb-1">Definition:</p>
                <p class="text-slate-300 text-xs">A multi-word chunk that bundles structure the learner cannot yet recombine. It declares its own components - the word-level pieces it is built from - so the system can teach those pieces first, then the whole.</p>
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

              <p class="text-xs text-slate-400 mt-3 italic">The Inferability Test: can the learner figure this out from what they already know? No = M-type needed. Either way, a LEGO is kept small - the builder caps every LEGO target at roughly eight syllables, so anything bigger gets decomposed.</p>
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

            <div class="bg-slate-900/60 border border-slate-600 p-4 rounded mt-4">
              <p class="text-amber-200 font-semibold text-sm mb-2">Overlap is a feature, not a clash</p>
              <p class="text-slate-300 text-sm">
                A single word is allowed to live both as an A-LEGO on its own <strong>and</strong> inside an M-LEGO - the atom "blue" and the chunk "blue thing", say. This is deliberate. The learner meets the word alone, meets it again inside a larger chunk that handles the reordering, and infers the pattern with no explanation. Because the known-language prompts differ, this never trips the consistency check - it is precisely the device that teaches word order across languages.
              </p>
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

        <!-- Section 2: A LEGO's Phrases -->
        <section class="mb-12">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-6">A LEGO's Phrases: BUILD and USE</h2>

          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
            <p class="text-slate-200 mb-4">
              Every LEGO carries its own practice phrases. These are <strong>not</strong> a random bag of sentences. Each one demonstrates how <strong>this LEGO plugs into LEGOs the learner already knows.</strong>
            </p>
            <p class="text-slate-200 mb-4">
              The phrases come in two kinds, and the difference between them is the whole story of how a LEGO is taught and then kept alive: <strong>BUILD</strong> phrases get you onto the LEGO, and <strong>USE</strong> phrases keep you fluent with it forever.
            </p>

            <p class="text-slate-400 text-sm mb-4">
              (You may still hear the old word "basket" for a LEGO's phrases. It is a legacy term. The phrases are now stored directly under each LEGO, each tagged with its role, and the app assembles them into a <strong>round</strong> at runtime.)
            </p>

            <div class="bg-blue-900/20 border border-blue-500/50 rounded p-4 mt-4">
              <p class="text-blue-300 font-semibold mb-2">The API Documentation Metaphor</p>
              <div class="space-y-2 text-sm text-slate-300">
                <p>&bull; <strong>LEGO</strong> = new function you are learning (e.g., <code class="bg-slate-800 px-2 py-1 rounded font-mono">filter()</code>)</p>
                <p>&bull; <strong>Its phrases</strong> = worked examples showing how to call this function</p>
                <p>&bull; <strong>Available vocabulary</strong> = variables/functions already defined in previous code</p>
                <p class="text-red-400">&bull; <strong>Iron Rule</strong> = you cannot use undefined variables in your examples</p>
              </div>
            </div>
          </div>

          <!-- BUILD vs USE structure -->
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
            <h3 class="text-xl font-semibold text-emerald-300 mb-4">Training Wheels vs Cycling Forever</h3>

            <p class="text-slate-300 mb-4">
              When you first learn to ride a bike you use training wheels. They get you balanced and moving. Then they come off - and you cycle for the rest of your life without them. A LEGO's phrases work exactly the same way. The split is <strong>not</strong> "short phrases vs long phrases" - it is <strong>BUILD</strong> (the training wheels) vs <strong>USE</strong> (the cycling).
            </p>

            <div class="space-y-4">
              <!-- BUILD phrases -->
              <div class="bg-slate-900 p-4 rounded border-l-4 border-blue-500">
                <div class="flex items-start justify-between mb-2">
                  <h4 class="text-blue-300 font-semibold">BUILD phrases - the training wheels</h4>
                  <span class="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">DEBUT ROUND ONLY</span>
                </div>
                <p class="text-slate-300 text-sm mb-3">Short, pattern-locking phrases - fragments are fine. They appear <strong>only in the round that introduces the LEGO</strong>, then they are gone. Their whole job is to get the new LEGO under the learner's fingers cleanly before anything harder is asked.</p>
                <div class="bg-slate-800 p-3 rounded">
                  <p class="text-xs text-slate-400 mb-2">Characteristics:</p>
                  <ul class="text-xs text-slate-300 space-y-1">
                    <li>&bull; Short and tightly focused on the new LEGO</li>
                    <li>&bull; Fragments allowed - they need not be complete sentences</li>
                    <li>&bull; Lock the pattern in, build first-time confidence</li>
                    <li>&bull; <strong>Ephemeral</strong> - played once, never re-reviewed</li>
                  </ul>
                </div>
                <p class="text-xs text-slate-400 mt-3 italic">Like training wheels - used while you find your balance, then taken off for good.</p>
              </div>

              <!-- USE phrases -->
              <div class="bg-slate-900 p-4 rounded border-l-4 border-emerald-500">
                <div class="flex items-start justify-between mb-2">
                  <h4 class="text-emerald-300 font-semibold">USE phrases - the cycling</h4>
                  <span class="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">ETERNAL</span>
                </div>
                <p class="text-slate-300 text-sm mb-3">Longer, complete, natural sentences. These are the <strong>only</strong> phrases that come back - they re-enter spaced repetition and consolidation, surfacing again and again across the whole course. Because they are forever, they have to be excellent.</p>
                <div class="bg-slate-800 p-3 rounded">
                  <p class="text-xs text-slate-400 mb-2">Quality requirements:</p>
                  <ul class="text-xs text-slate-300 space-y-1">
                    <li>&bull; Complete, <strong>natural</strong> sentences in BOTH languages</li>
                    <li>&bull; Carry an author <strong>quality score on a 5-9 scale</strong> (9 = native-natural; below 5 is rejected and rewritten)</li>
                    <li>&bull; The builder hard-rejects any USE phrase scored below 5 in either language</li>
                    <li>&bull; Final LEGO in a seed &rarr; a USE phrase completes the whole seed sentence</li>
                  </ul>
                </div>
                <p class="text-xs text-slate-400 mt-3 italic">Like actual cycling - kept for life, long after the training wheels are gone.</p>
              </div>
            </div>

            <div class="mt-4 bg-slate-900 border border-slate-600 p-4 rounded">
              <p class="text-amber-300 font-semibold text-sm mb-2">A note on the score</p>
              <p class="text-slate-300 text-sm">
                The 5-9 score is the <strong>author's own judgement</strong>, stored alongside the phrase - it is not produced by an automatic scorer on the live build path. What the builder enforces mechanically is the floor: a USE phrase scored below 5 in either language is rejected outright. Quality, in the end, rests on the person writing the sentence.
              </p>
            </div>
          </div>

          <!-- The runtime round -->
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
            <h3 class="text-xl font-semibold text-emerald-300 mb-4">How the app assembles a round</h3>

            <p class="text-slate-300 mb-4">
              The learner never sees a "basket" laid out flat. At runtime the app walks the LEGOs in order and builds <strong>one round per LEGO</strong>, drawing on that LEGO's phrases and the USE phrases of everything that came before. Every round has the same five phases:
            </p>

            <div class="space-y-3">
              <div class="bg-slate-900 p-4 rounded border-l-4 border-slate-500">
                <p class="text-slate-100 font-semibold text-sm">1. INTRO</p>
                <p class="text-slate-300 text-xs mt-1">You hear the new LEGO presented. (For an M-LEGO, its components are taught here first - never as solo practice, just as a build-up to the whole.)</p>
              </div>
              <div class="bg-slate-900 p-4 rounded border-l-4 border-blue-500">
                <p class="text-slate-100 font-semibold text-sm">2. DEBUT</p>
                <p class="text-slate-300 text-xs mt-1">The LEGO itself, on its own. Its first appearance as a thing you produce.</p>
              </div>
              <div class="bg-slate-900 p-4 rounded border-l-4 border-blue-500">
                <p class="text-slate-100 font-semibold text-sm">3. PRACTICE</p>
                <p class="text-slate-300 text-xs mt-1">All the BUILD phrases first - shortest first - then USE phrases fill any remaining slots, up to a total of seven. This is where the training wheels do their work.</p>
              </div>
              <div class="bg-slate-900 p-4 rounded border-l-4 border-emerald-500">
                <p class="text-slate-100 font-semibold text-sm">4. SPACED REPETITION</p>
                <p class="text-slate-300 text-xs mt-1">USE phrases from <strong>older</strong> LEGOs come back, on a Fibonacci-style schedule (1, 2, 3, 5, 8, 13, 21... rounds back). The LEGO you met just before this one gets the most attention (three of its USE phrases); each other due LEGO contributes one. Capped at twelve review items per round. <strong>Only USE phrases are ever reviewed - BUILD never returns.</strong></p>
              </div>
              <div class="bg-slate-900 p-4 rounded border-l-4 border-emerald-500">
                <p class="text-slate-100 font-semibold text-sm">5. CONSOLIDATE</p>
                <p class="text-slate-300 text-xs mt-1">Up to two more of this LEGO's own USE phrases that haven't been used yet this round - a final settling-in before moving on.</p>
              </div>
            </div>

            <div class="mt-4 bg-amber-900/20 border border-amber-600 p-4 rounded">
              <p class="text-amber-300 font-semibold text-sm mb-2">Why this matters</p>
              <p class="text-slate-300 text-sm">
                BUILD gets you onto each new LEGO and then politely disappears. USE is what keeps coming round - so the long-term shape of your fluency is built entirely from complete, natural sentences, met again and again at widening intervals. The training wheels are temporary on purpose; the cycling is forever on purpose.
              </p>
            </div>
          </div>

          <!-- Example phrases for one LEGO -->
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 class="text-xl font-semibold text-emerald-300 mb-4">Example: phrases for "decir algo" (to say something)</h3>

            <p class="text-slate-400 text-sm mb-4">
              These phrases demonstrate the vocabulary constraint: every one is built entirely from LEGOs the learner already knows, plus the single new LEGO being taught. Notice how the roles split - BUILD locks the pattern in, USE carries it forward.
            </p>

            <div class="bg-slate-900 p-4 rounded overflow-x-auto">
              <pre class="text-xs text-slate-300"><code>BUILD  (training wheels - this round only)
  {"known": "to say something",                  "target": "decir algo"}            <span class="text-blue-400">// the debut: the LEGO itself</span>
  {"known": "I want to say something",           "target": "quiero decir algo"}     <span class="text-blue-400">// short, pattern-locking</span>
  {"known": "I am trying to say something",      "target": "estoy intentando decir algo"}

USE    (eternal - re-reviewed forever, each scored 5-9)
  {"known": "I want to learn how to say something now",
                                                 "target": "quiero aprender como decir algo ahora"}
  {"known": "I am trying to learn how to say something with you",
                                                 "target": "estoy intentando aprender como decir algo contigo"}</code></pre>
            </div>

            <div class="mt-4 bg-blue-900/20 border border-blue-500/50 rounded p-3">
              <p class="text-blue-300 text-xs font-semibold mb-2">Notice:</p>
              <ul class="text-slate-300 text-xs space-y-1">
                <li>&bull; Every other LEGO used ("quiero", "aprender", "como", "estoy intentando", "ahora", "contigo") was learned in an earlier seed</li>
                <li>&bull; Only "decir algo" is new - everything else is already-mastered vocabulary</li>
                <li>&bull; The split is by <strong>role, not length</strong>: BUILD phrases play only in this round; USE phrases come back forever</li>
                <li>&bull; The BUILD list happens to be shorter here, but length is incidental - what makes a phrase BUILD or USE is the job it does, not its word count</li>
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
              A LEGO's phrases can <strong>ONLY</strong> use LEGOs the learner has <strong>ALREADY</strong> mastered.
            </p>
            <p class="text-slate-300 text-sm">
              Every practice phrase must contain ZERO unknowns except the LEGO being taught. The builder enforces this literally - a phrase has to tile entirely from whole chunks already introduced, accumulating in order, with no forward references and no re-spliced or re-conjugated word forms.
            </p>
          </div>

          <div class="bg-blue-900/20 border border-blue-600 rounded-lg p-6 mb-6">
            <h3 class="text-blue-300 font-semibold mb-3 text-lg">The ZUT (Zero Uncertainty Test)</h3>
            <p class="text-slate-200 mb-4">
              The ZUT is the guiding principle for LEGO extraction in the Course Builder - and the one piece of it the builder enforces in code. Give the same known text two different target wordings anywhere in a course and the builder hard-rejects the seed, with three suggested fixes: upchunk (add context), pick a single synonym, or keep both an atomic piece and a chunk to handle word order.
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
                  <p class="text-sm text-slate-400">Earlier LEGOs' USE phrases naturally resurface in later rounds</p>
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
                <p><span class="text-blue-400">Position #N:</span> LEGO Z &rarr; Available vocabulary: <span class="text-amber-400">[A, B, C, ..., Y]</span> (everything before it)</p>
              </div>
              <p class="text-amber-400 mt-4 text-xs">A LEGO may draw on prior seeds and the earlier LEGOs in its own seed - never a later sibling.</p>
              <p class="text-slate-400 text-xs">LEGO type (atomic vs molecular) has no effect on availability - only position in the order matters.</p>
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
                  <p>A few thousand LEGOs &rarr; millions of possible sentence combinations</p>
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
            <router-link to="/docs/terminology" class="text-emerald-400 hover:text-emerald-300">Terminology Glossary</router-link>
            and
            <router-link to="/docs/apml" class="text-emerald-400 hover:text-emerald-300">APML Specification</router-link>.
          </p>
        </div>
      </template>
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
  versionInfo: 'APML v14.1 | Conceptual foundation for language learning through LEGO recombination'
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

<style scoped>
.pedagogy-view {
  padding: 2rem;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5rem 0;
}

.loading-spinner {
  width: 3rem;
  height: 3rem;
  border: 2px solid transparent;
  border-bottom-color: #10b981;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  color: #94a3b8;
}

.db-indicator {
  background: rgba(6, 78, 59, 0.2);
  border: 1px solid #059669;
  border-radius: 0.5rem;
  padding: 0.75rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.db-dot {
  width: 0.5rem;
  height: 0.5rem;
  background: #10b981;
  border-radius: 50%;
}

.db-text {
  color: #6ee7b7;
  font-size: 0.875rem;
  margin: 0;
}

.db-updated {
  color: #94a3b8;
}

.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2.25rem;
  font-weight: 700;
  color: #10b981;
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  color: #94a3b8;
  margin: 0;
}

.page-meta {
  font-size: 0.875rem;
  color: #64748b;
  margin-top: 0.5rem;
}
</style>
