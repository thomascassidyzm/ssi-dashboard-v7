<script setup>
// DocsGlossary — RULINGS presented through the pack. Replaces the hand-written
// TerminologyGlossary.vue (retired 2026-07-27; in git). Definitions are
// founder-voiced rulings (tools/explainer/rulings/docs/glossary.md); every
// storage/enforcement pointer a term carries was VERIFIED against the code at
// compile time, so a term cannot quietly outlive the thing it names.
import { computed } from 'vue'
import { usePack } from '@/explainer/usePack'
import { mdlite } from '@/explainer/mdlite'
import UpdateDocsButton from '@/components/explainer/UpdateDocsButton.vue'

const { pack } = usePack()
const terms = computed(() => pack.value.docs?.glossary ?? [])
const asList = (v) => (v ? [].concat(v) : [])
</script>

<template>
  <div class="docs-compiled">
    <div class="page-header">
      <h1 class="page-title">Terminology Glossary</h1>
      <p class="page-subtitle">
        The words we use to talk about how SSi builds a course — definitions are rulings,
        every pointer verified against the code at compile time
      </p>
      <UpdateDocsButton class="mt-3" />
    </div>

    <main class="content-area">
      <section v-for="t in terms" :key="t.term" class="panel">
        <h2>{{ t.term }}</h2>
        <!-- eslint-disable-next-line vue/no-v-html — compiled repo data, escaped in mdlite -->
        <div class="body" v-html="mdlite(t.body)"></div>
        <div v-if="t.meta && Object.keys(t.meta).length" class="pointers">
          <span v-for="table in asList(t.meta.livesIn)" :key="`l-${table}`" class="pointer">
            lives in <code>{{ table }}</code>
          </span>
          <span v-for="s in asList(t.meta.enforcedBy)" :key="`e-${s}`" class="pointer">
            enforced by <code>{{ s }}</code>
          </span>
          <span v-for="p in asList(t.meta.code)" :key="`c-${p}`" class="pointer">
            <code>{{ p }}</code>
          </span>
          <span class="verified">✓ verified this compile</span>
        </div>
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
.pointers { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.6rem; align-items: center; }
.pointer {
  font-size: 0.7rem; color: var(--faint); padding: 0.12rem 0.5rem;
  border: 1px solid var(--line); border-radius: 999px;
}
.pointer code { font-family: var(--font-mono); color: var(--muted); }
.verified { font-size: 0.7rem; color: var(--accent-2); }
.mt-3 { margin-top: 0.75rem; }
</style>
