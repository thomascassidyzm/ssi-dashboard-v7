#!/usr/bin/env node
/**
 * align-welsh-pod0-to-canonical.cjs — make the Welsh pod-0 human-recording queue
 * serve Aran's 2026-08-06 canonical English, or serve nothing, but never the old
 * text (Tom's brief 2026-08-06: "make sure the human recording is not doing the
 * older stuff").
 *
 * WHY THIS AND NOT `pod-dialogue-generator --sync`: sync re-flexes every changed
 * scene through an LLM, i.e. it WRITES WELSH. Nobody has authorised a machine to
 * translate Aran's new lines. This tool moves English, speakers and ordering only.
 *
 * The Welsh target_text is sacred:
 *   - it is never overwritten with a different Welsh line,
 *   - it is never invented,
 *   - it is carried forward ONLY onto a slot whose English is byte-for-byte the
 *     line it was written against (survivors, plus numerals_only rewords where
 *     only the English spelling of a number changed),
 *   - everywhere else the slot is left with EMPTY target_text (the column is NOT
 *     NULL), which pods-plan.cjs's `entry.voiceId === voiceId && target` guard turns
 *     into "not recordable yet" rather than "recordable with the wrong words".
 *   - every Welsh line that is not carried forward is archived verbatim, with its
 *     old and new English side by side, for a human translator to work from.
 *
 * Audio is NEVER deleted and never regenerated. A take whose line changed has its
 * pointer dropped from the slot (the course_audio row itself is untouched and is
 * listed in the archive) so the recorder is not told "already done" about a line
 * that now reads differently. Make-before-break, CLAUDE.md §Approval gates.
 *
 * DRY RUN BY DEFAULT. Pass --apply to write. Every row carries a before-state
 * assertion; any drift aborts the whole run before a single write.
 *
 *   node tools/pods/align-welsh-pod0-to-canonical.cjs            # dry run
 *   node tools/pods/align-welsh-pod0-to-canonical.cjs --apply
 *   node tools/pods/align-welsh-pod0-to-canonical.cjs --course=cym_n_for_eng
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
const { diffPod, norm } = require('./pod0-recording-diff.cjs')

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const POD_SLUG = 'pod-0'
const CANONICAL_STAMP = '2026-08-06'
const DEFAULT_COURSES = ['cym_n_for_eng', 'cym_s_for_eng']
const OUT_DIR = path.join(__dirname, '..', '..', 'docs', 'pods', 'welsh-recording-pack')
const ARCHIVE_DIR = path.join(__dirname, '..', '..', 'docs', 'pods', 'pod0-welsh-prealign-archive-2026-08-06')

const APPLY = process.argv.includes('--apply')
const courseArg = process.argv.find(a => a.startsWith('--course='))
const COURSES = courseArg ? [courseArg.split('=')[1]] : DEFAULT_COURSES

// Aran's canonical writes the literal token "[target language]" on 5 lines, exactly
// as the previous canonical did. Substitution is the established pipeline behaviour
// (pod-dialogue-generator.cjs:164 does the same replace before it renders a scene),
// and a recorder must never be handed a bracketed token to read aloud. The served
// cym_s rows already say "Welsh"; the served cym_n rows say "Northern Welsh", which
// is not what a learner would actually say — so "Welsh" is the default for both.
// DECISION FOR TOM/ARAN, override with --language-name="…".
const langArg = process.argv.find(a => a.startsWith('--language-name='))
const LANGUAGE_NAME = langArg ? langArg.split('=').slice(1).join('=') : 'Welsh'

const substitutePlaceholder = (t) =>
  String(t == null ? '' : t).replace(/\[target language\]/gi, LANGUAGE_NAME)

const slotId = (course, scene, sentence) =>
  `${course}:${POD_SLUG}:SC${String(scene).padStart(2, '0')}-S${String(sentence).padStart(3, '0')}`

/** Same basis as pod-dialogue-generator.cjs sceneHash() — the sync diff key. */
function sceneHash(lines) {
  const basis = lines.map(l => `${l.speaker}${l.english_text}`).join('')
  return crypto.createHash('sha1').update(basis).digest('hex').slice(0, 16)
}

