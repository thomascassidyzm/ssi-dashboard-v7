#!/usr/bin/env node
/**
 * seed-audio-tail-probe.cjs — census + truncation measurement for one seed.
 *
 * WHY THIS EXISTS ALONGSIDE tools/physical-tail-probe.cjs. That probe measures RMS
 * over the final 50 ms OF THE FILE. Course clips carry a trailing silence pad
 * (median ~98 ms in the seeds measured so far), so that window lands entirely in the
 * pad: it reads the padding, not the speech, and scores a cut clip as clean. Measured
 * on deu/fra seed 1, its metric ran −124 dB to −30 dB across all 139 clips — against
 * its own −6 dB threshold it would have called every clip clean, cut ones included.
 *
 * Everything here is anchored to the ONSET OF TRAILING SILENCE instead, so the pad is
 * excluded by construction.
 *
 * TWO THINGS IT GETS RIGHT THAT ARE EASY TO GET WRONG
 *  1. The clip set is resolved through the *_audio_id columns on course_seeds /
 *     course_legos / course_practice_phrases — NOT course_audio.lego_id, which is
 *     null on most rows. Counting by lego_id under-reports badly (it reported zero
 *     `known` clips for fra_for_eng seed 1, which actually has 20).
 *  2. Fetches via credentialed S3 GET, not the public URL. The repair-candidates/
 *     prefix is not publicly readable while mastered/ is, so a public-URL probe
 *     reports spurious 403s. The learner uses presigned URLs, so credentialed GET
 *     is the faithful comparison.
 *
 * METRICS, per clip (all relative to the silence onset):
 *   tailRatioDb  RMS of the 50 ms immediately BEFORE the onset, vs body RMS
 *   stepDb       last 10 ms of signal vs the 20 ms of silence after it
 *   decayDb      envelope 5 ms before onset minus 55 ms before it. Threshold-
 *                independent: a natural ending is falling (negative), a cut runs
 *                flat or rising into the boundary (~0 or positive).
 *   trailingSilenceMs, boundaryPeakDbfs, and naiveTailRatioDb (what the old probe
 *   would have said, for contrast).
 *
 * HOW TO READ IT. Do not threshold a single metric. On real data the distribution is
 * unimodal and continuous, and each metric alone produces false positives: words
 * ending in a fricative/plosive burst score high on decayDb, and short clips score
 * high on tailRatioDb because 50 ms is a large fraction of a 1 s clip. Require
 * tailRatioDb AND decayDb to agree, then LISTEN before spending. This is physical
 * tail-shape evidence only — it says nothing about whether the right words are there.
 *
 * Usage:
 *   node tools/seed-audio-tail-probe.cjs <course_code> [--seed 1] [--out <path.json>]
 * Needs .env.psql (DATABASE_URL) and .env (S3_BUCKET, AWS_REGION, AWS keys).
 */
const path = require('path')
const REPO = path.join(__dirname, '..')
require('dotenv').config({ path: path.join(REPO, '.env') })
require('dotenv').config({ path: path.join(REPO, '.env.psql') })
const fs = require('fs'), os = require('os')
const { execFile } = require('child_process'); const run = require('util').promisify(execFile)
const { Client } = require('pg')
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3')

const argv = process.argv.slice(2)
const arg = (f, d = null) => { const i = argv.indexOf(f); return i !== -1 && argv[i + 1] ? argv[i + 1] : d }
const COURSE = argv[0] && !argv[0].startsWith('--') ? argv[0] : null
const SEED = Number(arg('--seed', 1))
const OUT = arg('--out', null)
const CONC = Number(arg('--concurrency', 5))
if (!COURSE) { console.error('usage: seed-audio-tail-probe.cjs <course_code> [--seed N] [--out path.json]'); process.exit(1) }

const SR = 16000, HOP = Math.round(SR * 0.005)
const db = v => v <= 0 ? -140 : 20 * Math.log10(v)
function rms (b, a, z) { a = Math.max(0, a); z = Math.min(b.length / 2, z); let s = 0, n = 0; for (let i = a; i < z; i++) { const v = b.readInt16LE(i * 2) / 32768; s += v * v; n++ } return n ? Math.sqrt(s / n) : 0 }

const s3 = new S3Client({ region: process.env.AWS_REGION, credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } })

