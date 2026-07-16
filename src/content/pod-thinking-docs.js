// Auto-index of "Pod Thinking" methodology docs. Every markdown or text file in
// docs/pods/ renders at /docs/pod-thinking/:slug automatically — no code change
// needed to add a new doc. To give a doc a proper title/description/status
// instead of the generated default, add an entry to pod-thinking-meta.js
// keyed by its filename (without extension).
import { podThinkingMeta } from './pod-thinking-meta'

const modules = import.meta.glob('../../docs/pods/*.{md,txt}', { query: '?raw', import: 'default' })

function titleFromSlug(slug) {
  return slug
    .replace(/-\d{4}-\d{2}-\d{2}$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

export const podThinkingDocs = Object.entries(modules)
  .map(([path, loader]) => {
    const filename = path.split('/').pop()
    const slug = filename.replace(/\.(md|txt)$/, '')
    const isText = filename.endsWith('.txt')
    const meta = podThinkingMeta[slug] || {}
    return {
      slug,
      isText,
      title: meta.title || titleFromSlug(slug),
      description: meta.description || 'No description yet — add one to pod-thinking-meta.js.',
      date: meta.date || null,
      status: meta.status || 'Undocumented — needs a pod-thinking-meta.js entry',
      badge: meta.badge || 'IN DISCUSSION',
      loader
    }
  })
  .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
