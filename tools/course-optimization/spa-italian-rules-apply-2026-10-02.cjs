#!/usr/bin/env node
'use strict';
// tools/course-optimization/spa-italian-rules-apply-2026-10-02.cjs — job #356, spa_for_eng ONLY.
//
// Kai, 2026-10-02: apply to Spanish what is CLEARLY the same as what he ruled for Italian, where the fix is obvious
// and breaks no other canon rule; everything else is HELD and listed. Input: the read-only scan d/bad9e2b0 (#352),
// every row re-verified here against the live DB before it is written.
//
//   A  P26  every seed sentence in a played basket — USE row under the seed's own last new LEGO it contains (else nearest
//           earlier / earliest later), the seed's own clips linked. Same planner as ita #635·I, with ¿ ¡ stripped by the
//           normaliser (the Italian one keeps them, which on Spanish lists "¿Podrías…" vs "podrías…" as a ZUT clash).
//   B  K41  a target infinitive takes "to" on the known side — LEGO, its own tiles, every BUILD that opens on an infinitive.
//   C  P27 / K14  untaught form in a phrase → rewritten from taught material (tú dropped where Spanish drops it; early
//           enclitic -lo / esto → eso, the English "it/this" → "that" to match).
//   D  K32  formal phrases close on sir/madam on BOTH sides (señor/señora), the seed's honorific; 651/653 held.
//   F  one-off grammar errors whose correct form is taught before the row (no pienso que pueda; no sé; usted placed).
//
//   node tools/course-optimization/spa-italian-rules-apply-2026-10-02.cjs          # dry run: plan + every guard
//   APPLY=1 node …                                                                   # content, one transaction
//   AUDIO=1 node …                                                                   # link free library clips; dry-run the rest
//   RENDER=1 AUDIO=1 node …                                                          # ONLY once Kai has approved the spend
//
// Guards (a failing row is HELD, never written): ZUT strict count (audit-phrase-zut.cjs auditRows) must not rise —
// any edit whose new known lands in a new strict clash is dropped and re-checked until stable; no exact LEGO duplicate;
// every non-component row under an edited LEGO still contains it (P17, "to" ignored on the known side as K41 allows);
// every target word of an edited row is taught (LEGO / tile) at or before its seed (K21).
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'spa_for_eng';
const JOB = '#356';
const SWEEP = 'spa-italian-rules-apply-2026-10-02';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = 'Kai 2026-10-02 (job #356): apply to spa_for_eng only what is clearly the same as his Italian rulings — P26 (#635·I), K41 (#936·I/#937·I), P27/K14, K32 (#639·I), one-off grammar with the correct form taught — holding everything else';
const CAST = { known: ['xai_eve', 'eve'], target1: ['azure_es-ES-ElviraNeural', 'es-ES-ElviraNeural'], target2: ['azure_es-ES-AlvaroNeural', 'es-ES-AlvaroNeural'], presentation: ['xai_eve', 'eve'] };

