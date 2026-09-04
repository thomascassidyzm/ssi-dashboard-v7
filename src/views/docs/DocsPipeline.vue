<script setup>
// DocsPipeline — COMPILED render. Replaces the hand-written ProcessOverview
// and PhaseIntelligence pages (retired 2026-07-27; prose lives on in git —
// the latter called itself "the single source of truth for agent
// instructions" while carrying a hand-added warning box about an architecture
// change it had to be told about). Everything here comes from the explanation
// pack, which the compiler derives from the code itself and drift-gates in CI.
import { computed } from 'vue'
import { usePack } from '@/explainer/usePack'
import UpdateDocsButton from '@/components/explainer/UpdateDocsButton.vue'

const { pack } = usePack()

const truth = computed(() => pack.value.truth)
const live = computed(() => pack.value.snapshot?.live ?? null)
const activeTables = computed(() => truth.value.supabaseTables?.filter((t) => !t.deprecated) ?? [])
const deprecatedTables = computed(() => truth.value.supabaseTables?.filter((t) => t.deprecated) ?? [])

// Schema truth (ruling 2026-07-29: current schema is truth, migrations lie) —
// the live dump when this pack carries one, never migration history.
const liveSchema = computed(() => live.value?.schema ?? null)
const codeReferenced = computed(() => new Set((truth.value.supabaseTables ?? []).map((t) => t.table)))
const unreferencedLiveTables = computed(() =>
  (liveSchema.value?.tables ?? []).filter((t) => !codeReferenced.value.has(t))
)
</script>

