#!/usr/bin/env node
/**
 * verify-tail-repair-mode.cjs — prove NOTHING in this estate can automatically
 * trim or rewrite course audio.
 *
 * This file used to prove which BRANCH of repairTailDefect was live. There is no
 * longer a branch, because there is no longer a repair. Tom's ruling 2026-08-05,
 * after the clipping recurred a third time: delete the tail-repair service's
 * ability to modify audio outright rather than keep flipping a default. The
 * switch WAS the bug — an env var that must be set correctly in every unit file,
 * tool, cron and fresh checkout is a default waiting to leak, and it leaked.
 *
 * So this is now a REGRESSION GUARD. It fails loudly if the mutation path comes
 * back, and it deliberately sets TAIL_REPAIR_MODE=repair — the old damaging
 * value — so that anything still honouring the switch is caught.
 *
 *   node tools/verify-tail-repair-mode.cjs    # exit 0 = safe, 1 = mutation path is back
 *
 * Zero TTS spend: the fixture is synthesised locally with ffmpeg to match
 * detectTailClick's rule-2 (resurgence) shape — a loud tone that sets the peak,
 * a >=20ms quiet gap, then a short burst between 5% and 50% of peak. A full-scale
 * click does NOT work: it becomes the peak and disarms the detector.
 *
 * Exit 0 = safe, 1 = an assertion failed, 2 = fixture did not trip (inconclusive).
 */
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process'), crypto = require('crypto')

// The OLD damaging value, set on purpose: if anything still reads it, say so.
process.env.TAIL_REPAIR_MODE = 'repair'

const R = path.join(__dirname, '..')
const ap = require(path.join(R, 'services/audio-processor.cjs'))
const sh = (c) => cp.execSync(c, { stdio: ['ignore', 'pipe', 'pipe'], shell: '/bin/bash' }).toString()
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'tailsyn-'))
const j = (f) => path.join(work, f)

const fails = []
const ok = (m) => console.log(`  ok   ${m}`)
const bad = (m) => { console.log(`  FAIL ${m}`); fails.push(m) }

sh(`ffmpeg -y -f lavfi -i "sine=frequency=180:duration=1.6:sample_rate=48000" -af "volume=0.8" ${j('a.wav')} 2>/dev/null`)
sh(`ffmpeg -y -f lavfi -i "anullsrc=r=48000:cl=mono" -t 0.12 ${j('b.wav')} 2>/dev/null`)
sh(`ffmpeg -y -f lavfi -i "sine=frequency=3000:duration=0.012:sample_rate=48000" -af "volume=0.12" ${j('c.wav')} 2>/dev/null`)
sh(`ffmpeg -y -f lavfi -i "anullsrc=r=48000:cl=mono" -t 0.10 ${j('d.wav')} 2>/dev/null`)
fs.writeFileSync(j('list.txt'), ['a', 'b', 'c', 'd'].map(x => `file '${j(x + '.wav')}'`).join('\n'))
sh(`ffmpeg -y -f concat -safe 0 -i ${j('list.txt')} -ac 1 -ar 48000 -codec:a libmp3lame -b:a 128k ${j('clip.mp3')} 2>/dev/null`)
const clip = j('clip.mp3')

