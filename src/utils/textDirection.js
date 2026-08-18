/**
 * Text direction detection for bidirectional (RTL) course content.
 *
 * WHY THIS EXISTS
 * ---------------
 * Arabic target text rendered inside an LTR paragraph puts trailing neutral
 * punctuation on the WRONG side. Deborah (native reviewer) reported it on
 * 2026-08-17 for `ara_lb_for_eng`:
 *
 *   "Is `!` still placed on the wrong side in Arabic (appearing right, like
 *    English, should be left/end-of-sentence)?"  — `?` was fine.
 *
 * That asymmetry IS the diagnosis:
 *   - `؟` U+061F has Unicode bidi class AL (strong right-to-left). It joins the
 *     Arabic run and lands at the visual left whatever the paragraph direction.
 *   - `!` U+0021 has bidi class ON (neutral). A trailing neutral inherits the
 *     PARAGRAPH direction, so under an LTR paragraph it is pushed to the visual
 *     right. Same for `.` `,` `:` `;` quotes and brackets, and for any Arabic
 *     string that starts or ends with digits or Latin characters.
 *
 * The text is stored correctly in Supabase — only the display is wrong. The fix
 * is `dir="rtl"` (plus bidi isolation where a run is interpolated into a
 * mixed-direction line), never a content edit and never `text-align` alone:
 * alignment moves the block but still resolves the neutral against the wrong
 * paragraph direction.
 *
 * DETECTION, NOT CONFIGURATION
 * ----------------------------
 * Direction is read from the SCRIPT OF THE TEXT, never from a course code and
 * never from an allowlist of Arabic course slugs. Course codes lie about their
 * language (`spa_mx_for_eng` has `target_lang = 'spa'`), and detection means
 * Hebrew, Persian, Urdu, Syriac, N'Ko and any future RTL course get this for
 * free with no further code changes.
 *
 * DUPLICATION DEBT: this is a verbatim port of the learning app's
 * `packages/core/src/text/direction.ts`. Popty does not consume `@ssi/core`, so
 * the two copies must be changed together — same shape as `syllable-counters`.
 */

/**
 * Scripts whose letters have a strong right-to-left bidi class (R or AL).
 * Matched against letters only — Arabic-Indic digits (٠-٩) are Script=Arabic
 * but bidi class AN (weak), so a string of digits alone must NOT read as RTL.
 */
const RTL_SCRIPT =
  /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Adlam}\p{Script=Mende_Kikakui}\p{Script=Hanifi_Rohingya}]/u

const LETTER = /\p{L}/u

function countStrongLetters(text) {
  const counts = { rtl: 0, ltr: 0 }
  for (const char of text) {
    if (!LETTER.test(char)) continue
    if (RTL_SCRIPT.test(char)) counts.rtl++
    else counts.ltr++
  }
  return counts
}

/**
 * True when `text` should be laid out right-to-left.
 *
 * Majority rule over strong letters, not first-strong-character: target strings
 * legitimately open with a Latin loanword, a numeral or a quote mark, and the
 * first-strong heuristic (what `dir="auto"` does) gets exactly those cases
 * wrong — which is the bug class we are fixing.
 *
 * @param {string|null|undefined} text
 * @returns {boolean}
 */
export function isRtlText(text) {
  if (!text) return false
  const { rtl, ltr } = countStrongLetters(text)
  return rtl > 0 && rtl >= ltr
}

/**
 * The value to bind to a `dir` attribute for `text`.
 *
 * Returns a concrete direction rather than `'auto'` on purpose: `auto` defers to
 * the browser's first-strong-character rule, which is the very heuristic that
 * mis-renders Arabic strings opening with Latin text or digits.
 *
 * Empty, whitespace-only, digit-only and punctuation-only strings return
 * `'ltr'` — there is no RTL content to protect, and claiming `rtl` there would
 * flip neutral UI values such as counts and timestamps.
 *
 * @param {string|null|undefined} text
 * @returns {'ltr'|'rtl'}
 */
export function dirFor(text) {
  return isRtlText(text) ? 'rtl' : 'ltr'
}

/* Unicode bidi isolate controls — the plaintext equivalent of `dir` + `unicode-bidi: isolate`. */
const LRI = '⁦' // LEFT-TO-RIGHT ISOLATE
const RLI = '⁧' // RIGHT-TO-LEFT ISOLATE
const PDI = '⁩' // POP DIRECTIONAL ISOLATE

/**
 * Wrap `text` in bidi isolate controls so it lays out in its OWN direction
 * inside a surrounding run of the opposite one.
 *
 * For the ordinary case — an element that paints target text — bind `dir` on
 * that element instead; the attribute is the better primitive and leaves no
 * invisible characters in the string. This exists for the slots where no
 * element can be nested and so no `dir` can be bound: the text content of an
 * `<option>` (which also carries an LTR "12. " index prefix), and any place a
 * target string is concatenated into a plaintext label.
 *
 * RLI/LRI are chosen explicitly from `isRtlText` rather than using FSI
 * (U+2068), which would defer to the same first-strong-character guess that
 * `dir="auto"` makes and that this module exists to avoid.
 *
 * @param {string|null|undefined} text
 * @returns {string} the isolated text, or '' for empty input
 */
export function isolateText(text) {
  if (!text) return ''
  return (isRtlText(text) ? RLI : LRI) + text + PDI
}