async function planCourse(course, canonRaw) {
  const canon = canonRaw.map(r => ({ ...r, english_text: substitutePlaceholder(r.english_text) }))
  const podId = `${course}:${POD_SLUG}`
  const { data: pod, error: pe } = await db.from('listening_pods').select('*').eq('id', podId).single()
  if (pe) throw new Error(`load pod ${podId}: ${pe.message}`)
  const { data: served, error: se } = await db.from('listening_pod_sentences')
    .select('*').eq('pod_id', podId).order('global_order')
  if (se) throw new Error(`load sentences ${podId}: ${se.message}`)

  const d = diffPod(served, canon)
  const targetSafe = new Set(d.carry.targetSafe)
  const knownSafe = new Set(d.carry.knownSafe)

  // canonical global_order → the served row it came from, if any
  const sourceFor = new Map()
  for (const p of d.detail.survives) sourceFor.set(p.canon.global_order, { row: p.served, kind: 'survives' })
  for (const r of d.detail.reworded) sourceFor.set(r.canon.global_order, { row: r.served, kind: r.subtype })

  const ops = []
  const byId = new Map(served.map(r => [r.id, r]))
  const claimed = new Set()

  for (const c of canon) {
    const id = slotId(course, c.scene_number, c.sentence_number)
    const src = sourceFor.get(c.global_order) || null
    const carryTarget = !!(src && targetSafe.has(src.row.id))
    const carryKnown = !!(src && knownSafe.has(src.row.id))
    const existing = byId.get(id) || null
    if (existing) claimed.add(id)

    const desired = {
      id,
      pod_id: podId,
      scene_number: c.scene_number,
      sentence_number: c.sentence_number,
      global_order: c.global_order,
      speaker: c.speaker,
      known_text: c.english_text,
      // NOT NULL column: '' is the "no target text yet" value. pods-plan.cjs joins
      // and trims target_text and gates on truthiness, so '' drops the line out of
      // every recording queue exactly as a NULL would — schema-legal, same effect.
      target_text: carryTarget ? src.row.target_text : '',
      // The flag travels WITH the text it describes. Carrying the words onto a new
      // slot and letting the flag take the column default said "a human approved
      // this" about Welsh no human had read. No carried text means no target text
      // at all, so false.
      target_text_draft: carryTarget ? !!src.row.target_text_draft : false,
      target_audio_id: carryTarget ? src.row.target_audio_id : null,
      known_audio_id: carryKnown ? src.row.known_audio_id : null,
    }
    ops.push({
      op: existing ? 'update' : 'insert',
      id,
      before: existing && {
        scene_number: existing.scene_number, sentence_number: existing.sentence_number,
        global_order: existing.global_order, speaker: existing.speaker,
        known_text: existing.known_text, target_text: existing.target_text,
        target_text_draft: existing.target_text_draft,
        target_audio_id: existing.target_audio_id, known_audio_id: existing.known_audio_id,
      },
      after: desired,
      bucket: src ? src.kind : 'new',
      carried: { target: carryTarget, known: carryKnown },
      source_row_id: src ? src.row.id : null,
    })
  }

  // Rows the new canonical has no slot for. NOT deleted — blanked, so pods-plan's
  // `if (target)` / `if (known)` guards drop them from every queue. Deletion is a
  // recommendation for Tom and Aran, never an action here.
  const surplus = served.filter(r => !claimed.has(r.id)).map(r => ({
    op: 'retire', id: r.id,
    before: {
      scene_number: r.scene_number, sentence_number: r.sentence_number,
      global_order: r.global_order, speaker: r.speaker,
      known_text: r.known_text, target_text: r.target_text,
      target_text_draft: r.target_text_draft,
      target_audio_id: r.target_audio_id, known_audio_id: r.known_audio_id,
    },
    // Same shape as every other payload row (see writeRows), with the text blanked
    // and the ordering parked past the canonical range, so the row can never
    // re-enter any queue. No text left, so nothing for the draft flag to describe.
    after: {
      id: r.id, pod_id: podId,
      scene_number: r.scene_number, sentence_number: r.sentence_number,
      global_order: 90000 + r.global_order, speaker: r.speaker,
      known_text: '', target_text: '', target_text_draft: false,
      target_audio_id: null, known_audio_id: null,
    },
  }))

  // Welsh that is NOT carried forward — the translator's working set.
  const orphanedWelsh = []
  for (const r of d.detail.reworded) {
    if (r.subtype === 'numerals_only') continue
    orphanedWelsh.push({
      reason: `reworded:${r.subtype}`, similarity: r.similarity,
      old_row_id: r.served.id, old_scene: r.served.scene_number, old_sentence: r.served.sentence_number,
      new_slot_id: slotId(course, r.canon.scene_number, r.canon.sentence_number),
      new_scene: r.canon.scene_number, new_sentence: r.canon.sentence_number,
      old_english: r.served.known_text, new_english: r.canon.english_text,
      welsh_written_for_old_english: r.served.target_text,
      target_audio_id_dropped: r.served.target_audio_id || null,
      known_audio_id_dropped: r.served.known_audio_id || null,
    })
  }
  for (const r of d.detail.stale) {
    orphanedWelsh.push({
      reason: 'stale', old_row_id: r.id, old_scene: r.scene_number, old_sentence: r.sentence_number,
      new_slot_id: null, old_english: r.known_text, new_english: null,
      welsh_written_for_old_english: r.target_text,
      target_audio_id_dropped: r.target_audio_id || null,
      known_audio_id_dropped: r.known_audio_id || null,
    })
  }

  // Pod header: 22 scenes, and scene_hashes stamped against Aran's canonical so a
  // later `pod-dialogue-generator --sync` sees the English as current.
  const byScene = new Map()
  for (const c of canon) {
    if (!byScene.has(c.scene_number)) byScene.set(c.scene_number, [])
    byScene.get(c.scene_number).push(c)
  }
  const sections = [...byScene.entries()].sort((a, b) => a[0] - b[0]).map(([number, lines]) => ({
    number,
    label: lines[0].scene_label || null,
    title: lines[0].scene_title || null,
    subtitle: lines[0].scene_subtitle || null,
    sentence_count: lines.length,
  }))
  const scene_hashes = {}
  for (const [number, lines] of byScene) scene_hashes[String(number)] = sceneHash(lines)

  const podUpdate = {
    id: podId,
    metadata: {
      ...(pod.metadata || {}),
      sections,
      scene_hashes,
      generated_from: 'canonical_pod_scenarios',
      canonical_aligned_at: CANONICAL_STAMP,
      canonical_alignment_note:
        'English, speakers and ordering aligned to Aran\'s 2026-08-06 pod-0 canonical by ' +
        'tools/pods/align-welsh-pod0-to-canonical.cjs. Welsh target_text was carried forward ' +
        'only where the English is unchanged; every other slot is deliberately NULL and is ' +
        'not recordable until a human writes the Welsh.',
    },
  }

  return { course, podId, pod, served, diff: d, ops, surplus, orphanedWelsh, podUpdate, sections }
}

