#!/usr/bin/env node
// Writes ops/lanes/phrase-quality/queue.json: every in-scope course cut into WINDOW-seed windows,
// ordered round-robin (window 1 of every course, then window 2 …) with released courses first, so
// the lane covers every language's foundation seeds before it goes deep into any one.
// Usage: node ops/lanes/phrase-quality/make-queue.cjs [--window 20]
'use strict'
const fs = require('fs'), path = require('path')
const { select, inScope } = require('./lib.cjs')
const WINDOW = Number((process.argv.find((a, i) => process.argv[i - 1] === '--window')) || 20)

;(async () => {
  const courses = (await select('courses', 'select=course_code,status&order=course_code')).filter(inScope)
  courses.sort((a, b) => (a.status === 'released' ? 0 : 1) - (b.status === 'released' ? 0 : 1) || a.course_code.localeCompare(b.course_code))
  const per = []
  for (const c of courses) {
    const top = await select('course_seeds', `select=seed_number&course_code=eq.${c.course_code}&order=seed_number.desc&limit=1`)
    const max = top[0] ? top[0].seed_number : 0
    const wins = []
    for (let s = 1; s <= max; s += WINDOW) wins.push({ id: `${c.course_code}:${s}-${Math.min(s + WINDOW - 1, max)}`, course: c.course_code, from: s, to: Math.min(s + WINDOW - 1, max) })
    per.push(wins)
  }
  const queue = []
  for (let i = 0; per.some((w) => w[i]); i++) for (const w of per) if (w[i]) queue.push(w[i])
  const out = path.join(__dirname, 'queue.json')
  fs.writeFileSync(out, JSON.stringify({ generated: new Date().toISOString(), window: WINDOW, courses: courses.map((c) => c.course_code), items: queue }, null, 1) + '\n')
  console.log(`${queue.length} windows over ${courses.length} courses → ${out}`)
})().catch((e) => { console.error(e.message); process.exit(1) })
