#!/usr/bin/env node
// cs #420·AK: audio for the rows an own-LEGO changeset ACTUALLY changed on live (ledger "applied"), run by night-run.sh
// after the applier. Variant of ops/paid-cleanup-item9/tools/night-audio.cjs (same two Popty calls, same slot rule via
// its ledger-state.cjs slotsFor: a phrase.update needs the side(s) whose words changed). Differences:
//   · EXISTS_IN_LANGUAGE (409): the route names the clips already recorded in Italian/Japanese; the FIRST named clip is
//     linked fill-only (Kai 18 Nov: "fill now, mismatch OK" — a voice mismatch beats a silent slot), and the row is
//     listed in the log as linked_existing. Nothing is re-sent to the render route.
//   · Any other refusal (402, DAILY_TOTAL_CAP, REPEAT, NOT_IN_CHAIN, …) is logged and never retried.
//   · Cap: ITA420_CAP (default 10,000) Cartesia chars across this job's own audio logs today (plan ceiling 7,740).
// usage: node night-audio.cjs <file.changeset.jsonl> [--dry]     log: <file>.audio[.dry].jsonl (resumable)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../..');
const [file, ...rest] = process.argv.slice(2);
const DRY = rest.includes('--dry');
const CAP = Number(process.env.ITA420_CAP || 10000);
const AGENT = process.env.AGENT_ID || 'kai-420';
const APPROVAL = 'kai:2026-11-22:ita own-LEGO fixes #942 plan, apply incl. audio commissioned from Kai room (cs #420)';
const PURPOSE = 'cs #420 ita own-LEGO fix (#942 plan): re-worded practice phrase now carries its LEGO; Kai apply 22 Nov';
const { header, slots } = require('../paid-cleanup-item9/tools/ledger-state.cjs').slotsFor(file);
const course = header.course;
const readLog = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
const log = `${file}.audio${DRY ? '.dry' : ''}.jsonl`;
const done = new Set(readLog(log).map((r) => r.key));
const isCartesia = (v) => !v || !/^azure|^eleven|^google|^human|^xai/i.test(String(v));
const today = new Date().toISOString().slice(0, 10);
const tonight = () => ['ita_for_jpn', 'ita_for_eng'].map((c) => path.join(__dirname, c, 'changesets', 'own-lego-420.changeset.jsonl.audio.jsonl'))
  .flatMap(readLog).filter((r) => r.ok && String(r.at).slice(0, 10) === today && isCartesia(r.voiceId)).reduce((s, r) => s + (Number(r.charsSpent) || 0), 0);
let spent = tonight();
const up = async () => { for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://localhost:3470/api/production/${course}/edit-ops`); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 5000)); } };
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
async function link(s, audioId) {
  await up();
  const lr = await fetch(`http://localhost:3470/api/production/${course}/link-clip`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT },
    body: JSON.stringify({ links: [{ phraseId: s.phraseId, role: s.role, audioId }] }) });
  const l = await lr.json().catch(() => ({}));
  const one = (l.results && l.results[0]) || l;
  return { status: lr.status, ok: !!(l.ok && one.ok !== false), code: one.code || l.code, voiceId: one.voiceId || null, error: (one.error || l.error) && String(one.error || l.error).slice(0, 300) };
}
(async () => {
  const tally = {};
  const bump = (k) => { tally[k] = (tally[k] || 0) + 1; };
  for (const s of slots) {
    if (done.has(s.key)) { bump('already_answered'); continue; }
    if (!DRY && spent + s.text.length > CAP) { bump('held_night_cap'); continue; }
    const args = [path.join(ROOT, 'tools/audio/render.cjs'), '--course', course, '--role', s.role, '--text', s.text, '--purpose', PURPOSE, '--job', '#420'];
    if (process.env.CS_CONV_TOKEN) args.push('--approval', APPROVAL);
    if (DRY) args.push('--dry-run');
    await up();
    let out; try { out = execFileSync('node', args, { encoding: 'utf8', env: { ...process.env, AGENT_ID: AGENT } }); } catch (e) { out = String(e.stdout || ''); }
    let r; try { r = JSON.parse(out); } catch { r = null; }
    if (r && r.tryLater) r = null; // cs #152: render.cjs's try-later answer (Popty or the surface down past its back-off) is no answer: not logged, sent next run.
    if (!r || !(r.ok || r.code)) { bump('no_answer'); console.log(s.key, 'NO_ANSWER: not logged, sent next run'); continue; }
    const rec = { at: new Date().toISOString(), key: s.key, id: s.id, role: s.role, text: s.text, dry: DRY, ok: !!r.ok, source: r.source, code: r.code,
      audioId: r.audioId, voiceId: r.voiceId || r.voice || null, charsSpent: r.charsSpent || 0, wouldSpend: r.wouldSpendChars, error: r.error && String(r.error).slice(0, 400) };
    if (!DRY && r.ok && r.audioId) {
      rec.link = await link(s, r.audioId);
      rec.voiceId = rec.voiceId || rec.link.voiceId;
      if (isCartesia(rec.voiceId)) spent += Number(r.charsSpent) || 0;
      bump(rec.link.ok ? `linked_${r.source}` : `link_failed_${rec.link.code}`);
    } else if (!DRY && r.code === 'EXISTS_IN_LANGUAGE') {
      const named = (Array.isArray(r.existing) && r.existing[0] && r.existing[0].audioId) || ((String(r.error || '').match(UUID) || [])[0]);
      if (named) { rec.existingLinked = named; rec.link = await link(s, named); bump(rec.link.ok ? 'linked_existing' : `link_existing_failed_${rec.link.code}`); }
      else bump('refused_EXISTS_IN_LANGUAGE_no_clip_named');
    } else bump(DRY ? (r.ok ? `dry_${r.source}` : `refused_${r.code}`) : `refused_${r.code}`);
    if (DRY && r.ok) rec.wouldSpend = r.wouldSpendChars || 0;
    fs.appendFileSync(log, JSON.stringify(rec) + '\n');
  }
  const would = DRY ? readLog(log).reduce((s, r) => s + (Number(r.wouldSpend) || 0), 0) : null;
  console.log(`night-audio ${header.id}${DRY ? ' DRY' : ''}: ${slots.length} slot(s) ${JSON.stringify(tally)}; Cartesia today ${spent}/${CAP}${DRY ? `; would spend ${would}` : ''}`);
})();
