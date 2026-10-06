#!/usr/bin/env node
'use strict';
// tools/course-optimization/cat-bracket-tags-2026-10-05.cjs — job #881, cat_for_eng.
//
// Removes the English bracket tags from cat_for_eng LEGOs and practice phrases under Kai's ruling of 2026-10-05
// (canon K42): a grammar / sense / person tag means the LEGO lacks the context that forces its form, so the LEGO
// GROWS (both sides, seed words only) to take it in; a masc / fem / plural tag is just dropped, and the phrases are
// checked to use the form only where the sentence selects it. The plan is data: ./cat-bracket-tags-2026-10-05.data.cjs.
//
//   node tools/course-optimization/cat-bracket-tags-2026-10-05.cjs          # guards only (nothing written)
//   AUDIO_DRY=1 node …                                                     # + every slot the pass needs, asked of the
//                                                                          #   one route with dryRun (library vs render, chars)
//   APPLY=1 node …                                                         # content, one transaction
//   AUDIO=1 node …                                                         # (tomorrow) render + link the stale slots
//   CHECK=1 node …                                                         # does the live course hold the plan?
//
// MAKE-BEFORE-BREAK (Kai, 2026-10-05: "no new rendering today… keep old clips linked until new ones exist"). The DB
// trigger null_*_audio_on_text_change empties a slot whose text changed unless a same-voice library clip says the
// new words (then it relinks — free and correct). APPLY lets that happen, then puts the OLD clip back into every slot
// the trigger emptied, presentation included, so nothing the learner hears goes silent. Those slots now play the
// pre-edit words until AUDIO=1 renders the new clip, checks it (voice + words) and only then swaps the link.
// A slot is "stale" exactly when its clip's text does not say the row's text; that is what AUDIO=1 fills.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const D = require('./cat-bracket-tags-2026-10-05.data.cjs');

const { COURSE } = D;
const JOB = '#881 (cat-brackets-fix)';
const SWEEP = 'cat-bracket-tags-2026-10-05';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = "Kai 2026-10-05 (canon K42): grammar/sense/person tags → the LEGO grows to carry the trigger; masc/fem/plural tags dropped, phrases checked for correct form";

