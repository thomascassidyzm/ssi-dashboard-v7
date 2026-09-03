// The raw-vs-processed row reads the margin the right way round.
//
// Tom, 2026-08-22, on what that comparison is for: he wants to hear that the
// raw take captured enough room either side of the phrase. It is a diagnostic
// about the TAKE, not an argument about whether our processing should exist.
//
// The old copy alarmed whenever the processed clip was more than 100ms shorter
// than the original — on a surface that deliberately records seconds of
// pre-roll and tail around every line so the trim can take them off. Measured
// on Tom's real takes: 5.67s raw to a 2.02s clip, 12.01s to 1.59s. That alarm
// has been firing on every take, by three to ten seconds, since it shipped,
// which trains the recordist to ignore the one line on the panel that is
// trying to tell them something.

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

  it('calls a clip a whole second longer than its original what it is', () => {
    const v = marginVerdict(3.0, 4.5)
    expect(v.state).toBe('impossible')
    expect(v.text).toContain('not the same take')
  })

  /**
   * THE 2026-09-03 FALSE ALARM, pinned. "no voy a poder" measured 5.23 s raw
   * and 5.28 s processed IN THE BROWSER and was declared a different take. The
   * two S3 objects decode to 5.240 s and 5.237 s — the same take, 3 ms apart.
   * The 44 ms is WebM/Opus and LAME MP3 disagreeing about their own length.
   */
  it('does not cry mismatch over codec padding', () => {
    const v = marginVerdict(5.23, 5.28)
    expect(v.state).toBe('tight')
    expect(v.text).not.toContain('not the same take')
  })

  it('still says nothing was trimmed, because that part was true', () => {
    expect(marginVerdict(5.23, 5.28).text).toContain('no room to spare')
  })
})
