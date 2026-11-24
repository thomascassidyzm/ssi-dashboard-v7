#!/usr/bin/env node
// cs #358: audio for every row item 4 made live in a course, through Popty's ONE route, run by night-run.sh after
// the appliers. Same two calls as item 9's night-audio (#960·AI): node tools/audio/render.cjs (POST /api/audio/render:
// library first, spend guard, ONE render, no retries) then POST /api/production/<course>/link-clip FILL-ONLY (never
// `replace`: a slot someone else filled since is never overwritten). Evidence is the audioId per slot; no transcription.
// Slots, merged and played in SEED ORDER across every course given (early seeds reach the most learners):
//   - <course>/changesets/r358.changeset.jsonl: only ops its ledger marks "applied" (item 9's ledger-state.slotsFor:
//     insert -> known/target1/target2; rewrite -> the side(s) whose words changed);
//   - <course>/changesets/backlog-358.slots.json: rows item 4 changed on 18 Nov whose slots are silent (audio-backlog.cjs).
// Spend: Kai's item-4 cap is 550,000 Cartesia characters in TOTAL (18 Nov 200k, raised 22 Nov). Every night's Cartesia (or unknown-voice)
// charsSpent across both courses' logs counts; a slot whose text would pass the cap is not sent, and the run stops
// there (cap reached: the rest is listed as still silent). Azure characters are tallied apart (billed apart).
// The spend file ~/ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-item4/cartesia-spend.json ({done,total,byDay}) is
// what the azure-to-cartesia runner reads through its fixes.json reserve "item4-358", so the two never overrun the cap.
// Refusals: a spend/quota/stop refusal (402, *CAP*, *QUOTA*, *STOP*, NOT_IN_CHAIN, *BUDGET*) STOPS the whole run and is
// logged verbatim; any other refusal (EXISTS_IN_LANGUAGE, VOICE_*, REPEAT…) is logged verbatim for that slot and that
// slot is never sent again. Kai's 18 Nov rule "fill now, mismatch OK" is passed as the --approval grant (needs
// CS_CONV_TOKEN in env; never on argv). The run also stops when the UK night window (22:00-07:00) closes.
// SURFACE OUTAGES (cs #43·AL): a render answered APPROVAL_CHECK_UNAVAILABLE (render.cjs exit 3, after its own back-off) is NOT
// logged — the slot stays unanswered and the run stops for the night (asked again next run). Records the old route logged as
// APPROVAL_UNVERIFIED "could not be reached" were outages too, so they count as unanswered and are asked again.
// --outage-reask: ask ONLY those outage-refused slots, by day too (a small re-run; the window check is for the bulk).
// usage: node night-audio.cjs [--outage-reask] <course> [<course> …]   log: <course>/changesets/audio-358.jsonl (resumable)
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../../..');
const ITEM = path.resolve(__dirname, '..');
const { slotsFor } = require('../../paid-cleanup-item9/tools/ledger-state.cjs');
// Kai's Watson, 22 Nov: cap raised from 200k to 550k so no item-4 row is left silent (inside Kai's 1M/day for course fixes).
const CAP = 550000;
const AGENT = process.env.AGENT_ID || 'kai-358-item4';
const APPROVAL = 'kai:2026-11-18:paid-cleanup item 4 filler rows, Kai approved incl. audio (550k Cartesia cap); fill now, mismatch OK (cs #358)';
const PURPOSE = 'cs #358 paid cleanup item 4 (filler/template practice rows re-said or back-filled), Kai approved 18 Nov';
const SPEND = path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-item4/cartesia-spend.json');
const STOP_RE = /402|CAP|QUOTA|STOP|NOT_IN_CHAIN|BUDGET|LIMIT/i; // never matches APPROVAL_CHECK_UNAVAILABLE (handled above)
const { isOutageRefusal } = require('../../../services/shared/approval-origin.cjs');
const OUTAGE_REASK = process.argv.includes('--outage-reask');
const courses = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const readLog = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
const logOf = (c) => path.join(ITEM, c, 'changesets', 'audio-358.jsonl');
const isCartesia = (v) => !v || !/^azure|^eleven|^google|^human|^xai/i.test(String(v));
const ukHour = () => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
const night = () => { const h = ukHour(); return h >= 22 || h < 7; };
const allRecs = () => courses.flatMap((c) => readLog(logOf(c)));
function writeSpend(extra = {}) {
  const recs = allRecs().filter((r) => r.ok && isCartesia(r.voiceId));
  const byDay = {};
  for (const r of recs) { const d = String(r.at).slice(0, 10); byDay[d] = (byDay[d] || 0) + (Number(r.charsSpent) || 0); }
  const total = Object.values(byDay).reduce((a, b) => a + b, 0);
  const azure = allRecs().filter((r) => r.ok && !isCartesia(r.voiceId)).reduce((a, r) => a + (Number(r.charsSpent) || 0), 0);
  fs.mkdirSync(path.dirname(SPEND), { recursive: true });
  fs.writeFileSync(SPEND, JSON.stringify({ what: 'cs #358 item 4 audio, Cartesia charsSpent (route answers)', cap: CAP, total, byDay, azure_chars: azure, at: new Date().toISOString(), ...extra }, null, 1));
  return total;
}
const up = async (c) => { for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://localhost:3470/api/production/${c}/edit-ops`); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 5000)); } };

(async () => {
  const queue = [];
  for (const c of courses) {
    const seen = new Set();
    const cf = path.join(ITEM, c, 'changesets', 'r358.changeset.jsonl');
    if (fs.existsSync(cf)) {
      const { ops, ledger, slots } = slotsFor(cf);
      const seedOfId = (id) => Number(String(id).replace(/^.*:/, '').slice(1, 5));
      for (const s of slots) if (!seen.has(s.key)) { seen.add(s.key); queue.push({ ...s, course: c, seed: seedOfId(s.id), from: 'r358' }); }
    }
    const bf = path.join(ITEM, c, 'changesets', 'backlog-358.slots.json');
    if (fs.existsSync(bf)) for (const s of JSON.parse(fs.readFileSync(bf, 'utf8')).slots) if (!seen.has(s.key)) { seen.add(s.key); queue.push({ ...s, course: c, from: 'backlog' }); }
  }
  queue.sort((a, b) => a.seed - b.seed || a.course.localeCompare(b.course) || a.key.localeCompare(b.key));
  // last record per slot decides: an outage refusal is no answer
  const last = new Map(); for (const r of allRecs()) last.set(`${r.course}|${r.key}`, r);
  const outage = new Set([...last].filter(([, r]) => isOutageRefusal(r)).map(([k]) => k));
  const answered = new Set([...last.keys()].filter((k) => !outage.has(k)));
  if (OUTAGE_REASK) { const keep = queue.filter((s) => outage.has(`${s.course}|${s.key}`)); queue.length = 0; queue.push(...keep); }
  let spent = writeSpend();
  const tally = {}; const bump = (k) => { tally[k] = (tally[k] || 0) + 1; };
  let stop = null;
  for (const s of queue) {
    if (answered.has(`${s.course}|${s.key}`)) { bump('already_answered'); continue; }
    if (!OUTAGE_REASK && !night()) { stop = 'UK night window closed'; break; }
    if (spent + s.text.length > CAP) { stop = `item-4 cap: ${spent} spent + next ${s.text.length} > ${CAP}`; break; }
    const args = [path.join(ROOT, 'tools/audio/render.cjs'), '--course', s.course, '--role', s.role, '--text', s.text, '--purpose', PURPOSE, '--job', '#358'];
    if (process.env.CS_CONV_TOKEN) args.push('--approval', APPROVAL);
    await up(s.course);
    let out; try { out = execFileSync('node', args, { encoding: 'utf8', env: { ...process.env, AGENT_ID: AGENT } }); } catch (e) { out = String(e.stdout || ''); }
    let r; try { r = JSON.parse(out); } catch { r = null; }
    if (r && r.code === 'APPROVAL_CHECK_UNAVAILABLE') { bump('try_later'); stop = 'Command Surface down past render.cjs back-off: slot left unanswered, asked next run'; break; }
    if (!r || !(r.ok || r.code)) { bump('no_answer'); console.log(s.course, s.key, 'NO_ANSWER (not logged; asked again next run):', String(out).slice(0, 200)); continue; }
    const rec = { at: new Date().toISOString(), course: s.course, key: s.key, id: s.id, role: s.role, text: s.text, from: s.from, seed: s.seed,
      ok: !!r.ok, source: r.source, code: r.code, audioId: r.audioId, voiceId: r.voiceId || r.voice || null, charsSpent: r.charsSpent || 0,
      error: r.error && String(r.error).slice(0, 400) };
    if (r.ok && r.audioId) {
      await up(s.course);
      const lr = await fetch(`http://localhost:3470/api/production/${s.course}/link-clip`, { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT },
        body: JSON.stringify({ links: [{ phraseId: s.phraseId || s.id, role: s.role, audioId: r.audioId }] }) });
      const l = await lr.json().catch(() => ({}));
      const one = (l.results && l.results[0]) || l;
      rec.link = { status: lr.status, ok: !!(l.ok && one.ok !== false), code: one.code || l.code, error: (one.error || l.error) && String(one.error || l.error).slice(0, 300) };
      rec.voiceId = rec.voiceId || one.voiceId || null;
    }
    fs.appendFileSync(logOf(s.course), JSON.stringify(rec) + '\n');
    answered.add(`${s.course}|${s.key}`);
    if (rec.ok && isCartesia(rec.voiceId)) spent += Number(rec.charsSpent) || 0;
    bump(r.ok ? (rec.link && rec.link.ok ? `linked_${r.source}` : `link_failed_${rec.link && rec.link.code}`) : `refused_${r.code}`);
    if (!r.ok && STOP_RE.test(`${r.code} ${r.error || ''}`)) { stop = `STOPPED on a spend refusal: ${r.code} ${String(r.error || '').slice(0, 300)}`; break; }
  }
  const left = queue.filter((s) => !answered.has(`${s.course}|${s.key}`)).length;
  spent = writeSpend({ done: left === 0, left });
  console.log(`night-audio item4 ${courses.join('+')}: ${queue.length} slot(s) ${JSON.stringify(tally)}; Cartesia total ${spent}/${CAP}; ${left} unanswered${stop ? `; ${stop}` : ''}`);
  process.exit(stop && /STOPPED/.test(stop) ? 3 : 0);
})();
