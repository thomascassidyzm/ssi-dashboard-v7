#!/usr/bin/env node
/**
 * relink-silent-slots.cjs — restore silent slots from clips we already own.
 *
 * Tom's ruling 2026-08-17: the 319 EXACT-VOICE relinks are authorised. Zero spend,
 * no text edits (so no trigger interaction at all), make-before-break with
 * before-images and S3 HEAD verification per link — the same shape as the
 * eus_for_eng S0006L02U04 restoration.
 *
 * WHAT IT WILL AND WILL NOT DO:
 *   - Only fills a pointer that is currently NULL. It never overwrites a live link.
 *   - Only with a clip whose voice_id is EXACTLY the course's configured voice for
 *     that role, region included. A clip on a different voice is REFUSED — linking
 *     one would silently change the voice a learner hears (Tom: held, 108 of those).
 *   - HEAD-checks the S3 object first. A row with no reachable file is not "audio we
 *     have", so it is refused rather than linked.
 *   - Writes a before-image for every row BEFORE touching it, with a ready rollback.
 *   - Re-reads each row AFTER the write and confirms the pointer resolves to a live
 *     s3_key. A write that cannot be verified is reported as a failure, not a success.
 *   - Never generates TTS. Never deletes anything. Never edits text.
 *
 * Usage:
 *   node tools/deborah/relink-silent-slots.cjs <course…> --dry-run
 *   node tools/deborah/relink-silent-slots.cjs <course…> --apply --log out.json
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env'), quiet: true })
const { createClient } = require('@supabase/supabase-js')
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3')
const { scopeCourse } = require('./silent-slot-repair-scope.cjs')
// The estate's OWN voice decoder and language canonicaliser. Tom's ruling
// 2026-08-17: prove voice equivalence "with the estate's own decodeVoiceId — the
// same check that killed this morning's false voice-swap alarm — not string surgery."
const { decodeVoiceId } = require('../../services/audio-repair-core.cjs')
const { canonicalLanguage } = require('../../services/shared/clip-identity.cjs')

/**
 * Are two stored voice ids the SAME voice? `bedd6226` and `xai_bedd6226` are one
 * voice under two taggings; `xai_eve` and `azure_en-GB-SoniaNeural` are not.
 * Decided by decodeVoiceId, never by trimming prefixes by hand.
 */
function voicesEquivalent (a, b) {
  if (!a || !b) return false
  if (a === b) return true
  try {
    const x = decodeVoiceId(a), y = decodeVoiceId(b)
    return x.provider === y.provider && x.voiceId === y.voiceId
  } catch { return false }
}

/**
 * LANGUAGE ASSERTION (Tom's ruling d, 2026-08-17): make the cross-language class
 * structurally impossible rather than merely unchosen. The scope pass found a
 * Chinese slot and a Korean slot each with a candidate clip stored under `xai_ara`
 * — an Arabic voice id. Nothing should ever link those, so this refuses them at
 * the tool level instead of relying on an operator noticing.
 *
 * FAILS CLOSED: canonicalLanguage throws on a sentinel or a code it does not know
 * (it rejects nine of the estate's course languages outright). A language we cannot
 * assert is a language we do not link.
 */
function languageMatches (clipLanguage, expectedLanguage) {
  try {
    return canonicalLanguage(clipLanguage) === canonicalLanguage(expectedLanguage)
  } catch { return false }
}

const db = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
)
const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage'
const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-2' })

const COL = { known: 'known_audio_id', target1: 'target1_audio_id', target2: 'target2_audio_id' }
const PK = { course_legos: 'lego_id', course_practice_phrases: 'id' }

const headCache = new Map()
async function s3Alive (key) {
  if (!key) return null
  if (headCache.has(key)) return headCache.get(key)
  let out = null
  try {
    const r = await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key }))
    out = { bytes: r.ContentLength, modified: r.LastModified?.toISOString() || null }
  } catch (e) {
    out = { error: e.name || String(e.message) }
  }
  headCache.set(key, out)
  return out
}

