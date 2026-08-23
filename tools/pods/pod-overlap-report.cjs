#!/usr/bin/env node
/**
 * pod-overlap-report.cjs — READ ONLY. Answers, per language, the question the pod
 * switchover turns on: if we replace the live `pod-0` with the staged
 * `pod-0-unrecorded` canon, what happens to the learners who are already on it?
 *
 * WHY THIS EXISTS. `learner_pod_state.sentence_id` is not a random id and not the
 * sentence text — it is a SLOT key, `<course>:pod-0:SC<scene>-S<sentence>`, with an
 * optional `:s<n>` suffix for a June-split unit. The staged canon INSERTS sentences
 * mid-scene, so the same slot key survives the swap while the sentence sitting in it
 * changes. Nothing orphans; the learner is instead silently credited with a sentence
 * they have never heard, at whatever ladder rung they had reached on the old one.
 *
 * That is not hypothetical. `cym_n_for_eng` and `cym_s_for_eng` were swapped in place
 * on 2026-08-11 and this tool measures the damage on their real rows.
 *
 * It writes nothing, and takes no --apply. The migration it costs is deliberately NOT
 * implemented here: the rules have to be blessed before the code exists.
 *
 *   node tools/pods/pod-overlap-report.cjs
 *   node tools/pods/pod-overlap-report.cjs --course=fra_for_eng
 *   node tools/pods/pod-overlap-report.cjs --json=docs/pods/pod-overlap-2026-08-14.json
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') })
const fs = require('fs')
const { Client } = require('pg')
const { realHumanLearners } = require('../../services/shared/learner-counts.cjs')

const arg = (n) => {
  const a = process.argv.find(x => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : null
}
const ONLY_COURSE = arg('course')
const JSON_OUT = arg('json')
const LIVE_SLUG = arg('live') || 'pod-0'
const STAGED_SLUG = arg('staged') || 'pod-0-unrecorded'

/**
 * The normalisation "verbatim" means, stated so it can be argued with.
 * Trim, collapse internal whitespace, case-fold, fold the typographic characters
 * the canon is inconsistent about: U+2026 ellipsis (docs/pods/pod-1-english-canonical.md
 * bakes it in, tools/audit-canon-ellipsis.cjs exists because it causes trouble),
 * curly quotes, and the en/em dashes. Nothing else — no punctuation stripping, so
 * "Five. Ten." and "5. 10." are correctly NOT a match.
 */
const norm = (s) => (s || '')
  .replace(/…/g, '...')
  .replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/[–—]/g, '-')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase()

const slotKey = (r) => `SC${String(r.scene_number).padStart(2, '0')}-S${String(r.sentence_number).padStart(3, '0')}`
const baseOf = (sentenceId) => sentenceId.replace(/:s\d+$/, '')

