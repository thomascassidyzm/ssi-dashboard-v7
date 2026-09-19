/**
 * STAGE THE WHOLE LANGUAGE, THEN SAVE ONCE — for POD voices.
 *
 * The sibling of stagedCast.js, and deliberately the same shape: Tom's 2026-09-08
 * ruling that "the mode I am in is the language … I want to be able to satisfy
 * that whole language in one go" is a ruling about how he works, not about which
 * lane he is in. So a pod pick is staged locally, several slots are committed on
 * ONE press, and the two rules that file's test pins down are pinned here too:
 *
 *   CLEARS FIRST, THEN PICKS, in the panel's own reading order — so the
 *   intermediate state is always "empty", never "picked twice".
 *
 *   A REFUSED SLOT IS REPORTED, NEVER SWALLOWED, and never stops the rest. The
 *   worst outcome on this screen is a save that says "picked" while a PUT 409'd
 *   behind it — a pick is the thing that unblocks pod RENDERING, so a pick that
 *   silently did not land is a language that silently stays blocked.
 *
 * THE BATCH IS CLIENT-SIDE ON PURPOSE, for stagedCast's own reason: it fires the
 * SAME per-slot PUT and DELETE the backend already validates, so the server's
 * guards — the human-voice refusal and the stale-tab PICK_MOVED 409 — still
 * apply per slot rather than being reimplemented behind a batch endpoint.
 */

/**
 * @param staged  gender -> { action: 'pick' | 'clear', voice, expect, label }
 * @param order   the genders in the panel's reading order.
 */
export function planPicks (staged, order = ['f', 'm']) {
  const entries = Object.entries(staged || {}).filter(([, v]) => v && v.action)
  const rank = new Map(order.map((k, i) => [k, i]))
  const at = (k) => (rank.has(k) ? rank.get(k) : order.length + 1)
  const sorted = entries.sort((a, b) => at(a[0]) - at(b[0]))
  const clears = sorted.filter(([, v]) => v.action === 'clear')
  const picks = sorted.filter(([, v]) => v.action === 'pick')
  return [...clears, ...picks].map(([gender, v]) => ({ gender, ...v }))
}

/**
 * Run the plan. Sequential, never parallel: several writes to one app_config
 * row arriving at once is how one of them wins and the others read as saved.
 *
 * Returns { landed, failed } — `failed` carries the server's own sentence, so a
 * stale-tab refusal reaches the eye that caused it.
 */
export async function commitPicks (plan, { savePick, clearPick, onStep = () => {} } = {}) {
  const landed = []
  const failed = []
  for (const step of plan) {
    try {
      if (step.action === 'clear') await clearPick({ gender: step.gender })
      else await savePick({ gender: step.gender, voice: step.voice, expect: step.expect })
      landed.push({ gender: step.gender, label: step.label, action: step.action })
    } catch (e) {
      failed.push({ gender: step.gender, label: step.label, action: step.action, error: e.message || String(e) })
    }
    onStep({ gender: step.gender, done: landed.length + failed.length, total: plan.length })
  }
  return { landed, failed }
}
