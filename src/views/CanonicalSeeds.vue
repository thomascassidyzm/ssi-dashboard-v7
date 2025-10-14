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
          Canonical Seeds
        </h1>
        <p class="mt-2 text-slate-400">
          All 668 canonical seeds (16 years empirical optimization)
        </p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8">

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">About Canonical Seeds</h2>
          <div class="prose prose-invert prose-emerald max-w-none text-slate-300">
            <p>The 668 canonical seeds represent 16 years of empirical optimization in language course design. Each seed is a foundational language concept expressed in English (not because English is special, but because they need to be expressed in something).</p>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Key Concept: Language-Agnostic Foundation</h3>
            <p>Canonical seeds are <strong>NOT language pairs</strong>. They are English-expressed concepts that get translated into:</p>
            <ul class="space-y-2">
              <li><strong>Target Language:</strong> The language being learned (e.g., Irish, Italian, Spanish)</li>
              <li><strong>Known Language:</strong> The learner's language (e.g., English, French, German)</li>
            </ul>
            <p class="text-sm text-slate-400 mt-2"><em>Note: If one of the course languages happens to be English, that translation is not required.</em></p>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Seed Characteristics</h3>
            <ul class="space-y-2">
              <li><strong>Empirically Optimized:</strong> Refined over 16 years of real-world learner data</li>
              <li><strong>Pedagogically Sequenced:</strong> Ordered for optimal learning progression</li>
              <li><strong>High-Frequency Coverage:</strong> Cover the most useful vocabulary and structures</li>
              <li><strong>Universal Concepts:</strong> Language-agnostic foundations that work across all languages</li>
            </ul>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Canonical Seed Structure</h3>
            <p>Each canonical seed contains:</p>
            <ul class="space-y-1">
              <li><code class="text-emerald-400">seed_id</code> - Unique identifier (S1 - S668)</li>
              <li><code class="text-emerald-400">canonical_english</code> - The foundational concept expressed in English</li>
              <li><code class="text-emerald-400">metadata</code> - Complexity, frequency, and pedagogical notes</li>
            </ul>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Phase 1: Two-Step Translation</h3>
            <p>When generating a course, Phase 1 translates each canonical seed into <strong>both</strong> target and known languages:</p>
            <ul class="space-y-2">
              <li><strong>Step 1:</strong> Canonical English → Target Language (pedagogically optimized)</li>
              <li><strong>Step 2:</strong> Target Language → Known Language (structural match)</li>
            </ul>
            <p class="text-sm text-emerald-300 mt-2"><strong>Example:</strong> For an Italian-for-French-speakers course:</p>
            <ul class="space-y-1 text-sm text-slate-400">
              <li>Canonical: "I want to speak" (English)</li>
              <li>Target: "Voglio parlare" (Italian - optimized for learning)</li>
              <li>Known: "Je veux parler" (French - matches Italian structure)</li>
            </ul>

            <h3 class="text-xl font-semibold text-emerald-400 mt-6 mb-3">Role in Pipeline</h3>
            <p>Canonical seeds are the <strong>universal foundation</strong> for all courses:</p>
            <ul class="space-y-1">
              <li><strong>Phase 0:</strong> Analyzed for corpus intelligence</li>
              <li><strong>Phase 1:</strong> Translated into target + known languages using 6 pedagogical heuristics</li>
              <li><strong>Phase 3:</strong> Extracted into LEGOs with S{seed}L{position} provenance</li>
              <li><strong>Edit Propagation:</strong> Changes to seeds automatically propagate through all language directions</li>
            </ul>
          </div>
        </section>

        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">Example Canonical Seeds</h2>
          <div class="space-y-3">
            <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
              <div class="font-mono text-sm text-emerald-400 mb-2">S1</div>
              <div class="text-slate-300 mb-2"><strong>Canonical:</strong> "I am"</div>
              <div class="text-slate-400 text-sm">
                <div><em>Welsh course example:</em> Target: "Dw i" | Known: "I am"</div>
                <div><em>Italian-for-French example:</em> Target: "Sono" | Known: "Je suis"</div>
              </div>
            </div>
            <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
              <div class="font-mono text-sm text-emerald-400 mb-2">S2</div>
              <div class="text-slate-300 mb-2"><strong>Canonical:</strong> "I go"</div>
              <div class="text-slate-400 text-sm">
                <div><em>Welsh course example:</em> Target: "Dw i'n mynd" | Known: "I go"</div>
                <div><em>Spanish-for-German example:</em> Target: "Voy" | Known: "Ich gehe"</div>
              </div>
            </div>
            <div class="bg-slate-900/80 border border-slate-400/20 rounded p-4">
              <div class="font-mono text-sm text-emerald-400 mb-2">S3</div>
              <div class="text-slate-300 mb-2"><strong>Canonical:</strong> "I want"</div>
              <div class="text-slate-400 text-sm">
                <div><em>Welsh course example:</em> Target: "Dw i eisiau" | Known: "I want"</div>
                <div><em>Italian-for-Spanish example:</em> Target: "Voglio" | Known: "Quiero"</div>
              </div>
            </div>
          </div>
          <p class="text-slate-400 text-sm mt-4">
            <em>Note: The same 668 canonical seeds generate courses for ANY language direction. Full corpus loaded from VFS during course generation.</em>
          </p>
        </section>

      </div>
    </main>
  </div>
</template>

<script setup>
console.log('🌱 Canonical Seeds Loaded')
</script>
