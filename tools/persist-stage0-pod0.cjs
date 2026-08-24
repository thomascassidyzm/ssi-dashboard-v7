/**
 * persist-stage0-pod0.cjs — persist the Stage-0 course-preview backend assets
 * for spa_for_eng / pod-0 (Atom-Fusion Introduction).
 *
 * Reads the generated content on disk (~/Desktop/stage0-spa-pod0/):
 *   - decomposition.json : per-sentence intentions[].atoms[] with explained /
 *                          first_encounter flags + per-sentence skipped/names.
 *                          This is the COMPLETE atom list (incl. passthrough).
 *   - manifest.json      : per-clip {file, role, text, durMs} keyed by
 *                          (sentenceId, intentionId, atomIndex). Authoritative
 *                          for the audio assets to upload + their text/durations.
 *   - sN/*.mp3           : the actual atom slices: *-target.mp3 (File-2 slice)
 *                          and *-means-gloss.mp3 (merged "means, <gloss>").
 *
 * For each EXPLAINED atom it:
 *   1. uploads the merged means-gloss mp3 -> S3 mastered/{uuid}.mp3 and upserts
 *      course_audio (text "means, <gloss>", role pod_explainer, voice comp:leo).
 *   2. upserts pod_legos (the canonical inventory unit) linking explainer_audio_id.
 *   3. uploads the *-target.mp3 (File-2 atom slice) as course_audio with a
 *      DISTINCT text "[atom] <target>" so the tuner can play the real slice
 *      (no whole-take offsets yet).
 *   4. writes listening_pod_sentences.atom_map (per clause, ordered): atom /
 *      passthrough / note entries citing pod_legos by lego_key, target offsets
 *      NULL for now (forced-align is a later pass; the tuner doesn't need them).
 *
 * Idempotent: course_audio upserts on (course_code,text_normalized,language,
 * role,voice_id); existing rows are reused (s3_key + id) and NOT re-uploaded.
 * pod_legos upsert on (course_code,lego_key). atom_map is overwritten per run.
 *
 * Usage:
 *   node tools/persist-stage0-pod0.cjs --dry-run   # logs what it WOULD write
 *   node tools/persist-stage0-pod0.cjs             # real run
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const { createClient } = require('@supabase/supabase-js')
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')
const { normalizeForAudio } = require('../services/shared/text-normalize.cjs')
const { canonicalLanguage, canonicalVoiceId } = require('../services/shared/clip-identity.cjs')
const { AUDIO_CACHE_CONTROL } = require('../services/shared/audio-cache-control.cjs')

// Course-parameterized (default spa so the original spa path is intact):
//   COURSE=hrv_for_eng node tools/persist-stage0-pod0.cjs
const COURSE_CODE = (process.env.COURSE || 'spa_for_eng').trim()
// `language` is canonicalised below, so the ISO-639-1 spellings here and the
// ISO-3 the fallback derives from the course code no longer produce two shapes
// from the same tool.
const COURSE_META = {
  spa_for_eng: { language: 'es', srcDir: 'stage0-spa-pod0' },
  hrv_for_eng: { language: 'hr', srcDir: 'stage0-hrv-pod0' },
}
const META = COURSE_META[COURSE_CODE] || { language: COURSE_CODE.split('_')[0], srcDir: `stage0-${COURSE_CODE.split('_')[0]}-pod0` }
const POD_SLUG = 'pod-0'
const POD_ID = `${COURSE_CODE}:${POD_SLUG}`
const ROLE = 'pod_explainer'
// Canonical identity (services/shared/clip-identity.cjs), computed not spelt.
const LANGUAGE = canonicalLanguage(META.language)
const VOICE_ID = canonicalVoiceId('comp:leo')        // 'comp:xai_leo'
/**
 * TEMPORARY. Rows written before canonicalisation still carry the pre-canonical
 * spelling, so the idempotency lookups below accept both — matching only the new
 * spelling would find nothing and re-render clips that already exist, which is
 * real TTS spend. Delete this (and turn the `.in()`s back into `.eq()`) once the
 * approved back-fill has rewritten those rows.
 */
const LEGACY_VOICE_IDS = ['comp:leo']
const VOICE_ID_READ = [VOICE_ID, ...LEGACY_VOICE_IDS]
const LANGUAGE_READ = [...new Set([LANGUAGE, META.language])]
const ORIGIN = 'tts'
const SRC_DIR = path.join(process.env.HOME || require('os').homedir(), 'Desktop', META.srcDir)

