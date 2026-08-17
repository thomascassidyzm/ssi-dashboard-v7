# fra_ca_for_eng presentation-clip audit — chunk 2 (77 rows)

Row-by-row, all individually read against `course_legos` + `course_practice_phrases` for the course (no sampling). Method: DB-joined, headword/example traced against every lego and practice phrase in the course (own seed first, then course-wide). `course_audio.text` treated as ground truth for what was spoken (word_boundaries NULL on nearly all of these, so no force-align was possible).

**Key convention used below:** for REAL-MISROUTE rows I report both the correct owner lego AND whether that owner already has its own presentation clip. Only 2 of 31 misroute targets are actually free (no existing clip) — the rest are **duplicates**: the true owner already has a clip, so this is orphaned/duplicate audio, not a simple free repoint.

## Row-by-row table

| lego_id | verdict | severity | known_text (current) | clip says | → target lego (if MISROUTE) |
|---|---|---|---|---|---|
| S0269L01 | REAL-STALE | HIGH | to wait for your father | "wait for" / "he said he can wait for us" | — content not found anywhere in course; orphaned text |
| S0049L02 | REAL-MISROUTE | HIGH | you see | "like this" | S0049L01 "like this" (**occupied** — already has its own clip) |
| S0063L02 | REAL-MISROUTE | HIGH | sure | "mind" / "are you sure you don't mind?" | S0063L03 "it doesn't bother you" (**occupied**) |
| S0166L01 | FP-PARAPHRASE | — | is not very | "my name is not very unusual" (own seed's own use-phrase, verbatim) | — |
| S0044L03 | REAL-MISROUTE | HIGH | to improve | "I need to" / "or if I need to improve" | S0044L02 "I need to" (**FREE** — no clip currently) |
| S0276L01 | REAL-STALE | LOW | to stay | "stay" / "I'd like to stay here a bit longer" | headword fine (own lego); example text not found anywhere current — edited example, own lego, meaning preserved |
| S0220L01 | REAL-MISROUTE | HIGH | watched | "a bit of" | S0220L03 "a bit of" (**occupied** — but see below, that clip is itself misrouted) |
| S0184L02 | REAL-STALE | HIGH | the office | "a while ago" / "I think I saw that a while ago" | no dedicated owner; "office" word never appears in the spoken content at all |
| S0172L01 | REAL-STALE | LOW | that would help | "that would be very helpful" (own seed's own use-phrase, "yes" dropped) | own lego, intensifier drift only |
| S0226L01 | FP-PARAPHRASE | — | the man | "man" / "the man is trying to help me" — headword = own known_text (article dropped); example is a seed-context use sentence | — |
| S0232L01 | FP-EQUIV | — | an old woman | "old woman" — article dropped | — |
| S0190L02 | REAL-MISROUTE | HIGH | I ask you | "some questions" | S0190L03 "some questions" (**occupied**) |
| S0171L01 | REAL-MISROUTE | HIGH | I help you | "do you want me to" / "do you want me to help you look for it?" (verbatim = L2's own use-phrase) | S0171L02 "to search for" (**occupied**) |
| S0084L02 | REAL-MISROUTE | HIGH | my | "what he said" / "I want to think about what he said" | S0084L01 "what he said" (**occupied**) |
| S0168L01 | REAL-MISROUTE | HIGH | to come | "and then" / "and then I'll wait" | S0221L02 "and then" (**occupied** — different seed entirely; the "I'll wait" tail doesn't match anything, further drift on top of the misroute) |
| S0046L02 | REAL-MISROUTE | HIGH | to make | "making mistakes" / "but I don't worry about making mistakes" (verbatim = own seed's L3 use-phrase) | S0046L03 "mistakes" (**occupied**) |
| S0194L01 | FP-EQUIV | — | you look for | "you are looking for" — simple→continuous tense variant, same lego | — |
| S0234L03 | FP-PARAPHRASE | — | your brother | "brother" / "I met your brother last night who wanted to tell me something" — headword = own known_text; example not found verbatim but no other lego claims it | — |
| S0167L01 | FP-PARAPHRASE | — | you need | "what do you need to do tomorrow afternoon" (verbatim = own seed's own use-phrase) | — |
| S0220L03 | REAL-MISROUTE | HIGH | a bit of | "television" | S0220L04 "television" (**occupied**) — this confirms the S0220L01→L03 chain above: L01's clip belongs at L03, L03's *current* clip belongs at L04 |
| S0053L03 | REAL-MISROUTE | HIGH | his letter | "in" / "I am going to put this in the bag" | S0053L04 "in her bag" (**occupied**) — "in"/"bag" are literally L04's taught components |
| S0299L01 | FP-EQUIV | — | to pay | "pay" — infinitive marker dropped | — |
| S0090L01 | REAL-STALE | HIGH | would be | "a little more slowly" / "I'm going to speak a little more slowly now" | no clean owner — closest thematic match is S0061L03 "slowly" (already occupied); not exact anywhere |
| S0208L01 | FP-PARAPHRASE | — | to ask you | "I didn't want to ask you" (own known_text embedded as prefix of own seed's L2 use-phrase, correctly truncated before not-yet-taught vocabulary) | — |
| S0058L02 | REAL-MISROUTE | HIGH | you understand | "enough" | S0058L03 "enough words" — "enough" is a listed component of L3 (**occupied**) |
| S0243L01 | REAL-MISROUTE | HIGH | to ask | "to eat" / "I need to eat something before I go" | S0243L02 "to eat" (**occupied**) |
| S0170L02 | FP-PARAPHRASE | — | you have a need | "you have" — a listed component of this SAME lego | — |
| S0207L02 | FP-PARAPHRASE | — | you needed | "what you needed to do" (prefix of own lego's own use-phrase "you've done what you needed to do") | — |
| S0191L01 | REAL-MISROUTE | HIGH | that bothers me | "no I don't mind at all" (verbatim = own seed's L2 use-phrase) | S0191L02 "at all" (**occupied**) — meaning is near-opposite of known_text ("doesn't bother" vs "bothers me") |
| S0083L03 | FP-PARAPHRASE | — | your | "about your" / "I don't understand about your friend here" — combines L2("regarding"/about)+L3("your") own-seed component buildup | — |
| S0293L02 | FP-PARAPHRASE | — | where he's going to meet me | "he's going to meet me" — a listed component of this SAME lego | — |
| S0209L03 | REAL-STALE | LOW | to meet as a group | "meeting" | bare gerund not taught anywhere as its own concept; same root verb, no other lego claims it |
| S0251L01 | FP-PARAPHRASE | — | to know it | "find out" — a synonym pairing that's part of this lego's own build set ("I want to find out" is L1's own build phrase) | — |
| S0220L02 | FP-EQUIV | — | to watch | "watch" — infinitive marker dropped | — |
| S0177L01 | REAL-STALE | HIGH | where she wants | "I'll ask her" / "I'll ask her tomorrow morning" | closest match S0136L01 "to ask her" (**occupied**, different seed) — not exact anywhere; no clean single owner |
| S0224L01 | REAL-MISROUTE | HIGH | he's just | "has just" (verbatim = a listed component of a different seed's lego) | S0228L01 "has just started" (**occupied**, different seed) |
| S0223L01 | FP-PARAPHRASE | — | he's going to ask you | "he's going to ask you tomorrow" (verbatim = own lego's own use-phrase) | — |
| S0241L01 | FP-PARAPHRASE | — | give him | "it to him" / "Can you give it to him before I arrive?" — combines this lego's own listed components ("to him"+"to give") | — |
| S0248L02 | REAL-MISROUTE | HIGH | to get back | "rubbish" | S0248L01 "rubbish" (**occupied**) |
| S0210L03 | REAL-MISROUTE | HIGH | to discuss | "the problem" | S0210L04 "the problem" (**occupied**) |
| S0071L02 | REAL-MISROUTE | HIGH | anyone | "to let" / "we didn't want to let anyone hear the truth" (example is the seed's own L4 use-phrase, but headword itself = a different lego's known_text) | S0071L01 "to let" (**occupied**) |
| S0201L02 | FP-PARAPHRASE | — | what was going to | "we wanted to know" — own-seed buildup (L1 "we wanted" + connective "to know"), no other lego claims it | — |
| S0270L02 | REAL-MISROUTE | HIGH | to be late | "I'm worried that" / "because I'm worried that I'm going to be late" — the example is verbatim this lego's OWN use-phrase, but the headword is L1's known_text | S0270L01 "I'm worried" (**FREE** — no clip currently) |
| S0011L02 | FP-PARAPHRASE | — | to be able to | "I'd like to be able to" (verbatim = own lego's own build-phrase — legitimate incremental buildup on already-taught L1) | — |
| S0281L01 | REAL-MISROUTE | HIGH | I finish | "coffee" | S0281L02 "my coffee" — "coffee" is a listed component of L2 (**occupied**) |
| S0011L03 | REAL-MISROUTE | HIGH | you've finished | "after you finish" / "I'd like to be able to speak after you finish" — headword opens with "after," which is L4's own known_text, not L3's | S0011L04 "after" (**occupied**) |
| S0199L02 | FP-PARAPHRASE | — | an office | "in an office" / "I was thinking he used to work in an office" — own-seed natural buildup (L1 "used to work" + L2 "an office") | — |
| S0263L01 | REAL-MISROUTE | HIGH | I have no idea | "who you mean" / "I think I know who you mean" (near-exact to own seed's L2 use-phrase "I don't know who you mean") | S0263L02 "of whom" (**occupied**) — near-opposite meaning from known_text ("no idea" vs "I think I know") |
| S0227L01 | FP-PARAPHRASE | — | that man | "that man is going to tell me something new" (verbatim = own lego's own use-phrase) | — |
| S0035L01 | FP-PARAPHRASE | — | she doesn't want anything | "nothing" — a listed component of this SAME lego | — |
| S0089L01 | FP-PARAPHRASE | — | done | "I've done" (verbatim = own lego's own build-phrase) | — |
| S0183L01 | FP-PARAPHRASE | — | I haven't seen them | "them" / "I can take them" — "them" is a listed component of this SAME lego; the illustrative sentence is generic/unmatched but not contradictory | — |
| S0253L01 | FP-PARAPHRASE | — | I should be ready | "I should be ready in a few minutes" (verbatim = own lego's own use-phrase) | — |
| S0232L02 | FP-PARAPHRASE | — | who can | "can" — a listed component of this SAME lego | — |
| S0289L01 | FP-PARAPHRASE | — | I wonder | "I wonder if" / "I wonder if she's going to be there this afternoon" (verbatim = own lego's own use-phrase) | — |
| S0042L02 | FP-PARAPHRASE | — | than yesterday evening | "last night" / "I was starting to feel better than last night" (verbatim = own lego's own use-phrase — "last night" is a colloquial synonym-choice variant used in this course's own "use" tier for "yesterday evening") | — |
| S0247L01 | REAL-MISROUTE | HIGH | I thought | "I thought that book was fairly good" (verbatim = a DIFFERENT lego's own use-phrase, requiring vocabulary — "that book was"/"fairly good" — not yet taught at this lego's position) | S0247L03 "fairly good" (**occupied**) |
| S0252L01 | FP-PARAPHRASE | — | you'll be | "will you be" (truncated prefix of own lego's own use-phrase "when will you be ready?") | — |
| S0291L01 | FP-PARAPHRASE | — | to speak better | "I hope I'll be able to" (truncated prefix of own lego's own use-phrase "I hope I'll be able to speak better soon") | — |
| S0295L01 | REAL-MISROUTE | HIGH | I didn't say | "in a day" / "I hope I'll be able to finish in a day" | S0295L02 "in a day" (**occupied**) |
| S0285L01 | FP-PARAPHRASE | — | she speaks | "she speaks French" (verbatim = own lego's own use-phrase) | — |
| S0251L02 | FP-PARAPHRASE | — | before we finish | "finish" — close variant of a listed component ("we have finished") of this SAME lego | — |
| S0186L01 | REAL-MISROUTE | HIGH | to talk about | "something different" | S0186L02 "something different" (**occupied**) |
| S0054L02 | FP-PARAPHRASE | — | to give you | "to give" / "I don't want to give the letter to someone else" — headword is a listed component of this SAME lego; example content is drifted/not found verbatim but not contradictory | — |
| S0027L03 | REAL-MISROUTE | HIGH | too much time | "for" | S0027L04 "for" (**occupied**) |
| S0052L04 | FP-PARAPHRASE | — | to his friend | "friend" / "she wants to help her friend" — headword is a listed component of this SAME lego; example ("help"/"her") is drifted, not found verbatim, but not contradictory | — |
| S0230L01 | REAL-MISROUTE | HIGH | a young man | "I know a young man who wants to work with you" (verbatim = a DIFFERENT lego's own use-phrase, requiring "who wants" vocabulary not yet taught at this lego's position) | S0230L02 "who wants" (**occupied**) |
| S0147L03 | REAL-MISROUTE | HIGH | nervous | "she saw me" | S0147L02 "she saw me" (**occupied**) |
| S0279L01 | FP-PARAPHRASE | — | because there wasn't | "was left" — a listed component of this SAME lego | — |
| S0146L02 | REAL-STALE | HIGH | since | "since we tried" / "since we tried, everything is okay now" | headword pulls in "we tried" (a different, later lego's territory) and the example text doesn't exist verbatim anywhere; no clean single owner |
| S0152L03 | FP-PARAPHRASE | — | I had known | "if I had known" (own lego's own build family, "if" prefix added) | — |
| S0200L02 | REAL-MISROUTE | HIGH | to make sure | "they want" / "they want something" — "they want" is a listed component of a different lego | S0200L01 "they say that they want" (**occupied**) |
| S0198L01 | FP-PARAPHRASE | — | my daughter | "daughter" / "I know my daughter" — headword is a listed component of this SAME lego | — |
| S0181L01 | REAL-MISROUTE | HIGH | my mother | "to take" / "I think we need to take someone" | S0181L02 "I take" (**occupied**) |
| S0059L02 | FP-PARAPHRASE | — | next week | "I need to do" (truncated prefix of own lego's own use-phrase "I know how to do what I need to do next week") | — |
| S0089L02 | REAL-MISROUTE | HIGH | so much | "in a short time" | S0089L03 "a short time" (**occupied**) |
| S0179L01 | REAL-STALE | HIGH | sunday afternoon | "you are going to" | not a listed component or build-phrase anywhere for this seed or elsewhere; headword completely disconnected from known_text |

## Counts

- REAL-MISROUTE: 31
- REAL-STALE: 9
- FP-PARAPHRASE: 33
- FP-EQUIV: 4
- **Total: 77** (matches input file row count)

Severity split for the 40 REAL rows: 38 HIGH, 2 LOW (S0276L01, S0209L03 — both are minor wording/word-form drift on the correct lego, not contradictions) plus S0172L01 (LOW) — 3 LOW total, 37 HIGH.

## Rows I did NOT individually read

None. All 77 rows were read, and each was traced against the full `course_legos` + `course_practice_phrases` tables for `fra_ca_for_eng` (1,366 legos / 12,887 phrases), first within the flagged row's own seed, then course-wide where no in-seed match existed.

## Gap / limitation, honestly

`word_boundaries` is NULL on effectively all 77 clips, so I could not force-align audio to confirm exactly what was spoken — I relied on `course_audio.text` as ground truth per the brief. Where a clip's exact text string could not be matched verbatim anywhere in the current phrase bank (marked REAL-STALE above, and a few REAL-MISROUTE targets), I'm reporting the closest traceable evidence, not a confirmed byte-exact source; those calls are my best trace, not a certainty.

## New false-positive class found

**FP-PARAPHRASE via "cumulative seed buildup / component-teaching," not caught by the brief's original two FP categories as literally worded.** This course's presentation-clip style routinely narrates:
1. a **listed component** of the SAME lego (`course_practice_phrases.phrase_role='component'`) instead of the lego's full `known_text` (e.g. "coffee" for "my coffee", "nothing" for "she doesn't want anything"), or
2. an **incremental buildup headword** that prepends already-taught prior-lego text to the new lego's own text (e.g. "I'd like to be able to" = L1 "I'd like" + L2 "to be able to"), or
3. the lego's own **exact "use"-tier practice-phrase text** verbatim, used as the full "headword" with no separate "as in" clause (single-quote style).

All three produce a headword that literally differs from `known_text` (the detector's trigger) but trace cleanly to the SAME lego's own authored content, with no learner-visible mismatch. **To implement:** before flagging a headword mismatch as real, check whether the quoted content (a) equals a `course_practice_phrases` row with `phrase_role='component'` under the SAME `seed_number`+`lego_index`, or (b) is a prefix/suffix concatenation of the SAME seed's already-taught prior-lego `known_text` values, or (c) exact-matches a `course_practice_phrases` row (any role) tagged to the SAME `lego_index`. Any of these three should suppress the flag as FP-PARAPHRASE rather than routing to REPOINT_FREE/RERENDER.

**Distinguishing signal for a genuine REAL-MISROUTE within this same pattern:** when the exact-matching `course_practice_phrases` row is tagged to a **DIFFERENT** `lego_index` in the same seed (not the flagged one) — especially when that content requires vocabulary from a *later* lego that hasn't been introduced yet at the flagged lego's position (e.g. S0247L01 "I thought" narrating the L3 sentence "I thought that book was fairly good," which needs L2/L3 vocabulary) — that's a real misroute, not a paraphrase, because the announced content is materially advanced/foreign relative to what the learner has been taught at that point.

**Also worth flagging separately:** of the 31 REAL-MISROUTE rows, only 2 (S0044L03→S0044L02, S0270L02→S0270L01) have a target lego that currently has NO presentation clip at all — a clean, free repoint. The other 29 misroute targets already have their own (presumably correct) presentation clip, meaning the flagged row's audio is a **duplicate/orphaned clip**, not a same-audio-just-relink case — repointing would need to decide what happens to the flagged row's own slot afterward (leave empty for re-render, or something else). That's a scoping decision beyond READ-ONLY analysis.
