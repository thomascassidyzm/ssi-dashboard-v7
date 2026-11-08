#!/usr/bin/env node
'use strict';
// READ-ONLY census of the ENGLISH (known-side) voices of Welsh Pod 1, North and South (job #891, after #885's census).
// A line's English must be spoken by a voice of its SPEAKER's gender in that course's own cast (pod-scripts voice.gender,
// the cast map: Aran 2026-10-29 #562, "as long as the flow works in each case"), and every Drill piece's English must be
// the SAME voice as its own whole line (#891 brief). Three surfaces are counted, because the learner hears all three:
//   whole   listening_pod_sentences.known_audio_id                    (GET /api/pod-scripts, live)
//   splits  sentence_known_audio_ids (Listen overlay + pod laps)       (GET /api/pod-scripts known_splits, live)
//   drill   podDrillPieces/<course>.json English piece ids             (ops/pod-drill/served/, the bytes the app serves)
// A Drill piece's voice is read from: ops/pod-drill/spans/known-voice.json (pieces #891 recast, the voice the render
// route answered), else the --voices files (output of tools/audio/clip-voices.cjs over the served ids, the committed
// read-by-id door). A voice this table cannot sex is reported UNKNOWN, never guessed.
//   node tools/pods/pod-drill/pieces/welsh-english-voice-census.cjs --voices <clip-voices.json> [--voices ...] [--out census.json]
const fs = require('fs'), path = require('path');
const { DATA, SERVED } = require('./paths.cjs');

const COURSES = ['cym_n_for_eng', 'cym_s_for_eng'];
// The English voices Welsh Pod 1 uses, by the person or catalogue voice behind them. Popty's audio-reuse-planner labels
// gfzdpspr5fdp "Tom (clone)" (Tom's ruling 2026-08-07); bedd6226 is xAI catalogue "Olivia" (voice-personhood.cjs);
// 62ae83ad is Cartesia "Gemma". Add a voice here before it can be counted.
const VOICE_GENDER = Object.freeze({
  human_aran_eng: 'm',
  gfzdpspr5fdp: 'm',
  bedd6226: 'f',
  '62ae83ad-4f6a-430b-af41-a9bede9286ca': 'f',
});
const canonVoice = (v) => String(v || '').replace(/^(xai|cartesia|azure)_/, '');
const genderOf = (v) => VOICE_GENDER[canonVoice(v)] || null;
const bareId = (id) => String(id || '').replace(/\.v\d+$/, '');

function argList(name) {
  const a = process.argv.slice(2), out = [];
  for (let i = 0; i < a.length; i++) if (a[i] === name && a[i + 1]) out.push(a[++i]);
  return out;
}

/** id → voice, from clip-voices.cjs outputs ({voices:{voice:[{id}]}}) and the #891 recast record. */
function voiceTable(files, recast) {
  const t = new Map();
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const [v, list] of Object.entries(j.voices || {})) for (const c of list) t.set(bareId(c.id), v);
  }
  for (const p of (recast && recast.pieces) || []) t.set(bareId(p.to), p.voice);
  return t;
}

