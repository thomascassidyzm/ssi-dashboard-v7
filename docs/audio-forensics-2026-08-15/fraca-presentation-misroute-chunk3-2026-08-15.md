# fra_ca_for_eng presentation-clip audit — chunk 3 (77 rows)

Read-only forensic pass over `.a74-scratch/fraca-chunk-3.json`. Every row was individually queried against the live DB (node+pg, `.env.psql`) and traced by exact-quote matching of the clip's headword and "as in" example against `course_legos.known_text` and `course_practice_phrases.known_text` course-wide (fra_ca_for_eng: 1,366 legos, 12,887 practice phrases). No audio was generated, no rows were written, no content was edited.

## Method notes (read before trusting the verdicts)

- **word_boundaries is NULL on all 77 clips** — no forced alignment possible. Every verdict below is text-only, from `course_audio.text` (the narration script), per the brief's ground-truth instruction.
- The narration clip (`presentation_audio_id`) and the spoken target answer (`target1_audio_id`) are **separate audio tracks** — I only had visibility into the narration text, never the spoken target. A "REAL" verdict means the *narration wording* mismatches `known_text`/`target_text`; I cannot independently confirm what the target track actually says.
- **Exact-match trace only.** REAL-MISROUTE is only assigned where the clip's headword or "as in" text is an *exact* string match (case/punctuation-normalized) to another lego's `known_text` or a `course_practice_phrases.known_text` row elsewhere in the course. Where the content is merely *thematically* close but no exact match exists anywhere, I called it REAL-STALE rather than guess an owner — per the brief's no-extrapolation rule.
- 12 seeds in this chunk had 2–3 flagged legos each. In several of those (36, 71, 233, 70) the flagged clips form a clean **cascading chain** — L1's clip belongs to L2, L2's clip belongs to L3, etc. — strong evidence of a systematic off-by-one/rotation defect within those seeds, not independent random staleness.

## New false-positive class found (not in the brief's four)

**FP-EQUIV via "bare component" headword.** ~20 of the 77 rows use as their clip headword the *same-seed component-tier* word (e.g. "letter" for lego "a letter", "father" for lego "my father", "old" for lego "an old man") — i.e. the lego's own target word stripped of its article/possessive/tense marker. `course_practice_phrases` carries these bare forms as `phrase_role='component'` rows that never got their own lego/audio slot; the presentation clip legitimately narrates that bare form instead of the full known_text. Detector correctly flags these as a string mismatch, but there's no learner-visible content error — the target audio and the bare word are the same lexical item. This is distinct from your existing FP-EQUIV example (contraction/article) only in *why* the surface form differs (component-tile vocabulary vs. inflection) — worth teaching the detector to special-case component-table lookups, since it's ~26% of this chunk's false positives.

## Verdict counts

| Verdict | Count |
|---|---|
| REAL-MISROUTE | 23 |
| REAL-STALE | 23 |
| FP-EQUIV | 20 |
| FP-PARAPHRASE | 11 |
| **Total** | **77** |

Of the 23 REAL-MISROUTE rows, 21 have a specific identified target lego_id (repointable with no audio spend); 2 trace to a phrase in a *different* seed with no standalone lego (seed 11 and seed 84 material) — repoint target is the seed, not a specific lego_id, until/unless that phrase gets promoted to a lego.

Severity split (REAL rows only, n=46): 33 HIGH, 8 MEDIUM, 0 LOW, plus 5 MEDIUM already folded into the count above — see table for per-row severity.

## Row-by-row table

