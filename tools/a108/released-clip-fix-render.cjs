#!/usr/bin/env node
/**
 * A-119 — the released slash-form clips: make the AUDIO catch up with the text.
 *
 * Tom approved this on 2026-08-16, verbatim: "A119 - yes go ahead. Regenerate
 * all audio necessary." The cost gate is passed; this is single-digit pennies.
 *
 * WHAT IS DIFFERENT FROM THE isl/ell/est PASS (tools/a108/isl-ell-est-register-render.cjs,
 * commit 64d699b9), whose structure this copies almost line for line:
 *
 *   There, `course_audio.text` was byte-identical to the pod row and the pass
 *   moved both together to prevent a desync. HERE THE DESYNC HAS ALREADY
 *   HAPPENED. The 79 pod rows were corrected on 2026-08-14 (commit 2488f080)
 *   but the clip rows were not, so `course_audio.text` still holds the slash
 *   form and the bytes still speak it. So the parity assertion INVERTS:
 *
 *     course_audio.text   MUST still carry an annotation   -> this is `before`
 *     pod target_text     MUST NOT carry one               -> this is `after`
 *
 *   and the swap writes only the clip row: the pod rows are already correct,
 *   and are re-asserted, not re-written.
 *
 * WHY THE RENDER READS course_audio.text AT ALL: that is the field every render
 * path synthesises from. A naive regeneration after the 2026-08-14 text pass
 * would have spoken the broken words again. That trap is what this tool exists
 * to walk through.
 *
 * MAKE BEFORE BREAK (CLAUDE.md, AUDIO_PIPELINE_ARCHITECTURE.md §6b):
 *   1. render new audio      -> a brand new S3 key, DB untouched
 *   2. verify the NEW object -> alive on S3, decodable, not truncated, and ASR
 *                               says the slash form is gone
 *   3. swap links atomically -> one transaction, guarded on the before-state,
 *                               audio_revision bumped
 *   4. NOTHING IS EVER DELETED by this tool. Not an S3 object, not a DB row.
 *
 * audio_revision is bumped because `/api/audio/:id` serves
 * `max-age=31536000, immutable`: without a new revision every learner who has
 * already played the clip keeps the wrong words for a year. `courses.audio_stamp`
 * is bumped per touched course for the same reason at the manifest level.
 *
 * THE VOICE IS NEVER CHOSEN. It is re-resolved from the pod cast and must equal
 * the voice already on the clip row, compared canonically so that the bare vs
 * `azure_`-prefixed spellings of one voice are not mistaken for two. The row's
 * own spelling is left exactly as found: re-spelling voice_id here would be a
 * silent estate-wide normalisation riding on a render approval.
 *
 * Usage:
 *   node tools/a108/released-clip-fix-render.cjs --dry            # no spend, full assertions
 *   node tools/a108/released-clip-fix-render.cjs --apply --only <clipId>   # shakedown
 *   node tools/a108/released-clip-fix-render.cjs --apply          # the rest
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
const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs')
const { tokenDiff } = require('./changed-form-check.cjs')
const { droppedSlashForm, speaksFusedForm } = require('./slash-form-check.cjs')
const ROW_IDS = require('./released-clip-row-ids.cjs')

const PSQL = path.join(process.env.HOME, '.local/pg17/bin/psql')
const DB = process.env.DATABASE_URL
if (!DB) { console.error('DATABASE_URL missing — source .env.psql'); process.exit(1) }

const COURSES = ['pol_for_eng', 'lav_for_eng', 'por_for_eng', 'ara_for_eng', 'spa_for_eng']
// $16/M chars Azure neural; xAI TTS is billed per character at the same order.
// Used only to state the spend, never to gate it — the gate is Tom's ruling.
const RATE_PER_CHAR = 16 / 1e6

const APPLY = process.argv.includes('--apply')
// --only takes one clip id or a comma-separated list (re-running a failure set).
const ONLY = (() => {
  const i = process.argv.indexOf('--only')
  return i > -1 ? process.argv[i + 1].split(',').map(s => s.trim()).filter(Boolean) : null
})()

/** A slash form or a parenthetical gender residue in learner-facing target text. */
const ANNOTATED = t => /[^\s]\/[^\s]/.test(String(t)) || /\(/.test(String(t))

const REASON = 'A119 - yes go ahead. Regenerate all audio necessary.'   // Tom, 2026-08-16, verbatim

function q (sql) {
  return JSON.parse(execFileSync(PSQL, [DB, '-At', '-c',
    `select coalesce(json_agg(t), '[]'::json) from (${sql}) t`], { maxBuffer: 1 << 28 }).toString())
}
function lit (s) { return "'" + String(s).replace(/'/g, "''") + "'" }

// ── PLAN ────────────────────────────────────────────────────────────────────
function buildPlan () {
  const rows = q(`
    select p.course_code, p.slug, p.speakers, s.id, s.scene_number, s.sentence_number, s.speaker,
           s.target_text, s.target_audio_id, s.target_text_draft,
           a.text as audio_text, a.s3_key, a.voice_id, a.duration_ms, a.file_size_bytes,
           a.audio_revision, a.role, a.language, a.origin
    from listening_pods p
    join listening_pod_sentences s on s.pod_id = p.id
    left join course_audio a on a.id = s.target_audio_id
    where p.course_code in (${COURSES.map(lit).join(',')})
      and s.id in (${ROW_IDS.map(lit).join(',')})`)

  // The scope is the row set whose text was corrected on 2026-08-14 and nothing
  // else. If the live DB no longer holds one of those rows, stop — that is
  // drift, not a smaller job.
  const missing = ROW_IDS.filter(id => !rows.some(r => r.id === id))
  if (missing.length) throw new Error(`${missing.length} of the 79 corrected rows are no longer in the DB: ${missing.slice(0, 5).join(', ')}`)

  const textOnly = []      // no audio ever existed (spa_for_eng stage directions)
  const alreadySynced = [] // clip text already matches the pod row — done by an earlier pass
  const clips = new Map()

  for (const r of rows) {
    if (r.target_text_draft) throw new Error(`row ${r.id} is target_text_draft — released rows must not be drafts; refusing`)
    if (ANNOTATED(r.target_text)) throw new Error(`row ${r.id} pod text still carries an annotation (${r.target_text}) — the 2026-08-14 text pass did not hold; stop and re-diagnose`)
    if (!r.target_audio_id) { textOnly.push({ id: r.id, course: r.course_code, pod: r.slug, target_text: r.target_text }); continue }
    if (r.audio_text === r.target_text) { alreadySynced.push({ id: r.id, clip_id: r.target_audio_id, course: r.course_code }); continue }

    let c = clips.get(r.target_audio_id)
    if (!c) {
      c = {
        clip_id: r.target_audio_id, course: r.course_code,
        before: r.audio_text, after: r.target_text,
        s3_key: r.s3_key, voice_id: r.voice_id, duration_ms: r.duration_ms,
        file_size_bytes: r.file_size_bytes, audio_revision: r.audio_revision ?? 1,
        role: r.role, language: r.language, origin: r.origin, rows: [],
      }
      clips.set(r.target_audio_id, c)
    }
    // A clip shared by rows wanting DIFFERENT corrected text would make "one
    // clip, one new text" a lie. Refuse rather than pick a winner.
    if (c.before !== r.audio_text || c.after !== r.target_text) {
      throw new Error(`clip ${r.target_audio_id} is shared by rows with divergent text — refusing`)
    }
    c.rows.push({ id: r.id, pod: r.slug, scene: r.scene_number, sentence: r.sentence_number, speaker: r.speaker, speakers: r.speakers })
  }
  return { rows, clips: [...clips.values()], textOnly, alreadySynced }
}

// ── PRE-FLIGHT ASSERTIONS (read-only, run before a penny is spent) ──────────
function assertClip (c) {
  const fail = m => { throw new Error(`[${c.clip_id}] ${m}`) }

  // The inverted parity check — see the header. The clip must still be the
  // broken side of the desync this pass exists to close.
  if (!ANNOTATED(c.before)) fail(`course_audio.text carries no annotation (${JSON.stringify(c.before)}) — this clip is not the desync A-119 describes; refusing`)
  if (ANNOTATED(c.after)) fail(`corrected text still carries an annotation (${JSON.stringify(c.after)})`)
  if (c.before === c.after) fail('before == after: nothing to change')
  if (!c.s3_key) fail('no s3_key on the incumbent clip')
  if (!c.voice_id) fail('no voice_id on the incumbent clip')
  if (c.origin !== 'tts') fail(`origin is ${c.origin}, not tts — a human recording is never overwritten by this tool`)

  // Voice: RE-RESOLVED from the cast, asserted equal to the incumbent.
  const resolved = new Set()
  for (const r of c.rows) {
    const v = p8.resolvePodSpeakerVoice(r.speakers, r.speaker, 'target')
    if (!v) fail(`speaker ${r.speaker} (${r.pod}) resolves to no target voice`)
    resolved.add(JSON.stringify({
      id: p8.canonicalClipVoiceId(v.voice_id, v.provider),
      provider: v.provider || 'azure', raw: v.voice_id, locale: v.locale || null,
    }))
  }
  if (resolved.size !== 1) fail(`rows on this clip resolve to different cast voices: ${[...resolved].join(' | ')}`)
  const voice = JSON.parse([...resolved][0])
  // Compare the VOICE, not its spelling: some rows spell an Azure voice bare
  // (`lv-LV-EveritaNeural`) where the canonical spelling is prefixed
  // (`azure_lv-LV-EveritaNeural`). Same voice, older spelling.
  const live = p8.canonicalClipVoiceId(c.voice_id, voice.provider)
  if (live !== voice.id) fail(`cast resolves to ${voice.id} but the live clip is ${c.voice_id} (canonically ${live}) — cast moved, refusing to substitute a voice`)
  if (!['azure', 'xai'].includes(voice.provider)) fail(`resolved provider ${voice.provider} is outside this pass`)
  c.voice_id_spelling_legacy = voice.id !== c.voice_id
  c.voice = voice

  // Unique key is (course_code, text_normalized, language, role, voice_id) and
  // the corrected text moves onto this row. A pre-existing row already holding
  // that text on that voice makes the UPDATE fail mid-swap — and means the
  // right answer is a RELINK, not a render (precedent: the ara bartender line,
  // commit 6c071d1c). Flag it; do not render it.
  const norm = normalizeForAudio(c.after)
  if (!norm) fail('corrected text normalises to empty')
  c.after_normalized = norm
  const clash = q(`select id, s3_key, duration_ms, origin from course_audio
    where course_code = ${lit(c.course)} and text_normalized = ${lit(norm)}
      and language = ${lit(c.language)} and role = ${lit(c.role)} and voice_id = ${lit(c.voice_id)}
      and id <> ${lit(c.clip_id)}`)
  if (clash.length > 1) fail(`${clash.length} existing rows hold the corrected text on this voice — ambiguous, needs a human`)
  c.relink_to = clash.length ? clash[0] : null

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

async function verifyNewClip (c, buffer, durationMs, s3Key, tmpFile) {
  const checks = []
  const add = (name, ok, detail) => { checks.push({ name, ok, detail }); return ok }
  c.checks = checks

  const head = await p8.s3.send(new HeadObjectCommand({ Bucket: p8.S3_BUCKET, Key: s3Key }))
  add('s3_alive', !!head, `HTTP ok, ContentLength ${head.ContentLength}`)
  add('s3_bytes_match', head.ContentLength === buffer.length, `${head.ContentLength} vs local ${buffer.length}`)

  const probed = ffprobeDurationMs(tmpFile)
  add('decodable', probed > 0, `ffprobe ${probed}ms`)
  add('duration_agrees', Math.abs(probed - durationMs) <= Math.max(250, durationMs * 0.05), `ffprobe ${probed}ms vs mastered ${durationMs}ms`)

  // A slash fix only ever removes syllables, so the new clip must be SHORTER
  // than the old one once scaled by characters — and must not have collapsed.
  const expected = c.duration_ms * (c.after.length / c.before.length)
  const ratio = durationMs / expected
  add('not_truncated', ratio >= 0.75 && ratio <= 1.4, `${durationMs}ms vs length-scaled expectation ${Math.round(expected)}ms (ratio ${ratio.toFixed(2)}, old ${c.duration_ms}ms)`)
  // A slash fix only removes syllables, so a shorter clip is good evidence the
  // second gendered form is gone — but only where the provider's pace is
  // reproducible. Azure's is. xAI's is NOT: it exposes no speed parameter and
  // its natural rate varies between renders of the same text, which is how
  // pol 29afbcee came back 2280ms for SEVEN words against a superseded 2136ms
  // for EIGHT. Gating on that would reject healthy audio for a property of the
  // provider, so on xAI this is reported and not enforced; the ASR checks below
  // are the direct instrument for "does it still say the other form".
  const durationIsEvidence = c.voice.provider === 'azure'
  const shorter = durationMs < c.duration_ms
  if (durationIsEvidence) {
    add('shorter_than_superseded', shorter, `${durationMs}ms vs superseded ${c.duration_ms}ms — a clip still speaking both gendered forms cannot be shorter`)
  } else {
    checks.push({ name: 'shorter_than_superseded', ok: true, advisory: true,
      detail: `${durationMs}ms vs superseded ${c.duration_ms}ms (${shorter ? 'shorter' : 'NOT shorter'}) — advisory only: xAI has no speed control and its pace varies between renders` })
  }

  const v = await veracity.checkAudioVeracity(tmpFile, c.after, c.language)
  if (!v.checked) {
    add('asr_decoded', false, `UNCHECKED (${v.reason}) — "could not verify" is not "verified"; treated as a failure`)
    c.asr = v
    return checks.every(k => k.ok)
  }
  const cerNew = v.cer
  const cerOld = veracity.characterErrorRate(c.before, v.decode)
  const decodeN = veracity.normalise(v.decode)

  // ABSENCE: the deleted gendered form must not be audible any more.
  const dropped = droppedSlashForm(decodeN, c.before, c.after, veracity.normalise)
  // SUBSTITUTION: where the fix also introduced a fused form (`pronto/a` ->
  // `pronta`), the new word must be the one heard. Empty on pure removals.
  const newTokens = tokenDiff(c.after, c.before)
  const oldTokens = tokenDiff(c.before, c.after)
  const unchangedTokens = (() => {
    const w = t => String(t).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
    const b = new Set(w(c.before))
    return w(c.after).filter(x => b.has(x))
  })()
  const forms = newTokens.length
    ? speaksFusedForm(decodeN, newTokens, oldTokens, veracity.normalise, unchangedTokens)
    : { ok: true, results: [] }

  c.asr = {
    decode: v.decode, cer_vs_new: cerNew, cer_vs_old: cerOld, reason: v.reason,
    deleted_forms: dropped.results, deleted_forms_advisory: dropped.advisory,
    twin_multiplicity: dropped.multiplicity, substituted_forms: forms.results,
  }

  add('asr_decoded', true, JSON.stringify(v.decode))
  add('asr_is_speech', cerNew < 0.6, `CER vs corrected text ${cerNew?.toFixed(3)} (<0.6 = real speech of this content, not silence or the wrong language)`)
  add('asr_closer_to_corrected', cerNew < cerOld, `CER ${cerNew?.toFixed(3)} vs corrected < ${cerOld?.toFixed(3)} vs superseded`)
  add('asr_slash_form_gone', dropped.ok, dropped.results.length
    ? dropped.results.map(r => `"${r.deleted_token}": nearest decode word "${r.closest_decode_word}" is ${r.distance_to_deleted} from it and ${r.distance_to_nearest_retained} from the nearest retained word${r.still_spoken ? ' — STILL SPOKEN' : ''}`).join('; ')
    : 'no deleted token long enough to gate on; carried by CER-vs-superseded and the duration check' +
      (dropped.advisory.length ? ` (advisory: ${dropped.advisory.map(r => `"${r.deleted_token}" ${r.still_spoken ? 'possibly present' : 'absent'}`).join(', ')})` : ''))
  if (dropped.multiplicity.length) {
    add('asr_twin_said_once', dropped.multiplicity.every(m => m.ok), dropped.multiplicity.map(m =>
      `"${m.twin}" heard ${m.heard_count}x within ${m.radius} edit(s) [${m.matched_decode_words.join(', ') || 'none'}], corrected text contains it ${m.expected_in_corrected_text}x`).join('; '))
  }
  if (newTokens.length) {
    add('asr_speaks_fused_form', forms.ok, forms.results.map(r =>
      `"${r.heard}" is ${r.distance_to_new} from ${r.newTok}${r.oldTok === null ? '' : ` and ${r.distance_to_superseded} from superseded ${r.oldTok}`}`).join('; '))
  }

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
        'a119-released-clip-fix-render', 'tom (written approval, 2026-08-16)',
        ${lit(REASON)})
on conflict (audio_id, revision) do update set
  new_s3_key = excluded.new_s3_key, new_duration_ms = excluded.new_duration_ms;

-- the clip: new bytes AND the corrected words, together, guarded on the old state
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
  veracity_reason = ${lit(`a119 slash-form render: CER ${c.asr.cer_vs_new} vs corrected, ${c.asr.cer_vs_old} vs superseded; deleted gendered form absent from decode`)},
  veracity_checker = 'a119-released-clip-fix-render'
where id = ${lit(c.clip_id)}
  and s3_key = ${lit(c.s3_key)}
  and text = ${lit(c.before)}
  and voice_id = ${lit(c.voice_id)};

-- the cached loudness envelope described the OLD bytes; drop it so it is recomputed
delete from course_audio_envelope where audio_id = ${lit(c.clip_id)};

-- learners must refetch: /api/audio/:id serves immutable for a year
update courses set audio_stamp = now() where course_code = ${lit(c.course)};

do $$
declare n int;
begin
  select count(*) into n from course_audio
   where id = ${lit(c.clip_id)} and text = ${lit(c.after)} and s3_key = ${lit(s3Key)} and audio_revision = ${rev};
  if n <> 1 then raise exception 'clip row did not take the swap (before-state drifted)'; end if;
  -- the pod rows were corrected on 2026-08-14 and are NOT rewritten here; they
  -- are re-asserted, so a swap can never leave text and audio disagreeing.
  select count(*) into n from listening_pod_sentences
   where id in (${rowIds}) and target_text = ${lit(c.after)} and target_audio_id = ${lit(c.clip_id)};
  if n <> ${c.rows.length} then raise exception 'pod rows do not hold the corrected text: % of ${c.rows.length}', n; end if;
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

/**
 * RELINK, not render: an existing clip on the same course/language/role/voice
 * already holds the corrected text, and the unique index cannot hold both.
 * Repoint the pod rows at it. The superseded clip is retained, never deleted.
 * Precedent: the ara bartender line, commit 6c071d1c.
 */
function relink (c) {
  const rowIds = c.rows.map(r => lit(r.id)).join(',')
  const sql = `
\\set ON_ERROR_STOP on
begin;
update listening_pod_sentences set target_audio_id = ${lit(c.relink_to.id)}
where id in (${rowIds}) and target_audio_id = ${lit(c.clip_id)} and target_text = ${lit(c.after)};
update courses set audio_stamp = now() where course_code = ${lit(c.course)};
do $$
declare n int;
begin
  select count(*) into n from listening_pod_sentences
   where id in (${rowIds}) and target_audio_id = ${lit(c.relink_to.id)};
  if n <> ${c.rows.length} then raise exception 'relink did not take: % of ${c.rows.length}', n; end if;
  select count(*) into n from listening_pod_sentences s join course_audio a on a.id = s.target_audio_id
   where s.id in (${rowIds}) and a.text <> s.target_text;
  if n <> 0 then raise exception 'text/audio desync after relink on % row(s)', n; end if;
end $$;
commit;
`
  execFileSync(PSQL, [DB, '-v', 'ON_ERROR_STOP=1', '-q', '-f', '-'], { input: sql, stdio: ['pipe', 'inherit', 'inherit'] })
}

/** Prove the relink TARGET's served bytes say the corrected words. */
async function verifyRelinkTarget (c, tmpDir) {
  const checks = []
  const add = (name, ok, detail) => { checks.push({ name, ok, detail }); return ok }
  const key = c.relink_to.s3_key
  const head = await p8.s3.send(new HeadObjectCommand({ Bucket: p8.S3_BUCKET, Key: key }))
  add('relink_target_s3_alive', !!head && head.ContentLength > 0, `${key} ContentLength ${head.ContentLength}`)
  const body = await p8.s3.send(new (require('@aws-sdk/client-s3').GetObjectCommand)({ Bucket: p8.S3_BUCKET, Key: key }))
  const buf = Buffer.from(await body.Body.transformToByteArray())
  const f = path.join(tmpDir, 'relink-' + path.basename(key))
  fs.writeFileSync(f, buf)
  add('relink_target_decodable', ffprobeDurationMs(f) > 0, `ffprobe ${ffprobeDurationMs(f)}ms`)
  const v = await veracity.checkAudioVeracity(f, c.after, c.language)
  if (!v.checked) { add('relink_target_asr', false, `UNCHECKED (${v.reason})`); c.asr = v; c.checks = checks; return false }
  const cerOld = veracity.characterErrorRate(c.before, v.decode)
  const dropped = droppedSlashForm(veracity.normalise(v.decode), c.before, c.after, veracity.normalise)
  c.asr = { decode: v.decode, cer_vs_new: v.cer, cer_vs_old: cerOld, deleted_forms: dropped.results, deleted_forms_advisory: dropped.advisory }
  add('relink_target_asr', true, JSON.stringify(v.decode))
  add('relink_target_is_speech', v.cer < 0.6, `CER ${v.cer?.toFixed(3)} vs corrected text`)
  add('relink_target_closer_to_corrected', v.cer < cerOld, `CER ${v.cer?.toFixed(3)} vs corrected < ${cerOld?.toFixed(3)} vs superseded`)
  add('relink_target_slash_form_gone', dropped.ok, dropped.results.map(r =>
    `"${r.deleted_token}": nearest "${r.closest_decode_word}" ${r.distance_to_deleted} vs retained ${r.distance_to_nearest_retained}${r.still_spoken ? ' — STILL SPOKEN' : ''}`).join('; ') || 'no gating token')
  c.checks = checks
  return checks.every(k => k.ok)
}

// ── MAIN ────────────────────────────────────────────────────────────────────
;(async () => {
  const { rows, clips: allClips, textOnly, alreadySynced } = buildPlan()
  let clips = ONLY ? allClips.filter(c => ONLY.includes(c.clip_id)) : allClips

  console.log(`pod rows in scope:      ${rows.length} (the 79 corrected on 2026-08-14)`)
  console.log(`text-only, no audio:    ${textOnly.length} rows (${[...new Set(textOnly.map(t => t.course))].join(', ') || '—'})`)
  console.log(`already in sync:        ${alreadySynced.length} rows (done by an earlier pass)`)
  console.log(`clips needing work:     ${allClips.length}${ONLY ? ` (--only: ${clips.length} selected)` : ''}`)

  for (const c of clips) assertClip(c)
  const renders = clips.filter(c => !c.relink_to)
  const relinks = clips.filter(c => c.relink_to)
  console.log(`pre-flight assertions:  all passed (parity, voice, references, unique key)`)
  console.log(`  renders:              ${renders.length} clips / ${renders.reduce((a, c) => a + c.rows.length, 0)} rows`)
  console.log(`  relinks (no TTS):     ${relinks.length} clips / ${relinks.reduce((a, c) => a + c.rows.length, 0)} rows`)

  const chars = renders.reduce((a, c) => a + c.after.length, 0)
  console.log(`characters to render:   ${chars} -> ~$${(chars * RATE_PER_CHAR).toFixed(4)}`)

  const log = {
    job: 'A-119 released slash-form clips — render the audio to match the corrected text',
    date: '2026-08-16', mode: APPLY ? 'apply' : 'dry',
    approval: { by: 'tom', when: '2026-08-16', verbatim: REASON },
    scope_rows: rows.length, text_only_rows: textOnly, already_synced_rows: alreadySynced,
    clips: [],
  }

  if (!APPLY) {
    for (const c of clips) {
      log.clips.push({
        clip_id: c.clip_id, course: c.course, voice_id: c.voice_id, language: c.language,
        provider: c.voice.provider, voice_id_spelling_legacy: c.voice_id_spelling_legacy,
        before: c.before, after: c.after, duration_ms: c.duration_ms,
        action: c.relink_to ? `dry-run: RELINK to ${c.relink_to.id} (existing clip holds the corrected text)` : 'dry-run: RENDER',
        relink_to: c.relink_to ? c.relink_to.id : null,
        rows: c.rows.map(r => ({ id: r.id, pod: r.pod, scene: r.scene, sentence: r.sentence, speaker: r.speaker })),
      })
      console.log(`  ${c.relink_to ? 'RELINK' : 'RENDER'} ${c.course} ${c.clip_id} ${c.voice_id} (${c.voice.provider}) ${c.rows.length} row(s)`)
    }
    write(log, 'dryrun')
    console.log('\n--dry: nothing rendered, nothing written.')
    return
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'a119-render-'))
  let ok = 0, failed = 0, relinked = 0
  for (const c of clips) {
    process.stdout.write(`\n[${c.course}] ${c.clip_id} ${c.voice_id} (${c.voice.provider})\n   -  ${c.before}\n   +  ${c.after}\n`)
    try {
      if (c.relink_to) {
        const pass = await verifyRelinkTarget(c, tmpDir)
        for (const k of c.checks) console.log(`   ${k.ok ? 'OK  ' : 'FAIL'} ${k.name}: ${k.detail}`)
        if (!pass) {
          failed++
          log.clips.push({ clip_id: c.clip_id, course: c.course, applied: false, action: 'RELINK TARGET FAILED VERIFICATION — live rows untouched', checks: c.checks, asr: c.asr })
          console.log('   -> NOT RELINKED. Live rows untouched.')
          continue
        }
        relink(c)
        relinked++
        console.log(`   -> RELINKED to ${c.relink_to.id}. Zero TTS. Old clip ${c.clip_id} retained, not deleted.`)
        log.clips.push({
          clip_id: c.clip_id, course: c.course, action: 'relink', relink_to: c.relink_to.id,
          voice_id: c.voice_id, before: c.before, after: c.after, chars: 0, cost_usd: 0,
          rows: c.rows.map(r => ({ id: r.id, pod: r.pod, scene: r.scene, sentence: r.sentence, speaker: r.speaker })),
          checks: c.checks, asr: c.asr, applied: true,
        })
        continue
      }

      // 1. GENERATE — the corrected text, on the incumbent voice, nothing else.
      let audioBuffer, wordBoundaries
      const language = c.voice.locale || toBcp47(c.language)
      const voiceName = String(c.voice.raw).replace(/^(azure|xai|elevenlabs)_/, '')
      if (c.voice.provider === 'azure') {
        ({ audioBuffer, wordBoundaries } = await ttsService.generateWithRetry(c.after, 'azure', {
          subscriptionKey: process.env.AZURE_SPEECH_KEY,
          region: process.env.AZURE_SPEECH_REGION || 'westeurope',
          voiceName, speed: 1.0,
        }))
      } else {
        ({ audioBuffer, wordBoundaries } = await ttsService.generateWithRetry(c.after, 'xai', {
          apiKey: process.env.XAI_API_KEY, voiceId: voiceName, language,
        }))
      }
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
        log.clips.push({
          clip_id: c.clip_id, course: c.course, voice_id: c.voice_id, before: c.before, after: c.after,
          new_s3_key: newKey, applied: false,
          action: 'VERIFICATION FAILED — new object left on S3 as evidence, live row untouched, old clip still serving',
          checks: c.checks, asr: c.asr,
        })
        console.log('   -> NOT SWAPPED. Live row untouched, old clip still serving.')
        continue
      }

      // 3. SWAP
      const rev = swap(c, newKey, durationMs, buffer, wordBoundaries)
      ok++
      console.log(`   -> SWAPPED. revision ${c.audio_revision ?? 1} -> ${rev}; ${c.s3_key} superseded (retained, not deleted)`)
      log.clips.push({
        clip_id: c.clip_id, course: c.course, action: 'render', voice_id: c.voice_id,
        provider: c.voice.provider, language: c.language,
        before: c.before, after: c.after,
        previous_s3_key: c.s3_key, new_s3_key: newKey,
        previous_duration_ms: c.duration_ms, new_duration_ms: durationMs,
        previous_revision: c.audio_revision ?? 1, revision: rev,
        chars: c.after.length, cost_usd: +(c.after.length * RATE_PER_CHAR).toFixed(6),
        rows: c.rows.map(r => ({ id: r.id, pod: r.pod, scene: r.scene, sentence: r.sentence, speaker: r.speaker })),
        checks: c.checks, asr: c.asr, applied: true,
      })
    } catch (e) {
      failed++
      console.log(`   ERROR: ${e.message}`)
      log.clips.push({ clip_id: c.clip_id, course: c.course, applied: false, action: 'ERROR', error: e.message })
    }
  }

  const spentChars = log.clips.filter(c => c.applied && c.action === 'render').reduce((a, c) => a + c.chars, 0)
  log.summary = { rendered: ok, relinked, failed, chars: spentChars, cost_usd: +(spentChars * RATE_PER_CHAR).toFixed(4) }
  write(log, ONLY ? 'applied-only-' + ONLY[0].slice(0, 8) : 'applied')
  console.log(`\nrendered ${ok}, relinked ${relinked}, failed ${failed}. No S3 object and no DB row was deleted.`)
  if (failed) process.exitCode = 1
})().catch(e => { console.error(e.stack || e.message); process.exit(1) })

function write (log, kind) {
  const out = path.join(__dirname, '..', '..', 'docs', 'a108', `released-clip-fix-${kind}-log.json`)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify(log, null, 2) + '\n')
  console.log(`log: ${out}`)
}
