#!/usr/bin/env node
'use strict';
// tools/course-optimization/jpn-kor-rebuild-247.cjs — cs #247·AL (Kai 24 Nov 17:26Z: "sounds like we need to build first,
// then rescan … There is no great rush, just need to make sure we're moving towards it").
// Resumes #248·AD's rebuild (branch cs/248-jpn-kor-rebuild-301-668, which stopped at the Claude weekly limit at jpn 450 /
// kor 430) of the practice-phrase baskets of the NEW LEGOs of seeds 451-668 (jpn_for_eng) and 431-668 (kor_for_eng).
// Why: the June 2026 generator glued tails the English does not say onto the target (live 24 Nov: S0451L02B03
// "because said" = 言ったことがある). #235·AL (d/e2cd8dfc) counted 3,049 June rows on 407 new LEGOs in jpn 451-668.
//
// What changed from #248's tool, and why (the rules that came in after 5 Nov):
//   - NO DIRECT LIVE APPLY (#835, Tom 18 Nov: "no need to write to the live database in a heavy way"). The plan is
//     computed from a dump of the NIGHTLY QA COPY (course-dump-readonly-2026-10-14.cjs under ~/ssi-restore/qa-copy.env)
//     and landed as TWO changesets through tools/changeset/apply-changeset.cjs (governed, 22:00-07:00 UK, ledgered, undo):
//       <band>.insert.changeset.jsonl  phrase.insert + its three audio.link, LEGO by LEGO
//       <band>.delete.changeset.jsonl  BUILT FROM THE FIRST ONE'S LEDGER: a LEGO's old rows are deleted only when every
//                                      insert and link of that LEGO came back applied/already. This is #248's
//                                      make-before-break: the applier sets a refused op aside and carries on, so one
//                                      changeset would delete a basket whose replacement did not land.
//                                      A new row whose own insert landed but a link did not is deleted too (thin beats
//                                      silent, Kai 19 Nov), and its LEGO keeps its old basket.
//   - LIVE PRE-CHECK OF ROW + LEGO + SEED (Kai 19 Nov) before a LEGO enters a changeset: the LEGO (known, target, is_new),
//     its seed (known, target) and every old row (exists, same texts) must be the same live (GET :3470/api/production/
//     <course>/seeds) as in the copy. Any mismatch holds the whole LEGO. Old rows a human hand-edited are KEPT, never deleted.
//     Every delete carries expect {seed_number, lego_index, known_text, target_text}, so a row that drifts before the night
//     is set aside by the applier.
//   - A gen file is used only if its LEGO text is still the LEGO's text today (4 Nov files for 451-456 were carried over).
//   - Audio: the one route, POST :3470/api/audio/render, real renders only (no bulk dry runs on live), library first, any
//     refusal other than EXISTS_IN_LANGUAGE stops the run (never retried, never re-routed).
//   - Editor identity: every write goes through Popty's admin edit door signed as the agent (--key kai --agent kai-247),
//     which records the content-edit event; this tool itself writes nothing to the DB.
//
// Modes (course = jpn|kor):
//   gen    <c> <from-to> <copyDump> [conc] [--unpaced] phrase-v4 door per new LEGO → ops/jpn-rebuild-247/<c>/gen/S####L##.json
//   read   <c> <from-to> <copyDump>                   old → new per LEGO, markdown for the cross-family reader → stdout
//   plan   <c> <from-to> <copyDump> <liveSeeds>       → ops/…/<c>/plan-<from-to>.json (refusals, ZUT, live pre-check)
//   audio  <c> <from-to> [--real]                     local estimate; --real with RENDER_CONFIRM=1 renders, library first
//   insert-cs <c> <from-to>                           plan + audio map → <from-to>.insert.changeset.jsonl (fully voiced LEGOs only)
//   delete-cs <c> <from-to>                           insert ledger → <from-to>.delete.changeset.jsonl (+ unapprove seeds)
//   verify <c> <from-to> <liveSeeds>                  no old row left, new rows present, 0 empty slots, 0 padding tails
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DIR = path.join(ROOT, 'ops', 'jpn-rebuild-247');
const BUILDER = (process.env.BUILDER_URL || 'http://localhost:3471').replace(/\/$/, '');
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const AGENT = 'kai-247';
const JOB = '#247·AL';
const KAI_GO = 'kai:2026-11-24T17:26Z "sounds like we need to build first, then rescan to make sure we\'re up to date with the fixes"';

