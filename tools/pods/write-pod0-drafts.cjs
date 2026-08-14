#!/usr/bin/env node
/**
 * write-pod0-drafts.cjs — write machine-drafted target text into the empty pod-0
 * slots that align-pod0-to-canonical.cjs deliberately left blank.
 *
 * Generalised 2026-08-08 from write-pod0-welsh-drafts.cjs, which applied a hardcoded
 * literal drafts module. The write shape is unchanged and is the point of the file:
 * per-row `UPDATE … WHERE id=$1 AND known_text=$2 AND btrim(target_text)=''`, all in
 * one transaction, so a row that is no longer blank, or no longer carries the English
 * the draft was written against, matches zero rows and takes the whole run back.
 *
 * Drafts land with target_text_draft = true, which already renders as provisional in
 * the recording room. Nothing here overwrites a line that already has target text —
 * a carried-forward human line is unreachable by construction, not by convention.
 *
 * TEXT-ONLY QC. The gates below are the ones from the redo scope §7: expected script,
 * English passthrough, parentheses, emptiness, coverage. Whisper is deliberately NOT
 * used — it is a post-render audio tool and it misdetects short clips badly enough
 * that the tools which do use it need 4x looping and sibling verification to be
 * trusted at all. It is not a text validator.
 *
 * DRY RUN BY DEFAULT. Pass --apply to write.
 *
 *   node tools/pods/write-pod0-drafts.cjs --course=deu_at_for_eng \
 *     --drafts=scripts/pod-audit/deu_at_for_eng-drafts.json --script=latin
 *   … --apply
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const REPO = path.join(__dirname, '..', '..')
const APPLY = process.argv.includes('--apply')
const arg = (n) => {
  const a = process.argv.find(x => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : null
}
// Matches align-pod0-to-canonical.cjs's --pod-slug: on a live course the aligned
// queue lives on a parallel slug so learners keep reading an intact pod-0.
const POD_SLUG = arg('pod-slug') || 'pod-0'
const COURSE = arg('course')
const DRAFTS = arg('drafts')
const SCRIPT = (arg('script') || 'latin').toLowerCase()
if (!COURSE || !DRAFTS) {
  console.error('FAILED: --course=<code> and --drafts=<path/to/drafts.json> are both required')
  process.exit(1)
}
const abs = (p) => (path.isAbsolute(p) ? p : path.join(REPO, p))

// Expected-script gate. Ranges are deliberately permissive about shared punctuation
// and digits, and strict about the letters — the failure this catches is a model
// answering in the wrong language entirely, not a stray character.
const SCRIPTS = {
  latin: /^[\p{Script=Latin}\p{M}\p{N}\p{P}\p{Zs}\p{Sc}‐-‧]*$/u,
  cyrillic: /^[\p{Script=Cyrillic}\p{M}\p{N}\p{P}\p{Zs}\p{Sc}‐-‧]*$/u,
  greek: /^[\p{Script=Greek}\p{M}\p{N}\p{P}\p{Zs}\p{Sc}‐-‧]*$/u,
  arabic: /^[\p{Script=Arabic}\p{M}\p{N}\p{P}\p{Zs}\p{Sc}‐-‧]*$/u,
  hebrew: /^[\p{Script=Hebrew}\p{M}\p{N}\p{P}\p{Zs}\p{Sc}‐-‧]*$/u,
  // Added 2026-08-14 for the pod translation pass: hin/nep, hye, tha and kor all had
  // real translation debt and no script to gate them with, which would have meant
  // running them on `any` — i.e. with the strongest text gate switched off on four
  // languages nobody on the team reads.
  devanagari: /^[\p{Script=Devanagari}\p{M}\p{N}\p{P}\p{Zs}\p{Sc}‐-‧]*$/u,
  armenian: /^[\p{Script=Armenian}\p{M}\p{N}\p{P}\p{Zs}\p{Sc}‐-‧]*$/u,
  thai: /^[\p{Script=Thai}\p{M}\p{N}\p{P}\p{Zs}\p{Sc}‐-‧]*$/u,
  // Korean is written in Hangul but takes bare Han for the occasional proper noun.
  korean: /^[\p{Script=Hangul}\p{Script=Han}\p{M}\p{N}\p{P}\p{Zs}\p{Sc}‐-‧]*$/u,
  // Japanese and Chinese mix scripts by design, so these are unions, not single blocks.
  japanese: /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{M}\p{N}\p{P}\p{Zs}\p{Sc}‐-‧ー]*$/u,
  han: /^[\p{Script=Han}\p{M}\p{N}\p{P}\p{Zs}\p{Sc}‐-‧]*$/u,
  any: /^[\s\S]*$/u,
}
if (!SCRIPTS[SCRIPT]) {
  console.error(`FAILED: --script=${SCRIPT} unknown; one of ${Object.keys(SCRIPTS).join(', ')}`)
  process.exit(1)
}

const normalise = (t) => String(t == null ? '' : t).normalize('NFC').replace(/\s+/g, ' ').trim()

/** Every gate that can be judged from the text alone. Returns a list of failures. */
function qc(draft, englishText) {
  const t = normalise(draft.target_text)
  const fails = []
  if (!t) fails.push('empty target_text')
  if (!SCRIPTS[SCRIPT].test(t)) fails.push(`not ${SCRIPT} script`)
  // "No parentheses in the course — ever." Zero-explanation methodology: a learner
  // never sees an annotation, so a bracketed gloss is a defect, not a helpful note.
  if (/[()（）[\]]/.test(t)) fails.push('contains brackets or parentheses')
  if (/\[target language\]/i.test(t)) fails.push('unresolved [target language] token')
  if (normalise(englishText).toLowerCase() === t.toLowerCase()) fails.push('identical to the English — untranslated passthrough')
  return fails
}

