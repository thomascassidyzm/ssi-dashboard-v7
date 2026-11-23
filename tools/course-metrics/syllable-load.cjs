#!/usr/bin/env node
/**
 * syllable-load.cjs — how many NEW syllables a course asks a learner to produce, and how fast (job #552, Aran
 * 2026-11-22: the Korean opening "asks learners to produce too many new syllables too soon").
 *
 * READ PATH: Popty's own learner-view script, GET /api/production/:course/learning-journey?learnerView=1 (any course;
 * the same generator the dashboard's journey viewer uses — debut, shortest-first build phrases, review, consolidate).
 * For kor_for_eng (the only course the editor serves) item ids are filled in from GET /api/production/:course/course-editor
 * so a flagged line names its phrase id. READ-ONLY: no write route is called, and nothing touches the DB directly.
 *
 * WHAT IS MEASURED. A "line" is one thing the learner must SAY: the LEGO debut, each build phrase, each consolidate
 * phrase (review items are repeats of older LEGOs and are counted only in the "with review" repetition figure).
 *   syl          syllables in the line's target text
 *   new          syllable TYPES in this line never produced in any earlier line of the course
 *   new10        new syllables in the last 10 lines (the ramp; its peak is the worst burst)
 *   targetSylPerEnglishSyl  target syllables ÷ English (known) syllables — how much longer the target says the same thing
 *   cum@N        distinct syllables produced after N lines
 *   repsPerSyl   syllable tokens ÷ syllable types in the range (how often each syllable is said; higher = more practice)
 *   hiFreqShare  share of the range's syllable tokens that are among the course's own 100 most-used syllables
 *
 * SYLLABLES. Korean: one Hangul block (U+AC00–U+D7A3) = one syllable, EXACT (orthographic: 말하고 is 3 blocks though
 * spoken [마라고] resyllabifies; identity is the written block). Welsh: vowel-group nuclei (a e i o u w y + accented),
 * consonants between nuclei split VC.CV with Welsh digraphs as one consonant — an APPROXIMATION; it misses hiatus
 * (trio, diolch = 2 spoken, 1 counted) and over-counts consonantal w (gwneud = 1 spoken, 2 counted). Other Latin-script
 * targets use the same vowel-group split with a generic vowel set (approximate); Han characters count one each.
 *
 * USAGE
 *   node tools/course-metrics/syllable-load.cjs --course kor_for_eng --seeds 1-8
 *   node tools/course-metrics/syllable-load.cjs --course cym_n_for_eng --lines 1-120 --worst 15
 *   node tools/course-metrics/syllable-load.cjs --course kor_for_eng --draft tools/course-metrics/kor-opening-draft.json
 *   options: --seeds A-B | --legos A-B | --lines A-B   (range; seeds/legos are running-order positions, 1-based)
 *            --draft <file>   measure a draft opening ({ lines: [{ pos, id, kind: lego|phrase, target, known, change }] };
 *                             change 'remove' lines are skipped)
 *                             against the live course's frequency table; the draft is taken as the order heard
 *            --worst N        list the N heaviest lines   --json <file>  write everything as JSON
 *            --windows        new-syllables-per-line in windows of 25 lines over the first 600 (where load settles)
 *            --base URL       Popty production API (default http://localhost:3470)
 */
'use strict'

const fs = require('fs')
const { countSyllables } = require('../lib/syllable-counters.cjs')
const knownSyl = (t) => { try { return countSyllables(t, 'eng') } catch { return 0 } }

const HANGUL = /[가-힣]/g
const HAN = /[㐀-䶿一-鿿豈-﫿]/g
const CYM_VOWELS = 'aeiouwyâêîôûŵŷáéíóúẃýàèìòùẁỳäëïöüẅÿ'
const LATIN_VOWELS = 'aeiouyâêîôûáéíóúàèìòùäëïöüãõœæ'
const CYM_DIGRAPHS = ['ch', 'dd', 'ff', 'ng', 'll', 'ph', 'rh', 'th']

/** Split one Latin-script word into syllable strings by vowel-group nuclei (VC.CV for clusters). */
function splitLatinWord(word, vowels, digraphs) {
  const units = []
  for (let i = 0; i < word.length;) {
    const d = digraphs.find((g) => word.startsWith(g, i))
    if (d) { units.push(d); i += d.length } else { units.push(word[i]); i++ }
  }
  const isV = (u) => u.length === 1 && vowels.includes(u)
  const nuclei = []
  for (let i = 0; i < units.length; i++) {
    if (isV(units[i]) && (i === 0 || !isV(units[i - 1]))) nuclei.push([i, i])
    else if (isV(units[i])) nuclei[nuclei.length - 1][1] = i
  }
  if (!nuclei.length) return word ? [word] : []
  const cuts = [0]
  for (let k = 1; k < nuclei.length; k++) {
    const gap = nuclei[k][0] - nuclei[k - 1][1] - 1
    cuts.push(gap <= 1 ? nuclei[k][0] - gap : nuclei[k - 1][1] + 2)
  }
  cuts.push(units.length)
  const out = []
  for (let k = 0; k < cuts.length - 1; k++) out.push(units.slice(cuts[k], cuts[k + 1]).join(''))
  return out
}

