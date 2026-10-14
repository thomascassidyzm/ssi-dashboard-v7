// Job #836: 5 spread-out intros of a course (the clips learners now get) joined into one spot-check mp4 in $CS_SCRATCH/spot (needs gap.mp3).
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.psql'), quiet: true })
const { Client } = require('pg'), fs = require('fs'), { execFileSync } = require('child_process')
const course = process.argv[2], out = process.env.CS_SCRATCH + '/spot'
;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect()
  const plan = JSON.parse(fs.readFileSync(`${__dirname}/${course}.plan.json`, 'utf8')).filter(o => o.newText && o.oldClip && !o.alreadyT6)
  const pick = [0.1, 0.3, 0.5, 0.7, 0.9].map(f => plan[Math.floor(f * plan.length)])
  const files = []
  for (const [i, p] of pick.entries()) {
    const { rows: [r] } = await c.query(`select ca.id::text id, ca.text from course_legos l join course_audio ca on ca.id=l.presentation_audio_id::uuid where l.course_code=$1 and l.lego_id=$2`, [course, p.lego_id])
    const f = `${out}/${course}-${i}.mp3`; execFileSync('curl', ['-sf', '-o', f, `https://saysomethingin.app/api/audio/${r.id}`]); files.push(f)
    console.log(course, p.lego_id, r.id, r.text.slice(0, 90))
  }
  const list = files.flatMap(f => [`file '${f}'`, `file '${out}/gap.mp3'`]).join('\n'); fs.writeFileSync(`${out}/${course}.txt`, list)
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', `${out}/${course}.txt`, '-f', 'lavfi', '-i', 'color=c=black:s=320x180:r=5', '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', `${out}/${course}-spot.mp4`])
  await c.end()
})().catch(e => { console.error(e); process.exit(1) })
