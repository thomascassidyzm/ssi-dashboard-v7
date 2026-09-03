# Lessons whose practice sentences never use the taught word — priority courses only

**Rescoped to Kai's priority lists, 28 August 2026. Read-only: no row was changed, nothing fixed.**

## First, the three plain answers

**1. "Practice sentences" means BUILD phrases, and that is all the 576 counted.**
Every practice row lives in one table with a role decided by its position: **position 0 = component,
1–7 = build, 8+ = use**. Across the estate that is 295,893 build rows, 466,681 use rows and 86,870
component rows. **The check looked only at build.** So "576 lessons have no practice sentence
containing their word" means *no BUILD phrase* — the use phrases, which are two-thirds of all
practice material, were never examined. That materially softens the headline, and the number below
says by how much.

**2. Rescoped, the 576 becomes 277.** Restricted to the priority courses — x-for-English and its
national variants, English-for-x, English for the ten Indian languages, and courses for Japanese,
Chinese, Hindi and Tamil speakers — 277 of the 576 are in scope. The other 299 are out.

| course | in-scope cases |
|---|---|
| German | 68 |
| Korean | 47 |
| Arabic (MSA) | 43 |
| French | 25 |
| Spanish (Mexico) | 25 |
| Chinese | 22 |
| Spanish (Spain) | 11 |
| Italian | 9 |
| Portuguese (Portugal) | 7 |
| Arabic (Lebanese) 4, Portuguese (Brazil) 4, Welsh-for-Japanese 3, English-for-Korean 3, English-for-Chinese 3, English-for-Italian 1, English-for-Marathi 1, Korean-for-Tamil 1 | 16 |

*Armenian's 126 cases and the Welsh-for-English courses are out of scope and are dropped. An
earlier reading of 14 Armenian cases exists and has been set aside; no Armenian number is reported
as a finding here.*

**3. Kai's hypothesis is real but small — it explains 7 cases, not the pattern.** Detail below,
including the evidence that kills the general version and the thing it turned up instead.

---

# Kai's hypothesis: tested three ways

**The hypothesis:** the lesson word was edited and the practice phrases were never regenerated, so
the sentences are correct practice for an older, shorter word.

## Test 1 — timestamps. Dead. It proves nothing.

235 of the 277 in-scope lessons were last updated *after* their phrases were created, which looks
like a smoking gun until you run the control. Among lessons that **pass** the check in the same six
courses, the figure is **99.9%** — and among the flagged ones it is also **99.9%**. Every lesson row
in the estate has been touched since its phrases were written, because six triggers fire on that
table for audio links, versions and content stamps. **The timestamp signature is worthless and any
claim built on it should be discarded.**

## Test 2 — the audit trail. Real, and it proves 7 cases.

Lesson edits *are* captured: every update writes the previous row into the audit log. Recovering
each in-scope lesson's earlier words and testing whether its current sentences are correct practice
for one of them gives **7 proven cases** — and they are a single coherent batch:

| now taught | previously | the sentences still practise the old word |
|---|---|---|
| je peux vous aider **madame** | je peux vous aider | je peux vous aider aujourd'hui |
| vous le parlez **madame** | vous le parlez | oui vous le parlez / vous le parlez bien |
| êtes-vous prêt **monsieur** ? | Êtes-vous prêt ? | êtes-vous prêt à commencer ? |
| voulez-vous partir **madame** ? | voulez-vous partir ? | voulez-vous partir maintenant ? |
| qu'en pensez-vous **madame** ? | qu'en pensez-vous ? | qu'en pensez-vous de cela ? |
| est-ce que ça vous dérange **madame** ? | est-ce que ça vous dérange ? | est-ce que ça vous dérange beaucoup ? |
| **女士，**您觉得怎么样？ | 觉得怎么样 | 觉得怎么样 / 你觉得怎么样？ |

**This is exactly the mechanism Kai described, and it is proven, not plausible.** A late politeness
pass appended a form of address — *madame*, *monsieur*, 女士 — to lesson words in the 640s–650s
seeds, and nothing regenerated their sentences. The Italian *sta facendo qualcosa, **signore*** at
seed 646, the Korean **여사님** 어떻게 생각하세요? at seed 651 and the Arabic **سَيِّدَتي** at seed 642
are the same batch showing up in other courses. **Any course extended into a politeness register
should be re-checked at its tail seeds.**

## Test 3 — does it explain the rest? No, and here is what kills it.

- **214 of the 277 have been updated repeatedly since the audit began and their taught word never
  once changed.** They were touched, versioned, re-linked — and the word stayed put. Staleness
  cannot explain a lesson whose word was never edited.
- **German, which fits the story best by eye, fails it hardest.** Not one of the 68 German cases
  shows an edit. Their lesson rows and their practice phrases were **created in the same second** —
  17 June 2026, zero seconds apart. The sentences were generated from that word, at that moment,
  and came out not containing it.