// ── pure rules (the test exercises these) ─────────────────────────────────────────────────────────────
/** Spanish-safe normaliser: the Italian one leaves ¿ ¡ on, so "¿tienes" never equals "tienes". */
const norm = (s) => String(s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[¿¡.,!?;:"«»“”—–]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
function containsWords(hay, needle, ignore = []) {
  const h = words(hay);
  for (const w of words(needle)) { if (ignore.includes(w)) continue; const i = h.indexOf(w); if (i < 0) return false; h.splice(i, 1); }
  return true;
}
const containsSeq = (hay, needle) => ` ${norm(hay)} `.includes(` ${norm(needle)} `);
/** K41: "open the door" → "to open the door"; a capital stays a capital ("Say that" → "To say that"). */
function withTo(known) {
  const k = String(known).trim();
  if (/^to\b/i.test(k)) return k;
  return (/^[A-Z]/.test(k) ? 'To ' : 'to ') + k.charAt(0).toLowerCase() + k.slice(1);
}
/** K32: close a phrase on its honorific, on one side. Keeps a trailing ? and the opening ¿. */
function withHonorific(text, hon, side) {
  const t = String(text).trim();
  const m = /^(.*?)([?.!]*)$/.exec(t);
  const body = m[1].replace(/,\s*$/, ''), end = m[2];
  const h = side === 'known' ? (hon === 'sir' ? 'sir' : 'madam') : (hon === 'sir' ? 'señor' : 'señora');
  if (new RegExp(`\\b${h}$`, 'i').test(body)) return t;
  return side === 'known' ? `${body} ${h}${end}` : `${body}, ${h}${end}`;
}
const introFrame = (known, demo) => (demo ? `The Spanish for: '${known}', as in — '${demo}', is:` : `The Spanish for: '${known}', is:`);
function demoOf(intro) { const m = /as in — '(.*)', is:$/.exec(intro || ''); return m ? m[1] : null; }

// ── B: K41 ────────────────────────────────────────────────────────────────────────────────────────────
// LEGOs re-glossed (hand-checked: the target IS an infinitive, nothing inside the unit governs a bare one, the
// English stays natural). 382 L03 is the not-new twin of 314 L01 and moves with it so the pair stays identical.
const K41_LEGOS = ['S0062L01', 'S0098L02', 'S0136L03', 'S0161L02', 'S0171L02', 'S0269L01', 'S0314L01', 'S0382L03', 'S0334L02', 'S0351L01',
  'S0381L02', 'S0403L03', 'S0447L03', 'S0466L02', 'S0471L02', 'S0490L02', 'S0499L03', 'S0499L04', 'S0500L02', 'S0510L02', 'S0529L02',
  'S0545L02', 'S0645L01', 'S0660L01',
  // the scan's predicted duplicates / ZUT clashes go through the guards, which hold them if the prediction is right
  'S0150L02', 'S0211L04', 'S0496L02', 'S0504L02', 'S0174L02', 'S0630L01'];
const K41_HELD = {
  'gerund glosses (K41 case c, unruled)': ['S0026L03', 'S0027L02', 'S0046L02', 'S0055L01', 'S0503L02', 'S0508L03', 'S0523L02', 'S0536L02', 'S0567L02', 'S0576L01'],
  'L26: the LEGO word is not the seed\'s (play/playing, manage it, arrive)': ['S0098L03', 'S0173L02', 'S0270L02'],
  '"to send to her" is not natural English; the seed says "send her"': ['S0357L03'],
};
// BUILDs that open on an infinitive and are not under a held LEGO; generated live, minus these:
const K41_BUILD_EXCLUDE = new Set(['S0329L01B03', 'S0426L03B02', 'S0046L02B04', 'S0134L03B07', 'S0232L01B01', 'S0457L03B01', 'S0457L03B02', 'S0457L03B03', 'S0629L03B01']);
const K41_BUILD_OVERRIDE = { S0450L03B04: 'to be able to catch', S0589L03B02: 'to see the last bus' };
const INFINITIVE = /^[a-záéíóúñ]+(ar|er|ir)(me|te|lo|la|le|nos|os|los|las|se)?$/i;
const NOT_INFINITIVE = new Set(['primer', 'fuerte', 'parte', 'azúcar', 'mujer', 'lugar', 'ayer', 'mejor', 'señor']);
const opensOnInfinitive = (target) => { const w = norm(target).split(' ')[0] || ''; return INFINITIVE.test(w) && !NOT_INFINITIVE.has(w); };

// ── C / F: hand rewrites, each checked against the live text before it is written ─────────────────────
const REWRITES = {
  // C — tú is never taught; subject tú dropped (Spanish is pro-drop). "como tú / que tú / antes que tú" are held.
  S0148L01U04: { rule: 'C K14 tú', to: { target: 'Eres muy paciente' } },
  S0203L01B03: { rule: 'C K14 tú', to: { target: '¿Qué harías?' } },
  S0203L01U11: { rule: 'C K14 tú', to: { target: '¿qué harías en este momento?' } },
  S0153L03U07: { rule: 'C K14 tú', to: { target: 'Ella lo dijo de la misma manera que lo dijiste' } },
  // C — P27: -lo enclitics before the seed that teaches them → hacer/decir/explicar eso, English "it" → "that"
  S0105L01U08: { rule: 'C P27 hacerlo<173', to: { known: "He didn't know how to do that", target: 'Él no sabía cómo hacer eso' } },
  S0129L03B04: { rule: 'C P27 hacerlo<173', to: { known: 'I can do that', target: 'Puedo hacer eso' } },
  S0135L01U05: { rule: 'C P27 hacerlo<173', to: { known: 'I do not know if working together with them is going to work better than doing that alone', target: 'No sé si trabajar juntos con ellos va a funcionar mejor que hacer eso solo' } },
  S0152L02U12: { rule: 'C P27 hacerlo<173', to: { known: 'I think doing that differently will make it easier to understand', target: 'Pienso que hacer eso de manera diferente va a ser más fácil de entender' } },
  S0042L03U07: { rule: 'C P27 explicarlo (never taught)', to: { known: 'I was starting to explain that last night', target: 'Estaba empezando a explicar eso anoche' } },
  S0205L01U08: { rule: 'C P27 explicarlo (never taught)', to: { known: "I've forgotten how to explain that", target: 'He olvidado cómo explicar eso' } },
  S0061L02U02: { rule: 'C P27 decirlo<208', to: { known: 'I need to remember that so I can say that later', target: 'Necesito recordar eso para poder decir eso más tarde' } },
  // C — esto is first taught at seed 92; eso is taught, so this → that
  S0051L01B04: { rule: 'C K14 esto<92', to: { known: 'I enjoy doing that here', target: 'Disfruto haciendo eso aquí' } },
  S0051L01U03: { rule: 'C K14 esto<92', to: { known: 'I enjoy doing that with everyone else here', target: 'Disfruto haciendo eso con todos los demás aquí' } },
  S0051L01U04: { rule: 'C K14 esto<92', to: { known: "I don't enjoy doing that at the moment", target: 'No disfruto haciendo eso en este momento' } },
  S0051L03U04: { rule: 'C K14 esto<92', to: { known: 'I want to try to explain that to my friends', target: 'Quiero intentar explicar eso a mis amigos' } },
  S0062L01U10: { rule: 'C K14 esto<92', to: { known: 'I want to try to explain that and help you at the same time', target: 'Quiero intentar explicar eso y ayudarte al mismo tiempo' } },
  S0063L01U03: { rule: 'C K14 esto<92', to: { known: "I want to know if you are sure you don't mind helping me with that", target: 'Quiero saber si estás seguro de que no te importa ayudarme con eso' } },
  // F — one-off grammar, correct form taught before the row
  S0062L01U09: { rule: 'F mood: no pienso que + subjunctive (pueda, taught at 7)', to: { target: 'No pienso que pueda recordar todo y ayudarte al mismo tiempo' } },
  S0652L01B03: { rule: 'F person: "I don\'t know" is no sé, not no sabemos', to: { target: 'no sé qué necesita' } },
  S0639L02U02: { rule: 'F + D: "…muy bien, usted" is not Spanish — usted placed as subject, sir closes it', to: { known: "I think you're doing very well sir", target: 'pienso que usted lo está haciendo muy bien, señor' } },
};

// ── D: K32 honorific closes the phrase on both sides ('both' | 'target' = English already has it) ────────
const K32 = {
  S0639L02B03: ['sir', 'both'], S0639L02U03: ['sir', 'both'], S0639L02U04: ['sir', 'both'],
  S0642L02B02: ['madam', 'both'], S0642L02U02: ['madam', 'both'], S0642L02U04: ['madam', 'both'],
  S0644L01B01: ['sir', 'both'], S0644L01U05: ['sir', 'both'],
  S0645L01B01: ['madam', 'both'], S0645L01U03: ['madam', 'both'], S0645L01U04: ['madam', 'both'], S0645L01U05: ['madam', 'both'], S0645L01U06: ['madam', 'both'],
  S0646L01B01: ['sir', 'target'], S0646L01B02: ['sir', 'target'], S0646L01B03: ['sir', 'target'], S0646L01U03: ['sir', 'target'], S0646L01U04: ['madam', 'target'], S0646L01U05: ['madam', 'target'], S0646L01U06: ['sir', 'both'],
  S0647L01B02: ['madam', 'both'], S0647L01B03: ['madam', 'both'], S0647L01U03: ['madam', 'both'],
  S0648L01B01: ['madam', 'both'], S0648L01B02: ['madam', 'both'], S0648L01B03: ['madam', 'both'], S0648L01U03: ['madam', 'both'], S0648L01U04: ['madam', 'both'], S0648L01U05: ['madam', 'both'], S0648L01U06: ['madam', 'both'],
  S0649L01B02: ['sir', 'both'], S0649L01B03: ['sir', 'both'], S0649L01U02: ['sir', 'both'], S0649L01U03: ['sir', 'both'], S0649L01U04: ['sir', 'both'], S0649L01U05: ['sir', 'both'],
  S0650L01U05: ['madam', 'both'],
  S0652L01B01: ['sir', 'both'], S0652L01U03: ['sir', 'both'], S0652L01U04: ['sir', 'both'], S0652L01U05: ['sir', 'both'],
  S0654L01B01: ['sir', 'both'], S0654L01B02: ['sir', 'both'], S0654L01B03: ['sir', 'both'], S0654L01U03: ['sir', 'both'], S0654L01U04: ['sir', 'both'], S0654L01U05: ['sir', 'both'],
  S0655L01B01: ['madam', 'both'], S0655L01B02: ['madam', 'both'], S0655L01B03: ['madam', 'both'], S0655L01U03: ['madam', 'target'], S0655L01U04: ['sir', 'target'], S0655L01U05: ['madam', 'target'],
};

// ── A: P26 planner (ita #635·I, Spanish normaliser) ───────────────────────────────────────────────────
const pairKey = (k, t) => `${norm(k)}|${norm(t)}`;
const sentenceContainsLego = (seed, lego) => containsWords(seed.known_text, lego.known_text) && containsWords(seed.target_text, lego.target_text);
function legoPosition(phrase, lego) { const p = norm(phrase), l = norm(lego); if (p === l) return null; if (p.startsWith(l + ' ')) return 'start'; if (p.endsWith(' ' + l)) return 'end'; return 'middle'; }
function chooseHome(seed, legos, wordTaught) {
  const contained = legos.filter((l) => l.is_new && sentenceContainsLego(seed, l));
  const own = contained.filter((l) => l.seed_number === seed.seed_number).sort((a, b) => b.lego_index - a.lego_index)[0];
  if (own) return { lego: own, why: 'own last new LEGO' };
  const untaughtAt = (n) => [...new Set(words(seed.known_text))].filter((w) => wordTaught(w, 'known') > n).concat([...new Set(words(seed.target_text))].filter((w) => wordTaught(w, 'target') > n));
  const earlier = contained.filter((l) => l.seed_number < seed.seed_number).sort((a, b) => b.seed_number - a.seed_number || b.lego_index - a.lego_index);
  const rejected = [];
  for (const l of earlier) { const u = untaughtAt(l.seed_number); if (!u.length) return { lego: l, why: 'nearest earlier new LEGO' }; rejected.push(`${l.lego_id}: ${u.join(',')} untaught by seed ${l.seed_number}`); }
  const later = contained.filter((l) => l.seed_number > seed.seed_number).sort((a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index)[0];
  if (later) return { lego: later, why: 'earliest later new LEGO' };
  const ownAll = legos.filter((l) => l.seed_number === seed.seed_number).map((l) => `${l.lego_id}${l.is_new ? '' : ' (not new)'} "${l.known_text} | ${l.target_text}"`);
  return { lego: null, why: `no new LEGO whose pair the seed contains — its LEGOs: ${ownAll.join('; ')}` };
}
function planP26(db) {
  const { seeds, legos, phrases } = db;
  const first = { known: new Map(), target: new Map() };
  const feed = (side, n, text) => { for (const w of new Set(words(text))) { const m = first[side]; if (!m.has(w) || m.get(w) > n) m.set(w, n); } };
  for (const s of seeds) { feed('known', s.seed_number, s.known_text); feed('target', s.seed_number, s.target_text); }
  for (const l of legos) { feed('known', l.seed_number, l.known_text); feed('target', l.seed_number, l.target_text); }
  for (const p of phrases) { feed('known', p.seed_number, p.known_text); feed('target', p.seed_number, p.target_text); }
  const wordTaught = (w, side) => (first[side].has(w) ? first[side].get(w) : Infinity);
  const legoBy = Object.fromEntries(legos.map((l) => [`${l.seed_number}:${l.lego_index}`, l]));
  const nonComp = phrases.filter((p) => p.phrase_role !== 'component').map((p) => ({ ...p, is_new: legoBy[`${p.seed_number}:${p.lego_index}`]?.is_new, lego_id: legoBy[`${p.seed_number}:${p.lego_index}`]?.lego_id }));
  const knownIndex = new Map();
  const index = (k, t, id) => { const K = norm(k); if (!knownIndex.has(K)) knownIndex.set(K, new Map()); if (!knownIndex.get(K).has(norm(t))) knownIndex.get(K).set(norm(t), id); };
  for (const p of nonComp) index(p.known_text, p.target_text, p.id.replace(/^.*:/, ''));
  for (const l of legos) index(l.known_text, l.target_text, l.lego_id);
  const perLego = new Map(); for (const p of phrases) { const k = legoBy[`${p.seed_number}:${p.lego_index}`]?.lego_id; if (!perLego.has(k)) perLego.set(k, []); perLego.get(k).push(p); }
  const rows = [], listed = []; let covered = 0;
  for (const s of seeds) {
    const same = nonComp.filter((p) => pairKey(p.known_text, p.target_text) === pairKey(s.known_text, s.target_text));
    if (same.some((p) => p.is_new)) { covered++; continue; }
    const others = knownIndex.get(norm(s.known_text));
    const clash = others ? [...others.entries()].filter(([t]) => t !== norm(s.target_text)) : [];
    if (clash.length) { listed.push({ seed: s.seed_number, known: s.known_text, target: s.target_text, why: `ZUT (P16): "${s.known_text}" already stands over ${clash.map(([t, id]) => `"${t}" (${id})`).join(', ')}` }); continue; }
    const home = chooseHome(s, legos, wordTaught);
    if (!home.lego) { listed.push({ seed: s.seed_number, known: s.known_text, target: s.target_text, why: home.why }); continue; }
    const existing = perLego.get(home.lego.lego_id) || [];
    let maxU = 0; for (const r of existing) { const m = /U(\d+)$/.exec(r.id); if (m) maxU = Math.max(maxU, +m[1]); }
    const maxPos = existing.reduce((m, r) => Math.max(m, r.position || 0), 0);
    const id = `${home.lego.lego_id}U${String(maxU + 1).padStart(2, '0')}`;
    rows.push({ seed: s.seed_number, id, position: maxPos + 1, lego: home.lego, why: home.why, known: s.known_text, target: s.target_text, lego_position: legoPosition(s.known_text, home.lego.known_text), audio: { known: s.known_audio_id, target1: s.target1_audio_id, target2: s.target2_audio_id } });
    existing.push({ id, position: maxPos + 1 }); perLego.set(home.lego.lego_id, existing);
    index(s.known_text, s.target_text, id);
  }
  return { rows, listed, covered };
}

// ── live read ─────────────────────────────────────────────────────────────────────────────────────────
async function load(pg) {
  const q = (sql) => pg.query(sql, [COURSE]).then((r) => r.rows);
  const seeds = await q('SELECT seed_number, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, approved_at FROM course_seeds WHERE course_code=$1 ORDER BY seed_number');
  const legos = await q(`SELECT l.lego_id, l.seed_number, l.lego_index, l.is_new, l.known_text, l.target_text, l.components, l.presentation_audio_id, a.text AS intro
    FROM course_legos l LEFT JOIN course_audio a ON a.id::text = l.presentation_audio_id WHERE l.course_code=$1 ORDER BY l.seed_number, l.lego_index`);
  const phrases = await q('SELECT id, seed_number, lego_index, position, phrase_role, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 ORDER BY seed_number, lego_index, position');
  const guarded = new Set((await q('SELECT lego_id FROM human_authored_presentations WHERE course_code=$1')).map((r) => r.lego_id));
  return { seeds, legos, phrases, guarded };
}
const short = (id) => String(id).replace(/^spa_for_eng:/, '');
const full = (id) => `${COURSE}:${short(id)}`;

// ── plan: B + C + D + F as edits over live rows ───────────────────────────────────────────────────────
function planEdits(db) {
  const legoById = Object.fromEntries(db.legos.map((l) => [l.lego_id, l]));
  const phById = Object.fromEntries(db.phrases.map((p) => [short(p.id), p]));
  const legoEdits = {}, phraseEdits = {}, held = [];
  const editPhrase = (id, rule, to) => {
    const p = phById[id]; if (!p) { held.push({ id, why: 'row not found live' }); return; }
    const prev = phraseEdits[id]?.after || { known: p.known_text, target: p.target_text };
    phraseEdits[id] = { id, rule: phraseEdits[id] ? `${phraseEdits[id].rule} + ${rule}` : rule, role: p.phrase_role, seed: p.seed_number, lego_index: p.lego_index, before: { known: p.known_text, target: p.target_text }, after: { known: to.known ?? prev.known, target: to.target ?? prev.target } };
  };
  // B — LEGOs, their tiles (JSON + component rows opening on the same infinitive), BUILDs
  for (const id of K41_LEGOS) {
    const l = legoById[id]; if (!l) { held.push({ id, why: 'LEGO not found live' }); continue; }
    if (!opensOnInfinitive(l.target_text) || /^to\b/i.test(l.known_text)) { held.push({ id, why: `live LEGO no longer a bare-infinitive gloss: "${l.known_text} | ${l.target_text}"` }); continue; }
    const known = withTo(l.known_text);
    const lead = norm(l.target_text).split(' ')[0];
    const components = l.components == null ? l.components : l.components.map((c) => (norm(c.target).split(' ')[0] === lead && !/^to\b/i.test(c.known) ? { ...c, known: withTo(c.known) } : c));
    const oldDemo = demoOf(l.intro);
    legoEdits[id] = { id, rule: 'B K41', seed: l.seed_number, lego_index: l.lego_index, is_new: l.is_new, guarded: db.guarded.has(id),
      before: { known: l.known_text, target: l.target_text, components: l.components, intro: l.intro }, after: { known, target: l.target_text, components }, intro: introFrame(known, oldDemo && containsSeq(oldDemo, known) ? oldDemo : null) };
    for (const p of db.phrases) if (p.phrase_role === 'component' && p.seed_number === l.seed_number && p.lego_index === l.lego_index && norm(p.target_text).split(' ')[0] === lead && !/^to\b/i.test(p.known_text)) editPhrase(short(p.id), 'B K41 tile', { known: withTo(p.known_text) });
  }
  const heldLegoIds = new Set(Object.values(K41_HELD).flat());
  for (const p of db.phrases) {
    const id = short(p.id);
    if (p.phrase_role !== 'build' || !opensOnInfinitive(p.target_text) || /^to\b/i.test(p.known_text)) continue;
    if (K41_BUILD_EXCLUDE.has(id)) { held.push({ id, why: `K41: not an infinitive gloss "${p.known_text} | ${p.target_text}"` }); continue; }
    if (/ing$/i.test(words(p.known_text)[0] || '')) { held.push({ id, why: `K41 case (c), gerund gloss: "${p.known_text} | ${p.target_text}"` }); continue; }
    if (heldLegoIds.has(id.slice(0, 8))) { held.push({ id, why: `K41: under a held LEGO: "${p.known_text} | ${p.target_text}"` }); continue; }
    editPhrase(id, 'B K41 build', { known: K41_BUILD_OVERRIDE[id] || withTo(p.known_text) });
  }
  // C / F
  for (const [id, r] of Object.entries(REWRITES)) editPhrase(id, r.rule, r.to);
  // D
  for (const [id, [hon, sides]] of Object.entries(K32)) {
    const cur = phraseEdits[id]?.after || (phById[id] && { known: phById[id].known_text, target: phById[id].target_text });
    if (!cur) { held.push({ id, why: 'row not found live' }); continue; }
    editPhrase(id, `D K32 ${hon}`, { known: sides === 'both' ? withHonorific(cur.known, hon, 'known') : cur.known, target: withHonorific(cur.target, hon, 'target') });
  }
  for (const [id, e] of Object.entries(phraseEdits)) if (e.before.known === e.after.known && e.before.target === e.after.target) { delete phraseEdits[id]; held.push({ id, why: 'no-op against the live text' }); }
  return { legoEdits, phraseEdits, held };
}

// ── guards ────────────────────────────────────────────────────────────────────────────────────────────
function zutStrict(db, legoEdits, phraseEdits, inserts = []) {
  const { auditRows, nk } = require('./audit-phrase-zut.cjs');
  const legos = db.legos.map((l) => ({ id: l.lego_id, seed_number: l.seed_number, known_text: legoEdits[l.lego_id]?.after.known ?? l.known_text, target_text: legoEdits[l.lego_id]?.after.target ?? l.target_text }));
  const phrases = db.phrases.map((p) => { const e = phraseEdits[short(p.id)]; return { id: short(p.id), seed_number: p.seed_number, phrase_role: p.phrase_role, known_text: e ? e.after.known : p.known_text, target_text: e ? e.after.target : p.target_text }; })
    .concat(inserts.map((r) => ({ id: r.id, seed_number: r.lego.seed_number, phrase_role: 'use', known_text: r.known, target_text: r.target })));
  const out = auditRows({ legos, phrases, seeds: db.seeds });
  return { count: out.bidirectional.violationsStrict.length, keys: new Set(out.bidirectional.violationsStrict.map((v) => v.known_norm)), nk };
}
function guard(db, plan, inserts) {
  const notes = [];
  const before = zutStrict(db, {}, {});
  // 1. ZUT: drop any edit or insert whose new known sits in a strict clash that was not there before; repeat
  for (let pass = 0; pass < 10; pass++) {
    const after = zutStrict(db, plan.legoEdits, plan.phraseEdits, inserts);
    const fresh = [...after.keys].filter((k) => !before.keys.has(k));
    if (!fresh.length) { plan.zut = { before: before.count, after: after.count }; break; }
    for (const k of fresh) {
      for (const [id, e] of Object.entries(plan.legoEdits)) if (after.nk(e.after.known) === k) { plan.held.push({ id, why: `ZUT: "${e.after.known}" would stand over a second target (${e.before.known} | ${e.before.target})` }); delete plan.legoEdits[id]; }
      for (const [id, e] of Object.entries(plan.phraseEdits)) if (after.nk(e.after.known) === k && e.role !== 'component') { plan.held.push({ id, why: `ZUT: "${e.after.known} | ${e.after.target}" clashes with another row (${e.rule})` }); delete plan.phraseEdits[id]; }
      for (let i = inserts.length - 1; i >= 0; i--) if (after.nk(inserts[i].known) === k) { plan.listedP26.push({ seed: inserts[i].seed, known: inserts[i].known, target: inserts[i].target, why: 'ZUT once this pass\'s edits land' }); inserts.splice(i, 1); }
    }
  }
  // tiles/builds under a LEGO whose own edit was dropped go too (a "to …" BUILD under a bare LEGO is still fine, so only tiles)
  for (const [id, e] of Object.entries(plan.phraseEdits)) if (/K41 tile/.test(e.rule) && !plan.legoEdits[id.slice(0, 8)]) { plan.held.push({ id, why: 'tile of a held LEGO' }); delete plan.phraseEdits[id]; }
  // 2. exact LEGO duplicates (both sides) — a later duplicate would have to go not-new (L17/P25): held
  for (const [id, e] of Object.entries(plan.legoEdits)) {
    const dup = db.legos.find((o) => o.lego_id !== id && norm(plan.legoEdits[o.lego_id]?.after.known ?? o.known_text) === norm(e.after.known) && norm(o.target_text) === norm(e.after.target) && !(id === 'S0314L01' && o.lego_id === 'S0382L03') && !(id === 'S0382L03' && o.lego_id === 'S0314L01'));
    if (dup) { plan.held.push({ id, why: `duplicate LEGO: "${e.after.known} | ${e.after.target}" = ${dup.lego_id}` }); delete plan.legoEdits[id]; }
  }
  for (const [id, e] of Object.entries(plan.phraseEdits)) if (/K41 tile/.test(e.rule) && !plan.legoEdits[id.slice(0, 8)]) { plan.held.push({ id, why: 'tile of a held LEGO' }); delete plan.phraseEdits[id]; }
  if (plan.legoEdits.S0314L01 && !plan.legoEdits.S0382L03) { plan.held.push({ id: 'S0314L01', why: 'moves only with its not-new twin S0382L03' }); delete plan.legoEdits.S0314L01; }
  if (plan.legoEdits.S0382L03 && !plan.legoEdits.S0314L01) { plan.held.push({ id: 'S0382L03', why: 'moves only with S0314L01' }); delete plan.legoEdits.S0382L03; }
  // 3. intros quote the LEGO; no human-authored intro is rewritten
  for (const [id, e] of Object.entries(plan.legoEdits)) {
    if (e.guarded) { plan.held.push({ id, why: 'human-authored intro' }); delete plan.legoEdits[id]; continue; }
    if (!e.intro.includes(`'${e.after.known}'`)) throw new Error(`${id}: intro does not quote the LEGO`);
  }
  // 4. P17: non-component rows under an edited LEGO still contain it ("to" ignored on the known side — K41)
  for (const e of Object.values(plan.legoEdits)) for (const p of db.phrases) {
    if (p.phrase_role === 'component' || p.seed_number !== e.seed || p.lego_index !== e.lego_index) continue;
    const a = plan.phraseEdits[short(p.id)]?.after || { known: p.known_text, target: p.target_text };
    if (!containsWords(a.known, e.after.known, ['to'])) notes.push(`P17 known (pre-existing, loose): ${short(p.id)} "${a.known}" vs "${e.after.known}"`);
  }
  // 5. edited target text: every word taught (LEGO or tile) at or before the row's seed; edited row still contains its LEGO
  const first = new Map();
  for (const l of db.legos) { for (const w of words(l.target_text)) if (!(first.get(w) <= l.seed_number)) first.set(w, l.seed_number); for (const c of l.components || []) for (const w of words(c.target)) if (!(first.get(w) <= l.seed_number)) first.set(w, l.seed_number); }
  const legoAt = Object.fromEntries(db.legos.map((l) => [`${l.seed_number}:${l.lego_index}`, l]));
  for (const [id, e] of Object.entries(plan.phraseEdits)) {
    if (norm(e.before.target) === norm(e.after.target)) continue;
    const untaught = words(e.after.target).filter((w) => !(first.get(w) <= e.seed) && !words(e.before.target).includes(w));
    if (untaught.length) { plan.held.push({ id, why: `untaught at seed ${e.seed}: ${untaught.join(', ')} — "${e.after.target}"` }); delete plan.phraseEdits[id]; continue; }
    const L = legoAt[`${e.seed}:${e.lego_index}`];
    if (e.role !== 'component' && containsWords(e.before.target, L.target_text) && !containsWords(e.after.target, L.target_text)) { plan.held.push({ id, why: `P17: "${e.after.target}" would lose its LEGO "${L.target_text}"` }); delete plan.phraseEdits[id]; }
  }
  // 6. no two rows in one basket become the same pair
  const basket = new Map();
  for (const p of db.phrases) { if (p.phrase_role === 'component') continue; const a = plan.phraseEdits[short(p.id)]?.after || { known: p.known_text, target: p.target_text }; const k = `${p.seed_number}:${p.lego_index}|${pairKey(a.known, a.target)}`; if (!basket.has(k)) basket.set(k, []); basket.get(k).push(short(p.id)); }
  for (const ids of basket.values()) if (ids.length > 1) for (const id of ids) if (plan.phraseEdits[id]) { plan.held.push({ id, why: `would duplicate ${ids.filter((x) => x !== id).join(',')} in its basket` }); delete plan.phraseEdits[id]; }
  const final = zutStrict(db, plan.legoEdits, plan.phraseEdits, inserts);
  plan.zut = { before: before.count, after: final.count };
  if (final.count > before.count) throw new Error(`ZUT strict would rise ${before.count} → ${final.count}`);
  return notes;
}

// ── content: one transaction ──────────────────────────────────────────────────────────────────────────
async function applyContent(pg, supabase, db, plan, inserts, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const ev = (op, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: op, scope, detail });
  const leg = Object.values(plan.legoEdits), phr = Object.values(plan.phraseEdits);
  const touched = [...new Set([...leg.map((l) => l.seed), ...phr.map((p) => p.seed)])].sort((a, b) => a - b);
  const E = {};
  E.lego = await ev('lego-edit', { seed_numbers: [...new Set(leg.map((l) => l.seed))], lego_ids: leg.map((l) => l.id), rows: leg.length }, { ruling: RULING, job: JOB, changes: leg.map((l) => ({ id: l.id, rule: l.rule, from: { known: l.before.known, target: l.before.target, components: l.before.components, intro: l.before.intro }, to: l.after, intro: l.intro })) });
  E.phrase = await ev('phrase-edit', { seed_numbers: [...new Set(phr.map((p) => p.seed))], phrase_ids: phr.map((p) => full(p.id)), rows: phr.length }, { ruling: RULING, job: JOB, changes: phr.map((p) => ({ id: full(p.id), rule: p.rule, from: p.before, to: p.after })) });
  E.insert = await ev('phrase-add', { seed_numbers: [...new Set(inserts.map((r) => r.lego.seed_number))], phrase_ids: inserts.map((r) => full(r.id)), rows: inserts.length }, { ruling: RULING, job: JOB, rule: 'A P26', rows: inserts.map((r) => ({ id: full(r.id), from_seed: r.seed, lego: r.lego.lego_id, why: r.why, known: r.known, target: r.target })) });
  const appr = (await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2) AND approved_at IS NOT NULL', [COURSE, touched])).rows;
  E.unapprove = await ev('unapprove', { seed_numbers: appr.map((a) => a.seed_number), rows: appr.length }, { job: JOB, why: 'words changed in the Italian-rules pass — Kai should read them (P26 additions do not unapprove)', approved_at_before: appr });
  log.events = E; log.unapproved = appr.map((a) => a.seed_number);
  await pg.query('BEGIN');
  try {
    for (const l of leg) {
      const r = await pg.query(`UPDATE course_legos SET known_text=$1, components=$2, last_edit_event_id=$3, updated_at=now() WHERE course_code=$4 AND lego_id=$5 AND known_text=$6 AND target_text=$7`,
        [l.after.known, JSON.stringify(l.after.components), E.lego, COURSE, l.id, l.before.known, l.before.target]);
      if (r.rowCount !== 1) throw new Error(`${l.id}: ${r.rowCount} rows`);
      await pg.query('UPDATE lego_introductions SET presentation_audio_id=NULL, audio_uuid=NULL, updated_at=now() WHERE course_code=$1 AND lego_id=$2', [COURSE, l.id]);
    }
    for (const p of phr) {
      const L = (await pg.query('SELECT target_text FROM course_legos WHERE course_code=$1 AND seed_number=$2 AND lego_index=$3', [COURSE, p.seed, p.lego_index])).rows[0];
      const comp = p.role === 'component';
      const r = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=CASE WHEN $4 THEN lego_count ELSE $5 END,
          qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL,
          lego_position=CASE WHEN $4 THEN lego_position ELSE $6 END, last_edit_event_id=$7, updated_at=now()
        WHERE course_code=$8 AND id=$9 AND known_text=$10 AND target_text=$11`,
        [p.after.known, p.after.target, p.after.target.length, comp, p.after.target.split(/\s+/).length, legoPosition(p.after.target, L.target_text), E.phrase, COURSE, full(p.id), p.before.known, p.before.target]);
      if (r.rowCount !== 1) throw new Error(`${p.id}: ${r.rowCount} rows (live text moved?)`);
    }
    for (const r of inserts) {
      const ins = await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce, known_audio_id, target1_audio_id, target2_audio_id, last_edit_event_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft','use','{}',$11,$12,true,$13,$14,$15,$16) ON CONFLICT DO NOTHING`,
        [full(r.id), COURSE, r.lego.seed_number, r.lego.lego_index, r.position, r.known, r.target, r.target.length, r.target.split(/\s+/).length, JSON.stringify({ format: 'build_use', source: SWEEP, job: JOB, seed_sentence_of: r.seed, why: r.why }), r.lego_position, r.lego.lego_id, r.linked.known, r.linked.target1, r.linked.target2, E.insert]);
      if (ins.rowCount !== 1) throw new Error(`${r.id}: insert ${ins.rowCount}`);
    }
    if (appr.length) await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$3 WHERE course_code=$1 AND seed_number = ANY($2)', [COURSE, appr.map((a) => a.seed_number), E.unapprove]);
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: Italian-rules pass — ${leg.length} LEGOs, ${phr.length} phrases edited, ${inserts.length} seed sentences added; fresh renders await Kai's spend approval`, metadata: { job: JOB, seeds: touched } });
}
async function seedClips(pg, rows) {
  const ids = rows.flatMap((r) => [r.audio.known, r.audio.target1, r.audio.target2]).filter(Boolean);
  const { rows: clips } = await pg.query('SELECT id, voice_id, s3_key FROM course_audio WHERE id = ANY($1)', [ids]);
  const ok = (id, role) => { const c = clips.find((x) => x.id === id); return c && CAST[role].includes(c.voice_id) && c.s3_key && !c.s3_key.startsWith('pending/') ? id : null; };
  for (const r of rows) r.linked = { known: ok(r.audio.known, 'known'), target1: ok(r.audio.target1, 'target1'), target2: ok(r.audio.target2, 'target2') };
}

// ── audio: the ONE route; library is free, a render is dry-run unless RENDER=1 (Kai's approval) ───────
async function route(body) {
  const res = await fetch('http://localhost:3470/api/audio/render', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': `${SWEEP} (job ${JOB})` }, body: JSON.stringify(body) });
  return { status: res.status, ...(await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))) };
}
async function audio(pg, render) {
  // every slot this sweep's events touched that is empty now
  const { rows: evs } = await pg.query(`SELECT id, operation, detail FROM content_edit_events WHERE course_code=$1 AND surface=$2 ORDER BY occurred_at`, [COURSE, SURFACE]);
  const intro = {}; const phraseIds = new Set(), legoIds = new Set();
  for (const e of evs) for (const c of e.detail?.changes || []) { if (e.operation === 'lego-edit') { legoIds.add(c.id); intro[c.id] = c.intro; } if (e.operation === 'phrase-edit') phraseIds.add(c.id); }
  for (const e of evs) for (const r of e.detail?.rows || []) phraseIds.add(r.id);
  const { rows: ph } = await pg.query(`SELECT id, phrase_role, known_text, target_text, known_audio_id k, target1_audio_id t1, target2_audio_id t2 FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) AND phrase_role <> 'component'`, [COURSE, [...phraseIds]]);
  const { rows: lg } = await pg.query(`SELECT lego_id, is_new, known_text, target_text, known_audio_id k, target1_audio_id t1, target2_audio_id t2, presentation_audio_id pres FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)`, [COURSE, [...legoIds]]);
  const slots = [];
  for (const r of ph) { if (!r.k) slots.push({ table: 'course_practice_phrases', key: 'id', id: r.id, col: 'known_audio_id', role: 'known', text: r.known_text }); if (!r.t1) slots.push({ table: 'course_practice_phrases', key: 'id', id: r.id, col: 'target1_audio_id', role: 'target1', text: r.target_text }); if (!r.t2) slots.push({ table: 'course_practice_phrases', key: 'id', id: r.id, col: 'target2_audio_id', role: 'target2', text: r.target_text }); }
  for (const r of lg) { if (!r.k) slots.push({ table: 'course_legos', key: 'lego_id', id: r.lego_id, col: 'known_audio_id', role: 'known', text: r.known_text }); if (!r.pres && r.is_new) slots.push({ table: 'course_legos', key: 'lego_id', id: r.lego_id, col: 'presentation_audio_id', role: 'presentation', text: intro[r.lego_id], legoId: r.lego_id }); }
  const out = { slots: slots.length, library: 0, linked: 0, wouldRender: 0, chars: 0, refused: [], rendered: 0, entries: [] };
  const seen = new Map();
  for (const s of slots) {
    const key = `${s.role}\u0000${s.text}`;
    let d = seen.get(key);
    if (!d) { d = await route({ courseCode: COURSE, role: s.role, text: s.text, purpose: `Italian-rules pass (${short(s.id)})`, voiceBound: true, dryRun: true, ...(s.legoId ? { legoId: s.legoId } : {}) }); seen.set(key, d); if (d.source === 'would-render') { out.wouldRender++; out.chars += d.wouldSpendChars || 0; } }
    const entry = { id: short(s.id), role: s.role, text: s.text, dry: d.source || d.code };
    if (!d.ok) out.refused.push(`${short(s.id)} ${s.role}: ${d.code} ${d.error}`);
    else if (d.source === 'library' || (render && d.source === 'would-render')) {
      const real = d.real || (d.real = await route({ courseCode: COURSE, role: s.role, text: s.text, purpose: `Italian-rules pass (${short(s.id)})`, voiceBound: true, ...(s.legoId ? { legoId: s.legoId } : {}) }));
      entry.real = real.source || real.code;
      if (real.ok && real.audioId) {
        if (real.source === 'rendered') out.rendered++; else out.library++;
        const u = await pg.query(`UPDATE ${s.table} SET ${s.col}=$1 WHERE course_code=$2 AND ${s.key}=$3 AND ${s.col} IS NULL`, [real.audioId, COURSE, s.id]);
        const { rows: [now] } = await pg.query(`SELECT a.voice_id FROM ${s.table} x JOIN course_audio a ON a.id::text = x.${s.col}::text WHERE x.course_code=$1 AND x.${s.key}=$2`, [COURSE, s.id]);
        if (now && CAST[s.role].includes(now.voice_id)) out.linked++; else entry.problem = `slot voice ${now?.voice_id} not cast (rows ${u.rowCount})`;
      } else if (!real.ok) out.refused.push(`${short(s.id)} ${s.role}: ${real.code} ${real.error}`);
    }
    out.entries.push(entry);
  }
  return out;
}

async function main() {
  const APPLY = process.env.APPLY === '1', AUDIO = process.env.AUDIO === '1', RENDER = process.env.RENDER === '1';
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const log = { sweep: SWEEP, job: JOB, ruling: RULING, apply: APPLY, started: new Date().toISOString() };
  if (AUDIO) {
    log.audio = await audio(pg, RENDER);
    const a = log.audio;
    console.log(`AUDIO: ${a.slots} empty slots; library linked ${a.linked} (${a.library} library hits); ${a.wouldRender} unique texts would render, ${a.chars} chars; rendered ${a.rendered}; refused ${a.refused.length}`);
    for (const r of a.refused) console.log('  REFUSED', r);
  } else {
    const db = await load(pg);
    const plan = planEdits(db);
    const p26 = planP26(db);
    plan.listedP26 = p26.listed;
    const notes = guard(db, plan, p26.rows);
    await seedClips(pg, p26.rows);
    const byRule = {}; for (const e of Object.values(plan.phraseEdits)) { const k = e.rule.replace(/ \(.*$/, '').replace(/:.*$/, ''); byRule[k] = (byRule[k] || 0) + 1; }
    Object.assign(log, { legoEdits: plan.legoEdits, phraseEdits: plan.phraseEdits, held: plan.held, p26: { covered: p26.covered, rows: p26.rows.map(({ lego, ...r }) => ({ ...r, lego: lego.lego_id })), listed: plan.listedP26 }, zut: plan.zut, notes });
    console.log(`PLAN: ${Object.keys(plan.legoEdits).length} LEGOs, ${Object.keys(plan.phraseEdits).length} phrases ${JSON.stringify(byRule)}, ${p26.rows.length} P26 USE rows (${p26.covered} seeds already covered, ${plan.listedP26.length} listed); ZUT strict ${plan.zut.before} → ${plan.zut.after}; held ${plan.held.length}`);
    for (const e of Object.values(plan.legoEdits)) console.log(`  LEGO ${e.id}: "${e.before.known}" → "${e.after.known}" | ${e.after.target}`);
    for (const e of Object.values(plan.phraseEdits)) if (!/K41/.test(e.rule)) console.log(`  ${e.id} [${e.rule}] "${e.before.known} | ${e.before.target}" → "${e.after.known} | ${e.after.target}"`);
    console.log('HELD:'); for (const h of plan.held) console.log(`  ${h.id}: ${h.why}`);
    console.log('P26 LISTED:'); for (const l of plan.listedP26) console.log(`  seed ${l.seed} "${l.known} | ${l.target}": ${l.why.slice(0, 160)}`);
    const unlinked = p26.rows.filter((r) => !r.linked.known || !r.linked.target1 || !r.linked.target2);
    console.log(`P26 rows with a seed clip off-cast or missing: ${unlinked.length}`);
    for (const n of notes.slice(0, 20)) console.log('  note', n);
    if (APPLY) { await applyContent(pg, supabase, db, plan, p26.rows, log); console.log(`APPLIED. events ${JSON.stringify(log.events)}; unapproved ${log.unapproved.length} seeds`); }
  }
  const f = evidencePath(`tools/course-optimization/${SWEEP}/${AUDIO ? 'audio' : APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
  await pg.end();
}
module.exports = { norm, containsWords, withTo, withHonorific, introFrame, demoOf, opensOnInfinitive, planP26, planEdits, chooseHome, K32, REWRITES, K41_LEGOS };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
