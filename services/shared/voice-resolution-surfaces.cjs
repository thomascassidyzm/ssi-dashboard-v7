// services/shared/voice-resolution-surfaces.cjs
//
// EVERY PLACE ON THE RENDER PATH THAT READS courses.voice_config, in one list
// (Tom's ruling, 2026-08-29: the Voice Lab cast must reach Phase 8's generate
// audio; a hand-written mapping standing in for a derivation is the defect).
//
// This is not documentation — it is the input to a drift test. The rule the
// list encodes is one sentence:
//
//     A SEAM THAT PICKS A VOICE FOR A CAST ROLE, FOR SOMETHING THAT WILL BE
//     RENDERED, MUST GO THROUGH voiceConfigService.resolveVoiceConfig().
//
// Everything else — the presentation role, the human-recording paths, the
// censuses and the editor's own read — reads the STORED config on purpose, and
// each of those purposes is written down below rather than left to be inferred
// from the absence of a call.
//
// services/shared/voice-resolution-surfaces.test.cjs re-derives the set of
// scopes that read a raw voice_config by scanning RENDER_PATH_FILES, and fails
// when the derived set and this manifest disagree in either direction:
//
//   - a new scope reads a raw voice_config and is NOT listed → it may be
//     picking a voice the Voice Lab cast never reached. Resolve it, or list it
//     here with the reason it does not need to be resolved.
//   - a listed scope no longer reads one → delete the entry, so the list keeps
//     meaning what it says.
//
// The scope key is a ROUTE ("POST /generate/:courseCode") or a top-level
// function name ("classifyEnglishCopyBucket()") — never a line number, which
// would rot on the next edit to an 8,700-line file.

/**
 * The files a course's rendered audio can have its voice decided in.
 *
 * Deliberately NOT "every file that mentions voice_config": pod casting
 * (voice_config.podCast) is a separate casting system with its own pools, and
 * the Voice Lab language cast has never claimed it. Adding a file here is how
 * you bring a new render surface under the guard.
 */
const RENDER_PATH_FILES = Object.freeze([
  'services/phases/phase8-audio-v13.cjs',
  'services/phases/presentation-author.cjs',
  'services/phases/phase2-conflict-resolution/detect.cjs',
  'services/phases/generate-legacy-manifest.cjs',
  'services/audio-reuse-planner.cjs',
  'services/voice-config-service.cjs',
  'services/shared/relink-voice-guard.cjs',
  'services/production-api.cjs',
  'services/voice-engine/synthesis-job.cjs',
  'services/voice-engine/coverage.cjs',
  'services/course-order-script.cjs',
]);

/**
 * Why a scope is allowed to read the stored config directly. Each value is the
 * standing reason, not an excuse slot: a new disposition needs a new entry
 * here and a new sentence about when it applies.
 */
const DISPOSITIONS = Object.freeze({
  'caller-resolved':
    'a helper that takes an already-fetched `course` object. It cannot resolve for '
    + 'itself without a second DB round-trip per call, so the resolution happens once '
    + 'at the caller\'s fetch. The test asserts every caller is itself resolved.',
  'human-recording':
    'a human-recording path — recordist queue, splicer, coverage — which must read '
    + 'the STORED config. applyLanguageCast\'s human-voice guard is computed from the '
    + 'stored config precisely so the two agree; resolving here would make the splicer '
    + 'and the guard disagree about which slot holds a recording.',
  'not-a-render':
    'reads the config for a census, a report, a detector or a signature, and never '
    + 'picks a voice that is then rendered.',
  'editor-read':
    'the EDITOR\'s read. It must NOT resolve: the voice-config screen has to show and '
    + 'save what the course row itself carries, or saving the screen would bake the '
    + 'language cast into the course rows and defeat casting at the language.',
});

/**
 * @typedef {{file: string, scope: string, disposition: keyof DISPOSITIONS, note: string}} Surface
 */

