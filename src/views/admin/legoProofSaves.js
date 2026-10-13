// Race guards for the LEGO proof page (job #505, review findings on #496).
// Kept out of LegoProof.vue so the rules can be tested without mounting it.

// Every LEGO the page shows is tagged with the course it was loaded for; saves are keyed and addressed by that course,
// never by whichever course tab is selected when the request finally goes out.
export const saveKey = (course, legoId) => `${course}|${legoId}`

// A load-generation token: only the most recently started load may write the list.
export function createLoadGate() {
  let gen = 0
  return {
    begin: () => ++gen,
    isCurrent: (token) => token === gen,
  }
}

// One save per course+LEGO at a time; a change made meanwhile waits for the one in flight, then sends the latest state.
// `lego` must carry its own `course`; `send(course, payload)` does the PUT.
export function createSaveQueue({ send, onState, onError, onOk }) {
  const inflight = {}
  async function save(lego) {
    const course = lego.course
    const key = saveKey(course, lego.id)
    if (inflight[key]) { inflight[key].again = true; return }
    inflight[key] = { again: false }
    onState(key, 'saving…')
    try {
      await send(course, { legoId: lego.id, flagged: lego.flagged, note: lego.note })
      onState(key, 'saved ✓')
      onOk?.(key)
    } catch (e) {
      onState(key, 'NOT saved')
      onError?.(key, lego, e)
    } finally {
      const again = inflight[key].again
      delete inflight[key]
      if (again) save(lego)
    }
  }
  return { save }
}
