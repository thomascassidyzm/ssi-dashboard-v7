<template>
  <div class="canonical-content-view">
    <!-- Page Header (within DocsLayout) -->
    <div class="page-header">
      <h1 class="page-title">Canonical Content</h1>
      <p class="page-subtitle">
        Language-agnostic canonical data for all SSi courses - the 3-parameter input model
      </p>
    </div>

    <!-- Main Content -->
    <main class="content-area">

      <!-- Overview -->
      <div class="bg-surface rounded-lg border border-line shadow-sm p-8 mb-8">
        <h2 class="text-2xl font-semibold text-accent-2 mb-4">3-Parameter Input Model</h2>
        <div class="prose prose-invert prose-emerald max-w-none text-ink">
          <p class="mb-4">
            All SSi courses are generated from <strong>3 inputs</strong>:
          </p>
          <ol class="space-y-2 mb-4">
            <li><strong>Target language</strong> (e.g., "spa", "fra", "cmn")</li>
            <li><strong>Known language</strong> (e.g., "eng")</li>
            <li><strong>Canonical content</strong> (seeds, encouragements, welcomes)</li>
          </ol>
          <p>
            This architecture means we maintain a single source of truth for curriculum and motivational content,
            which is then transformed by the Course Builder API into language-specific courses.
          </p>
        </div>
      </div>

      <!-- Canonical Seeds -->
      <div class="bg-surface rounded-lg border border-line shadow-sm p-8 mb-8">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-2xl font-semibold text-accent-2">Canonical Seeds</h2>
            <p class="text-muted mt-1">{{ totalSeeds || '…' }} pedagogically-ordered seeds with {target} placeholders</p>
          </div>
          <span class="text-xs text-faint font-mono">Supabase · canonical_seeds</span>
        </div>

        <div class="bg-surface-2 border border-line rounded p-4 mb-4">
          <p class="text-sm text-ink mb-2"><strong>Source:</strong> <code class="text-accent-2">Supabase table: canonical_seeds (live)</code></p>
          <p class="text-sm text-ink mb-2"><strong>Total Seeds:</strong> <code class="text-accent-2">{{ totalSeeds || '…' }}</code></p>
          <p class="text-sm text-ink"><strong>Optimization:</strong> <code class="text-accent-2">16 years empirical refinement</code></p>
        </div>

        <div class="bg-surface-2 border border-line rounded p-4">
          <h3 class="text-sm font-semibold text-accent-2 mb-2">Sample Seeds (First 10)</h3>
          <pre class="text-xs text-ink overflow-x-auto whitespace-pre-wrap" v-if="canonicalSeeds.length > 0">{{ JSON.stringify(canonicalSeeds.slice(0, 10), null, 2) }}</pre>
          <p v-else class="text-muted text-sm">Loading...</p>
        </div>
      </div>

      <!-- Encouragements -->
      <div class="bg-surface rounded-lg border border-line shadow-sm p-8 mb-8">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-2xl font-semibold text-accent-2">Encouragements</h2>
            <p class="text-muted mt-1">Motivational content spoken in known language</p>
          </div>
          <span class="text-xs text-faint font-mono">{lang}_encouragements.json</span>
        </div>

        <div class="bg-surface-2 border border-line rounded p-4 mb-4">
          <p class="text-sm text-ink mb-2"><strong>Location:</strong> <code class="text-accent-2">/public/vfs/canonical/eng_encouragements.json</code></p>
          <p class="text-sm text-ink mb-2"><strong>Pooled Encouragements:</strong> <code class="text-accent-2">{{ encouragements.pooledEncouragements?.length || 0 }}</code> (random selection)</p>
          <p class="text-sm text-ink mb-2"><strong>Ordered Encouragements:</strong> <code class="text-accent-2">{{ encouragements.orderedEncouragements?.length || 0 }}</code> (sequential delivery)</p>
          <p class="text-sm text-ink"><strong>Note:</strong> One file per known language (currently only English)</p>
        </div>

        <div class="bg-surface-2 border border-line rounded p-4">
          <h3 class="text-sm font-semibold text-accent-2 mb-2">Pooled Encouragements (First 5)</h3>
          <pre class="text-xs text-ink overflow-x-auto whitespace-pre-wrap" v-if="encouragements.pooledEncouragements">{{ JSON.stringify(encouragements.pooledEncouragements.slice(0, 5), null, 2) }}</pre>
          <p v-else class="text-muted text-sm">Loading...</p>
        </div>
      </div>

      <!-- Welcomes -->
      <div class="bg-surface rounded-lg border border-line shadow-sm p-8 mb-8">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-2xl font-semibold text-accent-2">Welcome Messages</h2>
            <p class="text-muted mt-1">Course introduction templates (one per language pair)</p>
          </div>
          <span class="text-xs text-faint font-mono">welcomes.json</span>
        </div>

        <div class="bg-surface-2 border border-line rounded p-4 mb-4">
          <p class="text-sm text-ink mb-2"><strong>Location:</strong> <code class="text-accent-2">/public/vfs/canonical/welcomes.json</code></p>
          <p class="text-sm text-ink mb-2"><strong>Structure:</strong> Course-specific welcome per language pair</p>
          <p class="text-sm text-ink"><strong>Spoken in:</strong> The known language</p>
        </div>

        <div class="bg-surface-2 border border-line rounded p-4">
          <h3 class="text-sm font-semibold text-accent-2 mb-2">Welcomes Template</h3>
          <pre class="text-xs text-ink overflow-x-auto whitespace-pre-wrap">{{ JSON.stringify(welcomes, null, 2) }}</pre>
        </div>
      </div>

      <!-- Future: Editing Note -->
      <div class="note-box rounded-lg p-6">
        <h3 class="note-title text-lg font-semibold mb-2">📝 Future Enhancement</h3>
        <p class="text-ink text-sm">
          In-browser editing of canonical content is planned for a future release. For now, edit the JSON files directly in:
          <code class="text-accent-2 text-xs">/public/vfs/canonical/</code>
        </p>
      </div>

    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getCanonicalSeeds } from '@/services/supabase.js'
