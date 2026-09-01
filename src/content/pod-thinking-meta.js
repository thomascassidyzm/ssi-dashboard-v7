// Metadata for "Pod Thinking" docs, keyed by filename (without extension) in
// docs/pods/. This is the ONLY place a human needs to touch when a doc's
// title/description/status changes. Any file in docs/pods/*.{md,txt} that has
// no entry here still appears in the index automatically (see
// pod-thinking-docs.js) with a generated title and an 'In Discussion' badge —
// add an entry here to give it a proper title/description/LIVE status.
//
// badge: 'LIVE' | 'IN DISCUSSION' | 'SUPERSEDED'
export const podThinkingMeta = {
  'canonical-pod-slug-migration-2026-09-01': {
    title: 'The canonical pod slug migration — pod-0 became pod-1',
    description: 'The live canonical slate was renamed pod-0 → pod-1 and the two sacked pre-metagraph slates were archived and deleted. Why the number is right, what deliberately did not move, where the archive is and how to restore from it, and the two latent bugs the rename exposed.',
    date: '2026-09-01',
    status: 'Done — DB migrated and verified live',
    badge: 'LIVE'
  },
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
    title: 'Pod 0.5 — The First Real Conversation (English canonical)',
    description: "Canonical pod-0.5, built verbatim from Aran's raw dialogue. Founder ruling 2026-07-16: placed as its own pod at C=12 and seeded (27 rows, 7 scenes). Translations/audio not yet generated.",
    date: '2026-07-16',
    status: 'CANONICAL — seeded 2026-07-16',
    badge: 'LIVE'
  },
  'pod05-placement-analysis-2026-07-16': {
    title: 'Pod 0.5 — placement analysis (C=8 vs C=12)',
    description: 'Evidence pack for the founder’s placement ruling on Aran’s "first real conversation" dialogue — overlaps, menu-lines, placeholders. Ruling landed 2026-07-16: pod-0.5 at C=12, seeded.',
    date: '2026-07-16',
    status: 'Executed — ruling landed, pod-0.5 seeded',
    badge: 'LIVE'
  },
  'pod05-texture-scorecard-2026-07-17': {
    title: 'Pod 0.5 — texture scorecard (the rubric applied to itself)',
    description: 'The Realness Rubric run on pod-0.5 scene by scene: 11 clean passes + 1 conditional, where canonicalisation sanded texture, and the runnable acceptance gate proposed for future pod generation.',
    date: '2026-07-17',
    status: 'Proposed acceptance gate — for the pod-1 re-sourcing discussion',
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
  'seam-decay-naturalness-dial-2026-07-17': {
    title: 'Seam decay — the naturalness dial',
    description: 'Live founder discussion: the S-LEGO seam pause as a rendering knob decaying toward native prosody, the ladder as the decay mechanism (one ladder, two knobs), and the open forks — behavioural rung-advance, pairwise vs chained fusion, ceiling vs meaning.',
    date: '2026-07-17',
    status: 'Discussion capture — §3 ruled and live, §4 open',
    badge: 'IN DISCUSSION'
  },
  'chunk-granularity-state-of-play-2026-07-16': {
    title: 'Pod chunk granularity — state of play + monster-sentence proposal',
    description: 'Report on the pipeline as-built across four eras of granularity, plus a proposal for handling monster sentences. Read-only pass, no content or pipeline changes.',
    date: '2026-07-16',
    status: 'Report — no changes made',
    badge: 'IN DISCUSSION'
  }
}
