#!/usr/bin/env node
'use strict'
// tools/check-debut-practice.cjs — does every debut LEGO (is_new=true) have practice phrases?
//
//   node tools/check-debut-practice.cjs <course_code>                # one course, human-readable
//   node tools/check-debut-practice.cjs <course_code> --seeds 190,202 # only these seeds (an edit job's scope)
//   node tools/check-debut-practice.cjs <course_code> --strict       # exit 2 on any blocking debut — THE END-OF-SWEEP COMMAND
//   node tools/check-debut-practice.cjs <course_code> --json         # machine-readable, every list in full
//   node tools/check-debut-practice.cjs --all                        # every course, one line each
//
// READ-ONLY. The rule and its reasons are in services/shared/debut-practice.cjs (Tom, 2026-09-30):
// a debut with no practice, or with no USE phrase, BLOCKS — it is the same check the release gate
// runs; thin baskets, dark not-new baskets and is_new flags that disagree with first appearance are
// REPORTED. recordContentEdit() runs this with --strict at exit for the seeds a sweep names, so a
// sweep that empties a debut's basket fails loudly (services/shared/content-edit-log.cjs).
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true })
const { createClient } = require('@supabase/supabase-js')
const { checkCourseDebutPractice, describeBlocking } = require('../services/shared/debut-practice.cjs')

function args(argv) {
  const a = { course: null, seeds: null, strict: false, json: false, all: false }
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i]
    if (v === '--seeds') a.seeds = String(argv[++i] || '').split(',').map(Number).filter(Number.isFinite)
    else if (v === '--strict') a.strict = true
    else if (v === '--json') a.json = true
    else if (v === '--all') a.all = true
    else if (!v.startsWith('--')) a.course = v
  }
  return a
}

function line(r) {
  const n = r.isNew
  return `${r.courseCode.padEnd(20)} debuts ${String(r.debuts).padStart(5)}  BLOCKING ${String(r.blocking.length).padStart(4)}` +
    `  (unpractised ${r.blocking.filter(b => b.reason === 'UNPRACTISED').length}, no USE ${r.blocking.filter(b => b.reason === 'NO_USE').length})` +
    `  thin ${String(r.thin.length).padStart(4)}  dark ${String(r.dark.length).padStart(3)}` +
    (n ? `  is_new: repeat ${n.repeatNew.length}, first-not-new ${n.firstNotNew.length}, never-debuted ${n.neverDebuted.length}` : '')
}

async function main() {
  const a = args(process.argv.slice(2))
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  let courses = a.course ? [a.course] : []
  if (a.all) {
    const { data, error } = await supabase.from('courses').select('course_code').order('course_code')
    if (error) throw new Error(error.message)
    courses = data.map(c => c.course_code)
  }
  if (!courses.length) { console.error('usage: check-debut-practice.cjs <course_code>|--all [--seeds a,b] [--strict] [--json]'); process.exit(64) }
  const results = []
  for (const c of courses) results.push(await checkCourseDebutPractice(supabase, c, { seeds: a.seeds }))
  if (a.json) console.log(JSON.stringify(results.length === 1 ? results[0] : results, null, 2))
  else {
    for (const r of results) {
      console.log(line(r))
      if (!a.all) for (const b of r.blocking) console.log('  ✗ ' + describeBlocking(b))
    }
  }
  const blocking = results.reduce((s, r) => s + r.blocking.length, 0)
  if (a.strict && blocking) process.exit(2)
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1) })
