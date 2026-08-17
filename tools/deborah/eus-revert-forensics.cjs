#!/usr/bin/env node
/**
 * eus-revert-forensics.cjs — what reverts Deborah's Basque audio fixes?
 *
 * Her report (2026-08-17): in places where she previously changed the TEXT and
 * re-did the VOICE, the text is still changed but the voice has reverted to the
 * old wording. Separately, at S0033/R95 her corrected BUILD PHRASES reverted
 * outright. Third sighting of the fixes-don't-stick family.
 *
 * Code reading (no DB needed) gives four candidate channels. This probe is
 * built to DISCRIMINATE between them rather than confirm a favourite:
 *
 *  A. UPSERT-OVERWRITE IN PLACE. phase8-audio-v13.cjs:5136 upserts course_audio
 *     on (course_code, text_normalized, language, role, voice_id) — so a later
 *     render of the same text on the same voice REPLACES her s3_key in the SAME
 *     row. Pointer never moves, text never changes, audio_revision bumps.
 *     TELL: course_audio_revisions rows for the CURRENTLY-BOUND clip id, dated
 *     after her fix, with a non-human actor.
 *
 *  B. TRIGGER RE-RESOLVE TO AN OLDER CLIP. null_lego_audio_on_text_change
 *     (20260806_audio_link_integrity.sql) re-points on ANY target_text change via
 *     audio_id_for_text(), which ranks origin=human, then created_at DESC among
 *     rows whose text_normalized matches. /regenerate-lego deliberately writes
 *     the SPOKEN text, which may differ from course_legos.target_text — so her
 *     clip can be invisible to that lookup and an older clip wins.
 *     TELL: bound clip is OLDER than a sibling clip for the same slot, and the
 *     bound clip's text differs from the LEGO's text.
 *
 *  C. TEXT-VS-VOICED DESYNC. course_audio.text updated without re-rendering, so
 *     the row claims her new wording while the mp3 still speaks the old.
 *     TELL: word_boundaries (what TTS actually spoke) disagrees with .text.
 *     This is the only channel that explains "voice says the OLD WORDING" while
 *     every text field looks correct.
 *
 *  D. REDO DESTROYED THE BUILDS. POST /api/build/redo deletes a seed's phrases
 *     and legos then rebuilds. It is now snapshotted first
 *     (seed_redo_snapshots, on main), so if this is what hit R95 her corrected
 *     Builds are RECOVERABLE via POST /api/build/redo-undo.
 *     TELL: a seed_redo_snapshots row for eus_for_eng seed 33.
 *
 * Read-only. Writes nothing, generates nothing, costs nothing.
 *
 * Usage: node tools/deborah/eus-revert-forensics.cjs [course_code] [--json out.json]
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env'), quiet: true })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

const COURSE = process.argv.find(a => /_for_/.test(a)) || 'eus_for_eng'
const PAGE = 1000

/** Deborah's Basque items, by seed, with the wording she reports hearing. */
const HER_ITEMS = [
  { round: 19, seed: 6, note: 'text "gogoratzen saiatzen ari naiz" correct, LEGO voice says "gogoratu nahian ari naiz"' },
  { round: 20, seed: 7, note: 'both voices chop the r in "gaur"' },
  { round: 31, seed: 11, note: 'Basque says "after finishing", LEGO text says just "after"' },
  { round: 50, seed: 17, note: 'INTRO correct; LEGO alone says "which what it is"' },
  { round: 62, seed: 21, note: 'haren introduced as her — she would REMOVE it' },
  { round: 71, seed: 25, note: 'LEGO "have to go", no person' },
  { round: 75, seed: 26, note: '"ia" pronounced super short' },
  { round: 81, seed: 27, note: 'Build 7 uses hartzea, introduced R82' },
  { round: 83, seed: 28, note: '"as soon as you can" → "as soon as possible"' },
  { round: 84, seed: 28, note: 'INTRO hastea but phrases need hasi' },
  { round: 87, seed: 29, note: 'LEGO text "gogoa dut", voice says "gogoz nago"' },
  { round: 95, seed: 33, note: 'her corrected BUILDS REVERTED (channel D candidate)' },
  { round: 98, seed: 34, note: 'text "hemen dagoenean" correct, audio says "when they are here"' },
]

