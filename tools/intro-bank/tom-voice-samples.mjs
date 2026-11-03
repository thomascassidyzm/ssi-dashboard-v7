#!/usr/bin/env node
// MOVED to Popty from ssi-learning-app/tools/intro-bank/tom-voice-samples.mjs (job #699, Tom 2026-11-03: "we need everything that touches course content to be a popty tool"); behaviour unchanged, app paths via tools/lib/learning-app.mjs.
// NOTE: reads the database with psql (read-only session) by hand. Under the 2026-10-14 HARD RULE (job #384) a run needs this
// moved onto services/shared/agent-db.cjs or a Popty read route first; moved as-is in #699 (keep behaviour identical).
/**
 * Tom-voice spliced intro samples (job #310, Tom 2026-10-13). TEST ROUND, not a rollout.
 *
 * For courses whose LEGO prompts are Tom-006 but whose intros are not, assemble
 * ~8 intros per course exactly as the player would (introAssembly.ts, bundled
 * with esbuild: loudness match, +INTRO_LEGO_EMPHASIS_DB on the LEGO, 120 ms gaps,
 * overall normalise + peak limit), then apply the Tom-006 intro ending the
 * rulings call for (80 ms equal-power fade over the last speech, 250 ms silence).
 *   [The <Lang> for] [LEGO prompt] [is]  (+ [as in] [seed sentence prompt] on some)
 * Writes <out>/<course>/*.mp3 and <out>/samples.json. Pieces + prompts are existing
 * Tom-006 library clips; only the frame pieces were rendered (see PIECES).
 *
 *   node tools/intro-bank/tom-voice-samples.mjs <outDir>
 */
import { APP } from '../lib/learning-app.mjs'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import os from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const repo = APP   // the learning-app checkout: the player's introAssembly.ts is bundled from it
const out = process.argv[2]
if (!out) { console.error('usage: tom-voice-samples.mjs <outDir>'); process.exit(1) }
mkdirSync(out, { recursive: true })
const home = os.homedir()
const env = (f) => Object.fromEntries(readFileSync(f, 'utf8').split('\n').map((l) => l.match(/^([A-Za-z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const POPTY = join(home, 'SSi/ssi-dashboard-v7-clean')
const E = { ...env(join(POPTY, '.env')) }
const DB = env(join(POPTY, '.env.psql')).DATABASE_URL
const AWS = createRequire(join(POPTY, 'package.json'))('aws-sdk')
const esbuild = createRequire(join(home, 'SSi/ssi-learning-app/package.json'))(join(home, 'SSi/ssi-learning-app/node_modules/.pnpm/esbuild@0.25.12/node_modules/esbuild'))

const bundled = join(out, '_introAssembly.mjs')
await esbuild.build({ entryPoints: [join(repo, 'packages/player-vue/src/playback/introAssembly.ts')], bundle: true, format: 'esm', platform: 'node', outfile: bundled, loader: { '.json': 'json' }, logLevel: 'error' })
const A = await import(pathToFileURL(bundled).href)

const s3 = new AWS.S3({ accessKeyId: E.AWS_ACCESS_KEY_ID, secretAccessKey: E.AWS_SECRET_ACCESS_KEY, region: E.AWS_REGION || 'eu-west-1' })
const Q = (sql) => execFileSync('psql', [DB, '-At', '-F', '|', '-c', sql], { maxBuffer: 1 << 26 }).toString().trim().split('\n').filter(Boolean).map((l) => l.split('|'))
const SR = 24000
const keyOf = {}
const mp3 = {}
async function mp3Of(id) {
  if (mp3[id]) return mp3[id]
  const [[k]] = [Q(`select s3_key from course_audio where id='${id}'`)[0]]
  const r = await s3.getObject({ Bucket: E.S3_AUDIO_BUCKET || 'ssi-audio-stage', Key: k }).promise()
  return (mp3[id] = r.Body)
}
const pcmOf = async (id) => {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 'f32le', '-ac', '1', '-ar', String(SR), 'pipe:1'], { input: await mp3Of(id), maxBuffer: 1 << 28 })
  return { sampleRate: SR, channels: [Float32Array.from(new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4))] }
}

// Frame pieces: Tom-006, rendered through Popty's route 2026-10-13 (job #310) except "is", which already existed.
const PIECES = {
  is: '2e12b859-911c-4ef3-b9b7-1cdc81703243',
  asIn: 'fd867f14-4469-4460-8a2e-2f95aafa62cb',
  asYouKnow: '4458646e-aa3a-4eca-a0a8-0c9df077d4a0',
  langFor: { afr_for_eng: 'a71b4e28-08a2-4109-9c97-bb9edce9c8ac', nld_for_eng: 'f1333aba-a184-44a5-b41f-66ee74a66e89', pol_for_eng: 'f3cb6743-d418-459c-867d-d9d939cdb807', ell_for_eng: 'dc40091a-12bf-4e79-99d7-29fd2b1698bd', eus_for_eng: '937a95b2-d3ae-4b3b-955e-39c1801918aa' },
}
const TOM = '%d293d509%'

const toMp3 = (c, file) => {
  const b = Buffer.alloc(c.channels[0].length * 2)
  c.channels[0].forEach((v, i) => b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), i * 2))
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 's16le', '-ar', String(SR), '-ac', '1', '-i', 'pipe:0', '-b:a', '80k', file], { input: b })
}

