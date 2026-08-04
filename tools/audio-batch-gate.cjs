#!/usr/bin/env node
/**
 * audio-batch-gate.cjs — READ-ONLY. Ask the one question the pipeline has never
 * asked: "is there actually speech in this clip?"
 *
 * WHY (2026-08-03, fra_for_eng): a long xAI batch degraded and began answering
 * with empty HTTP 200 bodies. `response.ok` passed them, the mastering chain
 * laundered them into well-formed MP3s, and duration_ms was computed FROM those
 * files — so the DB row and the S3 object agreed perfectly and every consistency
 * check in the estate passed. 567 target2 + ~75 known clips shipped as 2,016-byte
 * stubs of digital silence. The de-hiss pass reported "142,973 files, 0 failures",
 * which was an honest statement about exceptions thrown and said nothing at all
 * about whether any file contained audio.
 *
 * services/tts-service.cjs now refuses an empty response at the boundary, which
 * stops this at the source. This tool is the second, independent net: it checks
 * the OUTPUT, so it also catches anything that gets past the boundary or that
 * was written before the boundary had a gate.
 *
 * THE FAILURE IS A SPECTRUM, not one artefact. Measured on fra_for_eng
 * 2026-08-04: 539 clips are fully empty (-91 dB), but another ~139 are
 * TRUNCATED — audible, normal level, and carrying only the first half of their
 * sentence. "je vais expliquer maintenant" was stored at 624 ms; a fresh render
 * of the same text is 1,632 ms. A degrading provider returns short bodies, and
 * a fully empty body is just the extreme of that. Any gate that only asks
 * "is it silent?" passes a truncated clip, so this tool asks three questions.
 *
 * THREE checks, deliberately different in cost:
 *
 *   1. DURATION (free — metadata only, no download). A clip under FLOOR_MS
 *      cannot be a spoken word. Also flags a target2 far shorter than its own
 *      target1 for the same text — that pairing is what caught 99 of the
 *      truncations. This is the check from
 *      ssi-learning-app/scripts/audit-broken-target2.mjs; it sweeps the whole
 *      estate in under two minutes and found every one of the 08-03 stubs
 *      months after the fact.
 *
 *   2. SPEECH RATE (free — metadata only). Duration per character against the
 *      course's own healthy median for that role. Catches truncation on roles
 *      with NO paired clip to compare against — 20 `known` and 4 `target1`
 *      truncations were invisible to checks 1 and 3 and only this found them.
 *      Rates overlap between healthy and truncated clips, so this check reports
 *      SUSPECT, never CONFIRMED: it nominates for the probe below, and on its
 *      own it is never grounds to re-render.
 *
 *   3. LOUDNESS (costs a download + an ffmpeg pass). Catches what duration
 *      cannot: a clip of plausible LENGTH that contains no speech. The 08-03
 *      stubs measure about -91 dB mean, which is unmissable. Run over every
 *      flagged clip by default (to confirm before anyone re-renders), and over
 *      an arbitrary scope with --deep.
 *      This check reports TWO levels. Silence (-91 dB) is the 08-03 artefact.
 *      NEAR-SILENCE is a third artefact found 2026-08-04 on the 2026-06-16
 *      render: audible, full byte-size, but 10-30 dB under the healthy floor —
 *      a whole Korean sentence stored as 336 ms at -43 dB. It passed the old
 *      -60/-45 dB thresholds, and because a passing clip recorded no dB at all,
 *      it was invisible in the output too. Both are now recorded on the clip.
 *
 * WHAT THIS TOOL STILL CANNOT DO. Checks 1 and 2 are free because they only
 * read metadata, and a duration floor cannot see a defect that is longer than
 * the floor. Near-silent clips at 504-1080 ms were found in the 06-16 batch, so
 * a course reporting zero flags here is only clean with respect to short clips
 * unless --deep was passed. Do not read a clean report as a clean course.
 *
 * VERDICTS. `confirmed` = proven defective by measurement (silent). `suspect` =
 * duration/rate anomaly, audible — a repair tool should probe-render these and
 * replace only the ones the probe proves short, because the heuristics that
 * find them also flag the healthy tail of a continuous distribution.
 *
 * This tool NEVER mutates. A failing clip is FLAGGED for re-render, never
 * deleted — a silent row still tells you which text needs a voice, and deleting
 * it would lose that.
 *
 * Usage:
 *   node tools/audio-batch-gate.cjs fra_for_eng
 *   node tools/audio-batch-gate.cjs fra_for_eng --deep --since 2026-08-03
 *   node tools/audio-batch-gate.cjs fra_for_eng --out /tmp/fra-repair.json
 *
 * Options:
 *   --since <iso>      only consider clips created at/after this timestamp
 *                      (how the batch path scopes the gate to its own run)
 *   --roles <a,b>      restrict to these roles (default: all)
 *   --deep             measure loudness on EVERY clip in scope, not just the
 *                      ones the duration screen flagged. This is the ONLY way
 *                      to find a near-silent clip that is longer than the
 *                      duration floor — and those exist: the 06-16 sweep found
 *                      them at 504-1080 ms.
 *   --strict-level     treat near-silence as CONFIRMED rather than SUSPECT.
 *                      Off by default so a repair job's before/after gate runs
 *                      stay comparable across this tool's own change.
 *   --out <path>       write the repair list (JSON array of audio ids + text)
 *   --concurrency <n>  parallel downloads/measurements (default 8)
 *
 * Exit codes: 0 = clean, 1 = tool error, 2 = defective clips found. The non-zero
 * exit is what makes this usable as a gate rather than a report.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile } = require('child_process')
const { createClient } = require('@supabase/supabase-js')

/** Below this, a clip cannot be a spoken word — it is a failure stub.
 *  Settled from the live data: across fra/deu the legitimate duration
 *  distribution starts around 480 ms, and the stub band tops out at 192 ms. */
