// services/shared/stage-event-line.cjs
//
// The structured-event line protocol between the stage scripts and
// production-api. services/stage-deploy.py and services/stage-restart.py run
// over SSH and write `__SD__:<event> [<json payload>]` lines to stderr between
// their ordinary output; production-api's two stderr handlers turn those into
// websocket state updates and forward everything else as log noise. The prefix
// and its grammar live here, once, for both sides' readers.

const STAGE_EVENT_PREFIX = '__SD__:'

/** True when the line is an event line (as opposed to log noise). */
function isStageEventLine(line) {
  return typeof line === 'string' && line.startsWith(STAGE_EVENT_PREFIX)
}

/**
 * Parse `__SD__:<event> [<json>]` into { event, payload }. Returns null for a
 * line that carries the prefix but not the grammar. A payload that is not
 * valid JSON reads as {} — the event still fires, as it always has.
 */
function parseStageEventLine(line) {
  const m = line.match(/^__SD__:(\w+)(?:\s+(.+))?$/)
  if (!m) return null
  let payload = {}
  if (m[2]) {
    try { payload = JSON.parse(m[2]) } catch (e) { /* malformed, ignore */ }
  }
  return { event: m[1], payload }
}

module.exports = { STAGE_EVENT_PREFIX, isStageEventLine, parseStageEventLine }