// SHARED known-side store: the English "means, <gloss>" explainer audio is
// identical across all languages, so it lives ONCE under course_code=pod_known_en
// (language en) and is reused by every course. See tools/build-shared-known-store.cjs.
// When persisting a NEW language we resolve each gloss's known clip from that
// shared store (no per-course means upload) and only the TARGET atoms are
// per-language. Set POD_KNOWN_LOCAL=1 to fall back to the legacy per-course means.
const SHARED_KNOWN_COURSE = 'pod_known_en'
const SHARED_KNOWN_LANG = canonicalLanguage('en')     // 'eng'
/** Same temporary dual-spelling read as above — see LEGACY_VOICE_IDS. */
const SHARED_KNOWN_LANG_READ = [SHARED_KNOWN_LANG, 'en']
const USE_SHARED_KNOWN = process.env.POD_KNOWN_LOCAL !== '1'

const DRY_RUN = process.argv.includes('--dry-run')

// Same flat S3 + service-role Supabase substrate every other service uses.
const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage'
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1'
const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})
const supabase = createClient(
  (process.env.SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_KEY || '').trim(),
  { auth: { persistSession: false, autoRefreshToken: false } },
)

function log(...a) { console.log(...a) }

/** Slug of the canonical target surface — the lego_key. NFKD-fold to ASCII so
 *  accented Spanish forms collapse to a stable key; keep digits. */
function slugTarget(s) {
  return String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')   // strip combining marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** course_audio: reuse an existing row if present (idempotent — no re-upload),
 *  else upload mp3File -> S3 mastered/{uuid}.mp3 and upsert. Returns audio id. */
async function ensureAudio({ text, mp3File, durationMs }) {
  const textNorm = normalizeForAudio(text)
  // The DB has a trigger on text_normalized that ALSO strips a trailing '?'
  // (normalizeForAudio deliberately keeps it). So for idempotency our pre-check
  // must match either form, else '?'-ending atoms look "missing" every run and
  // re-upload their S3 object (the upsert still de-dups, but wastefully).
  const textNormNoQ = textNorm.replace(/\?+$/, '')
  const lookupNorms = textNorm === textNormNoQ ? [textNorm] : [textNorm, textNormNoQ]

  // Idempotent lookup on the conflict key.
  const { data: existingRows, error: selErr } = await supabase
    .from('course_audio')
    .select('id, s3_key')
    .eq('course_code', COURSE_CODE)
    .in('text_normalized', lookupNorms)
    .in('language', LANGUAGE_READ)
    .eq('role', ROLE)
    .in('voice_id', VOICE_ID_READ)
    .limit(1)
  if (selErr) throw new Error(`course_audio select "${text}": ${selErr.message}`)
  const existing = existingRows && existingRows[0]
  if (existing) return { id: existing.id, reused: true, s3_key: existing.s3_key }

  const newId = uuidv4().toUpperCase()
  const s3Key = `mastered/${newId}.mp3`

  if (DRY_RUN) {
    log(`  [dry] WOULD upload ${path.relative(SRC_DIR, mp3File)} -> s3://${S3_BUCKET}/${s3Key}`)
    log(`  [dry] WOULD upsert course_audio text="${text}" lang=${LANGUAGE} role=${ROLE} voice=${VOICE_ID} dur=${durationMs}ms`)
    return { id: `dry:${newId}`, reused: false, s3_key: s3Key }
  }

  const body = fs.readFileSync(mp3File)
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET, Key: s3Key, Body: body, ContentType: 'audio/mpeg', CacheControl: AUDIO_CACHE_CONTROL,
  }))
  const { data: ins, error: insErr } = await supabase
    .from('course_audio')
    .upsert({
      course_code: COURSE_CODE,
      text,
      text_normalized: textNorm,
      language: LANGUAGE,
      role: ROLE,
      voice_id: VOICE_ID,
      origin: ORIGIN,
      s3_key: s3Key,
      duration_ms: durationMs,
    }, { onConflict: 'course_code,text_normalized,language,role,voice_id' })
    .select('id, s3_key')
    .single()
  if (insErr) throw new Error(`course_audio upsert "${text}": ${insErr.message}`)
  return { id: ins.id, reused: false, s3_key: ins.s3_key }
}

/** Resolve a gloss's known "means, <gloss>" clip from the SHARED store
 *  (course_code=pod_known_en, language=en). Returns the shared row id if present,
 *  else null (caller falls back to the per-course path). No upload — the shared
 *  store is built/owned by tools/build-shared-known-store.cjs. */
