#!/usr/bin/env node
'use strict';
// tools/course-optimization/fra-seed-18-we-want-to-meet-2026-10-14.cjs  (job #449)
//
// KAI'S RULING, 2026-10-14 (evidence job #441·Q, d/3cd81832): fra_for_eng seed 18
//   "we want to meet at six o'clock this evening | nous voulons nous rencontrer à six heures ce soir"
// taught "to meet | nous rencontrer". The second "nous" is the reflexive "each other", which the English does not
// mark, so a learner prompted "to meet" says "nous rencontrer" everywhere (canon K40: the form carries its selecting
// context INSIDE the LEGO). The LEGO becomes "we want to meet | nous voulons nous rencontrer".
//
// SHAPE. Popty's edit door has no LEGO delete or retire op, and a LEGO is never deleted (Kai, 2026-09-23), so
// S0018L02 GROWS IN PLACE over S0018L01 — the K39 shape (ita S0072L02 contains S0072L01) — and L01 "we want |
// nous voulons" stays as the smaller piece taught first (L13). Components: "we want | nous voulons" + "meet |
// rencontrer": the bare "to meet | nous rencontrer" tile is exactly the pair Kai ruled out, so it is not re-offered.
//
// PHRASES (P17, O12, K40 — every row checked by round against the dump in checkPlan):
//   - L02's basket keeps every row that already said "we want to meet"; rows that drilled the bare "nous rencontrer"
//     or "he/she wants to meet us" (object "nous", untaught "us") are rewritten to contain the whole LEGO; B01 "to
//     meet | nous rencontrer" would become an exact duplicate of B02, so it is deleted (K42).
//   - Later rows that prompted the bare "to meet … | nous rencontrer …" (L03/L04 of seed 18, S0023L03B04) or
//     "wants to meet us | veut nous rencontrer" before "us" is taught (S0018L03U05, S0018L04U05, S0020L01U06) are
//     rewritten from vocabulary taught by their round, each still containing its own LEGO.
//   - HELD for Kai: seed 154 "where do you want to meet on Saturday night? | où voulez-vous nous rencontrer samedi
//     soir?" and its five twins. The French says "meet US"; its "nous rencontrer" had no LEGO of its own and leaned
//     on the old S0018L02. Fixing it changes the seed (Kai's call, L25).
//
// Writes go ONLY through Popty's edit-batch door; audio ONLY through tools/audio/render.cjs (POST /api/audio/render).
// Reads come from the sanctioned dump (course-dump-readonly-2026-10-14.cjs). No SQL here.
//
//   node tools/course-optimization/fra-seed-18-we-want-to-meet-2026-10-14.cjs check <dump.json>
//   node tools/course-optimization/fra-seed-18-we-want-to-meet-2026-10-14.cjs ops <dump.json> --out ops.json        # text edits
//   node tools/course-optimization/fra-seed-18-we-want-to-meet-2026-10-14.cjs renders <dump.json> [--apply] --out map.json
//   node tools/course-optimization/fra-seed-18-we-want-to-meet-2026-10-14.cjs links <dump.json> --audio map.json --out links.json

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const JOB = '#449';
const COURSE = 'fra_for_eng';
const P = (s) => `${COURSE}:${s}`;

const LEGO = {
  id: 'S0018L02',
  from: { known: 'to meet', target: 'nous rencontrer' },
  to: { known: 'we want to meet', target: 'nous voulons nous rencontrer',
    components: [{ known: 'we want', target: 'nous voulons' }, { known: 'meet', target: 'rencontrer' }] },
  intro: "The French for: 'we want to meet', is:",
};

// [phrase suffix, from known, from target, to known, to target]
const REWRITES = [
  // S0018L02's own basket (round 57)
  ['S0018L02B04', 'to meet tomorrow', 'nous rencontrer demain', 'we want to meet very often', 'nous voulons nous rencontrer très souvent'],
  ['S0018L02B05', 'to meet later on', 'nous rencontrer plus tard', 'we want to meet a little later on', 'nous voulons nous rencontrer un peu plus tard'],
  ['S0018L02U07', 'he wants to meet us later on', 'il veut nous rencontrer plus tard', 'we want to meet tomorrow, not today', "nous voulons nous rencontrer demain, pas aujourd'hui"],
  ['S0018L02U08', 'she wants to meet us tomorrow', 'elle veut nous rencontrer demain', "I'm sure we want to meet tomorrow", 'je suis sûr que nous voulons nous rencontrer demain'],
  // knock-on: bare "to meet | nous rencontrer" and "wants to meet us" prompts under other LEGOs
  ['S0018L03B02', "to meet at six o'clock", 'nous rencontrer à six heures', "tomorrow at six o'clock", 'demain à six heures'],
  ['S0018L03U05', "she wants to meet us at six o'clock", 'elle veut nous rencontrer à six heures', "she wants to speak French at six o'clock", 'elle veut parler français à six heures'],
  ['S0018L04B02', "to meet at six o'clock this evening", 'nous rencontrer à six heures ce soir', "at six o'clock this evening", 'à six heures ce soir'],
  ['S0018L04U05', 'she wants to meet us this evening', 'elle veut nous rencontrer ce soir', 'she wants to try this evening', 'elle veut essayer ce soir'],
  ['S0020L01U06', 'you want to meet us this evening', 'tu veux nous rencontrer ce soir', 'you want to come back this evening', 'tu veux revenir ce soir'],
  ['S0023L03B04', 'to meet soon', 'nous rencontrer bientôt', 'to speak French soon', 'parler français bientôt'],
];
// exact duplicate of S0018L02B02 once the LEGO grows (K42: duplicates are deleted, not rewritten)
const DELETES = [['S0018L02B01', 'to meet', 'nous rencontrer']];

