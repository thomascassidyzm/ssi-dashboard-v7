#!/usr/bin/env node
/**
 * insert-ellipsis-seams.cjs — ellipsis-authoring pass (founder ruling,
 * docs/pods/pod-ladder-proposal.md §9a, 2026-07-16). Inserts '…' (U+2026, the
 * single Unicode ellipsis character — never three ASCII dots) into
 * listening_pod_sentences.target_text at intention/finite-clause boundaries,
 * so no resulting piece exceeds the pod level's syllable ceiling C
 * (pod-0: C=8, pod-1 and onward: C=12). Amends §9's independent-meaning seam
 * model — it does not replace it: '…' marks BREATHING within one
 * independent-meaning phrase, never a substitute for a genuine phrase split.
 *
 * TEXT-ONLY. Never touches known_text. Never renders/synthesizes audio — a
 * re-render for touched pod-0 rows goes through the normal audio-pass queue
 * (queue-audio-pass.cjs), never run from here.
 *
 *   node tools/insert-ellipsis-seams.cjs <course> <pod-level> <ceiling C> [orders] [--dry]
 *   node tools/insert-ellipsis-seams.cjs hrv_for_eng 0 8 --dry
 *   node tools/insert-ellipsis-seams.cjs hrv_for_eng 1 12
 *
 * Same skeleton as tools/breakdown-fine.cjs (dotenv, supabase client, claude
 * CLI via execFile with CLAUDECODE unset, --dry flag, concurrency worker pool).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { execFile } = require('child_process')

const COURSE = process.argv[2]
const POD_LEVEL = process.argv[3]
const CEILING = Number(process.argv[4])
const ORDERS = (process.argv[5] && !process.argv[5].startsWith('--') ? process.argv[5] : '')
  .split(',').map(Number).filter(Boolean)
const dry = process.argv.includes('--dry')
const MODEL = process.env.ELLIPSIS_MODEL || 'opus'

if (!COURSE || POD_LEVEL === undefined || !CEILING) {
  console.error('usage: insert-ellipsis-seams.cjs <course> <pod-level 0|1|2|3> <ceiling C> [orders] [--dry]')
  process.exit(1)
}
const POD_ID = `${COURSE}:pod-${POD_LEVEL}`
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

function claude(prompt) {
  return new Promise((res, rej) => {
    const e = { ...process.env }; delete e.CLAUDECODE
    execFile(process.env.HOME + '/.local/bin/claude', ['--print', '--model', MODEL, prompt], { env: e, maxBuffer: 1 << 22 },
      (err, o) => err ? rej(err) : res(o.trim()))
  })
}

// Croatian syllable count (adapted from scripts/pod-hrv/analyze.cjs): vowels
// a/e/i/o/u count as one nucleus each, plus syllabic r flanked by consonants
// on both sides (or word boundary), e.g. "vrt", "trg", "krv". HRV-specific —
// fine for now, since this backfill pass is hrv_for_eng-only (pod-0/pod-1).
function countSyllables(text) {
  const words = (text || '').toLowerCase()
    .replace(/[.,!?;:„"“”'’()\-–—…]/g, ' ')
    .split(/\s+/).filter(Boolean)
  let total = 0
  for (const w of words) {
    const vowels = (w.match(/[aeiou]/g) || []).length
    let syllabicR = 0
    for (let i = 0; i < w.length; i++) {
      if (w[i] !== 'r') continue
      const prev = w[i - 1], next = w[i + 1]
      const prevVowel = prev && 'aeiou'.includes(prev)
      const nextVowel = next && 'aeiou'.includes(next)
      if (!prevVowel && !nextVowel) syllabicR++
    }
    let count = vowels + syllabicR
    if (count === 0) count = 1
    total += count
  }
  return total
}

// Split on sentence-ending punctuation AND '…' (the seam this pass itself
// creates) — mirrors the sentence-boundary split in tools/breakdown-fine.cjs.
function splitPieces(text) {
  return String(text || '').split(/(?<=[.!?…])/).map(s => s.trim()).filter(Boolean)
}

// Fidelity check: strip '…' and collapse whitespace, everything else must
// match character-for-character (NFC-normalized) — the LLM may ONLY insert
// '…', nothing else may change.
const stripEllipsis = (s) => String(s || '').normalize('NFC').replace(/…/g, '').replace(/\s+/g, ' ').trim()

// The mark attaches directly to the preceding word (no space before it) and
// is followed by exactly one space — some LLM outputs stray a space in front.
const normalizeEllipsisSpacing = (s) => String(s || '').replace(/\s+…/g, '…').replace(/…\s+/g, '… ').trim()

const RULES = (ceiling) => `You insert '…' (the single Unicode ellipsis character U+2026, NOT three ASCII dots) into a Croatian sentence/turn's TARGET text at intention/finite-clause boundaries, so that every resulting piece — split on '.', '!', '?', and '…' — has AT MOST ${ceiling} syllables.

RULES:
- Insert the FEWEST '…' marks that bring every piece to <= ${ceiling} syllables.
- Only place '…' at a genuine finite-clause / intention boundary — a seam between two clauses that could each stand as their own thought. A coordinator or subordinator ("i", "ali", "pa", "jer", "da", "kad", "nego"...) ALWAYS stays attached to the clause it introduces — it never dangles alone before the '…'.
- NEVER change, add, or remove any word, letter, or existing punctuation. Your output must be EXACTLY the input text with only '…' marks inserted at chosen points.
- If a single clause has NO internal intention boundary and still exceeds the ceiling even at its best split point, insert one '…' at the best available prosodic point anyway (e.g. before a trailing adverbial, or after the verb phrase) — do your best; a human will review this case.
- If every piece is already <= ${ceiling} syllables, return the text completely unchanged (no '…' added).

Return ONLY the resulting text — no preamble, no quotes, no explanation, no markdown.`

// Forced mechanical fallback (used only when the LLM's attempt fails the
// fidelity check, or still leaves a piece over ceiling): insert '…' in the
// single worst-offending piece at the closest-to-midpoint space, preferring a
// point right after a comma or right before a coordinator/subordinator if one
// exists nearby. Always flagged for founder review — this is the "forced
// mid-clause split" case in §9a.
const COORD_RE = /^(i|ali|pa|ili|jer|da|kad|nego)$/i
function forceSplit(text, ceiling) {
  const pieces = splitPieces(text)
  let rebuilt = ''
  for (const piece of pieces) {
    if (countSyllables(piece) <= ceiling) { rebuilt += (rebuilt ? ' ' : '') + piece; continue }
    const m = piece.match(/^(.*?)([.!?…]*)$/s)
    const body = (m ? m[1] : piece).trim()
    const trail = m ? m[2] : ''
    const words = body.split(/\s+/)
    if (words.length < 2) { rebuilt += (rebuilt ? ' ' : '') + piece; continue }
    const mid = words.length / 2
    let bestIdx = -1, bestDist = Infinity
    for (let i = 1; i < words.length; i++) {
      const prevEndsComma = /,$/.test(words[i - 1])
      const isCoord = COORD_RE.test(words[i].replace(/[,.]/g, ''))
      if (prevEndsComma || isCoord) {
        const dist = Math.abs(i - mid)
        if (dist < bestDist) { bestDist = dist; bestIdx = i }
      }
    }
    if (bestIdx === -1) bestIdx = Math.max(1, Math.round(mid))
    const left = words.slice(0, bestIdx).join(' ').replace(/,$/, '')
    const right = words.slice(bestIdx).join(' ')
    rebuilt += (rebuilt ? ' ' : '') + `${left}… ${right}${trail}`
  }
  return rebuilt
}

async function processTurn(row, ceiling) {
  const pieces = splitPieces(row.target_text)
  const overlong = pieces.filter(p => countSyllables(p) > ceiling)
  if (!overlong.length) return null // already fits, untouched

  const prompt = `${RULES(ceiling)}\n\nKNOWN (context only, do not translate, do not output): ${row.known_text}\nTARGET: ${row.target_text}\n\nOutput:`
  let after
  try {
    after = await claude(prompt)
  } catch (e) {
    return { error: true, errorMessage: e.message }
  }
  after = after.trim().replace(/^["'“”]|["'“”]$/g, '')

  let finalText = after
  let flagged = false, flagReason = null

  if (stripEllipsis(after) !== stripEllipsis(row.target_text)) {
    // Model changed more than punctuation — reject its output entirely,
    // fall back to a mechanical forced split. Flagged for founder review.
    finalText = forceSplit(row.target_text, ceiling)
    flagged = true
    flagReason = 'LLM output failed text-fidelity check (changed more than \'…\' placement) — forced mechanical split applied instead'
  } else {
    const stillOver = splitPieces(finalText).filter(p => countSyllables(p) > ceiling)
    if (stillOver.length) {
      finalText = forceSplit(finalText, ceiling)
      flagged = true
      flagReason = 'a clause exceeded the ceiling with no internal intention boundary — forced mid-clause split, needs founder ear'
    }
  }

  finalText = normalizeEllipsisSpacing(finalText)
  if (!finalText.includes('…')) return null // nothing to change after all (defensive)

  return {
    finalText,
    beforeSyll: pieces.map(countSyllables),
    afterSyll: splitPieces(finalText).map(countSyllables),
    flagged, flagReason,
  }
}

;(async () => {
  let q = supabase.from('listening_pod_sentences')
    .select('id, pod_id, global_order, target_text, known_text')
    .eq('pod_id', POD_ID).order('global_order')
  if (ORDERS.length) q = q.in('global_order', ORDERS)
  const { data: rows, error } = await q
  if (error) { console.error('ERR:', error.message); process.exit(1) }
  if (!rows || !rows.length) { console.error(`no rows found for pod_id=${POD_ID}`); process.exit(1) }

  const log = []
  let touched = 0, flaggedCount = 0, skipped = 0, errored = 0

  const CONC = Number(process.env.ELLIPSIS_CONC || 8)
  let next = 0
  async function worker() {
    while (next < rows.length) {
      const row = rows[next++]
      const result = await processTurn(row, CEILING)
      if (!result) { skipped++; continue }
      if (result.error) {
        errored++
        console.log(`S${row.global_order}: ✗ LLM ERROR — ${result.errorMessage}`)
        continue
      }
      touched++
      if (result.flagged) flaggedCount++
      console.log(`S${row.global_order}: ${result.flagged ? '⚠ FLAGGED' : '✓'}`)
      console.log(`  before: ${row.target_text}`)
      console.log(`  after:  ${result.finalText}`)
      console.log(`  syllables before: [${result.beforeSyll.join(',')}] after: [${result.afterSyll.join(',')}]${result.flagged ? `  — ${result.flagReason}` : ''}`)
      const entry = {
        id: row.id, pod_id: row.pod_id, global_order: row.global_order,
        before: row.target_text, after: result.finalText,
        syllables_before: result.beforeSyll, syllables_after: result.afterSyll,
        flagged: result.flagged, flag_reason: result.flagReason || null,
      }
      log.push(entry)
      if (!dry) {
        const { error: upErr } = await supabase.from('listening_pod_sentences').update({ target_text: result.finalText }).eq('id', row.id)
        if (upErr) { entry.write_error = upErr.message; console.error(`  WRITE FAILED: ${upErr.message}`) }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONC, rows.length) }, worker))

  console.log(`\n${dry ? '[DRY] ' : ''}${POD_ID} @ C=${CEILING}: ${touched} touched, ${flaggedCount} flagged, ${errored} errored, ${skipped} already fit (of ${rows.length} total).`)

  if (!dry) {
    const outDir = path.join(__dirname, 'course-optimization')
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
    const outPath = path.join(outDir, `ellipsis-pass-${COURSE}-pod${POD_LEVEL}-log.json`)
    fs.writeFileSync(outPath, JSON.stringify(log, null, 2))
    console.log(`Log written: ${outPath}`)
  }
  process.exit(0)
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
