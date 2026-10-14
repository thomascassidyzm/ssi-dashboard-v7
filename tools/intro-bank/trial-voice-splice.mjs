#!/usr/bin/env node
/**
 * TRIAL #734: splice 3-part intros ("The German for" / LEGO / "is") exactly as the player does, for several
 * voices, and write ONE back-to-back wav per voice plus a level table. Uses the REAL introAssembly.ts
 * (esbuild-bundled), so what you hear is what ships. Writes nothing to course data.
 *
 *   node tools/intro-bank/trial-voice-splice.mjs <assemblySrcDir> <outDir> <spec.json>
 *
 * <assemblySrcDir> = a tree holding packages/player-vue/src/{playback,cache} (git archive of ssi-learning-app staging).
 * spec.json = { voices: [{ name, frame, is, legos: [x10] }] } where each piece is {audioId} (a course_audio id,
 * fetched from S3) or {file} (an mp3/wav on disk). Env: ~/ssi-learning-app/.env, ~/ssi-dashboard-v7-clean/.env.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import os from 'node:os'

const [srcDir, out, specFile] = process.argv.slice(2)
if (!specFile) { console.error('usage: trial-voice-splice.mjs <assemblySrcDir> <outDir> <spec.json>'); process.exit(1) }
mkdirSync(out, { recursive: true })
const spec = JSON.parse(readFileSync(specFile, 'utf8'))

const env = (f) => Object.fromEntries(readFileSync(f, 'utf8').split('\n').map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const E = { ...env(join(os.homedir(), 'ssi-dashboard-v7-clean/.env')), ...env(join(os.homedir(), 'ssi-learning-app/.env')) }
const shared = createRequire(join(os.homedir(), 'ssi-learning-app/package.json'))
const { S3Client, GetObjectCommand } = shared('@aws-sdk/client-s3')
const esbuild = shared(join(os.homedir(), 'ssi-learning-app/node_modules/.pnpm/esbuild@0.25.12/node_modules/esbuild'))

const bundled = join(out, '_introAssembly.mjs')
await esbuild.build({ entryPoints: [join(srcDir, 'packages/player-vue/src/playback/introAssembly.ts')], bundle: true, format: 'esm', platform: 'node', outfile: bundled, loader: { '.json': 'json' }, logLevel: 'error' })
const A = await import(pathToFileURL(bundled).href)

const s3 = new S3Client({ region: E.AWS_REGION || 'eu-west-1', credentials: { accessKeyId: E.AWS_ACCESS_KEY_ID, secretAccessKey: E.AWS_SECRET_ACCESS_KEY } })
const sb = async (path) => (await fetch(`${E.SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: E.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${E.SUPABASE_SERVICE_ROLE_KEY}` } })).json()
const SR = 24000
const decode = (input) => {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 'f32le', '-ac', '1', '-ar', String(SR), 'pipe:1'], { input, maxBuffer: 1 << 28 })
  return { sampleRate: SR, channels: [Float32Array.from(new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4))] }
}
async function piece(p) {
  if (p.file) return decode(readFileSync(p.file))
  const [row] = await sb(`course_audio?id=eq.${p.audioId}&select=s3_key`)
  const r = await s3.send(new GetObjectCommand({ Bucket: E.S3_AUDIO_BUCKET || 'ssi-audio-stage', Key: row.s3_key }))
  return decode(Buffer.from(await r.Body.transformToByteArray()))
}
const db = (x) => 20 * Math.log10(Math.max(x, 1e-9))
const lvl = (c) => db(A.voicedRms(c))
const peak = (c) => { let p = 0; for (const x of c.channels[0]) p = Math.max(p, Math.abs(x)); return p }
const silence = (ms) => ({ sampleRate: SR, channels: [new Float32Array(Math.round(SR * ms / 1000))] })
function wav(c) {
  const n = c.channels[0].length, buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8)
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22)
  buf.writeUInt32LE(c.sampleRate, 24); buf.writeUInt32LE(c.sampleRate * 2, 28)
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, c.channels[0][i])) * 32767), 44 + i * 2)
  return buf
}

const table = []
for (const v of spec.voices) {
  const frame = await piece(v.frame), is = await piece(v.is)
  const intros = []
  for (let i = 0; i < v.legos.length; i++) {
    const lego = await piece(v.legos[i])
    const pieces = [frame, lego, is]                     // same order planIntroPieces gives: [frame, LEGO, "is"]
    const final = A.normaliseIntro(A.concatWithGaps(A.matchLoudness(pieces), A.DEFAULT_INTRO_PIECE_GAP_MS))
    const gap = Math.round(SR * A.DEFAULT_INTRO_PIECE_GAP_MS / 1000)
    let at = 0
    const seg = pieces.map((p) => { const len = p.channels[0].length; const s = { sampleRate: SR, channels: [final.channels[0].slice(at, at + len)] }; at += len + gap; return s })
    table.push({ voice: v.name, n: i + 1, label: v.labels?.[i] ?? '', rawDb: pieces.map(lvl), outDb: seg.map(lvl), overallDb: lvl(final), peak: peak(final), legoOverFrameDb: lvl(seg[1]) - (lvl(seg[0]) + lvl(seg[2])) / 2 })
    intros.push(final)
  }
  const parts = []
  intros.forEach((c, i) => { if (i) parts.push(silence(1200)); parts.push(c) })
  const all = A.concatWithGaps(parts, 0)
  writeFileSync(join(out, `${v.name}.wav`), wav(all))
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', join(out, `${v.name}.wav`), '-b:a', '96k', join(out, `${v.name}.mp3`)])
  console.error(`${v.name}: ${(all.channels[0].length / SR).toFixed(1)}s`)
}
writeFileSync(join(out, 'levels.json'), JSON.stringify(table, null, 1))
const f = (x) => x.toFixed(1)
console.log('| voice | # | LEGO | frame/LEGO/is raw dBFS | frame/LEGO/is out dBFS | overall | peak | LEGO over frame |\n|---|---|---|---|---|---|---|---|')
for (const r of table) console.log(`| ${r.voice} | ${r.n} | ${r.label} | ${r.rawDb.map(f).join(' / ')} | ${r.outDb.map(f).join(' / ')} | ${f(r.overallDb)} | ${r.peak.toFixed(2)} | ${f(r.legoOverFrameDb)} |`)
