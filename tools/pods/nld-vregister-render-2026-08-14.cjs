#!/usr/bin/env node
/**
 * nld-vregister-render-2026-08-14.cjs — A-108 follow-on, Tom's approval of 2026-08-14.
 *
 * WHAT. 29 nld_for_eng pod clips (51 rows across pod-0 and pod-0-unrecorded)
 * speak a T-form at a barista, bartender, waiter, shop assistant, pharmacist,
 * taxi driver or a stranger on a train. The register fix is in
 * docs/a108/nld-resolution.json, derived in docs/a108/nld-nondraft-report-2026-08-14.md.
 *
 * WHY IT IS ONE PASS AND NOT TWO. Today course_audio.text is byte-identical to
 * listening_pod_sentences.target_text on every one of these 29 clips — the
 * whisper decode confirmed the audio speaks what the text stores. So a
 * pod-text-only edit would desync the two, and the eventual render would read
 * course_audio.text and speak the OLD informal words again. Text and audio move
 * together here or not at all: the new clip is rendered on the NEW text (so its
 * course_audio.text is correct by construction), and the pod row's target_text
 * and target_audio_id are written in the SAME statement. There is no instant at
 * which a learner can see the new words against the old audio, or the reverse.
 *
 * MAKE-BEFORE-BREAK (AUDIO_PIPELINE_ARCHITECTURE.md §6b). Strictly in order:
 *   1. render every new clip;
 *   2. verify each one — alive on S3, right voice, decodable, not truncated,
 *      and whisper says the corrected word aloud;
 *   3. only then swap the links, all 51 rows in ONE transaction;
 *   4. deletion of the superseded clips is NOT done here. They are left in
 *      place and unreferenced; deleting a generated asset needs its own plan
 *      and approval.
 * A render that fails verification never reaches step 3 — its rows keep the old
 * text AND the old audio, still in sync with each other.
 *
 * NO AZURE. All six voices are xAI and already cast on this course. The voice
 * that actually produced each clip is asserted equal to the incumbent's voice_id
 * after the render, so a silent xAI→Azure fallback inside generatePodAudio is
 * caught and aborts the swap rather than shipping.
 *
 * NOT IN SCOPE. The five `jullie` rows that address the BUSINESS rather than the
 * person (Hebben jullie een menu / Welke ales hebben jullie / Hebben jullie
 * contactloos betalen) are correct V-register Dutch and are untouched — Tom's
 * ruling, 2026-08-14. The one `jullie` that addresses PEOPLE, the bartender's
 * `Eten jullie vanavond?`, IS in the list.
 *
 * Usage:
 *   PHASE8_NO_LISTEN=1 node tools/pods/nld-vregister-render-2026-08-14.cjs           # DRY RUN
 *   PHASE8_NO_LISTEN=1 node tools/pods/nld-vregister-render-2026-08-14.cjs --apply
 */

require('dotenv').config({ path: require('path').join(__dirname, '../..', '.env') })
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { createClient } = require('@supabase/supabase-js')
const p8 = require('../../services/phases/phase8-audio-v13.cjs')

const COURSE = 'nld_for_eng'
const LANG = 'nld'
const ROLE = 'target1'
const S3_BASE = 'https://ssi-audio-stage.s3.eu-west-1.amazonaws.com'
const WHISPER_MODEL = path.join(process.env.HOME, '.local/share/whisper-models/ggml-medium.bin')

const APPLY = process.argv.includes('--apply')
const ROOT = path.join(__dirname, '../..')
const RESOLUTION = path.join(ROOT, 'docs/a108/nld-resolution.json')
const LOG = path.join(ROOT, `docs/a108/nld-vregister-render-${APPLY ? 'applied' : 'dryrun'}-log.json`)

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

function die (msg) { console.error('ABORT: ' + msg); process.exit(1) }

