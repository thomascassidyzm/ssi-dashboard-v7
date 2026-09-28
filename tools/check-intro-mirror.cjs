#!/usr/bin/env node
'use strict'
// tools/check-intro-mirror.cjs — does every introduction still quote what it introduces?
//
//   node tools/check-intro-mirror.cjs <course_code>                 # one course, human-readable
//   node tools/check-intro-mirror.cjs <course_code> --json          # machine-readable
//   node tools/check-intro-mirror.cjs <course_code> --seeds 61,153  # only these seeds (an edit job's scope)
//   node tools/check-intro-mirror.cjs <course_code> --strict        # exit 1 on any mismatch — THE END-OF-EDIT-JOB COMMAND
//   node tools/check-intro-mirror.cjs --all                         # every course, per-course counts only
//
// READ-ONLY. It never writes to course content. The rules are in services/shared/intro-mirror.cjs
// (Kai's ruling, 2026-09-28, job #557·I). It ALWAYS prints coverage: rows checked / rows with an
// intro / rows without, and how many lines the template could not parse, so a clean result can
// never be a result that judged nothing.
//
// Every edit job that touches a LEGO or component runs this as its LAST step (or lets
// recordContentEdit() run it at exit — see services/shared/content-edit-log.cjs, which registers
// exactly this command for the seeds an edit event names and fails the process on a mismatch).
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.psql'), quiet: true })
const { Client } = require('pg')

async function withPg(fn) {
  const pg = new Client({ connectionString: process.env.DATABASE_URL })
  await pg.connect()
  try { return await fn(pg) } finally { await pg.end() }
}

function summary(r) {
  const L = r.legos, C = r.components
  const lines = []
  lines.push(`[intro-mirror] ${r.course} (${r.known_lang} → ${r.target_lang}, "${r.targetLangName}")`)
  lines.push(`  LEGOs:      ${L.checked} checked / ${L.with_intro} with intro / ${L.without_intro} without (${L.new_without_intro} of them is_new = SILENT)`)
  lines.push(`              ${L.mirror} mirror, ${L.mismatch} MISMATCH, ${L.unparsed} unparsed, ${L.guarded} guarded (human-authored), ${L.li_diverges} lego_introductions diverge, ${L.keyed_stale} stale clips still keyed to a LEGO`)
  lines.push(`  components: ${C.checked} checked / ${C.with_intro} with intro (historic — never played) / ${C.without_intro} without`)
  lines.push(`              ${C.mirror} mirror, ${C.mismatch} MISMATCH, ${C.unparsed} unparsed`)
  return lines.join('\n')
}

async function main() {
  const args = process.argv.slice(2)
  const flag = (n) => args.includes(n)
  const val = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null }
  const json = flag('--json'), strict = flag('--strict'), all = flag('--all')
  const seeds = val('--seeds') ? val('--seeds').split(',').map(s => Number(s.trim())).filter(Number.isFinite) : null
  const course = args.find(a => !a.startsWith('--') && a !== val('--seeds'))
  if (!course && !all) { console.error('usage: check-intro-mirror.cjs <course_code> [--seeds 1,2] [--json] [--strict] | --all [--json]'); process.exit(2) }

  // language-code-service announces itself on stdout at require time; keep --json output clean.
  const realLog = console.log
  if (json) console.log = () => {}
  const { checkCourse } = require('../services/shared/intro-mirror.cjs')
  if (json) console.log = realLog

  if (all) {
    const rows = await withPg(async (pg) => {
      const { rows: courses } = await pg.query(
        `SELECT c.course_code FROM courses c
          WHERE EXISTS (SELECT 1 FROM course_legos l WHERE l.course_code = c.course_code AND l.presentation_audio_id IS NOT NULL)
             OR EXISTS (SELECT 1 FROM course_practice_phrases p WHERE p.course_code = c.course_code AND p.presentation_audio_id IS NOT NULL)
          ORDER BY c.course_code`)
      const out = []
      for (const c of courses) {
        try {
          const r = await checkCourse(pg, c.course_code)
          out.push({ course: r.course, known_lang: r.known_lang, legos_with_intro: r.legos.with_intro, legos_mismatch: r.legos.mismatch, legos_unparsed: r.legos.unparsed, legos_silent_new: r.legos.new_without_intro, li_diverges: r.legos.li_diverges, keyed_stale: r.legos.keyed_stale, components_with_intro: r.components.with_intro, components_mismatch: r.components.mismatch, components_unparsed: r.components.unparsed })
        } catch (e) { out.push({ course: c.course_code, error: e.message }) }
      }
      return out
    })
    if (json) { console.log(JSON.stringify(rows, null, 1)); return }
    console.log('course | known | lego intros | lego MISMATCH | lego unparsed | new silent | li diverge | keyed stale | comp intros | comp MISMATCH | comp unparsed')
    for (const r of rows) {
      if (r.error) { console.log(`${r.course} | ERROR ${r.error}`); continue }
      console.log(`${r.course} | ${r.known_lang} | ${r.legos_with_intro} | ${r.legos_mismatch} | ${r.legos_unparsed} | ${r.legos_silent_new} | ${r.li_diverges} | ${r.keyed_stale} | ${r.components_with_intro} | ${r.components_mismatch} | ${r.components_unparsed}`)
    }
    return
  }

  const r = await withPg((pg) => checkCourse(pg, course, { seeds }))
  if (json) { console.log(JSON.stringify(r, null, 1)); }
  else {
    console.log(summary(r))
    for (const m of r.mismatches) {
      console.log(`  ✗ ${m.kind} ${m.id} [${m.reasons.join(',')}] known="${m.known}"${m.parent_known ? ` parent="${m.parent_known}"` : ''}${m.guarded ? ' GUARDED' : ''}`)
      console.log(`      intro: ${m.intro}`)
      if (m.li_text) console.log(`      lego_introductions: ${m.li_text}`)
      for (const k of (m.keyed_stale || [])) console.log(`      keyed stale ${k.id}: ${k.text}`)
    }
    const silent = r.rows.filter(x => x.status === 'silent' && x.is_new)
    for (const s of silent) console.log(`  ∅ lego ${s.id} is_new with NO intro — known="${s.known}"${s.li_text ? ` (lego_introductions still: ${s.li_text})` : ''}`)
  }
  if (strict && r.mismatches.length) {
    console.error(`[intro-mirror] STRICT: ${r.mismatches.length} row(s) whose intro does not mirror its text in ${course}${seeds ? ` (seeds ${seeds.join(',')})` : ''}`)
    process.exit(1)
  }
}

if (require.main === module) main().catch(e => { console.error(e.stack || e.message); process.exit(2) })
module.exports = { summary }
