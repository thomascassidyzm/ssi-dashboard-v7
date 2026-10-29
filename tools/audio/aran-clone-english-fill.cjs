#!/usr/bin/env node
'use strict'
/**
 * aran-clone-english-fill.cjs — job #557 (Aran, 2026-10-29 14:41Z).
 *
 * Fills every EMPTY English known slot of cym_nv2_for_eng / cym_sv2_for_eng that Aran's booth serves and that
 * he has no take of, with his own clone aran_english_003 — the stand-in services/shared/aran-clone-standin.cjs
 * allows there and nowhere else. His real take replaces each clone clip as it lands (the booth linkers,
 * make-before-break: the take is filed first, the slot moves on a write conditional on the clone clip, the clone
 * clip stays in course_audio).
 *
 * WHICH SLOTS — the booth's own answer, never a second definition:
 *   seeds:   the seed lines buildQueue serves human_aran_eng (and their duplicates) on the two courses whose
 *            known_audio_id is empty;
 *   phrases: the practice-phrase lines of the booth's phrase plan (pass 1 and pass 2, getPhrasePlan) for
 *            human_aran_eng, copies on the two courses whose known slot is empty;
 *   minus every slot sameWordsGaps says he ALREADY has a take of (those are a link to make with
 *   tools/recording/fill-same-words-gaps.cjs, never a clone to render).
 * LEGO known slots, intros and pod lines are not touched.
 *
 * HOW — only Popty's own routes write:
 *   render: POST /api/audio/render (production :3470) — library first, spend guard, one render, no retries.
 *           The voice is not named: resolveVoice answers the clone for these slots. STOPS on the first
 *           non-2xx (a guard refusal is the answer: 402 DAILY_TOTAL_CAP etc.) or network failure, and on
 *           --max-chars (characters this run may spend, so a run never takes a UTC day past the 1M cap).
 *   link:   POST /api/production/:course/link-clip — fill-only (the slot must still be empty), text-checked,
 *           at most 500 links a request.
 *
 *   node tools/audio/aran-clone-english-fill.cjs plan                       # read-only: writes the plan, prints counts + characters
 *   node tools/audio/aran-clone-english-fill.cjs render --limit 20 [--dry] [--max-chars N]
 *   node tools/audio/aran-clone-english-fill.cjs link [--dry]               # links every rendered/library clip of the log
 *   node tools/audio/aran-clone-english-fill.cjs status                     # what the log holds
 * Files: ~/ssi-evidence/ssi-dashboard-v7/tools/audio/aran-clone-english-fill/{plan.json,render.jsonl,link.jsonl}
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const COURSES = ['cym_nv2_for_eng', 'cym_sv2_for_eng']
const VOICE = 'human_aran_eng'
const AGENT = 'aran-clone-english-fill (job #557)'
const PURPOSE = "Aran 2026-10-29 (job #557): his clone stands in on the nv2/sv2 English known side until his booth take replaces it"
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '')
const DIR = process.env.ARAN_FILL_DIR || path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7/tools/audio/aran-clone-english-fill')
const PLAN = path.join(DIR, 'plan.json'), RENDER_LOG = path.join(DIR, 'render.jsonl'), LINK_LOG = path.join(DIR, 'link.jsonl')

const entryKey = (courseCode, text) => `${courseCode}\u0000${text}`
const slotKey = (courseCode, target, id) => `${courseCode}|${target}|${id}`

/**
 * THE PLAN, pure. One entry per (course, exact text) — the render is per course, so each course gets its own
 * course_audio row (the second course's ask is a free library link); the link-clip text check wants the slot's
 * own words, so copies differing in punctuation are separate entries.
 *
 * @param {object} p
 * @param {object[]} p.seedLines   buildQueue lines, kind 'seed', role 'known' ({seedId, courseCode, seedFilledBy, duplicateOf})
 * @param {Map<string,object>} p.seedRows  course_seeds.id → {course_code, seed_number, known_text, known_audio_id}
 * @param {object[]} p.phraseLines phrase-plan lines for the voice ({role, pass, batch, copies:[{phraseId, courseCode, text, holder, standIn}]})
 * @param {Set<string>} p.hasTake  slotKey()s sameWordsGaps names (a take exists: link it, never clone it)
 * @returns {{entries: object[], skipped: object}}
 */
