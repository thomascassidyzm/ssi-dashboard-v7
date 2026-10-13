#!/usr/bin/env node
// tools/course-optimization/rechunk-short-legos/plan.cjs — job #321 (Tom 2026-10-13, re-chunk rollout GO)
//
// The per-seed chunk-up PLANNER #192 lacked. It PROPOSES; the pair decides. For every debut LEGO (is_new, seed 4+)
// that has fewer than 4 USE phrases it asks Sonnet for ONE op for that seed (the plan shape in lib.cjs: grow = set a
// LEGO in place; merge = delete the lower pieces and set the highest; replace = delete + add at a NEW index; topup =
// keep the cut, author fresh phrases), then asks Opus — cold, never shown Sonnet's reasoning — whether the op is
// right. Anything Opus rejects, or checkOp refuses, falls back to a plain top-up (no structural change), so the
// planner can never make a seed worse than leaving the cut alone. Learner positions are read first: an in-place
// change of a LEGO a learner stands on is refused at apply, so the planner is told those ids and steers around them
// (delete + add at a fresh index is always safe: a cursor on a deleted id falls back to the seed's start).
//   node plan.cjs <course> [--short N]     writes ops/rechunk-short-legos/plans/<course>.json (read-only on the DB)
'use strict'
const fs = require('fs'), path = require('path')
const R = require('./rechunk.cjs'), L = require('./lib.cjs')
const REPO = path.resolve(__dirname, '..', '..', '..')
const argv = process.argv.slice(2), COURSE = argv[0]
const SHORT = (() => { const i = argv.indexOf('--short'); return i > 0 ? Number(argv[i + 1]) : 4 })()

