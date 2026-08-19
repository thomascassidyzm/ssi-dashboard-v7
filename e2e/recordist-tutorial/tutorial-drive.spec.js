import { test, expect } from '@playwright/test'
import { stubAuth } from '../vad-lab/helpers.js'

/**
 * The recordist tutorial, driven the way a first-time recordist would drive it.
 *
 * A phone-sized browser opens /recording-tutorial, reads four practice items off
 * a fake microphone (two natural, two slow with a beat at every LEGO boundary),
 * reaches the review screen, plays the pieces its own slow read was cut into,
 * and then plays a sentence it never said, spliced out of those pieces.
 *
 * TWO THINGS ARE MEASURED RATHER THAN ASSERTED FROM THE UI:
 *
 * 1. NOTHING IS SAVED. The headline claim of this feature is that the tutorial
 *    is incapable of writing anything — no upload, no course_audio row, no
 *    queue touched. A green screen cannot prove that; the network can. Every
 *    request the page makes is intercepted by a catch-all route, and any write
 *    method, or any request to an upload / recording / audio / Supabase / S3
 *    address, is recorded as a violation AND aborted, so a regression cannot
 *    even complete the write it was trying to make. The assertion is on the
 *    log, not on the screen.
 *
 * 2. THE AUDIO ACTUALLY PLAYED. The LEGO piece buttons cut on the sample — an
 *    AudioBufferSourceNode started with an offset and a duration — so the spec
 *    wraps `start` and reads those two arguments back. The spliced sentences
 *    play through an <audio> element off a blob URL instead, so the spec wraps
 *    `play`, then fetches the blob it was given and decodes it: real audio, of
 *    a plausible length, that is not silence.
 */

// The default pack — PHRASE_PACKS[0] in src/utils/tutorialPhrases.js. The
// tutorial opens on it, so a run that touches nothing gets these words.
const SLOW_1_CHUNKS = ['I want to', 'learn', 'a little more']
const SLOW_2_CHUNKS = ['I’m trying to', 'speak', 'every day']
const EXPECTED_ITEMS = 4

// ── What counts as a write ───────────────────────────────────────────────────
const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']
// Addresses that file a take, whatever the method is: reaching one of these at
// all, even to read, means the tutorial has found the course machinery.
const FORBIDDEN_PATH = /\/api\/production\/[^/]+\/recording\/upload|\/api\/recording\/|\/api\/audio/i
const STORAGE_HOST = /supabase\.(co|in|net)|amazonaws\.com|\bs3[.-][a-z0-9-]*\.|\.r2\.cloudflarestorage\.com/i

/**
 * The one Supabase request the tutorial page legitimately provokes, and the
 * reason it is named here rather than waved through by a loose rule.
 *
 * It is not the tutorial's. It is the DASHBOARD SHELL's: AppNavbar mounts on
 * every route, calls useCourses().loadCourses(), and that is getAllCourses() —
 * `select *` on the courses table — so the course picker in the header has
 * something to show. /recording-tutorial is `public: true` and inherits the
 * shell like any other page, so an unauthenticated practice run still asks the
 * database for the course list.
 *
 * It is a READ and it carries nothing of the recordist's, so "nothing is saved"
 * is untouched by it. It is pinned to this exact shape on purpose: if the
 * tutorial ever starts reading course data of its own — a script, a cast, a
 * queue — it will not match, and this test will fail rather than shrug.
 */
const SHELL_COURSES_READ = /\/rest\/v1\/courses\?select=\*$/

function classify(method, url) {
  if (WRITE_METHODS.includes(method)) return `write method ${method}`
  if (FORBIDDEN_PATH.test(url)) return 'take-filing endpoint'
  if (STORAGE_HOST.test(url)) {
    if (method === 'GET' && SHELL_COURSES_READ.test(url)) return null
    return 'storage/database host'
  }
  return null
}

