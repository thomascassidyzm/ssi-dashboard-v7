#!/usr/bin/env node
/**
 * audio-veracity-repair.cjs — ONE command per course: detect -> re-render -> replace.
 *
 * WHY THIS EXISTS (Tom, 2026-08-04). Audio is not staged. "It means 2 things —
 * if there's a problem, we need to fix it faster because it's in front of
 * learners, and also, we need to be sure." The pre-publish gate
 * (services/audio-veracity.cjs, wired into phase8) is the "be sure" half. This
 * is the "fix it faster" half, for audio that is ALREADY live.
 *
 * WHY THE ACOUSTIC DETECTOR AND NOT THE EXISTING SCREENS.
 * tools/audio-batch-gate.cjs asks three good questions — duration floor, speech
 * rate, target1/target2 pairing — and it caught the 2026-08-03 fra_for_eng
 * disaster. But tools/repair-silent-clips.cjs resolves a `suspect` by rendering
 * the text again and KEEPING the stored clip if the fresh render is a similar
 * length. docs/forced-alignment-2026-08-04/findings.md §2:
 *
 *   "So the probe-and-keep logic has a hole. It keeps a clip when a fresh
 *    render is a similar length — but if the provider truncates that text
 *    reproducibly, both renders are short and the clip is kept. Acoustic
 *    scoring does not have that failure mode, because it asks whether the words
 *    are there rather than whether two renders agree."
 *
 * 13 clips that the 2026-08-04 deu_for_eng repair run probe-tested and
 * deliberately kept are, on the physical evidence, truncated — and that same
 * probe-and-keep path ran across the whole 2026-08-04 estate sweep. This tool
 * is what makes finding them cheap.
 *
 * WHAT IT DOES NOT DO. It does not re-implement replacement. Detection is the
 * new part; the replacement is tools/repair-silent-clips.cjs, which already
 * mints a NEW audio id on purpose (the learning app serves audio
 * `immutable, max-age=31536000` and the player caches blobs in IndexedDB by
 * audio id, so re-using the id would never reach a device that already has the
 * bad bytes), deletes the old row, heals every link, and can undo itself.
 *
 * ⚠️ VALIDATED ON SILENCE AND TRUNCATION ONLY. Mispronunciation was never
 * tested — there is no ground truth for it — and a free decode could plausibly
 * launder a mispronounced word into the expected one. A clean run of this tool
 * says nothing about pronunciation.
 *
 * ⚠️ TTS COSTS MONEY. This is a DRY RUN unless you pass --apply, and --apply
 * re-renders every clip in the repair list. Show the plan and get approval.
 *
 * Usage:
 *   node tools/audio-veracity-repair.cjs <course>                     # detect + cost, no writes
 *   node tools/audio-veracity-repair.cjs <course> --since 2026-08-04  # only new clips
 *   node tools/audio-veracity-repair.cjs <course> --limit 20          # pilot a sample
 *   node tools/audio-veracity-repair.cjs <course> --apply             # RE-RENDERS. costs money.
 *
 *   --since <iso>     only clips created at/after this timestamp
 *   --roles a,b       restrict to these roles (default: all but presentation/pod_*)
 *   --limit <n>       check at most n clips (a pilot; ALWAYS pilot before a sweep)
 *   --concurrency <n> parallel decodes (default 4; measured 1.71 s/clip on 8 cores)
 *   --out <path>      where to write the repair list (default /tmp/<course>-veracity-repair.json)
 *   --cache <path>    resume file; a clip already decoded at the same s3_key is skipped
 *   --no-cache        ignore and do not write the resume file
 *   --apply           actually re-render and replace. Requires the repair list to be non-empty.
 *   --apply-limit <n> cap how many clips --apply will re-render (safety rail)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile, spawn } = require('child_process')
const { createClient } = require('@supabase/supabase-js')
const veracity = require('../services/audio-veracity.cjs')
const genderService = require('../services/gender-expansion-service.cjs')
const genderHaikuService = require('../services/gender-haiku-service.cjs')
const { isHumanVoiceCourse } = require('../services/shared/human-voice-courses.cjs')

const argv = process.argv.slice(2)
const arg = (f, d = null) => { const i = argv.indexOf(f); return i !== -1 && argv[i + 1] ? argv[i + 1] : d }
const COURSE = argv[0] && !argv[0].startsWith('--') ? argv[0] : null
const SINCE = arg('--since')
const ROLES = arg('--roles') ? arg('--roles').split(',').map(s => s.trim()).filter(Boolean) : null
const LIMIT = Number(arg('--limit', 0)) || 0
const CONCURRENCY = Number(arg('--concurrency', 4))
const OUT = arg('--out') || `/tmp/${COURSE}-veracity-repair.json`
const APPLY = argv.includes('--apply')
const APPLY_LIMIT = Number(arg('--apply-limit', 0)) || 0
const NO_CACHE = argv.includes('--no-cache')
const CACHE = NO_CACHE ? null : (arg('--cache') || path.join(__dirname, '..', 'scripts', 'audio-veracity-cache', `${COURSE}.json`))

if (!COURSE) {
  console.error('usage: audio-veracity-repair.cjs <course> [--since iso] [--roles a,b] [--limit n] [--out path] [--apply]')
  process.exit(1)
}
if (isHumanVoiceCourse(COURSE)) {
  console.log(`${COURSE} is human-voiced only — no TTS ever (Tom 2026-07-25). Detection would be fine, repair never is. Nothing to do.`)
  process.exit(0)
}

const supabase = createClient(
  (process.env.SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_KEY || '').trim(),
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const S3_BASE = `https://${(process.env.S3_BUCKET || 'ssi-audio-stage').trim()}.s3.${(process.env.AWS_REGION || 'eu-west-1').trim()}.amazonaws.com/`

/**
 * Roles this tool never nominates. `presentation` because deleting one CASCADEs
 * into lego_introductions and destroys authored content; `pod_*` because pod
 * links live in listening_pod_sentences, which is a different tool's job. Both
 * refusals mirror tools/repair-silent-clips.cjs, which would skip them anyway —
 * stated here so a nomination never looks like a promise.
 */
