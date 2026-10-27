#!/usr/bin/env node
'use strict';
// tools/course-optimization/deu-deborah-585-590-2026-10-27.cjs  (job #499, 2026-10-27, for Kai)
//
// deu_for_eng — Deborah's proofreading notes on seeds 585–590 (her R numbers are course_round_index rounds).
//
// 1  S0585 R1224/R1225. L01 "out of my bedroom window | aus meinem Schlafzimmerfenster" played BEFORE L02 "bedroom
//    window | Schlafzimmerfenster", so the big LEGO taught Schlafzimmerfenster one round before its own LEGO (K47), and
//    L01's basket drilled "aus meinem Haus" — not its LEGO at all (P17). Fix = the K47 rotation (seed-534 precedent):
//    L01 becomes "bedroom window" and L02 "out of my bedroom window", each with its own words, LEGO clips and intro clip.
//    L01 keeps the old L02 rows that say "bedroom window" (same text, same clips) plus "the bedroom window"; L02's
//    basket is rebuilt to contain "out of my bedroom window" on both sides; the seed row stays at L02U01. The bare
//    "my bedroom window | meinem Schlafzimmerfenster" (dative with no preposition) is gone. The "aus meinem Haus" rows go.
// 2  S0587 R1229/R1230. L01 "on it | darauf" drilled only "waited for it" (and "for it" is taught as danach, S0171L03 —
//    a second target for the same English), and L02 "insisted on | bestanden" drilled bare "sie hat bestanden", which is
//    German for "she passed". A bare darauf is a function-word LEGO with nothing sayable to drill (K47); bare bestanden
//    does not mean insist (K42: grow the LEGO to the seed words that give the sense). Re-cut, nothing deleted:
//    L01 "insisted on it | darauf bestanden" (M) · L02 "used to insist | früher darauf bestanden" (M, the seed's own
//    words; contains L01, the K39 shape). The "insisted on it" rows move to L01 with their clips; the "waited for it"
//    rows go; S0587L04U04 gains its missing darauf.
// 3  S0589 R1238. L04 "the last bus | den letzten Bus" drilled only "last time" (taught at S0117/S0572), and three rows
//    put "last time" in a future/wish frame ("she will try it last time"), which is nonsense in both languages.
//    Basket rebuilt on "the last bus"; the seed row (U08) stays.
// 4/5 S0590 "the station | die Station" — HELD for Kai (wording of the seed itself), not touched here.
//
// Every changed row keeps its slot (id, role, position). Rows whose words are new keep their OLD clips linked (text
// only tonight, no renders — Kai) and are listed as stale; rows whose exact words already have clips get those clips
// linked in the same transaction (moved rows, the LEGO-text B01 rows, and library hits found by a dry run of the one
// audio route, which renders nothing).
//
// Writes go ONLY through Popty's edit-batch door. Reads come from the sanctioned dump (course-dump-readonly-2026-10-14).
//   node …/deu-deborah-585-590-2026-10-27.cjs check  <dump.json>              # plan well-formed + gates on the post-state
//   node …/deu-deborah-585-590-2026-10-27.cjs verify <fresh-dump.json>        # the live course holds the fix
//   node …/deu-deborah-585-590-2026-10-27.cjs lookup <dump.json> --out lib.json   # dry-run library lookups (no render)
//   node …/deu-deborah-585-590-2026-10-27.cjs ops    <dump.json> --lib lib.json --seed 585 --out ops.json

const fs = require('fs');
const T = require('./p26-early-placement-sweep-2026-10-06.cjs');

const COURSE = 'deu_for_eng';
const P = (s) => `${COURSE}:${s}`;
const POPTY = process.env.POPTY || 'http://localhost:3470';
const AGENT = 'deu-deborah-585-590 (job #499)';
const SEEDS = [585, 587, 589];
// The LEGOs this fix owns. Other LEGOs of these seeds (S0587L04 "had" builds, S0589L03 "just now") have containment
// gaps of their own that Deborah did not raise; they are listed for Kai, not changed, so the gates do not ask about them.
const OWNED = ['S0585L01', 'S0585L02', 'S0587L01', 'S0587L02', 'S0589L04'];

