#!/usr/bin/env node
/**
 * align-pod0-to-canonical.cjs — make a course's pod-0 queue serve Aran's 2026-08-06
 * canonical English, or serve nothing, but never the old text (Tom's brief
 * 2026-08-06: "make sure the human recording is not doing the older stuff").
 *
 * Written for Welsh, generalised 2026-08-08 for the fleet-wide pod redo. Nothing in
 * the alignment logic was ever language-specific; only the course list, the language
 * name and the output paths were, and all three are now arguments. The course whose
 * known language is not English is NOT yet supported — see the guard in planCourse.
 *
 * WHY THIS AND NOT `pod-dialogue-generator --sync`: sync re-flexes every changed
 * scene through an LLM, i.e. it WRITES TARGET TEXT as a side effect of aligning.
 * This tool moves English, speakers and ordering only; translation is a separate,
 * separately-reviewable step that writes into the empty slots this run leaves.
 *
 * The existing target_text is sacred:
 *   - it is never overwritten with a different target line,
 *   - it is never invented,
 *   - it is carried forward ONLY onto a slot whose English is byte-for-byte the
 *     line it was written against (survivors, plus numerals_only rewords where
 *     only the English spelling of a number changed),
 *   - everywhere else the slot is left with EMPTY target_text (the column is NOT
 *     NULL), which pods-plan.cjs's `entry.voiceId === voiceId && target` guard turns
 *     into "not recordable yet" rather than "recordable with the wrong words".
 *   - every target line that is not carried forward is archived verbatim, with its
 *     old and new English side by side, for a translator to work from.
 *
 * Audio is NEVER deleted and never regenerated. A take whose line changed has its
 * pointer dropped from the slot (the course_audio row itself is untouched and is
 * listed in the archive) so the recorder is not told "already done" about a line
 * that now reads differently. Make-before-break, CLAUDE.md §Approval gates.
 *
 * DRY RUN BY DEFAULT. Pass --apply to write. Every row carries a before-state
 * assertion; any drift aborts the whole run before a single write.
 *
 *   node tools/pods/align-pod0-to-canonical.cjs --course=deu_at_for_eng
 *   node tools/pods/align-pod0-to-canonical.cjs --course=deu_at_for_eng --apply
 *
 * Restoring the pre-alignment state needs the archive the run wrote, so point
 * --archive-dir at it. The 2026-08-06 Welsh run's archive lives at its own path:
 *   node tools/pods/align-pod0-to-canonical.cjs --course=cym_n_for_eng \
 *     --archive-dir=docs/pods/pod0-welsh-prealign-archive-2026-08-06 --restore-from-archive
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
const { diffPod, norm } = require('./pod0-recording-diff.cjs')

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const CANONICAL_STAMP = '2026-08-06'
const REPO = path.join(__dirname, '..', '..')

const APPLY = process.argv.includes('--apply')
const arg = (name) => {
  const a = process.argv.find(x => x.startsWith(`--${name}=`))
  return a ? a.split('=').slice(1).join('=') : null
}
// Which pod slug this run rewrites. Defaults to the learner-facing `pod-0`, which
// is right for a course that is not live. On a LIVE course, aligning in place would
// hand real learners ~128 rows with no target text and no audio for as long as
// translation and generation take — so the Welsh precedent (2026-08-06) is to clone
// pod-0 to a parallel slug and align THAT. Learner-facing reads query the exact id
// `<course>:pod-0` (player-vue useListeningPods.ts), so a different slug is invisible
// to them. tools/pods/clone-pod.cjs makes the clone; this flag points the align at it.
const POD_SLUG = arg('pod-slug') || 'pod-0'
// No default course list: this tool now writes to any course, so the caller names it.
const COURSES = (arg('course') || '').split(',').map(s => s.trim()).filter(Boolean)
if (!COURSES.length) {
  console.error('FAILED: --course=<code>[,<code>…] is required')
  process.exit(1)
}
const ARCHIVE_DIR = path.isAbsolute(arg('archive-dir') || '')
  ? arg('archive-dir')
  : path.join(REPO, arg('archive-dir') || path.join('docs', 'pods', 'pod0-prealign-archive'))

// Aran's canonical writes the literal token "[target language]" on several lines,
// exactly as the previous canonical did. Substitution is the established pipeline
// behaviour (pod-dialogue-generator.cjs:164 does the same replace before it renders
// a scene), and a recorder must never be handed a bracketed token to read aloud.
//
// The name is NOT guessed from the course code. Every served pod already resolved it
// once — the canonical's placeholder lines all read "… I'm learning [target language].
// …" — so the pod's own English is read back and the majority answer used. Getting
// this wrong is not cosmetic: substituting the wrong name makes those lines diff as
// rewordings, which silently discards a perfectly good target line and its take.
// Override with --language-name="…" when a pod has no placeholder line to learn from.
const LANGUAGE_NAME_OVERRIDE = arg('language-name')
const PLACEHOLDER_TOKEN = /\[target language\]/gi
// Separate, non-global copy: a /g regex carries lastIndex across .test() calls, so
// reusing PLACEHOLDER_TOKEN to probe would return true/false on alternate lines.
const HAS_PLACEHOLDER = /\[target language\]/i
const LEARNING_RE = /i'm learning ([^.]+)\./i

function detectLanguageName(servedRows) {
  if (LANGUAGE_NAME_OVERRIDE) return LANGUAGE_NAME_OVERRIDE
  const counts = new Map()
  for (const r of servedRows) {
    const m = LEARNING_RE.exec(String(r.known_text || ''))
    if (m) {
      const name = m[1].trim()
      counts.set(name, (counts.get(name) || 0) + 1)
    }
  }
  if (!counts.size) return null
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

const substitutePlaceholder = (t, name) =>
  name ? String(t == null ? '' : t).replace(PLACEHOLDER_TOKEN, name) : String(t == null ? '' : t)

const slotId = (course, scene, sentence) =>
  `${course}:${POD_SLUG}:SC${String(scene).padStart(2, '0')}-S${String(sentence).padStart(3, '0')}`

/** Same basis as pod-dialogue-generator.cjs sceneHash() — the sync diff key. */
function sceneHash(lines) {
  const basis = lines.map(l => `${l.speaker}${l.english_text}`).join('')
  return crypto.createHash('sha1').update(basis).digest('hex').slice(0, 16)
}