const SKIP_ROLE = (role) => role === 'presentation' || /^pod_/.test(String(role))

/** $4 per 1M neural characters — Azure S0, services/audio-generation-planner.cjs:24. */
const AZURE_COST_PER_MILLION_CHARS_USD = 4.0

const run = (cmd, args) => new Promise((resolve, reject) => {
  execFile(cmd, args, { maxBuffer: 1 << 26 }, (e, o, s) => e ? reject(new Error(String(s || e.message).slice(0, 200))) : resolve(o))
})

/** Every TTS clip in scope. Paged, with a total sort — see audio-batch-gate's
 *  note: created_at alone is not unique, and a non-total sort silently drops
 *  rows at page boundaries, which reads as "checked and clean". */
async function loadClips () {
  const rows = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from('course_audio')
      .select('id, text, role, voice_id, language, duration_ms, s3_key, created_at, origin')
      .eq('course_code', COURSE)
      .order('created_at').order('id')
      .range(from, from + PAGE - 1)
    if (SINCE) q = q.gte('created_at', SINCE)
    if (ROLES) q = q.in('role', ROLES)
    const { data, error } = await q
    if (error) throw new Error(`load clips: ${error.message}`)
    rows.push(...(data || []))
    if (!data || data.length < PAGE) break
  }
  return rows.filter(r => r.origin !== 'human' && !SKIP_ROLE(r.role) && r.s3_key)
}

/**
 * The text the voice was ACTUALLY asked to say.
 *
 * course_audio.text stores the PRE-gender-expansion string, but phase8 renders
 * textForTTS (post-expansion). Comparing the decode against the stored text
 * would false-alarm on every gendered clip in the estate — the same trap the
 * pre-publish gate avoids by checking textForTTS.
 */
function expectedTextFor (row, genderMap) {
  const hit = genderMap.get(`${row.text}|${row.language}|${row.role}`)
  if (hit?.wasModified) return hit.expandedText
  if ((row.role === 'target1' || row.role === 'target2') && genderService.hasGenderMarker(row.text)) {
    const m = genderService.analyzeAndExpand(row.text, row.language, row.role)
    if (m.wasModified) return m.expandedText
  }
  return row.text
}

async function checkOne (row, expected, tmpDir) {
  const mp3 = path.join(tmpDir, `${row.id}.mp3`)
  try {
    await run('curl', ['-sfS', '-o', mp3, S3_BASE + row.s3_key])
  } catch (e) {
    return { pass: null, checked: false, reason: 'unchecked_download_failed', detail: e.message, cer: null, decode: null }
  }
  try {
    return await veracity.checkAudioVeracity(mp3, expected, row.language)
  } finally {
    try { fs.unlinkSync(mp3) } catch {}
  }
}

