#!/usr/bin/env node
/**
 * HAIKU vs REGEX — agreement, the coverage map under each tagger, and a
 * stratified sample of disagreements for a hand check. READ-ONLY.
 *
 * A disagreement is one (phrase, frame) pair where exactly one tagger fires.
 * The sample is stratified by frame (round-robin over frames, seeded shuffle),
 * so the check sees the whole spread of frames rather than the commonest one.
 *
 * Window coverage here mirrors window-coverage.cjs scoreWindow, but takes the
 * frame set per phrase from either tagger; availability (frame-inventory) is
 * the same for both, so the two maps differ only in what counts as USED.
 *
 * Usage: node tools/frame-layer/v4/audit-compare.cjs fra_for_eng [--sample 50]
 * Output: $V4_EVIDENCE/audit-compare-<course>.json, disagreement-sample-<course>.json
 */
const fs = require('fs');
const path = require('path');
const PATTERNS = require('../patterns.cjs');
const { loadCourse } = require('./db.cjs');
const { inventory, availableAt } = require('./frame-inventory.cjs');
const { framesOf, rarefy } = require('./window-coverage.cjs');
const { loadAudit } = require('./haiku-audit.cjs');

const EVIDENCE = process.env.V4_EVIDENCE || path.join(process.env.HOME, 'ssi-evidence', 'ssi-dashboard-v7', '31-fra-frame-coverage');
const IDS = PATTERNS.map(p => p.id);

/**
 * HYBRID tagger, from the #31 hand check of 50 disagreements (fra_for_eng):
 * where only Haiku fired it was right 14/14 (2 ambiguous) — the regexes miss
 * "don't", "there's", "I have tried"; where only the regex fired it was 17-17,
 * the regex right on frames whose fixed material IS a keyword (modals, going
 * to, hope, although) and wrong on structural frames (relative that, matrix
 * know/say with no clause, like-as-preposition, "as if"). So: Haiku's frames,
 * plus the regex's on the keyword frames only.
 */
