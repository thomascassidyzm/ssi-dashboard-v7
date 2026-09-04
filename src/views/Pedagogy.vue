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
        <div class="bg-surface border border-line rounded-lg p-6 mb-12">
          <h2 class="text-2xl font-semibold text-ink mb-4">Core Philosophy</h2>
          <div class="text-ink space-y-3">
            <p class="text-lg"><strong>SSi teaches language as building blocks that recombine infinitely.</strong></p>
            <ul class="list-disc list-inside space-y-2 ml-4">
              <li><strong>Not memorization</strong> &rarr; Pattern recognition through transparent literal meanings</li>
              <li><strong>Not grammar rules</strong> &rarr; Discovery through component-by-component breakdown</li>
              <li><strong>Not random phrases</strong> &rarr; Systematic recombination of known elements</li>
            </ul>
            <p class="text-ink italic mt-4">Like learning to code: Master individual functions, then combine them into infinite programs.</p>
          </div>
        </div>

        <!-- Section 1: What is a LEGO? -->
        <section class="mb-12">
          <h2 class="text-2xl font-semibold text-ink mb-6">What is a LEGO?</h2>

          <div class="bg-surface border border-line rounded-lg p-6 mb-6">
            <p class="text-ink mb-4">
              A <strong>LEGO</strong> is a pedagogically-sound chunk of language that removes learner uncertainty. When a learner hears the KNOWN phrase, they know EXACTLY what to say in the TARGET language - zero guessing, zero ambiguity.
            </p>

            <div class="bg-canvas border border-line rounded p-4">
              <p class="text-ink font-semibold mb-2">The Two Heuristics (Extraction Principles)</p>
              <div class="space-y-2 text-sm text-ink">
                <p><strong>1. Remove Learner Uncertainty:</strong> Known phrase &rarr; ZERO uncertainty about target</p>
                <p><strong>2. Maximize Patterns with Minimum Vocab:</strong> Overlapping chunks multiply recombination power</p>
              </div>
            </div>
          </div>

          <!-- ATOMIC vs MOLECULAR -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <!-- ATOMIC -->
            <div class="bg-surface border border-line rounded-lg p-6">
              <div class="flex items-center gap-2 mb-4">
                <div class="w-3 h-3 bg-muted rounded-full"></div>
                <h3 class="text-lg font-semibold text-ink">A-type: ATOMIC LEGO</h3>
              </div>

              <div class="bg-canvas border border-line rounded p-3 mb-4">
                <p class="text-ink text-xs font-semibold mb-1">Definition:</p>
                <p class="text-ink text-xs">A single meaningful word. No components, no build-up ladder. The learner hears the known text and produces the target with zero ambiguity.</p>
              </div>

              <div class="bg-canvas p-4 rounded space-y-2">
                <p class="text-sm text-muted mb-2"><strong>Examples:</strong></p>
                <div class="space-y-2 text-sm">
                  <div>
                    <p class="text-ink">"quiero" = "I want"</p>
                    <p class="text-xs text-faint">A single target word, passes ZUT</p>
                  </div>
                  <div>
                    <p class="text-ink">"hablar" = "to speak"</p>
                    <p class="text-xs text-faint">A single target word, passes ZUT</p>
                  </div>
                  <div>
                    <p class="text-ink">"ahora" = "now"</p>
                    <p class="text-xs text-faint">One word in, one word out - nothing to break down</p>
                  </div>
                </div>
              </div>

              <p class="text-xs text-muted mt-3 italic">An A-LEGO is a single word - no components, no build-up. The type is something the author declares, not something the system works out from the word count.</p>
            </div>

            <!-- MOLECULAR -->
            <div class="bg-surface border border-line rounded-lg p-6">
              <div class="flex items-center gap-2 mb-4">
                <div class="w-3 h-3 bg-muted rounded-full"></div>
                <h3 class="text-lg font-semibold text-ink">M-type: MOLECULAR LEGO</h3>
              </div>

              <div class="bg-canvas border border-line rounded p-3 mb-4">
                <p class="text-ink text-xs font-semibold mb-1">Definition:</p>
                <p class="text-ink text-xs">A multi-word chunk that bundles structure the learner cannot yet recombine. It declares its own components - the word-level pieces it is built from - so the system can teach those pieces first, then the whole.</p>
              </div>

              <div class="bg-canvas border border-line rounded p-3 mb-4">
                <p class="text-ink text-xs font-semibold mb-2">An M-type is needed when:</p>
                <ul class="text-ink text-xs space-y-1">
                  <li>1. <strong>Missing components</strong> - some pieces are not learned yet as standalone LEGOs</li>
                  <li>2. <strong>Glue/filler words</strong> - only some parts are A-types, others are idiomatic/grammatical glue</li>
                  <li>3. <strong>Order mismatch</strong> - all A-types known but order differs between languages</li>
                </ul>
              </div>

              <div class="bg-canvas p-4 rounded space-y-3">
                <p class="text-sm text-muted mb-2"><strong>Examples requiring M-type:</strong></p>
                <div>
                  <p class="text-ink text-sm">"blue thing" = "cosa azul"</p>
                  <p class="text-xs text-ink">Order reversed - learner cannot infer</p>
                </div>

                <div>
                  <p class="text-ink text-sm">"tengo ganas de" = "I feel like"</p>
                  <p class="text-xs text-ink">Contains idiomatic glue - cannot tile from A-types</p>
                </div>

                <div>
                  <p class="text-ink text-sm">"the cat" = "y gath" (Welsh)</p>
                  <p class="text-xs text-ink">Mutation triggered - learner cannot infer</p>
                </div>
              </div>

              <p class="text-xs text-muted mt-3 italic">The Inferability Test: can the learner figure this out from what they already know? No = M-type needed. Either way, a LEGO is kept small - the builder caps every LEGO target at roughly eight syllables, so anything bigger gets decomposed.</p>
            </div>
          </div>

          <!-- The Inferability Test Box -->
          <div class="bg-surface border border-line rounded-lg p-6 mb-6">
            <h3 class="text-xl font-semibold text-ink mb-4">The Inferability Test</h3>
            <p class="text-ink mb-4"><strong>Given what the learner already knows, can they figure this out themselves?</strong></p>
            <div class="grid md:grid-cols-2 gap-4">
              <div class="bg-canvas border border-line p-4 rounded">
                <p class="text-ink font-semibold mb-2">Yes = Not a new LEGO</p>
                <p class="text-ink text-sm">Just tile existing A-types</p>
              </div>
              <div class="bg-canvas border border-line p-4 rounded">
                <p class="text-ink font-semibold mb-2">No = M-type needed</p>
                <p class="text-ink text-sm">Requires explicit introduction</p>
              </div>
            </div>

            <div class="bg-canvas/60 border border-line p-4 rounded mt-4">
              <p class="text-ink font-semibold text-sm mb-2">Overlap is a feature, not a clash</p>
              <p class="text-ink text-sm">
                A single word is allowed to live both as an A-LEGO on its own <strong>and</strong> inside an M-LEGO - the atom "blue" and the chunk "blue thing", say. This is deliberate. The learner meets the word alone, meets it again inside a larger chunk that handles the reordering, and infers the pattern with no explanation. Because the known-language prompts differ, this never trips the consistency check - it is precisely the device that teaches word order across languages.
              </p>
            </div>
          </div>

          <!-- Componentization: The Pedagogical Superpower -->
          <div class="bg-surface border border-line rounded-lg p-6">
            <h3 class="text-xl font-semibold text-ink mb-4">Componentization: The Pedagogical Superpower</h3>

            <p class="text-ink mb-4">
              M-type LEGOs use <strong>literal translations</strong> for each component. This transparency lets learners discover grammar patterns <strong>without explicit rules</strong>.
            </p>

            <div class="bg-canvas p-5 rounded-lg">
              <p class="text-ink font-semibold mb-3">Example: "as often as possible"</p>

              <div class="space-y-4">
                <div>
                  <p class="text-ink text-sm font-medium">Target (Spanish):</p>
                  <p class="text-ink text-lg font-mono">"lo mas frecuentemente posible"</p>
                </div>

                <div>
                  <p class="text-ink text-sm font-medium">Component Breakdown (Literal Translations):</p>
                  <div class="ml-4 space-y-1 text-ink">
                    <p class="text-sm"><span class="text-ink font-mono">lo mas</span> = <span class="text-ink">"the most"</span></p>
                    <p class="text-sm"><span class="text-ink font-mono">frecuentemente</span> = <span class="text-ink">"often"</span></p>
                    <p class="text-sm"><span class="text-ink font-mono">posible</span> = <span class="text-ink">"possible"</span></p>
                  </div>
                </div>

                <div class="bg-canvas border border-line p-4 rounded">
                  <p class="text-ink font-semibold mb-3">What the Learner Discovers:</p>
                  <ul class="text-ink space-y-2 text-sm">
                    <li>Because they know: <strong>"lo mas"</strong> = "the most"</li>
                    <li>And they know: <strong>"posible"</strong> = "possible"</li>
                    <li><strong>They can now create</strong>: "lo mas posible" = "the most possible"</li>
                    <li><strong>They understand</strong>: Spanish builds superlatives with "lo mas" + adjective</li>
                  </ul>
                  <p class="text-ink text-xs mt-4 italic">
                    No grammar explanation needed. The pattern emerges from transparent literal meanings.
                  </p>
                </div>
              </div>
            </div>

            <div class="mt-4 bg-surface border border-line p-4 rounded">
              <p class="text-ink font-semibold text-sm mb-2">Why Literal Translations &gt; Natural Equivalents</p>
              <div class="grid md:grid-cols-2 gap-4 text-xs">
                <div>
                  <p class="text-ink mb-1">Natural Translation:</p>
                  <p class="text-muted">"frecuentemente" = "frequently"</p>
                  <p class="text-faint mt-1">Learner cannot discover "often" = "frecuentemente"</p>
                </div>
                <div>
                  <p class="text-ink mb-1">Literal Translation:</p>
                  <p class="text-ink">"frecuentemente" = "often"</p>
                  <p class="text-muted mt-1">Transparent! Learner bridges "often" to "frequently"</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Section 2: A LEGO's Phrases -->
        <section class="mb-12">
          <h2 class="text-2xl font-semibold text-ink mb-6">A LEGO's Phrases: BUILD and USE</h2>

          <div class="bg-surface border border-line rounded-lg p-6 mb-6">
            <p class="text-ink mb-4">
              Every LEGO carries its own practice phrases. These are <strong>not</strong> a random bag of sentences. Each one demonstrates how <strong>this LEGO plugs into LEGOs the learner already knows.</strong>
            </p>
            <p class="text-ink mb-4">
              The phrases come in two kinds, and the difference between them is the whole story of how a LEGO is taught and then kept alive: <strong>BUILD</strong> phrases get you onto the LEGO, and <strong>USE</strong> phrases keep you fluent with it forever.
            </p>

            <p class="text-muted text-sm mb-4">
              (You may still hear the old word "basket" for a LEGO's phrases. It is a legacy term. The phrases are now stored directly under each LEGO, each tagged with its role, and the app assembles them into a <strong>round</strong> at runtime.)
            </p>

            <div class="bg-canvas border border-line rounded p-4 mt-4">
              <p class="text-ink font-semibold mb-2">The API Documentation Metaphor</p>
              <div class="space-y-2 text-sm text-ink">
                <p>&bull; <strong>LEGO</strong> = new function you are learning (e.g., <code class="bg-surface px-2 py-1 rounded font-mono">filter()</code>)</p>
                <p>&bull; <strong>Its phrases</strong> = worked examples showing how to call this function</p>
                <p>&bull; <strong>Available vocabulary</strong> = variables/functions already defined in previous code</p>
                <p class="text-ink">&bull; <strong>Iron Rule</strong> = you cannot use undefined variables in your examples</p>
              </div>
            </div>
          </div>

          <!-- BUILD vs USE structure -->
          <div class="bg-surface border border-line rounded-lg p-6 mb-6">
            <h3 class="text-xl font-semibold text-ink mb-4">Training Wheels vs Cycling Forever</h3>

            <p class="text-ink mb-4">
              When you first learn to ride a bike you use training wheels. They get you balanced and moving. Then they come off - and you cycle for the rest of your life without them. A LEGO's phrases work exactly the same way. The split is <strong>not</strong> "short phrases vs long phrases" - it is <strong>BUILD</strong> (the training wheels) vs <strong>USE</strong> (the cycling).
            </p>

            <div class="space-y-4">
              <!-- BUILD phrases -->
              <div class="bg-canvas p-4 rounded border-l-4 border-line">
                <div class="flex items-start justify-between mb-2">
                  <h4 class="text-ink font-semibold">BUILD phrases - the training wheels</h4>
                  <span class="text-xs bg-canvas text-ink px-2 py-1 rounded">DEBUT ROUND ONLY</span>
                </div>
                <p class="text-ink text-sm mb-3">Short, pattern-locking phrases - fragments are fine. They appear <strong>only in the round that introduces the LEGO</strong>, then they are gone. Their whole job is to get the new LEGO under the learner's fingers cleanly before anything harder is asked.</p>
                <div class="bg-surface p-3 rounded">
                  <p class="text-xs text-muted mb-2">Characteristics:</p>
                  <ul class="text-xs text-ink space-y-1">
                    <li>&bull; Short and tightly focused on the new LEGO</li>
                    <li>&bull; Fragments allowed - they need not be complete sentences</li>
                    <li>&bull; Lock the pattern in, build first-time confidence</li>
                    <li>&bull; <strong>Ephemeral</strong> - played once, never re-reviewed</li>
                  </ul>
                </div>
                <p class="text-xs text-muted mt-3 italic">Like training wheels - used while you find your balance, then taken off for good.</p>
              </div>

              <!-- USE phrases -->
              <div class="bg-canvas p-4 rounded border-l-4 border-line">
                <div class="flex items-start justify-between mb-2">
                  <h4 class="text-ink font-semibold">USE phrases - the cycling</h4>
                  <span class="text-xs bg-canvas text-ink px-2 py-1 rounded">ETERNAL</span>
                </div>
                <p class="text-ink text-sm mb-3">Longer, complete, natural sentences. These are the <strong>only</strong> phrases that come back - they re-enter spaced repetition and consolidation, surfacing again and again across the whole course. Because they are forever, they have to be excellent.</p>
                <div class="bg-surface p-3 rounded">
                  <p class="text-xs text-muted mb-2">Quality requirements:</p>
                  <ul class="text-xs text-ink space-y-1">
                    <li>&bull; Complete, <strong>natural</strong> sentences in BOTH languages</li>
                    <li>&bull; Carry an author <strong>quality score on a 5-9 scale</strong> (9 = native-natural; below 5 is rejected and rewritten)</li>
                    <li>&bull; The builder hard-rejects any USE phrase scored below 5 in either language</li>
                    <li>&bull; Final LEGO in a seed &rarr; a USE phrase completes the whole seed sentence</li>
                  </ul>
                </div>
                <p class="text-xs text-muted mt-3 italic">Like actual cycling - kept for life, long after the training wheels are gone.</p>
              </div>
            </div>

            <div class="mt-4 bg-canvas border border-line p-4 rounded">
              <p class="text-ink font-semibold text-sm mb-2">A note on the score</p>
              <p class="text-ink text-sm">
                The 5-9 score is the <strong>author's own judgement</strong>, stored alongside the phrase - it is not produced by an automatic scorer on the live build path. What the builder enforces mechanically is the floor: a USE phrase scored below 5 in either language is rejected outright. Quality, in the end, rests on the person writing the sentence.
              </p>
            </div>
          </div>

          <!-- The runtime round -->
          <div class="bg-surface border border-line rounded-lg p-6 mb-6">
            <h3 class="text-xl font-semibold text-ink mb-4">How the app assembles a round</h3>

            <p class="text-ink mb-4">
              The learner never sees a "basket" laid out flat. At runtime the app walks the LEGOs in order and builds <strong>one round per LEGO</strong>, drawing on that LEGO's phrases and the USE phrases of everything that came before. Every round has the same five phases:
            </p>

            <div class="space-y-3">
              <div class="bg-canvas p-4 rounded border-l-4 border-line">
                <p class="text-ink font-semibold text-sm">1. INTRO</p>
                <p class="text-ink text-xs mt-1">You hear the new LEGO presented. (For an M-LEGO, its components are taught here first - never as solo practice, just as a build-up to the whole.)</p>
              </div>
              <div class="bg-canvas p-4 rounded border-l-4 border-line">
                <p class="text-ink font-semibold text-sm">2. DEBUT</p>
                <p class="text-ink text-xs mt-1">The LEGO itself, on its own. Its first appearance as a thing you produce.</p>
              </div>
              <div class="bg-canvas p-4 rounded border-l-4 border-line">
                <p class="text-ink font-semibold text-sm">3. PRACTICE</p>
                <p class="text-ink text-xs mt-1">All the BUILD phrases first - shortest first - then USE phrases fill any remaining slots, up to a total of seven. This is where the training wheels do their work.</p>
              </div>
              <div class="bg-canvas p-4 rounded border-l-4 border-line">
                <p class="text-ink font-semibold text-sm">4. SPACED REPETITION</p>
                <p class="text-ink text-xs mt-1">USE phrases from <strong>older</strong> LEGOs come back, on a Fibonacci-style schedule (1, 2, 3, 5, 8, 13, 21... rounds back). The LEGO you met just before this one gets the most attention (three of its USE phrases); each other due LEGO contributes one. Capped at twelve review items per round. <strong>Only USE phrases are ever reviewed - BUILD never returns.</strong></p>
              </div>
              <div class="bg-canvas p-4 rounded border-l-4 border-line">
                <p class="text-ink font-semibold text-sm">5. CONSOLIDATE</p>
                <p class="text-ink text-xs mt-1">Up to two more of this LEGO's own USE phrases that haven't been used yet this round - a final settling-in before moving on.</p>
              </div>
            </div>

            <div class="mt-4 bg-canvas border border-line p-4 rounded">
              <p class="text-ink font-semibold text-sm mb-2">Why this matters</p>
              <p class="text-ink text-sm">
                BUILD gets you onto each new LEGO and then politely disappears. USE is what keeps coming round - so the long-term shape of your fluency is built entirely from complete, natural sentences, met again and again at widening intervals. The training wheels are temporary on purpose; the cycling is forever on purpose.
              </p>
            </div>
          </div>

          <!-- Example phrases for one LEGO -->
          <div class="bg-surface border border-line rounded-lg p-6">
            <h3 class="text-xl font-semibold text-ink mb-4">Example: phrases for "decir algo" (to say something)</h3>

            <p class="text-muted text-sm mb-4">
              These phrases demonstrate the vocabulary constraint: every one is built entirely from LEGOs the learner already knows, plus the single new LEGO being taught. Notice how the roles split - BUILD locks the pattern in, USE carries it forward.
            </p>

            <div class="bg-canvas p-4 rounded overflow-x-auto">
              <pre class="text-xs text-ink"><code>BUILD  (training wheels - this round only)
  {"known": "to say something",                  "target": "decir algo"}            <span class="text-ink">// the debut: the LEGO itself</span>
  {"known": "I want to say something",           "target": "quiero decir algo"}     <span class="text-ink">// short, pattern-locking</span>
  {"known": "I am trying to say something",      "target": "estoy intentando decir algo"}

USE    (eternal - re-reviewed forever, each scored 5-9)
  {"known": "I want to learn how to say something now",
                                                 "target": "quiero aprender como decir algo ahora"}
  {"known": "I am trying to learn how to say something with you",
                                                 "target": "estoy intentando aprender como decir algo contigo"}</code></pre>
            </div>

            <div class="mt-4 bg-canvas border border-line rounded p-3">
              <p class="text-ink text-xs font-semibold mb-2">Notice:</p>
              <ul class="text-ink text-xs space-y-1">
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
          <h2 class="text-2xl font-semibold text-ink mb-6">The Vocabulary Constraint &amp; Learner Uncertainty Test</h2>

          <div class="bg-canvas border border-line rounded-lg p-6 mb-6">
            <h3 class="text-ink font-semibold mb-3 text-lg">The Vocabulary Constraint</h3>
            <p class="text-ink text-lg mb-4">
              A LEGO's phrases can <strong>ONLY</strong> use LEGOs the learner has <strong>ALREADY</strong> mastered.
            </p>
            <p class="text-ink text-sm">
              Every practice phrase must contain ZERO unknowns except the LEGO being taught. The builder enforces this literally - a phrase has to tile entirely from whole chunks already introduced, accumulating in order, with no forward references and no re-spliced or re-conjugated word forms.
            </p>
          </div>

          <div class="bg-canvas border border-line rounded-lg p-6 mb-6">
            <h3 class="text-ink font-semibold mb-3 text-lg">The ZUT (Zero Uncertainty Test)</h3>
            <p class="text-ink mb-4">
              The ZUT is the guiding principle for LEGO extraction in the Course Builder - and the one piece of it the builder enforces in code. Give the same known text two different target wordings anywhere in a course and the builder hard-rejects the seed, with three suggested fixes: upchunk (add context), pick a single synonym, or keep both an atomic piece and a chunk to handle word order.
            </p>
            <div class="bg-canvas p-4 rounded">
              <p class="text-ink font-semibold mb-2">The Test:</p>
              <p class="text-ink text-sm mb-3">
                When a learner hears the KNOWN phrase, is there <strong>ZERO uncertainty</strong> about what to say in the TARGET language?
              </p>
              <div class="space-y-2 text-xs">
                <div class="flex items-start gap-2">
                  <span class="judge-good">PASS</span>
                  <p class="text-ink"><strong>Passes ZUT:</strong> "to say something" &rarr; "decir algo" (no ambiguity)</p>
                </div>
                <div class="flex items-start gap-2">
                  <span class="judge-bad">FAIL</span>
                  <p class="text-ink"><strong>Fails ZUT:</strong> "say" &rarr; decir? digo? dice? (learner uncertain which form)</p>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-surface border border-line rounded-lg p-6 mb-6">
            <h3 class="text-xl font-semibold text-ink mb-4">Minimum Viable Unit of Consistent Meaning</h3>

            <p class="text-ink mb-4">
              <strong>We do NOT break seed pairs down to individual words</strong> - that would fail the ZUT.
            </p>

            <p class="text-ink text-sm mb-4">
              LEGOs are the <strong>minimum viable unit</strong> where meaning is consistent and learner uncertainty is ZERO.
            </p>

            <div class="bg-canvas p-5 rounded-lg">
              <p class="text-ink font-semibold mb-3">Example Breakdown:</p>

              <div class="space-y-4">
                <div>
                  <p class="text-muted text-sm mb-2">Seed Pair (English):</p>
                  <p class="text-ink text-lg">"I want you to speak Spanish with me tomorrow"</p>
                </div>

                <div>
                  <p class="text-ink text-sm mb-2">LEGO Breakdown (passing ZUT):</p>
                  <div class="font-mono text-sm text-ink space-y-1">
                    <p><span class="text-ink">I want</span> | <span class="text-ink">you to speak</span> | <span class="text-ink">Spanish</span> | <span class="text-ink">with me</span> | <span class="text-ink">tomorrow</span></p>
                  </div>
                </div>

                <div>
                  <p class="text-ink text-sm mb-2">Target (Spanish):</p>
                  <div class="font-mono text-sm text-ink space-y-1">
                    <p><span class="text-ink">quiero</span> | <span class="text-ink">que hables</span> | <span class="text-ink">espanol</span> | <span class="text-ink">conmigo</span> | <span class="text-ink">manana</span></p>
                  </div>
                </div>

                <div class="bg-canvas border border-line p-3 rounded mt-3">
                  <p class="text-ink text-sm font-semibold mb-2">Why This Works:</p>
                  <ul class="text-ink text-xs space-y-1">
                    <li>&bull; <strong>"you to speak"</strong> is ATOMIC - breaking it down would fail ZUT</li>
                    <li>&bull; Learner hears "you to speak" &rarr; knows instantly: "que hables"</li>
                    <li>&bull; Breaking to "you" | "to" | "speak" would create uncertainty</li>
                    <li>&bull; <strong>"with me"</strong> = one LEGO "conmigo" (not "con" + "mi")</li>
                  </ul>
                </div>

                <div class="bg-canvas border border-line p-3 rounded mt-3">
                  <p class="text-ink text-sm font-semibold mb-2">What Would Fail ZUT:</p>
                  <ul class="text-ink text-xs space-y-1">
                    <li>Breaking "you to speak" &rarr; "you" | "to" | "speak" (too much uncertainty)</li>
                    <li>Breaking "with me" &rarr; "with" | "me" (does not map to "con" + "mi", it is "conmigo")</li>
                    <li>Individual words lose grammatical context needed for correct translation</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-surface border border-line rounded-lg p-6 mb-6">
            <h3 class="text-xl font-semibold text-ink mb-4">Why This Matters</h3>
            <ul class="space-y-3 text-ink">
              <li class="flex items-start gap-3">
                <span class="text-ink text-xl">+</span>
                <div>
                  <p class="font-semibold">Zero cognitive overload</p>
                  <p class="text-sm text-muted">Learner focuses 100% on the new LEGO, not distracted by unknown words</p>
                </div>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-ink text-xl">+</span>
                <div>
                  <p class="font-semibold">Immediate comprehension</p>
                  <p class="text-sm text-muted">Every practice phrase is instantly understandable</p>
                </div>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-ink text-xl">+</span>
                <div>
                  <p class="font-semibold">True spaced repetition</p>
                  <p class="text-sm text-muted">Earlier LEGOs' USE phrases naturally resurface in later rounds</p>
                </div>
              </li>
            </ul>
          </div>

          <div class="bg-surface border border-line rounded-lg p-6">
            <h3 class="text-xl font-semibold text-ink mb-4">Progressive Vocabulary Accumulation</h3>

            <div class="bg-canvas p-4 rounded font-mono text-xs">
              <p class="text-muted mb-3">How vocabulary grows position-by-position:</p>
              <div class="space-y-1 text-ink">
                <p><span class="text-ink">Position #1:</span> LEGO A &rarr; Available vocabulary: <span class="text-ink">[]</span> (empty)</p>
                <p><span class="text-ink">Position #2:</span> LEGO B &rarr; Available vocabulary: <span class="text-ink">[A]</span></p>
                <p><span class="text-ink">Position #3:</span> LEGO C &rarr; Available vocabulary: <span class="text-ink">[A, B]</span></p>
                <p><span class="text-ink">Position #4:</span> LEGO D &rarr; Available vocabulary: <span class="text-ink">[A, B, C]</span></p>
                <p class="text-ink">...</p>
                <p><span class="text-ink">Position #N:</span> LEGO Z &rarr; Available vocabulary: <span class="text-ink">[A, B, C, ..., Y]</span> (everything before it)</p>
              </div>
              <p class="text-ink mt-4 text-xs">A LEGO may draw on prior seeds and the earlier LEGOs in its own seed - never a later sibling.</p>
              <p class="text-muted text-xs">LEGO type (atomic vs molecular) has no effect on availability - only position in the order matters.</p>
            </div>
          </div>
        </section>

        <!-- Section 4: Why This System Works -->
        <section class="mb-12">
          <h2 class="text-2xl font-semibold text-ink mb-6">Why This System Works</h2>

          <div class="grid md:grid-cols-2 gap-6">
            <div class="bg-surface border border-line rounded-lg p-6">
              <h3 class="text-lg font-semibold text-ink mb-3">1. Graduated Cognitive Load</h3>
              <ul class="space-y-2 text-ink text-sm">
                <li class="flex items-start gap-2">
                  <span class="text-ink">&bull;</span>
                  <p>Each LEGO introduces exactly ONE new concept</p>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-ink">&bull;</span>
                  <p>Practice phrases contain ZERO unknowns except the LEGO being taught</p>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-ink">&bull;</span>
                  <p>Learner never overwhelmed - always in the "zone of proximal development"</p>
                </li>
              </ul>
            </div>

            <div class="bg-surface border border-line rounded-lg p-6">
              <h3 class="text-lg font-semibold text-ink mb-3">2. Pattern Discovery (Not Rules)</h3>
              <ul class="space-y-2 text-ink text-sm">
                <li class="flex items-start gap-2">
                  <span class="text-ink">&bull;</span>
                  <p>Componentization shows HOW target language builds patterns</p>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-ink">&bull;</span>
                  <p>Literal translations reveal grammar structure transparently</p>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-ink">&bull;</span>
                  <p>Learners acquire patterns implicitly through exposure, not memorization</p>
                </li>
              </ul>
            </div>

            <div class="bg-surface border border-line rounded-lg p-6">
              <h3 class="text-lg font-semibold text-ink mb-3">3. Cumulative Knowledge Building</h3>
              <ul class="space-y-2 text-ink text-sm">
                <li class="flex items-start gap-2">
                  <span class="text-ink">&bull;</span>
                  <p>Each new LEGO builds on all previous LEGOs</p>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-ink">&bull;</span>
                  <p>No "islands" of knowledge - everything connects</p>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-ink">&bull;</span>
                  <p>Confidence compounds exponentially over time</p>
                </li>
              </ul>
            </div>

            <div class="bg-surface border border-line rounded-lg p-6">
              <h3 class="text-lg font-semibold text-ink mb-3">4. Infinite Recombination Power</h3>
              <ul class="space-y-2 text-ink text-sm">
                <li class="flex items-start gap-2">
                  <span class="text-ink">&bull;</span>
                  <p>A few thousand LEGOs &rarr; millions of possible sentence combinations</p>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-ink">&bull;</span>
                  <p>Overlapping chunks maximize pattern exposure</p>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-ink">&bull;</span>
                  <p>Learners can say things they have never been explicitly taught</p>
                </li>
              </ul>
            </div>
          </div>

          <div class="mt-6 bg-surface border border-line rounded-lg p-6">
            <h3 class="text-lg font-semibold text-ink mb-3">The Result: True Language Acquisition</h3>
            <p class="text-ink mb-4">
              Learners do not memorize phrases - they <strong>acquire the ability to generate language</strong>.
            </p>
            <div class="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-ink mb-2">Traditional Phrasebook Approach:</p>
                <ul class="text-muted space-y-1 ml-4">
                  <li>&bull; Memorize: "Where is the bathroom?"</li>
                  <li>&bull; Can ONLY say that exact phrase</li>
                  <li>&bull; Helpless if situation varies slightly</li>
                </ul>
              </div>
              <div>
                <p class="text-ink mb-2">SSi LEGO Approach:</p>
                <ul class="text-ink space-y-1 ml-4">
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
        <div class="text-center text-faint text-sm border-t border-line pt-6">
          <p>This document explains the <strong>"why"</strong> behind the system.</p>
          <p class="mt-2">
            For technical implementation details, see
            <router-link to="/stocktake/glossary" class="text-ink hover:text-ink">Terminology Glossary</router-link>
            and
            <router-link to="/stocktake/apml" class="text-ink hover:text-ink">APML</router-link>.
          </p>
          <!-- /recursive-upregulation used to be reachable only from the How &
               Why prose, which was deprecated on 2026-09-04. Its door is here
               now — the nav declaration's OUTSIDE_NAV entry says so. -->
          <p class="mt-2">
            For the methodology explainer behind the method, see
            <router-link to="/recursive-upregulation" class="text-ink hover:text-ink">Recursive Up-Regulation</router-link>.
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
  versionInfo: 'Conceptual foundation for language learning through LEGO recombination'
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
  border-bottom-color: var(--accent-2, var(--accent));
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  color: var(--muted);
}

