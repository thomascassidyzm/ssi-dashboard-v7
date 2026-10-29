#!/usr/bin/env node
'use strict';
// tools/course-optimization/kor-lego-follow-seed-565-2026-10-29.cjs — kor_for_eng: the LEGOs follow the seed (job #565, Kai 2026-10-29:
// "The seed is the decider for what gets taught, the legos should reflect the seed"). Data: ./kor-lego-follow-seed-565-2026-10-29.data.cjs.
//
// For each seed in the data: the LEGO's Korean (and its components) become the seed's Korean; the same fragment is rewritten in
// EVERY phrase that uses the LEGO — its own basket, and every phrase in the course whose decomposition names it (that is the
// knock-on set: found by decomposition, not by text). Phrase decompositions are recomputed with the real decomposer. The seed is
// never touched. Edited seeds are unapproved (O5). Known text never changes here, so intro clips stay true; the LEGO text-change
// trigger drops presentation_audio_id and the batch puts the same clip back (as the #425 tool does).
//
// A change is SKIPPED (never forced) when: a phrase under the LEGO no longer holds it (P17), the LEGO's own text is not in the seed,
// ZUT makes a new EN→2KO clash, a basket gets a duplicate, or the rewrite did not apply cleanly to a phrase that uses the LEGO.
// Text-only hits (the old fragment in a phrase that does NOT name the LEGO) and other LEGOs carrying it are LISTED for reading, not changed.
//
//   node …cjs check  <seeds.json> [--seeds 74,83]      # plan + gates (pure, no network); writes plan + a reading sheet
//   node …cjs audio  <seeds.json> [--seeds …]          # + the audio route's DRY RUN for every changed slot (counts clips)
//   RENDER=1 [APPLY_CONFIRM=1] node …cjs run <seeds.json> --seeds 74,83   # real renders (library first), then edit-batch dry run / apply
//   node …cjs verify <seeds.json> --seeds …            # on a fresh dump: text + clips of every applied row
const fs = require('fs');
const path = require('path');
const { COURSE, D, HOLD, FIXES } = require('./kor-lego-follow-seed-565-2026-10-29.data.cjs');
const { holdsInOrder, fromApi } = require('./spa-close-read-153-200-2026-10-27.cjs');

const AGENT = 'kor-lego-follow-seed-565 (job #565, Kai key)';
const PURPOSE = 'job #565 kor_for_eng LEGOs follow the seed (Kai 29 Oct; clip spend approved up to 300)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const sid = (id) => String(id).split(':').pop();
const pid = (id) => `${COURSE}:${id}`;
const nk = (s) => (s || '').toLowerCase().trim().replace(/[.?!,，。？！、]+$/, '');
const ntStrict = (s) => (s || '').replace(/[\s。，？！、.?!,]/g, '').toLowerCase();
const ns = (s) => (s || '').replace(/[\s.,!?]/g, '');
const compIndex = (p) => (p.metadata && Number.isInteger(p.metadata.component_index) ? p.metadata.component_index : Number(sid(p.id).slice(-2)) - 1);
const ghost = (t) => t.split(' ').map((w, i) => ({ known: '', legoId: null, target: i ? ` ${w}` : w, isGhost: true }));

function zutIndex(rows) {
  const byK = new Map(), byT = new Map();
  for (const r of rows) {
    if (r.phrase_role === 'component') continue;
    const k = nk(r.known_text), t = ntStrict(r.target_text);
    if (!byK.has(k)) byK.set(k, new Map()); byK.get(k).set(r.key, t);
    if (!byT.has(t)) byT.set(t, new Map()); byT.get(t).set(r.key, k);
  }
  return { clashes(row) {
    const k = nk(row.known_text), t = ntStrict(row.target_text), out = new Set();
    for (const [key, tt] of byK.get(k) || []) if (key !== row.key && tt !== t) out.add(`EN→2KO ${key}`);
    for (const [key, kk] of byT.get(t) || []) if (key !== row.key && kk !== k) out.add(`KO→2EN ${key}`);
    return out;
  } };
}

