# Re-judging today's grammar fixes against your Welsh rule — CORRECTED

No commits — this is still a read-only report. Nothing was changed or reverted.

**Correction up front:** my first pass on this wrongly grouped Irish and Scottish Gaelic in with Welsh, on the assumption that "mutation" is one family and families behave the same way. You caught it: Welsh soft mutation is genuinely mild (a consonant softens — b becomes v-ish, for instance), but Irish and Scottish Gaelic mutation is often much more drastic — it can delete a consonant outright or swap it for a completely different one. I went back through every non-Welsh fix from today with no family-level assumption in either direction, and describe below exactly what each sound change actually does, not just whether it's "big" or "small."

## The corrected headline count

- **REVERT: 0.**
- **KEEP: 16 courses, 109 individual fixes.** Every fix I found — including all of Irish and Scottish Gaelic — is either an audible consonant change/deletion or a grammatically load-bearing ending that a native speaker would hear as wrong, not a variant a listener would miss.
- **UNSURE: 0.**
- The closest things to "small" I found are noted individually below with precise description, so you can weigh them yourself — none of them cleared the bar for "barely notice."

---

## Irish and Scottish Gaelic — corrected, with the actual sound described

Your correction is right on the mechanics. Welsh soft mutation typically changes the *manner* of a consonant while keeping it recognisably related to the original (b→f is voicing loss, roughly "b with less punch"). Irish and Scottish Gaelic lenition is a different, often bigger, operation: some consonants turn into a completely different consonant, and some are deleted outright, replaced by nothing at all.

### Irish (`gle_for_eng`) — 4 fixes, all KEEP
- "friends" — was **chairde**, now **cairde**. The "c" is a hard "k" sound. Lenited, it becomes "ch" — not a soft version of "k", but a completely different sound: a throaty, breathy rasp at the back of the throat (the same sound as the "ch" in Scottish "loch"). A learner drilling the card as-was would learn to make a throat-clearing noise where a plain "k" belongs.
- "friend" — was **chara**, now **cara**. Same swap, same word.
- (plus the two practice sentences built from those words)

### Connacht Irish, a regional dialect of Irish (`gle_cn_for_eng`) — 27 fixes, all KEEP
Nine different words, each mutated a different way — none of them mild:
- "making mistakes" — was **bhotúin**, now **botúin**. "B" (a normal English-style b) becomes, when lenited, a "v"/"w"-ish sound. The lips no longer close for the consonant at all.
- "to wait for you" — was **fhanacht**, now **fanacht**. This is the most dramatic one: lenited "f" in Irish is **completely silent**. So the old card was teaching a learner to say the word with **no consonant sound at all** where an "f" belongs — not a softened f, an absent one.
- "an old man" — was **sheanfhear**, now **seanfhear**. "S" becomes, when lenited, a plain "h" breath sound. The whole hissing "s" is replaced by an exhale.
- "an old woman" — was **sheanbhean**, now **seanbhean**. Same s→h swap.
- "a young woman" — was **bhean óg**, now **bean óg**. Same b→v/w swap as above.
- "to try to help" — was **dhéanamh**, now **déanamh**. "D" becomes a soft, throaty "gh"/"y"-ish glide — a plosive turning into something closer to a glide.
- "my sister's friend" — was **chara**, now **cara**. Same k→throaty-ch swap as gle_for_eng.
- "many people" — was **mhórán**, now **mórán**. "M" becomes a nasalised "w" — the lips stop fully closing.
- (plus 18 practice sentences built from these same nine words — same sound changes throughout)

Every one of these is either a full consonant deletion (fhanacht) or a swap to a consonant in a completely different category (stop → fricative, stop → glide, plosive → nasal-glide). None of them is "the same word, slightly softer" — several of them are "a different sound, or no sound, where a consonant should be."

