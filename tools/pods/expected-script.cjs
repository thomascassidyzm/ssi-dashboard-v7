'use strict'
/**
 * expected-script.cjs — "is this line written in the writing system we asked for?"
 *
 * The failure this catches is a model answering in the WRONG LANGUAGE ENTIRELY — a
 * Bengali slot coming back in English, a Japanese slot coming back in pinyin. It is not
 * a character-hygiene check: shared punctuation, digits, currency and whitespace are
 * deliberately permitted in every script, because a correct Bengali line legitimately
 * contains "8" and "!".
 *
 * Lifted out of write-pod-drafts.cjs 2026-09-19 so the drafter and the pod builder
 * cannot drift apart on what "japanese" means. One table, two callers, one test.
 */

/**
 * ZWNJ (U+200C) and ZWJ (U+200D). Invisible joiner controls, category Cf, so \p{M} does
 * not cover them — and they are not decoration: Sinhala writes its conjuncts with an
 * explicit ZWJ (ර්‍ය), and Devanagari, Bengali, Tamil and Persian all use one or both to
 * force or suppress a ligature. Omitting them failed 30 of 231 correct Sinhala lines as
 * "not sinhala script" on 2026-09-19. A joiner can never be evidence that a model
 * answered in the wrong language, which is the only thing this gate is for.
 */
const JOINERS = '\u200C\u200D'

const SCRIPTS = {
  latin: new RegExp(`^[\\p{Script=Latin}\\p{M}\\p{N}\\p{P}\\p{Zs}\\p{Sc}${JOINERS}‐-‧]*$`, 'u'),
  cyrillic: new RegExp(`^[\\p{Script=Cyrillic}\\p{M}\\p{N}\\p{P}\\p{Zs}\\p{Sc}${JOINERS}‐-‧]*$`, 'u'),
  greek: new RegExp(`^[\\p{Script=Greek}\\p{M}\\p{N}\\p{P}\\p{Zs}\\p{Sc}${JOINERS}‐-‧]*$`, 'u'),
  arabic: new RegExp(`^[\\p{Script=Arabic}\\p{M}\\p{N}\\p{P}\\p{Zs}\\p{Sc}${JOINERS}‐-‧]*$`, 'u'),
  hebrew: new RegExp(`^[\\p{Script=Hebrew}\\p{M}\\p{N}\\p{P}\\p{Zs}\\p{Sc}${JOINERS}‐-‧]*$`, 'u'),
  // Japanese and Chinese mix scripts by design, so these are unions, not single blocks.
  japanese: new RegExp(`^[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{M}\\p{N}\\p{P}\\p{Zs}\\p{Sc}${JOINERS}‐-‧ー]*$`, 'u'),
  han: new RegExp(`^[\\p{Script=Han}\\p{M}\\p{N}\\p{P}\\p{Zs}\\p{Sc}${JOINERS}‐-‧]*$`, 'u'),
  // Added 2026-09-19 for the six South Asian known sides the canonical-231 build drafts.
  bengali: new RegExp(`^[\\p{Script=Bengali}\\p{M}\\p{N}\\p{P}\\p{Zs}\\p{Sc}${JOINERS}‐-‧]*$`, 'u'),
  gujarati: new RegExp(`^[\\p{Script=Gujarati}\\p{M}\\p{N}\\p{P}\\p{Zs}\\p{Sc}${JOINERS}‐-‧]*$`, 'u'),
  gurmukhi: new RegExp(`^[\\p{Script=Gurmukhi}\\p{M}\\p{N}\\p{P}\\p{Zs}\\p{Sc}${JOINERS}‐-‧]*$`, 'u'),
  sinhala: new RegExp(`^[\\p{Script=Sinhala}\\p{M}\\p{N}\\p{P}\\p{Zs}\\p{Sc}${JOINERS}‐-‧]*$`, 'u'),
  tamil: new RegExp(`^[\\p{Script=Tamil}\\p{M}\\p{N}\\p{P}\\p{Zs}\\p{Sc}${JOINERS}‐-‧]*$`, 'u'),
  devanagari: new RegExp(`^[\\p{Script=Devanagari}\\p{M}\\p{N}\\p{P}\\p{Zs}\\p{Sc}${JOINERS}‐-‧]*$`, 'u'),
  hangul: new RegExp(`^[\\p{Script=Hangul}\\p{M}\\p{N}\\p{P}\\p{Zs}\\p{Sc}${JOINERS}‐-‧]*$`, 'u'),
  thai: new RegExp(`^[\\p{Script=Thai}\\p{M}\\p{N}\\p{P}\\p{Zs}\\p{Sc}${JOINERS}‐-‧]*$`, 'u'),
  any: /^[\s\S]*$/u,
}

/** True when `text` contains no letters from outside `script`. */
function inScript (script, text) {
  const re = SCRIPTS[script]
  if (!re) throw new Error(`unknown script "${script}"; one of ${Object.keys(SCRIPTS).join(', ')}`)
  return re.test(String(text == null ? '' : text).normalize('NFC'))
}

module.exports = { SCRIPTS, inScript }
