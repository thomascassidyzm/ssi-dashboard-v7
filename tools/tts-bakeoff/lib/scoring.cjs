/**
 * The scoring sheet, as CSV. The HTML form in build-listening-pack.cjs is the
 * same sheet with audio attached and a download button; this is the version you
 * print, or open in Numbers on the sofa.
 *
 * GRANULARITY — the decision that matters, stated once here and repeated in the
 * design doc:
 *
 *   A similarity to reference voice   PER CLIP.    You hear one clip, you judge
 *   B naturalness                     PER CLIP.    it against the reference or
 *   C pronunciation accuracy          PER CLIP.    against your own ear. One
 *                                                  clip carries the whole answer.
 *
 *   D intra-voice consistency         BOTH. Per clip it means "does THIS take
 *                                     sit with the others of this voice" — a
 *                                     drifting take is a specific, locatable
 *                                     defect and you want the clip id. Per
 *                                     system it means "is the voice stable
 *                                     across the whole set". Score both; they
 *                                     answer different questions.
 *
 *   E repeatability over time         PER SYSTEM. A single clip cannot show it.
 *                                     It is the 20x repeat probe plus the
 *                                     sha256 column, and it is answered by
 *                                     comparing takes, never by hearing one.
 *   F control                         PER SYSTEM. Seed / temperature / version
 *                                     pinning are properties of the API, not of
 *                                     a clip. Largely pre-filled from the
 *                                     adapter's own capability flags — the
 *                                     listener adjusts, they do not research.
 *   G operational suitability         PER SYSTEM. Rate limits, latency, cost,
 *                                     self-host, consent. Nothing to do with
 *                                     the ear at all; it belongs on the sheet
 *                                     so it gets weighed rather than forgotten.
 *
 * 1-9 scale, matching the estate's USE-phrase convention (ralph-methodology.md:
 * 9 = natives would actually say it; 5-6 functional/textbook; <=4 = reject).
 */
const fs = require('fs');

const PER_CLIP_AXES = [
  ['A', 'similarity to reference voice'],
  ['B', 'naturalness'],
  ['C', 'pronunciation accuracy'],
  ['D', 'intra-voice consistency (this take vs the others)'],
];
const PER_SYSTEM_AXES = [
  ['D', 'intra-voice consistency (whole system)'],
  ['E', 'repeatability over time'],
  ['F', 'control: seed / temperature / pronunciation / version pinning'],
  ['G1', 'operational suitability, ENTRY: rate limits, latency, cost, self-host, consent'],
  // TTS is a BRIDGE to human recording, not the destination (Tom, 2026-08-26), so the cost of
  // LEAVING a vendor is scored alongside the cost of joining it. Exit means: does word/phoneme
  // boundary data come back, does the output format sit alongside human recordings, can we keep
  // serving clips after we stop paying, and what does retiring a real person's clone involve.
  // A vendor cheap to enter and expensive to leave is a worse bridge and scores lower here.
  ['G2', 'operational suitability, EXIT: how cleanly this can later be re-recorded human'],
];

function csvCell(v) {
  return `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
}

function writeScoringCsv(outPath, packManifest, systemLetters, grouping) {
  const lines = [];
  lines.push(['row_type', 'clip_or_system', 'system', 'utterance_id', 'utterance_text', 'category', 'repeat_index', 'axis', 'axis_name', 'score_1_9', 'note'].map(csvCell).join(','));

  for (const c of packManifest.clips) {
    for (const [axis, name] of PER_CLIP_AXES) {
      // Axis D needs sibling takes to mean anything; in an ungrouped pack the
      // listener cannot tell which takes are siblings, so we do not ask.
      if (axis === 'D' && !grouping) continue;
      lines.push([
        'clip', c.clip, c.system || '', c.utterance_id || '', c.utterance_text || '',
        c.utterance_category || '', c.repeat_index || '', axis, name, '', '',
      ].map(csvCell).join(','));
    }
  }

  if (grouping) {
    for (const L of systemLetters) {
      for (const [axis, name] of PER_SYSTEM_AXES) {
        lines.push(['system', L, L, '', '', '', '', axis, name, '', ''].map(csvCell).join(','));
      }
    }
  }

  fs.writeFileSync(outPath, lines.join('\n') + '\n');
  return outPath;
}

module.exports = { writeScoringCsv, PER_CLIP_AXES, PER_SYSTEM_AXES };
