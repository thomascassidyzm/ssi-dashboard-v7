#!/usr/bin/env node
// Writes ops/lanes/phrase-quality/queue.json: every PRIORITY course (lib.priorityTier) cut into WINDOW-seed windows,
// round-robin (window 1 of every course, then window 2 …), tier by tier.
// Usage: node ops/lanes/phrase-quality/make-queue.cjs [--window 20]
'use strict'
const fs = require('fs'), path = require('path')
const { selectAll, inScope, priorityTier } = require('./lib.cjs')
const WINDOW = Number((process.argv.find((a, i) => process.argv[i - 1] === '--window')) || 20)

;(async () => {
  const courses = (await selectAll('courses', 'course_code,status', (q) => q.order('course_code'))).filter((c) => inScope(c) && priorityTier(c.course_code) !== null)
  courses.sort((a, b) => priorityTier(a.course_code) - priorityTier(b.course_code) || (a.status === 'released' ? 0 : 1) - (b.status === 'released' ? 0 : 1) || a.course_code.localeCompare(b.course_code))
  const per = []
  for (const c of courses) {
    const { data } = await require('./lib.cjs').client().from('course_seeds').select('seed_number').eq('course_code', c.course_code).order('seed_number', { ascending: false }).limit(1)
    const max = data && data[0] ? data[0].seed_number : 0
    const wins = []
    for (let s = 1; s <= max; s += WINDOW) wins.push({ id: `${c.course_code}:${s}-${Math.min(s + WINDOW - 1, max)}`, course: c.course_code, from: s, to: Math.min(s + WINDOW - 1, max) })
    per.push(wins)
  }
  // round-robin windows WITHIN a priority tier; a tier is finished before the next one starts
  const queue = []
  const tiers = [...new Set(courses.map((c) => priorityTier(c.course_code)))]
  for (const t of tiers) {
    const grp = per.filter((_, i) => priorityTier(courses[i].course_code) === t)
    for (let i = 0; grp.some((w) => w[i]); i++) for (const w of grp) if (w[i]) queue.push(w[i])
  }
  fs.writeFileSync(path.join(__dirname, 'queue.json'), JSON.stringify({ generated: new Date().toISOString(), window: WINDOW, courses: courses.map((c) => c.course_code), items: queue }, null, 1) + '\n')
  console.log(`${queue.length} windows over ${courses.length} courses`)
  process.exit(0)
})().catch((e) => { console.error(e.message); process.exit(1) })
