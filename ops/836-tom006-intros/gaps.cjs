// Job #836 (Watson's decision 2026-10-12): the LEGOs with NO intro clip. Only is_new LEGOs are ever presented (every existing intro in the 11 courses is an is_new LEGO;
// is_new=false LEGOs are repeats and are never presented by design), so the gaps are the is_new LEGOs with presentation_audio_id null, seeds 1-668. is_new=false ones are LISTED, not rendered.
//   node ops/836-tom006-intros/gaps.cjs <course>      (read-only) -> <course>.gaps.json; render with tools/audio/tom006-intros-836.cjs --course X --gaps
// Text = the standard intro "The <Language> for: 'X'[, as in — 'ctx'], is: <break time=300ms/>". As-in only at intro-context score 3-5, with ctx = the shortest natural USE phrase
// of that LEGO (known side) that contains the LEGO's known text; no such phrase -> no as-in.
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.psql'), quiet: true })
const { Client } = require('pg')
const fs = require('fs')
const P = require('../../tools/audio/tom006-intros-plan.cjs')
const course = process.argv[2]
const ctxOf = (known, phrases) => {
  const k = known.toLowerCase()
  const c = phrases.map(t => t.trim().replace(/[.!?]+$/, '')).filter(t => t.toLowerCase().includes(k) && t.toLowerCase() !== k && t.split(/\s+/).length >= 4 && t.split(/\s+/).length <= 12 && !t.includes("'"))
    .sort((a, b) => a.length - b.length)[0]
  return c ? c.replace(/^([A-Z])(?!\w*[A-Z])(?=[a-z])/, m => m.toLowerCase()) : null
}
;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect()
  const { rows: [co] } = await c.query(`select target_lang, known_lang from courses where course_code=$1`, [course]); if (!co || co.known_lang !== 'eng') throw new Error(`${course} is not an English-known course`)
  const lang = P.langName(co.target_lang)
  const gaps = (await c.query(`select l.id::text id, l.lego_id, l.seed_number seed, l.known_text, s.score from course_legos l left join course_lego_intro_context_score s on s.course_code=l.course_code and s.lego_id=l.lego_id
    where l.course_code=$1 and l.is_new and l.presentation_audio_id is null and l.seed_number <= 668 order by l.lego_id`, [course])).rows
  const notPresented = (await c.query(`select count(*) n from course_legos where course_code=$1 and not is_new and presentation_audio_id is null and seed_number <= 668`, [course])).rows[0].n
  const out = []
  for (const g of gaps) {
    const phrases = (await c.query(`select known_text from course_practice_phrases where course_code=$1 and lego_id=$2 and phrase_role='use'`, [course, g.lego_id])).rows.map(r => r.known_text)
    const ctx = g.score >= 3 && g.score <= 5 ? ctxOf(g.known_text, phrases) : null
    out.push({ id: g.id, lego_id: g.lego_id, seed: g.seed, oldClip: null, known: g.known_text, score: g.score, ctx, keepAsIn: !!ctx,
      newText: `The ${lang} for: '${g.known_text}'${ctx ? `, as in — '${ctx}'` : ''}, is: ${P.BREAK}` })
  }
  fs.writeFileSync(`${__dirname}/${course}.gaps.json`, JSON.stringify(out, null, 1))
  console.log(JSON.stringify({ course, gapsToRender: out.length, asIn: out.filter(o => o.keepAsIn).length, scored35WithoutCtx: out.filter(o => o.score >= 3 && o.score <= 5 && !o.ctx).length, isNewFalseNotPresented: +notPresented, chars: out.reduce((a, o) => a + o.newText.length, 0) }))
  await c.end()
})().catch(e => { console.error(e); process.exit(1) })
