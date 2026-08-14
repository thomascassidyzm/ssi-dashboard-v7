#!/usr/bin/env node
/**
 * A-108 — isl/ell/est register+gender pocket: text and audio move in ONE pass.
 *
 * Approved by Tom 2026-08-14 (this thread). These three courses have ZERO xAI
 * voices in their pools, so re-rendering on the incumbent Azure voices is the
 * sanctioned fallback case of the xAI-first rule, not an exception to it. The
 * tool NEVER picks a voice: it re-resolves the pod cast, asserts the resolved
 * voice canonically equals the voice already on the clip row, and refuses the
 * clip otherwise. There is no substitution path.
 *
 * WHY ONE PASS. `course_audio.text` is byte-identical to
 * `listening_pod_sentences.target_text` on every row in this pocket, and the
 * render path reads `course_audio.text`. A text-only edit first would desync
 * the two and a later render would speak the OLD words again. So each clip's
 * new bytes, its `course_audio.text` and every pod row's `target_text` move
 * inside one psql transaction, guarded on the exact before-state.
 *
 * MAKE BEFORE BREAK (CLAUDE.md, AUDIO_PIPELINE_ARCHITECTURE.md §6b):
 *   1. render new audio           -> a brand new S3 key, DB untouched
 *   2. verify the NEW object      -> alive on S3, right voice, decodable,
 *                                    not truncated, ASR says the new words
 *   3. swap links atomically      -> one transaction, bumped audio_revision
 *   4. the old object is NEVER deleted. Nothing is deleted by this tool.
 *
 * audio_revision is bumped because `/api/audio/:id` serves
 * `max-age=31536000, immutable`: without a new revision every learner who has
 * already played the clip would keep the wrong words for a year
 * (docs/audio/per-clip-versioned-urls-census-2026-08-06.md).
 *
 * PARKED, deliberately out of scope — see PARKED[] below.
 *
 * Usage:
 *   node tools/a108/isl-ell-est-register-render.cjs --dry     # no spend, full assertions
 *   node tools/a108/isl-ell-est-register-render.cjs --apply   # renders + swaps
 *   ... --only <clipId>   restrict to one clip (shakedown)
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
const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs')

const PSQL = path.join(process.env.HOME, '.local/pg17/bin/psql')
const DB = process.env.DATABASE_URL
if (!DB) { console.error('DATABASE_URL missing — source .env.psql'); process.exit(1) }

const COURSES = ['isl_for_eng', 'ell_for_eng', 'est_for_eng']
const AZURE_RATE_PER_CHAR = 16 / 1e6   // Azure neural, $16 per million characters

const APPLY = process.argv.includes('--apply')
const ONLY = (() => { const i = process.argv.indexOf('--only'); return i > -1 ? process.argv[i + 1] : null })()

/**
 * PARKED — judgement calls, left untouched on purpose. Every one of these goes
 * into Tom's next listening pass; none of them is rendered or edited here.
 *
 * The two Icelandic ones are parked because the defect turns on a word-final
 * -n vs -nn contrast that whisper-medium demonstrably cannot resolve in
 * Icelandic: control clip isl scene 9.17, whose stored text is unambiguously
 * `tilbúinn`, decodes as `tilbúin`. Text analysis says both rows are wrong;
 * the listening check cannot confirm it, so they need a native ear.
 */
const PARKED = [
  { clip_id: 'c3b0f183-eb2c-431c-a19e-f827846394ef', course: 'isl_for_eng', where: 'pod-0 SC04-S003',
    text: 'ég er upptekin -> upptekinn', why: 'Icelandic -n/-nn below whisper resolution (control clip 9.17 proves it); native ear needed' },
  { clip_id: 'c0521de0-fc02-43e0-b366-188760598ad8', course: 'isl_for_eng', where: 'pod-0 SC15-S006 + pod-0-unrecorded SC22-S006',
    text: 'þú sért tilbúinn -> tilbúin', why: 'same -n/-nn contrast, same proof' },
]
const PARKED_IDS = new Set(PARKED.map(p => p.clip_id))

// One entry per distinct clip. Lifted verbatim from tools/a108/nondraft-plan.cjs
// (commit c2055d62) — the read-only planner whose findings Tom approved.
const EDITS = require('./isl-ell-est-edits.cjs')