<template>
  <div class="docs-compiled">
    <div class="page-header">
      <h1 class="page-title">Pipeline</h1>
      <p class="page-subtitle">
        How a course gets built — compiled from the running code, never hand-written
      </p>
      <UpdateDocsButton class="mt-3" />
    </div>

    <main class="content-area">
      <section class="panel">
        <h2>Active workflow</h2>
        <p class="workflow">{{ truth.activeWorkflow }}</p>
        <p class="note">Derived from SYSTEM.md's Active Workflow line at compile time.</p>
      </section>

      <section class="panel">
        <h2>Phase servers</h2>
        <table>
          <thead>
            <tr><th>Service</th><th>Port</th><th>Phase</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr v-for="p in truth.phasePorts" :key="p.port">
              <td>{{ p.name }}</td>
              <td class="mono">{{ p.port }}</td>
              <td class="mono">{{ p.phase }}</td>
              <td>{{ p.status }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="panel">
        <h2>The agent golden path</h2>
        <p>
          Course content is created through the Course Builder's atomic submission endpoint —
          every gate runs first and accumulates all errors; nothing is written unless the list is
          empty.
        </p>
        <ul class="mono-list">
          <li v-for="e in truth.agentEndpoints" :key="e.path"><code>{{ e.method }} {{ e.path }}</code></li>
        </ul>
      </section>

      <section class="panel">
        <h2>Validation gates <span class="badge">{{ truth.gates.functions.length }} live</span></h2>
        <p>
          Exported by the validator itself (<code>services/course-builder/lib/validation.cjs</code>),
          listed here straight from its exports:
        </p>
        <div class="chips">
          <code v-for="g in truth.gates.functions" :key="g" class="chip">{{ g }}</code>
        </div>
        <ul class="facts">
          <li>Max LEGO syllables: <strong>{{ truth.gates.maxLegoSyllables }}</strong> (runs even under <code>skip_validation</code>)</li>
          <li>Known-vocab gate is <strong>hard-blocking</strong> — known-side breaches reject the submission</li>
          <li>Pair contracts on disk: <span class="mono">{{ truth.gates.pairContracts.join(', ') }}</span></li>
        </ul>
      </section>

      <section class="panel">
        <h2>Voice policy</h2>
        <ul class="facts">
          <li>Human-voice-only courses (TTS refused at the chokepoint): <span class="mono">{{ truth.voicePolicy.humanVoiceCourses.join(', ') }}</span><template v-if="truth.voicePolicy.cymPrefixRule">, plus every <code>cym_*</code> course</template></li>
          <li>Content passes end by <strong>queueing an audio pass</strong>, never by running TTS — audio is minted only after an approved pass</li>
        </ul>
      </section>

      <section v-if="liveSchema" class="panel panel-live">
        <h2>Live schema <span class="badge badge-live">dumped {{ new Date(liveSchema.dumpedAt).toLocaleString() }}</span></h2>
        <p class="note">
          Current schema is truth; migrations lie. This list is dumped from the running
          database — never derived from migration history, which is a lossy changelog.
        </p>
        <div class="chips">
          <code v-for="t in liveSchema.tables" :key="t" class="chip">{{ t }}</code>
        </div>
        <p v-if="liveSchema.matviews?.length" class="note">
          Materialised views: <code v-for="m in liveSchema.matviews" :key="m" class="chip">{{ m }}</code>
        </p>
        <p v-if="unreferencedLiveTables.length" class="note">
          Live but unreferenced by this repo's code:
          <code v-for="t in unreferencedLiveTables" :key="t" class="chip">{{ t }}</code>
        </p>
      </section>
      <section v-else class="panel">
        <h2>Live schema</h2>
        <p class="note">
          Current schema is truth; migrations lie — schema renders from a live dump of the
          running database, never from migration files. This bundle carries no dump yet: an
          admin can press <em>Update docs</em> above on the production machine to add one.
        </p>
      </section>

      <section class="panel">
        <h2>Tables the code touches <span class="badge">{{ activeTables.length }}</span></h2>
        <p class="note">
          The cross-check, not the truth — derived by scanning services/ and src/ for actual
          table references. A table can be real and unreferenced; the live dump above decides.
        </p>
        <div class="chips">
          <code v-for="t in activeTables" :key="t.table" class="chip">{{ t.table }}</code>
        </div>
        <p v-if="deprecatedTables.length" class="warn">
          Still referenced but deprecated (never write):
          <code v-for="t in deprecatedTables" :key="t.table" class="chip chip-warn">{{ t.table }}</code>
        </p>
      </section>

      <section v-if="live" class="panel panel-live">
        <h2>Live state <span class="badge badge-live">{{ new Date(live.generatedAt).toLocaleString() }}</span></h2>
        <ul class="facts">
          <li><strong>{{ live.courses.length }}</strong> courses in the database</li>
          <li><strong>{{ live.audioPassPending }}</strong> pending audio-pass requests</li>
          <li v-if="live.rowCounts">
            Content rows:
            <span class="mono">
              {{ Object.entries(live.rowCounts).map(([t, n]) => `${t} ${n?.toLocaleString?.() ?? n}`).join(' · ') }}
            </span>
          </li>
        </ul>
      </section>
      <section v-else class="panel">
        <h2>Live state</h2>
        <p class="note">
          Not connected to the production machine — showing the deployed bundle only. An admin can
          press <em>Update docs</em> above when the machine is reachable to add live course and
          queue state.
        </p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.docs-compiled { padding: 2rem; max-width: 64rem; }
.page-header { margin-bottom: 1.5rem; }
/* Colour and weight come from the shared house look in
   assets/ui-tokens.css — this page sets only its own size. */
.page-title { font-size: 1.875rem; margin: 0 0 0.5rem; }
.page-subtitle { color: var(--muted); margin: 0 0 0.75rem; }
.panel {
  background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
  padding: 1.25rem 1.5rem; margin-bottom: 1.25rem;
}
.panel h2 { font-size: 1.05rem; font-weight: 600; color: var(--ink); margin: 0 0 0.75rem; }
.panel p { color: var(--muted); font-size: 0.875rem; line-height: 1.6; margin: 0 0 0.75rem; }
.workflow { color: var(--ink); font-weight: 500; }
.note { font-size: 0.75rem; color: var(--faint); }
.warn { font-size: 0.8125rem; color: var(--danger, #b45309); }
table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
th { text-align: left; color: var(--faint); font-weight: 500; padding: 0.35rem 0.75rem 0.35rem 0; border-bottom: 1px solid var(--line); }
td { padding: 0.45rem 0.75rem 0.45rem 0; border-bottom: 1px solid var(--line); color: var(--ink); }
.mono, code { font-family: var(--font-mono); font-size: 0.8125rem; }
.mono-list { list-style: none; padding: 0; margin: 0; }
.mono-list li { padding: 0.2rem 0; }
.chips { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.5rem; }
.chip {
  padding: 0.15rem 0.5rem; border: 1px solid var(--line); border-radius: 6px;
  background: var(--surface-2, var(--canvas)); color: var(--ink); font-size: 0.75rem;
}
.chip-warn { border-color: var(--danger, #b45309); color: var(--danger, #b45309); margin-left: 0.3rem; }
.facts { color: var(--ink); font-size: 0.875rem; line-height: 1.7; padding-left: 1.1rem; margin: 0; }
.badge {
  font-size: 0.7rem; font-weight: 500; color: var(--accent-2); margin-left: 0.5rem;
  padding: 0.1rem 0.45rem; border: 1px solid var(--line); border-radius: 999px;
}
.panel-live { border-color: color-mix(in srgb, var(--accent-2) 45%, transparent); }
.mt-3 { margin-top: 0.75rem; }
</style>
