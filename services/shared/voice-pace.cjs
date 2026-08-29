/**
 * PER-VOICE NATURAL PACE — one definition of the arithmetic, shared by
 * everything that needs it.
 *
 * Tom, 2026-08-29:
 *   "we're minting everything at 1.0x but the target languages are then played
 *    at lower speeds for the first few belts on a kind of ramp-up process …
 *    White belt = 0.8x, Y = 0.9, O = 0.95 and G = 1.0 … but that seems a bit
 *    too blunt for my liking, intuitively"
 *
 * ── WHY IT IS BLUNT, IN ONE PARAGRAPH ───────────────────────────────────────
 * The ladder multiplies. 0.8x of a brisk voice and 0.8x of a measured voice are
 * not the same experience — they are not even close. Measured on 2026-08-29
 * across clips genuinely rendered at 1.0x, the English `known` voices span
 * 0.78x to 1.41x of their own language's median. A white belt (0.8) on the
 * fastest of them plays at 1.13 of the median pace; a green belt (1.0) on the
 * slowest plays at 0.78. THE BEGINNER IS HEARING FASTER SPEECH THAN THE
 * INTERMEDIATE. That is the bluntness, and it is not a matter of taste.
 *
 * ── THE FIX: THE LADDER EXPRESSES A TARGET, NOT A MULTIPLIER ────────────────
 * A belt names the pace a learner at that belt should HEAR, as a fraction of
 * the language's median natural pace. The per-voice multiplier then falls out:
 *
 *     multiplier = targetPace / voicePaceRatio
 *
 * A voice at exactly the language median (ratio 1.0) gets the belt number
 * unchanged, so "white belt = 0.8" keeps its familiar meaning and only the
 * per-voice correction is new. That is the whole design.
 *
 * ── WHAT THIS MODULE DELIBERATELY DOES NOT DO ───────────────────────────────
 * It does not know about belts, seeds, courses or the player. It is the
 * arithmetic and the clamp, and nothing else — the same shape as
 * language-voice-cast.cjs, so the Popty side and the learner app can share one
 * definition rather than growing two that drift.
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
 * language's median is played at its own natural pace and no faster; the
 * correction is one-sided until Tom says otherwise.
 *
 * DEFAULT taken 2026-08-29, flagged for Tom rather than ruled by him.
 */
const MAX_SPEED = 1.0;

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
 * @param {number} args.targetPace       the belt's target, as a fraction of the
 *                                       language median (0.8 = white, 1.0 = green)
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
    // UNMEASURED VOICE: the belt number itself, which is today's behaviour to
    // the digit. This is the invariant that makes shipping this safe.
    const speed = clamp(target, min, max);
    return {
      speed,
      corrected: false,
      clamped: speed !== target,
      reason: 'voice has no measured pace — belt target used unchanged, as today',
    };
  }
  const raw = target / paceRatio;
  const speed = clamp(raw, min, max);
  return {
    speed: round3(speed),
    corrected: true,
    clamped: speed !== raw,
    reason: speed === raw
      ? `voice speaks at ${round3(paceRatio)}x its language's median, so ${round3(target)} target → ${round3(raw)}`
      : `voice speaks at ${round3(paceRatio)}x its language's median (${round3(target)} target → ${round3(raw)}), clamped to ${round3(speed)}`,
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

module.exports = { effectivePaceRatio, paceMultiplier, combineMeasurements, MIN_SPEED, MAX_SPEED };
