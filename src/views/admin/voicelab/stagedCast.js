/**
 * STAGE THE WHOLE LANGUAGE, THEN SAVE ONCE.
 *
 * Tom, 2026-09-08, on casting voices in the Voice Lab: "I want to be able to
 * click on a language, audition available voices, per language - assign a voice
 * to male primary, male backup, female primary, female backup, guide and all
 * that from a single place … not to have to repeat it 4/5 times … the mode I am
 * in is the language - and I want to be able to satisfy that whole language in
 * one go basically."
 *
 * So assignments are collected in local state and committed on ONE press. This
 * module is that press, kept out of the Vue file so the rule is testable: what
 * calls a save makes, in what order, and what it does with a refusal.
 *
 * THE BATCH IS CLIENT-SIDE ON PURPOSE. There is no batch endpoint and this does
 * not add one: it fires the SAME per-slot PUT and DELETE the page has always
 * fired (services/voicelab/router.cjs), one at a time, in a defined order. The
 * server's guards — the human-recorded refusal and the consent block, both 409s
 * — therefore still apply per slot exactly as they did, and a batch endpoint
 * would have had to reimplement them or wave them through.
 *
 * TWO RULES THE TEST BESIDE THIS FILE PINS DOWN:
 *
 *   CLEARS FIRST, THEN CASTS, each in the page's own reading order. A voice
 *   moved from primary to backup is a clear and a cast on two slots in one
 *   save; doing the clear first means the intermediate state is always "empty",
 *   never "cast twice", whatever the endpoint chooses to do about duplicates.
 *
 *   A REFUSED SLOT IS REPORTED, NEVER SWALLOWED, and never stops the rest. The
 *   worst outcome on this screen is a save that says "saved" while a PUT 409'd
 *   behind it, so every slot's outcome is carried back by name and the caller
 *   leaves the failed ones staged — visibly unsaved — rather than clearing them.
 */

/**
 * Turn the staged map into the ordered list of calls one Save press will make.
 *
 * @param staged  slotKey -> { action: 'cast' | 'clear', slot, voiceId, voiceName, label }
 * @param order   the slot keys in the page's own reading order (male primary,
 *                male backup, female primary, female backup, guide primary,
 *                guide backup). Keys not in `order` follow, in insertion order,
 *                so a staged change can never be silently dropped by a layout
 *                change above this file.
 */
export function planCast (staged, order = []) {
  const entries = Object.entries(staged || {}).filter(([, v]) => v && v.action)
  const rank = new Map(order.map((k, i) => [k, i]))
  const at = (k) => (rank.has(k) ? rank.get(k) : order.length + 1)
  const sorted = entries.sort((a, b) => at(a[0]) - at(b[0]))
  const clears = sorted.filter(([, v]) => v.action === 'clear')
  const casts = sorted.filter(([, v]) => v.action === 'cast')
  return [...clears, ...casts].map(([key, v]) => ({ key, ...v }))
}

/**
 * Run the plan. Sequential, never parallel: six writes to the same language row
 * arriving at once is how one of them wins and the others read as saved.
 *
 * `castSlot` / `clearSlot` are the labApi calls, injected so the test can watch
 * them. `onStep` is called after each slot so a slow save can say where it is.
 *
 * Returns { landed, failed, skipped } — `skipped` is the union of the courses
 * the server itself said a cast did not reach (human-recorded ones), which is
 * the fact that must survive the word "saved".
 */
export async function commitCast (plan, { castSlot, clearSlot, onStep = () => {} } = {}) {
  const landed = []
  const failed = []
  const skipped = []
  for (const step of plan) {
    try {
      if (step.action === 'clear') {
        await clearSlot({ slot: step.slot.slot || 'phrase', gender: step.slot.gender, rank: step.slot.rank })
        landed.push({ key: step.key, label: step.label, action: 'clear' })
      } else {
        const out = await castSlot({
          slot: step.slot.slot || 'phrase',
          gender: step.slot.gender,
          rank: step.slot.rank,
          voiceId: step.voiceId,
        })
        for (const c of (out && out.skipped) || []) skipped.push(c)
        landed.push({ key: step.key, label: step.label, action: 'cast', voiceName: step.voiceName })
      }
    } catch (e) {
      // The refusal, by name. `message` is what the router's 409 says — the
      // human-recorded guard and the consent block both answer here.
      failed.push({ key: step.key, label: step.label, action: step.action, message: e.message || String(e) })
    }
    onStep({ done: landed.length + failed.length, total: plan.length })
  }
  return { landed, failed, skipped }
}

/** One sentence for the top of the page: what the press actually did. */
export function saveSentence ({ landed = [], failed = [] } = {}) {
  const n = landed.length
  const done = `${n} slot${n === 1 ? '' : 's'} saved`
  if (!failed.length) return `${done}.`
  return `${done} · ${failed.length} refused: ${failed.map((f) => `${f.label} — ${f.message}`).join(' · ')}`
}