// Every learner-reachable slot for the seed. Superseded rows are kept and flagged
// rather than dropped: a slot still POINTING at one is itself a finding.
const LINK_SQL = `
with links as (
  select 'seed' as src, s.seed_id as owner, 'known' as slot, s.known_audio_id as aid from course_seeds s where s.course_code=$1 and s.seed_number=$2
  union all select 'seed', s.seed_id,'target1', s.target1_audio_id from course_seeds s where s.course_code=$1 and s.seed_number=$2
  union all select 'seed', s.seed_id,'target2', s.target2_audio_id from course_seeds s where s.course_code=$1 and s.seed_number=$2
  union all select 'lego', l.lego_id,'known', l.known_audio_id from course_legos l where l.course_code=$1 and l.seed_number=$2
  union all select 'lego', l.lego_id,'target1', l.target1_audio_id from course_legos l where l.course_code=$1 and l.seed_number=$2
  union all select 'lego', l.lego_id,'target2', l.target2_audio_id from course_legos l where l.course_code=$1 and l.seed_number=$2
  union all select 'lego', l.lego_id,'presentation', nullif(l.presentation_audio_id,'')::uuid from course_legos l where l.course_code=$1 and l.seed_number=$2
  union all select 'phrase', p.id,'known', p.known_audio_id from course_practice_phrases p where p.course_code=$1 and p.seed_number=$2
  union all select 'phrase', p.id,'target1', p.target1_audio_id from course_practice_phrases p where p.course_code=$1 and p.seed_number=$2
  union all select 'phrase', p.id,'target2', p.target2_audio_id from course_practice_phrases p where p.course_code=$1 and p.seed_number=$2
  union all select 'phrase', p.id,'presentation', p.presentation_audio_id from course_practice_phrases p where p.course_code=$1 and p.seed_number=$2
)
select k.src,k.owner,k.slot,k.aid, a.id is not null as row_exists,
       a.role,a.text,a.s3_key,a.duration_ms,a.voice_id,a.origin,a.lego_id
  from links k left join course_audio a on a.id=k.aid
 where k.aid is not null order by k.src,k.owner,k.slot`

async function probe (clip, tmp) {
  if (!clip.s3_key) return { ...clip, ok: false, error: 'no s3_key on course_audio row' }
  const local = path.join(tmp, String(clip.id) + '.mp3')
  try {
    const o = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: clip.s3_key }))
    fs.writeFileSync(local, Buffer.concat(await o.Body.toArray()))
  } catch (e) { return { ...clip, ok: false, error: 'S3 GET failed: ' + e.name } }
  let pcm
  try { pcm = (await run('ffmpeg', ['-v', 'error', '-i', local, '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'], { maxBuffer: 1 << 28, encoding: 'buffer' })).stdout } catch (e) { fs.unlinkSync(local); return { ...clip, ok: false, error: 'undecodable' } }
  fs.unlinkSync(local)
  const N = pcm.length / 2
  if (N < SR * 0.1) return { ...clip, ok: false, error: `too short (${N} samples)` }

  // 10 ms window / 5 ms hop envelope. Frame-based on purpose: walking back to the last
  // supra-floor SAMPLE is degenerate — it just re-reports whatever floor you chose.
  const env = []; for (let a = 0; a + HOP * 2 <= N; a += HOP) env.push(db(rms(pcm, a, a + HOP * 2)))
  const floorDb = Math.max(...env) - 40
  let last = env.length - 1; while (last > 0 && env[last] <= floorDb) last--
  let first = 0; while (first < last && env[first] <= floorDb) first++
  const cut = Math.min(N - 1, (last + 1) * HOP + HOP)
  const bodyRms = rms(pcm, first * HOP, cut)
  const tailRms = rms(pcm, cut - Math.round(SR * 0.05), cut)
  const preRms = rms(pcm, cut - Math.round(SR * 0.01), cut)
  const padRms = rms(pcm, cut, cut + Math.round(SR * 0.02))
  let bPeak = 0; for (let i = Math.max(0, cut - Math.round(SR * 0.01)); i < cut; i++) { const v = Math.abs(pcm.readInt16LE(i * 2)) / 32768; if (v > bPeak) bPeak = v }
  const e = (ms) => { const i = last - Math.round(ms / 5); return i >= 0 ? env[i] : null }
  const eNear = e(5), eFar = e(55)
  return { ...clip,
    ok: true,
    durationSec: +(N / SR).toFixed(3),
    trailingSilenceMs: +(((N - cut) / SR) * 1000).toFixed(1),
    bodyDb: +db(bodyRms).toFixed(2),
    tailDb: +db(tailRms).toFixed(2),
    tailRatioDb: +(db(tailRms) - db(bodyRms)).toFixed(2),
    stepDb: +(db(preRms) - db(padRms)).toFixed(2),
    boundaryPeakDbfs: +db(bPeak).toFixed(2),
    decayDb: (eNear == null || eFar == null) ? null : +(eNear - eFar).toFixed(2),
    naiveTailRatioDb: +(db(rms(pcm, N - Math.round(SR * 0.05), N)) - db(rms(pcm, 0, N))).toFixed(2) }
}