// ── the plan ─────────────────────────────────────────────────────────────────────────────────────────────
// LEGO rows: before → after. `clips` names the LEGO whose words/clips/intro this one takes (a rotation), or null.
const LEGOS = [
  { id: 'S0585L01', before: ['out of my bedroom window', 'aus meinem Schlafzimmerfenster'],
    set: { known_text: 'bedroom window', target_text: 'Schlafzimmerfenster', type: 'A', components: [] }, clips: 'S0585L02' },
  { id: 'S0585L02', before: ['bedroom window', 'Schlafzimmerfenster'],
    set: { known_text: 'out of my bedroom window', target_text: 'aus meinem Schlafzimmerfenster', type: 'M',
      components: [{ known: 'out of my', target: 'aus meinem' }, { known: 'bedroom window', target: 'Schlafzimmerfenster' }] }, clips: 'S0585L01' },
  { id: 'S0587L01', before: ['on it', 'darauf'],
    set: { known_text: 'insisted on it', target_text: 'darauf bestanden', type: 'M',
      components: [{ known: 'on it', target: 'darauf' }, { known: 'insisted', target: 'bestanden' }] }, clips: null },
  { id: 'S0587L02', before: ['insisted on', 'bestanden'],
    set: { known_text: 'used to insist', target_text: 'früher darauf bestanden', type: 'M',
      components: [{ known: 'used to', target: 'früher' }, { known: 'insisted on it', target: 'darauf bestanden' }] }, clips: null },
];

