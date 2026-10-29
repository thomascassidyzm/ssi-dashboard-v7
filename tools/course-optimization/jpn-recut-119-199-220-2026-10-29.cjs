#!/usr/bin/env node
'use strict';
// jpn_for_eng seed re-cuts 119 / 199 / 220 (Kai, 29 Oct 2026, job #564; drafted in job #526).
// Kai: "The seed is the decider for what gets taught, the legos should reflect the seed."
//   S0119L02  聞く | ask                       -> 一つ聞いていい | can I ask you something   (seed: 行く前に、一つ聞いていい？)
//   S0199L02  昔働いてた | used to work           -> 昔、オフィスで働いてた | used to work in an office   (seed: 友だちは昔、オフィスで働いてた)
//   S0220L02  テレビ少し見る | watch a bit of tv -> テレビ少し見た | watched a bit of television   (seed: テレビ少し見た？)
// The LEGO keeps its lego_id (same slot, same round); only its words change. Every phrase under each LEGO is rewritten so it
// contains the whole new LEGO (P17). A row whose text changes is DELETED and re-INSERTED under the same id: course_practice_phrases
// carries display_tiling that edit-batch cannot null, and a tiling that no longer spells the text is worse than none.
// Writes only through Popty edit-batch, dry run unless the body says apply. Nothing here deletes a LEGO or a clip.
//   node …cjs emit <dump.json> <outdir>        # writes body.json (edit-batch), gate-input.json (check-generated.cjs), asks.json, plan.txt
const fs = require('fs');
const COURSE = 'jpn_for_eng';
const AGENT = 'kai-564-jpn-recut';

// ── segment helper: a row is a list of [japanese, romaji] pieces so text and romaji can never drift apart ──────────────────────
const P = (ja, ro) => [ja, ro];
const COMMA = P('、', ','), Q = P('？', '?'), STOP = P('。', '.');
const L119 = P('一つ聞いていい', 'hitotsu kiite ii');
const L199 = [P('昔', 'mukashi'), COMMA, P('オフィスで', 'ofisu de'), P('働いてた', 'hataraiteta')];
const L220 = [P('テレビ', 'terebi'), P('少し', 'sukoshi'), P('見た', 'mita')];

