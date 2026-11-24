#!/usr/bin/env node
// cs #374·AI: audio for every C0108 row the night apply made live, through Popty's ONE route, run by night-run.sh after
// the applier. The same two calls as item 4's night-audio (ops/paid-cleanup-item4/tools/night-audio.cjs, #358·AK):
// node tools/audio/render.cjs (POST /api/audio/render: library first, spend guard, ONE render, no retries), then
// POST /api/production/<course>/link-clip FILL-ONLY (never `replace`: a slot someone else, or the text-change trigger,
// filled is never overwritten; the answer is logged). Evidence = the audioId per slot; no transcription, ever.
// Slots, per course in the order given, from <course>/changesets/c0108-374.changeset.jsonl, ops its ledger marks "applied":
//   phrase.insert / lego.insert -> known, target1, target2; phrase.update / lego.update / seed.update -> the side(s)
//   whose words changed (seed slots link by seedNumber, LEGO slots by legoId, phrases by phraseId).
// Exceptions (Kai's brief, 22 Nov): fry_for_eng target1/target2 are human-voiced (Auke): never rendered, written to
//   <course>/changesets/auke-retakes-374.json; cor_for_eng is parked for audio: nothing at all.
// INTROS (Kai 22 Nov: no silent slots): <course>/changesets/intros-374.json (tools/intros.py) names, per LEGO whose words change
//   (re-cut, inserted, or whose intro quotes the old seed sentence), the NEW intro text in the course's own intro format.
//   Each is sent once its op (needs_op) is applied, as role presentation with --lego: the route renders it in the course's
//   cast presentation voice (or splices it from Charlotte pieces, or refuses by the voicing policy: logged) and binds
//   course_legos.presentation_audio_id itself (the old clip is kept, never deleted).
// Spend: 110,000 Cartesia characters in TOTAL for this job; a slot that would pass it is not sent and the run stops.
//   Azure tallied apart. Spend file ~/ssi-evidence/ssi-dashboard-v7/ops/c0108-719/cartesia-spend.json ({done,total,byDay})
//   is read by the azure-to-cartesia runner through its fixes.json reserve "c0108-374".
// Refusals: a spend/quota/stop refusal (402, *CAP*, *QUOTA*, *STOP*, NOT_IN_CHAIN, *BUDGET*, *LIMIT*) STOPS the run;
//   any other refusal (EXISTS_IN_LANGUAGE, VOICE_*, REPEAT…) is logged verbatim for that slot, never sent again. Kai's
//   18 Nov "fill now, mismatch OK" is the --approval grant (needs CS_CONV_TOKEN in env, never on argv). Stops when the
//   UK night (22:00-07:00) closes.
// usage: node night-audio.cjs <course> [...]   log: <course>/changesets/audio-374.jsonl (resumable)
const fs = require('fs');
const { landed } = require('./landed.cjs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const cs = require('../../../services/shared/changeset.cjs');
const { loadLedger } = require('../../../tools/changeset/apply-changeset.cjs');
const ROOT = path.resolve(__dirname, '../../..');
const DIR = path.resolve(__dirname, '..');
const CAP = 110000;   // 80k sized from SIZING.md; raised 22 Nov when Kai asked for every changed intro too (the add-on LEGOs added rows)
const AGENT = process.env.AGENT_ID || 'kai-c0108-374';
const APPROVAL = "kai:2026-11-18:C0108 seed 108 hope->expect, Kai yes 18 Nov 13:22Z incl. audio (110k Cartesia cap, intros included); fill now, mismatch OK (cs #374)";
const PURPOSE = "cs #374 C0108 seed 108 'didn't hope to wake' -> 'didn't expect to wake up', Kai approved 18 Nov";
const SPEND = path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7/ops/c0108-719/cartesia-spend.json');
const STOP_RE = /402|CAP|QUOTA|STOP|NOT_IN_CHAIN|BUDGET|LIMIT/i;
const HUMAN_TARGET = new Set(['fry_for_eng']);
const PARKED = new Set(['cor_for_eng']);
const courses = process.argv.slice(2);
const readLog = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
const cfile = (c) => path.join(DIR, c, 'changesets', 'c0108-374.changeset.jsonl');
const logOf = (c) => path.join(DIR, c, 'changesets', 'audio-374.jsonl');
const isCartesia = (v) => !v || !/^azure|^eleven|^google|^human|^xai/i.test(String(v));
const ukHour = () => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
const night = () => { const h = ukHour(); return h >= 22 || h < 7; };
const allCourses = () => fs.readdirSync(DIR).filter((c) => fs.existsSync(logOf(c)));
const allRecs = () => allCourses().flatMap((c) => readLog(logOf(c)));

function slotsFor(file) {
  const { ops } = cs.read(file);
  const ledger = landed(`${file}.applied.jsonl`);   // applied, already, or insert-already-exists (see landed.cjs)
  const slots = [];
  ops.forEach((o, i) => {
    if (!ledger.has(i)) return;
    const sides = [];
    if (o.op === 'phrase.insert' || o.op === 'lego.insert') sides.push(['known', o.row.known_text], ['target1', o.row.target_text], ['target2', o.row.target_text]);
    else if (['phrase.update', 'lego.update', 'seed.update'].includes(o.op)) {
      const s = o.set || {}, e = o.expect || {};
      if (s.known_text !== undefined && s.known_text !== e.known_text) sides.push(['known', s.known_text]);
      if (s.target_text !== undefined && s.target_text !== e.target_text) sides.push(['target1', s.target_text], ['target2', s.target_text]);
    } else return;
    let ref;
    if (o.op === 'seed.update') ref = { seedNumber: Number(o.seed_number), id: `S${String(o.seed_number).padStart(4, '0')}` };
    else if (o.op === 'lego.update') ref = { legoId: o.lego_id, id: o.lego_id };
    else if (o.op === 'lego.insert') { const id = `S${String(o.row.seed_number).padStart(4, '0')}L${String(o.row.lego_index).padStart(2, '0')}`; ref = { legoId: id, id }; }
    else { const id = o.op === 'phrase.insert' ? o.row.id : o.phrase_id; ref = { phraseId: id, id }; }
    for (const [role, text] of sides) if (text) slots.push({ ...ref, role, text, key: `${ref.id}|${role}` });
  });
  return slots;
}

function writeSpend(extra = {}) {
  const recs = allRecs().filter((r) => r.ok && isCartesia(r.voiceId));
  const byDay = {};
  for (const r of recs) { const d = String(r.at).slice(0, 10); byDay[d] = (byDay[d] || 0) + (Number(r.charsSpent) || 0); }
  const total = Object.values(byDay).reduce((a, b) => a + b, 0);
  const azure = allRecs().filter((r) => r.ok && !isCartesia(r.voiceId)).reduce((a, r) => a + (Number(r.charsSpent) || 0), 0);
  fs.mkdirSync(path.dirname(SPEND), { recursive: true });
  fs.writeFileSync(SPEND, JSON.stringify({ what: 'cs #374 C0108 audio, Cartesia charsSpent (route answers)', cap: CAP, total, byDay, azure_chars: azure, at: new Date().toISOString(), ...extra }, null, 1));
  return total;
}
const up = async (c) => { for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://localhost:3470/api/production/${c}/edit-ops`); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 5000)); } };

(async () => {
  const queue = [];
  for (const c of courses) {
    if (PARKED.has(c) || !fs.existsSync(cfile(c))) continue;
    const auke = [];
    for (const s of slotsFor(cfile(c))) {
      if (HUMAN_TARGET.has(c) && s.role !== 'known') { auke.push(s); continue; }
      queue.push({ ...s, course: c });
    }
    if (auke.length) fs.writeFileSync(path.join(DIR, c, 'changesets', 'auke-retakes-374.json'), JSON.stringify({ why: 'human-voiced target slots (Auke): re-takes owed, never TTS (cs #374)', slots: auke }, null, 1));
  }
  for (const c of courses) {
    if (PARKED.has(c) || !fs.existsSync(cfile(c))) continue;
    const ifile = path.join(DIR, c, 'changesets', 'intros-374.json');
    if (!fs.existsSync(ifile)) continue;
    const ledger = loadLedger(`${cfile(c)}.applied.jsonl`);
    for (const x of JSON.parse(fs.readFileSync(ifile, 'utf8')).intros) {
      if (!['applied', 'already'].includes(ledger.get(x.needs_op))) continue;
      queue.push({ course: c, legoId: x.lego_id, id: x.lego_id, role: 'presentation', text: x.new_text, key: `${x.lego_id}|presentation`, intro: true });
    }
  }
  const answered = new Set(allRecs().map((r) => `${r.course}|${r.key}`));
  let spent = writeSpend();
  const tally = {}; const bump = (k) => { tally[k] = (tally[k] || 0) + 1; };
  let stop = null;
  for (const s of queue) {
    if (answered.has(`${s.course}|${s.key}`)) { bump('already_answered'); continue; }
    if (!night()) { stop = 'UK night window closed'; break; }
    if (spent + s.text.length > CAP) { stop = `c0108 cap: ${spent} spent + next ${s.text.length} > ${CAP}`; break; }
    const args = [path.join(ROOT, 'tools/audio/render.cjs'), '--course', s.course, '--role', s.role, '--text', s.text, '--purpose', PURPOSE, '--job', '#374'];
    if (s.intro) args.push('--lego', s.legoId);   // the route binds the LEGO's intro itself
    if (process.env.CS_CONV_TOKEN) args.push('--approval', APPROVAL);
    await up(s.course);
    let out; try { out = execFileSync('node', args, { encoding: 'utf8', env: { ...process.env, AGENT_ID: AGENT } }); } catch (e) { out = String(e.stdout || ''); }
    let r; try { r = JSON.parse(out); } catch { r = null; }
    if (r && r.tryLater) r = null; // cs #152: render.cjs's try-later answer (Popty or the surface down past its back-off) is no answer: not logged, sent next run.
    if (!r || !(r.ok || r.code)) { bump('no_answer'); console.log(s.course, s.key, 'NO_ANSWER (not logged; asked again next run):', String(out).slice(0, 200)); continue; }
    const rec = { at: new Date().toISOString(), course: s.course, key: s.key, id: s.id, role: s.role, text: s.text,
      ok: !!r.ok, source: r.source, code: r.code, audioId: r.audioId, voiceId: r.voiceId || r.voice || null, charsSpent: r.charsSpent || 0,
      error: r.error && String(r.error).slice(0, 400) };
    if (r.ok && r.audioId && s.intro) rec.link = { ok: r.legoLinked !== false, code: r.legoLinked ? 'BOUND_BY_ROUTE' : (r.dryRun ? 'DRY' : 'NOT_BOUND') };
    else if (r.ok && r.audioId) {
      await up(s.course);
      const link = { role: s.role, audioId: r.audioId };
      if (s.seedNumber) link.seedNumber = s.seedNumber; else if (s.legoId) link.legoId = s.legoId; else link.phraseId = s.phraseId;
      const lr = await fetch(`http://localhost:3470/api/production/${s.course}/link-clip`, { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify({ links: [link] }) });
      const l = await lr.json().catch(() => ({}));
      const one = (l.results && l.results[0]) || l;
      rec.link = { status: lr.status, ok: !!(l.ok && one.ok !== false), code: one.code || l.code, error: (one.error || l.error) && String(one.error || l.error).slice(0, 300) };
      rec.voiceId = rec.voiceId || one.voiceId || null;
    }
    fs.appendFileSync(logOf(s.course), JSON.stringify(rec) + '\n');
    answered.add(`${s.course}|${s.key}`);
    if (rec.ok && isCartesia(rec.voiceId)) spent += Number(rec.charsSpent) || 0;
    bump((s.intro ? 'intro_' : '') + (r.ok ? (rec.link && rec.link.ok ? `linked_${r.source}` : `link_${rec.link && rec.link.code}`) : `refused_${r.code}`));
    if (!r.ok && STOP_RE.test(`${r.code} ${r.error || ''}`)) { stop = `STOPPED on a spend refusal: ${r.code} ${String(r.error || '').slice(0, 300)}`; break; }
  }
  const left = queue.filter((s) => !answered.has(`${s.course}|${s.key}`)).length;
  spent = writeSpend({ done: left === 0 && !stop, left });
  console.log(`night-audio c0108: ${queue.length} slot(s) ${JSON.stringify(tally)}; Cartesia total ${spent}/${CAP}; ${left} unanswered${stop ? `; ${stop}` : ''}`);
  process.exit(stop && /STOPPED/.test(stop) ? 3 : 0);
})();
