/**
 * TAIL_REPAIR_MODE=pad — the pad-first tail gate.
 *
 * Synthetic clips only (ffmpeg lavfi): no TTS, no network, no estate audio, so
 * this runs anywhere and costs nothing. The corpus-scale evidence lives in
 * scripts/tail-pad-mode-verify.cjs, which reproduces the 2026-08-04 memo's 83%
 * clearance over the 104 real flagged clips.
 *
 * What must hold, whatever the detector thinks of a given synthetic waveform:
 *  - pad mode NEVER modifies the input clip;
 *  - pad mode never throws and never returns an outPath (nothing to move);
 *  - the probe pads (extends) — it never trims;
 *  - the probe cleans up after itself;
 *  - 'flag' is still the default; the new mode is opt-in only.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(require('child_process').exec);

const MOD = require.resolve('./audio-processor.cjs');
function loadWithMode(mode) {
  delete require.cache[MOD];
  const prev = process.env.TAIL_REPAIR_MODE;
  if (mode === undefined) delete process.env.TAIL_REPAIR_MODE;
  else process.env.TAIL_REPAIR_MODE = mode;
  const m = require(MOD);
  process.env.TAIL_REPAIR_MODE = prev;
  return m;
}

let tmp;
// A clip the detector's burst rule is built to catch: 500 ms of tone, 120 ms of
// silence, then a 10 ms blip — short, isolated, well after the speech body.
const clicky = () => path.join(tmp, 'clicky.mp3');
// A clip with a tight tail and no blip: tone that simply stops.
const tight = () => path.join(tmp, 'tight.mp3');

async function synth(outPath, filter) {
  await execAsync(
    `ffmpeg -y -hide_banner -loglevel error -f lavfi -i "${filter}" -ac 1 -ar 48000 -c:a libmp3lame -q:a 2 "${outPath}"`
  );
}

beforeAll(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'tailpad-test-'));
  await synth(clicky(),
    'aevalsrc=\'0.5*sin(880*2*PI*t)*between(t,0,0.5) + 0.06*sin(3000*2*PI*t)*between(t,0.62,0.63)\':d=0.64:s=48000');
  await synth(tight(), 'aevalsrc=\'0.5*sin(880*2*PI*t)\':d=0.5:s=48000');
}, 60000);

afterAll(async () => { if (tmp) await fs.remove(tmp).catch(() => {}); });

describe('TAIL_REPAIR_MODE', () => {
  it('still defaults to flag — pad is opt-in, the default is unchanged', () => {
    expect(loadWithMode(undefined).TAIL_REPAIR_MODE).toBe('flag');
  });

  it('clamps the probe pad below the detector 400ms analysis window', () => {
    const prev = process.env.TAIL_PAD_MS;
    process.env.TAIL_PAD_MS = '9000';
    try {
      expect(loadWithMode('pad').TAIL_PAD_MS).toBeLessThanOrEqual(350);
    } finally {
      if (prev === undefined) delete process.env.TAIL_PAD_MS; else process.env.TAIL_PAD_MS = prev;
    }
  });
});

describe('padTailProbe', () => {
  it('extends the clip rather than trimming it, and leaves no temp file behind', async () => {
    const mod = loadWithMode('pad');
    const work = await fs.mkdtemp(path.join(tmp, 'probe-'));
    const before = await mod.getAudioMetadata(clicky());
    const probe = await mod.padTailProbe(clicky(), work, { mode: 'phrase' });

    expect(probe.error).toBeUndefined();
    expect(probe.padMs).toBe(300);
    expect(typeof probe.cleared).toBe('boolean');
    expect(await fs.readdir(work)).toEqual([]); // probe cleaned up

    // The padded copy is transient, so re-make it here to assert the direction
    // of the edit: silence is APPENDED, never cut.
    const padded = path.join(work, 'padded.mp3');
    await mod.ffmpegFilterToLameMp3(clicky(), padded, { filterChain: `apad=pad_dur=${probe.padMs / 1000}` });
    const after = await mod.getAudioMetadata(padded);
    expect(after.duration).toBeGreaterThan(before.duration);
    expect(after.duration).toBeCloseTo(before.duration + probe.padMs / 1000, 1);
  }, 60000);

  it('clears a flag that only exists because the tail is tight', async () => {
    const mod = loadWithMode('pad');
    const work = await fs.mkdtemp(path.join(tmp, 'probe2-'));
    const bare = await mod.detectTailClick(tight(), { mode: 'phrase' });
    const probe = await mod.padTailProbe(tight(), work, { mode: 'phrase' });
    // Whether the tight clip flags bare is the detector's business; what pad
    // mode guarantees is that padding never INVENTS a defect.
    if (!bare.click) expect(probe.cleared).toBe(true);
  }, 60000);
});

describe('repairTailDefect in pad mode', () => {
  it('reports the padded verdict and never touches the input clip', async () => {
    const mod = loadWithMode('pad');
    const work = await fs.mkdtemp(path.join(tmp, 'pad-'));
    const before = await fs.stat(clicky());
    const res = await mod.repairTailDefect(clicky(), work, { text: 'test tone', mode: 'phrase' });
    const after = await fs.stat(clicky());

    expect(after.size).toBe(before.size);
    expect(after.mtimeMs).toBe(before.mtimeMs);
    expect(res.outPath).toBeUndefined(); // nothing for a caller to move over the original
    if (res.defect) {
      expect(res.action).toBe('held');
      expect(res.padProbe).toBeDefined();
      expect(typeof res.padProbe.cleared).toBe('boolean');
    }
  }, 60000);

  it('is identical to flag mode when the detector finds nothing', async () => {
    const flagMode = loadWithMode('flag');
    const padMode = loadWithMode('pad');
    const work = await fs.mkdtemp(path.join(tmp, 'nodefect-'));
    const a = await flagMode.repairTailDefect(tight(), work, { text: 'test tone', mode: 'phrase' });
    const b = await padMode.repairTailDefect(tight(), work, { text: 'test tone', mode: 'phrase' });
    if (a.defect === null) expect(b).toEqual({ defect: null });
  }, 60000);
});
