#!/usr/bin/env node
/**
 * build-canonical-231-pod.cjs — stand up the canonical 231-sentence listening pod
 * on a course whose KNOWN LANGUAGE IS NOT ENGLISH, as a HELD, non-serving pod.
 *
 * WHY THIS AND NOT align-pod-to-canonical.cjs. That tool is the right answer for a
 * `*_for_eng` course and refuses anything else outright (`planCourse`: "known language
 * is not English"). It aligns a pod's English in place and leaves target slots blank for
 * a translator. For `eng_for_*`, `*_for_jpn` and `*_for_spa` there is nothing to align:
 * the canonical story already exists, in full, in a sibling course — the English on one
 * side and the learner's own language on the other — so the honest operation is a COPY
 * OF TWO SIDES FROM TWO PLACES, not an alignment. Extending the aligner to cross
 * directions would have made a careful in-place rewriter do a job that has no rewrite
 * in it. Measured 2026-09-19: the 231-set structure (scene, sentence, global_order,
 * speaker) is byte-identical across every canonical course, and exactly FIVE English
 * lines differ between them — the ones that name the language being learnt.
 *
 * SO THE FIVE LINES ARE THE WHOLE RISK, and the tool refuses to guess them. Sentences
 * 33, 94, 95, 221 and 226 say "I'm learning German" / "You speak very good German" and
 * friends. A side copied from a course whose target language IS this course's target
 * language already names itself correctly and needs nothing. A side copied from anywhere
 * else names the WRONG language, in a sentence a learner hears, and must be replaced
 * explicitly via --overrides. `--substitute=` declares which sides need it and the run
 * aborts if an override is missing, blank, or identical to the text it replaces.
 *
 * NOTHING SERVES AND NOTHING SOUNDS. The pod lands `visibility='held'` on a slug the
 * player's resolver does not read (refused outright if it is a serving slug), every
 * audio pointer is left NULL rather than copied — recordings are per language, but voice
 * identity is per course and Tom is choosing every pod voice himself — and no audio pass
 * is queued. The live 142-sentence pod-1 is never read, never written, never touched.
 *
 * DRY RUN BY DEFAULT. Pass --apply to write. One transaction; the destination is refused
 * if it already holds rows; every source is asserted to match the reference's 231
 * global_orders exactly before a single insert.
 *
 *   node tools/pods/build-canonical-231-pod.cjs --course=eng_for_spa \
 *     --known-source=spa_for_eng:pod-1:target --target-source=deu_for_eng:pod-1:known \
 *     --substitute=both --overrides=/path/eng_for_spa-names.json
 *   … --apply
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
const { SERVING_POD_SLUGS } = require('./serving-slug.cjs')
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs')
const { evidencePath } = require('../lib/evidence-path.cjs')

const SURFACE = 'tools/pods/build-canonical-231-pod.cjs'
const APPLY = process.argv.includes('--apply')
const arg = (n) => {
  const a = process.argv.find(x => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : null
}

/**
 * The five sentences that name the language being learnt. Every other line of the
 * canonical 231 is identical in English across all 24 canonical courses; these are not.
 * Measured against deu_for_eng:pod-1 on 2026-09-19 and asserted at run time, so this
 * list cannot quietly go stale: if the reference and a source differ anywhere else, the
 * run aborts rather than carrying a line that names the wrong language at a learner.
 */
const LANGUAGE_NAME_LINES = [33, 94, 95, 221, 226]

const COURSE = arg('course')
const POD_SLUG = arg('pod-slug') || 'pod-1-231'
const REFERENCE = arg('reference') || 'deu_for_eng:pod-1'
const KNOWN_SOURCE = arg('known-source')     // <podId>:<known|target>, or absent with --known-drafts
const TARGET_SOURCE = arg('target-source')   // <podId>:<known|target>
const KNOWN_DRAFTS = arg('known-drafts')     // JSON { "<global_order>": "<text>" } — machine-drafted known side
const OVERRIDES = arg('overrides')           // JSON { "<global_order>": { known?, target? } }
const SUBSTITUTE = (arg('substitute') || 'none').toLowerCase()  // none | known | target | both
const TITLE = arg('title')
/**
 * The English name of the language this course teaches. When the TARGET side is the
 * canonical English lifted from the reference — a German course, so its English says
 * "German" — the five language-name lines are a pure substitution and the tool does it
 * itself rather than asking for five hand-written overrides per course. Asserted: the
 * substitution must actually change the line, or the run aborts.
 */
