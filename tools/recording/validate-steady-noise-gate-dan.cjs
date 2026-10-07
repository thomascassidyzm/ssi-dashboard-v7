#!/usr/bin/env node
// Runs the steady-noise gate over real mastered takes in a directory
// (mastered_<UUID>.mp3). Usage: node validate-steady-noise-gate-dan.cjs <dir> <noiseUuidPrefix>
// The named take must be refused; every other must pass. Exit 1 otherwise.
const fs = require('fs')
const path = require('path')
const G = require('../../services/recording-speech-gate.cjs')
const [dir, noisePrefix] = process.argv.slice(2)
;(async () => {
  let bad = 0
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.startsWith('mastered_')).sort() : []
  // A validator that checked nothing must not exit 0.
  if (!noisePrefix || !files.length || !files.some(f => f.startsWith(`mastered_${noisePrefix}`))) {
    console.error('BAD: need a directory of mastered_*.mp3 fixtures that includes the named noise take')
    process.exit(1)
  }
  for (const f of files) {
    const r = await G.checkTakeIsNotSteadyNoise({ filePath: path.join(dir, f) })
    const expectRefuse = f.startsWith(`mastered_${noisePrefix}`)
    const ok = expectRefuse ? r.pass === false : r.pass === true
    if (!ok) bad++
    console.log(ok ? 'ok ' : 'BAD', f.slice(9, 17), r.reason, r.detail.dynamicRangeDb + ' dB')
  }
  process.exit(bad ? 1 : 0)
})()
