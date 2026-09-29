#!/usr/bin/env node
/**
 * ita_for_eng — re-render every Azure clip whose Italian contains "qualcos'"
 * (job #668·I, Kai, 2026-09-28).
 *
 * WHY. Kai listened (page d/f53471b8): every Azure Elsa/Benigno clip of
 * "ha detto qualcos'altro?" says "ha detto altro?" — the voice swallows the
 * elided word when it is written closed up. The fix is the TTS-input-only
 * elision-space hint in services/azure-tts-service.cjs (applyElisionSpaceHint,
 * applied in services/tts-service.cjs generateAzure), so the string Azure
 * receives is "qualcos' altro" while every learner-facing text and every
 * course_audio.text keeps the correct spelling "qualcos'altro". This tool
 * re-renders the clips that were rendered BEFORE that hint existed.
 *
 * HOW. It mirrors phase 8's POST /regenerate-single, clip by clip, in this
 * process (so the hint in THIS checkout is what runs, not the deployed
 * service's copy): the same TTS door (with the clip itself and every same-text
 * same-voice sibling in `replacing`, so the door cannot hand back the old
 * bytes), the same gender reading lookup, the same mastering, the same
 * ALWAYS-checked veracity gate, a fresh S3 object, then swapClipInPlace —
 * same uuid, audio_revision bumped, rollback row written. Nothing is deleted
 * and no link moves: every LEGO, phrase and seed slot that points at the clip
 * hears the new bytes through the same id (A4, A19). The displayed text is
 * never written; the only text write is a RELABEL of a clip whose label lacks
 * the "?" its holders carry (normalises to the same key, so it is a relabel,
 * not a new identity — swapClipInPlace refuses anything else).
 *
 * The text rendered is the HOLDER's text (the LEGO / phrase / seed the clip
 * serves), and the tool refuses to run if the holders of one clip disagree.
 * Seed 376 is excluded (job #660·I is working on it).
 *
 * The spend guard's repeat key ignores apostrophes and punctuation, so a line
 * already rendered its quota of times today is refused; the refusal is logged
 * as a failure and the clip is left for another day (Kai, 2026-09-29: never
 * work around the guard). The veracity gate gets TWO tries per text.
 *
 * Usage:
 *   node tools/course-optimization/ita-qualcosaltro-rerender-2026-09-28.cjs --plan
 *   node tools/course-optimization/ita-qualcosaltro-rerender-2026-09-28.cjs --before   # whisper the live clips, write nothing
 *   node tools/course-optimization/ita-qualcosaltro-rerender-2026-09-28.cjs --apply    # render, gate, swap, whisper the result
 *   options: --only <audio_id[,..]>  --limit N  --out <dir>  (default $CS_SCRATCH/qualcos or ~/ssi-evidence)
 *            --all   re-render every clip, not only those whose live bytes whisper hears WITHOUT
 *                    qualcos' (the default: a February clip that already says the word is left
 *                    alone — re-rendering an identical clip finds nothing, canon A7).
 *   In --apply mode the newest before-*.json in --out is reused for a clip's "before" decode, so
 *   the whisper pass is not paid twice.
 */
const path = require('path')
const fs = require('fs')
const REPO = path.resolve(__dirname, '..', '..')
require(path.join(REPO, 'node_modules', 'dotenv')).config({ path: path.join(REPO, '.env') })
process.env.PHASE8_NO_LISTEN = '1'