.db-indicator {
  background: var(--surface);
  border: 1px solid var(--line);
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
  background: var(--success);
  border-radius: 50%;
}

.db-text {
  color: var(--muted);
  font-size: 0.875rem;
  margin: 0;
}

.db-updated {
  color: var(--muted);
}

.page-header {
  margin-bottom: 2rem;
}

/* Colour and weight come from the shared house look in
   assets/ui-tokens.css — this page sets only its own size. */
.page-title {
  font-size: 2.25rem;
  margin: 0 0 0.5rem 0;
}

.page-subtitle { margin: 0; }

.page-meta {
  font-size: 0.875rem;
  color: var(--faint);
  margin-top: 0.5rem;
}

/* THE TWO COLOURS LEFT ON THIS PAGE, AND WHY.
 *
 * Tom, 2026-09-04: "Pedagogy is a shocker of a page - way to much colour
 * differences". It carried a different accent, tint and border per section —
 * emerald, blue, amber, purple, pink, orange, red — plus a whole block of
 * light-mode overrides written only to make those dark-tuned hues survive the
 * light canvas. All of that is gone: the panels are the house --surface /
 * --canvas / --line tokens, which follow the theme for free, so the override
 * block went with it.
 *
 * These two stay because they are a verdict, not decoration: PASS and FAIL on
 * the ZUT examples say whether the example is the thing to do or the thing not
 * to do. Every other former colour distinction on the page is carried by a
 * heading or a label in the text, which is why removing it lost nothing. */
.judge-good {
  color: var(--success);
  font-weight: 600;
}
.judge-bad {
  color: var(--danger);
  font-weight: 600;
}
</style>