const norm = (s) => String(s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[.,!?;:"«»“”¿¡]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
const full = (id) => `${COURSE}:${id}`;
const short = (id) => String(id).replace(`${COURSE}:`, '');
const seedOf = (id) => Number(/^S(\d{4})/.exec(id)[1]);
const legoOfPhrase = (id) => /^(S\d{4}L\d{2})/.exec(id)[1];
const arr = (x) => (Array.isArray(x) ? x : []);
const hasBracket = (s) => /[()]/.test(String(s || ''));
const stripBrackets = (s) => String(s).replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
/** whole words, contiguous, in order */
const containsSeq = (hay, needle) => ` ${norm(hay)} `.includes(` ${norm(needle)} `);
/** the target of a phrase contains the LEGO target; Catalan elision/hyphen/clitic spellings are whole tokens. */
const containsTarget = (hay, needle) => containsSeq(hay, needle);
/** A phrase's cached decomposition / display tiling / known_gloss_segments describe BOTH its sentences: any change to
 *  either side (English-only included — "so good"→"so well") makes them describe words the row no longer says. */
const textChanged = (before, after) => norm(before.known) !== norm(after.known) || norm(before.target) !== norm(after.target);
function introFor(known, demo) { return demo ? `The Catalan for: '${known}', as in — '${demo}', is:` : `The Catalan for: '${known}', is:`; }
function legoPosition(phraseTarget, legoTarget) {
  const p = norm(phraseTarget), l = norm(legoTarget);
  if (p === l) return null;
  if (p.startsWith(l + ' ')) return 'start';
  if (p.endsWith(' ' + l)) return 'end';
  return 'middle';
}

// ── read ───────────────────────────────────────────────────────────────────────────────────────────
async function readLive(pg) {
  const q = async (sql, a) => (await pg.query(sql, a)).rows;
  const legos = await q(`SELECT lego_id, seed_number, lego_index, is_new, known_text, target_text, components, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id FROM course_legos WHERE course_code=$1`, [COURSE]);
  const phrases = await q(`SELECT split_part(id,':',2) AS id, seed_number, lego_index, phrase_role, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1`, [COURSE]);
  const seeds = await q(`SELECT seed_number, known_text, target_text, approved_at FROM course_seeds WHERE course_code=$1`, [COURSE]);
  const rounds = await q(`SELECT lego_id, round_index FROM course_round_index WHERE course_code=$1`, [COURSE]);
  const guarded = new Set((await q(`SELECT lego_id FROM human_authored_presentations WHERE course_code=$1`, [COURSE]).catch(() => [])).map((r) => r.lego_id));
  return { legos: Object.fromEntries(legos.map((l) => [l.lego_id, l])), phrases: Object.fromEntries(phrases.map((p) => [p.id, p])), seeds: Object.fromEntries(seeds.map((s) => [s.seed_number, s])), rounds: Object.fromEntries(rounds.map((r) => [r.lego_id, r.round_index])), guarded };
}

/** The plan resolved against live rows: before/after for each LEGO and phrase. */
function resolve(L) {
  const legos = {};
  for (const [id, p] of Object.entries(D.LEGOS)) {
    const cur = L.legos[id]; if (!cur) throw new Error(`${id} missing`);
    const comps = p.comps ? p.comps.map(([known, target]) => ({ known, target })) : arr(cur.components).map((c) => ({ ...c, known: stripBrackets(c.known) }));
    legos[id] = { id, group: p.group, why: p.why, seed: cur.seed_number, is_new: cur.is_new,
      before: { known: cur.known_text, target: cur.target_text, components: cur.components },
      after: { known: p.known, target: p.target || cur.target_text, components: comps }, intro: introFor(p.known, p.demo) };
  }
  for (const [id, map] of Object.entries(D.COMPONENT_JSON_STRIPS)) {
    const cur = L.legos[id];
    legos[id] = legos[id] || { id, group: 'C', why: 'component tag dropped', seed: cur.seed_number, is_new: cur.is_new, componentsOnly: true,
      before: { known: cur.known_text, target: cur.target_text, components: cur.components },
      after: { known: cur.known_text, target: cur.target_text, components: arr(cur.components).map((c) => ({ ...c, known: map[c.known] || c.known })) } };
  }
  const phrases = {};
  for (const [id, [known, target]] of Object.entries(D.PHRASES)) {
    const cur = L.phrases[id]; if (!cur) throw new Error(`phrase ${id} missing`);
    phrases[id] = { id, role: cur.phrase_role, seed: cur.seed_number, lego_index: cur.lego_index, before: { known: cur.known_text, target: cur.target_text }, after: { known, target } };
  }
  const deletes = {};
  for (const [id, why] of Object.entries(D.DELETES)) { const cur = L.phrases[id]; if (!cur) continue; /* already deleted by an earlier run */ deletes[id] = { id, why, role: cur.phrase_role, seed: cur.seed_number, before: { known: cur.known_text, target: cur.target_text } }; }
  return { legos, phrases, deletes };
}

// ── guards ─────────────────────────────────────────────────────────────────────────────────────────
function guards(L, R) {
  const probs = [], notes = [];
  const after = (id) => R.phrases[id]?.after || { known: L.phrases[id].known_text, target: L.phrases[id].target_text };
  const legoNow = (id) => R.legos[id]?.after || { known: L.legos[id].known_text, target: L.legos[id].target_text, components: L.legos[id].components };
  // 0. coverage: every bracketed LEGO is planned or held; nothing bracketed survives outside the held list
  const held = new Set(D.HELD.map((h) => h.id));
  for (const l of Object.values(L.legos)) {
    if (!hasBracket(l.known_text)) continue;
    if (!R.legos[l.lego_id] && !held.has(l.lego_id)) probs.push(`bracketed LEGO not in the plan: ${l.lego_id} "${l.known_text}"`);
  }
  for (const id of Object.keys(L.legos)) { const a = legoNow(id); if (!held.has(id) && hasBracket(a.known)) probs.push(`${id}: bracket survives "${a.known}"`); if (!held.has(id) && arr(a.components).some((c) => hasBracket(c.known))) probs.push(`${id}: bracket in components`); }
  for (const id of Object.keys(L.phrases)) { if (R.deletes[id]) continue; const a = after(id); if (hasBracket(a.known) && !held.has(legoOfPhrase(id))) probs.push(`phrase ${id}: bracket survives "${a.known}"`); }
  // 1. LEGO: seed containment (L26, both sides), gate syllables, no-op, intro demo contains chunk, guarded intros
  const { estimateSyllables } = require('../../services/course-builder/lib/language-config.cjs');
  for (const l of Object.values(R.legos)) {
    if (l.componentsOnly) continue;
    const s = L.seeds[l.seed];
    if (!containsTarget(s.target_text, l.after.target)) probs.push(`L26 target: ${l.id} "${l.after.target}" not contiguous in seed "${s.target_text}"`);
    for (const w of words(l.after.known)) if (!words(s.known_text).includes(w) && !["i'm", "it's", "we're", "you're", "she's", "i'd", "i've"].includes(w)) notes.push(`L26 known: ${l.id} word "${w}" not in seed "${s.known_text}"`);
    const syl = estimateSyllables(l.after.target, COURSE); if (syl > 8) probs.push(`${l.id}: ${syl} syllables by the gate`);
    if (norm(l.before.known) === norm(l.after.known) && norm(l.before.target) === norm(l.after.target)) notes.push(`${l.id}: words unchanged (punctuation only)`);
    const m = /as in — '(.*)', is:$/.exec(l.intro); if (m && !containsSeq(m[1], l.after.known)) probs.push(`${l.id}: intro demo "${m[1]}" lacks "${l.after.known}"`);
    if (L.guarded.has(l.id)) notes.push(`${l.id}: human-authored intro — the new intro text below is a proposal, not to be rendered without Kai`);
  }
  // 2. every non-component phrase under a touched LEGO contains the LEGO target (P17), and its known (loosely)
  for (const p of Object.values(L.phrases)) {
    const lid = legoOfPhrase(p.id); const l = R.legos[lid];
    if (!l || l.componentsOnly || R.deletes[p.id] || p.phrase_role === 'component') continue;
    const a = after(p.id);
    if (!containsTarget(a.target, l.after.target)) probs.push(`P17: ${p.id} "${a.target}" lacks "${l.after.target}"`);
    const kw = words(l.after.known).filter((w) => !['to', 'the', 'a'].includes(w));
    if (!kw.every((w) => words(a.known).includes(w))) notes.push(`known loose: ${p.id} "${a.known}" vs "${l.after.known}"`);
  }
  // 3. edited phrases elsewhere still contain their own LEGO
  for (const p of Object.values(R.phrases)) {
    if (p.role === 'component' || R.legos[legoOfPhrase(p.id)]) continue;
    if (!containsTarget(p.after.target, legoNow(legoOfPhrase(p.id)).target)) probs.push(`P17: ${p.id} lacks its LEGO`);
  }
  // 4. every target word of an edited phrase / grown LEGO is taught by its round
  const roundOf = (lid) => L.rounds[lid] ?? Infinity;
  const taught = []; // [round, word]
  for (const l of Object.values(L.legos)) { const a = legoNow(l.lego_id); const r = l.is_new ? roundOf(l.lego_id) : roundOf(Object.keys(L.rounds).filter((k) => seedOf(k) <= l.seed_number).sort((x, y) => L.rounds[y] - L.rounds[x])[0]); for (const w of words(a.target)) taught.push([r, w]); for (const c of arr(a.components)) for (const w of words(c.target)) taught.push([r, w]); }
  const known = (round) => new Set(taught.filter(([r]) => r <= round).map(([, w]) => w));
  const cache = {};
  const check = (id, target, lid) => { const r = roundOf(lid); const k = cache[r] || (cache[r] = known(r)); for (const w of words(target)) if (!k.has(w)) notes.push(`untaught by round ${r}: ${id} "${w}"`); };
  for (const p of Object.values(R.phrases)) if (p.role !== 'component' && norm(p.before.target) !== norm(p.after.target)) check(p.id, p.after.target, legoOfPhrase(p.id));
  for (const l of Object.values(R.legos)) if (!l.componentsOnly && norm(l.before.target) !== norm(l.after.target)) check(l.id, l.after.target, l.id);
  // 5. ZUT overlay: one known → two targets, touched rows only (LEGOs + non-component phrases)
  const pairs = new Map(); const add = (id, k, t) => { const K = norm(k), T = norm(t); if (!K) return; if (!pairs.has(K)) pairs.set(K, new Map()); const m = pairs.get(K); if (!m.has(T)) m.set(T, []); m.get(T).push(id); };
  for (const p of Object.values(L.phrases)) { if (R.deletes[p.id] || p.phrase_role === 'component') continue; const a = after(p.id); add(p.id, a.known, a.target); }
  for (const id of Object.keys(L.legos)) { const a = legoNow(id); add(id, a.known, a.target); }
  const touched = new Set([...Object.keys(R.phrases), ...Object.keys(R.legos)]);
  const zut = [];
  for (const [k, m] of pairs) if (m.size > 1 && [...m.values()].flat().some((id) => touched.has(id))) zut.push(`"${k}" → ${[...m.entries()].map(([t, ids]) => `${t} [${ids.slice(0, 4).join(',')}${ids.length > 4 ? '…' : ''}]`).join(' / ')}`);
  // 6. exact duplicate LEGO (both sides) created
  for (const l of Object.values(R.legos)) for (const id of Object.keys(L.legos)) if (id !== l.id && !l.componentsOnly) { const o = legoNow(id); if (norm(o.known) === norm(l.after.known) && norm(o.target) === norm(l.after.target)) probs.push(`duplicate LEGO ${l.id} = ${id}`); }
  // 7. every new LEGO keeps at least one non-component phrase (debut_keeps_practice)
  for (const l of Object.values(R.legos)) { if (!l.is_new || l.componentsOnly) continue; const n = Object.values(L.phrases).filter((p) => legoOfPhrase(p.id) === l.id && p.phrase_role !== 'component' && !R.deletes[p.id]).length; if (n < 3) notes.push(`${l.id}: only ${n} practice phrases left`); }
  return { probs, notes, zut };
}

// ── audio slots ────────────────────────────────────────────────────────────────────────────────────
/** Every slot whose linked clip does not say the row's (planned) text. */
async function staleSlots(pg, R, { planned }) {
  const out = [];
  const clip = async (id) => (id ? (await pg.query('SELECT id, text, voice_id FROM course_audio WHERE id=$1', [id])).rows[0] : null);
  const ids = Object.keys(R.legos).filter((id) => !R.legos[id].componentsOnly);
  const { rows: lg } = await pg.query('SELECT lego_id id, is_new, known_text, target_text, known_audio_id k, target1_audio_id t1, target2_audio_id t2, presentation_audio_id pres FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)', [COURSE, ids]);
  const { rows: ph } = await pg.query(`SELECT split_part(id,':',2) id, phrase_role, known_text, target_text, known_audio_id k, target1_audio_id t1, target2_audio_id t2 FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)`, [COURSE, Object.keys(R.phrases).map(full)]);
  const rows = [...lg.map((r) => ({ ...r, table: 'course_legos', plan: R.legos[r.id] })), ...ph.map((r) => ({ ...r, table: 'course_practice_phrases', plan: R.phrases[r.id] }))];
  for (const r of rows) {
    const known = planned ? r.plan.after.known : r.known_text, target = planned ? r.plan.after.target : r.target_text;
    const comp = r.phrase_role === 'component';
    const slots = [['known', r.k, known]];
    if (!comp) slots.push(['target1', r.t1, target], ['target2', r.t2, target]);
    if (r.table === 'course_legos' && r.is_new) slots.push(['presentation', r.pres, r.plan.intro]);
    for (const [slot, id, text] of slots) {
      const c = await clip(id);
      const ok = c && (slot === 'presentation' ? c.text === text : norm(c.text) === norm(text));
      if (!ok) out.push({ table: r.table, id: r.id, slot, text, component: comp, oldClip: c ? { id: c.id, voice: c.voice_id, text: c.text } : null });
    }
  }
  return out;
}
async function render(body) {
  const base = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
  const res = await fetch(`${base}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': `${SWEEP} (job ${JOB})` }, body: JSON.stringify(body) });
  const out = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
  return { status: res.status, ...out };
}
const VOICE = { known: 'en-GB-SoniaNeural', target1: 'ca-ES-AlbaNeural', target2: 'ca-ES-EnricNeural', presentation: 'en-GB-SoniaNeural' };
function bodyFor(s, dryRun) {
  const voice = (s.oldClip?.voice || VOICE[s.slot]).replace(/^azure_/, '');
  return { courseCode: COURSE, role: s.slot, text: s.text, voiceId: voice, voiceBound: true, purpose: `K42 bracket-tag pass (${s.id})`, ...(s.slot === 'presentation' || s.slot === 'known' ? { language: 'eng' } : {}), ...(s.slot === 'presentation' ? { legoId: s.id } : {}), ...(dryRun ? { dryRun: true } : {}) };
}

// ── content ────────────────────────────────────────────────────────────────────────────────────────
async function applyContent(pg, supabase, R, L, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const ev = (op, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: op, scope, detail });
  const leg = Object.values(R.legos), phr = Object.values(R.phrases), del = Object.values(R.deletes);
  const touchedSeeds = [...new Set([...leg.map((l) => l.seed), ...phr.map((p) => p.seed), ...del.map((d) => d.seed)])].sort((a, b) => a - b);
  const Ev = {};
  Ev.lego = await ev('lego-edit', { seed_numbers: [...new Set(leg.map((l) => l.seed))], lego_ids: leg.map((l) => l.id), rows: leg.length }, { ruling: RULING, job: JOB, changes: leg.map((l) => ({ id: l.id, group: l.group, why: l.why, from: l.before, to: l.after, intro: l.intro })) });
  Ev.phrase = await ev('phrase-edit', { seed_numbers: [...new Set(phr.map((p) => p.seed))], phrase_ids: phr.map((p) => full(p.id)), rows: phr.length }, { ruling: RULING, job: JOB, changes: phr.map((p) => ({ id: full(p.id), from: p.before, to: p.after })) });
  Ev.del = await ev('phrase-delete', { seed_numbers: [...new Set(del.map((d) => d.seed))], phrase_ids: del.map((d) => full(d.id)), rows: del.length }, { ruling: RULING, job: JOB, deleted: del.map((d) => ({ id: full(d.id), known: d.before.known, target: d.before.target, why: d.why })) });
  const { rows: appr } = await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2) AND approved_at IS NOT NULL', [COURSE, touchedSeeds]);
  Ev.unapprove = appr.length ? await ev('unapprove', { seed_numbers: appr.map((a) => a.seed_number), rows: appr.length }, { job: JOB, why: 'edited in the K42 bracket-tag pass — Kai should read them', approved_at_before: appr }) : null;
  Object.assign(log, { events: Ev, touchedSeeds, unapproved: appr.map((a) => a.seed_number), relinked: [], restored: [] });
  await pg.query('BEGIN');
  try {
    for (const l of leg) {
      const old = L.legos[l.id];
      const r = await pg.query(`UPDATE course_legos SET known_text=$1, target_text=$2, components=$3, known_gloss_segments=NULL, last_edit_event_id=$4, updated_at=now()
        WHERE course_code=$5 AND lego_id=$6 AND known_text=$7 AND target_text=$8 RETURNING known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id`,
        [l.after.known, l.after.target, JSON.stringify(l.after.components), Ev.lego, COURSE, l.id, l.before.known, l.before.target]);
      if (r.rowCount !== 1) throw new Error(`${l.id}: ${r.rowCount} rows`);
      await restore(pg, 'course_legos', 'lego_id', l.id, old, r.rows[0], ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id'], log);
      // Every OTHER phrase whose cached decomposition carries this LEGO's old gloss (S0073L01 "for / to (purpose)" sat in
      // 121 phrases) now teaches a tag the LEGO no longer has: drop it so the backfill rebuilds it from the new LEGO text.
      if (textChanged(l.before, l.after)) {
        const d = await pg.query(`UPDATE course_practice_phrases SET decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, known_gloss_segments=NULL, updated_at=now()
          WHERE course_code=$1 AND decomposition IS NOT NULL AND decomposition::jsonb @> $2::jsonb`, [COURSE, JSON.stringify([{ legoId: l.id }])]);
        log.cachesDropped = (log.cachesDropped || 0) + d.rowCount;
      }
    }
    for (const d of del) {
      const r = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [COURSE, full(d.id), d.before.known, d.before.target]);
      if (r.rowCount !== 1) throw new Error(`delete ${d.id}: ${r.rowCount}`);
    }
    for (const p of phr) {
      const old = L.phrases[p.id]; const comp = p.role === 'component';
      const legoT = R.legos[legoOfPhrase(p.id)]?.after.target || L.legos[legoOfPhrase(p.id)].target_text;
      const tChanged = textChanged(p.before, p.after);
      const r = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2,
          word_count=CASE WHEN $3 THEN $4 ELSE word_count END, lego_count=CASE WHEN $3 AND NOT $5 THEN $6 ELSE lego_count END,
          lego_position=CASE WHEN $3 AND NOT $5 THEN $7 ELSE lego_position END,
          qa_checked=NULL, known_gloss_segments=CASE WHEN $3 THEN NULL ELSE known_gloss_segments END, decomposition=CASE WHEN $3 THEN NULL ELSE decomposition END, decomposition_course_version=CASE WHEN $3 THEN NULL ELSE decomposition_course_version END,
          display_tiling=CASE WHEN $3 THEN NULL ELSE display_tiling END, display_tiling_version=CASE WHEN $3 THEN NULL ELSE display_tiling_version END,
          last_edit_event_id=$8, updated_at=now() WHERE course_code=$9 AND id=$10 AND known_text=$11 AND target_text=$12
          RETURNING known_audio_id, target1_audio_id, target2_audio_id`,
        [p.after.known, p.after.target, tChanged, p.after.target.length, comp, p.after.target.split(/\s+/).length, legoPosition(p.after.target, legoT), Ev.phrase, COURSE, full(p.id), p.before.known, p.before.target]);
      if (r.rowCount !== 1) throw new Error(`${p.id}: ${r.rowCount} rows`);
      await restore(pg, 'course_practice_phrases', 'id', full(p.id), old, r.rows[0], ['known_audio_id', 'target1_audio_id', 'target2_audio_id'], log);
    }
    if (appr.length) await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$3, updated_at=now() WHERE course_code=$1 AND seed_number = ANY($2)', [COURSE, appr.map((a) => a.seed_number), Ev.unapprove]);
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  await require('../../services/shared/round-index-refresh.cjs').refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: K42 bracket-tag pass — ${leg.length} LEGOs, ${phr.length} phrases, ${del.length} deleted; stale slots keep their old clips until AUDIO=1 renders`, metadata: { job: JOB, seeds: touchedSeeds }, append: true, metadataKey: SWEEP });
}
/** Make-before-break: a slot the trigger emptied gets its old clip back; a slot it relinked to a same-voice clip of the new words keeps that. */
async function restore(pg, table, key, id, old, now, cols, log) {
  for (const c of cols) {
    const was = old[c] == null ? null : String(old[c]); const is = now[c] == null ? null : String(now[c]);
    if (was === is) continue;
    if (is) { log.relinked.push(`${short(id)}.${c}`); continue; }
    if (!was) continue;
    await pg.query(`UPDATE ${table} SET ${c}=$1 WHERE course_code=$2 AND ${key}=$3 AND ${c} IS NULL`, [c === 'presentation_audio_id' ? was : was, COURSE, id]);
    log.restored.push(`${short(id)}.${c}`);
  }
}

// ── audio (tomorrow) ───────────────────────────────────────────────────────────────────────────────
async function fillAudio(pg, R, log) {
  const slots = (await staleSlots(pg, R, { planned: false })).filter((s) => !s.component);
  log.audio = [];
  for (const s of slots) {
    const e = { id: s.id, slot: s.slot, text: s.text }; log.audio.push(e);
    const dry = await render(bodyFor(s, true));
    if (!dry.ok) { e.result = `REFUSED (dry): ${dry.code || dry.status} ${dry.error || ''}`; continue; }
    const real = await render(bodyFor(s, false));
    if (!real.ok || !real.audioId) { e.result = `REFUSED: ${real.code || real.status} ${real.error || ''}`; continue; }
    const { rows: [c] } = await pg.query('SELECT id, voice_id, text FROM course_audio WHERE id=$1', [real.audioId]);
    const wantVoice = (s.oldClip?.voice || VOICE[s.slot]).replace(/^azure_/, '');
    if (!c || String(c.voice_id).replace(/^azure_/, '') !== wantVoice) { e.result = `NOT LINKED — voice ${c?.voice_id}`; continue; }
    if (s.slot === 'presentation' ? c.text !== s.text : norm(c.text) !== norm(s.text)) { e.result = `NOT LINKED — clip says "${c.text}"`; continue; }
    // verified: now swap the link (the old clip stays in course_audio, untouched)
    if (s.slot === 'presentation') {
      await pg.query('UPDATE course_legos SET presentation_audio_id=$1 WHERE course_code=$2 AND lego_id=$3', [c.id, COURSE, s.id]);
      const up = await pg.query('UPDATE lego_introductions SET presentation_audio_id=$1, audio_uuid=$1, updated_at=now() WHERE course_code=$2 AND lego_id=$3', [c.id, COURSE, s.id]);
      if (!up.rowCount) await pg.query('INSERT INTO lego_introductions (course_code, lego_id, audio_uuid, presentation_audio_id) VALUES ($1,$2,$3,$3)', [COURSE, s.id, c.id]);
      await pg.query('UPDATE course_audio SET lego_id=$1 WHERE id=$2 AND lego_id IS NULL', [s.id, c.id]);
    } else {
      await pg.query(`UPDATE ${s.table} SET ${s.slot}_audio_id=$1 WHERE course_code=$2 AND ${s.table === 'course_legos' ? 'lego_id' : 'id'}=$3`, [c.id, COURSE, s.table === 'course_legos' ? s.id : full(s.id)]);
    }
    e.result = `${real.source} ${real.charsSpent || 0} chars → linked`;
  }
}

async function main() {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const fs = require('fs');
  const outDir = process.env.CS_SCRATCH || require('os').tmpdir();
  const L = await readLive(pg);
  const log = { at: new Date().toISOString(), mode: process.env.APPLY === '1' ? 'APPLY' : process.env.AUDIO === '1' ? 'AUDIO' : process.env.CHECK === '1' ? 'CHECK' : 'PLAN' };
  if (log.mode === 'CHECK' || log.mode === 'AUDIO') {
    // after APPLY the "before" is gone; resolve against the plan only
    const R = { legos: {}, phrases: {}, deletes: {} };
    const probs = [];
    for (const [id, p] of Object.entries(D.LEGOS)) { const c = L.legos[id]; R.legos[id] = { id, is_new: c.is_new, after: { known: p.known, target: p.target || c.target_text }, intro: introFor(p.known, p.demo) }; if (c.known_text !== p.known || (p.target && c.target_text !== p.target)) probs.push(`${id} holds "${c.known_text} | ${c.target_text}"`); }
    for (const [id, [k, t]] of Object.entries(D.PHRASES)) { const c = L.phrases[id]; R.phrases[id] = { id, after: { known: k, target: t } }; if (!c || c.known_text !== k || c.target_text !== t) probs.push(`${id} holds "${c?.known_text} | ${c?.target_text}"`); }
    for (const id of Object.keys(D.DELETES)) if (L.phrases[id]) probs.push(`${id} still exists`);
    const held = new Set(D.HELD.map((h) => h.id));
    const brackets = Object.values(L.legos).filter((l) => hasBracket(l.known_text) && !held.has(l.lego_id)).map((l) => l.lego_id);
    console.log(`CHECK: ${probs.length} rows off-plan; ${brackets.length} bracketed LEGOs outside the held list${brackets.length ? ': ' + brackets.join(' ') : ''}`);
    probs.slice(0, 20).forEach((p) => console.log('  ' + p));
    if (log.mode === 'AUDIO') { await fillAudio(pg, R, log); fs.writeFileSync(path.join(outDir, `${SWEEP}-audio.json`), JSON.stringify(log, null, 2)); console.log(log.audio.map((a) => `${a.id}.${a.slot}: ${a.result}`).join('\n')); }
    const stale = await staleSlots(pg, R, { planned: false });
    console.log(`stale slots (clip does not say the row's words): ${stale.filter((s) => !s.component).length} played + ${stale.filter((s) => s.component).length} component`);
    await pg.end(); process.exit(probs.length || brackets.length ? 2 : 0);
  }
  const R = resolve(L);
  const g = guards(L, R);
  if (process.env.ONLY_PASS2 === '1') {
    // Kai's B addendum (2026-10-05): write only the ten LEGOs grown to their noun, their phrases and deletes —
    // the rest of the plan is already live and is guarded above, not re-written.
    const keep = new Set(D.PASS2);
    for (const k of ['legos', 'phrases', 'deletes']) for (const id of Object.keys(R[k])) if (!keep.has(id.slice(0, 8))) delete R[k][id];
    for (const id of Object.keys(R.phrases)) { const p = R.phrases[id]; if (p.before.known === p.after.known && p.before.target === p.after.target) delete R.phrases[id]; }
  }
  console.log(`${COURSE} ${SWEEP} — ${log.mode}: ${Object.keys(R.legos).length} LEGO rows (${Object.values(R.legos).filter((l) => !l.componentsOnly).length} re-texted), ${Object.keys(R.phrases).length} phrases, ${Object.keys(R.deletes).length} deletes, ${D.HELD.length} held`);
  console.log(`PROBLEMS (${g.probs.length}):\n  ${g.probs.join('\n  ')}`);
  console.log(`NOTES (${g.notes.length}):\n  ${g.notes.join('\n  ')}`);
  console.log(`ZUT on touched rows (${g.zut.length}):\n  ${g.zut.join('\n  ')}`);
  Object.assign(log, { guards: g });
  if (process.env.AUDIO_DRY === '1') {
    const slots = await staleSlots(pg, R, { planned: true });
    log.slots = [];
    let chars = 0, lib = 0, would = 0, refused = 0;
    const seen = new Map();
    for (const s of slots) {
      const key = `${s.slot}\u0000${s.text}\u0000${s.oldClip?.voice || ''}`;
      let d = seen.get(key);
      if (!d) { d = await render(bodyFor(s, true)); seen.set(key, d); if (!d.ok) refused++; else if (d.source === 'would-render') { would++; chars += d.wouldSpendChars || s.text.length; } else lib++; }
      log.slots.push({ ...s, dry: { ok: d.ok, source: d.source, code: d.code, chars: d.wouldSpendChars, error: d.error } });
    }
    console.log(`AUDIO (dry run, nothing rendered): ${slots.length} slots (${slots.filter((s) => s.component).length} component), ${seen.size} distinct requests — library ${lib}, would render ${would} (${chars} chars), refused ${refused}`);
  }
  fs.writeFileSync(path.join(outDir, `${SWEEP}-${log.mode.toLowerCase()}.json`), JSON.stringify({ log, R }, null, 2));
  if (log.mode !== 'APPLY') { await pg.end(); return; }
  if (g.probs.length) { console.log('REFUSING TO APPLY: problems above'); await pg.end(); process.exit(2); }
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  await applyContent(pg, supabase, R, L, log);
  fs.writeFileSync(path.join(outDir, `${SWEEP}-applied.json`), JSON.stringify({ log, R }, null, 2));
  console.log(`APPLIED. seeds ${log.touchedSeeds.length}, unapproved ${log.unapproved.length}, relinked same-voice ${log.relinked.length}, old clip kept ${log.restored.length}, audioPass ${JSON.stringify(log.audioPass)}`);
  await pg.end();
}
module.exports = { textChanged, norm, containsSeq, stripBrackets, introFor, hasBracket };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
