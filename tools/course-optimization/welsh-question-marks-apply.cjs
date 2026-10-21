#!/usr/bin/env node
'use strict';
// welsh-question-marks-apply.cjs — the APPLY half of Aran's question-mark ruling (job #504).
// The classifier is welsh-question-marks.cjs; this builds Popty edit-batch ops for the
// CERTAIN rows (plus any UNSURE rows Aran accepted) and runs them through the door.
//
//   node welsh-question-marks-apply.cjs <course> --data <seeds.json> --cls <classified.json>
//        --others <a.json,b.json,…> [--answers <review-answers.json>] --out <dir> [--apply]
//
// Every write is Popty's: POST /api/production/:course/edit-batch (dry run unless --apply).
// No database code here.
//
// TEXT-ONLY, TAKES STAY LINKED (Aran: punctuation is no re-record). Since 2026-10-13 a
// trailing '?' is part of a clip's key, so a bare row edit would make the
// null_*_audio_on_text_change trigger unlink the take. Per linked clip, one of:
//   RELABEL — the clip belongs to this course and every row that links it is changing
//             the same way: audio.update its text FIRST, then the row; the trigger then
//             sees a matching clip and keeps the link (job #280's pattern).
//   RELINK  — the clip belongs to ANOTHER course (legacy recordings the v2 build reuses):
//             its text is that course's business, so it is left alone; the row is edited,
//             then audio.link puts the same clip back (allow_text_mismatch) in the same batch.
//   HOLD    — the clip is shared with a row that is NOT changing (or its relabel would
//             collide with another clip's key): the row is not edited; reported.
// Every op carries `expect` (old text + audio ids): drift aborts the whole batch.

const fs = require('fs');
const path = require('path');
const { withQuestionMark } = require('./welsh-question-marks.cjs');
const { normalizeForDb } = require('../../services/shared/text-normalize.cjs');

const BASE = process.env.POPTY_URL || 'http://localhost:3470';
const AGENT = 'aran-watson-504-welsh-question-marks';
const SLOTS = { known: ['known'], target: ['target1', 'target2'] };

async function post(course, body) {
  const r = await fetch(`${BASE}/api/production/${course}/edit-batch`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body),
  });
  return { status: r.status, json: await r.json() };
}

/** Which course owns each clip, and what it says: a dry-run audio.update per candidate course. */
async function probeClips(ids, candidates, probeText = (id) => `__probe__ ${id}`) {
  const found = new Map();
  let left = [...ids];
  for (const course of candidates) {
    while (left.length) {
      const ops = left.map((id) => ({ op: 'audio.update', audio_id: id, set: { text: probeText(id) } }));
      const { json } = await post(course, { ops });
      if (json.ok) {
        for (const r of json.results) found.set(r.key.id, r.before);
        left = [];
        break;
      }
      if (json.code === 'NOT_FOUND' && Number.isInteger(json.index)) {
        // ops before `index` exist here; retry without the missing one, keep it for the next course
        const miss = left[json.index];
        left = left.filter((_, i) => i !== json.index);
        (probeClips.missing[course] = probeClips.missing[course] || []).push(miss);
        continue;
      }
      throw new Error(`probe ${course}: ${JSON.stringify(json).slice(0, 400)}`);
    }
    left = probeClips.missing[course] || [];
    probeClips.missing[course] = [];
  }
  return { found, unknown: left };
}
probeClips.missing = {};

/** The rows to change, with their new texts. */
function changes(classified, accepted) {
  const out = [];
  for (const r of classified) {
    if (!(r.cls === 'CERTAIN_Q' || (r.cls === 'UNSURE' && accepted.has(String(r.id))))) continue;
    const nk = withQuestionMark(r.known), nt = withQuestionMark(r.target);
    if (nk === r.known && nt === r.target) continue;
    out.push({ ...r, newKnown: nk !== r.known ? nk : null, newTarget: nt !== r.target ? nt : null });
  }
  return out;
}

/** Every row of the loaded courses that links each clip, per slot. */
function clipRefs(courseDatas) {
  const refs = new Map();
  for (const d of courseDatas) {
    const add = (kind, id, row) => {
      for (const slot of ['known', 'target1', 'target2']) {
        const a = row[`${slot}_audio_id`];
        if (!a) continue;
        if (!refs.has(a)) refs.set(a, []);
        refs.get(a).push({ course: d.courseCode, kind, id, slot });
      }
    };
    for (const s of d.seeds) {
      add('seed', s.seed_number, s);
      for (const l of s.legos || []) {
        add('lego', l.lego_id, l);
        for (const p of l.basket_phrases || []) add('phrase', p.id, p);
      }
    }
  }
  return refs;
}

