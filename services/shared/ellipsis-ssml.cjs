/**
 * Ellipsis → SSML break shim (founder steer 2026-07-16, docs/pods/chunk-granularity-state-of-play-2026-07-16.md §5).
 *
 * '…' in target_text is the single canonical breathing mark, placed at
 * intention/finite-clause boundaries. xAI renders it natively (~400ms pause,
 * verified render-test). Azure's neural voices pass '…' straight through with
 * no audible gap (verified, same render-test) — so every Azure SSML build
 * must substitute each '…' for an explicit <break time="400ms"/>, which is
 * proven mastering-clean on this cast (chunked-take-recipe.md §1).
 *
 * xAI/ElevenLabs text is NOT touched by this module — '…' reaches them as
 * literal text unchanged.
 */

const ELLIPSIS_BREAK_MS = 400

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Build the SSML BODY (no <speak>/<voice>/<prosody> wrapper) for Azure,
 * substituting every '…' for a <break> tag. Each surrounding text segment is
 * XML-escaped individually so the break tag itself is never escaped.
 *
 * @param {string} text - source text, may contain '…' breathing marks
 * @param {number} breakMs - pause duration in ms (default 400, the verified value)
 * @returns {string} SSML-safe body string with <break time="Nms"/> in place of '…'
 */
function ellipsisToSSMLBreaks(text, breakMs = ELLIPSIS_BREAK_MS) {
  return String(text || '')
    .split('…')
    .map(escapeXml)
    .join(`<break time="${breakMs}ms"/>`)
}

module.exports = { ellipsisToSSMLBreaks, ELLIPSIS_BREAK_MS }
