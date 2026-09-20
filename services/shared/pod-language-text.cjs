/**
 * ONE POD TEXT PER TARGET LANGUAGE — the render-side refusal.
 *
 * Tom's ruling, 2026-09-20 16:34Z: "All courses will be exactly the same for the
 * language. Sorry, all pods will be exactly the same for the language. It's completely
 * unacceptable to have lots of different versions of the language."
 *
 * The store enforces it (database/changes/20260920_pod_one_text_per_target_language.sql:
 * a bound pod cannot hold text that differs from its language's canon, and an edit to one
 * course propagates to all of them). This module is the second door — the one that spends
 * money. A bulk pod render is charged per CLIP, and a language rendered twice because two
 * courses held two texts is the whole cost of the fork made real: ~230 clips per language,
 * paid again, producing two versions of French. So the render refuses before it spends.
 *
 * WHAT IT REFUSES, and what it deliberately does not:
 *   - a pod holding the canonical story whose lines differ from the language canon → REFUSE.
 *     That is the fork, present and measurable.
 *   - a pod whose language HAS a canon but which is not bound to it → REFUSE. Unbound is
 *     the fork not yet taken; binding is free and refuses unless the text already matches
 *     (tools/pods/bind-pod-text-to-language.cjs).
 *   - a language with no canon at all → ALLOW. Nineteen languages are still on the older,
 *     shorter slate and have no canonical translation yet; a gate you cannot open is a wall,
 *     and refusing them would stop work Tom's ruling was never about.
 *   - SAMPLE mode → the caller does not consult this. A sample is how a voice gets picked
 *     by ear, for the same reason the pick gate exempts it.
 */

/**
 * PURE. Why this course's pod text must not be rendered, or null to proceed.
 *
 * @param {Object} facts
 * @param {string} facts.courseCode
 * @param {string} facts.targetLang     split_part(course_code,'_for_',1) — regional variants included
 * @param {boolean} facts.langHasCanon  the language has a canonical_pod_target_text
 * @param {boolean} facts.bound         listening_pods.canonical_lang_text
 * @param {number}  facts.offCanon      lines differing from the language canon
 * @returns {{reason:string, message:string}|null}
 */
function languageTextRefusal ({ courseCode, targetLang, langHasCanon, bound, offCanon = 0 }) {
  if (!langHasCanon) return null
  if (Number(offCanon) > 0) {
    return {
      reason: 'pod_text_forked_from_language',
      message: `${courseCode}'s pod holds ${offCanon} line(s) that differ from the canonical ${targetLang} pod text. `
        + `Pods are per language: rendering this would pay for a second version of ${targetLang}. `
        + `Reconcile the text with canonical_pod_target_text first (Tom, 2026-09-20).`,
    }
  }
  if (!bound) {
    return {
      reason: 'pod_text_not_bound_to_language',
      message: `${courseCode}'s pod matches the canonical ${targetLang} text but is not bound to it, so nothing stops it drifting `
        + `before or during the render. Bind it first: node tools/pods/bind-pod-text-to-language.cjs --lang=${targetLang} --apply `
        + '(it refuses unless the pod already matches, so binding never rewrites anything).',
    }
  }
  return null
}

/** The facts the rule needs, read through a supabase-js client. One round trip per pod. */
async function readLanguageTextFacts (supabase, courseCode, podId) {
  const targetLang = String(courseCode || '').split('_for_')[0]
  const { data: pod } = await supabase
    .from('listening_pods').select('id, canonical_lang_text').eq('id', podId).maybeSingle()
  const { data: canon } = await supabase
    .from('canonical_pod_target_text').select('global_order, target_text')
    .eq('pod_slug', 'pod-1').eq('target_lang', targetLang)
  const langHasCanon = Array.isArray(canon) && canon.length > 0
  if (!langHasCanon) return { courseCode, targetLang, langHasCanon: false, bound: !!pod?.canonical_lang_text, offCanon: 0 }
  const { data: lines } = await supabase
    .from('listening_pod_sentences').select('global_order, target_text').eq('pod_id', podId)
  const byOrder = new Map(canon.map(r => [Number(r.global_order), r.target_text]))
  let offCanon = 0
  for (const l of lines || []) {
    const want = byOrder.get(Number(l.global_order))
    if (want !== undefined && want !== l.target_text) offCanon++
  }
  return { courseCode, targetLang, langHasCanon: true, bound: !!pod?.canonical_lang_text, offCanon }
}

module.exports = { languageTextRefusal, readLanguageTextFacts }
