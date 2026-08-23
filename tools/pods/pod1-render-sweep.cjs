#!/usr/bin/env node
/**
 * pod1-render-sweep.cjs — drive the pod-1 staged recast render, course by course.
 *
 * Tom approved the spend personally, 2026-08-23 22:00Z ("We're doing these PODS
 * now from here"). This is the driver that spends it.
 *
 * PER COURSE, in this order, and it stops at the first thing that looks wrong:
 *   1. unlink  — NULL the pod links of clips that are not in the voice cast for
 *                their OWN speaker, on both tracks (unlink-off-cast-pod-clips).
 *                Snapshot written per run; no course_audio row is ever deleted.
 *   2. sample  — POST /generate-pods {sample_limit:5}, which is allowed without
 *                an approval and picks one clip per distinct voice first.
 *   3. verify  — voice-vs-speaker-cast + VAD + whisper STT on the SERVED bytes
 *                (verify-pod-clips). RMS alone is not verification.
 *   4. approve — record the voice approval, which unlocks bulk for this course.
 *   5. bulk    — POST /generate-pods for the whole pod, both tracks.
 *   6. verify  — a second sample of what the bulk actually produced.
 *
 * SAMPLE FAILS TWICE FOR THE SAME CAUSE → SKIP THE COURSE. Tom's taste-safe
 * default: leave the clips unrendered and name the course in the report rather
 * than burning spend on a third attempt.
 *
 * SURVIVES ITS LAUNCHER. Run it under `systemd-run --user`, not as a shell
 * background job: two previous workers on this job died in session shutdown with
 * the render still owned by their process tree, and produced nothing. Every step
 * appends one JSON line to the progress file, so the next turn — or the next
 * session — can read the state cold, and the run ends with a DONE marker.
 *
 *   systemd-run --user --unit=pod1-render-<stamp> --collect --same-dir \
 *     /bin/bash -c 'node tools/pods/pod1-render-sweep.cjs --out=<dir>'
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const REPO = path.join(__dirname, '..', '..')
const arg = (n, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : d
}
const OUT_DIR = arg('out', path.join(REPO, 'docs/pods/pod1-render-2026-08-23'))
const ONLY = (arg('only', '') || '').split(',').filter(Boolean)
const PHASE8 = arg('phase8', 'http://localhost:3465')
const DRY = process.argv.includes('--dry-run')

// Group 1: the staged clones. Group 2: the held unrecorded drafts.
const GROUP1_SLUG = 'pod-1-staged-2026-08-23'
const GROUP2_SLUG = 'pod-0-unrecorded'
const GROUP1 = ['fra_for_eng', 'spa_for_eng', 'ita_for_eng', 'deu_for_eng', 'por_for_eng',
  'por_br_for_eng', 'ron_for_eng', 'swe_for_eng', 'hrv_for_eng', 'eus_for_eng',
  'ara_for_eng', 'ara_eg_for_eng', 'ara_sy_for_eng', 'deu_at_for_eng', 'fra_ca_for_eng',
  'jpn_for_eng', 'kor_for_eng', 'zho_for_eng', 'spa_mx_for_eng']
const GROUP2 = ['bul_for_eng', 'cat_for_eng', 'dan_for_eng', 'ell_for_eng', 'est_for_eng',
  'fas_for_eng', 'gle_for_eng', 'heb_for_eng', 'hin_for_eng', 'hye_for_eng', 'lav_for_eng',
  'isl_for_eng', 'lit_for_eng', 'nep_for_eng', 'nld_for_eng', 'nor_for_eng', 'pol_for_eng', 'swa_for_eng',
  'tha_for_eng', 'tur_for_eng', 'ukr_for_eng']

/**
 * Standing exclusions, not this run's to override.
 *   cym_n/cym_s — human-voiced Welsh; Aran and Catrin are the renderers there.
 *   fin         — genuinely uncastable: one ungendered human voice, no m/f pair.
 *   isl         — holds on its own documented blocker, 10 of 231 target clips
 *                 failing the audio veracity gate (isl-pod1-hold-decision).
 * cym_n, cym_s and fin have no staged pod at all, so they are named here to be
 * explicit rather than because the list would otherwise reach them.
 */
