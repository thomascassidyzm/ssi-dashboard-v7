#!/usr/bin/env node
/**
 * Job #52 (Tom 2026-10-12 16:08Z: "there are almost no female English voices in the premium courses anymore! Think about it" — read wrongly as "put female back").
 * In X_for_eng courses English is the KNOWN side and is ALL Tom-006; gender variance for English is for eng_for_X (target2) only.
 * This undoes the three moves that put X_for_eng known slots on a female voice, pointer only (no renders):
 *   #34  tom006-restore-female-pointer ledger: slot went Tom-006 (from) -> female clip (to).        Undo: back to `from` (a Tom-006 clip).
 *   #24  female-charlotte ledger:             slot went Tom-006 (from) -> Charlotte (newId).       Undo: back to `from`.
 *   #813 runner under #24's patch (intents with g:'f'): slot went female clip -> Charlotte (newId). Undo: the Tom-006 clip of the same text, when one exists
 *        (else the slot is OWED and left for the reverted #813 runner, which now treats every non-Tom-006 X_for_eng known slot as remaining).
 * eng_for_X rows are never touched. A slot is moved only while it still holds one of the wrong clips (live value asserted in the UPDATE).
 *   node tools/audio/x-for-eng-known-t6-revert.cjs [--dry-run]
 */
const fs = require('fs'), path = require('path')
const T6 = 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9'
const isXForEng = c => /_for_eng$/.test(String(c)) && !String(c).startsWith('eng_for_')
const idType = tbl => (tbl === 'course_practice_phrases' ? 'text' : 'uuid')
const colOf = s => s.col || 'known_audio_id'
const slotId = s => `${s.tbl}|${s.key}|${colOf(s)}`

/** Pure: ledgers -> Map slotId -> { tbl, key, col, course, wrong:Set<clipId>, want:clipId|null, wantText:text|null }. Only X_for_eng known slots. */
function planRevert({ l34 = [], l24 = [], l813 = [] }) {
  const plan = new Map()
  const add = (s, wrongId, want, wantText) => {
    if (!isXForEng(s.course) || colOf(s) !== 'known_audio_id' || !wrongId) return
    const k = slotId(s); const p = plan.get(k) || { tbl: s.tbl, key: s.key, col: 'known_audio_id', course: s.course, wrong: new Set(), want: null, wantText: null }
    p.wrong.add(wrongId); if (want && !p.want) p.want = want; if (wantText && !p.wantText) p.wantText = wantText; plan.set(k, p)
  }
  for (const e of l34) if (e.kind === 'intent') for (const s of e.slots || []) add(s, s.to, s.from, null)
  for (const e of l24) if (e.kind === 'intent') for (const s of e.slots || []) add(s, e.newId, s.from, e.t)
  for (const e of l813) if (e.kind === 'intent' && e.g === 'f') for (const s of e.slots || []) add(s, e.newId, null, e.t)
  return plan
}
module.exports = { planRevert, isXForEng, T6 }
if (require.main !== module) return

