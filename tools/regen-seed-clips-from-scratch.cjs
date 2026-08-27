#!/usr/bin/env node
/**
 * regen-seed-clips-from-scratch.cjs — regenerate EVERY clip of a seed range from
 * scratch and move the serving pointer, without destroying the old version.
 *
 * WHY THIS TOOL EXISTS (2026-08-06, deu_for_eng seeds 1-5, founder order).
 * The overnight German repair run produced good clips, wrote them to
 * `repair-candidates/<uuid>.mp3` and advanced `course_audio.audio_revision` on
 * the SAME row id. That is a correct make-before-break swap, and it was still a
 * no-op at the serving layer, for two independent reasons:
 *
 *   1. Popty derives its audio URL BY CONVENTION —
 *      `mastered/${uuid.toUpperCase()}.mp3` (src/composables/useScriptPlayer.js,
 *      src/services/api.js) — so it never reads `s3_key` and never sees an
 *      object that moved to another prefix.
 *   2. The learner app resolves `s3_key` at request time, so a COLD fetch does
 *      pick the new object up — but the row id did not change, and both the
 *      HTTP cache (`max-age=31536000, immutable`) and player-vue's IndexedDB
 *      `AudioCache` (keyed by audio id) hand back the old bytes to any device
 *      that already played the clip. The versioned-ref work that fixes this
 *      lives on an UNMERGED branch of ssi-learning-app.
 *
 * So this tool does not swap bytes under an existing id. For each clip it mints
 * a NEW id, writes the new object to `mastered/<NEWID>.mp3` — the one location
 * every consumer agrees on, convention-derived or s3_key-derived — and repoints
 * the owning column at it. A new id is the only change that reaches all four
 * layers at once: convention URL, s3_key, HTTP cache and IndexedDB.
 *
 * ── Ordering, and why nothing can be lost ───────────────────────────────────
 *   1. render + verify the replacement            (nothing mutated if this fails)
 *   2. upload the new object under a new uuid     (S3 write is harmless alone)
 *   3. tombstone the old row's `text`             (frees the unique key)
 *   4. insert the new course_audio row            (id === the key uuid)
 *   5. repoint the owning column(s)               (course_legos, lego_introductions)
 *   6. ledger the swap into course_audio_revisions
 *   7. verify the new object is fetchable and the links point at it
 *
 * Any failure after step 3 unwinds in reverse, restoring the old row's text.
 *
 * ── What is deliberately NOT done ───────────────────────────────────────────
 * The old course_audio row is NEVER deleted and the old S3 object is NEVER
 * deleted. Founder order 2026-08-06: "if we have built the versioning properly
 * then we can easily see the difference between the new and the old after we've
 * made the new stuff". The old row survives with its text suffixed by
 * TOMBSTONE, so old and new can be A/B compared by id, by key, or through the
 * course_audio_revisions ledger, which records both keys and both durations.
 *
 * This differs from tools/repair-presentation-clips.cjs, which deletes the old
 * row as its last step. That is correct for a repair whose old row is damaged
 * and unreferenced; it is wrong here, where the old clip is the comparison.
 *
 * ── Unconditional regeneration ──────────────────────────────────────────────
 * There is no health gate. repair-presentation-clips.cjs only replaces a clip
 * whose shipped duration is below --ratio of a fresh render. This tool replaces
 * every clip in range regardless, by order: "redo the first 5 SEEDS completely
 * from scratch, without worrying about whether the current clips are good or
 * bad". The fresh render is still VERIFIED (not silent, not near-silent, not
 * truncated, and — when whisper is present — ASR-checked) before it is allowed
 * to become the served clip.
 *
 * ── --targets: the health gate lives OUTSIDE this tool ──────────────────────
 * Seed-range mode rebuilds everything in range, which is right for a founder
 * "redo seeds 1-5" order and wrong for the rest of the stock: pointing it at a
 * whole course would re-render ~47k healthy-and-damaged clips alike. So the
 * selector is a separate, free, whisper-based pass —
 * `tools/audio-word-loss-scan.cjs`, which asks the only question that matters
 * ("is the final word actually there?") on the DEPLOYED bytes — and its output
 * JSON is fed back here with `--targets`. Every clip named is rebuilt; nothing
 * else is touched.
 *
 * In targets mode the owning column is not assumed from a role name. Each id is
 * reverse-looked-up across every holder column in course_legos,
 * course_practice_phrases and lego_introductions, and ALL holders found are
 * repointed. That matters: the damage is not confined to LEGO clips — the clip
 * the founder named on 2026-08-06 ("as often as possible", chopped after "as")
 * is an ENGLISH practice-phrase clip, held by
 * course_practice_phrases.known_audio_id, which the seed-range SLOT map cannot
 * reach. An id nothing points at is skipped, not rebuilt: no consumer plays it.
 *
 * TTS costs money. Run only under an approved plan.
 *
 *   node tools/regen-seed-clips-from-scratch.cjs deu_for_eng --seeds 1-5 --dry
 *   node tools/regen-seed-clips-from-scratch.cjs deu_for_eng --seeds 1-5 --roles known,target1,target2,presentation
 *   node tools/regen-seed-clips-from-scratch.cjs deu_for_eng --seeds 1-1 --legos S0001L01 --roles target1
 *   node tools/regen-seed-clips-from-scratch.cjs deu_for_eng --targets docs/audio-repair-2026-08-06/deu-wordloss-legos.json --dry
 *   node tools/regen-seed-clips-from-scratch.cjs deu_for_eng --targets <file> --limit 20
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile } = require('child_process')
const { v4: uuidv4 } = require('uuid')
const { PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')
const { AUDIO_CACHE_CONTROL } = require('../services/shared/audio-cache-control.cjs')
const { canonicalVoiceId } = require('../services/shared/clip-identity.cjs')
const { createClient } = require('@supabase/supabase-js')
const ttsService = require('../services/tts-service.cjs')
const veracity = require('../services/audio-veracity.cjs')

process.env.PHASE8_NO_LISTEN = '1'
const p8 = require('../services/phases/phase8-audio-v13.cjs')
const { toBcp47 } = require('../services/voice-discovery-service.cjs')

const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null }
const COURSE = process.argv[2]
const TARGETS = arg('--targets')
const SEEDS = arg('--seeds') || '1-5'
const ROLES = (arg('--roles') || 'known,target1,target2,presentation').split(',').map(s => s.trim()).filter(Boolean)
const ONLY_LEGOS = (arg('--legos') || '').split(',').map(s => s.trim()).filter(Boolean)
const LIMIT = Number(arg('--limit') || 0)
// --dry costs NOTHING: it plans the run (which clips, which holders, how many
// TTS characters) without calling TTS at all, so a 1,000-clip plan can be
// priced before it is approved. --dry-render is the older, paid behaviour:
// render and compare fresh-vs-shipped duration, then decline to write.
const DRY_RENDER = process.argv.includes('--dry-render')
const DRY = DRY_RENDER || process.argv.includes('--dry')
const ATTEMPTS = Number(arg('--attempts') || 3)
const OUT = arg('--out') || null
const FFMPEG = process.env.FFMPEG || 'ffmpeg'
const FLOOR_MS = 400
const SILENCE_MEAN_DB = -60
const NEAR_SILENCE_PEAK_DB = Number(process.env.REGEN_NEAR_SILENCE_PEAK_DB || -9)
const TOMBSTONE = ' ::superseded-regen'

/** Which column on which table owns each role, in seed-range mode. */
const SLOT = {
  known: { table: 'course_legos', column: 'known_audio_id' },
  target1: { table: 'course_legos', column: 'target1_audio_id', durationColumn: 'target1_duration_ms' },
  target2: { table: 'course_legos', column: 'target2_audio_id', durationColumn: 'target2_duration_ms' },
  presentation: { table: 'course_legos', column: 'presentation_audio_id' },
}

