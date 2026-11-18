#!/usr/bin/env node
// Audio for item-4 rows, through the ONE route (POST :3470/api/audio/render) and edit-batch audio.link.
// The job's HARD CAP is 100,000 characters (ledger: audio/ledger.json, summed from the route's own charsSpent).
//
//   node audio.cjs plan  <course>            rows whose text this job set (every batches/*.apply.json + slice-*.json),
//                                            re-read live; slots still empty -> audio/<course>.plan.json with a price
//                                            (upper bound: every character, before library hits)
//   node audio.cjs real  <course> [maxChars] renders the plan worst-hit LEGO first; stops BEFORE a line would pass the
//                                            cap; a refusal is recorded and never retried -> audio/<course>.renders.json
//   node audio.cjs link  <course> apply|dry  audio.link ops for every rendered slot -> edit-batch (clip must speak the words)
//   node audio.cjs readback <course>         re-read live; the audio id each row now points at -> audio/<course>.readback.json
// eng_for_pan is refused outright (D3: its known-side voice gender is undecided; text only).
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
// The shared DB is contended: an edit-batch can take minutes to answer. Node's fetch gives up after 300 s while the
// server goes on and COMMITS (cs #700·AI, eng_for_tam 18 Nov); wait as long as the server works, never guess.
{ const { Agent, setGlobalDispatcher } = require(require('path').join(L.ROOT, 'node_modules/undici'));
  setGlobalDispatcher(new Agent({ headersTimeout: 0, bodyTimeout: 0 })); }
const [mode, course, arg] = process.argv.slice(2);
const CAP = 100000;
const ADIR = path.join(L.ITEM_DIR, 'audio'); fs.mkdirSync(ADIR, { recursive: true });
const LEDGER = path.join(ADIR, 'ledger.json');
const H = { 'Content-Type': 'application/json', 'x-agent-id': 'cs-item4-filler', 'x-agent-role': 'paid-cleanup-item4' };
const rd = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
const wr = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 1));
if (course === 'eng_for_pan') { console.error('eng_for_pan is text-only (D3): no audio'); process.exit(2); }
const cdir = path.join(L.ITEM_DIR, course);
const SLOTS = [['known', 'known_audio_id', 'known_text'], ['target1', 'target1_audio_id', 'target_text'], ['target2', 'target2_audio_id', 'target_text']];

function ourRows() {
  const ids = new Set();
  const bdir = path.join(cdir, 'batches');
  for (const f of fs.existsSync(bdir) ? fs.readdirSync(bdir).filter(f => f.endsWith('.apply.json')) : []) {
    const a = rd(path.join(bdir, f)); if (!a.applied) continue;
    const ops = rd(path.join(bdir, f.replace('.apply.json', '.ops.json'))).ops;
    for (const o of ops) if (o.op === 'phrase.update') ids.add(o.phrase_id); else if (o.op === 'phrase.insert') ids.add(o.row.id);
  }
  for (const f of fs.readdirSync(cdir).filter(f => /^slice-.*\.json$/.test(f))) for (const id of rd(path.join(cdir, f)).new_or_rewritten || []) ids.add(id);
  return ids;
}

