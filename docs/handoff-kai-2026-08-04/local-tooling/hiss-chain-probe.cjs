#!/usr/bin/env node
/**
 * hiss-chain-probe.cjs — settle "is the xAI hiss in the raw render or made by our
 * mastering chain?" (Tom, 2026-07-29). Generates ONE short raw xAI render + an
 * Azure control, then measures the noise floor RAW and cumulatively through each
 * real mastering stage. Also shows where the afftdn denoise lands.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileP = promisify(execFile);
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const tts = require('../services/tts-service.cjs');
const { ffmpegFilterToLameMp3 } = require('../services/audio-processor.cjs');

// exact chain constants (copied from audio-processor.cjs)
const PRE_COMPRESS = 'acompressor=threshold=-24dB:ratio=8:attack=5:release=80:knee=8';
const TRUE_PEAK_LIMIT = 'aresample=176400,alimiter=limit=0.841:attack=1:release=50:level=false';
const ANTI_CLICK_FADE = 'afade=t=in:st=0:d=0.008,areverse,afade=t=in:st=0:d=0.008,areverse';
const PRE_DENOISE = 'afftdn=nf=-25:nt=w';

const OUT = path.join(__dirname, '..', 'temp', 'hiss-chain-probe');
fs.mkdirSync(OUT, { recursive: true });
const TEXT = process.argv[2] || 'Okay. So, let me think about that for a moment before we carry on.';

async function measured(file, prefilter) {
  // integrated loudness via ebur128 (same basis as normalizeAudio's gain calc)
  const { stdout, stderr } = await execFileP('ffmpeg', ['-i', file, '-af', `${prefilter},ebur128=framelog=quiet`, '-f', 'null', '-'], { maxBuffer: 1 << 24 }).catch(e => ({ stdout: '', stderr: e.stderr || '' }));
  const m = (stderr + stdout).match(/I:\s*(-?\d+\.?\d*)\s*LUFS/g);
  return m ? parseFloat(m[m.length - 1].match(/(-?\d+\.?\d*)/)[1]) : NaN;
}
async function floorStats(file) {
  const { stderr } = await execFileP('ffmpeg', ['-hide_banner', '-i', file, '-af', 'astats=metadata=1:measure_overall=all', '-f', 'null', '-'], { maxBuffer: 1 << 24 }).catch(e => ({ stderr: e.stderr || '' }));
  const g = (re) => { const m = stderr.match(re); return m ? m[1] : '?'; };
  return {
    trough: g(/RMS trough dB:\s*(-?\d+\.?\d*|-?inf)/),
    noiseFloor: g(/Noise floor dB:\s*(-?\d+\.?\d*|-?inf)/),
    rms: g(/RMS level dB:\s*(-?\d+\.?\d*)/),
  };
}
async function stageEncode(inPath, outPath, filterChain) {
  await ffmpegFilterToLameMp3(inPath, outPath, filterChain ? { filterChain } : {});
}

(async () => {
  console.log(`text: "${TEXT}"\n`);

  // ---- generate RAW renders (pre-master)
  const xai = await tts.generateXai(TEXT, { apiKey: process.env.XAI_API_KEY, voiceId: 'eve', language: 'en-GB' });
  fs.writeFileSync(path.join(OUT, 'raw_xai.mp3'), xai.audioBuffer);
  const az = await tts.generateAzure(TEXT, { subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION, voiceName: 'en-GB-SoniaNeural' });
  fs.writeFileSync(path.join(OUT, 'raw_azure.mp3'), az.audioBuffer);
  console.log(`raw sizes: xai=${xai.audioBuffer.length}b azure=${az.audioBuffer.length}b\n`);

  for (const [label, raw] of [['xAI eve', 'raw_xai.mp3'], ['Azure Sonia (control)', 'raw_azure.mp3']]) {
    const rawPath = path.join(OUT, raw);
    const gain = (-16.0 + 1.0 - await measured(rawPath, PRE_COMPRESS)).toFixed(2);
    // cumulative stages
    const stages = [
      ['0 raw', null],
      ['1 +compressor', PRE_COMPRESS],
      ['2 +gain', `${PRE_COMPRESS},volume=${gain}dB`],
      ['3 +limiter', `${PRE_COMPRESS},volume=${gain}dB,${TRUE_PEAK_LIMIT}`],
      ['4 +fade (=SHIPPED)', `${PRE_COMPRESS},volume=${gain}dB,${TRUE_PEAK_LIMIT},${ANTI_CLICK_FADE}`],
      ['5 denoise-first (FIX)', `${PRE_DENOISE},${PRE_COMPRESS},volume=${gain}dB,${TRUE_PEAK_LIMIT},${ANTI_CLICK_FADE}`],
    ];
    console.log(`===== ${label}  (make-up gain applied = ${gain} dB) =====`);
    console.log(`  stage                    RMStrough   NoiseFloor    RMS`);
    for (const [name, fc] of stages) {
      const out = path.join(OUT, `${raw.replace('.mp3', '')}__${name.replace(/[ +=()]/g, '_')}.mp3`);
      await stageEncode(rawPath, out, fc);
      const s = await floorStats(out);
      console.log(`  ${name.padEnd(24)} ${String(s.trough).padStart(9)} ${String(s.noiseFloor).padStart(11)} ${String(s.rms).padStart(8)}`);
    }
    console.log('');
  }
  console.log(`files in ${OUT}`);
})().catch(e => { console.error(e); process.exit(1); });