const { createClient } = require(path.join(REPO, 'node_modules', '@supabase/supabase-js'))
const { PutObjectCommand, GetObjectCommand, HeadObjectCommand } = require(path.join(REPO, 'node_modules', '@aws-sdk/client-s3'))
const { randomUUID } = require('crypto')
const uuidv4 = () => randomUUID()
const phase8 = require(path.join(REPO, 'services', 'phases', 'phase8-audio-v13.cjs'))
const ttsService = require(path.join(REPO, 'services', 'tts-service.cjs'))
const { applyElisionSpaceHint } = require(path.join(REPO, 'services', 'azure-tts-service.cjs'))
const veracity = require(path.join(REPO, 'services', 'audio-veracity.cjs'))
const voiceConfigService = require(path.join(REPO, 'services', 'voice-config-service.cjs'))
const courseVoiceConfig = require(path.join(REPO, 'services', 'shared', 'course-voice-config.cjs'))
const genderHaiku = require(path.join(REPO, 'services', 'gender-haiku-service.cjs'))
const { swapClipInPlace } = require(path.join(REPO, 'services', 'shared', 'audio-revision-swap.cjs'))
const { AUDIO_CACHE_CONTROL } = require(path.join(REPO, 'services', 'shared', 'audio-cache-control.cjs'))
const { normalizeForAudio, audioKeyCandidates } = require(path.join(REPO, 'services', 'shared', 'text-normalize.cjs'))
const { evidencePath } = require(path.join(REPO, 'tools', 'lib', 'evidence-path.cjs'))

const COURSE = 'ita_for_eng'
const LANG = 'ita'
const JOB = '#668·I'
const SKIP_SEEDS = new Set([376])
const SOURCE = 'ita-qualcosaltro-rerender-2026-09-28'

const args = process.argv.slice(2)
const flag = f => args.includes(f)
const opt = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d }
const MODE = flag('--apply') ? 'apply' : flag('--before') ? 'before' : 'plan'
const ONLY = opt('--only') ? new Set(opt('--only').split(',')) : null
const LIMIT = Number(opt('--limit', 0)) || 0
const OUT = opt('--out') || (process.env.CS_SCRATCH ? path.join(process.env.CS_SCRATCH, 'qualcos') : evidencePath(`tools/course-optimization/${SOURCE}`))
fs.mkdirSync(path.join(OUT, 'before'), { recursive: true })
fs.mkdirSync(path.join(OUT, 'after'), { recursive: true })

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
const s3 = phase8.s3
const S3_BUCKET = phase8.S3_BUCKET
const log = (...a) => console.log(...a)