// Phrase slots: [slot, [known, target] after, source of clips]. source: 'Sxxxx…' phrase slot whose clips (and exact
// words) move here, 'LEGO:Sxxxx' for a LEGO's own clips, null = new words (library lookup, else stale).
const ROWS = [
  // 1 — S0585 L01 "bedroom window"
  ['S0585L01B01', ['bedroom window', 'Schlafzimmerfenster'], 'S0585L02B01'],
  ['S0585L01B02', ['the bedroom window', 'das Schlafzimmerfenster'], null],
  ['S0585L01B03', ['he can see it from the bedroom window', 'er kann es aus dem Schlafzimmerfenster sehen'], 'S0585L02B03'],
  ['S0585L01U01', ['she can see it from the bedroom window', 'sie kann es aus dem Schlafzimmerfenster sehen'], 'S0585L02U02'],
  ['S0585L01U02', ['she saw it from the bedroom window', 'sie hat es aus dem Schlafzimmerfenster gesehen'], 'S0585L02U03'],
  ['S0585L01U03', ['the bedroom window is lovely', 'das Schlafzimmerfenster ist schön'], 'S0585L02U04'],
  ['S0585L01U04', ['she wants to see the mountains from the bedroom window', 'sie will die Berge aus dem Schlafzimmerfenster sehen'], 'S0585L02U05'],
  ['S0585L01U05', ['she was at the bedroom window', 'sie war an dem Schlafzimmerfenster'], 'S0585L02U06'],
  ['S0585L01U06', ['she can see the mountains from the bedroom window', 'sie kann die Berge aus dem Schlafzimmerfenster sehen'], 'S0585L02U07'],
  //   S0585 L02 "out of my bedroom window" (U01 = the seed row, unchanged)
  ['S0585L02B01', ['out of my bedroom window', 'aus meinem Schlafzimmerfenster'], 'LEGO:S0585L01'],
  ['S0585L02B02', ['I can see it out of my bedroom window', 'ich kann es aus meinem Schlafzimmerfenster sehen'], null],
  ['S0585L02B03', ['he can see it out of my bedroom window', 'er kann es aus meinem Schlafzimmerfenster sehen'], null],
  ['S0585L02U02', ['she can see it out of my bedroom window', 'sie kann es aus meinem Schlafzimmerfenster sehen'], null],
  ['S0585L02U03', ['she saw the mountains out of my bedroom window', 'sie hat die Berge aus meinem Schlafzimmerfenster gesehen'], null],
  ['S0585L02U04', ['can you see the mountains out of my bedroom window?', 'kannst du die Berge aus meinem Schlafzimmerfenster sehen?'], null],
  ['S0585L02U05', ['she wants to see the mountains out of my bedroom window', 'sie will die Berge aus meinem Schlafzimmerfenster sehen'], null],
  ['S0585L02U06', ['I saw it out of my bedroom window', 'ich habe es aus meinem Schlafzimmerfenster gesehen'], null],
  ['S0585L02U07', ['we can see the mountains out of my bedroom window', 'wir können die Berge aus meinem Schlafzimmerfenster sehen'], null],

  // 2 — S0587 L01 "insisted on it"
  ['S0587L01B01', ['insisted on it', 'darauf bestanden'], null],
  ['S0587L01B02', ['I have insisted on it', 'ich habe darauf bestanden'], 'S0587L02B02'],
  ['S0587L01B03', ['we have insisted on it', 'wir haben darauf bestanden'], 'S0587L02B03'],
  ['S0587L01U01', ['she has insisted on it', 'sie hat darauf bestanden'], 'S0587L02U02'],
  ['S0587L01U02', ['she has often insisted on it', 'sie hat oft darauf bestanden'], 'S0587L02U03'],
  ['S0587L01U03', ['she said she insisted on it', 'sie hat gesagt, sie hat darauf bestanden'], 'S0587L02U05'],
  ['S0587L01U04', ['she has always insisted on it', 'sie hat immer darauf bestanden'], null],
  ['S0587L01U05', ['she insisted on doing it', 'sie hat darauf bestanden, es zu machen'], null],
  ['S0587L01U06', ['he has insisted on it', 'er hat darauf bestanden'], null],
  ['S0587L01U07', ['why have you insisted on it?', 'warum hast du darauf bestanden?'], null],
  //   S0587 L02 "used to insist"
  ['S0587L02B01', ['used to insist', 'früher darauf bestanden'], null],
  ['S0587L02B02', ['she used to insist', 'sie hat früher darauf bestanden'], null],
  ['S0587L02B03', ['I used to insist on it', 'ich habe früher darauf bestanden'], null],
  ['S0587L02U01', ['she used to insist that we do it', 'sie hat früher darauf bestanden, dass wir das machen'], null],
  ['S0587L02U02', ['we used to insist on it', 'wir haben früher darauf bestanden'], null],
  ['S0587L02U03', ['he used to insist on it', 'er hat früher darauf bestanden'], null],
  ['S0587L02U04', ['she said she used to insist on it', 'sie hat gesagt, sie hat früher darauf bestanden'], null],
  ['S0587L02U05', ['they used to insist on it', 'sie haben früher darauf bestanden'], null],
  ['S0587L02U06', ['I used to insist that she was there', 'ich habe früher darauf bestanden, dass sie dort war'], null],
  ['S0587L02U07', ['you used to insist on it', 'du hast früher darauf bestanden'], null],
  //   S0587 L04 — the one bare bestanden outside L02
  ['S0587L04U04', ['she insisted that we had it', 'sie hat darauf bestanden, dass wir das hatten'], null],

  // 3 — S0589 L04 "the last bus" (U08 = the seed row, unchanged)
  ['S0589L04B01', ['the last bus', 'den letzten Bus'], 'LEGO:S0589L04'],
  ['S0589L04B02', ['to see the last bus', 'den letzten Bus sehen'], null],
  ['S0589L04B03', ['he has seen the last bus', 'er hat den letzten Bus gesehen'], null],
  ['S0589L04U01', ['she saw the last bus', 'sie hat den letzten Bus gesehen'], null],
  ['S0589L04U02', ['I can see the last bus', 'ich kann den letzten Bus sehen'], null],
  ['S0589L04U03', ['she wants to see the last bus', 'sie will den letzten Bus sehen'], null],
  ['S0589L04U04', ['she has just seen the last bus', 'sie hat gerade den letzten Bus gesehen'], null],
  ['S0589L04U05', ['she waited for the last bus', 'sie hat auf den letzten Bus gewartet'], null],
  ['S0589L04U06', ['she said she saw the last bus', 'sie hat gesagt, sie hat den letzten Bus gesehen'], null],
  ['S0589L04U07', ['we waited for the last bus', 'wir haben auf den letzten Bus gewartet'], null],
];
// S0585L01 had 10 slots and keeps 9 rows: its last slot's "aus meinem Haus" row goes (a phrase may go).
const DELETES = ['S0585L01U07'];

