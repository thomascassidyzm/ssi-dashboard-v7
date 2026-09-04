<script setup>
// StocktakeIndex — the compiled reference, demoted to admin-on-demand
// (founder ruling 2026-07-28: the app teaches itself; the primary surface is
// Pedagogy at /pedagogy). This is where dev/ssi-admin/agents come to TAKE STOCK:
// the compiled state pages + the "Update docs" button. The grouping below is
// not decoration — it renders pack.docs.surface, the same classification the
// compiler enforces: a new explaining surface nobody classifies fails the
// build. Rulings and data entries link out to their real homes.
import { computed } from 'vue'
import { usePack } from '@/explainer/usePack'
import UpdateDocsButton from '@/components/explainer/UpdateDocsButton.vue'

const { pack } = usePack()

// Presentation for each classified page label (route + one-liner). The set of
// labels itself comes from the pack.
const CARD_META = {
  'Stock-take': null, // this page
  APML: { to: '/stocktake/apml', desc: 'The intent-as-code lineage the system grew from, with the current state compiled from the code' },
  Glossary: { to: '/stocktake/glossary', desc: 'The shared terms — every storage and enforcement pointer verified at compile time' },
  Pipeline: { to: '/stocktake/pipeline', desc: 'Phase servers, gates, voice policy, schema and live state — straight from the code' },
  Pedagogy: { to: '/pedagogy', desc: 'The teaching model and the method — read this before authoring anything' },
  Seeds: { to: '/canonical/seeds', desc: 'The canonical seed library' },
  Content: { to: '/canonical/content', desc: 'Reference translations and validated content' },
  Pods: { to: '/canonical/pods', desc: 'Listening pods — browsing the pod estate' },
}

const groups = computed(() => {
  const surface = pack.value.docs?.surface ?? {}
  const build = (labels) =>
    (labels ?? []).map((l) => ({ label: l, ...(CARD_META[l] ?? {}) })).filter((c) => c.to)
  return [
    {
      key: 'compiled',
      title: 'Compiled — derived from the code',
      note: 'Rendered from the explanation pack. If the code changes and these pages don’t, the build fails — they cannot go stale.',
      cards: build(surface.compiled),
    },
    {
      key: 'rulings',
      title: 'Rulings — founder-authored',
      note: 'The why: methodology and design thinking. Hand-maintained on purpose — no code can derive it.',
      cards: build(surface.rulings),
    },
    {
      key: 'data',
      title: 'Course data (live under Courses)',
      note: 'Browsers over the live course estate in the database — tools, not docs.',
      cards: build(surface.data),
    },
  ].filter((g) => g.cards.length)
})
</script>

<template>
  <div class="docs-hub">
    <header class="docs-header">
      <h1 class="page-title">Stock-take</h1>
      <p class="page-subtitle">
        The compiled reference — the system's current state, derived from the code and drift-gated
        so it cannot go stale. The teaching model lives on
        <router-link to="/pedagogy">Pedagogy</router-link>; this room is for taking stock.
      </p>
      <UpdateDocsButton class="mt-3" />
    </header>

    <main class="docs-main">
      <section v-for="g in groups" :key="g.key" class="docs-section">
        <div class="section-header">
          <span class="section-label">{{ g.title }}</span>
          <div class="section-line"></div>
        </div>
        <p class="section-note">{{ g.note }}</p>
        <div class="docs-grid">
          <router-link v-for="c in g.cards" :key="c.label" :to="c.to" class="doc-card" :class="`kind-${g.key}`">
            <h2 class="card-title">{{ c.label }}</h2>
            <p class="card-description">{{ c.desc }}</p>
            <span class="card-action">Open →</span>
          </router-link>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.docs-hub { padding: 2rem; max-width: 72rem; }
.docs-header { margin-bottom: 2rem; }
.page-title { font-size: 1.875rem; font-weight: 700; color: var(--accent-2); margin: 0 0 0.5rem; }
.page-subtitle { color: var(--muted); margin: 0 0 0.75rem; max-width: 46rem; line-height: 1.6; }
.docs-section { margin-bottom: 2.25rem; }
.section-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.4rem; }
.section-label {
  font-family: var(--font-mono); font-size: 0.7rem; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--accent); white-space: nowrap;
}
.section-line { flex: 1; height: 1px; background: var(--line); }
.section-note { font-size: 0.75rem; color: var(--faint); margin: 0 0 1rem; }
.docs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
.doc-card {
  display: flex; flex-direction: column; gap: 0.4rem; text-decoration: none;
  background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
  padding: 1.1rem 1.25rem; transition: transform 0.12s ease, border-color 0.12s ease;
}
.doc-card:hover { transform: translateY(-2px); border-color: var(--accent-2); }
.kind-compiled { border-left: 3px solid var(--accent-2); }
.kind-rulings { border-left: 3px solid var(--accent); }
.card-title { font-size: 1rem; font-weight: 600; color: var(--ink); margin: 0; }
.card-description { font-size: 0.8125rem; color: var(--muted); line-height: 1.5; margin: 0; flex: 1; }
.card-action { font-size: 0.75rem; color: var(--accent-2); }
.mt-3 { margin-top: 0.75rem; }
</style>
