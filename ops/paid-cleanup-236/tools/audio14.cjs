#!/usr/bin/env node
// cs #236·AL item 14 audio: after the item-14 changeset adds a missing "?"/"؟"/"¿…?", the row KEEPS its old clip (the
// text trigger compares normalised text, and the normaliser strips the mark: canon A5), so a statement-intoned clip
// would stay under a question. Popty routes only (node tools/audio/render.cjs = POST /api/audio/render):
//   · slot with a clip  → RE-RECORD that clip in place (--replace): the chain renders the new take, uploads and HEADs
//     it, THEN moves the row onto it (make-before-break; old object kept). Off-cast clips move onto the course's cast
//     voice under Kai's approval (approvedCastMove). Each clip once, however many rows share it.
//   · silent slot       → render (library first) then POST link-clip FILL-ONLY.
// Only ops the ledger marks "applied" (never "already"/"drift"/"refused"). A refusal is logged and never re-sent.
// ITEM14_NIGHT_CAP (default 25,000) caps Cartesia chars across every item-14 audio log today. No transcription.
//   node audio14.cjs <item14.changeset.jsonl> [--dry]     log: <file>.audio.jsonl (resumable)
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const cs = require('../../../services/shared/changeset.cjs');
const { loadLedger } = require('../../../tools/changeset/apply-changeset.cjs');
const ROOT = path.resolve(__dirname, '../../..');
const [file, ...rest] = process.argv.slice(2);
const DRY = rest.includes('--dry');
const CAP = Number(process.env.ITEM14_NIGHT_CAP || 25000);
const AGENT = process.env.AGENT_ID || 'kai-236-item14';
const APPROVAL = 'kai:2026-11-24:paid-cleanup item 14 question marks, Kai Y 24 Nov (cs #236)';
const PURPOSE = 'cs #236 paid cleanup item 14: the row gained its missing question mark; re-record so the voice asks';
const { header, ops } = cs.read(file);
const course = header.course;
const ledger = loadLedger(`${file}.applied.jsonl`);
const readLog = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
const log = `${file}.audio${DRY ? '.dry' : ''}.jsonl`;
const done = new Set(readLog(log).map((r) => r.key));
const isCartesia = (v) => !v || !/^azure|^eleven|^google|^human|^xai/i.test(String(v));
const today = new Date().toISOString().slice(0, 10);
const itemDir = path.resolve(path.dirname(file), '..');
const spentToday = () => fs.readdirSync(itemDir).flatMap((c) => { const f = path.join(itemDir, c, 'item14.changeset.jsonl.audio.jsonl'); return fs.existsSync(f) ? readLog(f) : []; })
  .filter((r) => r.ok && String(r.at).slice(0, 10) === today && isCartesia(r.voiceId)).reduce((s, r) => s + (Number(r.charsSpent) || 0), 0);
let spent = spentToday();
const render = (args) => {
  let out; try { out = execFileSync('node', [path.join(ROOT, 'tools/audio/render.cjs'), ...args], { encoding: 'utf8', env: { ...process.env, AGENT_ID: AGENT } }); } catch (e) { out = String(e.stdout || ''); }
  try { const r = JSON.parse(out); return r && r.tryLater ? null : r; } catch { return null; }
};
(async () => {
  const tally = {}; const bump = (k) => { tally[k] = (tally[k] || 0) + 1; };
  const seen = new Set();
  for (let i = 0; i < ops.length; i++) {
    const o = ops[i];
    if (o.op !== 'phrase.update' || !(o.rerecord || []).length) continue;
    if (ledger.get(i) !== 'applied') { bump(`skip_${ledger.get(i) || 'pending'}`); continue; }
    const text = Object.values(o.set)[0];
    for (const s of o.rerecord) {
      const key = s.audio_id ? `clip:${s.audio_id}` : `${o.phrase_id}|${s.slot}`;
      if (done.has(key) || seen.has(key)) { bump('already_answered'); continue; }
      seen.add(key);
      if (!DRY && spent + text.length > CAP) { bump('held_night_cap'); continue; }
      const args = ['--course', course, '--role', s.slot, '--text', text, '--purpose', PURPOSE, '--job', '#236'];
      if (s.audio_id) args.push('--replace', s.audio_id);
      if (process.env.CS_CONV_TOKEN) args.push('--approval', APPROVAL);
      if (DRY) args.push('--dry-run');
      const r = render(args);
      if (!r || !(r.ok || r.code)) { bump('no_answer'); continue; }   // Popty down: not logged, asked next run
      const rec = { at: new Date().toISOString(), key, phrase: o.phrase_id, slot: s.slot, replace: s.audio_id, text, dry: DRY, ok: !!r.ok, source: r.source, code: r.code,
        audioId: r.audioId, voiceId: r.voiceId || null, castMoveFrom: r.castMoveFrom || null, charsSpent: r.charsSpent || 0, wouldSpend: r.wouldSpendChars, error: r.error && String(r.error).slice(0, 300) };
      if (!DRY && r.ok && !s.audio_id && r.audioId) {
        const lr = await fetch(`http://localhost:3470/api/production/${course}/link-clip`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT },
          body: JSON.stringify({ links: [{ phraseId: o.phrase_id, role: s.slot, audioId: r.audioId }] }) });
        const l = await lr.json().catch(() => ({})); const one = (l.results && l.results[0]) || l;
        rec.link = { status: lr.status, ok: !!(l.ok && one.ok !== false), code: one.code || l.code };
      }
      if (!DRY && r.ok && isCartesia(rec.voiceId)) spent += Number(r.charsSpent) || 0;
      bump(DRY ? (r.ok ? `dry_${r.source}` : `refused_${r.code}`) : (r.ok ? `${s.audio_id ? 'rerecorded' : 'filled'}_${r.source}` : `refused_${r.code}`));
      fs.appendFileSync(log, JSON.stringify(rec) + '\n');
    }
  }
  console.log(`audio14 ${header.id}${DRY ? ' DRY' : ''}: ${JSON.stringify(tally)}; Cartesia today ${spent}/${CAP}`);
})();
