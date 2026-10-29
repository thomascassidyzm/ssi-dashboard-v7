/**
 * Course Manager build-control state, as pure functions (job #482).
 *
 * The page used to start at jobStatus 'idle', which SHOWS "Start Course Builder" and HIDES
 * Stop — and nothing ever polled /api/build/status after the 2026 "eliminate ngrok polling"
 * change, so a reloaded page showed a running build as not running, and a second Start
 * spawned a second orchestrator (fry_for_eng, 28 Oct). The page now starts at 'checking'
 * and only leaves it when a status answer arrives.
 */

/** The job state the page should show after a /api/build/status answer. */
export function nextJobStatus(current, statusData) {
  if (current === 'stopping') return current // the Stop request settles this itself
  if (!statusData) return current // no answer: keep 'checking' until one arrives
  if (statusData.active) return statusData.build?.status === 'stalled' ? 'stuck' : 'running'
  if (statusData.paused) return 'paused'
  return 'idle'
}

/** Start / Stop buttons: shown, enabled, labelled. */
export function buildControls(jobStatus, { starting = false, canStart = true } = {}) {
  const checking = jobStatus === 'checking'
  return {
    start: {
      show: checking || ((jobStatus === 'idle' || jobStatus === 'paused') && canStart),
      disabled: checking || starting,
      label: starting ? 'Starting…' : jobStatus === 'paused' ? 'Resume now' : 'Start Course Builder',
    },
    stop: {
      show: checking || ['running', 'stuck', 'stopping', 'paused'].includes(jobStatus),
      disabled: checking || jobStatus === 'stopping',
      label: jobStatus === 'stopping' ? 'Stopping…' : jobStatus === 'paused' ? 'Cancel auto-resume' : 'Stop Job',
    },
  }
}

/** Badge text for states the page shows a badge for. */
export function statusBadgeText(jobStatus) {
  switch (jobStatus) {
    case 'checking': return 'Checking build status…'
    case 'running': return 'Building Course'
    case 'stopping': return 'Stopping...'
    case 'stuck': return 'Stuck'
    case 'paused': return 'Paused'
    default: return ''
  }
}
