#!/usr/bin/env node
// cs #960: audio for the rows an item-9 changeset ACTUALLY changed on live, run by the night runner after the applier.
// Popty routes only (the same two calls as audio.cjs, #778): node tools/audio/render.cjs (POST /api/audio/render:
// library first, spend guard, ONE render, no retries) then POST /api/production/<course>/link-clip FILL-ONLY (never
// `replace`; the door refuses a slot that is not empty, so a slot someone else filled is never overwritten).
// Slots come from the changeset itself, only for ops its ledger marks "applied" (never "already", "drift" or "refused",
// so nothing is rendered for a row that does not exist): a phrase.insert needs known + target1 + target2; a
// phrase.update / lego.update needs the side(s) whose words changed (the text-change trigger empties those slots).
// A refusal (402, NOT_IN_CHAIN, DAILY_TOTAL_CAP, REPEAT, VOICE_POLICY, EXISTS_IN_LANGUAGE, …) is logged and counted and
// never sent again. Evidence is the audioId per slot. No transcription of any kind.
// Spend: Cartesia (or voice unknown) chars spent tonight across every item-9 audio log; nothing is sent past
// ITEM9_NIGHT_CAP (default 60,000 — Kai's budget is 1M Cartesia/day; item 12 and others keep the rest).
// usage: node night-audio.cjs <file.changeset.jsonl> [--dry]     log: <file>.audio.jsonl (resumable)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../../..');
const [file, ...rest] = process.argv.slice(2);
const DRY = rest.includes('--dry');
const CAP = Number(process.env.ITEM9_NIGHT_CAP || 60000);
const AGENT = process.env.AGENT_ID || 'kai-960-item9';
const APPROVAL = 'kai:2026-11-18:paid-cleanup item 9 untaught-word fixes, Kai approved apply incl. audio 18 Nov 15:41Z (cs #778, #960)';
const PURPOSE = 'cs #960 paid cleanup item 9 (word used before taught): back-fill / re-said row, Kai approved 18 Nov 15:41Z';
const { header, slots } = require('./ledger-state.cjs').slotsFor(file);
const course = header.course;
const readLog = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
const log = `${file}.audio${DRY ? '.dry' : ''}.jsonl`;
const done = new Set(readLog(log).map((r) => r.key));
const isCartesia = (v) => !v || !/^azure|^eleven|^google|^human|^xai/i.test(String(v));
const today = new Date().toISOString().slice(0, 10);
const itemDir = path.resolve(path.dirname(file), '../..');
const tonight = () => fs.readdirSync(itemDir).flatMap((c) => { const d = path.join(itemDir, c, 'changesets'); return fs.existsSync(d) ? fs.readdirSync(d).filter((f) => /\.audio\.jsonl$/.test(f)).map((f) => path.join(d, f)) : []; })
  .flatMap(readLog).filter((r) => r.ok && String(r.at).slice(0, 10) === today && isCartesia(r.voiceId)).reduce((s, r) => s + (Number(r.charsSpent) || 0), 0);
let spent = tonight();
const up = async () => { for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://localhost:3470/api/production/${course}/edit-ops`); if (r.ok) return; } catch {} await new Promise((r) => setTimeout(r, 5000)); } };
(async () => {
  const tally = {};
  const bump = (k) => { tally[k] = (tally[k] || 0) + 1; };
  for (const s of slots) {
    if (done.has(s.key)) { bump('already_answered'); continue; }
    if (!DRY && spent + s.text.length > CAP) { bump('held_night_cap'); continue; }
    const args = [path.join(ROOT, 'tools/audio/render.cjs'), '--course', course, '--role', s.role, '--text', s.text, '--purpose', PURPOSE, '--job', '#960'];
    if (process.env.CS_CONV_TOKEN) args.push('--approval', APPROVAL);
    if (s.legoId) args.push('--lego', s.legoId);
    if (DRY) args.push('--dry-run');
    await up();
    let out; try { out = execFileSync('node', args, { encoding: 'utf8', env: { ...process.env, AGENT_ID: AGENT } }); } catch (e) { out = String(e.stdout || ''); }
    let r; try { r = JSON.parse(out); } catch { r = null; }
    if (!r || !(r.ok || r.code)) { bump('no_answer'); console.log(s.key, 'NO_ANSWER: not logged, sent next run'); continue; }
    const rec = { at: new Date().toISOString(), key: s.key, id: s.id, role: s.role, text: s.text, dry: DRY, ok: !!r.ok, source: r.source, code: r.code,
      audioId: r.audioId, voiceId: r.voiceId || r.voice || null, charsSpent: r.charsSpent || 0, wouldSpend: r.wouldSpendChars, error: r.error && String(r.error).slice(0, 300) };
    if (!DRY && r.ok && r.audioId) {
      await up();
      const lr = await fetch(`http://localhost:3470/api/production/${course}/link-clip`, { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT },
        body: JSON.stringify({ links: [{ ...(s.phraseId ? { phraseId: s.phraseId } : { legoId: s.legoId }), role: s.role, audioId: r.audioId }] }) });
      const l = await lr.json().catch(() => ({}));
      const one = (l.results && l.results[0]) || l;
      rec.link = { status: lr.status, ok: !!(l.ok && one.ok !== false), code: one.code || l.code, error: (one.error || l.error) && String(one.error || l.error).slice(0, 300) };
      rec.voiceId = rec.voiceId || one.voiceId || null;
      if (isCartesia(rec.voiceId)) spent += Number(r.charsSpent) || 0;
    }
    bump(DRY ? (r.ok ? `dry_${r.source}` : `refused_${r.code}`) : (r.ok ? (rec.link && rec.link.ok ? `linked_${r.source}` : `link_failed_${rec.link && rec.link.code}`) : `refused_${r.code}`));
    fs.appendFileSync(log, JSON.stringify(rec) + '\n');
  }
  console.log(`night-audio ${header.id}${DRY ? ' DRY' : ''}: ${slots.length} slot(s) ${JSON.stringify(tally)}; Cartesia tonight ${spent}/${CAP}`);
})();
