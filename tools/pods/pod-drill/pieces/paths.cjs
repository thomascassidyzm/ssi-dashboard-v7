// Where the Pod Drill PIECES tooling keeps its data (job #628, moved from ssi-learning-app ops/pod-drill-pieces/ by
// Tom's r-2026-11-07-ssi-pods-exactly-one-way-of: pieces are planned and recorded from Popty, one place).
//   ops/pod-drill/<course>/plan.json, ita/plan.json   the judgement: each turn whole with a reason, or its pieces
//   ops/pod-drill/recorded.json                         every recorded clip, keyed voice|text (audioId = the pod row)
//   ops/pod-drill/ita/clips.json                        Italian scenes 1-5 (#63, #82)
//   ops/pod-drill/spans/<course>.json                   span pieces folded from the retired span-cut files
//   ops/pod-drill/_eng-shared/split.txt                 the one English cut master (master.cjs)
//   ops/pod-drill/cast.tsv                              the voice the audio route resolves per course and role
//   ops/pod-drill/wired.json                            what wire-staging.cjs wired, per course
//   ops/pod-drill/served/<course>.json                  the EXACT bytes wire-staging.cjs writes into the app; Popty's
//                                                        pod search (services/pod-search-router.cjs) reads these
// The only thing written into the learning app is its generated packages/player-vue/src/data/podDrillPieces/*.json,
// and only when a tool is handed --app <ssi-learning-app checkout or worktree>: there is no default app path.
const fs = require('fs'), path = require('path');
const REPO = path.join(__dirname, '..', '..', '..', '..');
const DATA = path.join(REPO, 'ops', 'pod-drill');
const SERVED = path.join(DATA, 'served');
const ROW_MAP = path.join(REPO, 'ops', 'pod-audio-rows', 'trial-to-row.json');
const APP_DATA_REL = 'packages/player-vue/src/data/podDrillPieces';
const planDir = (course) => (course === 'ita_for_eng' ? 'ita' : course);
const plannedCourses = () => fs.readdirSync(DATA).filter((d) => fs.existsSync(path.join(DATA, d, 'plan.json'))).map((d) => (d === 'ita' ? 'ita_for_eng' : d)).sort();

// --app <path>: the one app checkout a tool writes into. Refuses without it, and refuses a path that is not the app.
function appRoot(argv = process.argv) {
  const i = argv.indexOf('--app'), v = i >= 0 ? argv[i + 1] : null;
  if (!v) { console.error('--app <ssi-learning-app checkout or worktree> is required: it is where the generated podDrillPieces/*.json live. Nothing done.'); process.exit(2); }
  const root = path.resolve(v.replace(/^~(?=$|\/)/, process.env.HOME));
  if (!fs.existsSync(path.join(root, 'packages/player-vue/src/listening/podDrillPieces.ts'))) { console.error(`--app ${root}: not an ssi-learning-app checkout (no packages/player-vue/src/listening/podDrillPieces.ts). Nothing done.`); process.exit(2); }
  return root;
}
// Positional arguments with --app <path> and --flags taken out.
const positional = (argv = process.argv.slice(2)) => argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--app' && argv[i - 1] !== '--ref');

module.exports = { REPO, DATA, SERVED, ROW_MAP, APP_DATA_REL, planDir, plannedCourses, appRoot, positional };
