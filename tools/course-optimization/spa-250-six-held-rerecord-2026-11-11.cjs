#!/usr/bin/env node
'use strict';
// tools/course-optimization/spa-250-six-held-rerecord-2026-11-11.cjs — job #250, under Kai's approval of 11 Nov 2026 15:58Z
// to re-record the six rows #177 held (record d/22eda710).
//
// #177 (missing-LEGO family) wrote six rows whose new Spanish the render route refused with 409 EXISTS_IN_LANGUAGE: the
// words were already recorded in the language, but only in voices outside spa_for_eng's cast. #177 put them back (hold
// event 5adef027). Its undo of that hold — ops/spa-250-six-held-rerecord/intended-from-177-undo-hold.json, copied verbatim
// from branch cs/177-spa-missing-lego-check-apply — IS the intended text: 2 inserts (S0145L01B07/B08, S0231L02B06) and
// 4 updates (S0182L01B05, S0126L01B03, S0281L04B01). This voices each intended line ONCE in the course cast under Kai's
// `kai:` approval token (the route's sanctioned re-record path, as #242), and only then (canon A4/A6, make-before-break)
// applies the text WITH the new clip ids in the same op, so no row is ever silent or speaking the old words.
//
// Writes go through Popty only (/api/audio/render, edit-batch). Dry run unless APPLY_CONFIRM=1.
//   curl -s 'http://localhost:3470/api/production/spa_for_eng/seeds?limit=1000' > seeds.json
//   node tools/course-optimization/spa-250-six-held-rerecord-2026-11-11.cjs audio seeds.json   (APPLY_CONFIRM=1 renders)
//   node … text seeds.json     (APPLY_CONFIRM=1 applies)
//   node … verify seeds.json   (fresh seeds after text)
const fs = require('fs');
const path = require('path');
const COURSE = 'spa_for_eng';
const AGENT = 'spa-250-six-held-rerecord (job #250)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const OUT = path.join(__dirname, '../../ops/spa-250-six-held-rerecord');
const APPROVAL = 'kai:2026-11-11:Kai approved re-recording the six rows #177 held, voiced once in the spa_for_eng cast';
const PURPOSE = 'spa_for_eng #250: six #177 held rows (EXISTS_IN_LANGUAGE off-cast only) voiced in cast under Kai approval 11 Nov';

const sid = (id) => String(id).split(':').pop();
const read = (name) => JSON.parse(fs.readFileSync(path.join(OUT, name), 'utf8'));
const save = (name, obj) => { const f = path.join(OUT, name); fs.writeFileSync(f, JSON.stringify(obj, null, 1)); console.log('wrote', f); };
function load(api) {
  const legos = [], phrases = [];
  for (const s of api.seeds) for (const l of s.legos || []) { legos.push(l); for (const p of l.basket_phrases || []) phrases.push({ ...p, _lego: l.lego_id }); }
  return { L: new Map(legos.map((l) => [l.lego_id, l])), P: new Map(phrases.map((p) => [sid(p.id), p])) };
}
// The intended rows, from #177's undo-of-hold.
function intended() {
  return read('intended-from-177-undo-hold.json').ops.map((o) => {
    const r = o.row || o.set; const id = sid(o.phrase_id || r.id);
    return { id, op: o.op, raw: o, known: r.known_text, target: r.target_text, lego: (r.decomposition || []).find((b) => b.isSalient)?.legoId };
  });
}
// What the hold left live (#177 snapshot) — the text must still be this, or the row has drifted and we stop.
const HELD_LIVE = {
  S0182L01B05: ['I want to take my things', 'Quiero llevar mis cosas'],
  S0126L01B03: ['This language', 'Este idioma'],
  S0281L04B01: ['I hope you start soon', 'Espero que empieces pronto'],
};

async function post(url, body) { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => ({})) }; }
const batch = (body) => post(`${POPTY}/api/production/${COURSE}/edit-batch`, body);
const renderBody = (a) => ({ courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, approval: APPROVAL, job: '#250' });

function asks() {
  const m = new Map();
  for (const r of intended()) for (const [role, text] of [['target1', r.target], ['target2', r.target], ['known', r.known]]) {
    const k = `${role}\u0000${text}`; if (!m.has(k)) m.set(k, { role, text, rows: [] }); m.get(k).rows.push(r.id);
  }
  return [...m.values()];
}

function planText(api) {
  const { P } = load(api);
  const res = read('audio-results.json');
  const clip = (role, text) => { const r = res.find((x) => x.role === role && x.text === text); return r && r.real && r.real.audioId; };
  const ops = [], problems = [];
  for (const r of intended()) {
    const a = { known_audio_id: clip('known', r.known), target1_audio_id: clip('target1', r.target), target2_audio_id: clip('target2', r.target) };
    if (Object.values(a).some((v) => !v)) { problems.push(`${r.id}: no clip for every slot ${JSON.stringify(a)}`); continue; }
    const now = P.get(r.id);
    if (r.op === 'phrase.insert') {
      if (now) { problems.push(`${r.id} already exists: ${now.known_text} | ${now.target_text}`); continue; }
      ops.push({ op: 'phrase.insert', row: { ...r.raw.row, ...a } });
    } else {
      if (!now) { problems.push(`${r.id} gone`); continue; }
      const h = HELD_LIVE[r.id];
      if (now.known_text !== h[0] || now.target_text !== h[1]) { problems.push(`${r.id} drifted: ${now.known_text} | ${now.target_text}`); continue; }
      ops.push({ op: 'phrase.update', phrase_id: r.raw.phrase_id, expect: { known_text: now.known_text, target_text: now.target_text }, set: { ...r.raw.set, ...a } });
    }
    console.log(`  ${r.op} ${r.id}: ${r.known} | ${r.target}  k=${a.known_audio_id} t1=${a.target1_audio_id} t2=${a.target2_audio_id}`);
  }
  return { ops, problems };
}