/**
 * Every column in the schema that can serve a course_audio row. Targets mode
 * repoints ALL of them for a given id rather than guessing one from a role
 * name — a clip is often held in more than one place, and a missed holder is a
 * clip that keeps playing the damaged bytes.
 */
const HOLDERS = [
  { table: 'course_legos', column: 'known_audio_id' },
  { table: 'course_legos', column: 'target1_audio_id', durationColumn: 'target1_duration_ms' },
  { table: 'course_legos', column: 'target2_audio_id', durationColumn: 'target2_duration_ms' },
  { table: 'course_legos', column: 'presentation_audio_id' },
  { table: 'course_practice_phrases', column: 'known_audio_id' },
  { table: 'course_practice_phrases', column: 'target1_audio_id', durationColumn: 'target1_duration_ms' },
  { table: 'course_practice_phrases', column: 'target2_audio_id', durationColumn: 'target2_duration_ms' },
  { table: 'course_practice_phrases', column: 'presentation_audio_id' },
  // lego_introductions carries the authored script; audio_uuid is its legacy
  // pointer and must move with presentation_audio_id or the two disagree.
  { table: 'lego_introductions', column: 'presentation_audio_id', durationColumn: 'duration_ms', alsoSet: { audio_uuid: true } },
]

if (require.main === module && (!COURSE || (!TARGETS && !/^\d+-\d+$/.test(SEEDS)))) {
  console.error('usage: regen-seed-clips-from-scratch.cjs <course> (--seeds <a-b> | --targets <wordloss.json>) [--roles ...] [--legos S0001L01,...] [--limit N] [--dry]')
  process.exit(1)
}
const [SEED_FROM, SEED_TO] = TARGETS ? [0, 0] : SEEDS.split('-').map(Number)