function loadCache () {
  if (!CACHE) return {}
  try { return JSON.parse(fs.readFileSync(CACHE, 'utf8')) } catch { return {} }
}
function saveCache (cache) {
  if (!CACHE) return
  try {
    fs.mkdirSync(path.dirname(CACHE), { recursive: true })
    fs.writeFileSync(CACHE, JSON.stringify(cache))
  } catch (e) { console.warn(`  (cache write failed: ${e.message})`) }
}

;(async () => {
  console.log(`\naudio-veracity-repair — ${COURSE}${SINCE ? ` (since ${SINCE})` : ''}`)
  const status = veracity.announceStatus(console)
  if (!status.enabled || !status.available) {
    console.error('\nREFUSING TO RUN: this tool IS the acoustic check. With the check unavailable it')
    console.error('would report "0 defects" on a broken course, which is worse than not running.')
    console.error(status.missing.length ? `Missing: ${status.missing.join(' and ')}` : 'AUDIO_VERACITY_GATE is off.')
    process.exit(3)
  }

  let rows = await loadClips()
  if (LIMIT) rows = rows.slice(0, LIMIT)
  if (!rows.length) { console.log('No TTS clips in scope. Nothing to do.\n'); process.exit(0) }

  const genderMap = genderHaikuService.GENDERED_LANGUAGES.some(l => rows.some(r => r.language === l))
    ? await genderHaikuService.loadGenderMap(COURSE, supabase)
    : new Map()
  if (genderMap.size) console.log(`Loaded ${genderMap.size} gender expansions — comparing against the text actually sent to TTS.`)

  const cache = loadCache()
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'veracity-repair-'))
  const stats = veracity.newStats()
  const failures = []
  const unchecked = []
  let done = 0, fromCache = 0
  const t0 = Date.now()

  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, rows.length) }, async () => {
    for (;;) {
      const i = cursor++
      if (i >= rows.length) return
      const row = rows[i]
      const expected = expectedTextFor(row, genderMap)
      // Resume: a clip already decoded at this exact s3_key cannot have changed.
      const key = `${row.id}:${row.s3_key}`
      let v = cache[key]
      if (v) fromCache++
      else {
        v = await checkOne(row, expected, tmpDir)
        if (CACHE) cache[key] = { pass: v.pass, checked: v.checked, reason: v.reason, cer: v.cer, decode: v.decode }
      }
      veracity.recordVerdict(stats, v)
      if (v.checked === false) unchecked.push({ row, v })
      else if (v.pass === false) failures.push({ row, expected, v })
      if (++done % 50 === 0 || done === rows.length) {
        process.stderr.write(`  ${done}/${rows.length} checked (${failures.length} failing)\n`)
        saveCache(cache)
      }
    }
  }))
  saveCache(cache)
  try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}

  const wall = (Date.now() - t0) / 1000
  console.log(`\n${veracity.formatStats(stats)}`)
  console.log(`${rows.length} clips in ${wall.toFixed(0)}s${fromCache ? ` (${fromCache} from the resume cache)` : ''}`)

  if (unchecked.length) {
    console.log(`\n⚠️  ${unchecked.length} clip(s) COULD NOT BE CHECKED — this is not a pass:`)
    const by = unchecked.reduce((a, u) => ((a[u.v.reason] = (a[u.v.reason] || 0) + 1), a), {})
    for (const [k, n] of Object.entries(by)) console.log(`     ${k}: ${n}`)
  }

  if (!failures.length) {
    console.log(`\nNo acoustic defects found${unchecked.length ? ' among the clips that could be checked' : ''}.`)
    console.log('Reminder: this method is validated on SILENCE and TRUNCATION only. It says nothing about pronunciation.\n')
    process.exit(0)
  }

  // The repair list, in exactly the shape tools/repair-silent-clips.cjs expects
  // from tools/audio-batch-gate.cjs --out.
  //
  // verdict 'confirmed', not 'suspect', and deliberately: 'suspect' routes into
  // repair-silent-clips' probe-and-keep branch, which is the logic with the
  // hole this tool exists to close. The acoustic evidence IS the confirmation.
  const list = failures.map(({ row, expected, v }) => ({
    id: row.id,
    text: row.text,
    role: row.role,
    voice_id: row.voice_id,
    language: row.language,
    duration_ms: row.duration_ms,
    verdict: 'confirmed',
    reason: 'veracity',
    detail: `${v.reason}, CER ${v.cer} (threshold ${v.threshold}) — expected ${JSON.stringify(expected)}, heard ${JSON.stringify(String(v.decode).slice(0, 80))}`,
    created_at: row.created_at,
    s3_key: row.s3_key,
    veracity: { reason: v.reason, cer: v.cer, threshold: v.threshold, decode: v.decode, expected },
  }))
  fs.writeFileSync(OUT, JSON.stringify(list, null, 2))

  console.log(`\n${failures.length} clip(s) failed the acoustic check:`)
  const byRole = failures.reduce((a, f) => ((a[`${f.row.role}/${f.row.voice_id}`] = (a[`${f.row.role}/${f.row.voice_id}`] || 0) + 1), a), {})
  for (const [k, n] of Object.entries(byRole).sort((a, b) => b[1] - a[1])) console.log(`   ${k.padEnd(30)} ${n}`)
  console.log()
  for (const f of failures.slice(0, 15)) {
    console.log(`   ${String(f.row.duration_ms).padStart(6)}ms  CER ${String(f.v.cer).padEnd(6)} expected ${JSON.stringify(f.expected).slice(0, 44).padEnd(46)} heard ${JSON.stringify(String(f.v.decode).slice(0, 40))}`)
  }
  if (failures.length > 15) console.log(`   ... and ${failures.length - 15} more`)
  console.log(`\nrepair list -> ${OUT}`)

  const chars = failures.reduce((a, f) => a + String(f.expected || '').length, 0)
  const azureRef = (chars / 1_000_000) * AZURE_COST_PER_MILLION_CHARS_USD
  console.log(`\nCOST OF REPAIRING THESE: ${failures.length} re-renders, ${chars.toLocaleString()} characters.`)
  console.log(`   ≈ $${azureRef.toFixed(4)} at the Azure S0 rate ($${AZURE_COST_PER_MILLION_CHARS_USD}/1M chars).`)
  console.log(`   xAI and ElevenLabs per-character rates are NOT recorded in this repo — for a`)
  console.log(`   course on those providers, treat the figure above as a lower bound, not a quote.`)
  console.log(`   repair-silent-clips re-rolls a bad render up to 3 times, so the worst case is ~3x.`)

  if (!APPLY) {
    console.log(`\nDRY RUN — nothing rendered, nothing written, nothing deleted.`)
    console.log(`To repair (COSTS MONEY, needs approval):`)
    console.log(`   node ${path.relative(process.cwd(), __filename)} ${COURSE}${SINCE ? ` --since ${SINCE}` : ''} --apply\n`)
    process.exit(0)
  }

  // ---- apply ---------------------------------------------------------------
  let applyList = list
  if (APPLY_LIMIT && applyList.length > APPLY_LIMIT) {
    console.log(`\n--apply-limit ${APPLY_LIMIT}: re-rendering the first ${APPLY_LIMIT} of ${list.length}. The remaining ${list.length - APPLY_LIMIT} are LEFT BROKEN and stay in ${OUT}.`)
    applyList = applyList.slice(0, APPLY_LIMIT)
    fs.writeFileSync(OUT + '.apply', JSON.stringify(applyList, null, 2))
  }
  const flagsPath = APPLY_LIMIT ? OUT + '.apply' : OUT

  console.log(`\nAPPLYING — handing ${applyList.length} confirmed clip(s) to tools/repair-silent-clips.cjs.`)
  console.log(`Each replacement mints a NEW audio id (the player caches blobs by id under an`)
  console.log(`immutable, max-age=31536000 policy, so re-using the id would never reach a device`)
  console.log(`that already downloaded the bad bytes), heals every link, and can undo itself.\n`)

  const code = await new Promise(resolve => {
    const child = spawn(process.execPath, [
      path.join(__dirname, 'repair-silent-clips.cjs'), COURSE,
      '--flags', flagsPath, '--only', 'confirmed',
    ], { stdio: 'inherit' })
    child.on('close', resolve)
  })

  if (code !== 0) {
    console.log(`\nrepair-silent-clips exited ${code} — some clips were NOT repaired. Re-run this command`)
    console.log(`to re-detect: it is idempotent, and repaired clips will simply pass.\n`)
    process.exit(code)
  }
  console.log(`\nRepair complete. Re-run this command (without --apply) to verify the course is clean —`)
  console.log(`the resume cache is keyed on s3_key, so replaced clips are re-checked automatically.\n`)
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
