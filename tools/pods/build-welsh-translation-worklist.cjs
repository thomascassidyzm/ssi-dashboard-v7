#!/usr/bin/env node
/**
 * build-welsh-translation-worklist.cjs — the human-readable list of Welsh lines that
 * need a person, produced from the alignment archive. Two kinds:
 *
 *   REWORDED — Welsh exists but was written against English that has since changed.
 *              Usually a small edit, not a fresh translation. Read side by side.
 *   STALE    — the English is gone from the canonical entirely; the Welsh goes with it.
 *
 * Brand-new lines (no Welsh at all) are counted, not listed line by line — that list is
 * simply "the canonical", and the sheets already mark it per scene.
 *
 * Written for a phone screen: scene headings, no JSON. The machine-readable form stays
 * in docs/pods/pod0-welsh-prealign-archive-2026-08-06/*.json.
 */
'use strict'
const fs = require('fs')
const path = require('path')

const ARCHIVE = path.join(__dirname, '..', '..', 'docs', 'pods', 'pod0-welsh-prealign-archive-2026-08-06')
const OUT = path.join(__dirname, '..', '..', 'docs', 'pods', 'pod0-welsh-translation-worklist-2026-08-06.md')
const COURSES = [
  { code: 'cym_n_for_eng', label: 'Northern Welsh' },
  { code: 'cym_s_for_eng', label: 'Southern Welsh' },
]

const L = []
L.push('# Welsh pod-0 — the lines that need a person')
L.push('')
L.push("Built 2026-08-06 against Aran's 2026-08-06 pod-0 canonical (231 sentences, 22 scenes).")
L.push('')
L.push('Nothing here was translated by a machine and nothing was overwritten. These are the')
L.push('lines where Welsh already exists but the English it was written for has changed, so a')
L.push('human has to decide whether the Welsh still stands. Until someone does, the slot')
L.push('carries **no Welsh** and is **not in the recording queue** — a recorder cannot be')
L.push('served it by accident.')
L.push('')

for (const c of COURSES) {
  const items = JSON.parse(fs.readFileSync(path.join(ARCHIVE, `${c.code}-welsh-needing-translation.json`), 'utf8'))
  const diff = JSON.parse(fs.readFileSync(path.join(ARCHIVE, `${c.code}-diff-summary.json`), 'utf8'))
  L.push(`## ${c.label} — \`${c.code}\``)
  L.push('')
  L.push(`**${diff.buckets.new} lines are brand new** and have no Welsh at all — those need translating from scratch, and they are marked scene by scene in the recording sheets.`)
  L.push('')
  L.push(`**${items.length} lines are listed below**: Welsh exists, but read it against the new English before it is used.`)
  L.push('')

  const reworded = items.filter(i => i.reason.startsWith('reworded'))
  const stale = items.filter(i => i.reason === 'stale')

  if (reworded.length) {
    L.push(`### Reworded — check the Welsh still fits (${reworded.length})`)
    L.push('')
    let scene = null
    for (const i of reworded.sort((a, b) => (a.new_scene - b.new_scene) || (a.new_sentence - b.new_sentence))) {
      if (i.new_scene !== scene) { scene = i.new_scene; L.push(`**Scene ${scene}**`); L.push('') }
      L.push(`- Line ${i.new_sentence}`)
      L.push(`  - was: *${i.old_english}*`)
      L.push(`  - now: **${i.new_english}**`)
      L.push(`  - Welsh written for the old line: \`${i.welsh_written_for_old_english}\``)
      if (i.target_audio_id_dropped) L.push(`  - a Welsh take exists for the old line and needs re-recording — the recording itself has NOT been deleted`)
      if (i.known_audio_id_dropped) L.push(`  - the English guide take needs re-recording — the recording itself has NOT been deleted`)
      L.push('')
    }
  }

  if (stale.length) {
    L.push(`### Gone from the canonical — the Welsh goes with it (${stale.length})`)
    L.push('')
    for (const i of stale) {
      L.push(`- Scene ${i.old_scene}, line ${i.old_sentence}`)
      L.push(`  - English, now gone: *${i.old_english}*`)
      L.push(`  - Welsh, now unused: \`${i.welsh_written_for_old_english}\``)
      if (i.target_audio_id_dropped || i.known_audio_id_dropped) {
        L.push(`  - a recording exists for it and is now orphaned — kept, not deleted; deleting it is Tom and Aran's call`)
      }
      L.push('')
    }
  } else {
    L.push('_Nothing gone from the canonical for this course._')
    L.push('')
  }
}

fs.writeFileSync(OUT, L.join('\n'))
console.log(OUT)