const KEYWORD_FRAMES = new Set(['P1', 'P2', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P11', 'P15', 'P17', 'P24', 'P25', 'P28']);
const hybrid = (h, r) => [...new Set([...(h || []), ...r.filter(f => KEYWORD_FRAMES.has(f))])].sort((a, b) => +a.slice(1) - +b.slice(1));

function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function scoreSets(sets, available) {
  const avail = new Set(available);
  const used = new Map();
  const fsets = sets.map(s => s.filter(f => avail.has(f)));
  for (const s of fsets) for (const f of s) used.set(f, (used.get(f) || 0) + 1);
  return { phrases: sets.length, available: available.length, used: used.size,
    coverage: available.length ? +(used.size / available.length).toFixed(3) : null,
    rarefied_at_60: rarefy(fsets, 60), missing_ids: available.filter(f => !used.has(f)),
    thin_ids: available.filter(f => (used.get(f) || 0) === 1), counts: Object.fromEntries(used) };
}

function windows(rows, inv, tag, size) {
  const maxSeed = Math.max(...rows.map(r => r.seed_number));
  const out = [];
  for (let start = 1; start <= maxSeed; start += size) {
    const end = Math.min(start + size - 1, maxSeed);
    const win = rows.filter(r => r.seed_number >= start && r.seed_number <= end);
    if (!win.length) continue;
    out.push({ start, end, ...scoreSets(win.map(tag), availableAt(inv, end)) });
  }
  return out;
}

function compare(course, sampleN = 50) {
  const data = loadCourse(course);
  const inv = inventory(course, data);
  const H = loadAudit(path.join(EVIDENCE, `haiku-audit-${course}`));
  const rows = data.phrases.map(p => ({ ...p, H: H.get(String(p.known_text || '').trim()) ?? null, R: framesOf(p.known_text) }));
  const tagged = rows.filter(r => Array.isArray(r.H));
  const perFrame = {};
  for (const id of IDS) perFrame[id] = { both: 0, haiku_only: 0, regex_only: 0, neither: 0 };
  let exact = 0;
  const dis = [];
  for (const r of tagged) {
    const h = new Set(r.H), g = new Set(r.R);
    if (h.size === g.size && [...h].every(x => g.has(x))) exact++;
    for (const id of IDS) {
      const a = h.has(id), b = g.has(id);
      const k = a && b ? 'both' : a ? 'haiku_only' : b ? 'regex_only' : 'neither';
      perFrame[id][k]++;
      if (a !== b) dis.push({ id: r.id, seed: r.seed_number, role: r.phrase_role, known: r.known_text, frame: id, fired_by: a ? 'haiku' : 'regex' });
    }
  }
  for (const id of IDS) {
    const f = perFrame[id], n = tagged.length;
    const po = (f.both + f.neither) / n;
    const pa = ((f.both + f.haiku_only) / n) * ((f.both + f.regex_only) / n) + ((f.neither + f.regex_only) / n) * ((f.neither + f.haiku_only) / n);
    f.kappa = pa < 1 ? +((po - pa) / (1 - pa)).toFixed(3) : 1;
    f.name = PATTERNS.find(p => p.id === id).name;
  }
  // stratified disagreement sample: dedupe by (known, frame), round-robin over frames
  const rnd = mulberry32(31);
  const seen = new Set();
  const byFrame = new Map(IDS.map(id => [id, []]));
  for (const d of dis) { const k = d.known.toLowerCase() + '|' + d.frame; if (seen.has(k)) continue; seen.add(k); byFrame.get(d.frame).push(d); }
  for (const [id, arr] of byFrame) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } }
  const sample = [];
  const order = [...IDS].sort((a, b) => byFrame.get(b).length - byFrame.get(a).length);
  for (let round = 0; sample.length < sampleN && round < 200; round++)
    for (const id of order) { if (sample.length >= sampleN) break; const d = byFrame.get(id)[round]; if (d) sample.push(d); }

  const tagH = r => r.H || [], tagR = r => r.R, tagX = r => hybrid(r.H, r.R);
  const out = {
    course, generated: new Date().toISOString(), rows: rows.length, haiku_tagged_rows: tagged.length,
    exact_set_agreement: +(exact / tagged.length).toFixed(3),
    disagreement_pairs: dis.length,
    per_frame: perFrame,
    windows: {
      regex: { w10: windows(rows, inv, tagR, 10), w20: windows(rows, inv, tagR, 20) },
      haiku: { w10: windows(tagged, inv, tagH, 10), w20: windows(tagged, inv, tagH, 20) },
      hybrid: { w10: windows(tagged, inv, tagX, 10), w20: windows(tagged, inv, tagX, 20) },
    },
    frames_per_phrase: { regex: +(tagged.reduce((a, r) => a + r.R.length, 0) / tagged.length).toFixed(2), haiku: +(tagged.reduce((a, r) => a + r.H.length, 0) / tagged.length).toFixed(2) },
  };
  fs.writeFileSync(path.join(EVIDENCE, `audit-compare-${course}.json`), JSON.stringify(out, null, 1));
  fs.writeFileSync(path.join(EVIDENCE, `disagreement-sample-${course}.json`), JSON.stringify(sample, null, 1));
  return { out, sample };
}

module.exports = { compare, scoreSets, hybrid, KEYWORD_FRAMES, windows };

if (require.main === module) {
  const a = process.argv.slice(2);
  const course = a.find(x => !x.startsWith('--') && isNaN(+x)) || 'fra_for_eng';
  const si = a.indexOf('--sample');
  const { out, sample } = compare(course, si >= 0 ? +a[si + 1] : 50);
  console.log(`${course}: ${out.haiku_tagged_rows}/${out.rows} rows tagged; exact frame-set agreement ${out.exact_set_agreement}; ${out.disagreement_pairs} disagreeing (phrase,frame) pairs; frames/phrase regex ${out.frames_per_phrase.regex} haiku ${out.frames_per_phrase.haiku}`);
  console.log('frame  both  H-only  R-only  kappa  name');
  for (const [id, f] of Object.entries(out.per_frame)) console.log(`${id.padEnd(4)} ${String(f.both).padStart(5)} ${String(f.haiku_only).padStart(7)} ${String(f.regex_only).padStart(7)}  ${String(f.kappa).padStart(5)}  ${f.name}`);
  const mean = (ws) => +(ws.reduce((x, w) => x + w.coverage, 0) / ws.length).toFixed(3);
  console.log(`mean w20 coverage: regex ${mean(out.windows.regex.w20)}, haiku ${mean(out.windows.haiku.w20)}, hybrid ${mean(out.windows.hybrid.w20)}; sample ${sample.length}`);
  for (const t of ['regex', 'hybrid']) console.log(t, 'weakest w10:', [...out.windows[t].w10].sort((a, b) => a.coverage - b.coverage || a.rarefied_at_60 - b.rarefied_at_60).slice(0, 8).map(w => `${w.start}-${w.end} ${w.coverage} (${w.used}/${w.available}, n${w.phrases})`).join(' · '));
}