/**
 * Read a word-loss scan output (or any JSON naming clip ids) into a plain id
 * list, preserving file order — the scan already emits LEGOs before cycles,
 * which is the founder's repair ordering and must not be re-sorted away.
 */
function readTargetIds (file) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
  const arr = Array.isArray(raw) ? raw : (raw.items || raw.results || [])
  if (!Array.isArray(arr)) throw new Error(`${file}: no items[] array to read`)
  const ids = []
  const seen = new Set()
  for (const it of arr) {
    // A results[] array carries healthy clips too; only truncated ones qualify.
    if (it && typeof it === 'object' && it.truncated === false) continue
    const id = typeof it === 'string' ? it : (it && (it.audioId || it.id))
    if (!id || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

/** Reverse-look-up every holder of every id, in chunks PostgREST will accept. */
async function resolveHolders (supabase, ids) {
  const byId = new Map(ids.map(id => [id, []]))
  for (const h of HOLDERS) {
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200)
      const { data, error } = await supabase.from(h.table).select(`id, ${h.column}`).in(h.column, chunk)
      if (error) throw new Error(`resolve ${h.table}.${h.column}: ${error.message}`)
      for (const row of data || []) {
        byId.get(row[h.column]).push({ ...h, rowId: row.id })
      }
    }
  }
  return byId
}

const supabase = createClient(
  (process.env.SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_KEY || '').trim(),
  { auth: { persistSession: false, autoRefreshToken: false } },
)

function measureLevel (file) {
  return new Promise(resolve => {
    execFile(FFMPEG, ['-hide_banner', '-nostats', '-i', file, '-af', 'volumedetect', '-f', 'null', '-'],
      { encoding: 'utf8', maxBuffer: 1 << 22 }, (_e, _o, stderr) => {
        const mean = /mean_volume:\s*(-?[\d.]+) dB/.exec(stderr || '')
        const peak = /max_volume:\s*(-?[\d.]+) dB/.exec(stderr || '')
        resolve(mean && peak ? { meanDb: parseFloat(mean[1]), peakDb: parseFloat(peak[1]) } : null)
      })
  })
}

