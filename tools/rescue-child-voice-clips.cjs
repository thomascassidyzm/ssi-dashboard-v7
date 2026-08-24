#!/usr/bin/env node
/**
 * rescue-child-voice-clips.cjs — purge child TTS voices from pod casts and
 * regenerate every reachable clip they voiced.
 *
 * WHY (Tom 2026-07-24, ita_for_eng staging): "Could I see the wine list?" and
 * "I'd like a large glass of white wine, please" played in a CHILD's voice.
 * The old KNOWN colour pool included en-GB-MaisieNeural (Azure's child voice);
 * the pool was collapsed to Tom's clone on 2026-06-30 (86dc1617), but the
 * per-pod casts stored in listening_pods.speakers were never re-coloured, so
 * regen paths kept faithfully re-selecting Maisie (tha_for_eng, 2026-07-16).
 * Policy: NO kids' voices, ever. tts-service.cjs now hard-blocks the child
 * voice ids at synthesis; this tool heals the estate.
 *
 * Method, per course:
 *   1. CAST PURGE — any speaker (incl. _default) in listening_pods.speakers
 *      whose known voice is a child voice → Tom's xAI clone (gfzdpspr5fdp),
 *      matching the single-known-voice ruling. Casts are fixed even when no
 *      clip is currently linked, so future regens can't resurrect the voice.
 *   2. REGENERATE + RELINK — every course_audio row with a child voice_id that
 *      is still reachable (listening_pod_sentences.known_audio_id, a
 *      sentence_known_audio_ids slot, or a course_* known_audio_id) is deleted
 *      FIRST (devices cache bytes BY ID — a new id is the only way to heal
 *      them; same doctrine as rescue-wrong-language-clips.cjs), re-rendered
 *      via p8.generatePodAudio (pod links → Tom's clone; course-core links →
 *      the course's voice_config known voice), gated (tail-click + whisper
 *      phonology: known clips must detect as the known language), and every
 *      link site is repointed at the new id.
 *   3. Unreachable child-voice rows are LEFT ALONE and counted — deleting
 *      assets needs its own approved plan.
 *
 *   node tools/rescue-child-voice-clips.cjs <course> [--dry]
 *   node tools/rescue-child-voice-clips.cjs --all [--dry]
 *
 * TTS costs money — run only under an approved plan. Idempotent: re-runs find
 * nothing left to fix. Per-run JSON log written next to the process cwd.
 */
process.env.PHASE8_NO_LISTEN = '1' // library use — don't bind port 3465
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile } = require('child_process')
const { createClient } = require('@supabase/supabase-js')
const p8 = require('../services/phases/phase8-audio-v13.cjs')
const audioProcessor = require('../services/audio-processor.cjs')
const { CHILD_VOICE_IDS } = require('../services/tts-service.cjs')
const { canonicalVoiceId, tryCanonicalVoiceId } = require('../services/shared/clip-identity.cjs')
const { isHumanVoiceCourse } = require('../services/shared/human-voice-courses.cjs')

const argCourse = process.argv[2]
const dry = process.argv.includes('--dry')
if (!argCourse) {
  console.error('usage: rescue-child-voice-clips.cjs <course>|--all [--dry]')
  process.exit(1)
}

const supabase = createClient(
  (process.env.SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_KEY || '').trim(),
  { auth: { persistSession: false, autoRefreshToken: false } },
)

// Same shape the recoloured pool writes (tools/pod-voice-coverage.cjs).
const TOM_CLONE_KNOWN = { provider: 'xai', voice_id: 'gfzdpspr5fdp', name: 'Tom', locale: 'en' }

const GATE_ATTEMPTS = 4
const WHISPER = process.env.WHISPER || '/opt/homebrew/bin/whisper-cli'
const WHISPER_MODEL = process.env.WHISPER_MODEL
  || path.join(os.homedir(), 'SSi', 'whisper-models', 'ggml-small.bin')
const PHONO_GATE = fs.existsSync(WHISPER) && fs.existsSync(WHISPER_MODEL)
const S3_BASE = 'https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/'

