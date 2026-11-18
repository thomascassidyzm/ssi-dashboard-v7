#!/usr/bin/env node
'use strict';
// cs #519·AI — deu_for_eng: the 9 proofreader items Kai passed on 17 Nov (best effort, apply; cap 2,000 TTS chars).
// Talks ONLY to Popty over HTTP (render route + edit-batch). No DB access.
//   node run.cjs audio            dry-run every render below → out/audio-dry.json
//   node run.cjs audio --render   render for real (stops at the 2,000-char cap or the first refusal) → out/audio.json
//   node run.cjs batch <A|B|C>    edit-batch dry run → out/dry-<X>.json ;  add --apply to apply → out/apply-<X>.json
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const C = 'deu_for_eng';
const AGENT = 'cs #519·AI for Kai (deu proofreader items, 17 Nov 2026)';
const PURPOSE = 'deu_for_eng proofreader items passed by Kai 17 Nov 2026 (cs #519·AI)';
const CAP = 2000;
const intro = (k) => `The German for: '${k}', is: <break time="300ms"/> <break time="10ms"/>`;
// Cartesia custom-pronunciation IPA (same form as the swe_for_eng "does" fix Kai picked, shared/pronunciation-overrides.cjs).
const IPA_LIVES = '<<ˈ|l|ɪ|v|z>>';
const IPA_AM = '<<ˈ|æ|m>>';
const IPA_DO = '<<ˈ|d|uː>>';
// Janes: one reading course-wide, the English name /dʒeːns/ (Duden/Wiktionary: Jane [dʒeːn]); German respelling, because
// the German voices read the plain spelling as "Yanes" and a plain re-render reproduced it (proofreader).
const JANES_SAY = 'Dschehns';

// ── RE-RECORDS in place (same course_audio row, new bytes; links do not move; old object kept) ──
// Kai's grant for this job (his standing best-effort ruling + passing these items, 17 Nov). Sent only where the route itself
// names it as the way through: a deu re-take of words already recorded in another course (EXISTS_IN_LANGUAGE), and a
// re-record of an old-voice clip, which moves it onto the course's current cast (approvedCastMove).
const APPROVAL = 'kai:2026-11-17:deu_for_eng proofreader items passed by Kai 17 Nov (cs #519·AI)';
// Items 1 and 3: the live known clips of "lives" (ecfbdba6, fra_for_eng's row) and "am" (e21f6326, eng_for_kor's row) belong
// to OTHER courses, so they cannot be re-recorded from here (WRONG_COURSE) and must not be: other courses play them. So:
// step 1 makes a deu_for_eng row of the words (NEW below, signed), step 2 re-records THAT row in its spoken IPA form
// (RERECORD2, after step 1), step 3 links it to the LEGO + B01 known slots in an edit-batch. The old clips are untouched.
const RERECORD2 = [
  { item: 1, role: 'known', text: 'lives', spoken: IPA_LIVES, slots: 'S0614L04 known + S0614L04B01 known' },
  { item: 3, role: 'known', text: 'am', spoken: IPA_AM, slots: 'S0626L02 known + S0626L02B01 known' },
];
const RERECORD = [
  { item: 9, role: 'presentation', text: "The German for: 'do', as in — 'they want to do it', is: <break time=\"300ms\"/> <break time=\"10ms\"/>",
    id: '9995f630-75e1-4e0e-bdef-c1c4e6a9f094', spoken: `The German for: '${IPA_DO}', as in — 'they want to do it', is: <break time="300ms"/> <break time="10ms"/>`, slots: 'S0646L01 intro' },
];
const JANES = JSON.parse(fs.readFileSync(path.join(__dirname, 'janes-clips.json'), 'utf8'));
for (const j of JANES) RERECORD.push({ item: 6, role: j.role, text: j.text, id: j.id, spoken: j.text.replace(/Janes/g, JANES_SAY), slots: j.slots });

// ── NEW CLIPS for new / changed text (library first) ──
const NEW = [
  // item 2 · S0616L02 "you thought that" = "du das gedacht hast"
  ...['that you thought that|dass du das gedacht hast', 'I know that you thought that|ich weiß, dass du das gedacht hast',
    'she said that you thought that|sie hat gesagt, dass du das gedacht hast', 'because you thought that|weil du das gedacht hast'].map((s) => s.split('|')),
  // item 4 · S0630L01 "can I" = "kann ich"
  ...['can I stay?|kann ich bleiben?', 'can I do it?|kann ich das machen?', 'can I also stay?|kann ich auch bleiben?', 'can I do it today?|kann ich das heute machen?'].map((s) => s.split('|')),
].flatMap(([k, t]) => [{ role: 'known', text: k }, { role: 'target1', text: t }, { role: 'target2', text: t }]);
// item 8 · S0642L01 gracious → dear ; items 1/3 step 1
NEW.push({ role: 'known', text: 'lives' }, { role: 'known', text: 'am' }, { role: 'known', text: 'dear' }, { role: 'presentation', text: intro('dear') });

