// The raw-vs-processed row reads the margin the right way round.
//
// Tom, 2026-08-22, on what that comparison is for: he wants to hear that the
// raw take captured enough room either side of the phrase. It is a diagnostic
// about the TAKE, not an argument about whether our processing should exist.
//
// The old copy alarmed whenever the processed clip was more than 100ms shorter
// than the original. That was survivable only while the trim was quietly doing
// nothing — a quiet dry take fell through the read detector and was kept whole,
// so the difference was always about zero. With capture at a proper level the
// trim works, and a healthy take is now one where seconds of pre-roll and tail
// were removed and none of the words were. Alarming on that would train the
// recordist to ignore the one line on the panel that is trying to tell them
// something.

import { describe, it, expect } from 'vitest'
import { marginVerdict, MIN_MARGIN_MS } from './takeMargin'

describe('marginVerdict', () => {
  it('says nothing until both sides have been measured', () => {
    expect(marginVerdict(null, 2)).toBeNull()
    expect(marginVerdict(2, null)).toBeNull()
    expect(marginVerdict(false, 2)).toBeNull()   // measured, unmeasurable
    expect(marginVerdict(2, false)).toBeNull()
  })

  it('treats a generous margin as healthy, not as an alarm', () => {
    // The shape the recorder now produces: ~2.5s of pre-roll and a 900ms tail,
    // of which the trim keeps 350ms at each end.
    const v = marginVerdict(6.2, 3.5)
    expect(v.state).toBe('ok')
    expect(v.marginMs).toBe(2700)
    expect(v.text).toContain('2.70s')
  })

  it('alarms when the take had no room around the words', () => {
    const v = marginVerdict(3.05, 3.0)
    expect(v.state).toBe('tight')
    expect(v.marginMs).toBeLessThan(MIN_MARGIN_MS)
    expect(v.text).toContain('leave a beat')
  })

  it('alarms on an identical pair — nothing outside the phrase at all', () => {
    expect(marginVerdict(3.0, 3.0).state).toBe('tight')
  })

  it('calls a clip longer than its own original what it is', () => {
    const v = marginVerdict(3.0, 3.4)
    expect(v.state).toBe('impossible')
    expect(v.text).toContain('not the same take')
  })
})
