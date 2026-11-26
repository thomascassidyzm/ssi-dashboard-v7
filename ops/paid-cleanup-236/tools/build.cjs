#!/usr/bin/env node
// cs #236·AL — paid-cleanup items 18 / 16 / 14 as night changesets (Kai 24 Nov: "Yes, tonight is good for those").
// Reads ONLY the QA-copy snapshots written by tools/paid-cleanup-717/snapshot.cjs (P717_SNAP); no DB code at all.
// Each op carries `expect` = the copy's values; each changeset has a guards sidecar (seed + LEGO text) for Kai's live
// pre-check (ops/paid-cleanup-item9/tools/precheck-guards.cjs). Everything a plan treats as judgement is HELD and
// written to held.json with its reason — never invented here.
//
//   P717_SNAP=<snap dir> node build.cjs 18|16|14 [course…]   → ops/paid-cleanup-236/item<N>/<course>/…
//
// ITEM 18 (plan ops/overnight-785/item9-plans/item-18-same-row-twice.md): two played rows in one basket with the same
//   known AND target (ZUT key). BUILD+BUILD / USE+USE: keep the earlier. BUILD+USE: keep the USE, delete the BUILD,
//   unless that BUILD is the basket's only real BUILD left, then delete the USE instead. Never empty a basket (P30).
//   A group whose rows point at DIFFERENT target clips is held: which take to keep is not ours to guess.
// ITEM 16 (plan item-16-wrong-new-flag.md, rule 1 only): a LEGO taught NEW twice, the first teaching in an EARLIER
//   seed: move each played row of the later basket that the earlier basket does not already hold to the earlier basket
//   (phrase.insert with the same words + audio.link of the same three clips), then delete it from the later basket and
//   set the later LEGO is_new:false. Moves and flips are TWO files: the night runner applies moves, then gate16.cjs
//   keeps only the flips whose every insert landed, so a refused insert can never be followed by its delete.
//   HELD: same-seed twins (hand read), any LEGO with a row whose target uses a word not yet taught at the earlier
//   LEGO (moving it would teach out of order; P25 re-homing is judgement), and all "not-new, never taught" (L30/P25).
// ITEM 14 (plan item-14-question-mark-one-side.md, rule 1 only): the #447 hand read's QMARK rows
//   (ops/paid-cleanup-717/scan-rows-447-real.json) whose text is unchanged on the copy and still one-sided, whose fix
//   is a plain "add the mark" (Arabic ؟, Spanish ¿…?), on a space-delimited side. "text only" rows change text only
//   (#447: clips already ask); the rest also re-record that side's clip(s) in their own voice (audio14.cjs, after
//   apply). HELD: Japanese/Chinese sides (rule 2, ear), rewrites/deletes/"match the sides"/conditional re-records,
//   and a fix whose named side disagrees with the side the copy shows lacking the mark.
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('../../paid-cleanup-717/tools/lib.cjs');
const cs = require(path.join(L.ROOT, 'services/shared/changeset.cjs'));
const OUT = path.resolve(__dirname, '..');
const [item, ...rest] = process.argv.slice(2);
const courses = rest.length ? rest : L.COURSES;
const JOB = '#236·AL';
const KAI_GO = 'Kai Y 24 Nov ("Yes, tonight is good for those"), on the #791·AK plans for items 9/14/16/18';
const QM = /[?？؟]\s*$/;
const clean = (t) => String(t == null ? '' : t);

function guardOf(C, seedNumber, legoId) {
  const s = C.seeds.get(seedNumber), l = C.byLego.get(legoId);
  return { seed_number: seedNumber, seed: { known_text: s ? s.known_text : null, target_text: s ? s.target_text : null },
    lego_id: legoId, lego: [{ known_text: l ? l.known_text : null, target_text: l ? l.target_text : null }] };
}
function writeSet(file, C, header, ops, guards) {
  if (!ops.length) return 0;
  cs.write(file, { course: C.course, job: JOB, source: `nightly copy ${C.db}`, kai_go: KAI_GO, ...header }, ops);
  L.wr(file.replace(/\.changeset\.jsonl$/, '.guards.json'), { changeset: header.id, copy_db: C.db, guards });
  return ops.length;
}
const real = (C, l) => l.rows.filter((p) => C.played(p, l));

