/**
 * Where the Pod Drill stage keeps its data (job #692, moved from ssi-learning-app/tools/pod-drill-cuts).
 *
 * ONE HOME: Popty's tracked ops/pod-drill-cuts/ holds every input and output of a run
 *   <course>.dump.json            the pod as the PLAYER loads it (made by snapshot.mjs here, which bundles
 *                                 the player's own loader from the learning-app checkout; job #699)
 *   <course>.report.json          every card's verdict and why
 *   <course>.pair-report.json     the last pair run: new cuts, known spans filled, seams too shallow
 *   <course>.pairing.json         every Sonnet answer (only when --sonnet was ever run)
 *   <course>.known-rerecord.json  the known-side pieces Kai must decide to re-record (a LIST, no audio)
 *   <course>.cuts.json            the player's cut file, as Popty last wrote it
 * The production API serves these to /production/<course>/pod-drill (services/pod-drill-router.cjs),
 * so each run that lands on main is on Kai's page with no publishing step.
 *
 * The app no longer bundles a cut file (job #577: its Drill plays data/podDrillPieces), so nothing is
 * exported there any more (job #628 deleted the export).
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const POPTY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
// POD_DRILL_OPS points a pilot or a replay at another directory (job #692's pilot replayed #669 there).
export const OPS = process.env.POD_DRILL_OPS || path.join(POPTY, 'ops', 'pod-drill-cuts')
export const cutsPath = (course) => path.join(OPS, `${course}.cuts.json`)
