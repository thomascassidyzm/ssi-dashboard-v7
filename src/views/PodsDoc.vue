<template>
  <div class="pods-doc-view">
    <!-- Page Header (within DocsLayout) -->
    <div class="page-header">
      <h1 class="page-title">Listening Pods</h1>
      <p class="page-subtitle">
        Conversational listening activities - the canonical pod sentences and how they flex into each language course.
        For the design thinking behind where pods are heading, see <router-link to="/how/pod-thinking">Pod Thinking</router-link>.
      </p>
    </div>

    <main class="content-area">

      <!-- What is a pod -->
      <div class="bg-surface rounded-lg border border-line shadow-sm p-8 mb-8">
        <h2 class="text-2xl font-semibold text-accent-2 mb-4">What is a Pod?</h2>
        <div class="text-ink">
          <p class="mb-4">
            A <strong>pod</strong> is a listening activity: a multi-scene dialogue that teaches vocabulary in
            context through authentic conversation. Each pod is a sequence of <strong>scenes</strong> (e.g.
            "A Day of Greetings - morning to night"), and each scene is a sequence of <strong>sentences</strong>
            (lines of dialogue, each with a speaker).
          </p>
          <ul class="space-y-2 mb-4 list-disc pl-5 text-muted">
            <li><strong class="text-ink">Core pod</strong> (<code class="font-mono">pod-1</code> on courses built since Tom's 1-based ruling of 2026-08-22, <code class="font-mono">pod-0</code> on the rest) - every learner does this one. Which slug a course serves is a per-course fact: resolve it, never assume it.</li>
            <li><strong class="text-ink">Choice pods</strong> (e.g. <code class="font-mono">travel</code>, <code class="font-mono">sport</code>) - the learner picks one after the core pod.</li>
          </ul>
          <p class="text-muted">
            Pods are fully DB-backed and editable - not hardcoded test data - and are generated per language pair.
          </p>
        </div>
      </div>

      <!-- Two-layer model -->
      <div class="bg-surface rounded-lg border border-line shadow-sm p-8 mb-8">
        <h2 class="text-2xl font-semibold text-accent-2 mb-4">One Canonical Master, Many Generated Pods</h2>
        <p class="text-ink mb-6">
          Pods follow the same canonical → flexed pattern as the rest of the curriculum. There is one
          <strong>language-neutral English master</strong>, and each course gets its own <strong>generated</strong>
          target-language version with audio.
        </p>

        <div class="grid md:grid-cols-2 gap-4">
          <div class="bg-surface-2 rounded-lg border border-line p-5">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-lg font-semibold text-ink">Canonical master</h3>
              <span class="text-xs text-faint font-mono">Supabase · canonical_pod_scenarios</span>
            </div>
            <p class="text-sm text-muted mb-2">
              The English source of truth - the canonical pod sentences. Edited once; every language course
              flexes from it.
            </p>
            <p class="text-sm text-muted">English-only. No audio. No target text.</p>
          </div>

          <div class="bg-surface-2 rounded-lg border border-line p-5">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-lg font-semibold text-ink">Per-course generated</h3>
              <span class="text-xs text-faint font-mono">Supabase · listening_pods / _sentences</span>
            </div>
            <p class="text-sm text-muted mb-2">
              The target-language version for a course (e.g. <code class="font-mono">spa_for_eng</code>) -
              <code class="font-mono">target_text</code> + <code class="font-mono">known_text</code> per line, with
              voice mapping and audio IDs.
            </p>
            <p class="text-sm text-muted">Regenerated when the canonical master changes.</p>
          </div>
        </div>
      </div>

      <!-- Canonical pod sentences schema -->
      <div class="bg-surface rounded-lg border border-line shadow-sm p-8 mb-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-semibold text-accent-2">Canonical Pod Sentences</h2>
          <span class="text-xs text-faint font-mono">canonical_pod_scenarios</span>
        </div>
        <p class="text-ink mb-5">
          Each row is one line of dialogue in the English master. The primary key encodes provenance, e.g.
          <code class="font-mono">pod-1:SC01-S003</code> (pod <code class="font-mono">pod-1</code>, scene 1, sentence 3).
        </p>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-faint border-b border-line">
                <th class="py-2 pr-4 font-medium">Field</th>
                <th class="py-2 font-medium">Meaning</th>
              </tr>
            </thead>
            <tbody class="text-muted">
              <tr class="border-b border-line"><td class="py-2 pr-4 font-mono text-ink">pod_slug</td><td class="py-2">Pod set the line belongs to (<code class="font-mono">pod-1</code>, <code class="font-mono">travel</code> …)</td></tr>
              <tr class="border-b border-line"><td class="py-2 pr-4 font-mono text-ink">scene_number / scene_title / scene_subtitle</td><td class="py-2">Scene index and display labels (e.g. "A Day of Greetings" / "Morning to night")</td></tr>
              <tr class="border-b border-line"><td class="py-2 pr-4 font-mono text-ink">sentence_number</td><td class="py-2">Line index within the scene</td></tr>
              <tr class="border-b border-line"><td class="py-2 pr-4 font-mono text-ink">global_order</td><td class="py-2">Order across the whole pod set - drives sentence sequencing</td></tr>
              <tr class="border-b border-line"><td class="py-2 pr-4 font-mono text-ink">speaker</td><td class="py-2">Canonical English speaker role (e.g. "Neighbour (8 am)")</td></tr>
              <tr class="border-b border-line"><td class="py-2 pr-4 font-mono text-ink">english_text</td><td class="py-2">The canonical English line - the thing authors edit</td></tr>
              <tr><td class="py-2 pr-4 font-mono text-ink">author_notes</td><td class="py-2">Optional per-line guidance for the generator</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Generation workflow -->
      <div class="bg-surface rounded-lg border border-line shadow-sm p-8 mb-8">
        <h2 class="text-2xl font-semibold text-accent-2 mb-4">Generation Workflow</h2>
        <ol class="space-y-3 text-ink list-decimal pl-5">
          <li><strong>Author the English master.</strong> Edit the canonical pod sentences (text, speaker, notes) in the Canonical Scenarios editor.</li>
          <li><strong>Generate per course.</strong> <code class="font-mono">POST /api/admin/pods/generate</code> flexes the canonical English into a course's target language, creating <code class="font-mono">listening_pods</code> + <code class="font-mono">listening_pod_sentences</code> (<code class="font-mono">target_text</code> + <code class="font-mono">known_text</code>).</li>
          <li><strong>Assign voices.</strong> Each pod's <code class="font-mono">speakers</code> JSONB maps speaker roles to voice IDs (with a <code class="font-mono">_default</code> fallback).</li>
          <li><strong>Generate audio.</strong> Phase 8 renders target and known audio, linking <code class="font-mono">target_audio_id</code> / <code class="font-mono">known_audio_id</code> on each sentence. Editing a line's text clears its audio so it re-renders.</li>
        </ol>
      </div>

      <!-- Where to edit + endpoints -->
      <div class="grid md:grid-cols-2 gap-4 mb-8">
        <div class="bg-surface rounded-lg border border-line shadow-sm p-6">
          <h3 class="text-lg font-semibold text-ink mb-2">Where to edit</h3>
          <p class="text-sm text-muted mb-2">
            The canonical pod sentences are edited in the <strong class="text-ink">Canonical Scenarios</strong> view,
            reached from a course's Production suite:
          </p>
          <p class="text-sm font-mono text-accent-2 break-all">/production/&lt;course&gt;/canonical/&lt;pod-slug&gt;</p>
        </div>
        <div class="bg-surface rounded-lg border border-line shadow-sm p-6">
          <h3 class="text-lg font-semibold text-ink mb-3">Key endpoints</h3>
          <ul class="space-y-1.5 text-sm font-mono text-muted">
            <li><span class="text-accent-2">GET</span> /api/admin/canonical-pods/:slug</li>
            <li><span class="text-accent-2">PATCH</span> /api/admin/canonical-pods/:id</li>
            <li><span class="text-accent-2">POST</span> /api/admin/pods/generate</li>
            <li><span class="text-accent-2">GET</span> /api/pods/:courseCode/:slug</li>
          </ul>
        </div>
      </div>

    </main>
  </div>
</template>

<script setup>
// Static reference page. Data shapes mirror the canonical_pod_scenarios and
// listening_pods / listening_pod_sentences tables (Supabase).
</script>

<style scoped>
.pods-doc-view {
  padding: 2rem;
}

.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--accent-2);
  margin: 0 0 0.5rem 0;
}

.page-subtitle {
  color: var(--muted);
  margin: 0;
}

.page-subtitle a {
  color: var(--accent-2);
}

.content-area {
  max-width: 100%;
}
</style>
