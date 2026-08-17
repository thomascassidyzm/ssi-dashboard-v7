#!/usr/bin/env node
/**
 * A-136 — DROP NOOR from the Dutch cast.
 *
 * Tom's ruling, 2026-08-17: Noor (xAI Dutch female, `247783ebdd51`) emitted tail
 * clicks on 5 of 5 diagnostic lines (A-133, doc 6c0831f5). She comes out of
 * nld_for_eng entirely and her clips are re-rendered on Femke (`58d27475085e`),
 * the voice he picked as his Dutch speaking voice today.
 *
 * WHY FEMKE IS ALSO THE RIGHT VOICE ON THE DATA, not just the ruling:
 *   - she is at index 0 of `app_config.pod_voice_pools.nld.f` — she IS the cast
 *     female for Dutch after the A-133 pool recast;
 *   - A-133 measured her raw provider tail: room floor −83.4 dB, ZERO post-speech
 *     impulses, where Noor showed two at −24.8/−26.7 dB. She is the measured-clean
 *     member of the pool;
 *   - `POD_VOICES_PER_GENDER = 1` — a pod is one voice per gender by design, so
 *     folding Noor's six speakers onto Femke (who already voices Narrator and
 *     Sarah) is convergence toward the intended end state, not a cast collision.
 *
 * WHY AN IN-PLACE VOICE SWAP AND NOT INSERT-AND-RELINK. Every one of Noor's
 * reachable clips is referenced from `listening_pod_sentences` across three
 * columns, two of them `uuid[]` arrays (`target_audio_id`, `takeg_audio_ids`,
 * `sentence_audio_ids`) — 185 references in all. Rewriting those arrays is the
 * only part of this job that could silently orphan a learner-facing slot.
 * Updating the clip row in place moves every reference for free, and
 * `course_audio_revisions` is the estate's existing record of a supersession.
 * Verified safe first: these 341 rows have no `clip_id`, no `audio_clips` canon
 * row and no `course_audio_envelope` row, so nothing downstream pins the old
 * voice.
 *
 * MAKE-BEFORE-BREAK, per clip, no exceptions. Render → upload → verify the NEW
 * object on S3 → only then does the live row point at it. The superseded S3
 * object is never deleted; a rejected render is left on S3 as evidence. Nothing
 * in this tool deletes anything.
 *
 * THE TAIL GATE IS THIS TOOL'S OWN. Main's render chain is compressor-free
 * (A-131/A-132) but has NO end-of-speech trim — the 250 ms tail pad is wired into
 * the chain only on `feat/a133-tail-pad-in-chain-2026-08-17`, which is NOT merged
 * and which this pass is instructed not to merge. So every clip is measured for
 * the A-133 defect directly: locate the last speech sample, then scan everything
 * after it for an isolated impulse standing above the room floor it interrupts.
 * A clip that clicks is refused and the old clip keeps serving.
 *
 * THE SIX DUPLICATES. Six Noor rows share (course, text, language, role) with a
 * Femke clip that already exists, so their voice_id cannot be moved to Femke
 * without violating `unique_course_audio_per_voice`. Those are relinked to the
 * existing Femke clip — no render, no spend — and the emptied Noor rows are left
 * in place. Deleting them needs a deletion plan and Tom's approval; this tool
 * reports them instead.
 *
 * Usage:
 *   node tools/a108/a136-nld-noor-drop.cjs --plan
 *   node tools/a108/a136-nld-noor-drop.cjs --sample 10
 *   node tools/a108/a136-nld-noor-drop.cjs --apply
 *   node tools/a108/a136-nld-noor-drop.cjs --cast
 *   node tools/a108/a136-nld-noor-drop.cjs --verify
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

const PSQL = path.join(process.env.HOME, '.local/pg17/bin/psql')
const DB = process.env.DATABASE_URL
if (!DB) { console.error('DATABASE_URL missing — source .env.psql'); process.exit(1) }

const COURSE = 'nld_for_eng'
const NOOR = ['247783ebdd51', 'xai_247783ebdd51']
const FEMKE_BARE = '58d27475085e'
const FEMKE_CANON = 'xai_58d27475085e'
const FEMKE = ['58d27475085e', 'xai_58d27475085e']
const NOOR_SPEAKERS = ['Anna', 'Customer', 'Customer 1', 'Learner', 'Passenger', 'Receptionist']

const RATE_PER_CHAR = 16 / 1e6
const MAX_ATTEMPTS = 3
const REASON = 'A-136: Noor clicks on 5 of 5 diagnostic lines — she is dropped from the Dutch cast and her clips re-rendered on Femke.'

// --- post-speech impulse gate ------------------------------------------------
// The A-133 defect is not at the end of the file. Noor's ticks sat 261 ms and
// 380 ms AFTER the last word, out in dead air, 42 dB above the floor they
// interrupt, with digital silence after them. So: find where speech ends, then
// look at everything past it.
// CALIBRATED against the A-133 evidence set before a penny was spent — the seven
// published takes at command-surface/public/evidence/a133-end-of-speech-tail-2026-08-17.
// It independently reproduces the doc's headline number (Noor's loudest tick:
// −24.8 dB rel peak, +44.8 dB over floor, a quarter-second after the last word)
// and returns ZERO for all four voices A-133 measured as clean — Femke, Thijs and
// Azure on the live chain, and Noor's own end-of-speech-trimmed take. A gate that
// cannot catch the known clicker is decoration; this one catches it on both takes.
const OVER_FLOOR_DB = 18       // a window this far above the room floor is "loud"
const TICK_OVER_FLOOR_DB = 30  // ...and this far above it, out in dead air, is a tick
const SPEECH_RUN_MS = 120      // a loud run this long is speech, not a transient
const JOIN_GAP_MS = 24         // gaps shorter than this don't break a run
const GUARD_MS = 150           // a real A-133 tick sits in dead air, 250-380ms after the last word

function windowPeaks (file, winMs = 2) {
  const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', '16000',
    '-f', 's16le', '-'], { maxBuffer: 1 << 28 })
  const n = Math.floor(pcm.length / 2)
  const step = Math.round(16000 * winMs / 1000)
  const out = []
  for (let i = 0; i < n; i += step) {
    let peak = 0
    for (let j = i; j < Math.min(i + step, n); j++) {
      const v = Math.abs(pcm.readInt16LE(j * 2))
      if (v > peak) peak = v
    }
    out.push(peak)
  }
  return { peaks: out, winMs }
}

function postSpeechImpulses (file) {
  const { peaks, winMs } = windowPeaks(file)
  const peak = Math.max(...peaks)
  if (!peak) return { measured: false, reason: 'silent file' }
  const db = peaks.map(v => 20 * Math.log10(Math.max(v, 1) / peak))
  const sorted = db.slice().sort((a, b) => a - b)
  const floor = sorted[Math.floor(sorted.length * 0.10)]
  const loud = db.map(d => d >= floor + OVER_FLOOR_DB)

  // Group loud windows into runs, bridging gaps shorter than JOIN_GAP_MS so a
  // stop consonant inside a word doesn't split the word into two runs.
  const joinW = Math.round(JOIN_GAP_MS / winMs)
  const runs = []
  let i = 0
  while (i < loud.length) {
    if (!loud[i]) { i++; continue }
    let e = i
    let j = i + 1
    while (j < loud.length) {
      if (loud[j]) { e = j; j++; continue }
      let k = j
      while (k < loud.length && !loud[k] && k - j < joinW) k++
      if (k < loud.length && loud[k]) { j = k } else break
    }
    runs.push({ s: i, e })
    i = e + 1
  }

  const speechW = Math.round(SPEECH_RUN_MS / winMs)
  const speechRuns = runs.filter(r => (r.e - r.s + 1) >= speechW)
  if (!speechRuns.length) return { measured: false, reason: 'no sustained speech run found' }
  const endOfSpeech = speechRuns[speechRuns.length - 1].e
  const guardW = Math.round(GUARD_MS / winMs)

  // Every detached burst is REPORTED; only the ones that clear the tick margin
  // FAIL the clip. Logging the near-misses is what would let a systematic drift
  // in the provider's tails show up before it becomes a shipped defect.
  const bursts = runs.filter(r => r.s > endOfSpeech + guardW).map(r => ({
    ms_after_speech: (r.s - endOfSpeech) * winMs,
    dur_ms: (r.e - r.s + 1) * winMs,
    db_rel_peak: +Math.max(...db.slice(r.s, r.e + 1)).toFixed(1),
    db_over_floor: +(Math.max(...db.slice(r.s, r.e + 1)) - floor).toFixed(1),
  }))
  return { measured: true, floor_db: +floor.toFixed(1),
    tail_ms: (db.length - endOfSpeech) * winMs, bursts,
    impulses: bursts.filter(b => b.db_over_floor >= TICK_OVER_FLOOR_DB) }
}

// --- db ----------------------------------------------------------------------
function q (sql) {
  return JSON.parse(execFileSync(PSQL, [DB, '-At', '-c',
    `select coalesce(json_agg(t), '[]'::json) from (${sql}) t`], { maxBuffer: 1 << 28 }).toString())
}
function runSql (sql) {
  execFileSync(PSQL, [DB, '-v', 'ON_ERROR_STOP=1', '-q', '-f', '-'],
    { input: sql, stdio: ['pipe', 'inherit', 'inherit'] })
}
function lit (s) { return "'" + String(s).replace(/'/g, "''") + "'" }
function inList (a) { return a.map(lit).join(',') }

function ffprobeDurationMs (file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file]).toString().trim()
  const sec = parseFloat(out)
  if (!isFinite(sec) || sec <= 0) throw new Error(`ffprobe could not decode a duration (got ${JSON.stringify(out)})`)
  return Math.round(sec * 1000)
}

// --- plan --------------------------------------------------------------------
function buildPlan () {
  const clips = q(`
    select a.id, a.text, a.text_normalized, a.language, a.role, a.voice_id, a.origin,
           a.s3_key, a.duration_ms, a.file_size_bytes, a.audio_revision,
           (select f.id::text from course_audio f
             where f.course_code = a.course_code and f.text_normalized = a.text_normalized
               and f.language = a.language and f.role = a.role
               and f.voice_id in (${inList(FEMKE)}) limit 1) as femke_twin,
           (select count(*) from listening_pod_sentences s where s.target_audio_id = a.id)
         + (select count(*) from listening_pod_sentences s where a.id = any(coalesce(s.takeg_audio_ids,'{}')))
         + (select count(*) from listening_pod_sentences s where a.id = any(coalesce(s.sentence_audio_ids,'{}'))) as refs
    from course_audio a
    where a.course_code = ${lit(COURSE)} and a.voice_id in (${inList(NOOR)})
    order by a.role, a.created_at, a.id`)

  for (const c of clips) {
    c.refs = Number(c.refs)
    c.action = c.femke_twin ? 'relink' : 'rerender'
    c.chars = c.text.length
  }
  return clips
}

// TTS cues are not speech: strip them before comparing a decode with the text.
function asrText (t) {
  return String(t).replace(/\[pause\]/gi, ' ').replace(/[…]|\.\.\./g, ' ')
    .replace(/\s+/g, ' ').trim()
}

// Whisper writes numerals; the course text spells them out. "kamer 709" and
// "kamer zevenhonderd negen" are the SAME utterance, but character-level CER
// scores the difference at 0.26 — above the 0.25 threshold — so a perfectly
// spoken clip is refused for the transcriber's notation. Expanding the decode's
// digits into Dutch words compares like with like; the gate itself is untouched.
const NL_UNITS = ['nul', 'een', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen',
  'tien', 'elf', 'twaalf', 'dertien', 'veertien', 'vijftien', 'zestien', 'zeventien', 'achttien', 'negentien']
const NL_TENS = { 2: 'twintig', 3: 'dertig', 4: 'veertig', 5: 'vijftig', 6: 'zestig', 7: 'zeventig', 8: 'tachtig', 9: 'negentig' }
function nlNumber (n) {
  if (!isFinite(n) || n < 0 || n > 9999 || !Number.isInteger(n)) return String(n)
  if (n < 20) return NL_UNITS[n]
  if (n < 100) {
    const u = n % 10
    return (u ? NL_UNITS[u] + 'en' : '') + NL_TENS[Math.floor(n / 10)]
  }
  if (n < 1000) {
    const h = Math.floor(n / 100); const rest = n % 100
    return (h === 1 ? 'honderd' : NL_UNITS[h] + 'honderd') + (rest ? nlNumber(rest) : '')
  }
  const t = Math.floor(n / 1000); const rest = n % 1000
  return (t === 1 ? 'duizend' : NL_UNITS[t] + 'duizend') + (rest ? nlNumber(rest) : '')
}
function spellNumbers (s) {
  return String(s)
    // "€7,70" is spoken "zeven euro zeventig" — the currency word sits between.
    .replace(/[€]\s?(\d+)[.,](\d{2})/g, (_, a, b) => `${nlNumber(+a)} euro ${nlNumber(+b)}`)
    .replace(/(\d+)[.,](\d{2})\b/g, (_, a, b) => `${nlNumber(+a)} ${nlNumber(+b)}`)
    .replace(/\d+/g, m => nlNumber(+m))
}

function guardClip (c) {
  if (c.origin !== 'tts') throw new Error(`${c.id}: origin is ${c.origin} — a human recording is never overwritten`)
  if (!NOOR.includes(c.voice_id)) throw new Error(`${c.id}: voice is ${c.voice_id}, not Noor`)
  if (!c.text || !c.text.trim()) throw new Error(`${c.id}: empty text`)
}

// --- one clip: render, verify, swap -----------------------------------------
async function swapOne (c, tmpDir) {
  guardClip(c)
  const rec = { id: c.id, role: c.role, language: c.language, text: c.text, chars: c.chars,
    previous_s3_key: c.s3_key, previous_duration_ms: c.duration_ms,
    previous_revision: c.audio_revision, previous_voice_id: c.voice_id,
    refs: c.refs, attempts: [], applied: false }

  let winner = null
  for (let attempt = 1; attempt <= MAX_ATTEMPTS && !winner; attempt++) {
    const checks = []
    const add = (name, ok, detail) => { checks.push({ name, ok, detail }); return ok }

    const { audioBuffer, wordBoundaries } = await ttsService.generateWithRetry(c.text, 'xai', {
      apiKey: process.env.XAI_API_KEY, voiceId: FEMKE_BARE, language: 'nl',
    })
    const { buffer, durationMs } = await p8.masterAudio(audioBuffer, c.text)

    const newKey = `mastered/${uuidv4().toUpperCase()}.mp3`
    await p8.s3.send(new PutObjectCommand({
      Bucket: p8.S3_BUCKET, Key: newKey, Body: buffer,
      ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable',
    }))
    const tmpFile = path.join(tmpDir, path.basename(newKey))
    fs.writeFileSync(tmpFile, buffer)

    // Verify the NEW object before anything live points at it.
    const head = await p8.s3.send(new HeadObjectCommand({ Bucket: p8.S3_BUCKET, Key: newKey }))
    add('s3_alive', head.ContentLength === buffer.length, `ContentLength ${head.ContentLength} vs ${buffer.length}`)
    const probed = ffprobeDurationMs(tmpFile)
    add('decodable', probed > 0, `ffprobe ${probed}ms`)
    add('duration_agrees', Math.abs(probed - durationMs) <= Math.max(250, durationMs * 0.05),
      `ffprobe ${probed}ms vs mastered ${durationMs}ms`)
    // Truncation is judged on the NEW clip's own terms, not against Noor's take.
    // The superseded clip is not a duration reference: Noor reads "Wat
    // interessant." in 3288ms where Femke needs 1176ms, and Noor's own
    // "Pardon — heeft u ook iets glutenvrijs?" is 936ms, which is itself a
    // truncated clip — so the cross-voice ratio refused correct renders and
    // treated a defective take as the standard. The band below is measured from
    // the 245 Femke renders this pass already accepted: 6.9 to 20.9 chars/sec.
    // Outside 4-28 the render is either cut short or hung, and CER plus the
    // last-word rule catch anything subtler.
    const cps = c.chars / (durationMs / 1000)
    add('speech_rate_plausible', cps >= 4 && cps <= 28,
      `${cps.toFixed(1)} chars/sec (${durationMs}ms for ${c.chars} chars; accepted band 4-28, observed 6.9-20.9)`)
    const ratio = c.duration_ms ? durationMs / c.duration_ms : 1
    checks.push({ name: 'duration_vs_superseded', ok: true, advisory: true,
      detail: `${durationMs}ms vs Noor's ${c.duration_ms}ms (ratio ${ratio.toFixed(2)}) — advisory only` })

    const tail = postSpeechImpulses(tmpFile)
    add('no_post_speech_impulse', tail.measured && (tail.impulses || []).length === 0,
      tail.measured
        ? `${tail.impulses.length} tick(s), ${tail.bursts.length} detached burst(s) in ${tail.tail_ms}ms of post-speech air (floor ${tail.floor_db}dB)` +
          (tail.impulses.length ? ` — ${JSON.stringify(tail.impulses)}` : '')
        : `NOT MEASURED (${tail.reason}) — unmeasured is not clean`)

    // The ASR gate compares what was HEARD with what should have been SPOKEN, and
    // a pod line's `[pause]` / `…` markers are direction to the synthesiser, not
    // speech. Left in, the literal word "pause" scores as a deletion every time —
    // on "Ja, [pause] natuurlijk." that alone is CER 0.32 against a 0.25
    // threshold, so 14 of these clips were being refused for saying exactly the
    // right words. The clip is still RENDERED from the full cue text; only the
    // comparison string drops the cues.
    const v = await veracity.checkAudioVeracity(tmpFile, asrText(c.text), c.language)
    if (!v.checked) {
      add('asr_checked', false, `UNCHECKED (${v.reason}) — "could not verify" is not "verified"`)
    } else {
      add('asr_checked', true, JSON.stringify(v.decode))
      const spelledCer = veracity.characterErrorRate(spellNumbers(asrText(c.text)), spellNumbers(v.decode))
      const cer = Math.min(v.cer, spelledCer)
      add('asr_matches_text', cer < 0.25,
        `CER ${cer.toFixed(3)}` + (spelledCer < v.cer ? ` (raw ${v.cer.toFixed(3)}, ${spelledCer.toFixed(3)} with numerals spelled out)` : ''))
    }

    const a = { attempt, s3_key: newKey, duration_ms: durationMs, bytes: buffer.length,
      chars: c.chars, cost_usd: +(c.chars * RATE_PER_CHAR).toFixed(6),
      decode: v.checked ? v.decode : null, cer: v.checked ? v.cer : null,
      unchecked_reason: v.checked ? null : v.reason,
      tail, checks, accepted: checks.every(k => k.ok) }
    rec.attempts.push(a)
    if (a.accepted) winner = { key: newKey, durationMs, buffer, wordBoundaries, cer: v.cer, decode: v.decode, tail }
  }

  rec.cost_usd = +(rec.attempts.reduce((s, a) => s + a.cost_usd, 0).toFixed(6))
  if (!winner) {
    rec.result = `NO ACCEPTABLE RENDER in ${MAX_ATTEMPTS} attempts — live row untouched, Noor clip still serving`
    return rec
  }

  const rev = (c.audio_revision ?? 1) + 1
  const wb = winner.wordBoundaries && winner.wordBoundaries.length
    ? lit(JSON.stringify(winner.wordBoundaries)) + '::jsonb' : 'null'
  runSql(`
\\set ON_ERROR_STOP on
begin;
insert into course_audio_revisions
  (audio_id, course_code, revision, previous_revision, previous_s3_key, new_s3_key,
   previous_duration_ms, new_duration_ms, source, accepted_by, reason)
values (${lit(c.id)}, ${lit(COURSE)}, ${rev}, ${c.audio_revision ?? 1},
        ${lit(c.s3_key)}, ${lit(winner.key)}, ${c.duration_ms}, ${winner.durationMs},
        'a136-nld-noor-drop', 'tom (A-136 ruling, 2026-08-17)', ${lit(REASON)})
on conflict (audio_id, revision) do update set
  new_s3_key = excluded.new_s3_key, new_duration_ms = excluded.new_duration_ms;

update course_audio set
  s3_key = ${lit(winner.key)},
  voice_id = ${lit(FEMKE_CANON)},
  duration_ms = ${winner.durationMs},
  file_size_bytes = ${winner.buffer.length},
  audio_revision = ${rev},
  word_boundaries = ${wb},
  origin = 'tts',
  veracity_checked_at = now(),
  veracity_pass = true,
  veracity_cer = ${typeof winner.cer === 'number' ? winner.cer : 'null'},
  veracity_reason = ${lit(`A-136 Noor->Femke re-render; no post-speech impulse in ${winner.tail.tail_ms}ms of tail`)},
  veracity_checker = 'a136-nld-noor-drop'
where id = ${lit(c.id)}
  and s3_key = ${lit(c.s3_key)}
  and voice_id = ${lit(c.voice_id)}
  and text = ${lit(c.text)};

do $$
declare n int;
begin
  select count(*) into n from course_audio
   where id = ${lit(c.id)} and s3_key = ${lit(winner.key)}
     and voice_id = ${lit(FEMKE_CANON)} and audio_revision = ${rev} and text = ${lit(c.text)};
  if n <> 1 then raise exception 'clip row did not take the swap (before-state drifted)'; end if;
  select count(*) into n from listening_pod_sentences s
    join course_audio a on a.id = s.target_audio_id
   where a.id = ${lit(c.id)} and a.text <> s.target_text;
  if n <> 0 then raise exception 'text/audio desync after swap on % row(s)', n; end if;
end $$;
commit;
`)
  rec.applied = true
  rec.revision = rev
  rec.new_s3_key = winner.key
  rec.new_duration_ms = winner.durationMs
  rec.new_voice_id = FEMKE_CANON
  rec.result = 'swapped'
  return rec
}

// --- the six duplicates: relink, never render -------------------------------
function relinkOne (c) {
  const rec = { id: c.id, role: c.role, text: c.text, femke_twin: c.femke_twin,
    refs_before: c.refs, action: 'relink', applied: false }
  runSql(`
\\set ON_ERROR_STOP on
begin;
do $$
declare n int;
begin
  select count(*) into n from course_audio
   where id = ${lit(c.femke_twin)} and course_code = ${lit(COURSE)}
     and voice_id in (${inList(FEMKE)}) and text_normalized = ${lit(c.text_normalized)};
  if n <> 1 then raise exception 'Femke twin % is not the clip this plan measured', ${lit(c.femke_twin)}; end if;
end $$;

update listening_pod_sentences set target_audio_id = ${lit(c.femke_twin)}::uuid
 where target_audio_id = ${lit(c.id)}::uuid;
update listening_pod_sentences set sentence_audio_ids =
   array_replace(sentence_audio_ids, ${lit(c.id)}::uuid, ${lit(c.femke_twin)}::uuid)
 where ${lit(c.id)}::uuid = any(coalesce(sentence_audio_ids,'{}'));
update listening_pod_sentences set takeg_audio_ids =
   array_replace(takeg_audio_ids, ${lit(c.id)}::uuid, ${lit(c.femke_twin)}::uuid)
 where ${lit(c.id)}::uuid = any(coalesce(takeg_audio_ids,'{}'));

do $$
declare n int;
begin
  select (select count(*) from listening_pod_sentences where target_audio_id = ${lit(c.id)}::uuid)
       + (select count(*) from listening_pod_sentences where ${lit(c.id)}::uuid = any(coalesce(sentence_audio_ids,'{}')))
       + (select count(*) from listening_pod_sentences where ${lit(c.id)}::uuid = any(coalesce(takeg_audio_ids,'{}')))
    into n;
  if n <> 0 then raise exception 'still % reference(s) to the Noor clip after relink', n; end if;
  select count(*) into n from listening_pod_sentences s
    join course_audio a on a.id = s.target_audio_id
   where a.id = ${lit(c.femke_twin)}::uuid and a.text <> s.target_text;
  if n <> 0 then raise exception 'text/audio desync after relink on % row(s)', n; end if;
end $$;
update courses set audio_stamp = now() where course_code = ${lit(COURSE)};
commit;
`)
  rec.applied = true
  return rec
}

// --- cast: take Noor out of the stored pod casts -----------------------------
function updateCast () {
  const before = q(`select id, slug, speakers from listening_pods where course_code = ${lit(COURSE)} order by slug`)
  const log = { step: 'cast', pods: [], applied: false }
  for (const p of before) {
    const noorSpeakers = Object.entries(p.speakers)
      .filter(([, v]) => NOOR.includes(v?.target?.voice_id))
      .map(([k]) => k)
    log.pods.push({ pod: p.slug, noor_speakers: noorSpeakers })
    if (!noorSpeakers.length) continue
    runSql(`
\\set ON_ERROR_STOP on
begin;
do $$
declare n int;
begin
  select count(*) into n from listening_pods
   where id = ${lit(p.id)} and speakers::text like '%247783ebdd51%';
  if n <> 1 then raise exception 'pod % no longer carries Noor in its cast — before-state drifted', ${lit(p.slug)}; end if;
end $$;

update listening_pods set speakers = (
  select jsonb_object_agg(k, case
    when v->'target'->>'voice_id' in (${inList(NOOR)})
      then jsonb_set(jsonb_set(v, '{target,voice_id}', ${lit(JSON.stringify(FEMKE_BARE))}::jsonb),
                     '{target,name}', '"Femke"'::jsonb)
    else v end)
  from jsonb_each(speakers) as t(k, v)
), updated_at = now()
where id = ${lit(p.id)};

do $$
declare n int;
begin
  select count(*) into n from listening_pods
   where id = ${lit(p.id)} and speakers::text like '%247783ebdd51%';
  if n <> 0 then raise exception 'Noor survived the cast rewrite on %', ${lit(p.slug)}; end if;
  select count(*) into n from jsonb_each((select speakers from listening_pods where id = ${lit(p.id)}))
   where value->'target'->>'voice_id' is null;
  if n <> 0 then raise exception '% speaker(s) lost their target voice on %', n, ${lit(p.slug)}; end if;
end $$;
commit;
`)
  }
  log.applied = true
  log.after = q(`select slug, speakers from listening_pods where course_code = ${lit(COURSE)} order by slug`)
    .map(p => ({ pod: p.slug, femke_speakers: Object.entries(p.speakers)
      .filter(([, v]) => FEMKE.includes(v?.target?.voice_id)).map(([k]) => k) }))
  return log
}

// --- final verification, from the live DB and S3 -----------------------------
async function verify () {
  const out = { step: 'verify' }
  out.noor_clips_remaining = q(`select id, role, text, s3_key,
      (select count(*) from listening_pod_sentences s where s.target_audio_id = a.id)
    + (select count(*) from listening_pod_sentences s where a.id = any(coalesce(s.takeg_audio_ids,'{}')))
    + (select count(*) from listening_pod_sentences s where a.id = any(coalesce(s.sentence_audio_ids,'{}'))) as refs
    from course_audio a where a.course_code = ${lit(COURSE)} and a.voice_id in (${inList(NOOR)})`)
  out.noor_reachable = out.noor_clips_remaining.filter(r => Number(r.refs) > 0)
  out.noor_in_pod_cast = q(`select slug from listening_pods
     where course_code = ${lit(COURSE)} and speakers::text like '%247783ebdd51%'`)
  out.noor_in_pool = q(`select key from app_config where value::text like '%247783ebdd51%'`)
  out.noor_in_voice_config = q(`select course_code from courses
     where course_code = ${lit(COURSE)} and voice_config::text like '%247783ebdd51%'`)
  out.femke_clips = q(`select voice_id, count(*) n from course_audio
     where course_code = ${lit(COURSE)} and voice_id in (${inList(FEMKE)}) group by 1`)

  // Every clip this pass wrote must be alive on S3 at the key the DB now serves.
  const written = q(`select a.id, a.s3_key, a.file_size_bytes from course_audio a
     join course_audio_revisions r on r.audio_id = a.id and r.source = 'a136-nld-noor-drop'
     where a.course_code = ${lit(COURSE)}`)
  out.s3_checked = written.length
  out.s3_dead = []
  for (const w of written) {
    try {
      const h = await p8.s3.send(new HeadObjectCommand({ Bucket: p8.S3_BUCKET, Key: w.s3_key }))
      if (h.ContentLength !== w.file_size_bytes) out.s3_dead.push({ ...w, head: h.ContentLength, why: 'size mismatch' })
    } catch (e) { out.s3_dead.push({ ...w, why: e.name || String(e) }) }
  }
  return out
}

// --- driver ------------------------------------------------------------------
function write (obj, kind) {
  const out = path.join(__dirname, '..', '..', 'docs', 'a108', `a136-nld-noor-drop-${kind}.json`)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify(obj, null, 2))
  console.log(`\nlog -> ${out}`)
}

;(async () => {
  const argv = process.argv.slice(2)
  const has = f => argv.includes(f)
  const sampleN = has('--sample') ? parseInt(argv[argv.indexOf('--sample') + 1], 10) : 0

  // The tail gate's own regression test: the A-133 evidence set, whose verdicts
  // are published and were reached by ear. Re-run it whenever the gate is touched.
  if (has('--calibrate')) {
    const dir = path.join(process.env.HOME, 'command-surface/public/evidence/a133-end-of-speech-tail-2026-08-17')
    const expect = { 'noor-raw.mp3': 'ticks', 'noor-current-chain.mp3': 'ticks' }
    const rows = []
    let bad = 0
    for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.mp3')).sort()) {
      const r = postSpeechImpulses(path.join(dir, f))
      const want = expect[f] === 'ticks'
      const got = r.measured && r.impulses.length > 0
      if (want !== got) bad++
      rows.push({ file: f, expected: want ? 'ticks' : 'clean', got: got ? 'ticks' : 'clean', ok: want === got, ...r })
      console.log(`${want === got ? 'OK  ' : 'FAIL'} ${f.padEnd(28)} floor ${String(r.floor_db).padStart(6)}  bursts ${r.bursts?.length ?? '-'}  ticks ${r.impulses?.length ?? '-'}`)
    }
    write({ step: 'calibrate', mismatches: bad, rows }, 'calibrate')
    if (bad) { console.log(`\n${bad} mismatch(es) — the gate does not agree with the A-133 ear verdicts. NOT SAFE TO RENDER.`); process.exitCode = 1 }
    else console.log('\nGate agrees with every A-133 ear verdict: catches the known clicker, clears the four clean voices.')
    return
  }
  if (has('--verify')) { const v = await verify(); console.log(JSON.stringify(v, null, 2)); write(v, 'verify'); return }
  if (has('--cast')) { const l = updateCast(); console.log(JSON.stringify(l, null, 2)); write(l, 'cast'); return }

  const plan = buildPlan()
  const rerender = plan.filter(c => c.action === 'rerender')
  const relink = plan.filter(c => c.action === 'relink')
  const chars = rerender.reduce((s, c) => s + c.chars, 0)

  console.log(`A-136 — drop Noor from ${COURSE}`)
  console.log(`  Noor clips           ${plan.length}`)
  console.log(`  re-render on Femke   ${rerender.length}  (${chars} chars, $${(chars * RATE_PER_CHAR).toFixed(4)} at one attempt each)`)
  console.log(`  relink to Femke twin ${relink.length}  ($0.00 — the clip already exists)`)
  console.log(`  learner-reachable    ${plan.filter(c => c.refs > 0).length} of ${plan.length}`)

  if (has('--plan')) {
    write({ step: 'plan', course: COURSE, from: NOOR, to: FEMKE_CANON,
      totals: { clips: plan.length, rerender: rerender.length, relink: relink.length,
        chars, est_usd_one_attempt: +(chars * RATE_PER_CHAR).toFixed(4),
        est_usd_worst_case: +(chars * RATE_PER_CHAR * MAX_ATTEMPTS).toFixed(4) },
      clips: plan }, 'plan')
    console.log('\n--plan: nothing rendered, nothing written.')
    return
  }

  if (!has('--apply') && !sampleN) { console.log('\nnothing to do — pass --plan, --sample N, --apply, --cast or --verify'); return }

  // Only clips still on Noor are eligible, so --apply after --sample resumes
  // cleanly, and a killed run resumes by simply being re-run.
  //
  // --slice k/n partitions the work so several workers can run at once without
  // racing. The partition is by position in a deterministic plan order, so the
  // slices are disjoint by construction rather than by locking. Renders are
  // ~45s each against xAI and everything else in the loop is fast, so this is
  // the only lever that matters on a 300-clip batch.
  // A clip that has already burnt MAX_ATTEMPTS on a gate rejection stays in the
  // plan (its live row is untouched, by design), so a resumed run would re-render
  // it every round at full price. A136_SKIP_IDS parks those for separate triage.
  const skipIds = new Set((process.env.A136_SKIP_IDS || '').split(/[,\s]+/).filter(Boolean))
  let todo = (sampleN ? rerender.slice(0, sampleN) : rerender).filter(c => !skipIds.has(c.id))
  if (skipIds.size) console.log(`  parked (A136_SKIP_IDS) ${rerender.length - todo.length} clip(s)`)
  const sliceArg = has('--slice') ? argv[argv.indexOf('--slice') + 1] : null
  if (sliceArg) {
    const [k, n] = sliceArg.split('/').map(Number)
    if (!(n > 0) || !(k >= 1 && k <= n)) throw new Error(`--slice wants k/n with 1<=k<=n, got ${sliceArg}`)
    todo = todo.filter((_, i) => i % n === (k - 1))
    console.log(`  slice ${k}/${n}          ${todo.length} clip(s) this worker`)
  }
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a136-nld-'))
  const log = { step: sampleN ? `sample(${sampleN})` : 'apply', course: COURSE,
    approval: { by: 'tom', when: '2026-08-17', ruling: 'A-136', verbatim: REASON },
    to_voice: FEMKE_CANON, records: [], relinks: [] }

  let done = 0; let failed = 0
  for (const c of todo) {
    const rec = await swapOne(c, tmpDir)
    log.records.push(rec)
    if (rec.applied) { done++ } else { failed++ }
    const mark = rec.applied ? 'OK  ' : 'FAIL'
    console.log(`${mark} ${(done + failed).toString().padStart(3)}/${todo.length} ${c.id} ${JSON.stringify(c.text.slice(0, 44))} ${rec.applied ? `rev${rec.revision} ${rec.new_duration_ms}ms` : rec.result}`)
    if (!rec.applied) {
      const bad = rec.attempts.flatMap(a => a.checks.filter(k => !k.ok).map(k => `${k.name}: ${k.detail}`))
      bad.forEach(b => console.log(`       ${b}`))
    }
    if (failed && sampleN) { console.log('\nSAMPLE FAILED — stopping. Nothing beyond this clip was rendered.'); break }
  }

  // Relinks are cheap and must happen exactly once, so they belong to the whole
  // run or to worker 1 — never to every slice.
  const doRelinks = !sampleN && (!sliceArg || sliceArg.startsWith('1/'))
  if (doRelinks) {
    for (const c of relink) {
      const r = relinkOne(c)
      log.relinks.push(r)
      console.log(`RELINK ${c.id} -> ${c.femke_twin}  ${JSON.stringify(c.text.slice(0, 44))}`)
    }
  }

  log.totals = {
    attempted: log.records.length, swapped: done, failed,
    relinked: log.relinks.length,
    chars: log.records.reduce((s, r) => s + r.attempts.reduce((t, a) => t + a.chars, 0), 0),
    cost_usd: +(log.records.reduce((s, r) => s + (r.cost_usd || 0), 0).toFixed(6)),
  }
  if (done) runSql(`update courses set audio_stamp = now() where course_code = ${lit(COURSE)};`)
  write(log, sampleN ? 'sample' : `apply${sliceArg ? '-slice' + sliceArg.replace('/', 'of') : ''}`)
  console.log(`\nswapped ${done}, failed ${failed}, relinked ${log.relinks.length}, spend $${log.totals.cost_usd.toFixed(4)}`)
  if (failed) process.exitCode = 1
})().catch(e => { console.error(e.stack || e.message); process.exit(1) })