/** The plan for the chosen seeds (pure). */
function plan(db, { only = null, decomposer: dz = require('../../services/phrase-decomposer.cjs'), tw = require('../../services/course-builder/lib/taught-words.cjs') } = {}) {
  const decompose = (...a) => { try { return dz.decomposeAnchored(...a); } catch (e) { return { kind: 'error', error: e.message }; } };
  const seedBy = new Map(db.seeds.map((s) => [s.seed_number, s]));
  const legoBy = new Map(db.legos.map((l) => [l.lego_id, l]));
  const out = { seeds: [], held: [], skipped: [], notes: [], sheet: [] };
  for (const [n, why] of Object.entries(HOLD)) if (!only || only.includes(+n)) out.held.push({ seed: +n, why });

  // 1. LEGOs after the pass, for every chosen seed (so ZUT/decomposition see the whole pass)
  const chosen = D.filter((d) => !only || only.includes(d.S));
  const legoNext = new Map(); // lego_id -> {before, after, frag}
  for (const d of chosen) for (const [lid, c] of Object.entries(d.L)) {
    const l = legoBy.get(lid);
    if (!l) { out.skipped.push({ seed: d.S, why: `LEGO ${lid} is not in the course` }); continue; }
    let comps = l.components;
    if (c.comps) {
      comps = c.comps.map((x, i) => {
        const old = (l.components || [])[i];
        const known = Array.isArray(x) ? x[0] : (old && old.known) || '';
        return { known, target: Array.isArray(x) ? x[1] : x };
      });
    }
    const frag = [[l.target_text, c.target], ...(d.frag || [])];
    legoNext.set(lid, { seed: d.S, before: l, after: { ...l, target_text: c.target, components: comps }, frag, dropComps: Math.max(0, (l.components || []).length - (c.comps ? c.comps.length : (l.components || []).length)) });
  }
  const legosAfter = db.legos.map((l) => (legoNext.has(l.lego_id) ? legoNext.get(l.lego_id).after : l));
  const lego2 = new Map(legosAfter.map((l) => [l.lego_id, l]));
  const vocab = (n) => legosAfter.filter((l) => l.seed_number <= n).map((l) => ({ lego_id: l.lego_id, target_text: l.target_text, known_text: l.known_text, seed_number: l.seed_number }));

  // 2. each LEGO: is the seed Korean actually carrying it (the premise of the job)?
  for (const [lid, g] of legoNext) {
    const s = seedBy.get(g.seed);
    if (!holdsInOrder(s.target_text, g.after.target_text)) out.notes.push({ seed: g.seed, lego: lid, why: `new LEGO "${g.after.target_text}" is not held by the seed "${s.target_text}"` });
  }

  // 3. phrases
  const edits = new Map(); // id -> {p, set, by}
  const phraseNext = new Map();
  const touchedLegos = new Set([...legoNext.keys()]);
  for (const p of db.phrases) {
    const id = sid(p.id);
    if (p.phrase_role === 'component') {
      const lid = id.slice(0, 8), g = legoNext.get(lid);
      if (!g) continue;
      const i = compIndex(p);
      const nc = (g.after.components || [])[i];
      if (i >= (g.after.components || []).length) { edits.set(id, { p, del: true, lid }); continue; }
      if (nc && (nc.target !== p.target_text || nc.known !== p.known_text)) {
        const set = {};
        if (nc.known !== p.known_text) set.known_text = nc.known;
        if (nc.target !== p.target_text) { set.target_text = nc.target; set.word_count = nc.target.length; set.decomposition = ghost(nc.target); set.target_text_roman = null; }
        edits.set(id, { p, set, lid, comp: true });
      }
      continue;
    }
    // which changed LEGOs does this phrase use?
    const uses = new Set();
    const own = id.slice(0, 8);
    if (touchedLegos.has(own)) uses.add(own);
    for (const b of p.decomposition || []) if (b && b.legoId && touchedLegos.has(b.legoId)) uses.add(b.legoId);
    if (!uses.size) continue;
    let t = p.target_text;
    const used = [];
    for (const lid of uses) {
      const g = legoNext.get(lid);
      // block text of this LEGO in the phrase decomposition is the exact old LEGO text there
      for (const [o, nw] of [...g.frag].sort((a, b) => b[0].length - a[0].length)) if (o !== nw && t.includes(o)) { t = t.split(o).join(nw); used.push(lid); break; }
    }
    const unmet = [...uses].filter((lid) => !used.includes(lid));
    if (unmet.length) {
      const own2 = unmet.filter((lid) => lid === own);
      out.skipped.push({ phrase: id, seed: p.seed_number, why: `${own2.length ? 'OWN basket: ' : 'knock-on: '}old LEGO fragment not found in "${p.target_text}" for ${unmet.join(',')}`, text: [p.known_text, p.target_text] });
      if (t === p.target_text) continue;
    }
    if (t !== p.target_text) phraseNext.set(id, { p, target: t, uses: [...uses] });
  }

  // 3b. the read-by-hand fixes: phrases that carry a changed LEGO's old Korean without naming it (see FIXES in the data file)
  for (const [fid, o, nw] of FIXES) {
    const ge = [...legoNext.entries()].find(([, x]) => x.frag[0][0] === o);
    if (!ge) continue;
    const g = { lid: ge[0] }; // its LEGO is not in this run
    const p = db.phrases.find((x) => sid(x.id) === fid);
    if (!p) { out.skipped.push({ phrase: fid, why: 'FIXES: the row is gone' }); continue; }
    const cur = phraseNext.get(fid);
    const base = cur ? cur.target : p.target_text;
    if (!base.includes(o)) { out.skipped.push({ phrase: fid, why: `FIXES: "${o}" not in "${base}"`, text: [p.known_text, p.target_text] }); continue; }
    phraseNext.set(fid, { p, target: base.split(o).join(nw), uses: [...new Set([...(cur ? cur.uses : []), g.lid])] });
  }
  for (const [fid, { p, target }] of phraseNext) for (const [glid, g] of legoNext) {
    const [o, nw] = g.frag[0];
    if (o !== nw && !nw.includes(o) && target.includes(o)) out.notes.push({ phrase: fid, why: `still carries the old text of ${glid} ("${o}"): ${target}` });
  }

  // 4. P17 + decomposition + P1 + ZUT, per phrase
  const tag = (key, r, role) => ({ key, known_text: r.known_text, target_text: r.target_text, phrase_role: role });
  const before = [...db.seeds.map((s) => tag(`seed ${s.seed_number}`, s, 'seed')), ...db.legos.map((l) => tag(l.lego_id, l, 'lego')), ...db.phrases.map((p) => tag(sid(p.id), p, p.phrase_role))];
  const after = [...db.seeds.map((s) => tag(`seed ${s.seed_number}`, s, 'seed')), ...legosAfter.map((l) => tag(l.lego_id, l, 'lego')),
    ...db.phrases.map((p) => { const nx = phraseNext.get(sid(p.id)); const ce = edits.get(sid(p.id)); return tag(sid(p.id), { known_text: p.known_text, target_text: nx ? nx.target : (ce && ce.set && ce.set.target_text) || p.target_text }, p.phrase_role); })];
  const zb = zutIndex(before), za = zutIndex(after);
  const blocked = new Set(); // legos whose change cannot go because a phrase using it fails a gate
  const phraseGo = [];
  for (const [id, { p, target, uses }] of [...phraseNext].sort((a, b) => a[0].localeCompare(b[0]))) {
    const own = id.slice(0, 8);
    const parentRow = lego2.get(own);
    const dec = decompose(target, vocab(p.seed_number), { lego_id: parentRow.lego_id, target_text: parentRow.target_text, known_text: parentRow.known_text }, COURSE);
    const wasHeld = decompose(p.target_text, vocab(p.seed_number).map((v) => (legoBy.has(v.lego_id) ? { ...v, target_text: legoBy.get(v.lego_id).target_text } : v)), { lego_id: own, target_text: legoBy.get(own).target_text, known_text: legoBy.get(own).known_text }, COURSE).kind !== 'error';
    const problems = [];
    if (dec.kind === 'error') { if (wasHeld) problems.push(`P17 no longer decomposes: ${dec.error}`); }
    const b4 = zb.clashes({ key: id, known_text: p.known_text, target_text: p.target_text });
    const af = [...za.clashes({ key: id, known_text: p.known_text, target_text: target })].filter((c) => !b4.has(c));
    const hard = af.filter((c) => c.startsWith('EN→2KO')), soft = af.filter((c) => c.startsWith('KO→2EN'));
    if (hard.length) problems.push(`ZUT new clash: ${hard.slice(0, 4).join(' ; ')}`);
    if (soft.length) out.notes.push({ phrase: id, why: `same Korean, other English (allowed): ${soft.slice(0, 3).join(' ; ')}` });
    if (problems.length) { for (const u of uses) blocked.add(u); out.skipped.push({ phrase: id, seed: p.seed_number, why: problems.join(' | '), text: [p.known_text, p.target_text, target] }); continue; }
    const set = { target_text: target, word_count: target.length, target_text_roman: null };
    if (dec.kind !== 'error') set.decomposition = dec.blocks;
    phraseGo.push({ id, p, set, uses, own: uses.includes(own), src: [...new Set(uses.map((u) => legoNext.get(u).seed))] });
  }
  // duplicates within a basket after the pass
  const finalText = new Map(db.phrases.map((p) => { const g = phraseGo.find((x) => x.id === sid(p.id)); return [sid(p.id), g ? g.set.target_text : p.target_text]; }));
  for (const g of phraseGo) {
    const twin = db.phrases.find((q) => sid(q.id) !== g.id && sid(q.id).slice(0, 8) === g.id.slice(0, 8) && q.phrase_role !== 'component' && nk(q.known_text) === nk(g.p.known_text) && ntStrict(finalText.get(sid(q.id))) === ntStrict(g.set.target_text) && !(ntStrict(q.target_text) === ntStrict(g.p.target_text)));
    if (twin) out.notes.push({ phrase: g.id, why: `duplicate of ${sid(twin.id)} after the pass` });
  }
  // LEGO-level ZUT, P17 for the LEGO under its own phrases, decided per LEGO
  const lego2Go = [];
  for (const [lid, g] of legoNext) {
    const b4 = zb.clashes({ key: lid, known_text: g.before.known_text, target_text: g.before.target_text });
    const af = [...za.clashes({ key: lid, known_text: g.after.known_text, target_text: g.after.target_text })].filter((c) => !b4.has(c));
    const hard = af.filter((c) => c.startsWith('EN→2KO'));
    if (hard.length) { blocked.add(lid); out.skipped.push({ lego: lid, seed: g.seed, why: `LEGO ZUT new clash: ${hard.slice(0, 4).join(' ; ')}` }); }
    for (const c of af.filter((c) => c.startsWith('KO→2EN'))) out.notes.push({ lego: lid, why: `same Korean, other English (allowed): ${c}` });
    lego2Go.push({ lid, ...g });
  }
  // a seed is all-or-nothing: if any of its LEGOs is blocked, none of it goes
  const blockedSeeds = new Set([...blocked].map((l) => legoNext.has(l) ? legoNext.get(l).seed : Number(l.slice(1, 5))));
  for (const s of blockedSeeds) out.skipped.push({ seed: s, why: 'SEED NOT APPLIED: a gate above blocked one of its LEGOs or phrases' });
  const okLegos = lego2Go.filter((g) => !blockedSeeds.has(g.seed));
  const okLegoIds = new Set(okLegos.map((g) => g.lid));
  const phraseOk = phraseGo.filter((g) => g.uses.every((u) => okLegoIds.has(u)));
  for (const g of phraseGo) if (!phraseOk.includes(g)) out.skipped.push({ phrase: g.id, why: 'not applied: another LEGO it uses is not going' });
  const compOk = [...edits.entries()].filter(([, e]) => okLegoIds.has(e.lid));

  // 5. text-only hits and other LEGOs carrying the old fragment: LISTED for reading
  const textHits = [];
  for (const g of okLegos) for (const [o] of g.frag.slice(0, 1)) {
    if (!o || ns(o).length < 3) continue;
    for (const p of db.phrases) {
      if (p.phrase_role === 'component' || phraseNext.has(sid(p.id))) continue;
      if ((p.decomposition || []).some((b) => b && b.legoId === g.lid)) continue;
      if (p.target_text.includes(o)) textHits.push({ lego: g.lid, seed: p.seed_number, id: sid(p.id), known: p.known_text, target: p.target_text });
    }
    for (const l of db.legos) if (l.lego_id !== g.lid && l.target_text.includes(o)) textHits.push({ lego: g.lid, seed: l.seed_number, id: l.lego_id, known: l.known_text, target: l.target_text, isLego: true });
  }

  // 6. O5: every seed whose rows change is unapproved
  const seedsTouched = new Set([...okLegos.map((g) => g.seed), ...phraseOk.map((g) => g.p.seed_number)]);
  const unapprove = [...seedsTouched].filter((n) => seedBy.get(n) && seedBy.get(n).approved_at).sort((a, b) => a - b);

  // 7. per-seed summary
  for (const d of chosen) {
    const ls = okLegos.filter((g) => g.seed === d.S);
    out.seeds.push({
      seed: d.S, applied: ls.length === Object.keys(d.L).length && !blockedSeeds.has(d.S), legos: ls.map((g) => g.lid),
      ownPhrases: phraseOk.filter((g) => g.own && g.p.seed_number === d.S).length,
      knockOn: phraseOk.filter((g) => !g.own && g.uses.some((u) => legoNext.get(u).seed === d.S)).length,
    });
  }
  return { ...out, legoGo: okLegos, phraseGo: phraseOk, compGo: compOk, unapprove, textHits, seedsTouched: [...seedsTouched].sort((a, b) => a - b) };
}

