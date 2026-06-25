<template>
  <div class="terminology-view">
    <!-- Page Header (within DocsLayout) -->
    <div class="page-header">
      <h1 class="page-title">Terminology Glossary</h1>
      <p class="page-subtitle">The words we use to talk about how SSi builds a course — and what each one actually points at in the system</p>
      <p class="page-meta">Date: 2026-06-02 | APML v14.1 | Status: Current — matches the Course Builder (port 3471) as it runs today</p>
    </div>

      <!-- Quick Reference -->
      <div class="bg-emerald-900/20 border border-emerald-500/50 rounded-lg p-6 mb-12">
        <h2 class="text-xl font-semibold text-emerald-300 mb-4">🎯 Quick Reference</h2>
        <div class="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <p class="text-accent-2 font-semibold mb-2">The shape of a course</p>
            <ul class="text-ink space-y-1">
              <li>• A <strong>seed</strong> (one English sentence)</li>
              <li>• decomposed into <strong>LEGOs</strong></li>
              <li>• each carrying <strong>component / build / use</strong> phrases</li>
            </ul>
          </div>
          <div>
            <p class="text-accent font-semibold mb-2">LEGO types</p>
            <ul class="text-ink space-y-1">
              <li>• <strong>A:</strong> a single meaningful word</li>
              <li>• <strong>M:</strong> a multi-word chunk, with components</li>
            </ul>
          </div>
          <div>
            <p class="text-blue-400 font-semibold mb-2">Where it lives</p>
            <ul class="text-ink space-y-1">
              <li>• <code class="text-xs">course_seeds</code></li>
              <li>• <code class="text-xs">course_legos</code></li>
              <li>• <code class="text-xs">course_practice_phrases</code></li>
              <li>• <code class="text-xs">course_audio</code> — all in Supabase</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Orientation -->
      <div class="bg-surface border border-line rounded-lg p-6 mb-12">
        <p class="text-ink">
          A glossary is only worth having if the words mean what the machine does. This page is the dictionary
          for the SSi course-builder as it runs <em>now</em> — every term below points at a real thing in the
          code or the database. Some of the older words you may have heard — <strong>baskets</strong>,
          <strong>LUT</strong>, <strong>BASE</strong> and <strong>COMPOSITE</strong> — are still listed at the
          bottom, but only so you can recognise them and let them go. They are not how the system thinks anymore.
        </p>
      </div>

      <!-- The shape of a course -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-accent-2 mb-6">The shape of a course</h2>
        <p class="text-ink mb-6">
          A course is not a pile of files. It is built one <strong>seed</strong> at a time, through a single
          atomic call to the Course Builder. Each seed becomes a handful of <strong>LEGOs</strong>, and each LEGO
          carries its own practice phrases. Three Supabase tables hold the result. That's the whole spine.
        </p>

        <!-- Seed -->
        <div class="bg-surface border border-line rounded-lg p-6 mb-6">
          <h3 class="text-xl font-semibold text-emerald-300 mb-3">1. Seed</h3>

          <div class="mb-4">
            <span class="text-sm font-medium text-muted">Definition:</span>
            <p class="text-ink mt-1">A canonical English sentence — pre-loaded from <code class="text-sm">canonical_seeds</code> — that an agent decomposes into LEGOs. The seed is the atomic unit of submission: one seed, one API call, all-or-nothing.</p>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-muted">Example:</span>
            <div class="bg-canvas p-4 rounded mt-2">
              <p class="text-ink text-sm mb-2"><strong>Known (English):</strong> "I want to speak Spanish with you now."</p>
              <p class="text-ink text-sm"><strong>Target (Spanish):</strong> "Quiero hablar español contigo ahora."</p>
            </div>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-muted">Reference format:</span>
            <p class="text-ink mt-1"><code>S0001</code>, <code>S0042</code>… (S + 4-digit number). Seed counts vary by course — there is no fixed total.</p>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-muted">Key properties:</span>
            <ul class="list-disc list-inside text-ink mt-2 space-y-1">
              <li>Language-pair specific (<code class="text-xs">spa_for_eng</code> ≠ <code class="text-xs">spa_for_fra</code>)</li>
              <li>Must be <strong>tileable</strong> — its translation has to be fully reconstructable from the LEGOs it decomposes into, plus vocabulary already taught</li>
              <li>The English known text must match the canonical seed exactly, or the submission is rejected as a canonical mismatch</li>
            </ul>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-muted">Created by:</span>
              <span class="text-accent-2 ml-2 font-medium">Course Builder, <code class="text-xs">POST /api/seed/complete</code></span>
            </div>
            <div>
              <span class="text-muted">Stored in:</span>
              <span class="text-ink ml-2 font-mono text-xs">course_seeds (Supabase)</span>
            </div>
          </div>
        </div>

        <!-- LEGOs -->
        <div class="bg-surface border border-line rounded-lg p-6 mb-6">
          <h3 class="text-xl font-semibold text-emerald-300 mb-3">2. LEGO</h3>

          <div class="mb-4">
            <span class="text-sm font-medium text-muted">Definition:</span>
            <p class="text-ink mt-1">A pedagogically-sound chunk of language that removes learner uncertainty. The test is simple: when the learner hears the known-language prompt, they know <em>exactly</em> what to say in the target — with zero guessing.</p>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-muted">The two things every LEGO has to do:</span>
            <div class="bg-canvas p-4 rounded mt-2 space-y-3">
              <div>
                <p class="text-accent-2 font-semibold text-sm">1. Remove uncertainty</p>
                <p class="text-ink text-xs">Hear the known phrase → zero ambiguity about the target phrase. That's ZUT, below.</p>
              </div>
              <div>
                <p class="text-accent font-semibold text-sm">2. Maximise patterns with minimum vocabulary</p>
                <p class="text-ink text-xs">Overlapping chunks let each LEGO recombine into many sentences. A small vocabulary, taught well, says a great deal.</p>
              </div>
            </div>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-muted">Reference format:</span>
            <p class="text-ink mt-1"><code>S0001L01</code>, <code>S0001L02</code>… (seed + L + LEGO index)</p>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-muted">Example breakdown:</span>
            <div class="bg-canvas p-4 rounded mt-2 text-sm">
              <p class="text-ink mb-2"><strong>Seed S0001:</strong></p>
              <p class="text-muted mb-1">Known: "I want to speak Spanish with you now."</p>
              <p class="text-muted mb-3">Target: "Quiero hablar español contigo ahora."</p>

              <p class="text-accent-2 mb-2">Decomposes into LEGOs such as:</p>
              <ul class="space-y-1 text-ink ml-4">
                <li>• <strong>S0001L01:</strong> "quiero" = "I want" <span class="text-xs text-blue-400">(A — single word)</span></li>
                <li>• <strong>S0001L02:</strong> "hablar" = "to speak" <span class="text-xs text-blue-400">(A — single word)</span></li>
                <li>• <strong>S0001L03:</strong> "español" = "Spanish" <span class="text-xs text-blue-400">(A — single word)</span></li>
                <li>• <strong>S0001L04:</strong> "contigo" = "with you" <span class="text-xs text-blue-400">(A — single word)</span></li>
                <li>• <strong>S0001L05:</strong> "ahora" = "now" <span class="text-xs text-blue-400">(A — single word)</span></li>
              </ul>

              <p class="text-accent-2 mt-3 text-xs">✓ These LEGOs <strong>tile</strong> the seed — together they reconstruct the whole target sentence.</p>
            </div>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-muted">Key properties:</span>
            <ul class="list-disc list-inside text-ink mt-2 space-y-1">
              <li>Course-specific <em>and</em> language-pair specific</li>
              <li>Two types: <strong>A</strong> (atomic) and <strong>M</strong> (molecular) — see below</li>
              <li>Capped at <strong>8 syllables</strong> — that, not a word count, is the real size guard</li>
              <li>Overlap is allowed and encouraged — it's how recombination happens</li>
            </ul>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-muted">Created by:</span>
              <span class="text-accent-2 ml-2 font-medium">Course Builder, within the seed submission</span>
            </div>
            <div>
              <span class="text-muted">Stored in:</span>
              <span class="text-ink ml-2 font-mono text-xs">course_legos (Supabase)</span>
            </div>
          </div>
        </div>

        <!-- Practice phrases -->
        <div class="bg-surface border border-line rounded-lg p-6 mb-6">
          <h3 class="text-xl font-semibold text-emerald-300 mb-3">3. Practice phrases — component, build, use</h3>

          <div class="mb-4">
            <span class="text-sm font-medium text-muted">Definition:</span>
            <p class="text-ink mt-1">Every LEGO carries a set of practice phrases that show it plugging into vocabulary the learner already knows. Each phrase has exactly one of three roles — <strong>component</strong>, <strong>build</strong>, or <strong>use</strong> — and the role decides where, and how often, the learner meets it.</p>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-muted">The three roles:</span>
            <div class="bg-canvas p-4 rounded mt-2 text-sm">
              <div class="space-y-2">
                <div class="bg-surface p-3 rounded border-l-4 border-line">
                  <p class="text-ink font-semibold mb-1">Component <span class="text-xs text-faint">(role letter C)</span></p>
                  <p class="text-ink text-xs mb-1">A word-level piece of an M-LEGO, taught on its own before the molecule is assembled.</p>
                  <p class="text-muted text-xs">Shown once at the LEGO's debut; never replayed; never enters spaced repetition.</p>
                </div>
                <div class="bg-surface p-3 rounded border-l-4 border-blue-500">
                  <p class="text-blue-300 font-semibold mb-1">Build <span class="text-xs text-faint">(role letter B)</span></p>
                  <p class="text-ink text-xs mb-1">A short, pattern-locking phrase — fragments are fine. This role also carries the LEGO's <strong>debut</strong> (the LEGO itself, first time out).</p>
                  <p class="text-muted text-xs">Ephemeral: played only in the round that introduces the LEGO.</p>
                </div>
                <div class="bg-surface p-3 rounded border-l-4 border-emerald-500">
                  <p class="text-emerald-300 font-semibold mb-1">Use <span class="text-xs text-faint">(role letter U)</span></p>
                  <p class="text-ink text-xs mb-1">A longer, complete, natural sentence — the kind of thing the learner actually wants to say.</p>
                  <p class="text-muted text-xs">Eternal: the only role that comes back through spaced repetition and consolidation.</p>
                </div>
              </div>
              <p class="text-accent text-xs mt-3">Build is the training wheels; use is cycling on the open road. The learner climbs from one to the other.</p>
            </div>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-muted">How many phrases:</span>
            <ul class="list-disc list-inside text-ink mt-2 space-y-1">
              <li><strong>Vocabulary constraint:</strong> a phrase may only be assembled from whole chunks the learner has already met — no forward references, no re-spliced or re-conjugated word forms</li>
              <li>Minimums ramp up as the course matures (early seeds ask for little; from seeds 4–5 onward the floor is 3 build / 5 use)</li>
              <li>A LEGO is capped at <strong>13</strong> phrases; the runtime plays at most <strong>7</strong> in a round's practice phase</li>
              <li>The final LEGO in a seed typically carries a use phrase that <em>is</em> the complete seed sentence</li>
            </ul>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-muted">Created by:</span>
              <span class="text-accent-2 ml-2 font-medium">Course Builder, within the seed submission</span>
            </div>
            <div>
              <span class="text-muted">Stored in:</span>
              <span class="text-ink ml-2 font-mono text-xs">course_practice_phrases (Supabase)</span>
            </div>
          </div>
          <div class="mt-3 bg-amber-900/20 border border-amber-500/50 rounded p-3">
            <p class="text-xs text-amber-300"><strong>If you've heard "basket":</strong> that was the old name for the bag of phrases under one LEGO. The current model stores phrases directly in <code>course_practice_phrases</code> with explicit roles, and the runtime assembles them into a <strong>round</strong>. Say "the LEGO's phrases" when authoring, and "round" when talking about playback — not "basket".</p>
          </div>
        </div>
      </section>

      <!-- LEGO Types Section -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-accent-2 mb-6">LEGO types — A and M</h2>
        <p class="text-ink mb-6">
          There are exactly two kinds of LEGO. The difference is not about size in the abstract — it's about whether
          the chunk bundles structure the learner can't yet take apart and put back together on their own. One word, or
          a multi-word chunk that needs its pieces shown first.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- ATOMIC -->
          <div class="bg-surface border border-line rounded-lg p-6">
            <h3 class="text-lg font-semibold text-blue-300 mb-3">A — Atomic LEGO</h3>
            <div class="bg-blue-900/20 border border-blue-500/50 rounded p-3 mb-4">
              <p class="text-blue-300 text-sm font-semibold">Definition:</p>
              <p class="text-ink text-sm">A single meaningful word. No components, no build-up ladder.</p>
            </div>
            <ul class="list-disc list-inside text-ink space-y-2 text-sm">
              <li>One word in the target language — the smallest thing worth teaching on its own</li>
              <li>No component breakdown needed</li>
              <li>Passes ZUT: hear the known text, produce the target with zero ambiguity</li>
            </ul>
            <div class="mt-4 bg-canvas p-3 rounded">
              <p class="text-sm text-muted mb-2">Examples:</p>
              <p class="text-ink text-sm">"quiero" = "I want"</p>
              <p class="text-ink text-sm">"hablar" = "to speak"</p>
              <p class="text-ink text-sm">"ahora" = "now"</p>
            </div>
            <div class="mt-3 bg-canvas/60 border border-line rounded p-3">
              <p class="text-xs text-muted"><strong>Note:</strong> the type is <em>declared by the author</em>, not computed. The validator only checks that the value is "A" or "M" — it never counts words to decide. "Single word = A" is a convention you follow, not a rule the machine infers.</p>
            </div>
          </div>

          <!-- MOLECULAR -->
          <div class="bg-surface border border-line rounded-lg p-6">
            <h3 class="text-lg font-semibold text-emerald-300 mb-3">M — Molecular LEGO</h3>
            <div class="bg-emerald-900/20 border border-emerald-500/50 rounded p-3 mb-4">
              <p class="text-emerald-300 text-sm font-semibold">Definition:</p>
              <p class="text-ink text-sm">A multi-word chunk that bundles structure the learner can't yet recombine. It must declare a non-empty list of <strong>components</strong> — its word-level pieces.</p>
            </div>
            <p class="text-accent text-sm font-semibold mb-2">An M-LEGO earns its place when:</p>
            <ul class="list-disc list-inside text-ink space-y-2 text-sm mb-4">
              <li><strong>Glue holds it together:</strong> some parts can't stand alone (idiomatic or grammatical pieces)</li>
              <li><strong>The order differs:</strong> the learner knows the pieces but the target arranges them differently</li>
              <li><strong>The structure can't be inferred</strong> from what's already been taught</li>
            </ul>
            <div class="mt-4 bg-canvas p-3 rounded space-y-3">
              <p class="text-sm text-muted mb-2">Examples needing an M-LEGO:</p>
              <div>
                <p class="text-ink text-sm">"blue thing" = "cosa azul" <span class="text-xs text-accent">(order reversed)</span></p>
              </div>
              <div>
                <p class="text-ink text-sm">"想学" = "want to learn" <span class="text-xs text-accent">(components: 想 + 学)</span></p>
              </div>
              <div>
                <p class="text-ink text-sm">"tengo ganas de" = "I feel like" <span class="text-xs text-accent">(idiomatic glue)</span></p>
              </div>
            </div>
            <div class="mt-3 bg-canvas/60 border border-emerald-700 rounded p-3">
              <p class="text-xs text-muted">Components do real work: they let the system check tiling and count vocabulary, <em>and</em> they drive the build-up ladder the learner climbs to the whole chunk.</p>
            </div>
          </div>
        </div>

        <!-- The Inferability Test -->
        <div class="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-2 border-amber-500/50 rounded-lg p-6 mt-6">
          <h3 class="text-xl font-semibold text-amber-300 mb-4">The inferability question</h3>
          <p class="text-ink mb-4 text-lg"><strong>Given what the learner already knows, can they figure this out for themselves?</strong></p>
          <div class="grid md:grid-cols-2 gap-4">
            <div class="bg-emerald-900/30 border border-emerald-600 p-4 rounded">
              <p class="text-emerald-300 font-semibold mb-2">Yes → no new LEGO needed</p>
              <p class="text-ink text-sm">Let the existing A-LEGOs tile it.</p>
              <p class="text-muted text-xs mt-2">"speak Chinese" = "shuō zhōngwén" — the learner already knows both words and the order matches, so nothing new is introduced.</p>
            </div>
            <div class="bg-amber-900/30 border border-amber-600 p-4 rounded">
              <p class="text-amber-300 font-semibold mb-2">No → an M-LEGO is needed</p>
              <p class="text-ink text-sm">Introduce it explicitly, with its components first.</p>
              <p class="text-muted text-xs mt-2">"blue thing" = "cosa azul" — the order is reversed; the learner can't infer the combination, so it gets taught.</p>
            </div>
          </div>
        </div>

        <!-- Componentization -->
        <div class="bg-gradient-to-r from-emerald-900/30 to-blue-900/30 border-2 border-emerald-500/50 rounded-lg p-6 mt-6">
          <h3 class="text-xl font-semibold text-emerald-300 mb-4">🔬 Componentization: the quiet superpower</h3>

          <p class="text-ink mb-4">M-LEGOs are shown <strong>component by component</strong>, with literal translations. The learner doesn't get a grammar lecture — they get transparent pieces, and they <em>see</em> the pattern.</p>

          <div class="bg-canvas p-4 rounded-lg">
            <p class="text-accent-2 font-semibold mb-3">Example: "as often as possible"</p>

            <div class="space-y-3">
              <div>
                <p class="text-blue-300 text-sm font-medium">Target (Spanish):</p>
                <p class="text-ink text-lg font-mono">"lo más frecuentemente posible"</p>
              </div>

              <div>
                <p class="text-amber-300 text-sm font-medium">Literal component breakdown:</p>
                <div class="ml-4 space-y-1 text-ink text-sm">
                  <p><span class="text-accent-2">lo más</span> = <span class="text-ink">the most</span></p>
                  <p><span class="text-accent-2">frecuentemente</span> = <span class="text-ink">often</span></p>
                  <p><span class="text-accent-2">posible</span> = <span class="text-ink">possible</span></p>
                </div>
              </div>

              <div class="bg-emerald-900/30 border border-emerald-700 p-3 rounded mt-3">
                <p class="text-emerald-300 text-sm font-semibold mb-2">✨ What happens next</p>
                <ul class="text-ink text-sm space-y-1">
                  <li>📍 The learner now knows <strong>"lo más"</strong> = "the most"</li>
                  <li>📍 …and <strong>"posible"</strong> = "possible"</li>
                  <li>🎯 So they can already say <strong>"lo más posible"</strong> = "the most possible"</li>
                  <li>🎯 …and they've quietly absorbed that Spanish builds "the most" + word</li>
                </ul>
                <p class="text-amber-200 text-xs mt-3 italic">↑ No rule was ever stated. The pattern arrived through meaning.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Core mechanisms -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-accent-2 mb-6">Core mechanisms</h2>

        <!-- ZUT -->
        <div class="bg-surface border border-line rounded-lg p-6 mb-6">
          <h3 class="text-lg font-semibold text-amber-300 mb-3">ZUT — Zero Uncertainty Test</h3>

          <div class="mb-4">
            <span class="text-sm font-medium text-muted">Definition:</span>
            <p class="text-ink mt-1">A given known-language text must map to exactly <strong>one</strong> target wording per course. If the same known phrase points at two different targets, the learner has to guess — and guessing is the one thing SSi refuses to ask of them.</p>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-muted">How it's enforced:</span>
            <p class="text-ink mt-1">When a seed is submitted, the builder checks earlier seeds for the same known text. Same known + the <em>same</em> target is a harmless duplicate. Same known + a <em>different</em> target is a ZUT clash — and the whole seed is rejected until it's resolved. This is the one translation-consistency rule the code actually enforces.</p>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-muted">The three fixes it offers:</span>
            <div class="bg-canvas p-4 rounded mt-2 text-sm space-y-2">
              <p class="text-ink"><strong class="text-emerald-300">UPCHUNK</strong> — make a larger M-LEGO so the known prompt maps unambiguously to one target (add context).</p>
              <p class="text-ink"><strong class="text-emerald-300">SYNONYM</strong> — choose a different wording for one of the two meanings.</p>
              <p class="text-ink"><strong class="text-emerald-300">OVERLAP</strong> — when word order differs across languages, keep both the atomic pieces and the chunk that handles the reordering.</p>
            </div>
          </div>

          <div class="mt-3 bg-amber-900/20 border border-amber-500/50 rounded p-3">
            <p class="text-xs text-amber-300"><strong>Replaces "LUT".</strong> ZUT keys on the <em>known</em> text, which is why overlap (an A-LEGO living inside an M-LEGO) is <em>not</em> a clash — the two known texts differ.</p>
          </div>
        </div>

        <!-- Tiling + Vocabulary constraint -->
        <div class="bg-surface border border-line rounded-lg p-6 mb-6">
          <h3 class="text-lg font-semibold text-emerald-300 mb-3">Tiling &amp; the vocabulary constraint</h3>

          <div class="mb-4">
            <span class="text-sm font-medium text-muted">Tiling:</span>
            <p class="text-ink mt-1">The check that a seed's translation can be fully rebuilt from its LEGO targets, its M-LEGO components, and vocabulary from earlier seeds. For space-separated languages every word must be covered; for Chinese and other logographic scripts a character-segmentation has to compose the whole string. Tiling checks <strong>coverage, not a unique decomposition</strong> — overlaps that produce several valid tilings are fine, by design.</p>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-muted">Vocabulary constraint:</span>
            <p class="text-ink mt-1">A practice phrase may only be assembled from <strong>whole chunks the learner has already been introduced to</strong> — full LEGO targets or component targets, never re-split back into loose words. Vocabulary accumulates strictly in order, so a phrase under LEGO N may draw on earlier seeds and LEGOs 1…N — but never a later sibling. This is what blocks untaught conjugations, inversions and contractions from sneaking in.</p>
          </div>

          <div class="bg-canvas/60 border border-line rounded p-3">
            <p class="text-xs text-muted">Together these two are the heart of "zero unknowns except the new LEGO": every phrase a learner meets is built entirely from things they already own, plus the one new piece being taught.</p>
          </div>
        </div>

        <!-- Spaced repetition -->
        <div class="bg-surface border border-line rounded-lg p-6 mb-6">
          <h3 class="text-lg font-semibold text-emerald-300 mb-3">Spaced repetition</h3>

          <div class="mb-4">
            <span class="text-sm font-medium text-muted">Definition:</span>
            <p class="text-ink mt-1">At runtime, earlier LEGOs' <strong>use</strong> phrases are revisited at Fibonacci-style offsets back through the course: <code class="text-sm">[1, 2, 3, 5, 8, 13, 21, 34, 55, 89]</code> rounds. For each offset, the LEGO whose last round was that far back is due for review.</p>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-muted">How much review per round:</span>
            <ul class="list-disc list-inside text-ink mt-2 space-y-1">
              <li>The most-recent prior LEGO (offset 1, "N-1") contributes <strong>3</strong> use phrases</li>
              <li>Every other due LEGO contributes <strong>1</strong>, drawn from a rotating pool so fresh sentences keep surfacing</li>
              <li>Total review is capped at <strong>12</strong> items per round</li>
            </ul>
          </div>

          <div class="bg-amber-900/20 border border-amber-500/50 rounded p-3">
            <p class="text-xs text-amber-300"><strong>Only use phrases are ever reviewed.</strong> Build and component phrases are heard once, in the round that introduces their LEGO, and never return.</p>
          </div>
        </div>

        <!-- Deterministic phrase ID -->
        <div class="bg-surface border border-line rounded-lg p-6 mb-6">
          <h3 class="text-lg font-semibold text-emerald-300 mb-3">Deterministic phrase ID</h3>

          <div class="mb-4">
            <span class="text-sm font-medium text-muted">Definition:</span>
            <p class="text-ink mt-1">Every phrase gets a stable, self-describing ID assigned by the API — agents never set IDs themselves. The same phrase always lands the same ID, so audio and learner progress stay stable across rebuilds.</p>
          </div>

          <div class="mb-4">
            <span class="text-sm font-medium text-muted">Format:</span>
            <pre class="bg-canvas p-4 rounded mt-2 text-xs overflow-x-auto"><code>{course_code}:S{NNNN}L{NN}{R}{NN}