const TARGET_LANG_EN = arg('target-lang-en')
const DRAFT_SIDE = (arg('draft') || 'none').toLowerCase()       // none | known  (see PROVISIONAL below)
/**
 * Carry the target source's own draft/approval state rather than stamping every copied
 * row the same. A line lifted from a settled sibling is settled; a line lifted from a
 * sibling that is itself still an unverified machine draft is still an unverified
 * machine draft, and saying otherwise is how a draft gets mistaken for finished text.
 */
const CARRY_TARGET_DRAFT = process.argv.includes('--carry-target-draft')

if (!COURSE || !TARGET_SOURCE || (!KNOWN_SOURCE && !KNOWN_DRAFTS)) {
  console.error('FAILED: --course, --target-source and one of --known-source/--known-drafts are required')
  process.exit(1)
}
if (!['none', 'known', 'target', 'both'].includes(SUBSTITUTE)) {
  console.error(`FAILED: --substitute=${SUBSTITUTE} unknown; one of none, known, target, both`)
  process.exit(1)
}
if (SERVING_POD_SLUGS.includes(POD_SLUG)) {
  console.error(`FAILED: --pod-slug=${POD_SLUG} is a slug the player SERVES. This tool only ever builds a pod learners cannot see.`)
  process.exit(1)
}

const POD_ID = `${COURSE}:${POD_SLUG}`
const needKnownSub = SUBSTITUTE === 'known' || SUBSTITUTE === 'both'
const needTargetSub = SUBSTITUTE === 'target' || SUBSTITUTE === 'both'
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
const norm = (t) => String(t == null ? '' : t).normalize('NFC').replace(/\s+/g, ' ').trim()

/**
 * Pull one side of one pod as { global_order -> text }. The side is named explicitly
 * because which column holds which language depends on the course's direction: in
 * spa_for_eng the Spanish is `target_text`, in eng_for_spa it is `known_text`.
 */
async function loadSide(db, spec) {
  const bits = spec.split(':')
  const side = bits.pop()
  const podId = bits.join(':')
  if (!['known', 'target'].includes(side)) throw new Error(`source "${spec}" must end in :known or :target`)
  const { rows } = await db.query(
    `SELECT global_order, known_text, target_text, target_text_draft, target_text_approved_at, target_text_approved_by
       FROM listening_pod_sentences WHERE pod_id = $1 ORDER BY global_order`, [podId])
  if (!rows.length) throw new Error(`source pod has no rows: ${podId}`)
  const out = new Map()
  const draft = new Map()
  for (const r of rows) {
    out.set(r.global_order, side === 'known' ? r.known_text : r.target_text)
    draft.set(r.global_order, { draft: r.target_text_draft, approved_at: r.target_text_approved_at, approved_by: r.target_text_approved_by })
  }
  return { podId, side, text: out, draft }
}

