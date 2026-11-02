#!/usr/bin/env node
/**
 * TWIN CHECK — no slot may play another slot's voice (job #303, Tom 2026-11-02).
 *
 * The specimen: on 9 Oct the bulk filler answered 250 ita_for_eng target2 (male, Lorenzo) slots with the target1 (female,
 * Alessandra) clip it had just rendered, so the male slot played the female FILE. The same fingerprint was then found in
 * ~3,150 slots across 13 more courses. The cause is fixed (22ae6d73a, b271804ce, and #303's route change); this is the
 * check that says whether any damage is still being served. READ-ONLY: it renders nothing and writes nothing.
 *
 * Per course, two counts over course_seeds / course_legos / course_practice_phrases:
 *   twin         a row whose target2 pointer plays the SAME audio file (s3_key) as its own target1 pointer.
 *   wrong voice  a slot whose clip voice is not the voice resolveVoice (services/shared/resolve-voice.cjs — the Voice Lab cast)
 *                gives that slot. Same identity rule as relink-voice-guard: a bare id and its provider-prefixed id are one
 *                voice. Human recordings are never wrong (Welsh is human-recorded); slots resolveVoice refuses (no cast) or
 *                has no ruling for are counted apart — they are a missing cast, not a wrong voice.
 * and, for the twin slots, what a fix costs: distinct sentences, characters to render, and how many sentences already have a
 * usable clip in the slot's cast voice (a free relink).
 *
 * Exits 1 on any twin or wrong-voice slot, 0 when clean, 2 on error. Run it on the nightly QA copy:
 *   set -a; . ~/ssi-restore/qa-copy.env; set +a
 *   node tools/audio/twin-check.cjs [--course ita_for_eng[,spa_for_eng]] [--json out.json] [--examples 3]
 */
const fs = require('fs')
const rv = require('../../services/shared/resolve-voice.cjs')
const { windowedRead } = require('../qa/lib/windowed-read.cjs')

/** Every content table carries both target pointers; all three are uuid columns. */
const TWIN_TABLES = Object.freeze(['course_seeds', 'course_legos', 'course_practice_phrases'])
const usable = (a) => `${a}.s3_key is not null and ${a}.s3_key not like 'pending/%' and coalesce(${a}.duration_ms, 0) > 200`

/** The twin rows of one table for one course: target2 plays target1's file. $1 = course_code. */
const twinSql = (tbl, pred) => `select '${tbl}' tbl, x.id::text key, x.seed_number pos, a2.id::text aid, a2.text tx, a2.text_normalized t,
    a2.language, a2.voice_id v2, a2.origin, a1.voice_id v1, a1.s3_key
  from ${tbl} x join course_audio a1 on a1.id = x.target1_audio_id join course_audio a2 on a2.id = x.target2_audio_id
  where x.course_code = $1 and a1.s3_key = a2.s3_key${pred ? ` and ${pred}` : ''}`

const timedOutWhole = new Set()
async function twinRows(pg, code) {
  const out = []
  for (const tbl of TWIN_TABLES) {
    const parts = await windowedRead((pred) => pg.query(twinSql(tbl, pred), [code]), { column: 'x.seed_number', memo: timedOutWhole, key: `twin|${code}|${tbl}` })
    for (const { rows } of parts) out.push(...rows)
  }
  return out.sort((a, b) => (a.pos ?? 1e9) - (b.pos ?? 1e9) || String(a.key).localeCompare(String(b.key)))
}

/**
 * Pure. Twin slots -> fix items, one per (language, words): what the slot's cast voice is, or why there is none.
 * @returns {{ slots, items: [{language,t,tx,voice,status,reason,slots}] }}
 */
function twinItems(course, rows, cast) {
  const items = new Map()
  for (const r of rows) {
    const res = rv.resolveVoice({ course, role: 'target2', language: r.language }, cast)
    const voice = res.status === 'voice' ? res.voiceId : null
    const k = `${r.language}|${r.t}`
    if (!items.has(k)) items.set(k, { language: r.language, t: r.t, tx: r.tx, voice, status: res.status, reason: res.reason || res.message || res.rule || null, slots: 0 })
    items.get(k).slots++
  }
  return { slots: rows.length, items: [...items.values()] }
}

/** Which items already have a usable clip in their cast voice (any course, any role): a free relink. One round trip per 2,000. */
async function attachFree(pg, items) {
  const ask = items.filter((x) => x.voice)
  for (let i = 0; i < ask.length; i += 2000) {
    const chunk = ask.slice(i, i + 2000)
    const voice = chunk.map((x) => rv.canonVoice(x.voice))
    const { rows } = await pg.query(`with want as (select * from unnest($1::int[], $2::text[], $3::text[], $4::text[], $5::text[]) as w(i, t, lang, voice, bare))
      select distinct w.i from want w join course_audio ca on ca.text_normalized = w.t and ca.language = w.lang
        and ca.voice_id in (w.voice, w.bare) and ${usable('ca')} and coalesce(ca.veracity_pass, true)`,
    [chunk.map((_, j) => j), chunk.map((x) => x.t), chunk.map((x) => x.language), voice, voice.map((v) => String(v).replace(/^[a-z]+_/, ''))])
    for (const r of rows) chunk[Number(r.i)].free = true
  }
}

/** Pure. The cost of fixing a course's twin slots. */
function twinCost(items) {
  const c = { sentences: items.length, uncast: 0, free: 0, render: 0, chars: 0 }
  for (const it of items) {
    if (!it.voice) c.uncast++
    else if (it.free) c.free++
    else { c.render++; c.chars += String(it.tx || '').length }
  }
  return c
}

