#!/usr/bin/env node
/**
 * SAMPLES ONLY (job #516): build N spliced presentation intros for a course from existing Charlotte clips and write them as mp3 files
 * plus a listening page. Writes NOTHING to course_audio or S3 and replaces no live clip; renders nothing (a missing piece makes the
 * intro ineligible for the sample). The real assembly is services/shared/intro-splice.cjs, run by the render route and phase8 fill.
 *   node tools/audio/intro-splice-sample.cjs --course deu_for_eng --n 3 --out public/evidence/deu-splice
 */
const fs = require('fs'), os = require('os'), path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env.psql') })
require('dotenv').config({ path: path.join(__dirname, '../../.env') })
const { Client } = require('pg')
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3')
const { planIntro, joinPcm, encodeWav, decodeMono } = require('../../services/shared/intro-splice.cjs')
const audioProcessor = require('../../services/audio-processor.cjs')
const voiceConfigService = require('../../services/voice-config-service.cjs')
const policy = require('../../services/shared/voicing-policy.cjs')
const { normalizeForAudio, audioKeyCandidates } = require('../../services/shared/text-normalize.cjs')

const argv = process.argv.slice(2)
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }

async function main() {
  const course = opt('--course'), n = Number(opt('--n', 3)), out = path.resolve(opt('--out'))
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); await pg.connect()
  const { rows: [crs] } = await pg.query('select course_code, known_lang, target_lang from courses where course_code=$1', [course])
  const { rows } = await pg.query(`select l.lego_id, ca.text from course_legos l join course_audio ca on ca.id::text = l.presentation_audio_id::text
    where l.course_code=$1 and l.seed_number <= 100 order by l.seed_number, l.lego_index`, [course])
  const voices = [policy.config.englishVoice, policy.config.englishVoice.replace(/^cartesia_/, '')]
  const find = async text => {
    const { rows: r } = await pg.query(`select id::text, s3_key from course_audio where language='eng' and voice_id = any($1) and text_normalized = any($2) and s3_key not like 'pending/%' order by created_at limit 1`,
      [voices, audioKeyCandidates(normalizeForAudio(text))])
    return r[0] || null
  }
  const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' })
  const fetchObject = async key => Buffer.from(await (await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }))).Body.transformToByteArray())
  const target = (await voiceConfigService.masteringOptsFor(policy.config.englishVoice)).targetLufs
  fs.mkdirSync(out, { recursive: true })
  const made = []
  // prefer one with a context, one bare, then whatever builds — a spread of shapes
  const want = ['ctx', 'bare', 'ctx', 'ctx', 'bare']
  const taken = new Set()
  for (let k = 0; made.length < n && k < want.length; k++) {
    for (const r of rows) {
      if (taken.has(r.lego_id)) continue
      const plan = planIntro(r.text, crs); if (!plan) continue
      if ((plan.pieces.length > 3) !== (want[k] === 'ctx')) continue
      const found = []; for (const p of plan.pieces) found.push({ ...p, clip: await find(p.text) })
      if (found.some(p => !p.clip)) continue
      taken.add(r.lego_id)
      const pcms = []; for (const p of found) pcms.push(await decodeMono(await fetchObject(p.clip.s3_key)))
      const { pcm } = joinPcm(pcms, found.map(p => p.gapAfterMs))
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'splice-')), wav = path.join(tmp, 'j.wav'), mp3 = path.join(out, `${course}-${r.lego_id}-spliced.mp3`)
      fs.writeFileSync(wav, encodeWav(pcm))
      await audioProcessor.masterToHouseLoudness(wav, mp3, target)
      made.push({ lego: r.lego_id, text: r.text, file: path.basename(mp3), pieces: found.map(p => ({ kind: p.kind, text: p.text, audioId: p.clip.id })) })
      console.log('built', r.lego_id, r.text)
      break
    }
  }
  fs.writeFileSync(path.join(out, 'samples.json'), JSON.stringify(made, null, 1))
  await pg.end()
}
main().catch(e => { console.error(e); process.exit(1) })