async function applyCourse(p) {
  // Before-state assertions: re-read and abort the whole run on any drift.
  const { data: fresh, error } = await db.from('listening_pod_sentences')
    .select('*').eq('pod_id', p.podId)
  if (error) throw new Error(`re-read ${p.podId}: ${error.message}`)
  const freshById = new Map(fresh.map(r => [r.id, r]))
  if (fresh.length !== p.served.length) {
    throw new Error(`DRIFT ${p.podId}: row count ${p.served.length} → ${fresh.length}; aborting`)
  }
  for (const op of [...p.ops, ...p.surplus]) {
    if (!op.before) {
      if (freshById.has(op.id)) throw new Error(`DRIFT ${op.id}: expected absent, found present`)
      continue
    }
    const now = freshById.get(op.id)
    if (!now) throw new Error(`DRIFT ${op.id}: expected present, found absent`)
    for (const k of Object.keys(op.before)) {
      if (String(now[k]) !== String(op.before[k])) {
        throw new Error(`DRIFT ${op.id}.${k}: expected ${JSON.stringify(op.before[k])}, found ${JSON.stringify(now[k])}`)
      }
    }
  }

  // PostgREST upsert is INSERT … ON CONFLICT, so every payload row must satisfy
  // every NOT NULL column — and the 100-row chunks below are NOT one transaction.
  // A row that fails validation in chunk 3 leaves chunks 1-2 written. So the whole
  // payload is validated here, before the first write, and never mid-flight.
  //
  // The second trap is that PostgREST builds ONE multi-row INSERT per batch whose
  // column list is the union of the keys in that batch — so a row carrying an extra
  // key writes an explicit NULL into that column for every other row in the batch.
  // Hence: every payload row is built to exactly the same column shape.
  //
  // target_text_draft is in this list precisely BECAUSE it has a default: leaving it
  // out let every inserted row take `false`, which the recording queue reads as
  // "proofread", even on rows that had just been handed unread carried-over text.
  const COLUMNS = ['id', 'pod_id', 'scene_number', 'sentence_number', 'global_order',
    'speaker', 'known_text', 'target_text', 'target_text_draft',
    'target_audio_id', 'known_audio_id']
  // The NOT NULL columns that must be spelled out by the planner, not defaulted.
  const REQUIRED = COLUMNS.filter(c => c !== 'target_audio_id' && c !== 'known_audio_id')
  const shape = (row) => Object.fromEntries(COLUMNS.map(c => [c, row[c] === undefined ? null : row[c]]))
  const payload = [...p.ops.map(o => o.after), ...p.surplus.map(o => o.after)].map(shape)
  for (const row of payload) {
    for (const k of REQUIRED) {
      if (row[k] === null) {
        throw new Error(`PREFLIGHT ${row.id}: NOT NULL column "${k}" missing from payload; nothing written`)
      }
    }
  }

  // Two-phase, because UNIQUE (pod_id, global_order) collides mid-move: park every
  // existing row's ordering out of the way first, then write the final shape.
  // Whole row echoed back (PostgREST upsert takes the insert path, so every NOT NULL
  // column must be present) with only global_order moved out of the canonical range.
  const parked = p.served.map((r, i) => ({ ...r, global_order: 100000 + i }))
  for (let i = 0; i < parked.length; i += 100) {
    const { error: e } = await db.from('listening_pod_sentences').upsert(parked.slice(i, i + 100), { onConflict: 'id' })
    if (e) throw new Error(`park: ${e.message}`)
  }

  for (let i = 0; i < payload.length; i += 100) {
    const { error: e } = await db.from('listening_pod_sentences').upsert(payload.slice(i, i + 100), { onConflict: 'id' })
    if (e) throw new Error(`write rows: ${e.message}`)
  }
  const { error: pe } = await db.from('listening_pods')
    .update({ metadata: p.podUpdate.metadata, updated_at: new Date().toISOString() })
    .eq('id', p.podId)
  if (pe) throw new Error(`write pod header: ${pe.message}`)
}