(async () => {
  if (mode === 'plan') {
    const ids = ourRows();
    const live = new Map();
    for (const s of L.loadLive(course)) for (const l of s.legos) for (const p of l.basket_phrases) live.set(p.id, { p, l });
    const perLego = new Map();
    const lines = []; let missing = 0;
    for (const id of ids) {
      const x = live.get(id); if (!x) { missing++; continue; }
      perLego.set(x.l.lego_id, (perLego.get(x.l.lego_id) || 0) + 1);
      for (const [role, col, tcol] of SLOTS) if (!x.p[col]) lines.push({ id, lego: x.l.lego_id, role, slot: role, text: x.p[tcol] });
    }
    // Worst-hit first: the LEGO with the most rows this job set; then seed order.
    lines.sort((a, b) => (perLego.get(b.lego) - perLego.get(a.lego)) || a.lego.localeCompare(b.lego));
    const uniq = new Map(); for (const ln of lines) { const k = `${ln.role}|${ln.text}`; if (!uniq.has(k)) uniq.set(k, ln.text.length); }
    const price = [...uniq.values()].reduce((a, b) => a + b, 0);
    wr(path.join(ADIR, `${course}.plan.json`), { at: new Date().toISOString(), rows: ids.size, rows_not_found: missing, slots: lines.length, unique_lines: uniq.size, price_upper_bound_chars: price, lines });
    console.log(`${course}: ${ids.size} rows, ${lines.length} empty slots, ${uniq.size} unique lines, <= ${price} chars`);
    return;
  }
  if (mode === 'real') {
    const plan = rd(path.join(ADIR, `${course}.plan.json`));
    const ledger = rd(LEDGER, { cap: CAP, spent: 0, calls: [] });
    const budget = Math.min(CAP, arg ? ledger.spent + Number(arg) : CAP);
    const outF = path.join(ADIR, `${course}.renders.json`);
    const out = rd(outF, {});
    let stopped = null;
    for (const ln of plan.lines) {
      const k = `${ln.role}|${ln.text}`;
      if (out[k] && (out[k].audioId || out[k].refused)) continue;
      if (ledger.spent + ln.text.length > budget) { stopped = `cap: ${ledger.spent} spent, next line ${ln.text.length}`; break; }
      const body = { courseCode: course, role: ln.role, text: ln.text, purpose: 'paid cleanup item 4 back-fill (cs #700·AI)', legoId: ln.lego, dryRun: false };
      let r, j;
      try { r = await fetch('http://localhost:3470/api/audio/render', { method: 'POST', headers: H, body: JSON.stringify(body) }); j = await r.json(); }
      catch (e) { out[k] = { error: e.message }; stopped = `transport error: ${e.message}`; break; }
      const spent = Number(j.charsSpent || 0);
      ledger.spent += spent; ledger.calls.push({ at: new Date().toISOString(), course, role: ln.role, chars: spent, source: j.source || null, code: j.code || null });
      out[k] = j.ok ? { audioId: j.audioId, source: j.source, charsSpent: spent } : { refused: true, status: r.status, code: j.code || null, error: String(j.error || '').slice(0, 300) };
      wr(outF, out); wr(LEDGER, ledger);
      if (!j.ok && ['DAILY_TOTAL_CAP', 'NOT_IN_CHAIN'].includes(j.code)) { stopped = `refused ${j.code}`; break; }
    }
    const done = Object.values(out).filter(x => x.audioId).length, ref = Object.values(out).filter(x => x.refused).length;
    console.log(`${course}: ${done} lines have a clip, ${ref} refused; job ledger ${ledger.spent}/${CAP}${stopped ? `; STOPPED: ${stopped}` : ''}`);
    return;
  }
  if (mode === 'link') {
    const plan = rd(path.join(ADIR, `${course}.plan.json`));
    const out = rd(path.join(ADIR, `${course}.renders.json`), {});
    const ops = [];
    for (const ln of plan.lines) { const r = out[`${ln.role}|${ln.text}`]; if (r && r.audioId) ops.push({ op: 'audio.link', target: 'phrase', phrase_id: ln.id, slot: ln.slot, audio_id: r.audioId }); }
    const res = [];
    for (let i = 0; i < ops.length; i += 100) {
      const r = await fetch(`http://localhost:3470/api/production/${course}/edit-batch`, { method: 'POST', headers: H, body: JSON.stringify({ ops: ops.slice(i, i + 100), apply: arg === 'apply' }) });
      const j = await r.json();
      res.push({ status: r.status, ok: j.ok, applied: j.applied, event_id: j.event_id || null, undo_file: j.undo_file || null, error: j.error || null, index: j.index });
      console.log(`${course} link ${i}-${i + 100}: HTTP ${r.status} ${j.applied ? 'applied ' + j.event_id : (j.ok ? 'dry ok' : j.error)}`);
      if (!j.ok) break;
    }
    wr(path.join(ADIR, `${course}.link-${arg}.json`), { at: new Date().toISOString(), ops: ops.length, batches: res });
    return;
  }
  if (mode === 'readback') {
    const ids = ourRows();
    const rows = [];
    for (const s of L.loadLive(course)) for (const l of s.legos) for (const p of l.basket_phrases) if (ids.has(p.id))
      rows.push({ id: p.id, known: p.known_text, target: p.target_text, known_audio_id: p.known_audio_id, target1_audio_id: p.target1_audio_id, target2_audio_id: p.target2_audio_id });
    const full = rows.filter(r => r.known_audio_id && r.target1_audio_id && r.target2_audio_id).length;
    wr(path.join(ADIR, `${course}.readback.json`), { at: new Date().toISOString(), rows: rows.length, fully_voiced: full, rows_list: rows });
    console.log(`${course}: ${rows.length} rows, ${full} fully voiced`);
    return;
  }
  console.error('mode?'); process.exit(2);
})();
