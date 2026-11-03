#!/usr/bin/env node
// MOVED to Popty from ssi-learning-app/tools/intro-bank/lab/build-lab.mjs (job #699, Tom 2026-11-03: "we need everything that touches course content to be a popty tool"); behaviour unchanged, app paths via tools/lib/learning-app.mjs.
// NOTE: reads the database with psql (read-only session) by hand. Under the 2026-10-14 HARD RULE (job #384) a run needs this
// moved onto services/shared/agent-db.cjs or a Popty read route first; moved as-is in #699 (keep behaviour identical).
/**
 * Intro lab data builder (job #348). Fetches the Tom-006 clips the lab page needs and writes
 * <out>/manifest.json + <out>/clips/*.mp3. No TTS here: tails were rendered once through Popty's route
 * (ids in TAILS); donors are existing continuous Tom-006 intros "The <Lang> for: '<LEGO>', is:" whose
 * Cartesia word_timings give the exact cut of "<LEGO> is".
 *   node tools/intro-bank/lab/build-lab.mjs <outDir> [course,course,...]
 * Each sample also carries the LEGO's target1/target2 clips + durations (what the player plays after the
 * intro, then at the debut), so the page can play the whole sequence. A course needs a Tom-006 "The X for"
 * frame (found by matching the language name in courses.display_name); a course without one is skipped.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import os from 'node:os'

const out = process.argv[2]
if (!out) { console.error('usage: build-lab.mjs <outDir>'); process.exit(1) }
mkdirSync(join(out, 'clips'), { recursive: true })
const home = os.homedir()
const env = (f) => Object.fromEntries(readFileSync(f, 'utf8').split('\n').map((l) => l.match(/^([A-Za-z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const POPTY = join(home, 'SSi/ssi-dashboard-v7-clean')
const E = env(join(POPTY, '.env'))
const DB = env(join(POPTY, '.env.psql')).DATABASE_URL
const AWS = createRequire(join(POPTY, 'package.json'))('aws-sdk')
const s3 = new AWS.S3({ accessKeyId: E.AWS_ACCESS_KEY_ID, secretAccessKey: E.AWS_SECRET_ACCESS_KEY, region: E.AWS_REGION || 'eu-west-1' })
const Q = (sql) => execFileSync('psql', [DB, '-At', '-F', '\t', '-c', sql], { maxBuffer: 1 << 26 }).toString().trim().split('\n').filter(Boolean).map((l) => l.split('\t'))

const TOM = '%d293d509%'
const COURSES = (process.argv[3] || 'afr_for_eng,ell_for_eng,eus_for_eng,nld_for_eng,pol_for_eng').split(',')
const FRAMES_PINNED = { afr_for_eng: 'a71b4e28-08a2-4109-9c97-bb9edce9c8ac', nld_for_eng: 'f1333aba-a184-44a5-b41f-66ee74a66e89', pol_for_eng: 'f3cb6743-d418-459c-867d-d9d939cdb807', ell_for_eng: 'dc40091a-12bf-4e79-99d7-29fd2b1698bd', eus_for_eng: '937a95b2-d3ae-4b3b-955e-39c1801918aa' }
// Frames: every Tom-006 "The <Language> for" clip; a course takes the one whose language name its display_name contains.
const frameClips = Q(`select substring(a.text from '^The (.+) for$'), a.id::text from course_audio a where a.voice_id like '${TOM}' and a.text ~ '^The [A-Za-z ]+ for$'`)
const FRAMES = { ...FRAMES_PINNED }
for (const c of COURSES) {
  if (FRAMES[c]) continue
  const [[dn] = []] = Q(`select display_name from courses where course_code='${c}'`)
  const hit = frameClips.find(([lang]) => dn && dn.toLowerCase().includes(lang.toLowerCase()))
  if (hit) FRAMES[c] = hit[1]
}
// Tom-006, rendered once for #310 ("is") and #348 (the rest, 67 characters in all).
const TAILS = [
  { key: 'is', label: 'is', id: '2e12b859-911c-4ef3-b9b7-1cdc81703243' },
  { key: 'said-like-this', label: 'is said like this', id: 'acc15e10-d1f2-41cc-a926-721e5bac6790' },
  { key: 'said', label: 'is said', id: 'f0410cee-fcf1-4046-9272-c5f292f33028' },
  { key: 'sounds-like-this', label: 'sounds like this', id: '2bdcc393-3a11-4d7a-8ceb-8e44cad7ac20' },
  { key: 'we-say-like-this', label: 'we say like this', id: 'f9e17866-3bf8-450d-91ad-f8500a308f60' },
  { key: 'given-as', label: 'is given as', id: 'd36168ff-7433-47a8-a30e-f58a597f11ca' },
]
// Donors: continuous Tom-006 intros "The <Lang> for: 'LEGO', is:" (no "as in"), preferring deu_for_eng then the shortest.
const donors = new Map()
for (const [k, did, dc, wt] of Q(`select lower(substring(pv.text from '^The [^:]+ for: ''(.*)'', is:')), pv.id::text, l.course_code, pv.word_timings::text
  from course_legos l join course_audio pv on pv.id=(case when l.presentation_audio_id ~ '^[0-9a-fA-F-]{36}$' then l.presentation_audio_id::uuid end)
  where pv.voice_id like '${TOM}' and pv.text ~ '^The [^:]+ for: ''.*'', is:' and pv.text !~ 'as in' and pv.word_timings is not null
  order by (l.course_code='deu_for_eng') desc, pv.duration_ms`)) if (!donors.has(k)) donors.set(k, [did, dc, wt])

const have = new Set()
async function clip(id) {
  const f = join(out, 'clips', id + '.mp3')
  if (!existsSync(f)) {
    const [[k]] = Q(`select s3_key from course_audio where id='${id}'`).map((r) => r)
    writeFileSync(f, (await s3.getObject({ Bucket: E.S3_AUDIO_BUCKET || 'ssi-audio-stage', Key: k }).promise()).Body)
  }
  have.add(id)
  return `clips/${id}.mp3`
}

const manifest = { tails: [], courses: {} }
for (const t of TAILS) manifest.tails.push({ key: t.key, label: t.label, file: await clip(t.id) })
for (const course of COURSES) {
  if (!FRAMES[course]) { console.warn(course, 'SKIPPED: no Tom-006 "The X for" frame in course_audio'); continue }
  // 6 LEGOs with a cut donor, 2 without (fallback case); Tom-006 LEGO prompt; early seeds, one per seed.
  const rows = Q(`select l.lego_id, l.known_text, l.known_audio_id::text, l.presentation_audio_id::text, l.target1_audio_id::text, l.target2_audio_id::text, coalesce(l.target1_duration_ms,0), coalesce(l.target2_duration_ms,0)
    from course_legos l join course_audio k on k.id=l.known_audio_id and k.voice_id like '${TOM}'
    where l.course_code='${course}' and l.seed_number between 2 and 40 and l.target1_audio_id is not null and l.target2_audio_id is not null order by l.seed_number, l.lego_index`)
  const seen = new Set(); const withD = [], without = []
  for (const r of rows) { const sn = r[0].slice(0, 5); if (seen.has(sn)) continue; seen.add(sn); const d = donors.get(r[1].toLowerCase()); (d ? withD : without).push([...r, ...(d || [])]) }
  const pick = [...withD.slice(0, 6), ...without.slice(0, 2)]
  const samples = []
  for (const [legoId, lego, kId, pId, t1, t2, d1, d2, did, dc, wt] of pick) {
    const s = { legoId, lego, lego_file: await clip(kId), current: pId ? await clip(pId) : null, target1: await clip(t1), target2: await clip(t2), target1Ms: +d1, target2Ms: +d2, donor: null }
    if (did) {
      const w = JSON.parse(wt)
      // words: The <Lang> for: 'LEGO...', is:  -> LEGO is words[3 .. last]
      s.donor = { file: await clip(did), from: dc, start: w.starts[3], end: w.ends[w.ends.length - 1], isStart: w.starts[w.starts.length - 1], legoEnd: w.ends[w.ends.length - 2] }
    }
    samples.push(s)
  }
  manifest.courses[course] = { frame: await clip(FRAMES[course]), samples }
  console.log(course, samples.length, samples.filter((s) => s.donor).length + ' with cut')
}
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 1))
console.log(have.size, 'clips')