async function relinkCourse (courseCode, { apply, decodeEquivalent = false }) {
  const scope = await scopeCourse(courseCode)
  let targets = (scope.detail || []).filter(d => d.verdict === 'relinkable')

  // The course's expected language per role, for the language assertion.
  const { data: crs } = await db.from('courses')
    .select('known_lang, target_lang, voice_config').eq('course_code', courseCode).maybeSingle()
  const expectedLang = role => (role === 'known' ? crs?.known_lang : crs?.target_lang)
  const voices = crs?.voice_config?.voices || crs?.voice_config || {}
  const wantVoice = role => {
    const v = voices?.[role]
    if (!v) return null
    const raw = typeof v === 'string' ? v : v.voiceId
    if (!raw) return null
    const provider = (typeof v === 'object' && v.provider) || 'azure'
    return raw.includes('_') ? raw : `${provider}_${raw}`
  }

  // --decode-equivalent promotes the voice-mismatch rows whose candidate is the
  // SAME voice under a different id tagging (Tom authorised these on 2026-08-17,
  // conditional on decodeVoiceId agreeing per row; any row it disputes stays held).
  const promoted = []
  if (decodeEquivalent) {
    for (const d of (scope.detail || []).filter(x => x.verdict === 'voice-mismatch')) {
      const want = wantVoice(d.role)
      if (!want) continue                                  // class (b): no configured voice
      const { data: cands } = await db.from('course_audio')
        .select('id, voice_id, language, s3_key, role, course_code')
        .eq('role', d.role).eq('text_normalized', d.norm).not('s3_key', 'is', null)
      const hit = (cands || []).find(c => voicesEquivalent(c.voice_id, want) &&
                                          languageMatches(c.language, expectedLang(d.role)))
      if (hit) {
        promoted.push({ ...d, verdict: 'relinkable', clip_id: hit.id,
                        clip_course: hit.course_code, voice_id: hit.voice_id,
                        promoted_by: 'decodeVoiceId', wanted_voice: want })
      }
    }
    targets = targets.concat(promoted)
  }

  const result = {
    course_code: courseCode, candidates: targets.length,
    promoted_by_decode: promoted.length,
    relinked: 0, refused_no_file: 0, refused_not_null: 0,
    refused_language: 0, refused_voice: 0, failed_verify: 0, rows: []
  }
  if (targets.length === 0) return result

  // Group by row so one row with two silent roles is a single write.
  const byRow = new Map()
  for (const t of targets) {
    const k = `${t.table}|${t.id}`
    if (!byRow.has(k)) byRow.set(k, { table: t.table, id: t.id, slots: [] })
    byRow.get(k).slots.push(t)
  }

  for (const row of byRow.values()) {
    const pk = PK[row.table]
    const cols = ['known_audio_id', 'target1_audio_id', 'target2_audio_id']
    const { data: before, error: bErr } = await db.from(row.table)
      .select(`${pk}, known_text, target_text, ${cols.join(', ')}`)
      .eq(pk, row.id).eq('course_code', courseCode).maybeSingle()
    if (bErr || !before) {
      result.rows.push({ id: row.id, table: row.table, outcome: 'read-failed', error: bErr?.message })
      continue
    }

    const patch = {}
    const verified = []
    for (const s of row.slots) {
      const col = COL[s.role]
      // Refuse if it is no longer NULL — another process may have filled it since
      // the scope ran, and we never overwrite a live link.
      if (before[col]) { result.refused_not_null++; continue }
      const { data: clip } = await db.from('course_audio')
        .select('id, s3_key, voice_id, role, language, text, duration_ms')
        .eq('id', s.clip_id).maybeSingle()
      if (!clip?.s3_key) { result.refused_no_file++; continue }

      // ASSERTION 1 — LANGUAGE. Structurally forbids the cross-language class: a
      // Chinese slot must never take a clip filed under an Arabic voice, whatever
      // its text_normalized says. Fails closed on a language we cannot canonicalise.
      if (!languageMatches(clip.language, expectedLang(s.role))) {
        result.refused_language++
        result.rows.push({ table: row.table, id: row.id, role: s.role, outcome: 'refused-language',
                           clip_id: clip.id, clip_language: clip.language,
                           expected_language: expectedLang(s.role), clip_voice: clip.voice_id })
        continue
      }
      // ASSERTION 2 — VOICE. Decided by the estate's decodeVoiceId, so a prefix
      // difference passes and a genuinely different voice cannot, whichever list
      // this candidate arrived on.
      const want = wantVoice(s.role)
      if (!voicesEquivalent(clip.voice_id, want)) {
        result.refused_voice++
        result.rows.push({ table: row.table, id: row.id, role: s.role, outcome: 'refused-voice',
                           clip_id: clip.id, clip_voice: clip.voice_id, wanted_voice: want })
        continue
      }

      // MAKE BEFORE BREAK: prove the bytes exist before any pointer moves.
      const head = await s3Alive(clip.s3_key)
      if (!head || head.error) { result.refused_no_file++; continue }
      patch[col] = clip.id
      verified.push({ role: s.role, col, clip_id: clip.id, s3_key: clip.s3_key,
                      bytes: head.bytes, voice_id: clip.voice_id, language: clip.language,
                      voice_equivalence: clip.voice_id === want ? 'exact' : 'decodeVoiceId' })
    }
    if (Object.keys(patch).length === 0) continue

    const rec = {
      table: row.table, id: row.id,
      known_text: before.known_text, target_text: before.target_text,
      before: Object.fromEntries(cols.map(c => [c, before[c] ?? null])),
      after_intended: { ...Object.fromEntries(cols.map(c => [c, before[c] ?? null])), ...patch },
      verified_clips: verified,
      rollback: `update ${row.table} set ${Object.keys(patch).map(c => `${c}=null`).join(', ')} where ${pk}='${row.id}';`
    }

    if (!apply) { rec.outcome = 'dry-run'; result.rows.push(rec); result.relinked += verified.length; continue }

    const { error: wErr } = await db.from(row.table).update(patch).eq(pk, row.id).eq('course_code', courseCode)
    if (wErr) { rec.outcome = 'write-failed'; rec.error = wErr.message; result.rows.push(rec); continue }

    // VERIFY AFTER: re-read and confirm every pointer resolves to a live s3_key.
    // course_code is REQUIRED here: lego_id is not unique across courses (every
    // course has an S0028L01), so a bare .eq('lego_id', …).maybeSingle() matches
    // many rows and returns nothing. That made five correctly-written lego rows
    // report verify-failed on 2026-08-17 — the write was scoped, the check wasn't.
    const { data: after } = await db.from(row.table)
      .select(`${cols.join(', ')}`)
      .eq(pk, row.id).eq('course_code', courseCode).maybeSingle()
    let allGood = true
    for (const v of verified) {
      if (after?.[v.col] !== v.clip_id) { allGood = false; break }
      const { data: chk } = await db.from('course_audio').select('s3_key').eq('id', v.clip_id).maybeSingle()
      if (!chk?.s3_key) { allGood = false; break }
    }
    rec.after_actual = after || null
    rec.outcome = allGood ? 'relinked' : 'verify-failed'
    if (allGood) result.relinked += verified.length; else result.failed_verify += verified.length
    result.rows.push(rec)
  }
  return result
}