function item18(C, dir) {
  const ops = [], guards = [], held = [];
  for (const l of C.legos) {
    if (!l.is_new) continue;
    const rows = real(C, l);
    const groups = new Map();
    for (const p of rows) { const k = C.key(p.known_text, p.target_text); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p); }
    const gone = new Set();
    for (const g of groups.values()) {
      if (g.length < 2) continue;
      if (new Set(g.map((p) => p.t1 || '')).size > 1) {
        held.push({ lego: l.lego_id, rows: g.map((p) => p.sid), reason: 'twins point at different target clips: which take stays is a choice, not a rule' }); continue;
      }
      const B = g.filter((p) => p.phrase_role === 'build'), U = g.filter((p) => p.phrase_role === 'use');
      const buildsElsewhere = rows.filter((p) => p.phrase_role === 'build' && !g.includes(p) && !gone.has(p.sid)).length;
      let keep;
      if (U.length && B.length) keep = buildsElsewhere === 0 ? B[0] : U[0];   // rule 2/3: keep the USE unless it costs the last BUILD
      else keep = g[0];                                                     // rule 1: the earlier row (rows are in position order)
      for (const p of g) {
        if (p === keep) continue;
        gone.add(p.sid);
        ops.push(cs.op('phrase.delete', { phrase_id: p.id, expect: { known_text: p.known_text, target_text: p.target_text } }));
        guards.push(guardOf(C, l.seed_number, l.lego_id));
      }
    }
    if (rows.length && rows.every((p) => gone.has(p.sid))) throw new Error(`${C.course} ${l.lego_id}: item 18 would empty a basket (P30)`);
  }
  const n = writeSet(path.join(dir, 'item18.changeset.jsonl'), C, { id: `${C.course}-item18-cs236`,
    why: 'paid cleanup item 18: the same row twice in one basket; delete the later twin (BUILD+USE: drop the BUILD unless it is the last BUILD). Same clip both sides; 0 audio. Clips are never deleted.' }, ops, guards);
  return { ops: n, held };
}

