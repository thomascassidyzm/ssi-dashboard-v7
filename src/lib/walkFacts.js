/**
 * MEASURED FACTS THE WALK REGISTRY DOES NOT CARRY — a dated snapshot, not a
 * source of truth.
 *
 * Everything here was measured against the live database on 2026-09-01 and is
 * printed on the Script Lab because it is true and Tom needs it. None of it can
 * be read from `canonical_pod_scenarios`, so the page cannot compute it: the
 * parked walks live only in `listening_pods`, the generated audio lives only in
 * `listening_pod_sentences`, and the Welsh overlay lives only on a branch.
 *
 * IT IS IN ITS OWN FILE SO THE GAP IS VISIBLE IN ONE PLACE rather than scattered
 * through the page as literals. Every entry here is a field
 * `tools/pods/pod-corpora.json` could carry and does not. When the registry
 * grows them, delete the entry — do not maintain both.
 *
 * A NUMBER HERE GOES STALE SILENTLY. The page labels these as a dated snapshot
 * for exactly that reason: an undated measurement presented as a live read-out
 * is the more expensive kind of wrong.
 */

// The parked walks' sizes USED TO LIVE HERE. They are `parked[].size` in
// tools/pods/pod-corpora.json now, measured and dated by the registry itself,
// so the copy here was deleted rather than kept in parallel — which is what the
// header above says to do the moment the registry grows a field.

/**
 * The GENERATED core walk — the layer where audio actually exists. Reported
 * beside the canonical layer, never mixed with it.
 *
 * `pod-1` names the same thing in both tables: in `canonical_pod_scenarios` it
 * is the live CORE canon (231 rows), and in `listening_pods` it is every
 * course's generated core pod (Tom, 2026-09-13: "There is only pod-1 now").
 * The numbers below were measured on 2026-09-01 against the courses generated
 * from the canon at that date; the per-course cutover onto the canon runs on its
 * own tooling and is nothing this page touches.
 */
export const GENERATED_CORE = {
  newSlate: { slug: 'pod-1', courses: 22, sentences: 5082, targetClips: 5082, knownClips: 5082 },
}

/**
 * Pair overlays — target-language drafts attached to a walk, living on a branch
 * rather than in the canonical store. The canonical store's only target
 * language is still Italian, and an overlay must never be read as changing that.
 *
 * A WORKER NEVER SIGNS OFF TARGET-LANGUAGE TEXT, so every overlay here is
 * labelled by its own draft status and by who owns the sign-off.
 */
export const PAIR_OVERLAYS = {
  health: {
    pair: 'eng → cym_n',
    status: 'DRAFT-FOR-ARAN',
    branch: 'docs/health-welsh-pair-overlay-2026-09-01',
    file: 'docs/sector-pods/health-welsh-pair-overlay-2026-09-01.md',
    // The distinction that matters: this is on the general SEED SET, not on the
    // 438-turn conversation corpus the health walk itself is made of.
    scope: 'the health general seed set — 57 seeds, 159 new LEGOs',
    notOn: 'the 438-turn health conversation corpus',
    audio: 'Welsh is human-voice only, so its audio is a recording worklist for Aran and Catrin, never a TTS queue. No audio pass may be queued until the draft flag clears.',
  },
}
