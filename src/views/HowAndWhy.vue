<script setup>
// How & Why — the founder's rulings room (rulings 2026-07-28, 2026-07-29).
// The app-as-self-teaching philosophy replaces app-plus-docs-plus-manuals,
// and layout option A puts each how-to WHERE THE DOING IS: a working surface
// carries its own "How this works". So this page is (a) the rulings layer —
// founder-authored thinking (Pedagogy, Pod Thinking, the schema-truth ruling,
// the APML lineage) — plus (b) an INDEX of those inline explanations, and
// (c) prose only for the sections that have no doing-surface of their own.
// The index is not hand-kept: truth.inlineExplainers is compiled from the
// real <HowThisWorks> mounts, gated both ways, so it cannot point at a
// toggle that isn't there or miss one that is.
// Zero runtime model calls; everything renders from the explanation pack.
import { computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { usePack } from '@/explainer/usePack'
import { mdlite } from '@/explainer/mdlite'

const { isAdmin, isRecorder, hasDashboardAccess } = useAuth()
const { pack } = usePack()

const persona = computed(() => {
  if (!hasDashboardAccess.value) return null
  if (isAdmin.value) return 'admin'
  if (isRecorder.value) return 'recorder'
  return 'editor'
})

// The how-to layer, organised by what the person does — not by system parts.
const SECTION_TITLES = {
  home: 'Finding your way around',
  courses: 'Working on a course',
  'course-overview': 'A course, end to end',
  audio: 'Making the audio',
  script: 'Reading the course as a learner meets it',
  checking: 'Checking a course',
  admin: 'Running the platform',
  stocktake: 'Taking stock',
  'record-room': 'Recording',
  how: 'How this page stays true',
}
const SECTION_ORDER = [
  'home', 'courses', 'course-overview', 'audio', 'script', 'checking',
  'record-room', 'admin', 'stocktake', 'how',
]
const byOrder = ([a], [b]) => {
  const ia = SECTION_ORDER.indexOf(a); const ib = SECTION_ORDER.indexOf(b)
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
}

// Sections this persona has prose for, split by whether the explanation now
// lives inline on a working surface. Compiled index → index row; everything
// else → prose here, because there is nowhere else for it to be.
const mySections = computed(() =>
  Object.entries(pack.value.explanations?.[persona.value] ?? {}).sort(byOrder)
)
const homes = computed(() => pack.value.truth?.inlineExplainers ?? [])

const index = computed(() =>
  homes.value
    .filter((h) => mySections.value.some(([key]) => key === h.section))
    .map((h) => ({ ...h, title: SECTION_TITLES[h.section] ?? h.section }))
)

const howto = computed(() =>
  mySections.value
    .filter(([key]) => !homes.value.some((h) => h.section === key))
    .map(([key, text]) => ({ key, title: SECTION_TITLES[key] ?? key, html: mdlite(text) }))
)

// Rulings prose straight from the pack: the schema-truth ruling
// (rulings/docs/schema.md, founder 2026-07-29) and the APML lineage
// (rulings/docs/apml.md — architectural lineage, not a live requirement).
const schemaRuling = computed(() =>
  Object.entries(pack.value.docs?.schema ?? {}).map(([title, text]) => ({ title, html: mdlite(text) }))
)
const apmlWhy = computed(() =>
  Object.entries(pack.value.docs?.apml ?? {}).map(([title, text]) => ({ title, html: mdlite(text) }))
)

const rulingCards = [
  { label: 'Pedagogy', to: '/how/pedagogy', desc: 'The teaching model and the method — read this before authoring anything. The method is the product.' },
  { label: 'Pod Thinking', to: '/how/pod-thinking', desc: 'Design thinking for the listening stream — why the pods carry what the course deliberately leaves out.' },
]
</script>

<template>
  <div class="how-page">
    <header class="how-header">
      <h1 class="page-title">How &amp; Why</h1>
      <p class="page-subtitle">
        This is the <em>why</em> — the founder's thinking, kept by hand because no code can
        derive it. The <em>how</em> now lives where the doing is: every working surface carries
        its own <em>How this works</em>, compiled against the running system, so if the app
        changes and those words don't, the build fails. Below the rulings is the index of where
        each one sits.
      </p>
    </header>

    <!-- The rulings layer: founder-authored philosophy -->
    <section class="how-section">
      <div class="section-header">
        <span class="section-label">Why — the rulings</span>
        <div class="section-line"></div>
      </div>
      <div class="rulings-grid">
        <router-link v-for="c in rulingCards" :key="c.label" :to="c.to" class="ruling-card">
          <h2 class="card-title">{{ c.label }}</h2>
          <p class="card-description">{{ c.desc }}</p>
          <span class="card-action">Read →</span>
        </router-link>
      </div>

      <div v-if="schemaRuling.length" class="apml-why">
        <h2 class="apml-heading">Schema truth</h2>
        <article v-for="s in schemaRuling" :key="s.title" class="apml-section">
          <h3 class="apml-title">{{ s.title }}</h3>
          <!-- eslint-disable-next-line vue/no-v-html — pack content is compiled repo data, escaped above -->
          <div class="howto-body" v-html="s.html"></div>
        </article>
      </div>

      <div v-if="apmlWhy.length" class="apml-why">
        <h2 class="apml-heading">APML — the lineage</h2>
        <article v-for="s in apmlWhy" :key="s.title" class="apml-section">
          <h3 class="apml-title">{{ s.title }}</h3>
          <!-- eslint-disable-next-line vue/no-v-html — pack content is compiled repo data, escaped above -->
          <div class="howto-body" v-html="s.html"></div>
        </article>
      </div>
    </section>

    <!-- The index: where each inline "How this works" lives, compiled from
         the real mounts (truth.inlineExplainers) — never hand-kept. -->
    <section v-if="index.length" class="how-section">
      <div class="section-header">
        <span class="section-label">How this works — where to find it</span>
        <div class="section-line"></div>
      </div>
      <p class="index-note">
        Each of these is explained on the surface itself, behind a quiet
        <em>How this works</em> — open the page and tap it.
      </p>
      <ul class="index-list">
        <li v-for="i in index" :key="i.section" class="index-row">
          <router-link :to="i.to" class="index-link">{{ i.title }}</router-link>
          <span class="index-where">{{ i.where }}</span>
        </li>
      </ul>
    </section>

    <!-- Prose for the sections with no doing-surface of their own -->
    <section v-if="howto.length" class="how-section">
      <div class="section-header">
        <span class="section-label">The rest, in one place</span>
        <div class="section-line"></div>
      </div>
      <div class="howto-list">
        <article v-for="s in howto" :key="s.key" class="howto-card">
          <h2 class="howto-title">{{ s.title }}</h2>
          <!-- eslint-disable-next-line vue/no-v-html — pack content is compiled repo data, escaped above -->
          <div class="howto-body" v-html="s.html"></div>
        </article>
      </div>
    </section>

    <!-- Quiet door to the compiled reference, for those who take stock -->
    <footer v-if="isAdmin" class="how-footer">
      <router-link to="/stocktake" class="stocktake-link">
        Need the compiled reference — pipeline, glossary, APML current state? Take stock →
      </router-link>
    </footer>
  </div>
</template>

<style scoped>
.how-page { padding: 2rem; max-width: 56rem; margin: 0 auto; }
.how-header { margin-bottom: 2.25rem; }
.page-title { font-size: 1.875rem; font-weight: 700; color: var(--accent-2); margin: 0 0 0.5rem; }
.page-subtitle { color: var(--muted); margin: 0; max-width: 46rem; line-height: 1.65; }
.page-subtitle em { color: var(--ink); font-style: normal; font-weight: 600; }

.how-section { margin-bottom: 2.5rem; }
.section-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
.section-label {
  font-family: var(--font-mono); font-size: 0.7rem; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--accent); white-space: nowrap;
}
.section-line { flex: 1; height: 1px; background: var(--line); }