const SEEDS = {
  119: {
    lego: { index: 2, known: 'can I ask you something', ja: [L119], intro: "The Japanese for: 'can I ask you something', as in — 'can I ask you something before you leave?', is:",
      components: [['one thing', '一つ', 'hitotsu'], ['can I ask', '聞いていい', 'kiite ii']] },
    seedClips: true,
    rows: [
      // id, role, position, known, segments, extra.   buildup = the bare LEGO row; seedSentence = the exact seed (P26): both exempt from the phrase gate
      ['B01', 'build', 2, 'can I ask you something', [L119], { buildup: 'lego' }],
      ['B02', 'build', 3, 'can I ask you something now?', [P('今', 'ima'), COMMA, L119, Q]],
      ['B03', 'build', 4, 'can I ask you something later?', [P('あとで', 'ato de'), COMMA, L119, Q]],
      ['B04', 'build', 5, 'can I ask you something today?', [P('今日は', 'kyoo wa'), COMMA, L119, Q]],
      ['U01', 'use', 6, 'can I ask you something before you leave?', [P('行く前に', 'iku mae ni'), COMMA, L119, Q], { seedSentence: true }],
      ['U04', 'use', 9, 'can I ask you something? thank you', [L119, Q, P('ありがとう', 'arigatoo')]],
      ['U05', 'use', 10, "I don't know if I can ask you something now", [P('今', 'ima'), COMMA, L119, P('か', 'ka'), P('分からない', 'wakaranai')]],
      ['U06', 'use', 11, 'I need to think about whether I can ask you something', [L119, P('か', 'ka'), COMMA, P('考える必要がある', 'kangaeru hitsuyoo ga aru'), STOP]],
      ['U07', 'use', 12, "I didn't know if I could ask you something", [L119, P('か', 'ka'), P('分からなかった', 'wakaranakatta'), STOP]],
      ['U08', 'use', 13, 'can I ask you something quickly?', [P('すぐ', 'sugu'), COMMA, L119, Q]],
    ],
    components: [['C01', 1, 0, 'one thing', [P('一つ', 'hitotsu')]], ['C02', 14, 1, 'can I ask', [P('聞いていい', 'kiite ii')]]],
  },
  199: {
    lego: { index: 2, known: 'used to work in an office', ja: L199, intro: "The Japanese for: 'used to work in an office', is:",
      components: [['long ago', '昔', 'mukashi'], ['in an office', 'オフィスで', 'ofisu de'], ['was working', '働いてた', 'hataraiteta']] },
    rows: [
      ['B01', 'build', 3, 'she used to work in an office', [P('彼女は', 'kanojo wa'), ...L199]],
      ['B02', 'build', 4, 'yes, I used to work in an office', [P('うん', 'un'), COMMA, ...L199]],
      ['B03', 'build', 5, 'my friend used to work in an office', [P('友だちは', 'tomodachi wa'), ...L199], { seedSentence: true }],
      ['B04', 'build', 11, 'because I used to work in an office', [...L199, P('から', 'kara')]],
      ['U01', 'use', 6, 'I used to work in an office together with my friend', [P('友だちと一緒に', 'tomodachi to issho ni'), COMMA, ...L199]],
      ['U02', 'use', 7, 'my mother also used to work in an office', [P('母も', 'haha mo'), ...L199]],
      ['U03', 'use', 8, 'my friend also used to work in an office', [P('友だちも', 'tomodachi mo'), ...L199]],
      ['U04', 'use', 9, 'I know because I used to work in an office', [...L199, P('から', 'kara'), COMMA, P('分かる', 'wakaru')]],
      ['U05', 'use', 12, 'I think he used to work in an office', [...L199, P('と思う', 'to omou')]],
      ['U06', 'use', 13, 'I used to work in an office, but', [...L199, P('けど', 'kedo')]],
      ['U07', 'use', 14, 'did you use to work in an office?', [...L199, P('の', 'no'), Q]],
    ],
    components: [['C03', 10, 1, 'in an office', [P('オフィスで', 'ofisu de')]]],
    keepComponents: { C01: 0, C02: 2 }, // component_index to record on the untouched 昔 / 働いてた rows
  },
  220: {
    lego: { index: 2, known: 'watched a bit of television', ja: L220, intro: "The Japanese for: 'watched a bit of television', is:",
      components: [['television', 'テレビ', 'terebi'], ['a bit of', '少し', 'sukoshi'], ['watched', '見た', 'mita']] },
    rows: [
      ['B01', 'build', 4, 'watched a bit of television', L220, { buildup: 'lego' }],
      ['B02', 'build', 5, 'I watched a bit of television today', [P('今日は', 'kyoo wa'), ...L220]],
      ['B03', 'build', 6, 'she watched a bit of television', [P('彼女は', 'kanojo wa'), ...L220]],
      ['B04', 'build', 7, 'I watched a bit of television yesterday', [P('昨日', 'kinoo'), ...L220]],
      ['U01', 'use', 8, 'he watched a bit of television last night', [P('昨日の夜', 'kinoo no yoru'), ...L220]],
      ['U02', 'use', 9, 'they watched a bit of television at the weekend', [P('週末', 'shuumatsu'), ...L220]],
      ['U03', 'use', 10, 'I watched a bit of television on Sunday', [P('日曜', 'nichiyoo'), ...L220]],
      ['U04', 'use', 11, 'he watched a bit of television on Saturday', [P('土曜', 'doyoo'), ...L220]],
      ['U05', 'use', 12, 'she watched a bit of television then', [P('その時', 'sono toki'), ...L220]],
      ['U07', 'use', 14, 'they watched a bit of television together', [P('一緒に', 'issho ni'), ...L220]],
      ['U08', 'use', 15, 'I watched a bit of television with my friends', [P('友だちと', 'tomodachi to'), ...L220]],
      ['U09', 'use', 16, 'I think I watched a bit of television', [...L220, P('と思う', 'to omou')]],
      ['U10', 'use', 17, 'did you watch a bit of television?', [...L220, Q], { seedSentence: true }],
    ],
    components: [['C03', 3, 2, 'watched', [P('見た', 'mita')]]],
  },
};

