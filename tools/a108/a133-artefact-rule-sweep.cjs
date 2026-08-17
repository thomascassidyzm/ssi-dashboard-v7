// A-133 — THE SURGICAL-CHANGE SWEEP for the trailing-artefact rule.
//
// THE QUESTION: does the new rule change the cut on EXACTLY the two clips Tom
// failed (Noor p1, p3), and on nothing else in the 55-render phrase test?
//
// WHY IT IS BUILT THIS WAY. The rule-check that produced the "exactly 2" claim
// in the diagnosis doc reimplemented the rule inside the tool, over the probe's
// detector. That proves the ARITHMETIC, not the CHAIN. This runs the real
// exported chain function on both sides instead:
//
//   BEFORE = the pre-change services/audio-processor.cjs, taken verbatim out of
//            git (commit 2673e1c7) into a gitignored scratch copy, and required.
//            Not a reimplementation of the old behaviour — the old behaviour.
//   AFTER  = the working-tree services/audio-processor.cjs on this branch.
//
// Both are asked the same question, `trimToEndOfSpeech(raw, tmp)`, on the same
// bytes, and we compare where the file would END. A tool that reimplemented
// either side could agree with itself while the chain did something else.
//
// READ-ONLY on the audio: no render, no spend, no DB, no S3. It measures the 55
// raw provider takes job #949 already wrote to /tmp/a133-phrase-test.
//
// Setup (the BEFORE copy is gitignored and regenerated, never committed):
//   git show 2673e1c7:services/audio-processor.cjs > scripts/a133-old-audio-processor.cjs
const fs = require('fs'), path = require('path'), os = require('os');

const NEW = require('../../services/audio-processor.cjs');
const OLD_PATH = path.resolve(__dirname, '../../scripts/a133-old-audio-processor.cjs');
if (!fs.existsSync(OLD_PATH)) {
  console.error(`BEFORE reference missing. Run:\n  git show 2673e1c7:services/audio-processor.cjs > ${OLD_PATH}`);
  process.exit(1);
}
const OLD = require(OLD_PATH);

const SRC = process.env.SRC || '/tmp/a133-phrase-test';
const OUT = process.env.OUT || '/tmp/a133-artefact-rule-sweep.json';
// The two clips Tom's ear failed. Stated up front so the sweep can say whether
// it matched the prediction rather than us reading a table and deciding after.
const PREDICTED = ['nld-noor-p1', 'nld-noor-p3'];

// Where a plan says the finished file ends, in ms. A refusal ends at the full
// duration; `removedMs` is 0 on every non-cut path.
function endMs(plan, fullMs) {
  const d = plan.durationMs != null ? plan.durationMs : fullMs;
  return d - (plan.removedMs || 0);
}

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'a133-sweep-'));
  const rows = [];

  for (const dir of fs.readdirSync(SRC).sort()) {
    const raw = path.join(SRC, dir, 'raw.mp3');
    if (!fs.existsSync(raw)) continue;

    const before = await OLD.trimToEndOfSpeech(raw, path.join(tmp, 'b.wav'));
    const after = await NEW.trimToEndOfSpeech(raw, path.join(tmp, 'a.wav'));
    const fullMs = before.durationMs ?? after.durationMs ?? null;

    const row = {
      key: dir,
      durationMs: fullMs,
      before: { eosMs: before.eosMs, endMs: endMs(before, fullMs), refused: before.refused },
      after: { eosMs: after.eosMs, endMs: endMs(after, fullMs), refused: after.refused },
      artefacts: after.artefacts || [],
    };
    row.changed = Math.abs(row.after.endMs - row.before.endMs) > 5;   // 5ms = one envelope window
    rows.push(row);
  }
  fs.rmSync(tmp, { recursive: true, force: true });

  const changed = rows.filter(r => r.changed);
  console.log(`clips measured: ${rows.length}`);
  console.log(`cut changed on: ${changed.length}\n`);
  for (const r of changed) {
    console.log(`${r.key.padEnd(18)} eos ${r.before.eosMs} -> ${r.after.eosMs}ms | file ends ${r.before.endMs} -> ${r.after.endMs}ms (${r.after.endMs - r.before.endMs}ms)`);
    for (const a of r.artefacts) {
      console.log(`${''.padEnd(18)}   dropped ${a.startMs}ms / ${a.aboveMs}ms of energy / ${a.peakDb}dB` +
        (a.calledSpeechByLength ? '  <- the length rule called this SPEECH' : ''));
    }
  }

  const got = changed.map(r => r.key).sort();
  const surgical = got.length === PREDICTED.length && got.every((k, i) => k === PREDICTED[i]);
  console.log(`\npredicted: ${PREDICTED.join(', ')}`);
  console.log(`observed:  ${got.join(', ') || '(none)'}`);
  console.log(surgical ? '\nSURGICAL: the change lands on exactly the two clips Tom failed, and nothing else.'
    : '\nNOT SURGICAL — the observed set differs from the prediction. Read the rows above before trusting anything.');

  // Refusals must not change either: a rule that starts tripping guards is a
  // different kind of regression from a rule that moves a cut.
  const refusalDelta = rows.filter(r => (r.before.refused || null) !== (r.after.refused || null));
  console.log(`guard refusals that differ before/after: ${refusalDelta.length}` +
    (refusalDelta.length ? ' — ' + refusalDelta.map(r => `${r.key}: "${r.before.refused}" -> "${r.after.refused}"`).join('; ') : ''));

  fs.writeFileSync(OUT, JSON.stringify({ surgical, predicted: PREDICTED, observed: got, rows }, null, 2));
  console.log(`\nwrote ${OUT}`);
  process.exit(surgical ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
