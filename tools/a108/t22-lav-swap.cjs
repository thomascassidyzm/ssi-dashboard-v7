#!/usr/bin/env node
/**
 * T-22 (plate A-127) — swap in the Latvian candidate Tom's ear approved.
 *
 * Tom, 2026-08-16, on the T-22 evidence doc: the candidate clip correctly says
 * the feminine ending `priecīga`. APPROVE and swap it in.
 *
 * WHY THIS IS NOT A RE-RUN OF released-clip-fix-render.cjs:
 *   That tool RENDERS. Rendering again would mint DIFFERENT bytes — and Tom did
 *   not approve "a Latvian render of this line", he approved the specific take
 *   he listened to. So this tool renders nothing, spends nothing, and swaps in
 *   the object that is already on S3 from the A-119 pass:
 *
 *     mastered/53626B27-0BBB-4BEF-8BD6-CDDC929F1DCA.mp3
 *
 *   Provenance is asserted, not assumed: the S3 object's bytes must be identical
 *   to the file served on the evidence page he tapped, and the incumbent must be
 *   identical to the "old (still live)" file on that same page. If either has
 *   moved, this refuses — approval would then be attached to bytes nobody can
 *   point at.
 *
 * THE ONE CHECK THAT FAILED IN A-119 (`asr_speaks_fused_form`: whisper hears
 * `priecīgi`, one edit from both candidates) IS THE ONE TOM'S EAR HAS NOW
 * SETTLED. Every other check in that run passed and is re-run here from the
 * live object, not replayed from the log. The human ruling replaces exactly one
 * machine check and nothing else.
 *
 * MAKE BEFORE BREAK: the new object already exists and is verified alive before
 * a single link moves; the superseded object is retained, never deleted.
 *
 * Usage:
 *   node tools/a108/t22-lav-swap.cjs --dry
 *   node tools/a108/t22-lav-swap.cjs --apply
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
process.env.PHASE8_NO_LISTEN = '1'

const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const { execFileSync } = require('child_process')
const { GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')

const p8 = require('../../services/phases/phase8-audio-v13.cjs')
const veracity = require('../../services/audio-veracity.cjs')
const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs')

const PSQL = path.join(process.env.HOME, '.local/pg17/bin/psql')
const DB = process.env.DATABASE_URL
if (!DB) { console.error('DATABASE_URL missing — source .env.psql'); process.exit(1) }

const APPLY = process.argv.includes('--apply')

const CLIP_ID = '99c2328a-d711-4a7d-b36a-fb41c14c28dd'
const COURSE = 'lav_for_eng'
const NEW_KEY = 'mastered/53626B27-0BBB-4BEF-8BD6-CDDC929F1DCA.mp3'
const OLD_KEY = 'mastered/E37D0A29-D171-4EC5-ACE9-9E9C1FEB6407.mp3'
const EVIDENCE = '/home/tomcassidy/command-surface/public/evidence/a119-slash-form-2026-08-16/clips'

const BEFORE = 'Tiešām jā. Esmu tiešām priecīgs(-a), ka varu vest tik daudz sarunas. Un es ceru, ka mēs varēsim vest vairāk sarunu nākotnē, kamēr es turpinu uzlaboties.'
const AFTER = 'Tiešām jā. Esmu tiešām priecīga, ka varu vest tik daudz sarunas. Un es ceru, ka mēs varēsim vest vairāk sarunu nākotnē, kamēr es turpinu uzlaboties.'

const REASON = 'T-22: the Latvian candidate says priecīga — approve it and swap it in.'  // Tom, 2026-08-16

function q (sql) {
  return JSON.parse(execFileSync(PSQL, [DB, '-At', '-c',
    `select coalesce(json_agg(t), '[]'::json) from (${sql}) t`], { maxBuffer: 1 << 28 }).toString())
}
function lit (s) { return "'" + String(s).replace(/'/g, "''") + "'" }
function md5 (buf) { return crypto.createHash('md5').update(buf).digest('hex') }

function ffprobeDurationMs (file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file]).toString().trim()
  const sec = parseFloat(out)
  if (!isFinite(sec) || sec <= 0) throw new Error(`ffprobe could not decode a duration (got ${JSON.stringify(out)})`)
  return Math.round(sec * 1000)
}

async function s3Get (key, file) {
  const body = await p8.s3.send(new GetObjectCommand({ Bucket: p8.S3_BUCKET, Key: key }))
  const buf = Buffer.from(await body.Body.transformToByteArray())
  fs.writeFileSync(file, buf)
  return buf
}

;(async () => {
  const checks = []
  const add = (name, ok, detail) => { checks.push({ name, ok, detail }); return ok }

  // ── the live state ────────────────────────────────────────────────────────
  const clip = q(`select id, course_code, text, text_normalized, language, role, voice_id, origin,
                         s3_key, duration_ms, file_size_bytes, audio_revision
                  from course_audio where id = ${lit(CLIP_ID)}`)[0]
  if (!clip) throw new Error(`clip ${CLIP_ID} is not in the DB`)
  const rows = q(`select s.id, s.pod_id, s.speaker, s.target_text, s.target_text_draft, p.slug, p.speakers
                  from listening_pod_sentences s join listening_pods p on p.id = s.pod_id
                  where s.target_audio_id = ${lit(CLIP_ID)} order by s.id`)

  console.log(`clip      ${CLIP_ID} (${clip.course_code}, ${clip.voice_id}, rev ${clip.audio_revision})`)
  console.log(`live key  ${clip.s3_key}`)
  console.log(`pod rows  ${rows.length}: ${rows.map(r => r.id).join(', ')}`)

  // ── pre-flight: the before-state must be exactly what A-119 parked ────────
  const fail = m => { throw new Error(`REFUSING: ${m}`) }
  if (clip.course_code !== COURSE) fail(`course is ${clip.course_code}`)
  if (clip.origin !== 'tts') fail(`origin is ${clip.origin} — a human recording is never overwritten here`)
  if (clip.s3_key !== OLD_KEY) fail(`live s3_key is ${clip.s3_key}, not the parked incumbent ${OLD_KEY} — something moved since A-119`)
  if (clip.text !== BEFORE) fail(`clip text is not the parked slash form:\n  ${clip.text}`)
  if (!rows.length) fail('no pod row points at this clip')
  for (const r of rows) {
    if (r.target_text_draft) fail(`row ${r.id} is target_text_draft`)
    if (r.target_text !== AFTER) fail(`row ${r.id} does not hold the corrected text:\n  ${r.target_text}`)
    // The voice is re-resolved from the cast and must equal the incumbent: an
    // ear-approval is not a licence to recast.
    const v = p8.resolvePodSpeakerVoice(r.speakers, r.speaker, 'target')
    if (!v) fail(`speaker ${r.speaker} (${r.slug}) resolves to no target voice`)
    const canon = p8.canonicalClipVoiceId(v.voice_id, v.provider || 'azure')
    if (canon !== p8.canonicalClipVoiceId(clip.voice_id, v.provider || 'azure')) {
      fail(`cast resolves to ${canon} but the clip is ${clip.voice_id} — cast moved`)
    }
  }
  // Nothing outside this pocket reads these bytes.
  const other = q(`select
      (select count(*) from listening_pod_sentences where known_audio_id = ${lit(CLIP_ID)})
    + (select count(*) from course_practice_phrases where known_audio_id = ${lit(CLIP_ID)} or target1_audio_id = ${lit(CLIP_ID)} or target2_audio_id = ${lit(CLIP_ID)} or presentation_audio_id = ${lit(CLIP_ID)})
    + (select count(*) from course_seeds where known_audio_id = ${lit(CLIP_ID)} or target1_audio_id = ${lit(CLIP_ID)} or target2_audio_id = ${lit(CLIP_ID)})
    + (select count(*) from lego_introductions where presentation_audio_id = ${lit(CLIP_ID)}) as n`)[0].n
  if (Number(other) !== 0) fail(`clip is referenced ${other} time(s) outside listening_pod_sentences.target_audio_id`)

  // The corrected text must not collide with an existing clip on this voice.
  const afterNorm = normalizeForAudio(AFTER)
  if (!afterNorm) fail('corrected text normalises to empty')
  const clash = q(`select id from course_audio
    where course_code = ${lit(COURSE)} and text_normalized = ${lit(afterNorm)}
      and language = ${lit(clip.language)} and role = ${lit(clip.role)} and voice_id = ${lit(clip.voice_id)}
      and id <> ${lit(CLIP_ID)}`)
  if (clash.length) fail(`${clash.length} other clip(s) already hold the corrected text on this voice (${clash.map(c => c.id).join(', ')}) — this is a relink, not a swap`)
  console.log('pre-flight: passed (before-state, cast voice, references, unique key)')

  // ── the candidate object, verified from S3 and tied to what Tom heard ─────
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 't22-lav-'))
  const newFile = path.join(tmpDir, path.basename(NEW_KEY))
  const head = await p8.s3.send(new HeadObjectCommand({ Bucket: p8.S3_BUCKET, Key: NEW_KEY }))
  add('candidate_s3_alive', head.ContentLength > 0, `${NEW_KEY} ContentLength ${head.ContentLength}`)
  const buf = await s3Get(NEW_KEY, newFile)
  const durationMs = ffprobeDurationMs(newFile)
  add('candidate_decodable', durationMs > 0, `ffprobe ${durationMs}ms (incumbent ${clip.duration_ms}ms)`)

  // PROVENANCE: the bytes he tapped are the bytes that go live.
  const heard = path.join(EVIDENCE, 'lav-parked-candidate.mp3')
  const heardOld = path.join(EVIDENCE, 'lav-parked-old.mp3')
  add('candidate_is_what_tom_heard', fs.existsSync(heard) && md5(fs.readFileSync(heard)) === md5(buf),
    `md5 ${md5(buf)} vs evidence lav-parked-candidate.mp3`)
  const oldBuf = await s3Get(OLD_KEY, path.join(tmpDir, 'old.mp3'))
  add('incumbent_is_the_old_he_compared_against', fs.existsSync(heardOld) && md5(fs.readFileSync(heardOld)) === md5(oldBuf),
    `md5 ${md5(oldBuf)} vs evidence lav-parked-old.mp3`)

  // The A-119 checks, re-run against the live object — not replayed from a log.
  const v = await veracity.checkAudioVeracity(newFile, AFTER, clip.language)
  if (!v.checked) {
    add('asr_decoded', false, `UNCHECKED (${v.reason})`)
  } else {
    const cerOld = veracity.characterErrorRate(BEFORE, v.decode)
    add('asr_decoded', true, JSON.stringify(v.decode))
    add('asr_is_speech', v.cer < 0.6, `CER vs corrected ${v.cer?.toFixed(3)}`)
    add('asr_closer_to_corrected', v.cer < cerOld, `CER ${v.cer?.toFixed(3)} vs corrected < ${cerOld?.toFixed(3)} vs superseded`)
    var asr = { decode: v.decode, cer_vs_new: v.cer, cer_vs_old: cerOld, reason: v.reason }
  }
  // The gender ending itself: whisper cannot separate priecīga from priecīgs
  // here (proven on ggml-medium in A-119), so this is Tom's ear, recorded as
  // such rather than dressed up as a machine pass.
  checks.push({
    name: 'feminine_ending_heard', ok: true, human: true,
    detail: 'Tom, 2026-08-16, on the T-22 evidence doc: the candidate says priecīga. whisper is at its limit on this contrast (small AND medium both decode priecīgi); a human ear is the instrument.',
  })

  for (const k of checks) console.log(`   ${k.ok ? 'OK  ' : 'FAIL'}${k.human ? ' (ear)' : '      '} ${k.name}: ${k.detail}`)
  const pass = checks.every(k => k.ok)

  const log = {
    job: 'T-22 / A-127 — swap in the ear-approved Latvian candidate',
    date: '2026-08-16', mode: APPLY ? 'apply' : 'dry',
    approval: { by: 'tom', when: '2026-08-16', verbatim: REASON, instrument: 'ear (whisper cannot separate the contrast)' },
    clip_id: CLIP_ID, course: COURSE, voice_id: clip.voice_id, language: clip.language,
    before: BEFORE, after: AFTER,
    previous_s3_key: OLD_KEY, new_s3_key: NEW_KEY,
    previous_duration_ms: clip.duration_ms, new_duration_ms: durationMs,
    previous_revision: clip.audio_revision, chars: 0, cost_usd: 0,
    rows: rows.map(r => ({ id: r.id, pod: r.slug, speaker: r.speaker })),
    checks, asr: typeof asr !== 'undefined' ? asr : null, applied: false,
  }

  if (!pass) {
    log.action = 'VERIFICATION FAILED — live row untouched, old clip still serving'
    write(log, 'dryrun')
    console.log('\n-> NOT SWAPPED. Live row untouched, old clip still serving.')
    process.exitCode = 1
    return
  }
  if (!APPLY) {
    log.action = 'dry-run: SWAP (no render, no spend — the object is already on S3)'
    write(log, 'dryrun')
    console.log('\n--dry: nothing written.')
    return
  }

  // ── THE SWAP (one transaction, guarded on the exact before-state) ─────────
  const rev = (clip.audio_revision ?? 1) + 1
  const rowIds = rows.map(r => lit(r.id)).join(',')
  const sql = `
\\set ON_ERROR_STOP on
begin;

insert into course_audio_revisions
  (audio_id, course_code, revision, previous_revision, previous_s3_key, new_s3_key,
   previous_duration_ms, new_duration_ms, source, accepted_by, reason)
values (${lit(CLIP_ID)}, ${lit(COURSE)}, ${rev}, ${clip.audio_revision ?? 1},
        ${lit(OLD_KEY)}, ${lit(NEW_KEY)}, ${clip.duration_ms}, ${durationMs},
        't22-lav-swap', 'tom (ear ruling, 2026-08-16)', ${lit(REASON)})
on conflict (audio_id, revision) do update set
  new_s3_key = excluded.new_s3_key, new_duration_ms = excluded.new_duration_ms;

update course_audio set
  s3_key = ${lit(NEW_KEY)},
  duration_ms = ${durationMs},
  file_size_bytes = ${buf.length},
  audio_revision = ${rev},
  text = ${lit(AFTER)},
  text_normalized = ${lit(afterNorm)},
  word_boundaries = null,
  origin = 'tts',
  veracity_checked_at = now(),
  veracity_pass = true,
  veracity_cer = ${typeof asr !== 'undefined' && typeof asr.cer_vs_new === 'number' ? asr.cer_vs_new : 'null'},
  veracity_reason = ${lit('T-22: feminine ending confirmed by Tom\'s ear, 2026-08-16; whisper cannot separate prieciga/priecigs at small or medium')},
  veracity_checker = 't22-lav-swap (human ear)'
where id = ${lit(CLIP_ID)}
  and s3_key = ${lit(OLD_KEY)}
  and text = ${lit(BEFORE)}
  and voice_id = ${lit(clip.voice_id)};

delete from course_audio_envelope where audio_id = ${lit(CLIP_ID)};
update courses set audio_stamp = now() where course_code = ${lit(COURSE)};

do $$
declare n int;
begin
  select count(*) into n from course_audio
   where id = ${lit(CLIP_ID)} and text = ${lit(AFTER)} and s3_key = ${lit(NEW_KEY)} and audio_revision = ${rev};
  if n <> 1 then raise exception 'clip row did not take the swap (before-state drifted)'; end if;
  select count(*) into n from listening_pod_sentences s
    join course_audio a on a.id = s.target_audio_id
   where s.id in (${rowIds}) and a.text <> s.target_text;
  if n <> 0 then raise exception 'text/audio desync after swap on % row(s)', n; end if;
end $$;

commit;
`
  execFileSync(PSQL, [DB, '-v', 'ON_ERROR_STOP=1', '-q', '-f', '-'], { input: sql, stdio: ['pipe', 'inherit', 'inherit'] })
  log.applied = true
  log.revision = rev
  log.action = 'swap'
  write(log, 'applied')
  console.log(`\n-> SWAPPED. revision ${clip.audio_revision} -> ${rev}; ${OLD_KEY} superseded (retained, not deleted).`)
})().catch(e => { console.error(e.stack || e.message); process.exit(1) })

function write (log, kind) {
  const out = path.join(__dirname, '..', '..', 'docs', 'a108', `t22-lav-swap-${kind}-log.json`)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify(log, null, 2) + '\n')
  console.log(`log: ${out}`)
}
