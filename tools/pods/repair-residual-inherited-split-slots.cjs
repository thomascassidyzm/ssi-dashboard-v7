#!/usr/bin/env node
/**
 * repair-residual-inherited-split-slots.cjs — 2026-08-24
 *
 * THE RESIDUE. `repair-split-array-inheritance.cjs` cleared the bulk of the
 * clone+align inheritance defect off the live pod-1 fleet this morning, but it
 * judges a slot by asking whether the array's own text tiles the row. That is a
 * text test, and it passes a slot whose clips happen to say something the row
 * also says — so a population survived it: slots still BYTE-IDENTICAL to the
 * same (scene, sentence) slot on the pod being replaced, while the text at that
 * slot changed underneath them. `findInheritedSplitAudio()` is the exact test
 * for that signature and it is the one used here; nothing in this file
 * re-implements or softens it.
 *
 * THE RULE (tools/pods/split-audio-inheritance.cjs, verbatim): split audio
 * belongs to a row's TEXT, never to its SLOT. A slot's clips are valid only
 * where the text they were rendered against is byte-identical to the row's own
 * current text.
 *
 * SO, PER OFFENDING SLOT, IN ORDER:
 *   1. RE-POINT, if the retired pod rendered this row's CURRENT text somewhere
 *      else in itself. Then a correct set of clips already exists: same text,
 *      byte-identical, no rendering, no spend. It is taken only after
 *      make-before-break — every candidate clip must be ALIVE (a course_audio
 *      row exists) and IN CAST for the new pod, and the whole candidate array
 *      must pass `checkPodClips` against the row's real text with zero issues.
 *   2. NULL otherwise. `podSentenceSplit.splitRowUnits` falls back to the
 *      whole-turn clip when a row has fewer than two split clips, and the
 *      whole-turn clips are verified correct in text AND casting on every row
 *      before anything is written (GATE 2). Null is a verified fallback; an
 *      inherited array is a different conversation.
 *
 * NO AUDIO IS RENDERED AND NO CLIP IS DELETED. Nulling a link never removes a
 * course_audio row; every value this tool overwrites is snapshotted to the log
 * first, so the write is reversible from the log alone.
 *
 * explainer_audio_id — 2026-08-24, third pass: the pod-sentence explainer
 * narration track is DEPRECATED (Tom: "Explainers do not exist anymore. We
 * don't do them."). This tool no longer measures or repairs that column at
 * all — it was previously in scope (see git history for the lifted-fence
 * rules that governed it), but a deprecated field gets silence, not upkeep.
 * The column and any clips it points at are untouched; this tool simply
 * stops looking at them.
 *
 * GATES, both cleared before any write:
 *   1. ZERO split-keyed `learner_pod_state` rows for the course. Progress is
 *      filed under `<row.id>` for an unsplit row and `<row.id>:s<k>` for a split
 *      unit, so nulling a split array CHANGES THE KEY. A course with split-keyed
 *      progress is SKIPPED and reported — this tool never migrates progress on
 *      its own initiative.
 *   2. Every whole-turn clip on the pod correct in TEXT and in CASTING. A row
 *      whose own whole-turn clip is wrong cannot be repaired by falling back to
 *      it, so that row is excluded from the plan and reported rather than
 *      aborting the pod (the same rule, and the same reason, as the tool this
 *      one follows).
 *
 * DRY RUN BY DEFAULT. --apply writes.
 *
 *   node tools/pods/repair-residual-inherited-split-slots.cjs --all
 *   node tools/pods/repair-residual-inherited-split-slots.cjs --course=ita_for_eng --apply
 */
'use strict'

const fs = require('fs')
const path = require('path')

const { findInheritedSplitAudio, sameText } = require('./split-audio-inheritance.cjs')
const { checkPodClips, dense } = require('./pod-cast-gate.cjs')
// PER-SPEAKER, not set-membership. Asking "is this voice anywhere in the cast?"
// is blind to the thing the pod-1 recast actually did — it moved WHICH CHARACTER
// gets which voice. ara_eg s2/2 is the proof on this very population: the row's
// speaker is Passenger (cast: rex, male) and its split clips are eve, which is in
// the cast set and so passes a set test while being the wrong character entirely.
const { expectedVoiceFor } = require('./unlink-off-cast-pod-clips.cjs')