;(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()

  const { rows: courseRows } = await db.query('SELECT course_code, known_lang, target_lang, status FROM courses WHERE course_code = $1', [COURSE])
  if (!courseRows.length) throw new Error(`no such course: ${COURSE}`)
  const course = courseRows[0]

  // The reference gives structure AND the canonical English; nothing else does.
  const { rows: ref } = await db.query(
    `SELECT global_order, scene_number, sentence_number, speaker, beat_label, glue_to_next, known_text
       FROM listening_pod_sentences WHERE pod_id = $1 ORDER BY global_order`, [REFERENCE])
  if (ref.length !== 231) throw new Error(`reference ${REFERENCE} has ${ref.length} rows, expected 231`)

  const known = KNOWN_DRAFTS
    ? { podId: KNOWN_DRAFTS, side: 'drafts', text: new Map(Object.entries(readJson(KNOWN_DRAFTS)).map(([k, v]) => [Number(k), v])) }
    : await loadSide(db, KNOWN_SOURCE)
  const target = await loadSide(db, TARGET_SOURCE)
  // Accept either shape: the rich { "<n>": { known, target } }, or the flat
  // { "<n>": "<text>" } that draft-pod-known-side.cjs emits, which is always the KNOWN
  // side. One less hand-edited file between the drafter and the write.
  const overrides = {}
  for (const [k, v] of Object.entries(OVERRIDES ? readJson(OVERRIDES) : {})) {
    overrides[k] = typeof v === 'string' ? { known: v } : v
  }

  // Destination must be empty. A second run over a half-built pod is the one way this
  // could destroy work, so it is refused rather than merged.
  const { rows: destRows } = await db.query(
    `SELECT count(*)::int n FROM listening_pod_sentences WHERE pod_id = $1`, [POD_ID])
  if (destRows[0].n) throw new Error(`destination ${POD_ID} already holds ${destRows[0].n} sentence row(s); refusing`)

  const problems = []
  const plan = []
  for (const r of ref) {
    const g = r.global_order
    const ov = overrides[String(g)] || {}
    const isNameLine = LANGUAGE_NAME_LINES.includes(g)

    let k = known.text.get(g)
    let t = target.text.get(g)
    if (k == null) problems.push(`${g}: no known-side text in ${known.podId}`)
    if (t == null) problems.push(`${g}: no target-side text in ${target.podId}`)

    if (isNameLine) {
      if (needKnownSub) {
        if (!norm(ov.known)) problems.push(`${g}: --substitute names the known side but no override given (this line names the language being learnt)`)
        else if (norm(ov.known) === norm(k)) problems.push(`${g}: known override is identical to the source line — it still names the wrong language`)
        else k = ov.known
      }
      if (needTargetSub && !norm(ov.target) && TARGET_LANG_EN && target.side === 'known') {
        const derived = String(t).replace(/\bGerman\b/g, TARGET_LANG_EN)
        if (norm(derived) === norm(t)) problems.push(`${g}: substituting German → ${TARGET_LANG_EN} changed nothing; the line does not name a language`)
        else t = derived
      } else if (needTargetSub) {
        if (!norm(ov.target)) problems.push(`${g}: --substitute names the target side but no override given`)
        else if (norm(ov.target) === norm(t)) problems.push(`${g}: target override is identical to the source line`)
        else t = ov.target
      }
    } else {
      // An override outside the five name lines means somebody has misread the shape.
      if (ov.known || ov.target) problems.push(`${g}: override given for a line that does not name a language`)
      // The canonical English must be the canonical English everywhere else.
      if (target.side === 'known' && norm(t) !== norm(r.known_text)) {
        problems.push(`${g}: target-side English differs from ${REFERENCE} outside the five name lines`)
      }
    }

    if (!norm(k)) problems.push(`${g}: known text is empty`)
    if (!norm(t)) problems.push(`${g}: target text is empty`)
    if (/[()（）]/.test(String(k) + String(t))) problems.push(`${g}: parentheses in learner-facing text (banned outright)`)

    plan.push({
      id: `${POD_ID}:SC${String(r.scene_number).padStart(2, '0')}-S${String(r.sentence_number).padStart(3, '0')}`,
      pod_id: POD_ID,
      scene_number: r.scene_number,
      sentence_number: r.sentence_number,
      global_order: g,
      speaker: r.speaker,
      beat_label: r.beat_label,
      glue_to_next: r.glue_to_next,
      known_text: norm(k),
      target_text: norm(t),
      // PROVISIONAL. `target_text_draft` is the one flag the render gate and the
      // recording room read, and there is no `known_text_draft` column. When the
      // machine-drafted side is the KNOWN side, the row is still a row that must not be
      // rendered until a verifier has read it — so it carries the flag, and
      // target_text_review records which side the draft is actually on. Flagged in the
      // report as a deliberate stretch of the column's name, not an accident.
      target_text_draft: DRAFT_SIDE === 'known'
        || (CARRY_TARGET_DRAFT && target.side === 'target' && !!(target.draft && target.draft.get(g) && target.draft.get(g).draft)),
      draft_side: DRAFT_SIDE === 'known' ? 'known'
        : (CARRY_TARGET_DRAFT && target.side === 'target' && target.draft && target.draft.get(g) && target.draft.get(g).draft ? 'target' : null),
    })
  }

  const idSet = new Set(plan.map(p => p.id))
  if (idSet.size !== plan.length) problems.push('duplicate sentence ids in the plan')

  const summary = {
    course: COURSE, pod: POD_ID, visibility: 'held',
    known_lang: course.known_lang, target_lang: course.target_lang, course_status: course.status,
    reference: REFERENCE, known_source: `${known.podId}:${known.side}`, target_source: `${target.podId}:${target.side}`,
    substitute: SUBSTITUTE, name_lines: LANGUAGE_NAME_LINES, target_lang_en: TARGET_LANG_EN || null,
    rows: plan.length, drafts: plan.filter(p => p.target_text_draft).length,
    carry_target_draft: CARRY_TARGET_DRAFT, problems: problems.length,
  }

  if (problems.length) {
    console.error(JSON.stringify({ mode: 'REFUSED', summary, problems: problems.slice(0, 40) }, null, 2))
    await db.end(); process.exit(1)
  }

  const logFile = evidencePath(`docs/pods/build-231/${COURSE}-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(logFile, JSON.stringify({ mode: APPLY ? 'APPLIED' : 'DRY_RUN', summary, rows: plan }, null, 2))

  if (!APPLY) {
    console.log(JSON.stringify({ mode: 'DRY_RUN', summary, log_file: logFile, sample: plan.slice(0, 3) }, null, 2))
    await db.end(); return
  }

  const identity = serviceIdentity('build-canonical-231-pod', { role: 'content-editor' })
  try {
    await db.query('BEGIN')
    await db.query(
      `INSERT INTO listening_pods (id, course_code, pod_type, slug, title, source_file, visibility, speakers, metadata)
       VALUES ($1,$2,'core',$3,$4,'generated:canonical-231','held','{}'::jsonb,$5::jsonb)`,
      [POD_ID, COURSE, POD_SLUG,
        TITLE || `${COURSE} Listening Pods — canonical 231 — HELD, not learner-facing`,
        JSON.stringify({ canonical_231: true, built_by: SURFACE, built_at: new Date().toISOString(),
          known_source: `${known.podId}:${known.side}`, target_source: `${target.podId}:${target.side}`,
          draft_side: DRAFT_SIDE === 'known' ? 'known' : null,
          audio: 'none — pointers deliberately not copied; Tom is choosing every pod voice himself' })])

    for (const p of plan) {
      const res = await db.query(
        `INSERT INTO listening_pod_sentences
           (id, pod_id, scene_number, sentence_number, global_order, speaker, beat_label, glue_to_next,
            known_text, target_text, target_text_draft, target_text_review)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)`,
        [p.id, p.pod_id, p.scene_number, p.sentence_number, p.global_order, p.speaker, p.beat_label, p.glue_to_next,
          p.known_text, p.target_text, p.target_text_draft,
          p.draft_side === 'known'
          ? JSON.stringify({ draft_side: 'known', note: 'machine draft is on the KNOWN side; target_text_draft carries the flag because there is no known_text_draft column' })
          : p.draft_side === 'target'
            ? JSON.stringify({ draft_side: 'target', note: `unverified draft carried forward from ${target.podId}` })
            : null])
      if (res.rowCount !== 1) throw new Error(`${p.id}: insert affected ${res.rowCount} rows; rolled back`)
    }

    const { rows: check } = await db.query(
      `SELECT count(*)::int n, count(*) FILTER (WHERE btrim(known_text)='' OR btrim(target_text)='')::int blank
         FROM listening_pod_sentences WHERE pod_id = $1`, [POD_ID])
    if (check[0].n !== 231 || check[0].blank) throw new Error(`post-write check failed: ${JSON.stringify(check[0])}; rolled back`)
    const { rows: vis } = await db.query(`SELECT visibility FROM listening_pods WHERE id = $1`, [POD_ID])
    if (vis[0].visibility !== 'held') throw new Error(`post-write check failed: pod is ${vis[0].visibility}, not held; rolled back`)

    await db.query(
      `INSERT INTO content_edit_events
         (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [COURSE, SURFACE, 'build-canonical-231-pod',
        identity.kind, String(identity.id), String(identity.label), identity.verified, identity.role || null,
        { pod_id: POD_ID, rows: plan.length }, summary])
    await db.query('COMMIT')
  } catch (e) {
    await db.query('ROLLBACK')
    console.error(JSON.stringify({ mode: 'FAILED', summary, error: e.message }, null, 2))
    await db.end(); process.exit(1)
  }

  console.log(JSON.stringify({ mode: 'APPLIED', summary, log_file: logFile }, null, 2))
  await db.end()
})().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