const OLD = { // what this tool was written against; refuses to run on anything else
  119: { legoKnown: 'ask', legoTarget: '聞く' },
  199: { legoKnown: 'used to work', legoTarget: '昔働いてた' },
  220: { legoKnown: 'watch a bit of television', legoTarget: 'テレビ少し見る' },
};

const flat = (segs) => segs.flatMap((s) => (Array.isArray(s[0]) ? s : [s]));
const jaOf = (segs) => flat(segs).map((s) => s[0]).join('');
const roOf = (segs) => flat(segs).reduce((acc, [, r]) => (r === ',' || r === '?' || r === '.' ? acc + r : acc ? `${acc} ${r}` : r), '');
const sid = (id) => String(id).split(':').pop();
const STRIP = ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id', 'target1_duration_ms', 'target2_duration_ms',
  'last_edit_event_id', 'created_at', 'updated_at', 'version', 'qa_checked', 'decomposition', 'decomposition_course_version', 'display_tiling', 'display_tiling_version'];

/** target-string → {known, legoId} for every LEGO taught before this seed (+ the re-cut LEGO's own components), earliest teacher wins. */
function tileLookup(dump, seed, newLego) {
  const m = new Map();
  for (const l of dump.legos) if (l.seed_number < seed && !m.has(l.target_text)) m.set(l.target_text, { known: l.known_text, legoId: l.lego_id });
  for (const [known, ja] of newLego.components.map((c) => [c[0], c[1]])) if (!m.has(ja)) m.set(ja, { known, legoId: newLego.legoId });
  return m;
}
function decompose(segs, lookup, newLego) {
  const tiles = [];
  for (const [ja] of flat(segs)) {
    if (ja === newLego.target) { tiles.push({ known: newLego.known, legoId: newLego.legoId, target: ja, isGhost: false, isSalient: true }); continue; }
    const hit = lookup.get(ja);
    if (hit && !/^[、。？]$/.test(ja)) tiles.push({ known: hit.known, legoId: hit.legoId, target: ja, isGhost: false });
    else for (const ch of ja) tiles.push({ known: '', legoId: null, target: ch, isGhost: true });
  }
  return tiles;
}

