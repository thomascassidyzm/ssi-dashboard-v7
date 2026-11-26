#!/usr/bin/env node
// cs #236·AL item 14 audio: after the item-14 changeset adds a missing "?"/"؟"/"¿…?", the row KEEPS its old clip (the
// text trigger compares normalised text, and the normaliser strips the mark: canon A5), so a statement-intoned clip
// would stay under a question. Popty routes only (node tools/audio/render.cjs = POST /api/audio/render). Per clip:
//   · IN PLACE — only when EVERY slot using the clip (all courses, from clip-users.json, built by usage14.cjs on the
//     copy) is an applied item-14 fix row on that side, or already ends in a question mark itself (Kai's Watson,
//     24 Nov: never give question intonation to a non-question row). Re-record (--replace): the chain renders, uploads
//     and HEADs the new take, THEN moves the clip row onto it (make-before-break). Off-cast clips move onto the cast
//     voice under Kai's approval (approvedCastMove).
//   · NEW CLIP — any other user: a plain render of the fixed text (library first). Accepted only if it is a take that
//     is not the old clip and was rendered now (or one this tool rendered earlier tonight, new-takes.jsonl); then
//     link-clip replace:true + expectCurrent=<old clip> on the fix rows of THIS course only; the others keep the old.
//     A library answer that is the old clip or any other pre-existing clip proves nothing about intonation: HELD.
//     (A course holds one clip per voice for the same words, unique_course_audio_per_voice, and "?" does not change
//     the words, so in the cast voice the library always answers: those clips are HELD and listed.)
//   · silent slot — render (library first) then link-clip FILL-ONLY.
// Only ops the ledger marks "applied". A refusal is logged and never re-sent. ITEM14_NIGHT_CAP (default 25,000) caps
// Cartesia chars across every item-14 audio log today. No transcription.
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
// The fix set across every item-14 file: "<phrase id>|<slot>" for applied (or already-there) ops, per side.
const fixSet = new Set();
// ITEM14_EXTRA_DIRS (comma list): further item dirs whose applied fixes also count (item14r follow-up ↔ item14).
const fixDirs = [itemDir, ...String(process.env.ITEM14_EXTRA_DIRS || '').split(',').filter(Boolean).map((d) => path.resolve(d))];
for (const [dirOf, c] of fixDirs.flatMap((d) => fs.readdirSync(d).map((c) => [d, c]))) {
  const f = path.join(dirOf, c, 'item14.changeset.jsonl'); if (!fs.existsSync(f)) continue;
  const led = loadLedger(`${f}.applied.jsonl`);
  cs.read(f).ops.forEach((o, i) => { if (!['applied', 'already'].includes(led.get(i))) return;
    for (const slot of o.side === 'known' ? ['known'] : ['target1', 'target2']) fixSet.add(`${o.phrase_id}|${slot}`); });
}
const usersFile = path.join(path.dirname(file), 'clip-users.json');
const users = fs.existsSync(usersFile) ? JSON.parse(fs.readFileSync(usersFile, 'utf8')) : {};
const takesFile = path.join(itemDir, 'new-takes.jsonl');
const ourTakes = new Set(readLog(takesFile).map((r) => r.audioId));
const link = async (links) => {
  const lr = await fetch(`http://localhost:3470/api/production/${course}/link-clip`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify({ links }) });
  const l = await lr.json().catch(() => ({}));
  return { status: lr.status, results: (l.results || [l]).map((x) => ({ ok: x.ok !== false && lr.ok, code: x.code, id: x.phraseId })) };
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
      let path14 = 'fill';
      let fixRows = [];
      if (s.audio_id) {
        const u = users[s.audio_id];
        if (!u) { bump('held_no_usage_read'); fs.appendFileSync(log, JSON.stringify({ at: new Date().toISOString(), key, phrase: o.phrase_id, slot: s.slot, replace: s.audio_id, path: 'held', ok: false, code: 'NO_USAGE_READ' }) + '\n'); continue; }
        const unsafe = u.filter((x) => !(x.kind === 'phrase' && fixSet.has(`${x.id}|${x.slot}`)) && !x.q);
        fixRows = u.filter((x) => x.kind === 'phrase' && x.course === course && fixSet.has(`${x.id}|${x.slot}`));
        path14 = unsafe.length ? 'new' : 'inplace';
        if (unsafe.length) s.unsafe = unsafe.length;
      }
      const args = ['--course', course, '--role', s.slot, '--text', text, '--purpose', PURPOSE, '--job', '#236'];
      if (path14 === 'inplace') args.push('--replace', s.audio_id);
      if (process.env.CS_CONV_TOKEN) args.push('--approval', APPROVAL);
      if (DRY) args.push('--dry-run');
      const r = render(args);
      if (!r || !(r.ok || r.code)) { bump('no_answer'); seen.delete(key); continue; }   // Popty down: not logged, asked next run
      const rec = { at: new Date().toISOString(), key, phrase: o.phrase_id, slot: s.slot, replace: s.audio_id, path: path14, unsafeUsers: s.unsafe || 0, text, dry: DRY, ok: !!r.ok, source: r.source, code: r.code,
        audioId: r.audioId, voiceId: r.voiceId || null, castMoveFrom: r.castMoveFrom || null, charsSpent: r.charsSpent || 0, wouldSpend: r.wouldSpendChars, error: r.error && String(r.error).slice(0, 300) };
      if (!DRY && r.ok && isCartesia(rec.voiceId)) spent += Number(r.charsSpent) || 0;
      if (!DRY && r.ok && path14 === 'fill' && r.audioId) rec.link = await link([{ phraseId: o.phrase_id, role: s.slot, audioId: r.audioId }]);
      if (path14 === 'new' && r.ok && !DRY) {
        const fresh = r.audioId && r.audioId !== s.audio_id && (r.source === 'rendered' || ourTakes.has(r.audioId));
        if (r.source === 'rendered' && r.audioId) { ourTakes.add(r.audioId); fs.appendFileSync(takesFile, JSON.stringify({ at: rec.at, course, audioId: r.audioId, replaces: s.audio_id, text }) + '\n'); }
        if (!fresh) { rec.ok = false; rec.code = 'HELD_NO_NEW_TAKE'; rec.error = `answer ${r.source} ${r.audioId}: not a new take, old clip kept everywhere`; }
        else if (fixRows.length) rec.link = await link(fixRows.map((x) => ({ phraseId: x.id, role: x.slot, audioId: r.audioId, replace: true, expectCurrent: s.audio_id })));
        else { rec.ok = false; rec.code = 'NO_FIX_ROW_IN_COURSE'; }
      }
      bump(`${path14}_${DRY ? (r.ok ? `dry_${r.source}` : `refused_${r.code}`) : (rec.ok ? r.source : `refused_${rec.code}`)}`);
      fs.appendFileSync(log, JSON.stringify(rec) + '\n');
    }
  }
  console.log(`audio14 ${header.id}${DRY ? ' DRY' : ''}: ${JSON.stringify(tally)}; Cartesia today ${spent}/${CAP}`);
})();