function rowKey(course, kind, id) { return `${course}|${kind}|${id}`; }

function buildOps(course, data, chg, clips, refs) {
  const changing = new Map(chg.filter((c) => c.kind !== 'lego_component').map((c) => [rowKey(course, c.kind, c.id), c]));
  const relabel = new Map(); // audio id → new text
  const holds = [];
  const plans = [];
  for (const c of chg) {
    if (c.kind === 'lego_component') continue;
    const rowOps = { c, relinks: [], relabels: [] };
    let held = null;
    for (const side of ['known', 'target']) {
      const newText = side === 'known' ? c.newKnown : c.newTarget;
      if (!newText) continue;
      for (const slot of SLOTS[side]) {
        const a = c.audio[slot];
        if (!a) continue;
        const clip = clips.get(a);
        if (!clip) { held = `clip ${a} (${slot}) could not be found`; break; }
        if (normalizeForDb(clip.text) === normalizeForDb(newText)) continue; // already says it
        if (clip.course_code !== course) { rowOps.relinks.push({ slot, audio_id: a }); continue; }
        const others = (refs.get(a) || []).filter((r) => {
          const ch = changing.get(rowKey(r.course, r.kind, r.id));
          if (!ch) return true;
          const nt = r.slot === 'known' ? ch.newKnown : ch.newTarget;
          return !nt || normalizeForDb(nt) !== normalizeForDb(newText);
        });
        if (others.length) { held = `clip ${a} (${slot}) is shared with ${others.map((o) => `${o.course} ${o.kind} ${o.id}`).join(', ')}, which is not changing the same way`; break; }
        if (relabel.has(a) && relabel.get(a).text !== newText) { held = `clip ${a} would need two different texts`; break; }
        relabel.set(a, { text: newText, old: clip.text });
        rowOps.relabels.push(a);
      }
      if (held) break;
    }
    if (held) { holds.push({ id: c.id, kind: c.kind, known: c.known, target: c.target, why: held }); for (const a of rowOps.relabels) relabel.delete(a); continue; }
    plans.push(rowOps);
  }

  const ops = [];
  for (const [a, { text, old }] of relabel) ops.push({ op: 'audio.update', audio_id: a, set: { text }, expect: { text: old } });

  // LEGO component edits fold into the LEGO's own op.
  const legoById = new Map();
  for (const s of data.seeds) for (const l of s.legos || []) legoById.set(l.lego_id, l);
  const compEdits = new Map();
  for (const c of chg.filter((x) => x.kind === 'lego_component')) {
    if (!compEdits.has(c.lego_id)) compEdits.set(c.lego_id, JSON.parse(JSON.stringify(legoById.get(c.lego_id).components)));
    const comp = compEdits.get(c.lego_id)[c.index];
    if (c.newKnown) comp.known = c.newKnown;
    if (c.newTarget) comp.target = c.newTarget;
  }

  const presentationOf = new Map();
  for (const s of data.seeds) for (const l of s.legos || []) {
    if (l.presentation_audio_id) presentationOf.set(rowKey(course, 'lego', l.lego_id), l.presentation_audio_id);
    for (const p of l.basket_phrases || []) if (p.presentation_audio_id) presentationOf.set(rowKey(course, 'phrase', p.id), p.presentation_audio_id);
  }
  const linkOps = [];
  const legoDone = new Set();
  for (const { c, relinks } of plans) {
    const set = {}, expect = {};
    if (c.newKnown) { set.known_text = c.newKnown; expect.known_text = c.known; }
    if (c.newTarget) { set.target_text = c.newTarget; expect.target_text = c.target; }
    for (const slot of ['known', 'target1', 'target2']) expect[`${slot}_audio_id`] = c.audio[slot] || null;
    let op;
    if (c.kind === 'seed') op = { op: 'seed.update', seed_number: c.id };
    else if (c.kind === 'lego') {
      op = { op: 'lego.update', lego_id: c.id };
      if (compEdits.has(c.id)) { set.components = compEdits.get(c.id); expect.components = legoById.get(c.id).components; legoDone.add(c.id); }
    } else op = { op: 'phrase.update', phrase_id: c.id };
    ops.push({ ...op, set, expect });
    const target = c.kind === 'seed' ? { target: 'seed', seed_number: c.id } : c.kind === 'lego' ? { target: 'lego', lego_id: c.id } : { target: 'phrase', phrase_id: c.id };
    for (const r of relinks) linkOps.push({ op: 'audio.link', ...target, slot: r.slot, audio_id: r.audio_id, allow_text_mismatch: true });
    // The text trigger also drops a LEGO's presentation clip ("the Welsh for … is …"): same
    // words spoken, so it goes straight back. presentation is exempt from the words check.
    const pres = presentationOf.get(rowKey(course, c.kind, c.id));
    if (pres) linkOps.push({ op: 'audio.link', ...target, slot: 'presentation', audio_id: pres });
  }
  for (const [legoId, comps] of compEdits) {
    if (legoDone.has(legoId)) continue;
    ops.push({ op: 'lego.update', lego_id: legoId, set: { components: comps }, expect: { components: legoById.get(legoId).components } });
  }
  return { ops: [...ops, ...linkOps], holds, relabelCount: relabel.size, relinkCount: linkOps.length, rowCount: plans.length, componentLegos: compEdits.size };
}