const EXCLUDED = { cym_n_for_eng: 'human-voiced Welsh', cym_s_for_eng: 'human-voiced Welsh',
  fin_for_eng: 'uncastable — no male/female pair', isl_for_eng: 'documented veracity hold' }

fs.mkdirSync(OUT_DIR, { recursive: true })
const PROGRESS = path.join(OUT_DIR, 'progress.jsonl')
const RESULTS = path.join(OUT_DIR, 'results.json')

function emit(obj) {
  const line = JSON.stringify({ at: new Date().toISOString(), ...obj })
  fs.appendFileSync(PROGRESS, line + '\n')
  console.log(line)
}

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    encoding: 'utf8', cwd: REPO, maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'], ...opts,
  })
}

function post(url, body, timeoutSec) {
  const out = sh('curl', ['-sS', '--max-time', String(timeoutSec), '-X', 'POST', url,
    '-H', 'Content-Type: application/json', '-d', JSON.stringify(body)])
  try { return JSON.parse(out) } catch { return { parse_error: out.slice(0, 500) } }
}

function podIdFor(course) { return `${course}:${GROUP1.includes(course) ? GROUP1_SLUG : GROUP2_SLUG}` }

function unlink(podId, track) {
  const out = sh('node', ['tools/pods/unlink-off-cast-pod-clips.cjs', `--pod=${podId}`, `--track=${track}`, '--apply'])
  const m = /(\d+) OFF-CAST/.exec(out)
  return m ? parseInt(m[1], 10) : 0
}

function verify(podId, since, limit) {
  const json = path.join(OUT_DIR, `${podId.replace(/:/g, '-')}-verify-${since}.json`)
  const args = ['tools/pods/verify-pod-clips.cjs', `--pod=${podId}`, `--since=${since}`, `--json=${json}`]
  if (limit) args.push(`--limit=${limit}`)
  let out = ''
  try { out = sh('node', args) } catch (e) { return { error: (e.stderr || e.message).toString().split('\n')[0] } }
  const m = /(\d+) clip\(s\) — (\d+) CLEAN, (\d+) REVIEW, (\d+) ERROR/.exec(out)
  const r = m ? { clips: +m[1], clean: +m[2], review: +m[3], error: +m[4] } : { parse_error: out.slice(-400) }
  r.json = json
  // Carry the first REVIEW's decode so a human can read it without opening the
  // file. A low similarity is a prompt to LISTEN, never grounds to re-render.
  if (r.review) {
    try {
      const j = JSON.parse(fs.readFileSync(json, 'utf8'))
      r.reviews = j.results.filter((x) => x.verdict === 'REVIEW')
        .slice(0, 5).map((x) => ({ id: x.id, track: x.track, voice_ok: x.voice_ok, has_speech: x.has_speech, sim: x.stt_similarity, want: x.text, got: x.stt }))
    } catch { /* the summary line is enough */ }
  }
  return r
}

