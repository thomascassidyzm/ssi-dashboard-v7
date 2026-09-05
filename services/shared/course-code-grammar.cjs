// ONE grammar for "which course is this request about?".
//
// Routes that carry :courseCode are gated by app.param('courseCode') in
// production-api.cjs, and that gate applies NO grammar at all — whatever sits
// in the path position is the course, and it is checked against the caller's
// course list. But the wildcard mounts (/api/build/*, /api/v2/*, …) never fire
// app.param, so those callers have to work the course out of the path or body
// themselves. The same is true of the editor-identity gate, which has to say
// which course an edit event belongs to.
//
// Those recognisers used to be two separately-maintained regexes, both
// /^[a-z]{2,4}_for_[a-z]{2,4}$/, which does not match a course code carrying a
// variant suffix — cym_n_for_eng, fra_ca_for_eng, spa_mx_for_jpn,
// cym_anthem_for_jpn, and 25 other live courses. On the proxy that meant
// extractProxyCourseCode returned null and the per-course scope check silently
// did not run: an authenticated editor scoped to one course could drive the
// course-builder for a suffixed course they hold no access to. On the
// attribution path it meant those courses' edit events were filed as 'unknown'.
//
// So the grammar lives here, once, and both call sites delegate.
// course-code-grammar.test.cjs asserts it recognises every course code in the
// live courses table, which is the property that actually matters: any code the
// param gate can be handed, this must recognise identically.

/**
 * Course-code shape: <target>[_<variant>…]_for_<known>[_<variant>…].
 *
 * The head is anchored at 2-4 letters followed by '_', which is what keeps
 * ordinary path segments out ("phrases_for_review" has a 7-letter head and
 * cannot match). Variant parts allow digits because scratch courses use them
 * (zzz_test2_for_eng).
 */
const COURSE_CODE_RE = /^[a-z]{2,4}(?:_[a-z0-9]{1,10})*_for_[a-z]{2,4}(?:_[a-z0-9]{1,10})*$/;

/** @param {unknown} value @returns {boolean} */
function isCourseCode(value) {
  return typeof value === 'string' && COURSE_CODE_RE.test(value);
}

/**
 * The course a wildcard-proxied request concerns: first course-shaped path
 * segment, else a course code named in the JSON body. Null when the request
 * names no course — callers must treat that as "unscoped", not "allowed".
 */
function courseCodeFromRequest(req) {
  for (const seg of (req?.path || '').split('/')) {
    if (isCourseCode(seg)) return seg;
  }
  const bodyCode = req?.body && (req.body.course_code || req.body.courseCode);
  return isCourseCode(bodyCode) ? bodyCode : null;
}

module.exports = { COURSE_CODE_RE, isCourseCode, courseCodeFromRequest };
