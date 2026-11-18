#!/usr/bin/env node
/**
 * POD DRILL STAGE — the one Popty command that cuts a course's Pod 1 cards into their Drill pieces
 * (job #692; the code moved here from ssi-learning-app/tools/pod-drill-cuts, which now points here).
 *
 *   node tools/pods/pod-drill/stage.mjs <course> [--write] [--sonnet] [--allow-replace=id,id] [--redo-pair] [--snapshot]
 *
 * Steps, in order, each the code that made the cuts Kai and Tom have already heard:
 *   0. snapshot.mjs    (--snapshot, or when there is no dump yet) the pod as the PLAYER loads it, written to
 *                      ops/pod-drill-cuts/<course>.dump.json; the player's own loader, bundled from the app
 *                      checkout (job #699; it was ssi-learning-app tools/pod-chunk-sizes.mjs --known-timings).
 *   1. pair.mjs        cut what the pod's own LEGO map gives, both sides by the render's stored
 *                      Cartesia word timings (no Whisper, r-2026-11-03), seams at the quietest 10 ms
 *                      frame within 60 ms of the boundary; fill the known span of existing cuts
 *                      without touching their target side; a known seam less than 5 dB below the
 *                      clip's speech level is left uncut and listed. --sonnet adds the meaning-chunk
 *                      pairing (claude --print, never the SDK); it is NOT the default.
 *   2. known-rerecord.mjs  sort every known piece: already-cut / re-record / needs-pairing / plays-whole.
 *   2b. score.mjs      (job #707) the boundary score: every cut known piece CLEAN or TIGHT, with the reason, from the
 *                      English take's Cartesia word timings (BOUNDARY in lib.mjs); --write keeps <course>.score.json.
 *                      Tight pieces are then made as their own clips by render.mjs (dry run by default, --render
 *                      for real, through POST /api/audio/render only), which wires them as chunk[6]; it is a
 *                      separate step because it spends, and is never run by the stage on its own.
 *   (3. export — DELETED, job #628. It copied <course>.cuts.json into the app's
 *      player-vue/src/data/podDrillCuts/, which the app stopped reading in job #577 (the Drill now plays the
 *      one pieces source, data/podDrillPieces). The copy landed in a folder nothing read, so it is gone, with
 *      its drift guard and --app / --adopt-app. ops/pod-drill-cuts/ stays: it is the cut record this stage and
 *      Kai's review page read.)
 *
 * Without --write nothing is written anywhere: pair.mjs prints what it would cut (its dry report goes
 * to $CS_SCRATCH) and known-rerecord prints its tally over the files as they stand.
 *
 * The cut file never shrinks (lib.noShrink in pair.mjs: exit 2 unless --allow-replace names ids).
 *
 * Renders nothing and writes no database row: it reads the dump, fetches existing clips over the
 * learning app's public audio proxy for the quiet-frame search, and writes files. Re-record pieces
 * are LISTED for Kai; when he authorises them they go through POST /api/audio/render only.
 *
 * After a --write run, commit ops/pod-drill-cuts/ (Popty main: it is what /production/<course>/pod-drill
 * shows Kai).
 */
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { OPS } from './paths.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const course = argv.find((a) => !a.startsWith('--'))
const opt = Object.fromEntries(argv.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true] }))
if (!course || !/^[a-z]{3}_for_[a-z]{3}$/.test(course)) { console.error('usage: stage.mjs <course> [--write] [--sonnet]'); process.exit(1) }
const WRITE = !!opt.write

const dump = path.join(OPS, `${course}.dump.json`)
if (opt.snapshot || !existsSync(dump)) {
  // read-only: the player's loader with every write blocked at its fetch layer (snapshot.mjs header)
  const r = spawnSync(process.execPath, [path.join(here, 'snapshot.mjs'), `--course=${course}`, `--json=${dump}`, '--known-timings'], { stdio: 'inherit' })
  if (r.status !== 0 || !existsSync(dump)) { console.error(`snapshot.mjs stopped (exit ${r.status}); no ${course}.dump.json in ${OPS}`); process.exit(r.status || 1) }
}
const pass = ['write', 'sonnet', 'allow-replace', 'redo-pair', 'early', 'no-retry', 'sonnet-workers']
  .filter((k) => opt[k] != null).map((k) => (opt[k] === true ? `--${k}` : `--${k}=${opt[k]}`))
const step = (file, args) => {
  const r = spawnSync(process.execPath, [path.join(here, file), course, ...args], { stdio: 'inherit' })
  if (r.status !== 0) { console.error(`${file} stopped (exit ${r.status}); nothing after it ran`); process.exit(r.status || 1) }
}
step('pair.mjs', pass)
step('known-rerecord.mjs', WRITE ? ['--write'] : [])
step('score.mjs', WRITE ? ['--write'] : [])

console.error(`${WRITE ? 'written' : 'dry run, nothing written'}. Page: https://popty.app/production/${course}/pod-drill (after ops/pod-drill-cuts lands on Popty main)`)
