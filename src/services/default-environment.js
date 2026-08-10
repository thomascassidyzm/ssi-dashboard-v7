/**
 * Which backend a browser with NO saved preference talks to.
 *
 * Extracted from EnvironmentSwitcher.vue so it can be tested. The switcher
 * mounts in AppNavbar on every page and writes `api_base_url` to localStorage
 * synchronously at module scope; getApiUrl() reads localStorage first. So this
 * function — not getApiUrl()'s per-hostname branches — is what actually picks
 * the backend for a first-time visitor.
 *
 * The rule that matters: a PUBLIC host must never default to somebody's
 * personal dev tunnel. On 2026-08-10 popty.app defaulted to 'tom'
 * (https://popty.ngrok.app); when that machine slept, an editor's saves failed
 * with the browser's bare "Failed to fetch" and nothing reached any server log.
 */

/** Public hosts that must pin to an always-on backend. */
export const HOSTED_DEFAULT_ENV = {
  // watson-1: always on, watchdogged, auto-deploys from main, and its funnel
  // hostname resolves publicly for anyone off the tailnet.
  'popty.app': 'watson',
}

/** Fallback for dev boxes and anything not in the map above. */
export const FALLBACK_DEFAULT_ENV = 'tom'

/**
 * @param {string} [hostname] - window.location.hostname
 * @param {string} [viteOverride] - import.meta.env.VITE_DEFAULT_ENVIRONMENT
 * @returns {string} an ENVIRONMENTS key
 */
export function resolveDefaultEnv(hostname, viteOverride) {
  if (viteOverride) return viteOverride
  if (hostname && HOSTED_DEFAULT_ENV[hostname]) return HOSTED_DEFAULT_ENV[hostname]
  return FALLBACK_DEFAULT_ENV
}
