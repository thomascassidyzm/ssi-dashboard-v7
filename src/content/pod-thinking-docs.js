// Registry of "Pod Thinking" methodology docs. Each entry renders at
// /docs/pod-thinking/:slug. Add future pod-methodology write-ups here as new
// entries — do not invent content, only register docs that actually exist.
export const podThinkingDocs = [
  {
    slug: 'pod-ladder-proposal',
    title: 'The Pod Ladder — Pods 0–3 to B2',
    description: 'Design proposal: the discourse-type ramp from transactional pod-0 to native podcast comprehension — ramp model, scenario slates, sample scenes, and the TTS renderability rule.',
    date: '2026-07-12',
    status: 'Proposal — design only, nothing seeded',
    // Vite raw import - bundles the markdown file as a string at build time.
    loader: () => import('../../docs/pods/pod-ladder-proposal.md?raw')
  }
]
