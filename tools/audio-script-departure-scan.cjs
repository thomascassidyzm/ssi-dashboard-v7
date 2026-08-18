#!/usr/bin/env node
/**
 * audio-script-departure-scan.cjs — find clips where the synthesiser was sent
 * something other than the text we stored against the clip.
 *
 * HOW IT WORKS. Azure's SDK emits a WordBoundary event per token during
 * synthesis; services/tts-service.cjs generateAzure() captures those into
 * course_audio.word_boundaries. Nothing in the pipeline has ever read them
 * back. Comparing that token stream against course_audio.text finds every
 * clip where the two disagree.
 *
 * WHAT IT DOES *NOT* PROVE — read this before believing a flag.
 * WordBoundary echoes the text that was SENT to the synthesiser (post any
 * TTS-input-only rewrite), not a transcript of the audio that came out. So:
 *   - It DOES catch the pipeline rewriting text behind the clip's back — the
 *     gender-adaptation pass (services/gender-haiku-service.cjs) is the big
 *     one, and authoring annotations leaking into the spoken string.
 *   - It CANNOT catch a TTS hallucination. If the correct text went in and the
 *     voice said something else, text and word_boundaries still agree and this
 *     scanner is silent. Only ASR or a human ear finds that class.
 *
 * COVERAGE. Azure only. xAI, ElevenLabs and cloned voices return no boundary
 * events at all, so those rows are permanently invisible here. A second,
 * older word_boundaries shape — [[offset, duration]] with no token text —
 * is also blind; it is reported separately as `no-text-in-wb` rather than
 * being silently counted as a match.
 *
 * Usage:  node tools/audio-script-departure-scan.cjs <course_code> [--json out.json]
 * Needs DATABASE_URL in .env.psql at the repo root.
 */

// Arabic tashkeel + tatweel, Hebrew niqqud/te'amim: Azure may echo them or not.
const DIACRITICS = /[ؐ-ًؚ-ٟـٰۖ-ۭ֑-ׇ]/g

/**
 * Fold both sides to a comparable stream. Every rule here exists to absorb a
 * measured false-positive class, not a hypothetical one:
 *  - the " … " pause cue lives in stored text but is a <break> to Azure
 *  - applyShortWordHint()/applyRegenerationVariation() append punctuation to
 *    the TTS input only, so all punctuation has to go
 *  - Azure tokenises differently from whitespace (it emits "— 'You" as one
 *    token and "," as its own), so whitespace cannot be trusted either
 */
function norm (s) {
  if (!s) return ''
  return s.normalize('NFC')
    .replace(/\s*…\s*/g, ' ')
    .replace(DIACRITICS, '')
    .replace(/[\p{P}\p{S}]/gu, '')
    .replace(/\s+/gu, '')
    .toLowerCase()
}

function compare (text, wb) {
  if (!Array.isArray(wb) || wb.length === 0) return { verdict: 'no-wb' }
  if (Array.isArray(wb[0])) return { verdict: 'no-text-in-wb' }
  const spoken = wb.map(w => w && w.text).filter(Boolean).join(' ')
  if (!spoken.trim()) return { verdict: 'no-text-in-wb' }
  if (norm(text) === norm(spoken)) return { verdict: 'match', spoken }
  return { verdict: 'MISMATCH', spoken }
}

/** Word pairs that differ, for a human-readable "x => y" summary. */
function diffTokens (text, spoken) {
  const A = text.split(/\s+/).filter(Boolean)
  const B = spoken.split(/\s+/).filter(Boolean)
  const out = []
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    if (norm(A[i] || '') !== norm(B[i] || '')) out.push([A[i] || '—', B[i] || '—'])
  }
  return out
}

module.exports = { norm, compare, diffTokens }

if (require.main === module) {
  const fs = require('fs')
  const { Client } = require('pg')
  const course = process.argv[2]
  if (!course) { console.error('usage: audio-script-departure-scan.cjs <course_code> [--json out.json]'); process.exit(1) }
  const jsonIdx = process.argv.indexOf('--json')
  const url = fs.readFileSync('.env.psql', 'utf8').match(/DATABASE_URL=["']?([^"'\n]+)/)[1]

  ;(async () => {
    const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
    await c.connect()
    // course_audio is ~2.4M rows estate-wide and the server enforces a
    // statement timeout — always scope to one course per query.
    const { rows } = await c.query(
      `select id, text, role, voice_id, s3_key, word_boundaries
         from course_audio
        where course_code = $1 and word_boundaries is not null`, [course])
    const tally = { match: 0, MISMATCH: 0, 'no-wb': 0, 'no-text-in-wb': 0 }
    const flagged = []
    for (const r of rows) {
      const v = compare(r.text, r.word_boundaries)
      tally[v.verdict]++
      if (v.verdict === 'MISMATCH') {
        flagged.push({ id: r.id, role: r.role, voice_id: r.voice_id, s3_key: r.s3_key,
          text: r.text, spoken: v.spoken, diff: diffTokens(r.text, v.spoken) })
      }
    }
    console.log(`${course}: ${rows.length} rows with word_boundaries`)
    for (const [k, n] of Object.entries(tally)) if (n) console.log(`  ${k}: ${n}`)
    console.log(`  detectable: ${tally.match + tally.MISMATCH}  flagged: ${tally.MISMATCH}`)
    for (const f of flagged.slice(0, 40)) {
      console.log(`  ${f.role} ${f.voice_id} | ${f.text} => ${f.spoken}`)
    }
    if (jsonIdx > -1) {
      fs.writeFileSync(process.argv[jsonIdx + 1], JSON.stringify({ course, tally, flagged }, null, 2))
      console.log(`wrote ${flagged.length} flags to ${process.argv[jsonIdx + 1]}`)
    }
    await c.end()
  })().catch(e => { console.error('ERR', e.message); process.exit(1) })
}
