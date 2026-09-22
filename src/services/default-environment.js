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

/**
 * How many times, and how far apart, the switcher asks a backend "are you
 * there?" before it paints the dot red.
 *
 * The gap this closes (Deborah, reviewing from outside the tailnet, 2026-09-22):
 * the served Popty API is restarted by the auto-deploy timer every time main
 * moves — five times in the half hour she was trying to work — and each
 * restart leaves it unreachable for a couple of seconds. The dot was probed
 * ONCE, on page load, and never again, so a page opened inside one of those
 * windows stayed red until somebody thought to reload; and choosing another
 * machine only snapped her back here, because every other option is a
 * personal tunnel that is dead from outside. Three tries two seconds apart
 * outlast a routine restart; a machine that is genuinely off still fails all
 * three and the fallback logic above sees exactly what it saw before.
 */
export const PROBE_ATTEMPTS = 3
export const PROBE_RETRY_MS = 2000
/** While the dot is red, ask again this often, so it heals without a reload. */
export const PROBE_RECHECK_MS = 15000

/**
 * Run `probe` (async → boolean) until it says yes or the attempts run out.
 * `sleep` is injectable so a test can hold time still.
 */
export async function probeUntilAlive(probe, {
  attempts = PROBE_ATTEMPTS,
  delayMs = PROBE_RETRY_MS,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (await probe()) return true
    if (attempt < attempts) await sleep(delayMs)
  }
  return false
}