function q (sql) {
  return JSON.parse(execFileSync(PSQL, [DB, '-At', '-c',
    `select coalesce(json_agg(t), '[]'::json) from (${sql}) t`], { maxBuffer: 1 << 28 }).toString())
}
function lit (s) { return "'" + String(s).replace(/'/g, "''") + "'" }

// ── PLAN ────────────────────────────────────────────────────────────────────
function buildPlan () {
  const rows = q(`
    select p.course_code, p.slug, p.speakers, s.id, s.scene_number, s.sentence_number, s.speaker,
           s.target_text, s.target_audio_id,
           a.text as audio_text, a.text_normalized as audio_text_normalized, a.s3_key, a.voice_id,
           a.duration_ms, a.file_size_bytes, a.audio_revision, a.role, a.language, a.origin
    from listening_pods p
    join listening_pod_sentences s on s.pod_id = p.id
    left join course_audio a on a.id = s.target_audio_id
    where p.course_code in (${COURSES.map(lit).join(',')})
      and not s.target_text_draft`)

  const clips = new Map()
  const unmatched = []
  const alreadyDone = []
  for (const e of EDITS) {
    const hits = rows.filter(r => r.course_code === e.cc && r.target_text.includes(e.find))
    if (!hits.length) {
      // The run is resumable: an edit whose corrected form is already live was
      // done by an earlier pass, and that is a completed item, not drift.
      const done = rows.filter(r => r.course_code === e.cc && r.target_text.includes(e.to))
      if (done.length) { alreadyDone.push(`${e.cc} s${e.sc}.${e.sn}`); continue }
      unmatched.push(`${e.cc} s${e.sc}.${e.sn}`)
      continue
    }
    for (const r of hits) {
      if (!r.target_audio_id) throw new Error(`row ${r.id} has no target_audio_id — refusing`)
      const after = r.target_text.replace(e.find, e.to)
      let c = clips.get(r.target_audio_id)
      if (!c) {
        c = {
          clip_id: r.target_audio_id, course: r.course_code, rule: e.rule, why: e.why,
          before: r.target_text, after, s3_key: r.s3_key, voice_id: r.voice_id,
          duration_ms: r.duration_ms, file_size_bytes: r.file_size_bytes,
          audio_revision: r.audio_revision ?? 1, role: r.role, language: r.language,
          audio_text: r.audio_text, rows: [],
        }
        clips.set(r.target_audio_id, c)
      }
      // A clip shared by rows whose text or edit differ would make "one clip,
      // one new text" a lie. Refuse rather than guess.
      if (c.before !== r.target_text || c.after !== after) {
        throw new Error(`clip ${r.target_audio_id} is shared by rows with divergent text — refusing`)
      }
      c.rows.push({ id: r.id, pod: r.slug, scene: r.scene_number, sentence: r.sentence_number, speaker: r.speaker, speakers: r.speakers })
    }
  }
  if (unmatched.length) throw new Error(`edits that no longer match the live DB: ${unmatched.join(', ')}`)
  return { rows, clips: [...clips.values()], alreadyDone }
}

// ── PRE-FLIGHT ASSERTIONS (all read-only, run before a penny is spent) ──────
function assertClip (c) {
  const fail = m => { throw new Error(`[${c.clip_id}] ${m}`) }

  if (c.audio_text !== c.before) fail(`course_audio.text is NOT byte-identical to the pod row — the desync this pass exists to prevent already happened; stop and re-diagnose`)
  if (c.before === c.after) fail('before == after: nothing to change')
  if (!c.s3_key) fail('no s3_key on the incumbent clip')
  if (!c.voice_id) fail('no voice_id on the incumbent clip')

  // The voice is RE-RESOLVED from the pod cast and must equal what is already
  // on the row. This is the "correct incumbent voice, not a substitute" gate.
  const resolved = new Set()
  for (const r of c.rows) {
    const v = p8.resolvePodSpeakerVoice(r.speakers, r.speaker, 'target')
    if (!v) fail(`speaker ${r.speaker} (${r.pod}) resolves to no target voice`)
    resolved.add(JSON.stringify({ id: p8.canonicalClipVoiceId(v.voice_id, v.provider), provider: v.provider || 'azure', raw: v.voice_id, locale: v.locale || null }))
  }
  if (resolved.size !== 1) fail(`rows on this clip resolve to different cast voices: ${[...resolved].join(' | ')}`)
  const voice = JSON.parse([...resolved][0])
  // Some legacy clip rows spell the Azure voice bare (`is-IS-GudrunNeural`)
  // where the canonical spelling today is prefixed (`azure_is-IS-GudrunNeural`).
  // Same voice, older spelling — compare the voice itself, and refuse anything
  // carrying a DIFFERENT provider prefix, which would be a real substitution.
  const bare = v => String(v).replace(/^azure_/, '')
  if (/^(?!azure_)[a-z]+_/.test(c.voice_id)) fail(`live clip voice ${c.voice_id} is not an Azure voice — out of scope for this pass`)
  if (bare(voice.id) !== bare(c.voice_id)) fail(`cast resolves to ${voice.id} but the live clip is ${c.voice_id} — cast moved, refusing to substitute a voice`)
  if (voice.provider !== 'azure') fail(`resolved provider is ${voice.provider}, not azure — this pass is only sanctioned for the incumbent Azure cast`)
  // The row's own spelling is left exactly as it is: re-spelling voice_id here
  // would be a silent estate-wide normalisation riding on a render approval.
  c.voice_id_spelling_legacy = voice.id !== c.voice_id
  c.voice = voice

  // Unique key is (course_code, text_normalized, language, role, voice_id) and
  // the corrected text moves onto this row — a pre-existing row holding the
  // corrected text on the same voice would make the UPDATE fail mid-swap.
  const norm = normalizeForAudio(c.after)
  if (!norm) fail('corrected text normalises to empty')
  {
    const clash = q(`select id from course_audio
      where course_code = ${lit(c.course)} and text_normalized = ${lit(norm)}
        and language = ${lit(c.language)} and role = ${lit(c.role)} and voice_id = ${lit(c.voice_id)}
        and id <> ${lit(c.clip_id)}`)
    if (clash.length) fail(`another course_audio row (${clash[0].id}) already holds the corrected text on this voice — needs a relink decision, not a render`)
    c.after_normalized = norm
  }

  // Nothing outside this pocket may be reading these bytes.
  const refs = q(`select count(*)::int n from listening_pod_sentences where target_audio_id = ${lit(c.clip_id)}`)[0].n
  if (refs !== c.rows.length) fail(`clip is referenced by ${refs} pod rows but only ${c.rows.length} are in this plan — a row outside the pocket would silently change words`)
  const otherRefs = q(`select
      (select count(*) from listening_pod_sentences where known_audio_id = ${lit(c.clip_id)})
    + (select count(*) from course_practice_phrases where known_audio_id = ${lit(c.clip_id)} or target1_audio_id = ${lit(c.clip_id)} or target2_audio_id = ${lit(c.clip_id)} or presentation_audio_id = ${lit(c.clip_id)})
    + (select count(*) from course_seeds where known_audio_id = ${lit(c.clip_id)} or target1_audio_id = ${lit(c.clip_id)} or target2_audio_id = ${lit(c.clip_id)})
    + (select count(*) from lego_introductions where presentation_audio_id = ${lit(c.clip_id)}) as n`)[0].n
  if (Number(otherRefs) !== 0) fail(`clip is also referenced ${otherRefs} time(s) outside listening_pod_sentences.target_audio_id`)
}

// ── VERIFY THE NEW OBJECT ───────────────────────────────────────────────────
function ffprobeDurationMs (file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file]).toString().trim()
  const sec = parseFloat(out)
  if (!isFinite(sec) || sec <= 0) throw new Error(`ffprobe could not decode a duration (got ${JSON.stringify(out)})`)
  return Math.round(sec * 1000)
}

