#!/usr/bin/env node
/**
 * tom-voice-language-gate.cjs — Tom's Cartesia clone speaks ENGLISH ONLY.
 *
 * STANDING POLICY (Tom, 2026-08-27): `tom_001` must never voice a target-language
 * line. Pods are per-language; his clone is the English side of every one of them.
 *
 * ── The defect this closes ──────────────────────────────────────────────────
 * The Pod 1 manifest selected lines by CAST — `speakers[<name>].known.voice_id`
 * is Tom's xAI clone. That answers WHICH SPEAKER, correctly. It does not answer
 * WHICH LANGUAGE, and those are different questions: the cast is a property of
 * the character, the language is a property of the line. Selecting on cast alone
 * leaves nothing between Tom's voice and a Spanish sentence except the
 * CONVENTION that the known track holds English — enforced nowhere, across 5,082
 * rows nobody re-reads. One mis-slotted row and his voice ships in Spanish.
 *
 * So the filter is not "is this Tom's speaker" but "is this Tom's speaker AND is
 * this line, as actually written, English". It reads the TEXT. Never the `role`,
 * never the `language` column, never the track name, never the speaker — those
 * are precisely the fields that would be wrong in the case this gate exists for.
 *
 * ── Four layers, cheapest and most decisive first ───────────────────────────
 *  1. NON-LATIN SCRIPT — Arabic, CJK, Devanagari, Hangul, Cyrillic, Greek,
 *     Hebrew, Thai. Absolute: English does not use them. Covers 7 of Pod 1's 22.
 *  2. KNOWN === TARGET — if a slot's two sides carry the same text, the sides are
 *     not distinguishable and "the English side" is not a claim the data
 *     supports. Structural, script-independent, and the only layer that catches
 *     a straight field swap between two Latin-script languages.
 *  3. FOREIGN FUNCTION-WORD DOMINANCE — the Latin-script targets' own function
 *     words. Deliberately excludes words English shares ("no", "a", "in", "me"),
 *     because a shared word is evidence of nothing.
 *  4. ENGLISH CHARACTER-TRIGRAM LIKELIHOOD — a generative model of English
 *     orthography (`tom-voice-english-model.json`). Generative, not
 *     discriminative, on purpose: a discriminative English-vs-foreign model can
 *     only separate languages it was TRAINED on, and the next pod is always an
 *     unseen language. Measured: the discriminative version passed 562 of 1001
 *     unseen-language lines. This one passes 1.
 *
 * ── Three outcomes, never two ───────────────────────────────────────────────
 * A score above ACCEPT is English. Below REJECT is not. BETWEEN THEM IS HELD —
 * surfaced for a human, never silently rendered and never silently dropped. The
 * band exists because the honest residue of any text-only test is the short
 * bare-noun line: "October. November. December." and "Un milione. 80. 90." look
 * alike to every statistic, and the drill lines in Pod 1 are exactly that shape.
 * A gate that pretends to adjudicate those would be lying about its own reach.
 *
 * ── Text is not audio ───────────────────────────────────────────────────────
 * This gate bounds what gets SENT to the renderer. It cannot bound what a
 * multilingual clone SAYS. The decisive check is a whisper `-l auto` pass on the
 * rendered clip before its link is swapped — see `assertEnglishAudio` in
 * `pod1-tom-voice-render.cjs`. Text gate first because it is free; audio gate
 * last because it cannot be fooled.
 *
 * ── Calibrated, not asserted ────────────────────────────────────────────────
 * Validated HELD-OUT: trained on half the distinct Pod 1 English lines and 11
 * languages, tested on the other half and on 11 languages it had never seen.
 * Numbers live in `tom-voice-language-gate.test.cjs`, which re-derives them, so
 * they cannot rot into a stale comment. The SHIPPED model is the same method
 * trained on all 288 distinct English lines — more data than the validated one.
 *
 * Usage:
 *   const { isEnglishLine, filterEnglishOnly } = require('./tom-voice-language-gate.cjs')
 *   const v = isEnglishLine(text, { targetText })   // -> { ok, verdict, why, score }
 */
'use strict'

const fs = require('fs')
const path = require('path')

/** Scripts English does not use. One match is decisive. */
const NON_LATIN = /[Ͱ-ϿЀ-ӿ԰-֏֐-׿؀-ۿ܀-ݏऀ-ॿ฀-๿぀-ヿ㐀-䶿一-鿿가-힯]/

/**
 * Function words of the Latin-script Pod 1 target languages. ONLY words that are
 * not also English words — "no", "a", "e", "en", "in", "la", "me", "on", "so",
 * "un", "is" are all absent on purpose.
 */
const FOREIGN = new Set(`el los las una unos unas del y pero que porque está están soy eres somos estoy 
  muy más como qué cómo dónde cuándo gracias buenos buenas días tardes noches hola 
  señor señora usted por para je il elle nous vous ils elles est suis êtes avez 
  avec pour dans sur les des aux cette qui quoi où quand comment merci bonjour 
  bonsoir oui monsieur madame très tout une io lui lei noi voi loro sono sei siamo 
  siete che perché dove quando grazie buongiorno buonasera signore signora molto 
  tutto senza ele nós eles elas estão obrigado obrigada bom noite senhor senhora 
  muito com sem ich er wir ihr der dem ein eine einen sind nicht auch noch schon 
  sehr danke guten morgen abend herr frau bitte ik hij zij wij jullie het een dank 
  goedemorgen mevrouw jag han hon en inte också mycket tack hej eg hann hún við þið 
  það ekki mjög takk góðan daginn sunt sunteți foarte mulțumesc bună ziua domnule 
  doamnă atá agus níl tá agam agat leat liom conas duit da ne jesam jeste hvala 
  dobar gospodine gospođo vrlo milione mille`.trim().split(/\s+/))

