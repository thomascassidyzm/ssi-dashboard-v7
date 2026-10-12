// Builds the Tom-006 intro work list for seeds 1-100 of a course: current intro text, as-in score, new text.
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.psql'), quiet: true })
const { Client } = require('pg')
const fs = require('fs')
const course = process.argv[2]
// Hand-written explanatory intros (text the template regex cannot parse): Tom/Watson 2026-10-12 — voice EVERY intro in Tom-006, verbatim, existing text kept
// (explanation and when-clause included) plus the 300 ms break tag, same fade as the rest.
const HANDWRITTEN = true
const LANG = { deu_for_eng: 'German', spa_for_eng: 'Spanish', fra_for_eng: 'French', ita_for_eng: 'Italian' }
;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect()
  const legos = (await c.query(`select id,lego_id,seed_number,known_text,target_text,presentation_audio_id from course_legos where course_code=$1 and seed_number<=100 order by lego_id`, [course])).rows
  const scores = Object.fromEntries((await c.query(`select lego_id,score from course_lego_intro_context_score where course_code=$1`, [course])).rows.map(r => [r.lego_id, r.score]))
  const ids = legos.map(l => l.presentation_audio_id).filter(Boolean)
  const clips = Object.fromEntries((await c.query(`select id,text,voice_id from course_audio where id = any($1::uuid[])`, [ids])).rows.map(r => [r.id, r]))
  const out = legos.map(l => {
    const cur = l.presentation_audio_id ? clips[l.presentation_audio_id] : null
    const text = cur ? cur.text : null
    // "The German for: 'X', as in — 'ctx', is:"  or  "The German for 'X'  - as in -  'ctx', is:"
    const m = text && text.match(/^The (\w+) for:?\s*'(.*?)'\s*,?\s*-?\s*as in\s*[—-]?\s*'(.*)'\s*,\s*is:?\s*$/s)
    const bare = text && text.match(/^The (\w+) for:?\s*'(.*)'\s*,?\s*is:?\s*$/s)
    const x = m ? m[2] : bare ? bare[2] : null, ctx = m ? m[3] : null
    const score = scores[l.lego_id] ?? null
    const keepAsIn = !!(ctx && score >= 3 && score <= 5)
    const handText = x == null && text && HANDWRITTEN && !String(cur && cur.voice_id).includes('d293d509') ? text.replace(/\s+$/, '') + ' <break time="300ms"/>' : null
    const newText = handText || (x == null ? null : `The ${LANG[course]} for: '${x}'${keepAsIn ? `, as in — '${ctx}'` : ''}, is: <break time="300ms"/>`)
    return { id: l.id, lego_id: l.lego_id, seed: l.seed_number, oldClip: l.presentation_audio_id, oldVoice: cur && cur.voice_id, oldText: text, x, ctx, score, keepAsIn, newText }
  })
  fs.writeFileSync(`${__dirname}/${course}.plan.json`, JSON.stringify(out, null, 1))
  const n = out.length, withClip = out.filter(o => o.oldClip).length, parsed = out.filter(o => o.newText).length
  const hadCtx = out.filter(o => o.ctx).length, kept = out.filter(o => o.keepAsIn).length
  const dropped12 = out.filter(o => o.ctx && o.score >= 1 && o.score <= 2).length, droppedUnscored = out.filter(o => o.ctx && o.score == null).length
  console.log({ course, legos: n, withClip, parsed, hadCtx, kept, dropped12, droppedUnscored, noClip: out.filter(o => !o.oldClip).map(o => o.lego_id), unparsed: out.filter(o => o.oldClip && !o.newText).map(o => [o.lego_id, o.oldText]) })
  await c.end()
})().catch(e => { console.error(e); process.exit(1) })
