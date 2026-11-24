#!/usr/bin/env node
// cs #868 (Kai's paid-cleanup limbo finish, approved fixes incl. their audio): fill EMPTY audio slots listed in a
// slots file, through Popty only. Per slot, the same two calls item 4/9's night-audio made:
//   1. node tools/audio/render.cjs  (POST /api/audio/render: library first, spend guard, ONE render, no retries)
//   2. POST /api/production/<course>/link-clip FILL-ONLY (never `replace`: a slot someone filled since is left alone;
//      the route checks the clip speaks the row's words and is in the cast voice, so a drifted row is refused, not forced).
// Gate: before every slot, Popty /health must say governed:true and level green or amber; red -> wait (max 30 min),
// then stop. Spend: --cap <chars> for THIS file's whole ledger (Cartesia+unknown voices; Azure tallied apart).
// Refusals: a spend/quota/stop refusal STOPS the run (the refusal is the answer); any other refusal
// (EXISTS_IN_LANGUAGE, VOICE_*, REPEAT ...) is logged for that slot, which is never sent again.
// Evidence is the audioId per slot in the ledger (read back from the next nightly copy); never a transcript.
//   node fill.cjs <slots.json> --cap <chars> [--agent kai-868] [--purpose "..."] [--approval "..."] [--max N]
// slots.json = {slots:[{course, target:'phrase'|'lego', id, role:'known'|'target1'|'target2', text, seed}]}
// ledger: <slots.json minus .json>.ledger.jsonl (resumable: answered slots are skipped)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../../..');
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const file = argv[0];
const CAP = Number(opt('--cap', 0));
const MAX = Number(opt('--max', 1e9));
const AGENT = opt('--agent', 'kai-868');
const PURPOSE = opt('--purpose', 'cs #868 paid-cleanup limbo finish (Kai-approved fix, its audio)');
const APPROVAL = opt('--approval', null);
if (!file || !CAP) { console.error('usage: fill.cjs <slots.json> --cap <chars> [...]'); process.exit(2); }
const STOP_RE = /402|CAP|QUOTA|STOP|NOT_IN_CHAIN|BUDGET|LIMIT|APPROVAL_UNVERIFIED/i; // APPROVAL_UNVERIFIED is a real refusal now
// cs #43·AL: APPROVAL_CHECK_UNAVAILABLE (surface down past render.cjs's back-off) is not logged: slot stays unanswered, run stops.
// An old-route outage record (APPROVAL_UNVERIFIED "could not be reached") counts as unanswered and is asked again.
const { isOutageRefusal } = require('../../../services/shared/approval-origin.cjs');
const ledger = file.replace(/\.json$/, '') + '.ledger.jsonl';
const recs = fs.existsSync(ledger) ? fs.readFileSync(ledger, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
const key = (s) => `${s.course}|${s.target}|${s.id}|${s.role}`;
const lastRec = new Map(recs.map((r) => [r.key, r]));
const answered = new Set([...lastRec].filter(([, r]) => !isOutageRefusal(r)).map(([k]) => k));
const isCartesia = (v) => !v || !/^azure|^eleven|^google|^human|^xai/i.test(String(v));
let spent = recs.filter((r) => r.ok && isCartesia(r.voiceId)).reduce((a, r) => a + (Number(r.charsSpent) || 0), 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gate() {
  for (let i = 0; i < 60; i++) {
    try {
      const h = await (await fetch('http://localhost:3470/health', { signal: AbortSignal.timeout(20000) })).json();
      const g = h.dbLoadGate || {};
      if (g.governed && g.level !== 'red') return g.level;
      console.log(new Date().toISOString(), 'load gate', g.level, '- waiting');
    } catch (e) { console.log(new Date().toISOString(), 'health unreachable - waiting'); }
    await sleep(30000);
  }
  return null;
}

(async () => {
  const { slots } = JSON.parse(fs.readFileSync(file, 'utf8'));
  slots.sort((a, b) => (a.seed || 0) - (b.seed || 0) || a.course.localeCompare(b.course));
  const tally = {}; const bump = (k) => { tally[k] = (tally[k] || 0) + 1; };
  let stop = null, n = 0;
  for (const s of slots) {
    const k = key(s);
    if (answered.has(k)) { bump('already'); continue; }
    if (n >= MAX) { stop = `--max ${MAX} reached`; break; }
    if (spent + s.text.length > CAP) { stop = `cap: ${spent} + ${s.text.length} > ${CAP}`; break; }
    const lvl = await gate(); if (!lvl) { stop = 'load gate red for 30 min'; break; }
    const args = [path.join(ROOT, 'tools/audio/render.cjs'), '--course', s.course, '--role', s.role, '--text', s.text, '--purpose', PURPOSE, '--job', '#868'];
    if (APPROVAL && process.env.CS_CONV_TOKEN) args.push('--approval', APPROVAL);
    let out; try { out = execFileSync('node', args, { encoding: 'utf8', env: { ...process.env, AGENT_ID: AGENT } }); } catch (e) { out = String(e.stdout || ''); }
    let r; try { r = JSON.parse(out); } catch { r = null; }
    if (r && r.code === 'APPROVAL_CHECK_UNAVAILABLE') { bump('try_later'); stop = 'try later: Command Surface down past render.cjs back-off'; break; }
    if (!r || !(r.ok || r.code)) { bump('no_answer'); console.log(k, 'NO_ANSWER:', String(out).slice(0, 200)); continue; }
    const rec = { at: new Date().toISOString(), key: k, ...s, ok: !!r.ok, source: r.source, code: r.code, audioId: r.audioId,
      voiceId: r.voiceId || r.voice || null, charsSpent: r.charsSpent || 0, error: r.error && String(r.error).slice(0, 400) };
    if (r.ok && r.audioId) {
      const link = { role: s.role, audioId: r.audioId, ...(s.target === 'lego' ? { legoId: s.id } : { phraseId: s.id }) };
      const lr = await fetch(`http://localhost:3470/api/production/${s.course}/link-clip`, { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify({ links: [link] }) });
      const l = await lr.json().catch(() => ({}));
      const one = (l.results && l.results[0]) || l;
      rec.link = { status: lr.status, ok: !!(l.ok && one.ok !== false), code: one.code || l.code, error: (one.error || l.error) && String(one.error || l.error).slice(0, 300) };
      rec.voiceId = rec.voiceId || one.voiceId || null;
    }
    fs.appendFileSync(ledger, JSON.stringify(rec) + '\n'); answered.add(k); n++;
    if (rec.ok && isCartesia(rec.voiceId)) spent += Number(rec.charsSpent) || 0;
    bump(r.ok ? (rec.link && rec.link.ok ? `linked_${r.source}` : `link_failed_${rec.link && rec.link.code}`) : `refused_${r.code}`);
    console.log(k, r.ok ? r.source : r.code, r.charsSpent || 0, rec.link ? (rec.link.ok ? 'linked' : rec.link.code) : '', '| spent', spent);
    if (!r.ok && STOP_RE.test(`${r.code} ${r.error || ''}`)) { stop = `STOPPED on refusal: ${r.code} ${String(r.error || '').slice(0, 300)}`; break; }
  }
  const left = slots.filter((s) => !answered.has(key(s))).length;
  console.log(`fill ${path.basename(file)}: ${slots.length} slots ${JSON.stringify(tally)}; Cartesia spent (ledger) ${spent}/${CAP}; ${left} unanswered${stop ? `; ${stop}` : ''}`);
  process.exit(stop && /STOPPED/.test(stop) ? 3 : 0);
})();