const HELD = {
  seed154: {
    rows: ['seed 154', 'S0154L01U07', 'S0154L02U09', 'S0155L03U07', 'S0156L02U06', 'S0157L03U07'],
    why: '"where do you want to meet …? | où voulez-vous nous rencontrer …?" — the French says "meet us"; the English does not (K26), and since S0018L02 grew no LEGO teaches "meet = nous rencontrer". Proposed: seed 154 → "where do you want to meet us on Saturday night? | où voulez-vous nous retrouver samedi soir ?" (S0138L03 already teaches "to meet us | nous retrouver", P28), twins the same. A seed change is Kai\'s call (L25).',
  },
};

// ── checks ──
const norm = (s) => String(s || '').toLowerCase().replace(/[’]/g, "'").replace(/\b(qu|j|l|d|s|n|m|t|c)'/g, "$1' ")
  .replace(/[.,!?;:"«»“”¿¡]+/g, ' ').split(/\s+/).filter(Boolean);
const key = (s) => norm(s).join(' ');
function containsWords(hay, needle) {
  const h = norm(hay);
  for (const w of norm(needle)) { const i = h.indexOf(w); if (i < 0) return false; h.splice(i, 1); }
  return true;
}
/** Words (either side) taught by LEGOs and their components up to and including `round`. */
function taught(dump, round) {
  const t = new Set(), k = new Set();
  for (const l of dump.legos) {
    if (l.round_index == null || l.round_index > round) continue;
    norm(l.target_text).forEach((w) => t.add(w)); norm(l.known_text).forEach((w) => k.add(w));
    for (const c of l.components || []) { norm(c.target).forEach((w) => t.add(w)); norm(c.known).forEach((w) => k.add(w)); }
  }
  return { t, k };
}

/** The K40 finding this job removes: a delivered prompt that teaches the reflexive "nous rencontrer" without the
 *  "nous voulons" that selects it (a bare "to meet …" or a LEGO/phrase whose target is nous rencontrer alone). */
function bareReflexiveMeet(rows) {
  return rows.filter((r) => r.role !== 'component' && /(^|\s)nous rencontrer/.test(key(r.target)) && !/nous voulons nous rencontrer/.test(key(r.target))
    && !/\bus\b/.test(key(r.known)) && !/voulez-vous|voulez vous/.test(key(r.target)));
}

/** Apply the plan to a dump (pure), returning the post-state legos/phrases. */
function applyPlan(dump) {
  const legos = dump.legos.map((l) => (l.lego_id === LEGO.id ? { ...l, known_text: LEGO.to.known, target_text: LEGO.to.target, components: LEGO.to.components } : l));
  const del = new Set(DELETES.map(([s]) => P(s)));
  const rw = new Map(REWRITES.map(([s, , , k, t]) => [P(s), [k, t]]));
  const phrases = dump.phrases.filter((p) => !del.has(p.id)).map((p) => (rw.has(p.id) ? { ...p, known_text: rw.get(p.id)[0], target_text: rw.get(p.id)[1] } : p));
  return { ...dump, legos, phrases };
}

const promptRows = (d) => [
  ...d.legos.map((l) => ({ id: l.lego_id, role: 'lego', known: l.known_text, target: l.target_text })),
  ...d.phrases.map((p) => ({ id: p.id, role: p.phrase_role, known: p.known_text, target: p.target_text })),
];

function checkPlan(dump) {
  const problems = [];
  const L = dump.legos.find((l) => l.lego_id === LEGO.id);
  if (!L) return [`${LEGO.id} not in dump`];
  if (key(L.known_text) !== key(LEGO.from.known) && key(L.known_text) !== key(LEGO.to.known)) problems.push(`${LEGO.id} drifted: "${L.known_text}"`);
  const seed = dump.seeds.find((s) => s.seed_number === 18);
  if (!key(seed.target_text).includes(key(LEGO.to.target)) || !key(seed.known_text).includes(key(LEGO.to.known))) problems.push('LEGO is not a slice of seed 18 (L26)');
  const syl = norm(LEGO.to.target).join(' ').match(/[aeiouyéèêàâîïôûœ]+/g).length;
  if (syl > 8 + 2) problems.push(`syllable estimate ${syl} over the L3 cap`); // rough vowel-group count; French mute e's inflate it
  for (const [s, fk, ft] of [...REWRITES, ...DELETES]) {
    const p = dump.phrases.find((x) => x.id === P(s));
    if (!p) { problems.push(`${s} not in dump`); continue; }
    if (p.known_text !== fk || p.target_text !== ft) problems.push(`${s} drifted: "${p.known_text} | ${p.target_text}"`);
  }
  const post = applyPlan(dump);
  const roundOf = new Map(post.legos.map((l) => [`${l.seed_number}:${l.lego_index}`, { round: l.round_index, target: l.target_text }]));
  for (const [s, , , k, t] of REWRITES) {
    const p = post.phrases.find((x) => x.id === P(s));
    const owner = roundOf.get(`${p.seed_number}:${p.lego_index}`);
    if (!containsWords(t, owner.target)) problems.push(`${s}: "${t}" does not contain its LEGO "${owner.target}" (P17)`);
    const T = taught(post, owner.round);
    const ut = norm(t).filter((w) => !T.t.has(w)), uk = norm(k).filter((w) => !T.k.has(w));
    if (ut.length || uk.length) problems.push(`${s}: untaught by round ${owner.round}: ${[...ut, ...uk].join(',')}`);
  }
  for (const p of post.phrases.filter((x) => x.seed_number === 18 && x.lego_index === 2 && x.phrase_role !== 'component'))
    if (!containsWords(p.target_text, LEGO.to.target)) problems.push(`${p.id}: "${p.target_text}" does not contain the grown LEGO (P17)`);
  // ZUT: no new prompt may meet an existing prompt with a different target
  const byKnown = new Map();
  for (const r of promptRows(post).filter((r) => r.role !== 'component')) {
    const k = key(r.known); if (!byKnown.has(k)) byKnown.set(k, new Map());
    byKnown.get(k).set(key(r.target), r.id);
  }
  for (const k of [LEGO.to.known, ...REWRITES.map((r) => r[3])]) if (byKnown.get(key(k)).size > 1) problems.push(`ZUT: "${k}" → ${[...byKnown.get(key(k)).keys()].join(' / ')}`);
  // exact duplicates inside one basket
  const seen = new Map();
  for (const p of post.phrases.filter((x) => x.phrase_role !== 'component')) {
    const b = `${p.seed_number}:${p.lego_index}|${key(p.known_text)}|${key(p.target_text)}`;
    if (seen.has(b) && [...REWRITES.map((r) => P(r[0]))].some((id) => id === p.id || id === seen.get(b))) problems.push(`duplicate in basket: ${p.id} = ${seen.get(b)}`);
    seen.set(b, p.id);
  }
  const left = bareReflexiveMeet(promptRows(post)).filter((r) => !HELD.seed154.rows.some((h) => r.id.endsWith(h)));
  for (const r of left) problems.push(`still bare reflexive: ${r.id} "${r.known} | ${r.target}"`);
  return problems;
}

// ── edit-batch bodies ──
function textOps(dump) {
  const L = dump.legos.find((l) => l.lego_id === LEGO.id);
  const ops = [{ op: 'lego.update', lego_id: LEGO.id, expect: { known_text: L.known_text, target_text: L.target_text },
    set: { known_text: LEGO.to.known, target_text: LEGO.to.target, components: LEGO.to.components } }];
  for (const [s, fk, ft, k, t] of REWRITES) ops.push({ op: 'phrase.update', phrase_id: P(s), expect: { known_text: fk, target_text: ft }, set: { known_text: k, target_text: t } });
  for (const [s, fk, ft] of DELETES) ops.push({ op: 'phrase.delete', phrase_id: P(s), expect: { known_text: fk, target_text: ft } });
  return ops;
}
/** Every clip the edit needs: the LEGO's three slots and each rewritten phrase's three slots. */
function slotRequests() {
  const out = [{ target: 'lego', lego_id: LEGO.id, role: 'known', text: LEGO.to.known }, { target: 'lego', lego_id: LEGO.id, role: 'target1', text: LEGO.to.target },
    { target: 'lego', lego_id: LEGO.id, role: 'target2', text: LEGO.to.target }];
  for (const [s, , , k, t] of REWRITES) out.push({ target: 'phrase', phrase_id: P(s), role: 'known', text: k }, { target: 'phrase', phrase_id: P(s), role: 'target1', text: t }, { target: 'phrase', phrase_id: P(s), role: 'target2', text: t });
  return out;
}
/** The grown LEGO says exactly what S0018L02B02 already says, so its three slots take B02's live clips (no render). */
const LEGO_CLIPS_FROM = 'S0018L02B02';
function legoReuseMap(dump) {
  const b = dump.phrases.find((p) => p.id === P(LEGO_CLIPS_FROM));
  if (!b || b.known_text !== LEGO.to.known || b.target_text !== LEGO.to.target) throw new Error(`${LEGO_CLIPS_FROM} no longer says the grown LEGO`);
  return { [`known|${LEGO.to.known}`]: b.known_audio_id, [`target1|${LEGO.to.target}`]: b.target1_audio_id, [`target2|${LEGO.to.target}`]: b.target2_audio_id };
}
function linkOps(audioMap, dump) {
  audioMap = { ...audioMap, ...(dump ? legoReuseMap(dump) : {}) };
  return slotRequests().filter((r) => audioMap[`${r.role}|${r.text}`]).map((r) => ({ op: 'audio.link', target: r.target, ...(r.lego_id ? { lego_id: r.lego_id } : { phrase_id: r.phrase_id }), slot: r.role, audio_id: audioMap[`${r.role}|${r.text}`] }));
}

module.exports = { legoReuseMap, LEGO, REWRITES, DELETES, HELD, checkPlan, applyPlan, bareReflexiveMeet, promptRows, textOps, slotRequests, linkOps, containsWords };

if (require.main === module) {
  const [cmd, dumpPath, ...rest] = process.argv.slice(2);
  const opt = (f) => { const i = rest.indexOf(f); return i >= 0 ? rest[i + 1] : undefined; };
  if (!cmd || !dumpPath) { console.error('usage: check|ops|renders|links <dump.json> [--audio map.json] [--out file] [--apply]'); process.exit(1); }
  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
  if (cmd === 'check') {
    const pr = checkPlan(dump); console.log(pr.length ? pr.join('\n') : 'plan clean'); process.exit(pr.length ? 2 : 0);
  } else if (cmd === 'ops') {
    const ops = textOps(dump); fs.writeFileSync(opt('--out') || 'ops.json', JSON.stringify({ ops }, null, 1)); console.log(`${ops.length} text ops`);
  } else if (cmd === 'links') {
    const ops = linkOps(JSON.parse(fs.readFileSync(opt('--audio'), 'utf8')), dump); fs.writeFileSync(opt('--out') || 'links.json', JSON.stringify({ ops }, null, 1)); console.log(`${ops.length} audio links of ${slotRequests().length} slots`);
  } else if (cmd === 'renders') {
    const apply = rest.includes('--apply');
    const reqs = slotRequests().filter((r) => r.target !== 'lego').filter((r, i, a) => a.findIndex((x) => x.role === r.role && x.text === r.text) === i);
    const intro = rest.includes('--intro');
    if (intro) reqs.push({ role: 'presentation', text: LEGO.intro, lego_id: LEGO.id });
    const map = {}; let chars = 0, refused = 0;
    for (const r of reqs) {
      const args = [path.join(__dirname, '..', 'audio', 'render.cjs'), '--course', COURSE, '--role', r.role, '--text', r.text, '--purpose', `${JOB} fra seed 18 we want to meet (K40): ${r.lego_id || r.phrase_id}`, '--job', JOB];
      if (r.role === 'presentation') args.push('--lego', r.lego_id);
      if (!apply) args.push('--dry-run');
      const res = spawnSync('node', args, { encoding: 'utf8', env: { ...process.env, AGENT_ID: 'kai-watson-449' } });
      let out = {}; try { out = JSON.parse(res.stdout); } catch (_) { out = { ok: false, error: (res.stdout || res.stderr || '').slice(-300) }; }
      if (!out.ok) { refused++; console.log(`REFUSED ${r.role} "${r.text}": ${JSON.stringify(out).slice(0, 300)}`); continue; }
      chars += out.charsSpent || out.wouldSpendChars || 0;
      if (out.audioId) map[`${r.role}|${r.text}`] = out.audioId;
      console.log(`${out.source}${out.dryRun ? ' (dry)' : ''} ${r.role} "${r.text}" ${out.charsSpent || out.wouldSpendChars || 0} chars ${out.audioId || ''}${out.legoLinked ? ' (bound to LEGO)' : ''}`);
    }
    console.log(`TOTAL ${apply ? 'spent' : 'would spend'} ${chars} chars over ${reqs.length} clips, ${refused} refused`);
    if (opt('--out')) fs.writeFileSync(opt('--out'), JSON.stringify(map, null, 1));
  }
}