/** Pure. resolveVoice classify groups -> wrong-voice counts by role, plus slots with no cast / no ruling. */
function wrongVoice(classified) {
  const byRole = {}
  let wrong = 0, uncast = 0, noRuling = 0
  for (const g of classified.groups) {
    const r = (byRole[g.role] ||= { ok: 0, wrong: 0, human: 0, uncast: 0, noRuling: 0, examples: [] })
    if (g.status === 'drift') { r.wrong += g.slots; wrong += g.slots; if (r.examples.length < 3) r.examples.push(`${g.tbl}.${g.col}: ${g.slots} on ${g.voice_id}, cast ${g.resolved}`) }
    else if (g.status === 'ok') r.ok += g.slots
    else if (g.status === 'human') r.human += g.slots
    else if (g.status === 'refused') { r.uncast += g.slots; uncast += g.slots }
    else if (g.status === 'no-ruling') { r.noRuling += g.slots; noRuling += g.slots }
  }
  return { wrong, uncast, noRuling, byRole }
}

/** Pure. One plain block per course. */
function renderCourse(c, examples = 3) {
  const L = [`${c.course}: twin ${c.twin.slots} · wrong voice ${c.wrong.wrong}${c.wrong.uncast ? ` · no cast ${c.wrong.uncast}` : ''}${c.wrong.noRuling ? ` · no ruling ${c.wrong.noRuling}` : ''}`]
  if (c.twin.slots) {
    const k = c.cost
    L.push(`  twin fix: ${k.sentences} sentences — ${k.free} free relinks, ${k.render} to render (${k.chars} chars)${k.uncast ? `, ${k.uncast} with no target2 cast (${c.twinUncastReason})` : ''}`)
    for (const r of c.twin.examples.slice(0, examples)) L.push(`    ${r.tbl} ${r.key} "${String(r.tx).slice(0, 50)}" target2 ${r.v2} = target1 ${r.v1} file ${r.s3_key}`)
  }
  for (const [role, r] of Object.entries(c.wrong.byRole)) if (r.wrong) L.push(`  wrong ${role} ${r.wrong}: ${r.examples.join('; ')}`)
  return L.join('\n')
}

/** The cast and course rows straight from pg (the QA copy has no Supabase REST in front of it). Same fields as resolve-voice. */
async function loadCast(pg) {
  const { rows: roles } = await pg.query('select language, gender, slot, rank, voice_id, notes, assigned_by from voice_language_roles')
  const ids = [...new Set(roles.map((r) => r.voice_id))]
  const { rows: voices } = await pg.query('select voice_id, is_active, gender from voices where voice_id = any($1::text[])', [ids.length ? ids : ['-']])
  return { roles, voices }
}
async function loadCourses(pg, codes = null) {
  const { rows } = await pg.query(`select course_code, known_lang, target_lang, dialect, voice_pool_key, known_dialect from courses
    ${codes ? 'where course_code = any($1::text[])' : ''} order by course_code`, codes ? [codes] : [])
  return rows
}

async function checkCourse(pg, course, cast, { examples = 3 } = {}) {
  const { groupedSlots, classify } = require('./voice-audit.cjs')
  const code = course.course_code
  const rows = await twinRows(pg, code)
  const { slots, items } = twinItems(course, rows, cast)
  await attachFree(pg, items)
  const uncastItem = items.find((x) => !x.voice)
  return {
    course: code,
    twin: { slots, examples: rows.slice(0, examples) },
    cost: twinCost(items),
    twinUncastReason: uncastItem ? uncastItem.reason : null,
    wrong: wrongVoice(classify(course, await groupedSlots(pg, code), cast)),
  }
}

async function main(argv = process.argv.slice(2)) {
  const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }
  const codes = opt('--course') ? String(opt('--course')).split(',').filter(Boolean) : null
  const examples = Number(opt('--examples', 3))
  const pg = await require('../../services/shared/agent-db.cjs').connect({ app: 'twin-check' })
  const out = []
  try {
    const cast = await loadCast(pg)
    const courses = await loadCourses(pg, codes)
    if (codes && courses.length !== codes.length) throw new Error(`unknown course(s): ${codes.filter((c) => !courses.some((x) => x.course_code === c)).join(', ')}`)
    for (const course of courses) {
      try { const c = await checkCourse(pg, course, cast, { examples }); out.push(c); console.log(renderCourse(c, examples)) }
      catch (e) { out.push({ course: course.course_code, error: e.message }); console.log(`${course.course_code}: ERROR ${e.message}`) }
    }
  } finally { await pg.end() }
  const twin = out.reduce((s, c) => s + ((c.twin && c.twin.slots) || 0), 0), wrong = out.reduce((s, c) => s + ((c.wrong && c.wrong.wrong) || 0), 0)
  const errors = out.filter((c) => c.error).length
  console.log(`\nTOTAL ${out.length} courses: twin ${twin} · wrong voice ${wrong}${errors ? ` · ${errors} courses errored` : ''}`)
  if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(out, null, 1))
  return errors ? 2 : (twin || wrong ? 1 : 0)
}

if (require.main === module) main().then((code) => process.exit(code), (e) => { console.error(e.message || e); process.exit(2) })
module.exports = { twinSql, twinItems, twinCost, wrongVoice, renderCourse, attachFree, checkCourse, loadCast, main }
