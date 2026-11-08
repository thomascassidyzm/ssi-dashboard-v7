#!/usr/bin/env node
'use strict';
// WELSH POD 1 ENGLISH FOLLOWS THE CASTING (job #891, Tom 2026-11-08: "do what needs to be done to make it work with
// immeccable logic"; #885's census https://watson-1.tail4968cb.ts.net/d/b7184820). A line's English is spoken by a voice
// of its speaker's gender in the course's own cast, and every English piece of the line — the Drill piece and the
// sentence clip Listen plays — is the SAME voice as the line's whole English, so a line never changes voice mid-turn.
//
// WHAT IT MOVES, read from a census (welsh-english-voice-census.cjs --out): on a WOMAN's line,
//   whole   a man's whole English (Tom's clone)                  → a female take of the line's words
//   splits  a man's sentence clip in sentence_known_audio_ids    → the female piece of that sentence
//   drill   a Drill piece not in the line's (new) whole voice    → the female piece of those words
// One take per words, shared by North and South (the take is the same words; #885 "shared across N and S").
// Men's lines are not touched here: their English is Aran's human take and its cuts (job #570's cutter owns those).
//
// THE VOICE. Women's lines were to go onto the xAI catalogue voice of #878 A (bedd6226, "Olivia") until Catrin's takes
// land. That is physically closed: xAI is retired as a render provider (provider-policy refuses it for every course) and
// the audio route resolves the voice BEFORE it asks the library, so no new bedd6226 clip can be made or library-linked.
// The one female English voice the route renders is Cartesia "Gemma" (62ae83ad), already on two women's lines in each
// Welsh Pod 1. So --voice defaults to Gemma, and a line that moves moves WHOLE AND PIECES together: a line whose whole
// English is Olivia but whose pieces are a man (South SC18-S007, SC21-S014) is re-voiced whole too, because Olivia
// pieces of its words cannot be made. When Catrin's takes land they replace these lines like any synthetic clip.
//
// HOW (only Popty's routes; nothing here reads or writes the database):
//   render   POST /api/audio/render, trial + podSide:'known' → a POD-ONLY course_audio row (pod_fine_known): never an
//            answer for a seed/LEGO/phrase slot, never auto-linked (shared/pod-audio.cjs). One render per unique words.
//   link     POST /api/production/<course>/link-clip: whole = role known, splits = role knownsegment, both
//            replace:true + expectCurrent (the clip read from the census), dry run first, undo written beside it.
//   drill    ops/pod-drill/spans/known-voice.json: the piece-by-piece English recast that wire-staging.cjs applies to the
//            Welsh span pieces (they are otherwise copied unchanged), each entry guarded by the clip it replaces.
// Make-before-break by construction: every new clip exists and answered with its voice before any pointer moves, and
// nothing is deleted.
//   node recast-welsh-english.cjs --census <census.json> --out <dir> [--only SC07-S001,...] [--render] [--link [--apply]]
const fs = require('fs'), path = require('path');
const { DATA } = require('./paths.cjs');

const GEMMA = 'cartesia_62ae83ad-4f6a-430b-af41-a9bede9286ca';
const POPTY = 'http://localhost:3470';
const AGENT = 'cs-891-recast-welsh-english';
const KNOWN_VOICE = path.join(DATA, 'spans', 'known-voice.json');
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const flag = (n) => process.argv.includes(n);
// The words a take says: the pod pause cue "…" is a reading cue, not words (link-clip folds it the same way, job #813).
const takeWords = (t) => String(t || '').replace(/\s*…\s*/g, ' ').replace(/\s+/g, ' ').trim();
const bareId = (id) => String(id || '').replace(/\.v\d+$/, '');