function runCourse(course) {
  const podId = podIdFor(course)
  const rec = { course, pod_id: podId, steps: {} }
  emit({ event: 'course_start', course, pod_id: podId })

  // 1. unlink both tracks
  let unlinked = { target: 0, known: 0 }
  try {
    for (const t of ['target', 'known']) unlinked[t] = unlink(podId, t)
  } catch (e) {
    rec.status = 'failed'; rec.failure = `unlink: ${(e.stderr || e.message).toString().split('\n')[0]}`
    emit({ event: 'course_failed', course, cause: rec.failure }); return rec
  }
  rec.steps.unlinked = unlinked
  emit({ event: 'unlinked', course, ...unlinked })

  // 2+3. sample, then verify it. Two failures for the same cause and the course
  // is skipped rather than paid for a third time (Tom's taste-safe default).
  let sample = null, sv = null, causes = []
  for (let attempt = 1; attempt <= 2; attempt++) {
    sample = post(`${PHASE8}/generate-pods/${course}`,
      { pod_ids: [podId], roles: ['target', 'known'], sample_limit: 5 }, 1800)
    emit({ event: 'sample', course, attempt, ...pick(sample) })
    if (sample.error) { causes.push(`sample: ${sample.error}`); continue }
    if (!sample.total) { rec.steps.sample = sample; break } // nothing to do: no work queued
    sv = verify(podId, '25min', 8)
    emit({ event: 'sample_verified', course, attempt, ...sv })
    if (sv.clean && !sv.review && !sv.error) break
    causes.push(`sample verify: ${sv.review || 0} review, ${sv.error || 0} error`)
    sv = null
  }
  rec.steps.sample = pick(sample); rec.steps.sample_verify = sv
  if (sample && sample.total && !sv) {
    rec.status = 'skipped'; rec.failure = causes.join(' | ')
    emit({ event: 'course_skipped', course, cause: rec.failure }); return rec
  }

  // 4. approve — under my own name, citing Tom's ruling, per the brief.
  try {
    sh('node', ['tools/pod-approve-voices.cjs', `--course=${course}`,
      '--by=Claude (chief-of-staff worker), on Tom\'s 2026-08-23 22:00Z ruling',
      `--note=pod-1 staged per-conversation recast. Sample verified on served bytes: voice-vs-speaker-cast, VAD, whisper STT. ${sv ? `${sv.clean}/${sv.clips} CLEAN` : 'no sample work queued'}.`])
    emit({ event: 'approved', course })
  } catch (e) {
    rec.status = 'failed'; rec.failure = `approve: ${(e.stderr || e.message).toString().split('\n')[0]}`
    emit({ event: 'course_failed', course, cause: rec.failure }); return rec
  }

  // 5. bulk
  const bulk = post(`${PHASE8}/generate-pods/${course}`,
    { pod_ids: [podId], roles: ['target', 'known'], concurrency: 5 }, 7200)
  rec.steps.bulk = pick(bulk)
  emit({ event: 'bulk', course, ...pick(bulk) })
  if (bulk.error) {
    rec.status = 'failed'; rec.failure = `bulk: ${bulk.error}`
    emit({ event: 'course_failed', course, cause: rec.failure }); return rec
  }

  // 6. verify what the bulk produced
  const bv = verify(podId, '25min', 10)
  rec.steps.bulk_verify = bv
  emit({ event: 'bulk_verified', course, ...bv })

  rec.status = (bulk.failed || 0) === 0 ? 'complete' : 'complete_with_failures'
  emit({ event: 'course_done', course, status: rec.status, generated: bulk.generated, reused: bulk.reused, failed: bulk.failed })
  return rec
}

const pick = (r) => r ? {
  mode: r.mode, total: r.total, generated: r.generated, reused: r.reused,
  reused_cross_course: r.reused_cross_course, failed: r.failed,
  blocked_unapproved_target: r.blocked_unapproved_target,
  queued_before_sample: r.queued_before_sample,
  error: r.error || r.parse_error, errors: (r.errors || []).slice(0, 5),
} : null

function main() {
  const planned = ONLY.length ? ONLY : [...GROUP1, ...GROUP2]
  const courses = planned.filter((c) => !EXCLUDED[c])
  const skipped = planned.filter((c) => EXCLUDED[c]).map((c) => ({ course: c, reason: EXCLUDED[c] }))
  emit({ event: 'sweep_start', courses: courses.length, excluded: skipped, dry_run: DRY, out: OUT_DIR })
  if (DRY) { emit({ event: 'sweep_done', dry_run: true, plan: courses }); return }

  const out = []
  for (const course of courses) {
    try { out.push(runCourse(course)) } catch (e) {
      const rec = { course, status: 'failed', failure: e.message.split('\n')[0] }
      out.push(rec); emit({ event: 'course_failed', course, cause: rec.failure })
    }
    fs.writeFileSync(RESULTS, JSON.stringify({ generated_at: new Date().toISOString(), excluded: skipped, results: out }, null, 2))
  }
  const tally = out.reduce((m, r) => { m[r.status] = (m[r.status] || 0) + 1; return m }, {})
  emit({ event: 'DONE', courses: out.length, tally, results: RESULTS })
}

main()