/** Per-seed clip asks (target1+target2 for each changed LEGO and phrase; component rows are tiles, never played). */
function clipAsks(p, seedFilter = null) {
  const m = new Map();
  const add = (role, text, where, seed) => { if (seedFilter && !seedFilter.includes(seed)) return; const k = `${role}\u0000${text}`; if (!m.has(k)) m.set(k, { role, text, where: [], seeds: new Set() }); m.get(k).where.push(where); m.get(k).seeds.add(seed); };
  for (const g of p.legoGo) { add('target1', g.after.target_text, g.lid, g.seed); add('target2', g.after.target_text, g.lid, g.seed); }
  for (const g of p.phraseGo) for (const sd of g.src) { add('target1', g.set.target_text, g.id, sd); add('target2', g.set.target_text, g.id, sd); }
  return [...m.values()].map((a) => ({ ...a, seeds: [...a.seeds] }));
}

/** The edit-batch ops. `clips`: Map role\0text -> audio_id. Text first, then the new clips, same transaction. */
function editOps(p, clips, seeds) {
  const inSeed = (n) => !seeds || seeds.includes(n);
  const get = (role, text) => { const a = clips.get(`${role}\u0000${text}`); if (!a) throw new Error(`no clip for ${role} "${text}"`); return a; };
  const ops = [], links = [];
  for (const g of p.legoGo.filter((x) => inSeed(x.seed))) {
    const set = { target_text: g.after.target_text, target_text_roman: null };
    if (JSON.stringify(g.after.components) !== JSON.stringify(g.before.components)) set.components = g.after.components;
    ops.push({ op: 'lego.update', lego_id: g.lid, set, expect: { target_text: g.before.target_text } });
    if (g.before.presentation_audio_id) links.push({ op: 'audio.link', target: 'lego', lego_id: g.lid, slot: 'presentation', audio_id: g.before.presentation_audio_id });
    for (const slot of ['target1', 'target2']) links.push({ op: 'audio.link', target: 'lego', lego_id: g.lid, slot, audio_id: get(slot, g.after.target_text) });
  }
  for (const [id, e] of p.compGo) {
    if (!inSeed(e.p.seed_number)) continue;
    if (e.del) ops.push({ op: 'phrase.delete', phrase_id: pid(id), expect: { target_text: e.p.target_text } });
    else ops.push({ op: 'phrase.update', phrase_id: pid(id), set: e.set, expect: { target_text: e.p.target_text } });
  }
  for (const g of p.phraseGo.filter((x) => inSeed(x.p.seed_number))) {
    ops.push({ op: 'phrase.update', phrase_id: pid(g.id), set: g.set, expect: { target_text: g.p.target_text } });
    for (const slot of ['target1', 'target2']) links.push({ op: 'audio.link', target: 'phrase', phrase_id: pid(g.id), slot, audio_id: get(slot, g.set.target_text) });
  }
  const touched = new Set([...p.legoGo.filter((x) => inSeed(x.seed)).map((x) => x.seed), ...p.phraseGo.filter((x) => inSeed(x.p.seed_number)).map((x) => x.p.seed_number)]);
  for (const n of p.unapprove.filter((x) => touched.has(x))) ops.push({ op: 'seed.update', seed_number: n, set: { approved_at: null } });
  return ops.concat(links);
}