async function pageAll (buildQuery, label) {
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await buildQuery().range(from, from + PAGE - 1)
    if (error) throw new Error(`${label}: ${error.message}`)
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < PAGE) break
  }
  return rows
}

function norm (t) {
  // Mirror of the DB's normalize_text(): rtrim(lower(trim(t)), '.?!¿¡。？！')
  if (typeof t !== 'string') return ''
  return t.trim().toLowerCase().replace(/[.?!¿¡。？！]+$/u, '')
}

/** What the TTS actually spoke, reconstructed from the boundary array. */
function spokenFromBoundaries (wb) {
  if (!wb) return null
  let arr = wb
  if (typeof arr === 'string') { try { arr = JSON.parse(arr) } catch { return null } }
  if (!Array.isArray(arr) || arr.length === 0) return null
  const words = arr.map(b => b?.word ?? b?.text ?? b?.Word ?? null).filter(w => typeof w === 'string')
  return words.length ? words.join(' ') : null
}

async function main () {
  const seeds = [...new Set(HER_ITEMS.map(i => i.seed))]
  const out = { course: COURSE, generated_for: 'Deborah revert mechanism', seeds, channels: {}, gaps: [] }

  // ---- slots she touched: LEGOs in her seeds, with their bound clips ----
  const legos = await pageAll(() => db.from('course_legos')
    .select('lego_id, seed_number, lego_index, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id')
    .eq('course_code', COURSE).in('seed_number', seeds).order('lego_id'), 'legos')

  const boundIds = new Set()
  for (const l of legos) {
    for (const c of ['known_audio_id', 'target1_audio_id', 'target2_audio_id']) if (l[c]) boundIds.add(l[c])
  }

  // ---- every clip for these seeds' texts, so we can see siblings and ages ----
  const clipIds = [...boundIds]
  const clips = []
  for (let i = 0; i < clipIds.length; i += 200) {
    const { data, error } = await db.from('course_audio')
      .select('id, text, text_normalized, language, role, voice_id, origin, s3_key, duration_ms, audio_revision, created_at, word_boundaries')
      .in('id', clipIds.slice(i, i + 200))
    if (error) throw new Error(`clips: ${error.message}`)
    clips.push(...(data || []))
  }
  const clipById = new Map(clips.map(c => [c.id, c]))

  // ---- CHANNEL C: what the clip claims vs what it spoke; and clip vs LEGO text
  const desync = []
  const textMismatch = []
  for (const l of legos) {
    for (const [role, col] of [['known', 'known_audio_id'], ['target1', 'target1_audio_id'], ['target2', 'target2_audio_id']]) {
      const clip = l[col] ? clipById.get(l[col]) : null
      if (!clip) continue
      const expected = role === 'known' ? l.known_text : l.target_text
      if (norm(clip.text) !== norm(expected)) {
        textMismatch.push({
          lego_id: l.lego_id, seed: l.seed_number, role, audio_id: clip.id,
          lego_text: expected, clip_text: clip.text,
          clip_created_at: clip.created_at, clip_origin: clip.origin, audio_revision: clip.audio_revision
        })
      }
      const spoken = spokenFromBoundaries(clip.word_boundaries)
      if (spoken && norm(spoken) !== norm(clip.text)) {
        desync.push({
          lego_id: l.lego_id, seed: l.seed_number, role, audio_id: clip.id,
          clip_text: clip.text, actually_spoke: spoken, created_at: clip.created_at
        })
      }
    }
  }
  out.channels.C_text_vs_voiced = { clip_text_vs_lego_text: textMismatch, boundaries_vs_clip_text: desync }

  // ---- CHANNEL A: was a bound clip's audio replaced in place after minting? ----
  try {
    const revs = []
    for (let i = 0; i < clipIds.length; i += 200) {
      const { data, error } = await db.from('course_audio_revisions')
        .select('audio_id, revision, created_at, source, reason, accepted_by')
        .in('audio_id', clipIds.slice(i, i + 200)).order('audio_id')
      if (error) throw error
      revs.push(...(data || []))
    }
    out.channels.A_in_place_overwrite = revs.map(r => ({
      ...r,
      clip_created_at: clipById.get(r.audio_id)?.created_at || null,
      overwrote_after_mint: clipById.get(r.audio_id)
        ? new Date(r.created_at) > new Date(clipById.get(r.audio_id).created_at) : null
    }))
  } catch (e) {
    out.gaps.push(`Channel A: course_audio_revisions unreadable — ${e.message}`)
  }

  // ---- CHANNEL B: is an OLDER clip bound while a NEWER one exists for the text? ----
  const wantedNorms = [...new Set(legos.flatMap(l => [norm(l.known_text), norm(l.target_text)]).filter(Boolean))]
  const siblings = []
  for (let i = 0; i < wantedNorms.length; i += 100) {
    const { data, error } = await db.from('course_audio')
      .select('id, text, text_normalized, role, voice_id, origin, created_at, s3_key')
      .eq('course_code', COURSE).in('text_normalized', wantedNorms.slice(i, i + 100)).order('id')
    if (error) throw new Error(`siblings: ${error.message}`)
    siblings.push(...(data || []))
  }
  const byKey = new Map()
  for (const s of siblings) {
    const k = `${s.text_normalized}|${s.role}|${s.voice_id}`
    if (!byKey.has(k)) byKey.set(k, [])
    byKey.get(k).push(s)
  }
  const staleBound = []
  for (const l of legos) {
    for (const [role, col] of [['known', 'known_audio_id'], ['target1', 'target1_audio_id'], ['target2', 'target2_audio_id']]) {
      const clip = l[col] ? clipById.get(l[col]) : null
      if (!clip) continue
      const cands = byKey.get(`${clip.text_normalized}|${clip.role}|${clip.voice_id}`) || []
      const newer = cands.filter(c => c.id !== clip.id && new Date(c.created_at) > new Date(clip.created_at))
      if (newer.length) {
        staleBound.push({
          lego_id: l.lego_id, seed: l.seed_number, role,
          bound: { id: clip.id, created_at: clip.created_at, text: clip.text, origin: clip.origin },
          newer_available: newer.map(c => ({ id: c.id, created_at: c.created_at, text: c.text, origin: c.origin }))
        })
      }
    }
  }
  out.channels.B_older_clip_bound = staleBound

  // ---- CHANNEL D: is R95's Build loss recoverable from a redo snapshot? ----
  try {
    const { data, error } = await db.from('seed_redo_snapshots')
      .select('id, batch_id, course_code, seed_number, created_at, seed_known_text, seed_target_text')
      .eq('course_code', COURSE).order('created_at', { ascending: false })
    if (error) throw error
    out.channels.D_redo_snapshots = data || []
    out.channels.D_seed33_recoverable = (data || []).some(r => r.seed_number === 33)
  } catch (e) {
    out.gaps.push(`Channel D: seed_redo_snapshots unreadable — ${e.message}`)
  }

  // ---- her Builds at seed 33, as they stand now ----
  const builds33 = await pageAll(() => db.from('course_practice_phrases')
    .select('id, seed_number, lego_index, phrase_role, known_text, target_text, created_at')
    .eq('course_code', COURSE).eq('seed_number', 33).order('id'), 'builds33')
  out.seed33_phrases_now = builds33

  const jsonAt = process.argv.indexOf('--json')
  if (jsonAt >= 0) {
    require('fs').writeFileSync(process.argv[jsonAt + 1], JSON.stringify(out, null, 2))
    console.log(`wrote ${process.argv[jsonAt + 1]}`)
  }

  console.log(`\n=== ${COURSE} revert forensics — seeds ${seeds.join(',')} ===`)
  console.log(`legos in scope: ${legos.length}, bound clips: ${clipIds.length}`)
  console.log(`A in-place overwrites of bound clips : ${(out.channels.A_in_place_overwrite || []).filter(r => r.overwrote_after_mint).length}`)
  console.log(`B older clip bound, newer available  : ${out.channels.B_older_clip_bound.length}`)
  console.log(`C clip text != LEGO text             : ${out.channels.C_text_vs_voiced.clip_text_vs_lego_text.length}`)
  console.log(`C boundaries != clip text (desync)   : ${out.channels.C_text_vs_voiced.boundaries_vs_clip_text.length}`)
  console.log(`D redo snapshots for this course     : ${(out.channels.D_redo_snapshots || []).length} (seed33 recoverable: ${out.channels.D_seed33_recoverable})`)
  if (out.gaps.length) console.log(`\nGAPS:\n - ${out.gaps.join('\n - ')}`)
}

if (require.main === module) main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
