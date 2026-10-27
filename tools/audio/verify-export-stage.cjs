#!/usr/bin/env node
'use strict';
/**
 * READ-ONLY: export Step 2 (Verify S3 Audio) run OUTSIDE production-api (job #427).
 *
 * Step 2 runs inside the API process and takes ~30-40 min on a big course; every push to main restarts
 * the API (auto-deploy), and on 2026-10-27 four ita_for_eng verifies in a row were killed that way.
 * This runs the SAME code — s3-deploy-service collectManifestUuids + verifyStageAudio (existence,
 * sox durations, MP3 format check), durationTolerance 0 as the route uses — on a pending manifest file,
 * and prints the counts. It writes nothing: no S3, no DB, no export state. s3_verified is still set
 * only by the Step 2 button; this answers "will it pass?" without the API.
 *
 *   node tools/audio/verify-export-stage.cjs <pending_manifest.json> [--out result.json]
 *   (the API keeps it at <prod checkout>/temp/course_export_states/<course>_pending_manifest.json)
 */
const fs = require('fs');

/** Pure. The verdict line Step 2 would reach: missing and badly encoded both block. */
function summarise(r) {
  const formatBad = [...new Set((r.formatFailDetails || []).map((f) => String(f.uuid).toUpperCase()))];
  return {
    total: r.total,
    existing: r.existing,
    missing: r.missing,
    missingUuids: r.missingUuids || [],
    durationChecked: r.durationChecked,
    durationMismatched: r.durationMismatched, // Step 2 auto-fixes these; they do not block
    durationErrors: r.durationErrors,
    formatChecked: r.formatChecked,
    formatFailed: r.formatFailed,
    formatBadUuids: formatBad,
    wouldPass: r.missing === 0 && (r.formatFailed || 0) === 0 && !r.durationCheckFailed,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const oi = args.indexOf('--out');
  const out = oi >= 0 ? args.splice(oi, 2)[1] : null;
  if (!args[0]) { console.error('usage: verify-export-stage.cjs <pending_manifest.json> [--out result.json]'); process.exit(64); }
  const { collectManifestUuids, verifyStageAudio } = require('../../services/s3-deploy-service.cjs');
  const manifest = JSON.parse(fs.readFileSync(args[0], 'utf8'));
  const uuids = collectManifestUuids(manifest);
  let last = 0;
  const r = await verifyStageAudio(uuids, manifest, (phase, checked, total) => {
    if (checked - last >= 2000 || checked === total) { last = checked; console.error(`[${phase}] ${checked}/${total}`); }
  }, { checkDurations: true, durationTolerance: 0 });
  const s = summarise(r);
  if (out) fs.writeFileSync(out, JSON.stringify({ summary: s, formatFailDetails: r.formatFailDetails || [] }, null, 2));
  console.log(JSON.stringify(s, null, 2));
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { summarise };
