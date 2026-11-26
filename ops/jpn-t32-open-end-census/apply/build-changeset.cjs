#!/usr/bin/env node
// cs #234·AL: turn the #225·AL hand-classified census (../rows.csv) into three changesets, from FILES only (no DB).
//   node build-changeset.cjs <copy.json> <live.json> <outDir>
//   copy.json = tools/course-optimization/course-dump-readonly-2026-10-14.cjs jpn_for_eng on the 03:30Z QA copy (the census's view)
//   live.json = GET http://localhost:3470/api/production/jpn_for_eng/seeds (Popty, live, seeds → legos → basket_phrases)
// Kai's rule "Apply = live pre-check of row + LEGO + seed": a row goes into a changeset only if
//   · the phrase exists live AND in the copy, with known_text == english_now and target_text == japanese in both,
//     and the same seed_number / lego_index;
//   · its LEGO (known_text, target_text, is_new) and its seed (known_text, target_text) are the same live as in the copy.
// Anything else is HELD (written to held.json with the reason), never forced. The applier's `expect` repeats the row check
// at apply time (seed_number, lego_index, known_text, target_text), so a row that drifts between now and tonight is set aside.
// Only the English (known_text) is ever set. Japanese is pinned by expect, never written.
// Actions: "delete row" → phrase.delete; "edit English (...)" → phrase.update {known_text: english_new};
// "keep" / "already fixed by #214·AL" / "hold for Kai" → nothing.
// と話してた ("was saying", Kai 24 Nov): every quotative と話してた edit already says "was saying"; the two that do not
// (S0544L01U04, S0639L01U01) are COMITATIVE と ("talking with the teacher / to the person"), so the census English is kept.
'use strict'
const fs = require('fs')
const path = require('path')
const cs = require('../../../services/shared/changeset.cjs')

const COURSE = 'jpn_for_eng'
const [copyFile, liveFile, outDir] = process.argv.slice(2)
if (!copyFile || !liveFile || !outDir) { console.error('usage: build-changeset.cjs <copy.json> <live.json> <outDir>'); process.exit(1) }

function parseCsv(text) {
  const rows = []; let row = [], f = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++ } else q = false } else f += c; continue }
    if (c === '"') q = true
    else if (c === ',') { row.push(f); f = '' }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = '' }
    else if (c !== '\r') f += c
  }
  if (f || row.length) { row.push(f); rows.push(row) }
  const [head, ...body] = rows
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])))
}

const rows = parseCsv(fs.readFileSync(path.join(__dirname, '..', 'rows.csv'), 'utf8'))
const copy = JSON.parse(fs.readFileSync(copyFile, 'utf8'))
const live = JSON.parse(fs.readFileSync(liveFile, 'utf8'))

const copyPhrase = new Map(copy.phrases.map((p) => [p.id, p]))
const copyLego = new Map(copy.legos.map((l) => [l.lego_id, l]))
const copySeed = new Map(copy.seeds.map((s) => [s.seed_number, s]))
const livePhrase = new Map(), liveLego = new Map(), liveSeed = new Map()
for (const s of live.seeds) {
  liveSeed.set(s.seed_number, s)
  for (const l of s.legos) { liveLego.set(l.lego_id, l); for (const p of l.basket_phrases) livePhrase.set(p.id, p) }
}
const legoIdOf = (p) => `S${String(p.seed_number).padStart(4, '0')}L${String(p.lego_index).padStart(2, '0')}`

const out = { deletes: [], rewords: [], addend: [] }
const held = [], skipped = []
for (const r of rows) {
  const a = r.action
  const kind = a === 'delete row' ? 'deletes' : a === 'edit English (say what the Japanese says)' ? 'rewords' : a === 'edit English (add the open end)' ? 'addend' : null
  if (!kind) { skipped.push({ phrase_id: r.phrase_id, action: a, hold: r.hold || null }); continue }
  const id = `${COURSE}:${r.phrase_id}`
  const c = copyPhrase.get(id), l = livePhrase.get(id)
  const why = []
  if (!c) why.push('not in the 03:30Z copy')
  if (!l) why.push('not live (deleted since the census?)')
  if (c && (c.known_text !== r.english_now || c.target_text !== r.japanese)) why.push('copy text differs from the census CSV')
  if (c && l) {
    if (l.known_text !== c.known_text) why.push(`live English drifted: "${l.known_text}"`)
    if (l.target_text !== c.target_text) why.push(`live Japanese drifted: "${l.target_text}"`)
    if (l.seed_number !== c.seed_number || l.lego_index !== c.lego_index) why.push('phrase moved to another LEGO')
    const lid = legoIdOf(c), cl = copyLego.get(lid), ll = liveLego.get(lid)
    if (!ll) why.push(`LEGO ${lid} gone live`)
    else if (!cl || cl.known_text !== ll.known_text || cl.target_text !== ll.target_text || cl.is_new !== ll.is_new) why.push(`LEGO ${lid} changed since the copy`)
    const cs0 = copySeed.get(c.seed_number), ls0 = liveSeed.get(c.seed_number)
    if (!ls0 || !cs0 || cs0.known_text !== ls0.known_text || cs0.target_text !== ls0.target_text) why.push(`seed ${c.seed_number} changed since the copy`)
  }
  if (why.length) { held.push({ phrase_id: r.phrase_id, action: a, english_now: r.english_now, japanese: r.japanese, english_new: r.english_new || null, reason: why.join('; ') }); continue }
  const expect = { seed_number: c.seed_number, lego_index: c.lego_index, known_text: c.known_text, target_text: c.target_text }
  if (kind === 'deletes') out.deletes.push(cs.op('phrase.delete', { phrase_id: id, expect }))
  else {
    if (!r.english_new.trim() || r.english_new === r.english_now) { held.push({ phrase_id: r.phrase_id, action: a, reason: 'english_new empty or unchanged' }); continue }
    out[kind].push(cs.op('phrase.update', { phrase_id: id, set: { known_text: r.english_new }, expect }))
  }
}

const why = {
  deletes: 'cs #225 open-end census: delete garbled / unfixable から・ことがある rows (Kai Y 24 Nov 16:55Z)',
  rewords: 'cs #225 open-end census: English says what the Japanese says (Kai Y 24 Nov 16:55Z; と話してた = "was saying")',
  addend: 'cs #225 open-end census: English adds the open "because…" end the Japanese carries (Kai Y 24 Nov 16:55Z)',
}
fs.mkdirSync(outDir, { recursive: true })
for (const k of Object.keys(out)) {
  cs.write(path.join(outDir, `${k}.changeset.jsonl`), { id: `jpn_for_eng-cs234-${k}`, course: COURSE, job: '#234·AL', why: why[k],
    source: 'QA copy ssi_copy_20261124t033000z + live GET /api/production/jpn_for_eng/seeds pre-check', kai_go: 'kai:2026-11-24T16:55Z "Yes on the Japanese fix."' }, out[k])
}
fs.writeFileSync(path.join(outDir, 'held.json'), JSON.stringify({ held, skipped }, null, 1) + '\n')
console.log(JSON.stringify({ deletes: out.deletes.length, rewords: out.rewords.length, addend: out.addend.length, held: held.length, skipped: skipped.length,
  en_chars: [...out.rewords, ...out.addend].reduce((a, o) => a + o.set.known_text.length, 0) }))