function planEntries({ seedLines = [], seedRows = new Map(), phraseLines = [], hasTake = new Set(), courses = COURSES }) {
  const entries = new Map()
  const skipped = { hasTake: 0, notEmpty: 0, otherCourse: 0 }
  const add = (courseCode, text, slot, order) => {
    const k = entryKey(courseCode, text)
    if (!entries.has(k)) entries.set(k, { courseCode, text, chars: text.length, order, slots: [] })
    const e = entries.get(k)
    if (order < e.order) e.order = order
    if (!e.slots.some((s) => s.target === slot.target && (s.seedNumber ?? s.phraseId) === (slot.seedNumber ?? slot.phraseId))) e.slots.push(slot)
  }
  for (const line of seedLines) {
    if (line.kind !== 'seed' || line.role !== 'known') continue
    for (const seedId of [line.seedId, ...(line.duplicateOf || []).map((d) => d.seedId)]) {
      const row = seedRows.get(seedId)
      if (!row || !courses.includes(row.course_code)) { skipped.otherCourse += 1; continue }
      if (row.known_audio_id) { skipped.notEmpty += 1; continue }
      if (hasTake.has(slotKey(row.course_code, 'seed', row.seed_number))) { skipped.hasTake += 1; continue }
      const text = String(row.known_text || '').trim()
      if (text) add(row.course_code, text, { target: 'seed', seedNumber: row.seed_number }, [0, 0, row.seed_number])
    }
  }
  for (const line of phraseLines) {
    if (line.role !== 'known') continue
    for (const c of line.copies || []) {
      if (!courses.includes(c.courseCode)) { skipped.otherCourse += 1; continue }
      if (c.holder || c.standIn) { skipped.notEmpty += 1; continue }
      if (hasTake.has(slotKey(c.courseCode, 'phrase', c.phraseId))) { skipped.hasTake += 1; continue }
      const text = String(c.text || line.text || '').trim()
      if (text) add(c.courseCode, text, { target: 'phrase', phraseId: c.phraseId }, [line.pass || 9, line.batch || 0, line.readingOrder || 0])
    }
  }
  const cmp = (a, b) => { for (let i = 0; i < 3; i += 1) if (a.order[i] !== b.order[i]) return a.order[i] - b.order[i]; return 0 }
  return { entries: [...entries.values()].sort(cmp), skipped }
}

/** sameWordsGaps output → the set of slots he already has a take of. */
function takeSlots(gaps) {
  const out = new Set()
  for (const [courseCode, ops] of Object.entries((gaps && gaps.byCourse) || {})) {
    for (const o of ops) {
      const op = o.op || {}
      if (op.target === 'seed') out.add(slotKey(courseCode, 'seed', op.seed_number))
      if (op.target === 'phrase') out.add(slotKey(courseCode, 'phrase', op.phrase_id))
    }
  }
  return out
}

/** The link-clip requests for every plan entry the render log holds a clip for: per course, ≤500 links each. */
function linkRequests(entries, renders, size = 500) {
  const clip = new Map()
  for (const r of renders) if (r.status >= 200 && r.status < 300 && r.body && r.body.audioId && !r.dry) clip.set(entryKey(r.courseCode, r.text), r.body.audioId)
  const byCourse = new Map()
  for (const e of entries) {
    const audioId = clip.get(entryKey(e.courseCode, e.text))
    if (!audioId) continue
    if (!byCourse.has(e.courseCode)) byCourse.set(e.courseCode, [])
    for (const s of e.slots) byCourse.get(e.courseCode).push({ ...(s.target === 'seed' ? { seedNumber: s.seedNumber } : { phraseId: s.phraseId }), role: 'known', audioId })
  }
  const out = []
  for (const [courseCode, links] of byCourse) for (let i = 0; i < links.length; i += size) out.push({ courseCode, links: links.slice(i, i + size) })
  return out
}

/** Which plan entries are still to ask for, given the log: an entry is done once it has a 2xx answer that is not a dry run. */
function pendingEntries(entries, renders, { dry = false } = {}) {
  const done = new Set(renders.filter((r) => r.status >= 200 && r.status < 300 && (dry ? true : !r.dry)).map((r) => entryKey(r.courseCode, r.text)))
  return entries.filter((e) => !done.has(entryKey(e.courseCode, e.text)))
}

const readJsonl = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [])
const arg = (name, dflt = null) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : dflt }

async function buildPlan() {
  for (const p of [path.join(__dirname, '../../.env'), '/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env']) if (fs.existsSync(p) && !process.env.SUPABASE_URL) require('dotenv').config({ path: p, quiet: true })
  const { createClient } = require('@supabase/supabase-js')
  const q = require('../../services/voice-engine/recordist-queue.cjs')
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const recordist = await q.resolveRecordist(db, VOICE)
  if (!recordist) throw new Error(`${VOICE} is not a recordist`)
  const queue = await q.buildQueue(db, recordist)
  const seedLines = queue.lines.filter((l) => l.kind === 'seed' && l.role === 'known')
  const seedRows = new Map()
  for (const c of COURSES) {
    const r = await fetch(`${POPTY}/api/production/${c}/seeds`, { signal: AbortSignal.timeout(300000) })
    if (!r.ok) throw new Error(`GET seeds ${c}: ${r.status}`)
    for (const s of (await r.json()).seeds || []) seedRows.set(s.id, s)
  }
  const plan = await q.getPhrasePlan(db)
  const phraseLines = recordist.spellings.flatMap((sp) => plan.byVoice.get(sp) || [])
  const hasTake = takeSlots(await q.sameWordsGaps({ db, recordist }))
  const out = planEntries({ seedLines, seedRows, phraseLines, hasTake })
  return { builtAt: new Date().toISOString(), ...out }
}

