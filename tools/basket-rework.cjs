#!/usr/bin/env node
/**
 * Basket rework: check and apply USE-phrase replacements from a plan JSON.
 *
 * Plan format:
 * {
 *   "course_code": "zho_for_eng",
 *   "baskets": [{
 *     "seed": 80, "lego_index": 3, "lego_target": "才会准备好",
 *     "edits":   [{ "id": "...U01", "known_text": "...", "target_text": "...", "target_text_roman": "..." }],
 *     "adds":    [{ "phrase_role": "use", "known_text": "...", "target_text": "...", "target_text_roman": "..." }],
 *     "deletes": ["...U03"],
 *     "lego_edits": [{ "known_text": "..." }],   // re-gloss the LEGO itself (target unchanged);
 *                                                 // nulls known + presentation audio (intro speaks the known)
 *     "notes": "why"
 *   }]
 * }
 *
 * check mode:  vocab tiling (≤ seed), LEGO containment, in-basket dups, ZUT vs whole course.
 * apply mode:  writes before-snapshots to a sibling .applied.json, then UPDATE/INSERT/DELETE.
 *              Changed rows: audio FKs nulled (re-voice via regenerate-phrase later),
 *              decomposition/display_tiling nulled (stale), version bumped, status stays draft.
 *
 * Usage: node tools/basket-rework.cjs check  plan.json
 *        node tools/basket-rework.cjs apply  plan.json
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { checkPhraseZUT } = require('../services/course-builder/lib/validation.cjs');
// sector-helix §5b: ZUT is family-wide — a segment is its own course code but one
// course to the learner. Null family for every course with no registry row.
const { courseFamily } = require('../services/course-builder/lib/course-family.cjs');

const [mode, planPath] = process.argv.slice(2);
if (!['check', 'apply'].includes(mode) || !planPath) {
  console.error('usage: basket-rework.cjs check|apply plan.json');
  process.exit(1);
}
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

const strip = (s) => (s || '').replace(/[？。，！、?!,.\s]/g, '');

function findUncovered(phrase, vocab) {
  const n = phrase.length;
  const dp = new Array(n + 1).fill(false);
  dp[0] = true;
  for (let i = 1; i <= n; i++) {
    for (const entry of vocab) {
      const len = entry.length;
      if (len && len <= i && dp[i - len] && phrase.substring(i - len, i) === entry) { dp[i] = true; break; }
    }
  }
  if (dp[n]) return null;
  let last = 0;
  for (let i = 0; i <= n; i++) if (dp[i]) last = i;
  return phrase.substring(last);
}

async function vocabUpTo(course, seed, legoIndex) {
  const { data: legos, error } = await sb.from('course_legos')
    .select('seed_number,lego_index,target_text,components')
    .eq('course_code', course).lte('seed_number', seed);
  if (error) throw new Error(error.message);
  const vocab = new Set();
  for (const l of legos) {
    if (l.seed_number === seed && l.lego_index > legoIndex) continue;
    vocab.add(strip(l.target_text));
    for (const c of l.components || []) if (c.target) vocab.add(strip(c.target));
  }
  vocab.delete('');
  return vocab;
}

(async () => {
  const course = plan.course_code;
  let failures = 0;

  if (mode === 'check') {
    // pre-fetch every basket's rows; replaced (known|target) pairs are excluded from
    // ZUT collisions GLOBALLY — an edit in one basket may resolve a fork in another
    const basketRows = new Map();
    const globalReplaced = new Set();
    for (const b of plan.baskets) {
      const { data: existing } = await sb.from('course_practice_phrases')
        .select('id,phrase_role,known_text,target_text')
        .eq('course_code', course).eq('seed_number', b.seed).eq('lego_index', b.lego_index);
      basketRows.set(b, existing);
      const ids = new Set([...(b.edits || []).map((e) => e.id), ...(b.deletes || [])]);
      for (const p of existing) if (ids.has(p.id)) globalReplaced.add(`${p.known_text.toLowerCase().trim()}|${strip(p.target_text)}`);
    }
    for (const b of plan.baskets) {
      const vocab = await vocabUpTo(course, b.seed, b.lego_index);
      const existing = basketRows.get(b);
      const replacedIds = new Set([...(b.edits || []).map((e) => e.id), ...(b.deletes || [])]);
      const candidates = [...(b.edits || []), ...(b.adds || [])];

      console.log(`\n=== S${b.seed}L${b.lego_index} ${b.lego_target} ===`);
      // resulting USE basket = surviving rows + USE-role candidates only
      // (BUILD-row gloss edits stay out of the dup pool — BUILD may repeat targets)
      const roleById = new Map(existing.map((p) => [p.id, p.phrase_role]));
      const survivors = existing.filter((p) => p.phrase_role === 'use' && !replacedIds.has(p.id));
      const useCandidates = candidates.filter((c) => (c.id ? roleById.get(c.id) === 'use' : (c.phrase_role || 'use') === 'use'));
      const finalTargets = [...survivors.map((p) => strip(p.target_text)), ...useCandidates.map((c) => strip(c.target_text))];
      // declared convergence pairs: identical target, distinct known intentions (deliberate teaching)
      const allowed = new Map((b.convergence_pairs || []).map((cp) => [strip(cp.target), cp.count || 2]));
      const counts = new Map();
      for (const t of finalTargets) counts.set(t, (counts.get(t) || 0) + 1);
      const dupTargets = [...counts.entries()].filter(([t, n]) => n > (allowed.get(t) || 1)).map(([t]) => t);

      for (const c of candidates) {
        const t = strip(c.target_text);
        const probs = [];
        if (!t.includes(strip(b.lego_target))) probs.push('MISSING-LEGO');
        const unc = findUncovered(t, vocab);
        if (unc) probs.push(`UNTAUGHT:「${unc}」`);
        const status = probs.length ? '✗ ' + probs.join(' ') : '✓';
        console.log(`  ${status}  ${c.target_text}  ⟸ ${c.known_text}`);
        if (probs.length) failures++;
      }
      if (dupTargets.length) { console.log(`  ✗ DUP targets in final basket: ${[...new Set(dupTargets)].join(' / ')}`); failures++; }

      // ZUT vs whole course, excluding rows this plan replaces (any basket)
      // lego_edits join the candidate list: their new known must map uniquely to the lego target
      const zutCandidates = [
        ...candidates.map((c) => ({ known: c.known_text, target: c.target_text })),
        ...(b.lego_edits || []).map((le) => ({ known: le.known_text, target: b.lego_target })),
      ];
      for (const le of b.lego_edits || []) console.log(`  ◆ LEGO re-gloss: ${b.lego_target} ⟸ "${le.known_text}"`);
      const zut = await checkPhraseZUT(sb, course, zutCandidates, null, { family: await courseFamily(sb, course) });
      for (const z of zut) {
        if (globalReplaced.has(`${z.known.toLowerCase().trim()}|${strip(z.existing_target)}`)) continue;
        console.log(`  ✗ ZUT: "${z.known}" → ${z.new_target} BUT S${z.existing_seed} has → ${z.existing_target}`);
        failures++;
      }
      const finalUse = survivors.length + candidates.filter((c) => (c.phrase_role || 'use') === 'use').length - (b.edits || []).filter((e) => survivors.some((s) => s.id === e.id)).length;
      console.log(`  final USE count: ${finalTargets.length}${finalTargets.length < 5 ? '  (below min 5!)' : ''}`);
    }
    console.log(failures ? `\nCHECK FAILED: ${failures} problem(s)` : '\nCHECK PASSED');
    process.exit(failures ? 1 : 0);
  }

  // ── apply ──
  const snapshot = { applied_at: null, course_code: course, before: [], actions: [] };
  for (const b of plan.baskets) {
    const { data: existing, error } = await sb.from('course_practice_phrases').select('*')
      .eq('course_code', course).eq('seed_number', b.seed).eq('lego_index', b.lego_index);
    if (error) throw new Error(error.message);
    const byId = new Map(existing.map((p) => [p.id, p]));

    for (const e of b.edits || []) {
      const row = byId.get(e.id);
      if (!row) throw new Error(`edit target not found: ${e.id}`);
      snapshot.before.push(row);
      // side-aware staleness: only null audio/derivations for the side that changed
      const knownChanged = row.known_text !== e.known_text;
      const targetChanged = strip(row.target_text) !== strip(e.target_text);
      const upd = {
        known_text: e.known_text, target_text: e.target_text,
        qa_checked: null, version: (row.version || 0) + 1,
      };
      if (knownChanged) upd.known_audio_id = null;
      if (targetChanged) {
        upd.target_text_roman = e.target_text_roman || null;
        upd.target1_audio_id = null; upd.target2_audio_id = null;
        upd.decomposition = null; upd.display_tiling = null;
      }
      const { error: ue } = await sb.from('course_practice_phrases').update(upd).eq('id', e.id);
      if (ue) throw new Error(`update ${e.id}: ${ue.message}`);
      snapshot.actions.push({ op: 'update', id: e.id });
      console.log(`✎ ${e.id}  ${row.target_text} → ${e.target_text}`);
    }
    for (const le of b.lego_edits || []) {
      const { data: legoRow, error: lerr } = await sb.from('course_legos').select('*')
        .eq('course_code', course).eq('seed_number', b.seed).eq('lego_index', b.lego_index).single();
      if (lerr || !legoRow) throw new Error(`lego not found S${b.seed}L${b.lego_index}`);
      snapshot.before.push({ _table: 'course_legos', ...legoRow });
      const { error: lue } = await sb.from('course_legos').update({
        known_text: le.known_text,
        known_audio_id: null, presentation_audio_id: null,
        version: (legoRow.version || 0) + 1,
      }).eq('id', legoRow.id);
      if (lue) throw new Error(`lego update S${b.seed}L${b.lego_index}: ${lue.message}`);
      snapshot.actions.push({ op: 'lego_update', id: legoRow.id });
      console.log(`◆ S${b.seed}L${b.lego_index} LEGO  "${legoRow.known_text}" → "${le.known_text}"`);
    }
    for (const id of b.deletes || []) {
      const row = byId.get(id);
      if (!row) throw new Error(`delete target not found: ${id}`);
      snapshot.before.push(row);
      const { error: de } = await sb.from('course_practice_phrases').delete().eq('id', id);
      if (de) throw new Error(`delete ${id}: ${de.message}`);
      snapshot.actions.push({ op: 'delete', id });
      console.log(`✂ ${id}  ${row.target_text}`);
    }
    if ((b.adds || []).length) {
      const role = 'use';
      const roleRows = existing.filter((p) => p.phrase_role === role);
      let nextN = Math.max(0, ...roleRows.map((p) => parseInt(p.id.slice(-2), 10) || 0));
      let nextPos = Math.max(0, ...existing.map((p) => p.position || 0));
      const template = roleRows[0] || existing[0];
      for (const a of b.adds || []) {
        nextN++; nextPos++;
        const id = `${course}:S${String(b.seed).padStart(4, '0')}L${String(b.lego_index).padStart(2, '0')}U${String(nextN).padStart(2, '0')}`;
        const row = {
          id, course_code: course, seed_number: b.seed, lego_index: b.lego_index,
          position: nextPos, phrase_role: role,
          known_text: a.known_text, target_text: a.target_text, target_text_roman: a.target_text_roman || null,
          word_count: a.target_text.replace(/[？。，！、?!,.\s]/g, '').length,
          lego_count: template?.lego_count || null,
          status: 'draft', version: 1, qa_checked: null,
          lego_id: template?.lego_id || `S${String(b.seed).padStart(4, '0')}L${String(b.lego_index).padStart(2, '0')}`,
        };
        const { error: ie } = await sb.from('course_practice_phrases').insert(row);
        if (ie) throw new Error(`insert ${id}: ${ie.message}`);
        snapshot.actions.push({ op: 'insert', id });
        console.log(`+ ${id}  ${a.target_text}`);
      }
    }
  }
  const outPath = planPath.replace(/\.json$/, '.applied.json');
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  console.log(`\nsnapshot (for rollback): ${outPath}`);
})();