const SLOT_COL = { known: 'known_audio_id', target1: 'target1_audio_id', target2: 'target2_audio_id' };
const ROLE_TEXT = { known: 0, target1: 1, target2: 1 };

// ── pure ─────────────────────────────────────────────────────────────────────────────────────────────────
const legoKey = (p) => `S${String(p.seed_number).padStart(4, '0')}L${String(p.lego_index).padStart(2, '0')}`;
const sid = (id) => id.slice(COURSE.length + 1);

/** The plan applied to a dump (pure): texts and the clips that move with exact words. */
function applyPlan(dump) {
  const lg = new Map(LEGOS.map((l) => [l.id, l]));
  const src = new Map(dump.legos.map((l) => [l.lego_id, l]));
  const legos = dump.legos.map((l) => {
    const p = lg.get(l.lego_id); if (!p) return l;
    const out = { ...l, ...p.set };
    if (p.clips) for (const c of ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id']) out[c] = src.get(p.clips)[c];
    return out;
  });
  const byId = new Map(dump.phrases.map((p) => [sid(p.id), p]));
  const rows = new Map(ROWS.map((r) => [r[0], r]));
  const gone = new Set(DELETES);
  const phrases = dump.phrases.filter((p) => !gone.has(sid(p.id))).map((p) => {
    const r = rows.get(sid(p.id)); if (!r) return p;
    const out = { ...p, known_text: r[1][0], target_text: r[1][1] };
    const s = clipSource(r[2], byId, src);
    if (s) for (const c of Object.values(SLOT_COL)) out[c] = s[c];
    return out;
  });
  return { ...dump, legos, phrases };
}
function clipSource(ref, byId, legosById) {
  if (!ref) return null;
  if (ref.startsWith('LEGO:')) return legosById.get(ref.slice(5));
  return byId.get(ref);
}

/** What must hold on seeds 585/587/589 once fixed (post-state of the plan, or a fresh dump after apply). Fails on the
 *  course as it stood on 2026-10-27. */
function invariants(d) {
  const problems = [];
  const first = T.firstIntro(d.legos);
  const byId = new Map(d.legos.map((l) => [l.lego_id, l]));
  for (const seed of SEEDS) {
    const news = d.legos.filter((l) => l.seed_number === seed && l.is_new !== false).sort((a, b) => a.lego_index - b.lego_index);
    // K47: a big LEGO comes after the pieces it is built from — an earlier new LEGO of the seed may not already hold a
    // later one (Deborah, R1224/R1225: "Schlafzimmerfenster has just been included in the LEGO for R1224")
    for (const [i, a] of news.entries()) for (const b of news.slice(i + 1)) {
      if (T.containsWords(a.target_text, b.target_text)) problems.push(`${a.lego_id} "${a.target_text}" already holds the later ${b.lego_id} "${b.target_text}" (K47)`);
    }
    // P17: every played row contains its LEGO on both sides; P1: no untaught target word at its round
    for (const p of d.phrases.filter((x) => x.seed_number === seed && x.phrase_role !== 'component')) {
      const l = byId.get(legoKey(p)); if (!l || l.is_new === false || !OWNED.includes(l.lego_id)) continue;
      if (!T.containsWords(p.target_text, l.target_text) || !T.containsWords(p.known_text, l.known_text)) problems.push(`${sid(p.id)} "${p.known_text} | ${p.target_text}" does not drill ${l.lego_id} "${l.known_text} | ${l.target_text}"`);
      const ut = T.untaughtAt(p.target_text, l, first);
      if (ut.length) problems.push(`${sid(p.id)} says ${ut} before it is taught`);
    }
  }
  // Deborah's three readings, stated as checks
  for (const p of d.phrases) {
    if (/\bbestanden\b/.test(p.target_text) && !/\bdarauf\b/.test(p.target_text)) problems.push(`${sid(p.id)} bare "bestanden" means "passed", not "insisted"`);
    if (/\b(will|wants? to)\b[^,]*(?<!\b(the|one) )last time/i.test(p.known_text)) problems.push(`${sid(p.id)} "last time" in a future/wish frame`);
    if (/\bfor it\b/i.test(p.known_text) && /\bdarauf\b/.test(p.target_text)) problems.push(`${sid(p.id)} "for it" over darauf (for it is taught as danach, S0171L03)`);
  }
  return problems;
}

function zutStrict(d, audit = require('./audit-phrase-zut.cjs')) {
  return audit.auditRows(d).bidirectional.violationsStrict.length;
}

/** The plan matches the dump it is applied to (drift guard), then the gates hold on the post-state. */
function checkPlan(dump) {
  const problems = [];
  for (const l of LEGOS) {
    const x = dump.legos.find((y) => y.lego_id === l.id);
    if (!x || x.known_text !== l.before[0] || x.target_text !== l.before[1]) problems.push(`${l.id} drifted from "${l.before.join(' | ')}"`);
  }
  const ids = new Set(dump.phrases.map((p) => sid(p.id)));
  for (const [s, , ref] of ROWS) {
    if (!ids.has(s)) problems.push(`${s} not in dump`);
    if (ref && !ref.startsWith('LEGO:') && !ids.has(ref)) problems.push(`${s}: clip source ${ref} not in dump`);
  }
  for (const s of DELETES) if (!ids.has(s)) problems.push(`${s} (delete) not in dump`);
  const post = applyPlan(dump);
  problems.push(...invariants(post));
  const zb = zutStrict(dump), za = zutStrict(post);
  if (za > zb) problems.push(`ZUT strict rises ${zb} → ${za}`);
  return { problems, zut: [zb, za] };
}

/** Slots whose words are new: these need clips. Returned as audio-route asks (role + exact words). */
function asks(dump) {
  const out = [];
  for (const [s, kt, ref] of ROWS) if (!ref) for (const role of Object.keys(SLOT_COL)) out.push({ slot: s, role, text: kt[ROLE_TEXT[role]] });
  // the 587 LEGOs' own clips (their words are new)
  for (const l of LEGOS.filter((x) => !x.clips)) for (const role of Object.keys(SLOT_COL)) out.push({ slot: `LEGO:${l.id}`, role, text: role === 'known' ? l.set.known_text : l.set.target_text });
  return out;
}

const SEED_APPROVED_AT = { 585: '2026-07-03T14:30:18.020Z', 587: '2026-07-03T14:30:18.020Z' }; // 589 is already unapproved

/** Edit-batch ops for one seed. lib: { "<slot>|<role>": audio_id } library hits from `lookup`. */
function editOps(dump, seed, lib = {}) {
  const ops = [];
  const legoById = new Map(dump.legos.map((l) => [l.lego_id, l]));
  const byId = new Map(dump.phrases.map((p) => [sid(p.id), p]));
  const inSeed = (s) => Number(s.slice(1, 5)) === seed;
  for (const l of LEGOS.filter((x) => inSeed(x.id))) {
    ops.push({ op: 'lego.update', lego_id: l.id, expect: { known_text: l.before[0], target_text: l.before[1] }, set: l.set });
    if (l.clips) {
      const s = legoById.get(l.clips);
      for (const [slot, col] of Object.entries({ ...SLOT_COL, presentation: 'presentation_audio_id' })) if (s[col]) ops.push({ op: 'audio.link', target: 'lego', lego_id: l.id, slot, audio_id: s[col] });
      if (s.presentation_audio_id) ops.push({ op: 'audio.update', audio_id: s.presentation_audio_id, set: { lego_id: l.id } });
    } else {
      for (const slot of Object.keys(SLOT_COL)) if (lib[`LEGO:${l.id}|${slot}`]) ops.push({ op: 'audio.link', target: 'lego', lego_id: l.id, slot, audio_id: lib[`LEGO:${l.id}|${slot}`] });
    }
  }
  for (const [s, kt, ref] of ROWS.filter((r) => inSeed(r[0]))) {
    const p = byId.get(s);
    ops.push({ op: 'phrase.update', phrase_id: P(s), expect: { known_text: p.known_text, target_text: p.target_text }, set: { known_text: kt[0], target_text: kt[1] } });
    const src = ref ? clipSource(ref, byId, legoById) : null;
    for (const [slot, col] of Object.entries(SLOT_COL)) {
      const a = src ? src[col] : lib[`${s}|${slot}`];
      if (a && a !== p[col]) ops.push({ op: 'audio.link', target: 'phrase', phrase_id: P(s), slot, audio_id: a });
    }
  }
  for (const s of DELETES.filter(inSeed)) { const p = byId.get(s); ops.push({ op: 'phrase.delete', phrase_id: P(s), expect: { known_text: p.known_text, target_text: p.target_text } }); }
  if (SEED_APPROVED_AT[seed]) ops.push({ op: 'seed.update', seed_number: seed, expect: { approved_at: SEED_APPROVED_AT[seed] }, set: { approved_at: null } });
  return ops;
}

/** Slots left holding clips that say the OLD words (text-only tonight): row, slot, clip id, what the clip says. */
function staleClips(dump, lib = {}) {
  const out = [];
  const legoById = new Map(dump.legos.map((l) => [l.lego_id, l]));
  const byId = new Map(dump.phrases.map((p) => [sid(p.id), p]));
  for (const [s, kt, ref] of ROWS) {
    if (ref) continue;
    const p = byId.get(s);
    for (const [slot, col] of Object.entries(SLOT_COL)) {
      if (lib[`${s}|${slot}`]) continue;
      const oldText = slot === 'known' ? p.known_text : p.target_text, newText = kt[ROLE_TEXT[slot]];
      if (oldText === newText) continue;
      out.push({ row: s, slot, audio_id: p[col], says: oldText, needs: newText });
    }
  }
  for (const l of LEGOS.filter((x) => !x.clips)) {
    const x = legoById.get(l.id);
    for (const [slot, col] of Object.entries(SLOT_COL)) if (!lib[`LEGO:${l.id}|${slot}`]) out.push({ row: `LEGO ${l.id}`, slot, audio_id: x[col], says: slot === 'known' ? x.known_text : x.target_text, needs: slot === 'known' ? l.set.known_text : l.set.target_text });
    out.push({ row: `LEGO ${l.id}`, slot: 'presentation', audio_id: x.presentation_audio_id, says: `(intro of "${x.known_text}")`, needs: `The German for: '${l.set.known_text}', is:` });
  }
  return out;
}

/** Step 2 (Kai, 2026-10-27, after the text landed: "you MAY now render"): every slot the fix left EMPTY on a fresh dump —
 *  the owned LEGOs (incl. their intros) and the ROWS — as one ask per distinct (role, words). Untouched rows are never
 *  asked for, so nothing else is re-voiced. Pure. */
const introLine = (known) => `The German for: '${known}', is:`;
function fillAsks(d) {
  const m = new Map();
  const add = (role, text, target, legoId) => {
    const k = `${role}\u0000${text}\u0000${role === 'presentation' ? legoId : ''}`;
    if (!m.has(k)) m.set(k, { role, text, ...(role === 'presentation' ? { legoId } : {}), slots: [] });
    m.get(k).slots.push(target);
  };
  const ownedLegos = new Set([...LEGOS.map((l) => l.id), 'S0589L04']);
  for (const l of d.legos.filter((x) => ownedLegos.has(x.lego_id))) {
    for (const [slot, col] of Object.entries(SLOT_COL)) if (!l[col]) add(slot, slot === 'known' ? l.known_text : l.target_text, { target: 'lego', lego_id: l.lego_id, slot }, l.lego_id);
    if (!l.presentation_audio_id) add('presentation', introLine(l.known_text), { target: 'lego', lego_id: l.lego_id, slot: 'presentation' }, l.lego_id);
  }
  const rows = new Set(ROWS.map((r) => r[0]));
  for (const p of d.phrases.filter((x) => rows.has(sid(x.id)))) for (const [slot, col] of Object.entries(SLOT_COL)) if (!p[col]) add(slot, slot === 'known' ? p.known_text : p.target_text, { target: 'phrase', phrase_id: p.id, slot });
  return [...m.values()];
}

module.exports = { LEGOS, ROWS, DELETES, applyPlan, invariants, checkPlan, asks, editOps, staleClips, fillAsks, introLine };

// ── I/O ──────────────────────────────────────────────────────────────────────────────────────────────────
async function lookup(dump) {
  const lib = {}, log = [];
  for (const a of asks(dump)) {
    const body = JSON.stringify({ courseCode: COURSE, role: a.role, text: a.text, purpose: `library lookup only (dry run) for ${a.slot}, Deborah 585-590 fix`, dryRun: true });
    let b = {};
    for (let t = 0; t < 10; t++) { // Popty restarts under other jobs' merges; a dry run is safe to ask again
      try { const r = await fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body }); b = await r.json().catch(() => ({})); break; }
      catch (e) { await new Promise((ok) => setTimeout(ok, 6000)); }
    }
    const hit = /already has a working clip \(?([0-9a-f-]{36})/.exec(b.error || '') || (b.source === 'library' && b.audioId ? [null, b.audioId] : null);
    if (hit) lib[`${a.slot}|${a.role}`] = hit[1];
    log.push({ ...a, source: hit ? 'library' : b.source || b.code, audio_id: hit ? hit[1] : null });
  }
  return { lib, log };
}