const COURSE = { jpn: 'jpn_for_eng', kor: 'kor_for_eng' };
const lid = (s, l) => `S${String(s).padStart(4, '0')}L${String(l).padStart(2, '0')}`;
const SLOTS = ['known', 'target1', 'target2'];
const SLOT_TEXT = { known: 'known_text', target1: 'target_text', target2: 'target_text' };

// ── PAD: #248's padding patterns (#240 worked examples). A row is refused when its target carries a tail the English
// does not say. Pure.
function padReasons(course, known, target) {
  const k = String(known || '').toLowerCase();
  const t = String(target || '').replace(/[。？?！!、,.\s]+$/u, '');
  const r = [];
  if (course === 'jpn') {
    if (/って言ってた$|と言ってた$|って言った$/.test(t) && !/\b(said|says|told|saying)\b/.test(k)) r.push('jpn: って言ってた tail, English has no "said"');
    if (/と話してた$/.test(t) && !/\b(said|says|told|saying|talking|talked|mentioned)\b/.test(k)) r.push('jpn: と話してた tail, English has no "saying/talking"');
    if (/と思う$|と思います$/.test(t) && !/\b(think|thought|wonder|guess|suppose|reckon|expect|believe|imagine)\b/.test(k)) r.push('jpn: と思う tail, English has no "think"');
    if (/から$/.test(t) && !/\b(because|since|so|from|as|after)\b/.test(k)) r.push('jpn: dangling から, English has no "because/from"');
    if (/ことがある$|ことがあります$|ことある$/.test(t) && !/\b(ever|sometimes|have been|has been|have (?:\w+ )?(?:seen|done|had|heard|met|eaten|tried|gone|visited)|there are times)\b/.test(k)) r.push('jpn: ことがある tail, English has no experience/sometimes');
  }
  if (course === 'kor') {
    if (/교회/.test(t) && !/\bchurch/.test(k)) r.push('kor: phantom 교회 (church), English has no church');
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
async function waitPopty() {
  for (let w = 0; w < 80; w++) { try { const r = await fetch(`${POPTY}/health`, { signal: AbortSignal.timeout(5000) }); if (r.ok) return true; } catch (e) { /* down */ } await new Promise((ok) => setTimeout(ok, 15000)); }
  return false;
}
function range(s) { const [a, b] = String(s).split('-').map(Number); if (!a || !b) throw new Error('range like 451-500'); return [a, b]; }
function courseDir(c) { const d = path.join(DIR, c); fs.mkdirSync(path.join(d, 'gen'), { recursive: true }); return d; }
const loadJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
function newLegos(dump, a, b) {
  return dump.legos.filter((l) => l.is_new && l.seed_number >= a && l.seed_number <= b)
    .sort((x, y) => x.seed_number - y.seed_number || x.lego_index - y.lego_index);
}
function genFile(c, s, l) { return path.join(courseDir(c), 'gen', `${lid(s, l)}.json`); }
function readGen(c, s, l) { const f = genFile(c, s, l); return fs.existsSync(f) ? loadJson(f) : null; }
/** A gen file counts only while its LEGO still reads the same (it was generated FOR that pair). */
const genCurrent = (g, l) => !!g && g.lego.known === l.known_text && g.lego.target === l.target_text;

// ── gen ──
async function sleepUntilPace(body, who) {
  const at = Date.parse(body.resume_at);
  const ms = Math.min(6 * 3600e3, Math.max(60e3, (Number.isFinite(at) ? at - Date.now() : 3600e3) + 60e3));
  console.log(`${who} WEEKLY_PACE — sleeping ${Math.round(ms / 60e3)} min until ${new Date(Date.now() + ms).toISOString()} (${body.error || ''})`);
  await new Promise((ok) => setTimeout(ok, ms));
}
// UNPACED (cs #338·AL, Kai 25 Nov: "if it is a Popty self-cap, raise it for this build only and say by how much"):
// with --unpaced the gen calls carry "unpaced": true, so the v4 door skips its weekly pace (#412·AD) for THIS tool only;
// PACE_SLACK_PCT and every other bulk caller are untouched.
// THE ACCOUNT GATE (always on, paced or not; Kai 25 Nov 12:33Z: "treat claude@ as FULL once it reaches ~85% of its
// weekly pool (leave the rest for Aran's own web use) and continue on kai-gmail"). The door cannot be pinned to an
// account: it spawns on claude-config pickAccount over the shared weekly gauge. So before each LEGO this tool runs the
// same pickAccount over the same gauge, and sends the call only when the account the door will pick is under ITS
// ceiling (claude@ 85%, any other SSi account 90%); otherwise it waits and asks again. Unreadable gauge = wait. Pure.
const ACCOUNT_CEILING_PCT = { 'claude@saysomethingin.com': 85 };
const DEFAULT_CEILING_PCT = 90;
const ceilingFor = (email) => ACCOUNT_CEILING_PCT[email] ?? DEFAULT_CEILING_PCT;
function accountGate(cands, usage, cc) {
  if (!cands.length) return { ok: false, why: 'no SSi accounts on the gauge' };
  const read = cands.map((x) => `${x.email} ${cc.weeklyPct(usage[x.email]) ?? '?'}%/${ceilingFor(x.email)}%`).join('; ');
  if (cands.some((x) => cc.weeklyPct(usage[x.email]) === null)) return { ok: false, why: `gauge unreadable: ${read}` };
  const pick = cc.pickAccount(cands, { usage });
  const pct = cc.weeklyPct(usage[pick.email]);
  return pct < ceilingFor(pick.email)
    ? { ok: true, pick: pick.email, why: `door picks ${pick.email}; ${read}` }
    : { ok: false, pick: pick.email, why: `door would pick ${pick.email} at ${pct}% (ceiling ${ceilingFor(pick.email)}%); ${read}` };
}
function accountGateNow() {
  const cc = require('../../services/shared/claude-config.cjs');
  const usage = cc.readUsage();
  // The door's token dir (/var/lib/popty/claude) is readable only by the popty user, so from an agent shell the SSi
  // accounts are the company addresses on the same gauge the door reads (the two its WEEKLY_PACE answer names).
  let cands = cc.liveCandidates();
  if (!cands.length) cands = Object.keys(usage).filter((e) => /@saysomethingin\.com$/.test(e)).map((email) => ({ email }));
  return accountGate(cands, usage, cc);
}
async function gen(c, rng, dumpPath, conc, unpaced = false) {
  const [a, b] = range(rng);
  const dump = loadJson(dumpPath);
  const todo = newLegos(dump, a, b).filter((l) => { const g = readGen(c, l.seed_number, l.lego_index); return !genCurrent(g, l) || (process.env.RETRY_BLOCKED === '1' && !g.keep); });
  console.log(`${c} ${rng}: ${todo.length} LEGOs to generate (conc ${conc}${unpaced ? ', unpaced' : ''}; account gate claude@ ${ceilingFor('claude@saysomethingin.com')}%, others ${DEFAULT_CEILING_PCT}%)`);
  let i = 0, lastGuard = null;
  const worker = async () => {
    while (i < todo.length) {
      const l = todo[i++];
      const t0 = Date.now();
      let r;
      for (let tries = 0; tries < 3; tries++) {
        const g = accountGateNow();
        const tag = `${g.ok}|${g.pick}`;
        if (tag !== lastGuard) { lastGuard = tag; console.log(`${lid(l.seed_number, l.lego_index)} ${g.ok ? (unpaced ? 'UNPACED' : 'PACED') : 'ACCOUNT HOLD — waiting 20 min'} — ${g.why}`); }
        if (!g.ok) { await new Promise((ok) => setTimeout(ok, 20 * 60e3)); tries--; continue; }
        r = await post(`${BUILDER}/api/phrases/v4/generate/${COURSE[c]}`, { seed: l.seed_number, lego: Number(l.lego_index), ...(unpaced ? { unpaced: true } : {}) }, 1800000);
        // 429 WEEKLY_PACE (#412·AD): both SSi accounts ahead of their share of the week — sleep, ask again, spend nothing.
        if (r.status === 429 && (r.body || {}).code === 'WEEKLY_PACE') { await sleepUntilPace(r.body, lid(l.seed_number, l.lego_index)); tries--; continue; }
        if (r.status !== 0) break;
        for (let w = 0; w < 60; w++) { await new Promise((ok) => setTimeout(ok, 15000)); const h = await post(`${BUILDER}/api/phrases/v4/generate/${COURSE[c]}`, { seed: 0 }, 10000); if (h.status === 400) break; }
      }
      const body = r.body || {};
      // floorsOnly (#248): the last attempt failed only the door's frame-diversity floors, every canon gate passed — kept and read.
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
        at: new Date().toISOString(), job: JOB, http: r.status, ok: !!body.ok, blocked: !!body.blocked, error: body.error || null,
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
  const dump = loadJson(dumpPath);
  const lines = [];
  for (const l of newLegos(dump, a, b)) {
    const g = readGen(c, l.seed_number, l.lego_index);
    const seed = dump.seeds.find((s) => s.seed_number === l.seed_number);
    lines.push(`\n### ${lid(l.seed_number, l.lego_index)} — LEGO "${l.known_text}" = ${l.target_text}   (seed: ${seed && seed.known_text} = ${seed && seed.target_text})`);
    const old = dump.phrases.filter((p) => p.seed_number === l.seed_number && +p.lego_index === +l.lego_index && p.phrase_role !== 'component');
    for (const p of old) lines.push(`  OLD ${p.phrase_role[0].toUpperCase()} ${p.known_text} | ${p.target_text}`);
    if (!genCurrent(g, l)) { lines.push('  NEW: (not generated)'); continue; }
    if (!g.keep) lines.push(`  NEW: BLOCKED ${JSON.stringify(g.failing)} ${g.error || ''}`);
    for (const x of g.rows) lines.push(`  NEW ${x.phrase_role[0].toUpperCase()} ${x.known_text} | ${x.target_text}${x.pad.length ? '   <<PAD ' + x.pad.join('; ') : ''}`);
  }
  console.log(lines.join('\n'));
}

// ── live pre-check (Kai 19 Nov): pure over the copy dump and the live /seeds read ──
function liveIndex(live) {
  const seed = new Map(), lego = new Map(), phrase = new Map();
  for (const s of live.seeds) { seed.set(s.seed_number, s); for (const l of s.legos || []) { lego.set(`${l.seed_number}:${+l.lego_index}`, l); for (const p of l.basket_phrases || []) phrase.set(p.id, p); } }
  return { seed, lego, phrase };
}
/** Reasons a LEGO may not be swapped today; [] = copy and live agree on its LEGO, seed and every old row. Pure. */
function precheckLego(l, copy, L) {
  const why = [];
  const k = `${l.seed_number}:${+l.lego_index}`;
  const ll = L.lego.get(k);
  if (!ll) return ['LEGO not live'];
  if (ll.known_text !== l.known_text || ll.target_text !== l.target_text || !!ll.is_new !== !!l.is_new) why.push('LEGO changed live since the copy');
  const cs = copy.seeds.find((s) => s.seed_number === l.seed_number), ls = L.seed.get(l.seed_number);
  if (!cs || !ls || cs.known_text !== ls.known_text || cs.target_text !== ls.target_text) why.push(`seed ${l.seed_number} changed live since the copy`);
  const copyRows = copy.phrases.filter((p) => p.seed_number === l.seed_number && +p.lego_index === +l.lego_index && p.phrase_role !== 'component');
  for (const p of copyRows) {
    const lp = L.phrase.get(p.id);
    if (!lp) why.push(`${p.id} gone live`);
    else if (lp.known_text !== p.known_text || lp.target_text !== p.target_text) why.push(`${p.id} text changed live`);
  }
  const liveRows = (ll.basket_phrases || []).filter((p) => p.phrase_role !== 'component');
  const extra = liveRows.filter((p) => !copyRows.some((q) => q.id === p.id));
  if (extra.length) why.push(`${extra.length} row(s) live that the copy lacks (${extra.slice(0, 3).map((p) => p.id).join(', ')})`);
  return why;
}

// ── plan ──
const upperI = (t) => String(t).replace(/(^|[\s,])i(?=$|[\s,?!.]|['’](?:m|ll|d|ve)\b)/g, '$1I');
const nk = (t) => String(t || '').toLowerCase().replace(/[^\p{L}\p{N}'’ ]/gu, '').replace(/\s+/g, ' ').trim();
const handEdited = (p) => !!(p.hand_edited_at || p.hand_edit_held);
function plan(c, rng, copy, live, gens) {
  const [a, b] = range(rng);
  const { planInsert } = require('../../services/shared/phrase-v4-door.cjs');
  const legos = newLegos(copy, a, b);
  // reads/<from-to>.json: the cross-family reader's refusals, keyed "S####L##|known as generated" → why
  const drops = {};
  const readsDir = path.join(DIR, c, 'reads');
  if (fs.existsSync(readsDir)) for (const f of fs.readdirSync(readsDir).filter((x) => x.endsWith('.json'))) Object.assign(drops, loadJson(path.join(readsDir, f)).drops || {});
  const L = liveIndex(live);
  const liveRow = (id) => L.phrase.get(id);
  const replaced = new Set();
  const staged = [], refused = [], held = [];
  for (const l of legos) {
    const id = lid(l.seed_number, l.lego_index);
    const g = gens(l.seed_number, l.lego_index);
    if (!genCurrent(g, l)) { held.push({ lego: id, why: g ? 'gen file is for older LEGO text — regenerate' : 'not generated' }); continue; }
    if (!g.keep) { held.push({ lego: id, why: `generator blocked: ${JSON.stringify(g.failing)} ${g.error || ''}` }); continue; }
    const pre = precheckLego(l, copy, L);
    if (pre.length) { held.push({ lego: id, why: `live pre-check: ${pre.join('; ')}` }); continue; }
    const rows = g.rows.map((x) => ({ ...x, drop: drops[`${id}|${x.known_text}`] ? `read: ${drops[`${id}|${x.known_text}`]}` : null, known_text: upperI(x.known_text) }));
    const bad = (x) => x.drop || padReasons(c, x.known_text, x.target_text).join('; ');
    for (const x of rows) if (bad(x)) refused.push({ lego: id, known: x.known_text, target: x.target_text, why: bad(x) });
    const keep = rows.filter((x) => !bad(x));
    if (!keep.some((x) => x.phrase_role === 'build') || keep.filter((x) => x.phrase_role === 'use').length < 2) {
      held.push({ lego: id, why: `after refusals only ${keep.filter((x) => x.phrase_role === 'build').length} BUILD / ${keep.filter((x) => x.phrase_role === 'use').length} USE (P10 floor 1/2) — old basket kept` });
      continue;
    }
    replaced.add(`${l.seed_number}:${l.lego_index}`);
    staged.push(...keep);
  }
  // an old row goes only if its LEGO is replaced AND no human hand-edited it
  const isOld = (p) => p.phrase_role !== 'component' && replaced.has(`${p.seed_number}:${+p.lego_index}`) && !handEdited(liveRow(p.id) || p);
  // course-wide ZUT over the post-swap state: rows that stay + new rows (in order; a later clash is refused)
  const byK = new Map(), byT = new Map();
  const add = (k, t, who) => { if (!byK.has(k)) byK.set(k, new Map()); byK.get(k).set(t, who); if (!byT.has(t)) byT.set(t, new Map()); byT.get(t).set(k, who); };
  for (const p of copy.phrases) if (p.phrase_role !== 'component' && !isOld(p)) add(nk(p.known_text), nk(p.target_text), p.id);
  for (const s of copy.seeds) add(nk(s.known_text), nk(s.target_text), `seed ${s.seed_number}`);
  const ok = [];
  for (const x of staged) {
    const k = nk(x.known_text), t = nk(x.target_text);
    const kk = [...(byK.get(k) || new Map()).entries()].find(([tt]) => tt !== t);
    const tt = [...(byT.get(t) || new Map()).entries()].find(([k2]) => k2 !== k);
    if (kk) { refused.push({ lego: lid(x.seed_number, x.lego_index), known: x.known_text, target: x.target_text, why: `ZUT: same English is "${kk[0]}" at ${kk[1]}` }); continue; }
    if (tt && x.phrase_role === 'use') { refused.push({ lego: lid(x.seed_number, x.lego_index), known: x.known_text, target: x.target_text, why: `ZUT: same target is "${tt[0]}" at ${tt[1]}` }); continue; }
    add(k, t, lid(x.seed_number, x.lego_index)); ok.push(x);
  }
  const final = [];
  for (const key of [...replaced]) {
    const [s, l] = key.split(':').map(Number);
    const mine = ok.filter((x) => x.seed_number === s && +x.lego_index === l);
    if (!mine.some((x) => x.phrase_role === 'build') || mine.filter((x) => x.phrase_role === 'use').length < 2) {
      replaced.delete(key); held.push({ lego: lid(s, l), why: 'under the P10 floor after the course-wide ZUT re-check — old basket kept' });
    } else final.push(...mine);
  }
  // ids continue each LEGO's own numbering past EVERY row it holds live or in the copy (old rows still exist at insert time)
  const existing = [...copy.phrases.filter((p) => replaced.has(`${p.seed_number}:${+p.lego_index}`)),
    ...[...L.phrase.values()].filter((p) => replaced.has(`${p.seed_number}:${+p.lego_index}`) && !copy.phrases.some((q) => q.id === p.id))];
  const { rows, skipped } = planInsert(COURSE[c], final.map(({ pad, drop, ...x }) => x), existing);
  // planInsert skips a new pair the LEGO already holds; that old row is then the new basket's row and must NOT be deleted
  const samePair = new Set(skipped.map((r) => `${r.seed_number}:${+r.lego_index}|${nk(r.known_text)}|${nk(r.target_text)}`));
  const reused = (p) => samePair.has(`${p.seed_number}:${+p.lego_index}|${nk(p.known_text)}|${nk(p.target_text)}`);
  // ROMANIZATION: the app shows target_text_roman when set. If anything in the band carries one live, new rows would need it too.
  let romanized = 0;
  for (const s of live.seeds) if (s.seed_number >= a && s.seed_number <= b) { if (s.target_text_roman) romanized++; for (const l of s.legos || []) { if (l.target_text_roman) romanized++; for (const p of l.basket_phrases || []) if (p.target_text_roman) romanized++; } }
  if (romanized) throw new Error(`${romanized} rows in ${rng} carry target_text_roman live — new rows would need it too; stop`);
  for (const r of rows) { r.metadata = { format: 'build_use', pipeline: 'v4-rebuild', job: '247' }; r.target_text_roman = null; }
  const deletes = copy.phrases.filter((p) => isOld(p) && !reused(p)).map((p) => ({ id: p.id, seed_number: p.seed_number, lego_index: +p.lego_index, known_text: p.known_text, target_text: p.target_text }));
  const keptHand = copy.phrases.filter((p) => p.phrase_role !== 'component' && replaced.has(`${p.seed_number}:${+p.lego_index}`) && !isOld(p)).map((p) => p.id);
  const keptSame = copy.phrases.filter((p) => isOld(p) && reused(p)).map((p) => p.id);
  const seeds = [...new Set([...replaced].map((k) => +k.split(':')[0]))].sort((x, y) => x - y);
  return { course: COURSE[c], range: rng, job: JOB, legos: legos.length, replaced: replaced.size, inserts: rows, deletes, kept_hand_edited: keptHand, kept_same_pair: keptSame, refused, held, seeds };
}

// ── audio: the three slots of every new row, through the one route ──
/** The clip an EXISTS_IN_LANGUAGE refusal names: "<uuid> (voice V, <course> <role>)"; same course + slot preferred. Pure. */
function existingClip(msg, course, role) {
  const all = [...String(msg || '').matchAll(/([0-9a-f]{8}-[0-9a-f-]{27}) \(voice [^,]+, (\S+) (\S+)\)/g)].map((m) => ({ id: m[1], course: m[2], role: m[3] }));
  const best = all.find((x) => x.course === course && x.role === role) || all.find((x) => x.course === course) || all[0];
  return best ? best.id : null;
}
function audioFile(c) { return path.join(courseDir(c), 'audio.json'); }
function loadAudio(c) { return fs.existsSync(audioFile(c)) ? loadJson(audioFile(c)) : {}; }
function planFile(c, rng) { return path.join(courseDir(c), `plan-${rng}.json`); }
async function audio(c, rng, real) {
  const p = loadJson(planFile(c, rng));
  const have = loadAudio(c);
  const asks = [], seen = new Set();
  for (const r of p.inserts) for (const role of SLOTS) {
    const text = r[SLOT_TEXT[role]]; const key = `${role}|${text}`;
    if (seen.has(key) || have[key]) continue; seen.add(key); asks.push({ role, text, key, seed: r.seed_number });
  }
  const est = { known: 0, target: 0 };
  for (const x of asks) est[x.role === 'known' ? 'known' : 'target'] += x.text.length;
  console.log(`${c} ${rng}: ${asks.length} clips still to get; at most ${est.known} known-side + ${est.target} target-side chars if none is in the library (local estimate, no live calls)`);
  if (!real) return { asks: asks.length, ...est };
  if (process.env.RENDER_CONFIRM !== '1') { console.log('RENDER_CONFIRM=1 not set: nothing rendered'); return; }
  const transient = (r) => r.status === 0 || [502, 503, 504].includes(r.status) || /socket hang up|ECONNRESET|ECONNREFUSED|fetch failed/i.test(String(r.body && r.body.error));
  const linkedExisting = [];
  let spent = 0, lib = 0, rendered = 0, stop = null;
  const body = (a) => ({ courseCode: COURSE[c], role: a.role, text: a.text, purpose: `cs ${JOB} ${COURSE[c]} rebuilt basket ${rng} (Kai 24 Nov 17:26Z)`, job: JOB, seedPosition: a.seed });
  for (const a of asks) {
    let r = await post(`${POPTY}/api/audio/render`, body(a));
    for (let t = 0; t < 3 && transient(r); t++) { await waitPopty(); r = await post(`${POPTY}/api/audio/render`, body(a)); }
    if (!(r.status === 200 && r.body.ok)) {
      if (transient(r)) { stop = 'Popty unreachable after retries'; break; }
      const ex = r.body.code === 'EXISTS_IN_LANGUAGE' && existingClip(r.body.error, COURSE[c], a.role);
      if (ex) { have[a.key] = ex; linkedExisting.push({ ...a, audioId: ex }); continue; }
      stop = `REFUSED — no retry: ${a.role} "${a.text}" ${JSON.stringify(r.body).slice(0, 300)}`; break;
    }
    have[a.key] = r.body.audioId; spent += r.body.charsSpent || 0;
    if (r.body.source === 'library') lib++; else rendered++;
    if ((lib + rendered) % 25 === 0) fs.writeFileSync(audioFile(c), JSON.stringify(have));
  }
  fs.writeFileSync(audioFile(c), JSON.stringify(have));
  const sum = { range: rng, at: new Date().toISOString(), spent_chars: spent, rendered, library: lib, existing_linked: linkedExisting.length, stop };
  fs.appendFileSync(path.join(courseDir(c), 'audio-runs.jsonl'), JSON.stringify(sum) + '\n');
  console.log(JSON.stringify(sum));
  if (stop) { console.log(stop); process.exitCode = 3; }
}

// ── changesets ──
function insertCsFile(c, rng) { return path.join(courseDir(c), `${rng}.insert.changeset.jsonl`); }
function deleteCsFile(c, rng) { return path.join(courseDir(c), `${rng}.delete.changeset.jsonl`); }
function insertCs(c, rng) {
  const cs = require('../../services/shared/changeset.cjs');
  const p = loadJson(planFile(c, rng));
  const have = loadAudio(c);
  // A LEGO lands whole or not at all: a LEGO with any row lacking a clip keeps its old basket this run.
  const blocked = new Set(p.inserts.filter((r) => SLOTS.some((role) => !have[`${role}|${r[SLOT_TEXT[role]]}`])).map((r) => lid(r.seed_number, r.lego_index)));
  const ops = [];
  for (const r of p.inserts) {
    if (blocked.has(lid(r.seed_number, r.lego_index))) continue;
    ops.push(cs.op('phrase.insert', { row: r }));
    // APOSTROPHES (cs #338·AL, 26 Nov: S0466L02B03, S0547L01U06): the render route's library hands back a clip whose
    // label spells "don’t" for a row that says "don't" (jpn_for_eng's known side is all straight quotes), and the link
    // door refuses the pair — one refused link holds a whole LEGO's swap. The clip was fetched FOR this exact text, so
    // on a known slot whose text carries an apostrophe the only possible mismatch is the quote mark: link it anyway.
    for (const role of SLOTS) ops.push(cs.op('audio.link', { target: 'phrase', phrase_id: r.id, slot: role, audio_id: have[`${role}|${r[SLOT_TEXT[role]]}`],
      ...(role === 'known' && /['’]/.test(r.known_text) ? { allow_text_mismatch: true } : {}) }));
  }
  cs.write(insertCsFile(c, rng), { id: `${COURSE[c]}-cs247-${rng}-insert`, course: COURSE[c], job: JOB, kai_go: KAI_GO,
    why: `rebuilt baskets ${rng}: new rows + their three clips (old rows go in the delete changeset, built from this one's ledger)`,
    source: `plan-${rng}.json (QA copy dump + live pre-check) + audio.json` }, ops);
  console.log(`${c} ${rng}: insert changeset ${ops.length} ops (${ops.length / 4} rows) over ${new Set(p.inserts.map((r) => lid(r.seed_number, r.lego_index))).size - blocked.size} LEGOs; ${blocked.size} LEGOs wait for audio`);
}
function deleteCs(c, rng) {
  const cs = require('../../services/shared/changeset.cjs');
  const { loadLedger } = require('../changeset/apply-changeset.cjs');
  const p = loadJson(planFile(c, rng));
  const insFile = insertCsFile(c, rng);
  const { ops: insOps } = cs.read(insFile);
  const fate = loadLedger(`${insFile}.applied.jsonl`);
  const landed = (i) => ['applied', 'already'].includes(fate.get(i));
  const legoOf = (id) => id.match(/S\d{4}L\d{2}/)[0];
  const perLego = new Map(); // lego → { ok, rowsLanded: [ids], bad: [ids] }
  insOps.forEach((o, i) => {
    const pid = o.op === 'phrase.insert' ? o.row.id : o.phrase_id;
    const lg = legoOf(pid);
    if (!perLego.has(lg)) perLego.set(lg, { ok: true, landedRows: new Set(), badRows: new Set() });
    const e = perLego.get(lg);
    if (!landed(i)) { e.ok = false; e.badRows.add(pid); }
    if (o.op === 'phrase.insert' && landed(i)) e.landedRows.add(pid);
  });
  const ops = [], whole = [], partial = [];
  for (const [lg, e] of perLego) {
    if (e.ok) {
      whole.push(lg);
      for (const d of p.deletes.filter((x) => legoOf(x.id) === lg)) ops.push(cs.op('phrase.delete', { phrase_id: d.id, expect: { seed_number: d.seed_number, lego_index: d.lego_index, known_text: d.known_text, target_text: d.target_text } }));
    } else {
      // make-before-break failed for this LEGO: keep its old basket; a new row that landed without all its clips goes
      // (thin beats silent); new rows that landed whole stay beside the old basket.
      partial.push(lg);
      for (const id of e.badRows) if (e.landedRows.has(id)) {
        const r = p.inserts.find((x) => x.id === id);
        ops.push(cs.op('phrase.delete', { phrase_id: id, expect: { seed_number: r.seed_number, lego_index: r.lego_index, known_text: r.known_text, target_text: r.target_text } }));
      }
    }
  }
  const seeds = [...new Set(whole.map((lg) => +lg.slice(1, 5)))].sort((x, y) => x - y);
  for (const s of seeds) ops.push(cs.op('seed.update', { seed_number: s, set: { approved_at: null } })); // O5: touched seeds are unapproved
  cs.write(deleteCsFile(c, rng), { id: `${COURSE[c]}-cs247-${rng}-delete`, course: COURSE[c], job: JOB, kai_go: KAI_GO,
    why: `rebuilt baskets ${rng}: old rows of LEGOs whose new basket landed fully voiced (${whole.length}); ${partial.length} LEGOs kept old`,
    source: `${path.basename(insFile)}.applied.jsonl + plan-${rng}.json` }, ops);
  console.log(`${c} ${rng}: delete changeset ${ops.length} ops; ${whole.length} LEGOs swapped, ${partial.length} kept old (${partial.join(' ')})`);
}

// ── verify (live /seeds read) ──
function verify(c, rng, live) {
  const [a, b] = range(rng);
  const p = loadJson(planFile(c, rng));
  const L = liveIndex(live);
  const oldLeft = p.deletes.filter((d) => L.phrase.has(d.id));
  const newMissing = p.inserts.filter((r) => !L.phrase.has(r.id));
  const rows = [];
  for (const [k, l] of L.lego) if (l.is_new && l.seed_number >= a && l.seed_number <= b) for (const x of l.basket_phrases || []) if (x.phrase_role !== 'component') rows.push(x);
  const empty = rows.filter((x) => !x.known_audio_id || !x.target1_audio_id || !x.target2_audio_id);
  const padded = rows.filter((x) => padReasons(c, x.known_text, x.target_text).length);
  const june = rows.filter((x) => String(x.created_at) < '2026-07-01');
  const out = { course: c, range: rng, planned_inserts: p.inserts.length, planned_deletes: p.deletes.length, old_left: oldLeft.length, new_missing: newMissing.length, live_rows: rows.length, empty_slot_rows: empty.length, padded_rows_left: padded.length, june_rows_left: june.length };
  console.log(JSON.stringify(out));
  return out;
}

module.exports = { padReasons, plan, precheckLego, upperI, existingClip, genCurrent, accountGate, ceilingFor };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const unpacedFlag = argv.includes('--unpaced');
  const [mode, c, rng, x, y] = argv.filter((a) => a !== '--unpaced');
  if (!COURSE[c]) { console.error('course must be jpn|kor'); process.exit(64); }
  (async () => {
    if (mode === 'gen') await gen(c, rng, x, Number(y) || 2, unpacedFlag);
    else if (mode === 'read') read(c, rng, x);
    else if (mode === 'plan') {
      if (!x || !y) throw new Error('plan <c> <range> <copyDump> <liveSeeds>');
      const p = plan(c, rng, loadJson(x), loadJson(y), (s, l) => readGen(c, s, l));
      fs.writeFileSync(planFile(c, rng), JSON.stringify(p, null, 1));
      console.log(`${c} ${rng}: ${p.legos} new LEGOs; ${p.replaced} baskets replaced; ${p.inserts.length} inserts, ${p.deletes.length} deletes, ${p.kept_hand_edited.length} hand-edited kept, ${p.refused.length} rows refused, ${p.held.length} LEGOs held`);
    } else if (mode === 'audio') await audio(c, rng, x === '--real');
    else if (mode === 'insert-cs') insertCs(c, rng);
    else if (mode === 'delete-cs') deleteCs(c, rng);
    else if (mode === 'verify') verify(c, rng, loadJson(x));
    else { console.error('mode: gen|read|plan|audio|insert-cs|delete-cs|verify'); process.exit(64); }
  })().catch((e) => { console.error(e); process.exit(1); });
}
