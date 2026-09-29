#!/usr/bin/env node
/**
 * THE LISTENING SHEET (job #703): a few clips per likely-speaker group, playable
 * on a phone, for a person to NAME BY EAR. Writes markdown to --out; publish that
 * with /api/publish-doc.
 *
 *   node tools/voices/listening-sheet.cjs --out sheet.md [--per-group 4]
 *   env: AWS_* (read the clips), CS_CONV_TOKEN + CS_CONV_ID (this session's surface identity, to publish the audio)
 *
 * WHY EACH GROUP IS ONE AUDIO FILE. The surface's document renderer turns an
 * <audio> tag into a player only for a plain https URL ending .mp3 — a presigned
 * S3 url carries `&` and a query string and is deliberately refused (a hardening
 * rule, media-embed.js). So the group's clips are joined, with a pause between,
 * into ONE audio-only mp4 and published as a file document, whose page has a
 * native player: one tap per group, and the clip order matches the numbered
 * words under it.
 *
 * It lists only groups nobody has named (human_speaker_groups.voice_id IS NULL),
 * then two already-filed things worth an ear. A group's pitch is given as
 * evidence ("sounds like a man") and never as a name.
 * To record an answer: tools/voices/name-speaker-group.cjs <group_id> <voice_id> --by <who>.
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn, execFile } = require('child_process')
const { Client } = require('pg')

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const PER = Number(opt('--per-group', 4))
const GAP_SECONDS = 1.4

const DIALECT = { cym_n: 'Welsh North', cym_s: 'Welsh South', cym_anthem: 'Welsh anthem course' }
const ROLE = {
  known: 'the English voice (the prompt you hear)', target1: 'Welsh voice 1', target2: 'Welsh voice 2',
  presentation: 'the English presenter ("The Welsh for … is …")', instruction: 'English instructions', encouragement: 'English encouragements', welcome: 'the welcome',
}
const show = t => { const x = String(t).replace(/<\/?(tgt|src)>/g, '').replace(/"/g, "'"); return x.length > 150 ? x.slice(0, 147) + '…' : x }
const where = g => {
  // a shared English recording belongs to many courses; naming the first one it happens to sit in would mislead
  if (g.group_id.startsWith('shared.')) return `English voice shared across many courses · ${ROLE[g.role] || g.role}${g.role === 'presentation' ? ' (both Welsh courses)' : ''}`
  const stem = g.course_code.split('_for_')[0]
  return `${DIALECT[stem] || stem} · ${ROLE[g.role] || g.role}`
}

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const m = fs.readFileSync(path.join(__dirname, '..', '..', '.env.psql'), 'utf8').match(/DATABASE_URL=["']?([^"'\n]+)/)
  if (!m) throw new Error('DATABASE_URL not found')
  return m[1]
}

function s3Download(key, dest) {
  const region = process.env.AWS_REGION || 'eu-west-1', bucket = process.env.S3_AUDIO_BUCKET || 'ssi-audio-stage'
  return new Promise((resolve, reject) => {
    const c = spawn('curl', ['-sf', '--max-time', '60', '--aws-sigv4', `aws:amz:${region}:s3`, '--user', `${process.env.AWS_ACCESS_KEY_ID}:${process.env.AWS_SECRET_ACCESS_KEY}`,
      `https://${bucket}.s3.${region}.amazonaws.com/${key}`, '-o', dest])
    c.on('close', code => (code === 0 ? resolve() : reject(new Error(`download ${key}: curl exit ${code}`))))
  })
}
const run = (cmd, a) => new Promise((resolve, reject) => execFile(cmd, a, { maxBuffer: 1 << 24 }, (e, so, se) => (e ? reject(new Error(String(se || e.message).slice(0, 300))) : resolve(so))))

/** Join clips with a pause between, as one audio-only mp4. */
async function joinClips(keys, out, tmp) {
  const files = []
  for (const [i, k] of keys.entries()) { const f = path.join(tmp, `c${i}.mp3`); await s3Download(k, f); files.push(f) }
  const inputs = files.flatMap(f => ['-i', f]).concat(['-f', 'lavfi', '-t', String(GAP_SECONDS), '-i', 'anullsrc=r=24000:cl=mono'])
  const gap = files.length
  const norm = files.map((_, i) => `[${i}:a]aresample=24000,aformat=channel_layouts=mono[a${i}]`).join(';')
  const seq = files.map((_, i) => `[a${i}][${gap}:a]`).join('')
  await run('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', `${norm};${seq}concat=n=${files.length * 2}:v=0:a=1[o]`, '-map', '[o]', '-c:a', 'aac', '-b:a', '64k', out])
}

async function publishAudio(file, title) {
  const r = await fetch('http://localhost:4317/api/publish-doc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-cs-conv': process.env.CS_CONV_TOKEN || '' },
    body: JSON.stringify({ file, title, conv_id: process.env.CS_CONV_ID, internal: true }),
  })
  const j = await r.json()
  if (!r.ok || !j.docUrl) throw new Error(`publish failed: ${JSON.stringify(j).slice(0, 200)}`)
  return j.docUrl
}

