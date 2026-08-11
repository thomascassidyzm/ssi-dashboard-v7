import { test, expect } from '@playwright/test'
import { stubAuth } from '../vad-lab/helpers.js'

/**
 * Chunk-level review playback, driven through the real studio.
 *
 * Records a slow-pass take off the fake mic (three "LEGO chunks" with a
 * deliberate pause between each — see make-slow-take-wav.js), walks to the
 * review screen, and checks the thing Kai actually asked for: that each piece
 * of the take can be played on its own, and that each one is a clean isolated
 * cut rather than a slice of the wrong part of the phrase.
 *
 * "Sounds like a clean cut" is checked by measuring the audio, not by trusting
 * the UI: the test decodes the take in the page, cuts it on the very ranges the
 * piece buttons play, and asserts each piece is loud in the middle and silent
 * at neither end — which is only true if the boundaries landed on the pauses.
 */

// One phrase, read slow, in three LEGO chunks — matching the fake mic's audio.
const PHRASE = { text: 'dw i eisiau siarad', chunksString: 'dw i|eisiau|siarad' }

const SCRIPT = {
  courseCode: 'cym_for_eng',
  maxSeed: null,
  role: 'target1',
  totalItems: 1,
  totalPhrases: 1,
  totalDirect: 0,
  estimatedMinutes: 1,
  items: [
    {
      index: 0,
      text: PHRASE.text,
      cadence: 'slow',
      type: 'phrase',
      phraseIndex: 0,
      wordCount: 3,
      coversLegos: ['S0001L01'],
      known: 'I want to speak',
      seedNumber: 1,
      recordingChunks: PHRASE.chunksString.split('|').map(t => ({ text: t, isLego: true })),
      legoChunks: null,
      chunksString: PHRASE.chunksString,
      chunkCount: 3
    }
  ]
}

// Take uploads intercepted during the run, so the test can read what the
// browser actually sent rather than trusting that it sent anything.
let uploads = []

test.beforeEach(async ({ page }) => {
  await stubAuth(page)

  // Watch what is actually PLAYED, rather than what the app says it will play.
  // Chunk playback cuts on the sample: an AudioBufferSourceNode started with an
  // offset and a duration. Recording those two arguments — plus the buffer they
  // were cut from — lets the test measure the exact audio a recordist hears
  // when they click a piece, with no test-only affordance in the app itself.
  await page.addInitScript(() => {
    window.__played = []
    const origStart = AudioBufferSourceNode.prototype.start
    AudioBufferSourceNode.prototype.start = function (when, offset, duration) {
      window.__played.push({ offsetMs: (offset || 0) * 1000, durationMs: (duration || 0) * 1000 })
      window.__lastPlayedBuffer = this.buffer
      return origStart.apply(this, arguments)
    }
  })

  // The studio's own API surface, stubbed: this test is about what the browser
  // does with a take, not about the optimiser or the upload bucket.
  // The queue is the OTHER phrase source: the studio fetches it on mount for
  // regeneration mode. It has to be answered, or the mount-time fetch reaches a
  // real backend.
  await page.route('**/api/production/*/recording/queue*', route =>
    route.fulfill({ json: { items: [] } })
  )
  // Answered slowly on purpose. The real optimiser takes tens of seconds, so
  // the mount-time queue fetch has always long since landed by the time a
  // script arrives; an instant stub reverses that order and the queue's empty
  // list overwrites the script. The delay keeps the test on the real sequence
  // rather than testing a race no recordist can hit.
  await page.route('**/api/production/*/recording-script*', async route => {
    await new Promise(r => setTimeout(r, 1500))
    await route.fulfill({ json: SCRIPT })
  })
  await page.route('**/api/production/*/info*', route =>
    route.fulfill({ json: { course: { known_lang: 'English', target_lang: 'Welsh' } } })
  )
  uploads = []
  await page.route('**/api/production/*/recording/upload*', route => {
    try { uploads.push(JSON.parse(route.request().postData() || '{}')) } catch { /* not our shape */ }
    return route.fulfill({ json: { success: true, id: 'e2e-take' } })
  })
  await page.route('**/api/production/*/voice-config*', route =>
    route.fulfill({ json: { voice_config: {} } })
  )

  page.on('console', msg => {
    if (msg.text().includes('[Autocue]') || msg.text().includes('[VAD]')) {
      console.log(`  page> ${msg.text()}`)
    }
  })
})

