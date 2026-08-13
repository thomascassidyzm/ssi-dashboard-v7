#!/usr/bin/env node
/**
 * READ ONLY. Joins content-counts.json + coverage.json + course-voices.json into the
 * per-language before/after table. No DB access, no writes outside this directory.
 *
 * HUMAN-VOICE LANGUAGES ARE DROPPED HERE TOO (Tom 2026-08-13), not only upstream:
 * this file's inputs are committed JSON, so it can be re-run against a snapshot
 * taken before the exclusion existed. The filter runs on the joined rows and the
 * assertion runs on the output, so a stale content-counts.json cannot put Welsh
 * back into a render total. cym was in the original PREMIUM8 list below and has
 * been removed from it — the premium set is now 7 languages.
 */
const fs = require('fs')
const { isHumanVoiceLang, assertNoHumanVoiceInQueue } = require('../../services/shared/human-voice-courses.cjs')
const counts = require('./content-counts.json').filter(r => !isHumanVoiceLang(r.lang))
const coverage = require('./coverage.json')
const cvoices = require('./course-voices.json')
const voices = require('./voices.json')

const RATE = 15.0 / 1e6           // $/char, xAI TTS (phase8-audio-v13.cjs POD_CHARS_TO_COST)
const AVG_CHARS = 22              // the 2026-08-12 doc's own basis, kept for the OLD column

const engine = new Map(voices.map(v => [v.vb, v.tts_engine]))
const cov = new Map()             // lang -> voice -> {covered, chars_covered}
for (const r of coverage) {
  if (!cov.has(r.lang)) cov.set(r.lang, new Map())
  cov.get(r.lang).set(r.voice, { covered: +r.covered, chars: +r.chars_covered })
}

// Intended cast pair per language: the xAI target1/target2 any course in that language points at.
const cast = new Map()
for (const c of cvoices) {
  if (c.p1 !== 'xai' && c.p2 !== 'xai') continue
  if (!cast.has(c.lang)) cast.set(c.lang, { t1: new Set(), t2: new Set(), courses: [] })
  const g = cast.get(c.lang)
  if (c.p1 === 'xai' && c.t1) g.t1.add(c.t1)
  if (c.p2 === 'xai' && c.t2) g.t2.add(c.t2)
  g.courses.push(c.course_code)
}

const status = new Map()
for (const c of cvoices) {
  const s = status.get(c.lang) || { live: 0, beta: 0, other: 0, premium: 0, courses: 0 }
  s.courses++
  if (c.new_app_status === 'live') s.live++
  else if (c.new_app_status === 'beta') s.beta++
  else s.other++
  if (c.pricing_tier === 'premium') s.premium++
  status.set(c.lang, s)
}

const out = counts.map(r => {
  const c = cast.get(r.lang)
  const pair = c ? [...new Set([...c.t1, ...c.t2])].sort() : []
  const lc = cov.get(r.lang) || new Map()

  // OLD: 2026-08-12 basis - distinct per language x 2 voices, zero reuse credit, 22-char avg
  const old_renders = r.perlang_distinct * 2
  const old_cost = old_renders * AVG_CHARS * RATE

  // Fully per-course, for reference: what a per-course-per-slot render would have cost
  const percourse_renders = r.percourse_distinct * 2
  const slot_renders = r.slots * 2

  // NEW: same two render units per distinct text, minus units already alive on that exact voice
  let credit = 0, credit_chars = 0
  const per_voice = []
  for (const v of (pair.length ? pair : [])) {
    const e = lc.get(v) || { covered: 0, chars: 0 }
    credit += e.covered; credit_chars += e.chars
    per_voice.push({ voice: v, engine: engine.get(v) || '?', covered: e.covered, to_render: r.perlang_distinct - e.covered })
  }
  // A course always needs target1 AND target2, so it is always two voice slots per text.
  // A language with only ONE xAI voice cast (fin/sal) gets credit on that one and pays full
  // freight on the other, which is still undecided - it does not get to render half a course.
  const VOICE_SLOTS = 2
  const new_renders = r.perlang_distinct * VOICE_SLOTS - credit
  const new_chars = r.chars * VOICE_SLOTS - credit_chars
  const new_cost = new_chars * RATE

  return {
    lang: r.lang,
    courses: r.courses,
    ...(status.get(r.lang) || {}),
    slots: r.slots,
    percourse_distinct: r.percourse_distinct,
    perlang_distinct: r.perlang_distinct,
    chars: r.chars,
    cast_pair: pair,
    cast_engine: pair.map(v => engine.get(v) || '?'),
    voice_decided: pair.length > 0,
    old_renders, old_cost: +old_cost.toFixed(2),
    percourse_renders, slot_renders,
    per_voice,
    credit,
    new_renders, new_cost: +new_cost.toFixed(2),
  }
}).sort((a, b) => b.old_renders - a.old_renders)

assertNoHumanVoiceInQueue(out, { context: 'noneng-distinct-recount/rollup', lang: r => r.lang })
fs.writeFileSync(__dirname + '/rollup.json', JSON.stringify(out, null, 1))

// Was PREMIUM8 with 'cym'. Welsh is human-voiced and never renders (Tom 2026-08-13),
// so the premium render set is seven languages.
const PREMIUM7 = ['spa', 'kor', 'zho', 'por', 'ita', 'jpn', 'ara']
const sum = (rows, k) => rows.reduce((a, b) => a + b[k], 0)
const p8 = out.filter(r => PREMIUM7.includes(r.lang))
const fd = out.filter(r => ['fra', 'deu'].includes(r.lang))
console.log('--- the 7 premium render languages (Welsh excluded: human-voiced) ---')
console.log('perlang_distinct (the "210k")', sum(p8, 'perlang_distinct'))
console.log('per-course distinct        ', sum(p8, 'percourse_distinct'))
console.log('raw slots                  ', sum(p8, 'slots'))
console.log('OLD renders x2 / cost      ', sum(p8, 'old_renders'), '$' + sum(p8, 'old_cost').toFixed(2))
console.log('NEW renders / cost         ', sum(p8, 'new_renders'), '$' + sum(p8, 'new_cost').toFixed(2))
console.log('reuse credit               ', sum(p8, 'credit'))
console.log('--- fra + deu (excluded, pending #334) ---')
console.log('OLD', sum(fd, 'old_renders'), '$' + sum(fd, 'old_cost').toFixed(2), '| NEW', sum(fd, 'new_renders'), '$' + sum(fd, 'new_cost').toFixed(2))
console.log('--- all non-English render languages (human-voice languages excluded) ---')
console.log('OLD', sum(out, 'old_renders'), '$' + sum(out, 'old_cost').toFixed(2), '| NEW', sum(out, 'new_renders'), '$' + sum(out, 'new_cost').toFixed(2))
console.log('voice decided for', out.filter(r => r.voice_decided).length, 'of', out.length, 'languages')
