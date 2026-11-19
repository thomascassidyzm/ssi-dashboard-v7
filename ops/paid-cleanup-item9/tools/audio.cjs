#!/usr/bin/env node
// Audio for the rows an applied item-9 batch emptied (cs #713·AI). Popty routes ONLY, through the official client:
//   1. node tools/audio/render.cjs (POST /api/audio/render: library first → free; else ONE render, no retries)
//   2. POST /api/production/<course>/link-clip, FILL-ONLY (never `replace`): the slot must still be empty.
// usage: node audio.cjs <course> <batch> [--dry] [--only key,key]
// Slots: every LEGO/phrase in <batch>.apply.json whose slot came back empty (the text-change trigger empties the
// side whose words changed), with its words from <batch>.ops.json. Results: <course>/audio/<batch>.jsonl (resumable:
// a slot already answered — linked, or refused — is never sent again; a refusal is the answer).
// EXISTS_IN_LANGUAGE (the words recorded in another voice) is passed with Kai's approval token, which the route verifies
// against this conversation's seat (x-cs-conv): Kai approved item 9 and its audio on 18 Nov, and ruled the same day
// "fill whatever needs filling, doesn't matter if it doesn't match the voice that's already there".
// Spend: running Cartesia total across every item-9 results file; nothing is sent past CAP (70,000, the brief).
// Gendered first person: a FEMALE slot whose words carry a first-person gendered form is never sent from plain text:
// the plan lists it under "female_reading" (gender-prep's female text) and this tool sends that as --spoken.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const L = require('./lib.cjs');
const [course, batch, ...rest] = process.argv.slice(2);
const DRY = rest.includes('--dry');
const only = rest.includes('--only') ? new Set(rest[rest.indexOf('--only') + 1].split(',')) : null;
const CAP = Number(process.env.ITEM9_CAP || 130000); // cs #778: Kai's brief, 18 Nov: hard cap 130,000 Cartesia chars for the apply job
const cdir = path.join(L.ITEM_DIR, course);
const bdir = path.join(cdir, 'batches');
const adir = path.join(cdir, 'audio'); fs.mkdirSync(adir, { recursive: true });
const rd = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const APPROVAL = 'kai:2026-11-18:paid-cleanup item 9 untaught-word fixes, Kai approved apply incl. audio 18 Nov 15:41Z (cs #778)';
const PURPOSE = 'cs #778 paid cleanup item 9 (word used before taught): back-fill / re-said row, Kai approved 18 Nov 15:41Z';
const apply = rd(path.join(bdir, `${batch}.apply.json`));
const ops = rd(path.join(bdir, `${batch}.ops.json`)).ops;
const textOf = new Map();
for (const o of ops) {
  if (o.op === 'phrase.insert') textOf.set(o.row.id, { known: o.row.known_text, target: o.row.target_text });
  if (o.op === 'phrase.update') textOf.set(o.phrase_id, { known: o.set.known_text, target: o.set.target_text });
  if (o.op === 'lego.update') textOf.set(o.lego_id, { known: o.set.known_text ?? o.expect.known_text, target: o.set.target_text ?? o.expect.target_text });
  if (o.op === 'lego.insert') textOf.set(`S${String(o.row.seed_number).padStart(4, '0')}L${String(o.row.lego_index).padStart(2, '0')}`, { known: o.row.known_text, target: o.row.target_text });
}
const slots = [];
for (const a of apply.audio_after || []) {
  const id = a.key.id || a.key.lego_id; const t = textOf.get(id); if (!t) continue;
  const ref = a.key.id ? { phraseId: a.key.id } : { legoId: a.key.lego_id };
  for (const [role, v, text] of [['known', a.k, t.known], ['target1', a.t1, t.target], ['target2', a.t2, t.target]])
    if (!v && text) slots.push({ ...ref, id, role, text, key: `${id}|${role}` });
}
// a LEGO insert has no audio_after row of its own (insert results carry `after` too, but be safe)
for (const o of ops.filter(o => o.op === 'lego.insert')) {
  const id = `S${String(o.row.seed_number).padStart(4, '0')}L${String(o.row.lego_index).padStart(2, '0')}`;
  for (const [role, text] of [['known', o.row.known_text], ['target1', o.row.target_text], ['target2', o.row.target_text]])
    if (!slots.some(s => s.key === `${id}|${role}`)) slots.push({ legoId: id, id, role, text, key: `${id}|${role}` });
}
const female = (() => { const f = path.join(cdir, 'female-readings.json'); return fs.existsSync(f) ? rd(f) : {}; })();
const readLog = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
const allLogs = () => fs.readdirSync(L.ITEM_DIR).filter(c => fs.existsSync(path.join(L.ITEM_DIR, c, 'audio')))
  .flatMap(c => fs.readdirSync(path.join(L.ITEM_DIR, c, 'audio')).filter(f => f.endsWith('.jsonl')).flatMap(f => readLog(path.join(L.ITEM_DIR, c, 'audio', f))));
