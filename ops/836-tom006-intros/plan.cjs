// Job #836: builds <course>.plan.json = the Tom-006 intro work list for a seed range (default: 1-668, or 101-668 for the four courses whose seeds 1-100 job #794 owns).
//   node ops/836-tom006-intros/plan.cjs <course> [--from N] [--to M]      (read-only; regenerates; safe to delete)
// Rows whose current intro is already Tom-006 are marked done. Texts that do not parse and are not a hand-written "The X for" line are listed as `unparsed` and left alone.
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.psql'), quiet: true })
const { Client } = require('pg')
const fs = require('fs')
const P = require('../../tools/audio/tom006-intros-plan.cjs')
const T6 = 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9'
const argv = process.argv.slice(2), opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? Number(argv[i + 1]) : d }
const course = argv[0]
;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect()
  const { rows: [co] } = await c.query(`select target_lang, known_lang from courses where course_code=$1`, [course]); if (!co || co.known_lang !== 'eng') throw new Error(`${course} is not an English-known course`)
  const lang = P.langName(co.target_lang), d = P.defaultRange(course), from = opt('--from', d.from), to = opt('--to', d.to)
  const legos = (await c.query(`select id::text id,lego_id,seed_number,presentation_audio_id::text presentation_audio_id from course_legos where course_code=$1 and seed_number between $2 and $3 order by lego_id`, [course, from, to])).rows
  const scores = Object.fromEntries((await c.query(`select lego_id,score from course_lego_intro_context_score where course_code=$1`, [course])).rows.map(r => [r.lego_id, r.score]))
  const ids = legos.map(l => l.presentation_audio_id).filter(Boolean)
  const clips = Object.fromEntries((await c.query(`select id::text id,text,voice_id from course_audio where id = any($1::uuid[])`, [ids])).rows.map(r => [r.id, r]))
  const out = legos.map(l => {
    const cur = l.presentation_audio_id ? clips[l.presentation_audio_id] : null, text = cur ? cur.text : null, score = scores[l.lego_id] ?? null
    const n = text ? P.newText(text, lang, score) : null
    return { id: l.id, lego_id: l.lego_id, seed: l.seed_number, oldClip: l.presentation_audio_id, oldVoice: cur && cur.voice_id, oldText: text, x: n && n.x, ctx: n && n.ctx, score, keepAsIn: !!(n && n.keepAsIn), hand: !!(n && n.hand), alreadyT6: !!(cur && cur.voice_id === T6), newText: n && n.text }
  })
  fs.writeFileSync(`${__dirname}/${course}.plan.json`, JSON.stringify(out, null, 1))
  const todo = out.filter(o => o.newText && o.oldClip && !o.alreadyT6)
  console.log(JSON.stringify({ course, lang, from, to, legos: out.length, noClip: out.filter(o => !o.oldClip).length, alreadyT6: out.filter(o => o.alreadyT6).length, handWritten: out.filter(o => o.hand).length,
    todo: todo.length, distinctTexts: new Set(todo.map(o => o.newText)).size, chars: [...new Set(todo.map(o => o.newText))].reduce((a, t) => a + t.length, 0),
    asInKept: todo.filter(o => o.keepAsIn).length, unparsed: out.filter(o => o.oldClip && !o.newText).map(o => [o.lego_id, o.oldText]) }))
  await c.end()
})().catch(e => { console.error(e); process.exit(1) })