/**
 * Put a pod back exactly as the pre-alignment archive recorded it. The chunked
 * upserts above are not one transaction, so a mid-flight failure has to have a
 * proven way back; this is it, and it is verified field-by-field before it returns.
 */
async function restoreFromArchive(course) {
  const podId = `${course}:${POD_SLUG}`
  const file = path.join(ARCHIVE_DIR, `${course}-pod0-sentences-prealign.json`)
  const a = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (!a.sentences || !a.sentences.length) throw new Error(`${file}: no sentences — refusing to restore`)

  let { error } = await db.from('listening_pod_sentences').delete().eq('pod_id', podId)
  if (error) throw new Error(`restore delete: ${error.message}`)
  for (let i = 0; i < a.sentences.length; i += 100) {
    ({ error } = await db.from('listening_pod_sentences').insert(a.sentences.slice(i, i + 100)))
    if (error) throw new Error(`restore insert: ${error.message}`)
  }
  ;({ error } = await db.from('listening_pods')
    .update({ metadata: a.pod.metadata, speakers: a.pod.speakers, title: a.pod.title, source_file: a.pod.source_file })
    .eq('id', podId))
  if (error) throw new Error(`restore pod header: ${error.message}`)

  const { data: now } = await db.from('listening_pod_sentences').select('*').eq('pod_id', podId)
  const byId = new Map((now || []).map(r => [r.id, r]))
  let differing = 0
  for (const r of a.sentences) {
    const n = byId.get(r.id)
    if (!n) { differing++; continue }
    for (const k of Object.keys(r)) {
      if (k === 'updated_at') continue
      if (JSON.stringify(n[k]) !== JSON.stringify(r[k])) differing++
    }
  }
  if (differing) throw new Error(`restore ${podId}: ${differing} fields still differ from the archive`)
  return { course, rows: (now || []).length, verified: true }
}