/** Pure: the census of one course from its pod-scripts answer, its served Drill file and a voice table. */
function censusCourse(course, podScripts, drill, voices) {
  const lines = podScripts.scenes.flatMap((s) => s.lines).filter((l) => !l.is_narrator);
  const out = { course, lines: lines.length, whole: { off: [], unknown: [] }, splits: { pieces: 0, off: [], unknown: [] }, drill: { lines: 0, pieces: 0, off: [], unknown: [], notWholeVoice: [] } };
  const byId = new Map(lines.map((l) => [l.id, l]));
  for (const l of lines) {
    const g = l.voice && l.voice.gender, kv = l.audio && l.audio.known && l.audio.known.voice_id;
    const row = { line: l.id.split(':').pop(), speaker: l.speaker, gender: g, voice: kv, text: l.known_text };
    const vg = genderOf(kv);
    if (!g || !vg) out.whole.unknown.push(row); else if (vg !== g) out.whole.off.push(row);
    for (const [i, s] of ((l.audio && l.audio.known_splits) || []).entries()) {
      out.splits.pieces++;
      const sg = genderOf(s.voice_id), r = { ...row, i, piece: s.text, pieceVoice: s.voice_id, id: s.id };
      if (!g || !sg) out.splits.unknown.push(r); else if (sg !== g) out.splits.off.push(r);
    }
  }
  for (const [turn, ps] of Object.entries(drill.turns || {})) {
    const l = byId.get(turn);
    out.drill.lines++;
    const g = l && l.voice && l.voice.gender, kv = l && l.audio && l.audio.known && l.audio.known.voice_id;
    ps.forEach((p, i) => {
      out.drill.pieces++;
      const v = voices.get(bareId(p[3])), vg = genderOf(v);
      const r = { line: turn.split(':').pop(), speaker: l && l.speaker, gender: g, i, piece: p[1], id: p[3], voice: v || null, wholeVoice: kv || null };
      if (!g || !vg) out.drill.unknown.push(r); else if (vg !== g) out.drill.off.push(r);
      if (v && kv && canonVoice(v) !== canonVoice(kv)) out.drill.notWholeVoice.push(r);
    });
  }
  const tally = (rows) => ({ manOnWoman: rows.filter((r) => r.gender === 'f').length, womanOnMan: rows.filter((r) => r.gender === 'm').length });
  out.summary = {
    whole: { ...tally(out.whole.off), unknown: out.whole.unknown.length },
    splits: { pieces: out.splits.pieces, ...tally(out.splits.off), unknown: out.splits.unknown.length },
    drill: { lines: out.drill.lines, pieces: out.drill.pieces, ...tally(out.drill.off), unknown: out.drill.unknown.length, notWholeVoice: out.drill.notWholeVoice.length },
  };
  return out;
}

/** Same English words in North and South Drill, different clip: the take is the same, so the piece should be shared. */
function sharedDrift(drills) {
  const [n, s] = COURSES.map((c) => drills[c].turns || {});
  const out = [];
  for (const [turn, ps] of Object.entries(n)) {
    const other = s[turn.replace('cym_n_for_eng', 'cym_s_for_eng')];
    if (!other) continue;
    ps.forEach((p, i) => { const q = other[i]; if (q && q[1] === p[1] && bareId(q[3]) !== bareId(p[3])) out.push({ line: turn.split(':').pop(), i, piece: p[1], north: p[3], south: q[3] }); });
  }
  return out;
}

async function main() {
  const outFile = argList('--out')[0];
  const recastFile = path.join(DATA, 'spans', 'known-voice.json');
  const recast = fs.existsSync(recastFile) ? JSON.parse(fs.readFileSync(recastFile, 'utf8')) : null;
  const voices = voiceTable(argList('--voices'), recast);
  const res = { when: new Date().toISOString(), courses: {}, drills: {} };
  for (const c of COURSES) {
    const ps = await (await fetch(`http://localhost:3470/api/pod-scripts/${c}`, { signal: AbortSignal.timeout(30000) })).json();
    if (ps.slug !== 'pod-1') throw new Error(`${c}: pod-scripts answered slug ${ps.slug}`);
    res.drills[c] = JSON.parse(fs.readFileSync(path.join(SERVED, `${c}.json`), 'utf8'));
    res.courses[c] = censusCourse(c, ps, res.drills[c], voices);
  }
  res.sharedDrift = sharedDrift(res.drills);
  delete res.drills;
  for (const c of COURSES) console.log(c, JSON.stringify(res.courses[c].summary));
  console.log('North/South same words, different clip:', res.sharedDrift.length);
  if (outFile) fs.writeFileSync(outFile, JSON.stringify(res, null, 1) + '\n');
}

module.exports = { censusCourse, sharedDrift, genderOf, VOICE_GENDER };
if (require.main === module) main().catch((e) => { console.error(String(e && e.stack || e)); process.exit(1); });