function summary(entries) {
  const s = {}
  for (const e of entries) {
    const c = (s[e.courseCode] = s[e.courseCode] || { texts: 0, chars: 0, seedSlots: 0, phraseSlots: 0, pass1Texts: 0, pass2Texts: 0 })
    c.texts += 1; c.chars += e.chars
    for (const sl of e.slots) sl.target === 'seed' ? (c.seedSlots += 1) : (c.phraseSlots += 1)
    if (e.order[0] === 1) c.pass1Texts += 1
    if (e.order[0] === 2) c.pass2Texts += 1
  }
  return s
}

async function main() {
  const mode = process.argv[2]
  fs.mkdirSync(DIR, { recursive: true })
  if (mode === 'plan') {
    const p = await buildPlan()
    fs.writeFileSync(PLAN, JSON.stringify(p))
    console.log(JSON.stringify({ plan: PLAN, entries: p.entries.length, skipped: p.skipped, byCourse: summary(p.entries) }, null, 1))
    return
  }
  const plan = fs.existsSync(PLAN) ? JSON.parse(fs.readFileSync(PLAN, 'utf8')) : null
  if (!plan) throw new Error(`no plan at ${PLAN} — run plan first`)
  if (mode === 'status') {
    const renders = readJsonl(RENDER_LOG).filter((r) => !r.dry)
    const ok = renders.filter((r) => r.status >= 200 && r.status < 300)
    console.log(JSON.stringify({ planEntries: plan.entries.length, pending: pendingEntries(plan.entries, renders).length,
      rendered: ok.filter((r) => r.body.source === 'rendered').length, library: ok.filter((r) => r.body.source === 'library').length,
      charsSpent: ok.reduce((n, r) => n + (r.body.charsSpent || 0), 0), refused: renders.filter((r) => !(r.status >= 200 && r.status < 300)).length,
      linked: readJsonl(LINK_LOG).reduce((n, l) => n + (l.linked || 0), 0) }, null, 1))
    return
  }
  if (mode === 'render') {
    const dry = process.argv.includes('--dry')
    const limit = Number(arg('--limit', '0')) || Infinity
    const maxChars = Number(arg('--max-chars', '0')) || Infinity
    const todo = pendingEntries(plan.entries, readJsonl(RENDER_LOG), { dry }).slice(0, limit)
    let spent = 0, asked = 0
    for (const e of todo) {
      if (spent + e.chars > maxChars) { console.log(`STOP: --max-chars ${maxChars} reached (${spent} spent)`); break }
      let status = 0, body = {}
      try {
        const r = await fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT },
          body: JSON.stringify({ courseCode: e.courseCode, role: 'known', language: 'eng', text: e.text, purpose: PURPOSE, dryRun: dry }), signal: AbortSignal.timeout(300000) })
        status = r.status; body = await r.json().catch(() => ({}))
      } catch (err) { body = { error: String(err && err.name) } }
      asked += 1
      fs.appendFileSync(RENDER_LOG, JSON.stringify({ at: new Date().toISOString(), courseCode: e.courseCode, text: e.text, chars: e.chars, dry, status, body }) + '\n')
      if (!(status >= 200 && status < 300)) { console.log(`STOP on ${status}: ${JSON.stringify(body).slice(0, 400)}`); break }
      spent += body.charsSpent || 0
    }
    console.log(`asked ${asked} of ${todo.length}; charsSpent ${spent}${dry ? ' (dry run)' : ''}`)
    return
  }
  if (mode === 'link') {
    const dry = process.argv.includes('--dry')
    const linkedAlready = new Set(readJsonl(LINK_LOG).filter((l) => !l.dry).flatMap((l) => l.okKeys || []))
    for (const req of linkRequests(plan.entries, readJsonl(RENDER_LOG))) {
      const links = req.links.filter((l) => !linkedAlready.has(`${req.courseCode}|${l.seedNumber ?? l.phraseId}`))
      if (!links.length) continue
      const r = await fetch(`${POPTY}/api/production/${req.courseCode}/link-clip`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT },
        body: JSON.stringify({ links, dryRun: dry }), signal: AbortSignal.timeout(300000) })
      const out = await r.json().catch(() => ({}))
      const results = out.results || []
      const okKeys = results.map((x, i) => (x.ok ? `${req.courseCode}|${links[i].seedNumber ?? links[i].phraseId}` : null)).filter(Boolean)
      const refused = results.filter((x) => !x.ok)
      fs.appendFileSync(LINK_LOG, JSON.stringify({ at: new Date().toISOString(), courseCode: req.courseCode, dry, status: r.status, asked: links.length, linked: dry ? 0 : okKeys.length, okKeys: dry ? [] : okKeys, refused: refused.slice(0, 20) }) + '\n')
      console.log(req.courseCode, r.status, 'asked', links.length, 'ok', okKeys.length, 'refused', refused.length, refused.length ? JSON.stringify(refused.slice(0, 3)) : '')
      if (!r.ok) break
    }
    return
  }
  console.error('usage: plan | render --limit N [--dry] [--max-chars N] | link [--dry] | status'); process.exit(1)
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1) })

module.exports = { COURSES, planEntries, takeSlots, linkRequests, pendingEntries, entryKey, slotKey }