fra_for_eng:S0042L03U05
            │     │  │ └─ 5th phrase of this role, for this LEGO
            │     │  └─── role letter: C (component), B (build), U (use)
            │     └────── LEGO index (2 digits)
            └──────────── seed number (4 digits)</code></pre>
          </div>

          <div class="bg-canvas/60 border border-line rounded p-3">
            <p class="text-xs text-muted"><code>fra_for_eng:S0042L03U05</code> = the 5th use phrase of LEGO 3 in seed 42.</p>
          </div>
        </div>

        <!-- Voice 1 / Voice 2 -->
        <div class="bg-surface border border-line rounded-lg p-6 mb-6">
          <h3 class="text-lg font-semibold text-emerald-300 mb-3">Voice 1 &amp; Voice 2</h3>

          <div class="mb-4">
            <span class="text-sm font-medium text-muted">Definition:</span>
            <p class="text-ink mt-1">Every course is taught in <strong>two target voices</strong>, referred to everywhere as <strong>Voice 1</strong> and <strong>Voice 2</strong>. They are peers, distinguished only by index — <em>not</em> by gender and not by a primary/secondary ranking. A voice's gender is just an attribute of the specific TTS/human voice assigned to the slot; it is never part of the slot's name. (Older labels like "F/M" or "Primary/Secondary" are retired.)</p>
          </div>

          <div class="bg-canvas/60 border border-line rounded p-3">
            <p class="text-xs text-muted">Data &amp; API use the role names <code>target1</code> and <code>target2</code>; the UI shows them as <strong>Voice 1</strong> / <strong>Voice 2</strong> (matching the learner app's 👤1 / 👤2). Map: <code>target1</code> → Voice 1, <code>target2</code> → Voice 2. The learner's own language is the separate <code>known</code> voice.</p>
          </div>
        </div>
      </section>

      <!-- The pipeline -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-accent-2 mb-6">The pipeline — who builds what</h2>
        <p class="text-ink mb-6">
          There is no numbered file-pipeline anymore. Content is created by a single human-initiated build, and audio
          and the manifest follow once the content is approved. Here are the words for each stage.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-surface border border-line rounded-lg p-6">
            <h3 class="text-lg font-semibold text-emerald-300 mb-3">Course Builder</h3>
            <p class="text-ink text-sm mb-3">The content-creation API on <strong>port 3471</strong>, running under the Production API (3470, the single public entry point). Its golden path is <code class="text-xs">POST /api/seed/complete</code>: it validates a whole seed atomically, then writes the three Supabase tables.</p>
            <p class="text-muted text-xs">Each build step is human-initiated and spawns a real Claude agent to do the linguistic work. The passes are <strong>named</strong>, not numbered: translate, decompose, build-team, final-pass, category-llm, learner-simulation, component-backfill, backfill-phrases.</p>
          </div>

          <div class="bg-surface border border-line rounded-lg p-6">
            <h3 class="text-lg font-semibold text-emerald-300 mb-3">Phase 8 — Audio</h3>
            <p class="text-ink text-sm mb-3">TTS audio generation, on <strong>port 3465</strong>, triggered by a human via the Production API once a course's seeds are approved. Writes to <code class="text-xs">course_audio</code> and S3.</p>
            <p class="text-muted text-xs">Nothing audio-related happens automatically. The Course Builder itself contains zero references to audio.</p>
          </div>

          <div class="bg-surface border border-line rounded-lg p-6">
            <h3 class="text-lg font-semibold text-emerald-300 mb-3">Phase 9 — Manifest</h3>
            <p class="text-ink text-sm mb-3">Manifest generation, run <strong>in-process by the Production API (3470)</strong> from Supabase, on demand.</p>
            <p class="text-muted text-xs">The manifest is an output — compiled last from the database, never a source of truth.</p>
          </div>

          <div class="bg-surface border border-line rounded-lg p-6">
            <h3 class="text-lg font-semibold text-emerald-300 mb-3">Validate-then-insert</h3>
            <p class="text-ink text-sm mb-3">Every gate runs first and accumulates <em>all</em> errors into one list — ZUT, syllable cap, tiling, vocabulary, length-ratio, phrase counts, a late-course balance check. Only if that list is empty does anything get written.</p>
            <p class="text-muted text-xs">"Atomic" here means validate-everything-then-insert-everything (or insert nothing). There is no partial save — the agent sees every problem at once.</p>
          </div>
        </div>

        <!-- Storage table -->
        <div class="bg-surface border border-line rounded-lg p-6 mt-6">
          <h3 class="text-lg font-semibold text-emerald-300 mb-3">Storage — Supabase only</h3>
          <p class="text-ink text-sm mb-4">Course content lives in Supabase, full stop. The old JSON files are deprecated artefacts; they are not where the system reads from.</p>
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead>
                <tr class="text-muted border-b border-line">
                  <th class="py-2 pr-4">Data</th>
                  <th class="py-2 pr-4">Supabase table</th>
                  <th class="py-2">Deprecated JSON</th>
                </tr>
              </thead>
              <tbody class="text-ink">
                <tr class="border-b border-line">
                  <td class="py-2 pr-4">Seeds</td>
                  <td class="py-2 pr-4 font-mono text-xs text-accent-2">course_seeds</td>
                  <td class="py-2 font-mono text-xs text-faint">seed_pairs.json</td>
                </tr>
                <tr class="border-b border-line">
                  <td class="py-2 pr-4">LEGOs</td>
                  <td class="py-2 pr-4 font-mono text-xs text-accent-2">course_legos</td>
                  <td class="py-2 font-mono text-xs text-faint">lego_pairs.json</td>
                </tr>
                <tr class="border-b border-line">
                  <td class="py-2 pr-4">Practice phrases</td>
                  <td class="py-2 pr-4 font-mono text-xs text-accent-2">course_practice_phrases</td>
                  <td class="py-2 font-mono text-xs text-faint">lego_baskets.json</td>
                </tr>
                <tr class="border-b border-line">
                  <td class="py-2 pr-4">Audio</td>
                  <td class="py-2 pr-4 font-mono text-xs text-accent-2">course_audio</td>
                  <td class="py-2 font-mono text-xs text-faint">audio_index.json / audio_samples (legacy table)</td>
                </tr>
                <tr>
                  <td class="py-2 pr-4">Manifest</td>
                  <td class="py-2 pr-4 text-xs">Generated on demand from Supabase</td>
                  <td class="py-2 font-mono text-xs text-faint">output only</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="mt-4 bg-amber-900/20 border border-amber-500/50 rounded p-3">
            <p class="text-xs text-amber-300"><strong>Note:</strong> <code>audio_samples</code> is a deprecated table — do not write to it. Audio belongs in <code>course_audio</code>.</p>
          </div>
        </div>
      </section>

      <!-- Reference Formats -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-accent-2 mb-6">Reference formats</h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-surface border border-line rounded-lg p-6">
            <h3 class="text-lg font-semibold text-emerald-300 mb-3">Seed</h3>
            <ul class="text-ink space-y-2">
              <li><strong>Format:</strong> S + 4-digit number</li>
              <li><strong>Example:</strong> <code class="bg-canvas px-2 py-1 rounded">S0041</code></li>
              <li class="text-muted text-sm">(Seed 41)</li>
            </ul>
          </div>

          <div class="bg-surface border border-line rounded-lg p-6">
            <h3 class="text-lg font-semibold text-emerald-300 mb-3">LEGO</h3>
            <ul class="text-ink space-y-2">
              <li><strong>Format:</strong> S{seed}L{index}</li>
              <li><strong>Example:</strong> <code class="bg-canvas px-2 py-1 rounded">S0041L02</code></li>
              <li class="text-muted text-sm">(Seed 41, LEGO 2)</li>
            </ul>
          </div>

          <div class="bg-surface border border-line rounded-lg p-6">
            <h3 class="text-lg font-semibold text-emerald-300 mb-3">Phrase</h3>
            <ul class="text-ink space-y-2">
              <li><strong>Format:</strong> {course}:S{seed}L{lego}{role}{n}</li>
              <li><strong>Example:</strong> <code class="bg-canvas px-2 py-1 rounded">…S0042L03U05</code></li>
              <li class="text-muted text-sm">(5th use phrase, LEGO 3, seed 42)</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Terminology to Avoid -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-danger mb-6">Deprecated terminology — recognise it, then drop it</h2>

        <div class="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
          <p class="text-sm text-red-300 mb-4 font-semibold">Words that no longer describe the system</p>
          <ul class="space-y-2 text-ink mb-6">
            <li>❌ <strong>"BASE" and "COMPOSITE"</strong> → use <span class="text-accent-2">A (atomic)</span> and <span class="text-accent-2">M (molecular)</span></li>
            <li>❌ <strong>"B", "C", "F" type codes</strong> → use <span class="text-accent-2">"A"</span> and <span class="text-accent-2">"M"</span> for LEGO types</li>
            <li>❌ <strong>"FEEDER"</strong> → gone; componentization replaced it</li>
            <li>❌ <strong>"LUT" (Learner Uncertainty Test)</strong> → use <span class="text-accent-2">ZUT (Zero Uncertainty Test)</span></li>
            <li>❌ <strong>"BASKET"</strong> → phrases live in <span class="text-accent-2">course_practice_phrases</span> with explicit roles; the runtime assembles a <span class="text-accent-2">round</span></li>
            <li>❌ <strong>"Amino acids"</strong> → never use (old metaphor)</li>
            <li>❌ <strong>"D-phrases" / "E-phrases"</strong> → use <span class="text-accent-2">component / build / use</span> roles</li>
          </ul>

          <p class="text-sm text-red-300 mb-4 font-semibold">JSON files (all deprecated as sources of truth)</p>
          <ul class="space-y-2 text-ink mb-6">
            <li>❌ <strong>seed_pairs.json</strong>, <strong>lego_pairs.json</strong>, <strong>lego_baskets.json</strong>, <strong>audio_index.json</strong> → content lives in Supabase; these are at most legacy artefacts</li>
            <li>❌ <strong>course_manifest.json as a source</strong> → the manifest is generated on demand from Supabase; it's output, not input</li>
          </ul>

          <p class="text-sm text-red-300 mb-4 font-semibold">Pipeline shape</p>
          <ul class="space-y-2 text-ink mb-6">
            <li>❌ <strong>"Phase 1 / 2 / 3" file pipeline</strong> → there is no numbered content pipeline; conflicts are caught atomically at submission by ZUT and fixed by upchunking inline</li>
            <li>❌ <strong>"draft" then "final" JSON passes, upchunk_resolutions.json</strong> → no such files; the seed validates or it doesn't, in one call</li>
            <li>❌ <strong>"audio_samples" table</strong> → use <span class="text-accent-2">course_audio</span></li>
          </ul>

          <p class="text-sm text-emerald-300 mt-4 mb-2 font-semibold">The current pipeline, in the right words</p>
          <ul class="space-y-1 text-ink text-sm">
            <li>• <strong>Content:</strong> named build passes (translate / decompose / build-team / final-pass / category-llm / learner-simulation / component-backfill / backfill-phrases) under the <strong>Course Builder (3471)</strong></li>
            <li>• <strong>Phase 8 — Audio:</strong> human-triggered TTS on <strong>port 3465</strong> → <code>course_audio</code> + S3</li>
            <li>• <strong>Phase 9 — Manifest:</strong> generated in-process by the <strong>Production API (3470)</strong> from Supabase, on demand</li>
          </ul>
        </div>
      </section>

  </div>
</template>

<script setup>
// Pure presentation component - no logic needed
</script>

<style scoped>
.terminology-view {
  padding: 2rem;
  max-width: 64rem;
  margin: 0 auto;
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
  color: var(--muted);
  margin: 0;
}

.page-meta {
  font-size: 0.875rem;
  color: var(--faint);
  margin-top: 0.5rem;
}

/* ---------------------------------------------------------------------------
   LIGHT-MODE COLOR FIXES (dark mode untouched).
   This view hardcodes many Tailwind color utilities (emerald/blue/amber/red at
   300/400 + *-900/xx tinted callout boxes + faint *-500/50 borders) tuned for a
   dark canvas. On the light theme they fail WCAG AA and the tint boxes/borders
   nearly vanish on white. The rules below apply ONLY under [data-theme="light"]
   (the scope hash lands on the text/bg/border element, which lives in
   this template), so the dark appearance is completely unchanged.
--------------------------------------------------------------------------- */
:root[data-theme="light"] .page-title {
  color: var(--accent-2); /* was hardcoded #10b981 (1.84:1) -> emerald-700 5.5:1 */
}

/* Accent text -> AA on near-white */
:root[data-theme="light"] .text-emerald-300 { color: #047857; } /* emerald-700 5.5:1 */
:root[data-theme="light"] .text-blue-400,
:root[data-theme="light"] .text-blue-300    { color: #1d4ed8; } /* blue-700 8.0:1 */
:root[data-theme="light"] .text-amber-300,
:root[data-theme="light"] .text-amber-200   { color: #92400e; } /* amber-800 6.9:1 */
:root[data-theme="light"] .text-red-300     { color: #b91c1c; } /* red-700 6.5:1 */

/* Tinted callout boxes -> real light tint */
:root[data-theme="light"] .bg-emerald-900\/20,
:root[data-theme="light"] .bg-emerald-900\/30 { background-color: #ecfdf5; } /* emerald-50 */
:root[data-theme="light"] .bg-blue-900\/20     { background-color: #eff6ff; } /* blue-50 */
:root[data-theme="light"] .bg-amber-900\/20,
:root[data-theme="light"] .bg-amber-900\/30    { background-color: #fffbeb; } /* amber-50 */
:root[data-theme="light"] .bg-red-900\/20      { background-color: #fef2f2; } /* red-50 */

/* Gradient callout panels -> solid readable tint */
:root[data-theme="light"] .from-amber-900\/30.to-orange-900\/30 {
  background-image: none;
  background-color: #fffbeb; /* amber-50 */
}
:root[data-theme="light"] .from-emerald-900\/30.to-blue-900\/30 {
  background-image: none;
  background-color: #ecfdf5; /* emerald-50 */
}

/* Faint colored borders -> visible saturated borders (>=3:1 vs tint bg) */
:root[data-theme="light"] .border-emerald-500\/50,
:root[data-theme="light"] .border-emerald-500,
:root[data-theme="light"] .border-emerald-600,
:root[data-theme="light"] .border-emerald-700 { border-color: #059669; } /* emerald-600 */
:root[data-theme="light"] .border-blue-500\/50,
:root[data-theme="light"] .border-blue-500     { border-color: #2563eb; } /* blue-600 */
:root[data-theme="light"] .border-amber-500\/50,
:root[data-theme="light"] .border-amber-600    { border-color: #d97706; } /* amber-600 */
:root[data-theme="light"] .border-red-500\/50  { border-color: #dc2626; } /* red-600 */
</style>