### Scottish Gaelic (`gla_for_eng`) — 9 fixes, all KEEP
- "happy" — was **thoilichte**, now **toilichte**. "T" becomes, when lenited, a plain "h" breath — the same kind of stop-to-breath swap as Irish s→sh above. The "t" is gone, replaced by an exhale.
- (plus 8 practice sentences using the same word)

**Bottom line on this group: these should stand.** I still don't speak Irish or Scottish Gaelic, so I can't personally vouch for exactly how jarring each one sounds to a native ear — but the *mechanism* in every single case is either a consonant vanishing or a consonant turning into an unrelated sound, which is squarely on the "audibly/grammatically wrong" side of your test, not the "barely notice" side. This is the opposite of what I told you last time, and the correction is fully deserved.

---

## Everything else — re-checked with the same no-assumptions eye, closest calls flagged precisely

I went back through the case-ending and mood fixes looking specifically for anything that might actually be a small, easy-to-miss sound difference, since you asked me to test that directly rather than trust the family pattern. Two clusters come closest to "small" — I'm naming them precisely rather than folding them into "case = always big."

### The closest calls

**Spanish subjunctive vs indicative, several fixes ("pueda"→"puede", "puedan"→"pueden", "te sientas"→"te sientes"):** these differ by exactly one vowel sound at the very end of the word — an "ah" becoming an "eh" (e.g. *pueda* vs *puede*). Nothing else in the word changes. Acoustically, that genuinely is a small, one-vowel swap — the smallest I found outside Irish/Gaelic. But it isn't a stylistic variant: that final vowel is the *entire* piece of grammar carrying "maybe" vs "is." A Spanish speaker hearing "creo que puedan" (I believe they maybe-can) instead of "creo que pueden" (I believe they can) hears an unmistakable conjugation mistake — closer to an English speaker hearing "he do" for "he does" than to hearing a regional accent. Small sound, but not a variant anyone would use interchangeably. I'm keeping these in KEEP, but flagging them as the fixes where "how big does it sound" and "is it wrong" pull furthest apart from each other.

**Serbian "reč" → "reči" and Russian "недели" → "неделю":** both add or swap a single vowel at the end of an otherwise-unchanged word (reč/reči adds one syllable; недели/неделю swaps the final vowel sound, an "ee" for an "oo"). Same shape as the Spanish case above — small in the mouth, but it's the case ending, i.e. it's the whole of the grammatical information the word carries (which role the word plays in the sentence). Keeping these too, for the same reason.

Every other case, mood and word-order fix I re-checked involves either a completely different word form (Italian *fosse*/*era*, *avesse*/*aveva* — not related sounds at all), a longer suffix swap (Hungarian *-nak* vs *-val*), or a whole word added or removed (Russian's missing "in"/"o'clock", French's missing "I", Swiss German's missing "you", Galician's added "I hope that"). None of those are close calls — full details and every individual before/after pair are in the companion document already published: **https://watson-1.tail4968cb.ts.net/d/6fdb3669** (the family-by-family fix list itself is unchanged and accurate; only the verdict on the Celtic mutation section in that document is now wrong and superseded by this correction).

---

## What I could and couldn't verify

- All Irish/Scottish Gaelic phonetic descriptions above come from standard descriptions of how Irish and Scottish Gaelic lenition works (which consonant becomes which sound), not from me listening to the actual clips — most of these rows have no recording yet, or the recording pipeline can't transcribe Irish/Gaelic at all (a separate, existing gap in the estate's tooling, not something from today). Where a clip did exist and could be roughly cross-checked (Irish "chairde"/"cairde"), a rough machine transcript confirmed only the opening sound changes, nothing else about the word.
- I don't speak any of the languages in this batch natively. Every judgement above rests on the documented *mechanism* of the change (consonant deleted / consonant swapped for an unrelated one / grammatical ending changed), which I'm confident describing precisely, rather than on personal listening.
- Nothing was reverted or changed. This is a report for you to act on.

**No commits.**