/** Pure: the work list from a census. Lines are keyed course:line; every text that needs a take, once. */
function planFromCensus(census, only = null) {
  const keep = (line) => !only || only.includes(line);
  const lines = new Map(), texts = new Set();
  const lineOf = (course, r) => {
    const k = `${course}:${r.line}`;
    if (!lines.has(k)) lines.set(k, { course, line: r.line, speaker: r.speaker, whole: null, splits: [], drill: [] });
    return lines.get(k);
  };
  for (const [course, c] of Object.entries(census.courses)) {
    for (const r of c.whole.off) if (r.gender === 'f' && keep(r.line)) { lineOf(course, r).whole = { text: r.text, from: null, fromVoice: r.voice }; texts.add(takeWords(r.text)); }
    for (const r of c.splits.off) if (r.gender === 'f' && keep(r.line)) { lineOf(course, r).splits.push({ i: r.i, text: r.piece, from: r.id, fromVoice: r.pieceVoice }); texts.add(takeWords(r.piece)); }
    const drill = [...c.drill.off.filter((r) => r.gender === 'f'), ...c.drill.notWholeVoice.filter((r) => r.gender === 'f')];
    for (const r of drill) {
      if (!keep(r.line)) continue;
      const L = lineOf(course, r);
      if (L.drill.some((d) => d.i === r.i)) continue;
      L.drill.push({ i: r.i, text: r.piece, from: r.id, fromVoice: r.voice });
      texts.add(takeWords(r.piece));
      // A piece cannot be in the whole line's voice unless the whole line is in the new voice too.
      if (!L.whole && r.wholeVoice) { L.whole = { text: null, from: null, fromVoice: r.wholeVoice, followsPieces: true }; }
    }
  }
  return { lines: [...lines.values()], texts: [...texts] };
}

async function postJson(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(120000) });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, ...j };
}

async function podScripts(course) {
  const d = await (await fetch(`${POPTY}/api/pod-scripts/${course}`, { signal: AbortSignal.timeout(30000) })).json();
  if (d.slug !== 'pod-1') throw new Error(`${course}: pod-scripts slug ${d.slug}`);
  return new Map(d.scenes.flatMap((s) => s.lines).map((l) => [l.id.split(':').pop(), l]));
}

