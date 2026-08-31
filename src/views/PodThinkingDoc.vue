<template>
  <div class="pod-thinking-doc-view">
    <div class="page-header">
      <router-link to="/how/pod-thinking" class="back-link">&larr; Pod Thinking</router-link>
      <template v-if="doc">
        <span class="doc-badge" :class="badgeClass(doc.badge)">{{ doc.badge }}</span>
        <h1 class="page-title">{{ doc.title }}</h1>
        <p class="page-subtitle">{{ doc.status }} &middot; {{ doc.date }}</p>
      </template>
    </div>

    <main class="content-area">
      <div v-if="!doc" class="bg-surface rounded-lg border border-line shadow-sm p-8">
        <p class="text-muted">No pod-thinking doc found for "{{ slug }}".</p>
      </div>
      <pre v-else-if="doc.isText" class="raw-text-body bg-surface rounded-lg border border-line shadow-sm p-8">{{ rawText }}</pre>
      <div v-else class="markdown-body bg-surface rounded-lg border border-line shadow-sm p-8" v-html="html"></div>
    </main>
  </div>
</template>

<script setup>
import { ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { podThinkingDocs } from '../content/pod-thinking-docs'
import { renderMarkdown } from '../lib/markdown'

const route = useRoute()
const slug = route.params.slug
const doc = podThinkingDocs.find(d => d.slug === slug)
const html = ref('')
const rawText = ref('')

function badgeClass(badge) {
  if (badge === 'LIVE') return 'badge-live'
  if (badge === 'SUPERSEDED') return 'badge-superseded'
  return 'badge-discussion'
}

watchEffect(async () => {
  if (!doc) return
  const raw = await doc.loader()
  if (doc.isText) {
    rawText.value = raw
  } else {
    html.value = renderMarkdown(raw)
  }
})
</script>

<style scoped>
.pod-thinking-doc-view {
  padding: 2rem;
}

.page-header {
  margin-bottom: 2rem;
}

.back-link {
  display: inline-block;
  color: var(--accent-2);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 1rem;
}

.back-link:hover {
  text-decoration: underline;
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
  font-size: 0.875rem;
}

.content-area {
  max-width: 100%;
}

.doc-badge {
  display: inline-block;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  margin-bottom: 0.5rem;
}

.badge-live {
  background: rgba(34, 197, 94, 0.15);
  color: #16a34a;
}

.badge-discussion {
  background: rgba(234, 179, 8, 0.15);
  color: #b45309;
}

.badge-superseded {
  background: rgba(148, 163, 184, 0.2);
  color: var(--faint);
}

.raw-text-body {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--ink);
  max-width: 90ch;
}
</style>

<style>
/* Global (unscoped) - targets v-html injected markdown content. */
.markdown-body {
  color: var(--ink);
  line-height: 1.65;
  max-width: 90ch;
}

.markdown-body .md-h1 { font-size: 1.875rem; font-weight: 700; color: var(--accent-2); margin: 0 0 1rem; }
.markdown-body .md-h2 { font-size: 1.4rem; font-weight: 700; color: var(--accent-2); margin: 2rem 0 1rem; }
.markdown-body .md-h3 { font-size: 1.15rem; font-weight: 600; color: var(--ink); margin: 1.5rem 0 0.75rem; }
.markdown-body .md-h4,
.markdown-body .md-h5,
.markdown-body .md-h6 { font-size: 1rem; font-weight: 600; color: var(--ink); margin: 1.25rem 0 0.5rem; }

.markdown-body p { margin: 0 0 1rem; color: var(--ink); }
.markdown-body .md-caption { color: var(--faint); font-style: italic; font-size: 0.875rem; }

.markdown-body .md-list { margin: 0 0 1rem; padding-left: 1.5rem; color: var(--ink); }
.markdown-body .md-list li { margin-bottom: 0.375rem; }

.markdown-body .md-quote {
  border-left: 3px solid var(--accent-2);
  padding: 0.25rem 0 0.25rem 1rem;
  margin: 0 0 1rem;
  color: var(--muted);
}

.markdown-body .md-hr {
  border: none;
  border-top: 1px solid var(--line);
  margin: 2rem 0;
}

.markdown-body code {
  background: var(--surface-2);
  border-radius: 4px;
  padding: 0.1rem 0.35rem;
  font-size: 0.875em;
  font-family: monospace;
}

.markdown-body .md-code {
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
  margin: 0 0 1rem;
}

.markdown-body .md-code code {
  background: none;
  padding: 0;
}

.markdown-body a {
  color: var(--accent-2);
}

.markdown-body .md-table-wrap {
  overflow-x: auto;
  margin: 0 0 1.5rem;
}

.markdown-body .md-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.markdown-body .md-table th,
.markdown-body .md-table td {
  border: 1px solid var(--line);
  padding: 0.5rem 0.75rem;
  text-align: left;
  vertical-align: top;
}

.markdown-body .md-table th {
  background: var(--surface-2);
  color: var(--ink);
  font-weight: 600;
}
</style>