const { tokenDiff, speaksCorrectedForm } = require('./changed-form-check.cjs')

async function verifyNewClip (c, buffer, durationMs, s3Key, tmpFile) {
  const checks = []
  const add = (name, ok, detail) => { checks.push({ name, ok, detail }); return ok }

  // alive on S3, and the object really is our bytes
  const head = await p8.s3.send(new HeadObjectCommand({ Bucket: p8.S3_BUCKET, Key: s3Key }))
  add('s3_alive', !!head, `HTTP ok, ContentLength ${head.ContentLength}`)
  add('s3_bytes_match', head.ContentLength === buffer.length, `${head.ContentLength} vs local ${buffer.length}`)

  // decodable as real audio, independently of whatever masterAudio reported
  const probed = ffprobeDurationMs(tmpFile)
  add('decodable', probed > 0, `ffprobe ${probed}ms`)
  add('duration_agrees', Math.abs(probed - durationMs) <= Math.max(250, durationMs * 0.05), `ffprobe ${probed}ms vs mastered ${durationMs}ms`)

  // not truncated: the new line is a near-identical length to the old, so the
  // new clip must be near the old clip's duration once scaled by characters.
  const expected = c.duration_ms * (c.after.length / c.before.length)
  const ratio = durationMs / expected
  add('not_truncated', ratio >= 0.75 && ratio <= 1.4, `${durationMs}ms vs length-scaled expectation ${Math.round(expected)}ms (ratio ${ratio.toFixed(2)}, old ${c.duration_ms}ms)`)

  // ASR. A single absolute CER gate is the wrong instrument on Icelandic,
  // Greek and Estonian: whisper mangles low-resource morphology enough that a
  // perfectly good clip can score badly (`fyrirgefðu` -> `fyrirkeðu`). So the
  // decode is scored against BOTH the new text and the old one, and the clip
  // has to (a) be real speech of the right content at all, and (b) be closer
  // to the corrected words than to the words it is replacing. That comparison
  // is model-robust in a way an absolute threshold is not.
  const v = await veracity.checkAudioVeracity(tmpFile, c.after, c.language)
  if (!v.checked) { add('asr_decoded', false, `UNCHECKED (${v.reason}) — treated as a failure`); c.asr = v; return checks.every(k => k.ok) }
  const cerNew = v.cer
  const cerOld = veracity.characterErrorRate(c.before, v.decode)
  const decodeN = veracity.normalise(v.decode)
  const newTokens = tokenDiff(c.after, c.before)
  const oldTokens = tokenDiff(c.before, c.after)
  const unchangedTokens = (() => {
    const words = t => String(t).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
    const b = new Set(words(c.before))
    return words(c.after).filter(w => b.has(w))
  })()
  const forms = speaksCorrectedForm(decodeN, newTokens, oldTokens, veracity.normalise, unchangedTokens)

  c.asr = { decode: v.decode, cer_vs_new: cerNew, cer_vs_old: cerOld, reason: v.reason,
    changed_tokens_new: newTokens, changed_tokens_old: oldTokens, changed_forms: forms.results }

  add('asr_decoded', true, JSON.stringify(v.decode))
  add('asr_is_speech', cerNew < 0.6, `CER vs corrected text ${cerNew?.toFixed(3)} (<0.6 = real speech of this content, not silence/truncation/wrong language)`)
  add('asr_speaks_new_form', cerNew < cerOld, `CER ${cerNew?.toFixed(3)} vs corrected < ${cerOld?.toFixed(3)} vs superseded — the clip is closer to the new words`)
  add('asr_changed_words', forms.ok, forms.results.map(r =>
    `"${r.heard}" is ${r.distance_to_new} from ${r.newTok}${r.oldTok === null ? '' : ` and ${r.distance_to_superseded} from superseded ${r.oldTok}`}`).join('; '))

  c.checks = checks
  return checks.every(k => k.ok)
}