;(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect()
  const { rows } = await c.query(LINK_SQL, [COURSE, SEED]); await c.end()

  const dangling = rows.filter(r => !r.row_exists)
  const superseded = rows.filter(r => r.row_exists && /::superseded/i.test(r.text || ''))
  const live = rows.filter(r => r.row_exists && !/::superseded/i.test(r.text || ''))
  const byId = new Map()
  for (const r of live) {
    if (!byId.has(r.aid)) byId.set(r.aid, { id: r.aid, role: r.role, text: r.text, s3_key: r.s3_key, duration_ms: r.duration_ms, voice_id: r.voice_id, origin: r.origin, lego_id: r.lego_id, slots: [] })
    byId.get(r.aid).slots.push(`${r.src}:${r.owner}:${r.slot}`)
  }
  const clips = [...byId.values()]
  console.log(`${COURSE} seed ${SEED}`)
  console.log(`  ${rows.length} audio_id refs -> ${live.length} live, ${superseded.length} superseded, ${dangling.length} dangling`)
  console.log(`  ${clips.length} DISTINCT live clips`)
  if (superseded.length) { console.log(`  ⚠ slots still pointing at superseded audio:`); superseded.forEach(r => console.log(`      ${r.src}:${r.owner}:${r.slot} "${(r.text || '').slice(0, 50)}"`)) }
  if (dangling.length) { console.log(`  ⚠ slots pointing at a missing course_audio row:`); dangling.forEach(r => console.log(`      ${r.src}:${r.owner}:${r.slot} ${r.aid}`)) }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'seedtail-'))
  const res = []; let next = 0
  await Promise.all(Array.from({ length: CONC }, async () => {
    while (next < clips.length) {
      const x = clips[next++]
      try { res.push(await probe(x, tmp)) } catch (e) { res.push({ ...x, ok: false, error: e.message }) }
      process.stdout.write(`  measured ${res.length}/${clips.length}\r`)
    }
  }))
  fs.rmSync(tmp, { recursive: true, force: true })

  const ok = res.filter(r => r.ok), bad = res.filter(r => !r.ok)
  console.log(`\n  ${ok.length} measured, ${bad.length} failed`)
  bad.forEach(b => console.log(`      FAIL ${b.s3_key}: ${b.error}`))
  const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))] }
  for (const k of ['tailRatioDb', 'decayDb', 'stepDb', 'trailingSilenceMs', 'naiveTailRatioDb']) {
    const v = ok.map(r => r[k]).filter(x => x != null)
    if (v.length) console.log(`  ${k.padEnd(18)} min ${q(v, 0)}  p50 ${q(v, .5)}  p90 ${q(v, .9)}  max ${Math.max(...v)}`)
  }
  // Both signals must agree; see HOW TO READ IT above.
  const cand = ok.filter(r => r.tailRatioDb > -6 && r.decayDb != null && r.decayDb > -6)
  console.log(`\n  candidates (tailRatioDb > -6 AND decayDb > -6): ${cand.length} of ${ok.length} — LISTEN before spending`)
  cand.forEach(r => console.log(`    tail ${r.tailRatioDb} decay ${r.decayDb} step ${r.stepDb} pad ${r.trailingSilenceMs}ms ${r.durationSec}s ${r.role} "${(r.text || '').slice(0, 45)}"`))

  const out = OUT || `/tmp/${COURSE}-seed${SEED}-tail.json`
  fs.writeFileSync(out, JSON.stringify({ course: COURSE, seed: SEED, refs: rows.length, live: live.length, superseded, dangling, clips: res }, null, 2))
  console.log(`\n  -> ${out}`)
})().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
