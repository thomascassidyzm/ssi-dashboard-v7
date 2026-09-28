#!/usr/bin/env node
/**
 * T-22 (plate A-127) — re-render the Dutch pod clip that speaks the WRONG REGISTER.
 *
 * Tom, 2026-08-16, on the T-22 evidence doc: the clip is wrong — he heard the
 * informal `alsjeblieft`, not the polite `alstublieft` the text requires. Do not
 * swap anything in; re-render it.
 *
 * WHAT THE RULING SETTLES BEYOND THE ONE CLIP: the evidence doc said the machine
 * split — token decode said `alsjeblieft`, clip duration said `alstublieft`. His
 * ear says the DECODE WAS RIGHT and the duration heuristic was wrong. So on this
 * contrast whisper is a competent instrument, and this tool gates on it directly
 * rather than parking for another ear.
 *
 * THE TEXT DOES NOT CHANGE. `alstublieft` is already the polite form on both the
 * pod row and the clip row; the defect is in the BYTES, not the words. So this
 * renders the same text again and swaps only the audio — nothing learner-facing
 * is re-authored, and the ZUT/register decision that produced the text stands.
 *
 * WHY THE SAME TEXT CAN COME BACK DIFFERENT: xAI is stochastic and has no speed
 * or pronunciation control. The first render simply said the wrong word. So this
 * retries up to MAX_ATTEMPTS, and each attempt is verified BEFORE anything live
 * points at it (make-before-break). Every rejected object is left on S3 as
 * evidence and never deleted.
 *
 * xAI-FIRST is satisfied by the cast itself: the voice is re-resolved from the
 * pod cast (Customer 1 -> Noor, xai 247783ebdd51) and must equal the voice
 * already on the clip. This tool never chooses or substitutes a voice.
 *
 * IF EVERY ATTEMPT SAYS THE INFORMAL FORM: nothing is swapped, the old clip keeps
 * serving, and the failure is reported for a tap-to-play doc — a provider that
 * cannot say the word is a finding, not a reason to lower the gate.
 *
 * Usage:
 *   node tools/a108/t22-nld-render.cjs --dry
 *   node tools/a108/t22-nld-render.cjs --apply
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
process.env.PHASE8_NO_LISTEN = '1'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const { v4: uuidv4 } = require('uuid')
const { PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')

const p8 = require('../../services/phases/phase8-audio-v13.cjs')
const ttsService = require('../../services/tts-service.cjs')
const veracity = require('../../services/audio-veracity.cjs')
const { toBcp47 } = require('../../services/voice-discovery-service.cjs')

const PSQL = path.join(process.env.HOME, '.local/pg17/bin/psql')
const DB = process.env.DATABASE_URL
if (!DB) { console.error('DATABASE_URL missing — source .env.psql'); process.exit(1) }

const APPLY = process.argv.includes('--apply')
const MAX_ATTEMPTS = 3

const CLIP_ID = '7e08e470-61a2-49ae-8614-222ed9155a75'
const COURSE = 'nld_for_eng'
const OLD_KEY = 'mastered/E933BFD3-3256-4A41-98A6-9153B6E0D314.mp3'
const TEXT = 'Ik wil graag een glas bitter, alstublieft.'
const WANT = 'alstublieft'   // V-form, the register the text requires
const AVOID = 'alsjeblieft'  // T-form, what Tom heard

const RATE_PER_CHAR = 16 / 1e6
const REASON = 'T-22: the Dutch clip speaks the informal register — re-render it in the polite form.'  // Tom, 2026-08-16

function q (sql) {
  return JSON.parse(execFileSync(PSQL, [DB, '-At', '-c',
    `select coalesce(json_agg(t), '[]'::json) from (${sql}) t`], { maxBuffer: 1 << 28 }).toString())
}
function lit (s) { return "'" + String(s).replace(/'/g, "''") + "'" }

/** Plain Levenshtein — the register contrast is 3 edits wide, so distance decides it. */
function lev (a, b) {
  const m = a.length; const n = b.length
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[n]
}

/**
 * The register verdict, read straight off the decode.
 *
 * `alstublieft` and `alsjeblieft` are 3 edits apart, so the nearest decode word
 * lands decisively on one side unless whisper produced something unrelated —
 * which is itself a refusal, not a pass. Both a POSITIVE (the polite form is
 * heard) and a NEGATIVE (the informal form is not) are required: hearing neither
 * means the clip dropped the word, and that is not a fixed clip either.
 */