test.describe('recordist tutorial in the real studio', () => {
  test('a whole practice run saves nothing, and its pieces play', async ({ page }) => {
    /** @type {{method: string, url: string, violation: string|null}[]} */
    const requests = []

    // Deliberately NO auth stub and NO API stubs. The route is public and the
    // tutorial must need neither a session nor an endpoint; stubbing either
    // would hide exactly the dependency this test exists to rule out.
    await page.route('**/*', async (route) => {
      const req = route.request()
      const method = req.method()
      const url = req.url()
      const violation = classify(method, url)
      requests.push({ method, url, violation })
      if (violation) {
        // Abort as well as record: if this feature ever regrows a write, the
        // write must not actually land while the test is finding out.
        await route.abort('blockedbyclient')
        return
      }
      await route.continue()
    })

    // Watch what is actually PLAYED, rather than what the app says it will play.
    await page.addInitScript(() => {
      // Chunk playback: an AudioBufferSourceNode cut with an offset and a
      // duration. Recording those, plus the buffer they came from, lets the
      // test measure the exact audio a recordist hears when they tap a piece —
      // with no test-only affordance in the app itself.
      window.__played = []
      const origStart = AudioBufferSourceNode.prototype.start
      AudioBufferSourceNode.prototype.start = function (when, offset, duration) {
        window.__played.push({ offsetMs: (offset || 0) * 1000, durationMs: (duration || 0) * 1000 })
        window.__lastPlayedBuffer = this.buffer
        return origStart.apply(this, arguments)
      }
      // Splice playback goes through an <audio> element on a blob URL instead,
      // so it needs its own watcher. The src is captured at the moment of play
      // because the component reuses one element for all three sentences.
      window.__mediaPlays = []
      const origPlay = HTMLMediaElement.prototype.play
      HTMLMediaElement.prototype.play = function () {
        window.__mediaPlays.push({ src: this.src })
        return origPlay.apply(this, arguments)
      }
    })

    page.on('console', msg => {
      if (msg.text().includes('[Autocue]') || msg.text().includes('[VAD]')) {
        console.log(`  page> ${msg.text()}`)
      }
    })

    // ── Step 1: the intro ────────────────────────────────────────────────
    await page.goto('/recording-tutorial')

    const studio = page.locator('[data-surface="recordist-tutorial-in-studio"]')
    await expect(studio, 'the tutorial mount marks itself').toBeVisible()
    await expect(page.locator('.session-info')).toContainText('nothing is saved')

    const coach = page.locator('[data-tutorial-coach]')
    await expect(coach).toBeVisible()
    await expect(coach).toHaveAttribute('data-tutorial-step', 'intro')

    // The practice script loaded from nowhere: four items, no course.
    await expect(page.locator('.script-stat-value').nth(2)).toHaveText(String(EXPECTED_ITEMS))

    // ── Step 2: go live ──────────────────────────────────────────────────
    await page.locator('.btn-begin').click()
    await page.getByRole('button', { name: /Start Recording/ }).click()
    await expect(page.locator('.control-btn.record.recording')).toBeVisible()

    // The coach follows the pass: the first two items are natural.
    await expect(coach).toHaveAttribute('data-tutorial-step', 'natural')

    // ── Step 3: the fake mic reads all four ──────────────────────────────
    // Two natural reads, then two slow ones with a beat at every boundary. The
    // step attribute flipping to 'slow' is the studio's own account of having
    // got through the natural pair.
    await expect(coach).toHaveAttribute('data-tutorial-step', 'slow', { timeout: 60_000 })

    // Reading off the end of the script ends the session by itself — no Stop.
    await expect(page.locator('.summary-card')).toBeVisible({ timeout: 90_000 })
    await expect(page.locator('.summary-card')).toContainText('Session Complete')
    await expect(coach).toHaveAttribute('data-tutorial-step', 'summary')
    await expect(page.locator('.summary-value').first()).toHaveText(String(EXPECTED_ITEMS))

    await page.screenshot({ path: 'e2e/recordist-tutorial/tutorial-summary.png', fullPage: true })

    // ── Step 4: review, and the pieces ───────────────────────────────────
    await page.getByRole('button', { name: 'Review Recordings' }).click()
    await expect(coach).toHaveAttribute('data-tutorial-step', 'pieces')

    const cards = page.locator('.segment-card')
    await expect(cards).toHaveCount(EXPECTED_ITEMS)

    // Only the slow takes are cut up. The natural pair is played whole — which
    // is the thing the coach's step-4 copy tells the recordist.
    const withPieces = page.locator('.segment-card:has(.chunk-btn)')
    await expect(withPieces, 'only the two slow reads carry pieces').toHaveCount(2)

    const slowCard = withPieces.first()
    const pieces = slowCard.locator('.chunk-btn')
    await expect(pieces).toHaveCount(3)
    for (const [i, text] of SLOW_1_CHUNKS.entries()) {
      await expect(pieces.nth(i)).toContainText(text)
    }
    // The pauses the recorder heard match the script's chunk map, so there is
    // nothing to warn about.
    await expect(slowCard.locator('.chunk-warning')).toHaveCount(0)

    // The second slow take is labelled with its own words, not the first's.
    const secondPieces = withPieces.nth(1).locator('.chunk-btn')
    await expect(secondPieces).toHaveCount(3)
    for (const [i, text] of SLOW_2_CHUNKS.entries()) {
      await expect(secondPieces.nth(i)).toContainText(text)
    }

    // Tap each piece of the first slow take. Each marks only itself, plays, and
    // un-marks when it reaches its own end.
    for (let i = 0; i < 3; i++) {
      await pieces.nth(i).click()
      await expect(pieces.nth(i)).toHaveClass(/playing/)
      await expect(pieces.nth(i)).not.toHaveClass(/playing/, { timeout: 15_000 })
    }

    // ── and they are real cuts of real audio ─────────────────────────────
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
        pieces: window.__played.map(p => ({
          startMs: p.offsetMs,
          endMs: p.offsetMs + p.durationMs,
          // Loud through the middle: it is speech, not a pause.
          middleRms: rms(p.offsetMs + p.durationMs * 0.3, p.offsetMs + p.durationMs * 0.7),
          // And quiet just outside it: the cut landed in the beat.
          afterRms: rms(p.offsetMs + p.durationMs + 100, p.offsetMs + p.durationMs + 300)
        }))
      }
    })
    console.log('slow take + pieces played:', JSON.stringify(measured, null, 2))

    expect(measured.pieces, 'three pieces were played').toHaveLength(3)
    const played = [...measured.pieces].sort((x, y) => x.startMs - y.startMs)
    for (const [i, piece] of played.entries()) {
      // Speech through this pipeline measures ~0.2 RMS; room tone ~0.003.
      expect(piece.middleRms, `piece ${i + 1} should be speech, not a pause`).toBeGreaterThan(0.05)
      expect(piece.afterRms, `piece ${i + 1} should end at a beat`).toBeLessThan(0.02)
    }
    // In reading order, with a real beat between each.
    expect(played[1].startMs).toBeGreaterThan(played[0].endMs)
    expect(played[2].startMs).toBeGreaterThan(played[1].endMs)

    // ── Step 5: the sentence they never said ─────────────────────────────
    const splice = page.locator('[data-tutorial-splice]')
    await expect(splice).toBeVisible()
    await expect(splice.locator('.splice-blocked'), 'both slow takes came out in three pieces')
      .toHaveCount(0)
    const spliceButtons = splice.locator('.splice-btn')
    await expect(spliceButtons).toHaveCount(3)

    const playsBefore = await page.evaluate(() => window.__mediaPlays.length)
    await spliceButtons.first().click()
    await expect(spliceButtons.first()).toContainText('Playing', { timeout: 30_000 })

    const spliced = await page.evaluate(async (before) => {
      const plays = window.__mediaPlays.slice(before)
      if (!plays.length) return { plays: 0 }
      const src = plays[plays.length - 1].src
      // Decode the very bytes the <audio> element was handed. A blob URL that
      // plays silence, or nothing at all, is the failure worth catching here.
      const bytes = await (await fetch(src)).arrayBuffer()
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const buf = await ctx.decodeAudioData(bytes)
      const d = buf.getChannelData(0)
      let sum = 0
      for (let i = 0; i < d.length; i++) sum += d[i] * d[i]
      return {
        plays: plays.length,
        isBlob: src.startsWith('blob:'),
        durationMs: buf.duration * 1000,
        rms: Math.sqrt(sum / d.length)
      }
    }, playsBefore)
    console.log('spliced sentence played:', JSON.stringify(spliced))

    expect(spliced.plays, 'tapping a spliced sentence plays it').toBeGreaterThan(0)
    expect(spliced.isBlob, 'built in the browser, not fetched').toBe(true)
    // Three 300ms pieces joined with no gap — allow wide latitude for the
    // recorder's own boundaries, but it cannot be empty or a whole take.
    expect(spliced.durationMs).toBeGreaterThan(200)
    expect(spliced.durationMs).toBeLessThan(measured.takeMs)
    expect(spliced.rms, 'the spliced sentence is audible, not silence').toBeGreaterThan(0.02)

    await page.screenshot({ path: 'e2e/recordist-tutorial/tutorial-review.png', fullPage: true })

    // ── The headline: nothing was saved ──────────────────────────────────
    const violations = requests.filter(r => r.violation)
    const summary = {
      totalRequests: requests.length,
      byMethod: requests.reduce((acc, r) => ({ ...acc, [r.method]: (acc[r.method] || 0) + 1 }), {}),
      offOrigin: [...new Set(requests
        .map(r => new URL(r.url).host)
        .filter(h => !h.startsWith('127.0.0.1') && !h.startsWith('localhost')))],
      databaseReads: requests.filter(r => STORAGE_HOST.test(r.url)).map(r => `${r.method} ${r.url}`),
      violations: violations.map(v => `${v.violation}: ${v.method} ${v.url}`)
    }
    console.log('network log:', JSON.stringify(summary, null, 2))

    expect(violations, 'the tutorial must make no write of any kind').toEqual([])
    // Belt and braces on the same log, so a hole in classify() cannot pass:
    // every single request the page made was a read.
    expect(requests.filter(r => WRITE_METHODS.includes(r.method))).toEqual([])
    // And nothing went near the take-filing machinery, by any method.
    expect(requests.filter(r => FORBIDDEN_PATH.test(r.url))).toEqual([])
    // The only database contact is the shell's course-picker read (see
    // SHELL_COURSES_READ). Anything else reaching Supabase or a bucket is the
    // tutorial growing a dependency it is not allowed to have.
    for (const r of requests.filter(r => STORAGE_HOST.test(r.url))) {
      expect(r.method, `database contact should be read-only: ${r.url}`).toBe('GET')
      expect(SHELL_COURSES_READ.test(r.url), `unexpected database read: ${r.url}`).toBe(true)
    }
  })

  test('the tutorial marker is absent from a real recording session', async ({ page }) => {
    // The contract is "in tutorial mode, and not otherwise". Same component,
    // mounted the way a working recordist mounts it: the marker must not be
    // there. Stubbed, because this mount legitimately does reach the API — the
    // point here is the attribute, not the network.
    await stubAuth(page)
    await page.route('**/api/production/*/recording/queue*', r => r.fulfill({ json: { items: [] } }))
    await page.route('**/api/production/*/info*', r =>
      r.fulfill({ json: { course: { known_lang: 'English', target_lang: 'Welsh' } } }))
    await page.route('**/api/production/*/voice-config*', r => r.fulfill({ json: { voice_config: {} } }))

    await page.goto('/production/cym_for_eng/recording')
    await expect(page.locator('.mode-card').first()).toBeVisible()
    await expect(page.locator('[data-surface="recordist-tutorial-in-studio"]')).toHaveCount(0)
    await expect(page.locator('[data-tutorial-coach]')).toHaveCount(0)
    await expect(page.locator('[data-tutorial-splice]')).toHaveCount(0)
  })
})
