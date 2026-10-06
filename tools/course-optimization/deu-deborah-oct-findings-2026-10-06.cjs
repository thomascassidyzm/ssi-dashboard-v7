#!/usr/bin/env node
'use strict';
// tools/course-optimization/deu-deborah-oct-findings-2026-10-06.cjs
//
// deu_for_eng — Deborah's October review findings A–E, applied for Kai (job #327, 2026-10-06). Her R numbers are
// course_round_index rounds (the nth new LEGO); they match exactly. F/G/H are investigations only, nothing here.
//
// A  A word used one round before the LEGO that introduces it. Two causes:
//    (1) the seed-sentence rows job #358 added (P26) were parked under an EARLIER LEGO of the same seed whenever the
//        seed's English was contracted ("she's worried" ≠ the LEGO's "is worried"), so the row plays one or more rounds
//        before its own seed's later LEGO introduces a word it says. That is P2 ("never a later sibling") broken by a
//        pass, not by the builder. Deborah found four (S0343 R680, S0358 R707, S0364 R716, S0378 R737); the same
//        mechanism holds for 30 more rows, so all 34 MOVE (same text, same clips) to the latest NEW LEGO of their seed
//        whose German they contain. Rows whose later LEGO is in the sentence only in an inflected or split form
//        (S0195 dem Tisch, S0231 einen Mann, S0288 sehen … fern, S0524 rufe … zurück, S0540 macht … aus) are listed,
//        not moved: under that LEGO they would not contain it (P17), so that is Kai's call.
//    (2) builder rows: S0354L01U03 is an exact two-sided duplicate of S0354L02U06 → deleted (a phrase may go);
//        S0354L01U06 (wirken) and S0371L02U02/U06 (gegangen) move to the LEGO that introduces their word;
//        S0371L02B02 "went to the cinema | ins Kino gegangen" is re-texted to "to go to the cinema | ins Kino gehen"
//        so L02 keeps three BUILDs.
// B  S0356L01 grows on the target side: "they had | hatten" → "they had | sie hatten" (the English already says
//    "they"; LEGO grows on both sides). Its B01 row is the bare LEGO and grows with it; every other phrase under it
//    already says sie … hatten. Intro text is unchanged (it quotes the known side, which did not change).
// C  Four intro clips are xAI hallucinations, not text faults (Whisper on the deployed bytes: S0328L01 "…is 'Why is
//    Vestov ye inspire such a decision?'…", S0335L01 "…is 'fear scot'", S0381L02 "…is 'sophaliae'", S0361L01 "The
//    German for 'Wass'…"). The texts already mirror their LEGOs, so they are re-rendered as NEW clips in the course's
//    cast presentation voice (Cartesia tom_001, Tom 2026-09-10) through the one route, which repoints the LEGO;
//    the old rows are kept (make-before-break). A re-record in the old voice is refused: xAI is retired.
// D  S0381L01 "whether | ob": its bare build "if | ob" would teach "if" = ob outright (the course later teaches
//    "if | wenn", S0413L03) → "whether | ob"; "asked if | ob gefragt" is not German word order → "asked if | gefragt,
//    ob". The intro gains one tiny heads-up (PR1/PR3 shape, quotes the LEGO, names no sister): "…'whether', or for
//    'if' in phrases like 'I asked if she was ready', is:". The other USE rows keep "asked/told/knew if", which is the
//    frame the heads-up names.
// E  "put it": S0382L02 teaches "put it | es hinstellen" (where … put it), S0383L02 "to place | stellen" (put it IN a
//    named place). Four S0383L02 USE rows had English IDENTICAL to S0382L02 rows over a different verb — a ZUT break
//    (same known, two targets). Rule applied: "where … put it" (no destination) → hinstellen; "put it in the garden"
//    → stellen. S0383L02 U02–U05 and B02 now carry the destination; B01 mirrors its LEGO ("to place"); S0383L01B03 no
//    longer says "put it in the garden" over hinstellen; S0382L02B01 mirrors its LEGO ("put it | es hinstellen");
//    S0383L02's intro gains a heads-up: "…'to place', or for 'put' in phrases like 'he wanted to put it in the
//    garden', is:". The two new intro lines are AGENT-worded on Deborah's suggestion and are NOT marked human-authored.
//
// Seeds whose rows change, move or go are unapproved (an edit, not a finding). Audio: moved rows keep their clips;
// re-texted slots and the five intros go through POST :3470/api/audio/render (dry run first; library first).
//
//   node tools/course-optimization/deu-deborah-oct-findings-2026-10-06.cjs            # VERIFY: exit 2 while any defect stands
//   APPLY=1 node tools/course-optimization/deu-deborah-oct-findings-2026-10-06.cjs    # write, then verify
//   AUDIO=1 node tools/course-optimization/deu-deborah-oct-findings-2026-10-06.cjs    # dry-run then render empty slots + intros
//   RELINK=1 …                                                                         # relink S0356L01's unchanged intro (APPLY does it too)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
process.env.INTRO_MIRROR_AT_EXIT = '0'; // deu carries ~1,500 pre-existing strict mismatches; the touched seeds are checked below instead