function registerVerdict (decodeNorm) {
  const words = decodeNorm.split(/\s+/).filter(Boolean)
  const scored = words.map(w => ({ w, toWant: lev(w, WANT), toAvoid: lev(w, AVOID) }))
  const best = scored.slice().sort((a, b) => Math.min(a.toWant, a.toAvoid) - Math.min(b.toWant, b.toAvoid))[0]
  if (!best) return { ok: false, detail: 'empty decode' }
  const heardPolite = best.toWant <= 2 && best.toWant < best.toAvoid
  const heardInformal = best.toAvoid <= 2 && best.toAvoid < best.toWant
  return {
    ok: heardPolite && !heardInformal,
    heard: best.w, to_want: best.toWant, to_avoid: best.toAvoid,
    heardPolite, heardInformal,
    detail: `nearest decode word "${best.w}" is ${best.toWant} from ${WANT} and ${best.toAvoid} from ${AVOID}` +
      (heardInformal ? ' — STILL THE INFORMAL FORM' : heardPolite ? ' — polite form heard' : ' — neither form clearly heard'),
  }
}

function ffprobeDurationMs (file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file]).toString().trim()
  const sec = parseFloat(out)
  if (!isFinite(sec) || sec <= 0) throw new Error(`ffprobe could not decode a duration (got ${JSON.stringify(out)})`)
  return Math.round(sec * 1000)
}