async function main() {
  if (!process.env.AWS_ACCESS_KEY_ID) throw new Error('AWS credentials not in the environment (source .env)')
  if (!process.env.CS_CONV_TOKEN || !process.env.CS_CONV_ID) throw new Error('CS_CONV_TOKEN and CS_CONV_ID are needed to publish the audio')
  const tmp = fs.mkdtempSync(path.join(process.env.CS_SCRATCH || os.tmpdir(), 'sheet-'))
  const c = new Client({ connectionString: databaseUrl(), statement_timeout: 60000 })
  await c.connect()
  try {
    const { rows: groups } = await c.query('SELECT * FROM human_speaker_groups WHERE voice_id IS NULL ORDER BY course_code, role, group_id')
    const { rows: artists } = await c.query(`SELECT human_name, dialect FROM voices WHERE type = 'human' AND clip_language IS NOT NULL AND human_name !~* 'test' ORDER BY human_name`)
    const clip = async id => (await c.query('SELECT id, text, s3_key FROM course_audio WHERE id = $1', [id])).rows[0]

    /** One playable file for these clips; returns { url, texts }. */
    const bundle = async (label, rows) => {
      const uniq = []
      for (const r of rows) if (r && !uniq.some(x => x.s3_key === r.s3_key)) uniq.push(r)
      if (!uniq.length) return null
      const out = path.join(tmp, `${label.replace(/[^\w]+/g, '_')}.mp4`)
      await joinClips(uniq.map(r => r.s3_key), out, tmp)
      return { url: await publishAudio(out, `Listening: ${label}`), texts: uniq.map(r => show(r.text)) }
    }

    const L = []
    L.push('# Who is speaking? A listening sheet for the unnamed recordings')
    L.push('')
    L.push('Each group below is a set of recordings that **sound like one person in one stretch of the course**. I have grouped them by pitch and voice colour; I have **not** given anyone a name. Tap the play link — it is one file with the clips in the order listed under it, with a pause between — then tell me who it is: a name, or "not sure".')
    L.push('')
    L.push('**Answer like this:** `A = Cerys Matthews, B = not sure, C = Catrin` — one letter per group. If a group holds two different voices, say so and which clip.')
    L.push('')
    L.push(`Artists already on the list: ${artists.map(a => `${a.human_name}${a.dialect ? ` (${a.dialect})` : ''}`).join(', ')}. Anyone else — just say the name and I will add them.`)
    L.push('')
    let letter = 0
    for (const g of groups) {
      const tag = String.fromCharCode(65 + letter++)
      const rows = []
      for (const id of (g.sample_audio_ids || []).slice(0, PER)) rows.push(await clip(id))
      const b = await bundle(`${tag} ${g.group_id}`, rows)
      const sound = g.est_gender === 'f' ? 'sounds like a woman' : g.est_gender === 'm' ? 'sounds like a man' : 'pitch in between'
      const inSlot = groups.filter(x => x.course_code === g.course_code && x.role === g.role && !x.group_id.startsWith('shared.')).length
      const stretch = g.seed_lo != null && inSlot > 1 ? ` · the part of the course around sentences ${g.seed_lo}–${g.seed_hi}` : ''
      L.push(`## ${tag} — ${where(g)}`)
      L.push(`${g.clip_count.toLocaleString('en-GB')} recordings${stretch} · ${sound} (about ${Math.round(g.f0_median_hz)} Hz) · _${g.group_id}_`)
      L.push('')
      if (b) { L.push(`▶ **[Play ${b.texts.length} clips](${b.url})**`); L.push(''); b.texts.forEach((t, i) => L.push(`${i + 1}. "${t}"`)); L.push('') }
    }

    // two already-filed things worth an ear: a name a policy alias gave, and a gender the measurement doubts
    const checks = [
      ['Filed as Catrin because the cast policy lists `catrin_human` as her old spelling — the anthem takes sit further from her other recordings than they should. Same person?',
        [['1 = her other recordings', "voice_id = 'human_catrinlliar_cym_n' AND role = 'target1'"], ['2 = the anthem takes filed as her', "voice_id = 'catrin_human'"]]],
      ["Sasha Wanasky is registered as a woman (the cast policy's word), but her takes measure about 114 Hz — the usual range for a man. Which is right?",
        [['Sasha Wanasky', "voice_id = 'human_sasha_wanasky_deu_at'"]]],
    ]
    L.push('---')
    L.push('# Two things already filed that I would like an ear on')
    for (const [question, sets] of checks) {
      L.push('')
      L.push(`**${question}**`)
      for (const [label, cond] of sets) {
        const { rows } = await c.query(`SELECT id, text, s3_key FROM course_audio WHERE ${cond} AND duration_ms BETWEEN 1500 AND 6000 ORDER BY md5(id::text) LIMIT 3`)
        const b = await bundle(label, rows)
        L.push('')
        if (b) { L.push(`▶ **[${label} — play ${b.texts.length} clips](${b.url})**`); L.push(''); b.texts.forEach((t, i) => L.push(`${i + 1}. "${t}"`)) }
      }
    }
    const out = L.join('\n')
    if (opt('--out')) fs.writeFileSync(opt('--out'), out); else process.stdout.write(out)
  } finally { await c.end(); fs.rmSync(tmp, { recursive: true, force: true }) }
}
if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1) })
