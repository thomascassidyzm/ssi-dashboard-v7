#!/usr/bin/env node
// MOVED to Popty from ssi-learning-app/tools/intro-bank/emphasis-audition.mjs (job #699, Tom 2026-11-03: "we need everything that touches course content to be a popty tool"); behaviour unchanged, app paths via tools/lib/learning-app.mjs.
/**
 * Emphasis audition (job #701, Tom 2026-10-12): render the spliced intro for
 * a few LEGOs at LEGO-over-frame emphasis of +3 / +6 / +9 dB, the three
 * versions in sequence in ONE wav per LEGO (1.5 s silence between, then a
 * further spoken-free 1.5 s gap — silence only). Uses the REAL player code
 * (introAssembly.ts bundled with esbuild), so what you hear is what ships.
 *
 *   node tools/intro-bank/emphasis-audition.mjs <outDir>
 * Env: from ~/ssi-learning-app/.env (Supabase) and ~/ssi-dashboard-v7-clean/.env (AWS).
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
if (!out) { console.error('usage: emphasis-audition.mjs <outDir>'); process.exit(1) }
mkdirSync(out, { recursive: true })

const env = (f) => Object.fromEntries(readFileSync(f, 'utf8').split('\n').map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const E = { ...env(join(os.homedir(), 'ssi-dashboard-v7-clean/.env')), ...env(join(os.homedir(), 'ssi-learning-app/.env')) }
const shared = createRequire(join(os.homedir(), 'ssi-learning-app/package.json'))
const { S3Client, GetObjectCommand } = shared('@aws-sdk/client-s3')
const esbuild = shared(join(os.homedir(), 'ssi-learning-app/node_modules/.pnpm/esbuild@0.25.12/node_modules/esbuild'))

// Bundle the real assembly code (with its bank json) into a temp ESM file.
const bundled = join(out, '_introAssembly.mjs')
await esbuild.build({ entryPoints: [join(repo, 'packages/player-vue/src/playback/introAssembly.ts')], bundle: true, format: 'esm', platform: 'node', outfile: bundled, loader: { '.json': 'json' }, logLevel: 'error' })
const A = await import(pathToFileURL(bundled).href)

const s3 = new S3Client({ region: E.AWS_REGION || 'eu-west-1', credentials: { accessKeyId: E.AWS_ACCESS_KEY_ID, secretAccessKey: E.AWS_SECRET_ACCESS_KEY } })
const sb = async (path) => (await fetch(`${E.SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: E.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${E.SUPABASE_SERVICE_ROLE_KEY}` } })).json()
const CHARLOTTE = 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121'
const SR = 24000

async function clipById(id) {
  const [row] = await sb(`course_audio?id=eq.${id}&select=s3_key`)
  const r = await s3.send(new GetObjectCommand({ Bucket: E.S3_AUDIO_BUCKET || 'ssi-audio-stage', Key: row.s3_key }))
  const mp3 = Buffer.from(await r.Body.transformToByteArray())
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 'f32le', '-ac', '1', '-ar', String(SR), 'pipe:1'], { input: mp3, maxBuffer: 1 << 28 })
  const f = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4)
  return { sampleRate: SR, channels: [Float32Array.from(f)] }
}
async function legoClip(course, text) {
  const rows = await sb(`course_audio?course_code=eq.${course}&role=eq.known&text=eq.${encodeURIComponent(text)}&voice_id=eq.${CHARLOTTE}&select=id`)
  if (!rows.length) throw new Error(`no Charlotte known clip for ${course} "${text}"`)
  return clipById(rows[0].id)
}
const silence = (ms) => ({ sampleRate: SR, channels: [new Float32Array(Math.round(SR * ms / 1000))] })

const JOBS = [
  { name: 'spa_S0001L01', course: 'spa_for_eng', base: 'spa', legoId: 'S0001L01', text: 'I want' },
  { name: 'spa_S0001L02', course: 'spa_for_eng', base: 'spa', legoId: 'S0001L02', text: 'to speak' },
  { name: 'deu_S0001L01', course: 'deu_for_eng', base: 'deu', legoId: 'S0001L01', text: 'I want' },
]
const LEVELS = [3, 6, 9]
const bank = JSON.parse(readFileSync(join(repo, 'packages/player-vue/src/playback/introBank.data.json'), 'utf8'))
const report = []
for (const j of JOBS) {
  const langFor = bank.langFor[j.base][0]
  const is = bank.is[0]
  const pieces = [await clipById(langFor.id), await legoClip(j.course, j.text), await clipById(is.id)]
  const versions = LEVELS.map((db) => A.concatWithGaps(A.matchLoudness(pieces, db), A.DEFAULT_INTRO_PIECE_GAP_MS))
  const parts = []
  versions.forEach((v, i) => { if (i) parts.push(silence(1500)); parts.push(v) })
  const all = A.concatWithGaps(parts, 0)
  let peak = 0; for (const x of all.channels[0]) peak = Math.max(peak, Math.abs(x))
  const f = join(out, `${j.name}.wav`)
  writeFileSync(f, pcmToWav(all))
  report.push(`${j.name}: ${all.channels[0].length / SR | 0}s peak ${peak.toFixed(3)}`)
  console.log(report.at(-1))
}

function pcmToWav(c) {
  const n = c.channels[0].length, buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8)
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(c.sampleRate, 24); buf.writeUInt32LE(c.sampleRate * 2, 28)
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, c.channels[0][i])) * 32767), 44 + i * 2)
  return buf
}