/** After a dry run or apply: every touched row still points at exactly the clips it pointed at. */
function linksKept(results) {
  const lost = [];
  const finalOf = new Map();
  for (const r of results) {
    if (!/^(seed|lego|phrase)\./.test(r.op) && r.op !== 'audio.link') continue;
    const k = JSON.stringify(r.key);
    if (!finalOf.has(k)) finalOf.set(k, { before: r.before });
    finalOf.get(k).after = r.after;
  }
  for (const [k, { before, after }] of finalOf) {
    for (const c of ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id']) {
      if (before && after && c in before && (before[c] || null) !== (after[c] || null)) lost.push({ key: k, column: c, before: before[c], after: after[c] });
    }
  }
  return lost;
}

module.exports = { changes, clipRefs, buildOps, linksKept, probeClips };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const course = argv[0];
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const apply = argv.includes('--apply');
  const out = arg('--out');
  (async () => {
    const data = JSON.parse(fs.readFileSync(arg('--data'), 'utf8'));
    const cls = JSON.parse(fs.readFileSync(arg('--cls'), 'utf8'));
    const others = (arg('--others') || '').split(',').filter(Boolean).map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
    // --answers: the review page's JSON block [{id, choice}] — Aran's ACCEPT = "make it a question".
    // Item ids map to rows through ops/welsh-question-marks-504/unsure-items.json (committed).
    const accepted = new Set();
    if (arg('--answers')) {
      const items = new Map(JSON.parse(fs.readFileSync(path.join(__dirname, '../../ops/welsh-question-marks-504/unsure-items.json'), 'utf8')).map((i) => [i.id, i]));
      for (const a of JSON.parse(fs.readFileSync(arg('--answers'), 'utf8'))) {
        const it = items.get(a.id);
        if (a.choice === 'accept' && it && it.course === course) for (const r of it.rows) accepted.add(String(r));
      }
    }
    const chg = changes(cls, accepted);
    const ids = new Set();
    for (const c of chg) for (const side of ['known', 'target']) {
      if (!(side === 'known' ? c.newKnown : c.newTarget)) continue;
      for (const slot of SLOTS[side]) if (c.audio[slot]) ids.add(c.audio[slot]);
    }
    const candidates = [course, ...others.map((d) => d.courseCode).filter((c) => c !== course)];
    const { found, unknown } = ids.size ? await probeClips([...ids], candidates) : { found: new Map(), unknown: [] };
    const refs = clipRefs([data, ...others]);
    const plan = buildOps(course, data, chg, found, refs);
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, `${course}.clips.json`), JSON.stringify([...found.values()], null, 1));
    fs.writeFileSync(path.join(out, `${course}.plan.json`), JSON.stringify(plan, null, 1));
    console.log(JSON.stringify({ course, changes: chg.length, rows: plan.rowCount, componentLegos: plan.componentLegos, relabel: plan.relabelCount, relink: plan.relinkCount, holds: plan.holds.length, unknownClips: unknown, ops: plan.ops.length }));
    const res = await post(course, { ops: plan.ops, apply });
    fs.writeFileSync(path.join(out, `${course}.${apply ? 'applied' : 'dryrun'}.json`), JSON.stringify(res.json, null, 1));
    if (!res.json.ok) { console.error('REFUSED', JSON.stringify(res.json).slice(0, 600)); process.exit(1); }
    const lost = linksKept(res.json.results);
    console.log(JSON.stringify({ ok: res.json.ok, applied: res.json.applied, results: res.json.results.length, linksLost: lost.length, undo_file: res.json.undo_file || null }));
    if (lost.length) { console.error('LINKS LOST', JSON.stringify(lost.slice(0, 10))); process.exit(2); }
  })().catch((e) => { console.error(e); process.exit(1); });
}