;(async () => {
  console.log('\nverify-tail-repair-mode — asserting the audio mutation path stays deleted')
  console.log(`(TAIL_REPAIR_MODE deliberately set to ${JSON.stringify(process.env.TAIL_REPAIR_MODE)} — the old damaging value)\n`)

  // 1. The dangerous exports are GONE, not renamed. A stale caller must crash.
  if (typeof ap.repairTailDefect === 'undefined') ok('audio-processor exports no repairTailDefect')
  else bad('repairTailDefect is EXPORTED AGAIN — the mutation path is back')
  if (typeof ap.verifyTrimKeepsText === 'undefined') ok('audio-processor exports no verifyTrimKeepsText')
  else bad('verifyTrimKeepsText is exported again (it only ever guarded a trim)')
  if (typeof ap.flagTailDefect === 'function') ok('flagTailDefect is present (read-only detection survives)')
  else bad('flagTailDefect is missing — detection should survive, read-only')

  // 2. On a clip the detector DOES flag, nothing may change.
  const det = await ap.detectTailClick(clip, { mode: 'phrase' })
  if (!det.click) { console.log('\nFIXTURE DID NOT TRIP THE DETECTOR — proof inconclusive\n'); process.exit(2) }
  console.log(`  ...detector flags: ${det.kind} ${det.peakDb}dB at ${det.trimSec}s (old code would have cut here)`)

  const h0 = crypto.createHash('sha256').update(fs.readFileSync(clip)).digest('hex')
  const dur0 = Number(sh(`ffprobe -v error -show_entries format=duration -of csv=p=0 ${clip}`).trim())
  const filesBefore = fs.readdirSync(work).sort().join(',')

  const res = await ap.flagTailDefect(clip, { text: 'test tone', mode: 'phrase' })

  const h1 = crypto.createHash('sha256').update(fs.readFileSync(clip)).digest('hex')
  const dur1 = Number(sh(`ffprobe -v error -show_entries format=duration -of csv=p=0 ${clip}`).trim())
  const filesAfter = fs.readdirSync(work).sort().join(',')

  if (h0 === h1) ok(`input clip byte-for-byte unchanged (duration still ${dur1.toFixed(3)}s)`)
  else bad('THE INPUT CLIP WAS MODIFIED — audio is being rewritten in place')
  if (filesAfter === filesBefore) ok('no new audio file was produced')
  else bad(`new file(s) appeared: ${filesAfter} (was ${filesBefore})`)
  if (!res.outPath) ok('no outPath returned — nothing for a caller to swap in')
  else bad(`an outPath was returned (${res.outPath}) — a caller could move it over the original`)
  if (res.action === 'flagged') ok(`action is report-only ('${res.action}')`)
  else bad(`expected action 'flagged' on a flagged clip, got '${res.action}'`)
  if (/9%/.test(res.precision || '')) ok('the 9% precision caveat travels with the verdict')
  else bad('the 9% precision caveat is missing from the result')

  // 3. The switch and the amputation fingerprint must be gone from the CODE.
  //    Comments are stripped first: the deletion notice in audio-processor.cjs
  //    quotes both `TAIL_REPAIR_MODE` and `apad=pad_dur=0.1` on purpose, so that
  //    anyone reading it knows exactly what was removed and why. Matching raw
  //    source would fail on the very documentation that prevents the relapse.
  const raw = fs.readFileSync(path.join(R, 'services/audio-processor.cjs'), 'utf8')
  const code = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')   // block comments
    .replace(/^[ \t]*\/\/.*$/gm, '')     // whole-line // comments
  if (!/process\.env\.TAIL_REPAIR_MODE/.test(code)) ok('no TAIL_REPAIR_MODE env switch in audio-processor.cjs code')
  else bad('TAIL_REPAIR_MODE is being read again — the switch is back')
  if (!/apad=pad_dur/.test(code)) ok('no apad re-pad step remains in code (the 100ms fingerprint)')
  else bad('an apad re-pad step is present in code — the 100ms amputation fingerprint could return')
  if (!/atrim=end=/.test(code)) ok('no atrim=end= step remains in code (the cut itself)')
  else bad('an atrim=end= step is present in code — something can cut a clip short again')

  fs.rmSync(work, { recursive: true, force: true })
  console.log(fails.length
    ? `\n${fails.length} ASSERTION(S) FAILED — the audio mutation path has been reintroduced.\n`
    : '\nAll assertions passed: no code path can automatically trim or rewrite course audio.\n')
  process.exit(fails.length ? 1 : 0)
})().catch(e => { console.error(e); process.exit(1) })
