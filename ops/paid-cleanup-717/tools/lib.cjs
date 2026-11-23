// Shared helpers for paid cleanup items 12/14/15/16/18 (cs #717·AI, Kai 18 Nov 2026).
// Reads ONLY the snapshot JSON written by tools/paid-cleanup-717/snapshot.cjs (QA copy) — no DB code.
// Normalisers and the vocabulary check are the course builder's own committed functions, so what
// these planners call "the same row" or "taught" is what the builder's validator calls it.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const ROOT = path.resolve(__dirname, '../../..');
const req = (p) => require(path.join(ROOT, p));
const { normalizeForZUT, normalizeForContainment, checkWordContainment } = req('services/course-builder/lib/text-normalization.cjs');
const { checkVocabViolations } = req('services/course-builder/lib/validation.cjs');
const { isChinese } = req('services/course-builder/lib/language-config.cjs');
const { makePhraseId, computeLegoPosition } = req('services/course-builder/lib/phrase-structure.cjs');

const EVID = path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-717');
// cs #791·AK (overnight #785 item 8): P717_SNAP reads snapshots of a newer copy without overwriting the 19 Nov ones.
const SNAP = process.env.P717_SNAP ? path.resolve(process.env.P717_SNAP) : path.join(EVID, 'snap');
const ITEM_DIR = path.resolve(__dirname, '..');
const COURSES = ['ara_eg_for_eng', 'ara_for_eng', 'ara_lb_for_eng', 'deu_at_for_eng', 'deu_ch_for_eng', 'deu_for_eng', 'deu_for_jpn', 'deu_for_zho',
  'eng_for_ara', 'eng_for_ben', 'eng_for_deu', 'eng_for_fra', 'eng_for_guj', 'eng_for_hin', 'eng_for_ita', 'eng_for_jpn', 'eng_for_kan', 'eng_for_kor',
  'eng_for_mar', 'eng_for_pan', 'eng_for_por', 'eng_for_sin', 'eng_for_spa', 'eng_for_tam', 'eng_for_tel', 'eng_for_urd', 'eng_for_zho', 'fra_ca_for_eng',
  'fra_for_eng', 'fra_for_jpn', 'fra_for_zho', 'ita_for_eng', 'ita_for_jpn', 'ita_for_zho', 'jpn_for_eng', 'kor_for_eng', 'kor_for_hin', 'kor_for_tam',
  'por_br_for_eng', 'por_for_eng', 'spa_for_eng', 'spa_for_jpn', 'spa_for_zho', 'spa_mx_for_eng', 'zho_for_eng', 'zho_for_hin', 'zho_for_jpn', 'zho_for_tam'];

const short = (id) => String(id).split(':').slice(1).join(':');
const lid = (s, l) => `S${String(s).padStart(4, '0')}L${String(l).padStart(2, '0')}`;

/** Load a snapshot and index it: seeds by number, LEGOs by id (in teaching order), baskets by LEGO id. */
function load(course) {
  const d = JSON.parse(fs.readFileSync(path.join(SNAP, `${course}.json`), 'utf8'));
  const spaceless = isChinese(course);
  const known = course.split('_for_')[1];
  // Script full stops / commas the builder's normaliser keeps (Urdu ۔, Devanagari ।, CJK 。、，, Arabic ،؛, ¿¡):
  // punctuation only, never a different sentence (canon A7: a full stop makes no difference).
  const P = (t) => String(t || '').replace(/[۔।॥。、，．！？；：،؛¿¡…]/g, ' ').replace(/\s+/g, ' ').trim();
  const zk = (t) => normalizeForZUT(P(t), ['zho', 'jpn'].includes(known)).replace(/\s+/g, ' ').trim();
  const zt = (t) => normalizeForZUT(P(t), spaceless).replace(/\s+/g, ' ').trim();
  const seeds = new Map(d.seeds.map((s) => [s.seed_number, s]));
  const legos = d.legos.slice().sort((a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index);
  legos.forEach((l, i) => { l.lego_id = l.lego_id || lid(l.seed_number, l.lego_index); l.ord = i; l.rows = []; });
  const byLego = new Map(legos.map((l) => [l.lego_id, l]));
  for (const p of d.phrases) {
    const l = byLego.get(lid(p.seed_number, p.lego_index));
    p.sid = short(p.id);
    if (l) l.rows.push(p);
  }
  for (const l of legos) l.rows.sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.sid.localeCompare(b.sid));
  const played = (p, l) => l && l.is_new && (p.phrase_role === 'build' || p.phrase_role === 'use');
  return { ...d, spaceless, zk, zt, seeds, legos, byLego, played, key: (k, t) => zk(k) + ' | ' + zt(t) };
}

/** Vocabulary the learner has by a basket: every LEGO + component target taught at or before it. */
function vocabUpTo(C, ord) {
  const v = new Set();
  for (const l of C.legos) {
    if (l.ord > ord) break;
    v.add(normalizeForContainment(l.target_text));
    if (Array.isArray(l.components)) for (const c of l.components) if (c && c.target) v.add(normalizeForContainment(c.target));
  }
  return v;
}
function untaught(C, row, lego) {
  const v = vocabUpTo(C, lego.ord);
  const r = checkVocabViolations([{ target: row.target_text }], v, C.course, { seedNumber: lego.seed_number });
  return r.map((x) => x.unknown || x.word || x.words || x).flat();
}

const rd = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const wr = (f, o) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o, null, 1)); };

/** Rows / LEGOs owned by sibling cleanup families (items 3-9) in the #447 scan: never written here. */
function siblingOwned(course) {
  const all = rd(path.join(ITEM_DIR, 'scan-rows-447-real.json'));
  const fams = new Set(['PROMPT', 'NONSENSE', 'ENGRAM', 'TGRAM', 'CARRY', 'GENDER', 'UNTAUGHT']); // items 3-9
  const s = new Set();
  for (const r of all) if (r.course === course && fams.has(r.fam) && r.row) s.add(String(r.row).replace(/^seed[: ]/, 'seed:'));
  return s;
}

module.exports = { ROOT, EVID, SNAP, ITEM_DIR, COURSES, short, lid, load, vocabUpTo, untaught, rd, wr, siblingOwned,
  normalizeForZUT, normalizeForContainment, checkWordContainment, makePhraseId, computeLegoPosition, isChinese };
