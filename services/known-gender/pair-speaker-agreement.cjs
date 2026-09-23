/**
 * PAIR SPEAKER-AGREEMENT CHECK (job #941·H, 2026-09-23).
 *
 * A stored known-side gender pair (expanded_m / expanded_f) is only usable
 * for the two-voice design when the difference between the two forms is the
 * SPEAKER's gender — verbs and adjectives agreeing with मैं / हम. Two other
 * kinds of agreement produce a pair that looks the same but is not:
 *
 *   - THIRD PERSON: वह काम करता है / वह काम करती है = "he works" / "she works".
 *     The English fixes the subject; rewriting the Hindi to the other form
 *     changes the meaning. Never a speaker pair.
 *   - OBJECT / NOUN agreement: मैंने फ़िल्म देखी (ergative, agrees with the
 *     feminine object) — a "male form" मैंने फ़िल्म देखा is simply wrong Hindi.
 *     मुझे लग रहा है — रहा agrees with the (masculine) noun, not the speaker.
 *
 * Addressee agreement (आप कर रहे हैं / कर रही हैं, "you are doing") is left
 * alone: either voice may address either gender, so both forms are valid
 * renderings of the English and the choice is harmless.
 *
 * Deterministic pre-filter (bucketPairs): a pair where NEITHER the English
 * nor either Hindi form carries a first-person marker cannot be a speaker
 * pair unless the row is a pronoun-less chunk of a first-person sentence
 * ("wanted to send" → भेजना चाहता था), and a pair whose English names a
 * third person (he / she / him / her …) may be mixed. Both buckets go to the
 * judge (Claude CLI, never the SDK — CLAUDE.md); the rest are speaker pairs
 * by construction. Pure builders and parsers here; the runner is the tool.
 */

const FIRST_EN = /\b(i|i'm|i'll|i've|i'd|me|my|mine|myself|we|we're|we'll|we've|we'd|us|our|ours|ourselves)\b/i
const FIRST_HI = /(^|\s)(मैं|मुझे|मैंने|मेरा|मेरी|मेरे|मुझसे|मुझको|हम|हमें|हमने|हमारा|हमारी|हमारे|हमसे)(\s|$|[।?,!])|हूँ/u
const THIRD_EN = /\b(he|she|his|her|hers|him|himself|herself|he's|she's|he'll|she'll|he'd|she'd)\b/i

/**
 * rows: [{ id, known_text, target_text, m, f }] — one per gendered row.
 * Returns { speaker: [...], toJudge: [...] } with a `bucket` on each.
 */
function bucketPairs(rows) {
  const speaker = [], toJudge = []
  for (const r of rows) {
    const first = FIRST_EN.test(r.target_text || '') || FIRST_HI.test(r.m || '') || FIRST_HI.test(r.f || '')
    if (!first) toJudge.push({ ...r, bucket: 'no-first-person' })
    else if (THIRD_EN.test(r.target_text || '')) toJudge.push({ ...r, bucket: 'third-person-in-english' })
    else speaker.push({ ...r, bucket: 'speaker' })
  }
  return { speaker, toJudge }
}

function judgePrompt(items) {
  const lines = items.map((r, i) => `${i + 1}. id=${r.id}\n   English: ${r.target_text}\n   M: ${r.m}\n   F: ${r.f}`).join('\n')
  return `You are checking machine-generated Hindi gender pairs for a language course where Hindi is the learner's KNOWN language and English is the answer. Each item has an English sentence or chunk and two Hindi renderings, M and F, which are supposed to differ ONLY in the SPEAKER's gender (verb/adjective agreement with मैं / हम, or with an understood first-person subject in a pronoun-less chunk).

For each item answer with exactly one verdict:
- SPEAKER: the M/F difference is speaker agreement only. Both forms are correct Hindi for the English.
- NOT_SPEAKER: the difference is NOT about the speaker — it is third-person subject agreement (वह करता/करती = he/she), object/ergative agreement (मैंने फ़िल्म देखी), noun agreement (मुझे लग रहा है), or one of the forms is simply wrong Hindi. Give the ONE correct form for the English in "correct".
- MIXED: the F form changes the speaker's agreement correctly AND ALSO wrongly changes something that must not move (a third-person verb, an object-agreeing verb). Give the corrected F form in "correct" (speaker feminine, everything else as in M).

Ignore addressee agreement (आप … रहे/रही हैं): treat a pair that differs only or additionally in how "you" is addressed as SPEAKER when the speaker agreement is right, since either voice may address either gender.

Items:
${lines}

Reply with JSON only: {"verdicts":[{"id":"<id>","verdict":"SPEAKER|NOT_SPEAKER|MIXED","correct":"<Hindi or null>","why":"<one short clause>"}]} — one entry per item, every id present.`
}

function parseJudgeReply(text, items) {
  const m = String(text || '').match(/\{[\s\S]*\}/)
  if (!m) return { error: 'no JSON in reply', raw: String(text || '').slice(0, 500) }
  let j
  try { j = JSON.parse(m[0]) } catch (e) { return { error: 'bad JSON: ' + e.message, raw: m[0].slice(0, 500) } }
  if (!j || !Array.isArray(j.verdicts)) return { error: 'no verdicts array', raw: m[0].slice(0, 500) }
  const byId = new Map(j.verdicts.map(v => [String(v.id), v]))
  const missing = items.filter(it => !byId.has(String(it.id))).map(it => it.id)
  const bad = j.verdicts.filter(v => !['SPEAKER', 'NOT_SPEAKER', 'MIXED'].includes(v.verdict)).map(v => v.id)
  return { verdicts: j.verdicts, missing, bad }
}

module.exports = { bucketPairs, judgePrompt, parseJudgeReply, FIRST_EN, FIRST_HI, THIRD_EN }