test('a slow-pass take can be played back one LEGO chunk at a time', async ({ page }) => {
  await page.goto('/production/cym_for_eng/recording')

  // Mode 1: new-course script mode.
  await page.locator('.mode-card').first().click()
  await page.getByRole('button', { name: 'Begin Recording' }).click()

  // Go live. The fake mic opens on 2s of silence, which is what the studio
  // calibrates the room against, then reads the three chunks.
  await page.getByRole('button', { name: /Start Recording/ }).click()
  await expect(page.locator('.control-btn.record.recording')).toBeVisible()

  // Capturing the only item auto-advances off the end of the script, which
  // ends the session. That is the take being cut — no Stop press needed.
  await expect(page.locator('.summary-card')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.summary-card')).toContainText('Session Complete')

  await page.getByRole('button', { name: 'Review Recordings' }).click()

  // ---- the boundaries travel with the take ----------------------------
  // They used to die in the browser the moment the take was cut. The upload now
  // carries the recordist's own account of where they paused.
  expect(uploads).toHaveLength(1)
  const sent = uploads[0].metadata.chunkBoundariesMs
  expect(sent, 'the upload should carry the pause boundaries').toHaveLength(3)
  expect(sent[0].endMs).toBeGreaterThan(sent[0].startMs)
  expect(sent[2].endMs, 'the closing silence is reported open').toBeNull()

  // ---- the feature ----------------------------------------------------
  const card = page.locator('.segment-card').first()
  await expect(card).toBeVisible()

  // One button per LEGO chunk, each named with its own LEGO text — which only
  // happens when the pauses the recorder heard match the script's chunk map.
  const pieces = card.locator('.chunk-btn')
  await expect(pieces).toHaveCount(3)
  await expect(pieces.nth(0)).toContainText('dw i')
  await expect(pieces.nth(1)).toContainText('eisiau')
  await expect(pieces.nth(2)).toContainText('siarad')
  await expect(card.locator('.chunk-warning')).toHaveCount(0)

  // Clicking one plays it and marks only it.
  await pieces.nth(1).click()
  await expect(pieces.nth(1)).toHaveClass(/playing/)
  await expect(pieces.nth(0)).not.toHaveClass(/playing/)
  // ~0.9s of audio, then it stops on its own — the button un-marks itself.
  await expect(pieces.nth(1)).not.toHaveClass(/playing/, { timeout: 10_000 })

  // ---- and they are clean cuts ---------------------------------------
  // Play every piece, then measure the exact audio each click sent to the
  // speakers against the take it was cut from.
  for (const i of [0, 2]) {
    await pieces.nth(i).click()
    await expect(pieces.nth(i)).toHaveClass(/playing/)
    await expect(pieces.nth(i)).not.toHaveClass(/playing/, { timeout: 10_000 })
  }

  const measured = await page.evaluate(() => {
    const buffer = window.__lastPlayedBuffer
    const data = buffer.getChannelData(0)
    const rate = buffer.sampleRate

    const rms = (fromMs, toMs) => {
      const a = Math.max(0, Math.floor((fromMs / 1000) * rate))
      const b = Math.min(data.length, Math.floor((toMs / 1000) * rate))
      if (b <= a) return 0
      let sum = 0
      for (let i = a; i < b; i++) sum += data[i] * data[i]
      return Math.sqrt(sum / (b - a))
    }

    return {
      takeMs: buffer.duration * 1000,
      pieces: window.__played.map(p => {
        const startMs = p.offsetMs
        const endMs = p.offsetMs + p.durationMs
        return {
          startMs,
          endMs,
          // Loud through the middle of the piece: it is speech, not a pause.
          middleRms: rms(startMs + p.durationMs * 0.3, startMs + p.durationMs * 0.7),
          // And silence on both sides of it: the cut landed in the pause.
          beforeRms: rms(startMs - 300, startMs - 100),
          afterRms: rms(endMs + 100, endMs + 300)
        }
      })
    }
  })

  console.log('take + pieces played:', JSON.stringify(measured, null, 2))

  // Piece 2 was played first (the click above), then pieces 1 and 3.
  expect(measured.pieces).toHaveLength(3)
  const played = [...measured.pieces].sort((x, y) => x.startMs - y.startMs)

  for (const [i, piece] of played.entries()) {
    // Speech through this pipeline measures ~0.23 RMS; room tone ~0.003.
    expect(piece.middleRms, `piece ${i + 1} should be speech, not a pause`).toBeGreaterThan(0.05)
    // Nothing sits before the first piece — it starts at the take's own start.
    if (i > 0) expect(piece.beforeRms, `piece ${i + 1} should start after a pause`).toBeLessThan(0.02)
    expect(piece.afterRms, `piece ${i + 1} should end at a pause`).toBeLessThan(0.02)
  }

  // In reading order, with a real pause between each.
  expect(played[1].startMs).toBeGreaterThan(played[0].endMs)
  expect(played[2].startMs).toBeGreaterThan(played[1].endMs)

  await page.screenshot({ path: 'e2e/autocue-chunks/chunk-review.png', fullPage: true })
})
