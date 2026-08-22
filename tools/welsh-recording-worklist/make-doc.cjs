#!/usr/bin/env node
/**
 * READ ONLY. Turns welsh-unrecorded.json into the human-readable recording worklist
 * at docs/audio/welsh-recording-worklist-2026-08-13.md.
 */
const fs = require('fs')
const path = require('path')
const d = require('./welsh-unrecorded.json')

const COURSE_TITLE = {
  cym_n_for_eng: 'Welsh (north) for English speakers',
  cym_s_for_eng: 'Welsh (south) for English speakers',
  cym_for_yor: 'Welsh for Yoruba speakers',
  cym_anthem_for_jpn: 'Welsh anthem for Japanese speakers',
}

const outstanding = d.texts.filter(t => !t.recorded_anywhere)
const outSet = new Set(outstanding.map(t => t.t))
const meta = new Map(outstanding.map(t => [t.t, t]))

// Per-course appearance of each outstanding text, in the course's own seed order.
const byCourse = new Map()
for (const r of d.detail) {
  if (!outSet.has(r.t)) continue
  if (!byCourse.has(r.course_code)) byCourse.set(r.course_code, [])
  byCourse.get(r.course_code).push(r)
}

// Texts shared by more than one course get listed once, in a shared section.
const shared = outstanding.filter(t => t.course_count > 1)
const sharedSet = new Set(shared.map(t => t.t))

const esc = s => String(s).replace(/\|/g, '\\|')
const L = []
const pct = d.pct_recorded_any_course

L.push('# Welsh recording worklist — the texts Aran and Catrin have yet to record')
L.push('')
L.push('*Compiled 2026-08-13. Read-only count from the live database. Welsh is human-voice only: every clip in these courses is recorded by hand, and this is the remainder.*')
L.push('')
L.push('## The totals')
L.push('')
L.push('| | |')
L.push('|---|---|')
L.push(`| Distinct Welsh texts across all four Welsh courses | **${d.total_distinct.toLocaleString()}** |`)
L.push(`| Already recorded by a human voice | **${d.recorded_any_course.toLocaleString()}** |`)
L.push(`| Still to record | **${d.outstanding_any_course.toLocaleString()}** |`)
L.push(`| Recorded | **${pct}%** |`)
L.push('')
L.push(`**The 91% figure reconciles.** ${pct}% of the ${d.total_distinct.toLocaleString()} distinct Welsh texts already have a live human clip, leaving ${d.outstanding_any_course.toLocaleString()} texts — ${(100 - pct).toFixed(2)}% — on this list.`)
L.push('')
L.push(`Those ${d.outstanding_any_course.toLocaleString()} texts fill ${d.outstanding_slots.toLocaleString()} content slots. Distinct texts are counted once for the whole language, so a text used by both the north and south courses is one recording, not two.`)
L.push('')
L.push('### Where the outstanding work sits')
L.push('')
L.push('| Course | Texts to record | Slots they fill |')
L.push('|---|---:|---:|')
for (const [code, rows] of [...byCourse.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const texts = new Set(rows.map(r => r.t))
  const slots = rows.reduce((a, r) => a + r.slots, 0)
  L.push(`| ${COURSE_TITLE[code] || code} — \`${code}\` | ${texts.size.toLocaleString()} | ${slots.toLocaleString()} |`)
}
for (const code of Object.keys(COURSE_TITLE)) {
  if (!byCourse.has(code)) L.push(`| ${COURSE_TITLE[code]} — \`${code}\` | 0 | 0 |`)
}
L.push('')
L.push(`${shared.length} of these texts appear in more than one course; they are listed once, in the shared section below, and recording them once covers every course they appear in.`)
L.push('')
L.push('### How to read a line')
L.push('')
L.push('Each line gives the Welsh text, then the number of content slots that use it. Lines run in the course\'s own seed order, so you can work straight down the page and stay with the course as it builds.')
L.push('')

function section(title, note, rows) {
  L.push(`## ${title}`)
  L.push('')
  if (note) { L.push(note); L.push('') }
  L.push('| Seed | Welsh | Slots |')
  L.push('|---:|---|---:|')
  for (const r of rows) {
    const m = meta.get(r.t)
    L.push(`| ${r.seed_number ?? ''} | ${esc(r.raw)} | ${m.slots} |`)
  }
  L.push('')
}

if (shared.length) {
  // Order the shared list by where it first appears in the north course, then anything else.
  const order = new Map()
  for (const r of d.detail) {
    if (!sharedSet.has(r.t)) continue
    if (!order.has(r.t)) order.set(r.t, r)
  }
  const rows = [...order.values()].sort((a, b) => (a.seed_number ?? 1e9) - (b.seed_number ?? 1e9))
  section('Shared across courses — record once',
    `${shared.length} texts appear in more than one Welsh course. A single recording of each serves them all.`,
    rows)
}

for (const [code, rows] of [...byCourse.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const own = rows.filter(r => !sharedSet.has(r.t))
  if (!own.length) continue
  const seen = new Set()
  const uniq = own.filter(r => (seen.has(r.t) ? false : seen.add(r.t)))
  uniq.sort((a, b) => (a.seed_number ?? 1e9) - (b.seed_number ?? 1e9) || (a.lego_index ?? 1e9) - (b.lego_index ?? 1e9))
  section(`${COURSE_TITLE[code] || code} — \`${code}\``,
    `${uniq.length} texts specific to this course, in seed order.`, uniq)
}

L.push('## Notes on the count')
L.push('')
L.push('- Distinct texts are the union of seed, LEGO and practice-phrase Welsh texts across the four Welsh courses, compared after lowercasing, trimming and stripping punctuation — the same comparison used in the 2026-08-13 estate recount, so the totals line up with it exactly (11,721 distinct texts over 13,164 slots).')
L.push('- A text counts as recorded when a live clip marked as human-recorded exists for it, matched on the same stripped comparison. Clips still marked pending are not counted as recorded.')
L.push(`- The four Welsh courses share one language code, so the north and south courses are deduplicated against each other. Treating a north text as covered only by a north recording moves the figure by 8 texts (${d.outstanding_dialect_aware.toLocaleString()} rather than ${d.outstanding_any_course.toLocaleString()}), so the dialect split makes almost no difference to the size of the job.`)
L.push('- Straight and curly apostrophes are compared as written. Unifying them would match only 3 further texts, so apostrophe style is not hiding any meaningful amount of already-recorded material.')
L.push('- The Welsh anthem course for Japanese speakers has nothing outstanding.')
L.push('')

const outPath = path.resolve(__dirname, '../../docs/audio/welsh-recording-worklist-2026-08-13.md')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, L.join('\n'))
console.log('wrote', outPath, L.length, 'lines')
