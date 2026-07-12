<template>
  <div class="pod-thinking-view">
    <div class="page-header">
      <h1 class="page-title">Pod Thinking</h1>
      <p class="page-subtitle">
        Methodology and design thinking behind the listening pods - proposals, ramps, and the reasoning
        behind them, separate from the live pipeline reference in <router-link to="/docs/pods">Listening Pods</router-link>.
      </p>
    </div>

    <main class="content-area">
      <div class="doc-list">
        <router-link
          v-for="doc in docs"
          :key="doc.slug"
          :to="`/docs/pod-thinking/${doc.slug}`"
          class="doc-entry"
        >
          <div class="doc-entry-main">
            <h2 class="doc-entry-title">{{ doc.title }}</h2>
            <p class="doc-entry-description">{{ doc.description }}</p>
          </div>
          <div class="doc-entry-meta">
            <span class="doc-entry-status">{{ doc.status }}</span>
            <span class="doc-entry-date">{{ doc.date }}</span>
          </div>
        </router-link>
      </div>
    </main>
  </div>
</template>

<script setup>
import { podThinkingDocs } from '../content/pod-thinking-docs'

const docs = podThinkingDocs
</script>

<style scoped>
.pod-thinking-view {
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
  max-width: 70ch;
}

.page-subtitle a {
  color: var(--accent-2);
}

.content-area {
  max-width: 100%;
}

.doc-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.doc-entry {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 1.5rem;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.doc-entry:hover {
  border-color: var(--accent-2);
  transform: translateY(-2px);
}

.doc-entry-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 0.5rem 0;
}

.doc-entry-description {
  color: var(--muted);
  margin: 0;
  max-width: 70ch;
}

.doc-entry-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.375rem;
  flex-shrink: 0;
  white-space: nowrap;
}

.doc-entry-status {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent-2);
}

.doc-entry-date {
  font-size: 0.75rem;
  color: var(--faint);
  font-family: monospace;
}
</style>