async function main() {
  const [mode, file] = process.argv.slice(2);
  if (!mode || !file) throw new Error('usage: audio|text|verify <fresh seeds.json>');
  const api = JSON.parse(fs.readFileSync(file, 'utf8'));
  const apply = process.env.APPLY_CONFIRM === '1';
  if (mode === 'audio') {
    const list = asks();
    if (!apply) {
      let would = 0; const out = [];
      for (const a of list) {
        const d = await post(`${POPTY}/api/audio/render`, { ...renderBody(a), dryRun: true });
        would += d.body.wouldSpendChars || 0;
        console.log(`dry ${d.status} ${a.role} "${a.text}" → ${d.body.source || d.body.code || d.body.error} voice=${d.body.voiceId || ''} ${d.body.wouldSpendChars || 0}`);
        out.push({ ...a, dry: { status: d.status, source: d.body.source, code: d.body.code, error: d.body.error, voiceId: d.body.voiceId, audioId: d.body.audioId, wouldSpendChars: d.body.wouldSpendChars } });
      }
      console.log(`dry total would spend ${would} chars over ${list.length} asks`);
      save('audio-plan-dry.json', out);
      return;
    }
    // ONE real ask per (role, text), never retried; an ask the dry run saw refused is not sent.
    const ok = new Set(read('audio-plan-dry.json').filter((r) => r.dry.status === 200).map((r) => `${r.role}\u0000${r.text}`));
    const out = []; let spent = 0;
    for (const a of list) {
      if (!ok.has(`${a.role}\u0000${a.text}`)) { out.push({ ...a, real: { skipped: 'refused in the dry run' } }); console.log(`skip ${a.role} "${a.text}"`); continue; }
      const r = await post(`${POPTY}/api/audio/render`, renderBody(a));
      spent += r.body.charsSpent || 0;
      out.push({ ...a, real: { status: r.status, source: r.body.source, audioId: r.body.audioId, voiceId: r.body.voiceId, charsSpent: r.body.charsSpent, code: r.body.code, error: r.body.error } });
      console.log(`real ${r.status} ${a.role} "${a.text}" → ${r.body.source || r.body.code} ${r.body.audioId || ''} ${r.body.charsSpent || 0}`);
    }
    console.log(`spent ${spent} chars`);
    save('audio-results.json', out);
    return;
  }
  if (mode === 'text') {
    const p = planText(api);
    if (p.problems.length) { console.log('STOP:', p.problems); process.exitCode = 1; return; }
    const dry = await batch({ ops: p.ops });
    console.log(`dry run ${dry.status} ${dry.body.error || ''} (${p.ops.length} ops)`);
    if (dry.status !== 200) { console.log(JSON.stringify(dry.body).slice(0, 3000)); process.exitCode = 1; return; }
    if (!apply) return;
    const ap = await batch({ ops: p.ops, apply: true });
    console.log(`APPLIED ${ap.status} event ${ap.body.event_id} undo ${ap.body.undo_file} ${ap.body.error || ''}`);
    save('undo-text.json', { event_id: ap.body.event_id, undo_file: ap.body.undo_file, ops: ap.body.undo_ops || ap.body.undo });
    return;
  }
  if (mode === 'verify') {
    // Each row: intended text, LEGO present in the target (P17), all three slots filled with this job's cast-voice clips,
    // and a dry-run re-link of every current clip passes the door (it refuses a clip whose words are not the row's).
    const { L, P } = load(api);
    const res = read('audio-results.json');
    const bad = [], links = [];
    for (const r of intended()) {
      const p = P.get(r.id); if (!p) { bad.push(`${r.id} missing`); continue; }
      if (p.known_text !== r.known || p.target_text !== r.target) bad.push(`${r.id} text is "${p.known_text} | ${p.target_text}"`);
      const l = L.get(p._lego);
      if (!p.target_text.toLowerCase().includes(l.target_text.toLowerCase())) bad.push(`${r.id} target lacks LEGO ${l.lego_id} "${l.target_text}"`);
      for (const [s, role, text] of [['known', 'known', r.known], ['target1', 'target1', r.target], ['target2', 'target2', r.target]]) {
        const id = p[`${s}_audio_id`]; if (!id) { bad.push(`${r.id} ${s} EMPTY`); continue; }
        const mine = res.find((x) => x.role === role && x.text === text);
        if (!mine || !mine.real || mine.real.audioId !== id) bad.push(`${r.id} ${s} is ${id}, not this job's clip`);
        links.push({ op: 'audio.link', target: 'phrase', phrase_id: p.id, slot: s, audio_id: id });
      }
      console.log(`  ${r.id} [${l.lego_id} ${l.target_text}] ${p.known_text} | ${p.target_text}  ${p.known_audio_id} ${p.target1_audio_id} ${p.target2_audio_id}`);
    }
    const dry = await batch({ ops: links });
    console.log(`stale check: dry-run re-link of ${links.length} slot clips → ${dry.status} ${dry.body.error || ''}`);
    if (dry.status !== 200) bad.push(`STALE: ${JSON.stringify(dry.body).slice(0, 2000)}`);
    console.log(bad.length ? bad.join('\n') : 'VERIFY: 0 empty, all this job\'s clips, LEGO present in each row');
    if (bad.length) process.exitCode = 1;
    return;
  }
  throw new Error(`unknown mode ${mode}`);
}
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
module.exports = { asks, planText };
