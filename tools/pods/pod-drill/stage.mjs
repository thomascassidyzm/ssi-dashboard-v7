#!/usr/bin/env node
/**
 * POD DRILL STAGE — the one Popty command that cuts a course's Pod 1 cards into their Drill pieces
 * (job #692; the code moved here from ssi-learning-app/tools/pod-drill-cuts, which now points here).
 *
 *   node tools/pods/pod-drill/stage.mjs <course> [--write] [--sonnet] [--app=<ssi-learning-app checkout>]
 *        [--allow-replace=id,id] [--redo-pair] [--adopt-app]
 *
 * Steps, in order, each the code that made the cuts Kai and Tom have already heard:
 *   1. pair.mjs        cut what the pod's own LEGO map gives, both sides by the render's stored
 *                      Cartesia word timings (no Whisper, r-2026-11-03), seams at the quietest 10 ms
 *                      frame within 60 ms of the boundary; fill the known span of existing cuts
 *                      without touching their target side; a known seam less than 5 dB below the
 *                      clip's speech level is left uncut and listed. --sonnet adds the meaning-chunk
 *                      pairing (claude --print, never the SDK); it is NOT the default.
 *   2. known-rerecord.mjs  sort every known piece: already-cut / re-record / needs-pairing / plays-whole.
 *   3. export          --write copies <course>.cuts.json byte for byte to the player's bundled cut file
 *                      in the learning-app checkout (default ~/ssi-learning-app), when one is there.
 *
 * Without --write nothing is written anywhere: pair.mjs prints what it would cut (its dry report goes
 * to $CS_SCRATCH) and known-rerecord prints its tally over the files as they stand.
 *
 * The cut file never shrinks (lib.noShrink in pair.mjs: exit 2 unless --allow-replace names ids).
 * DRIFT GUARD: before anything runs, the app's cut file must equal Popty's record. If it differs,
 * somebody cut outside Popty; the stage stops (exit 3). --adopt-app takes the app's copy as the
 * record first, deliberately, and says so.
 *
 * Renders nothing and writes no database row: it reads the dump, fetches existing clips over the
 * learning app's public audio proxy for the quiet-frame search, and writes files. Re-record pieces
 * are LISTED for Kai; when he authorises them they go through POST /api/audio/render only.
 *
 * After a --write run, commit ops/pod-drill-cuts/ (Popty main: it is what /production/<course>/pod-drill
 * shows Kai) and the exported cut file (ssi-learning-app staging: it is what the player plays).
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { OPS, cutsPath, DEFAULT_APP, appCutsPath } from './paths.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const course = argv.find((a) => !a.startsWith('--'))
const opt = Object.fromEntries(argv.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true] }))
if (!course || !/^[a-z]{3}_for_[a-z]{3}$/.test(course)) { console.error('usage: stage.mjs <course> [--write] [--sonnet] [--app=<path>]'); process.exit(1) }
const WRITE = !!opt.write
const APP = opt.app === 'none' ? null : (opt.app || DEFAULT_APP)
const appFile = APP ? appCutsPath(APP, course) : null
const mine = cutsPath(course)

if (!existsSync(path.join(OPS, `${course}.dump.json`))) {
  console.error(`no ${course}.dump.json in ${OPS}: make it with ssi-learning-app tools/pod-chunk-sizes.mjs --course=${course} --json=<that path> --known-timings`)
  process.exit(1)
}
if (appFile && existsSync(appFile)) {
  const a = readFileSync(appFile, 'utf8')
  const p = existsSync(mine) ? readFileSync(mine, 'utf8') : null
  if (p !== a) {
    if (!opt['adopt-app']) {
      console.error(`DRIFT: ${appFile} differs from Popty's record ${mine}.\nThe player's cut file was changed outside Popty. Look at the difference; rerun with --adopt-app to take the app's copy as the record.`)
      process.exit(3)
    }
    writeFileSync(mine, a)
    console.error(`adopted the app's cut file as Popty's record (${appFile})`)
  }
}

const pass = ['write', 'sonnet', 'allow-replace', 'redo-pair', 'early', 'no-retry', 'sonnet-workers']
  .filter((k) => opt[k] != null).map((k) => (opt[k] === true ? `--${k}` : `--${k}=${opt[k]}`))
const step = (file, args) => {
  const r = spawnSync(process.execPath, [path.join(here, file), course, ...args], { stdio: 'inherit' })
  if (r.status !== 0) { console.error(`${file} stopped (exit ${r.status}); nothing after it ran`); process.exit(r.status || 1) }
}
step('pair.mjs', pass)
step('known-rerecord.mjs', WRITE ? ['--write'] : [])

if (WRITE && appFile) {
  if (existsSync(path.dirname(appFile))) { copyFileSync(mine, appFile); console.error(`exported ${course}.cuts.json → ${appFile}`) }
  else console.error(`no player cut-file directory at ${path.dirname(appFile)}: not exported (pass --app=<ssi-learning-app checkout>)`)
}
console.error(`${WRITE ? 'written' : 'dry run, nothing written'}. Page: https://popty.app/production/${course}/pod-drill (after ops/pod-drill-cuts lands on Popty main)`)