for (const p of [path.join(__dirname, '../../.env.psql'), '/home/tomcassidy/ssi-dashboard-v7-clean/.env.psql']) if (fs.existsSync(p)) { require('dotenv').config({ path: p, quiet: true }); break }
const { Client } = require('pg')
const { createClient } = require('@supabase/supabase-js')
const { bumpCourseVersion } = require('../../services/shared/course-version.cjs')
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs')
const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs')
const dryRun = process.argv.includes('--dry-run')
const W = '/home/tomcassidy/.cs-worktrees'
const SRC = {
  l34: process.env.L34 || `${W}/popty-play-tom/34-restore-40-715-female-english-sl/ops/34-restore-female-pointer/ledger.jsonl`,
  l24: process.env.L24 || path.join(__dirname, '../../ops/24-female-charlotte/ledger.jsonl'),
  l813: process.env.L813 || `${W}/ssi-dashboard-v7-clean/813-tom006-english/ops/813-tom006-english/ledger.jsonl`,
}
const dir = path.join(__dirname, '../../ops/52-revert-x-for-eng-t6'), ledger = path.join(dir, 'ledger.jsonl')
const log = e => { if (!dryRun) { fs.mkdirSync(dir, { recursive: true }); fs.appendFileSync(ledger, JSON.stringify({ ...e, at: new Date().toISOString() }) + '\n') } }
const read = f => fs.readFileSync(f, 'utf8').split('\n').filter(l => l.trim().startsWith('{')).map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
function supa() {
  for (const p of [path.join(__dirname, '../../.env'), '/home/tomcassidy/ssi-dashboard-v7-clean/.env'])
    if (fs.existsSync(p)) for (const l of fs.readFileSync(p, 'utf8').split('\n')) { const m = /^(SUPABASE_URL|SUPABASE_SERVICE_KEY)=(.*)$/.exec(l.trim()); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '') }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
}
;(async () => {
  const plan = planRevert({ l34: read(SRC.l34), l24: read(SRC.l24), l813: read(SRC.l813) })
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect(); await pg.query('set statement_timeout=0')
  // the explicit `from` targets must really be Tom-006 clips; texts without one get looked up by text
  const wants = [...new Set([...plan.values()].map(p => p.want).filter(Boolean))]
  const t6ok = new Set((await pg.query(`select id::text from course_audio where id = any($1::uuid[]) and voice_id=$2 and s3_key is not null and s3_key not like 'pending/%' and duration_ms>200`, [wants, T6])).rows.map(r => r.id))
  for (const p of plan.values()) if (p.want && !t6ok.has(p.want)) p.want = null
  const texts = [...new Set([...plan.values()].filter(p => !p.want && p.wantText).map(p => p.wantText))]
  const byText = new Map((await pg.query(`select distinct on (text_normalized) text_normalized t, id::text from course_audio where text_normalized = any($1) and language in ('eng','en') and role in ('known','target2')
      and voice_id=$2 and s3_key is not null and s3_key not like 'pending/%' and duration_ms>200 order by text_normalized, created_at`, [texts, T6])).rows.map(r => [r.t, r.id]))
  for (const p of plan.values()) if (!p.want && p.wantText) p.want = byText.get(p.wantText) || null
  // live values, batched
  const groups = new Map(); for (const p of plan.values()) (groups.get(p.tbl) || groups.set(p.tbl, []).get(p.tbl)).push(p)
  for (const [tbl, ps] of groups) for (let i = 0; i < ps.length; i += 5000) {
    const chunk = ps.slice(i, i + 5000), { rows } = await pg.query(`select id::text k, known_audio_id::text v from ${tbl} where id = any($1::${idType(tbl)}[])`, [chunk.map(p => p.key)])
    const m = new Map(rows.map(r => [r.k, r.v])); for (const p of chunk) p.cur = m.get(p.key) ?? null
  }
  const st = { slots: plan.size, move: 0, already: 0, owed: 0, other: 0 }, per = new Map(), todo = []
  for (const p of plan.values()) {
    const c = per.get(p.course) || per.set(p.course, { move: 0, owed: 0, other: 0, already: 0 }).get(p.course)
    if (p.cur && p.cur === p.want) { st.already++; c.already++ }
    else if (!p.wrong.has(p.cur)) { st.other++; c.other++ }       // changed since by someone else (or already re-done by the runner): left alone
    else if (!p.want) { st.owed++; c.owed++ }                      // no Tom-006 clip of this text yet: the reverted #813 runner renders it
    else { st.move++; c.move++; todo.push(p) }
  }
  console.log(JSON.stringify(st)); for (const [c, v] of [...per].sort()) console.log(c, JSON.stringify(v))
  if (dryRun) return pg.end()
  const db = supa(), identity = serviceIdentity('x-for-eng-known-t6-revert-52'), events = new Map(), moved = new Map()
  const event = async course => { if (!events.has(course)) events.set(course, await recordContentEdit(db, { identity, courseCode: course, surface: 'tools:audio/x-for-eng-known-t6-revert', operation: 'update', detail: { why: 'Tom 2026-10-12 job #52: X_for_eng English known side is ALL Tom-006; undo #34/#24/#813-g:f female pointers', ledger } })); return events.get(course) }
  const byKey = new Map(); for (const p of todo) { const k = `${p.tbl}|${p.course}`; (byKey.get(k) || byKey.set(k, []).get(k)).push(p) }
  for (const [k, ps] of byKey) {
    const [tbl, course] = k.split('|'), ev = await event(course)
    for (let i = 0; i < ps.length; i += 500) {
      const chunk = ps.slice(i, i + 500)
      log({ kind: 'intent', tbl, course, slots: chunk.map(p => ({ key: p.key, from: p.cur, to: p.want })) })   // write-ahead: undo of this undo reads it
      const { rows } = await pg.query(`update ${tbl} x set known_audio_id = u.to_id::uuid, last_edit_event_id = $4 from unnest($1::text[], $2::text[], $3::text[]) u(k, from_id, to_id)
          where x.id = u.k::${idType(tbl)} and x.known_audio_id = u.from_id::uuid returning x.id::text`, [chunk.map(p => p.key), chunk.map(p => p.cur), chunk.map(p => p.want), ev])
      log({ kind: 'swap', tbl, course, moved: rows.length, wanted: chunk.length })
      moved.set(course, (moved.get(course) || 0) + rows.length)
    }
  }
  let bumpFailed = 0
  for (const [course, n] of moved) if (n) { const v = await bumpCourseVersion(db, course, 'patch'); if (!v) bumpFailed++; log({ kind: v ? 'bumped' : 'bump-failed', course, v }); console.log('moved', course, n, 'content_version', v) }
  await pg.end(); if (bumpFailed) { console.log('BUMP FAILED for', bumpFailed, 'courses'); process.exitCode = 3 }
})().catch(e => { console.error(e); process.exit(1) })