function item16(C, dir) {
  const mOps = [], mGuards = [], fOps = [], fGuards = [], held = [];
  const first = new Map();
  const nextPos = new Map();   // earlier LEGO → next free position / role numbers (moves into one basket from several LEGOs)
  for (const l of C.legos) {
    const k = C.key(l.known_text, l.target_text);
    const f = first.get(k);
    if (l.is_new === false && !f) held.push({ lego: l.lego_id, kind: 'notnew_untaught', reason: 'plan: not a flag sweep; reader pass (pieces / make NEW / re-home, L30/P25) first' });
    if (l.is_new === true && f) {
      const e = C.byLego.get(f);
      if (e.seed_number === l.seed_number) { held.push({ lego: l.lego_id, earlier: f, kind: 'dup_debut_same_seed', reason: 'plan rule 2: same-seed twins are read by hand' }); }
      else {
        const have = new Set(e.rows.map((p) => C.key(p.known_text, p.target_text)));
        const toMove = real(C, l).filter((p) => !have.has(C.key(p.known_text, p.target_text)));
        const bad = toMove.map((p) => ({ p, w: L.untaught(C, p, e) })).filter((x) => x.w.length);
        if (bad.length) {
          held.push({ lego: l.lego_id, earlier: f, kind: 'dup_debut_untaught_at_earlier', reason: `moving would put words not yet taught at ${f} into its basket (P25 re-home is judgement)`,
            rows: bad.map((x) => ({ id: x.p.sid, words: x.w.slice(0, 6) })) });
        } else if (e.is_new !== true) {
          held.push({ lego: l.lego_id, earlier: f, kind: 'dup_debut_earlier_not_new', reason: `earlier teaching ${f} is itself not NEW` });
        } else {
          if (!nextPos.has(f)) {
            const num = { build: 0, use: 0 };
            for (const p of e.rows) { const m = /([A-Z])(\d+)$/.exec(p.sid); if (!m) continue; const role = p.phrase_role; if (role in num) num[role] = Math.max(num[role], Number(m[2])); }
            nextPos.set(f, { pos: Math.max(0, ...e.rows.map((p) => p.position ?? 0)), num, taken: new Set(e.rows.map((p) => p.sid)) });
          }
          const np = nextPos.get(f);
          const group = `${l.lego_id}->${f}`;
          const g = guardOf(C, e.seed_number, f);
          const gl = guardOf(C, l.seed_number, l.lego_id);
          for (const p of toMove) {
            let id; do { np.num[p.phrase_role] += 1; id = L.makePhraseId(C.course, e.seed_number, e.lego_index, p.phrase_role, np.num[p.phrase_role]); } while (np.taken.has(L.short(id)));
            np.taken.add(L.short(id)); np.pos += 1;
            const row = { id, seed_number: e.seed_number, lego_index: e.lego_index, position: np.pos, known_text: p.known_text, target_text: p.target_text,
              phrase_role: p.phrase_role, introduce: true, connected_lego_ids: [], status: p.status || 'draft',
              metadata: { format: 'build_use', pipeline: 'cs236-item16-move', moved_from: p.id, canon: 'item 16 rule 1' },
              // word_count / lego_count are NOT NULL (25 Nov night: refused without them); same convention as plan12/item9 build.
              word_count: p.target_text.length, lego_count: (p.known_text.match(/\s+/g) || []).length + 1,
              lego_position: L.computeLegoPosition(p.target_text, e.target_text) };
            if (p.target_text_roman) row.target_text_roman = p.target_text_roman;
            mOps.push(cs.op('phrase.insert', { row, group })); mGuards.push(g);
            for (const [slot, a] of [['known', p.ka], ['target1', p.t1], ['target2', p.t2]]) {
              if (!a) continue;
              mOps.push(cs.op('audio.link', { target: 'phrase', phrase_id: id, slot, audio_id: a, group })); mGuards.push(g);
            }
            fOps.push(cs.op('phrase.delete', { phrase_id: p.id, expect: { known_text: p.known_text, target_text: p.target_text }, group, moved_to: id })); fGuards.push(gl);
          }
          fOps.push(cs.op('lego.update', { lego_id: l.lego_id, set: { is_new: false }, expect: { is_new: true, known_text: l.known_text, target_text: l.target_text }, group })); fGuards.push(gl);
        }
      }
    }
    if (!f) first.set(k, l.lego_id);
  }
  const why = 'paid cleanup item 16 rule 1: a LEGO taught NEW twice (first teaching in an earlier seed) — move its unique rows to the first debut with their own clips (0 chars), then set the later LEGO not-new.';
  const a = writeSet(path.join(dir, 'item16-moves.changeset.jsonl'), C, { id: `${C.course}-item16-moves-cs236`, why: why + ' Part 1: inserts + links.' }, mOps, mGuards);
  const b = writeSet(path.join(dir, 'item16-flips.changeset.jsonl'), C, { id: `${C.course}-item16-flips-cs236`, why: why + ' Part 2: deletes + is_new:false; applied only through gate16.cjs (groups whose inserts all landed).' }, fOps, fGuards);
  return { ops: a + b, moves: mOps.filter((o) => o.op === 'phrase.insert').length, flips: fOps.filter((o) => o.op === 'lego.update').length, held };
}

