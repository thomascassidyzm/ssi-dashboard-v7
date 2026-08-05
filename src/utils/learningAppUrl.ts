/**
 * The single place a learning-app deep link is constructed.
 *
 * The URL contract is FIXED and mirrored on the learner side:
 *   /?course=<code>[&round=<n>][&lego=<legoId>][&cycle=<n>][&cycleText=<text>]
 *
 * On the learner side `lego` is the authoritative anchor when present,
 * `round` is the human-readable fallback, and `cycle` is best-effort and
 * clamped. Param names, semantics and order must not drift from that.
 *
 * `cycleText` is the known-language text of the clicked row, and on the learner
 * side it BEATS `cycle` — the same "identity over ordinal" rule that makes
 * `lego` beat `round`. It has to: this view's round list comes from
 * `services/learning-script-generator.cjs`, a parallel reimplementation of the
 * learner app's generator, and the two have drifted. In deu_for_eng round 11
 * the player plays a bare-LEGO build this view omits and orders the USE phrases
 * differently, so the ordinal alone opened the row ABOVE the one clicked
 * (Tom, 2026-08-06). Sending the text makes the launch immune to that drift —
 * it does NOT fix the drift itself, which is tracked separately.
 */

export interface LearningAppUrlOptions {
  courseCode: string
  round?: number | null
  legoId?: string | null
  cycle?: number | null
  /** Known-language text of the clicked cycle; anchors the launch by identity. */
  cycleText?: string | null
}

const DEFAULT_BASE = 'https://saysomethingin.app'

/** A positive integer, or nothing at all — anything else degrades to omission. */
function positiveInt(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  if (!Number.isInteger(value) || value < 1) return null
  return value
}

export function buildLearningAppUrl(options: LearningAppUrlOptions): string {
  const { courseCode, round, legoId, cycle, cycleText } = options

  const configured = import.meta.env?.VITE_LEARNING_APP_URL as string | undefined
  const base = (configured || DEFAULT_BASE).replace(/\/+$/, '')

  // Order is part of the contract: course, round, lego, cycle, cycleText.
  let url = `${base}/?course=${encodeURIComponent(courseCode ?? '')}`

  const roundNumber = positiveInt(round)
  if (roundNumber !== null) url += `&round=${roundNumber}`

  if (typeof legoId === 'string' && legoId.trim() !== '') {
    url += `&lego=${encodeURIComponent(legoId)}`
  }

  const cycleNumber = positiveInt(cycle)
  if (cycleNumber !== null) url += `&cycle=${cycleNumber}`

  // Only meaningful alongside a cycle — on its own it names no row.
  if (cycleNumber !== null && typeof cycleText === 'string' && cycleText.trim() !== '') {
    url += `&cycleText=${encodeURIComponent(cycleText.trim())}`
  }

  return url
}
