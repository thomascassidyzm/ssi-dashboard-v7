#!/usr/bin/env node
/**
 * english-phrase-gap-count.cjs — HOW MANY ENGLISH PRACTICE-PHRASE LINES STILL WANT ARAN'S VOICE
 * (Aran, 2026-10-29, job #554). READ ONLY: writes nothing anywhere but stdout.
 *
 * Job #553 counted his missing English SEED lines; the practice phrases of the relaunch courses
 * (cym_nv2_for_eng North, cym_sv2_for_eng South) are far more. This counts them from the booth's
 * OWN plan (recordist-queue buildPhrasePlan → phrase-queue.cjs), so its numbers are the booth's:
 *
 *   - a LINE is one English text (spoken words) — identical English in North and South is ONE
 *     line, and one take fills both courses' empty slots (mergeAcrossCourses);
 *   - SHARED = a line whose copies sit in both courses; NORTH ONLY / SOUTH ONLY otherwise;
 *   - CARD = the booth card the line is shown on (the course whose batch reaches it first);
 *   - NO TAKE = not recorded by the booth's own test (phraseLineRecorded); HELD = every copy is
 *     flagged on the proof page, so the booth does not serve it yet (counted apart);
 *   - CHARACTERS = the line's text as the booth shows it, every character counted.
 *
 * Slots that already hold another voice's clip are not booth work (fill-empty only) and are not in
 * the plan; they are reported once, apart, as `heldByOtherVoice`, by re-cutting the same rows with
 * every slot treated as empty.
 *
 *   node tools/recording/english-phrase-gap-count.cjs [--voice human_aran_eng] [--json]
 */
'use strict'
const fs = require('fs')
const path = require('path')

const NORTH = 'cym_nv2_for_eng'
const SOUTH = 'cym_sv2_for_eng'

/** Which courses a merged line's copies sit in: 'shared' | 'north' | 'south'. */
function spanOf(line) {
  const cs = new Set((line.copies || []).map((c) => c.courseCode))
  if (cs.has(NORTH) && cs.has(SOUTH)) return 'shared'
  return cs.has(SOUTH) ? 'south' : 'north'
}

const emptyCell = () => ({ lines: 0, chars: 0 })
const add = (cell, line) => { cell.lines += 1; cell.chars += String(line.text || '').length }

/**
 * The tally. Pure.
 * @param {object[]} lines one reader's merged phrase lines (plan.byVoice)
 * @param {(line) => boolean} isRecorded the booth's recorded test
 */
function tallyPhraseGap(lines, isRecorded) {
  const out = {}
  for (const pass of [1, 2]) {
    out[pass] = {
      all: emptyCell(), recorded: emptyCell(), held: emptyCell(), noTake: emptyCell(),
      noTakeBySpan: { north: emptyCell(), south: emptyCell(), shared: emptyCell() },
      noTakeByCard: { [NORTH]: emptyCell(), [SOUTH]: emptyCell() },
    }
  }
  for (const l of lines) {
    const t = out[l.pass]
    if (!t) continue
    add(t.all, l)
    if (isRecorded(l)) { add(t.recorded, l); continue }
    if ((l.copies || []).every((c) => c.flagged)) { add(t.held, l); continue }
    add(t.noTake, l)
    add(t.noTakeBySpan[spanOf(l)], l)
    if (t.noTakeByCard[l.courseCode]) add(t.noTakeByCard[l.courseCode], l)
  }
  return out
}

/** English texts needed by the phrases at all (every slot treated as empty) that are not in `lines`. */
function notInPlan(allLines, lines) {
  const have = new Set(lines.map((l) => l.wordsKey))
  const out = { 1: emptyCell(), 2: emptyCell() }
  for (const l of allLines) if (!have.has(l.wordsKey) && out[l.pass]) add(out[l.pass], l)
  return out
}

async function main() {
  const argv = process.argv.slice(2)
  const at = argv.indexOf('--voice')
  const voice = at >= 0 ? argv[at + 1] : 'human_aran_eng'
  for (const p of [path.join(__dirname, '../../.env'), '/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env']) if (fs.existsSync(p) && !process.env.SUPABASE_URL) require('dotenv').config({ path: p, quiet: true })
  const { createClient } = require('@supabase/supabase-js')
  const q = require('../../services/voice-engine/recordist-queue.cjs')
  const phraseQueue = require('../../services/voice-engine/phrase-queue.cjs')
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const recordist = await q.resolveRecordist(db, voice)
  if (!recordist) throw new Error(`no recording voice ${voice}`)
  const memo = new Map()
  const plan = await q.buildPhrasePlan(db, memo)
  const lines = recordist.spellings.flatMap((sp) => plan.byVoice.get(sp) || [])
  const keys = await q.recordedTextKeys(db, recordist)
  const tally = tallyPhraseGap(lines, (l) => q.phraseLineRecorded(l, keys, recordist.spellings))

  // The same rows, every known slot treated as empty: what the courses need in English at all.
  const lists = []
  for (const code of [NORTH, SOUTH]) {
    const order = memo.get(`order:${code}`) || []
    const positions = new Map()
    for (const o of order) if (!positions.has(o.seed_number)) positions.set(o.seed_number, o.position)
    const cut = phraseQueue.planCourse({
      courseCode: code, positions, legos: memo.get(`legos:${code}`) || [], phrases: memo.get(`phrases:${code}`) || [],
      roles: { known: { holderOf: () => '', isMine: () => true } }, flagged: new Set(),
    })
    lists.push(cut.linesByRole.known)
  }
  const heldByOtherVoice = notInPlan(phraseQueue.mergeAcrossCourses(lists), lines)

  const result = { voice: recordist.voiceId, builtAt: plan.builtAt, tally, heldByOtherVoice }
  if (argv.includes('--json')) { console.log(JSON.stringify(result, null, 2)); return }
  const f = (c) => `${c.lines} lines, ${c.chars} chars`
  for (const pass of [1, 2]) {
    const t = tally[pass]
    console.log(`PASS ${pass}: ${f(t.all)} in the booth; recorded ${f(t.recorded)}; held ${f(t.held)}; NO TAKE ${f(t.noTake)}`)
    console.log(`  no take, by course: North only ${f(t.noTakeBySpan.north)} | South only ${f(t.noTakeBySpan.south)} | shared N+S ${f(t.noTakeBySpan.shared)}`)
    console.log(`  no take, by booth card: North ${f(t.noTakeByCard[NORTH])} | South ${f(t.noTakeByCard[SOUTH])}`)
    console.log(`  not in the booth (slot holds another voice's clip): ${f(heldByOtherVoice[pass])}`)
  }
}

module.exports = { spanOf, tallyPhraseGap, notInPlan }
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1) })
