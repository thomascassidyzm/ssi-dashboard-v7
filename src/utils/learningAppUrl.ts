/**
 * The single place a learning-app deep link is constructed.
 *
 * The URL contract is FIXED and mirrored on the learner side:
 *   /?course=<code>[&round=<n>][&lego=<legoId>][&cycle=<n>]
 *
 * On the learner side `lego` is the authoritative anchor when present,
 * `round` is the human-readable fallback, and `cycle` is best-effort and
 * clamped. Param names, semantics and order must not drift from that.
 */

export interface LearningAppUrlOptions {
  courseCode: string
  round?: number | null
  legoId?: string | null
  cycle?: number | null
}

const DEFAULT_BASE = 'https://saysomethingin.app'

/** A positive integer, or nothing at all — anything else degrades to omission. */
function positiveInt(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  if (!Number.isInteger(value) || value < 1) return null
  return value
}

export function buildLearningAppUrl(options: LearningAppUrlOptions): string {
  const { courseCode, round, legoId, cycle } = options

  const configured = import.meta.env?.VITE_LEARNING_APP_URL as string | undefined
  const base = (configured || DEFAULT_BASE).replace(/\/+$/, '')

  // Order is part of the contract: course, round, lego, cycle.
  let url = `${base}/?course=${encodeURIComponent(courseCode ?? '')}`

  const roundNumber = positiveInt(round)
  if (roundNumber !== null) url += `&round=${roundNumber}`

  if (typeof legoId === 'string' && legoId.trim() !== '') {
    url += `&lego=${encodeURIComponent(legoId)}`
  }

  const cycleNumber = positiveInt(cycle)
  if (cycleNumber !== null) url += `&cycle=${cycleNumber}`

  return url
}
