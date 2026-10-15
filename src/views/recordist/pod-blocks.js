// WHERE A FINISHED POD LEADS (Kai, 2026-10-15, job #682).
//
// Eleri and Dan each hold ONE link, /r/<voice>?course=cym_s_for_eng&pod=pod-1,
// and must never need another. The server sends the pods of the course that have
// lines for this voice, in course order (`podBlocks`, services/voice-engine/
// booth-pod-blocks.cjs); this decides, from that list and the pod on the address,
// which block they are on and where "next" goes.
//
// NEXT is the first LATER block with lines still to read; failing that, an
// EARLIER one they have not finished; failing that, nothing — and the booth says
// "next block coming soon" rather than sending them round a finished pod again.
// `current` may carry live counts from this session, which win over the server's
// snapshot for the block they are standing in.

const remainingOf = (b) => Math.max(0, (b.total || 0) - (b.recorded || 0))

export function podBlockNav(blocks, podOnAddress, current = null) {
  const list = Array.isArray(blocks) ? blocks : []
  const index = podOnAddress ? list.findIndex(b => b.slug === podOnAddress || b.podId === podOnAddress) : -1
  if (index === -1) return null
  const here = current ? { ...list[index], ...current } : list[index]
  const withHere = list.map((b, i) => (i === index ? here : b))
  const unfinished = (b) => remainingOf(b) > 0
  const later = withHere.slice(index + 1).find(unfinished)
  const earlier = later ? null : withHere.slice(0, index).find(unfinished)
  const next = later || earlier || null
  return {
    index,
    number: index + 1,
    count: list.length,
    current: here,
    currentDone: here.total > 0 && remainingOf(here) === 0,
    next: next ? { ...next, number: withHere.indexOf(next) + 1, earlier: !later } : null,
    blocks: withHere.map((b, i) => ({ ...b, number: i + 1, done: b.total > 0 && remainingOf(b) === 0, here: i === index })),
  }
}

// The address with a different ?pod=, everything else kept, so the link they
// were given keeps working and a reload lands on the block they are now in.
export function addressWithPod(href, slug) {
  const u = new URL(href)
  u.searchParams.set('pod', slug)
  return u.pathname + u.search + u.hash
}