function build(dump, seedsLive) {
  const legos = Object.fromEntries(dump.legos.map((l) => [l.lego_id, l]));
  const phr = Object.fromEntries(dump.phrases.map((p) => [sid(p.id), p]));
  const ops = [], plan = [], gate = [], asks = new Map();
  const ask = (role, text, why) => { const k = `${role}\0${text}`; if (!asks.has(k)) asks.set(k, { role, text, why: [] }); asks.get(k).why.push(why); return k; };
  for (const [seedStr, S] of Object.entries(SEEDS)) {
    const seed = Number(seedStr), L = S.lego, legoId = `S${String(seed).padStart(4, '0')}L${String(L.index).padStart(2, '0')}`;
    const old = legos[legoId], seedRow = dump.seeds.find((s) => s.seed_number === seed);
    if (!old || old.known_text !== OLD[seed].legoKnown || old.target_text !== OLD[seed].legoTarget) throw new Error(`${legoId} is not the cut this tool was written against: ${old && old.known_text} | ${old && old.target_text}`);
    const newTarget = jaOf(L.ja);
    const newLego = { legoId, known: L.known, target: newTarget, components: L.components };
    const lookup = tileLookup(dump, seed, newLego);
    plan.push(`\n=== SEED ${seed}  ${seedRow.known_text} | ${seedRow.target_text}\nLEGO ${legoId}: ${old.known_text} | ${old.target_text}  ->  ${L.known} | ${newTarget}  (${roOf(L.ja)})`);
    // seed: unapprove (O5) — text untouched
    const live = seedsLive.seeds.find((s) => s.seed_number === seed);
    ops.push({ op: 'seed.update', seed_number: seed, set: { approved_at: null }, expect: { approved_at: live.approved_at ? new Date(live.approved_at).toISOString() : null } });
    // LEGO text
    ops.push({ op: 'lego.update', lego_id: legoId, set: { known_text: L.known, target_text: newTarget, target_text_roman: roOf(L.ja), type: 'M', is_new: true,
      components: L.components.map(([k, t]) => ({ known: k, target: t })), known_gloss_segments: null },
      expect: { known_text: old.known_text, target_text: old.target_text } });
    for (const [slot, role] of [['known', 'known'], ['target1', 'target1'], ['target2', 'target2']]) {
      const k = ask(role, role === 'known' ? L.known : newTarget, `${legoId} ${slot}`);
      ops.push({ op: 'audio.link', target: 'lego', lego_id: legoId, slot, audio_id: { $ask: k } });
    }
    ask('presentation', L.intro, `${legoId} intro`);
    // rows
    const oldRows = Object.keys(phr).filter((k) => k.startsWith(legoId)).sort();
    const tmpl = phr[`${legoId}B01`] || phr[oldRows[0]];
    const mk = (id, role, position, known, segs, extra = {}, base = null) => {
      const row = { ...(base || tmpl) };
      for (const c of STRIP) delete row[c];
      const ja = jaOf(segs), tiles = decompose(segs, lookup, newLego);
      const pos = ja.indexOf(newTarget);
      const md = { ...((base && base.metadata) || {}), format: 'build_use', source: `${AGENT} (Kai 29 Oct, job #564)` };
      delete md.scored_at; delete md.score; delete md.target_score;
      if (extra.buildup) md.buildup = 'lego'; else delete md.buildup;
      return { ...row, id: `${COURSE}:${id}`, seed_number: seed, lego_index: L.index, phrase_role: role, position, known_text: known, target_text: ja, target_text_roman: roOf(segs),
        decomposition: tiles, decomposition_course_version: null, lego_position: pos === 0 ? (ja === newTarget ? 'middle' : 'start') : (pos + newTarget.length >= ja.replace(/[。？]$/, '').length ? 'end' : 'middle'),
        connected_lego_ids: [], metadata: md, status: 'draft', word_count: ja.length, lego_count: tiles.filter((t) => !t.isGhost).length || 1, introduce: true };
    };
    const seedKnown = seedRow.known_text, seedTarget = seedRow.target_text;
    const gateRows = [];
    const addRow = (id, role, position, known, segs, extra) => {
      const oldRow = phr[id] || null;
      const row = mk(id, role, position, known, segs, extra, oldRow);
      const slotAsk = (r, text) => ask(r, text, id);
      if (oldRow) {
        ops.push({ op: 'phrase.delete', phrase_id: oldRow.id, expect: { target_text: oldRow.target_text } });
        plan.push(`  ${id}: ${oldRow.known_text} | ${oldRow.target_text}  ->  ${known} | ${row.target_text}`);
      } else plan.push(`  ${id} (NEW): ${known} | ${row.target_text}`);
      ops.push({ op: 'phrase.insert', row });
      const seedClip = extra && extra.seedSentence && known === seedKnown && row.target_text === seedTarget;
      const useRetained = oldRow && oldRow.known_text === known;
      if (seedClip) {
        for (const [slot, col] of [['known', 'known_audio_id'], ['target1', 'target1_audio_id'], ['target2', 'target2_audio_id']]) ops.push({ op: 'audio.link', target: 'phrase', phrase_id: row.id, slot, audio_id: seedRow[col] });
      } else {
        if (useRetained && oldRow.known_audio_id) ops.push({ op: 'audio.link', target: 'phrase', phrase_id: row.id, slot: 'known', audio_id: oldRow.known_audio_id });
        else ops.push({ op: 'audio.link', target: 'phrase', phrase_id: row.id, slot: 'known', audio_id: { $ask: slotAsk('known', known) } });
        for (const slot of ['target1', 'target2']) ops.push({ op: 'audio.link', target: 'phrase', phrase_id: row.id, slot, audio_id: { $ask: slotAsk(slot, row.target_text) } });
      }
      if (!(extra && (extra.buildup || extra.seedSentence))) gateRows.push({ role, known, target: row.target_text });
    };
    // every old row of this LEGO must be accounted for by this table (components aside), or the tool stops
    for (const r of S.rows) addRow(`${legoId}${r[0]}`, r[1], r[2], r[3], r[4], r[5] || {});
    for (const r of oldRows) {
      const idShort = r.slice(legoId.length);
      if (/^[CBU]/.test(idShort) && !S.rows.some((x) => x[0] === idShort) && !S.components.some((x) => x[0] === idShort) && !(S.keepComponents && idShort in S.keepComponents) && !(seed === 220 && /^C0[12]$/.test(idShort)))
        throw new Error(`old row ${r} has no plan`);
    }
    // components (never played): changed ones replaced; the LEGO's own `components` JSON carries the truth
    for (const [cid, position, index, known, segs] of S.components) {
      const id = `${legoId}${cid}`, existing = phr[id];
      const row = mk(id, 'component', position, known, segs, {}, existing || phr[`${legoId}C01`] || tmpl);
      row.metadata = { buildup: 'component', component_index: index, source: `${AGENT} (Kai 29 Oct, job #564)` }; row.lego_position = 'middle'; row.word_count = jaOf(segs).length; row.lego_count = 1;
      if (existing) { ops.push({ op: 'phrase.delete', phrase_id: existing.id, expect: { target_text: existing.target_text } }); plan.push(`  ${cid} (component): ${existing.known_text} | ${existing.target_text}  ->  ${known} | ${row.target_text}`); }
      else plan.push(`  ${cid} (component NEW): ${known} | ${row.target_text}`);
      ops.push({ op: 'phrase.insert', row });
      ops.push({ op: 'audio.link', target: 'phrase', phrase_id: row.id, slot: 'known', audio_id: { $ask: ask('known', known, id) } });
      for (const slot of ['target1', 'target2']) ops.push({ op: 'audio.link', target: 'phrase', phrase_id: row.id, slot, audio_id: { $ask: ask(slot, row.target_text, id) } });
    }
    // 119 only: the old C01 (聞) is replaced above; 199 C01/C02 stay untouched (昔, 働いてた are still exactly what they were).
    gate.push({ courseCode: COURSE, seedNumber: seed, legoIndex: L.index, legoId, legoKnown: L.known, legoTarget: newTarget, seedTarget, phrases: gateRows });
  }
  return { ops, plan, gate, asks: [...asks.values()] };
}

