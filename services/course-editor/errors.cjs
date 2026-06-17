/**
 * Typed errors for the course-editor library.
 *
 * Every refusal the editor makes is one of these, so callers (CLI, MCP, API)
 * can distinguish "you asked for something unsafe" (4xx-class) from "the DB
 * blew up" (5xx-class). The whole point of the tool is that the unsafe asks
 * are caught BEFORE any write — see scoping.cjs / editor.cjs.
 */

class CourseEditorError extends Error {
  constructor(message, details = {}) {
    super(message)
    this.name = this.constructor.name
    this.code = this.constructor.code || 'COURSE_EDITOR_ERROR'
    this.details = details
  }
}

/** Write not scoped safely (missing course_code, missing unique key, …). */
class ScopeError extends CourseEditorError {}
ScopeError.code = 'SCOPE_ERROR'

/** Operation would touch more rows / more courses than allowed without explicit confirm. */
class BlastRadiusError extends CourseEditorError {}
BlastRadiusError.code = 'BLAST_RADIUS'

/** Content/methodology validation failed (bad field, ZUT conflict, …). */
class ValidationError extends CourseEditorError {}
ValidationError.code = 'VALIDATION_ERROR'

/** Table is not in the editor's allow-list. */
class TableNotAllowedError extends CourseEditorError {}
TableNotAllowedError.code = 'TABLE_NOT_ALLOWED'

/** Target row(s) not found. */
class NotFoundError extends CourseEditorError {}
NotFoundError.code = 'NOT_FOUND'

/**
 * The edit has downstream impacts (affected phrases, ZUT clash, broken tiling,
 * presentation regen, …) that the caller has not acknowledged. `details.report`
 * carries the full impact report; the caller must review it and re-call with
 * `acknowledgeImpacts: <report.ackToken>` (and `overrideBlock: true` for
 * block-severity impacts). This is how the tool forces responsible editing.
 */
class ImpactReviewError extends CourseEditorError {}
ImpactReviewError.code = 'IMPACT_REVIEW'

module.exports = {
  CourseEditorError,
  ScopeError,
  BlastRadiusError,
  ValidationError,
  TableNotAllowedError,
  NotFoundError,
  ImpactReviewError,
}
