import { stubAuth } from '../vad-lab/helpers.js'

// One phrase, read slow, in three LEGO pieces — matching the fake mic's audio.
// Same shape as the sibling autocue-chunks suite uses, deliberately: the two
// suites drive the same take through the same studio and must not disagree
// about what the script says.
export const PHRASE = { text: 'dw i eisiau siarad', chunksString: 'dw i|eisiau|siarad' }

export const SCRIPT = {
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

/**
 * Stub the studio's API surface and start sampling the live chunk indicator.
 *
 * Returns the array uploads land in. It is the only honest way to check that a
 * refused take was NOT filed: asserting on the UI would only prove the UI said
 * so, and the failure this whole job exists to fix was a UI that said the
 * cheerful thing while the pipeline got something unusable.
 */
export async function setupStudio(page) {
  await stubAuth(page)

  // Sample the live indicator every 50ms — the VAD's own poll interval — so the
  // test sees the progression as it happens rather than only its final state.
  // A pip that is already green by the time an assertion runs proves nothing
  // about whether the recordist ever saw it turn green.
  await page.addInitScript(() => {
    window.__pipTimeline = []
    setInterval(() => {
      const pips = document.querySelectorAll('.chunk-progress .pip')
      if (!pips.length) return
      const shape = [...pips].map(p =>
        p.classList.contains('done') ? 'D' : p.classList.contains('current') ? 'C' : '.'
      ).join('')
      const caption = document.querySelector('.chunk-progress .pause-caption')?.textContent?.trim() || ''
      const last = window.__pipTimeline[window.__pipTimeline.length - 1]
      if (!last || last.shape !== shape || last.caption !== caption) {
        window.__pipTimeline.push({ t: Date.now(), shape, caption })
      }
    }, 50)
  })

  await page.route('**/api/production/*/recording/queue*', route =>
    route.fulfill({ json: { items: [] } })
  )
  // Answered slowly on purpose — see the autocue-chunks README: an instant
  // stub reverses the order of two fetches in a way no recordist can hit.
  await page.route('**/api/production/*/recording-script*', async route => {
    await new Promise(r => setTimeout(r, 1500))
    await route.fulfill({ json: SCRIPT })
  })
  await page.route('**/api/production/*/info*', route =>
    route.fulfill({ json: { course: { known_lang: 'English', target_lang: 'Welsh' } } })
  )
  await page.route('**/api/production/*/voice-config*', route =>
    route.fulfill({ json: { voice_config: {} } })
  )

  const uploads = []
  await page.route('**/api/production/*/recording/upload*', route => {
    try { uploads.push(JSON.parse(route.request().postData() || '{}')) } catch { /* not our shape */ }
    return route.fulfill({ json: { success: true, id: 'e2e-take' } })
  })

  page.on('console', msg => {
    if (msg.text().includes('[Autocue]') || msg.text().includes('[VAD]')) {
      console.log(`  page> ${msg.text()}`)
    }
  })

  return uploads
}

/** Walk the studio from its front door to a live microphone. */
export async function goLive(page) {
  await page.goto('/production/cym_for_eng/recording')
  await page.locator('.mode-card').first().click()
  await page.getByRole('button', { name: 'Begin Recording' }).click()
  await page.getByRole('button', { name: /Start Recording/ }).click()
  await page.locator('.control-btn.record.recording').waitFor()
}
