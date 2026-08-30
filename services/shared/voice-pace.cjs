/**
 * PER-VOICE NATURAL PACE, AND THE RULE THAT DECIDES PLAYBACK SPEED — one
 * definition of the arithmetic, shared by everything that needs it.
 *
 * ── THE RULE (Tom, 2026-08-29). THE BELT RAMP IS RETIRED ────────────────────
 *
 *   "slower voices in playback for target language — Always — than when used
 *    for known language — Listening exercises can always be full speed in any
 *    language because listening is training them for everyday life"
 *
 *   "You're probably right to make it 0.8x … on EASY setting. We also have a
 *    FAST setting — which could perhaps be a flat 0.9x … Then we can dispense
 *    with the belt ramp chicanery?"
 *
 * So speed is no longer a function of BELT at all. It is a function of what the
 * learner is doing (ROLE) and of the setting they chose (MODE):
 *
 *     target language, Easy   → 0.80
 *     target language, Fast   → 0.90
 *     known language, any     → 1.00   (instruction they already understand)
 *     listening, any language → 1.00   (listening trains them for real life)
 *
 * The four-step ladder — white 0.8, yellow 0.9, orange 0.95, green 1.0 — is
 * gone. It is not deprecated, not configurable, not a fallback: nothing in this
 * module takes a belt any more.
 *
 * ── 0.8 OF WHAT? OF A COMMON REFERENCE, NOT OF EACH VOICE ───────────────────
 * 0.8x means 0.8 of the LANGUAGE'S reference pace, not 0.8 of whatever this
 * particular voice happens to do. Otherwise a naturally brisk voice on Easy is
 * still faster than a measured voice on Fast, and the setting means nothing to
 * the learner. Measured from the provider APIs on 2026-08-29 (one identical
 * sentence per language, rendered fresh at 1.0x), voices span 0.832x to 1.241x
 * of their own language's reference — so the correction is worth real money to
 * a beginner. Hence:
 *
 *     multiplier = clamp(targetPace / voicePaceRatio, MIN_SPEED, MAX_SPEED)
 *
 * A voice at exactly the reference (ratio 1.0) gets the target number
 * unchanged, so "Easy = 0.8" keeps its plain meaning and only the per-voice
 * correction is new.
 *
 * ── THE CLAMP BITES, AND THAT IS STATED RATHER THAN HIDDEN ──────────────────
 * The briskest voice measured (fr-FR-Vivienne, 1.241) wants 0.8/1.241 = 0.645
 * on Easy and clamps to the 0.7 floor. For the fastest voices the correction is
 * therefore PARTIAL, not exact. Below 0.7 TTS output stops sounding slow and
 * starts sounding broken, so the floor wins — but a reader of this file should
 * never be surprised by it.
 *
 * ── WHAT THIS MODULE DELIBERATELY DOES NOT DO ───────────────────────────────
 * It does not know about belts, seeds, courses or the player. It is the rule,
 * the arithmetic and the clamp, and nothing else.
 */

/**
 * The speed floor. Below this, TTS output stops sounding slow and starts
 * sounding broken, and the learner app already holds this same number
 * (MIN_SPEED in packages/core/src/learning/ratePolicy.ts). Two copies of one
 * constant is a bug waiting to happen; when the player half lands, ONE of them
 * must import the other.
 */
const MIN_SPEED = 0.7;

/**
 * The ceiling, and it is 1.0 ON PURPOSE.
 *
 * Everything in the estate is minted at 1.0x, so a multiplier above 1.0 means
 * playing a clip faster than it was rendered — a new behaviour nobody has asked
 * for, on the most exposed surface there is. So a voice slower than its
 * language's reference is played at its own natural pace and no faster; the
 * correction is one-sided until Tom says otherwise.
 *
 * DEFAULT taken 2026-08-29, flagged for Tom rather than ruled by him.
 */
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

/**
 * THE RULE. What fraction of the language's reference pace should a learner
 * hear, given what they are doing and which setting they chose?
 *
 * Returns the target AND whether the per-voice correction applies at all,
 * because those are two different questions and the second one is a taste call:
 *
 * KNOWN AND LISTENING ARE 1.0 FLAT, WITH NO PER-VOICE CORRECTION — "played
 * exactly as rendered", full stop. Correcting a slow voice UP to the reference
 * would mean playing a clip faster than it was rendered, which is new behaviour
 * on the most exposed surface and nobody asked for it (MAX_SPEED already
 * forbids it). DEFAULT taken 2026-08-29, flagged for Tom: his rule says "always
 * 1.0x" and this is the conservative reading of it.
 *
 * @param {string} role  'target' | 'known' | 'listening' (estate slot names accepted)
 * @param {string} mode  'easy' | 'fast'
 * @returns {{targetPace:number, correctByVoice:boolean, role:string, mode:string, reason:string}}
 */
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
    return { targetPace: t, correctByVoice: true, role: r, mode: m,
      reason: `target language on ${m} — ${t} of the language's reference pace` };
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
 */
function playbackSpeed(voice, role, mode) {
  const policy = targetPace(role, mode);
  if (!policy.correctByVoice) {
    return { speed: policy.targetPace, corrected: false, clamped: false, ...policy };
  }
  const result = paceMultiplier({ paceRatio: effectivePaceRatio(voice), targetPace: policy.targetPace });
  return { ...result, role: policy.role, mode: policy.mode, targetPace: policy.targetPace };
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

/**
 * The playback multiplier for one voice at one target pace.
 *
 * @param {object} args
 * @param {number|null} args.paceRatio   effectivePaceRatio() for the voice, or null
 * @param {number} args.targetPace       the target from targetPace(role, mode),
 *                                       as a fraction of the language reference
 * @param {number} [args.min]            floor, default MIN_SPEED
 * @param {number} [args.max]            ceiling, default MAX_SPEED
 * @returns {{ speed: number, corrected: boolean, clamped: boolean, reason: string }}
 *   `corrected` says whether the voice's own pace changed anything, and
 *   `reason` says why in words — because a speed number with no explanation is
 *   exactly how the current ladder became impossible to reason about.
 */
function paceMultiplier({ paceRatio, targetPace, min = MIN_SPEED, max = MAX_SPEED }) {
  const target = toNumber(targetPace);
  if (target === null || target <= 0) {
    return { speed: 1.0, corrected: false, clamped: false, reason: 'no target pace given' };
  }
  if (paceRatio === null || paceRatio === undefined) {
    // UNMEASURED VOICE: the target number itself, uncorrected. This is the
    // invariant that makes shipping this safe — an unmeasured voice behaves
    // exactly as it would with no per-voice pace at all.
    const speed = clamp(target, min, max);
    return {
      speed,
      corrected: false,
      clamped: speed !== target,
      reason: 'voice has no measured pace — target used unchanged, uncorrected',
    };
  }
  const raw = target / paceRatio;
  const speed = clamp(raw, min, max);
  return {
    speed: round3(speed),
    corrected: true,
    clamped: speed !== raw,
    reason: speed === raw
      ? `voice speaks at ${round3(paceRatio)}x its language's reference, so ${round3(target)} target → ${round3(raw)}`
      : `voice speaks at ${round3(paceRatio)}x its language's reference (${round3(target)} target → ${round3(raw)}), clamped to ${round3(speed)}`,
  };
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