/**
 * Prefix-aware, Cartesia-safe. Delegating this wholesale to canonicalVoiceId was
 * tried and reverted — see the long note on services/audio-repair-core.cjs's
 * decodeVoiceId: `voices` holds ACTIVE xai rows with bare 8/12-char ids across
 * 76 courses, and canonicalVoiceId throws on every one of them, so delegation
 * would have broken repair for the existing catalogue. The one shape that would
 * genuinely misfile — a bare Cartesia UUID — is refused instead.
 */
const CARTESIA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function decodeVoiceId (storedVoiceId) {
  const raw = String(storedVoiceId || '')
  const m = /^(xai|azure|elevenlabs|cartesia)_(.+)$/.exec(raw)
  if (m) return { provider: m[1], voiceId: m[2] }
  if (/Neural$/.test(raw)) return { provider: 'azure', voiceId: raw }
  if (CARTESIA_UUID.test(raw)) {
    throw new Error(`voice_id ${storedVoiceId} is a bare Cartesia UUID — store it as cartesia_<id> so it is not repaired as xAI`)
  }
  return { provider: 'xai', voiceId: raw }
}

function ttsOptionsFor (provider, voiceId, language) {
  if (provider === 'azure') return {
    subscriptionKey: process.env.AZURE_SPEECH_KEY,
    region: process.env.AZURE_SPEECH_REGION || 'westeurope',
    voiceName: voiceId,
  }
  if (provider === 'elevenlabs') return { apiKey: process.env.ELEVENLABS_API_KEY, voiceId }
  if (provider === 'cartesia') return {
    apiKey: process.env.CARTESIA_API_KEY, voiceId, locale: toBcp47(language),
  }
  return { apiKey: process.env.XAI_API_KEY, voiceId, language: toBcp47(language) }
}

/**
 * Render until a render passes every cheap damage test. Re-rolls rather than
 * accepting: TTS truncation is transient, so attempt N+1 usually succeeds where
 * N failed, and shipping a short clip is the exact failure this whole exercise
 * exists to undo.
 */
async function renderVerified (row, tmpDir) {
  const { provider, voiceId } = decodeVoiceId(row.voice_id)
  let last = null
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const { audioBuffer } = await ttsService.generateWithRetry(
      row.text, provider, ttsOptionsFor(provider, voiceId, row.language))
    const { buffer, durationMs } = await p8.masterAudio(audioBuffer, row.text)

    const probe = path.join(tmpDir, `verify-${row.id}-${attempt}.mp3`)
    fs.writeFileSync(probe, buffer)
    const level = await measureLevel(probe)
    try { fs.unlinkSync(probe) } catch {}

    const silent = level && level.meanDb < SILENCE_MEAN_DB
    const nearSilent = level && level.peakDb < NEAR_SILENCE_PEAK_DB
    const short = durationMs < FLOOR_MS
    const verdict = await veracity.checkAudioVeracity(buffer, row.text, row.language)
    const wrongWords = verdict.checked === true && verdict.pass === false

    last = { buffer, durationMs, level, verdict }
    if (!silent && !nearSilent && !short && !wrongWords) return last
    console.log(`      attempt ${attempt}: ${silent ? 'SILENT' : nearSilent ? 'NEAR-SILENT' : short ? 'TOO SHORT' : 'WORDS MISSING'} — re-roll`)
  }
  throw new Error(`no attempt produced clean speech (last ${last && last.durationMs}ms)`)
}

