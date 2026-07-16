// Metadata for "Pod Thinking" docs, keyed by filename (without extension) in
// docs/pods/. This is the ONLY place a human needs to touch when a doc's
// title/description/status changes. Any file in docs/pods/*.{md,txt} that has
// no entry here still appears in the index automatically (see
// pod-thinking-docs.js) with a generated title and an 'In Discussion' badge —
// add an entry here to give it a proper title/description/LIVE status.
//
// badge: 'LIVE' | 'IN DISCUSSION' | 'SUPERSEDED'
export const podThinkingMeta = {
  'pod-ladder-proposal': {
    title: 'The Pod Ladder — Pods 0–3 to B2',
    description: 'Design proposal: the discourse-type ramp from transactional pod-0 to native podcast comprehension — ramp model, scenario slates, sample scenes, and the TTS renderability rule.',
    date: '2026-07-12',
    status: 'Proposal — design only, nothing seeded',
    badge: 'IN DISCUSSION'
  },
  'pod-1-english-canonical': {
    title: 'Pod 1 — Social Conversation (English canonical)',
    description: 'Move-frame canon: 16 scenes, one conversational move each, drilled six-to-ten times inside one continuous natural conversation.',
    date: '2026-07-16',
    status: 'Flagged for rework by the founder',
    badge: 'IN DISCUSSION'
  },
  'pod1-frame-decision-pack': {
    title: 'Pod-1 frame ruling — decision pack',
    description: 'The situational-patch vs move-frame decision: one question, one look, with samples judged at the §9a ellipsis rule.',
    date: '2026-07-16',
    status: 'Decision pack — Option B (move frame) adopted',
    badge: 'IN DISCUSSION'
  },
  'pod05-english-canonical': {
    title: 'Pod 0.5 — The First Real Conversation (English canonical) — DRAFT',
    description: "DRAFT canon built from Aran's raw dialogue, pending founder placement ruling (pod-0 extension at C=8 vs pod-0.5 at C=12). Do not seed from this file yet.",
    date: '2026-07-16',
    status: 'DRAFT — pending founder placement ruling',
    badge: 'IN DISCUSSION'
  },
  'pod05-placement-analysis-2026-07-16': {
    title: 'Pod 0.5 — placement analysis (C=8 vs C=12)',
    description: 'Evidence pack for the founder’s placement ruling on Aran’s "first real conversation" dialogue — overlaps, menu-lines, placeholders.',
    date: '2026-07-16',
    status: 'Evidence pack — awaiting ruling',
    badge: 'IN DISCUSSION'
  },
  'pod05-aran-raw-2026-07-16': {
    title: "Pod 0.5 — Aran's raw dialogue (source record)",
    description: 'Verbatim source text for the pod-0.5 candidate, field-tested over 75 hours of real conversations. Committed as-is; every deviation from it is logged in the placement analysis.',
    date: '2026-07-16',
    status: 'Source record — verbatim',
    badge: 'IN DISCUSSION'
  },
  'aran-recording-instructions': {
    title: 'Recording Welsh pods — instructions for Aran',
    description: 'The ready-to-send recording brief: what to record, how, and where it lands in the pipeline.',
    date: '2026-07-16',
    status: 'Live brief — in active use',
    badge: 'LIVE'
  },
  'humin-status': {
    title: 'HUMIN (human recording) — where it actually stands',
    description: 'Plain-language status for the founder, verified directly against repo code, git history, and a live read-only DB query.',
    date: '2026-07-16',
    status: 'Live status report',
    badge: 'LIVE'
  },
  'pod1-pipeline-readiness': {
    title: 'Pod-1 pipeline readiness — dry-run',
    description: 'Read-only pipeline readiness check ahead of the pod-1 move-canon seed — no writes, no TTS rendered.',
    date: '2026-07-16',
    status: 'Dry-run report',
    badge: 'LIVE'
  },
  'pod1-move-canon-summary': {
    title: 'Pod-1 move-frame canon — build summary',
    description: 'Scene map, conversions, and verification for the pod-1 move-frame canon build and seed.',
    date: '2026-07-16',
    status: 'Build summary',
    badge: 'LIVE'
  },
  'chunk-granularity-state-of-play-2026-07-16': {
    title: 'Pod chunk granularity — state of play + monster-sentence proposal',
    description: 'Report on the pipeline as-built across four eras of granularity, plus a proposal for handling monster sentences. Read-only pass, no content or pipeline changes.',
    date: '2026-07-16',
    status: 'Report — no changes made',
    badge: 'IN DISCUSSION'
  }
}
