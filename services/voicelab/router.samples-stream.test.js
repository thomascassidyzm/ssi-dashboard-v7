/**
 * THE PROGRESS IS REAL, OR THE BUTTON IS A LIE.
 *
 * Tom, 2026-08-31, on generating preview clips for a whole language row: show
 * progress while it renders, and let clips appear as they arrive rather than all
 * at the end. A twenty-voice row is a couple of minutes of TTS, so this is the
 * difference between a screen that fills in front of you and a screen that looks
 * hung.
 *
 * What is under test is the WIRE CONTRACT, not TTS: one NDJSON line per clip,
 * written the moment that clip exists, then one final line carrying the whole
 * refreshed state. The renderer is stubbed because a test that rendered would
 * spend money to prove a line ending.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import routerPkg from './router.cjs'
const { mount } = routerPkg

// The route's clip events come from samples.prepare's onClip callback, so the
// stub IS the clock: three clips, announced one at a time.
const stubSamples = {
  prepare: async ({ voiceIds, onClip }) => {
    const rendered = []
    for (let i = 0; i < voiceIds.length; i++) {
      const one = { voiceId: voiceIds[i], url: `/api/voicelab/clip/stub${i}.mp3`, durationMs: 1000 + i }
      rendered.push(one)
      onClip?.({ ...one, done: i + 1, total: voiceIds.length })
    }
    return {
      language: 'zho', line: { text: '我不想猜明天会发生什么' }, samples: {}, missing: [],
      unrenderable: [], unrenderableWhy: {}, rendered, failed: [], chars: 33,
    }
  },
  read: async () => ({}),
}

let server
let base

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  mount(app, {
    requireAdmin: async () => ({ email: 'test@ssi' }),
    requireDashboardUser: async () => ({ email: 'test@ssi' }),
    logger: { log: () => {}, error: () => {} },
    supabase: () => ({ from: () => ({}) }),
    samples: stubSamples,
  })
  await new Promise((r) => { server = app.listen(0, r) })
  base = `http://127.0.0.1:${server.address().port}`
})

afterAll(() => server && server.close())

async function stream (voiceIds) {
  const res = await fetch(`${base}/api/voicelab/languages/zho/samples/prepare/stream`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ voiceIds }),
  })
  const text = await res.text()
  return {
    res,
    lines: text.split('\n').filter(Boolean).map((l) => JSON.parse(l)),
  }
}

describe('POST /languages/:language/samples/prepare/stream', () => {
  it('announces every clip as it lands, then the final state', async () => {
    const { res, lines } = await stream(['cartesia_a', 'azure_zh-CN-XiaoxiaoNeural', 'cartesia_c'])
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toMatch(/ndjson/)

    const clips = lines.filter((l) => l.clip)
    expect(clips).toHaveLength(3)
    // The counter the button reads. It counts up, and it counts to the total.
    expect(clips.map((l) => l.clip.done)).toEqual([1, 2, 3])
    expect(clips.every((l) => l.clip.total === 3)).toBe(true)
    // Every clip carries a playable url, which is what makes it appear early.
    expect(clips[0].clip.url).toMatch(/^\/api\/voicelab\/clip\//)

    const done = lines.at(-1)
    expect(done.done).toBe(true)
    expect(done.ok).toBe(true)
    expect(done.rendered).toHaveLength(3)
  })

  it('refuses an empty voice list before it opens a stream', async () => {
    const { res } = await stream([])
    expect(res.status).toBe(400)
  })
})
