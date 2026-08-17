# fra_ca_for_eng presentation-clip audit — chunk 4 (77 rows)

Method: node+pg against `.env.psql`, `course_legos`/`course_practice_phrases`/`course_audio` joined `a.id = l.presentation_audio_id::uuid`. Pulled all 1,366 legos and 12,887 practice phrases for `fra_ca_for_eng` and, for every row, traced the clip's quoted headword and "as in" example against sibling legos (same seed) and the whole-course lego table, plus the seed's own build/use/component phrases. `word_boundaries` is NULL on these clips — no forced-alignment possible; verdicts rest on `course_audio.text`/`course_legos.known_text` per the brief. Read every row individually — none sampled or extrapolated.

## Row-by-row table

| lego_id | verdict | severity | current known_text | clip says (headword / "as in") | repoint target |
|---|---|---|---|---|---|
| S0037L03 | REAL-STALE | HIGH | properly | carefully / "he wants to answer carefully" | none found — no lego owns "carefully"; target audio "comme faut" means "properly", not "carefully" |
| S0065L01 | FP-PARAPHRASE | — | it's important | important / "it's important to learn French" | — headword is the salient sub-word of the lego's own text; "c'est important" covers both |
| S0064L02 | REAL-MISROUTE | HIGH | easy | fun / "this is fun but not easy" | **S0064L02 → S0064L03** ("it's fun" / "c'est le fun"); seed's own use-phrase "learning French isn't easy but it is fun" nails it |
| S0065L02 | REAL-STALE | HIGH | to test yourself | some time / "you could take some time" | none found — unrelated content, no sibling or seed phrase matches |
| S0074L01 | REAL-STALE | HIGH | to understand | for helping me / "thank you very much for helping me to understand" | none — "for helping me" is not a lego anywhere in the course, though the example *is* a verbatim use-phrase in the same seed (see false-positive-class note below) |
| S0061L02 | REAL-STALE | HIGH | say that again | once / "I need to say it once" | none found — no lego or seed phrase for "once" in this seed |
| S0069L01 | REAL-STALE | HIGH | he didn't want | dog / "the dog is very important" | unclear — S0069L03 ("the young dog") and S0546L01 ("the dog", seed 546) are candidates but neither's content matches the example; not confirmable |
| S0094L01 | REAL-MISROUTE | HIGH | way | the only / "It's the only way to do this" | **S0094L01 → S0094L02** ("the only way" / "la seule façon") |
| S0096L02 | REAL-STALE | HIGH | I need a little more | I'm not ready yet / "I'm not ready yet to think about it" | none found — "I'm not ready yet" appears only inside a use-phrase of sibling S0096L01 ("no"), not as its own lego |
| S0184L01 | REAL-MISROUTE | HIGH | I saw them | in the office / "yes I saw them in the office a while ago" | **S0184L01 → S0184L02** ("the office" / "le bureau"); example is the seed's own verbatim use-phrase |
| S0188L01 | REAL-STALE | HIGH | I don't need to change | so I / (none) | none — "so I" is not a lego; it's embedded in this seed's own use-phrase "so I don't need to change" but doesn't stand alone anywhere |
| S0100L02 | REAL-MISROUTE | HIGH | similar | worry about doing / "It's not important to worry about doing this" | **S0100L02 → S0100L01** ("to worry" / "t'en faire"), best-fit sibling; not an exact text match |
| S0019L03 | FP-PARAPHRASE | — | to stop | to stop talking / "I don't want to stop talking tomorrow" | — headword is the natural-context expansion of "to stop" (arrêter); no sibling claims it |
| S0112L01 | REAL-MISROUTE | HIGH | genuinely interesting | I wasn't expecting / "I wasn't expecting it before, but now I understand" | **S0112L01 → S0112L02** ("I wasn't expecting it") |
| S0131L02 | REAL-MISROUTE | HIGH | turn | ideas / "sometimes I have too many ideas" | **S0131L02 → S0131L01** ("too many ideas") |
| S0117L02 | FP-EQUIV | — | the last time | last time / "I wasn't expecting it to be better than last time" | — bare form vs. article-form of the same lego |
| S0132L01 | REAL-STALE | LOW | less | less than / "she said less than I expected" | none — core word "less" is right, but "she said... expected" doesn't appear anywhere in seed 132 |
| S0250L01 | REAL-STALE | HIGH | before I answer | tell me something else / (none) | none — "tell me something else" is not a lego; only appears inside this seed's own use-phrase |
| S0116L02 | REAL-MISROUTE | HIGH | choice | I could make / "I could make that better" | **S0116L02 → S0116L03** ("I could" / "j'pourrais") |
| S0131L01 | REAL-STALE | HIGH | too many ideas | there are / "there are things I don't understand well" | none found anywhere in course |
| S0126L01 | REAL-STALE | HIGH | this job | work is changing / (none) | none — closest is "this job is changing our brain" (different subject) |
| S0120L02 | REAL-MISROUTE | HIGH | to go there | you like / (none) | **S0120L02 → S0120L01** ("you like" / "t'aimes"), exact known_text match |
| S0111L04 | FP-PARAPHRASE | — | our brain | brain / "when we learn something new it changes our brain" | — headword is the core noun of the lego's own text; example is the seed's own verbatim use-phrase for this exact lego |
| S0123L01 | REAL-MISROUTE | HIGH | idea | I think / (none) | **S0123L01 → S0636L01** ("I think" / "j'pense"), exact known_text match — flagged as tentative given the distant seed (636) |
| S0077L02 | FP-PARAPHRASE | — | how quickly | at how quickly / "I'm surprised at how quickly I'm starting to understand" | — target "à quelle vitesse" literally includes "at"; example is the seed's own verbatim use-phrase |
| S0099L02 | REAL-STALE | HIGH | it doesn't work | ask yourself / "do you want to ask yourself why?" | none found anywhere in the course |
| S0106L03 | REAL-MISROUTE | HIGH | to labour | we just need to work hard / (none) | **S0106L03 → S0106L04** ("we just need"); seed's own use-phrase "we just need to work hard" confirms |
| S0109L02 | REAL-STALE | HIGH | a lot of | (n/a, headword itself) | none — "a lot of" is not a lego; example is close to but not exact-matching this seed's own use-phrase family |
| S0120L01 | REAL-STALE | HIGH | it's interesting that | (n/a) | none — recurring intro-clause across many use-phrases, not a lego anywhere |
| S0139L01 | FP-PARAPHRASE | — | sorry | I'm sorry that / "I'm sorry that I can't meet you" | — "I'm sorry that" is an exact build-phrase of this lego's own group |
| S0115L02 | REAL-MISROUTE | HIGH | I was | to have a conversation / "It's difficult to be ready to have a conversation when I'm tired" | **S0115L02 → S0115L03** ("to chat" / "jaser"); seed's own use-phrase "I don't feel as if I'm ready to have a conversation" matches |
| S0118L02 | FP-PARAPHRASE | — | pub | in the pub / "I like to be in the pub with friends" | — "in the pub" is an exact build-phrase of this lego's own group |
| S0143L01 | FP-PARAPHRASE | — | same | the same thing / "It's the same thing as we were talking about earlier" | — "the same thing" is an exact build-phrase; example is the seed's own verbatim use-phrase |
| S0161L02 | REAL-MISROUTE | HIGH | sunday | book / "I need to find a book to read" | **S0161L02 → S0161L01** ("that book" / "ce livre-là") |
| S0116L01 | REAL-MISROUTE | HIGH | best | the best choice / (none) | **S0116L01 → S0116L02** ("choice"); "the best choice" is an exact build-phrase of that group |
| S0136L02 | REAL-MISROUTE | HIGH | gal-friend | ask her / "Can I ask her something important?" | **S0136L02 → S0136L01** ("to ask her") |
| S0140L01 | REAL-STALE | HIGH | you're trying | I can't see / "I'm sorry that I can't see what you're trying to show me" | none — "I can't see" is not a lego (closest is "I can't", a different lego S0057L01); example is the seed's own verbatim use-phrase |
| S0142L01 | FP-PARAPHRASE | — | kind | that's very kind of you / "that's very kind of you and I'm grateful to you for helping" | — example is the seed's own verbatim use-phrase for this exact lego |
| S0160L01 | FP-PARAPHRASE | — | one says | how do you say / "how do you say that in French?" | — synonymous gloss of the lego's own meaning; near-exact use-phrase match ("...in Quebec French?") |
| S0156L02 | REAL-STALE | HIGH | to the restaurant | tonight / (none) | none found — "tonight" appears embedded in this seed's own use-phrase but not as a lego |
| S0249L01 | FP-EQUIV | — | that you help me | you to help me / (none) | — word-order variant of the same construction, same target |
| S0151L02 | REAL-MISROUTE | HIGH | that happens | I was hoping / "I was hoping to learn something new" | **S0151L02 → S0151L01** ("I was hoping"), exact known_text match |
| S0154L02 | REAL-MISROUTE | HIGH | that we meet | on Saturday / (none) | **S0154L02 → S0154L03** ("saturday") |
| S0162L01 | FP-PARAPHRASE | — | what do you think about that | do you think / "what do you think about this?" | — headword is the core embedded phrase of the lego's own text |
| S0209L02 | FP-PARAPHRASE | — | more time | to spend more time / (none) | — exact build-phrase of this lego's own group |
| S0109L03 | FP-PARAPHRASE | — | brand new | new words / "do you want to learn new words?" | — exact build-phrase of this lego's own group |
| S0131L03 | REAL-MISROUTE | HIGH | my head | going around / "there are too many ideas going around in my head" | **S0131L03 → S0131L02** ("turn" / "tournent") — "going around" ≈ turning; target "ma tête" cannot mean "going around" |
| S0117L01 | FP-PARAPHRASE | — | truly | I'm definitely doing / "I feel as if I'm definitely doing better" | — target "vraiment" legitimately glosses as "definitely"; example paraphrases this seed's own use-phrase |
| S0091L01 | REAL-STALE | HIGH | quickly enough to | it's difficult to / (none) | none — target "assez vite pour" cannot mean "it's difficult to"; single-lego seed, no sibling |
| S0095L04 | REAL-MISROUTE | HIGH | the coming bus | bus / "I'm going to take the bus" | **S0095L04 → S0095L03** ("bus"), exact known_text match |
| S0129L01 | REAL-MISROUTE | HIGH | so very | so / "I'm so happy that you're doing so well" | **S0129L01 → S0129L03** ("so well"), tentative — example is the exact use-phrase of the S0129L02/L03 group, not S0129L01's |
| S0098L02 | REAL-STALE | HIGH | to think about | consider doing / "I'm going to consider doing that" | none found anywhere in the course |
| S0100L01 | REAL-STALE | HIGH | to worry | you shouldn't / "you shouldn't start learning this" | none — target "t'en faire" cannot mean "you shouldn't"; headword omits the taught word itself |
| S0119L01 | REAL-MISROUTE | HIGH | can I | before you leave / "Why can't I ask you this before you leave?" | **S0119L01 → S0119L02** ("you leave") |
| S0146L03 | FP-PARAPHRASE | — | to fix | to fix it / "we tried to fix it, but nothing works" | — exact build-phrase of this lego's own group |
| S0101L01 | REAL-STALE | HIGH | this language | I'm enjoying finding out / (none) | none — target "cette langue-là" cannot mean "I'm enjoying finding out"; example is this (single-lego) seed's own verbatim use-phrase but headword names the wrong clause of it |
| S0102L01 | FP-PARAPHRASE | — | we're trying | we're trying to say / "we're trying to say when we want to finish" | — exact build-phrase of this lego's own group |
| S0106L02 | FP-EQUIV | — | to feel happy | feel happy / "I need to feel happy now" | — bare form vs. "to"-form of same lego |
| S0108L01 | FP-EQUIV | — | we didn't hope | we didn't hope to / "we didn't hope to finish that quickly" | — near-identical connector form of the same lego group |
| S0109L01 | REAL-MISROUTE | HIGH | must | we must work hard / "I think we must work hard and understand" | **S0109L01 → S0109L02** ("we must work hard"), exact known_text match |
| S0115L01 | FP-PARAPHRASE | — | I don't feel | I don't feel as if I'm ready / (none) | — "I don't feel ready" is a build-phrase of this lego's own group; natural extension |
| S0127L01 | REAL-STALE | HIGH | I wanted to see you | isn't / "that isn't why I wanted to see you" | none — target "j'voulais te voir" cannot mean "isn't"; example is this (single-lego) seed's own verbatim use-phrase but headword names the wrong word of it |
| S0146L01 | FP-PARAPHRASE | — | seems | nothing seems to be working / (none) | — headword's core word matches the lego; example paraphrases sibling group's use-phrase |
| S0155L03 | REAL-MISROUTE | HIGH | minutes | tomorrow morning / (none) | **S0155L03 → S0155L04** ("tomorrow morning"), exact known_text match |
| S0150L01 | FP-PARAPHRASE | — | can you | can you tell me / (none) | — near-exact use-phrase "can you tell me why?" of this lego's own group |
| S0133L01 | REAL-MISROUTE | HIGH | you get to | you get to know / "you get to know many things here" | **S0133L01 → S0133L02** ("to know someone"); example is the exact use-phrase of that group |
| S0150L02 | FP-PARAPHRASE | — | what is it | your name is / "Can you tell me what your name is please?" | — borderline call: target "c'est quoi" plausibly supports this specific extension; no better-fitting sibling found |
| S0152L04 | FP-PARAPHRASE | — | you wanted | what you wanted / (none) | — one-word superset of the same lego |
| S0152L01 | FP-PARAPHRASE | — | I would have done it | I would have / (none) | — truncated form of the lego's own known_text; a distant exact match exists (S0563L01) but the truncation reading fits better |
| S0154L01 | FP-PARAPHRASE | — | where | where do you want / (none) | — build-phrase-adjacent extension of the same lego |
| S0143L02 | FP-PARAPHRASE | — | that we were talking | we were talking about / "It's the same thing as we were talking about earlier" | — example is the seed's own verbatim use-phrase for this exact lego |
| S0156L01 | REAL-MISROUTE | HIGH | do you want | to a restaurant / (none) | **S0156L01 → S0156L02** ("to the restaurant") |
| S0151L01 | REAL-STALE | HIGH | I was hoping | that wasn't / "that wasn't what I was thinking" | none — target "j'espérais" cannot mean "that wasn't"; closest is sibling S0151L02's own use-phrase, not exact |
| S0134L02 | REAL-MISROUTE | HIGH | you work | with them / "I work with them when I can" | **S0134L02 → S0134L04** ("them") |
| S0135L02 | REAL-MISROUTE | HIGH | fine | you think that / "I want to understand why you think that" | **S0135L02 → S0135L01** ("you think"); "you think that" is an exact build-phrase of that group |
| S0136L01 | REAL-STALE | HIGH | to ask her | of course / "of course I know why you think that" | none — target "y demander" cannot mean "of course", even though the example sentence-family belongs to this lego's own use-phrases |
| S0155L01 | FP-PARAPHRASE | — | it doesn't bother me | I don't mind / (none) | — established synonym gloss used consistently across this lego's own use-phrases ("ça me dérange pas" ⇔ "I don't mind") |

