/** Tom, 2026-10-18 (r-2026-10-18): playback speed is a flat multiplier
 * on the recording: Easy 0.8, Fast 0.9, known/listening 1.0.
 * No per-voice normalisation. Measurements remain data only.
 * Mirrored in packages/core/src/script/voicePace.ts and
 * ssi-dashboard-v7-clean/services/shared/voice-pace.cjs.
 */
const MIN_SPEED = 0.7;

/** Historical bounds, retained for API compatibility; playback does not clamp. */
const MAX_SPEED = 1.0;

/** The two settings the player already has. */
const MODES = Object.freeze({ EASY: 'easy', FAST: 'fast' });

/** What the learner is doing when this clip plays. */
const ROLES = Object.freeze({ TARGET: 'target', KNOWN: 'known', LISTENING: 'listening' });

/**
 * The estate's own slot names, mapped onto the three roles the rule knows.
 * `presentation` speaks the known language, like `known`; target1/target2 are
 * the target language.
 */
const ROLE_ALIASES = Object.freeze({
  target: 'target', target1: 'target', target2: 'target',
  known: 'known', presentation: 'known', source: 'known',
  listening: 'listening', listen: 'listening',
});

/** Flat recording multiplier by role and mode (Tom, 2026-10-18). */
function targetPace(role, mode) {
  const r = ROLE_ALIASES[String(role || '').toLowerCase()] || null;
  const m = String(mode || '').toLowerCase() === MODES.FAST ? MODES.FAST : MODES.EASY;
  if (r === ROLES.LISTENING) {
    return { targetPace: 1.0, correctByVoice: false, role: r, mode: m,
      reason: 'listening exercise — full speed in any language, because listening trains them for everyday life' };
  }
  if (r === ROLES.KNOWN) {
    return { targetPace: 1.0, correctByVoice: false, role: r, mode: m,
      reason: 'known language — instruction they already understand, played exactly as rendered' };
  }
  if (r === ROLES.TARGET) {
    const t = m === MODES.FAST ? 0.9 : 0.8;
    return { targetPace: t, correctByVoice: false, role: r, mode: m,
      reason: `target language on ${m} — ${t} times the recording` };
  }
  // An UNKNOWN role is not guessed at. Guessing here would silently slow (or
  // fail to slow) a surface nobody has thought about; full speed and a stated
  // reason is the honest answer.
  return { targetPace: 1.0, correctByVoice: false, role: null, mode: m,
    reason: `unrecognised role "${role}" — played as rendered rather than guessed at` };
}

/**
 * The one call the player and the lab should both make: what speed does THIS
 * voice play at, for THIS role, in THIS mode?
 *
 * @param {object|null} voice a `voices` row (or its pace fields)
 * @param {string} role
 * @param {string} mode
 * @param {boolean} [human] the clip is a human recording (course_audio.origin='human'):
 *   always 1.0, never slowed (Tom, 2026-10-18, r-2026-10-18-exception-to-the-flat-speed-multiplier)
 */
function playbackSpeed(voice, role, mode, human = false) {
  const policy = targetPace(role, mode);
  if (human) {
    return { speed: 1.0, corrected: false, clamped: false, ...policy, targetPace: 1.0, reason: 'human recording — played at 1.0, never slowed' };
  }
  return { ...policy, speed: policy.targetPace, corrected: false, clamped: false };

}

/**
 * The effective pace ratio for a voice: the measurement, corrected by the
 * human's nudge.
 *
 * Returns null for a voice that has never been measured — and null must mean
 * "behave exactly as before per-voice pace existed", never "assume 1.0". Those
 * two are the same number and completely different claims: one says we know
 * this voice is typical, the other says we have not looked. Callers branch on
 * null; nothing silently substitutes a number for an absence.
 *
 * @param {object|null} voice a `voices` row (or the pace fields off one)
 * @returns {number|null}
 */
function effectivePaceRatio(voice) {
  if (!voice) return null;
  const measured = toNumber(voice.natural_pace_ratio);
  if (measured === null || measured <= 0) return null;
  const nudge = toNumber(voice.natural_pace_nudge);
  if (nudge === null || nudge <= 0) return measured;
  return measured * nudge;
}

/** Compatibility helper: paceRatio and bounds no longer affect speed. */
function paceMultiplier({ paceRatio, targetPace, min = MIN_SPEED, max = MAX_SPEED }) {
  const target = toNumber(targetPace);
  if (target === null || target <= 0) {
    return { speed: 1.0, corrected: false, clamped: false, reason: 'no target pace given' };
  }
  return { speed: target, corrected: false, clamped: false,
    reason: 'flat recording multiplier — Tom 2026-10-18' };

}

/**
 * Turn a set of per-(language, role) measurements for ONE voice into the single
 * ratio stored on the row.
 *
 * The MEDIAN of the per-language ratios, not the mean: a voice with 34,000
 * English clips and 120 Catalan ones would otherwise have its figure decided by
 * whichever language it happened to be used in most, and pace is a property of
 * the voice, not of the estate's rendering history.
 *
 * @param {Array<{ratio:number, samples:number}>} rows
 * @returns {{ratio:number, samples:number}|null}
 */
function combineMeasurements(rows) {
  const usable = (rows || []).filter((r) => toNumber(r.ratio) !== null && toNumber(r.ratio) > 0);
  if (!usable.length) return null;
  const sorted = usable.map((r) => Number(r.ratio)).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const ratio = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const samples = usable.reduce((n, r) => n + (Number(r.samples) || 0), 0);
  return { ratio: round3(ratio), samples };
}

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function round3(v) { return Math.round(v * 1000) / 1000; }
function toNumber(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

module.exports = {
  effectivePaceRatio, paceMultiplier, combineMeasurements, targetPace, playbackSpeed,
  MIN_SPEED, MAX_SPEED, MODES, ROLES, ROLE_ALIASES,
};
