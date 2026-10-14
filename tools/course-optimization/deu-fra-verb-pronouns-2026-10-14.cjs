#!/usr/bin/env node
'use strict';
// tools/course-optimization/deu-fra-verb-pronouns-2026-10-14.cjs  (job #414·Q)
//
// KAI'S RULING, 2026-10-14: deu_for_eng and fra_for_eng teach verbs whose English has a subject pronoun but whose
// target has none ("I speak | spreche", "he would like | aimerait"). German and French are not pro-drop, so each such
// LEGO GROWS to carry its pronoun, IN THE ORDER THE SEED USES ("sollten wir" inverted is fine), and every practice
// phrase under it must show the pronoun in its grammatically correct position (verb-final clauses keep the pronoun
// earlier in the clause, which is correct German). The known side already carries the pronoun, so the intro (English
// only) is unchanged and only the TARGET text and its clips move.
//
// A LEGO whose pronoun cannot sit next to its verb in the seed (verb-final subordinate clause with other words
// between, an object "sie", a wrong gloss) is NOT touched: HELD lists them, with the seed sentence and a proposed cut,
// for Kai. Three LEGOs the 6 Oct census listed were already right when this ran (ALREADY_FIXED).
//
// Writes go ONLY through Popty's edit-batch door (POST /api/production/:course/edit-batch); audio ONLY through
// tools/audio/render.cjs (POST /api/audio/render). No SQL here. Reads come from the sanctioned dump
// (course-dump-readonly-2026-10-14.cjs).
//
//   node tools/course-optimization/deu-fra-verb-pronouns-2026-10-14.cjs ops <course> <dump.json> [--audio map.json] [--out ops.json]
//   node tools/course-optimization/deu-fra-verb-pronouns-2026-10-14.cjs renders <course> <dump.json> [--apply] --out map.json
//
// `renders` dry-runs every needed clip through the render route unless --apply; the map it writes is
// { "<role>|<text>": audioId } for rows the route answered (library hit or fresh render).

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const JOB = '#414';
const norm = (s) => String(s || '').toLowerCase().replace(/[’]/g, "'").replace(/[.,!?;:"«»“”]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
/** Word-multiset containment (the live gate's phrase-contains-LEGO rule); an elided "qu'ils" counts as "qu' ils". */
function containsWords(hay, needle) {
  const split = (x) => words(String(x).replace(/\b(qu|j|l|d|s|n|m|t)'/gi, "$1' "));
  const h = split(hay);
  for (const w of split(needle)) { const i = h.indexOf(w); if (i < 0) return false; h.splice(i, 1); }
  return true;
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ── The 21 LEGOs that grow. [new target, components in TARGET order]. Known text is never changed. ──
const GROW = {
  deu_for_eng: {
    S0009L02: ['ich spreche', [['I', 'ich'], ['speak', 'spreche']]],
    S0031L01: ['du wolltest', [['you', 'du'], ['wanted', 'wolltest']]],
    S0059L01: ['ich weiß', [['I', 'ich'], ['know', 'weiß']]],
    S0096L02: ['ich brauche', [['I', 'ich'], ['need', 'brauche']]],
    S0099L01: ['du solltest', [['you', 'du'], ['should', 'solltest']]],
    S0263L02: ['du meinst', [['you', 'du'], ['mean', 'meinst']]],
    S0403L01: ['wir sollten', [['we', 'wir'], ['should', 'sollten']]],
    S0412L01: ['wir konnten', [['we', 'wir'], ['could', 'konnten']]],
    S0413L01: ['wir könnten', [['we', 'wir'], ['might', 'könnten']]],
    S0427L01: ['du denkst', [['you', 'du'], ['think', 'denkst']]],
    S0499L02: ['sollten wir', [['should', 'sollten'], ['we', 'wir']]], // the seed is inverted: "vielleicht sollten wir"
    S0533L05: ['du sagst', [['you', 'du'], ['say', 'sagst']]],
    S0568L01: ['ich erwarte', [['I', 'ich'], ['expect', 'erwarte']]],
    S0597L01: ['ich vermute', [['I', 'ich'], ['suspect', 'vermute']]],
    S0600L03: ['du warst', [['you', 'du'], ['were', 'warst']]],
  },
  fra_for_eng: {
    S0149L03: ['tu finiras', [['you', 'tu'], ['will finish', 'finiras']]],
    S0252L01: ['tu seras', [['you', 'tu'], ['will be', 'seras']]],
    S0557L01: ['ils ne jouent pas', [['they', 'ils'], ["don't play", 'ne jouent pas']]],
    S0581L03: ['il aimerait', [['he', 'il'], ['would like', 'aimerait']]],
    S0597L05: ['je soupçonne', [['I', 'je'], ['suspect', 'soupçonne']]],
    S0629L04: ["je l'aime", [['I', 'je'], ['like it', "l'aime"]]],
  },
};

// ── Phrases that must change. A bare-verb build row (B01) becomes the grown LEGO itself; the rest are rewrites ──
// from vocabulary already taught at that seed (checked by the caller against the dump). [phrase suffix, known, target]
const PHRASES = {
  deu_for_eng: [
    ['S0403L01B01', null, 'Wir sollten'], ['S0412L01B01', null, 'Wir konnten'], ['S0413L01B01', null, 'Wir könnten'],
    ['S0427L01B01', null, 'Du denkst'], ['S0533L05B01', null, 'Du sagst'], ['S0568L01B01', null, 'Ich erwarte'],
    ['S0597L01B01', null, 'Ich vermute'], ['S0600L03B01', null, 'Du warst'],
    // S0096L02: three rows said "muss" under "brauche" and so never contained the LEGO at all
    ['S0096L02B02', 'I need a little', 'Ich brauche ein bisschen'],
    ['S0096L02U04', 'I need more time now', 'Ich brauche jetzt mehr Zeit'],
    ['S0096L02U07', 'I need a little time now', 'Ich brauche jetzt ein bisschen Zeit'],
    // S0499L02 "sollten wir": every row drilled the uninverted "wir sollten"; they now carry the seed's inversion
    ['S0499L02B01', 'we should', 'Sollten wir'],
    ['S0499L02B02', 'maybe we should', 'vielleicht sollten wir'],
    ['S0499L02B03', 'maybe we should go', 'vielleicht sollten wir gehen'],
    ['S0499L02U02', 'maybe we should do that', 'vielleicht sollten wir das machen'],
    ['S0499L02U03', 'maybe we should speak German', 'vielleicht sollten wir Deutsch sprechen'],
    ['S0499L02U04', 'maybe we should try that', 'vielleicht sollten wir das versuchen'],
    ['S0499L02U06', 'maybe we should be ready', 'vielleicht sollten wir bereit sein'],
    ['S0499L02U07', 'maybe we should all try', 'vielleicht sollten wir alle versuchen'],
  ],
  fra_for_eng: [
    ['S0149L03B01', null, 'Tu finiras'], ['S0557L01B01', null, 'Ils ne jouent pas'],
    // S0581L03: "she would like" never contained "he would like"
    ['S0581L03U01', 'he would like to leave', 'il aimerait partir'],
    ['S0581L03U03', 'he would like to leave tomorrow', 'il aimerait partir demain'],
  ],
};

// ── New BUILD rows. Once a bare-verb B01 became the LEGO itself it no longer counts as a build beyond the bare LEGO, and
// four French baskets fell under the thin-basket minimum (check-debut-practice: minBuild 3). One build each restores it. ──
const INSERTS = {
  deu_for_eng: [],
  fra_for_eng: [
    ['S0252L01B04', 'S0252L01B03', 'you will be there', 'tu seras là'],
    ['S0581L03B04', 'S0581L03B03', 'he would like to stay', 'il aimerait rester'],
    ['S0597L05B04', 'S0597L05B03', 'I suspect that he is here', 'je soupçonne qu\'il est ici'],
    ['S0629L04B04', 'S0629L04B03', 'I like it a lot', 'je l\'aime beaucoup'],
  ],
};

// ── What was NOT changed, for the report and for the test ──
const HELD = {
  deu_for_eng: {
    S0058L02: 'verb-final: "wenn du genug Wörter verstehst" — du … verstehst is split by "genug Wörter" (L03 "enough")',
    S0072L01: 'verb-final: "dass du das sehr gut machst" — du … machst is split by "das sehr gut"',
    S0099L02: 'verb-final: "warum es nicht funktioniert" — es … funktioniert is split by "nicht"; the English gloss "it works" also drops the negation',
    S0207L01: 'verb-final, not new: "was du machen musstest" — du … musstest is split by "machen"',
    S0415L04: 'verb-final: "wenn du mich fragst" — "mich" sits between and L03 "ask me | mich fragen" overlaps; held as a pair with S0432L02 (same English, would clash)',
    S0432L02: 'not new; "dass du fragst" is adjacent, but "you ask" would then clash with S0415L04 "fragst" — held as a pair',
    S0419L01: '"wenn sie wollen, dass die Leute sie mögen": here "sie" is the OBJECT (them) and the subject is "die Leute", so "they like" is a wrong gloss, not a missing pronoun',
    S0497L02: 'verb-final: "als ob du etwas Schlaf brauchst" — du … brauchst is split by "etwas Schlaf" (L03 "sleep")',
    S0513L01: '"es tut am meisten weh" — es tut … weh is split by "am meisten" (L02 "the most")',
    S0513L03: 'verb-final: "wenn ich meinen Kopf hoch und runter bewege" — ich … bewege is split by L04/L05',
    S0599L04: 'verb-final: "wenn du mir gesagt hättest" — du … hättest is split by "mir gesagt"',
    S0616L01: 'verb-final, not new: "dass du das gedacht hast" — du … hast is split by L02 "du das gedacht hast", which already holds the pronoun',
  },
  fra_for_eng: {
    S0238L02: 'gloss wrong: "he wanted you to tell me" — L01 "voulait que tu" already holds "tu"; L02 "you\'re telling | dises" is the subjunctive "tell"',
    S0240L03: 'gloss wrong: "he\'s stopping | s\'arrêter" — the seed has the infinitive after "n\'aime pas", no subject',
    S0622L03: 'the seed\'s subject is "les enfants" (L01), not "ils"; English "they" is a K28 pronoun the target lacks',
  },
};
const ALREADY_FIXED = {
  deu_for_eng: ['S0538L04 (English no longer has "I": "don\'t care | egal")', 'S0556L03 (already "they play | sie spielen")', 'S0557L03 (already "I wished | ich wünschte")'],
  fra_for_eng: [],
};

/** Every row that needs a clip, as { role, text, purpose, key } — for the render route. */
function planCourse(course, dump, { insertsOnly = false } = {}) {
  const legos = dump.legos, phrases = dump.phrases;
  const ops = [], need = [];
  const lego = (id) => legos.find((l) => l.lego_id === id);
  const prefix = `${course}:`;
  const phrase = (suffix) => phrases.find((p) => p.id === prefix + suffix);
  for (const [id, [target, comps]] of insertsOnly ? [] : Object.entries(GROW[course])) {
    const L = lego(id);
    if (!L) throw new Error(`${id} not in dump`);
    ops.push({ op: 'lego.update', lego_id: id, expect: { target_text: L.target_text, known_text: L.known_text },
      set: { target_text: target, type: 'M', components: comps.map(([known, t]) => ({ known, target: t })) },
      _slots: { target }, _label: `${id} ${L.known_text} | ${L.target_text} → ${target}` });
  }
  for (const [suffix, known, target] of insertsOnly ? [] : PHRASES[course]) {
    const p = phrase(suffix);
    if (!p) throw new Error(`${suffix} not in dump`);
    const set = { target_text: target };
    if (known != null) set.known_text = known;
    ops.push({ op: 'phrase.update', phrase_id: p.id, expect: { target_text: p.target_text, known_text: p.known_text }, set,
      _slots: { target, known: known != null ? known : null }, _label: `${suffix} ${p.known_text} | ${p.target_text} → ${known || p.known_text} | ${target}` });
  }
  for (const [suffix, tmplSuffix, known, target] of INSERTS[course]) {
    const t = phrase(tmplSuffix);
    if (!t) throw new Error(`${tmplSuffix} not in dump`);
    // positions are unique per LEGO: every row after the template moves up one (highest first), then the new row takes the gap
    const later = phrases.filter((p) => p.seed_number === t.seed_number && p.lego_index === t.lego_index && p.position > t.position).sort((a, b) => b.position - a.position);
    for (const p of later) ops.push({ op: 'phrase.update', phrase_id: p.id, expect: { position: p.position }, set: { position: p.position + 1 }, _slots: {}, _shift: true, _label: `${p.id} position ${p.position}→${p.position + 1}` });
    const row = { ...t, id: prefix + suffix, known_text: known, target_text: target, phrase_role: 'build', position: t.position + 1,
      known_audio_id: null, target1_audio_id: null, target2_audio_id: null, target1_duration_ms: null, target2_duration_ms: null,
      presentation_audio_id: null, decomposition: null, last_edit_event_id: undefined };
    delete row.last_edit_event_id;
    ops.push({ op: 'phrase.insert', row, set: { target_text: target, known_text: known }, _slots: { target, known }, _label: `${suffix} NEW ${known} | ${target}`, _insert: true });
  }
  return ops;
}

function slotRequests(ops) {
  const out = [];
  for (const o of ops.filter((x) => !x._shift)) {
    out.push({ role: 'target1', text: o.set.target_text, key: o._label }, { role: 'target2', text: o.set.target_text, key: o._label });
    if (o._slots.known) out.push({ role: 'known', text: o.set.known_text, key: o._label });
  }
  const seen = new Set();
  return out.filter((r) => { const k = `${r.role}|${r.text}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

/** The edit-batch body: text edits first, then audio.link for every slot the render route answered (the link is refused unless the clip speaks the row's words). */
function buildOps(course, dump, audioMap, opts) {
  const planned = planCourse(course, dump, opts);
  const ops = [];
  for (const o of planned) {
    const { _slots, _label, _insert, _shift, set, ...op } = o;
    ops.push(_insert ? op : { ...op, set });
  }
  for (const o of planned.filter((x) => !x._shift)) {
    const isLego = o.op === 'lego.update';
    const key = isLego ? { target: 'lego', lego_id: o.lego_id } : { target: 'phrase', phrase_id: o.phrase_id || o.row.id };
    for (const role of ['target1', 'target2', 'known']) {
      if (role === 'known' && !o._slots.known) continue;
      const text = role === 'known' ? o.set.known_text : o.set.target_text;
      const id = audioMap && audioMap[`${role}|${text}`];
      if (id) ops.push({ op: 'audio.link', ...key, slot: role, audio_id: id });
    }
  }
  return ops;
}

// ── Checks the test and the pre/post report share ──
function checkPlan(course, dump) {
  const problems = [];
  for (const [id, [target, comps]] of Object.entries(GROW[course])) {
    const L = dump.legos.find((l) => l.lego_id === id);
    const pron = words(target).find((w) => ['ich', 'du', 'wir', 'tu', 'ils', 'il', 'je', 'er', 'sie', 'es'].includes(w));
    if (!pron) problems.push(`${id}: no pronoun in ${target}`);
    if (norm(comps.map((c) => c[1]).join(' ')).replace(/ /g, '') !== norm(target).replace(/ /g, '')) problems.push(`${id}: components do not tile ${target}`);
    if (norm(comps.map((c) => c[0]).join(' ')).split(' ').sort().join() !== norm(L.known_text.replace(/'ll /, ' will ').replace(/'d /, ' would ')).split(' ').sort().join() && !/'/.test(L.known_text))
      problems.push(`${id}: English components ${comps.map((c) => c[0]).join('+')} are not the known side "${L.known_text}"`);
    const rows = dump.phrases.filter((p) => p.seed_number === L.seed_number && p.lego_index === L.lego_index && p.phrase_role !== 'component');
    for (const p of rows) {
      const ch = PHRASES[course].find(([s]) => `${course}:${s}` === p.id);
      const t = ch ? ch[2] : p.target_text;
      if (!containsWords(t, target)) problems.push(`${p.id}: "${t}" does not contain "${target}"`);
    }
  }
  return problems;
}

module.exports = { GROW, PHRASES, INSERTS, HELD, ALREADY_FIXED, planCourse, slotRequests, buildOps, checkPlan, containsWords, norm };

// ── CLI ──
if (require.main === module) {
  const [cmd, course, dumpPath, ...rest] = process.argv.slice(2);
  const opt = (f) => { const i = rest.indexOf(f); return i >= 0 ? rest[i + 1] : undefined; };
  if (!cmd || !GROW[course] || !dumpPath) { console.error('usage: ops|renders <course> <dump.json> [--audio map.json] [--out file] [--apply]'); process.exit(1); }
  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
  if (cmd === 'check') {
    const pr = checkPlan(course, dump);
    console.log(pr.length ? pr.join('\n') : 'plan clean'); process.exit(pr.length ? 2 : 0);
  } else if (cmd === 'ops') {
    const map = opt('--audio') ? JSON.parse(fs.readFileSync(opt('--audio'), 'utf8')) : {};
    const ops = buildOps(course, dump, map, { insertsOnly: rest.includes('--inserts-only') });
    fs.writeFileSync(opt('--out') || 'ops.json', JSON.stringify({ ops }, null, 1));
    console.log(`${ops.length} ops (${ops.filter((o) => o.op !== 'audio.link').length} text edits, ${ops.filter((o) => o.op === 'audio.link').length} audio links) → ${opt('--out') || 'ops.json'}`);
  } else if (cmd === 'renders') {
    const reqs = slotRequests(planCourse(course, dump, { insertsOnly: rest.includes('--inserts-only') }));
    const apply = rest.includes('--apply');
    const map = {}; let chars = 0, refused = 0;
    for (const r of reqs) {
      const args = [path.join(__dirname, '..', 'audio', 'render.cjs'), '--course', course, '--role', r.role, '--text', r.text, '--purpose', `${JOB} verb+pronoun LEGOs: ${r.key}`.slice(0, 280), '--job', JOB];
      if (!apply) args.push('--dry-run');
      const res = spawnSync('node', args, { encoding: 'utf8', env: { ...process.env, AGENT_ID: 'kai-watson-414' } });
      let out = {}; try { out = JSON.parse(res.stdout); } catch (_) { out = { ok: false, error: (res.stdout || res.stderr || '').slice(0, 200) }; }
      if (!out.ok) { refused++; console.log(`REFUSED ${r.role} "${r.text}": ${JSON.stringify(out).slice(0, 240)}`); continue; }
      chars += out.charsSpent || out.wouldSpendChars || 0;
      if (out.audioId) map[`${r.role}|${r.text}`] = out.audioId;
      console.log(`${out.source}${out.dryRun ? ' (dry)' : ''} ${r.role} "${r.text}" ${out.charsSpent || out.wouldSpendChars || 0} chars ${out.audioId || ''}`);
    }
    console.log(`TOTAL ${apply ? 'spent' : 'would spend'} ${chars} chars over ${reqs.length} clips, ${refused} refused`);
    if (opt('--out')) fs.writeFileSync(opt('--out'), JSON.stringify(map, null, 1));
  }
}