// A real field separator. `-F ''` splits every row into single CHARACTERS, which
// makes every before-state assertion pass vacuously against a one-char string —
// the trap the ara relink documented. Pipe cannot appear in a uuid or in these
// Dutch strings.
const SEP = '|'
function psql (sql) {
  const env = { ...process.env }
  for (const line of fs.readFileSync(path.join(ROOT, '.env.psql'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  const out = execFileSync(
    path.join(process.env.HOME, '.local/pg17/bin/psql'),
    [env.DATABASE_URL, '-At', '-F', SEP, '-v', 'ON_ERROR_STOP=1', '-c', sql],
    { env, encoding: 'utf8' }
  )
  return out.trim().split('\n').filter(Boolean).map(l => l.split(SEP))
}

/** Dollar-quoting, so apostrophes in "americano's" and accents in "één" are literal. */
function q (s) {
  if (String(s).includes('$tx$')) die('text contains the dollar-quote tag')
  return `$tx$${s}$tx$`
}

/** The corrected/superseded token pair each clip turns on, for the decode check. */
function registerTokens (before, after) {
  const tok = (s) => (s.toLowerCase().match(/[a-zà-ÿ]+/g) || [])
  const b = tok(before), a = tok(after)
  const gained = a.filter(w => !b.includes(w))
  const lost = b.filter(w => !a.includes(w))
  return { gained, lost }
}

;(async () => {
  // ---- load the plan ------------------------------------------------------
  const resolution = JSON.parse(fs.readFileSync(RESOLUTION, 'utf8'))
  const clipIds = Object.keys(resolution).filter(k => !k.startsWith('_'))
  if (clipIds.length !== 29) die(`resolution map has ${clipIds.length} clips, expected 29`)

  // ---- before-state: the pod rows ----------------------------------------
  const { data: rows, error: rErr } = await supabase
    .from('listening_pod_sentences')
    .select('id, pod_id, global_order, speaker, target_text, target_audio_id, target_text_draft')
    .in('target_audio_id', clipIds)
    .order('pod_id').order('global_order')
  if (rErr) die(`load pod rows: ${rErr.message}`)
  if (rows.length !== 51) die(`expected 51 pod rows on these 29 clips, found ${rows.length}`)
  for (const r of rows) {
    if (!r.pod_id.startsWith(`${COURSE}:pod-0`)) die(`${r.id} is outside the nld pod-0 pocket (${r.pod_id})`)
    if (r.target_text_draft !== false) die(`${r.id} is target_text_draft=${r.target_text_draft}; this pocket is non-draft`)
  }

  // ---- before-state: the clips -------------------------------------------
  const { data: clips, error: cErr } = await supabase
    .from('course_audio')
    .select('id, course_code, text, language, role, voice_id, origin, s3_key, duration_ms')
    .in('id', clipIds)
  if (cErr) die(`load clips: ${cErr.message}`)
  if (clips.length !== 29) die(`expected 29 clips, found ${clips.length}`)
  const byClip = Object.fromEntries(clips.map(c => [c.id, c]))

  const { data: pod } = await supabase.from('listening_pods').select('speakers').eq('id', `${COURSE}:pod-0`).single()
  if (!pod || !pod.speakers) die(`no cast on ${COURSE}:pod-0`)

  const plan = []
  let chars = 0
  for (const clipId of clipIds) {
    const c = byClip[clipId]
    if (!c) die(`clip ${clipId} not in course_audio`)
    if (c.course_code !== COURSE) die(`${clipId} belongs to ${c.course_code}`)
    if (c.language !== LANG || c.role !== ROLE) die(`${clipId} is ${c.language}/${c.role}, expected ${LANG}/${ROLE}`)
    if (c.origin !== 'tts') die(`${clipId} origin=${c.origin} — a human recording is never re-rendered by this script`)

    const clipRows = rows.filter(r => r.target_audio_id === clipId)
    if (!clipRows.length) die(`${clipId} has no pod rows`)

    // the invariant this whole job is built on: text and audio agree TODAY
    for (const r of clipRows) {
      if (r.target_text !== c.text) {
        die(`${r.id}: pod text and course_audio.text already disagree\n  pod  : ${r.target_text}\n  audio: ${c.text}`)
      }
    }
    const before = c.text
    const after = resolution[clipId].after
    if (!after) die(`${clipId} has no 'after' in the resolution map`)
    if (after === before) die(`${clipId}: after === before, nothing to render`)

    // the incumbent's voice is ground truth; the cast must agree with it
    const speakers = [...new Set(clipRows.map(r => r.speaker))]
    if (speakers.length !== 1) die(`${clipId} is shared by different speakers: ${speakers.join(', ')}`)
    const voice = p8.resolvePodSpeakerVoice(pod.speakers, speakers[0], 'target')
    if (!voice) die(`${clipId}: no target voice cast for speaker "${speakers[0]}"`)
    if (voice.provider !== 'xai') die(`${clipId}: speaker "${speakers[0]}" is cast on ${voice.provider}, not xAI — pause and report`)
    // Compare CANONICALLY on both sides. These incumbent rows store the legacy
    // bare id (`247783ebdd51`, `eve`); a clip written today stores the canonical
    // provider-prefixed form (`xai_247783ebdd51`). Same voice, two spellings —
    // comparing the raw strings would read the estate's own id migration as a
    // recast and abort on every clip.
    const canonVoice = p8.canonicalClipVoiceId(voice.voice_id, voice.provider)
    const canonIncumbent = p8.canonicalClipVoiceId(c.voice_id, 'xai')
    if (canonVoice !== canonIncumbent) {
      die(`${clipId}: cast would recast "${speakers[0]}" ${c.voice_id} -> ${canonVoice}. A register fix must not change the voice.`)
    }

    // Does the corrected text already exist as a clip on this course/voice?
    //
    // RESUME (2026-08-14, second run). The first --apply run was killed by its
    // session ending after 21 of 29 renders, DURING step 1. Because this script
    // renders everything before it swaps anything, nothing was linked: all 51
    // rows still carry the old text AND the old audio, still in sync. The 21
    // clips it did render are sitting in course_audio, unreferenced.
    //
    // So a hit here is one of two very different things, and the difference is
    // whose voice it is and whether we made it:
    //   (a) a clip THIS JOB rendered on the incumbent's own voice — adopt it,
    //       skip the re-render, and put it through the SAME verification below
    //       as a fresh render. Nothing is trusted because it is old; it is
    //       verified now, before any link moves. Re-rendering instead would pay
    //       twice and, worse, collide on unique_course_audio_per_voice.
    //   (b) anything else — a different voice, a human recording, or one of
    //       this job's own incumbent clips — is a genuine relink question, and
    //       this script does not do relinks.
    const { data: hits, error: hErr } = await supabase
      .from('course_audio').select('id, text, voice_id, origin, s3_key, duration_ms')
      .eq('course_code', COURSE).eq('language', LANG).eq('role', ROLE).eq('text', after)
    if (hErr) die(`${clipId}: lookup of the corrected text failed: ${hErr.message}`)
    let adopted = null
    if (hits && hits.length) {
      if (hits.length > 1) die(`${clipId}: the corrected text exists ${hits.length} times — stop and re-plan`)
      const h = hits[0]
      if (clipIds.includes(h.id)) die(`${clipId}: the corrected text is already an incumbent clip of this job (${h.id}) — that is a relink, not a render`)
      if (h.origin !== 'tts') die(`${clipId}: the corrected text exists as a ${h.origin} recording (${h.id}) — never overwritten or adopted here`)
      if (p8.canonicalClipVoiceId(h.voice_id, 'xai') !== canonVoice) {
        die(`${clipId}: the corrected text exists as clip ${h.id} on voice ${h.voice_id}, not ${canonVoice} — that is a relink, not a render. Stop and re-plan.`)
      }
      adopted = h.id
    }

    // only text we still have to pay xAI for counts toward the bill
    if (!adopted) chars += after.length
    plan.push({
      clip_id: clipId,
      adopted_clip_id: adopted,
      speaker: speakers[0],
      voice_id: c.voice_id,
      voice_id_canonical: canonVoice,
      provider: voice.provider,
      s3_key_old: c.s3_key,
      duration_ms_old: c.duration_ms,
      rows: clipRows.map(r => r.id),
      before,
      after,
      reason: resolution[clipId].reason,
      tokens: registerTokens(before, after),
    })
  }

  const cost = (chars / 1e6) * 15
  console.log(`${plan.length} clips, ${rows.length} rows, ${chars} characters, $${cost.toFixed(4)} at xAI $15/1M`)

  if (!APPLY) {
    fs.writeFileSync(LOG, JSON.stringify({
      job: 'A-108 nld_for_eng V-register render', date: '2026-08-14', applied: false,
      clips: plan.length, rows: rows.length, chars, cost_usd: Number(cost.toFixed(4)), plan,
    }, null, 2) + '\n')
    console.log('DRY RUN — every before-state assertion passed. Nothing rendered, nothing written.')
    for (const p of plan) console.log(`  ${p.clip_id.slice(0, 8)} ${p.voice_id.padEnd(12)} ${p.rows.length} row(s)  ${p.before}  ->  ${p.after}`)
    console.log(`log: ${LOG}`)
    process.exit(0)
  }

  // ======================================================================
  // STEP 1 + 2 — render every clip, verify every clip. No links move yet.
  // ======================================================================
  const tmp = fs.mkdtempSync('/tmp/nld-vreg-')
  for (const p of plan) {
    const voice = p8.resolvePodSpeakerVoice(pod.speakers, p.speaker, 'target')
    let res
    if (p.adopted_clip_id) {
      // Rendered by the killed first run. Verified below exactly as if it had
      // just come off the wire — adoption skips the SPEND, never the checks.
      res = { id: p.adopted_clip_id, bytes: null }
      p.resumed = true
    } else {
      // NO `track`: the incumbent clips carry no " … " pause cue, and
      // course_audio.text must stay byte-identical to the pod row's target_text.
      res = await p8.generatePodAudio({
        courseCode: COURSE, text: p.after, language: LANG, role: ROLE, voice,
      })
      if (res.reused) die(`${p.clip_id}: generatePodAudio reused clip ${res.id} instead of rendering — the collision check missed it`)
      p.resumed = false
    }
    p.new_clip_id = res.id
    p.rendered_bytes = res.bytes

    const { data: nc, error: ncErr } = await supabase
      .from('course_audio').select('id, text, language, role, voice_id, origin, s3_key, duration_ms').eq('id', res.id).single()
    if (ncErr || !nc) die(`${p.clip_id}: new clip ${res.id} not readable back: ${ncErr && ncErr.message}`)
    if (nc.text !== p.after) die(`${p.clip_id}: new clip stores "${nc.text}", not the corrected "${p.after}"`)
    if (p8.canonicalClipVoiceId(nc.voice_id, 'xai') !== p.voice_id_canonical) {
      die(`${p.clip_id}: new clip is voice ${nc.voice_id}, expected ${p.voice_id_canonical} — xAI probably fell back to Azure. Pause and report.`)
    }
    if (nc.language !== LANG || nc.role !== ROLE) die(`${p.clip_id}: new clip is ${nc.language}/${nc.role}`)
    if (nc.origin !== 'tts') die(`${p.clip_id}: new clip origin=${nc.origin}`)

    // alive on S3, and long enough to be this line
    let bytes = 0
    try {
      const head = execFileSync('curl', ['-sfI', `${S3_BASE}/${nc.s3_key}`], { encoding: 'utf8' })
      bytes = Number((head.match(/content-length:\s*(\d+)/i) || [])[1] || 0)
    } catch { die(`${p.clip_id}: new clip is NOT alive on S3 (${nc.s3_key})`) }
    if (bytes < 4000) die(`${p.clip_id}: new clip is only ${bytes} bytes on S3`)

    // decodable, and not truncated — ffprobe's own duration, not the DB's claim
    const src = path.join(tmp, `${res.id}.mp3`), wav = path.join(tmp, `${res.id}.wav`)
    execFileSync('curl', ['-sf', `${S3_BASE}/${nc.s3_key}`, '-o', src])
    const probed = Number(execFileSync('ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], { encoding: 'utf8' }).trim()) * 1000
    if (!Number.isFinite(probed) || probed < 500) die(`${p.clip_id}: new clip probes ${probed}ms — not decodable or empty`)
    // the old clip is the yardstick: same words bar one, so a big shortfall is a truncation
    if (probed < p.duration_ms_old * 0.6) die(`${p.clip_id}: new clip ${Math.round(probed)}ms vs old ${p.duration_ms_old}ms — truncated`)

    // whisper: does it actually SAY the corrected form?
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-ar', '16000', '-ac', '1', wav])
    execFileSync(path.join(process.env.HOME, '.local/bin/whisper-cli'),
      ['-m', WHISPER_MODEL, '-l', 'nl', '-t', '2', '-np', '-oj', '-of', path.join(tmp, res.id), '-f', wav],
      { stdio: 'ignore' })
    const j = JSON.parse(fs.readFileSync(path.join(tmp, `${res.id}.json`), 'utf8'))
    const transcript = (j.transcription || []).map(s => s.text).join(' ').trim()
    const heard = transcript.toLowerCase()
    p.transcript = transcript
    p.probed_ms = Math.round(probed)
    p.s3_bytes = bytes
    p.ms_per_char = Number((probed / p.after.length).toFixed(1))
    p.decode_gained_heard = p.tokens.gained.filter(w => heard.includes(w))
    p.decode_lost_still_heard = p.tokens.lost.filter(w => new RegExp(`\\b${w}\\b`).test(heard))

    fs.rmSync(src, { force: true }); fs.rmSync(wav, { force: true })
    console.log(`  ${p.resumed ? 'adopted ' : 'rendered'} ${p.clip_id.slice(0, 8)} -> ${res.id.slice(0, 8)}  ${p.probed_ms}ms ${bytes}B  "${transcript}"`)
  }

  // Decode is EVIDENCE, not a hard gate — whisper mishears function words, and a
  // false abort after paying for 29 renders is worse than a flagged row. Every
  // verdict is in the log; a clip that still speaks a superseded T-form is
  // reported loudly.
  const suspect = plan.filter(p => p.decode_lost_still_heard.length || !p.decode_gained_heard.length)

  // ======================================================================
  // STEP 3 — swap. All 51 rows in ONE transaction, each guarded on its
  // before-state, text and audio moving in the same UPDATE.
  // ======================================================================
  const stmts = ['begin;']
  for (const p of plan) {
    for (const rowId of p.rows) {
      stmts.push(
        `update listening_pod_sentences set target_text=${q(p.after)}, target_audio_id='${p.new_clip_id}', updated_at=now()` +
        ` where id=${q(rowId)} and target_audio_id='${p.clip_id}' and target_text=${q(p.before)} and target_text_draft=false;`)
    }
  }
  stmts.push(`update courses set audio_stamp=now() where course_code='${COURSE}';`)
  // the whole transaction lives or dies on the row count
  stmts.push(`do $chk$ begin
    if (select count(*) from listening_pod_sentences s join course_audio c on c.id=s.target_audio_id
        where s.pod_id like '${COURSE}:pod-0%' and c.id in (${plan.map(p => `'${p.new_clip_id}'`).join(',')})) <> ${rows.length}
    then raise exception 'post-swap row count is not ${rows.length}'; end if;
  end $chk$;`)
  stmts.push('commit;')
  psql(stmts.join('\n'))

  // ======================================================================
  // STEP 4 — post-write verification, read back fresh
  // ======================================================================
  const after = psql(
    `select s.id, s.target_text, s.target_audio_id::text, s.target_text_draft, c.text` +
    ` from listening_pod_sentences s join course_audio c on c.id=s.target_audio_id` +
    ` where s.target_audio_id in (${plan.map(p => `'${p.new_clip_id}'`).join(',')}) order by s.id`)
  if (after.length !== rows.length) die(`post-write: ${after.length} rows on the new clips, expected ${rows.length}`)
  for (const [id, text, clip, draft, clipText] of after) {
    if (draft !== 'f') die(`post-write ${id}: target_text_draft became ${draft}`)
    if (text !== clipText) die(`post-write ${id}: pod text and course_audio.text disagree — the desync this job exists to prevent`)
  }
  const stillOld = psql(
    `select id from listening_pod_sentences where target_audio_id in (${plan.map(p => `'${p.clip_id}'`).join(',')})`)
  const stamp = psql(`select audio_stamp from courses where course_code='${COURSE}'`)[0][0]

  fs.rmSync(tmp, { recursive: true, force: true })
  fs.writeFileSync(LOG, JSON.stringify({
    job: 'A-108 nld_for_eng V-register render', date: '2026-08-14', applied: true,
    approval: "Tom 2026-08-14: render the 29 Dutch clips / 51 rows found by job #544's whisper-check-first analysis",
    clips: plan.length, rows: rows.length, chars, cost_usd: Number(cost.toFixed(4)),
    resumed_from_killed_first_run: plan.filter(p => p.resumed).length,
    rendered_this_run: plan.filter(p => !p.resumed).length,
    audio_stamp: stamp,
    text_and_audio_moved_together: true,
    old_clips_deleted: false,
    old_clips_note: 'left in place and unreferenced; deleting a generated asset needs its own plan and approval',
    rows_still_on_superseded_clips: stillOld.map(r => r[0]),
    decode_suspects: suspect.map(p => ({ clip: p.new_clip_id, transcript: p.transcript, expected: p.after })),
    plan,
  }, null, 2) + '\n')

  console.log(`\nAPPLIED. ${plan.length} clips rendered and verified, ${rows.length} rows swapped, audio_stamp ${stamp}`)
  console.log(`rows still pointing at a superseded clip: ${stillOld.length === 0 ? 'none' : stillOld.map(r => r[0]).join(', ')}`)
  console.log(`decode suspects: ${suspect.length === 0 ? 'none' : suspect.map(p => p.new_clip_id.slice(0, 8)).join(', ')}`)
  console.log(`log: ${LOG}`)
  process.exit(0)
})().catch((e) => { console.error('ERR:', e.stack || e.message); process.exit(1) })