async function main () {
  console.log(`\nregen-seed-clips-from-scratch — ${COURSE} ${TARGETS ? `targets ${TARGETS}` : `seeds ${SEED_FROM}-${SEED_TO}`}, roles ${ROLES.join(',')}`)
  veracity.announceStatus(console)

  const work = []
  let unreferenced = 0

  if (TARGETS) {
    // Targets mode: the health gate already ran (whisper word-loss scan). Take
    // exactly the clips it named, resolve who serves each one, rebuild those.
    const ids = readTargetIds(TARGETS)
    console.log(`${ids.length} clip id(s) in the target file`)
    const holdersById = await resolveHolders(supabase, ids)
    for (const id of ids) {
      const holders = holdersById.get(id) || []
      if (!holders.length) { unreferenced++; continue }
      work.push({ id, label: `${holders[0].table.replace('course_', '')}#${holders[0].rowId}`, holders })
    }
    if (unreferenced) console.log(`${unreferenced} id(s) nothing points at — skipped (no consumer plays them)`)
  } else {
    // Seed-range mode: reach every clip through the column that actually serves
    // it rather than through a stale id list.
    const { data: legos, error: le } = await supabase.from('course_legos')
      .select('id, lego_id, seed_number, lego_index, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id')
      .eq('course_code', COURSE).gte('seed_number', SEED_FROM).lte('seed_number', SEED_TO)
      .order('seed_number').order('lego_index')
    if (le) throw new Error(`read legos: ${le.message}`)

    for (const l of legos || []) {
      if (ONLY_LEGOS.length && !ONLY_LEGOS.includes(l.lego_id)) continue
      for (const role of ROLES) {
        const slot = SLOT[role]
        if (!slot) throw new Error(`unknown role ${role}`)
        const id = l[slot.column]
        if (!id) { console.log(`  ${l.lego_id} ${role}: EMPTY slot — nothing to regenerate from`); continue }
        work.push({ id, label: `${l.lego_id} ${role}`, holders: [{ ...slot, rowId: l.id }] })
      }
    }
  }
  const queue = LIMIT ? work.slice(0, LIMIT) : work
  console.log(`${queue.length} clip(s) to regenerate${LIMIT ? ` (limited from ${work.length})` : ''}\n`)

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'regen-seeds-'))
  const log = []
  let done = 0, failed = 0, chars = 0

  const processItem = async (item, i) => {
    const prefix = `[${i + 1}/${queue.length}] ${item.label}`
    let stage = 'read'
    let old = null, newId = null, tombstoned = false, inserted = false
    const relinked = []
    try {
      const { data: row, error } = await supabase.from('course_audio').select('*').eq('id', item.id).single()
      if (error || !row) { console.log(`${prefix}: row gone — skip`); return }
      if (row.origin === 'human') { console.log(`${prefix}: origin=human — REFUSED`); return }
      old = row
      console.log(`${prefix} ${row.role}: ${JSON.stringify(row.text).slice(0, 60)} (rev${row.audio_revision}, ${row.s3_key})`)

      // A holder still pointing at a SUPERSEDED row is damage an earlier run
      // left behind: that run repointed course_legos and nothing else, so any
      // practice phrase sharing the clip kept the old bytes. Re-rendering is
      // both wrong and impossible here — the tombstone marker would be spoken
      // aloud, and the clean text is already taken by the live replacement
      // under `unique_course_audio_per_voice`. Repoint at that replacement
      // instead: free, and it is the clip the founder already approved.
      if (String(row.text || '').endsWith(TOMBSTONE)) {
        const cleanText = row.text.slice(0, -TOMBSTONE.length)
        const { data: live } = await supabase.from('course_audio')
          .select('id, s3_key, duration_ms').eq('course_code', row.course_code)
          .eq('text', cleanText).eq('voice_id', row.voice_id).eq('role', row.role)
          .order('audio_revision', { ascending: false }).limit(1)
        const repl = live && live[0]
        if (!repl) { console.log('      SUPERSEDED but no live replacement found — skipped, inspect by hand'); log.push({ clip: item.label, role: row.role, action: 'skipped-superseded-orphan', oldId: row.id }); return }
        if (DRY) {
          console.log(`      [PLAN] superseded — would relink ${item.holders.length} holder(s) to live ${repl.id} (free, no TTS)`)
          log.push({ clip: item.label, role: row.role, action: 'would-relink-to-live', oldId: row.id, liveId: repl.id, chars: 0, holders: item.holders.map(h => `${h.table}.${h.column}#${h.rowId}`) })
          return
        }
        for (const h of item.holders) {
          const patch = { [h.column]: repl.id }
          if (h.durationColumn) patch[h.durationColumn] = repl.duration_ms
          if (h.alsoSet && h.alsoSet.audio_uuid) patch.audio_uuid = repl.id
          const { error: e } = await supabase.from(h.table).update(patch).eq('id', h.rowId)
          if (e) throw new Error(`relink ${h.table}#${h.rowId}: ${e.message}`)
        }
        console.log(`      RELINKED ${item.holders.length} holder(s) to live ${repl.id} → ${repl.s3_key} (no TTS)`)
        done++
        log.push({ clip: item.label, role: row.role, action: 'relinked-to-live', oldId: row.id, liveId: repl.id, newKey: repl.s3_key, holders: item.holders.map(h => `${h.table}.${h.column}#${h.rowId}`) })
        return
      }

      // Free plan: everything that can be known without spending money.
      if (DRY && !DRY_RENDER) {
        const c = String(row.text || '').length
        chars += c
        console.log(`      [PLAN] ${c} chars, shipped ${row.duration_ms}ms, held by ${item.holders.map(h => `${h.table}.${h.column}`).join(', ')}`)
        log.push({ clip: item.label, role: row.role, action: 'would-replace', oldId: row.id, oldKey: row.s3_key, oldRev: row.audio_revision, shippedMs: row.duration_ms, holders: item.holders.map(h => `${h.table}.${h.column}#${h.rowId}`), text: row.text, chars: c, voice: row.voice_id })
        return
      }

      // 1. Render. Nothing is mutated if this throws.
      stage = 'render'
      const rendered = await renderVerified(row, tmpDir)
      chars += String(row.text || '').length

      if (DRY) {
        console.log(`      [DRY] would replace — shipped ${row.duration_ms}ms, fresh ${rendered.durationMs}ms, veracity ${rendered.verdict.checked ? (rendered.verdict.pass ? 'PASS' : 'FAIL') : 'unchecked'}`)
        log.push({ clip: item.label, role: row.role, action: 'would-replace', oldId: row.id, oldKey: row.s3_key, oldRev: row.audio_revision, shippedMs: row.duration_ms, freshMs: rendered.durationMs, holders: item.holders.map(h => `${h.table}.${h.column}#${h.rowId}`), text: row.text, chars: String(row.text || '').length })
        return
      }

      // 2. Upload the new object first — an S3 write nobody points at is inert.
      //    id === key uuid, so convention-derived and s3_key-derived consumers
      //    resolve to the same object. That equality is the whole point.
      stage = 'upload'
      newId = uuidv4()
      const s3Key = `mastered/${newId.toUpperCase()}.mp3`
      await p8.s3.send(new PutObjectCommand({
        Bucket: p8.S3_BUCKET, Key: s3Key, Body: rendered.buffer,
        ContentType: 'audio/mpeg', CacheControl: AUDIO_CACHE_CONTROL,
      }))

      // 3. Free the unique key `unique_course_audio_per_voice`. The marker goes
      //    on `text`, NOT text_normalized: the BEFORE trigger
      //    `trg_course_audio_normalize` recomputes the normalised column from
      //    `text` on every write, so writing it directly is silently reverted
      //    and the insert below then dies on the unique constraint.
      stage = 'tombstone'
      {
        const { error: e } = await supabase.from('course_audio')
          .update({ text: row.text + TOMBSTONE }).eq('id', row.id)
        if (e) throw new Error(`tombstone: ${e.message}`)
        const { data: check } = await supabase.from('course_audio')
          .select('text_normalized').eq('id', row.id).single()
        if (!check || check.text_normalized === row.text_normalized) {
          throw new Error('tombstone did not free the unique key — text_normalized unchanged')
        }
        tombstoned = true
      }

      // 4. Insert the replacement, carrying its own quality verdict and the
      //    advanced revision number.
      stage = 'insert'
      {
        const { error: e } = await supabase.from('course_audio').insert({
          id: newId,
          course_code: row.course_code,
          text: row.text,
          text_normalized: row.text_normalized,
          // text_stripped is a GENERATED column — inserting it is an error.
          language: row.language,
          role: row.role,
          voice_id: row.voice_id,
          origin: row.origin,
          lego_id: row.lego_id,
          sequence: row.sequence,
          s3_key: s3Key,
          duration_ms: rendered.durationMs,
          file_size_bytes: rendered.buffer.length,
          audio_revision: (row.audio_revision || 1) + 1,
          veracity_checked_at: new Date().toISOString(),
          veracity_pass: rendered.verdict.pass,
          veracity_reason: rendered.verdict.reason,
          veracity_cer: rendered.verdict.cer,
          veracity_checker: 'regen-seed-clips-from-scratch.cjs',
        })
        if (e) throw new Error(`insert: ${e.message}`)
        inserted = true
      }

      // 5. Repoint EVERY column that serves this clip. A holder left behind is
      //    a consumer still playing the damaged bytes.
      stage = 'repoint'
      for (const h of item.holders) {
        const patch = { [h.column]: newId }
        const before = { [h.column]: row.id }
        if (h.durationColumn) patch[h.durationColumn] = rendered.durationMs
        if (h.alsoSet && h.alsoSet.audio_uuid) { patch.audio_uuid = newId; before.audio_uuid = row.id }
        const { error: e } = await supabase.from(h.table).update(patch).eq('id', h.rowId)
        if (e) throw new Error(`repoint ${h.table}#${h.rowId}: ${e.message}`)
        relinked.push({ table: h.table, rowId: h.rowId, column: h.column, patch, before })
      }

      // 6. Ledger the swap. This is what makes old-vs-new comparable later:
      //    both keys, both durations, both revisions, in one row.
      stage = 'ledger'
      {
        const { error: e } = await supabase.from('course_audio_revisions').insert({
          audio_id: newId,
          course_code: row.course_code,
          revision: (row.audio_revision || 1) + 1,
          previous_revision: row.audio_revision || 1,
          previous_s3_key: row.s3_key,
          new_s3_key: s3Key,
          previous_duration_ms: row.duration_ms,
          new_duration_ms: rendered.durationMs,
          // candidate_id is FK'd to the repair-candidates table; a from-scratch
          // regeneration never goes through propose/accept, so it has none.
          candidate_id: null,
          source: TARGETS ? 'regen-targeted-wordloss' : 'regen-from-scratch',
          accepted_by: 'founder-order-2026-08-06',
          reason: TARGETS
            ? `whisper word-loss target list ${path.basename(TARGETS)}; old row ${row.id} and object ${row.s3_key} retained for comparison`
            : `first-${SEED_TO} seeds regenerated from scratch; old row ${row.id} and object ${row.s3_key} retained for comparison`,
        })
        if (e) console.log(`      WARN ledger insert failed (swap stands): ${e.message}`)
      }

      // 7. Verify the served object really is there and really is the new one.
      stage = 'verify'
      {
        const head = await p8.s3.send(new HeadObjectCommand({ Bucket: p8.S3_BUCKET, Key: s3Key }))
        if (!head.ContentLength) throw new Error('new object head returned no length')
        for (const h of item.holders) {
          const { data: back } = await supabase.from(h.table).select(h.column).eq('id', h.rowId).single()
          if (!back || back[h.column] !== newId) throw new Error(`link did not stick: ${h.table}#${h.rowId}.${h.column}`)
        }
        console.log(`      NEW ${newId} → ${s3Key} (${head.ContentLength}B, ${rendered.durationMs}ms, was ${row.duration_ms}ms) rev${(row.audio_revision || 1) + 1}, ${item.holders.length} link(s)`)
      }

      done++
      log.push({
        clip: item.label, role: row.role, action: 'replaced',
        holders: item.holders.map(h => `${h.table}.${h.column}#${h.rowId}`),
        oldId: row.id, oldKey: row.s3_key, oldRev: row.audio_revision, oldMs: row.duration_ms,
        newId, newKey: s3Key, newRev: (row.audio_revision || 1) + 1, newMs: rendered.durationMs,
        veracity: { checked: rendered.verdict.checked, pass: rendered.verdict.pass, cer: rendered.verdict.cer },
        text: row.text, voice: row.voice_id,
      })
    } catch (err) {
      failed++
      console.log(`      FAILED at ${stage}: ${err.message}`)
      // Unwind in reverse. The old row and old object were never touched
      // destructively, so restoring the text and the links is a full recovery.
      try {
        for (const r of relinked.reverse()) {
          if (r.before) await supabase.from(r.table).update(r.before).eq('id', r.rowId)
        }
        if (inserted) await supabase.from('course_audio').delete().eq('id', newId)
        if (tombstoned && old) await supabase.from('course_audio').update({ text: old.text }).eq('id', old.id)
        console.log('      unwound cleanly — old clip still serving')
      } catch (u) {
        console.log(`      !! UNWIND FAILED: ${u.message} — INSPECT ${old && old.id} BY HAND`)
      }
      log.push({ clip: item.label, action: 'failed', stage, error: err.message, oldId: item.id })
    }
  }

  // Concurrency. The ceiling is not ours to pick freely: services/tts-service.cjs
  // caps xAI at XAI_TTS_CONCURRENCY (default 4) because a 20-wide fan-out is
  // measured to make /v1/tts queue past the timeout (~50% timeouts on the
  // 2026-07-25 guj passes), and sustained wide runs degrade into silent stub
  // responses (567 French clips, 2026-08-03) — the exact damage this tool
  // exists to undo. So the pool is deliberately WIDER than the TTS cap: the
  // extra workers sit in S3, whisper and Postgres while the TTS governor holds
  // the provider at its safe width, which is where the real speed-up is.
  const pool = Math.max(1, Number(arg('--concurrency') || 8))
  console.log(`running ${pool} workers (xAI held at ${process.env.XAI_TTS_CONCURRENCY || 4} concurrent by the TTS governor)\n`)
  let cursor = 0
  const runner = async () => {
    for (;;) {
      const i = cursor++
      if (i >= queue.length) return
      await processItem(queue[i], i)
    }
  }
  await Promise.all(Array.from({ length: pool }, runner))

  const scope = TARGETS ? `targets-${path.basename(TARGETS).replace(/\.json$/, '')}` : `seeds${SEED_FROM}-${SEED_TO}`
  const outPath = OUT || path.join(__dirname, '..', 'docs', 'audio-repair-2026-08-06',
    `${COURSE}-${scope}-regen-${DRY ? 'dryrun' : 'applied'}-log.json`)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify({
    course: COURSE, seeds: TARGETS ? null : SEEDS, targets: TARGETS, roles: ROLES,
    dry: DRY, dryRender: DRY_RENDER, unreferenced,
    generatedAt: new Date().toISOString(), done, failed, planned: log.filter(l => l.action === 'would-replace').length,
    ttsChars: chars, log,
  }, null, 2))

  console.log(`\n${done} replaced, ${failed} failed, ~${chars} TTS chars`)
  console.log(`log → ${outPath}`)
  try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
  process.exit(failed ? 1 : 0)
}

// Exported for the unit tests; the DB and TTS work only runs when this file is
// the entry point, so requiring the module never touches the estate or spends.
module.exports = { readTargetIds, HOLDERS, SLOT, decodeVoiceId }

if (require.main === module) {
  main().catch(e => { console.error('FATAL', e); process.exit(1) })
}
