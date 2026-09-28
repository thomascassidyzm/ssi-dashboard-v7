// THE MACHINES POPTY'S BROWSER CAN TALK TO, and the pin that picks one.
//
// Moved out of EnvironmentSwitcher.vue (2026-09-25): the switcher carries the
// Deploy button, so it renders for admins only, and a <script setup> body runs
// per rendered instance — a community builder who never sees it would never get
// api_base_url pinned. main.js calls pinMachineEnvironment() for everyone
// before mount; the switcher calls it too (idempotent).

// A PREVIEW BUILD TALKS TO ITS OWN BACKEND, never to production. Set at build
// time by vite.config.js from the Vercel branch (see PREVIEW_BACKENDS there);
// empty on popty.app and on every other build.
export const PREVIEW_API = typeof __POPTY_PREVIEW_API__ !== 'undefined' ? __POPTY_PREVIEW_API__ : ''

export const ENVIRONMENTS = {
  tom: {
    name: "Tom's Machine",
    url: 'https://popty.ngrok.app',
    machineProfile: 'tom'
  },
  kai: {
    name: "Kai's Machine",
    url: 'https://kai-lizard-function.ngrok-free.dev',
    machineProfile: 'kai'
  },
  ssi: {
    name: "SSi Machine",
    url: 'https://ssi-machine.ngrok.app',
    machineProfile: 'kai'  // Similar specs to Kai's machine (8GB RAM)
  },
  watson: {
    name: 'SSi Machine (Cloud)',
    url: 'https://watson-1.tail4968cb.ts.net:8443',  // Tailscale Funnel → production-api :3470 on watson-1
    machineProfile: 'default'  // watson-1 has 15GB RAM — matches the 16GB 'default' profile
  },
  api: {
    name: 'API Server',
    url: 'http://localhost:3470',  // Production API (consolidated Jan 2026)
    machineProfile: 'default'  // API mode will use default until we add API-specific profiles
  }
}
if (PREVIEW_API) {
  ENVIRONMENTS.preview = { name: 'Preview backend', url: PREVIEW_API, machineProfile: 'default' }
}

// Default environment can be set via VITE_DEFAULT_ENVIRONMENT in .env (kai, tom, watson or api).
// Unset: a local checkout talks to its own API; anything else (popty.app
// included) talks to watson-1, the always-on cloud machine. A preview build
// talks to its preview backend, whatever the browser saved before.
export const isLocalHost = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
export const DEFAULT_ENV = PREVIEW_API ? 'preview' : (import.meta.env.VITE_DEFAULT_ENVIRONMENT || (isLocalHost ? 'api' : 'watson'))

/**
 * SYNCHRONOUS: ensure localStorage is set BEFORE any async code runs (prevents
 * races with production store loading). Returns the environment key in force.
 */
export function pinMachineEnvironment() {
  if (PREVIEW_API) localStorage.setItem('ssi_environment', 'preview')
  const savedEnv = localStorage.getItem('ssi_environment')
  const initialEnv = (savedEnv && ENVIRONMENTS[savedEnv]) ? savedEnv : DEFAULT_ENV
  if (!savedEnv) {
    localStorage.setItem('ssi_environment', DEFAULT_ENV)
  }
  const expectedUrl = ENVIRONMENTS[initialEnv].url
  const expectedProfile = ENVIRONMENTS[initialEnv].machineProfile
  if (localStorage.getItem('api_base_url') !== expectedUrl) {
    localStorage.setItem('api_base_url', expectedUrl)
    console.log(`[EnvironmentSwitcher] Initialized api_base_url to: ${expectedUrl}`)
  }
  if (localStorage.getItem('ssi_machine_profile') !== expectedProfile) {
    localStorage.setItem('ssi_machine_profile', expectedProfile)
    console.log(`[EnvironmentSwitcher] Initialized machine_profile to: ${expectedProfile}`)
  }
  return initialEnv
}