## Counts

- **REAL-MISROUTE**: 26
- **REAL-STALE**: 23
- **FP-PARAPHRASE**: 24
- **FP-EQUIV**: 4
- Total: 77 (all read individually — **0 unread rows**)

## Rows not individually read

None. All 77 rows were read and given an individual verdict.

## New false-positive/defect classes found

1. **"Own-group build-phrase" false positive (drives most FP-PARAPHRASE verdicts, ~18 of 24).** The clip's headword is not the lego's `known_text` verbatim, but is an exact or near-exact **build-tier or component phrase belonging to that same lego's own seed group** (e.g. S0209L02 "more time" clip says "to spend more time", which is literally listed as a build phrase for that same group). The target audio genuinely does mean the headword in these cases — it's a legitimate illustrative expansion, not a defect. A detector comparing headword only against `known_text` (not against the full build/component/use family for that lego's group) will over-flag these. Fix: before flagging, check headword against all `course_practice_phrases` rows sharing the lego's `connected_lego_ids`/seed group, not just `known_text`.

2. **"Orphan headword" pattern inside REAL-STALE (6 rows: S0074L01, S0188L01, S0250L01, S0140L01, S0101L01, S0127L01).** In these rows the clip's "as in" example is a **verbatim, exact `course_practice_phrases.known_text`** in the same seed — so the recording is real, correctly-seeded speech — but its headword names a sub-phrase that is **not any lego's `known_text` anywhere in the course** (not even a sibling). This differs from ordinary staleness (edited text, old audio orphaned) because the audio content is demonstrably intentional and current, just apparently generated at the wrong grain (a whole-sentence/phrase-level presentation) and linked into a LEGO's `presentation_audio_id` instead. Recommend checking whether these same `clip_id`s are *also* referenced by a `course_practice_phrases.presentation_audio_id` row — if so this is a linkage/dedup bug, not a content bug, and the LEGO-level link should simply be cleared/repointed to the correct (possibly not-yet-existing) lego rather than re-rendered.

3. **Synonym-gloss false positive** (S0155L01, and partly S0160L01, S0117L01): the English headword is a different but *established* gloss for the same target already used repeatedly in that lego's own `use` phrases (e.g. "it doesn't bother me" / "I don't mind" both gloss "ça me dérange pas" throughout the seed). Not a defect; flag only if the alternate gloss appears nowhere else in the lego's own phrase family.

## Gaps / caveats

- `word_boundaries` is NULL on effectively all of these clips, so no forced-alignment was possible; verdicts rely entirely on `course_audio.text` per the brief — this is an explicit method limitation, not an oversight.
- A handful of REAL-MISROUTE calls are **tentative best-fit**, not exact-text-confirmed: S0100L02→S0100L01, S0123L01→S0636L01 (distant seed), S0129L01→S0129L03. Flagged individually above.
- Several REAL-STALE rows (S0069L01, S0109L02) have no confident repoint candidate at all — noted as "none found" rather than guessed.