;(async () => {
  const raw = JSON.parse(fs.readFileSync(abs(DRAFTS), 'utf8'))
  const drafts = Array.isArray(raw) ? raw : raw.drafts
  if (!Array.isArray(drafts) || !drafts.length) throw new Error(`${DRAFTS}: no drafts array`)

  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()
  const podId = `${COURSE}:${POD_SLUG}`
  const served = (await db.query(
    `select id, global_order, known_text, target_text, target_text_draft
       from listening_pod_sentences where pod_id=$1 order by global_order`, [podId])).rows
  if (!served.length) throw new Error(`${podId}: no rows`)
  const byOrder = new Map(served.map(r => [r.global_order, r]))

  const ops = []
  const rejected = []
  const skipped = []
  const seen = new Set()
  for (const d of drafts) {
    const row = byOrder.get(d.global_order)
    if (!row) { rejected.push({ ...d, why: ['no row at that global_order'] }); continue }
    if (seen.has(d.global_order)) { rejected.push({ ...d, why: ['duplicate global_order'] }); continue }
    seen.add(d.global_order)
    // A slot that already holds text is a carried-forward line. Never overwrite it.
    if (normalise(row.target_text)) { skipped.push({ id: row.id, global_order: d.global_order, reason: 'slot already has target text' }); continue }
    const why = qc(d, row.known_text)
    // The draft must have been written against the English the row actually serves.
    if (d.english_text && normalise(d.english_text) !== normalise(row.known_text)) {
      why.push('draft English does not match the row English')
    }
    if (why.length) { rejected.push({ id: row.id, global_order: d.global_order, target_text: d.target_text, why }); continue }
    ops.push({ id: row.id, global_order: d.global_order, english: row.known_text,
      target_text: normalise(d.target_text), note: d.note || null })
  }

  const blanks = served.filter(r => !normalise(r.target_text))
  const summary = {
    course: COURSE, pod_rows: served.length,
    blank_slots_before: blanks.length,
    drafts_supplied: drafts.length,
    will_write: ops.length,
    rejected_by_qc: rejected.length,
    skipped_slot_not_blank: skipped.length,
    blank_slots_remaining_after: blanks.length - ops.length,
  }
  const log = abs(`docs/pods/${COURSE}-pod0-drafts-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(log, JSON.stringify({ mode: APPLY ? 'APPLIED' : 'DRY RUN', summary, ops, rejected, skipped }, null, 1))

  if (rejected.length) {
    console.error(`QC REJECTED ${rejected.length} draft(s):`)
    for (const r of rejected.slice(0, 20)) console.error(`  [${r.global_order}] ${r.why.join('; ')}`)
  }
  if (!APPLY) {
    console.log(JSON.stringify({ mode: 'DRY RUN', summary, log }, null, 2))
    await db.end()
    return
  }
  // Refusing to write a partial set: a half-drafted pod is harder to reason about
  // than an undrafted one, and re-running after a fix costs nothing.
  if (rejected.length) throw new Error(`${rejected.length} draft(s) failed QC; nothing written. See ${log}`)

  try {
    await db.query('BEGIN')
    for (const op of ops) {
      const r = await db.query(
        `UPDATE listening_pod_sentences
            SET target_text = $1, target_text_draft = true, updated_at = now()
          WHERE id = $2 AND known_text = $3 AND btrim(target_text) = ''`,
        [op.target_text, op.id, op.english])
      if (r.rowCount !== 1) {
        throw new Error(`DRIFT ${op.id}: expected one blank row carrying the English the draft was written for, matched ${r.rowCount}; nothing written`)
      }
    }
    await db.query('COMMIT')
  } catch (e) {
    await db.query('ROLLBACK')
    throw e
  } finally {
    await db.end()
  }
  console.log(JSON.stringify({ mode: 'APPLIED', summary, log }, null, 2))
})().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
