import { defineConfig } from '@playwright/test'

// Voice Lab PLAY MODE E2E — drives the front door end to end against a locally
// served dashboard (vite dev or preview) and a local production-api that has
// /api/voicelab mounted.
//
// It RENDERS ONE REAL CLIP, which costs real money at xAI's $15/1M characters —
// a few hundredths of a penny for the one short sentence it uses, and it goes
// through the same daily ceiling as every other run. That is deliberate: a Play
// mode verified with a mocked backend has not been verified at all, because the
// two things most likely to be wrong (does the config the sliders build survive
// normaliseConfig, and does a clip actually come back playable) only exist on
// the real path.
//
//   E2E_BASE_URL=http://localhost:5177 \
//   E2E_API_BASE=http://localhost:3479 \
//   npx playwright test --config=e2e/voice-lab/playwright.config.js
export default defineConfig({
  testDir: '.',
  // Two whisper passes per clip take the best part of a minute each on this box.
  timeout: 300_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5177',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { args: launchArgs() },
  },
})

/**
 * Two flags, both only ever needed when driving the DEPLOYED popty.app against
 * the watson-1 backend, and neither papering over a product fault:
 *
 * E2E_ALLOW_PRIVATE_NETWORK — popty.app is a public origin and watson-1's
 *   tailnet address is 100.108.9.37, inside the CGNAT range Chromium classes as
 *   PRIVATE. Chromium blocks public→private subresource fetches, so the lab's
 *   /params call fails with a bare "Failed to fetch" while a direct NAVIGATION
 *   to the same URL returns 401 happily — proven both ways in
 *   scripts/pw-probe.mjs. It is a browser network policy, not CORS (watson-1
 *   answers the preflight correctly) and not the lab.
 *
 * E2E_RESOLVE="host=ip" — Chromium runs its own async DNS rather than going
 *   through systemd-resolved, so MagicDNS names can be invisible inside the
 *   browser on a box where curl resolves them fine.
 */
function launchArgs () {
  const args = []
  if (process.env.E2E_RESOLVE) {
    const [host, ip] = process.env.E2E_RESOLVE.split('=')
    args.push(`--host-resolver-rules=MAP ${host} ${ip}`)
  }
  if (process.env.E2E_ALLOW_PRIVATE_NETWORK) {
    args.push('--disable-features=BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights,PrivateNetworkAccessRespectPreflightResults,LocalNetworkAccessChecks')
  }
  return args
}
