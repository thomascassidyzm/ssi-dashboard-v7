#!/usr/bin/env node
'use strict';
// tools/course-optimization/jpn-kor-rebuild-248-2026-11-04.cjs — job #248 (Kai approved 4 Nov 13:16Z).
// Rebuild the practice-phrase baskets of the NEW LEGOs of seeds 301-668 in jpn_for_eng / kor_for_eng.
// Why: #240 (d/6be32406) found the June generator glued tails onto the target (jpn って言ってた/と思う/から/ことがある;
// kor phantom 교회가, dangling 있어요, "heard/trust about" template) — ~90% of the #195 flags are real.
//
// LEGOs, components and seeds are never touched. Not-new LEGOs are skipped (P25: never played).
// Generation is Popty's phrase-v4 door (POST :3471/api/phrases/v4/generate — r-2026-10-14 "phrase v4 is THE phrase
// builder"), which runs every Popty gate plus the gap-fill door's gateStagedRows on each candidate. This tool adds:
//   - a padding detector (PAD below) that refuses any generated row carrying the #240 tails the English does not support;
//   - a course-wide ZUT re-check of the post-swap state (new rows of different LEGOs were generated independently);
//   - make-before-break landing: every new row's three clips exist (library first, one render) BEFORE its insert, and
//     each insert + its three audio.links ride ONE edit-batch transaction; old rows are deleted only after every new
//     row of that LEGO has landed with audio. No slot is ever empty, and nothing is mismatched.
//
// Modes (course = jpn|kor, range = 301-668):
//   gen    <course> <from-to> [conc]          generate per new LEGO → ops/jpn-kor-rebuild-248/<course>/gen/S####L##.json (resumable)
//   read   <course> <from-to>                 old → new, per LEGO, as markdown for a full read → stdout
//   plan   <course> <from-to> <dump.json>     inserts/deletes/refusals → ops/.../<course>/plan-<from-to>.json
//   audio  <course> <from-to> [--real]        dry run: chars to render; --real with RENDER_CONFIRM=1 renders once, library first
//   apply  <course> <from-to>                 dry run; APPLY_CONFIRM=1 applies (insert+link, then delete, then unapprove seeds)
//   verify <course> <from-to> <dump.json>     fresh dump: no old row left, 0 empty slots, 0 padding tails
// A dump is GET /api/admin/phrase-v4/course/<course>?audio=1 (tools/agent-admin/call.cjs --key kai).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DIR = path.join(ROOT, 'ops', 'jpn-kor-rebuild-248');
const BUILDER = (process.env.BUILDER_URL || 'http://localhost:3471').replace(/\/$/, '');
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const AGENT = 'kai-248-jpn-kor-rebuild';
const JOB = '#248';
const BATCH = Number(process.env.BATCH) || 24;

const COURSE = { jpn: 'jpn_for_eng', kor: 'kor_for_eng' };
const lid = (s, l) => `S${String(s).padStart(4, '0')}L${String(l).padStart(2, '0')}`;

// ── PAD: the #240 padding patterns. A row is refused when its target carries a tail the English does not say. ──
// Pure; the test pins the #240 worked examples.
function padReasons(course, known, target) {
  const k = String(known || '').toLowerCase();
  const t = String(target || '').replace(/[。？?！!、,.\s]+$/u, '');
  const r = [];
  if (course === 'jpn') {
    if (/って言ってた$|と言ってた$|って言った$/.test(t) && !/\b(said|says|told|saying)\b/.test(k)) r.push('jpn: って言ってた tail, English has no "said"');
    if (/と思う$|と思います$/.test(t) && !/\b(think|thought|wonder|guess|suppose|reckon|expect|believe|imagine)\b/.test(k)) r.push('jpn: と思う tail, English has no "think"');
    if (/から$/.test(t) && !/\b(because|since|so|from|as|after)\b/.test(k)) r.push('jpn: dangling から, English has no "because/from"');
    if (/ことがある$|ことがあります$|ことある$/.test(t) && !/\b(ever|sometimes|have been|has been|have (?:\w+ )?(?:seen|done|had|heard|met|eaten|tried|gone|visited)|there are times)\b/.test(k)) r.push('jpn: ことがある tail, English has no experience/sometimes');
    // No "stacked tails" rule: って言ってたから / って言ってたと思う are right when the English says "because you said" /
    // "I think you said" (probe S0301L03, 4 Nov); the final tail is held to its English above, the inner ones by the read.
  }
  if (course === 'kor') {
    if (/교회/.test(t) && !/\bchurch/.test(k)) r.push('kor: phantom 교회 (church), English has no church');
    // not after 고: -고 있어요 is the progressive (잘하고 있어요), probe S0304L01
    if (/(?:으면|면|을|를|이|가|에|에서)\s+있어요$/.test(t) && !/\b(there is|there are|have|has|is|are)\b/.test(k)) r.push('kor: dangling 있어요 after a particle/connective');
    if (/^i heard about\b|\btrust about\b/.test(k)) r.push('kor: "heard/trust about" template English');
  }
  return r;
}

