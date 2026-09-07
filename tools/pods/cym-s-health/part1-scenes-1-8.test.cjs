#!/usr/bin/env node
// The South rows must not leak North Welsh. Each marker below is a chunk the
// 57-row health-general-welsh overlay flagged 🏔 (northern), or a core N/S fork
// the cym_s_for_eng corpus settles the other way (moyn, gyda, nawr, gallu…).
// Single process, no suite, no DB:  node tools/pods/cym-s-health/part1-scenes-1-8.test.cjs
const assert = require('node:assert/strict')
const part = require('./part1-scenes-1-8.cjs')

const NORTH = [
  /\brŵan\b/, /\befo\b/, /\bisio\b/, /\bydy\b/, /\bdydy\b/, /\bdallt\b/, /\bnallt\b/, /\bd?deud(a|wch|wn|odd|ith)?\b/, /\bgneud\b/, /\bgnewch\b/,
  /\bella\b/, /\bmedr\w*/, /\bfedr\w*/, /\bylwch\b/, /\badra\b/, /\bgen i\b/, /\bgynnoch\b/, /\bgynnon\b/, /\bdach chi\b/, /\bdan ni\b/,
  /\bmai\b/, /\bfasa\w*/, /\blicio\b/, /\bliciech\b/, /\bgorffen\b/, /\bsownd\b/, /\bclên\b/, /\btoc\b/, /\bpicia\b/, /\bmae 'na\b/, /\bmae o\b/, /\bydy o\b/,
  /'ta\b/, /\bdel\b/, /\bmi (dria|fedra|wna|fydda|ddeuda|ofynna|gadwa|gofia|adawa|ddo|gewch|fydd|fedar)\b/, /\bpetha\b/, /\bchydig\b/, /\bsâl\b/, /\bwedi gorffen\b/,
]

assert.equal(part.length, 162, 'row count')
assert.equal(new Set(part.map(r => r[0])).size, 162, 'unique tails')
for (const [tail, text, note] of part) { assert.ok(text, `${tail} text`); assert.ok(note, `${tail} note`) }
for (const [tail] of part) assert.ok(Number(tail.slice(2, 4)) <= 8, `${tail} outside scenes 1-8`)
const leaks = []
for (const [tail, text] of part) for (const re of NORTH) if (re.test(text)) leaks.push(`${tail}: ${re} in "${text}"`)
assert.deepEqual(leaks, [], 'North Welsh leaked into South rows')
console.log('ok — 162 rows, scenes 1-8, no North marker')
