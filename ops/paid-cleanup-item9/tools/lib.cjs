// Shared helpers for paid-cleanup item 4 (cs #700·AI). Reads ONLY the JSON that
// tools/fetch.sh pulled from Popty's GET /api/production/:course/seeds route; no DB code.
// Validation logic is the course-builder's own committed functions, so the local
// pre-check and the :3471 /api/v2/validate gate cannot disagree on what they test.
const fs = require('fs');
const path = require('path');
const os = require('os');
const ROOT = path.resolve(__dirname, '../../..');
const req = (p) => require(path.join(ROOT, p));
const { normalizeForContainment, extractVocab, normalizeForZUT } = req('services/course-builder/lib/text-normalization.cjs');
const { phraseContainsLego } = req('services/course-builder/lib/separable-verbs.cjs');
const { checkBuildUsePhrases, computeLegoPosition, isBareLegoPhrase, makePhraseId } = req('services/course-builder/lib/phrase-structure.cjs');
const { checkVocabViolations } = req('services/course-builder/lib/validation.cjs');
const { isChinese } = req('services/course-builder/lib/language-config.cjs');

const LIVE_DIR = path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-item9/live');
const ITEM_DIR = path.resolve(__dirname, '..');
const TODAY = '2026-11-18';

function loadLive(course) {
  const d = JSON.parse(fs.readFileSync(path.join(LIVE_DIR, `${course}.json`), 'utf8'));
  const seeds = d.seeds.slice().sort((a, b) => a.seed_number - b.seed_number);
  for (const s of seeds) {
    s.legos.sort((a, b) => a.lego_index - b.lego_index);
    for (const l of s.legos) {
      l.lego_id = l.lego_id || `S${String(s.seed_number).padStart(4, '0')}L${String(l.lego_index).padStart(2, '0')}`;
      l.basket_phrases.sort((a, b) => a.position - b.position);
    }
  }
  return seeds;
}

function scanRows(course) {
  const all = JSON.parse(fs.readFileSync(path.join(ITEM_DIR, 'scan-rows-2026-11-17.json'), 'utf8'));
  const m = new Map();
  for (const r of all) if (r.course === course) m.set(r.row, r);
  return m;
}

const short = (id) => String(id).split(':').slice(1).join(':');

// Cumulative vocab exactly as /v2/validate's accumulate() builds it.
function accumulate(legos, set, chinese) {
  for (const l of legos) {
    extractVocab(l.target_text, chinese).forEach(v => set.add(v));
    if (l.type === 'M' && Array.isArray(l.components)) for (const c of l.components) extractVocab(c.target, chinese).forEach(v => set.add(v));
  }
}

function containsLego(course, seedNumber, legoTarget, phraseTarget) {
  const n = normalizeForContainment(legoTarget);
  return phraseContainsLego({ courseCode: course, seedNumber, legoTarget, phraseTarget,
    baseline: (lt, pt) => normalizeForContainment(pt).includes(n) });
}

module.exports = { ROOT, LIVE_DIR, ITEM_DIR, TODAY, loadLive, scanRows, short, accumulate, containsLego,
  normalizeForContainment, normalizeForZUT, extractVocab, checkBuildUsePhrases, computeLegoPosition,
  isBareLegoPhrase, makePhraseId, checkVocabViolations, isChinese };