const isCartesia = (v) => v && !/^azure|^eleven|^google|^human|^xai/i.test(String(v));
let cartesia = allLogs().filter(r => !r.dry && (isCartesia(r.voiceId) || !r.voiceId)).reduce((s, r) => s + (Number(r.charsSpent) || 0), 0);
const upAgain = async () => { for (let i = 0; i < 120; i++) { try { const r = await fetch('http://localhost:3470/api/production/' + course + '/edit-ops'); if (r.ok) return; } catch {} await new Promise(r => setTimeout(r, 5000)); } };
const log = path.join(adir, `${batch}${DRY ? '.dry' : ''}.jsonl`);
const done = new Set(readLog(log).map(r => r.key));
const linkClip = async (s, audioId) => {
  await upAgain();
  const lr = await fetch(`http://localhost:3470/api/production/${course}/link-clip`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-agent-id': 'cs-778-item9' },
    body: JSON.stringify({ links: [{ ...(s.phraseId ? { phraseId: s.phraseId } : { legoId: s.legoId }), role: s.role, audioId }] }) });
  const l = await lr.json().catch(() => ({}));
  const one = (l.results && l.results[0]) || l;
  return { status: lr.status, ok: !!(l.ok && one.ok !== false), code: one.code || l.code, error: (one.error || l.error) && String(one.error || l.error).slice(0, 300) };
};
// --fix: finish what a restart or a DB timeout left half done, never paying twice:
//   a clip that exists but whose link failed (WRITE_FAILED / no link) -> link it again (free);
//   a paid render whose course_audio write failed ("… is in S3 — file it with adoptS3Key") -> adopt that object (free), then link.
if (rest.includes('--fix')) (async () => {
  const latest = new Map(); for (const r of readLog(log)) latest.set(r.key, r);
  for (const r of latest.values()) {
    const s = slots.find(x => x.key === r.key); if (!s) continue;
    if (r.ok && r.audioId && !(r.link && r.link.ok)) {
      const link = await linkClip(s, r.audioId);
      fs.appendFileSync(log, JSON.stringify({ ...r, at: new Date().toISOString(), link, fixed: 'relink' }) + '\n'); console.log(r.key, 'relink', JSON.stringify(link));
    } else if (r.code === 'RENDER_FAILED' && /(mastered\/[0-9A-F-]{36}\.mp3) is in S3/i.test(r.error || '')) {
      const key = r.error.match(/(mastered\/[0-9A-F-]{36}\.mp3)/i)[1];
      await upAgain();
      const body = { courseCode: course, role: s.role, text: s.text, purpose: PURPOSE, job: '#778', approval: APPROVAL, adoptS3Key: key };
      const res = await fetch('http://localhost:3470/api/audio/render', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'cs-778-item9',
        ...require(path.join(L.ROOT, 'services/shared/approval-origin.cjs')).approvalHeaders(body) }, body: JSON.stringify(body) });
      const a = await res.json().catch(() => ({}));
      const rec = { ...r, at: new Date().toISOString(), ok: !!a.ok, source: a.source, code: a.code, audioId: a.audioId, charsSpent: a.charsSpent || 0, error: a.error && String(a.error).slice(0, 300), fixed: 'adopt ' + key };
      if (a.ok && a.audioId) rec.link = await linkClip(s, a.audioId);
      fs.appendFileSync(log, JSON.stringify(rec) + '\n'); console.log(r.key, 'adopt', a.ok, a.code || '', rec.link ? JSON.stringify(rec.link) : '');
    }
  }
})(); else (async () => {
  const tally = {};
  for (const s of slots) {
    if (only && !only.has(s.key)) continue;
    if (done.has(s.key)) { tally.skipped_done = (tally.skipped_done || 0) + 1; continue; }
    if (!DRY && cartesia + s.text.length > CAP) { tally.stopped_cap = (tally.stopped_cap || 0) + 1; continue; }
    const args = [path.join(L.ROOT, 'tools/audio/render.cjs'), '--course', course, '--role', s.role, '--text', s.text,
      '--purpose', PURPOSE, '--job', '#778', '--approval', APPROVAL];
    if (female[s.key]) args.push('--spoken', female[s.key]);
    if (DRY) args.push('--dry-run');
    // Popty restarts every few minutes while other jobs merge to main (auto-deploy). No answer at all is not a refusal:
    // wait for Popty and send the same request again (at most 3 times). Any answer WITH a code is final.
    let r;
    for (let attempt = 0; attempt < 4; attempt++) {
      await upAgain();
      let out; try { out = execFileSync('node', args, { encoding: 'utf8', env: { ...process.env, AGENT_ID: 'cs-778-item9' } }); } catch (e) { out = String(e.stdout || ''); }
      try { r = JSON.parse(out); } catch { r = null; }
      if (r && (r.ok || r.code)) break;
      r = r || { ok: false, code: 'NO_ANSWER', error: 'Popty did not answer (restart)' };
    }
    if (r.code === 'NO_ANSWER') { tally.no_answer = (tally.no_answer || 0) + 1; console.log(s.key, 'NO_ANSWER: not logged, will be sent next run'); continue; }
    const rec = { at: new Date().toISOString(), key: s.key, id: s.id, role: s.role, text: s.text, dry: DRY, ok: !!r.ok, source: r.source, code: r.code,
      audioId: r.audioId, voiceId: r.voiceId || r.voice, charsSpent: r.charsSpent || 0, wouldSpend: r.wouldSpendChars, error: r.error && String(r.error).slice(0, 300) };
    if (!DRY && r.ok && r.audioId) {
      await upAgain();
      const lr = await fetch(`http://localhost:3470/api/production/${course}/link-clip`, { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-agent-id': 'cs-778-item9' },
        body: JSON.stringify({ links: [{ ...(s.phraseId ? { phraseId: s.phraseId } : { legoId: s.legoId }), role: s.role, audioId: r.audioId }] }) });
      const l = await lr.json().catch(() => ({}));
      const one = (l.results && l.results[0]) || l;
      rec.link = { status: lr.status, ok: !!(l.ok && one.ok !== false), code: one.code || l.code, error: (one.error || l.error) && String(one.error || l.error).slice(0, 300) };
      // cs #778: the render answer carries no voice id; link-clip's does. Without it the Cartesia cap never counted.
      rec.voiceId = rec.voiceId || one.voiceId || null;
    }
    // A paid render whose voice we could not learn counts against the cap (never under-count).
    if (!DRY && r.ok && (isCartesia(rec.voiceId) || !rec.voiceId)) cartesia += Number(r.charsSpent) || 0;
    const k = DRY ? (r.ok ? `dry_${r.source}` : `refused_${r.code}`) : (r.ok ? (rec.link && rec.link.ok ? `linked_${r.source}` : `link_failed_${rec.link && rec.link.code}`) : `refused_${r.code}`);
    tally[k] = (tally[k] || 0) + 1;
    fs.appendFileSync(log, JSON.stringify(rec) + '\n');
    console.log(s.key, k, rec.voiceId || '', rec.charsSpent || rec.wouldSpend || '', rec.error ? rec.error.slice(0, 120) : '');
  }
  console.log('DONE', course, batch, DRY ? 'DRY' : '', JSON.stringify(tally), 'cartesia so far', cartesia);
})();