const SYS = `You plan how to re-chunk ONE seed of an SSi language course so that a debut LEGO can be practised well. Answer with ONE JSON object only.\n\n${R.RUBRIC_DIGEST}
Tom's rule: "if a LEGO has no (good) practice phrases the split is wrong: first chunk UP (merge into a bigger LEGO that can be introduced as an item and practised effectively); only if that will not work, re-chunk the seed." A LEGO is the unit of intention a learner could want to say (never a bare grammatical particle or a sound that only exists inside a larger chunk). The seed's own text is never changed. The LEGOs after the op must still cover every target word of the seed they covered before, use only words of the seed, and each target be at most 8 syllables. Do not change a LEGO that is already a sound, flexible unit: then the answer is "topup" (keep the cut, write fresh phrases).`
function opSpec(c) { return `OP SHAPE (omit what you do not need), indices are existing LEGO indices of this seed:
{"kind":"grow|merge|replace|topup","why":"one sentence","delete":[idx,...],"set":{"idx":{"type":"A|M","known":"...","target":"...","components":[{"known":"...","target":"..."}]}},"add":[{"idx":NEW,"type":"A|M","known":"...","target":"...","components":[...]}],"topup":[idx]}
- grow: "set" one LEGO in place to a bigger chunk of the seed (M needs >=2 components, A is one word).
- merge: "delete" the lower piece(s), "set" the HIGHEST index of the run to the merged chunk.
- replace: "delete" the old LEGO and "add" the new chunk at a NEVER-USED index (>= ${c.maxIdx + 1}); never reuse an existing index.
- topup: {"kind":"topup","topup":[idx]} — the LEGO is sound; it only needs more good phrases.
- Learners currently stand on these LEGOs, which therefore must NOT be set in place (delete + add instead, or topup): ${c.occupied.join(', ') || '(none)'}.
- known/target text of any LEGO must be words that appear in the seed's known/target sentence.` }
function proposePrompt(c) {
  return { system: SYS, user: `Course ${c.course}: learner speaks ${c.known}, learns ${c.target}.
SEED ${c.seed}: known "${c.seedKnown}" | target "${c.seedTarget}"
LEGOs now: ${c.legos.map((l) => `L${l.idx}[${l.type}${l.is_new ? '' : ',not-new'}] "${l.known}" = "${l.target}" (${l.nu} USE, ${l.nb} BUILD)`).join('; ')}
SHORT LEGO(S) TO FIX: ${c.short.map((l) => `L${l.idx}`).join(', ')}
${opSpec(c)}
Answer: {"op":{...}}` }
}
function judgePlanPrompt(c, op) {
  return { system: SYS.replace('You plan how to re-chunk', 'You are an independent judge of a proposed re-chunk of') + '\nYou did not write this op. Judge it cold.', user: `Course ${c.course}: learner speaks ${c.known}, learns ${c.target}.
SEED ${c.seed}: known "${c.seedKnown}" | target "${c.seedTarget}"
LEGOs now: ${c.legos.map((l) => `L${l.idx}[${l.type}] "${l.known}" = "${l.target}" (${l.nu} USE)`).join('; ')}
Short LEGO(S): ${c.short.map((l) => `L${l.idx}`).join(', ')}
PROPOSED OP: ${JSON.stringify(op)}
APPROVE only if: the op is a better split than the current one for what the learner will say (or, for topup, the LEGO is already a sound chunk); every new known/target pair is correct and ZUT-safe (one known -> one target), natural, and a real unit of intention; coverage of the seed is preserved; nothing is changed that was fine. Otherwise REJECT.
Answer: {"verdict":"APPROVE"|"REJECT","reason":"..."}` }
}
async function main() {
  const pg = await R.pgClient()
  const { estimateSyllables } = require(path.join(REPO, 'services/course-builder/lib/language-config.cjs'))
  const { target, known } = R.languages(COURSE)
  const { rows: cursors } = await pg.query('SELECT last_completed_lego_id a, highest_completed_lego_id b FROM course_enrollments WHERE course_id=$1', [COURSE])
  const occupiedAll = new Set(cursors.flatMap((c) => [c.a, c.b]).filter(Boolean))
  const { rows: shorts } = await pg.query(`SELECT l.seed_number, l.lego_index FROM course_legos l
    WHERE l.course_code=$1 AND l.is_new AND l.seed_number>=4 AND (SELECT count(*) FROM course_practice_phrases p WHERE p.course_code=l.course_code AND p.seed_number=l.seed_number AND p.lego_index=l.lego_index AND p.phrase_role='use')<$2
    ORDER BY 1,2`, [COURSE, SHORT])
  const bySeed = new Map(); for (const s of shorts) bySeed.set(s.seed_number, [...(bySeed.get(s.seed_number) || []), s.lego_index])
  const out = { course: COURSE, note: `Job #321 wave 1. Debut LEGOs (is_new, seed 4+) with fewer than ${SHORT} USE phrases. Proposed by Sonnet, judged cold by Opus, checked by checkOp; a rejected or refused op falls back to topup.`, seeds: [] }
  for (const [seed, idxs] of bySeed) {
    const live = await R.loadSeed(pg, COURSE, seed), before = R.asBefore(live.legos)
    const cnt = (i, role) => live.phrases.filter((p) => p.lego_index === i && p.phrase_role === role).length
    const c = { course: COURSE, known, target, seed, seedKnown: live.seed.known_text, seedTarget: live.seed.target_text,
      legos: before.map((l) => ({ ...l, nu: cnt(l.idx, 'use'), nb: cnt(l.idx, 'build') })), short: before.filter((l) => idxs.includes(l.idx)),
      maxIdx: Math.max(...before.map((l) => l.idx)), occupied: before.map((l) => L.legoId(seed, l.idx)).filter((id) => occupiedAll.has(id)) }
    const topup = { seed, kind: 'topup', why: 'fallback: keep the cut, author fresh good phrases', topup: idxs }
    let op = topup, note = ''
    try {
      const A = await R.callClaude('sonnet', proposePrompt(c).system, proposePrompt(c).user, `plan S${seed} sonnet`)
      const prop = { seed, ...A.json.op }
      const problems = L.checkOp(live.seed, before, prop, { estimateSyllables, courseCode: COURSE })
      const conflicts = L.cursorConflicts(seed, prop, cursors.map((x) => ({ last_completed_lego_id: x.a, highest_completed_lego_id: x.b })))
      // L31: a later not-new LEGO that relies on the exact pair this op removes or changes would be left with no debut
      const touched = before.filter((l) => (prop.delete || []).includes(l.idx) || (prop.set || {})[l.idx])
      const l31 = []
      for (const t of touched) {
        const { rows } = await pg.query('SELECT lego_id FROM course_legos WHERE course_code=$1 AND seed_number>$2 AND NOT is_new AND lower(known_text)=lower($3) AND lower(target_text)=lower($4)', [COURSE, seed, t.known, t.target])
        for (const r of rows) l31.push(r.lego_id)
      }
      if (l31.length) note = `L31: ${l31.join(', ')} is not-new on a pair this op removes`
      else if (problems.length) note = 'checkOp refused: ' + problems.join('; ')
      else if (conflicts.length) note = `${conflicts.length} learner(s) on a changed LEGO`
      else if (prop.kind === 'topup') op = { ...prop, seed, topup: prop.topup && prop.topup.length ? prop.topup : idxs }
      else {
        const B = await R.callClaude('opus', judgePlanPrompt(c, A.json.op).system, judgePlanPrompt(c, A.json.op).user, `plan S${seed} opus`)
        if (String(B.json.verdict).toUpperCase() === 'APPROVE') op = { ...prop, judged: { opus: 'APPROVE', reason: B.json.reason } }
        else note = 'Opus rejected: ' + B.json.reason
      }
    } catch (e) { note = 'planner error: ' + e.message }
    // a structural op must still top up any short LEGO it leaves unchanged
    if (op.kind !== 'topup') { const w = new Set(L.workLegos(before, op).map((l) => l.idx)); const left = idxs.filter((i) => !w.has(i) && !(op.delete || []).includes(i)); if (left.length) op.topup = [...(op.topup || []), ...left] }
    if (note) op.fellBackBecause = note
    console.error(`S${seed}: ${op.kind}${note ? ' (' + note.slice(0, 160) + ')' : ''}`)
    out.seeds.push(op)
    fs.writeFileSync(R.planPath(COURSE), JSON.stringify(out, null, 1) + '\n')
  }
  await pg.end()
}
main().catch((e) => { console.error(e.stack || e.message); process.exit(1) })
