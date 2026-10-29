#!/usr/bin/env node
'use strict';
// fin_for_eng English fill (job #709, Kai approved 29 Oct 2026 20:58Z; diagnosis #707): every empty English KNOWN slot
// (seed, LEGO, practice phrase) and every new LEGO with no presentation intro, through the ONE audio route
// (POST /api/audio/render: library first — voice-bound, so only a clip in the slot's resolved voice is ever reused —
// spend guard, ONE render, no retries), then known clips are filed with link-clip (fill-only), signed with the Kai key.
// The voice is never chosen here: resolveVoice answers it (English known → Tom-006; fin_for_eng is on the Tom-006
// whole-intro list, voicing-policy.config.json), per Tom's r-2026-10-29: new work records in the cast voices.
//
// HELD, never rendered: any text carrying brackets — "(formal)" would be read aloud (Kai: no English brackets in narration).
//
//   node …cjs plan <dir> [--seeds 1-20]                     known-plan.json + intro-plan.json (intro text = presentation-author's)
//   node …cjs known dry|render <dir> [--seeds a-b] [--limit N]   one call per distinct text → <dir>/known-render.jsonl (resumes)
//   node …cjs known link-dry|link <dir> [--seeds a-b]       link-clip for every still-empty slot whose text has a logged clip
//   node …cjs intro dry|render <dir> [--seeds a-b]          one call per LEGO with legoId (binds it) → <dir>/intro-render.jsonl
// A refusal (403, e.g. RERECORD_NOT_PERMITTED) is that text's answer: logged, never retried, the run carries on.
// Only 402 (spend cap) or a dead route (status 0 after ten 45 s waits) stops a run.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const author = require('../../services/phases/presentation-author.cjs');

const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const COURSE = 'fin_for_eng';
const AGENT = 'kai-709-fin-english-fill';
const PURPOSE = 'job #709 fin_for_eng English fill (Kai approved 29 Oct 2026; Tom r-2026-10-29 cast voices)';
// The active English-known template, as every linked eng intro reads (same constant as hin-intros-624).
const ENG_TEMPLATE = "The {target_lang_name} for: '{known}', as in — '{seed}', is:";
const BRACKETS = /[()[\]]/;

const args = process.argv.slice(2);
const flag = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : null);
const seedRange = () => { const r = flag('--seeds'); if (!r) return null; const [a, b] = r.split('-').map(Number); return [a, b || a]; };
const inRange = (n, r) => !r || (n >= r[0] && n <= r[1]);
const readLog = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);

async function seeds() {
  const r = await fetch(`${POPTY}/api/production/${COURSE}/seeds`, { signal: AbortSignal.timeout(280000) });
  return (await r.json()).seeds;
}

/** Every empty known slot: { slot (link-clip shape), seed, text, held? }. */
function knownSlots(all, range) {
  const out = [];
  for (const s of all) {
    if (!inRange(s.seed_number, range)) continue;
    const add = (o, slot) => { if (!o.known_audio_id) out.push({ slot, seed: s.seed_number, text: o.known_text, held: BRACKETS.test(o.known_text) || undefined }); };
    add(s, { seedNumber: s.seed_number });
    for (const l of s.legos) {
      add(l, { legoId: l.lego_id });
      for (const p of l.basket_phrases || []) add(p, { phraseId: p.id });
    }
  }
  return out;
}

