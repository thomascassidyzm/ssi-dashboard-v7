/**
 * Parallel-course resolution.
 *
 * Course codes look like `{targetBase}[_{variant}]_for_{known}`:
 *   spa_for_eng           target=spa            known=eng
 *   fra_ca_for_eng        target=fra variant=ca known=eng
 *   cym_anthem_for_jpn    target=cym variant=anthem known=jpn
 *   spa_for_fra           target=spa            known=fra
 *
 * "Parallel" courses share the same TARGET base language. The guardian uses
 * these to investigate whether a sibling course has the same issue that could
 * be fixed the same/similar way (investigate + flag — never auto-fix across
 * courses; memory feedback_check_regional_variety / cross-course propagation).
 */

function parseCourseCode(code) {
  const m = /^(.+)_for_([a-z]{2,3})$/.exec(code || '')
  if (!m) return { raw: code, targetBase: null, targetVariant: null, known: null }
  const targetPart = m[1]
  const known = m[2]
  const bits = targetPart.split('_')
  const targetBase = bits[0]
  const targetVariant = bits.length > 1 ? bits.slice(1).join('_') : null
  return { raw: code, targetBase, targetVariant, known }
}

/**
 * Given a course code and the list of all course codes, return the parallel
 * siblings classified by relation:
 *   - 'dialect'   : same target base + same known, different variant (fra vs fra_ca)
 *   - 'known'     : same target base + same variant, different known (spa_for_eng vs spa_for_fra)
 *   - 'both'      : same target base, both variant and known differ
 * Same target base is the binding relation; a sibling that only shares the
 * KNOWN language (different target) is NOT returned — a fix to French content
 * has no bearing on Welsh content that merely shares English prompts.
 */
function findParallelCourses(code, allCourseCodes = []) {
  const me = parseCourseCode(code)
  if (!me.targetBase) return []
  const out = []
  for (const other of allCourseCodes) {
    if (other === code) continue
    const o = parseCourseCode(other)
    if (o.targetBase !== me.targetBase) continue
    const variantDiff = (o.targetVariant || '') !== (me.targetVariant || '')
    const knownDiff = o.known !== me.known
    let relation
    if (variantDiff && knownDiff) relation = 'both'
    else if (variantDiff) relation = 'dialect'
    else if (knownDiff) relation = 'known'
    else continue // identical signature (shouldn't happen for a different code)
    out.push({ course_code: other, relation, parsed: o })
  }
  return out
}

module.exports = { parseCourseCode, findParallelCourses }