// ── The trigram model ────────────────────────────────────────────────────────
const MODEL_PATH = path.join(__dirname, 'tom-voice-english-model.json')
let MODEL = null
function model () {
  if (!MODEL) MODEL = JSON.parse(fs.readFileSync(MODEL_PATH, 'utf8'))
  return MODEL
}

/**
 * Operating point, chosen on the held-out experiment and fixed here so a caller
 * cannot quietly widen the gate. ACCEPT is where unseen-language leakage goes to
 * ~0. REJECT sits BELOW the lowest-scoring real English line in the corpus
 * ("October. November. December.", -8.42) on purpose: a bare-noun English line
 * must land in the HOLD band where a human sees it, never in the reject bin
 * where it would be silently lost. Rejecting is safe; losing Tom's line quietly
 * is not honest.
 */
const ACCEPT = -7.60
const REJECT = -8.60

/** Digits out (they are language-neutral), whitespace collapsed, bounded by spaces. */
function normalise (s) {
  return ' ' + String(s == null ? '' : s)
    .toLowerCase()
    .replace(/[\d.,!?¿¡:;—"()\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() + ' '
}

function trigrams (s) {
  const t = normalise(s)
  const out = []
  for (let i = 0; i + 3 <= t.length; i++) out.push(t.slice(i, i + 3))
  return out
}

/** Mean log P(trigram | English). Length-normalised so short lines are comparable. */
function englishScore (text) {
  const m = model()
  const g = trigrams(text)
  if (!g.length) return -99
  const denom = m.total + m.alpha * m.vocab
  let s = 0
  for (const x of g) s += Math.log(((m.counts[x] || 0) + m.alpha) / denom)
  return s / g.length
}

function words (s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[^a-zà-öø-ÿāăąćčđēėęěğīįıłńňōőœŕřśşšţťūůűųźżž'\s]/g, ' ')
    .split(/\s+/).filter(Boolean)
}

/** Normalise for the known-vs-target identity check. */
function ident (s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9à-öø-ÿ]/gi, '')
}

/**
 * Is this line English?
 *
 * @param {string} text                the line as actually written
 * @param {object} [opts]
 * @param {string} [opts.targetText]   the slot's target-side twin, when known
 * @returns {{ok:boolean, verdict:'english'|'not-english'|'hold', why:string, score:number}}
 *          `ok` is true ONLY for 'english'. 'hold' is not a pass.
 */
function isEnglishLine (text, opts = {}) {
  const raw = String(text == null ? '' : text)
  if (!raw.trim()) return { ok: false, verdict: 'not-english', why: 'empty line', score: -99 }

  // 1. Non-Latin script.
  const script = raw.match(NON_LATIN)
  if (script) {
    return { ok: false, verdict: 'not-english', why: `non-Latin script in the text (${JSON.stringify(script[0])})`, score: -99 }
  }

  // 2. The two sides of the slot are the same text.
  if (opts.targetText != null && ident(opts.targetText) && ident(raw) === ident(opts.targetText)) {
    return { ok: false, verdict: 'not-english', why: 'known text is identical to the target text — the sides are indistinguishable', score: -99 }
  }

  const score = englishScore(raw)

  // 3. Foreign function words present at all, with no English score to spare.
  const fo = words(raw).filter((w) => FOREIGN.has(w))
  if (fo.length && score < ACCEPT + 1.0) {
    return { ok: false, verdict: 'not-english', why: `target-language function words present (${[...new Set(fo)].slice(0, 6).join(', ')})`, score }
  }

  // 4. English orthography.
  if (score >= ACCEPT) return { ok: true, verdict: 'english', why: 'English', score }
  if (score < REJECT) return { ok: false, verdict: 'not-english', why: `English trigram score ${score.toFixed(2)} below ${REJECT}`, score }
  return { ok: false, verdict: 'hold', why: `English trigram score ${score.toFixed(2)} is in the undecided band [${REJECT}, ${ACCEPT}) — a human must adjudicate; typically a short bare-noun drill line`, score }
}

/**
 * Gate a candidate list. Returns every line in exactly one of three buckets and
 * NEVER silently truncates — callers must report `rejected` and `held`.
 *
 * @param {Array<{known_text:string, target_text?:string}>} lines
 */
function filterEnglishOnly (lines) {
  const kept = []; const rejected = []; const held = []
  for (const l of lines || []) {
    const v = isEnglishLine(l.known_text, { targetText: l.target_text })
    const tagged = { ...l, language_verdict: v.verdict, language_why: v.why, english_score: Number(v.score.toFixed(3)) }
    if (v.verdict === 'english') kept.push(tagged)
    else if (v.verdict === 'hold') held.push(tagged)
    else rejected.push(tagged)
  }
  return { kept, rejected, held }
}

module.exports = { isEnglishLine, filterEnglishOnly, englishScore, ACCEPT, REJECT, NON_LATIN, FOREIGN }