function latinWords(text) {
  return String(text || '').toLowerCase().replace(/[’'`]/g, '').replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter(Boolean)
}

/** Syllables of a target text, as strings (identity matters: "new" means a string not produced before). */
function syllables(text, lang) {
  const t = String(text || '')
  if (lang === 'kor') return t.match(HANGUL) || []
  if (lang === 'zho' || lang === 'cmn') return t.match(HAN) || []
  const vowels = lang === 'cym' ? CYM_VOWELS : LATIN_VOWELS
  const digraphs = lang === 'cym' ? CYM_DIGRAPHS : []
  return latinWords(t).flatMap((w) => splitLatinWord(w, vowels, digraphs))
}

const langOf = (course) => String(course).split('_')[0].slice(0, 3)

async function getJson(url) {
  const r = await fetch(url, { headers: { 'x-agent-id': process.env.AGENT_ID || 'syllable-load' } })
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return r.json()
}

/** The learner's sequence from Popty's journey route, with phrase ids from the course editor where it serves the course. */
async function loadCourse(base, course, maxLegos = 100000) {
  const j = await getJson(`${base}/api/production/${course}/learning-journey?learnerView=1&maxLegos=${maxLegos}`)
  let ids = null
  try {
    const ed = await getJson(`${base}/api/production/${course}/course-editor`)
    ids = new Map()
    let lego = null
    for (const it of ed.items) {
      if (it.t === 'l') lego = it.id
      const k = `${lego}|${it.tx}|${it.kn}`
      if (!ids.has(k)) ids.set(k, it.id)
    }
  } catch { /* editor serves kor_for_eng only; other courses report ids as lego id + role */ }
  const seedPos = new Map()
  const out = []
  for (const it of j.allItems) {
    if (it.type === 'intro') continue
    if (!seedPos.has(it.seedNumber)) seedPos.set(it.seedNumber, seedPos.size + 1)
    const id = it.type === 'debut' ? it.legoId
      : (ids && ids.get(`${it.legoId}|${it.target_text}|${it.known_text}`)) || `${it.legoId}:${it.type}`
    out.push({ id, kind: it.type === 'debut' ? 'lego' : it.type === 'review' ? 'review' : 'phrase', type: it.type,
      round: it.roundNumber, seedPos: seedPos.get(it.seedNumber), legoId: it.legoId, target: it.target_text, known: it.known_text })
  }
  return out
}

function pickRange(seq, { seeds, legos, lines }) {
  if (seeds) return seq.filter((x) => x.seedPos >= seeds[0] && x.seedPos <= seeds[1])
  if (legos) return seq.filter((x) => x.round >= legos[0] && x.round <= legos[1])
  if (lines) {
    const said = seq.filter((x) => x.kind !== 'review')
    const last = said[Math.min(lines[1], said.length) - 1]
    const first = said[lines[0] - 1]
    return seq.slice(seq.indexOf(first), seq.indexOf(last) + 1)
  }
  return seq
}

/** Top-N syllable types over every line the course has (the frequency reference). */
function topSyllables(seq, lang, n = 100) {
  const c = new Map()
  for (const x of seq) if (x.kind !== 'review') for (const s of syllables(x.target, lang)) c.set(s, (c.get(s) || 0) + 1)
  return new Set([...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([s]) => s))
}

const q = (arr, p) => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))] }
const r2 = (x) => Math.round(x * 100) / 100

/** Per-line numbers for a sequence, carrying `seen` (syllables produced before the sequence starts). */
function measure(seq, lang, top, seen0 = new Set()) {
  const seen = new Set(seen0)
  const lines = []
  let tokensAll = 0
  const typesAll = new Set()
  for (const x of seq) {
    const syl = syllables(x.target, lang)
    tokensAll += syl.length
    syl.forEach((s) => typesAll.add(s))
    if (x.kind === 'review') { syl.forEach((s) => seen.add(s)); continue }
    const fresh = [...new Set(syl.filter((s) => !seen.has(s)))]
    fresh.forEach((s) => seen.add(s))
    lines.push({ ...x, syl: syl.length, new: fresh.length, newSyl: fresh.join(''), hi: syl.filter((s) => top.has(s)).length, knownSyl: knownSyl(x.known) })
  }
  lines.forEach((l, i) => {
    const w = lines.slice(Math.max(0, i - 9), i + 1)
    l.new10 = w.reduce((a, b) => a + b.new, 0)
  })
  const tok = lines.reduce((a, l) => a + l.syl, 0)
  const types = new Set(lines.flatMap((l) => syllables(l.target, lang)))
  const legoLines = lines.filter((l) => l.kind === 'lego')
  const cum = (n) => { const s = new Set(); lines.slice(0, n).forEach((l) => syllables(l.target, lang).forEach((x) => s.add(x))); return s.size }
  const summary = {
    lines: lines.length, legos: legoLines.length, syllableTokens: tok, syllableTypes: types.size,
    sylPerLine: { mean: r2(tok / (lines.length || 1)), p90: q(lines.map((l) => l.syl), 0.9), max: Math.max(0, ...lines.map((l) => l.syl)) },
    newPerLine: { mean: r2(lines.reduce((a, l) => a + l.new, 0) / (lines.length || 1)), max: Math.max(0, ...lines.map((l) => l.new)) },
    linesWith3PlusNew: lines.filter((l) => l.new >= 3).length,
    peakNewIn10Lines: Math.max(0, ...lines.map((l) => l.new10)),
    newInFirst10Lines: lines.slice(0, 10).reduce((a, l) => a + l.new, 0),
    targetSylPerEnglishSyl: r2(tok / (lines.reduce((a, l) => a + l.knownSyl, 0) || 1)),
    legoSyl: { mean: r2(legoLines.reduce((a, l) => a + l.syl, 0) / (legoLines.length || 1)), max: Math.max(0, ...legoLines.map((l) => l.syl)) },
    cumAt: { 10: cum(10), 25: cum(25), 50: cum(50), 100: cum(100) },
    repsPerSyl: r2(tok / (types.size || 1)),
    repsPerSylWithReview: r2(tokensAll / (typesAll.size || 1)),
    hiFreqShare: r2(lines.reduce((a, l) => a + l.hi, 0) / (tok || 1)),
  }
  return { summary, lines }
}

