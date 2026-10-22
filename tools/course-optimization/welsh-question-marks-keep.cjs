#!/usr/bin/env node
'use strict';
// welsh-question-marks-keep.cjs — the KEEP half of Aran's 2026-10-22 ruling (job #189): the question
// rows that already have recordings KEEP those recordings, so the rows held back by job #504/#563
// (hold tool) and job #181 (rulings tool) now get their '?'. TEXT ONLY: every take stays linked.
//
//   node welsh-question-marks-keep.cjs 504 <course> --plan <run3-apply/course.plan.json> --hold <hold/course.hold-plan.json> --out <dir> [--apply]
//   node welsh-question-marks-keep.cjs 181 <course> --plan <181 course.plan.json> --others a,b --out <dir> [--apply]
//
// 504: replays, for exactly the rows the hold reverted, the ops job #504 originally applied
//      (relabel own-course clips FIRST, then the row, then relink other courses' clips) — their
//      `expect` blocks are the pre-edit state, which the hold restored, so drift aborts the batch.
// 181: the rows its plan left `held` (and held LEGOs' components) go through welsh-question-marks-apply's
//      buildOps from FRESH data, with the same relabel / relink rules.
// Popty's edit-batch door only (dry run unless --apply); no database code.

const fs = require('fs');
const path = require('path');
const { buildOps, clipRefs, probeClips, linksKept } = require('./welsh-question-marks-apply.cjs');
const { withQuestionMark } = require('./welsh-question-marks.cjs');
const { find } = require('./welsh-question-marks-rulings.cjs');

const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const AGENT = 'aran-watson-189-question-marks-keep';
const H = { 'content-type': 'application/json', 'x-agent-id': AGENT };
const rowRef = (o) => String(o.phrase_id || o.lego_id || o.seed_number);

/** Pure: the 504 replay — the original apply ops for the rows the hold reverted. */
function replayOps(applyPlan, holdPlan) {
  const held = new Set(holdPlan.ops.filter((o) => /^(seed|lego|phrase)\.update$/.test(o.op)).map(rowRef));
  const clips = new Set(holdPlan.ops.filter((o) => o.op === 'audio.update').map((o) => o.audio_id));
  const pick = (o) => (o.op === 'audio.update' ? clips.has(o.audio_id) : held.has(rowRef(o)));
  const ops = applyPlan.ops.filter((o) => (/^(seed|lego|phrase)\.update$/.test(o.op) || o.op === 'audio.update' || o.op === 'audio.link') && pick(o));
  return { ops, rows: held.size };
}

/** Pure: cls-shaped changes for the 181 held rows, read from fresh course data. */
function heldChanges(data, p181) {
  const chg = [], problems = [];
  const ownEnglish = new Map(p181.changed.filter((c) => c.oldKnown.replace(/\?$/, '') !== c.newKnown.replace(/\?$/, '')).map((c) => [c.item, c.newKnown]));
  for (const h of p181.held) {
    const f = find(data, h.row);
    if (!f) { problems.push({ row: h.row, why: 'row not found' }); continue; }
    const o = f.row;
    const known = o.known_text ?? o.known, target = o.target_text ?? o.target;
    if (known !== h.known || target !== h.target) { problems.push({ row: h.row, why: `text moved: ${known} | ${target}` }); continue; }
    const newKnown = ownEnglish.get(h.item) || withQuestionMark(known), newTarget = withQuestionMark(target);
    if (f.kind === 'comp') { chg.push({ kind: 'lego_component', lego_id: f.lego.lego_id, index: f.index, newKnown, newTarget }); continue; }
    if (ownEnglish.has(h.item) && o.known_audio_id) { problems.push({ row: h.row, why: 'OWN row has a known take' }); continue; }
    chg.push({ kind: f.kind, id: f.kind === 'seed' ? o.seed_number : f.kind === 'lego' ? o.lego_id : o.id, known, target, newKnown: newKnown !== known ? newKnown : null, newTarget: newTarget !== target ? newTarget : null,
      audio: { known: o.known_audio_id || null, target1: o.target1_audio_id || null, target2: o.target2_audio_id || null } });
  }
  return { chg, problems };
}

module.exports = { replayOps, heldChanges };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const [mode, course] = argv;
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const apply = argv.includes('--apply');
  const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
  const get = async (c) => (await fetch(`${BASE}/api/production/${c}/seeds?status=all`, { headers: H })).json();
  (async () => {
    const out = arg('--out'); fs.mkdirSync(out, { recursive: true });
    let ops, info;
    if (mode === '504') {
      ({ ops, rows: info } = replayOps(read(arg('--plan')), read(arg('--hold'))));
    } else {
      const data = await get(course);
      const { chg, problems } = heldChanges(data, read(arg('--plan')));
      if (problems.length) { console.error('PROBLEMS', JSON.stringify(problems)); process.exit(1); }
      const others = await Promise.all((arg('--others') || '').split(',').filter(Boolean).map(get));
      const ids = new Set(chg.flatMap((c) => c.audio ? Object.values(c.audio).filter(Boolean) : []));
      const { found, unknown } = ids.size ? await probeClips([...ids], [course, ...others.map((d) => d.courseCode)]) : { found: new Map(), unknown: [] };
      if (unknown.length) { console.error('UNKNOWN CLIPS', unknown); process.exit(1); }
      const refs = clipRefs([data, ...others]);
      let plan = buildOps(course, data, chg, found, refs);
      // A clip shared with rows that are NOT becoming questions (one recording serving the statement
      // and the question) cannot be relabelled without un-recording those rows: the row stays held.
      if (plan.holds.length) {
        const heldIds = new Set(plan.holds.map((h) => h.id));
        console.error('HELD (not done)', JSON.stringify(plan.holds));
        fs.writeFileSync(path.join(out, `${course}.181.still-held.json`), JSON.stringify(plan.holds, null, 1));
        plan = buildOps(course, data, chg.filter((c) => !(heldIds.has(c.id) || heldIds.has(c.lego_id))), found, refs);
      }
      ops = plan.ops; info = plan.rowCount;
      fs.writeFileSync(path.join(out, `${course}.clips.json`), JSON.stringify([...found.values()], null, 1));
    }
    fs.writeFileSync(path.join(out, `${course}.${mode}.keep-plan.json`), JSON.stringify({ rows: info, ops }, null, 1));
    console.log(JSON.stringify({ mode, course, rows: info, ops: ops.length }));
    const r = await fetch(`${BASE}/api/production/${course}/edit-batch`, { method: 'POST', headers: H, body: JSON.stringify({ ops, apply }) });
    const json = await r.json();
    fs.writeFileSync(path.join(out, `${course}.${mode}.keep-${apply ? 'applied' : 'dryrun'}.json`), JSON.stringify(json, null, 1));
    if (!json.ok) { console.error('REFUSED', JSON.stringify(json).slice(0, 800)); process.exit(1); }
    const lost = linksKept(json.results);
    console.log(JSON.stringify({ ok: true, applied: json.applied, results: json.results.length, linksLost: lost.length, undo_file: json.undo_file || null }));
    if (lost.length) { console.error('LINKS LOST', JSON.stringify(lost.slice(0, 10))); process.exit(2); }
  })().catch((e) => { console.error(e); process.exit(1); });
}