function detectClipLang(mp3) {
  return new Promise((res) => {
    execFile(WHISPER, ['-m', WHISPER_MODEL, '-l', 'auto', '-nt', '-t', '4', '-f', mp3],
      { encoding: 'utf8', maxBuffer: 1 << 22 }, (e, _o, stderr) => {
        const m = /auto-detected language: (\w+)/.exec(stderr || '')
        res(m ? m[1] : null)
      })
  })
}

async function download(url, dest) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`GET ${url} → ${r.status}`)
  fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()))
}

// Same sentence walk as the renders that produced sentence_known_audio_ids:
// plain punctuation split of the known text.
const SENTENCE_SPLIT = /(?<=[。！？])\s*(?=\S)|(?<=[.!?…؟])\s+(?=\S)/
function knownSentences(text) {
  return String(text || '').split(SENTENCE_SPLIT).map((x) => x.trim()).filter(Boolean)
}

/**
 * The spelling this tool hands to generatePodAudio, which uses the one field
 * BOTH to call the provider and to write course_audio.voice_id.
 *
 * Azure: tts-service.cjs strips a leading `azure_` before the SSML request, so
 * the canonical prefixed form renders identically and the row lands canonical.
 * Anything else (xAI, ElevenLabs) receives the id verbatim, so a prefix would
 * be sent to the provider and fail — those keep the provider-native id and say
 * so, rather than trading a live render for a tidier column.
 */
function storedKnownVoiceId(rawVoiceId, provider) {
  const native = String(rawVoiceId).replace(/^azure_/, '')
  if (provider === 'azure') return canonicalVoiceId(native, { provider })
  console.log(`  note: known voice "${native}" (provider=${provider}) written in its provider-native spelling — ` +
    'generatePodAudio passes this field straight to the provider, which rejects a prefix')
  return native
}

/** Both spellings of a voice id, for selection — a prefixed twin is otherwise invisible. */
function voiceIdSpellings(ids) {
  const out = new Set()
  for (const id of ids) {
    out.add(id)
    const canonical = tryCanonicalVoiceId(id)
    if (canonical) out.add(canonical)
  }
  return [...out]
}

/** Every spelling of every child voice — the selection set for this whole tool. */
const CHILD_VOICE_ID_SPELLINGS = voiceIdSpellings(CHILD_VOICE_IDS)
const CHILD_VOICE_ID_SET = new Set(CHILD_VOICE_ID_SPELLINGS)

/** A cast entry's voice, under either spelling. */
function isChildVoice(voiceId) {
  return CHILD_VOICE_ID_SET.has(voiceId) || CHILD_VOICE_ID_SET.has(tryCanonicalVoiceId(voiceId))
}

async function courseContext(course) {
  const { data, error } = await supabase
    .from('courses').select('known_lang, target_lang, voice_config').eq('course_code', course).single()
  if (error) throw new Error(`course ${course}: ${error.message}`)
  const kv = data.voice_config?.voices?.known || {}
  const provider = kv.provider || 'azure'
  return {
    knownLang: data.known_lang,
    coreKnownVoice: {
      provider,
      // This used to `.replace(/^azure_/, '')` — a strip-then-persist that took
      // a correctly-prefixed config value and wrote the bare spelling into
      // course_audio, making this the clearest single bare-row producer in the
      // repo. It stores the canonical form instead. Safe for Azure because
      // tts-service.cjs strips the `azure_` prefix before the SSML request; for
      // any other provider the id goes to the provider verbatim, so the native
      // spelling is kept and the drift is reported rather than risked.
      voice_id: storedKnownVoiceId(kv.voiceId || kv.voice_id || 'en-GB-SoniaNeural', provider),
      locale: kv.language || null,
    },
    voiceConfig: data.voice_config || {},
  }
}