- **The honest gap: the audit log only reaches back to 3 July 2026.** German was built on 17 June,
  so an edit in that fortnight would be invisible. That window cannot be closed from the data, and
  I am not going to pretend otherwise. What can be said is that no lesson in scope has been edited
  in the eight weeks since, and that the German rows' own creation timestamps leave only a
  two-week window in which the whole 68 would have had to be rewritten.

**Verdict: the mechanism exists and is proven on 7 cases (2.5% of in scope). It is not the
explanation for the other 270.** Kai's hunch found a real batch defect that nothing else would have
caught — and the general form of it does not survive contact with the data.

## What the hypothesis turned up instead — and this is the bigger finding

Chasing it produced two facts that reframe the repair.

**(a) In 74% of in-scope cases the sentences are complete, correct practice for a *fragment* of the
taught phrase.** Not a stale older word — a *part* of the current one:

- *ein gutes Beispiel* → every sentence practises **gutes**
- *قَهْوَتُكَ جاهِزَةٌ* → every sentence practises **جاهِزَةٌ**
- *نَبْقى هادِئينَ* → every sentence practises **هادِئينَ**

By language: German 64/68, Spanish 36/36, French 24/25, Portuguese 11/11, Italian 9/9, Korean
36/48, Arabic 20/47, **Chinese 0/22**. Chinese fails this test completely, which means the Chinese
misses are a different problem from everyone else's and should not be lumped in.

**(b) In 28% the full sentence exists — filed against the wrong lesson.** For 78 of the 277, a build
phrase containing the taught word in exact form sits in the *same seed*, attached to a neighbouring
lesson:

- Arabic seed 393 teaches **القَميصِ** at lesson 1; the sentence *أَعْرِفُ ذَلِكَ الشَّخْصُ ذو القَميصِ الأَخْضَرِ*
  is filed under lesson 3.
- Arabic seed 403 teaches **نَبْقى هادِئينَ** at lesson 1; *نُريدُ أَنْ نَبْقى هادِئينَ لِأَطْوَلِ فَتْرَةٍ مُمْكِنَةٍ* is
  filed under lesson 3.
- German seed 537 teaches **ich hatte unrecht**; the phrase *ich hatte unrecht* exists in that seed,
  under another lesson.

Add the 55 more where the word appears only in a **use** phrase of the same seed, and the count of
lessons whose word is genuinely absent from its whole seed is **144, not 277**.

German seed 537 shows what is underneath it. That seed has two lessons — lesson 1 is *ich hatte
unrecht* and lesson 2 is *unrecht* — and lesson 2's build ladder runs *unrecht* → *ich hatte
unrecht* → *sie kann unrecht haben*. The ladder is correct. **The lesson list is in the wrong
order: the whole sentence sits in the slot where the first chunk belongs**, so lesson 1 gets the
sentences for the chunk *ich hatte* and lesson 2 quietly teaches lesson 1's phrase.

**(c) In 25% of in-scope cases the "lesson word" is the entire seed sentence.** 68 of the 277 have a
lesson whose text is character-for-character the seed's own sentence — Korean 22, German 14, Arabic
11, French 8, Chinese 6, Italian 5. A lesson that *is* the whole sentence has no chunk to drill, so
its build phrases can only ever be a fragment of it. In Arabic these cluster hard in the tail seeds
— 642, 644, 645, 646, 648, 651, 654, 659 — the same region as the politeness batch.

**So the repair is not one job, it is three**, and only the smallest is "write new sentences":

| what is actually wrong | how many in scope | the fix |
|---|---|---|
| the sentence exists, filed against the wrong lesson | 78 | re-attach, mechanical |
| the word is practised only in a use phrase | 55 | re-balance the build ladder |
| the word appears nowhere in its seed | 144 | genuinely write new sentences |
| *of which, provably stale after a lesson-word edit* | *7* | *regenerate those seven* |
| *cutting across all three: the lesson word is the whole seed sentence* | *68* | *re-chunk the seed* |

**And the standing gap Kai suspected is real, whatever caused these 277: nothing regenerates a
lesson's practice phrases when its word is edited.** The lesson-word edit path fires triggers that
null the audio and bump versions; no trigger, route or job touches the practice phrases. The
politeness batch is the proof that this bites in production.

---

# The sample, rescoped

**73 in-scope cases read from live rows** — 48 from the first pass that fall inside the priority
lists, plus 25 drawn to cover every in-scope course the first pass missed (Italian, both
Portuguese, Lebanese Arabic, English-for-Korean/Italian/Marathi, Korean-for-Tamil, Welsh-for-Japanese).
Selection was mechanical both times: bucket by language, split near-miss against word-level miss
and early seeds against late, take at even intervals. Seeds 6 to 660.

