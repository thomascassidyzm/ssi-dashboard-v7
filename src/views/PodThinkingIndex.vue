<template>
  <div class="pod-thinking-view">
    <div class="page-header">
      <h1 class="page-title">Pod Thinking</h1>
      <p class="page-subtitle">
        Methodology and design thinking behind the listening pods - proposals, ramps, and the reasoning
        behind them, separate from the live pipeline reference in <router-link to="/canonical/pods">Listening Pods</router-link>.
      </p>
    </div>

    <main class="content-area">
      <div class="doc-list">
        <router-link
          v-for="doc in liveDocs"
          :key="doc.slug"
          :to="`/how/pod-thinking/${doc.slug}`"
          class="doc-entry"
        >
          <div class="doc-entry-main">
            <span class="doc-badge" :class="badgeClass(doc.badge)">{{ doc.badge }}</span>
            <h2 class="doc-entry-title">{{ doc.title }}</h2>
            <p class="doc-entry-description">{{ doc.description }}</p>
          </div>
          <div class="doc-entry-meta">
            <span class="doc-entry-status">{{ doc.status }}</span>
            <span class="doc-entry-date">{{ doc.date }}</span>
          </div>
        </router-link>
      </div>

      <template v-if="discussionDocs.length">
        <h2 class="section-title">In Discussion</h2>
        <p class="section-subtitle">Open proposals, drafts, and evidence packs awaiting a founder ruling.</p>
        <div class="doc-list">
          <router-link
            v-for="doc in discussionDocs"
            :key="doc.slug"
            :to="`/how/pod-thinking/${doc.slug}`"
            class="doc-entry"
          >
            <div class="doc-entry-main">
              <span class="doc-badge" :class="badgeClass(doc.badge)">{{ doc.badge }}</span>
              <h2 class="doc-entry-title">{{ doc.title }}</h2>
              <p class="doc-entry-description">{{ doc.description }}</p>
            </div>
            <div class="doc-entry-meta">
              <span class="doc-entry-status">{{ doc.status }}</span>
              <span class="doc-entry-date">{{ doc.date }}</span>
            </div>
          </router-link>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { podThinkingDocs } from '../content/pod-thinking-docs'

const discussionDocs = computed(() => podThinkingDocs.filter(d => d.badge === 'IN DISCUSSION'))
const liveDocs = computed(() => podThinkingDocs.filter(d => d.badge !== 'IN DISCUSSION'))

function badgeClass(badge) {
  if (badge === 'LIVE') return 'badge-live'
  if (badge === 'SUPERSEDED') return 'badge-superseded'
  return 'badge-discussion'
}
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

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--accent-2);
  margin: 2.5rem 0 0.25rem 0;
}

.section-subtitle {
  color: var(--muted);
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  max-width: 70ch;
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
</style>