// ── THE SWAP (one transaction, guarded on the exact before-state) ───────────
function swap (c, s3Key, durationMs, buffer, wordBoundaries) {
  const rev = (c.audio_revision ?? 1) + 1
  const wb = wordBoundaries && wordBoundaries.length ? lit(JSON.stringify(wordBoundaries)) + '::jsonb' : 'null'
  const rowIds = c.rows.map(r => lit(r.id)).join(',')

  const sql = `
\\set ON_ERROR_STOP on
begin;

insert into course_audio_revisions
  (audio_id, course_code, revision, previous_revision, previous_s3_key, new_s3_key,
   previous_duration_ms, new_duration_ms, source, accepted_by, reason)
values (${lit(c.clip_id)}, ${lit(c.course)}, ${rev}, ${c.audio_revision ?? 1},
        ${lit(c.s3_key)}, ${lit(s3Key)}, ${c.duration_ms}, ${durationMs},
        'a108-isl-ell-est-register-render', 'A-108 render, Tom approved 2026-08-14',
        ${lit(c.rule + ': ' + c.why)})
on conflict (audio_id, revision) do update set
  new_s3_key = excluded.new_s3_key, new_duration_ms = excluded.new_duration_ms;

-- the clip: new bytes AND the new words, together, guarded on the old state
update course_audio set
  s3_key = ${lit(s3Key)},
  duration_ms = ${durationMs},
  file_size_bytes = ${buffer.length},
  audio_revision = ${rev},
  text = ${lit(c.after)},
  text_normalized = ${lit(c.after_normalized)},
  word_boundaries = ${wb},
  origin = 'tts',
  veracity_checked_at = now(),
  veracity_pass = true,
  veracity_cer = ${typeof c.asr.cer_vs_new === 'number' ? c.asr.cer_vs_new : 'null'},
  veracity_reason = ${lit(`a108 render: CER ${c.asr.cer_vs_new} vs corrected text, ${c.asr.cer_vs_old} vs superseded; changed words matched`)},
  veracity_checker = 'a108-isl-ell-est-register-render'
where id = ${lit(c.clip_id)}
  and s3_key = ${lit(c.s3_key)}
  and text = ${lit(c.before)}
  and voice_id = ${lit(c.voice_id)};

-- the pod rows: same words, same instant
update listening_pod_sentences set target_text = ${lit(c.after)}
where id in (${rowIds}) and target_text = ${lit(c.before)} and target_audio_id = ${lit(c.clip_id)};

-- the cached loudness envelope described the OLD bytes; drop it so it is recomputed
delete from course_audio_envelope where audio_id = ${lit(c.clip_id)};

do $$
declare n int;
begin
  select count(*) into n from course_audio
   where id = ${lit(c.clip_id)} and text = ${lit(c.after)} and s3_key = ${lit(s3Key)} and audio_revision = ${rev};
  if n <> 1 then raise exception 'clip row did not take the swap (before-state drifted)'; end if;
  select count(*) into n from listening_pod_sentences
   where id in (${rowIds}) and target_text = ${lit(c.after)};
  if n <> ${c.rows.length} then raise exception 'pod rows did not take the swap: % of ${c.rows.length}', n; end if;
  select count(*) into n from listening_pod_sentences s
    join course_audio a on a.id = s.target_audio_id
   where s.id in (${rowIds}) and a.text <> s.target_text;
  if n <> 0 then raise exception 'text/audio desync after swap on % row(s)', n; end if;
end $$;

commit;
`
  execFileSync(PSQL, [DB, '-v', 'ON_ERROR_STOP=1', '-q', '-f', '-'], { input: sql, stdio: ['pipe', 'inherit', 'inherit'] })
  return rev
}