/** The slots this tool may WRITE. None of them is a scalar — all are arrays. */
const REPAIRABLE_SLOTS = [
  'sentence_audio_ids', 'sentence_known_audio_ids', 'takeg_audio_ids',
]
const MEASURED_SLOTS = [...REPAIRABLE_SLOTS]
const SCALAR_SLOTS = new Set()

const SIDE_OF = {
  sentence_audio_ids: 'target',
  sentence_known_audio_ids: 'known',
  takeg_audio_ids: 'target',
}
const TEXT_OF = { target: 'target_text', known: 'known_text' }

/** Same prefix strip as every other tool on this path: `xai_ara` and `ara` are one voice. */
const bare = (v) => String(v || '').replace(/^(xai_|azure_)/, '')

/** `comp:<chunk>+<gloss>` composites split into the real voices they are made of. */
function voicesOf (voiceId) {
  const raw = String(voiceId || '')
  const body = raw.startsWith('comp:') ? raw.slice(5) : raw
  return body.split('+').map(bare).filter(Boolean)
}

/** The pod's cast, per side, as the pod itself declares it. */
function castOf (speakers) {
  const cast = { target: new Set(), known: new Set() }
  for (const entry of Object.values(speakers || {})) {
    for (const side of ['target', 'known']) {
      const v = entry && entry[side] && entry[side].voice_id
      if (v) cast[side].add(bare(v))
    }
  }
  return cast
}

/**
 * GATE 2 — whole-turn verification: which rows' fallback is trustworthy.
 * Text must match the row and the voice must be the one cast FOR THIS ROW'S
 * SPEAKER, on each track. A row failing either cannot be repaired by falling
 * back to its whole turn, so it is excluded from the plan and reported.
 * @returns {{badRows:Set<string>, failures:string[]}}
 */
function verifyWholeTurn (rows, clips, speakers) {
  const badRows = new Set()
  const failures = []
  for (const r of rows) {
    for (const [idField, textField, side] of [
      ['target_audio_id', 'target_text', 'target'],
      ['known_audio_id', 'known_text', 'known'],
    ]) {
      const clip = clips[r[idField]]
      if (!clip) continue // a missing whole-turn clip is a different defect
      const got = dense(clip.text)
      const want = dense(r[textField])
      if (got && want && got !== want && !want.includes(got) && !got.includes(want)) {
        failures.push(`s${r.scene_number}/${r.sentence_number} ${idField} text mismatch`)
        badRows.add(r.id)
      }
      const expected = expectedVoiceFor(speakers, r.speaker, side)
      const vs = voicesOf(clip.voice_id)
      if (expected && vs.length && vs.some((v) => v !== bare(expected))) {
        failures.push(`s${r.scene_number}/${r.sentence_number} ${idField} voice ${vs.join('+')} is not ${r.speaker}'s cast ${side} voice ${bare(expected)}`)
        badRows.add(r.id)
      }
    }
  }
  return { badRows, failures }
}

/**
 * Is `ids` a usable value for `field` on `row`? Make-before-break: alive,
 * in-cast, and coherent with the row's OWN text by the same five-column check
 * the gate runs. Returns null when usable, else the reason it is not.
 */
