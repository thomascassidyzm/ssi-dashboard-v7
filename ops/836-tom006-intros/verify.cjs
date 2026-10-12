// Job #836 acceptance check (lane review #841): for a course, how many intro slots in the planned seed range are NOT on a faded Tom-006 clip?
//   node ops/836-tom006-intros/verify.cjs <course>      -> JSON; "offFaded" must be 0 before the course is reported done.
// Slots = every planned LEGO's presentation pointer + every non-component practice phrase still pointing at one of the plan's OLD clips. Faded = Tom-006 voice, role presentation, text ends with the fade marker.
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.psql'), quiet: true })
const { Client } = require('pg')
const fs = require('fs')
const { MARKER } = require('../../tools/audio/tom006-fade-lib.cjs')
const { defaultRange } = require('../../tools/audio/tom006-intros-plan.cjs')
const T6 = 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9'
const course = process.argv[2]
;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect()
  const { from, to } = defaultRange(course)
  const plan = JSON.parse(fs.readFileSync(`${__dirname}/${course}.plan.json`, 'utf8')).filter(o => o.newText && o.oldClip && !o.alreadyT6)
  const old = [...new Set(plan.map(o => o.oldClip))]
  const isFaded = `(ca.voice_id = $3 and ca.role = 'presentation' and right(ca.text, ${MARKER.length}) = $4)`
  const legos = (await c.query(`select count(*) n, count(*) filter (where not ${isFaded}) off from course_legos l join course_audio ca on ca.id::text = l.presentation_audio_id where l.course_code=$1 and l.lego_id = any($2::text[])`, [course, plan.map(o => o.lego_id), T6, MARKER])).rows[0]
  const phrases = (await c.query(`select count(*) off from course_practice_phrases where course_code=$1 and seed_number between $3 and $4 and presentation_audio_id = any($2::uuid[]) and phrase_role is distinct from 'component'`, [course, old, from, to])).rows[0]
  const unlinked = (await c.query(`select count(*) n from course_legos l where l.course_code=$1 and l.lego_id = any($2::text[]) and l.presentation_audio_id is null`, [course, plan.map(o => o.lego_id)])).rows[0]
  console.log(JSON.stringify({ course, range: [from, to], plannedLegos: plan.length, legosChecked: +legos.n, legosOffFaded: +legos.off, phrasesStillOnOldClip: +phrases.off, legosWithNoPointer: +unlinked.n, offFaded: +legos.off + +phrases.off + +unlinked.n }))
  await c.end()
})().catch(e => { console.error(e); process.exit(1) })
