import { describe, it, expect } from 'vitest'
import { createAdvanceLock, AUTO_GRACE_MS } from './advance-lock.js'

// A hand-cranked clock, so the race is a sequence of facts rather than a sleep.
function lockAt(t0 = 0) {
  let t = t0
  const lock = createAdvanceLock({ now: () => t })
  return { lock, tick: (ms) => { t += ms }, at: () => t }
}

describe('recordist advance lock — one line, one step forward', () => {
  it('lets exactly one advance leave a line, whoever asks second', () => {
    const { lock } = lockAt()
    expect(lock.claim('L1', 'tap')).toBe(true)
    expect(lock.claim('L1', 'auto')).toBe(false)
    expect(lock.claim('L1', 'tap')).toBe(false)
  })

  it('refuses the tap when the watcher got there first — the two-line skip', () => {
    const { lock } = lockAt()
    expect(lock.claim('L1', 'auto')).toBe(true)
    expect(lock.claim('L1', 'tap')).toBe(false)
  })

  it('advancing from A then from B is two steps, not one', () => {
    const { lock } = lockAt()
    expect(lock.claim('A', 'tap')).toBe(true)
    expect(lock.claim('B', 'tap')).toBe(true)
  })

  it('a thumb already in flight when auto-advance fires does not skip the next line', () => {
    const { lock, tick } = lockAt()
    // The watcher moves him off A onto B.
    expect(lock.claim('A', 'auto')).toBe(true)
    // His tap lands a beat later. It was aimed at A; B is unread.
    tick(120)
    expect(lock.claim('B', 'tap')).toBe(false)
    // Once the grace is out, B is his to leave whenever he likes.
    tick(AUTO_GRACE_MS)
    expect(lock.claim('B', 'tap')).toBe(true)
  })

  it('does not hold his own taps against him', () => {
    const { lock, tick } = lockAt()
    expect(lock.claim('A', 'tap')).toBe(true)
    tick(50)
    // Two deliberate taps in a row skip two lines, which is what he asked for.
    expect(lock.claim('B', 'tap')).toBe(true)
  })

  it('the watcher itself is never blocked by the grace it set', () => {
    const { lock, tick } = lockAt()
    expect(lock.claim('A', 'auto')).toBe(true)
    tick(30)
    expect(lock.claim('B', 'auto')).toBe(true)
  })

  it('Back gives a line its step back, and clears a grace he is overriding', () => {
    const { lock, tick } = lockAt()
    expect(lock.claim('A', 'auto')).toBe(true)   // watcher moved him A -> B
    lock.release('A')                            // Back: he returns to A
    tick(10)                                     // still inside the auto grace
    expect(lock.claim('A', 'tap')).toBe(true)    // and A is his to leave again
  })

  it('release only forgives the line it names', () => {
    const { lock } = lockAt()
    lock.claim('A', 'tap')
    lock.claim('B', 'tap')
    lock.release('B')
    expect(lock.isSpent('A')).toBe(true)
    expect(lock.claim('A', 'tap')).toBe(false)
    expect(lock.claim('B', 'tap')).toBe(true)
  })

  it('a new session starts clean', () => {
    const { lock } = lockAt()
    lock.claim('A', 'tap')
    lock.reset()
    expect(lock.claim('A', 'tap')).toBe(true)
  })

  it('refuses a line with no identity rather than guessing', () => {
    const { lock } = lockAt()
    expect(lock.claim(null, 'tap')).toBe(false)
    expect(lock.claim(undefined, 'auto')).toBe(false)
  })
})