import { fetchJson } from '@/services/api.js'

const canonicalSeeds = ref([])
const encouragements = ref({})
const welcomes = ref({})

// Dynamic so the count tracks the live canonical_seeds table instead of a
// hardcoded number that silently drifts when seeds are added/removed.
const totalSeeds = computed(() => canonicalSeeds.value.length)

onMounted(async () => {
  // Seeds are the live SSoT — read direct from Supabase. Encouragements/welcomes
  // are still static canonical files (guarded so a 404 can't throw cryptically).
  // Independent try/catches so one missing file doesn't blank the others.
  try {
    canonicalSeeds.value = await getCanonicalSeeds()
  } catch (e) { console.error('Failed to load canonical seeds:', e) }
  try {
    encouragements.value = await fetchJson('/vfs/canonical/eng_encouragements.json')
  } catch (e) { console.error('Failed to load encouragements:', e) }
  try {
    welcomes.value = await fetchJson('/vfs/canonical/welcomes.json')
  } catch (e) { console.error('Failed to load welcomes:', e) }
})
</script>

<style scoped>
.canonical-content-view {
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

.content-area {
  max-width: 100%;
}

/* Note/warning box — amber hue, dark-mode defaults preserved */
.note-box {
  background-color: rgba(120, 53, 15, 0.2); /* amber-900/20 */
  border: 1px solid rgba(245, 158, 11, 0.3); /* amber-500/30 */
}
.note-title {
  color: #fbbf24; /* amber-400 */
}
:root[data-theme="light"] .note-box {
  background-color: #fef3c7; /* amber-100 */
  border-color: #f59e0b; /* amber-500 */
}
:root[data-theme="light"] .note-title {
  color: #92400e; /* amber-800 — 6.9:1 on amber-100 */
}
</style>