;(async () => {
  const clip = q(`select id, course_code, text, text_normalized, language, role, voice_id, origin,
                         s3_key, duration_ms, file_size_bytes, audio_revision
                  from course_audio where id = ${lit(CLIP_ID)}`)[0]
  if (!clip) throw new Error(`clip ${CLIP_ID} is not in the DB`)
  const rows = q(`select s.id, s.pod_id, s.speaker, s.target_text, s.target_text_draft, p.slug, p.speakers
                  from listening_pod_sentences s join listening_pods p on p.id = s.pod_id
                  where s.target_audio_id = ${lit(CLIP_ID)} order by s.id`)

  console.log(`clip      ${CLIP_ID} (${clip.course_code}, ${clip.voice_id}, rev ${clip.audio_revision})`)
  console.log(`live key  ${clip.s3_key} (${clip.duration_ms}ms)`)
  console.log(`text      ${clip.text}`)
  console.log(`pod rows  ${rows.length}: ${rows.map(r => r.id).join(', ')}`)

  const fail = m => { throw new Error(`REFUSING: ${m}`) }
  if (clip.course_code !== COURSE) fail(`course is ${clip.course_code}`)
  if (clip.origin !== 'tts') fail(`origin is ${clip.origin} — a human recording is never overwritten here`)
  if (clip.s3_key !== OLD_KEY) fail(`live s3_key is ${clip.s3_key}, not ${OLD_KEY} — the clip moved since the T-22 doc`)
  if (clip.text !== TEXT) fail(`clip text is not the T-22 text:\n  ${clip.text}`)
  if (!rows.length) fail('no pod row points at this clip')
  let voice = null
  for (const r of rows) {
    if (r.target_text_draft) fail(`row ${r.id} is target_text_draft`)
    if (r.target_text !== TEXT) fail(`row ${r.id} text disagrees with the clip:\n  ${r.target_text}`)
    const v = p8.resolvePodSpeakerVoice(r.speakers, r.speaker, 'target')
    if (!v) fail(`speaker ${r.speaker} (${r.slug}) resolves to no target voice`)
    const canon = p8.canonicalClipVoiceId(v.voice_id, v.provider || 'azure')
    if (canon !== p8.canonicalClipVoiceId(clip.voice_id, v.provider || 'azure')) {
      fail(`cast resolves to ${canon} but the clip is ${clip.voice_id} — cast moved, refusing to substitute a voice`)
    }
    if (voice && JSON.stringify(voice) !== JSON.stringify(v)) fail('rows resolve to different cast voices')
    voice = v
  }
  if (!['azure', 'xai'].includes(voice.provider || 'azure')) fail(`provider ${voice.provider} is outside this pass`)
  const other = q(`select
      (select count(*) from listening_pod_sentences where known_audio_id = ${lit(CLIP_ID)})
    + (select count(*) from course_practice_phrases where known_audio_id = ${lit(CLIP_ID)} or target1_audio_id = ${lit(CLIP_ID)} or target2_audio_id = ${lit(CLIP_ID)} or presentation_audio_id = ${lit(CLIP_ID)})
    + (select count(*) from course_seeds where known_audio_id = ${lit(CLIP_ID)} or target1_audio_id = ${lit(CLIP_ID)} or target2_audio_id = ${lit(CLIP_ID)})
    + (select count(*) from lego_introductions where presentation_audio_id = ${lit(CLIP_ID)}) as n`)[0].n
  if (Number(other) !== 0) fail(`clip is referenced ${other} time(s) outside listening_pod_sentences.target_audio_id`)
  console.log(`pre-flight: passed. voice ${voice.name} (${voice.provider} ${voice.voice_id}, locale ${voice.locale || '—'})`)

  const log = {
    job: 'T-22 / A-127 — re-render the Dutch clip in the polite register',
    date: '2026-08-16', mode: APPLY ? 'apply' : 'dry',
    approval: { by: 'tom', when: '2026-08-16', verbatim: REASON },
    clip_id: CLIP_ID, course: COURSE, voice_id: clip.voice_id,
    provider: voice.provider, language: clip.language,
    text: TEXT, want: WANT, avoid: AVOID,
    previous_s3_key: OLD_KEY, previous_duration_ms: clip.duration_ms, previous_revision: clip.audio_revision,
    rows: rows.map(r => ({ id: r.id, pod: r.slug, speaker: r.speaker })),
    attempts: [], applied: false,
  }

  if (!APPLY) {
    log.action = `dry-run: RENDER up to ${MAX_ATTEMPTS} attempt(s), ~$${(TEXT.length * RATE_PER_CHAR * MAX_ATTEMPTS).toFixed(4)} worst case`
    write(log, 'dryrun')
    console.log(`\n--dry: nothing rendered, nothing written. ${TEXT.length} chars/attempt.`)
    return
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 't22-nld-'))
  const language = voice.locale || toBcp47(clip.language)
  const voiceName = String(voice.voice_id).replace(/^(azure|xai|elevenlabs)_/, '')
  let winner = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS && !winner; attempt++) {
    console.log(`\nattempt ${attempt}/${MAX_ATTEMPTS}`)
    const checks = []
    const add = (name, ok, detail) => { checks.push({ name, ok, detail }); return ok }

    // 1. GENERATE — same text, cast voice, nothing else.
    let audioBuffer, wordBoundaries
    if ((voice.provider || 'azure') === 'azure') {
      ({ audioBuffer, wordBoundaries } = await ttsService.generateWithRetry(TEXT, 'azure', {
        subscriptionKey: process.env.AZURE_SPEECH_KEY,
        region: process.env.AZURE_SPEECH_REGION || 'westeurope',
        voiceName, speed: 1.0,
      }))
    } else {
      ({ audioBuffer, wordBoundaries } = await ttsService.generateWithRetry(TEXT, 'xai', {
        apiKey: process.env.XAI_API_KEY, voiceId: voiceName, language,
      }))
    }
    const { buffer, durationMs } = await p8.masterAudio(audioBuffer, TEXT)
    const newKey = `mastered/${uuidv4().toUpperCase()}.mp3`
    await p8.s3.send(new PutObjectCommand({
      Bucket: p8.S3_BUCKET, Key: newKey, Body: buffer,
      ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable',
    }))
    const tmpFile = path.join(tmpDir, path.basename(newKey))
    fs.writeFileSync(tmpFile, buffer)

    // 2. VERIFY, before anything live points at it
    const head = await p8.s3.send(new HeadObjectCommand({ Bucket: p8.S3_BUCKET, Key: newKey }))
    add('s3_alive', head.ContentLength === buffer.length, `${newKey} ContentLength ${head.ContentLength} vs local ${buffer.length}`)
    const probed = ffprobeDurationMs(tmpFile)
    add('decodable', probed > 0, `ffprobe ${probed}ms`)
    add('duration_agrees', Math.abs(probed - durationMs) <= Math.max(250, durationMs * 0.05), `ffprobe ${probed}ms vs mastered ${durationMs}ms`)
    // The words are unchanged, so the new clip should be the same order of
    // length as the old one. xAI's pace varies between renders, so this is wide
    // — it catches a collapse or a runaway, not a nuance.
    const ratio = durationMs / clip.duration_ms
    add('not_truncated', ratio >= 0.6 && ratio <= 1.8, `${durationMs}ms vs superseded ${clip.duration_ms}ms (ratio ${ratio.toFixed(2)})`)

    const v = await veracity.checkAudioVeracity(tmpFile, TEXT, clip.language)
    let reg = null
    if (!v.checked) {
      add('asr_decoded', false, `UNCHECKED (${v.reason}) — "could not verify" is not "verified"`)
    } else {
      add('asr_decoded', true, JSON.stringify(v.decode))
      add('asr_is_speech', v.cer < 0.6, `CER ${v.cer?.toFixed(3)} vs the text`)
      reg = registerVerdict(veracity.normalise(v.decode))
      add('speaks_polite_register', reg.ok, reg.detail)
    }
    for (const k of checks) console.log(`   ${k.ok ? 'OK  ' : 'FAIL'} ${k.name}: ${k.detail}`)

    const rec = {
      attempt, s3_key: newKey, duration_ms: durationMs, bytes: buffer.length,
      chars: TEXT.length, cost_usd: +(TEXT.length * RATE_PER_CHAR).toFixed(6),
      decode: v.checked ? v.decode : null, cer: v.checked ? v.cer : null, unchecked_reason: v.checked ? null : v.reason,
      register: reg, checks, accepted: checks.every(k => k.ok),
    }
    log.attempts.push(rec)
    if (rec.accepted) {
      winner = { key: newKey, durationMs, buffer, wordBoundaries, cer: v.cer, decode: v.decode, register: reg }
      console.log('   -> ACCEPTED')
    } else {
      console.log('   -> REJECTED. Object left on S3 as evidence; live row untouched, old clip still serving.')
    }
  }

  log.chars = log.attempts.reduce((a, r) => a + r.chars, 0)
  log.cost_usd = +(log.chars * RATE_PER_CHAR).toFixed(6)

  if (!winner) {
    log.action = `NO ACCEPTABLE RENDER in ${MAX_ATTEMPTS} attempts — live row untouched, old clip still serving; needs a tap-to-play doc`
    write(log, 'failed')
    console.log(`\n-> NOT SWAPPED after ${MAX_ATTEMPTS} attempts. Old clip still serving.`)
    process.exitCode = 1
    return
  }

  // 3. SWAP — audio only. The text is unchanged and is re-asserted, never rewritten.
  const rev = (clip.audio_revision ?? 1) + 1
  const rowIds = rows.map(r => lit(r.id)).join(',')
  const wb = winner.wordBoundaries && winner.wordBoundaries.length
    ? lit(JSON.stringify(winner.wordBoundaries)) + '::jsonb' : 'null'
  const sql = `
\\set ON_ERROR_STOP on
begin;

insert into course_audio_revisions
  (audio_id, course_code, revision, previous_revision, previous_s3_key, new_s3_key,
   previous_duration_ms, new_duration_ms, source, accepted_by, reason)
values (${lit(CLIP_ID)}, ${lit(COURSE)}, ${rev}, ${clip.audio_revision ?? 1},
        ${lit(OLD_KEY)}, ${lit(winner.key)}, ${clip.duration_ms}, ${winner.durationMs},
        't22-nld-render', 'tom (ear ruling, 2026-08-16)', ${lit(REASON)})
on conflict (audio_id, revision) do update set
  new_s3_key = excluded.new_s3_key, new_duration_ms = excluded.new_duration_ms;

update course_audio set
  s3_key = ${lit(winner.key)},
  duration_ms = ${winner.durationMs},
  file_size_bytes = ${winner.buffer.length},
  audio_revision = ${rev},
  word_boundaries = ${wb},
  origin = 'tts',
  veracity_checked_at = now(),
  veracity_pass = true,
  veracity_cer = ${typeof winner.cer === 'number' ? winner.cer : 'null'},
  veracity_reason = ${lit(`T-22 register re-render: decode says ${WANT}, not ${AVOID} (${winner.register.detail})`)},
  veracity_checker = 't22-nld-render'
where id = ${lit(CLIP_ID)}
  and s3_key = ${lit(OLD_KEY)}
  and text = ${lit(TEXT)}
  and voice_id = ${lit(clip.voice_id)};

delete from course_audio_envelope where audio_id = ${lit(CLIP_ID)};
update courses set audio_stamp = now() where course_code = ${lit(COURSE)};

do $$
declare n int;
begin
  select count(*) into n from course_audio
   where id = ${lit(CLIP_ID)} and text = ${lit(TEXT)} and s3_key = ${lit(winner.key)} and audio_revision = ${rev};
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
  log.new_s3_key = winner.key
  log.new_duration_ms = winner.durationMs
  log.action = 'swap'
  write(log, 'applied')
  console.log(`\n-> SWAPPED. revision ${clip.audio_revision} -> ${rev}; ${OLD_KEY} superseded (retained, not deleted).`)
})().catch(e => { console.error(e.stack || e.message); process.exit(1) })

function write (log, kind) {
  const out = path.join(__dirname, '..', '..', 'docs', 'a108', `t22-nld-render-${kind}-log.json`)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify(log, null, 2) + '\n')
  console.log(`log: ${out}`)
}