const COURSE = 'deu_for_eng';
const SWEEP = 'deu-deborah-oct-findings-2026-10-06';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#327';
const AGENT = 'kai-deu-deborah-oct-327';
const RENDER_URL = process.env.RENDER_URL || 'http://localhost:3470/api/audio/render';
const P26_SOURCE = 'deu-italian-rules-apply-2026-10-02';

// Builder-row moves (A2). P26 moves are computed (planP26Moves) so the rule, not a list, decides them.
const MOVES = [
  { from: 'S0354L01U06', to: 'S0354L02', why: "wirken is S0354L02's word (R700); the row sat in R699 (Deborah)" },
  { from: 'S0371L02U02', to: 'S0371L03', why: "gegangen is S0371L03's word (R726); the row sat in R725 (Deborah)" },
  { from: 'S0371L02U06', to: 'S0371L03', why: "gegangen is S0371L03's word (R726); the row sat in R725 (Deborah)" },
];
const DELETES = [
  { id: 'S0354L01U03', known: 'I think it is important not to appear angry', target: 'ich denke, dass es wichtig ist, nicht wütend zu wirken', why: 'exact two-sided duplicate of S0354L02U06, and uses wirken a round early (Deborah R699)' },
];
const EDITS = [
  { id: 'S0371L02B02', before: ['went to the cinema', 'ins Kino gegangen'], after: ['to go to the cinema', 'ins Kino gehen'], cls: 'A', why: 'gegangen is introduced at R726 (Deborah R725)' },
  { id: 'S0356L01B01', before: ['they had', 'hatten'], after: ['they had', 'sie hatten'], cls: 'B', why: 'the bare-LEGO build grows with its LEGO' },
  { id: 'S0381L01B01', before: ['if', 'ob'], after: ['whether', 'ob'], cls: 'D', why: 'bare "if" = ob would clash with "if | wenn" (S0413L03); the build mirrors its LEGO' },
  { id: 'S0381L01B02', before: ['asked if', 'ob gefragt'], after: ['asked if', 'gefragt, ob'], cls: 'D', why: '"ob gefragt" is not German word order' },
  { id: 'S0382L02B01', before: ['to place somewhere', 'hinstellen'], after: ['put it', 'es hinstellen'], cls: 'E', why: 'build mirrors its LEGO; "to place" belongs to S0383L02 (stellen)' },
  { id: 'S0383L01B03', before: ['he wanted to put it in the garden', 'er wollte es in den Garten hinstellen'], after: ['she was in the garden', 'sie war im Garten'], cls: 'E', why: '"put it in the garden" is the stellen frame (seed 383 itself), not hinstellen' },
  { id: 'S0383L02B01', before: ['to put', 'stellen'], after: ['to place', 'stellen'], cls: 'E', why: 'build mirrors its LEGO; "to put" is stecken (S0053L02)' },
  { id: 'S0383L02B02', before: ['wanted to put it', 'es stellen wollte'], after: ['wanted to put it in the garden', 'es in den Garten stellen wollte'], cls: 'E', why: 'bare "put it" is hinstellen (S0382L02); stellen carries its destination' },
  { id: 'S0383L02U02', before: ['nobody told me where she wanted to put it', 'niemand hat mir gesagt, wo sie es stellen wollte'], after: ['nobody told me that she wanted to put it in the garden', 'niemand hat mir gesagt, dass sie es in den Garten stellen wollte'], cls: 'E', why: 'same English as S0382L02U02 over a different verb (ZUT)' },
  { id: 'S0383L02U03', before: ['I have asked where she wanted to put it', 'ich habe gefragt, wo sie es stellen wollte'], after: ['I have asked if she wanted to put it in the garden', 'ich habe gefragt, ob sie es in den Garten stellen wollte'], cls: 'E', why: 'same English as S0382L02U03 over a different verb (ZUT)' },
  { id: 'S0383L02U04', before: ['I knew where she wanted to put it', 'ich wusste, wo sie es stellen wollte'], after: ['I knew that she wanted to put it in the garden', 'ich wusste, dass sie es in den Garten stellen wollte'], cls: 'E', why: 'same English as S0382L02U04 over a different verb (ZUT)' },
  { id: 'S0383L02U05', before: ['I thought she did not know where to put it', 'ich fand, dass sie nicht wusste, wo sie es stellen wollte'], after: ['I thought she did not want to put it in the garden', 'ich fand, dass sie es nicht in den Garten stellen wollte'], cls: 'E', why: 'same English as S0382L02U05 over a different verb (ZUT)' },
];
const LEGO_EDITS = [
  // keepIntro: the LEGO-text trigger empties presentation_audio_id; the intro quotes the KNOWN side, which did not change,
  // and Whisper hears this clip say its line — so the same clip is relinked (free), not re-rendered.
  { lego: 'S0356L01', before: ['they had', 'hatten'], after: ['they had', 'sie hatten'], cls: 'B', keepIntro: 'a52c43ca-5099-46cf-916d-0afbee0c83a4', why: "Deborah R703: the English says 'they', so the German grows to 'sie hatten' (a LEGO grows on both sides)" },
];
// C/D/E intros. `text` is the line the clip must say; `was` is what the linked clip says today.
const INTROS = [
  { lego: 'S0328L01', cls: 'C', text: "The German for: 'ought to', as in — 'yes I think she ought to', is:", heard: '…is "Why is Vestov ye inspire such a decision?" is "Recher estate fuel Vyres contacts thee the other times."' },
  { lego: 'S0335L01', cls: 'C', text: "The German for: 'to add', as in — 'I think she ought to add something', is:", heard: '…is "fear scot".' },
  { lego: 'S0381L02', cls: 'C', text: "The German for: 'to follow', is:", heard: 'The German for "to follow" is "sophaliae".' },
  { lego: 'S0361L01', cls: 'C', text: "The German for: 'was', as in — 'I think she was ready', is:", heard: 'The German for "Wass" as in…' },
  { lego: 'S0381L01', cls: 'D', text: "The German for 'whether', or for 'if' in phrases like 'I asked if she was ready', is:", was: "The German for: 'whether', is:" },
  { lego: 'S0383L02', cls: 'E', text: "The German for 'to place', or for 'put' in phrases like 'he wanted to put it in the garden', is:", was: "The German for: 'to place', is:" },
];
// P26 rows whose later sibling sits in the sentence only inflected or split — listed for Kai, never moved here.
const P26_HELD = ['S0195L01U09', 'S0231L01U07', 'S0288L01U09', 'S0524L04U08', 'S0540L03U08'];