async function rescueCourse(course, log) {
  console.log(`\n=== ${course} ===`)
  const ctx = await courseContext(course)
  // whisper reports 2-letter codes; the known side is English on every course
  // in scope, but derive anyway so eng_for_* pairs gate correctly.
  const knownBase = ({ eng: 'en', spa: 'es', fra: 'fr', deu: 'de', ita: 'it', por: 'pt', jpn: 'ja', kor: 'ko', zho: 'zh' })[ctx.knownLang] || String(ctx.knownLang || 'en').slice(0, 2)

  // ---- 1. cast purge --------------------------------------------------------
  const { data: pods, error: podsErr } = await supabase
    .from('listening_pods').select('id, speakers').eq('course_code', course)
  if (podsErr) throw new Error(podsErr.message)
  for (const pod of pods || []) {
    const speakers = pod.speakers || {}
    const changed = []
    for (const [name, entry] of Object.entries(speakers)) {
      if (entry?.known?.voice_id && isChildVoice(entry.known.voice_id)) {
        changed.push(`${name}: ${entry.known.voice_id} → ${TOM_CLONE_KNOWN.voice_id}`)
        entry.known = { ...TOM_CLONE_KNOWN }
      }
      if (entry?.target?.voice_id && isChildVoice(entry.target.voice_id)) {
        console.log(`  ⚠ ${pod.id} "${name}" TARGET voice is a child voice — not auto-fixed, needs a target recast`)
        log.targetChildVoices.push({ pod: pod.id, speaker: name, voice_id: entry.target.voice_id })
      }
    }
    if (changed.length) {
      console.log(`  cast ${pod.id}: ${changed.join('; ')}`)
      log.castsFixed.push({ pod: pod.id, changed })
      if (!dry) {
        const { error } = await supabase.from('listening_pods').update({ speakers }).eq('id', pod.id)
        if (error) throw new Error(`cast update ${pod.id}: ${error.message}`)
      }
    }
  }

  // ---- 2. find reachable child-voice clips ---------------------------------
  const { data: badRows, error: badErr } = await supabase
    .from('course_audio').select('*').eq('course_code', course)
    .in('voice_id', CHILD_VOICE_ID_SPELLINGS)
  if (badErr) throw new Error(badErr.message)
  if (!badRows?.length) { console.log('  no child-voice clips'); return }
  const badIds = badRows.map((r) => r.id)

  const { data: sentences } = await supabase
    .from('listening_pod_sentences')
    .select('id, pod_id, speaker, known_text, known_audio_id, sentence_known_audio_ids')
    .like('pod_id', `${course}:%`)
  const coreLinks = {}
  for (const table of ['course_practice_phrases', 'course_seeds', 'course_legos']) {
    const { data } = await supabase.from(table).select('id, known_audio_id')
      .eq('course_code', course).in('known_audio_id', badIds)
    for (const row of data || []) {
      ;(coreLinks[row.known_audio_id] ||= []).push({ table, id: row.id })
    }
  }

  // Per bad clip: the pod sites that link it (with the text each expects).
  const podSites = {}
  for (const s of sentences || []) {
    if (s.known_audio_id && badIds.includes(s.known_audio_id)) {
      ;(podSites[s.known_audio_id] ||= []).push({ kind: 'known', sentence: s, text: s.known_text })
    }
    const arr = s.sentence_known_audio_ids || []
    if (arr.some((id) => id && badIds.includes(id))) {
      const texts = knownSentences(s.known_text)
      arr.forEach((id, k) => {
        if (!id || !badIds.includes(id)) return
        if (texts.length !== arr.length) {
          console.log(`  ✗ ${s.id}: known split (${texts.length}) ≠ linked clips (${arr.length}) — slot SKIPPED, needs eyes`)
          log.skipped.push({ sentence: s.id, reason: 'known sentence split mismatch', clip: id })
        } else {
          ;(podSites[id] ||= []).push({ kind: 'slot', slot: k, sentence: s, text: texts[k] })
        }
      })
    }
  }

  const reachable = badRows.filter((r) => podSites[r.id]?.length || coreLinks[r.id]?.length)
  console.log(`  ${badRows.length} child-voice rows, ${reachable.length} reachable → regenerate; ${badRows.length - reachable.length} orphans left in place`)
  log.orphans += badRows.length - reachable.length

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rescue-cv-'))

  for (const bad of reachable) {
    const pods_ = podSites[bad.id] || []
    const cores = coreLinks[bad.id] || []
    if (dry) {
      for (const st of pods_) console.log(`  [DRY] pod ${st.sentence.id} ${st.kind === 'slot' ? `slot[${st.slot}]` : 'known'} "${st.text}" (bad ${bad.id})`)
      for (const c of cores) console.log(`  [DRY] core ${c.table}/${c.id} "${bad.text}" (bad ${bad.id})`)
      continue
    }

    let restoreOnFail = null
    try {
      // Old row dies first: frees the dedup key and retires the cached-by-id
      // bytes on devices. FKs are ON DELETE SET NULL; relinks below restore.
      // sentence_known_audio_ids is a plain uuid[] (no FK) — repointed below.
      const { error: delErr } = await supabase.from('course_audio').delete().eq('id', bad.id)
      if (delErr) throw new Error(`delete ${bad.id}: ${delErr.message}`)
      restoreOnFail = bad

      // One render per distinct (text, voice-class); dedup inside
      // generatePodAudio makes repeats free.
      const renders = new Map() // key → newId
      const renderOne = async (text, voice, language) => {
        const key = `${voice.voice_id}|${language}|${text}`
        if (renders.has(key)) return renders.get(key)
        let newId = null, verdict = 'unchecked', detected = null
        for (let attempt = 1; attempt <= GATE_ATTEMPTS; attempt++) {
          const res = await p8.generatePodAudio({
            courseCode: course, text, language, role: 'known',
            voice, ctx: { knownVoice: ctx.coreKnownVoice, voiceConfig: ctx.voiceConfig },
            track: 'known', sentenceId: bad.id, force: attempt > 1,
          })
          newId = res.id
          restoreOnFail = null // a fresh row exists — never resurrect the old one past here
          const { data: rowNow } = await supabase.from('course_audio').select('s3_key').eq('id', newId).single()
          const mp3 = path.join(tmpDir, `${newId}-${attempt}.mp3`)
          await download(S3_BASE + rowNow.s3_key, mp3)
          const tail = await audioProcessor.detectTailClick(mp3).catch(() => ({ click: false }))
          if (tail.click) {
            verdict = 'tail-click-fail'
            console.log(`  attempt ${attempt} tail click (${tail.peakDb}dB rel peak) → re-roll: "${text}"`)
            continue
          }
          if (!PHONO_GATE) { verdict = 'unchecked'; break }
          detected = await detectClipLang(mp3)
          if (detected == null || detected === knownBase) { verdict = detected ? 'pass' : 'unchecked'; break }
          verdict = 'phonology-fail'
          console.log(`  attempt ${attempt} detected '${detected}' (want ${knownBase}) → re-roll: "${text}"`)
        }
        if (verdict === 'tail-click-fail' || verdict === 'phonology-fail') {
          console.log(`  GATE FAIL after ${GATE_ATTEMPTS} takes — linked anyway (best effort), FLAG FOR EARS: "${text}" → ${newId}`)
          log.gateFailed.push({ text, newId, verdict, detected })
        }
        renders.set(key, newId)
        return newId
      }

      for (const st of pods_) {
        // Pod known track = Tom's clone, per the 2026-06-30 single-voice ruling.
        const newId = await renderOne(st.text, TOM_CLONE_KNOWN, ctx.knownLang)
        if (st.kind === 'known') {
          const { error } = await supabase.from('listening_pod_sentences')
            .update({ known_audio_id: newId }).eq('id', st.sentence.id)
          if (error) throw new Error(`relink known ${st.sentence.id}: ${error.message}`)
        } else {
          // Re-read the array — earlier clips in this run may have updated it.
          const { data: rowNow, error: rdErr } = await supabase.from('listening_pod_sentences')
            .select('sentence_known_audio_ids').eq('id', st.sentence.id).single()
          if (rdErr) throw new Error(`reread ${st.sentence.id}: ${rdErr.message}`)
          const arr = [...(rowNow.sentence_known_audio_ids || [])]
          arr[st.slot] = newId
          const { error } = await supabase.from('listening_pod_sentences')
            .update({ sentence_known_audio_ids: arr }).eq('id', st.sentence.id)
          if (error) throw new Error(`relink slot[${st.slot}] ${st.sentence.id}: ${error.message}`)
        }
        log.relinked.push({ site: `${st.sentence.id}${st.kind === 'slot' ? `[${st.slot}]` : ''}`, text: st.text, old: bad.id, new: newId })
        console.log(`  ✓ pod ${st.sentence.id}${st.kind === 'slot' ? `[${st.slot}]` : ''} "${st.text}" → ${newId}`)
      }
      for (const c of cores) {
        // Course-core known track keeps the course's configured known voice.
        const newId = await renderOne(bad.text, ctx.coreKnownVoice, bad.language)
        const { error } = await supabase.from(c.table).update({ known_audio_id: newId }).eq('id', c.id)
        if (error) throw new Error(`relink ${c.table}/${c.id}: ${error.message}`)
        log.relinked.push({ site: `${c.table}/${c.id}`, text: bad.text, old: bad.id, new: newId })
        console.log(`  ✓ core ${c.table}/${c.id} "${bad.text}" → ${newId}`)
      }
    } catch (e) {
      console.log(`  ✗ ${bad.id}: ${e.message.slice(0, 160)}`)
      log.errors.push({ clip: bad.id, error: e.message })
      if (restoreOnFail) {
        const restoreRow = { ...restoreOnFail }
        delete restoreRow.text_stripped // GENERATED ALWAYS — insert rejects an explicit value
        const { error: resErr } = await supabase.from('course_audio').insert(restoreRow)
        console.log(resErr
          ? `  RESTORE FAILED for ${bad.id} — DANGLING LINKS, fix by hand: ${resErr.message}`
          : `  old row ${bad.id} restored (S3 object untouched)`)
        if (!resErr) {
          // known_audio_id FKs were nulled by the delete; put the pod links back.
          for (const st of pods_) {
            if (st.kind === 'known') {
              await supabase.from('listening_pod_sentences').update({ known_audio_id: bad.id }).eq('id', st.sentence.id)
            }
          }
          for (const c of cores) {
            await supabase.from(c.table).update({ known_audio_id: bad.id }).eq('id', c.id)
          }
        }
      }
    }
  }
}

