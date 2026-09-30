#!/usr/bin/env node
'use strict';
// READ-ONLY audit: which target-language Drill cards of the big-10 premium languages have no clip (job #950, 2026-09-30).
//
// WHY THIS IS NOT THE #945 AUDIT. #917/#945/#948 counted Drill cards with no ENGLISH (the known side). This counts cards with
// no TARGET clip — the side the learner is meant to hear first — by running the learner app's own composers over the live rows
// instead of re-deriving their rules: podSentenceSplit.splitRowUnits (the per-sentence split + stale-slice guard) and
// fusionDrill.buildFusionGroups (Drill's card composer, incl. the #917 "never a card without a recording" rule). Both are
// bundled from a learning-app checkout with esbuild, so the audit cannot drift from what Drill plays.
//
// A CARD = one fusion group (when the turn has a usable fine map) or one per-sentence unit. A card is target-silent when the
// composer leaves it with no whole-sentence target clip. (Sub-sentence Take G slices are switched off in the player —
// DRILL_SLICE_PLAYBACK_ENABLED=false — so the whole-sentence clip is the only target audio Drill plays today.)
// Characters to fill = the card's target text length. NOTHING IS RENDERED; Arabic (Aran's hold) is reported, never touched.
//
//   LEARNING_APP=/path/to/ssi-learning-app node tools/pods/drill-gap-audit-big10.cjs [--json out.json]
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });

const BIG_10 = ['eng', 'spa', 'fra', 'deu', 'ita', 'por', 'zho', 'jpn', 'ara', 'kor']; // ssi-learning-app packages/core/src/pricing/constants.ts
const targetLang = (course) => String(course).split('_for_')[0].split('_')[0];

function bundle(app, rel, out) {
  execFileSync(path.join(__dirname, '..', '..', 'node_modules', '.bin', 'esbuild'),
    [path.join(app, rel), '--bundle', '--platform=node', '--format=cjs', `--outfile=${out}`, '--log-level=error']);
  return require(out);
}

/** Pure: the Drill cards of one pod, as the learner app composes them. Exported for the test. */
function drillCards(rows, textById, { splitRowUnits, buildFusionGroups }) {
  const cards = [];
  for (const row of rows) {
    const units = splitRowUnits(row, textById);
    const fine = Array.isArray(row.atom_map_fine) && row.atom_map_fine.length;
    const groups = fine ? buildFusionGroups({
      turnTargetText: row.target_text || '', fineMap: row.atom_map_fine, windowKnownMap: row.window_known_map || null,
      takegAudioIds: row.takeg_audio_ids || null, turnTargetAudioId: row.target_audio_id || null, turnKnownAudioId: row.known_audio_id || null,
      rows: units.map((u) => ({ targetAudioId: u.targetAudioId, knownAudioId: u.knownAudioId, targetText: u.targetText, knownText: u.knownText })),
    }) : null;
    if (groups) {
      for (const g of groups) {
        if (g.rowFirst < g.rowLast || !groups.some((o) => o !== g && o.rowFirst < g.rowFirst && o.rowLast >= g.rowFirst)) {
          cards.push({ row: row.global_order, target: g.targetText, targetClip: g.wholeTargetClipId, knownClip: g.wholeKnownClipId });
        }
      }
    } else {
      for (const u of units) cards.push({ row: row.global_order, target: u.targetText, targetClip: u.targetAudioId, knownClip: u.knownAudioId });
    }
  }
  return cards;
}

async function main() {
  const app = process.env.LEARNING_APP || path.join(process.env.HOME, '.cs-worktrees/ssi-play-tom/945-pod-drill-question-english-looku');
  const tmp = process.env.CS_SCRATCH || require('os').tmpdir();
  const composers = {
    ...bundle(app, 'packages/core/src/pods/fusionDrill.ts', path.join(tmp, 'fusionDrill.bundle.cjs')),
    ...bundle(app, 'packages/player-vue/src/composables/podSentenceSplit.ts', path.join(tmp, 'podSentenceSplit.bundle.cjs')),
  };
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const pods = (await pg.query(`select id, course_code, slug, visibility, speakers from listening_pods where pod_type='core' and visibility='live' order by course_code, slug`)).rows
    .filter((p) => BIG_10.includes(targetLang(p.course_code)));
  const out = [];
  for (const p of pods) {
    const rows = (await pg.query(`select * from listening_pod_sentences where pod_id=$1 order by global_order`, [p.id])).rows;
    const ids = new Set();
    for (const r of rows) for (const k of ['target_audio_id', 'known_audio_id']) if (r[k]) ids.add(r[k]);
    for (const r of rows) for (const id of [...(r.sentence_audio_ids || []), ...(r.sentence_known_audio_ids || []), ...(r.takeg_audio_ids || [])]) if (id) ids.add(id);
    const clips = new Map((await pg.query(`select id, text, voice_id, language, file_size_bytes from course_audio where id = any($1)`, [[...ids]])).rows.map((c) => [c.id, c]));
    // textById = existing split clips only, as the player builds it (useListeningPods: split ids, empty text still counts as present)
    const textById = new Map();
    for (const r of rows) for (const id of [...(r.sentence_audio_ids || []), ...(r.sentence_known_audio_ids || [])]) if (id && clips.has(id)) textById.set(id, clips.get(id).text || '');
    const cards = drillCards(rows, textById, composers);
    // why a card is silent: no pointer at all, a pointer at a course_audio row that is gone, or at a dead stub (<2000 bytes)
    const why = (c) => !c.targetClip ? 'no clip pointer' : !clips.has(c.targetClip) ? 'pointer to a missing clip' : (clips.get(c.targetClip).file_size_bytes ?? 99999) < 2000 ? 'dead stub' : null;
    const silent = cards.filter((c) => why(c));
    const reasons = {};
    for (const c of silent) reasons[why(c)] = (reasons[why(c)] || 0) + 1;
    const noKnown = cards.filter((c) => !c.knownClip || !clips.has(c.knownClip));
    out.push({
      pod_id: p.id, slug: p.slug, rows: rows.length, cards: cards.length,
      target_silent_cards: silent.length, target_silent_chars: silent.reduce((n, c) => n + [...String(c.target || '')].length, 0),
      known_silent_cards: noKnown.length,
      known_silent_rows: [...new Set(noKnown.map((c) => c.row))].length,
      target_silent_reasons: reasons,
      target_silent_rows: [...new Set(silent.map((c) => c.row))],
      target_silent_samples: silent.slice(0, 12).map((c) => ({ row: c.row, text: c.target, why: why(c) })),
    });
  }
  await pg.end();
  const j = process.argv.indexOf('--json');
  if (j > -1) fs.writeFileSync(process.argv[j + 1], JSON.stringify(out, null, 1));
  console.table(out.filter((r) => r.target_silent_cards || r.known_silent_cards).map(({ target_silent_rows, target_silent_samples, target_silent_reasons, ...r }) => ({ ...r, why: JSON.stringify(target_silent_reasons) })));
}

module.exports = { drillCards, targetLang, BIG_10 };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
