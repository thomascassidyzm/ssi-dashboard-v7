/**
 * The ONE server-error responder for production-api's plain catch blocks.
 *
 * Job #179 (2026-11-02) folded 53 catches of exactly this shape onto it:
 *
 *   logger.error(<tag>, err)
 *   res.status(500).json({ error: err.message })
 *
 * Nothing else: the log call and the body are the same bytes the catches
 * produced before the fold, so no caller, log reader or test can tell the
 * difference. A catch that logs something other than the error object itself
 * (err.message, `err?.message || err`), sends a constant or fallback message,
 * a success:false envelope, a status other than 500, or emits on a socket is
 * NOT this shape and stays as it was — the proof of that is
 * services/shared/server-error.test.cjs plus the mechanical -2/+1 diff of the
 * fold commit.
 *
 * Bound to the service's own logger so the "[ProductionAPI] " prefix is the
 * one every other line in that log carries.
 */
function serverErrorResponder(logger) {
  return function serverError(res, tag, err) {
    logger.error(tag, err)
    res.status(500).json({ error: err.message })
  }
}

module.exports = { serverErrorResponder }