/** Replace {$ask} placeholders with audio ids from a render log ({k: "role\0text", body:{audioId}}). */
function resolve(ops, asksLog) {
  const id = new Map(); for (const l of asksLog) if (l.body && l.body.audioId) id.set(l.k, l.body.audioId);
  const missing = new Set();
  const out = ops.map((o) => {
    if (o.audio_id && o.audio_id.$ask) { const a = id.get(o.audio_id.$ask); if (!a) { missing.add(o.audio_id.$ask); return o; } return { ...o, audio_id: a }; }
    return o;
  });
  return { ops: out, missing: [...missing] };
}

if (require.main === module) {
  const [mode, dumpPath, outDir, extra] = process.argv.slice(2);
  const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
  const seedsLive = { seeds: dump.seeds };
  const b = build(dump, seedsLive);
  if (mode === 'emit') {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(`${outDir}/ops-template.json`, JSON.stringify({ ops: b.ops }));
    fs.writeFileSync(`${outDir}/gate-input.json`, JSON.stringify(b.gate));
    fs.writeFileSync(`${outDir}/asks.json`, JSON.stringify(b.asks.map((a) => ({ k: `${a.role}\0${a.text}`, role: a.role, text: a.text, why: a.why }))));
    fs.writeFileSync(`${outDir}/plan.txt`, b.plan.join('\n'));
    const byRole = {}; for (const a of b.asks) byRole[a.role] = (byRole[a.role] || 0) + 1;
    console.log(b.plan.join('\n'), `\n\n${b.ops.length} ops; distinct clip asks ${b.asks.length} ${JSON.stringify(byRole)}`);
  } else if (mode === 'resolve') { // resolve <dump> <outDir> <render-log.jsonl>
    const log = fs.readFileSync(extra, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const r = resolve(b.ops, log);
    if (r.missing.length) { console.error(`${r.missing.length} asks have no clip yet:`, r.missing.slice(0, 5)); process.exit(1); }
    fs.writeFileSync(`${outDir}/body-dry.json`, JSON.stringify({ ops: r.ops }));
    fs.writeFileSync(`${outDir}/body-apply.json`, JSON.stringify({ ops: r.ops, apply: true }));
    console.log('resolved', r.ops.length, 'ops');
  }
}
module.exports = { build, resolve, SEEDS, jaOf, roOf };