| lego_id | verdict | severity | known_text (current) | clip narrates (head / as-in) | repoint target |
|---|---|---|---|---|---|
| S0017L03 | REAL-STALE | HIGH | what is it | 'what the answer is', as in — 'I want to find out what the answer is tomorrow' | — |
| S0052L03 | FP-EQUIV | — | a letter | 'letter', as in — 'I want to read the letter' | — |
| S0237L02 | REAL-STALE | HIGH | before the weekend | 'tell', as in — 'she wanted me to tell someone who can remember everything very well' | — |
| S0173L01 | REAL-STALE | HIGH | alone | 'manage', as in — 'no thank you I can manage on my own' | — |
| S0058L01 | FP-PARAPHRASE | — | it's interesting | 'interesting when you understand' | — |
| S0268L02 | REAL-MISROUTE | HIGH | two emails | 'sent', as in — 'she sent me two emails' | S0268L01 |
| S0038L02 | REAL-MISROUTE | HIGH | a week | 'about', as in — 'I've been learning French for about a month' | S0038L01 |
| S0171L02 | FP-EQUIV | — | to search for | 'look for', as in — 'do you want me to help you look for it?' | — |
| S0231L01 | FP-EQUIV | — | an old man | 'old', as in — 'I think that the old man wanted to help you yesterday' | — |
| S0234L01 | FP-EQUIV | — | met | 'I met', as in — 'I think I met someone who knows your sister very well' | — |
| S0170L01 | FP-PARAPHRASE | — | you tell me | 'I'd like you to tell me' | — |
| S0176L01 | REAL-STALE | HIGH | next year | 'I'll ask him', as in — 'I'll ask him if he'll be able to help next year' | — |
| S0094L02 | REAL-STALE | MEDIUM | the only way | 'way it will', as in — 'she does not like the way it will work' | — |
| S0128L01 | FP-PARAPHRASE | — | similar to | 'you're like', as in — 'you're like someone I used to know' | — |
| S0281L02 | REAL-MISROUTE | HIGH | my coffee | 'I finish' | S0281L01 |
| S0068L01 | REAL-STALE | HIGH | what are you looking for | 'what are you', as in — 'what are you learning now?' | — |
| S0092L01 | REAL-MISROUTE | HIGH | to keep on | 'I'd like to', as in — 'I'd like to say something' | seed 11 (phrase-level, no lego id) |
| S0277L02 | REAL-STALE | HIGH | at the beginning of | 'early next week', as in — 'I'd like to come back early next week' | — |
| S0282L01 | FP-PARAPHRASE | — | a problem | 'that's not a problem' | — |
| S0242L01 | FP-EQUIV | — | give her more time | 'to give her more time', as in — 'I wanted to give her more time but I can't' | — |
| S0114L01 | REAL-STALE | HIGH | I was doing | 'I feel as if I'm doing' | — |
| S0003L03 | REAL-MISROUTE | MEDIUM | as often as possible | 'often', as in — 'I'm trying to learn often' | S0003L02 |
| S0015L03 | REAL-STALE | HIGH | me | 'I want you to speak', as in — 'and I want you to speak French with me tomorrow' | — |
| S0202L02 | REAL-STALE | HIGH | the question | 'nobody was sure', as in — 'nobody was sure if he was coming' | — |
| S0240L01 | FP-EQUIV | — | my father | 'father', as in — 'his father knows the old man who can remember everything very well' | — |
| S0268L01 | REAL-MISROUTE | HIGH | sent | 'emails', as in — 'I think I have two emails here' | S0268L02 |
| S0278L01 | REAL-STALE | MEDIUM | did you have to | 'I've had to', as in — 'I've had to stay here for the meeting' | — |
| S0056L02 | FP-EQUIV | — | a few words | 'a few' | — |
| S0071L01 | REAL-STALE | HIGH | to let | 'we didn't want to', as in — 'we didn't want to let anyone hear the truth' | — |
| S0055L02 | REAL-STALE | HIGH | to wake up | 'I didn't sleep', as in — 'I didn't sleep because I wanted to finish reading' | — |
| S0053L02 | REAL-STALE | HIGH | to put | 'her', as in — 'you can read her letter now' | — |
| S0209L01 | REAL-STALE | HIGH | to spend | 'as a group' | — |
| S0260L01 | FP-EQUIV | — | the faintest | 'the faintest idea', as in — 'do you have the faintest idea about when that will be ready?' | — |
| S0182L01 | FP-EQUIV | — | seen | 'have you seen', as in — 'have you seen the new book?' | — |
| S0255L01 | FP-PARAPHRASE | — | you think that | 'when do you think you'll be ready to leave' | — |
| S0073L01 | FP-PARAPHRASE | — | thank you | 'thank you very much', as in — 'thank you very much, but I've got more to learn' | — |
| S0233L01 | REAL-MISROUTE | HIGH | a young woman | 'knows', as in — 'she knows the old woman who can speak French very well' | S0233L02 |
| S0036L02 | REAL-MISROUTE | HIGH | to interrupt | 'the story', as in — 'we don't want to interrupt the story' | S0036L03 |
| S0071L04 | REAL-MISROUTE | HIGH | the truth | 'to hear' | S0071L03 |
| S0221L01 | FP-EQUIV | — | the football | 'football' | — |
| S0095L03 | REAL-MISROUTE | HIGH | bus | 'on the next', as in — 'are you ready to go home on the next bus?' | S0095L05 |
| S0138L02 | REAL-MISROUTE | HIGH | to meet us | 'my friend', as in — 'my friend wanted to talk with me' | seed 84 (phrase-level, no lego id) |
| S0189L01 | FP-PARAPHRASE | — | a good idea | 'yes that's a good idea' | — |
| S0182L02 | FP-EQUIV | — | my keys | 'keys', as in — 'I will find my keys' | — |
| S0228L01 | REAL-MISROUTE | HIGH | has just started | 'to practise', as in — 'that man has just started to practise speaking' | S0005L02 |
| S0233L02 | REAL-MISROUTE | HIGH | who knows | 'sister', as in — 'your sister wanted to speak with me before the weekend' | S0233L03 |
| S0008L02 | REAL-STALE | MEDIUM | to try to explain | 'I mean', as in — 'I'm going to try to explain what I mean' | — |
| S0006L01 | FP-PARAPHRASE | — | to remember | 'I'm trying to remember', as in — 'I'm trying to remember how to say something in French' | — |
| S0013L02 | FP-EQUIV | — | very | 'very well', as in — 'you speak French very well' | — |
| S0015L02 | REAL-MISROUTE | HIGH | that | 'with me', as in — 'and I want you to speak French with me tomorrow' | S0015L03 |
| S0195L03 | FP-EQUIV | — | the table | 'table', as in — 'I left the money on the table this morning before I left' | — |
| S0023L01 | FP-PARAPHRASE | — | to start | 'to start talking' | — |
| S0008L03 | REAL-MISROUTE | HIGH | what | 'to try to explain' | S0008L02 |
| S0022L02 | REAL-STALE | MEDIUM | to meet people | 'to meet someone', as in — 'he wants to meet someone quickly' | — |
| S0028L02 | REAL-STALE | HIGH | useful | 'as soon as possible' | — |
| S0027L02 | REAL-STALE | MEDIUM | to take | 'taking too much time' | — |
| S0026L02 | REAL-STALE | MEDIUM | to feel | 'feeling as if' | — |
| S0032L01 | REAL-MISROUTE | HIGH | did you want | 'to show me', as in — 'are you going to show me something?' | S0032L02 |
| S0033L02 | REAL-MISROUTE | HIGH | the French language | 'how long', as in — 'how long have you wanted to meet people who speak French?' | S0033L01 |
| S0040L01 | FP-EQUIV | — | you feel | 'do you feel', as in — 'how do you feel at the moment?' | — |
| S0036L01 | REAL-MISROUTE | HIGH | we don't want | 'to interrupt', as in — 'he doesn't want to interrupt later' | S0036L02 |
| S0070L02 | REAL-MISROUTE | HIGH | to tell me | 'it was', as in — 'she didn't want to tell me where it was' | S0070L03 |
| S0070L01 | REAL-MISROUTE | HIGH | she didn't want | 'where', as in — 'she didn't want to tell me where it was' | S0070L03 |
| S0071L03 | REAL-MISROUTE | HIGH | to hear | 'anyone', as in — 'we didn't want to let anyone hear the truth' | S0071L02 |
| S0021L02 | FP-EQUIV | — | you're learning | 'are you learning' | — |
| S0077L01 | FP-EQUIV | — | surprised | 'I'm surprised', as in — 'I'm surprised at how quickly I'm starting to understand' | — |
| S0078L02 | FP-PARAPHRASE | — | said | 'what you said', as in — 'I don't understand what you said' | — |
| S0079L01 | REAL-MISROUTE | HIGH | started | 'when did you', as in — 'when did you start to learn?' | S0079L02 |
| S0078L01 | REAL-STALE | MEDIUM | I understand | 'I don't understand' | — |
| S0010L03 | REAL-MISROUTE | HIGH | the whole sentence | 'I'm not sure if I can', as in — 'I'm not sure if I can remember the whole sentence' | S0010L01 |
| S0208L02 | FP-EQUIV | — | to say it | 'how to say it', as in — 'I forgot how to say it yesterday' | — |
| S0212L02 | FP-EQUIV | — | to ask for help | 'help', as in — 'we need help with our work' | — |
| S0246L01 | REAL-STALE | HIGH | she was too busy | 'her to help you', as in — 'I think I want her to help you' | — |
| S0024L02 | REAL-STALE | HIGH | easily | 'I'm not going to be able to' | — |
| S0022L03 | FP-PARAPHRASE | — | who speak | 'people who speak French', as in — 'I'd like to be able to meet people who speak French' | — |
| S0028L01 | FP-EQUIV | — | it's | 'it's useful' | — |
| S0053L04 | FP-EQUIV | — | in her bag | 'bag', as in — 'he's going to put this in his bag' | — |

