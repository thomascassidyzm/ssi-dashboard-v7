/**
 * Where the Pod Drill stage keeps its data (job #692, moved from ssi-learning-app/tools/pod-drill-cuts).
 *
 * ONE HOME: Popty's tracked ops/pod-drill-cuts/ holds every input and output of a run
 *   <course>.dump.json            the pod as the PLAYER loads it (still made by ssi-learning-app
 *                                 tools/pod-chunk-sizes.mjs --json --known-timings, the player's own loader)
 *   <course>.report.json          every card's verdict and why
 *   <course>.pair-report.json     the last pair run: new cuts, known spans filled, seams too shallow
 *   <course>.pairing.json         every Sonnet answer (only when --sonnet was ever run)
 *   <course>.known-rerecord.json  the known-side pieces Kai must decide to re-record (a LIST, no audio)
 *   <course>.cuts.json            the player's cut file, as Popty last wrote it
 * The production API serves these to /production/<course>/pod-drill (services/pod-drill-router.cjs),
 * so each run that lands on main is on Kai's page with no publishing step.
 *
 * The PLAYER bundles its cut file from ssi-learning-app packages/player-vue/src/data/podDrillCuts/
 * (podDrillCuts.ts, import.meta.glob), so stage.mjs EXPORTS <course>.cuts.json there byte for byte.
 * It refuses when the app's copy differs from Popty's record: that means somebody cut outside Popty.
 */
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

export const POPTY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
// POD_DRILL_OPS points a pilot or a replay at another directory (job #692's pilot replayed #669 there).
export const OPS = process.env.POD_DRILL_OPS || path.join(POPTY, 'ops', 'pod-drill-cuts')
export const cutsPath = (course) => path.join(OPS, `${course}.cuts.json`)
export const DEFAULT_APP = path.join(os.homedir(), 'ssi-learning-app')
export const appCutsPath = (app, course) => path.join(app, 'packages', 'player-vue', 'src', 'data', 'podDrillCuts', `${course}.json`)