const FLOOR_MS = Number(process.env.AUDIO_GATE_FLOOR_MS || 400)
/** target2 this much shorter than its own target1 is not a voice difference. */
const RATIO = Number(process.env.AUDIO_GATE_RATIO || 0.5)
/** Mean level below this is silence, not speech. The 08-03 stubs sit at -91 dB;
 *  real speech mastered to about -16 LUFS never comes near it. */
const SILENCE_MEAN_DB = Number(process.env.AUDIO_GATE_SILENCE_DB || -60)
/** A clip whose PEAK never gets above this has no speech in it either, however
 *  long it is — this is the full-length-but-empty case. */
const SILENCE_PEAK_DB = Number(process.env.AUDIO_GATE_PEAK_DB || -45)
/** NEAR-SILENCE: audible, but far below any level a healthy clip reaches.
 *  Found 2026-08-04 on the 2026-06-16 cross-estate render, which produced a
 *  third artefact distinct from both the empty stub and the truncation: files
 *  of full byte-size for their duration that carry a signal 10-30 dB under the
 *  healthy floor. The proof it is a defect and not a quiet short word is
 *  kor_for_eng "지금 아내와 아이들과 함께 여기에서 휴가를 보내고 있어요." — a whole
 *  sentence stored as 336 ms at -43.3 dB mean / -29.1 dB peak.
 *  Calibrated against 104 healthy clips drawn from that same batch window:
 *  peak median -2.2 dB, p05 -6.5 dB, min -28.2 dB (and that min is itself a
 *  defect). -9 dB sits below the healthy p05 and above every clip measured in
 *  the defect band. Evidence and per-clip data:
 *  docs/audio-repair-2026-08-04/stub-forensics-22/FINDINGS.md */
const NEAR_SILENT_PEAK_DB = Number(process.env.AUDIO_GATE_NEAR_SILENT_PEAK_DB || -9)
/** Speech-rate suspicion: this fraction of the role's own healthy median
 *  ms-per-character. Calibrated on fra_for_eng — healthy target2 runs a median
 *  of 50.8 ms/char and a p01 of 31.0, while the confirmed truncations run a
 *  median of 28.4. The bands overlap, which is exactly why this check only ever
 *  yields SUSPECT. 0.55 sits below every role's p01 and above the truncations. */
const RATE_SUSPECT_FRACTION = Number(process.env.AUDIO_GATE_RATE_FRACTION || 0.55)
/** Too few characters to estimate a rate from. */
const RATE_MIN_CHARS = 6

const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage'
const S3_BASE = `https://${S3_BUCKET}.s3.eu-west-1.amazonaws.com/`

const argv = process.argv.slice(2)
const arg = (flag, fallback = null) => {
  const i = argv.indexOf(flag)
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback
}
const COURSE = argv[0] && !argv[0].startsWith('--') ? argv[0] : null
const SINCE = arg('--since')
const ROLES = (arg('--roles') || '').split(',').map(r => r.trim()).filter(Boolean)
const OUT = arg('--out')
const DEEP = argv.includes('--deep')
const STRICT_LEVEL = argv.includes('--strict-level')
const CONCURRENCY = Number(arg('--concurrency', 8))

