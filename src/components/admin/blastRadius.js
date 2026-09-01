/**
 * BLAST RADIUS — the one place the three labels are written down.
 *
 * WHY THIS FILE EXISTS. Three separate files — PodLab.vue, VoiceLab.vue and
 * ExperimentsPanel.vue — carry the SAME VERBATIM SENTENCE refusing to write
 * config: "`algorithm_config` writes are immediately global to every learner
 * (~5-min cache TTL, no draft/env split), so this Lab never writes config."
 * Three labs hand-routing around a distinction the information architecture did
 * not carry. This carries it.
 *
 * THE AXIS IS *WHO* AND *WHEN*, NOT "IS IT DANGEROUS". Every lab writes
 * something or it would not be a lab. The question a person needs answered
 * before they touch a control is: who does this reach, and when does it reach
 * them. Three honest answers, and the middle one is the whole reason the axis is
 * worth drawing — a deferred change looks safe at the moment you make it and
 * lands long after you have forgotten making it.
 *
 * CLASSIFY BY WHAT THE CODE WRITES, NOT BY HOW THE PAGE FEELS. Each entry in
 * LAB_BLAST_RADIUS below names the write it was classified on, so the next
 * person can check the claim rather than trust it.
 */

export const BLAST_RADIUS = {
  live: {
    id: 'live',
    label: 'LIVE NOW',
    short: 'live now',
    // The sentence three labs were each carrying privately.
    detail:
      'Saving here reaches every learner on every course within about five minutes. '
      + 'algorithm_config has no draft/env split — publish is the only mode.',
    accent: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.16)',
  },
  deferred: {
    id: 'deferred',
    label: 'LIVE AT NEXT GENERATION',
    short: 'next generation',
    // Tom, 2026-09-01, on the Voice Lab: "it's about voices chosen that impact
    // the next time audio is generated."
    detail:
      'Nothing changes for a learner today. What you choose here is applied the next time '
      + 'audio or content is generated — and then it is applied everywhere in that language, '
      + 'long after you made the choice.',
    accent: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.16)',
  },
  none: {
    id: 'none',
    label: 'NOTHING',
    short: 'read-only',
    detail:
      'Reads, measures and previews. Nothing on these surfaces writes anything a learner can reach.',
    accent: '#10b981',
    glow: 'rgba(16, 185, 129, 0.16)',
  },
}

export const BLAST_ORDER = ['live', 'deferred', 'none']

/**
 * The classification, with the evidence beside it. `writes` is the specific
 * call or mount that decided the tier — verified in the code on 2026-09-01, and
 * the thing to re-read if you ever want to argue with a placement.
 */
export const LAB_BLAST_RADIUS = {
  listening: { tier: 'live', writes: 'PATCH /api/algorithm-config via useAlgorithmConfig (algorithmConfigShared.js)' },
  speaking: { tier: 'live', writes: 'PATCH /api/algorithm-config via useAlgorithmConfig (algorithmConfigShared.js)' },
  voice: { tier: 'deferred', writes: 'POST /api/voices/declare — locks a course side to a voice as versioned algorithm_config; no audio is touched until the next render' },
  pods: { tier: 'deferred', writes: 'POST /api/pod-cast-voices (casting), POST /api/admin/pods/:course/generate-audio (sample fill, real spend). Never algorithm_config.' },
  scripts: { tier: 'deferred', writes: 'POST a versioned canonical script save — changes the English master every course flexes from, and changes no generated pod until re-translation' },
  vad: { tier: 'none', writes: 'analysis POSTs to the recorder API only — measures, stores nothing' },
  basket: { tier: 'none', writes: 'nothing — mounted readOnly: true at services/production-api.cjs:176' },
  'capture-ab': { tier: 'none', writes: 'nothing — records in the browser, decodes, prints numbers. Nothing uploaded, nothing stored.' },
}

/** The tier record for a lab key, or the read-only tier if we have no entry. */
export function blastRadiusFor (key) {
  const entry = LAB_BLAST_RADIUS[key]
  return BLAST_RADIUS[entry?.tier || 'none']
}
