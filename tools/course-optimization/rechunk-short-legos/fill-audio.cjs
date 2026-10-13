#!/usr/bin/env node
// tools/course-optimization/rechunk-short-legos/fill-audio.cjs — job #321 (Tom 2026-10-13: "New phrases without audio
// drop from play: render target audio for new phrases in the course cast voice, within the combined TTS cap").
//
// After rechunk.cjs apply, the rows it inserted (and every LEGO it changed or added, whose audio pointers it cleared)
// have empty audio slots. This fills exactly those slots and nothing else, ONLY through Popty's one route
// (POST /api/audio/render: library first, spend guard, one render, no retries — never a provider). A refusal from the
// route is the answer: the run stops and reports it. Pointer writes are guarded (slot IS NULL) and recorded as a
// content edit. Presentation intros are rendered from the course's own template (the route splices them and binds
// course_legos.presentation_audio_id itself); this tool then mirrors the lego_introductions row.
//   node fill-audio.cjs <course> [--apply]     default is a DRY RUN: the route is asked with dryRun:true, nothing spent
// Resumable: work is whatever slot is still NULL. The per-run spend lands in the report (charsSpent).
'use strict'
const fs = require('fs'), path = require('path'), os = require('os')
const R = require('./rechunk.cjs')
const REPO = path.resolve(__dirname, '..', '..', '..')
const argv = process.argv.slice(2), COURSE = argv[0], APPLY = argv.includes('--apply')
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '')
const JOB = '#321', AGENT = 'job-321-rechunk-fill'
const EVIDENCE = path.join(os.homedir(), 'ssi-evidence', 'ssi-dashboard-v7', 'ops', 'rechunk-short-legos')
const say = (...a) => console.error(...a)

async function render(body) {
  // Transport trouble (Popty restarting, phase8 503) is retried; a REFUSAL (402/403/409...) is the answer and is never retried.
  for (let attempt = 1; ; attempt++) {
    let res, out
    try {
      res = await fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify({ ...body, voiceBound: false, dryRun: !APPLY, purpose: `job 321 re-chunk wave 1: ${body.purpose}` }) })
      out = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))
    } catch (e) { if (attempt < 6) { await new Promise((r) => setTimeout(r, 5000 * attempt)); continue } throw e }
    if (res.status === 503 && attempt < 6) { await new Promise((r) => setTimeout(r, 5000 * attempt)); continue }
    if (!res.ok || !out.ok) { const e = new Error(`render refused (${res.status}): ${JSON.stringify(out).slice(0, 300)}`); e.refusal = out; throw e }
    return out
  }
}

