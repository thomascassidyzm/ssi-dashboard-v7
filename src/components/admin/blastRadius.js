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
      'Saving here reaches every learner within minutes, with no render, no regeneration '
      + 'and nothing to approve in between. Some of these Save buttons publish straight to '
      + 'the live row.',
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
 *
 * A LAB'S TIER IS ITS HIGHEST-REACHING CONTROL, NOT ITS TYPICAL ONE. Pod Lab is
 * the case that forced the rule into writing: three of its four writes are
 * genuinely deferred, and the fourth is not, so the lab is LIVE NOW. A label
 * that describes the average control on a page is a label that lies about the
 * dangerous one, and the average is never the thing that bites you.
 *
 * POD LAB IS ALSO THE CASE THAT SHOWS WHY THIS FILE IS NOT OPTIONAL. It was
 * first classified deferred on the strength of the endpoint's OWN comment —
 * `api/pod-fine-map.js`: "by construction this endpoint cannot touch the live
 * atom_map or anything learners hear." That sentence is false. The learner's
 * Drill selects `atom_map_fine` straight off `listening_pod_sentences`
 * (packages/player-vue/src/composables/useListeningPods.ts:179) and feeds it to
 * buildFusionGroups on every fetch. The slice-playback kill switch
 * (fusionDrill.ts:38) turns off the sub-sentence AUDIO and says so itself:
 * "text chunking and glosses stay fully intact". Editing a seam changes what
 * the next learner to open that pod reads. The false comment has been corrected
 * at source; the point of writing tiers down HERE, once, with the evidence
 * attached, is that a per-file claim like that one gets to be wrong alone.
 */
export const LAB_BLAST_RADIUS = {
  listening: { tier: 'live', writes: 'PATCH /api/algorithm-config via useAlgorithmConfig (algorithmConfigShared.js)' },
  speaking: { tier: 'live', writes: 'PATCH /api/algorithm-config via useAlgorithmConfig (algorithmConfigShared.js)' },
  voice: { tier: 'deferred', writes: 'POST /api/voices/declare — locks a course side to a voice as versioned algorithm_config; no audio is touched until the next render' },
  pods: { tier: 'live', writes: 'PATCH /api/pod-fine-map — atom_map_fine is read LIVE by the learner\'s Drill (useListeningPods.ts:179 → buildFusionGroups). Its other three writes (pod-cast-voices, pod-voice-approval, generate-audio) are deferred; the tier is the highest reach on the page.' },
  // SCRIPT LAB IS DEFERRED, AND THE ARGUMENT FOR 'live' HAS BEEN CHECKED AND
  // REJECTED (2026-09-01). Its only write is `POST /api/canonical-script`
  // (src/views/ScriptLabScriptView.vue), which UPDATEs
  // `canonical_pod_scenarios.english_text` and files a version row. Nothing
  // learner-facing reads that table: `services/pod-dialogue-generator.cjs`
  // FLEXES it into `listening_pod_sentences` at generation time, so the change
  // is OWED to every course rather than applied to any. The LIVE NOW evidence
  // in circulation — `useListeningPods.ts:179` reading `atom_map_fine` — is POD
  // LAB's fine-map editor, not this lab, and is why Pod Lab above is live.
  // Labelling the most deferred write in the estate LIVE NOW would be exactly
  // the class of lie this file exists to prevent. If a control is ever added to
  // the Script Lab that reaches a learner directly, this flips to 'live'.
  scripts: { tier: 'deferred', writes: 'POST /api/canonical-script — a versioned save onto canonical_pod_scenarios.english_text, the English master every course flexes from. No generated pod changes until re-translation.' },
  vad: { tier: 'none', writes: 'POST /api/vad-recordings — stores admin takes + scores under s3://ssi-audio-stage/vad-lab/. No learner-facing code reads that prefix.' },
  basket: { tier: 'none', writes: 'nothing — mounted readOnly: true at services/production-api.cjs:176' },
  'capture-ab': { tier: 'none', writes: 'nothing — records in the browser, decodes, prints numbers. Nothing uploaded, nothing stored.' },
}

/** The tier record for a lab key, or the read-only tier if we have no entry. */
export function blastRadiusFor (key) {
  const entry = LAB_BLAST_RADIUS[key]
  return BLAST_RADIUS[entry?.tier || 'none']
}