| class | of 73 |
|---|---|
| **Real defect** — the word genuinely is not there | 62 — 85% |
| **The rule is too strict** | 8 — 11% |
| **The lesson's own word is wrong** | 1 |
| **Slack already granted, not implemented** | 1 |
| **Tool artefact** | 1 |

**Rescoping changes the shape completely.** The misspelling class was almost entirely Armenian and
the mutation class almost entirely Welsh; with both out of scope, **the priority courses are
overwhelmingly real defects.** Extrapolated to the 277: roughly **235 real, ~35 needing slack, a
handful of everything else** — and of those 235, more than half are the misfiling and use-phrase
cases above rather than genuinely missing material.

## Where the rule is too strict — unchanged, and confirmed in scope

The categories survive the rescope; they were Arabic, Korean and Spanish findings, all in scope.

**1. Arabic bare case vowels.** أَسْتَريح drilled as أَسْتَريحُ, القَميصِ as القَميصُ, الفُسْتانِ as الفُسْتانَ,
الصَّغير as الصَّغيرُ. Identical letters; the ending is grammar the sentence forces and speech drops.
**Boundary: tanwīn is not in it** — هادئ → هادِئاً adds an audible *-an*. Bare case vowel, slack;
tanwīn, defect.

**2. A grammatical particle glued to the taught word (Korean).** 여행 → 여행**을**, 곳 → 곳**에**,
가능한 문제 → 가능한 문제**를**. The taught form is untouched with an obligatory particle on its end;
the sentence could not be written any other way. Extends to Japanese, Turkish, Finnish, Hungarian.
**Not in it:** 기억 → 기억해요, which verbs the noun.

**3. Enclitic pronoun on an infinitive (Spanish, Portuguese, Italian).** *por ayudar* drilled as
*muchas gracias por ayudarme*.

Two out-of-scope categories from the first pass are noted and set aside: Welsh colloquial clipping
(*beth* → *be'*) and Welsh soft mutation. If Welsh ever returns to scope they still stand.

**Rejected:** Greek "final vowel only" (σιωπώ → σιωπά is a change of person) — and Greek is out of
scope now anyway.

## One new class worth naming: the lesson's own word is wrong, outside Armenian

Italian seed 599 teaches **sarebbe stato felice** and glosses it *"I would have been happy"*. Its
three sentences all say **sarei stato felice** — which is what the English gloss actually means.
The sentences are right; the lesson word is in the wrong person. **The misspelled-lesson-word class
is not an Armenian-only phenomenon**, it is just far rarer in the priority courses — 1 in 73.

## And one tool artefact, so it is not mistaken for a defect

Korean-for-Tamil seed 524 teaches **3~4분** and its sentences say *3~4분 지금*, *3~4분 오늘*. The word
is plainly there. The check strips the `~` character as an authoring slot-marker, which fuses the
number into `34분` and stops it matching. **A handful of the 277 may be this and nothing more.**

## The real defects, so you can see their shape

German is the clearest and is one pattern: the lesson teaches a phrase, the practice set drills the
easiest word in it. *ich hatte unrecht* → *ich hatte / sie hatte / er hatte*. *Nächstes Mal werde
ich* → *werde / ich werde*. *ein gutes Beispiel* → *gutes / gutes Essen*. *viel mehr Wörter* → *So
viel mehr*. One German lesson word is broken in itself: *um bitten*, where German needs *um etwas
bitten*, and the only *um* in its sentences is inside *Warum*.

The same shape elsewhere: Portuguese *quando é que começaste* → *quando é que*; Italian *suonare
qualcos'altro* → *suonare*; Spanish *despertarnos en medio de la noche* → *Despertarnos*;
Portuguese *ela foi muito simpática*, where every word appears but never all in one sentence;
Chinese 市政府 → 市 / 这个市; Arabic *قَهْوَتُكَ جاهِزَةٌ* → *إِنَّها جاهِزَةٌ*.

Three English-for-Korean lessons are a harder failure than the rest — *again*, *good* and *how* are
each drilled by sentences about something else entirely (*could you say?*, *more slowly*, *this word
in English*). And English-for-Italian seed 218 teaches *very* while glossing *molto* in sentences
that mean *much*, which is a translation-choice error underneath the missing-word one.

## How far to trust this

- **The three plain answers — build-only, 277 in scope, the mechanism proven on 7 — are facts, not
  estimates.** They come from full counts over the whole in-scope set, not from the sample.
- **The 74% fragment figure and the 78 misfiled are full counts too**, over all 277. Trust them.
- **The 85/11 class split is a 73-case sample.** German (13 cases, one uniform failure) and the
  Arabic slack concentration are solid; single-case courses — Marathi, Italian-for-English speakers,
  Korean-for-Tamil — are not, and the whole-population numbers derived from them could move.
- **The audit blind spot before 3 July 2026 is not closable from the data.** If a bulk lesson-word
  edit happened in the fortnight before it, this test cannot see it, and German is exactly where
  such an edit would hide.