async function post(url, body) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT, 'x-agent-role': 'kai' }, body: JSON.stringify(body), signal: AbortSignal.timeout(300000) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, body: { ok: false, error: String((e.cause && e.cause.code) || e.name) } }; }
}
/** Edit-batch calls are SIGNED with the Kai-only key (kai_go; never tom_go): tools/agent-admin/sign.cjs, one signature per body. */
async function postSigned(urlPath, body) {
  const { execFileSync } = require('child_process');
  const header = execFileSync('sudo', ['-n', '-u', 'popty', 'node', path.join(__dirname, '..', 'agent-admin', 'sign.cjs')], { input: JSON.stringify({ agentId: 'kai-565-kor-lego-follow-seed', method: 'POST', path: urlPath, body, key: 'kai' }), encoding: 'utf8' }).trim();
  try {
    const r = await fetch(POPTY + urlPath, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-admin': header }, body: JSON.stringify(body), signal: AbortSignal.timeout(300000) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, body: { ok: false, error: String((e.cause && e.cause.code) || e.name) } }; }
}
const existingClipOf = (message) => { const m = /already has a working clip \(([0-9a-f-]{36}) in ([^)\s]+)\)/.exec(String(message || '')); return m ? { audioId: m[1], voiceId: m[2] } : null; };

async function main() {
  const args = process.argv.slice(2);
  const [mode, file] = args;
  const flag = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : null);
  const only = flag('--seeds') ? flag('--seeds').split(',').map(Number) : null;
  if (!mode || !file) throw new Error('usage: check|audio|run <seeds.json> [--seeds 74,83]');
  const db = fromApi(JSON.parse(fs.readFileSync(file, 'utf8')));
  const out = process.env.LOG_DIR || process.cwd();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const save = (n, log) => { const f = path.join(out, `kor565-${n}-${stamp}.json`); fs.writeFileSync(f, JSON.stringify(log, null, 2)); return f; };
  const p = plan(db, { only });
  console.log(`plan: ${p.legoGo.length} LEGOs, ${p.phraseGo.length} phrases (${p.phraseGo.filter((g) => !g.own).length} knock-on in other baskets), ${p.compGo.length} component rows, ${p.unapprove.length} seeds to unapprove, ${p.skipped.length} skipped, ${p.held.length} held, ${p.textHits.length} text-only hits to read`);
  for (const s of p.skipped) console.log('  SKIP', JSON.stringify(s));
  if (mode === 'check') return console.log('plan file:', save('plan', p));

  const asks = clipAsks(p);
  const log = { job: '#565', started: stamp, asks: [] };
  // dry-run answers are cached (one JSON line per ask) so a socket error or a re-run never repeats a settled ask
  const cacheFile = process.env.DRY_CACHE || path.join(out, 'kor565-dry-cache.jsonl');
  const cache = new Map();
  if (fs.existsSync(cacheFile)) for (const l of fs.readFileSync(cacheFile, 'utf8').split('\n').filter(Boolean)) { const j = JSON.parse(l); if (j.dry.status !== 0) cache.set(j.k, j.dry); }
  for (const a of asks) {
    const k = `${a.role}\u0000${a.text}`;
    let dry = cache.get(k);
    for (let t = 0; !dry && t < 3; t++) {
      const d = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, dryRun: true });
      if (d.status === 0) continue;
      const ok = d.status === 200 && d.body.ok;
      const existing = !ok && d.body.code === 'RERECORD_NOT_PERMITTED' ? existingClipOf(d.body.error) : null;
      dry = { status: d.status, source: existing ? 'existing-clip' : d.body.source, voiceId: d.body.voiceId, chars: ok && d.body.source !== 'library' ? (d.body.wouldSpendChars || a.text.length) : 0, existing, audioId: d.body.audioId, error: ok || existing ? undefined : d.body };
      fs.appendFileSync(cacheFile, JSON.stringify({ k, dry }) + '\n');
    }
    log.asks.push({ ...a, dry: dry || { status: 0, error: { ok: false, error: 'no answer after 3 tries' } } });
  }
  const bySeed = {};
  for (const a of log.asks) for (const s of a.seeds) { bySeed[s] = bySeed[s] || { asks: 0, render: 0, chars: 0 }; bySeed[s].asks++; if (!['library', 'existing-clip'].includes(a.dry.source)) { bySeed[s].render++; bySeed[s].chars += a.dry.chars; } }
  log.bySeed = bySeed;
  const refused = log.asks.filter((a) => a.dry.error);
  console.log(`route dry run: ${asks.length} asks, ${log.asks.filter((a) => a.dry.source === 'library').length} library, ${log.asks.filter((a) => a.dry.source === 'existing-clip').length} existing-clip, ${log.asks.filter((a) => !['library', 'existing-clip'].includes(a.dry.source) && !a.dry.error).length} to render, ${refused.length} refused`);
  for (const a of refused) console.log('  REFUSED (dry)', a.role, JSON.stringify(a.text), a.dry.status, JSON.stringify(a.dry.error).slice(0, 200));
  if (mode === 'audio' || process.env.RENDER !== '1') return console.log('audio dry log:', save('audio-dry', { ...log, plan: p }));
  if (refused.length) { console.log('STOP: the route refused a clip in the dry run; nothing rendered'); return console.log(save('stopped', log)); }
  const toRender = log.asks.filter((a) => !['library', 'existing-clip'].includes(a.dry.source));
  const MAX = +(process.env.MAX_CLIPS || 300);
  if (toRender.length > MAX) { console.log(`STOP: ${toRender.length} clips to render > ${MAX}; nothing rendered`); return console.log(save('stopped', log)); }
  for (const a of log.asks) {
    if (a.dry.existing) { a.real = { source: 'existing-clip', audioId: a.dry.existing.audioId, charsSpent: 0 }; continue; }
    const r = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE });
    a.real = { status: r.status, source: r.body.source, audioId: r.body.audioId, voiceId: r.body.voiceId, charsSpent: r.body.charsSpent, error: r.status === 200 && r.body.ok ? undefined : r.body };
    if (a.real.error) { console.log('  REFUSED', a.role, JSON.stringify(a.text), r.status, JSON.stringify(r.body).slice(0, 300)); return console.log(save('render-refused', log)); }
  }
  log.charsSpent = log.asks.reduce((s, a) => s + ((a.real && a.real.charsSpent) || 0), 0);
  console.log(`rendered/linked: ${log.charsSpent} chars spent`);
  const clips = new Map(log.asks.map((a) => [`${a.role}\u0000${a.text}`, a.real.audioId]));
  const ops = editOps(p, clips); // the plan was already restricted to --seeds
  log.ops = ops;
  const dry = await postSigned(`/api/production/${COURSE}/edit-batch`, { ops });
  log.editDry = { status: dry.status, error: dry.body.error, code: dry.body.code, index: dry.body.index, results: (dry.body.results || []).length };
  console.log(`edit-batch dry run: ${dry.status} ${dry.body.error || ''} (${log.editDry.results} results)`);
  if (dry.status !== 200 || process.env.APPLY_CONFIRM !== '1') return console.log(save(dry.status === 200 ? 'previewed' : 'edit-refused', log));
  const ap = await postSigned(`/api/production/${COURSE}/edit-batch`, { ops, apply: true });
  log.apply = { status: ap.status, event_id: ap.body.event_id, undo_file: ap.body.undo_file, error: ap.body.error, code: ap.body.code };
  console.log(`edit-batch APPLY: ${ap.status} event ${ap.body.event_id} undo ${ap.body.undo_file} ${ap.body.error || ''}`);
  console.log(save(ap.status === 200 ? 'applied' : 'apply-refused', log));
  if (ap.status !== 200) process.exitCode = 1;
}
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
module.exports = { plan, clipAsks, editOps };
