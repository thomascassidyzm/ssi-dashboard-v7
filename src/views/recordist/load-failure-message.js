// WHAT THE BOOTH SAYS WHEN THE QUEUE READ FAILS (Eleri, Kai 2026-10-29).
// The API answers a phrase batch whose plan could not be read with 503 + {retryable:true,
// error:'The practice phrases are still loading. Please try again in a minute.'} — a sentence
// written for the reader. The screen threw it away and drew "Could not load your lines (503)",
// which sends her to the recording team instead of the Try again button. A retryable answer's
// own sentence is shown; anything else keeps the status code.
export function loadFailureMessage(res, body) {
  if (body && body.retryable && typeof body.error === 'string' && body.error) return body.error
  return `Could not load your lines (${res.status})`
}
