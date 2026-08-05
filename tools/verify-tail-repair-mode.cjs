#!/usr/bin/env node
/**
 * verify-tail-repair-mode.cjs — prove which branch of repairTailDefect is live.
 *
 * TAIL_REPAIR_MODE=flag is the fix that stops repairTailDefect amputating audio
 * (docs/audio-tail-gate-decision-memo-2026-08-04.md). The code default in
 * services/audio-processor.cjs is still 'repair', so a CLI tool inherits the
 * DAMAGING path unless the shell exports it — reading the source tells you the
 * default, not what your shell will actually do. This runs the real function and
 * reports the branch taken.
 *
 * Zero TTS spend: the fixture is synthesised locally with ffmpeg to match
 * detectTailClick's rule-2 (resurgence) shape — a loud tone that sets the peak,
 * a >=20ms quiet gap, then a short burst between 5% and 50% of peak. A full-scale
 * click does NOT work: it becomes the peak and disarms the detector.
 *
 * Usage:
 *   TAIL_REPAIR_MODE=flag node tools/verify-tail-repair-mode.cjs   # expect: held / nothing cut
 *   node tools/verify-tail-repair-mode.cjs                         # expect: repaired / bytes removed
 *
 * Exit 0 = conclusive, 2 = fixture did not trip the detector (inconclusive).
 */
const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process'),crypto=require('crypto')
const R=path.join(__dirname,'..')
const ap=require(path.join(R,'services/audio-processor.cjs'))
const sh=(c)=>cp.execSync(c,{stdio:['ignore','pipe','pipe'],shell:'/bin/bash'}).toString()
const work=fs.mkdtempSync(path.join(os.tmpdir(),'tailsyn-'))
const j=(f)=>path.join(work,f)
sh(`ffmpeg -y -f lavfi -i "sine=frequency=180:duration=1.6:sample_rate=48000" -af "volume=0.8" ${j('a.wav')} 2>/dev/null`)
sh(`ffmpeg -y -f lavfi -i "anullsrc=r=48000:cl=mono" -t 0.12 ${j('b.wav')} 2>/dev/null`)
sh(`ffmpeg -y -f lavfi -i "sine=frequency=3000:duration=0.012:sample_rate=48000" -af "volume=0.12" ${j('c.wav')} 2>/dev/null`)
sh(`ffmpeg -y -f lavfi -i "anullsrc=r=48000:cl=mono" -t 0.10 ${j('d.wav')} 2>/dev/null`)
fs.writeFileSync(j('list.txt'), ['a','b','c','d'].map(x=>`file '${j(x+'.wav')}'`).join('\n'))
sh(`ffmpeg -y -f concat -safe 0 -i ${j('list.txt')} -ac 1 -ar 48000 -codec:a libmp3lame -b:a 128k ${j('clip.mp3')} 2>/dev/null`)
const clip=j('clip.mp3')
;(async()=>{
 console.log('MODE env =', JSON.stringify(process.env.TAIL_REPAIR_MODE||'(unset -> code default)'))
 const det = await ap.detectTailClick(clip,{mode:'phrase'})
 console.log('detector:', JSON.stringify(det))
 if(!det.click){ console.log('FIXTURE DID NOT TRIP — proof inconclusive'); process.exit(2) }
 const h0=crypto.createHash('sha256').update(fs.readFileSync(clip)).digest('hex')
 const dur0=Number(sh(`ffprobe -v error -show_entries format=duration -of csv=p=0 ${clip}`).trim())
 let out; try{ out=await ap.repairTailDefect(clip,work,{text:'test tone',language:'deu',mode:'phrase'}) }
 catch(e){ out={THREW:e.message} }
 const h1=crypto.createHash('sha256').update(fs.readFileSync(clip)).digest('hex')
 console.log('RESULT: action=',out.action,'| flagOnly=',!!out.flagOnly,'| outPath=',out.outPath?path.basename(out.outPath):null, out.THREW?('| THREW: '+out.THREW):'')
 console.log('  original file mutated in place:', h0!==h1)
 console.log('  a NEW mutated file was produced:', !!out.outPath)
 if(out.outPath){
   const dur1=Number(sh(`ffprobe -v error -show_entries format=duration -of csv=p=0 ${out.outPath}`).trim())
   console.log(`  DURATION ${dur0.toFixed(3)}s -> ${dur1.toFixed(3)}s  (${((dur1-dur0)*1000).toFixed(0)}ms, ${(100*(dur0-dur1)/dur0).toFixed(1)}% removed)`)
 } else console.log(`  DURATION unchanged at ${dur0.toFixed(3)}s — nothing was cut`)
 process.exit(0)
})().catch(e=>{console.error(e);process.exit(1)})