/** @type {Surface[]} */
const RAW_READ_SURFACES = [
  // ── phase8-audio-v13.cjs ────────────────────────────────────────────────
  {
    file: 'services/phases/phase8-audio-v13.cjs',
    scope: 'classifyEnglishCopyBucket()',
    disposition: 'caller-resolved',
    note: 'reached only through getAudioNeeds(), whose four call sites all resolve at their fetch.',
    callersOf: 'getAudioNeeds',
  },

  // ── presentation-author.cjs ─────────────────────────────────────────────
  {
    file: 'services/phases/presentation-author.cjs',
    scope: 'resolvePresentationVoiceId()',
    disposition: 'caller-resolved',
    note: 'pure and synchronous by design, and since 2026-09-10 the presentation role '
      + 'is CAST — so what it reads out of `voices.presentation` IS the cast row, put '
      + 'there by resolveVoiceConfig() at each caller\'s fetch. Making it async would '
      + 'push a database round trip into a per-item loop. Every phase8 route that '
      + 'reaches it resolves; the scan above is what holds them to that.',
  },

  // ── generate-legacy-manifest.cjs ────────────────────────────────────────
  {
    file: 'services/phases/generate-legacy-manifest.cjs',
    scope: 'getCombinedVoiceSig()',
    disposition: 'not-a-render',
    note: 'builds a target1+target2 signature string for the legacy manifest, which is '
      + 'off the learner path entirely. Renders nothing.',
  },

  // ── voice-config-service.cjs ────────────────────────────────────────────
  {
    file: 'services/voice-config-service.cjs',
    scope: 'loadStoredVoiceConfig()',
    disposition: 'editor-read',
    note: 'THE stored read. resolveVoiceConfig() is layered on top of it by '
      + 'loadVoiceConfig(); this function resolving itself would be a loop and a bug.',
  },

  // ── relink-voice-guard.cjs ──────────────────────────────────────────────
  {
    file: 'services/shared/relink-voice-guard.cjs',
    scope: 'resolveVoices()',
    disposition: 'caller-resolved',
    note: 'pure: takes whatever course object the caller hands it. Its cast-role callers '
      + '(phase8 linkAudioIdsBatch, audio-reuse-planner) resolve first; its presentation '
      + 'callers are covered by the presentation entries above.',
  },
  {
    file: 'services/shared/relink-voice-guard.cjs',
    scope: 'isRelinkAllowed()',
    disposition: 'caller-resolved',
    note: 'the message text of a refusal, naming courses.voice_config. Decides nothing.',
  },

  // ── production-api.cjs ──────────────────────────────────────────────────
  {
    file: 'services/production-api.cjs',
    scope: 'handleRecordingUpload()',
    disposition: 'human-recording',
    note: 'resolves the slot a HUMAN upload belongs to from the stored config; the '
      + 'client-supplied voiceId is advisory and the server value wins.',
  },
  {
    file: 'services/production-api.cjs',
    scope: 'POST /api/production/:courseCode/audio-pipeline/sync-s3',
    disposition: 'not-a-render',
    note: 'registers audio that ALREADY exists in S3; it never calls TTS. It also reads '
      + 'the flat legacy shape (voiceConfig.known, not .voices.known), which no live '
      + 'course carries, so it enumerates nothing — inert, and left alone deliberately '
      + 'rather than "fixed" into doing something nobody asked for.',
  },
  {
    file: 'services/production-api.cjs',
    scope: 'POST /api/production/:courseCode/gender-prep/start',
    disposition: 'not-a-render',
    note: 'reads the configured voices to decide whether the course needs gendered TEXT '
      + 'variants. A gender-prep decision, not a voice pick.',
  },

  // ── voice-engine ────────────────────────────────────────────────────────
  {
    file: 'services/voice-engine/synthesis-job.cjs',
    scope: 'startSynthesisJob()',
    disposition: 'human-recording',
    note: 'the human-recording splicer — "NO TTS calls, ever". Its slot resolution must '
      + 'match the stored config the human-voice guard reads.',
  },
  {
    file: 'services/voice-engine/coverage.cjs',
    scope: 'computeCoverage()',
    disposition: 'human-recording',
    note: 'reports how much of a course each HUMAN voice slot has recorded.',
  },

  // ── course-order-script.cjs ─────────────────────────────────────────────
  {
    file: 'services/course-order-script.cjs',
    scope: 'castVoiceId()',
    disposition: 'human-recording',
    note: 'the recordist script: "whose takes are these?" for a human reading sentences.',
  },
];

const BY_KEY = new Map(RAW_READ_SURFACES.map(s => [`${s.file} :: ${s.scope}`, s]));

/** @returns {Surface|null} */
function findRawReadSurface(file, scope) {
  return BY_KEY.get(`${file} :: ${scope}`) || null;
}

module.exports = {
  RENDER_PATH_FILES,
  DISPOSITIONS,
  RAW_READ_SURFACES,
  findRawReadSurface,
};
