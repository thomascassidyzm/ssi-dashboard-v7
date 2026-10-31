import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { cutClip, clipCut, placeSeams, quietestNear, refuseRequest, similarity } = require('./clip-cut.cjs')

// Real whisper word timings (ggml-small) of ita_for_eng pod-1 SC01-S004 "Sì, oggi ho una giornata impegnativa."
// (clip 8322560c…v2), the card the #913/#937 silence cutter refused: it cut "Sì, oggi" at 580 ms and whisper heard "si".
const ITA_WORDS = [
  { text: '', startMs: 0, endMs: 90 }, { text: 'Sì,', startMs: 90, endMs: 360 }, { text: 'oggi', startMs: 360, endMs: 730 },
  { text: 'ho', startMs: 730, endMs: 940 }, { text: 'una', startMs: 940, endMs: 1190 }, { text: 'giornata', startMs: 1190, endMs: 1940 },
  { text: 'impegnativa.', startMs: 1940, endMs: 3060 },
]

/** 16 kHz mono s16le PCM: loud everywhere except the given quiet windows (ms). */
function pcm(durationMs, quiet = []) {
  const n = Math.round(durationMs * 16); const b = Buffer.alloc(n * 2)
  for (let i = 0; i < n; i++) {
    const ms = i / 16
    const q = quiet.some(([a, z]) => ms >= a && ms < z)
    b.writeInt16LE(q ? 0 : Math.round(8000 * Math.sin(i / 3)), i * 2)
  }
  return b
}

describe('clip-cut: edit an existing recording (job #410)', () => {
  it('places the seam AFTER the whole word "oggi", where the silence cutter cut inside it', () => {
    const { seams } = placeSeams(ITA_WORDS, ['Sì, oggi', 'ho una giornata', 'impegnativa'])
    expect(seams.map((s) => s.afterWord)).toEqual([1, 4]) // filtered words: Sì, oggi | ho una giornata | impegnativa
    expect(seams[0].gapFromMs).toBe(730)
    expect(seams[0].gapFromMs).toBeGreaterThan(580)
  })

  it('moves a seam to the quietest frame near the word gap', () => {
    const energy = new Array(100).fill(100); energy[40] = 1; energy[10] = 0 // 10 is outside the window
    expect(quietestNear(energy, 380, 420)).toBe(405)
  })

  it('cuts, hears every piece back, and returns the learner app\'s podDrillCuts record — spans of the SAME clip', async () => {
    // first words loud, last words softer, a pause at 1480-1560 ms (wider than the player's 30 ms stop overrun): the fake ear hears a piece by what it holds
    const whole = pcm(3000, [[1480, 1560]])
    for (let i = Math.round(1560 * 16); i < whole.length / 2; i++) whole.writeInt16LE(Math.round(whole.readInt16LE(i * 2) / 4), i * 2)
    const peak = (p, from, to) => { let m = 0; for (let i = from; i < to && i < p.length / 2; i++) m = Math.max(m, Math.abs(p.readInt16LE(i * 2))); return m }
    const hearFake = (p) => {
      const loud = peak(p, 0, p.length / 2) > 4000, soft = peak(p, p.length / 2 - 400, p.length / 2) > 0 && peak(p, p.length / 2 - 400, p.length / 2) < 4000
      return loud && soft ? 'Posso pagare con la carta' : loud ? 'Posso pagare' : 'con la carta.'
    }
    const deps = {
      clipBytes: async () => Buffer.from('mp3'),
      decode: async () => whole,
      words: async () => [{ text: 'Posso', startMs: 100, endMs: 600 }, { text: 'pagare', startMs: 600, endMs: 1480 }, { text: 'con', startMs: 1560, endMs: 1800 }, { text: 'la', startMs: 1800, endMs: 2000 }, { text: 'carta', startMs: 2000, endMs: 2900 }],
      hear: async (p) => hearFake(p),
    }
    const out = await cutClip({ courseCode: 'ita_for_eng', sourceAudioId: 'abc.v2', pieces: ['Posso pagare', 'con la carta'], glosses: ['Can I pay', 'by card'] }, deps)
    expect(out.ok).toBe(true)
    expect(out.verified).toBe(true)
    expect(out.drillCut.clip).toBe('abc.v2') // a piece is a span of the source: no new clip, the cast voice cannot change
    expect(out.drillCut.lines[0].chunks).toEqual([['Posso pagare', 0, out.pieces[0].endMs, 'Can I pay'], ['con la carta', out.pieces[1].startMs, 3000, 'by card']])
    expect(out.pieces[0].endMs).toBeGreaterThanOrEqual(1480)
    expect(out.pieces[0].endMs).toBeLessThanOrEqual(1530) // + 30 ms overrun stays inside the pause
  })

  it('refuses to file an unverified cut and files a verified one exactly once, naming the voice it keeps', async () => {
    const deps = {
      clipRow: async () => ({ id: 'abc', course_code: 'ita_for_eng', voice_id: 'cast-voice', text: 'x' }),
      clipBytes: async () => Buffer.from('mp3'), decode: async () => pcm(2000),
      words: async () => [{ text: 'uno', startMs: 0, endMs: 900 }, { text: 'due', startMs: 1000, endMs: 1900 }],
      hear: async () => 'tre',
    }
    const filed = []
    deps.recordEdit = async (e) => { filed.push(e); return 'evt-1' }
    const bad = await clipCut({ courseCode: 'ita_for_eng', sourceAudioId: 'abc', pieces: ['uno', 'due'], cutsMs: [950], dryRun: false }, deps)
    expect(bad.code).toBe('UNVERIFIED')
    expect(filed).toHaveLength(0)
    let n = 0; deps.hear = async () => (n++ === 0 ? 'uno' : 'due')
    const good = await clipCut({ courseCode: 'ita_for_eng', sourceAudioId: 'abc', pieces: ['uno', 'due'], cutsMs: [950], dryRun: false }, deps)
    expect(good.ok).toBe(true)
    expect(good.eventId).toBe('evt-1')
    expect(filed).toHaveLength(1)
    expect(filed[0].detail.voiceId).toBe('cast-voice')
  })

  it('a dry run files nothing', async () => {
    const filed = []
    const out = await clipCut({ courseCode: 'ita_for_eng', sourceAudioId: 'abc', pieces: ['uno', 'due'], cutsMs: [950] }, {
      clipBytes: async () => Buffer.from('mp3'), decode: async () => pcm(2000), hear: async () => 'uno', recordEdit: async (e) => filed.push(e),
    })
    expect(out.dryRun).toBe(true)
    expect(filed).toHaveLength(0)
  })

  it('refuses malformed requests before fetching anything', () => {
    expect(refuseRequest({ sourceAudioId: 'a', pieces: ['one'] })[0]).toBe('BAD_PIECES')
    expect(refuseRequest({ sourceAudioId: 'a', pieces: ['a', 'b'], cutsMs: [5, 3] })[0]).toBe('BAD_CUTS')
    expect(similarity('Posso pagare.', 'posso pagare')).toBe(1)
  })
})