async function resolveSharedMeans(meansText) {
  const textNorm = normalizeForAudio(meansText)
  const textNormNoQ = textNorm.replace(/\?+$/, '')
  const lookupNorms = textNorm === textNormNoQ ? [textNorm] : [textNorm, textNormNoQ]
  const { data, error } = await supabase
    .from('course_audio')
    .select('id, s3_key')
    .eq('course_code', SHARED_KNOWN_COURSE)
    .in('text_normalized', lookupNorms)
    .in('language', SHARED_KNOWN_LANG_READ)
    .eq('role', ROLE)
    .in('voice_id', VOICE_ID_READ)
    .limit(1)
  if (error) throw new Error(`shared means lookup "${meansText}": ${error.message}`)
  const row = data && data[0]
  return row ? { id: row.id, s3_key: row.s3_key } : null
}

async function main() {
  log(`persist-stage0-pod0 ${DRY_RUN ? '(DRY RUN)' : '(REAL RUN)'} — ${COURSE_CODE}/${POD_SLUG}`)
  log(`  source: ${SRC_DIR}`)
  log(`  S3: s3://${S3_BUCKET} (${AWS_REGION})  voice=${VOICE_ID}\n`)

  const decomposition = JSON.parse(fs.readFileSync(path.join(SRC_DIR, 'decomposition.json'), 'utf8'))
  const manifest = JSON.parse(fs.readFileSync(path.join(SRC_DIR, 'manifest.json'), 'utf8'))

  // Index manifest clips by (sentenceId -> intentionId -> atomIndex -> {role: clip}).
  const clipIdx = {}
  for (const s of manifest.sentences) {
    clipIdx[s.id] = {}
    for (const c of s.clips || []) {
      ;(clipIdx[s.id][c.intention] ||= {})
      ;(clipIdx[s.id][c.intention][c.atomIndex] ||= {})[c.role] = c
    }
  }

  const sentences = [...decomposition.sentences].sort((a, b) => a.globalOrder - b.globalOrder)

  // ── pass 1: build the canonical pod_legos inventory across the whole corpus ──
  // first_encounter discipline: the generator already marked every recurring
  // appearance explained:false, so each explained atom is a unique debut. We
  // still aggregate defensively (occurrence_count, lowest first_seen_order).
  const legos = new Map()  // lego_key -> { target, known, first_seen_order, first_seen_sentence, occurrence_count, clip refs }
  for (const s of sentences) {
    for (const intent of s.intentions || []) {
      const atoms = intent.atoms || []
      for (let ai = 0; ai < atoms.length; ai++) {
        const a = atoms[ai]
        if (!a.explained) continue
        const key = slugTarget(a.chunk_target)
        const clips = (clipIdx[s.id]?.[intent.id]?.[ai]) || {}
        const meansClip = clips.atomMeansGloss
        const targetClip = clips.atomTarget
        if (!meansClip || !targetClip) {
          throw new Error(`missing clips for ${s.id} ${intent.id} atom${ai} "${a.chunk_target}"`)
        }
        if (!legos.has(key)) {
          legos.set(key, {
            lego_key: key,
            target: a.chunk_target,
            known: a.chunk_known,
            first_seen_order: s.globalOrder,
            first_seen_sentence: s.id,
            occurrence_count: 0,
            meansClip, targetClip,
          })
        }
        const L = legos.get(key)
        L.occurrence_count += 1
        if (s.globalOrder < L.first_seen_order) {
          L.first_seen_order = s.globalOrder
          L.first_seen_sentence = s.id
        }
      }
    }
  }
  log(`Inventory: ${legos.size} distinct pod_legos across ${sentences.length} sentences\n`)

  // ── pass 1b: persist audio + pod_legos for each inventory unit ──────────────
  let caMeans = 0, caTarget = 0, caReused = 0, caShared = 0
  let legoRows = 0
  const legoAudioIds = new Map()  // lego_key -> { explainer_audio_id, atom_target_audio_id }

  for (const L of legos.values()) {
    // 1. merged means-gloss audio (the explainer asset, owned by pod_legos).
    //    KNOWN side is English and identical across languages, so resolve it from
    //    the SHARED store (pod_known_en/en) and reuse — no per-course upload. Only
    //    if it's missing there (or POD_KNOWN_LOCAL=1) do we fall back to the
    //    per-course means clip on disk.
    const meansText = L.meansClip.text  // already "means, <gloss>" in the manifest
    const meansFile = path.join(SRC_DIR, L.meansClip.file)
    let means = null
    if (USE_SHARED_KNOWN) {
      const shared = await resolveSharedMeans(meansText)
      if (shared) {
        means = { id: shared.id, reused: true, s3_key: shared.s3_key, shared: true }
        caShared++
      }
    }
    if (!means) {
      means = await ensureAudio({ text: meansText, mp3File: meansFile, durationMs: L.meansClip.durMs })
      if (means.reused) caReused++; else caMeans++
    }

    // 3. File-2 atom slice, DISTINCT text so the tuner plays the real slice
    const targetText = `[atom] ${L.target}`
    const targetFile = path.join(SRC_DIR, L.targetClip.file)
    const tgt = await ensureAudio({ text: targetText, mp3File: targetFile, durationMs: L.targetClip.durMs })
    if (tgt.reused) caReused++; else caTarget++

    legoAudioIds.set(L.lego_key, { explainer_audio_id: means.id, atom_target_audio_id: tgt.id })

    // 2. pod_legos upsert
    const legoId = `${COURSE_CODE}:${L.lego_key}`
    if (DRY_RUN) {
      log(`  [dry] WOULD upsert pod_legos ${legoId} target="${L.target}" known="${L.known}" first@${L.first_seen_order} occ=${L.occurrence_count}`)
    } else {
      const { error: legoErr } = await supabase
        .from('pod_legos')
        .upsert({
          id: legoId,
          course_code: COURSE_CODE,
          lego_key: L.lego_key,
          target: L.target,
          known: L.known,
          first_seen_order: L.first_seen_order,
          first_seen_sentence: L.first_seen_sentence,
          occurrence_count: L.occurrence_count,
          is_name: false,
          explainer_audio_id: means.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'course_code,lego_key' })
      if (legoErr) throw new Error(`pod_legos upsert ${legoId}: ${legoErr.message}`)
    }
    legoRows++
  }
  log(`\ncourse_audio: ${caMeans} means-gloss + ${caTarget} atom-target written, ${caReused} reused` +
      (USE_SHARED_KNOWN ? `, ${caShared} means resolved from SHARED store (${SHARED_KNOWN_COURSE})` : ''))
  log(`pod_legos: ${legoRows} upserted\n`)

  // ── pass 2: write per-sentence atom_map ─────────────────────────────────────
  // Ordered across all intentions of the sentence; every atom (explained or
  // not) becomes an entry citing its lego_key. explained&&first_encounter ->
  // 'atom'; everything else (skipped/introduced) -> 'passthrough'. Notes would
  // be 'note' entries — the Stage-0 generator emits none, so none are written.
  let sentencesWithMap = 0
  for (const s of sentences) {
    const entries = []
    for (const intent of s.intentions || []) {
      const atoms = intent.atoms || []
      for (let ai = 0; ai < atoms.length; ai++) {
        const a = atoms[ai]
        const key = slugTarget(a.chunk_target)
        const kind = (a.explained && a.first_encounter) ? 'atom' : 'passthrough'
        entries.push({
          lego_key: key,
          kind,
          gloss: a.chunk_known,
          target_surface: a.chunk_target,
          target_start_ms: null,
          target_end_ms: null,
        })
      }
    }
    if (entries.length === 0) continue
    sentencesWithMap++
    if (DRY_RUN) {
      const atomN = entries.filter(e => e.kind === 'atom').length
      const passN = entries.filter(e => e.kind === 'passthrough').length
      log(`  [dry] ${s.id} atom_map: ${entries.length} entries (${atomN} atom, ${passN} passthrough)`)
    } else {
      const { error: mapErr } = await supabase
        .from('listening_pod_sentences')
        .update({ atom_map: entries, updated_at: new Date().toISOString() })
        .eq('id', s.id)
      if (mapErr) throw new Error(`atom_map update ${s.id}: ${mapErr.message}`)
    }
  }
  log(`\nlistening_pod_sentences.atom_map: ${sentencesWithMap} sentences written`)

  log('\n=== SUMMARY ===')
  log(`pod_legos:                  ${legoRows}`)
  log(`course_audio (means-gloss): ${caMeans}` + (USE_SHARED_KNOWN ? `  (+${caShared} from SHARED ${SHARED_KNOWN_COURSE})` : ''))
  log(`course_audio (atom-target): ${caTarget}`)
  log(`course_audio reused:        ${caReused}`)
  log(`sentences with atom_map:    ${sentencesWithMap}`)
  log(DRY_RUN ? '\n(DRY RUN — nothing written)' : '\nDONE.')
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