/** Free probe of the Azure key: the voices list endpoint, no synthesis, no ledger row. */
async function azureKeyState() {
  const region = process.env.AZURE_SPEECH_REGION || 'westeurope'
  try {
    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`, { headers: { 'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY || '' } })
    return { ok: res.status === 200, status: res.status, region }
  } catch (e) { return { ok: false, status: `network: ${e.message}`, region } }
}
async function s3Bytes(key) {
  const r = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }))
  const chunks = []
  for await (const c of r.Body) chunks.push(c)
  return Buffer.concat(chunks)
}
async function s3Exists(key) {
  try { await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key })); return true } catch { return false }
}
async function heard(file, expected) {
  const v = await veracity.checkAudioVeracity(file, expected, LANG)
  return { decode: v.decode, cer: v.cer, pass: v.pass, reason: v.reason }
}
const saysQualcos = decode => /qualcos/i.test(String(decode || ''))

/** Every clip of this course whose text carries qualcos', with the holders that point at it. */
async function loadWork() {
  const { data: clips, error } = await supabase.from('course_audio')
    .select('id, course_code, text, text_normalized, language, voice_id, role, s3_key, origin, duration_ms, audio_revision')
    .eq('course_code', COURSE).ilike('text', "%qualcos'%").order('text').order('role')
  if (error) throw error
  const ids = clips.map(c => c.id)
  const holders = []
  for (const [table, idCol] of [['course_legos', 'lego_id'], ['course_practice_phrases', 'id'], ['course_seeds', 'seed_id']]) {
    for (const col of ['target1_audio_id', 'target2_audio_id']) {
      const { data, error: e } = await supabase.from(table).select(`${idCol}, seed_number, target_text, ${col}`)
        .eq('course_code', COURSE).in(col, ids)
      if (e) throw e
      for (const h of data) holders.push({ table, id: h[idCol], seed: h.seed_number, text: h.target_text, slot: col, audio_id: h[col] })
    }
  }
  // Same-text, same-voice siblings anywhere in the estate: the door must not hand these back.
  // Keyed on text_normalized (indexed) — an estate-wide ilike on course_audio times out.
  const keys = [...new Set(clips.flatMap(c => audioKeyCandidates(c.text)))]
  const { data: sibs, error: e2 } = await supabase.from('course_audio').select('id, s3_key, text, voice_id, course_code')
    .in('text_normalized', keys)
  if (e2) throw e2
  const work = []
  for (const c of clips) {
    const mine = holders.filter(h => h.audio_id === c.id)
    const texts = [...new Set(mine.map(h => h.text))]
    const seeds = [...new Set(mine.map(h => h.seed))]
    const bareVoice = String(c.voice_id || '').replace(/^azure_/, '')
    // EVERY same-text sibling, whatever its voice: pickExistingClip only PREFERS the
    // requested voice, so with just the same-voice rows excluded it handed Elsa the
    // Benigno clip of the same line (seen on the first run of this tool). voiceBound
    // below is the belt to this brace.
    const replacing = sibs.filter(s => normalizeForAudio(s.text) === normalizeForAudio(c.text))
      .flatMap(s => [s.id, s.s3_key])
    work.push({ clip: c, holders: mine, texts, seeds, renderText: texts[0] || null, replacing: [...new Set([c.id, c.s3_key, ...replacing])], bareVoice })
  }
  return work
}

function plan(work) {
  const rows = []
  for (const w of work) {
    let status = 'render'
    if (!w.holders.length) status = 'SKIP orphan (no holder points at it)'
    else if (w.texts.length > 1) status = `REFUSE holders disagree: ${JSON.stringify(w.texts)}`
    else if (w.seeds.some(s => SKIP_SEEDS.has(s))) status = `SKIP seed ${[...SKIP_SEEDS].join(',')} (job #660·I)`
    else if (w.clip.origin === 'human') status = 'SKIP human take'
    if (ONLY && !ONLY.has(w.clip.id)) status = 'skip (--only)'
    rows.push({ ...w, status })
  }
  return rows
}

async function main() {
  const work = plan(await loadWork())
  log(`${work.length} clips in ${COURSE} carry qualcos' — mode ${MODE}, out ${OUT}`)
  for (const w of work) log(`  ${w.clip.id}  ${w.bareVoice.padEnd(20)}  rev${w.clip.audio_revision ?? 1}  "${w.clip.text}"${w.renderText && w.renderText !== w.clip.text ? `  → relabel "${w.renderText}"` : ''}  [${w.holders.length} holder${w.holders.length === 1 ? '' : 's'}]  ${w.status}`)
  if (MODE === 'plan') return

  // Azure key pre-check (job #698, 2026-09-29: the key in .env began returning 401 in
  // every region at ~00:40Z). A dead key must be found BEFORE the first reservation,
  // because an accepted reservation whose provider call fails still counts against the
  // repeat allowance. The voices list is free and needs no synthesis.
  const keyState = await azureKeyState()
  if (!keyState.ok) {
    log(`BLOCKED ON KEY: Azure voices list returned ${keyState.status} for region ${keyState.region} — no render attempted, nothing reserved`)
    const results = work.filter(w => w.status === 'render').map(w => ({ id: w.clip.id, text: w.clip.text, status: `blocked-on-key: Azure ${keyState.status}` }))
    fs.writeFileSync(path.join(OUT, `blocked-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`), JSON.stringify(results, null, 2))
    return
  }
  const { data: course } = await supabase.from('courses').select('course_code, voice_config, known_lang, target_lang, voice_pool_key, dialect, known_dialect').eq('course_code', COURSE).single()
  course.voice_config = await voiceConfigService.resolveVoiceConfig({ voiceConfig: course.voice_config, course, courseCode: COURSE })
  const gmap = await genderHaiku.loadGenderMap(COURSE, supabase)

  const priorBefore = new Map()
  const beforeFiles = fs.readdirSync(OUT).filter(f => /^before-.*\.json$/.test(f)).sort()
  if (beforeFiles.length) for (const r of JSON.parse(fs.readFileSync(path.join(OUT, beforeFiles.at(-1)), 'utf8'))) if (r.before) priorBefore.set(r.id, r.before)
  const results = []
  let n = 0
  for (const w of work) {
    if (w.status !== 'render') { results.push({ id: w.clip.id, status: w.status }); continue }
    if (LIMIT && n >= LIMIT) break
    n++
    const c = w.clip
    const role = c.role
    const r = { id: c.id, role, voice: c.voice_id, text: c.text, renderText: w.renderText, holders: w.holders.map(h => `${h.table}:${h.id}:${h.slot}`), revision_before: c.audio_revision ?? 1, s3_before: c.s3_key }
    try {
      // The reading this voice speaks (Elsa = female form) — as the live route does.
      const stored = genderHaiku.storedGenderReading(gmap, w.renderText, LANG, role)
      const textForTTS = stored || w.renderText
      r.textForTTS = textForTTS
      r.azureInput = applyElisionSpaceHint(textForTTS)

      const beforeFile = path.join(OUT, 'before', `${c.id}.mp3`)
      if (!fs.existsSync(beforeFile)) fs.writeFileSync(beforeFile, await s3Bytes(c.s3_key))
      const prior = MODE === 'apply' && priorBefore.get(c.id)
      r.before = prior || await heard(beforeFile, textForTTS)
      r.before.saysQualcos = saysQualcos(r.before.decode)
      log(`\n${c.id} ${w.bareVoice} "${textForTTS}"\n  before: heard "${r.before.decode}" cer=${r.before.cer} qualcos=${r.before.saysQualcos}${prior ? ' (from the before pass)' : ''}`)
      if (MODE === 'before') { results.push(r); continue }
      if (r.before.saysQualcos && !flag('--all')) { r.status = 'left alone: live clip already says qualcos\''; log(`  ${r.status}`); results.push(r); continue }

      const voiceSettings = course.voice_config?.voices?.[role] || {}
      const voiceName = String(voiceSettings.voiceId || course.voice_config?.[role] || '').replace(/^azure_/, '')
      if (voiceName !== w.bareVoice) throw new Error(`course ${role} voice is ${voiceName}, clip is ${w.bareVoice} — refusing to change the voice of a slot`)
      const speed = courseVoiceConfig.renderSpeedFor(course.voice_config, role)
      let doorText = textForTTS
      let attemptNo = 0
      const render = async () => {
        attemptNo++
        const cfg = {
          door: { courseCode: COURSE, replacing: w.replacing, voiceBound: true, job: JOB },
          subscriptionKey: process.env.AZURE_SPEECH_KEY,
          region: process.env.AZURE_SPEECH_REGION || 'westeurope',
          voiceName, speed, regenerationAttempt: attemptNo - 1,
        }
        // Kai, 2026-09-29: never work around the spend guard's repeat cap — a
        // refusal is recorded as "repeat-capped" and the clip is left for another day.
        const out = await ttsService.generateWithRetry(doorText, 'azure', cfg)
        if (out.existingClip) throw new Error(`the door handed back an existing clip ${out.existingClip.id} instead of rendering — replacing list incomplete`)
        const { buffer, durationMs } = await phase8.masterAudio(out.audioBuffer, textForTTS, await voiceConfigService.masteringOptsFor(voiceName))
        return { buffer, durationMs, wordBoundaries: out.wordBoundaries }
      }
      // Two tries per text, no more (Kai, 2026-09-29): a text that fails whisper twice is listed as still failing.
      const gated = await veracity.renderChecked({ render, expectedText: textForTTS, language: LANG, sampler: veracity.ALWAYS_SAMPLER, attempts: 2, logger: console, meta: { courseCode: COURSE, role, voiceId: voiceName, audio_uuid: c.id, originalText: c.text } })
      r.gate = { attempts: gated.attempts, verdict: gated.verdict }
      if (!gated.published) throw new Error(`veracity gate: quarantined after ${gated.attempts} attempts (${gated.verdict?.reason}, CER ${gated.verdict?.cer}, heard ${JSON.stringify(String(gated.verdict?.decode || '').slice(0, 60))})`)
      const afterFile = path.join(OUT, 'after', `${c.id}.mp3`)
      fs.writeFileSync(afterFile, gated.buffer)
      r.after = await heard(afterFile, textForTTS)
      r.after.saysQualcos = saysQualcos(r.after.decode)
      log(`  after:  heard "${r.after.decode}" cer=${r.after.cer} qualcos=${r.after.saysQualcos} (${gated.durationMs} ms, gate ${gated.attempts} attempt${gated.attempts === 1 ? '' : 's'})`)
      if (!r.after.saysQualcos) throw new Error(`new take still does not say qualcos' (heard "${r.after.decode}") — not swapping`)

      const newS3Key = `mastered/${uuidv4().toUpperCase()}.mp3`
      await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: newS3Key, Body: gated.buffer, ContentType: 'audio/mpeg', CacheControl: AUDIO_CACHE_CONTROL }))
      const patch = {
        voice_id: c.voice_id, origin: 'tts', word_boundaries: gated.wordBoundaries || null,
        ...veracity.verdictColumns(gated.verdict, { checker: SOURCE, attempts: gated.attempts }),
      }
      if (w.renderText !== c.text) patch.text = w.renderText   // relabel with the holders' "?", same key
      const swap = await swapClipInPlace({
        supabase, audioId: c.id, newS3Key, durationMs: gated.durationMs, fileSizeBytes: gated.buffer.length,
        patch, source: SOURCE, acceptedBy: `job ${JOB} (Kai, ita_for_eng qualcos'altro re-render)`,
        reason: "Azure swallowed qualcos' — re-rendered with the elision-space hint", verifyObject: s3Exists, logger: console,
      })
      r.s3_after = newS3Key
      r.revision_after = swap?.revision ?? null
      r.status = 'swapped'
      log(`  swapped → ${newS3Key} rev ${r.revision_after}`)
    } catch (e) {
      r.status = `FAILED: ${e.message}`
      log(`  FAILED: ${e.message}`)
      if (/401|Unauthorized|WebSocket upgrade failed|authentication/i.test(e.message)) {
        log('  auth failure from Azure — stopping the run so no further reservation is burned (Kai/Tom, 2026-09-29)')
        results.push(r)
        for (const rest of work.slice(work.indexOf(w) + 1)) if (rest.status === 'render') results.push({ id: rest.clip.id, text: rest.clip.text, status: 'blocked-on-key: run stopped after an Azure auth failure' })
        break
      }
    }
    results.push(r)
  }
  const outFile = path.join(OUT, `${MODE}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`)
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2))
  const counts = {}
  for (const r of results) counts[String(r.status).split(':')[0]] = (counts[String(r.status).split(':')[0]] || 0) + 1
  log(`\n${JSON.stringify(counts)}  → ${outFile}`)
  if (MODE === 'before') log(`before: ${results.filter(r => r.before).length} checked, ${results.filter(r => r.before && !r.before.saysQualcos).length} do NOT say qualcos'`)
  if (MODE === 'apply') log(`after: ${results.filter(r => r.status === 'swapped').length} swapped, ${results.filter(r => /FAILED/.test(r.status)).length} failed`)
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
