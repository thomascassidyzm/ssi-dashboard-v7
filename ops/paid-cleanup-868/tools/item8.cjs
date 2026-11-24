#!/usr/bin/env node
// cs #868 L5: paid-cleanup item 8 (voice reading the other gender's form), Kai approved 18 Nov; plan by #877·AK
// (ops/paid-cleanup-868/item8/slots.json, nightly copy). Popty only, ONE route for audio:
//   8A target side (target1 = female seat): RE-RECORD the slot's current clip IN PLACE
//      (render.cjs --replace <current_audio_id>, no spokenText): the route's gender prep speaks the seat's female form and
//      leaves a clip_spoken_text verdict; an off-cast voice is moved onto the cast under Kai's grant (approvedCastMove).
//      Every slot sharing that clip is fixed by the same take. One call per distinct clip.
//   8B known side (two known voices per gender): a NEW clip of the line in the male cast voice (render.cjs with Kai's
//      re-record grant; EXISTS_IN_LANGUAGE in the female voice is what the grant is for), then link-clip
//      replace:true + expectCurrent = the plan's current clip (make-before-break; a slot that moved since is refused, held).
// Load gate before every call; spend refusals stop the run; others are logged per slot and never sent again.
// Evidence = audioId per slot in the ledger (read back from the next nightly copy). No transcription.
//   node item8.cjs <course> --cap <chars> [--evidence ledger,date,pair] [--max N]
// ledger: ops/paid-cleanup-868/item8/ledger-<course>.jsonl (resumable)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../../..');
const DIR = path.resolve(__dirname, '../item8');
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const course = argv[0];
const CAP = Number(opt('--cap', 0));
const MAX = Number(opt('--max', 1e9));
const EVID = new Set(String(opt('--evidence', 'ledger,date,pair')).split(','));
const AGENT = 'kai-868';
const APPROVAL = 'kai:2026-11-23:item 8 gender re-record (voice reads its own form), Kai approved 18 Nov, limbo finish (cs #868)';
const PURPOSE = 'cs #868 paid cleanup item 8: line spoken in the form of its own voice (Kai approved 18 Nov)';
// 8B links only a take in the male cast voice the route resolved on 24 Nov dry runs (cast f5f1c367d / cast-settled.json)
const MALE = { eng_for_pan: 'cartesia_8bacd442-a107-4ec1-b6f1-2fcb3f6f4d56', eng_for_guj: 'cartesia_91925fe5-42ee-4ebe-96c1-c84b12a85a32', eng_for_urd: 'azure_ur-PK-AsadNeural' };
const STOP_RE = /402|CAP|QUOTA|STOP|NOT_IN_CHAIN|BUDGET|LIMIT|APPROVAL_UNVERIFIED/i;
if (!course || !CAP || !process.env.CS_CONV_TOKEN) { console.error('usage: CS_CONV_TOKEN=… item8.cjs <course> --cap N'); process.exit(2); }
const ledger = path.join(DIR, `ledger-${course}.jsonl`);
const readL = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
// + re-asks made by hand after an outage (cs #152: item8/reask-cs152.jsonl), so a resumed run never re-asks a take already linked
const recs = [...readL(ledger), ...fs.readdirSync(DIR).filter((f) => /^reask-.*\.jsonl$/.test(f)).flatMap((f) => readL(path.join(DIR, f))).filter((r) => r.course === course)];
// cs #152: a NO_ANSWER / try-later record (Popty restarting mid-call, 24 Nov 12:31/12:35Z) is no verdict: the take is asked again.
const { isUnansweredRecord, postUntilAnswered } = require('../../../services/shared/popty-try-later.cjs');
const lastRec = new Map(recs.map((r) => [r.key, r]));
const done = new Set([...lastRec].filter(([, r]) => !isUnansweredRecord(r)).map(([k]) => k));
let spent = recs.filter((r) => !isUnansweredRecord(r)).reduce((a, r) => a + (Number(r.charsSpent) || 0), 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function gate() {
  for (let i = 0; i < 60; i++) {
    try { const g = (await (await fetch('http://localhost:3470/health', { signal: AbortSignal.timeout(20000) })).json()).dbLoadGate || {};
      if (g.governed && g.level !== 'red') return true; } catch {}
    await sleep(30000);
  }
  return false;
}
function render(args) {
  let out; try { out = execFileSync('node', [path.join(ROOT, 'tools/audio/render.cjs'), ...args, '--purpose', PURPOSE, '--job', '#868', '--approval', APPROVAL],
    { encoding: 'utf8', env: { ...process.env, AGENT_ID: AGENT } }); } catch (e) { out = String(e.stdout || ''); }
  try { const r = JSON.parse(out); if (r && (r.ok || r.code)) return r; } catch {}
  return { ok: false, code: 'NO_ANSWER', tryLater: true, error: String(out).slice(0, 300) };
}
const slotRef = (s) => (s.target === 'seed' ? { seedNumber: Number(s.id) } : s.target === 'lego' ? { legoId: s.id } : { phraseId: s.id });
(async () => {
  const all = JSON.parse(fs.readFileSync(path.join(DIR, 'slots.json'), 'utf8')).slots.filter((s) => s.course === course && EVID.has(s.evidence));
  const known = all[0] && all[0].role === 'known';
  const groups = new Map();
  for (const s of all) { const k = known ? `text|${s.text}` : `clip|${s.current_audio_id}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(s); }
  const tally = {}; const bump = (k) => { tally[k] = (tally[k] || 0) + 1; };
  let stop = null, n = 0;
  for (const [key, slots] of groups) {
    if (done.has(key)) { bump('already'); continue; }
    if (n >= MAX) { stop = `--max ${MAX}`; break; }
    const s0 = slots[0];
    if (spent + (s0.speak || s0.text).length > CAP) { stop = `cap ${spent}/${CAP}`; break; }
    if (!(await gate())) { stop = 'load gate red 30 min'; break; }
    const r = known ? render(['--course', course, '--role', 'known', '--text', s0.text])
      : render(['--course', course, '--role', s0.role, '--text', s0.text, '--replace', s0.current_audio_id]);
    // cs #152: no answer (Popty down past render.cjs's back-off) -> nothing logged, run stops with exit 1 so item8b-resume.sh
    // waits for /health and resumes from this take.
    if (r.tryLater) { stop = `TRY LATER: ${r.code} ${String(r.error || '').slice(0, 160)}`; bump('try_later'); break; }
    const rec = { at: new Date().toISOString(), key, course, kind: known ? '8B' : '8A', text: s0.text, speak: s0.speak, slots: slots.map((s) => `${s.target}:${s.id}`),
      ok: !!r.ok, source: r.source, code: r.code, audioId: r.audioId, voiceId: r.voiceId || null, spoken: r.spoken || r.renderText || null,
      charsSpent: r.charsSpent || 0, error: r.error && String(r.error).slice(0, 300) };
    if (r.ok && known && r.audioId && r.voiceId && r.voiceId !== MALE[course]) { rec.ok = false; rec.code = 'NOT_MALE_CAST_VOICE'; }
    else if (r.ok && known && r.audioId) {
      rec.links = [];
      for (const s of slots) {
        const link = { ...slotRef(s), role: 'known', audioId: r.audioId, replace: true, expectCurrent: s.current_audio_id };
        const lr = await postUntilAnswered(`http://localhost:3470/api/production/${course}/link-clip`, { headers: { 'x-agent-id': AGENT }, body: { links: [link] } });
        const l = lr.body || {}; const one = (l.results && l.results[0]) || l;
        if (lr.tryLater) { stop = 'TRY LATER: Popty down past the link-clip back-off'; break; }
        rec.links.push({ slot: `${s.target}:${s.id}`, ok: !!(l.ok && one.ok !== false), code: one.code || l.code, error: (one.error || l.error) && String(one.error || l.error).slice(0, 200) });
      }
    }
    if (stop) break; // link never answered: the take is not logged; next run re-asks (a free library hit) and links
    fs.appendFileSync(ledger, JSON.stringify(rec) + '\n'); done.add(key); n++;
    spent += Number(rec.charsSpent) || 0;
    bump(r.ok ? `${r.source}${rec.links ? `_links_ok_${rec.links.filter((x) => x.ok).length}/${rec.links.length}` : ''}` : `refused_${r.code}`);
    console.log(key.slice(0, 60), r.ok ? r.source : r.code, r.charsSpent || 0, r.voiceId || '', rec.links ? rec.links.map((x) => x.ok ? 'ok' : x.code).join(',') : '', '| spent', spent);
    if (!r.ok && STOP_RE.test(`${r.code} ${r.error || ''}`)) { stop = `STOPPED on refusal: ${r.code} ${String(r.error || '').slice(0, 200)}`; break; }
  }
  const left = [...groups.keys()].filter((k) => !done.has(k)).length;
  console.log(`item8 ${course}: ${groups.size} takes (${all.length} slots) ${JSON.stringify(tally)}; spent ${spent}/${CAP}; ${left} left${stop ? `; ${stop}` : ''}`);
  process.exit(stop && /STOPPED/.test(stop) ? 3 : stop && /TRY LATER/.test(stop) ? 1 : 0);
})();
