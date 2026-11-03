/**
 * Where a Popty course-audio tool finds the learning-app checkout (job #699).
 *
 * Tom, 2026-11-03: "we need everything that touches course content to be a popty tool"
 * (ruling r-2026-10-31-popty-is-the-course-production-ssot). The intro-splice, /guess-cut and welcome
 * tools moved here from ssi-learning-app; some still READ the player's own source (introAssembly.ts,
 * lessonTiling.ts, guessData.json) so that what they make is what ships, and some WRITE a data file the
 * player bundles (introBank.data.json, tools/guess/lesson-cuts.json). Those paths resolve here, against
 * a learning-app checkout, never by a relative path out of Popty.
 *
 * SSI_APP points at another checkout (a worktree on staging); the default is the same one Pod Drill uses
 * (tools/pods/pod-drill/paths.mjs DEFAULT_APP).
 */
import path from 'node:path'
import os from 'node:os'

export const APP = process.env.SSI_APP || path.join(os.homedir(), 'ssi-learning-app')
export const appPath = (...p) => path.join(APP, ...p)