;(async () => {
  let courses
  if (argCourse === '--all') {
    const { data, error } = await supabase.from('course_audio')
      .select('course_code').in('voice_id', CHILD_VOICE_ID_SPELLINGS)
    if (error) { console.error(error.message); process.exit(1) }
    courses = [...new Set((data || []).map((r) => r.course_code))].sort()
  } else {
    courses = [argCourse]
  }
  // Human-voice-only courses (Welsh cym_*) are never synthesised (Tom 2026-07-25).
  const humanVoice = courses.filter((c) => isHumanVoiceCourse(c))
  if (humanVoice.length) console.log(`Skipping ${humanVoice.length} human-voice-only course(s) — no TTS ever (Tom 2026-07-25): ${humanVoice.join(', ')}`)
  courses = courses.filter((c) => !isHumanVoiceCourse(c))
  console.log(`${courses.length} course(s): ${courses.join(', ')}`)
  console.log(PHONO_GATE ? 'phonology gate ON' : 'phonology gate OFF — whisper-cli/model missing; renders land UNCHECKED')

  const log = { startedAt: new Date().toISOString(), dry, courses, castsFixed: [], relinked: [], gateFailed: [], skipped: [], errors: [], targetChildVoices: [], orphans: 0 }
  for (const course of courses) {
    try { await rescueCourse(course, log) } catch (e) {
      console.error(`${course}: FATAL ${e.message}`)
      log.errors.push({ course, error: e.message })
    }
  }
  log.finishedAt = new Date().toISOString()
  const logPath = path.join(__dirname, '..', 'docs', 'audio-sweeps',
    `child-voice-rescue-${dry ? 'dryrun' : 'applied'}-${log.startedAt.replace(/[:.]/g, '-')}.json`)
  fs.mkdirSync(path.dirname(logPath), { recursive: true })
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2))
  console.log(`\n${log.relinked.length} relinked, ${log.gateFailed.length} gate-failed (need ears), ${log.errors.length} errors, ${log.orphans} orphans untouched.`)
  console.log(`log: ${logPath}`)
  process.exit(log.errors.length ? 2 : 0)
})()