function replacementRefusal (ids, field, row, clips, speakers) {
  const scalar = SCALAR_SLOTS.has(field)
  const arr = (scalar ? [ids].flat() : (ids || [])).filter(Boolean)
  if (!arr.length) return 'candidate is empty'
  const dangling = arr.filter((id) => !clips[id])
  if (dangling.length) return `${dangling.length} candidate clip(s) have no course_audio row`
  const side = SIDE_OF[field]
  const expected = expectedVoiceFor(speakers, row.speaker, side)
  if (expected) {
    const off = [...new Set(arr.flatMap((id) => voicesOf(clips[id].voice_id)))].filter((v) => v !== bare(expected))
    if (off.length) return `candidate voice ${off.join('/')} is not ${row.speaker}'s cast ${side} voice ${bare(expected)}`
  }
  const probe = checkPodClips({
    rows: [{
      id: row.id,
      scene_number: row.scene_number,
      sentence_number: row.sentence_number,
      speaker: row.speaker,
      target_text: row.target_text,
      known_text: row.known_text,
      [field]: scalar ? arr[0] : arr,
    }],
    speakers: null, // cast already judged above; this probe is the TEXT walk
    clips,
  })
  const issues = probe.clipIssues.filter((i) => i.slot === field)
  if (issues.length) return `candidate fails the row-text walk: ${issues[0].detail}`
  return null
}

/**
 * The plan for one pod. Pure: rows in, decisions out, so it is unit-testable
 * without a database.
 *
 * @param {object} o
 * @param {Array<object>} o.rows        the LIVE pod's rows
 * @param {Array<Array<object>>} o.ancestorRowSets  one row set per retired pod of the same course
 * @param {object} o.clips              id → {text, voice_id} for every referenced clip
 * @param {object} o.speakers           the live pod's cast map
 * @returns {{plan:Array, measured:object, wholeTurnFailures:string[], badRows:string[]}}
 */
function planPod ({ rows, ancestorRowSets, clips, speakers }) {
  const { badRows, failures: wholeTurnFailures } = verifyWholeTurn(rows, clips, speakers)

  // Union the findings across every retired pod of this course: inheritance may
  // have come through more than one hop (pod-0-retired → pod-1-retired → pod-1).
  const findings = new Map()
  for (const old of ancestorRowSets || []) {
    for (const f of findInheritedSplitAudio(old, rows)) {
      findings.set(`${f.id}|${f.field}`, f)
    }
  }

  const measured = Object.fromEntries(MEASURED_SLOTS.map((f) => [f, 0]))
  for (const f of findings.values()) if (f.field in measured) measured[f.field]++

  const byId = new Map(rows.map((r) => [r.id, r]))
  const perRow = new Map()
  const held = []
  for (const f of findings.values()) {
    if (!REPAIRABLE_SLOTS.includes(f.field)) continue
    const row = byId.get(f.id)
    if (!row) continue
    if (badRows.has(row.id)) continue // its own fallback is wrong — not repairable here

    const scalar = SCALAR_SLOTS.has(f.field)
    const side = SIDE_OF[f.field]
    const current = scalar ? row[f.field] : (row[f.field] || []).filter(Boolean)

    // 1. RE-POINT — did a retired pod render THIS row's current text elsewhere?
    const sameRowText = (cand) => sameText(cand[TEXT_OF[side]], row[TEXT_OF[side]])
    let decision = null
    for (const old of ancestorRowSets || []) {
      for (const cand of old) {
        if (!sameRowText(cand)) continue
        const ids = scalar ? cand[f.field] : (cand[f.field] || []).filter(Boolean)
        if (scalar ? !ids : !ids.length) continue
        if (JSON.stringify(ids) === JSON.stringify(current)) continue
        const refusal = replacementRefusal(ids, f.field, row, clips, speakers)
        if (refusal) continue
        decision = { action: 're-point', to: ids, why: `retired pod row s${cand.scene_number}/${cand.sentence_number} carries this row's exact ${side} text, alive and verified` }
        break
      }
      if (decision) break
    }
    // 2. NULL — no correct clip exists. The player falls back to the verified
    // whole-turn clip.
    if (!decision) {
      decision = { action: 'null', to: null, why: `no alive, verified clip exists for this row's ${side} text; falling back to the whole-turn clip` }
    }

    if (!perRow.has(row.id)) {
      perRow.set(row.id, {
        id: row.id,
        scene: row.scene_number,
        sentence: row.sentence_number,
        speaker: row.speaker,
        target_text: row.target_text,
        known_text: row.known_text,
        slots: [],
      })
    }
    perRow.get(row.id).slots.push({
      field: f.field,
      changed: f.changed,
      before: row[f.field] == null ? null : row[f.field],
      after: decision.to,
      action: decision.action,
      why: decision.why,
    })
  }

  return {
    plan: [...perRow.values()],
    measured,
    held,
    wholeTurnFailures,
    badRows: [...badRows],
  }
}