async function main() {
  const census = JSON.parse(fs.readFileSync(arg('--census'), 'utf8'));
  const outDir = arg('--out'); fs.mkdirSync(outDir, { recursive: true });
  const voice = arg('--voice', GEMMA);
  const only = arg('--only') ? arg('--only').split(',') : null;
  const plan = planFromCensus(census, only);
  // Fill each line's whole text and current whole clip from the live pod-scripts (the census carries the voice only).
  const live = {};
  for (const L of plan.lines) {
    live[L.course] = live[L.course] || await podScripts(L.course);
    const l = live[L.course].get(L.line);
    if (!l) throw new Error(`${L.course} ${L.line}: not in pod-scripts`);
    L.whole = L.whole || { fromVoice: l.audio.known.voice_id };
    L.whole.text = l.known_text; L.whole.from = l.audio.known.id; L.whole.fromVoice = l.audio.known.voice_id;
    if (l.voice.gender !== 'f') throw new Error(`${L.course} ${L.line}: speaker ${l.speaker} is not cast female — this tool moves women's lines only`);
    plan.texts.includes(takeWords(l.known_text)) || plan.texts.push(takeWords(l.known_text));
  }
  const rendersFile = path.join(outDir, 'renders.json');
  const renders = fs.existsSync(rendersFile) ? JSON.parse(fs.readFileSync(rendersFile, 'utf8')) : { voice, takes: {} };
  if (renders.voice !== voice) throw new Error(`renders.json holds ${renders.voice}, not ${voice}`);
  const missing = plan.texts.filter((t) => !renders.takes[t]);
  console.log(`${plan.lines.length} lines, ${plan.texts.length} unique words, ${missing.length} not yet taken (${missing.reduce((a, t) => a + t.length, 0)} chars)`);
  if (flag('--render')) {
    for (const t of missing) {
      const r = await postJson(`${POPTY}/api/audio/render`, { courseCode: plan.lines.find(() => true).course, role: 'known', text: t, voiceId: voice, trial: true, podSide: 'known', job: '#891', startedBy: 'Tom (job #891 brief)', purpose: '#891 Welsh Pod 1 English: female take for a woman\'s line (whole or piece), shared North/South' });
      if (!r.ok || !r.audioId) { console.error(`REFUSED/FAILED "${t}": ${r.status} ${r.code || ''} ${r.error || ''}`); fs.writeFileSync(rendersFile, JSON.stringify(renders, null, 1) + '\n'); process.exit(2); }
      if (r.voiceId && r.voiceId !== voice) { console.error(`"${t}" came back in ${r.voiceId}, not ${voice}: stopping`); process.exit(2); }
      renders.takes[t] = { audioId: r.audioId, voiceId: r.voiceId || voice, source: r.source, chars: r.charsSpent || 0, s3Key: r.s3Key || null, durationMs: r.durationMs || null };
      console.log(`took "${t}" ${r.audioId} ${r.source} ${r.charsSpent || 0}ch`);
      fs.writeFileSync(rendersFile, JSON.stringify(renders, null, 1) + '\n');
    }
  }
  const take = (t) => renders.takes[takeWords(t)];
  // Link bodies per course, and their undo.
  const links = {}, undo = {};
  for (const L of plan.lines) {
    const add = (lk, back) => { (links[L.course] = links[L.course] || []).push(lk); (undo[L.course] = undo[L.course] || []).push(back); };
    const id = `${L.course}:pod-1:${L.line}`;
    const w = take(L.whole.text);
    if (w && bareId(L.whole.from) !== w.audioId) add({ podSentenceId: id, role: 'known', audioId: w.audioId, replace: true, expectCurrent: bareId(L.whole.from) }, { podSentenceId: id, role: 'known', audioId: bareId(L.whole.from), replace: true, expectCurrent: w.audioId });
    for (const s of L.splits) { const p = take(s.text); if (p) add({ podSentenceId: id, role: 'knownsegment', audioId: p.audioId, replace: true, expectCurrent: bareId(s.from) }, { podSentenceId: id, role: 'knownsegment', audioId: bareId(s.from), replace: true, expectCurrent: p.audioId }); }
  }
  fs.writeFileSync(path.join(outDir, 'plan.json'), JSON.stringify({ voice, lines: plan.lines, links, undo }, null, 1) + '\n');
  // The Drill recast wire-staging applies (one entry per piece; guarded by the clip it replaces and the English words).
  const kv = fs.existsSync(KNOWN_VOICE) ? JSON.parse(fs.readFileSync(KNOWN_VOICE, 'utf8')) : { note: '', pieces: [] };
  kv.note = 'Welsh Pod 1 English Drill pieces re-voiced to follow the course casting (job #891, tools/pods/pod-drill/pieces/recast-welsh-english.cjs). wire-staging.cjs swaps each piece\'s English clip from `from` to `to`, refusing if the piece no longer says `known` or holds neither.';
  for (const L of plan.lines) for (const d of L.drill) {
    const p = take(d.text); if (!p) continue;
    const turn = `${L.course}:pod-1:${L.line}`;
    const e = { turn, i: d.i, known: d.text, from: d.from, to: p.audioId, voice: p.voiceId, fromVoice: d.fromVoice };
    const at = kv.pieces.findIndex((x) => x.turn === turn && x.i === d.i);
    if (at >= 0) kv.pieces[at] = { ...e, from: kv.pieces[at].from }; else kv.pieces.push(e);
  }
  kv.pieces.sort((a, b) => (a.turn < b.turn ? -1 : a.turn > b.turn ? 1 : a.i - b.i));
  if (flag('--render') || flag('--drill')) fs.writeFileSync(KNOWN_VOICE, JSON.stringify(kv, null, 1) + '\n');
  if (flag('--link')) {
    const apply = flag('--apply');
    for (const [course, ls] of Object.entries(links)) {
      const dry = await postJson(`${POPTY}/api/production/${course}/link-clip`, { links: ls, dryRun: true });
      const bad = (dry.results || []).filter((r) => !r.ok);
      console.log(`${course}: dry run ${dry.status} ok=${dry.ok} ${(dry.results || []).length} links, ${bad.length} refused`);
      for (const b of bad) console.log(`  REFUSED ${b.slot} ${b.role} ${b.code}: ${b.error}`);
      if (!apply || !dry.ok || bad.length) { if (!dry.results) console.log(JSON.stringify(dry).slice(0, 600)); continue; }
      fs.writeFileSync(path.join(outDir, `${course}-undo.json`), JSON.stringify({ links: undo[course] }, null, 1) + '\n');
      fs.writeFileSync(path.join(outDir, `${course}-applied.json`), JSON.stringify({ links: ls }, null, 1) + '\n');
      const r = await postJson(`${POPTY}/api/production/${course}/link-clip`, { links: ls });
      fs.writeFileSync(path.join(outDir, `${course}-applied-result.json`), JSON.stringify(r, null, 1) + '\n');
      console.log(`${course}: applied ${r.status} ok=${r.ok} ${(r.results || []).filter((x) => x.changed).length} moved`);
    }
  }
}

module.exports = { planFromCensus, takeWords };
if (require.main === module) main().catch((e) => { console.error(String(e && e.stack || e)); process.exit(1); });