// ── HTTP ──
async function post(url, body, timeoutMs = 300000) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    let j; try { j = await r.json(); } catch (e) { j = { ok: false, error: `non-JSON ${r.status}` }; }
    return { status: r.status, body: j };
  } catch (e) { return { status: 0, body: { ok: false, error: e.message } }; }
}

function range(s) { const [a, b] = String(s).split('-').map(Number); if (!a || !b) throw new Error('range like 301-310'); return [a, b]; }
function courseDir(c) { const d = path.join(DIR, c); fs.mkdirSync(path.join(d, 'gen'), { recursive: true }); return d; }
function loadDump(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function newLegos(dump, a, b) {
  return dump.legos.filter((l) => l.is_new && l.seed_number >= a && l.seed_number <= b)
    .sort((x, y) => x.seed_number - y.seed_number || x.lego_index - y.lego_index);
}
function genFile(c, s, l) { return path.join(courseDir(c), 'gen', `${lid(s, l)}.json`); }
function readGen(c, s, l) { const f = genFile(c, s, l); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; }

// ── gen ──
async function gen(c, rng, conc, dumpPath) {
  const [a, b] = range(rng);
  const dump = loadDump(dumpPath);
  const todo = newLegos(dump, a, b).filter((l) => { const g = readGen(c, l.seed_number, l.lego_index); return !g || (process.env.RETRY_BLOCKED === '1' && !g.keep); });
  console.log(`${c} ${rng}: ${todo.length} LEGOs to generate (conc ${conc})`);
  let i = 0;
  const worker = async () => {
    while (i < todo.length) {
      const l = todo[i++];
      const t0 = Date.now();
      // Popty's course-builder restarts on every deploy to main and drops the calls in flight (seen 4 Nov 13:34Z):
      // a transport loss waits for the service to answer again and asks for the same LEGO, up to 3 times.
      let r;
      for (let tries = 0; tries < 3; tries++) {
        r = await post(`${BUILDER}/api/phrases/v4/generate/${COURSE[c]}`, { seed: l.seed_number, lego: Number(l.lego_index) }, 1800000);
        if (r.status !== 0) break;
        for (let w = 0; w < 60; w++) { await new Promise((ok) => setTimeout(ok, 15000)); const h = await post(`${BUILDER}/api/phrases/v4/generate/${COURSE[c]}`, { seed: 0 }, 10000); if (h.status === 400) break; }
      }
      const body = r.body || {};
      // The door returns staged_rows only when its frame-diversity floors (FRAME/POS/NEIGH/JUNCT/SPLIT, the v4 objective)
      // also pass. Those floors are not canon rules: a set whose LAST attempt failed nothing but them — every Popty gate
      // and the door's own gateStagedRows passed — is kept here as floorsOnly and read like every other row.
      const last = (body.attempts || [])[(body.attempts || []).length - 1] || {};
      const floorsOnly = !body.ok && !!body.gate && body.gate.overallPass === true && (last.failingGates || []).length === 0
        && (last.reasons || []).every((t) => /^(FRAME|POS|NEIGH|JUNCT|SPLIT) [\d.]+ </.test(t) || /^CLAIM WRONG/.test(t));
      const fromSets = () => ['build', 'use'].flatMap((role) => (body[role] || []).map((p) => ({ seed_number: l.seed_number, lego_index: Number(l.lego_index),
        lego_known: l.known_text, lego_target: l.target_text, phrase_role: role, known_text: p.known, target_text: p.target })));
      const staged = body.ok ? (body.staged_rows || []) : floorsOnly ? fromSets() : [];
      const rows = staged.map((x) => ({ seed_number: x.seed_number, lego_index: x.lego_index, lego_known: x.lego_known, lego_target: x.lego_target,
        phrase_role: x.phrase_role, known_text: x.known_text, target_text: x.target_text, pad: padReasons(c, x.known_text, x.target_text) }));
      const out = {
        lego: { seed_number: l.seed_number, lego_index: Number(l.lego_index), known: l.known_text, target: l.target_text },
        at: new Date().toISOString(), http: r.status, ok: !!body.ok, blocked: !!body.blocked, error: body.error || null,
        failing: body.gate && body.gate.failingGates, attempts: (body.attempts || []).length, secs: Math.round((Date.now() - t0) / 1000),
        floorsOnly, lastReasons: (last.reasons || []).filter((t) => !/^CLAIM WRONG/.test(t)),
        rows, keep: (!!body.ok || floorsOnly) && rows.length > 0,
      };
      if (r.status === 0 || r.status >= 500) { console.log(`${lid(l.seed_number, l.lego_index)} transport/500: ${out.error} — not saved, will retry next run`); continue; }
      fs.writeFileSync(genFile(c, l.seed_number, l.lego_index), JSON.stringify(out, null, 1));
      console.log(`${lid(l.seed_number, l.lego_index)} ${out.ok ? 'PASS' : out.floorsOnly ? 'FLOORS-ONLY' : 'BLOCKED ' + JSON.stringify(out.failing) + ' ' + JSON.stringify(out.lastReasons).slice(0, 200)} ${rows.length} rows, ${rows.filter((x) => x.pad.length).length} padded, ${out.secs}s`);
    }
  };
  await Promise.all(Array.from({ length: conc }, worker));
}

// ── read ──
function read(c, rng, dumpPath) {
  const [a, b] = range(rng);
  const dump = loadDump(dumpPath);
  const lines = [];
  for (const l of newLegos(dump, a, b)) {
    const g = readGen(c, l.seed_number, l.lego_index);
    const seed = dump.seeds.find((s) => s.seed_number === l.seed_number);
    lines.push(`\n### ${lid(l.seed_number, l.lego_index)} — LEGO "${l.known_text}" = ${l.target_text}   (seed: ${seed && seed.known_text} = ${seed && seed.target_text})`);
    const old = dump.phrases.filter((p) => p.seed_number === l.seed_number && +p.lego_index === +l.lego_index && p.phrase_role !== 'component');
    for (const p of old) lines.push(`  OLD ${p.phrase_role[0].toUpperCase()} ${p.known_text} | ${p.target_text}`);
    if (!g) { lines.push('  NEW: (not generated)'); continue; }
    if (!g.keep) lines.push(`  NEW: BLOCKED ${JSON.stringify(g.failing)} ${g.error || ''}`);
    for (const x of g.rows) lines.push(`  NEW ${x.phrase_role[0].toUpperCase()} ${x.known_text} | ${x.target_text}${x.pad.length ? '   <<PAD ' + x.pad.join('; ') : ''}${x.drop ? '   <<DROP ' + x.drop : ''}`);
  }
  console.log(lines.join('\n'));
}

// ── plan (pure over a dump + the gen files) ──
const upperI = (t) => String(t).replace(/(^|[\s,])i(?=$|[\s,?!.]|['’](?:m|ll|d|ve)\b)/g, '$1I');
const nk = (t) => String(t || '').toLowerCase().replace(/[^\p{L}\p{N}'’ ]/gu, '').replace(/\s+/g, ' ').trim();
function plan(c, rng, dump, gens, romanStyle = null) {
  const [a, b] = range(rng);
  const { planInsert } = require('../../services/shared/phrase-v4-door.cjs');
  const legos = newLegos(dump, a, b);
  const dropsFile = path.join(DIR, c, 'drops.json');
  const drops = fs.existsSync(dropsFile) ? JSON.parse(fs.readFileSync(dropsFile, 'utf8')) : {};
  const replaced = new Set(); // LEGOs whose basket is replaced
  const staged = [], refused = [], held = [];
  for (const l of legos) {
    const g = gens(l.seed_number, l.lego_index);
    if (!g || !g.keep) { held.push({ lego: lid(l.seed_number, l.lego_index), why: g ? `generator blocked: ${JSON.stringify(g.failing)} ${g.error || ''}` : 'not generated' }); continue; }
    // The generator sometimes writes a lower-case "i" ("i'm not sure if…"); the course writes "I". Pure display fix.
    for (const x of g.rows) {
      // drops.json: rows the full read refused, keyed "S####L##|known as generated" → why (judgement, never regex)
      const why = drops[`${lid(l.seed_number, l.lego_index)}|${x.known_text}`];
      if (why) x.drop = `read: ${why}`;
      x.known_text = upperI(x.known_text);
    }
    const keep = g.rows.filter((x) => !padReasons(c, x.known_text, x.target_text).length && !x.drop);
    for (const x of g.rows) if (padReasons(c, x.known_text, x.target_text).length || x.drop) refused.push({ lego: lid(l.seed_number, l.lego_index), known: x.known_text, target: x.target_text, why: x.drop || padReasons(c, x.known_text, x.target_text).join('; ') });
    if (!keep.some((x) => x.phrase_role === 'build') || keep.filter((x) => x.phrase_role === 'use').length < 2) {
      held.push({ lego: lid(l.seed_number, l.lego_index), why: `after refusals only ${keep.filter((x) => x.phrase_role === 'build').length} BUILD / ${keep.filter((x) => x.phrase_role === 'use').length} USE (P10 floor 1/2) — old basket kept` });
      continue;
    }
    replaced.add(`${l.seed_number}:${l.lego_index}`);
    staged.push(...keep);
  }
  const isOld = (p) => p.phrase_role !== 'component' && replaced.has(`${p.seed_number}:${+p.lego_index}`);
  // course-wide ZUT over the post-swap state: rows that stay + new rows (in order; a later clash is refused)
  const byK = new Map(), byT = new Map();
  const add = (k, t, who) => { if (!byK.has(k)) byK.set(k, new Map()); byK.get(k).set(t, who); if (!byT.has(t)) byT.set(t, new Map()); byT.get(t).set(k, who); };
  for (const p of dump.phrases) if (p.phrase_role !== 'component' && !isOld(p)) add(nk(p.known_text), nk(p.target_text), p.id);
  for (const s of dump.seeds) add(nk(s.known_text), nk(s.target_text), `seed ${s.seed_number}`);
  const ok = [];
  for (const x of staged) {
    const k = nk(x.known_text), t = nk(x.target_text);
    const kk = [...(byK.get(k) || new Map()).entries()].find(([tt]) => tt !== t);
    const tt = [...(byT.get(t) || new Map()).entries()].find(([k2]) => k2 !== k);
    if (kk) { refused.push({ lego: lid(x.seed_number, x.lego_index), known: x.known_text, target: x.target_text, why: `ZUT: same English is "${kk[0]}" at ${kk[1]}` }); continue; }
    if (tt && x.phrase_role === 'use') { refused.push({ lego: lid(x.seed_number, x.lego_index), known: x.known_text, target: x.target_text, why: `ZUT: same target is "${tt[0]}" at ${tt[1]}` }); continue; }
    add(k, t, lid(x.seed_number, x.lego_index)); ok.push(x);
  }
  // a LEGO whose basket fell under the floor after ZUT keeps its old basket
  const final = [];
  for (const key of [...replaced]) {
    const [s, l] = key.split(':').map(Number);
    const mine = ok.filter((x) => x.seed_number === s && +x.lego_index === l);
    if (!mine.some((x) => x.phrase_role === 'build') || mine.filter((x) => x.phrase_role === 'use').length < 2) {
      replaced.delete(key); held.push({ lego: lid(s, l), why: 'under the P10 floor after the course-wide ZUT re-check — old basket kept' });
    } else final.push(...mine);
  }
  const existing = dump.phrases.filter((p) => replaced.has(`${p.seed_number}:${+p.lego_index}`));
  const { rows } = planInsert(COURSE[c], final, existing);
  // ROMANIZATION (parent's check, 4 Nov): the app shows target_text_roman when set (ssi-learning-app cycles.ts pickTargets).
  // On 4 Nov no seed, LEGO or phrase of seeds 301-668 in jpn_for_eng or kor_for_eng carried one (romanization stops at
  // seed 300 in both), so the course's style for this range is NULL and new rows match it. romanStyle (from a
  // /api/production/<course>/seeds dump) refuses the plan if that is no longer true.
  if (romanStyle && romanStyle.romanizedInRange > 0) throw new Error(`${romanStyle.romanizedInRange} rows in ${rng} now carry target_text_roman — new rows would need it too; stop`);
  for (const r of rows) { r.metadata = { format: 'build_use', pipeline: 'v4-rebuild', job: '248' }; r.target_text_roman = null; }
  const deletes = dump.phrases.filter(isOld).filter((p) => replaced.has(`${p.seed_number}:${+p.lego_index}`)).map((p) => p.id);
  const seeds = [...new Set([...replaced].map((k) => +k.split(':')[0]))].sort((x, y) => x - y);
  return { course: COURSE[c], range: rng, legos: legos.length, replaced: replaced.size, inserts: rows, deletes, refused, held, seeds };
}

// ── audio: the three slots of every new row ──
function audioFile(c) { return path.join(courseDir(c), 'audio.json'); }
function loadAudio(c) { return fs.existsSync(audioFile(c)) ? JSON.parse(fs.readFileSync(audioFile(c), 'utf8')) : {}; }
const SLOT_TEXT = { known: 'known_text', target1: 'target_text', target2: 'target_text' };
async function audio(c, rng, real) {
  const p = JSON.parse(fs.readFileSync(path.join(courseDir(c), `plan-${rng}.json`), 'utf8'));
  const have = loadAudio(c);
  const asks = [];
  const seen = new Set();
  for (const r of p.inserts) for (const role of ['known', 'target1', 'target2']) {
    const text = r[SLOT_TEXT[role]]; const key = `${role}|${text}`;
    if (seen.has(key) || have[key]) continue; seen.add(key); asks.push({ role, text, key, seed: r.seed_number });
  }
  let chars = 0, lib = 0, refused = [];
  const dry = [];
  let i = 0;
  const worker = async () => { while (i < asks.length) { const a = asks[i++];
    const d = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE[c], role: a.role, text: a.text, purpose: `job #248 ${COURSE[c]} rebuilt basket (Kai 4 Nov 13:16Z)`, job: JOB, seedPosition: a.seed, dryRun: true });
    if (d.status === 200 && d.body.ok && d.body.source === 'library') { lib++; have[a.key] = d.body.audioId; }
    else if (d.status === 200 && d.body.ok) { chars += d.body.wouldSpendChars || a.text.length; dry.push(a); }
    else refused.push({ ...a, status: d.status, error: d.body.code || d.body.error }); } };
  await Promise.all([1, 2, 3, 4].map(worker));
  console.log(`${c} ${rng}: ${asks.length} clips asked; library ${lib}; to render ${dry.length} (${chars} chars); refused ${refused.length}`);
  if (refused.length) console.log(JSON.stringify(refused.slice(0, 5)));
  fs.writeFileSync(audioFile(c), JSON.stringify(have, null, 0));
  if (!real) return { chars, toRender: dry.length, refused: refused.length };
  if (process.env.RENDER_CONFIRM !== '1') { console.log('RENDER_CONFIRM=1 not set: nothing rendered'); return; }
  let spent = 0;
  for (const a of dry) {
    const r = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE[c], role: a.role, text: a.text, purpose: `job #248 ${COURSE[c]} rebuilt basket (Kai 4 Nov 13:16Z)`, job: JOB, seedPosition: a.seed });
    if (!(r.status === 200 && r.body.ok)) {
      if (r.status === 0) { console.log('transport loss — stopping; re-run resumes library-first'); break; }
      console.log('REFUSED — no retry:', a.role, a.text, JSON.stringify(r.body).slice(0, 300)); break;
    }
    have[a.key] = r.body.audioId; spent += r.body.charsSpent || 0;
    if (Object.keys(have).length % 50 === 0) fs.writeFileSync(audioFile(c), JSON.stringify(have, null, 0));
  }
  fs.writeFileSync(audioFile(c), JSON.stringify(have, null, 0));
  console.log(`rendered: ${spent} chars`);
}

// ── apply ──
async function apply(c, rng) {
  const p = JSON.parse(fs.readFileSync(path.join(courseDir(c), `plan-${rng}.json`), 'utf8'));
  const have = loadAudio(c);
  const go = process.env.APPLY_CONFIRM === '1';
  const missing = p.inserts.filter((r) => ['known', 'target1', 'target2'].some((role) => !have[`${role}|${r[SLOT_TEXT[role]]}`]));
  // A LEGO lands whole or not at all: any LEGO with a row lacking audio keeps its old basket this run.
  const blockedLegos = new Set(missing.map((r) => `${r.seed_number}:${r.lego_index}`));
  const ins = p.inserts.filter((r) => !blockedLegos.has(`${r.seed_number}:${r.lego_index}`));
  const legosOk = new Set(ins.map((r) => `${r.seed_number}:${r.lego_index}`));
  const dels = p.deletes.filter((id) => { const m = id.match(/S(\d{4})L(\d{2})/); return legosOk.has(`${+m[1]}:${+m[2]}`); });
  console.log(`${c} ${rng}: ${ins.length} inserts over ${legosOk.size} LEGOs, ${dels.length} deletes; ${blockedLegos.size} LEGOs wait for audio`);
  const per = Math.floor(BATCH / 4);
  const log = { at: new Date().toISOString(), go, batches: [] };
  const run = async (ops, what) => {
    const d = await post(`${POPTY}/api/production/${COURSE[c]}/edit-batch`, { ops, apply: go }, 600000);
    log.batches.push({ what, status: d.status, event_id: d.body.event_id, error: d.body.error || (d.body.ok === false ? d.body : undefined) });
    if (d.status !== 200 || d.body.ok === false) { console.log(`${what}: ${d.status} ${JSON.stringify(d.body).slice(0, 400)}`); return false; }
    return true;
  };
  // inserts (with their three links) first, LEGO by LEGO; that LEGO's old rows are deleted only after all its inserts landed
  const byLego = new Map();
  for (const r of ins) { const k = `${r.seed_number}:${r.lego_index}`; if (!byLego.has(k)) byLego.set(k, []); byLego.get(k).push(r); }
  let n = 0;
  for (const [k, rows] of byLego) {
    let okAll = true;
    for (let i = 0; i < rows.length; i += per) {
      const ops = [];
      for (const r of rows.slice(i, i + per)) {
        ops.push({ op: 'phrase.insert', row: r });
        for (const role of ['known', 'target1', 'target2']) ops.push({ op: 'audio.link', target: 'phrase', phrase_id: r.id, slot: role, audio_id: have[`${role}|${r[SLOT_TEXT[role]]}`] });
      }
      if (!(await run(ops, `insert ${k} part ${i / per + 1}`))) { okAll = false; break; }
    }
    if (!okAll) { console.log(`STOP at ${k}: inserts failed; its old basket stays`); break; }
    const [s, l] = k.split(':').map(Number);
    const mine = dels.filter((id) => id.includes(lid(s, l)));
    for (let i = 0; i < mine.length; i += BATCH) if (!(await run(mine.slice(i, i + BATCH).map((id) => ({ op: 'phrase.delete', phrase_id: id })), `delete ${k}`))) { okAll = false; break; }
    if (!okAll) { console.log(`STOP at ${k}: delete failed (new rows landed, old still there — re-run to finish)`); break; }
    n++;
  }
  // O5: touched seeds are unapproved
  const touched = [...new Set([...byLego.keys()].map((k) => +k.split(':')[0]))];
  for (let i = 0; i < touched.length; i += BATCH) await run(touched.slice(i, i + BATCH).map((s) => ({ op: 'seed.update', seed_number: s, set: { approved_at: null } })), 'unapprove');
  log.legosDone = n;
  const f = path.join(courseDir(c), `apply-${rng}-${go ? 'real' : 'dry'}-${Date.now()}.json`);
  fs.writeFileSync(f, JSON.stringify(log, null, 1));
  console.log(`${go ? 'APPLIED' : 'dry run'}: ${n} LEGOs; log ${path.relative(ROOT, f)}; errors ${log.batches.filter((b) => b.error).length}`);
}

// ── verify ──
function verify(c, rng, dump) {
  const [a, b] = range(rng);
  const p = JSON.parse(fs.readFileSync(path.join(courseDir(c), `plan-${rng}.json`), 'utf8'));
  const ids = new Set(dump.phrases.map((x) => x.id));
  const oldLeft = p.deletes.filter((id) => ids.has(id));
  const newMissing = p.inserts.filter((r) => !ids.has(r.id));
  const newKeys = new Set(newLegos(dump, a, b).map((l) => `${l.seed_number}:${+l.lego_index}`));
  const live = dump.phrases.filter((x) => x.phrase_role !== 'component' && newKeys.has(`${x.seed_number}:${+x.lego_index}`));
  const empty = live.filter((x) => !x.known_audio_id || !x.target1_audio_id || !x.target2_audio_id);
  const padded = live.filter((x) => padReasons(c, x.known_text, x.target_text).length);
  console.log(JSON.stringify({ course: c, range: rng, planned_inserts: p.inserts.length, planned_deletes: p.deletes.length, old_left: oldLeft.length, new_missing: newMissing.length, live_rows: live.length, empty_slots_rows: empty.length, padded_rows_left: padded.length }, null, 1));
  return { oldLeft, newMissing, empty, padded };
}

module.exports = { padReasons, plan, upperI };

if (require.main === module) {
  const [mode, c, rng, x, y] = process.argv.slice(2);
  if (!COURSE[c]) { console.error('course must be jpn|kor'); process.exit(64); }
  (async () => {
    if (mode === 'gen') await gen(c, rng, Number(x) || 2, y || process.env.DUMP);
    else if (mode === 'read') read(c, rng, x);
    else if (mode === 'plan') {
      // y: a GET /api/production/<course>/seeds dump (carries target_text_roman, which the v4 dump does not)
      let romanStyle = null;
      if (y) { const [a, b] = range(rng); const sd = loadDump(y); let n = 0;
        for (const s of sd.seeds) if (s.seed_number >= a && s.seed_number <= b) { if (s.target_text_roman) n++; for (const l of s.legos || []) { if (l.target_text_roman) n++; for (const ph of l.basket_phrases || []) if (ph.target_text_roman) n++; } }
        romanStyle = { romanizedInRange: n }; } else throw new Error('plan needs the production seeds dump as 5th arg (romanization style check)');
      const p = plan(c, rng, loadDump(x), (s, l) => readGen(c, s, l), romanStyle);
      fs.writeFileSync(path.join(courseDir(c), `plan-${rng}.json`), JSON.stringify(p, null, 1));
      console.log(`${c} ${rng}: ${p.legos} new LEGOs; ${p.replaced} baskets replaced; ${p.inserts.length} inserts, ${p.deletes.length} deletes, ${p.refused.length} rows refused, ${p.held.length} LEGOs held`);
    } else if (mode === 'audio') await audio(c, rng, x === '--real');
    else if (mode === 'apply') await apply(c, rng);
    else if (mode === 'verify') verify(c, rng, loadDump(x));
    else { console.error('mode: gen|read|plan|audio|apply|verify'); process.exit(64); }
  })().catch((e) => { console.error(e); process.exit(1); });
}
