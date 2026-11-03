import test from 'node:test'
import assert from 'node:assert/strict'
import { voicedRms, scale, limitPeaks, normaliseIntro, matchGains, tomEnding, snapOnset, overlay } from './dsp.mjs'

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} ≈ ${expected}`)

test('voiced RMS excludes silence and frames below the relative gate, including short inputs', () => {
  assert.equal(voicedRms(new Float32Array(), 1000), 0)
  assert.equal(voicedRms(new Float32Array(40), 1000), 0)
  close(voicedRms(new Float32Array(7).fill(0.5), 1000), 0.5)
  const samples = new Float32Array(60)
  samples.fill(0.5, 20, 40)
  samples.fill(0.01, 40)
  close(voicedRms(samples, 1000), 0.5)
})

test('scaling returns independent samples without changing the source', () => {
  const samples = new Float32Array([0.25, -0.5, 0])
  assert.deepEqual(scale(samples, 2), new Float32Array([0.5, -1, 0]))
  assert.deepEqual(samples, new Float32Array([0.25, -0.5, 0]))
  assert.notEqual(scale(samples, 1), samples)
})

test('peak limiting bounds both polarities at the edges and in the middle', () => {
  const samples = new Float32Array([2, 0.5, 0, -2, 0.5, 2])
  const before = samples.slice()
  const limited = limitPeaks(samples, 1000)
  assert.notEqual(limited, samples)
  for (let i = 0; i < samples.length; i++) {
    assert.ok(Math.abs(limited[i]) <= 0.970001)
    assert.ok(Math.abs(limited[i]) <= Math.abs(samples[i]))
    assert.equal(Math.sign(limited[i]), Math.sign(samples[i]))
  }
  assert.deepEqual(samples, before)
  const quiet = new Float32Array([0.25, -0.5])
  assert.equal(limitPeaks(quiet, 1000), quiet)
})

test('normalisation reaches -14 dB for steady audio and leaves silence alone', () => {
  const silence = new Float32Array(40)
  assert.equal(normaliseIntro(silence, 1000), silence)
  const samples = new Float32Array(40).fill(0.05)
  close(voicedRms(normaliseIntro(samples, 1000), 1000), 10 ** (-14 / 20))
  assert.deepEqual(samples, new Float32Array(40).fill(0.05))
})

test('gain matching applies LEGO emphasis, caps amplification and preserves silent parts', () => {
  const levels = [0.1, 0.1, 0, 0.0001]
  const gains = matchGains(levels, 6, 1)
  close(gains[0], 10 ** (-17 / 20) / 0.1)
  close(gains[1] / gains[0], 10 ** (6 / 20))
  assert.equal(gains[2], 1)
  assert.equal(gains[3], 6)
  assert.deepEqual(levels, [0.1, 0.1, 0, 0.0001])
})

test('ending fades the last voiced frame and replaces trailing audio with 250 ms of silence', () => {
  const samples = new Float32Array(40)
  samples.fill(0.5, 0, 20)
  const ended = tomEnding(samples, 1000, 10)
  assert.equal(ended.length, 270)
  close(ended[10], 0.5)
  close(ended[15], 0.5 * Math.SQRT1_2)
  assert.ok(ended[19] < ended[15])
  assert.ok(ended.subarray(20).every((x) => x === 0))
  assert.deepEqual(samples.subarray(0, 20), new Float32Array(20).fill(0.5))
  const silence = new Float32Array(20)
  assert.equal(tomEnding(silence, 1000, 10), silence)
})

test('onset snaps back through speech with 10 ms padding, bounded at sample zero', () => {
  const samples = new Float32Array(100)
  samples.fill(0.5, 30, 70)
  assert.equal(snapOnset(samples, 60, 1000), 20)
  assert.equal(snapOnset(samples, 5, 1000), 0)
})

test('overlay inserts positive gaps and sums negative-gap overlaps without mutating parts', () => {
  const parts = [new Float32Array([1, 2, 3]), new Float32Array([4, 5])]
  assert.deepEqual(overlay(parts, [2], 1000), new Float32Array([1, 2, 3, 0, 0, 4, 5]))
  assert.deepEqual(overlay(parts, [-1], 1000), new Float32Array([1, 2, 7, 5]))
  assert.deepEqual(overlay(parts, [-10], 1000), new Float32Array([5, 7, 3]))
  assert.deepEqual(parts, [new Float32Array([1, 2, 3]), new Float32Array([4, 5])])
})