const post = async (p, body, signed) => {
  const headers = { 'Content-Type': 'application/json' };
  if (signed) headers['x-agent-admin'] = execFileSync('sudo', ['-n', '-u', 'popty', 'node', path.join(__dirname, '..', 'agent-admin', 'sign.cjs')], { input: JSON.stringify({ agentId: AGENT, method: 'POST', path: p, body, key: 'kai' }), encoding: 'utf8' }).trim();
  else headers['x-agent-id'] = AGENT;
  const r = await fetch(`${POPTY}${p}`, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(300000) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

/** One render call; a dropped connection (Popty restarts on deploy) asks the SAME words again — library-first, never paid twice. */
async function render(body) {
  let res;
  for (let t = 0; t < 10; t++) {
    try { res = await post('/api/audio/render', body); } catch (e) { res = { status: 0, body: { error: String(e.name) } }; }
    if (res.status !== 0) return res;
    await new Promise((s) => setTimeout(s, 45000));
  }
  return res;
}

async function planIntros(all, range) {
  const items = [];
  for (const s of all) {
    if (!inRange(s.seed_number, range)) continue;
    for (const l of s.legos) if (l.is_new && !l.presentation_audio_id) items.push({ lego_id: l.lego_id, seed_number: s.seed_number, known_text: l.known_text, target_text: l.target_text, seed: s.known_text });
  }
  const rows = [];
  for (let i = 0; i < items.length; i += 25) {
    const batch = items.slice(i, i + 25);
    let judged;
    try { judged = await author.judgeBatch(batch.map((x) => ({ chunk: author.introChunk(x.known_text), form: x.target_text, seed: x.seed })), { knownLangName: 'English', targetLangName: 'Finnish' }); }
    catch (e) { judged = { frames: [], flags: [], error: e.message }; } // presentation-author's own fallback frame stands in
    batch.forEach((x, n) => {
      const chunk = author.introChunk(x.known_text);
      const frame = judged.frames[n] || author.fallbackFrame(chunk, x.seed);
      const text = author.renderIntro({ frame: frame === 'B' ? 'B' : 'A', template: ENG_TEMPLATE, targetLangName: 'Finnish', chunk, seed: x.seed, knownLang: 'eng' });
      if (!text.includes(`'${chunk}'`)) throw new Error(`${x.lego_id}: intro does not quote its LEGO`);
      rows.push({ lego_id: x.lego_id, seed_number: x.seed_number, known_text: x.known_text, frame, text, held: BRACKETS.test(text) || undefined, flags: (judged.flags || []).filter((f) => f.index === n).map((f) => f.issue), judgeFallback: judged.error ? true : undefined });
    });
    console.error(`intros judged ${Math.min(i + 25, items.length)}/${items.length}`);
  }
  return rows;
}

(async () => {
  const [mode, a, b] = args;
  if (mode === 'plan') {
    const dir = a, range = seedRange(), all = await seeds();
    const k = knownSlots(all, range);
    const distinct = new Set(k.filter((x) => !x.held).map((x) => x.text));
    fs.writeFileSync(path.join(dir, 'known-plan.json'), JSON.stringify(k, null, 1));
    const intros = await planIntros(all, range);
    fs.writeFileSync(path.join(dir, 'intro-plan.json'), JSON.stringify(intros, null, 1));
    console.log(`known slots ${k.length} (held ${k.filter((x) => x.held).length}), distinct texts ${distinct.size}, chars ${[...distinct].reduce((n, t) => n + [...t].length, 0)}`);
    console.log(`intros ${intros.length} (held ${intros.filter((x) => x.held).length}, frame B ${intros.filter((x) => x.frame === 'B').length}, flagged ${intros.filter((x) => x.flags.length).length}), chars ${intros.filter((x) => !x.held).reduce((n, x) => n + [...x.text].length, 0)}`);
    return;
  }
  if (mode === 'known' && (a === 'dry' || a === 'render')) {
    const dir = b, range = seedRange(), li = flag('--limit'), limit = li ? Number(li) : Infinity;
    const log = path.join(dir, a === 'dry' ? 'known-dry.jsonl' : 'known-render.jsonl');
    const seen = new Set(readLog(log).filter((l) => l.status !== 0).map((l) => l.text));
    const texts = [...new Set(JSON.parse(fs.readFileSync(path.join(dir, 'known-plan.json'), 'utf8')).filter((x) => !x.held && inRange(x.seed, range)).map((x) => x.text))];
    let n = 0; const tally = {};
    for (const text of texts) {
      if (seen.has(text)) continue; if (n++ >= limit) break;
      const r = await render({ courseCode: COURSE, role: 'known', text, purpose: PURPOSE, dryRun: a === 'dry' });
      fs.appendFileSync(log, JSON.stringify({ text, status: r.status, body: r.body }) + '\n');
      const key = r.status === 200 ? r.body.source : `${r.status} ${r.body.code || ''}`; tally[key] = (tally[key] || 0) + 1;
      if (r.status === 402 || r.status === 0) { console.log('STOP', r.status, JSON.stringify(r.body).slice(0, 300)); break; }
    }
    console.log('known', a, 'asked', n, 'of', texts.length, JSON.stringify(tally));
    return;
  }
  if (mode === 'known' && (a === 'link' || a === 'link-dry')) {
    const dir = b, range = seedRange();
    const clip = new Map(); for (const l of readLog(path.join(dir, 'known-render.jsonl'))) if (l.status === 200 && l.body.audioId && !l.body.dryRun) clip.set(l.text, l.body.audioId);
    const empty = knownSlots(await seeds(), range).filter((x) => !x.held && clip.has(x.text));
    const links = empty.map((x) => ({ ...x.slot, role: 'known', audioId: clip.get(x.text) }));
    let ok = 0, linked = 0; const bad = [];
    for (let i = 0; i < links.length; i += 400) {
      const r = await post(`/api/production/${COURSE}/link-clip`, { links: links.slice(i, i + 400), dryRun: a === 'link-dry' }, true);
      if (!r.body.results) { console.log('STOP', r.status, JSON.stringify(r.body).slice(0, 300)); break; }
      ok += r.body.results.filter((x) => x.ok).length; linked += r.body.linked || 0; bad.push(...r.body.results.filter((x) => !x.ok));
    }
    const codes = {}; for (const x of bad) codes[x.code] = (codes[x.code] || 0) + 1;
    fs.appendFileSync(path.join(dir, 'known-link.jsonl'), JSON.stringify({ at: new Date().toISOString(), mode: a, range, links: links.length, ok, linked, refused: bad.length, codes, sample: bad.slice(0, 5) }) + '\n');
    console.log(a, 'links', links.length, 'ok', ok, 'linked', linked, 'refused', bad.length, JSON.stringify(codes), JSON.stringify(bad.slice(0, 3)));
    return;
  }
  if (mode === 'intro' && (a === 'dry' || a === 'render')) {
    const dir = b, range = seedRange();
    const log = path.join(dir, a === 'dry' ? 'intro-dry.jsonl' : 'intro-render.jsonl');
    const seen = new Set(readLog(log).filter((l) => l.status !== 0).map((l) => l.lego_id));
    const rows = JSON.parse(fs.readFileSync(path.join(dir, 'intro-plan.json'), 'utf8')).filter((x) => !x.held && inRange(x.seed_number, range));
    let n = 0; const tally = {};
    for (const x of rows) {
      if (seen.has(x.lego_id)) continue; n++;
      const r = await render({ courseCode: COURSE, role: 'presentation', legoId: x.lego_id, text: x.text, purpose: PURPOSE, dryRun: a === 'dry' });
      fs.appendFileSync(log, JSON.stringify({ lego_id: x.lego_id, text: x.text, status: r.status, body: r.body }) + '\n');
      const key = r.status === 200 ? r.body.source : `${r.status} ${r.body.code || ''}`; tally[key] = (tally[key] || 0) + 1;
      if (r.status === 402 || r.status === 0) { console.log('STOP', r.status, JSON.stringify(r.body).slice(0, 300)); break; }
    }
    console.log('intro', a, 'asked', n, 'of', rows.length, JSON.stringify(tally));
    return;
  }
  console.error('usage: plan <dir> | known dry|render|link-dry|link <dir> | intro dry|render <dir>   [--seeds a-b] [--limit N]'); process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