function windows(seq, lang, size = 25, upTo = 600) {
  const m = measure(seq, lang, new Set()).lines.slice(0, upTo)
  const out = []
  for (let i = 0; i < m.length; i += size) {
    const w = m.slice(i, i + size)
    out.push({ lines: `${i + 1}-${i + w.length}`, seeds: `${w[0].seedPos}-${w[w.length - 1].seedPos}`, newPerLine: r2(w.reduce((a, l) => a + l.new, 0) / w.length), sylPerLine: r2(w.reduce((a, l) => a + l.syl, 0) / w.length) })
  }
  return out
}

function parseArgs(argv) {
  const a = { base: 'http://localhost:3470', worst: 0 }
  const range = (s) => { const [x, y] = String(s).split('-').map(Number); return [x, y || x] }
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1]
    if (k === '--course') { a.course = v; i++ } else if (k === '--seeds') { a.seeds = range(v); i++ }
    else if (k === '--legos') { a.legos = range(v); i++ } else if (k === '--lines') { a.lines = range(v); i++ }
    else if (k === '--draft') { a.draft = v; i++ } else if (k === '--worst') { a.worst = Number(v); i++ }
    else if (k === '--json') { a.json = v; i++ } else if (k === '--base') { a.base = v; i++ }
    else if (k === '--lang') { a.lang = v; i++ } else if (k === '--windows') a.windows = true
    else throw new Error(`unknown option ${k}`)
  }
  if (!a.course) throw new Error('--course is required')
  return a
}

async function main() {
  const a = parseArgs(process.argv.slice(2))
  const lang = a.lang || langOf(a.course)
  const all = await loadCourse(a.base, a.course)
  const top = topSyllables(all, lang)
  let range, label
  if (a.draft) {
    const d = JSON.parse(fs.readFileSync(a.draft, 'utf8'))
    range = d.lines.filter((l) => l.change !== 'remove').map((l) => ({ ...l, kind: l.kind === 'lego' ? 'lego' : 'phrase' }))
    label = `DRAFT ${a.draft} (${range.length} lines)`
  } else {
    range = pickRange(all, a)
    label = `${a.course} ${a.seeds ? `seeds ${a.seeds.join('-')}` : a.legos ? `legos ${a.legos.join('-')}` : a.lines ? `lines ${a.lines.join('-')}` : 'whole course'}`
  }
  const start = a.draft ? 0 : all.indexOf(range[0])
  const seen0 = new Set(all.slice(0, Math.max(0, start)).flatMap((x) => syllables(x.target, lang)))
  const res = measure(range, lang, top, seen0)
  const out = { course: a.course, lang, label, summary: res.summary, lines: res.lines }
  if (a.windows) out.windows = windows(all, lang)
  console.log(`\n${label}  [lang ${lang}${lang === 'kor' || lang === 'zho' ? ', exact' : ', vowel-group approximation'}]`)
  console.log(JSON.stringify(res.summary, null, 1))
  if (a.worst) {
    console.log(`\nheaviest ${a.worst} lines (by new syllables, then length):`)
    for (const l of [...res.lines].sort((x, y) => y.new - x.new || y.syl - x.syl).slice(0, a.worst)) {
      console.log(`  ${l.id}\t${l.target}\t| ${l.known}\tsyl ${l.syl}\tnew ${l.new} (${l.newSyl})`)
    }
  }
  if (out.windows) { console.log('\nwindows of 25 lines:'); for (const w of out.windows) console.log(`  lines ${w.lines}\tseeds ${w.seeds}\tnew/line ${w.newPerLine}\tsyl/line ${w.sylPerLine}`) }
  if (a.json) fs.writeFileSync(a.json, JSON.stringify(out, null, 1))
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1) })

module.exports = { syllables, splitLatinWord, measure, topSyllables, pickRange, loadCourse }