.howto-list { display: flex; flex-direction: column; gap: 1rem; }
.howto-card {
  background: var(--surface); border: 1px solid var(--line); border-left: 3px solid var(--accent-2);
  border-radius: 10px; padding: 1.1rem 1.35rem;
}
.howto-title { font-size: 1rem; font-weight: 600; color: var(--ink); margin: 0 0 0.5rem; }
.howto-body { font-size: 0.875rem; color: var(--muted); line-height: 1.65; }
.howto-body :deep(p) { margin: 0 0 10px; }
.howto-body :deep(p:last-child) { margin-bottom: 0; }
.howto-body :deep(strong) { color: var(--ink); font-weight: 600; }

.index-note { font-size: 0.8125rem; color: var(--faint); margin: 0 0 0.75rem; line-height: 1.5; }
.index-note em { font-style: normal; color: var(--muted); }
.index-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.index-row {
  display: flex; align-items: baseline; gap: 0.75rem; flex-wrap: wrap;
  padding: 0.55rem 0; border-bottom: 1px solid var(--line);
}
.index-row:last-child { border-bottom: none; }
.index-link { font-size: 0.9375rem; color: var(--accent-2); text-decoration: none; }
.index-link:hover { text-decoration: underline; text-underline-offset: 3px; }
.index-where { font-size: 0.8125rem; color: var(--faint); }

.rulings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
.ruling-card {
  display: flex; flex-direction: column; gap: 0.4rem; text-decoration: none;
  background: var(--surface); border: 1px solid var(--line); border-left: 3px solid var(--accent);
  border-radius: 10px; padding: 1.1rem 1.25rem;
  transition: transform 0.12s ease, border-color 0.12s ease;
}
.ruling-card:hover { transform: translateY(-2px); border-color: var(--accent-2); }
.card-title { font-size: 1rem; font-weight: 600; color: var(--ink); margin: 0; }
.card-description { font-size: 0.8125rem; color: var(--muted); line-height: 1.5; margin: 0; flex: 1; }
.card-action { font-size: 0.75rem; color: var(--accent-2); }

.apml-why { margin-top: 1.5rem; }
.apml-heading { font-size: 1.125rem; font-weight: 700; color: var(--ink); margin: 0 0 0.75rem; }
.apml-section { margin-bottom: 1rem; }
.apml-title { font-size: 0.9375rem; font-weight: 600; color: var(--ink); margin: 0 0 0.35rem; }

.how-footer { border-top: 1px solid var(--line); padding-top: 1.25rem; }
.stocktake-link {
  font-size: 0.8125rem; color: var(--faint); text-decoration: underline;
  text-underline-offset: 3px;
}
.stocktake-link:hover { color: var(--muted); }

@media (max-width: 640px) {
  .how-page { padding: 1.25rem 1rem; }
}
</style>