// Only a direct CLI invocation needs a course — phase8 requires this file as a
// module and calls gateBatchSafe() with its own arguments.
if (!COURSE && require.main === module) {
  console.error('usage: audio-batch-gate.cjs <course> [--since <iso>] [--roles a,b] [--deep] [--out <path>] [--concurrency <n>]')
  process.exit(1)
}

const supabase = createClient(
  (process.env.SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_KEY || '').trim(),
  { auth: { persistSession: false, autoRefreshToken: false } },
)

/**
 * Peak and mean level of a clip, via ffmpeg's volumedetect.
 * Reuses the ffmpeg the estate already installs for mastering and the de-click
 * tooling — no new dependency for the sake of one measurement.
 * @returns {Promise<{meanDb: number, peakDb: number}|null>} null = unmeasurable,
 *   which is treated as a PASS (we only ever act on a positive silence reading).
 */
function measureLevel(mp3) {
  return new Promise(resolve => {
    execFile(FFMPEG, ['-hide_banner', '-nostats', '-i', mp3, '-af', 'volumedetect', '-f', 'null', '-'],
      { encoding: 'utf8', maxBuffer: 1 << 22 }, (_e, _o, stderr) => {
        const mean = /mean_volume:\s*(-?[\d.]+) dB/.exec(stderr || '')
        const peak = /max_volume:\s*(-?[\d.]+) dB/.exec(stderr || '')
        if (!mean || !peak) return resolve(null)
        resolve({ meanDb: parseFloat(mean[1]), peakDb: parseFloat(peak[1]) })
      })
  })
}

