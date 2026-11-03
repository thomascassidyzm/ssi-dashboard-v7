// Pure helpers for tools/pods/pod-drill/snapshot.mjs (job #657; moved from ssi-learning-app tools/lib in #699). No I/O.

/**
 * The chunks the Drill ladder plays at rung 0 for one loaded pod sentence.
 * Fusion card: the authored fine units of its groups (each with its ms span in the
 * group's Take G). No fine map: ONE chunk, the whole sentence. A continuation row
 * plays inside its anchor row, so it yields null.
 */
export function cardChunks(sentence, syl) {
  if (sentence.fusionContinuation) return null
  const groups = sentence.fusionGroups
  if (!groups || !groups.length) {
    return { kind: 'plain', chunks: [{ text: sentence.targetText, syl: syl(sentence.targetText), whole: true }] }
  }
  const chunks = []
  for (const g of groups) {
    for (const u of g.units) {
      chunks.push({
        text: u.target_surface, syl: syl(u.target_surface),
        startMs: u.target_start_ms ?? null, endMs: u.target_end_ms ?? null,
        gloss: u.gloss || null, legoKey: u.lego_key || null,
        takegAudioId: g.takegAudioId || null, wholeTargetClipId: g.wholeTargetClipId || null,
        sliceable: !!g.sliceable,
      })
    }
  }
  return { kind: 'fusion', chunks }
}

/** min / median / max and the share of chunks above 4, 6 and 8 syllables. */
export function chunkStats(sylls) {
  const a = [...sylls].sort((x, y) => x - y)
  if (!a.length) return { chunks: 0 }
  const share = (n) => Math.round((a.filter((s) => s > n).length / a.length) * 1000) / 10
  return { chunks: a.length, min: a[0], median: a[Math.floor((a.length - 1) / 2)], max: a[a.length - 1], over4: share(4), over6: share(6), over8: share(8) }
}

/**
 * Syllables of `text`: the core counter where one is registered, else, for the
 * character-per-syllable scripts (Mandarin; Japanese and Korean approximately), the
 * count of ideographs/kana/hangul. Throws for any other unregistered language.
 */
export function syllablesFor(lang, text, coreCount) {
  try { return coreCount(text, lang) } catch (e) {
    if (lang === 'zho' || lang === 'jpn' || lang === 'kor') return (text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu) || []).length
    throw e
  }
}

/** The ENGLISH clip's own word timings on each card (job #381, Tom r-2026-11-03: split timings come
 *  from the render's Cartesia voice timings, never a transcription). `clips` are audio rows keyed by
 *  the BARE uuid; a card's knownAudioId may carry `.vN`. `read` is the app's own readClipTimings.
 *  A card whose English clip has no stored timings gets null. */
export function attachKnownTimings(cards, clips, read) {
  const bare = (ref) => String(ref || '').split('.')[0]
  const byId = new Map((clips || []).map((c) => [c.id, read(c)]))
  return cards.map((c) => ({ ...c, knownWordTimings: (c.knownAudioId && byId.get(bare(c.knownAudioId))) || null }))
}
