#!/usr/bin/env node
/**
 * build-welsh-translation-worklist.cjs — the Welsh pod-0 proofreading list, for Aran.
 *
 * It used to list the lines that had NO Welsh. They all have Welsh now: Tom's ruling
 * 2026-08-06 was "opus drafts, Aran proofreads", so every empty slot carries a
 * hand-written DRAFT (tools/pods/pod0-welsh-drafts-2026-08-06.cjs), marked in the
 * database with target_text_draft = true and badged DRAFT — AWAITING ARAN wherever a
 * recorder can see it. So this doc is now a READING job, not a writing one: every
 * drafted line is printed in full, with the English above it, and for reworded lines
 * the Welsh it came from so the change is visible.
 *
 * Read live from the database (the drafts are what is actually being served) and
 * cross-referenced with the drafts module for provenance. Written for a phone screen:
 * scene headings, no JSON. Machine-readable form stays in
 * docs/pods/pod0-welsh-drafts-applied-log.json.
 *
 *   node tools/pods/build-welsh-translation-worklist.cjs
 */
'use strict'
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql') })
const { Client } = require('pg')
const { draftsFor, POD_SLUG } = require('./pod0-welsh-drafts-2026-08-06.cjs')

const OUT = path.join(__dirname, '..', '..', 'docs', 'pods', 'pod0-welsh-translation-worklist-2026-08-06.md')
const ARCHIVE = path.join(__dirname, '..', '..', 'docs', 'pods', 'pod0-welsh-prealign-archive-2026-08-06')
const COURSES = [
  { code: 'cym_n_for_eng', label: 'Northern Welsh' },
  { code: 'cym_s_for_eng', label: 'Southern Welsh' },
]
const CANONICAL_MAX_ORDER = 9000

const slot = (r) => r.id.split(`:${POD_SLUG}:`)[1]
const unchanged = (r, drafts) => {
  const d = drafts[slot(r)] || {}
  return d.kind === 'reworded' && d.from === d.cy
}

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()

  const L = []
  L.push('# Welsh pod-0 — drafted, awaiting Aran')
  L.push('')
  L.push("Built 2026-08-06 against Aran's 2026-08-06 pod-0 canonical (231 sentences, 22 scenes).")
  L.push('')
  L.push('Every line in pod-0 now has Welsh. The lines below are the ones **a machine drafted**')
  L.push('and nobody has read yet. The job here is to read and correct, not to write from')
  L.push('nothing — most will be fine, some will not, and the ones that are wrong are exactly')
  L.push('what this list is for.')
  L.push('')
  L.push('Each drafted line shows as **DRAFT — AWAITING ARAN** in the recording room, so nobody')
  L.push('can record one thinking it is finished text. **Editing a line in the recording room is')
  L.push('what clears that mark** — the edit is the proofread, and it does not need to go')
  L.push('through anybody else.')
  L.push('')
  L.push('No line that was already written by a person has been touched, and no recording has')
  L.push('been deleted or re-made.')
  L.push('')

  for (const c of COURSES) {
    const { rows } = await db.query(
      `SELECT id, scene_number, sentence_number, speaker, known_text, target_text, target_text_draft
         FROM listening_pod_sentences WHERE pod_id = $1 AND global_order < $2
        ORDER BY global_order`, [`${c.code}:${POD_SLUG}`, CANONICAL_MAX_ORDER])
    const drafts = draftsFor(c.code)
    const drafted = rows.filter(r => r.target_text_draft)
    const fresh = drafted.filter(r => (drafts[slot(r)] || {}).kind === 'new')
    const reworded = drafted.filter(r => (drafts[slot(r)] || {}).kind === 'reworded')
    const noChange = reworded.filter(r => unchanged(r, drafts))
    const diff = JSON.parse(fs.readFileSync(path.join(ARCHIVE, `${c.code}-diff-summary.json`), 'utf8'))

    L.push(`## ${c.label} — \`${c.code}\``)
    L.push('')
    L.push(`**${drafted.length} lines are drafted and awaiting a proofread.** The other ${rows.length - drafted.length} of the ${rows.length} were written by a person and are untouched.`)
    L.push('')
    L.push(`- **${fresh.length} are new** — the canonical asked for a line that had never existed, so it was written from scratch against the surviving ${c.label} lines.`)
    L.push(`- **${reworded.length} are reworded** — Welsh already existed, but the English it was written for had changed. The old Welsh is shown under each, so the change is visible. **${noChange.length} of those needed no change at all** and are listed only so they can be confirmed.`)
    L.push('')
    if (diff && diff.buckets) {
      L.push(`_For the record: of the 231 canonical lines, ${diff.buckets.survives_unchanged} survived the canonical change word for word, ${diff.buckets.new} were brand new, ${diff.buckets.reworded} were reworded._`)
      L.push('')
    }
    L.push('---')
    L.push('')

    let scene = null
    for (const r of drafted) {
      if (r.scene_number !== scene) {
        scene = r.scene_number
        L.push(`### Scene ${scene}`)
        L.push('')
      }
      const d = drafts[slot(r)] || {}
      L.push(`**${r.sentence_number}. ${r.speaker}**`)
      L.push('')
      L.push(`> ${r.known_text}`)
      L.push('')
      L.push(`**${r.target_text}**`)
      L.push('')
      if (d.kind === 'reworded') {
        if (unchanged(r, drafts)) {
          L.push(`_Kept exactly as it was — ${d.note.replace(/^no change — /, '')}_`)
        } else {
          L.push(`_Was: ${d.from}_`)
          L.push('')
          L.push(`_Changed because ${d.note}_`)
        }
        L.push('')
      }
    }
  }

  L.push('---')
  L.push('')
  L.push('_A `…` inside a line is a breathing point for the recorder, not punctuation — it marks')
  L.push('where to take a breath and carry on. Leave them where they are unless one falls')
  L.push('somewhere unnatural._')
  L.push('')

  await db.end()
  fs.writeFileSync(OUT, L.join('\n'))
  console.log(OUT)
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