async function main() {
  const ledger = fs.readFileSync(path.join(REPO, 'ops/rechunk-short-legos/undo', `${COURSE}.jsonl`), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  const L = require('./lib.cjs')
  const latest = L.undoableAttempts(ledger)   // committed attempts only: a rolled-back or crashed attempt wrote nothing to fill
  const seeds = [...latest.keys()]
  const pg = await R.pgClient()
  const { rows: [crs] } = await pg.query('SELECT known_lang, target_lang FROM courses WHERE course_code=$1', [COURSE])
  const { localisedLangName } = require(path.join(REPO, 'services/phases/presentation-author.cjs'))
  const { loadTemplates, compileTemplate, expectedLine } = require(path.join(REPO, 'services/shared/intro-mirror.cjs'))
  const templates = await loadTemplates(pg, crs.known_lang), compiled = templates.flatMap((t) => compileTemplate(t.template, { knownLang: crs.known_lang }))
  const targetLangName = localisedLangName(crs.target_lang, crs.known_lang)
  const insertedIds = new Set(seeds.flatMap((s) => latest.get(s).insertedIds))
  const changedLegos = new Set(seeds.flatMap((s) => latest.get(s).after.filter((l) => l.change !== 'keep').map((l) => `${s}:${l.idx}`)))
  const { rows: phrases } = await pg.query(`SELECT id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases
    WHERE course_code=$1 AND id = ANY($2) AND phrase_role IN ('build','use')`, [COURSE, [...insertedIds]])
  const { rows: legosAll } = await pg.query('SELECT l.*, s.known_text seed_known FROM course_legos l JOIN course_seeds s ON s.course_code=l.course_code AND s.seed_number=l.seed_number WHERE l.course_code=$1 AND l.seed_number = ANY($2)', [COURSE, seeds])
  const legos = legosAll.filter((l) => changedLegos.has(`${l.seed_number}:${l.lego_index}`))
  // jobs: [{ role, text, slot, rowKind, rowKey, lego? }]
  const jobs = []
  for (const p of phrases) for (const [role, col, text] of [['known', 'known_audio_id', p.known_text], ['target1', 'target1_audio_id', p.target_text], ['target2', 'target2_audio_id', p.target_text]]) if (!p[col]) jobs.push({ role, text, col, kind: 'phrase', key: p.id })
  for (const l of legos) {
    for (const [role, col, text] of [['known', 'known_audio_id', l.known_text], ['target1', 'target1_audio_id', l.target_text], ['target2', 'target2_audio_id', l.target_text]]) if (!l[col]) jobs.push({ role, text, col, kind: 'lego', key: l.lego_id })
    if (!l.presentation_audio_id) {
      const e = expectedLine({ template: templates[0].template, targetLangName, knownText: l.known_text, compiled, contextText: l.seed_known, knownLang: crs.known_lang })
      jobs.push({ role: 'presentation', text: e.text, col: 'presentation_audio_id', kind: 'lego', key: l.lego_id, legoId: l.lego_id })
    }
  }
  const unique = new Map(); for (const j of jobs) unique.set(`${j.role}|${j.legoId || ''}|${j.text}`, null)
  say(`${COURSE}: ${seeds.length} seed(s), ${phrases.length} new phrase row(s), ${legos.length} changed LEGO(s); ${jobs.length} empty slot(s), ${unique.size} distinct clip request(s); ${APPLY ? 'APPLY' : 'DRY RUN'}`)
  const report = { course: COURSE, apply: APPLY, charsSpent: 0, wouldSpend: 0, library: 0, rendered: 0, linked: 0, failures: [] }
  const { serviceIdentity } = require(path.join(REPO, 'services/shared/editor-identity.cjs'))
  const { recordContentEdit } = require(path.join(REPO, 'services/shared/content-edit-log.cjs'))
  let ev = null
  for (const key of unique.keys()) {
    const j = jobs.find((x) => `${x.role}|${x.legoId || ''}|${x.text}` === key)
    try {
      const out = await render({ courseCode: COURSE, role: j.role, text: j.text, legoId: j.legoId, purpose: `${j.role} ${j.kind} ${j.key}` })
      unique.set(key, out)
      if (!APPLY) { report.wouldSpend += out.wouldSpendChars || 0; if (out.source === 'library') report.library++; continue }
      report.charsSpent += out.charsSpent || 0; out.source === 'library' ? report.library++ : report.rendered++
    } catch (e) { report.failures.push({ key, role: j.role, text: j.text, why: e.message }); say(`STOP: ${e.message}`); break }   // a refusal is the answer
  }
  if (APPLY) {
    ev = await recordContentEdit(R.supabase(), { identity: serviceIdentity('rechunk-short-legos', { role: 'content-sweep' }), courseCode: COURSE, surface: 'tools/course-optimization/rechunk-short-legos/fill-audio.cjs', operation: 'audio-pointer-fill', scope: { seed_numbers: seeds, rows: jobs.length }, detail: { job: JOB } }).catch(() => null)
    for (const j of jobs) {
      const out = unique.get(`${j.role}|${j.legoId || ''}|${j.text}`)
      if (!out || !out.audioId) continue
      if (j.role === 'presentation') continue   // the route bound course_legos.presentation_audio_id itself
      const table = j.kind === 'phrase' ? 'course_practice_phrases' : 'course_legos', idCol = j.kind === 'phrase' ? 'id' : 'lego_id'
      const durCol = j.role === 'target1' ? 'target1_duration_ms' : j.role === 'target2' ? 'target2_duration_ms' : null
      const dur = out.durationMs ?? out.duration_ms ?? null
      const sets = [`${j.col}=$1`]; const vals = [out.audioId]
      if (durCol && dur) { sets.push(`${durCol}=$${vals.length + 1}`); vals.push(Math.round(dur)) }
      vals.push(COURSE, j.key)
      // the text the clip was rendered from rides in the predicate: a row whose text changed during the render keeps its slot empty
      const textCol = j.role === 'known' ? 'known_text' : 'target_text'
      vals.push(j.text)
      const u = await pg.query(`UPDATE ${table} SET ${sets.join(',')} WHERE course_code=$${vals.length - 2} AND ${idCol}=$${vals.length - 1} AND ${j.col} IS NULL AND ${textCol}=$${vals.length}`, vals)
      report.linked += u.rowCount
    }
    for (const l of legos) {   // mirror the lego_introductions row the apply dropped
      const { rows: [c] } = await pg.query('SELECT presentation_audio_id FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, l.lego_id])
      if (!c || !c.presentation_audio_id) continue
      const { rows: [a] } = await pg.query('SELECT duration_ms FROM course_audio WHERE id::text=$1', [String(c.presentation_audio_id)])
      await pg.query(`INSERT INTO lego_introductions (course_code, lego_id, audio_uuid, duration_ms, version, presentation_audio_id)
        SELECT $1,$2,$3::uuid,$4,1,$3::uuid WHERE NOT EXISTS (SELECT 1 FROM lego_introductions WHERE course_code=$1 AND lego_id=$2)`, [COURSE, l.lego_id, c.presentation_audio_id, a ? a.duration_ms : null])
    }
    if (report.linked) { // content_version bump per audio repoint (Tom): cached bundles refetch
      const { bumpCourseVersion } = require(path.join(REPO, 'services/shared/course-version.cjs'))
      report.contentVersion = await bumpCourseVersion(R.supabase(), COURSE, 'patch')
    }
  }
  const { rows: still } = await pg.query(`SELECT count(*)::int n FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) AND (known_audio_id IS NULL OR target1_audio_id IS NULL OR target2_audio_id IS NULL)`, [COURSE, [...insertedIds]])
  report.phraseRowsStillSilent = still[0].n
  await pg.end()
  fs.mkdirSync(EVIDENCE, { recursive: true })
  fs.writeFileSync(path.join(EVIDENCE, `${COURSE}.fill-audio.${APPLY ? 'applied' : 'dryrun'}.${Date.now()}.json`), JSON.stringify(report, null, 1))
  say(JSON.stringify(report))
}
main().catch((e) => { console.error(e.stack || e.message); process.exit(1) })
