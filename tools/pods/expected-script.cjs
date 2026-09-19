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

const SCRIPTS = {
  latin: /^[\p{Script=Latin}\p{M}\p{N}\p{P}\p{Zs}\p{Sc}‐-‧]*$/u,
  cyrillic: /^[\p{Script=Cyrillic}\p{M}\p{N}\p{P}\p{Zs}\p{Sc}‐-‧]*$/u,
  greek: /^[\p{Script=Greek}\p{M}\p{N}\p{P}\p{Zs}\p{Sc}‐-‧]*$/u,
  arabic: /^[\p{Script=Arabic}\p{M}\p{N}\p{P}\p{Zs}\p{Sc}‐-‧]*$/u,
  hebrew: /^[\p{Script=Hebrew}\p{M}\p{N}\p{P}\p{Zs}\p{Sc}‐-‧]*$/u,
  // Japanese and Chinese mix scripts by design, so these are unions, not single blocks.
  japanese: /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{M}\p{N}\p{P}\p{Zs}\p{Sc}‐-‧ー]*$/u,
  han: /^[\p{Script=Han}\p{M}\p{N}\p{P}\p{Zs}\p{Sc}‐-‧]*$/u,
  // Added 2026-09-19 for the six South Asian known sides the canonical-231 build drafts.
  bengali: /^[\p{Script=Bengali}\p{M}\p{N}\p{P}\p{Zs}\p{Sc}‐-‧]*$/u,
  gujarati: /^[\p{Script=Gujarati}\p{M}\p{N}\p{P}\p{Zs}\p{Sc}‐-‧]*$/u,
  gurmukhi: /^[\p{Script=Gurmukhi}\p{M}\p{N}\p{P}\p{Zs}\p{Sc}‐-‧]*$/u,
  sinhala: /^[\p{Script=Sinhala}\p{M}\p{N}\p{P}\p{Zs}\p{Sc}‐-‧]*$/u,
  tamil: /^[\p{Script=Tamil}\p{M}\p{N}\p{P}\p{Zs}\p{Sc}‐-‧]*$/u,
  devanagari: /^[\p{Script=Devanagari}\p{M}\p{N}\p{P}\p{Zs}\p{Sc}‐-‧]*$/u,
  thai: /^[\p{Script=Thai}\p{M}\p{N}\p{P}\p{Zs}\p{Sc}‐-‧]*$/u,
  any: /^[\s\S]*$/u,
}

/** True when `text` contains no letters from outside `script`. */
function inScript (script, text) {
  const re = SCRIPTS[script]
  if (!re) throw new Error(`unknown script "${script}"; one of ${Object.keys(SCRIPTS).join(', ')}`)
  return re.test(String(text == null ? '' : text).normalize('NFC'))
}

module.exports = { SCRIPTS, inScript }