// ── pure helpers (the test exercises these) ──────────────────────────────────────────
const words = (s) => String(s || '').toLowerCase().split(/[^\p{L}\p{M}ß']+/u).filter(Boolean);
/** word-multiset containment — the live gate's "phrase contains its LEGO" rule */
function containsWords(hay, needle) {
  const h = words(hay), bag = new Map();
  for (const w of h) bag.set(w, (bag.get(w) || 0) + 1);
  for (const w of words(needle)) { const n = bag.get(w) || 0; if (!n) return false; bag.set(w, n - 1); }
  return words(needle).length > 0;
}
const legoOf = (id) => id.slice(0, 8);
const seedOf = (id) => Number(id.slice(1, 5));
const idxOf = (id) => Number(id.slice(6, 8));
/** A #358 seed-sentence row that contains a LATER new LEGO of its own seed moves to the latest such LEGO. */
function planP26Moves(p26Rows, legos) {
  const out = [];
  for (const p of p26Rows) {
    if (P26_HELD.includes(p.id)) continue;
    const later = legos.filter((l) => l.seed_number === seedOf(p.id) && l.lego_index > idxOf(p.id) && l.is_new && containsWords(p.target_text, l.target_text));
    if (!later.length) continue;
    const to = later.sort((a, b) => b.lego_index - a.lego_index)[0];
    out.push({ from: p.id, to: to.lego_id, why: `P26 seed-sentence row (job #358) contains ${to.lego_id} "${to.target_text}", a later LEGO of its own seed`, p26: true });
  }
  return out;
}
/** next phrase id in a basket that no live row holds and no edit event ever named (a deleted id is never re-issued) */
function nextFreeId(lego, role, liveIds, everUsed) {
  const L = role === 'build' ? 'B' : 'U';
  for (let n = 1; n < 100; n++) { const id = `${lego}${L}${String(n).padStart(2, '0')}`; if (!liveIds.has(id) && !everUsed.has(id)) return id; }
  throw new Error(`no free id in ${lego}`);
}

// ── DB ──────────────────────────────────────────────────────────────────────────────
async function load(pg) {
  const { rows: legos } = await pg.query(`SELECT l.lego_id, l.seed_number, l.lego_index, l.is_new, l.known_text, l.target_text, l.presentation_audio_id, l.target1_audio_id, l.target2_audio_id, r.round_index FROM course_legos l LEFT JOIN course_round_index r ON r.course_code=l.course_code AND r.lego_id=l.lego_id WHERE l.course_code=$1`, [COURSE]);
  const { rows: phrases } = await pg.query(`SELECT * FROM course_practice_phrases WHERE course_code=$1`, [COURSE]);
  for (const p of phrases) p.sid = p.id.slice(COURSE.length + 1);
  return { legos, phrases, byId: new Map(phrases.map((p) => [p.sid, p])), legoById: new Map(legos.map((l) => [l.lego_id, l])) };
}

/** VERIFY — every defect this job fixes, read from the live DB. Non-empty = not fixed. */
async function verify(pg, db) {
  const out = [];
  // A: Deborah's six rounds — no phrase under the earlier LEGO says the later LEGO's word
  const early = [['S0343L01', 'Sorgen'], ['S0354L01', 'wirken'], ['S0358L02', 'erreichen'], ['S0364L02', 'mochte'], ['S0371L02', 'gegangen'], ['S0378L02', 'Urlaub']];
  for (const [lego, w] of early) for (const p of db.phrases) if (legoOf(p.sid) === lego && p.phrase_role !== 'component' && words(p.target_text).includes(w.toLowerCase())) out.push(`A ${p.sid} still uses "${w}" before its LEGO: ${p.target_text}`);
  // A knock-on: no #358 seed-sentence row contains a later new LEGO of its own seed
  for (const m of planP26Moves(db.phrases.filter((p) => p.metadata?.source === P26_SOURCE && p.phrase_role === 'use').map((p) => ({ id: p.sid, target_text: p.target_text })), db.legos)) out.push(`A' ${m.from} → should sit under ${m.to}`);
  // B
  const b = db.legoById.get('S0356L01'); if (b.target_text !== 'sie hatten') out.push(`B S0356L01 target is "${b.target_text}"`);
  // D/E: rows hold their AFTER text
  for (const e of EDITS) { const p = db.byId.get(e.id); if (!p || p.known_text !== e.after[0] || p.target_text !== e.after[1]) out.push(`${e.cls} ${e.id} does not hold its AFTER text`); }
  for (const d of DELETES) if (db.byId.has(d.id)) out.push(`A ${d.id} (duplicate) still present`);
  // E: no English stands over both hinstellen and stellen
  const byKnown = new Map();
  for (const p of db.phrases) if (p.phrase_role !== 'component' && /\b(hin)?stellen\b/i.test(p.target_text) && /\bput\b/i.test(p.known_text)) { const k = p.known_text.toLowerCase().trim(); (byKnown.get(k) || byKnown.set(k, new Set()).get(k)).add(/hinstellen/i.test(p.target_text) ? 'hinstellen' : 'stellen'); }
  for (const [k, s] of byKnown) if (s.size > 1) out.push(`E ZUT "${k}" → ${[...s].join(' / ')}`);
  for (const l of LEGO_EDITS) if (l.keepIntro && db.legoById.get(l.lego).presentation_audio_id !== l.keepIntro) out.push(`${l.cls} ${l.lego} intro not linked to ${l.keepIntro}`);
  // C/D/E intros: the linked clip says the line, and is not one of the hallucinated xAI clips
  const { rows: intro } = await pg.query(`SELECT l.lego_id, a.text, a.voice_id FROM course_legos l LEFT JOIN course_audio a ON a.id::text=l.presentation_audio_id WHERE l.course_code=$1 AND l.lego_id = ANY($2)`, [COURSE, INTROS.map((i) => i.lego)]);
  for (const i of INTROS) { const r = intro.find((x) => x.lego_id === i.lego); if (!r || r.text !== i.text || /^xai_|^eve$/.test(r.voice_id || '')) out.push(`${i.cls} intro ${i.lego} links "${r && r.text}" (${r && r.voice_id})`); }
  return out;
}

async function everUsedIds(pg) {
  const { rows } = await pg.query(`SELECT scope, detail FROM content_edit_events WHERE course_code=$1`, [COURSE]);
  const s = new Set(); const re = /S\d{4}L\d{2}[BU]\d{2}/g;
  for (const r of rows) for (const m of JSON.stringify([r.scope, r.detail]).match(re) || []) s.add(m);
  return s;
}

async function apply(pg, db) {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const p26 = planP26Moves(db.phrases.filter((p) => p.metadata?.source === P26_SOURCE && p.phrase_role === 'use').map((p) => ({ id: p.sid, target_text: p.target_text })), db.legos);
  const moves = [...MOVES, ...p26];
  const used = await everUsedIds(pg); const live = new Set(db.phrases.map((p) => p.sid));
  for (const m of moves) {
    const src = db.byId.get(m.from); if (!src) throw new Error(`${m.from} missing`);
    m.toId = nextFreeId(m.to, src.phrase_role, live, used); live.add(m.toId); used.add(m.toId);
    m.position = Math.max(0, ...db.phrases.filter((p) => legoOf(p.sid) === m.to).map((p) => p.position), ...moves.filter((x) => x.to === m.to && x.position).map((x) => x.position)) + 1;
    m.row = src;
  }
  for (const e of EDITS) { const p = db.byId.get(e.id); if (!p || p.known_text !== e.before[0] || p.target_text !== e.before[1]) throw new Error(`${e.id} does not hold its BEFORE text`); }
  for (const d of DELETES) { const p = db.byId.get(d.id); if (!p || p.known_text !== d.known || p.target_text !== d.target) throw new Error(`${d.id} does not hold the expected text`); }
  for (const l of LEGO_EDITS) { const r = db.legoById.get(l.lego); if (r.known_text !== l.before[0] || r.target_text !== l.before[1]) throw new Error(`${l.lego} does not hold its BEFORE text`); }
  // ZUT guard: an AFTER English must not already stand over a different German (excluding rows this pass rewrites)
  const rewriting = new Set([...EDITS.map((e) => e.id), ...DELETES.map((d) => d.id)]);
  for (const e of EDITS) for (const p of db.phrases) if (!rewriting.has(p.sid) && p.phrase_role !== 'component' && p.known_text.toLowerCase().trim() === e.after[0].toLowerCase() && p.target_text.toLowerCase().replace(/[?.!]/g, '').trim() !== e.after[1].toLowerCase()) throw new Error(`ZUT: "${e.after[0]}" already stands over "${p.target_text}" (${p.sid})`);

  const seeds = [...new Set([...moves.flatMap((m) => [seedOf(m.from)]), ...EDITS.map((e) => seedOf(e.id)), ...DELETES.map((d) => seedOf(d.id)), ...LEGO_EDITS.map((l) => seedOf(l.lego))])].sort((a, b) => a - b);
  const { rows: approved } = await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2) AND approved_at IS NOT NULL', [COURSE, seeds]);
  const ev = {};
  ev.lego = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-edit', scope: { seed_numbers: LEGO_EDITS.map((l) => seedOf(l.lego)), lego_ids: LEGO_EDITS.map((l) => l.lego), rows: LEGO_EDITS.length }, detail: { job: JOB, edits: LEGO_EDITS } });
  ev.edit = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit', scope: { seed_numbers: [...new Set(EDITS.map((e) => seedOf(e.id)))], phrase_ids: EDITS.map((e) => `${COURSE}:${e.id}`), rows: EDITS.length }, detail: { job: JOB, edits: EDITS } });
  ev.move = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-move', scope: { seed_numbers: [...new Set(moves.map((m) => seedOf(m.from)))], phrase_ids: moves.flatMap((m) => [`${COURSE}:${m.from}`, `${COURSE}:${m.toId}`]), rows: moves.length }, detail: { job: JOB, moves: moves.map((m) => ({ from: m.from, to: m.toId, why: m.why, known: m.row.known_text, target: m.row.target_text, audio: { known: m.row.known_audio_id, target1: m.row.target1_audio_id, target2: m.row.target2_audio_id } })) } });
  ev.del = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-delete', scope: { seed_numbers: DELETES.map((d) => seedOf(d.id)), phrase_ids: DELETES.map((d) => `${COURSE}:${d.id}`), rows: DELETES.length }, detail: { job: JOB, deleted: DELETES.map((d) => ({ ...d, audio: (({ known_audio_id, target1_audio_id, target2_audio_id }) => ({ known_audio_id, target1_audio_id, target2_audio_id }))(db.byId.get(d.id)) })) } });
  ev.unapprove = approved.length ? await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: approved.map((a) => a.seed_number), rows: approved.length }, detail: { job: JOB, why: "rows re-texted, moved or deleted for Deborah's October findings; they arrive unchecked", approved_at_before: approved } }) : null;

  await pg.query('BEGIN');
  try {
    for (const l of LEGO_EDITS) {
      const u = await pg.query('UPDATE course_legos SET target_text=$1, last_edit_event_id=$2, updated_at=now() WHERE course_code=$3 AND lego_id=$4 AND target_text=$5', [l.after[1], ev.lego, COURSE, l.lego, l.before[1]]);
      if (u.rowCount !== 1) throw new Error(`${l.lego}: lego update ${u.rowCount}`);
    }
    for (const e of EDITS) {
      const [k, t] = e.after;
      const u = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=$4, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$5, updated_at=now() WHERE course_code=$6 AND id=$7 AND known_text=$8 AND target_text=$9`,
        [k, t, t.length, t.split(/\s+/).length, ev.edit, COURSE, `${COURSE}:${e.id}`, e.before[0], e.before[1]]);
      if (u.rowCount !== 1) throw new Error(`${e.id}: update ${u.rowCount}`);
    }
    for (const m of moves) {
      const r = m.row, to = db.legoById.get(m.to);
      const ins = await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, difficulty, register, metadata, status, release_batch, target_syllable_count, phrase_role, connected_lego_ids, lego_position, known_audio_id, target1_audio_id, target2_audio_id, target1_duration_ms, target2_duration_ms, lego_id, target_text_roman, introduce, last_edit_event_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)`,
        [`${COURSE}:${m.toId}`, COURSE, to.seed_number, to.lego_index, m.position, r.known_text, r.target_text, r.word_count, r.lego_count, r.difficulty, r.register, JSON.stringify({ ...(r.metadata || {}), moved_from: m.from, moved_by: `${SWEEP} ${JOB}`, move_why: m.why }), r.status, r.release_batch, r.target_syllable_count, r.phrase_role, r.connected_lego_ids, null, r.known_audio_id, r.target1_audio_id, r.target2_audio_id, r.target1_duration_ms, r.target2_duration_ms, m.to, r.target_text_roman, r.introduce, ev.move]);
      if (ins.rowCount !== 1) throw new Error(`${m.toId}: insert`);
      const del = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [COURSE, `${COURSE}:${m.from}`, r.known_text, r.target_text]);
      if (del.rowCount !== 1) throw new Error(`${m.from}: delete ${del.rowCount}`);
    }
    for (const d of DELETES) {
      const del = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [COURSE, `${COURSE}:${d.id}`, d.known, d.target]);
      if (del.rowCount !== 1) throw new Error(`${d.id}: delete ${del.rowCount}`);
    }
    if (approved.length) await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3) AND approved_at IS NOT NULL', [ev.unapprove, COURSE, approved.map((a) => a.seed_number)]);
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  await require('../../services/shared/round-index-refresh.cjs').refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: Deborah October findings — ${EDITS.length} phrases + 1 LEGO re-texted, ${INTROS.length} intros`, metadata: { job: JOB }, append: true, metadataKey: SWEEP });
  return { moves: moves.map((m) => `${m.from} → ${m.toId}${m.p26 ? ' (P26)' : ''}`), unapproved: approved.map((a) => a.seed_number), events: ev, seeds };
}

/** Relink the unchanged intro the LEGO-text trigger emptied (idempotent: only an empty slot is filled). */
async function relinkIntros(pg) {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const todo = [];
  for (const l of LEGO_EDITS.filter((x) => x.keepIntro)) {
    const { rows: [r] } = await pg.query('SELECT presentation_audio_id FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, l.lego]);
    if (!r.presentation_audio_id) todo.push(l);
  }
  if (!todo.length) return [];
  const ev = await recordContentEdit(supabase, { identity: serviceIdentity(SWEEP, { role: 'content-sweep' }), courseCode: COURSE, surface: SURFACE, operation: 'presentation-relink', scope: { seed_numbers: todo.map((l) => seedOf(l.lego)), lego_ids: todo.map((l) => l.lego), rows: todo.length }, detail: { job: JOB, relinked: todo.map((l) => ({ lego: l.lego, audio: l.keepIntro, why: 'intro quotes the unchanged known side; emptied by the LEGO-text trigger' })) } });
  for (const l of todo) {
    const u = await pg.query('UPDATE course_legos SET presentation_audio_id=$1, last_edit_event_id=$2 WHERE course_code=$3 AND lego_id=$4 AND presentation_audio_id IS NULL', [l.keepIntro, ev, COURSE, l.lego]);
    if (u.rowCount !== 1) throw new Error(`${l.lego}: relink ${u.rowCount}`);
  }
  return todo.map((l) => `${l.lego} intro → ${l.keepIntro}`);
}

async function render(body) {
  const res = await fetch(RENDER_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify({ courseCode: COURSE, purpose: `kai ${JOB}: Deborah October findings`, job: JOB, ...body }) });
  return res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
}

/** Empty slots on the rows this job re-texted (+ the grown LEGO) and the six intros: dry run, then (DRY=0) render. */
async function audio(pg, { dry }) {
  const log = [];
  const ids = EDITS.map((e) => `${COURSE}:${e.id}`);
  const { rows } = await pg.query('SELECT id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)', [COURSE, ids]);
  const { rows: lg } = await pg.query('SELECT lego_id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)', [COURSE, LEGO_EDITS.map((l) => l.lego)]);
  const slots = [];
  for (const r of rows) for (const [role, col, text] of [['known', 'known_audio_id', r.known_text], ['target1', 'target1_audio_id', r.target_text], ['target2', 'target2_audio_id', r.target_text]]) if (!r[col]) slots.push({ table: 'course_practice_phrases', key: 'id', keyVal: r.id, role, col, text, textCol: role === 'known' ? 'known_text' : 'target_text' });
  for (const r of lg) for (const [role, col, text] of [['known', 'known_audio_id', r.known_text], ['target1', 'target1_audio_id', r.target_text], ['target2', 'target2_audio_id', r.target_text]]) if (!r[col]) slots.push({ table: 'course_legos', key: 'lego_id', keyVal: r.lego_id, role, col, text, textCol: role === 'known' ? 'known_text' : 'target_text' });
  for (const s of slots) {
    const out = await render({ role: s.role, text: s.text, dryRun: dry, ...(s.table === 'course_legos' ? { legoId: s.keyVal } : {}) });
    let linked = null;
    if (!dry && out.ok && out.audioId) {
      const u = await pg.query(`UPDATE ${s.table} SET ${s.col}=$1 WHERE course_code=$2 AND ${s.key}=$3 AND ${s.col} IS NULL AND ${s.textCol}=$4`, [out.audioId, COURSE, s.keyVal, s.text]);
      linked = u.rowCount === 1 ? 'linked' : 'slot already filled (autolink)';
    }
    log.push({ slot: `${s.keyVal} ${s.role}`, text: s.text, source: out.source, chars: out.wouldSpendChars || out.charsSpent || 0, audioId: out.audioId || null, linked, error: out.ok ? undefined : (out.code || out.error) });
  }
  for (const i of INTROS) {
    const out = await render({ role: 'presentation', text: i.text, legoId: i.lego, dryRun: dry });
    log.push({ slot: `${i.lego} presentation`, text: i.text, source: out.source, chars: out.wouldSpendChars || out.charsSpent || 0, audioId: out.audioId || null, legoLinked: out.legoLinked, error: out.ok ? undefined : (out.code || out.error) });
  }
  return log;
}

async function main() {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  try {
    let db = await load(pg);
    if (process.env.APPLY === '1') {
      const res = await apply(pg, db);
      console.log(JSON.stringify(res, null, 1));
      console.log('relinked:', await relinkIntros(pg));
      db = await load(pg);
    }
    if (process.env.RELINK === '1') { console.log('relinked:', await relinkIntros(pg)); db = await load(pg); }
    if (process.env.AUDIO === '1') {
      const dry = await audio(pg, { dry: true });
      console.log('AUDIO dry run:', JSON.stringify(dry, null, 1));
      const total = dry.reduce((n, x) => n + (x.chars || 0), 0);
      console.log(`would spend ${total} chars`);
      if (process.env.DRY !== '1') console.log('AUDIO render:', JSON.stringify(await audio(pg, { dry: false }), null, 1));
      db = await load(pg);
    }
    const problems = await verify(pg, db);
    console.log(problems.length ? `VERIFY: ${problems.length} defect(s) stand:\n  ${problems.join('\n  ')}` : 'VERIFY: every A–E defect is fixed in the live DB');
    process.exitCode = problems.length ? 2 : 0;
  } finally { await pg.end(); }
}
module.exports = { EDITS, MOVES, DELETES, LEGO_EDITS, INTROS, P26_HELD, planP26Moves, containsWords, nextFreeId };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