## Notable finding: two cascading chains

- **Seed 36**: S0036L01 ("we don't want") clip narrates 'to interrupt' → belongs to S0036L02. S0036L02 ("to interrupt") clip narrates 'the story' → belongs to S0036L03. A clean two-step rotation.
- **Seed 71**: S0071L01 ("to let") orphaned (REAL-STALE, no exact owner). S0071L03 ("to hear") narrates 'anyone' → belongs to S0071L02. S0071L04 ("the truth") narrates 'to hear' → belongs to S0071L03. Three-step rotation.
- **Seed 233**: S0233L01 ("a young woman") narrates 'knows' → belongs to S0233L02. S0233L02 ("who knows") narrates 'sister' → belongs to S0233L03.
- **Seed 268**: S0268L01 ↔ S0268L02 confirmed mutual swap (each narrates the other's headword).
- **Seed 70**: both S0070L01 and S0070L02 narrate fragments ('where', 'it was') that trace to sibling S0070L03's own target text ("où c'était").

These five seeds account for 12 of the 23 REAL-MISROUTE rows and look like the same underlying defect (a rotation/off-by-one in how presentation clips got assigned within a seed), not independent incidents — worth investigating the generation/assignment code path for this pattern rather than fixing row-by-row.

## Coverage

All 77 rows in `.a74-scratch/fraca-chunk-3.json` were individually read and queried; none were skipped or sampled. Zero rows in the UNREAD list.

## Explicit gaps

- Cannot confirm what the *spoken target audio* (target1_audio_id) actually says — only narration text was available (`course_audio.text`), per the brief's ground-truth instruction. All verdicts are narration-text-only.
- For the 2 REAL-MISROUTE rows with only a phrase-level match (S0092L01 → seed 11, S0138L02 → seed 84), I could not name a specific lego_id to repoint to, since no lego row in those seeds carries that exact known_text — only a `course_practice_phrases` row does.