const COURSES = (process.argv[3] || 'afr_for_eng,nld_for_eng,pol_for_eng,ell_for_eng,eus_for_eng').split(',')
const samples = []
for (const course of COURSES) {
  mkdirSync(join(out, course), { recursive: true })
  // LEGOs with a Tom-006 prompt, a NON-Tom current intro, and a Tom-006 seed-sentence prompt (the context line).
  const rows = Q(`select l.lego_id, l.known_text, l.known_audio_id, l.presentation_audio_id, s.known_text, s.known_audio_id
    from course_legos l join course_audio k on k.id=l.known_audio_id and k.voice_id like '${TOM}'
    join course_audio pv on pv.id=(case when l.presentation_audio_id ~ '^[0-9a-fA-F-]{36}$' then l.presentation_audio_id::uuid end) and pv.voice_id not like '${TOM}'
    join course_seeds s on s.course_code=l.course_code and s.seed_number=l.seed_number
    join course_audio sv on sv.id=s.known_audio_id and sv.voice_id like '${TOM}'
    where l.course_code='${course}' and l.seed_number between 2 and 30 and lower(l.known_text)<>lower(s.known_text)
    order by l.seed_number, l.lego_index`)
  const seen = new Set(), pick = []
  for (const r of rows) { const sn = r[0].slice(0, 5); if (seen.has(sn)) continue; seen.add(sn); pick.push(r); if (pick.length === 8) break }
  let i = 0
  for (const [legoId, lego, kId, pId, seedText, sId] of pick) {
    i++
    const ctxKind = i <= 4 ? null : i <= 6 ? 'asIn' : 'asYouKnow' // 4 plain, 2 "as in", 2 "as you already know"
    const ids = [PIECES.langFor[course], kId, PIECES.is]
    if (ctxKind) ids.push(PIECES[ctxKind], sId)
    const clips = await Promise.all(ids.map(pcmOf))
    // Same chain as assembleIntroClip: matchLoudness (LEGO = index 1), concat with the gap, normaliseIntro.
    const joined = A.normaliseIntro(A.concatWithGaps(A.matchLoudness(clips), A.getIntroPieceGapMs()))
    const final = A.applyTomEnding(joined) // the player's own ending
    const base = `${course}/${legoId}${ctxKind ? '_' + ctxKind : ''}`
    toMp3(final, join(out, `${base}.mp3`))
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', 'pipe:0', '-b:a', '80k', join(out, `${base}_current.mp3`)], { input: await mp3Of(pId) })
    samples.push({ course, legoId, lego, ctxKind, seedText: ctxKind ? seedText : null, file: `${base}.mp3`, current: `${base}_current.mp3`, ms: Math.round(final.channels[0].length / SR * 1000) })
    console.log(course, legoId, JSON.stringify(lego), ctxKind || '-', samples.at(-1).ms + 'ms')
  }
}
writeFileSync(join(out, 'samples.json'), JSON.stringify({ gapMs: A.getIntroPieceGapMs(), emphasisDb: A.INTRO_LEGO_EMPHASIS_DB, targetDb: A.INTRO_TARGET_DB, samples }, null, 2))
