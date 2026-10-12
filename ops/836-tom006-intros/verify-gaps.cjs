require('dotenv').config({ path: process.argv[2] + '/.env.psql', quiet: true })
const { Client } = require('pg'), fs = require('fs')
;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect(); let tot = 0, bad = 0
  for (const f of fs.readdirSync(process.argv[2] + '/ops/836-tom006-intros').filter(x => x.endsWith('.gaps.json'))) {
    const course = f.replace('.gaps.json', ''), ids = JSON.parse(fs.readFileSync(process.argv[2] + '/ops/836-tom006-intros/' + f)).map(o => o.lego_id); if (!ids.length) continue
    const { rows: [r] } = await c.query(`select count(*) n, count(*) filter (where ca.id is null or ca.voice_id<>'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9' or right(ca.text,21)<>' <break time="10ms"/>') bad from course_legos l left join course_audio ca on ca.id=l.presentation_audio_id::uuid where l.course_code=$1 and l.lego_id=any($2::text[])`, [course, ids])
    console.log(course, 'gap legos', +r.n, 'not on faded Tom-006', +r.bad); tot += +r.n; bad += +r.bad
  }
  console.log('TOTAL', tot, 'bad', bad); await c.end()
})()