async function main () {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()

  // Courses that carry BOTH a live and a staged core pod — the switchover candidates.
  const { rows: courses } = await db.query(
    `select l.course_code,
            (select count(*) from listening_pod_sentences s where s.pod_id = l.course_code || ':' || $1) live_n,
            (select count(*) from listening_pod_sentences s where s.pod_id = l.course_code || ':' || $2) staged_n,
            (select count(*) from learner_pod_state ls where ls.course_code = l.course_code) state_rows,
            -- NOT a headcount — distinct learner_ids, no auth/demo/burst filtering. See
            -- services/shared/learner-counts.cjs for the honest "real human learners" count
            -- computed per course below.
            (select count(distinct ls.learner_id) from learner_pod_state ls where ls.course_code = l.course_code) distinct_learner_ids
       from listening_pods l
      where l.slug = $2 and ($3::text is null or l.course_code = $3)
      order by state_rows desc, l.course_code`,
    [LIVE_SLUG, STAGED_SLUG, ONLY_COURSE]
  )

  const report = []
  for (const c of courses) {
    const [live, staged] = await Promise.all([
      db.query(`select scene_number, sentence_number, known_text, target_text from listening_pod_sentences where pod_id=$1`, [`${c.course_code}:${LIVE_SLUG}`]),
      db.query(`select scene_number, sentence_number, known_text, target_text, target_text_draft, target_audio_id from listening_pod_sentences where pod_id=$1`, [`${c.course_code}:${STAGED_SLUG}`])
    ])

    // Text overlap: the known (English) side is the shared canon, so it is the
    // identity of a pod sentence across every language. Match on it.
    const stagedByText = new Map()
    for (const r of staged.rows) {
      const k = norm(r.known_text)
      if (!stagedByText.has(k)) stagedByText.set(k, [])
      stagedByText.get(k).push(r)
    }
    const liveByText = new Map()
    for (const r of live.rows) {
      const k = norm(r.known_text)
      if (!liveByText.has(k)) liveByText.set(k, [])
      liveByText.get(k).push(r)
    }

    const survives = live.rows.filter(r => stagedByText.has(norm(r.known_text)))
    const dropped = live.rows.filter(r => !stagedByText.has(norm(r.known_text)))
    const brandNew = staged.rows.filter(r => !liveByText.has(norm(r.known_text)))

    // Strict-verbatim (no normalisation at all), reported separately so the gap
    // between the two numbers is visible rather than folded away.
    const stagedStrict = new Set(staged.rows.map(r => r.known_text))
    const survivesStrict = live.rows.filter(r => stagedStrict.has(r.known_text)).length

    // Ambiguity: the same text twice in either canon would make text-matching a guess.
    const dupLive = [...liveByText.values()].filter(v => v.length > 1).length
    const dupStaged = [...stagedByText.values()].filter(v => v.length > 1).length

    // THE SLOT TRAP. What the do-nothing swap does: keep the slot key, change the
    // sentence under it.
    const stagedBySlot = new Map(staged.rows.map(r => [slotKey(r), r]))
    let slotSame = 0, slotChanged = 0, slotGone = 0
    const slotChangedKeys = new Set()
    for (const r of live.rows) {
      const k = slotKey(r)
      const s = stagedBySlot.get(k)
      if (!s) { slotGone++; continue }
      if (norm(s.known_text) === norm(r.known_text)) slotSame++
      else { slotChanged++; slotChangedKeys.add(k) }
    }

    // What that costs the REAL learners on this course today.
    const { rows: state } = await db.query(
      `select learner_id, sentence_id, exposures from learner_pod_state where course_code=$1`, [c.course_code]
    )
    const liveBySlot = new Map(live.rows.map(r => [slotKey(r), r]))
    const perLearner = new Map()
    for (const st of state) {
      const key = baseOf(st.sentence_id).split(':').slice(2).join(':')
      const l = perLearner.get(st.learner_id) || { rows: 0, exposures: 0, miscredited: 0, miscreditedExposures: 0, kept: 0, orphaned: 0 }
      l.rows++
      l.exposures += st.exposures
      const wasLive = liveBySlot.get(key)
      const nowStaged = stagedBySlot.get(key)
      if (!nowStaged) l.orphaned++
      else if (!wasLive) l.kept++
      else if (norm(wasLive.known_text) !== norm(nowStaged.known_text)) { l.miscredited++; l.miscreditedExposures += st.exposures }
      else l.kept++
      perLearner.set(st.learner_id, l)
    }

    report.push({
      course: c.course_code,
      live_sentences: live.rows.length,
      staged_sentences: staged.rows.length,
      staged_translated: staged.rows.filter(r => (r.target_text || '').trim() !== '').length,
      staged_draft: staged.rows.filter(r => r.target_text_draft).length,
      staged_target_audio: staged.rows.filter(r => r.target_audio_id).length,
      overlap: {
        survives_normalised: survives.length,
        survives_strict_verbatim: survivesStrict,
        dropped: dropped.length,
        brand_new: brandNew.length,
        duplicate_texts_live: dupLive,
        duplicate_texts_staged: dupStaged
      },
      slot_trap: { slot_same_text: slotSame, slot_different_text: slotChanged, slot_absent: slotGone },
      // "learners" is demoted to a distinct-id count of who is ON THIS COURSE'S
      // PROGRESS ROWS (unfiltered — includes non-auth/test/internal ids, needed to
      // scope the miscredit analysis below), never presented as a headline headcount.
      // real_human_learners (below) is the honest number for that.
      learner_ids: {
        count: perLearner.size,
        state_rows: state.length,
        // anonymised: rank by exposure volume, never an id
        profiles: [...perLearner.values()].sort((a, b) => b.exposures - a.exposures)
      },
      real_human_learners: await realHumanLearners(db, c.course_code)
    })
  }

  await db.end()

  for (const r of report) {
    console.log(`\n${r.course}  live=${r.live_sentences} staged=${r.staged_sentences} (translated ${r.staged_translated}, target audio ${r.staged_target_audio})`)
    console.log(`  overlap by text : ${r.overlap.survives_normalised} survive, ${r.overlap.dropped} dropped, ${r.overlap.brand_new} new` +
      (r.overlap.survives_strict_verbatim !== r.overlap.survives_normalised ? `  [strict verbatim: ${r.overlap.survives_strict_verbatim}]` : ''))
    console.log(`  slot trap       : ${r.slot_trap.slot_same_text} slots keep their sentence, ${r.slot_trap.slot_different_text} SWAP SENTENCE UNDER THE LEARNER`)
    if (r.learner_ids.count) {
      const mis = r.learner_ids.profiles.reduce((a, p) => a + p.miscredited, 0)
      const misE = r.learner_ids.profiles.reduce((a, p) => a + p.miscreditedExposures, 0)
      console.log(`  learner ids     : ${r.learner_ids.count} on ${r.learner_ids.state_rows} rows (${r.real_human_learners.humans} real human learners) — do-nothing swap mis-credits ${mis} rows / ${misE} exposures`)
    }
  }

  if (JSON_OUT) {
    fs.writeFileSync(JSON_OUT, JSON.stringify({ generated_for: '2026-08-14', live_slug: LIVE_SLUG, staged_slug: STAGED_SLUG, report }, null, 2))
    console.log(`\nwrote ${JSON_OUT}`)
  }
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
