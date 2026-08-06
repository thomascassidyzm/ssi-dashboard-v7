// Pins the truncation detector's behaviour and its calibrated thresholds.
// Fixtures are synthesised with ffmpeg at test time - no binary files in the repo.
// Run: npx vitest run tools/audio-truncation-detector.test.js
import { test, expect } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFileSync } from 'child_process'
import det from './audio-truncation-detector.cjs'

const TMP=fs.mkdtempSync(path.join(os.tmpdir(),'trunc-test-'));
// `tone` shapes a 220 Hz tone; `noise` decides whether the trailing silence carries a
// noise floor (a real render) or is generated digital silence (what a trim re-pads with).
const mk=(name,tone,{noise=false}={})=>{
  const f=path.join(TMP,name+'.wav');
  const args=['-v','quiet','-y','-f','lavfi','-i','sine=frequency=220:duration=1.2:sample_rate=16000'];
  if(noise) args.push('-f','lavfi','-i','anoisesrc=color=white:amplitude=0.0004:duration=3:sample_rate=16000',
    '-filter_complex',`[0:a]${tone}[s];[s][1:a]amix=inputs=2:duration=first`);
  else args.push('-af',tone);
  args.push('-ac','1','-ar','16000',f);
  execFileSync('ffmpeg',args);
  return f;
};

// A clip allowed to finish: level decays over ~250 ms into a live noise floor.
const natural=mk('natural','volume=0.5,afade=t=out:st=0.75:d=0.25,apad=pad_dur=0.15',{noise:true});
// A trimmed clip: full level, hard cut, then re-padded with generated digital silence.
const cut=mk('cut','volume=0.5,atrim=0:0.8,afade=t=out:st=0.792:d=0.008,apad=pad_dur=0.1');

test('a clip allowed to finish is not flagged', ()=>{
  const r=det.check(natural,{text:'test',lang:'eng'});
  expect(r.damaged, r.reason).toBe(false);
  expect(r.measurements.fallRate<det.DEFAULTS.fallRateDbPerMs, `natural decay measured ${r.measurements.fallRate} dB/ms`).toBe(true);
});

test('a hard cut re-padded with digital silence is flagged', ()=>{
  const r=det.check(cut,{text:'test',lang:'eng'});
  expect(r.damaged, r.reason).toBe(true);
  expect(r.measurements.fallRate>=det.DEFAULTS.fallRateDbPerMs).toBe(true);
  expect(r.measurements.zeroPadPct>=det.DEFAULTS.zeroPadPct).toBe(true);
});

test('both conditions are required - a steep fall alone is not the trim signature', ()=>{
  // same hard cut, but the padding carries a noise floor rather than exact zeros
  const f=mk('cut-noisy','volume=0.5,atrim=0:0.8,afade=t=out:st=0.792:d=0.008,apad=pad_dur=0.1',{noise:true});
  const r=det.check(f,{text:'test',lang:'eng'});
  expect(r.damaged, r.reason).toBe(false);
  expect(r.reason).toMatch(/not the trim signature/);
});

test('thresholds are the ones calibrated on 2026-08-06 and have not drifted silently', ()=>{
  // Calibration: 39 never-trimmed provider renders topped out at 0.633 dB/ms;
  // the 9 clips Tom confirmed damaged by ear bottomed out at 0.741 dB/ms.
  expect(det.DEFAULTS.fallRateDbPerMs).toBe(0.70);
  expect(det.DEFAULTS.zeroPadPct).toBe(80);
});

test('syllable counting is language-aware', ()=>{
  expect(det.scriptShape('so oft wie möglich','deu').sylls).toBe(5);
  expect(det.scriptShape('to speak German with you','eng').words).toBe(5);
});

test('the tool reports a verdict and never mutates its input', ()=>{
  const before=fs.statSync(natural);
  det.check(natural,{text:'test',lang:'eng'});
  const after=fs.statSync(natural);
  expect(before.size).toBe(after.size);
  expect(before.mtimeMs).toBe(after.mtimeMs);
});
