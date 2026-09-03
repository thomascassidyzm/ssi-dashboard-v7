#!/usr/bin/env node
// eng_for_hin: English embedded-question word order on the TARGET (English) side.
//
// 47 practice phrases across 10 seeds drop a main-clause interrogative LEGO verbatim under a matrix
// verb ("I don't know" + "what would you like"), which English does not permit. Hindi's chunk is
// invariant under embedding; English's is not, so the generator's concatenation produced wrong
// English that every builder gate waved through — the phrase tiles the taught chunk exactly, and
// none of the 10 seeds is in the 46-seed validator failure set.
//
// The grammatically-correct rewrite is NOT producible: 0 of 47 pass, measured. All 47 fail LEGO
// containment and 42 also fail the whole-chunk vocabulary DP gate, because the corrected clause
// ("what you would like") is a different chunk that the course never taught. Per R0.1 that fix
// would be worse than the defect. So 47 rows are REPHRASED to main-clause frames built from the
// same LEGO plus adjunct chunks taught much earlier, 1 row is corrected in place (s569 p8, adding
// the taught standalone chunk "if"), and 1 row has its Hindi realigned to its own decomposition
// (s644 p8). Full reasoning, gate output and escalation:
//   docs/eng-for-hin-embedded-questions-2026-09-03/README.md
//
// NOT touched: any LEGO, any seed, any other phrase. No chunk is grown, split or re-cited, so the
// downstream tiling load of every affected LEGO is unchanged. The curriculum gap underneath — that
// the embedded-question transformation is taught nowhere, and that seeds 569/570 disagree on the
// same Hindi — is escalated in the README, not fixed here.
//
// AUDIO: nothing generated. None of the 49 rows carries English audio, so 0 clips need
// re-recording; one Hindi known-side clip (s570 p2) goes stale. On a real apply, finish by queueing
// an audio pass (O8) rather than rendering — and eng_for_hin is all-xAI, which is retired anyway.
//
//   node tools/course-optimization/fix-eng-for-hin-embedded-questions-2026-09-03.cjs          (dry run)
//   APPLY=1 node tools/course-optimization/fix-eng-for-hin-embedded-questions-2026-09-03.cjs  (writes)
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
require(path.join(ROOT, 'node_modules', 'dotenv')).config({ path: path.join(ROOT, '.env') });
const fs = require('fs');
const { checkVocabViolations } = require(path.join(ROOT, 'services/course-builder/lib/validation.cjs'));
const { extractVocab, normalizeForContainment } = require(path.join(ROOT, 'services/course-builder/lib/text-normalization.cjs'));

const APPLY = process.env.APPLY === '1';
const COURSE = 'eng_for_hin';
const URL = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY;
const outDir = path.join(ROOT, 'docs', 'eng-for-hin-embedded-questions-2026-09-03');
const proposal = JSON.parse(fs.readFileSync(path.join(outDir, 'proposed-rows.json'), 'utf8'));

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const get = async (q) => {
  const r = await fetch(`${URL}/rest/v1/${q}`, { headers: H });
  if (!r.ok) throw new Error(`${q} -> ${r.status} ${await r.text()}`);
  return r.json();
};

// The corrected sentence must still tile from chunks taught at or before its seed, and must still
// contain its LEGO. Refusing on either is the whole point — a fix that fails these is the defect
// we are removing, in the other direction.
function buildVocab(legos, seedNumber) {
  const v = new Set();
  for (const l of legos) {
    if (l.seed_number > seedNumber) continue;
    extractVocab(l.target_text, false).forEach(x => v.add(x));
    if (l.type === 'M' && l.components) for (const c of l.components) extractVocab(c.target, false).forEach(x => v.add(x));
  }
  return v;
}