async function main() {
  if (process.argv.includes('--restore-from-archive')) {
    const out = []
    for (const course of COURSES) out.push(await restoreFromArchive(course))
    console.log(JSON.stringify({ mode: 'RESTORED FROM ARCHIVE', out }, null, 2))
    return
  }

  const { data: canon, error } = await db.from('canonical_pod_scenarios')
    .select('*').eq('pod_slug', POD_SLUG).order('global_order')
  if (error) throw error
  if (!canon.length) throw new Error('canonical_pod_scenarios has no pod-0 rows — refusing to align')

  fs.mkdirSync(ARCHIVE_DIR, { recursive: true })
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const summary = []
  for (const course of COURSES) {
    const p = await planCourse(course, canon)

    // Full-fidelity archive of the pre-alignment rows, ALWAYS, dry run included.
    // Nothing below is recoverable from git without it.
    fs.writeFileSync(path.join(ARCHIVE_DIR, `${course}-pod0-sentences-prealign.json`),
      JSON.stringify({ pod: p.pod, sentences: p.served }, null, 1))
    fs.writeFileSync(path.join(ARCHIVE_DIR, `${course}-welsh-needing-translation.json`),
      JSON.stringify(p.orphanedWelsh, null, 1))
    const dr = { ...p.diff }; delete dr.detail; delete dr.carry
    fs.writeFileSync(path.join(ARCHIVE_DIR, `${course}-diff-summary.json`), JSON.stringify(dr, null, 1))
    fs.writeFileSync(path.join(ARCHIVE_DIR, `${course}-align-${APPLY ? 'applied' : 'dryrun'}-log.json`),
      JSON.stringify({ ops: p.ops, surplus: p.surplus }, null, 1))

    if (APPLY) await applyCourse(p)

    summary.push({
      course,
      apply: APPLY,
      diff: dr.buckets,
      reworded_subtypes: dr.reworded_subtypes,
      rows: {
        updated: p.ops.filter(o => o.op === 'update').length,
        inserted: p.ops.filter(o => o.op === 'insert').length,
        retired_not_deleted: p.surplus.length,
        final_total: p.ops.length,
      },
      welsh: {
        carried_forward: p.ops.filter(o => o.carried.target).length,
        slots_left_without_welsh: p.ops.filter(o => !o.carried.target).length,
        welsh_lines_needing_human_translation_or_review: p.orphanedWelsh.length,
      },
      takes: {
        target_pointers_kept: p.ops.filter(o => o.after.target_audio_id).length,
        known_pointers_kept: p.ops.filter(o => o.after.known_audio_id).length,
        target_pointers_dropped: dr.takes.target_invalidated,
        known_pointers_dropped: dr.takes.known_invalidated,
      },
      scenes: p.sections.length,
    })
  }
  console.log(JSON.stringify({ mode: APPLY ? 'APPLIED' : 'DRY RUN', canonical_lines: canon.length, summary }, null, 2))
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