async function post(url, body, signed) {
  const headers = { 'Content-Type': 'application/json', 'x-agent-id': AGENT, ...(signed ? { 'x-cs-conv': process.env.CS_CONV_TOKEN } : {}) };
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(240000) });
  const txt = await res.text();
  try { return { status: res.status, ...JSON.parse(txt) }; } catch { return { status: res.status, ok: false, error: txt.slice(0, 300) }; }
}
const render = (b, signed) => post('http://localhost:3470/api/audio/render', { courseCode: C, purpose: PURPOSE, job: '#519·AI', ...b, ...(signed ? { approval: APPROVAL } : {}) }, signed);
// signed where the route names Kai's grant as the way: every re-record (cast move / individual) and the known/presentation
// lines that already exist in another course's English.
const SIGN_NEW = new Set(['known|that you thought that', 'known|can I stay?', 'known|can I do it?', 'known|dear', 'known|lives', 'known|am']);

async function audio(real) {
  const file = path.join(OUT, real ? 'audio.json' : 'audio-dry.json');
  const done = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  let spent = Object.values(done).reduce((s, x) => s + (x.charsSpent || 0), 0);
  const jobs = [...RERECORD.map((r) => ({ key: `re|${r.id}`, body: { role: r.role, text: r.text, replaceAudioId: r.id, spokenText: r.spoken }, meta: r, signed: true })),
    ...NEW.map((n) => ({ key: `new|${n.role}|${n.text}`, body: { role: n.role, text: n.text }, meta: n, signed: SIGN_NEW.has(`${n.role}|${n.text}`) }))];
  // step 2 of items 1/3: re-record the deu row step 1 made (only once it exists)
  for (const r of RERECORD2) { const base = done[`new|known|${r.text}`]; if (base && base.ok && base.audioId && !base.dryRun) jobs.push({ key: `re2|${r.text}`, body: { role: r.role, text: r.text, replaceAudioId: base.audioId, spokenText: r.spoken }, meta: { ...r, id: base.audioId }, signed: true }); }
  let would = 0;
  for (const j of jobs) {
    if (real && done[j.key] && done[j.key].ok) continue;
    const a = await render({ ...j.body, dryRun: !real }, j.signed);
    done[j.key] = { ...a, meta: j.meta };
    fs.writeFileSync(file, JSON.stringify(done, null, 1));
    if (!real) { would += a.wouldSpendChars || 0; console.log(j.key.slice(0, 70), a.status, a.ok ? `${a.source} would=${a.wouldSpendChars}` : `${a.code} ${String(a.error).slice(0, 160)}`); continue; }
    spent += a.charsSpent || 0;
    console.log(j.key.slice(0, 70), a.status, a.ok ? `${a.source} ${a.audioId} spent=${a.charsSpent} total=${spent}` : `REFUSED ${a.code} ${String(a.error).slice(0, 200)}`);
    if (!a.ok) { console.log('STOP: a refusal is the answer'); break; }
    if (spent > CAP) { console.log('STOP: over cap'); break; }
  }
  if (!real) console.log('TOTAL would spend', would);
  else console.log('TOTAL spent', spent);
}

async function batch(name, apply) {
  const ops = JSON.parse(fs.readFileSync(path.join(__dirname, `batch-${name}.ops.json`), 'utf8'));
  const r = await post(`http://localhost:3470/api/production/${C}/edit-batch`, { ops, apply: !!apply });
  fs.writeFileSync(path.join(OUT, `${apply ? 'apply' : 'dry'}-${name}.json`), JSON.stringify(r, null, 1));
  console.log(name, apply ? 'APPLY' : 'dry', r.status, r.ok, r.event_id || '', r.error || r.code || '', (r.results || []).map((x) => `${x.op}:${x.changed}${x.error ? ' ' + x.error : ''}`).join(' | '));
}

const [cmd, a1] = process.argv.slice(2);
if (cmd === 'audio') audio(process.argv.includes('--render'));
else if (cmd === 'batch') batch(a1, process.argv.includes('--apply'));
else console.log('usage: audio [--render] | batch <name> [--apply]');
