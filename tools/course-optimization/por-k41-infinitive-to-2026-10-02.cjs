#!/usr/bin/env node
'use strict';
// tools/course-optimization/por-k41-infinitive-to-2026-10-02.cjs — job #357, por_for_eng.
//
// Canon K41 (Kai 2026-09-30, job #936·I): a target infinitive is glossed with "to" on the known side, so it cannot
// read as a command. Kai 2026-10-02: apply the Italian rulings that clearly carry over, hold the rest.
//
// SCOPE (hand-curated from the live course, 2 Oct): the NEW LEGOs whose Portuguese is, or starts with, an infinitive
// and whose English has no "to"; their component tiles (course_legos.components + the C rows); every BUILD fragment in
// the course whose Portuguese starts with an infinitive and whose English is a bare verb. NOT touched (listed):
// gerund / noun glosses (K41 case c, not yet ruled), non-infinitives that merely end in -ar/-er/-ir/-or, tiles that
// isolate an infinitive from a governor inside a correct LEGO, and the HOLD list below.
//
// AUDIO — MAKE-BEFORE-BREAK: the player drops a LEGO's debut and skips a phrase whose known/target slots are empty
// (generateLearningScript.ts phraseHasFullAudio / debutIsPlayable). So a row's new English is written ONLY when a
// clip of those exact words in the course's known voice (Sonia) already exists in the library — asked through the ONE
// route (POST /api/audio/render, dryRun:true, voiceBound:true), linked by id in the SAME UPDATE as the text, and
// verified in course_audio (voice + words). A row with no library clip is STAGED (not written) and counted for Kai's
// spend call. Intros: the old one quotes the old gloss, so it is detached (asset kept) and the new intro text is
// dry-run only; until it is rendered the player falls back to the LEGO's known clip.
//
//   node tools/course-optimization/por-k41-infinitive-to-2026-10-02.cjs           # plan + audio dry run
//   APPLY=1 node …                                                                  # write the library-covered rows

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'por_for_eng';
const JOB = '#357';
const SWEEP = 'por-k41-infinitive-to-2026-10-02';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = 'Kai 2026-10-02 (job #357): apply Italian rulings that clearly carry over — canon K41 (Kai 2026-09-30, job #936·I): a target infinitive is glossed with "to"';
const KNOWN_VOICE = ['azure_en-GB-SoniaNeural', 'en-GB-SoniaNeural'];