const LANG_NAME = { English: ['eng'], Arabic: ['ara', 'ara_eg', 'ara_lb'], Korean: ['kor'], Spanish: ['spa', 'spa_mx'], French: ['fra', 'fra_ca'], German: ['deu', 'deu_at', 'deu_ch'], Portuguese: ['por', 'por_br'] };
function item14(C, dir) {
  const ops = [], guards = [], held = [];
  const scan = L.rd(path.join(L.ITEM_DIR, 'scan-rows-447-real.json')).filter((r) => r.fam === 'QMARK' && r.course === C.course);
  const [tl, kl] = C.course.split('_for_');
  for (const r of scan) {
    const id = String(r.row);
    const l = C.byLego.get(id.slice(0, 8));
    const p = l && l.rows.find((x) => x.sid === id);
    const hold = (reason) => held.push({ row: id, known: r.known, target: r.target, fix: r.fix, reason });
    if (!p) { hold('row not on the copy'); continue; }
    if (clean(p.known_text) !== clean(r.known) || clean(p.target_text) !== clean(r.target)) { hold('row text changed since the #447 read'); continue; }
    const kq = QM.test(clean(p.known_text).trim()), tq = QM.test(clean(p.target_text).trim());
    if (kq === tq) { hold('no longer one-sided on the copy'); continue; }
    const side = kq ? 'target' : 'known';
    const lang = side === 'known' ? kl : tl;
    const fix = clean(r.fix);
    if (!/^(text only|add |english gains)/i.test(fix) || /only if|reword|delete|match|drop|→|garble|unnatural/i.test(fix)) { hold('not a plain add-the-mark fix (rewrite / delete / conditional re-record): judgement'); continue; }
    if (['jpn', 'zho'].includes(lang)) { hold('Japanese/Chinese side: rule 2, an ear question'); continue; }
    const named = Object.entries(LANG_NAME).find(([n]) => new RegExp(`\\b${n}\\b`).test(fix));
    if (named && !named[1].includes(lang)) { hold(`fix names ${named[0]} but the copy's unmarked side is ${side} (${lang})`); continue; }
    if (/\bknown\b/.test(fix) && side !== 'known' && !/English/.test(fix)) { hold(`fix names the known side but the unmarked side is ${side}`); continue; }
    if (/\btarget\b/.test(fix) && side !== 'target' && !/English|Arabic|Korean/.test(fix)) { hold(`fix names the target side but the unmarked side is ${side}`); continue; }
    const col = `${side}_text`;
    const before = clean(p[col]);
    const mark = lang.startsWith('ara') ? '؟' : '?';
    let after = before.replace(/[\s.。!]+$/u, '') + mark;
    if (lang.startsWith('spa') && !/^\s*¿/.test(after)) after = '¿' + after.replace(/^\s+/, '');
    const textOnly = /text only|clips? unchanged/i.test(fix);
    // audio_id null = the slot is silent today: audio14.cjs fills it (render + link-clip fill-only) instead of re-recording.
    const slots = textOnly ? [] : (side === 'known' ? [['known', p.ka]] : [['target1', p.t1], ['target2', p.t2]]).map(([slot, a]) => ({ slot, audio_id: a || null }));
    ops.push(cs.op('phrase.update', { phrase_id: p.id, set: { [col]: after }, expect: { [col]: before }, rerecord: slots, side }));
    guards.push(guardOf(C, l.seed_number, l.lego_id));
  }
  const n = writeSet(path.join(dir, 'item14.changeset.jsonl'), C, { id: `${C.course}-item14-cs236`,
    why: 'paid cleanup item 14 rule 1: question on one side only — add the missing mark (#447 hand read, plain cases). Rows with "rerecord" slots get that clip re-recorded in its own voice after apply (audio14.cjs); "text only" rows keep their clips (#447: already question-intoned).' }, ops, guards);
  return { ops: n, rerecordRows: ops.filter((o) => o.rerecord.length).length, held };
}

const fn = { 18: item18, 16: item16, 14: item14 }[item];
if (!fn) { console.error('usage: build.cjs 18|16|14 [course…]'); process.exit(1); }
const sum = { item, copy: null, courses: {}, totals: {} };
for (const c of courses) {
  if (!fs.existsSync(path.join(L.SNAP, `${c}.json`))) continue;
  const C = L.load(c);
  sum.copy = C.db;
  const dir = path.join(OUT, `item${item}`, c);
  const r = fn(C, dir);
  if (r.held.length) L.wr(path.join(dir, 'held.json'), r.held);
  const row = { ...r, held: r.held.length };
  if (r.ops || r.held.length) sum.courses[c] = row;
  for (const [k, v] of Object.entries(row)) if (typeof v === 'number') sum.totals[k] = (sum.totals[k] || 0) + v;
  if (r.ops || r.held.length) console.log(c.padEnd(16), JSON.stringify(row));
}
L.wr(path.join(OUT, `item${item}`, 'summary.json'), sum);
console.log('TOTAL', JSON.stringify(sum.totals));
