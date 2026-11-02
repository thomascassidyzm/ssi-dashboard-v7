// The 4-phase cycle (prompt → pause → voice1 → voice2 → next item), skip and
// previous, and listener unsubscription, driven through a fake Audio.
//
// Run: npx vitest run src/composables/useScriptPlayer.cycle.test.js

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const played = []
class FakeAudio {
  constructor() { this.listeners = {}; this.paused = true; this.src = ''; this.currentTime = 0 }
  addEventListener(ev, fn) { this.listeners[ev] = fn }
  removeEventListener() {}
  play() { this.paused = false; played.push(this.src); return Promise.resolve() }
  pause() { this.paused = true }
  end() { this.paused = true; this.listeners.ended() }
}
let lastAudio
vi.stubGlobal('Audio', class extends FakeAudio { constructor() { super(); lastAudio = this } })
vi.mock('vue', async (orig) => ({ ...(await orig()), onUnmounted: () => {} }))

import { useScriptPlayer } from './useScriptPlayer'

const tick = () => new Promise((r) => setTimeout(r, 0))
const items = [
  { sourceId: 'p1', target1Id: 't1', target2Id: 't2' },
  { sourceId: 'p2', target1Id: 't3' },
]

beforeEach(() => { played.length = 0 })
afterEach(() => vi.useRealTimers())

describe('useScriptPlayer', () => {
  it('runs prompt → pause → voice1 → voice2, then the next item, then completes', async () => {
    const player = useScriptPlayer({ audioUrlResolver: async (id) => `url:${id}` })
    const phases = []; const itemsSeen = []; let completed = 0
    player.onPhaseChange((p) => phases.push(p))
    player.onItemChange((i) => itemsSeen.push(i.sourceId))
    player.onComplete(() => completed++)

    player.playFrom(items)
    await tick()
    expect(played).toEqual(['url:p1'])
    expect(player.progress.value).toBe(0)
    vi.useFakeTimers()
    lastAudio.end()                      // prompt done → pause (1 s)
    expect(player.currentPhase.value).toBe('pause')
    expect(player.progress.value).toBe(25)
    await vi.advanceTimersByTimeAsync(1000)
    vi.useRealTimers()
    await tick()
    expect(played).toEqual(['url:p1', 'url:t1'])
    expect(player.progress.value).toBe(50)
    lastAudio.end(); await tick()
    expect(played).toEqual(['url:p1', 'url:t1', 'url:t2'])
    expect(player.progress.value).toBe(75)
    lastAudio.end(); await tick()        // cycle done → item 2, prompt
    expect(player.currentIndex.value).toBe(1)
    expect(played.at(-1)).toBe('url:p2')
    // voice2 falls back to target1 when the item has no second voice
    lastAudio.end(); vi.useFakeTimers(); await vi.advanceTimersByTimeAsync(1000); vi.useRealTimers(); await tick()
    lastAudio.end(); await tick()
    expect(played.at(-1)).toBe('url:t3')
    lastAudio.end(); await tick()
    expect(played.slice(-2)).toEqual(['url:t3', 'url:t3'])
    lastAudio.end(); await tick()        // last item done
    expect(completed).toBe(1)
    expect(player.isPlaying.value).toBe(false)
    expect(player.progress.value).toBe(0)   // advanceItem sets 100 then stop() resets it
    expect(phases).toEqual(['prompt', 'pause', 'voice1', 'voice2', 'prompt', 'pause', 'voice1', 'voice2'])
    expect(itemsSeen).toEqual(['p1', 'p2'])
  })

  it('skip and previous move the item and restart the prompt only while playing', async () => {
    const player = useScriptPlayer({ audioUrlResolver: async (id) => `url:${id}` })
    const seen = []
    player.onItemChange((i) => seen.push(i.sourceId))
    player.playFrom(items); await tick()
    player.skip(); await tick()
    expect(player.currentIndex.value).toBe(1)
    expect(player.currentPhase.value).toBe('prompt')
    expect(played).toEqual(['url:p1', 'url:p2'])
    player.pause()
    player.previous(); await tick()
    expect(player.currentIndex.value).toBe(0)
    expect(player.currentPhase.value).toBeNull()   // paused: no restart
    expect(played).toEqual(['url:p1', 'url:p2'])
    expect(seen).toEqual(['p1', 'p2', 'p1'])
    expect(player.progress.value).toBe(0)
  })

  it('an unsubscribed listener is not called again', async () => {
    const player = useScriptPlayer({ audioUrlResolver: async (id) => `url:${id}` })
    const cb = vi.fn()
    const off = player.onItemChange(cb)
    player.playFrom(items); await tick()
    off()
    player.skip(); await tick()
    expect(cb).toHaveBeenCalledTimes(1)
  })
})
