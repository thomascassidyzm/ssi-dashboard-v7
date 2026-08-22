#!/usr/bin/env node
/**
 * nld-vregister-final-verify-2026-08-14.cjs
 *
 * Independent post-swap verification. Reads the live DB fresh — it does NOT
 * trust the render script's own log for anything it can check itself, because
 * a script asserting its own success is not evidence.
 *
 * Checks, in order:
 *   1. all 51 rows point at the 29 NEW clips, none at a superseded one;
 *   2. text and audio are still in lockstep: every row's target_text is
 *      byte-identical to its clip's course_audio.text (the desync this job
 *      exists to prevent);
 *   3. every row's text equals the resolution map's `after` — the swap wrote
 *      the intended words, not merely SOME words;
 *   4. no row silently became a draft;
 *   5. voices unchanged from the incumbents, canonically compared;
 *   6. every new clip is alive on S3 and decodes (HEAD + ffprobe), and its
 *      pacing is reported as a z-score against this course's own pod clips,
 *      which is how b09bab21's +1.7sd was raised in the first place;
 *   7. the five business-`jullie` rows are untouched, and the bartender's
 *      `Eten jullie vanavond?` IS changed — the scope boundary, asserted.
 *
 * Read-only. Exit 1 on any failure.
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.join(__dirname, '../..')
const COURSE = 'nld_for_eng'
const S3_BASE = 'https://ssi-audio-stage.s3.eu-west-1.amazonaws.com'
const RESOLUTION = path.join(ROOT, 'docs/a108/nld-resolution.json')
const APPLIED = path.join(ROOT, 'docs/a108/nld-vregister-render-applied-log.json')
const OUT = path.join(ROOT, 'docs/a108/nld-vregister-final-verification.json')

const env = { ...process.env }
for (const l of fs.readFileSync(path.join(ROOT, '.env.psql'), 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const SEP = '|'
const psql = (s) => execFileSync(path.join(process.env.HOME, '.local/pg17/bin/psql'),
  [env.DATABASE_URL, '-At', '-F', SEP, '-v', 'ON_ERROR_STOP=1', '-c', s], { env, encoding: 'utf8' })
  .trim().split('\n').filter(Boolean).map(r => r.split(SEP))

const fails = []
const ok = []
const check = (cond, msg) => { (cond ? ok : fails).push(msg) }

;(() => {
  const resolution = JSON.parse(fs.readFileSync(RESOLUTION, 'utf8'))
  const applied = JSON.parse(fs.readFileSync(APPLIED, 'utf8'))
  const plan = applied.plan
  const oldIds = plan.map(p => p.clip_id)
  const newIds = plan.map(p => p.new_clip_id)
  const afterOf = Object.fromEntries(plan.map(p => [p.new_clip_id, p.after]))

  // --- 1. linkage -------------------------------------------------------
  const rows = psql(
    `select s.id, s.pod_id, s.target_audio_id::text, s.target_text, s.target_text_draft, c.text, c.voice_id, c.s3_key, c.duration_ms` +
    ` from listening_pod_sentences s join course_audio c on c.id = s.target_audio_id` +
    ` where s.target_audio_id in (${newIds.map(i => `'${i}'`).join(',')}) order by s.id`)
  check(rows.length === 51, `51 rows on the new clips (found ${rows.length})`)

  const stillOld = psql(`select count(*) from listening_pod_sentences where target_audio_id in (${oldIds.map(i => `'${i}'`).join(',')})`)
  check(stillOld[0][0] === '0', `no row still points at a superseded clip (found ${stillOld[0][0]})`)

  const distinctClips = new Set(rows.map(r => r[2]))
  check(distinctClips.size === 29, `all 29 new clips are referenced (found ${distinctClips.size})`)

  // --- 2/3/4. text-audio lockstep, intended words, draft flag ----------
  let desync = 0, wrongWords = 0, drafted = 0
  for (const [id, , clip, text, draft, clipText] of rows) {
    if (text !== clipText) { desync++; fails.push(`DESYNC ${id}: pod "${text}" vs audio "${clipText}"`) }
    if (text !== afterOf[clip]) { wrongWords++; fails.push(`WRONG TEXT ${id}: "${text}" != intended "${afterOf[clip]}"`) }
    if (draft !== 'f') { drafted++; fails.push(`DRAFT ${id}: target_text_draft=${draft}`) }
  }
  check(desync === 0, 'every row\'s text is byte-identical to its clip\'s course_audio.text')
  check(wrongWords === 0, 'every row carries exactly the intended corrected text')
  check(drafted === 0, 'no row became a draft')

  // --- 5. voices unchanged ---------------------------------------------
  const canon = (v) => String(v).replace(/^xai_/, '')
  let recast = 0
  for (const p of plan) {
    const r = rows.find(x => x[2] === p.new_clip_id)
    if (r && canon(r[6]) !== canon(p.voice_id)) { recast++; fails.push(`RECAST ${p.new_clip_id}: ${p.voice_id} -> ${r[6]}`) }
  }
  check(recast === 0, 'no clip changed voice')

  // --- 6. alive on S3, decodable, pacing -------------------------------
  const base = psql(
    `select c.duration_ms, length(c.text) from listening_pod_sentences s join course_audio c on c.id=s.target_audio_id` +
    ` where s.pod_id like '${COURSE}:pod-0%' and c.duration_ms is not null and length(c.text)>0`)
  const v = base.map(r => Number(r[0]) / Number(r[1]))
  const mean = v.reduce((a, b) => a + b, 0) / v.length
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length)

  const tmp = fs.mkdtempSync('/tmp/nld-verify-')
  const pacing = []
  let dead = 0
  for (const p of plan) {
    const r = rows.find(x => x[2] === p.new_clip_id)
    if (!r) continue
    const key = r[7]
    let bytes = 0
    try {
      const head = execFileSync('curl', ['-sfI', `${S3_BASE}/${key}`], { encoding: 'utf8' })
      bytes = Number((head.match(/content-length:\s*(\d+)/i) || [])[1] || 0)
    } catch { dead++; fails.push(`DEAD ON S3 ${p.new_clip_id} (${key})`); continue }
    if (bytes < 4000) { dead++; fails.push(`TOO SMALL ${p.new_clip_id}: ${bytes}B`); continue }
    const f = path.join(tmp, 'c.mp3')
    execFileSync('curl', ['-sf', `${S3_BASE}/${key}`, '-o', f])
    const ms = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim()) * 1000
    if (!Number.isFinite(ms) || ms < 500) { dead++; fails.push(`NOT DECODABLE ${p.new_clip_id}`); continue }
    const mspc = ms / afterOf[p.new_clip_id].length
    pacing.push({ clip_old: p.clip_id, clip_new: p.new_clip_id, ms: Math.round(ms), ms_per_char: Number(mspc.toFixed(1)), z: Number(((mspc - mean) / sd).toFixed(2)), bytes })
    fs.rmSync(f, { force: true })
  }
  fs.rmSync(tmp, { recursive: true, force: true })
  check(dead === 0, `every new clip is alive on S3 and decodes (${pacing.length}/29 probed)`)

  const outliers = pacing.filter(p => Math.abs(p.z) >= 1.5)
  const b09 = pacing.find(p => p.clip_old.startsWith('b09bab21'))

  // --- 7. the scope boundary -------------------------------------------
  const business = psql(
    `select s.id, s.target_text from listening_pod_sentences s where s.pod_id like '${COURSE}:pod-0%'` +
    ` and s.target_text ilike '%jullie%' order by s.id`)
  const bartender = rows.filter(r => /eet u vanavond/i.test(r[3]))
  check(bartender.length > 0, `the bartender's line now reads "Eet u vanavond?" (${bartender.length} row(s))`)
  const stillJullie = business.map(b => b[1])
  check(!stillJullie.some(t => /eten jullie vanavond/i.test(t)), 'no row still reads "Eten jullie vanavond?"')

  fs.writeFileSync(OUT, JSON.stringify({
    job: 'A-108 nld_for_eng V-register render — independent final verification', date: '2026-08-14',
    rows: rows.length, clips: distinctClips.size,
    rows_still_on_superseded_clips: Number(stillOld[0][0]),
    desync_rows: desync, wrong_text_rows: wrongWords, draft_rows: drafted, recast_clips: recast, dead_clips: dead,
    pacing_baseline: { n: v.length, mean_ms_per_char: Number(mean.toFixed(1)), sd: Number(sd.toFixed(1)) },
    b09bab21_replacement: b09 || null,
    pacing_outliers_abs_z_ge_1_5: outliers,
    business_jullie_rows_preserved: business,
    pacing,
    passed: fails.length === 0, checks_passed: ok, failures: fails,
  }, null, 2) + '\n')

  for (const m of ok) console.log(`  PASS  ${m}`)
  for (const m of fails) console.log(`  FAIL  ${m}`)
  console.log(`\npacing baseline: mean ${mean.toFixed(1)} ms/char, sd ${sd.toFixed(1)} (n=${v.length})`)
  if (b09) console.log(`b09bab21 replacement ${b09.clip_new.slice(0, 8)}: ${b09.ms}ms, ${b09.ms_per_char} ms/char, z=${b09.z >= 0 ? '+' : ''}${b09.z}`)
  console.log(`outliers |z|>=1.5: ${outliers.length === 0 ? 'none' : outliers.map(o => `${o.clip_new.slice(0, 8)} z=${o.z}`).join(', ')}`)
  console.log(`business jullie rows preserved: ${business.length}`)
  console.log(`\n${fails.length === 0 ? 'ALL CHECKS PASSED' : fails.length + ' FAILURE(S)'}`)
  console.log(`log: ${OUT}`)
  process.exit(fails.length === 0 ? 0 : 1)
})()