async function planCourse(course, canonRaw) {
  // diffPod reads served.known_text against canon.english_text, so this tool is only
  // correct where the known language IS English. For an eng_for_* or X_for_jpn course
  // the English sits in target_text and the whole carry-forward logic inverts; that is
  // a separate piece of work and refusing is cheaper than a plausible wrong answer.
  if (!course.endsWith('_for_eng')) {
    throw new Error(`${course}: known language is not English — this aligner compares ` +
      'known_text against the canonical English and would mis-carry every line. Not supported.')
  }
  const podId = `${course}:${POD_SLUG}`
  const { data: pod, error: pe } = await db.from('listening_pods').select('*').eq('id', podId).single()
  if (pe) throw new Error(`load pod ${podId}: ${pe.message}`)
  const { data: served, error: se } = await db.from('listening_pod_sentences')
    .select('*').eq('pod_id', podId).order('global_order')
  if (se) throw new Error(`load sentences ${podId}: ${se.message}`)

  const languageName = detectLanguageName(served)
  if (!languageName && canonRaw.some(r => HAS_PLACEHOLDER.test(r.english_text))) {
    throw new Error(`${course}: the canonical carries "[target language]" but this pod has no ` +
      'line to learn the name from. Pass --language-name="…" rather than shipping the token.')
  }
  const canon = canonRaw.map(r => ({ ...r, english_text: substitutePlaceholder(r.english_text, languageName) }))

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
      target_audio_id: r.target_audio_id, known_audio_id: r.known_audio_id,
    },
    // Same nine-column shape as every other payload row (see writeRows), with the
    // text blanked and the ordering parked past the canonical range, so the row can
    // never re-enter any queue.
    after: {
      id: r.id, pod_id: podId,
      scene_number: r.scene_number, sentence_number: r.sentence_number,
      global_order: 90000 + r.global_order, speaker: r.speaker,
      known_text: '', target_text: '',
      target_audio_id: null, known_audio_id: null,
    },
  }))

  // Target text that is NOT carried forward — the translator's working set.
  const orphanedTarget = []
  for (const r of d.detail.reworded) {
    if (r.subtype === 'numerals_only') continue
    orphanedTarget.push({
      reason: `reworded:${r.subtype}`, similarity: r.similarity,
      old_row_id: r.served.id, old_scene: r.served.scene_number, old_sentence: r.served.sentence_number,
      new_slot_id: slotId(course, r.canon.scene_number, r.canon.sentence_number),
      new_scene: r.canon.scene_number, new_sentence: r.canon.sentence_number,
      old_english: r.served.known_text, new_english: r.canon.english_text,
      target_written_for_old_english: r.served.target_text,
      target_audio_id_dropped: r.served.target_audio_id || null,
      known_audio_id_dropped: r.served.known_audio_id || null,
    })
  }
  for (const r of d.detail.stale) {
    orphanedTarget.push({
      reason: 'stale', old_row_id: r.id, old_scene: r.scene_number, old_sentence: r.sentence_number,
      new_slot_id: null, old_english: r.known_text, new_english: null,
      target_written_for_old_english: r.target_text,
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
        'tools/pods/align-pod0-to-canonical.cjs. Target text was carried forward ' +
        'only where the English is unchanged; every other slot is deliberately NULL and is ' +
        'not recordable until the target text is written.',
    },
  }

  return { course, podId, pod, served, diff: d, ops, surplus, orphanedTarget, podUpdate, sections }
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
  // Hence: every payload row is built to exactly the same nine-column shape.
  const COLUMNS = ['id', 'pod_id', 'scene_number', 'sentence_number', 'global_order',
    'speaker', 'known_text', 'target_text', 'target_audio_id', 'known_audio_id']
  // The NOT NULL columns with no database default.
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
    // Always 'pod-0': this is the CANONICAL source Aran wrote, not the destination
    // pod being rewritten. --pod-slug moves where we write, never what we read.
    .select('*').eq('pod_slug', 'pod-0').order('global_order')
  if (error) throw error
  if (!canon.length) throw new Error('canonical_pod_scenarios has no pod-0 rows — refusing to align')

  fs.mkdirSync(ARCHIVE_DIR, { recursive: true })

  const summary = []
  for (const course of COURSES) {
    const p = await planCourse(course, canon)

    // Full-fidelity archive of the pre-alignment rows, ALWAYS, dry run included.
    // Nothing below is recoverable from git without it.
    fs.writeFileSync(path.join(ARCHIVE_DIR, `${course}-pod0-sentences-prealign.json`),
      JSON.stringify({ pod: p.pod, sentences: p.served }, null, 1))
    fs.writeFileSync(path.join(ARCHIVE_DIR, `${course}-target-needing-translation.json`),
      JSON.stringify(p.orphanedTarget, null, 1))
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
      target_text: {
        carried_forward: p.ops.filter(o => o.carried.target).length,
        slots_left_without_target: p.ops.filter(o => !o.carried.target).length,
        lines_needing_translation_or_review: p.orphanedTarget.length,
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
