// MOVED to Popty from ssi-learning-app/tools/intro-bank/playground/fetch-clips.mjs (job #699, Tom 2026-11-03: "we need everything that touches course content to be a popty tool"); behaviour unchanged, app paths via tools/lib/learning-app.mjs.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
const env = (f) => Object.fromEntries(readFileSync(f, 'utf8').split('\n').map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const E = { ...env(os.homedir() + '/ssi-dashboard-v7-clean/.env'), ...env(os.homedir() + '/ssi-learning-app/.env') }
const shared = createRequire(os.homedir() + '/ssi-learning-app/package.json')
const { S3Client, GetObjectCommand } = shared('@aws-sdk/client-s3')
const s3 = new S3Client({ region: E.AWS_REGION || 'eu-west-1', credentials: { accessKeyId: E.AWS_ACCESS_KEY_ID, secretAccessKey: E.AWS_SECRET_ACCESS_KEY } })
const sb = async (p) => (await fetch(`${E.SUPABASE_URL}/rest/v1/${p}`, { headers: { apikey: E.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${E.SUPABASE_SERVICE_ROLE_KEY}` } })).json()
const out = process.argv[2]
const LEGOS = ['I want','to speak','German','now','with you','now I want','to learn','I\'m trying to','to learn German','as often as possible']
const ch = JSON.parse(readFileSync(os.homedir() + '/.tmpbig/t734/charlotte.json')).voices[0]
const voices = {
  tom_001: { label: 'Tom (tom_001)', vid: 'cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2' },
  aran: { label: 'Aran (aran_english_003)', vid: 'cartesia_33890587-a29f-4416-ba61-2615c74f92fe' },
}
const ids = {}
for (const [k, v] of Object.entries(voices)) {
  const rows = await sb(`course_audio?voice_id=eq.${v.vid}&course_code=eq.deu_for_eng&role=eq.presentation&select=id,text,created_at&order=created_at.desc`)
  const by = {}; for (const r of rows) if (!(r.text in by)) by[r.text] = r.id
  ids[k] = { frame: by['The German for'], is: by['is'], legos: LEGOS.map((t) => by[t]) }
}
ids.charlotte = { frame: ch.frame.audioId, is: ch.is.audioId, legos: ch.legos.map((l) => l.audioId) }
const manifest = { legos: LEGOS, voices: {} }
for (const [k, v] of Object.entries(ids)) {
  if (!v.frame || !v.is || v.legos.some((x) => !x)) throw new Error('missing clip for ' + k + JSON.stringify(v))
  mkdirSync(`${out}/clips/${k}`, { recursive: true })
  const names = { frame: v.frame, is: v.is }; v.legos.forEach((id, i) => (names['lego' + i] = id))
  const files = {}
  for (const [n, id] of Object.entries(names)) {
    const [row] = await sb(`course_audio?id=eq.${id}&select=s3_key`)
    const r = await s3.send(new GetObjectCommand({ Bucket: E.S3_AUDIO_BUCKET || 'ssi-audio-stage', Key: row.s3_key }))
    writeFileSync(`${out}/clips/${k}/${n}.mp3`, Buffer.from(await r.Body.transformToByteArray()))
    files[n] = `clips/${k}/${n}.mp3`
  }
  manifest.voices[k] = { label: voices[k]?.label || 'Charlotte (shipped voice)', files }
}
writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 1))
console.log('ok')
