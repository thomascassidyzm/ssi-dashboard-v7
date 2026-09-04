<script setup>
// DocsApml — the why-of-APML (founder rulings prose, hand-maintained in
// tools/explainer/rulings/docs/apml.md) plus the CURRENT STATE compiled from
// the code. Replaces the hand-written APMLSpec.vue (retired 2026-07-27; in
// git), whose endpoints/ports/version claims could rot — here they can't:
// the compiled blocks are drift-gated derivations, and the prose carries no
// state at all.
import { computed } from 'vue'
import { usePack } from '@/explainer/usePack'
import { mdlite } from '@/explainer/mdlite'
import UpdateDocsButton from '@/components/explainer/UpdateDocsButton.vue'

const { pack } = usePack()
const truth = computed(() => pack.value.truth)

const SECTION_TITLES = {
  'what APML is': 'What APML is',
  'the directions': 'The directions',
  'validate-then-insert': 'Validate, then insert',
  'why hold-out, not rejection, for phrase-level ZUT': 'Why hold-out, not rejection, for phrase-level ZUT',
  'audio ownership': 'Audio ownership',
}
const sections = computed(() =>
  Object.entries(pack.value.docs?.apml ?? {}).map(([key, body]) => ({
    key,
    title: SECTION_TITLES[key] ?? key,
    body,
  }))
)
</script>

<template>
  <div class="docs-compiled">
    <div class="page-header">
      <h1 class="page-title">APML</h1>
      <p class="page-subtitle">
        AI Projects Markup Language — the original intent-as-code concept, kept as architectural
        lineage; the prose is founder-authored, and the current state below it is compiled from
        the code and cannot go stale
      </p>
      <UpdateDocsButton class="mt-3" />
    </div>

    <main class="content-area">
      <section v-for="s in sections" :key="s.key" class="panel">
        <h2>{{ s.title }}</h2>
        <!-- eslint-disable-next-line vue/no-v-html — compiled repo data, escaped in mdlite -->
        <div class="body" v-html="mdlite(s.body)"></div>
      </section>

      <section class="panel panel-derived">
        <h2>Current state <span class="badge">compiled {{ pack.generatedAt }} · v{{ pack.version }}</span></h2>
        <ul class="facts">
          <li>Content submission: <code v-for="e in truth.agentEndpoints" :key="e.path">{{ e.method }} {{ e.path }}</code></li>
          <li>Phase servers: <span class="mono">{{ truth.phasePorts.map(p => `${p.name} :${p.port}`).join(' · ') }}</span></li>
          <li>Validation gates live right now: <strong>{{ truth.gates.functions.length }}</strong> — the full list, with limits, is on the <router-link to="/stocktake/pipeline">Pipeline</router-link> page</li>
          <li>Roles: <span class="mono">{{ truth.roles.join(', ') }}</span></li>
        </ul>
        <p class="note">
          These lines are derived from the code at compile time and drift-gated in CI — if the
          code changes and the pack doesn't, the build fails. Hand-written versions of these
          facts used to live on this page; they are gone on purpose.
        </p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.docs-compiled { padding: 2rem; max-width: 56rem; }
.page-header { margin-bottom: 1.5rem; }
/* Colour and weight come from the shared house look in
   assets/ui-tokens.css — this page sets only its own size. */
.page-title { font-size: 1.875rem; margin: 0 0 0.5rem; }
.page-subtitle { color: var(--muted); margin: 0 0 0.75rem; }
.panel {
  background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
  padding: 1.25rem 1.5rem; margin-bottom: 1.25rem;
}
.panel h2 { font-size: 1.05rem; font-weight: 600; color: var(--ink); margin: 0 0 0.6rem; }
.body { color: var(--muted); font-size: 0.875rem; line-height: 1.65; }
.body :deep(p) { margin: 0 0 0.6rem; }
.body :deep(strong) { color: var(--ink); font-weight: 600; }
.body :deep(code) { font-family: var(--font-mono); font-size: 0.8125rem; color: var(--accent-2); }
.panel-derived { border-color: color-mix(in srgb, var(--accent-2) 45%, transparent); }
.facts { color: var(--ink); font-size: 0.875rem; line-height: 1.8; padding-left: 1.1rem; margin: 0 0 0.75rem; }
.facts code { font-family: var(--font-mono); font-size: 0.8125rem; color: var(--accent-2); margin-right: 0.5rem; }
.mono { font-family: var(--font-mono); font-size: 0.8125rem; }
.badge {
  font-size: 0.7rem; font-weight: 500; color: var(--accent-2); margin-left: 0.5rem;
  padding: 0.1rem 0.45rem; border: 1px solid var(--line); border-radius: 999px;
}
.note { font-size: 0.75rem; color: var(--faint); margin: 0; }
.mt-3 { margin-top: 0.75rem; }
</style>