async function download(url, dest) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`)
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()))
}

/** Run `worker` over `items` with a bounded number in flight. */
async function mapLimit(items, limit, worker) {
  const out = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++
      if (i >= items.length) return
      out[i] = await worker(items[i], i)
    }
  }))
  return out
}

/** Every clip in scope, paged (PostgREST caps a single response). */
async function loadClips() {
  const rows = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from('course_audio')
      .select('id, text, text_normalized, role, voice_id, language, duration_ms, s3_key, created_at, origin')
      .eq('course_code', COURSE)
      // Tie-break on id. created_at is NOT unique (batch renders stamp many
      // clips in the same second), and a non-total sort gives Postgres no
      // stable order across separate LIMIT/OFFSET pages — so rows silently
      // duplicate and DROP at page boundaries. The row count stays right,
      // which is what hid this: two runs of the same course returned 21 and
      // 22 rate flags off a constant 55,618 clips (eng_for_tam, 2026-08-04).
      // A dropped row is a clip the gate never checked and reported clean.
      .order('created_at')
      .order('id')
      .range(from, from + PAGE - 1)
    if (SINCE) q = q.gte('created_at', SINCE)
    if (ROLES.length) q = q.in('role', ROLES)
    const { data, error } = await q
    if (error) throw new Error(`load clips: ${error.message}`)
    rows.push(...(data || []))
    if (!data || data.length < PAGE) return rows
  }
}

/** The free screen: duration floor, plus target2-vs-its-own-target1 ratio. */
function screenByDuration(rows) {
  const byText = new Map()
  for (const r of rows) {
    if (!byText.has(r.text_normalized)) byText.set(r.text_normalized, {})
    byText.get(r.text_normalized)[r.role] = r
  }
  const flagged = []
  for (const r of rows) {
    if (!r.duration_ms) continue
    if (r.duration_ms < FLOOR_MS) {
      flagged.push({ ...r, reason: 'floor', detail: `${r.duration_ms} ms < ${FLOOR_MS} ms` })
      continue
    }
    if (r.role !== 'target2') continue
    const t1 = byText.get(r.text_normalized)?.target1
    if (t1?.duration_ms && r.duration_ms < RATIO * t1.duration_ms) {
      flagged.push({ ...r, reason: 'ratio', detail: `${r.duration_ms} ms vs target1 ${t1.duration_ms} ms` })
    }
  }
  return flagged
}

/** The paid check: is there any speech in these clips? */
async function measureClips(rows, tmpDir, label) {
  let done = 0
  return mapLimit(rows, CONCURRENCY, async (r) => {
    const mp3 = path.join(tmpDir, `${r.id}.mp3`)
    let level = null
    try {
      await download(S3_BASE + r.s3_key, mp3)
      level = await measureLevel(mp3)
    } catch (e) {
      level = { error: e.message }
    } finally {
      try { fs.unlinkSync(mp3) } catch {}
    }
    if (++done % 100 === 0) process.stderr.write(`  ${label}: ${done}/${rows.length}\r`)
    return { row: r, level }
  })
}

/** Characters that actually get spoken — bracketed cues like "[atom] " do not. */
function spokenChars(text) {
  return String(text || '').replace(/\[[^\]]*\]/g, '').trim().length
}

/**
 * Speech-rate screen: clips far faster than their own role's healthy median
 * ms-per-character. The median is computed FROM THIS COURSE, excluding clips the
 * duration screen already flagged, so it needs no cross-course constant and
 * adapts to any voice/language pair.
 */
function screenByRate(rows, alreadyFlagged) {
  const rates = new Map()
  for (const r of rows) {
    if (alreadyFlagged.has(r.id) || !r.duration_ms) continue
    const n = spokenChars(r.text)
    if (n < RATE_MIN_CHARS) continue
    if (!rates.has(r.role)) rates.set(r.role, [])
    rates.get(r.role).push(r.duration_ms / n)
  }

  const floors = new Map()
  for (const [role, v] of rates) {
    if (v.length < 50) continue // too few clips to trust a median
    v.sort((a, b) => a - b)
    floors.set(role, v[Math.floor(v.length / 2)] * RATE_SUSPECT_FRACTION)
  }

  const flagged = []
  for (const r of rows) {
    if (alreadyFlagged.has(r.id) || !r.duration_ms) continue
    const n = spokenChars(r.text)
    if (n < RATE_MIN_CHARS) continue
    const floor = floors.get(r.role)
    if (!floor) continue
    const rate = r.duration_ms / n
    if (rate < floor) {
      flagged.push({ ...r, reason: 'rate', detail: `${rate.toFixed(1)} ms/char, under ${floor.toFixed(1)} for ${r.role}` })
    }
  }
  return flagged
}

/** A positive silence reading only — unmeasurable is a pass, never a flag. */
function isSilent(level) {
  if (!level || level.error || !Number.isFinite(level.meanDb)) return false
  return level.meanDb < SILENCE_MEAN_DB || level.peakDb < SILENCE_PEAK_DB
}

/** Audible but far under the healthy floor — see NEAR_SILENT_PEAK_DB. Reported
 *  separately from silence because the two want different handling: silence is
 *  provably dead and can be re-rendered blind, whereas a near-silent clip is a
 *  level failure that a probe render should confirm first. */
function isNearSilent(level) {
  if (!level || level.error || !Number.isFinite(level.peakDb)) return false
  return !isSilent(level) && level.peakDb < NEAR_SILENT_PEAK_DB
}

async function run() {
  const rows = await loadClips()
  const scope = `${COURSE}${SINCE ? ` since ${SINCE}` : ''}${ROLES.length ? ` roles=${ROLES.join('/')}` : ''}`
  console.log(`\naudio batch gate — ${scope}`)
  console.log(`${rows.length} clips in scope\n`)
  if (!rows.length) { console.log('nothing to check.\n'); return { confirmed: [], suspect: [], scanned: 0 } }

  const durationFlags = screenByDuration(rows)
  console.log(`[1] duration screen (free): ${durationFlags.length} flagged`)
  for (const [reason, n] of Object.entries(durationFlags.reduce((a, f) => ((a[f.reason] = (a[f.reason] || 0) + 1), a), {}))) {
    console.log(`      ${reason.padEnd(6)} ${n}`)
  }

  // Identical durations across unrelated texts is the fingerprint of one stub
  // artefact rather than a scatter of bad renders — worth printing, it is what
  // identified the 08-03 batch as a single provider failure.
  if (durationFlags.length) {
    const counts = new Map()
    for (const f of durationFlags) counts.set(f.duration_ms, (counts.get(f.duration_ms) || 0) + 1)
    const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 3)
    console.log(`      fingerprint: ${top.map(([ms, n]) => `${ms}ms x${n}`).join(', ')}`)
  }

  const rateFlags = screenByRate(rows, new Set(durationFlags.map(f => f.id)))
  console.log(`\n[2] speech-rate screen (free): ${rateFlags.length} suspect`)
  for (const [k, n] of Object.entries(rateFlags.reduce((a, f) => ((a[`${f.role}/${f.voice_id}`] = (a[`${f.role}/${f.voice_id}`] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1]).slice(0, 6)) {
    console.log(`      ${k.padEnd(28)} ${n}`)
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-gate-'))
  const toMeasure = DEEP ? rows : [...durationFlags, ...rateFlags]
  console.log(`\n[3] loudness check: measuring ${toMeasure.length} clip${toMeasure.length === 1 ? '' : 's'}${DEEP ? ' (deep: every clip in scope)' : ' (the screened ones)'}`)
  const measured = await measureClips(toMeasure, tmpDir, 'measured')
  try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}

  const silent = measured.filter(m => isSilent(m.level))
  const nearSilent = measured.filter(m => isNearSilent(m.level))
  const unmeasurable = measured.filter(m => !m.level || m.level.error)
  console.log(`      ${silent.length} silent, ${nearSilent.length} near-silent (peak < ${NEAR_SILENT_PEAK_DB} dB), ${unmeasurable.length} unmeasurable (treated as pass)`)

  // Build the verdict per clip. Measured silence is CONFIRMED — nothing else
  // is, because every other signal here flags the healthy tail of a continuous
  // distribution as well as the defects.
  const byId = new Map()
  for (const f of [...durationFlags, ...rateFlags]) byId.set(f.id, { ...f, verdict: 'suspect', level: null })
  // Near-silence stays SUSPECT by default so that verdicts remain comparable
  // across runs made before and after this check existed — a repair job doing
  // before/after gate runs must not see its own baseline move. What changes
  // unconditionally is visibility: the measured level is now recorded on the
  // clip, which is what made this artefact invisible before (a passing clip
  // reported no dB at all). --strict-level promotes it to CONFIRMED.
  for (const m of nearSilent) {
    const prev = byId.get(m.row.id)
    byId.set(m.row.id, {
      ...(prev || m.row),
      reason: prev ? prev.reason : 'near-silent',
      verdict: STRICT_LEVEL ? 'confirmed' : 'suspect',
      detail: `${prev ? prev.detail + '; ' : ''}NEAR-SILENT mean ${m.level.meanDb} dB, peak ${m.level.peakDb} dB (healthy peak p05 ≈ -6.5 dB)`,
      level: m.level,
    })
  }
  for (const m of silent) {
    const prev = byId.get(m.row.id)
    byId.set(m.row.id, {
      ...(prev || m.row),
      reason: prev ? prev.reason : 'silent',
      verdict: 'confirmed',
      detail: `${prev ? prev.detail + '; ' : ''}mean ${m.level.meanDb} dB, peak ${m.level.peakDb} dB`,
      level: m.level,
    })
  }
  const defective = [...byId.values()]
  const confirmed = defective.filter(d => d.verdict === 'confirmed')
  const suspect = defective.filter(d => d.verdict === 'suspect')

  // Display buckets are cut by MEASUREMENT, not by verdict, so the near-silent
  // band stays visible whether or not --strict-level promoted it.
  const silentSet = defective.filter(d => isSilent(d.level))
  const nearSet = defective.filter(d => isNearSilent(d.level))
  const unmeasuredSuspect = defective.filter(d => !isSilent(d.level) && !isNearSilent(d.level))

  console.log(`\nRESULT: ${confirmed.length} confirmed + ${suspect.length} suspect, of ${rows.length} clips (${((100 * defective.length) / rows.length).toFixed(2)}%)`)
  console.log(`        ${silentSet.length} silent, ${nearSet.length} near-silent, ${unmeasuredSuspect.length} duration/rate-only`)
  for (const [label, set] of [
    ['CONFIRMED (silent — replace)', silentSet],
    [`NEAR-SILENT (level failure — probe, then replace)${STRICT_LEVEL ? '' : ' [reported as suspect; --strict-level to fail on these]'}`, nearSet],
    ['SUSPECT (audible at normal level — probe before replacing)', unmeasuredSuspect],
  ]) {
    if (!set.length) continue
    console.log(`\n  ${label}: ${set.length}`)
    const byRole = set.reduce((a, d) => ((a[`${d.role}/${d.voice_id}`] = (a[`${d.role}/${d.voice_id}`] || 0) + 1), a), {})
    for (const [k, n] of Object.entries(byRole).sort((a, b) => b[1] - a[1])) console.log(`     ${k.padEnd(28)} ${n}`)
    for (const d of set.slice(0, 6)) {
      console.log(`     ${String(d.duration_ms).padStart(6)} ms  ${d.reason.padEnd(6)}  ${JSON.stringify(d.text).slice(0, 44).padEnd(46)} ${d.detail}`)
    }
  }
  if (defective.length) {
    console.log(`\nThese are FLAGGED FOR RE-RENDER, not deleted — the row still records which text needs a voice.`)
  }

  if (OUT) {
    fs.writeFileSync(OUT, JSON.stringify(defective.map(d => ({
      id: d.id, text: d.text, role: d.role, voice_id: d.voice_id, language: d.language,
      duration_ms: d.duration_ms, verdict: d.verdict, reason: d.reason, detail: d.detail,
      created_at: d.created_at, s3_key: d.s3_key,
    })), null, 2))
    console.log(`\nrepair list -> ${OUT}`)
  }
  console.log()
  return { confirmed, suspect, scanned: rows.length }
}

/**
 * Fire-and-forget wiring for the end of a generate pass (phase8). Scoped to the
 * clips THIS run minted via `since`, so it costs a handful of downloads rather
 * than a whole-course sweep. Reports loudly and never throws — a gate that can
 * break a completed render pass is worse than no gate.
 */
async function gateBatchSafe(courseCode, since, logger = console) {
  try {
    const rows = await loadClipsFor(courseCode, since)
    if (!rows.length) return null
    const durationFlags = screenByDuration(rows)
    const rateFlags = screenByRate(rows, new Set(durationFlags.map(f => f.id)))
    const screened = [...durationFlags, ...rateFlags]
    if (!screened.length) {
      logger.info?.(`[audio-gate] ${courseCode}: ${rows.length} new clips, all clean`)
      return { confirmed: 0, suspect: 0, scanned: rows.length }
    }
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audio-gate-'))
    const measured = await measureClips(screened, tmpDir, 'gate')
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
    const silent = measured.filter(m => isSilent(m.level))
    const nearSilent = measured.filter(m => isNearSilent(m.level))
    // `confirmed` keeps meaning SILENT here, so existing callers and their
    // thresholds are untouched; near-silence is reported alongside it.
    const result = { confirmed: silent.length, nearSilent: nearSilent.length, suspect: screened.length - silent.length, scanned: rows.length }
    const line = `[audio-gate] ${courseCode}: ${rows.length} new clips — ${result.confirmed} SILENT, ${result.nearSilent} NEAR-SILENT, ${result.suspect} suspect (short/fast). Re-render list: node tools/audio-batch-gate.cjs ${courseCode} --since ${since} --out /tmp/${courseCode}-repair.json`
    if (result.confirmed || result.nearSilent) (logger.error || logger.log).call(logger, line)
    else (logger.warn || logger.log).call(logger, line)
    return result
  } catch (e) {
    (logger.warn || logger.log).call(logger, `[audio-gate] ${courseCode}: gate failed (non-fatal): ${e.message}`)
    return null
  }
}

/** loadClips() bound to explicit args rather than the CLI globals. */
async function loadClipsFor(courseCode, since) {
  const rows = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from('course_audio')
      .select('id, text, text_normalized, role, voice_id, language, duration_ms, s3_key, created_at, origin')
      .eq('course_code', courseCode)
      // Tie-break on id. created_at is NOT unique (batch renders stamp many
      // clips in the same second), and a non-total sort gives Postgres no
      // stable order across separate LIMIT/OFFSET pages — so rows silently
      // duplicate and DROP at page boundaries. The row count stays right,
      // which is what hid this: two runs of the same course returned 21 and
      // 22 rate flags off a constant 55,618 clips (eng_for_tam, 2026-08-04).
      // A dropped row is a clip the gate never checked and reported clean.
      .order('created_at')
      .order('id')
      .range(from, from + PAGE - 1)
    if (since) q = q.gte('created_at', since)
    const { data, error } = await q
    if (error) throw new Error(`load clips: ${error.message}`)
    rows.push(...(data || []))
    if (!data || data.length < PAGE) return rows
  }
}

module.exports = { gateBatchSafe, screenByDuration, screenByRate, isSilent, spokenChars, measureLevel, FLOOR_MS }

if (require.main === module) {
  run()
    .then((r) => process.exit(r && (r.confirmed.length || r.suspect.length) ? 2 : 0))
    .catch((e) => { console.error('ERR:', e.message); process.exit(1) })
}