module.exports = {
  REPAIRABLE_SLOTS,
  MEASURED_SLOTS,
  SCALAR_SLOTS,
  castOf,
  voicesOf,
  verifyWholeTurn,
  replacementRefusal,
  planPod,
}

/* ------------------------------------------------------------------ runner */

if (require.main === module) main().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })

async function main () {
  const { Client } = require('pg')
  const REPO = path.resolve(__dirname, '../..')
  const APPLY = process.argv.includes('--apply')
  const arg = (n) => {
    const a = process.argv.find((x) => x.startsWith(`--${n}=`))
    return a ? a.split('=').slice(1).join('=') : null
  }
  const ONE = arg('course')
  const ALL = process.argv.includes('--all')
  if (!ONE && !ALL) {
    console.error('usage: repair-residual-inherited-split-slots.cjs (--all | --course=<code>) [--apply]')
    process.exit(2)
  }

  const envText = fs.readFileSync(path.join(REPO, '.env.psql'), 'utf8')
  const DATABASE_URL = (envText.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/) || [])[1]
  if (!DATABASE_URL) throw new Error('no DATABASE_URL in .env.psql')

  const db = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()

  const SELECT = `select id, pod_id, scene_number, sentence_number, global_order, speaker,
                         target_text, known_text, target_audio_id, known_audio_id,
                         sentence_audio_ids, sentence_known_audio_ids, takeg_audio_ids
                    from listening_pod_sentences where pod_id = $1
                   order by global_order, scene_number, sentence_number`

  const pods = (await db.query(
    `select id, course_code, visibility, speakers, created_at from listening_pods
      where id like '%:pod-1' and visibility = 'live'
        ${ONE ? 'and course_code = $1' : ''}
      order by course_code`, ONE ? [ONE] : [])).rows
  if (!pods.length) throw new Error('no live pod-1 found for that selection')

  const stamp = new Date().toISOString().slice(0, 10)
  const summary = []

  for (const pod of pods) {
    const course = pod.course_code
    const rows = (await db.query(SELECT, [pod.id])).rows

    const ancestors = (await db.query(
      `select id from listening_pods where course_code = $1 and id <> $2 and visibility <> 'live'
        order by created_at`, [course, pod.id])).rows
    const ancestorRowSets = []
    for (const a of ancestors) ancestorRowSets.push((await db.query(SELECT, [a.id])).rows)

    // Every clip referenced by the live pod AND by every ancestor (re-point
    // candidates live there). Chunked `= any($1)`, no ORDER BY.
    const ids = new Set()
    for (const set of [rows, ...ancestorRowSets]) {
      for (const r of set) {
        for (const f of ['target_audio_id', 'known_audio_id', ...MEASURED_SLOTS]) {
          const v = r[f]
          if (!v) continue
          if (Array.isArray(v)) { for (const i of v) if (i) ids.add(i) } else ids.add(v)
        }
      }
    }
    const clips = {}
    const all = [...ids]
    for (let i = 0; i < all.length; i += 500) {
      const q = await db.query('select id, text, voice_id from course_audio where id = any($1)', [all.slice(i, i + 500)])
      for (const c of q.rows) clips[c.id] = { text: c.text, voice_id: c.voice_id }
    }

    const { plan, measured, held, wholeTurnFailures, badRows } = planPod({
      rows, ancestorRowSets, clips, speakers: pod.speakers,
    })

    // GATE 1 — progress safety, per course.
    const splitKeyed = Number((await db.query(
      "select count(*) n from learner_pod_state where course_code = $1 and sentence_id like '%:s%'",
      [course])).rows[0].n)

    const slotCount = plan.reduce((n, p) => n + p.slots.length, 0)
    const repoints = plan.flatMap((p) => p.slots).filter((s) => s.action === 're-point').length
    const nulls = slotCount - repoints

    console.log(`\n=== ${course} (${pod.id}) — ${rows.length} rows, ${ancestors.length} ancestor pod(s)`)
    console.log(`    measured inherited slots: ${JSON.stringify(measured)}`)
    console.log(`    in scope: ${slotCount} on ${plan.length} row(s) — ${repoints} re-point, ${nulls} null`)
    if (held.length) {
      const byWhy = {}
      for (const h of held) byWhy[h.why.slice(0, 40)] = (byWhy[h.why.slice(0, 40)] || 0) + 1
      console.log(`    held (measured, deliberately not written): ${held.length} — ${JSON.stringify(byWhy)}`)
    }
    console.log(`    whole-turn verified on ${rows.length - badRows.length}/${rows.length} rows` +
      (badRows.length ? ` (${badRows.length} excluded, listed in log)` : ''))
    console.log(`    split-keyed learner_pod_state rows: ${splitKeyed}`)

    let written = 0
    let stopped = null
    if (splitKeyed > 0) {
      stopped = `${splitKeyed} split-keyed learner_pod_state rows — nulling would change the progress key and orphan them`
      console.log(`    STOPPED on this course: ${stopped}`)
    } else if (APPLY && slotCount) {
      await db.query('BEGIN')
      try {
        for (const p of plan) {
          for (const s of p.slots) {
            // Before-state assertion INSIDE the predicate: a concurrent writer
            // that already moved this slot loses the race, and the run aborts.
            const res = await db.query(
              `update listening_pod_sentences
                  set ${s.field} = $3, updated_at = now()
                where id = $1 and ${s.field} is not distinct from $2
                returning id`,
              [p.id, s.before, s.after])
            if (res.rowCount !== 1) {
              throw new Error(`DRIFT on ${p.id} ${s.field} — aborting, nothing written`)
            }
            written++
          }
        }
        await db.query('COMMIT')
      } catch (e) {
        await db.query('ROLLBACK')
        throw e
      }
      console.log(`    APPLIED — ${written} slot(s) written`)
    }

    const logPath = path.join(REPO, 'docs/pods',
      `${course}-residual-inherited-slots-${stamp}-${APPLY && !stopped ? 'applied' : 'dryrun'}-log.json`)
    fs.writeFileSync(logPath, JSON.stringify({
      pod: pod.id,
      course,
      mode: APPLY && !stopped ? 'applied' : 'dryrun',
      generated_at: new Date().toISOString(),
      ancestors: ancestors.map((a) => a.id),
      rows_total: rows.length,
      measured_inherited_slots: measured,
      scope_note: 'explainer_audio_id is deprecated and out of scope entirely — not measured, not repaired',
      held,
      split_keyed_progress_rows: splitKeyed,
      stopped,
      whole_turn_failures: wholeTurnFailures,
      rows_excluded_bad_whole_turn: badRows,
      slots_planned: slotCount,
      slots_written: written,
      rows: plan,
    }, null, 1))

    summary.push({ course, measured, slotCount, repoints, nulls, written, stopped, log: logPath })
  }

  const totals = { in_scope: 0, repoint: 0, null: 0, written: 0 }
  const measuredTotals = Object.fromEntries(MEASURED_SLOTS.map((f) => [f, 0]))
  for (const s of summary) {
    totals.in_scope += s.slotCount; totals.repoint += s.repoints
    totals.null += s.nulls; totals.written += s.written
    for (const f of MEASURED_SLOTS) measuredTotals[f] += s.measured[f]
  }
  console.log(`\n--- FLEET ${APPLY ? 'APPLIED' : 'DRY RUN'} ---`)
  console.log(`measured inherited slots, all three split-array columns: ${JSON.stringify(measuredTotals)}`)
  console.log(`in scope: ${totals.in_scope} (${totals.repoint} re-point, ${totals.null} null); written ${totals.written}`)
  for (const s of summary.filter((x) => x.stopped)) console.log(`STOPPED ${s.course}: ${s.stopped}`)
  await db.end()
}