async function main () {
  const argv = process.argv.slice(2)
  const apply = argv.includes('--apply')
  const decodeEquivalent = argv.includes('--decode-equivalent')
  const logAt = argv.indexOf('--log')
  const logOut = logAt >= 0 ? argv[logAt + 1] : null
  const courses = argv.filter(a => /_for_/.test(a))
  if (!courses.length) {
    console.error('Usage: relink-silent-slots.cjs <course…> [--dry-run|--apply] [--log out.json]')
    process.exit(1)
  }
  if (!apply) console.log('DRY RUN — nothing will be written. Pass --apply to write.\n')

  const all = []
  const hdr = 'course'.padEnd(18) + 'cands'.padStart(7) + 'relinked'.padStart(10) +
              'no-file'.padStart(9) + 'ref-lang'.padStart(10) + 'ref-voice'.padStart(11) + 'verifyfail'.padStart(12)
  console.log(hdr); console.log('-'.repeat(hdr.length))
  for (const c of courses) {
    try {
      const r = await relinkCourse(c, { apply, decodeEquivalent })
      all.push(r)
      console.log(c.padEnd(18) + String(r.candidates).padStart(7) + String(r.relinked).padStart(10) +
        String(r.refused_no_file).padStart(9) + String(r.refused_language).padStart(10) +
        String(r.refused_voice).padStart(11) + String(r.failed_verify).padStart(12))
    } catch (e) {
      console.log(`${c.padEnd(18)} GAP: ${e.message}`)
      all.push({ course_code: c, gap: e.message })
    }
  }
  const sum = k => all.reduce((n, r) => n + (r[k] || 0), 0)
  console.log('-'.repeat(hdr.length))
  console.log('TOTAL'.padEnd(18) + String(sum('candidates')).padStart(7) + String(sum('relinked')).padStart(10) +
    String(sum('refused_no_file')).padStart(9) + String(sum('refused_language')).padStart(10) +
    String(sum('refused_voice')).padStart(11) + String(sum('failed_verify')).padStart(12))
  if (sum('promoted_by_decode')) console.log(`\npromoted by decodeVoiceId (same voice, different id tagging): ${sum('promoted_by_decode')}`)

  if (logOut) {
    require('fs').writeFileSync(logOut, JSON.stringify(all, null, 2))
    console.log(`\nwrote ${logOut}`)
  }
}

if (require.main === module) main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
