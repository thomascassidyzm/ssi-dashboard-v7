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
 * CLONE-FIRST IS AUTOMATIC ON A LIVE COURSE (2026-08-11). The tool reads
 * `courses.status` and refuses to rewrite the learner-facing `pod-0` of any course
 * that is `released` or `beta`; with --apply it clones to `pod-0-unrecorded` and
 * aligns the clone instead. Overrides, in decreasing order of danger:
 *   --force            rewrite the live pod-0 anyway (prints a warning; this is the
 *                      path that took Welsh listening pods down for five days)
 *   --no-auto-clone    refuse instead of cloning, so a caller can read the verdict
 *   --pod-slug=<slug>  name the destination explicitly; any slug other than `pod-0`
 *                      is off the learner path and the guard steps aside
 *   --clone-slug=<s>   where auto-clone puts the copy (default `pod-0-unrecorded`)
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
const { execFileSync } = require('child_process')
const { createClient } = require('@supabase/supabase-js')
const { diffPod, norm } = require('./pod0-recording-diff.cjs')
const { carrySplitAudio, SPLIT_AUDIO_FIELDS } = require('./split-audio-inheritance.cjs')

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
//
// The default is NOT taken on trust any more. `pod-0` is the one slug the player
// reads, so an in-place align on a live course is the Welsh outage by construction
// (measured 2026-08-11: 16-30% of target-audio pointers and 20-41% of English-audio
// pointers dropped per course). resolveSlug() below turns that default into a
// per-course decision keyed on `courses.status`, and this constant is only the
// caller's explicit request.
const POD_SLUG_REQUESTED = arg('pod-slug')
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
// Both contractions, because the served pods are not uniform: the 2026-08-11 fleet dry
// run found hin/hye/swa write "I am learning Hindi." where every other course writes
// "I'm learning Danish." A pod that states its own language name in full sentences must
// not be refused over an apostrophe — the alternative is hand-feeding --language-name,
// i.e. guessing, which is the one thing this detector exists to avoid.
const LEARNING_RE = /i(?:'m| am) learning ([^.]+)\./i

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

const slotId = (course, slug, scene, sentence) =>
  `${course}:${slug}:SC${String(scene).padStart(2, '0')}-S${String(sentence).padStart(3, '0')}`

// ---------------------------------------------------------------------------
// The released-course guard.
//
// Aligning rewrites a pod's English to canon and deliberately blanks the target
// text of every line whose English changed. On a `draft` course that costs nothing.
// On a course learners are actually in, it empties the pod they are reading — which
// is exactly what happened to Welsh on 2026-08-06 and stayed broken for five days.
//
// `beta` is inside the wall with `released`: the estate's beta courses are served by
// the same player to real beta learners, and the outage is indistinguishable to them.
// The only status treated as safe for an in-place rewrite is `draft` — which is what
// made the deu_at_for_eng in-place align legitimate.
const LIVE_STATUSES = new Set(['released', 'beta'])
// The one slug the player asks for, hardcoded: player-vue useListeningPods.ts builds
// `${course}:pod-0`. Any other slug is invisible to learners, which is what makes the
// clone path safe.
const LEARNER_FACING_SLUG = 'pod-0'

// The live canonical slate — a `canonical_pod_scenarios` slug, renamed from
// 'pod-0' to 'pod-1' on 2026-09-01. Deliberately NOT the same thing as the
// learner-facing slug above, which is per-course and still 'pod-0' on most.
const CANONICAL_SLUG = 'pod-1'
const CLONE_SLUG = arg('clone-slug') || 'pod-0-unrecorded'
const FORCE_IN_PLACE = process.argv.includes('--force')
// Refuse rather than clone. For a caller that wants the guard's verdict without the
// side effect of creating a pod.
const NO_AUTO_CLONE = process.argv.includes('--no-auto-clone')

/**
 * Decide which slug this course's align may write to, and make it exist.
 *
 * Returns { slug, status, cloned, reason }. Never returns the learner-facing slug for
 * a live course unless --force was passed, and says so loudly when it does.
 */
async function resolveSlug(course) {
  const { data: c, error } = await db.from('courses')
    .select('course_code,status').eq('course_code', course).single()
  if (error) throw new Error(`load course ${course}: ${error.message}`)
  const status = c.status
  const live = LIVE_STATUSES.has(status)

  // An explicit --pod-slug that is not the learner-facing one is already off the
  // live path; nothing to guard. This is how a caller re-aligns an existing clone.
  if (POD_SLUG_REQUESTED && POD_SLUG_REQUESTED !== LEARNER_FACING_SLUG) {
    return { slug: POD_SLUG_REQUESTED, status, cloned: false, reason: 'caller named a non-learner-facing slug' }
  }
  if (!live) {
    return { slug: POD_SLUG_REQUESTED || LEARNER_FACING_SLUG, status, cloned: false, reason: `status=${status} is not live; in-place is safe` }
  }
  if (FORCE_IN_PLACE) {
    console.error(`WARNING ${course}: status=${status} and --force was passed — aligning the ` +
      'LEARNER-FACING pod-0 in place. Learners will see blank lines until translation and ' +
      'generation catch up. This is the Welsh outage path.')
    return { slug: LEARNER_FACING_SLUG, status, cloned: false, reason: '--force overrode the live-course guard' }
  }
  if (NO_AUTO_CLONE) {
    throw new Error(`${course}: status=${status} is live and --pod-slug was not given. ` +
      `Refusing to align ${course}:${LEARNER_FACING_SLUG} in place. Clone first ` +
      `(tools/pods/clone-pod.cjs --course=${course} --to=${CLONE_SLUG} --apply) or pass --force.`)
  }

  // Clone-first, automatically. clone-pod.cjs is idempotent-by-refusal: it aborts if
  // the destination already holds sentence rows, so a re-run over an existing clone
  // must NOT re-clone. Check first and reuse.
  const dstId = `${course}:${CLONE_SLUG}`
  const { count, error: ce } = await db.from('listening_pod_sentences')
    .select('id', { count: 'exact', head: true }).eq('pod_id', dstId)
  if (ce) throw new Error(`probe ${dstId}: ${ce.message}`)
  if (count > 0) {
    return { slug: CLONE_SLUG, status, cloned: false, reason: `clone ${dstId} already exists with ${count} rows; aligning that` }
  }
  if (!APPLY) {
    // Dry run must not create a pod. Report what would happen and plan against the
    // live rows, which are byte-identical to what the clone would hold.
    return { slug: LEARNER_FACING_SLUG, status, cloned: false, planned_clone: dstId,
      reason: `status=${status}: --apply would clone to ${dstId} first; this dry run plans against ${course}:${LEARNER_FACING_SLUG}` }
  }
  execFileSync(process.execPath,
    [path.join(__dirname, 'clone-pod.cjs'), `--course=${course}`, `--to=${CLONE_SLUG}`, '--apply'],
    { stdio: 'inherit', cwd: REPO })
  return { slug: CLONE_SLUG, status, cloned: true, reason: `status=${status}: cloned ${course}:${LEARNER_FACING_SLUG} → ${dstId} before aligning` }
}

/** Same basis as pod-dialogue-generator.cjs sceneHash() — the sync diff key. */
function sceneHash(lines) {
  const basis = lines.map(l => `${l.speaker}${l.english_text}`).join('')
  return crypto.createHash('sha1').update(basis).digest('hex').slice(0, 16)
}

async function planCourse(course, canonRaw, slug) {
  // diffPod reads served.known_text against canon.english_text, so this tool is only
  // correct where the known language IS English. For an eng_for_* or X_for_jpn course
  // the English sits in target_text and the whole carry-forward logic inverts; that is
  // a separate piece of work and refusing is cheaper than a plausible wrong answer.
  if (!course.endsWith('_for_eng')) {
    throw new Error(`${course}: known language is not English — this aligner compares ` +
      'known_text against the canonical English and would mis-carry every line. Not supported.')
  }
  const podId = `${course}:${slug}`
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
    const id = slotId(course, slug, c.scene_number, c.sentence_number)
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
      // this" about text no human had read — the June Welsh that reached Aran's
      // queue unbadged. No carried text means no target text at all, so false.
      target_text_draft: carryTarget ? !!src.row.target_text_draft : false,
      target_audio_id: carryTarget ? src.row.target_audio_id : null,
      known_audio_id: carryKnown ? src.row.known_audio_id : null,
      // The other FOUR audio slots, by the same rule as the whole-turn ones.
      // Before 2026-08-24 they were simply absent from this payload, so a slot
      // whose conversation had been replaced kept the OLD conversation's split
      // clips — which the player uses for the on-screen text as well as the
      // audio. That is the ita_for_eng pod-1 scene-15 defect. carrySplitAudio
      // carries a slot only where the text it was rendered against is
      // byte-identical, and NULLs it otherwise; null falls back to the
      // whole-turn clip, which is exactly what the repair tool wrote.
      // The carry decision is this tool's own diff, not a text comparison —
      // two blank texts compare equal, and that must not carry an array.
      ...carrySplitAudio(src && src.row, null, { target: carryTarget, known: carryKnown }),
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
      // Kept OUT of `before` on purpose: that object is the drift assertion's
      // field list, and a uuid[] compared with String() reads null and [] as
      // different, which would abort a run over nothing. This copy is for the
      // log and the summary only.
      before_split_audio: existing && Object.fromEntries(SPLIT_AUDIO_FIELDS.map(f => [f, existing[f] ?? null])),
      after: desired,
      bucket: src ? src.kind : 'new',
      carried: { target: carryTarget, known: carryKnown },
      source_row_id: src ? src.row.id : null,
    })
  }

  // Rows the new canonical has no slot for. NOT deleted — blanked, so pods-plan's
  // `if (target)` / `if (known)` guards drop them from every queue. Deletion is a
  // recommendation for Tom and Aran, never an action here.
  //
  // This is deliberate and stays deliberate: the retired rows accumulate (one per
  // line a shrinking scene loses, per pod) and are cleared by a separate approved
  // pass, never by this tool. Worked example — the four blank SC15-S012 cards cut
  // on 2026-08-11: docs/pods/pod0-blank-sc15-s012-deletion-2026-08-11.md.
  // The count is reported per run as `retired_not_deleted`.
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

  // Target text that is NOT carried forward — the translator's working set.
  const orphanedTarget = []
  for (const r of d.detail.reworded) {
    if (r.subtype === 'numerals_only') continue
    orphanedTarget.push({
      reason: `reworded:${r.subtype}`, similarity: r.similarity,
      old_row_id: r.served.id, old_scene: r.served.scene_number, old_sentence: r.served.sentence_number,
      new_slot_id: slotId(course, slug, r.canon.scene_number, r.canon.sentence_number),
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
  // Hence: every payload row is built to exactly the same column shape.
  //
  // target_text_draft is in this list precisely BECAUSE it has a default: leaving it
  // out let every inserted row take `false`, which the recording queue reads as
  // "proofread", even on rows that had just been handed unread carried-over text.
  //
  // The list carries the four non-whole-turn audio slots as well as the two
  // whole-turn ones. Their ABSENCE is the ita_for_eng pod-1 scene-15 defect: a
  // column this payload never mentions survives the content change at that slot
  // untouched, so a replaced conversation kept the old one's split clips. They
  // are set — carried or NULL — on every row, by carrySplitAudio above.
  const COLUMNS = ['id', 'pod_id', 'scene_number', 'sentence_number', 'global_order',
    'speaker', 'known_text', 'target_text', 'target_text_draft',
    'target_audio_id', 'known_audio_id', ...SPLIT_AUDIO_FIELDS]
  // The NOT NULL columns with no database default — everything else must be
  // spelled out by the planner, target_text_draft included.
  const NULLABLE = new Set(['target_audio_id', 'known_audio_id', ...SPLIT_AUDIO_FIELDS])
  const REQUIRED = COLUMNS.filter(c => !NULLABLE.has(c))
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

// One archive set per pod, not per course: a course now gets aligned on its clone as
// well as (later) on pod-0, and one name for both would have the second run overwrite
// the first run's only way back. The learner-facing slug keeps the historic filename
// so the 2026-08-06 Welsh archives stay restorable by the documented command.
const archiveName = (course, slug, kind) =>
  slug === LEARNER_FACING_SLUG ? `${course}-pod0-${kind}.json` : `${course}-${slug}-${kind}.json`

/**
 * Put a pod back exactly as the pre-alignment archive recorded it. The chunked
 * upserts above are not one transaction, so a mid-flight failure has to have a
 * proven way back; this is it, and it is verified field-by-field before it returns.
 */
async function restoreFromArchive(course, slug) {
  const podId = `${course}:${slug}`
  const file = path.join(ARCHIVE_DIR, archiveName(course, slug, 'sentences-prealign'))
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
    // Restore never guesses: it puts back whatever slug the caller names, defaulting
    // to the learner-facing pod, which is what the documented Welsh command means.
    const slug = POD_SLUG_REQUESTED || LEARNER_FACING_SLUG
    const out = []
    for (const course of COURSES) out.push(await restoreFromArchive(course, slug))
    console.log(JSON.stringify({ mode: 'RESTORED FROM ARCHIVE', out }, null, 2))
    return
  }

  const { data: canon, error } = await db.from('canonical_pod_scenarios')
    // Always CANONICAL_SLUG: this is the CANONICAL source Aran wrote, not the
    // destination pod being rewritten. --pod-slug moves where we WRITE, never
    // what we READ. (That source was named 'pod-0' until 2026-09-01.)
    .select('*').eq('pod_slug', CANONICAL_SLUG).order('global_order')
  if (error) throw error
  if (!canon.length) throw new Error(`canonical_pod_scenarios has no ${CANONICAL_SLUG} rows — refusing to align`)

  fs.mkdirSync(ARCHIVE_DIR, { recursive: true })

  const summary = []
  for (const course of COURSES) {
    // The guard runs BEFORE anything is planned or written, and it is what decides
    // which pod this course's align is allowed to touch.
    const g = await resolveSlug(course)
    const p = await planCourse(course, canon, g.slug)

    // Full-fidelity archive of the pre-alignment rows, ALWAYS, dry run included.
    // Nothing below is recoverable from git without it.
    fs.writeFileSync(path.join(ARCHIVE_DIR, archiveName(course, g.slug, 'sentences-prealign')),
      JSON.stringify({ pod: p.pod, sentences: p.served }, null, 1))
    fs.writeFileSync(path.join(ARCHIVE_DIR, archiveName(course, g.slug, 'target-needing-translation')),
      JSON.stringify(p.orphanedTarget, null, 1))
    const dr = { ...p.diff }; delete dr.detail; delete dr.carry
    fs.writeFileSync(path.join(ARCHIVE_DIR, archiveName(course, g.slug, 'diff-summary')), JSON.stringify(dr, null, 1))
    fs.writeFileSync(path.join(ARCHIVE_DIR, archiveName(course, g.slug, `align-${APPLY ? 'applied' : 'dryrun'}-log`)),
      JSON.stringify({ ops: p.ops, surplus: p.surplus }, null, 1))

    if (APPLY) await applyCourse(p)

    summary.push({
      course,
      apply: APPLY,
      pod_written: p.podId,
      guard: g,
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
      // Split audio follows the text, never the slot. A row counted here had
      // split clips on the served pod that this canon's text no longer matches,
      // so they are NULLed and the player falls back to the whole-turn clip.
      split_audio: {
        slots_carried: p.ops.reduce((n, o) =>
          n + SPLIT_AUDIO_FIELDS.filter(f => o.after[f] != null).length, 0),
        rows_cleared: p.ops.filter(o =>
          SPLIT_AUDIO_FIELDS.some(f => o.before_split_audio && o.before_split_audio[f] != null && o.after[f] == null)).length,
      },
      scenes: p.sections.length,
    })
  }
  console.log(JSON.stringify({ mode: APPLY ? 'APPLIED' : 'DRY RUN', canonical_lines: canon.length, summary }, null, 2))
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