const norm = (s) => String(s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[.,!?;:"«»“”¿¡]+/g, ' ').replace(/\s+/g, ' ').trim();
/** A Portuguese infinitive, clitics attached (ajudar-te, levar-nos, pôr). */
const INFINITIVE = /^[a-zà-úç]+(ar|er|ir|or|ôr)(-(me|te|se|nos|vos|lo|la|los|las|lhe|lhes|o|a|os|as))*$/i;
/** Words that end like an infinitive and are not one, in this course. */
const NOT_INFINITIVE = new Set(['por', 'melhor', 'pior', 'invulgar', 'fizer', 'lugar', 'mulher', 'professor', 'senhor', 'qualquer', 'açúcar', 'jantar', 'favor', 'sequer', 'disser', 'quer', 'quiser', 'puder', 'tiver', 'estiver', 'souber', 'vier', 'der']); // quer = he wants (S0070L02B01 "want to tell me | quer dizer-me")
const firstWord = (t) => norm(t).split(' ')[0] || '';
/** THE RULE: the target starts with an infinitive and the English is a bare verb (no "to", no gerund). */
function owesTo(known, target) {
  const f = firstWord(target), k = norm(known).split(' ');
  if (!INFINITIVE.test(f) || NOT_INFINITIVE.has(f)) return false;
  if (k[0] === 'to') return false;
  if (/ing$/.test(k[0])) return false; // gerund gloss — K41 case (c), listed not changed
  return true;
}
const withTo = (known) => `to ${String(known).trim()}`;

/** LEGOs judged by hand (2 Oct) to owe "to" — every one a NEW LEGO with a bare verb gloss over an infinitive. */
const LEGOS = ['S0062L02', 'S0065L02', 'S0065L03', 'S0069L02', 'S0070L02', 'S0074L03', 'S0081L02', 'S0090L02', 'S0092L02', 'S0098L02', 'S0100L01',
  'S0136L03', 'S0161L02', 'S0181L02', 'S0228L01', 'S0242L01', 'S0243L01', 'S0269L01', 'S0270L02', 'S0271L02', 'S0274L01', 'S0334L03', 'S0337L01',
  'S0351L01', 'S0359L01', 'S0403L02', 'S0447L02', 'S0490L02'];
/** Tiles of already-correct "to" LEGOs that still read as commands. */
const EXTRA_TILES = { S0006L01C01: 'S0006L01', S0204L03C01: 'S0204L03' };
/** Held: written nowhere, listed for Kai with the reason. */
const HOLD = {
  S0071L02: 'seed 71 "let anyone hear": "to let" + bare "hear" — Italian held the same seed (#937·I)',
  S0071L04: 'seed 71 "hear" follows "let anyone" (bare infinitive in English) — Italian held 71',
  S0499L05: '"open the door and close" is an odd LEGO cut; "to" would not fix it — Kai',
  S0500L01: '"you sit down | sentar-te" needs more than "to" (drop "you"; seed says "sit between") — Kai',
  S0530L01: 'not-new "can | poder" — "to be able to" is a re-gloss and its basket is dark (L31, scan pattern 2)',
  'tell me it was': 'build "dizer-me era" is itself broken (no onde) — fix or delete, Kai',
  'think about that': '"pensar disso" is wrong Portuguese (pensar nisso) — K16, Kai',
  'look after young dog': '"tomar conta cão novo" is broken Portuguese (do cão) — Kai',
  'remember what I wanted to say': '"lembrar-me de o que" should be "do que" — K16, Kai',
  'you sit down': 'see S0500L01', 'you sit down between': 'see S0500L01',
  'tried to fix': 'English is past over an infinitive — needs a re-gloss, not "to"',
  'open the door and close': 'see S0499L05', 'open the door and close the window': 'see S0499L05',
  'need to wait': '"esperar ainda" ≠ need to wait — K33, Kai',
  "don't get left behind": 'negative English over a bare infinitive — needs a re-gloss',
  can: 'see S0530L01',
};

async function load(pg) {
  const q = async (sql, a) => (await pg.query(sql, a)).rows;
  const legos = await q(`SELECT l.lego_id, l.seed_number, l.lego_index, l.is_new, l.known_text, l.target_text, l.components, l.known_audio_id, l.presentation_audio_id, a.text AS intro
    FROM course_legos l LEFT JOIN course_audio a ON a.id::text = l.presentation_audio_id WHERE l.course_code=$1`, [COURSE]);
  const phrases = await q('SELECT id, seed_number, lego_index, phrase_role, known_text, target_text, known_audio_id FROM course_practice_phrases WHERE course_code=$1', [COURSE]);
  return { legos, phrases };
}

const demoOf = (intro) => { const m = /as in — '(.*)', is:$/.exec(intro || ''); return m ? m[1] : null; };
const wholeWords = (hay, chunk) => new RegExp(`(^|[^a-z'])${norm(chunk).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z']|$)`).test(norm(hay));
/** New intro: keep the "as in" demo only if it still contains the new gloss as whole words (the mirror rule). */
function introFor(newKnown, oldIntro) {
  const demo = demoOf(oldIntro);
  return demo && wholeWords(demo, newKnown) ? `The Portuguese for: '${newKnown}', as in — '${demo}', is:` : `The Portuguese for: '${newKnown}', is:`;
}

function plan(db) {
  const byId = Object.fromEntries(db.legos.map((l) => [l.lego_id, l]));
  const legoOfRow = (p) => db.legos.find((l) => l.seed_number === p.seed_number && l.lego_index === p.lego_index);
  const changes = [], held = [];
  for (const id of LEGOS) {
    const l = byId[id];
    if (!l || !l.is_new || !owesTo(l.known_text, l.target_text)) { held.push({ id, why: 'no longer matches the rule live' }); continue; }
    changes.push({ kind: 'lego', id, seed: l.seed_number, before: { known: l.known_text, target: l.target_text }, after: { known: withTo(l.known_text), target: l.target_text }, intro: { before: l.intro, after: introFor(withTo(l.known_text), l.intro) } });
  }
  for (const id of Object.keys(HOLD).filter((k) => /^S\d{4}L\d{2}$/.test(k))) held.push({ id, why: HOLD[id] });
  // tiles: the C row whose (known,target) equals a tile of a changed LEGO and owes "to"
  const tileLegos = new Set([...changes.map((c) => c.id), ...Object.values(EXTRA_TILES)]);
  for (const p of db.phrases.filter((x) => x.phrase_role === 'component')) {
    const L = legoOfRow(p);
    if (!L || !tileLegos.has(L.lego_id) || !owesTo(p.known_text, p.target_text)) continue;
    const short = p.id.split(':')[1];
    if (byId[L.lego_id] && !changes.some((c) => c.id === L.lego_id) && !EXTRA_TILES[short]) continue;
    changes.push({ kind: 'tile', id: short, lego: L.lego_id, seed: p.seed_number, before: { known: p.known_text, target: p.target_text }, after: { known: withTo(p.known_text), target: p.target_text } });
  }
  // builds anywhere in the course
  for (const p of db.phrases.filter((x) => x.phrase_role === 'build')) {
    if (!owesTo(p.known_text, p.target_text)) continue;
    const L = legoOfRow(p); const short = p.id.split(':')[1];
    if (HOLD[norm(p.known_text)] || HOLD[p.known_text]) { held.push({ id: short, why: HOLD[norm(p.known_text)] || HOLD[p.known_text], text: `${p.known_text} | ${p.target_text}` }); continue; }
    if (L && !L.is_new) { held.push({ id: short, why: 'under a not-new LEGO (never played, P25)', text: `${p.known_text} | ${p.target_text}` }); continue; }
    changes.push({ kind: 'build', id: short, seed: p.seed_number, before: { known: p.known_text, target: p.target_text }, after: { known: withTo(p.known_text), target: p.target_text } });
  }
  // ZUT (P16) and the duplicate rule: a new English already standing over a DIFFERENT Portuguese (LEGO or played row)
  // is held; one that equals an existing LEGO pair exactly would make this LEGO a duplicate (not-new) — held.
  const index = new Map();
  const add = (k, t, id) => { const n = norm(k); if (!index.has(n)) index.set(n, new Map()); const m = index.get(n); if (!m.has(norm(t))) m.set(norm(t), []); m.get(norm(t)).push(id); };
  const changedIds = new Set(changes.filter((c) => c.kind !== 'tile').map((c) => c.id));
  for (const l of db.legos) if (!changedIds.has(l.lego_id)) add(l.known_text, l.target_text, l.lego_id);
  for (const p of db.phrases) if (p.phrase_role !== 'component' && !changedIds.has(p.id.split(':')[1])) add(p.known_text, p.target_text, p.id.split(':')[1]);
  const kept = [];
  for (const c of changes) {
    if (c.kind === 'tile') { kept.push(c); continue; }
    const m = index.get(norm(c.after.known));
    const other = m ? [...m.entries()].filter(([t]) => t !== norm(c.after.target)) : [];
    const dupLego = c.kind === 'lego' && m && [...m.entries()].some(([t, ids]) => t === norm(c.after.target) && ids.some((id) => /^S\d{4}L\d{2}$/.test(id) && byId[id]?.is_new && byId[id].seed_number < c.seed));
    if (other.length) { held.push({ id: c.id, why: `ZUT: "${c.after.known}" already stands over ${other.map(([t, ids]) => `"${t}" (${ids.join(',')})`).join(', ')}`, text: `${c.before.known} | ${c.before.target}` }); continue; }
    if (dupLego) { held.push({ id: c.id, why: `"${c.after.known} | ${c.after.target}" is already an earlier NEW LEGO — the change makes this a duplicate (not-new), an is_new call for Kai`, text: `${c.before.known} | ${c.before.target}` }); continue; }
    kept.push(c); add(c.after.known, c.after.target, c.id);
  }
  // a tile whose LEGO was held goes with it
  const keptLegos = new Set(kept.filter((c) => c.kind === 'lego').map((c) => c.id));
  const final = kept.filter((c) => c.kind !== 'tile' || keptLegos.has(c.lego) || EXTRA_TILES[c.id]);
  return { changes: final, held };
}

async function route(body) {
  const res = await fetch(`${(process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '')}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': `${SWEEP} (job ${JOB})` }, body: JSON.stringify({ ...body, dryRun: true }) });
  return { status: res.status, ...(await res.json().catch(() => ({ ok: false }))) };
}
/** Ask the ONE route, DRY RUN, for every clip the changes need; verify each library answer in course_audio. */
async function audioPlan(pg, changes) {
  const out = { library: 0, wouldRender: 0, refused: 0, chars: 0, entries: [] };
  const cache = new Map();
  for (const c of changes) {
    if (c.kind === 'tile') continue;
    const asks = [{ role: 'known', text: c.after.known, voiceId: 'en-GB-SoniaNeural' }];
    if (c.kind === 'lego') asks.push({ role: 'presentation', text: c.intro.after, legoId: c.id, voiceId: 'en-GB-SoniaNeural', language: 'eng' }); // the course's intros are Sonia; without language the door reads them as por
    c.audio = {};
    for (const a of asks) {
      const key = `${a.role}\u0000${a.text}`;
      if (!cache.has(key)) {
        const r = await route({ courseCode: COURSE, role: a.role, text: a.text, voiceBound: true, purpose: `K41 "to" (${c.id})`, job: JOB, ...(a.voiceId ? { voiceId: a.voiceId } : {}), ...(a.language ? { language: a.language } : {}), ...(a.legoId ? { legoId: a.legoId } : {}) });
        let clip = null;
        if (r.ok && r.source === 'library' && r.audioId) clip = (await pg.query('SELECT id, voice_id, text FROM course_audio WHERE id=$1', [r.audioId])).rows[0] || null;
        const verified = clip && (a.role !== 'known' || KNOWN_VOICE.includes(clip.voice_id)) && norm(clip.text) === norm(a.text);
        cache.set(key, { source: r.ok ? r.source : `refused ${r.code || r.status}`, chars: r.wouldSpendChars || 0, audioId: verified ? clip.id : null, clipVoice: clip?.voice_id });
        const e = cache.get(key);
        if (!r.ok) out.refused++; else if (e.audioId) out.library++; else { out.wouldRender++; out.chars += e.chars || a.text.length; }
        out.entries.push({ id: c.id, role: a.role, text: a.text, ...e });
      }
      c.audio[a.role] = cache.get(key);
    }
  }
  return out;
}

async function apply(pg, supabase, rows, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const ev = (op, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: op, scope, detail });
  const L = rows.filter((c) => c.kind === 'lego'), P = rows.filter((c) => c.kind !== 'lego');
  const seeds = [...new Set(rows.map((c) => c.seed))].sort((a, b) => a - b);
  const E = {};
  if (L.length) E.lego = await ev('lego-edit', { seed_numbers: [...new Set(L.map((c) => c.seed))], lego_ids: L.map((c) => c.id), rows: L.length }, { ruling: RULING, job: JOB, changes: L.map((c) => ({ id: c.id, from: c.before, to: c.after, intro: c.intro })) });
  if (P.length) E.phrase = await ev('phrase-edit', { seed_numbers: [...new Set(P.map((c) => c.seed))], phrase_ids: P.map((c) => `${COURSE}:${c.id}`), rows: P.length }, { ruling: RULING, job: JOB, changes: P.map((c) => ({ id: `${COURSE}:${c.id}`, kind: c.kind, from: c.before, to: c.after })) });
  const appr = (await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2) AND approved_at IS NOT NULL', [COURSE, seeds])).rows;
  if (appr.length) E.unapprove = await ev('unapprove', { seed_numbers: appr.map((a) => a.seed_number), rows: appr.length }, { job: JOB, why: 'English edited in the K41 pass — Kai should read them', approved_at_before: appr });
  log.events = E; log.unapproved = appr.map((a) => a.seed_number);
  await pg.query('BEGIN');
  try {
    for (const c of L) {
      const comps = c.components;
      const r = await pg.query(`UPDATE course_legos SET known_text=$1, known_audio_id=$2, components=$3, presentation_audio_id=NULL, last_edit_event_id=$4, updated_at=now()
        WHERE course_code=$5 AND lego_id=$6 AND known_text=$7 AND target_text=$8`, [c.after.known, c.audio.known.audioId, JSON.stringify(comps), E.lego, COURSE, c.id, c.before.known, c.before.target]);
      if (r.rowCount !== 1) throw new Error(`${c.id}: ${r.rowCount} rows`);
      await pg.query('UPDATE lego_introductions SET presentation_audio_id=NULL, audio_uuid=NULL, updated_at=now() WHERE course_code=$1 AND lego_id=$2', [COURSE, c.id]);
    }
    for (const c of P) {
      const link = c.kind === 'tile' ? '' : ', known_audio_id=$7';
      const args = [c.after.known, E.phrase, COURSE, `${COURSE}:${c.id}`, c.before.known, c.before.target];
      if (c.kind !== 'tile') args.push(c.audio.known.audioId);
      const r = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, qa_checked=NULL, decomposition=NULL, display_tiling=NULL, last_edit_event_id=$2, updated_at=now()${link}
        WHERE course_code=$3 AND id=$4 AND known_text=$5 AND target_text=$6`, args);
      if (r.rowCount !== 1) throw new Error(`${c.id}: ${r.rowCount} rows`);
    }
    if (appr.length) await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$3 WHERE course_code=$1 AND seed_number = ANY($2)', [COURSE, appr.map((a) => a.seed_number), E.unapprove]);
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
}

/** Which changes are written: tiles (no audio) always with their LEGO; LEGOs/builds only with a verified library known clip. */
function writable(changes) {
  const ok = changes.filter((c) => c.kind === 'tile' || c.audio?.known?.audioId);
  const okLegos = new Set(ok.filter((c) => c.kind === 'lego').map((c) => c.id));
  return ok.filter((c) => c.kind !== 'tile' || okLegos.has(c.lego) || EXTRA_TILES[c.id]);
}
/** Mirror a LEGO's components JSON onto the changed tiles. */
function withComponents(db, rows) {
  for (const c of rows.filter((x) => x.kind === 'lego')) {
    const l = db.legos.find((x) => x.lego_id === c.id);
    const tiles = rows.filter((t) => t.kind === 'tile' && t.lego === c.id);
    c.components = (l.components || []).map((t) => { const hit = tiles.find((x) => norm(x.before.known) === norm(t.known) && norm(x.before.target) === norm(t.target)); return hit ? { ...t, known: hit.after.known } : t; });
  }
  return rows;
}

async function main() {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const db = await load(pg);
  const p = plan(db);
  const audio = await audioPlan(pg, p.changes);
  const rows = withComponents(db, writable(p.changes));
  const staged = p.changes.filter((c) => !rows.includes(c));
  const log = { sweep: SWEEP, job: JOB, apply: APPLY, planned: p.changes, held: p.held, audio, written: rows.map((c) => c.id), staged: staged.map((c) => ({ id: c.id, kind: c.kind, before: c.before, after: c.after })) };
  const count = (xs, k) => xs.filter((c) => c.kind === k).length;
  console.log(`══ ${COURSE} K41 — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
  console.log(`planned: ${count(p.changes, 'lego')} LEGOs, ${count(p.changes, 'tile')} tiles, ${count(p.changes, 'build')} builds; held ${p.held.length}`);
  console.log(`audio dry run: ${audio.library} library (verified), ${audio.wouldRender} would render (${audio.chars} chars), ${audio.refused} refused`);
  console.log(`writable now: ${count(rows, 'lego')} LEGOs, ${count(rows, 'tile')} tiles, ${count(rows, 'build')} builds; staged for spend: ${staged.length}`);
  for (const c of p.changes) console.log(`  ${rows.includes(c) ? 'WRITE ' : 'STAGE '} ${c.kind.padEnd(5)} ${c.id.padEnd(12)} "${c.before.known}" → "${c.after.known}" | ${c.after.target}${c.audio?.presentation ? `  intro:${c.audio.presentation.audioId ? 'library' : 'render'}` : ''}`);
  console.log('HELD:'); for (const h of p.held) console.log(`  ${h.id} ${h.text ? `"${h.text}" ` : ''}— ${h.why}`);
  if (APPLY && rows.length) { await apply(pg, supabase, rows, log); console.log(`APPLIED ${rows.length}; unapproved ${log.unapproved.length} seeds: ${log.unapproved.join(',')}`); }
  const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
  await pg.end();
}
module.exports = { owesTo, withTo, introFor, plan, writable, LEGOS, HOLD };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
