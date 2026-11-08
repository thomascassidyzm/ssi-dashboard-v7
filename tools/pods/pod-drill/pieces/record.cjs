#!/usr/bin/env node
// Record a plan's pieces through Popty's one audio route, serially, each filed as a POD ROW (job #628).
//   node tools/pods/pod-drill/pieces/record.cjs --dry course [course ...]    count only, spends nothing, writes nothing
//   node tools/pods/pod-drill/pieces/record.cjs --dry --route course [...]   the same, asking the route itself (dryRun:true) per new clip
//   node tools/pods/pod-drill/pieces/record.cjs course [course ...]          record; resumes from ops/pod-drill/recorded.json
// trial:true + podSide (target|known): the route renders a trial and files it at once as a pod-only course_audio row
// (role pod_atom / pod_fine_known, services/shared/pod-audio.cjs), which the audio_autolink trigger never reaches and the
// app plays. The ledger's audioId is that ROW; trialAudioId is the trial object behind it. Never a bare trial id, so
// wire-staging.cjs never has to map a new piece. Older entries name trial_ ids and are mapped by ops/pod-audio-rows/trial-to-row.json.
// speed:1 skips the library so old cut pieces are not taken, on Cartesia voices only (the route refuses it otherwise).
// One clip per voice and text across all courses: an English piece identical in two courses is recorded once.
// Italian's scenes 1-5 are already recorded, in ita/clips.json from #63 and #82, so a turn whose plan pieces are exactly
// those pieces is skipped: never recorded twice. A turn replanned to the master (job #577) is recorded like any other.
// Stops at the first refusal, which is the answer, after 10 hangs of the route, and at MAX_CHARS, which keeps the run inside the plan.
const fs = require('fs'), path = require('path');
const { DATA: dir, planDir } = require('./paths.cjs'), STORE = path.join(dir, 'recorded.json'), MAX_CHARS = Number(process.env.MAX_CHARS || 69000), JOB = process.env.JOB || '#577';
// RUN_MAX_CHARS: this run's own ceiling (job #577: about 27,000 approved by Tom). The run stops at that line and says what is left.
const RUN_MAX = Number(process.env.RUN_MAX_CHARS || 27000), PURPOSE = process.env.PURPOSE || 'pod-1 drill pieces to the one cut master, Tom 2026-11-07 (job #577)';
const FEMALE_EN = 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121', MALE_EN = 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9';
const cast = {};
for (const l of fs.readFileSync(path.join(dir, 'cast.tsv'), 'utf8').split('\n')) {
  const [c, r, v] = l.split('\t'); if (v && v.trim().startsWith('cartesia')) (cast[c] = cast[c] || {})[r] = v.trim().split(/\s/)[0];
}
function voices(course, line) {
  const male = (line.voice || {}).gender === 'm', a = line.audio, eng = course.startsWith('eng_for_');
  const own = (s) => { const v = (a[s] || {}).voice_id || ''; return v.startsWith('cartesia_') ? v : null; };
  const target = own('target') || (eng ? (male ? MALE_EN : FEMALE_EN) : (cast[course] || {})[male ? 'target2' : 'target1']);
  const known = own('known') || (eng ? (cast[course] || {}).known || (a.known || {}).voice_id : (male ? MALE_EN : FEMALE_EN));
  return { target, known, role: male ? 'target2' : 'target1' };
}
const sameItaPieces = (ct, pt) => !!(ct && ct.pieces && pt && pt.pieces && ct.pieces.length === pt.pieces.length && ct.pieces.every((p, i) => p.it && p.en && p.it.text === pt.pieces[i][0] && p.en.text === pt.pieces[i][1]));
const already = (course, plan) => {
  if (course !== 'ita_for_eng') return new Set();
  const ct = new Map(JSON.parse(fs.readFileSync(path.join(dir, 'ita/clips.json'), 'utf8')).turns.map((t) => [t.id, t]));
  return new Set(plan.turns.filter((t) => sameItaPieces(ct.get(t.id), t)).map((t) => t.id));
};
async function wants(course) {
  const plan = JSON.parse(fs.readFileSync(path.join(dir, planDir(course), 'plan.json'), 'utf8')), done = already(course, plan);
  const d = await (await fetch(`http://localhost:3470/api/pod-scripts/${course}`)).json();
  if (d.slug !== 'pod-1') throw new Error(`${course}: slug ${d.slug}`);
  const lines = new Map(); for (const s of d.scenes) for (const l of s.lines) lines.set(l.id.split(':').pop(), l);
  const out = [];
  for (const t of plan.turns) if (t.pieces && !done.has(t.id)) for (const [tg, kn] of t.pieces) {
    const v = voices(course, lines.get(t.id));
    if (!v.target || !v.known) throw new Error(`${course} ${t.id}: no voice`);
    out.push({ course, turn: t.id, side: 'target', role: v.role, voice: v.target, text: tg }, { course, turn: t.id, side: 'known', role: 'known', voice: v.known, text: kn });
  }
  return out;
}
// One render request: trial + podSide files the clip as a pod row. speed:1 on Cartesia keeps old cut pieces out of the library.
const bodyOf = (w, dryRun) => ({ courseCode: w.course, role: w.role, text: w.text, voiceId: w.voice, purpose: PURPOSE, trial: true, podSide: w.side, job: JOB, ...(w.voice.startsWith('cartesia_') ? { speed: 1 } : {}), ...(dryRun ? { dryRun: true } : {}) });
(async () => {
  const args = process.argv.slice(2), dry = args.includes('--dry'), route = args.includes('--route'), courses = args.filter((a) => !a.startsWith('--'));
  const store = fs.existsSync(STORE) ? JSON.parse(fs.readFileSync(STORE, 'utf8')) : { note: 'pod piece clips: audioId is the pod-only course_audio row (older entries: a trial_ id, mapped by ops/pod-audio-rows/trial-to-row.json)', clips: {}, uses: {} };
  let spent = Object.values(store.clips).reduce((n, c) => n + (c.charsSpent || 0), 0), would = 0, made = 0, hangs = 0, runSpent = 0;
  for (const course of courses) {
    const ws = await wants(course);
    store.uses[course] = ws.map((w) => ({ turn: w.turn, side: w.side, key: `${w.voice}|${w.text}` }));
    let fresh = 0, shared = 0, chars = 0, other = 0;
    for (const w of ws) {
      const key = `${w.voice}|${w.text}`;
      if (store.clips[key]) { shared++; continue; }
      if (dry && route) { // the route's own dry answer: voice resolution and spend guard, nothing rendered or filed
        const r = await fetch('http://localhost:3470/api/audio/render', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': `job-${JOB.replace('#', '')}` }, body: JSON.stringify(bodyOf(w, true)), signal: AbortSignal.timeout(60000) });
        const j = await r.json().catch(() => ({ ok: false, error: `status ${r.status}` }));
        if (!j.ok) { console.log(`REFUSED (dry) ${course} ${w.turn} ${w.side}: ${JSON.stringify(j).slice(0, 400)}`); process.exit(3); }
      }
      if (dry) { store.clips[key] = { dry: true }; would += w.text.length; chars += w.text.length; if (!w.voice.startsWith('cartesia_')) other += w.text.length; fresh++; continue; }
      if (spent + w.text.length > MAX_CHARS) throw new Error(`MAX_CHARS ${MAX_CHARS} reached at ${spent}: stopping`);
      if (runSpent + w.text.length > RUN_MAX) throw new Error(`RUN_MAX_CHARS ${RUN_MAX} reached at ${runSpent} this run: stopping, ${course} ${w.turn} and later not recorded`);
      const body = bodyOf(w, false);
      let j = null;
      while (!j) {
        try {
          const r = await fetch('http://localhost:3470/api/audio/render', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': `job-${JOB.replace('#', '')}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
          j = await r.json().catch(() => ({ ok: false, error: `status ${r.status}` }));
        } catch (e) { // A hang is not a refusal: the clip may have billed, so these are counted and bounded.
          hangs++; store.hangs = (store.hangs || []).concat({ at: new Date().toISOString(), course, text: w.text, chars: w.text.length });
          fs.writeFileSync(STORE, JSON.stringify(store, null, 1));
          console.log(`hang ${hangs}: ${course} ${w.turn} ${w.side}: ${e.name}`);
          if (hangs >= 10) throw new Error('10 hangs: stopping');
        }
      }
      if (!j.ok) { fs.writeFileSync(STORE, JSON.stringify(store, null, 1)); console.log(`REFUSED ${course} ${w.turn} ${w.side}: ${JSON.stringify(j).slice(0, 400)}`); process.exit(3); }
      if (!j.trialAudioId || String(j.audioId).startsWith('trial_')) { fs.writeFileSync(STORE, JSON.stringify(store, null, 1)); console.log(`NOT FILED AS A ROW ${course} ${w.turn} ${w.side}: ${JSON.stringify(j).slice(0, 400)}`); process.exit(3); }
      store.clips[key] = { audioId: j.audioId, trialAudioId: j.trialAudioId, podRole: j.podRole, s3Key: j.s3Key, playPath: j.playPath, charsSpent: j.charsSpent, source: j.source, voice: w.voice, course };
      spent += j.charsSpent || 0; runSpent += j.charsSpent || 0; made++; fresh++;
      fs.writeFileSync(STORE, JSON.stringify(store, null, 1));
    }
    if (!dry) fs.writeFileSync(STORE, JSON.stringify(store, null, 1));
    console.log(`${dry ? 'dry ' : ''}${course}: ${ws.length} sides, ${fresh} new, ${shared} shared${dry ? `, ${chars} chars, ${other} not Cartesia` : ''}`);
  }
  console.log(dry ? `would spend ${would} chars` : `spent ${spent} chars in all, ${made} clips this run`);
})().catch((e) => { console.error(String(e)); process.exit(2); });