// Decomposition tiles concatenate with NO separator — the space lives inside the tile. A trailing
// '?' has no LEGO and is carried as a ghost, which is what every other row in this course does.
function buildDecomposition(row, legoById) {
  const tiles = [];
  let i = 0;
  for (const id of row.tiles) {
    const l = legoById[id];
    if (!l) return { error: `unknown lego ${id}` };
    tiles.push({ known: l.known_text, legoId: id, target: (i++ ? ' ' : '') + l.target_text, isGhost: false });
  }
  let joined = tiles.map(t => t.target).join('');
  const rest = row.target.slice(joined.length);
  if (rest) {
    if (!/^[?.!]$/.test(rest)) return { error: `tiles do not reconstruct target: "${joined}" + "${rest}"` };
    tiles.push({ known: '', legoId: null, target: rest, isGhost: true });
    joined += rest;
  }
  if (joined !== row.target) return { error: `reconstruction mismatch: "${joined}" !== "${row.target}"` };
  return { tiles };
}

(async () => {
  const legos = await get(`course_legos?course_code=eq.${COURSE}&select=seed_number,lego_index,lego_id,type,known_text,target_text,components&order=seed_number,lego_index`);
  const legoById = Object.fromEntries(legos.map(l => [l.lego_id, l]));
  const legoOfSeed = {};
  for (const l of legos) if (l.lego_index === 1) legoOfSeed[l.seed_number] = l;

  const log = [];
  let ready = 0, refused = 0, written = 0;

  for (const row of proposal) {
    const key = `s${row.seed} L${row.li} p${row.pos}`;
    const found = await get(`course_practice_phrases?course_code=eq.${COURSE}&seed_number=eq.${row.seed}&lego_index=eq.${row.li}&position=eq.${row.pos}&select=id,known_text,target_text,known_audio_id,target1_audio_id,target2_audio_id`);
    if (found.length !== 1) { log.push({ key, status: 'ABORT_NOT_FOUND', n: found.length }); refused++; continue; }
    const cur = found[0];

    // Drift guard: the row must still say what the proposal read. Another writer on this course
    // moving it is a refusal, never a guess.
    if (cur.target_text === row.target && cur.known_text === row.known) {
      log.push({ key, status: 'SKIP_ALREADY_APPLIED' }); continue;
    }

    const lego = legoOfSeed[row.seed];
    const viol = checkVocabViolations([{ target: row.target }], buildVocab(legos, row.seed), COURSE);
    if (viol.length) { log.push({ key, status: 'ABORT_VOCAB', unknown: viol[0].unknown }); refused++; continue; }
    if (!normalizeForContainment(row.target).includes(normalizeForContainment(lego.target_text))) {
      log.push({ key, status: 'ABORT_CONTAINMENT', lego: lego.target_text }); refused++; continue;
    }
    const dec = buildDecomposition(row, legoById);
    if (dec.error) { log.push({ key, status: 'ABORT_DECOMPOSITION', detail: dec.error }); refused++; continue; }

    const entry = {
      key, id: cur.id, kind: row.kind,
      known_before: cur.known_text, known_after: row.known,
      target_before: cur.target_text, target_after: row.target,
      decomposition: dec.tiles,
      known_audio_id: cur.known_audio_id, target1_audio_id: cur.target1_audio_id, target2_audio_id: cur.target2_audio_id,
      status: 'READY',
    };
    ready++;

    if (APPLY) {
      const r = await fetch(`${URL}/rest/v1/course_practice_phrases?id=eq.${cur.id}&target_text=eq.${encodeURIComponent(cur.target_text)}`, {
        method: 'PATCH', headers: { ...H, Prefer: 'return=representation' },
        body: JSON.stringify({ known_text: row.known, target_text: row.target, decomposition: dec.tiles }),
      });
      const body = await r.json();
      if (!r.ok || body.length !== 1) { entry.status = 'WRITE_FAILED'; entry.detail = JSON.stringify(body).slice(0, 300); refused++; ready--; }
      else { entry.status = 'WRITTEN'; written++; }
    }
    log.push(entry);
  }

  const file = path.join(outDir, APPLY ? 'applied-log.json' : 'dryrun-log.json');
  fs.writeFileSync(file, JSON.stringify({ course: COURSE, apply: APPLY, at: new Date().toISOString(), ready, refused, written, rows: log }, null, 1));
  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'}: ${proposal.length} proposed, ${ready} ready, ${written} written, ${refused} refused -> ${path.relative(ROOT, file)}`);
  for (const e of log) if (e.status !== 'READY' && e.status !== 'WRITTEN') console.log(`  ${e.status} ${e.key} ${e.detail || e.unknown || ''}`);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
