/**
 * When a browser's SAVED backend choice is dead, should it fall back to the
 * always-on default?
 *
 * Extracted from EnvironmentSwitcher.vue so it can be tested.
 *
 * The gap this closes: the switcher persists `ssi_environment` forever and
 * re-pins `api_base_url` to it on every page load. `checkConnection()` already
 * discovers the target is unreachable and writes "Connection failed" into a
 * status line — and then the app carries on talking to it anyway. Every write
 * dies as the browser's bare "Failed to fetch", which reads to the person
 * doing the work as "the thing I just typed broke it" rather than "the machine
 * I'm pinned to is asleep" (Aran, proofing Welsh pod scripts, 2026-08-10).
 *
 * Three of the five selectable environments are personal dev tunnels or a Mac
 * that sleeps, so a stale saved choice is not an edge case.
 *
 * Deliberately NOT self-healing on localhost: a developer whose own API is
 * down wants to see that, not be silently moved to the cloud machine.
 */
export function shouldFallBackToDefault({
  savedEnv,
  currentEnv,
  defaultEnv,
  isLocalHost,
  connected,
}) {
  if (connected) return false
  // No stored preference means we are already on the default — nowhere to go.
  if (!savedEnv) return false
  if (isLocalHost) return false
  if (currentEnv === defaultEnv) return false
  return true
}
