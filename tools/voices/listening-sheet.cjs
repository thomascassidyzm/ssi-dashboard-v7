#!/usr/bin/env node
/**
 * THE LISTENING SHEET (job #703): a few clips per likely-speaker group, playable
 * on a phone, for a person to NAME BY EAR. Writes markdown with <audio> tags to
 * stdout (or --out); publish it with /api/publish-doc. Clip urls are presigned
 * for 7 days, so nothing about the bucket is made public.
 *
 *   node tools/voices/listening-sheet.cjs [--per-group 3] [--out sheet.md]
 *
 * It lists only groups nobody has named (human_speaker_groups.voice_id IS NULL),
 * plus the aliased takes a policy list already names, for a yes/no check.
 * A group's pitch is given as evidence ("sounds female") and never as a name.
 * To record an answer: tools/voices/name-speaker-group.cjs <group_id> <voice_id> --by <who>.
 */
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const { presign } = require('./s3-presign.cjs')

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const PER = Number(opt('--per-group', 3))

const DIALECT = { cym_n: 'Welsh North', cym_s: 'Welsh South', cym_anthem: 'Welsh anthem course' }
const ROLE = {
  known: 'the English voice (the prompt you hear)', target1: 'Welsh voice 1', target2: 'Welsh voice 2',
  presentation: 'the English presenter ("The Welsh for … is …")', instruction: 'English instructions', encouragement: 'English encouragements', welcome: 'the welcome',
}
const where = g => {
  const stem = g.course_code.split('_for_')[0]
  return `${DIALECT[stem] || stem} · ${ROLE[g.role] || g.role}`
}

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const m = fs.readFileSync(path.join(__dirname, '..', '..', '.env.psql'), 'utf8').match(/DATABASE_URL=["']?([^"'\n]+)/)
  if (!m) throw new Error('DATABASE_URL not found')
  return m[1]
}

async function main() {
  const creds = { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, bucket: process.env.S3_AUDIO_BUCKET || 'ssi-audio-stage', region: process.env.AWS_REGION || 'eu-west-1' }
  if (!creds.accessKeyId) throw new Error('AWS credentials not in the environment (source .env)')
  const c = new Client({ connectionString: databaseUrl(), statement_timeout: 60000 })
  await c.connect()
  try {
    const { rows: groups } = await c.query(
      `SELECT * FROM human_speaker_groups WHERE voice_id IS NULL ORDER BY course_code, role, group_id`)
    const { rows: artists } = await c.query(`SELECT voice_id, human_name, gender, dialect FROM voices WHERE type = 'human' AND clip_language IS NOT NULL AND human_name !~* 'test' ORDER BY human_name`)
    const clip = async id => (await c.query('SELECT id, text, s3_key, duration_ms FROM course_audio WHERE id = $1', [id])).rows[0]

    const L = []
    L.push('# Who is speaking? A listening sheet for the unnamed Welsh recordings')
    L.push('')
    L.push('Each group below is a set of recordings that **sound like one person in one stretch of the course**. I have grouped them by ear-of-the-machine (pitch and voice colour); I have **not** given anyone a name. Play the few clips, then tell me who it is — a name, or "don\'t know".')
    L.push('')
    L.push('**Answer like this:** `cym_s_for_eng.target1.g1 = Cerys Matthews` — one line per group. A group you cannot place: `= not sure`.')
    L.push('')
    L.push(`Artists I already have on the list: ${artists.map(a => `${a.human_name}${a.dialect ? ` (${a.dialect})` : ''}`).join(', ')}. Anyone else — just say the name and I will add them.`)
    L.push('')
    for (const g of groups) {
      const ids = (g.sample_audio_ids || []).slice(0, PER)
      const clips = []
      for (const id of ids) { const r = await clip(id); if (r) clips.push(r) }
      const sound = g.est_gender === 'f' ? 'sounds like a woman' : g.est_gender === 'm' ? 'sounds like a man' : 'pitch in between'
      L.push(`## ${g.group_id}`)
      L.push(`**${where(g)}** · ${g.clip_count.toLocaleString('en-GB')} recordings · ${sound} (about ${Math.round(g.f0_median_hz)} Hz)`)
      L.push('')
      for (const r of clips) {
        L.push(`"${String(r.text).replace(/"/g, "'")}"`)
        L.push(`<audio controls preload="none" src="${presign({ ...creds, key: r.s3_key })}"></audio>`)
        L.push('')
      }
    }
    const out = L.join('\n')
    if (opt('--out')) fs.writeFileSync(opt('--out'), out); else process.stdout.write(out)
  } finally { await c.end() }
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1) })