if (require.main === module) {
  (async () => {
    const [cmd, dumpPath, ...rest] = process.argv.slice(2);
    const opt = (k) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : null; };
    if (!cmd || !dumpPath) { console.error('usage: check|verify|lookup|ops|stale <dump.json> [--lib lib.json] [--seed N] [--out file]'); process.exit(1); }
    const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
    const lib = opt('--lib') ? JSON.parse(fs.readFileSync(opt('--lib'), 'utf8')).lib : {};
    if (cmd === 'check') {
      const { problems, zut } = checkPlan(dump);
      console.log(`ZUT strict ${zut[0]} → ${zut[1]}`); console.log(problems.length ? problems.join('\n') : 'plan clean'); process.exit(problems.length ? 2 : 0);
    } else if (cmd === 'verify') {
      const pr = invariants(dump); console.log(pr.length ? pr.join('\n') : 'course holds the fix'); process.exit(pr.length ? 2 : 0);
    } else if (cmd === 'lookup') {
      const res = await lookup(dump); fs.writeFileSync(opt('--out') || 'lib.json', JSON.stringify(res, null, 1));
      console.log(`${res.log.length} asks, ${Object.keys(res.lib).length} library hits`);
    } else if (cmd === 'ops') {
      const ops = editOps(dump, Number(opt('--seed')), lib); fs.writeFileSync(opt('--out') || 'ops.json', JSON.stringify({ ops }, null, 1)); console.log(`${ops.length} ops`);
    } else if (cmd === 'fill') {
      // dry run always; RENDER=1 renders (one try each, a refusal is the answer and is never retried); then the links
      const RENDER = process.env.RENDER === '1', MAX = +(process.env.MAX_CHARS || 6000);
      const list = fillAsks(dump); const log = [];
      const call = async (a, dryRun) => {
        for (let t = 0; t < 10; t++) {
          try {
            const r = await fetch(`${POPTY}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT },
              body: JSON.stringify({ courseCode: COURSE, role: a.role, text: a.text, purpose: `job #499 Deborah 585-590: fill ${a.slots.length} slot(s) left empty by the text fix (Kai approved)`, ...(a.legoId ? { legoId: a.legoId } : {}), ...(dryRun ? { dryRun: true } : {}) }) });
            return { status: r.status, body: await r.json().catch(() => ({})) };
          } catch (e) { if (!dryRun && t > 0) return { status: 0, body: { error: 'connection lost mid-render' } }; await new Promise((ok) => setTimeout(ok, 6000)); }
        }
        return { status: 0, body: { error: 'unreachable' } };
      };
      let chars = 0;
      for (const a of list) { const r = await call(a, true); const w = r.body.ok && r.body.source !== 'library' ? (r.body.wouldSpendChars || a.text.length) : 0; chars += w;
        log.push({ ...a, dry: { status: r.status, source: r.body.source, voiceId: r.body.voiceId, chars: w, error: r.body.ok ? undefined : r.body } }); }
      const refusedDry = log.filter((a) => a.dry.error);
      console.log(`${list.length} clips for ${list.reduce((n, a) => n + a.slots.length, 0)} slots; ${chars} chars to render; ${refusedDry.length} refused in dry run`);
      for (const a of refusedDry) console.log('  REFUSED (dry)', a.role, JSON.stringify(a.text), JSON.stringify(a.dry.error).slice(0, 300));
      const voices = {}; for (const a of log) voices[`${a.role}:${a.dry.voiceId}`] = (voices[`${a.role}:${a.dry.voiceId}`] || 0) + 1; console.log('voices', JSON.stringify(voices));
      if (RENDER && chars <= MAX) {
        for (const a of log.filter((x) => !x.dry.error)) { const r = await call(a, false); a.real = { status: r.status, source: r.body.source, audioId: r.body.audioId, chars: r.body.charsSpent, error: r.body.ok ? undefined : r.body };
          console.log(a.real.error ? 'REFUSED' : a.real.source, a.role, JSON.stringify(a.text), a.real.audioId || JSON.stringify(a.real.error).slice(0, 300)); }
        const ops = []; for (const a of log) if (a.real && a.real.audioId) for (const sl of a.slots) ops.push({ op: 'audio.link', ...sl, audio_id: a.real.audioId });
        fs.writeFileSync(opt('--out') || 'fill-ops.json', JSON.stringify({ ops }, null, 1));
        console.log(`spent ${log.reduce((n, a) => n + ((a.real && a.real.chars) || 0), 0)} chars; ${ops.length} link ops → ${opt('--out') || 'fill-ops.json'}`);
      } else if (RENDER) console.log(`STOP: ${chars} > MAX_CHARS ${MAX}`);
      fs.writeFileSync((opt('--out') || 'fill-ops.json') + '.log.json', JSON.stringify(log, null, 1));
    } else if (cmd === 'stale') {
      console.log(JSON.stringify(staleClips(dump, lib), null, 1));
    }
  })().catch((e) => { console.error(e); process.exit(1); });
}