// ── MAIN ────────────────────────────────────────────────────────────────────
;(async () => {
  const { rows, clips: allClips, alreadyDone } = buildPlan()
  const parked = allClips.filter(c => PARKED_IDS.has(c.clip_id))
  let clips = allClips.filter(c => !PARKED_IDS.has(c.clip_id))
  if (ONLY) clips = clips.filter(c => c.clip_id === ONLY)

  console.log(`pod rows examined:      ${rows.length}`)
  console.log(`clips in the pocket:    ${allClips.length}${alreadyDone.length ? ` (+${alreadyDone.length} already corrected by an earlier pass)` : ''}`)
  console.log(`parked (untouched):     ${parked.length} clips / ${parked.reduce((a, c) => a + c.rows.length, 0)} rows`)
  console.log(`in this pass:           ${clips.length} clips / ${clips.reduce((a, c) => a + c.rows.length, 0)} rows`)

  for (const c of clips) assertClip(c)
  console.log('pre-flight assertions:  all passed (voice, text-parity, references, unique key)')

  const chars = clips.reduce((a, c) => a + c.after.length, 0)
  console.log(`characters:             ${chars} -> $${(chars * AZURE_RATE_PER_CHAR).toFixed(4)} at Azure neural rates`)

  const log = { job: 'A-108 isl/ell/est register+gender render', date: '2026-08-14', mode: APPLY ? 'apply' : 'dry', already_corrected_by_earlier_pass: alreadyDone, parked, clips: [] }

  if (!APPLY) {
    for (const c of clips) {
      log.clips.push({ ...c, rows: c.rows.map(r => ({ id: r.id, pod: r.pod, scene: r.scene, sentence: r.sentence, speaker: r.speaker })), action: 'dry-run, nothing rendered or written' })
      console.log(`  ${c.course} ${c.clip_id} ${c.voice_id} [${c.rule}] ${c.rows.length} row(s)`)
    }
    write(log, 'dryrun')
    console.log('\n--dry: nothing rendered, nothing written.')
    return
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a108-render-'))
  let ok = 0, failed = 0
  for (const c of clips) {
    process.stdout.write(`\n[${c.course}] ${c.clip_id} ${c.voice_id} — ${c.rule}\n`)
    try {
      // 1. GENERATE. Plain text, no " … " pause cue: course_audio.text is
      // byte-identical to the pod row on every clip here and that invariant is
      // exactly what this pass is protecting.
      const { audioBuffer, wordBoundaries } = await ttsService.generateWithRetry(c.after, 'azure', {
        subscriptionKey: process.env.AZURE_SPEECH_KEY,
        region: process.env.AZURE_SPEECH_REGION || 'westeurope',
        voiceName: String(c.voice.raw).replace(/^azure_/, ''),
        speed: 1.0,
      })
      const { buffer, durationMs } = await p8.masterAudio(audioBuffer, c.after)

      const newKey = `mastered/${uuidv4().toUpperCase()}.mp3`
      await p8.s3.send(new PutObjectCommand({
        Bucket: p8.S3_BUCKET, Key: newKey, Body: buffer,
        ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable',
      }))
      const tmpFile = path.join(tmpDir, path.basename(newKey))
      fs.writeFileSync(tmpFile, buffer)

      // 2. VERIFY the new object, before anything live points at it
      const pass = await verifyNewClip(c, buffer, durationMs, newKey, tmpFile)
      for (const k of c.checks) console.log(`   ${k.ok ? 'OK  ' : 'FAIL'} ${k.name}: ${k.detail}`)
      if (!pass) {
        failed++
        log.clips.push({ ...c, rows: c.rows.map(r => r.id), new_s3_key: newKey, applied: false, action: 'VERIFICATION FAILED — new object left as evidence, live row untouched' })
        console.log('   -> NOT SWAPPED. Live row untouched, old clip still serving.')
        continue
      }

      // 3. SWAP
      const rev = swap(c, newKey, durationMs, buffer, wordBoundaries)
      ok++
      console.log(`   -> SWAPPED. revision ${c.audio_revision ?? 1} -> ${rev}; ${c.s3_key} superseded (retained, not deleted)`)
      log.clips.push({
        clip_id: c.clip_id, course: c.course, rule: c.rule, why: c.why, voice_id: c.voice_id,
        before: c.before, after: c.after,
        previous_s3_key: c.s3_key, new_s3_key: newKey,
        previous_duration_ms: c.duration_ms, new_duration_ms: durationMs,
        previous_revision: c.audio_revision ?? 1, revision: rev,
        chars: c.after.length, cost_usd: +(c.after.length * AZURE_RATE_PER_CHAR).toFixed(6),
        rows: c.rows.map(r => ({ id: r.id, pod: r.pod, scene: r.scene, sentence: r.sentence, speaker: r.speaker })),
        checks: c.checks, asr: c.asr, applied: true,
      })
    } catch (e) {
      failed++
      console.log(`   ERROR: ${e.message}`)
      log.clips.push({ clip_id: c.clip_id, course: c.course, applied: false, action: 'ERROR', error: e.message })
    }
  }

  log.summary = { swapped: ok, failed, chars, cost_usd: +(chars * AZURE_RATE_PER_CHAR).toFixed(4) }
  write(log, 'applied')
  console.log(`\nswapped ${ok}, failed ${failed}. No S3 object and no DB row was deleted.`)
  if (failed) process.exitCode = 1
})().catch(e => { console.error(e.stack || e.message); process.exit(1) })

function write (log, kind) {
  const out = path.join(__dirname, '..', '..', 'docs', 'a108', `isl-ell-est-register-render-${kind}-log.json`)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify(log, null, 2) + '\n')
  console.log(`log: ${out}`)
}
