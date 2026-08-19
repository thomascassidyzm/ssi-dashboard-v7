#!/usr/bin/env node
/**
 * decide.cjs — turn the two probes' measurements into the DENY list that
 * services/audio-veracity.cjs carries as DECODER_NOT_VALIDATED.
 *
 * Kept separate from the probes on purpose: they measure, this judges, so the
 * rule can be re-argued against the same decodes without paying for whisper
 * again.
 *
 * THE RULE. A language is denied the gate only when all three agree:
 *
 *   (a) SEPARATION < 0.25   (probe.cjs)
 *       Median CER against the clip's own text vs against distractor texts from
 *       the same language. A decoder that reads the language separates the two
 *       by 0.29-0.92. A dead one emits the same output whatever the input, so
 *       the two converge. No amount of damaged audio produces that: damage
 *       lowers scores by the fraction of clips damaged, it does not make the
 *       decode independent of the input.
 *
 *   (b) OWN CER > 0.5       (probe.cjs)
 *       The decode is not merely un-discriminating, it is far from the script.
 *
 *   (c) FALSE NEGATIVES >= 80%   (proof.cjs)
 *       On clips whose Azure word_boundaries independently prove the full
 *       script was spoken through to the end of the clip. Every gate failure
 *       there is a false negative by construction.
 *
 * THREE CONDITIONS, NOT ONE, because each alone is wrong in a way the estate
 * can demonstrate:
 *
 *   (c) alone put GERMAN in the deny list at 67% — the language the 0.3
 *       threshold was FITTED on. Estate German is largely Austrian dialect
 *       script ("a Glasl Wossa" -> "Akklassewasser"); the decoder hears it
 *       perfectly and separates at 0.61. Armenian fails 93% because the text is
 *       numerals ("100. … 200.") which the decoder correctly SPELLS OUT. Those
 *       are comparison bugs, not capability bugs, and un-gating them here would
 *       be a different fix wearing this one's clothes.
 *
 *   (a) alone would rest the whole change on one statistic with no operational
 *       meaning.
 *
 * A language with no proof.cjs sample cannot satisfy (c) and is therefore NEVER
 * denied — absence of evidence does not un-gate anything. Same for a language
 * that was never probed at all: it keeps its gate. Unchecked audio reaching a
 * learner is the worse failure, and a gate that wrongly BLOCKS fails loudly and
 * gets investigated, which is exactly how the Sinhala case surfaced.
 *
 * Exits non-zero if the committed DECODER_NOT_VALIDATED no longer matches what
 * these measurements imply — so re-running it is a check, not just a report.
 *
 * Usage: node tools/whisper-capability-probe/decide.cjs [results.json] [proof.json]
 */
const fs = require('fs')
const path = require('path')
const veracity = require('../../services/audio-veracity.cjs')

const MAX_SEPARATION = 0.25
const MIN_OWN_CER = 0.5
const MIN_FALSE_NEGATIVE_PCT = 80
const MIN_PROVEN_CLIPS = 10

const resultsFile = process.argv[2] || path.join(__dirname, 'results.json')
const proofFile = process.argv[3] || path.join(__dirname, 'proof.json')
const R = JSON.parse(fs.readFileSync(resultsFile, 'utf8'))
const P = fs.existsSync(proofFile) ? JSON.parse(fs.readFileSync(proofFile, 'utf8')) : {}

const rows = []
for (const [lang, r] of Object.entries(R)) {
  const p = P[lang]
  const sep = (r.median_cross_cer != null && r.median_own_cer != null)
    ? +(r.median_cross_cer - r.median_own_cer).toFixed(3) : null
  const proven = p ? p.proven_complete_clips : 0
  const fn = proven >= MIN_PROVEN_CLIPS ? p.false_negative_pct : null
  const reasons = p ? p.reasons || {} : {}

  const a = sep != null && sep < MAX_SEPARATION
  const b = r.median_own_cer != null && r.median_own_cer > MIN_OWN_CER
  const c = fn != null && fn >= MIN_FALSE_NEGATIVE_PCT

  rows.push({
    lang,
    iso1: r.iso1,
    sep,
    ownCER: r.median_own_cer,
    falseNegPct: fn,
    provenClips: proven,
    lastWordFails: reasons.last_word_missing || 0,
    a: a ? 'Y' : '.',
    b: b ? 'Y' : '.',
    c: c ? 'Y' : (fn == null ? '?' : '.'),
    verdict: (a && b && c) ? 'DENY (skip gate)' : 'KEEP GATED',
  })
}

rows.sort((x, y) => (x.sep ?? 9) - (y.sep ?? 9))
console.table(rows)

const deny = rows.filter(r => r.verdict.startsWith('DENY'))
const noProof = rows.filter(r => r.c === '?')
console.log(`\nrule: separation < ${MAX_SEPARATION} AND own CER > ${MIN_OWN_CER} AND false negatives >= ${MIN_FALSE_NEGATIVE_PCT}% on >= ${MIN_PROVEN_CLIPS} proven-complete clips`)
console.log(`\nDENY (${deny.length}) — these skip the gate:`)
for (const r of deny) console.log(`  ${r.iso1} (${r.lang})  sep=${r.sep}  ownCER=${r.ownCER}  falseNeg=${r.falseNegPct}%`)
console.log(`\nno proof sample, so never deniable (${noProof.length}): ${noProof.map(r => r.iso1).join(' ')}`)

const live = [...(veracity.DECODER_NOT_VALIDATED || [])].sort()
const derived = deny.map(r => r.iso1).sort()
const agree = JSON.stringify(live) === JSON.stringify(derived)
console.log(`\nDECODER_NOT_VALIDATED in services/audio-veracity.cjs: [${live.join(', ')}]`)
console.log(`derived from these measurements:                       [${derived.join(', ')}]`)
console.log(agree ? '✅ the code matches the evidence' : '❌ MISMATCH — the code and the measurements disagree')
process.exit(agree ? 0 : 1)
