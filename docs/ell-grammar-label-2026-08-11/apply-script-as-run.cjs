#!/usr/bin/env node
/* ell_for_eng — propagate the resolved LEGO known_text onto the LEGO's own
 * practice phrase where that phrase carries the LEGO's exact target but stale
 * pre-disambiguation English. This is the residue of the grammar-label
 * cleanup: the LEGO text was disambiguated, its phrases were not.
 *
 * Candidate rule (all three must hold):
 *   1. the phrase sits at the LEGO's own seed_number/lego_index
 *   2. norm(phrase.target_text) == norm(lego.target_text)     <- it IS the lego
 *   3. norm(phrase.known_text) != norm(lego.known_text)       <- and it drifted
 *   4. the phrase is currently inside a live ZUT collision group
 *
 * DRY_RUN=1 by default. Per-row before-state assertion; aborts on drift.
 * Writes a log to docs/ell-grammar-label-2026-08-11/.
 */
const { Client } = require('pg')
const fs = require('fs')
const path = require('path')
const DB = /DATABASE_URL=(.*)/.exec(fs.readFileSync(__dirname + '/../.env.psql', 'utf8'))[1].trim().replace(/^["']|["']$/g, '')
const CC = 'ell_for_eng'
const APPLY = process.env.APPLY === '1'
const norm = s => (s || '').toLowerCase().trim().replace(/\s+/g, ' ')

const zutGroups = phrases => {
  const m = new Map()
  for (const p of phrases) {
    if (p.phrase_role === 'component') continue
    const k = norm(p.known_text); if (!k) continue
    if (!m.has(k)) m.set(k, []); m.get(k).push(p)
  }
  const g = []
  for (const [k, es] of m) {
    const t = [...new Set(es.map(e => norm(e.target_text)))]
    if (t.length > 1) g.push({ known: k, targets: t, ids: es.map(e => e.id) })
  }
  return g
}

;(async () => {
  const c = new Client({ connectionString: DB }); await c.connect()
  const legos = (await c.query('select lego_id, seed_number, lego_index, known_text, target_text from course_legos where course_code=$1', [CC])).rows
  const phrases = (await c.query('select id, seed_number, lego_index, phrase_role, known_text, target_text, known_audio_id from course_practice_phrases where course_code=$1', [CC])).rows
  const legoBy = new Map(legos.map(l => [`${l.seed_number}/${l.lego_index}`, l]))

  const before = zutGroups(phrases)
  const inCollision = new Set(before.flatMap(g => g.ids))

  const cands = []
  for (const p of phrases) {
    if (p.phrase_role === 'component') continue
    if (!inCollision.has(p.id)) continue
    const l = legoBy.get(`${p.seed_number}/${p.lego_index}`)
    if (!l) continue
    if (norm(p.target_text) !== norm(l.target_text)) continue
    if (norm(p.known_text) === norm(l.known_text)) continue
    cands.push({ id: p.id, lego: l.lego_id, role: p.phrase_role,
      from: p.known_text, to: l.known_text, target: p.target_text,
      known_audio_id: p.known_audio_id })
  }

  // simulate
  const sim = phrases.map(p => {
    const c2 = cands.find(x => x.id === p.id)
    return c2 ? { ...p, known_text: c2.to } : p
  })
  const after = zutGroups(sim)
  const beforeK = new Set(before.map(g => g.known))
  const afterK = new Set(after.map(g => g.known))
  const newlyCreated = after.filter(g => !beforeK.has(g.known))
  const resolved = before.filter(g => !afterK.has(g.known))

  console.log(`candidate edits: ${cands.length}`)
  console.log(`ZUT collision groups  before: ${before.length}   after: ${after.length}`)
  console.log(`  resolved by the edit: ${resolved.length}`)
  console.log(`  NEWLY CREATED by the edit: ${newlyCreated.length}`)
  newlyCreated.forEach(g => console.log(`    !! "${g.known}" -> ${g.targets.join(' | ')}  (${g.ids.join(', ')})`))
  console.log(`English clips (known_audio_id) made stale by the edit: ${cands.filter(x => x.known_audio_id).length}`)
  console.log('')
  cands.forEach(x => console.log(`  ${x.id}  [${x.role}]  "${x.from}"  ->  "${x.to}"   (${x.target})`))

  if (newlyCreated.length) { console.error('\nABORT: the edit would create new collisions.'); await c.end(); process.exit(1) }

  const outDir = path.join(__dirname, '..', 'docs', 'ell-grammar-label-2026-08-11')
  fs.mkdirSync(outDir, { recursive: true })
  const log = { course: CC, mode: APPLY ? 'applied' : 'dryrun', rule: 'phrase.known_text := its own LEGO.known_text where phrase.target == lego.target and the phrase is in a live ZUT collision group', count: cands.length, before_groups: before.length, after_groups: after.length, resolved_groups: resolved.map(g => g.known), rows: cands }

  if (APPLY) {
    let done = 0
    for (const x of cands) {
      // known_audio_id is deliberately LEFT IN PLACE. Make-before-break: the old
      // English clip says the old words, but nulling the link would leave the
      // learner with silence on that prompt until a new clip exists. The stale
      // clips are listed in the log for the regeneration pass instead.
      const r = await c.query('update course_practice_phrases set known_text=$1, updated_at=now() where course_code=$2 and id=$3 and known_text=$4 returning id', [x.to, CC, x.id, x.from])
      if (r.rowCount !== 1) { console.error(`ABORT: before-state drift on ${x.id}`); await c.end(); process.exit(1) }
      done++
    }
    console.log(`\nAPPLIED ${done} rows. known_audio_id left in place on all of them —`)
    console.log(`the old English clip now says the old words and needs re-rendering.`)
  } else {
    console.log('\nDRY RUN — nothing written. Re-run with APPLY=1 to write.')
  }
  fs.writeFileSync(path.join(outDir, `zut-propagation-${APPLY ? 'applied' : 'dryrun'}-log.json`), JSON.stringify(log, null, 2))
  await c.end()
})().catch(e => { console.error(e); process.exit(1) })
