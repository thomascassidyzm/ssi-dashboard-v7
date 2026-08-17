# lmo_for_eng blind alignment — seeds 1–30 (independent, read-only)

**Scope respected:** read `course_seeds` only (`course_code='lmo_for_eng'`, seeds 1–30, columns `known_text`/`target_text`). I did **not** read `course_legos` or `course_practice_phrases` — this alignment is produced blind to your own decomposition, as requested. No writes, no audio, nothing submitted.

Full data: [`alignment.json`](.a108-lmo-align/alignment.json) — 30 seeds, word/chunk-level pairs, `unaligned_lmo`/`unaligned_eng` lists, honest confidence per pair.

Apostrophes were treated as letters throughout (`lè`, `l'è`, `ghabbia`/`gh'abbia`, `domandatt`) — never stripped for token comparison.

---

## 1. Consistency across the 30 seeds

### Legitimate variation (same token, different English gloss — for a real grammatical reason)

| Lombard token | Glosses seen | Seeds | Why it's legitimate |
|---|---|---|---|
| `parlà` | speak / to speak / speaking / talking | 1,3,5,11,13,14,15,19,23,28 | Lombard has one verb where English splits speak/talk; infinitive also covers the gerund slot |
| `pussee` | as (comparative) / more / later (in `pussee tard`) | 3,7,16,23 | `pussee` = bare comparative "more"; English realisation depends on the surrounding idiom (as...as / later / plain more) |
| `che` | than / that / which / who / (unaligned in dopo che / prima che / quala che) | 3,7,8,11,12,17,22,25 | `che` is a general-purpose relative/complementizer/comparative particle, same as Italian `che` — genuinely multi-functional |
| `de` | of / to / if / (unaligned) | 5,9,10,19,25,29 | Bare linking preposition; its English shadow (if any) is supplied by the governing verb/idiom, not by `de` itself |
| `a` | to / (unaligned) | 2,6,8,17,20,23,26,27,28 | Linking particle before infinitives; sometimes surfaces as "to", sometimes fully absorbed into an idiom |
| `minga` | not / n't / wouldn't / (unaligned, idiomatic) in seed 29 | 7(no),10,12,19,24,27,29 | Standard negator except inside the fixed idiom `vedi minga l'ora` ("I can't wait"), where the idiom as a whole is positive in English |
| `sò` | his (seed 20) / her (seed 21) | 20,21 | Gender-neutral 3rd-person possessive — agrees with the possessed noun, not the possessor, standard Romance pattern |
| `perchè` | why (seed 21) / because (seed 22) | 21,22 | Genuinely dual-function word, same as Italian `perché` |
| `el` | "the" (14,20,21,28→`l'`) / "he" (16, `el voeur`) | 14,16,20,21,28 | Masculine article and 3sg subject clitic happen to share the spelling `el`; distinct grammatical function each time, not an error |
| `con`/`cont` | with | 1,5,15,16 | `cont` before a vowel-initial word (seed 5, `cont on`), `con` before a consonant elsewhere — regular liaison |
| `te`/`tì`, `me`/`mì` | you / me | throughout | `te`/`me` = clitic (subject/object) forms; `tì`/`mì` = tonic forms used after a preposition (`con tì`, `con mì`) — a real, correct distinction, not inconsistency |

### Cases that could look like an error but I judge are not

- **`dree a` (progressive marker)** appears in seeds 2, 6, 21 always glossed onto English `-ing` (trying/trying/learning) and always paired with a present-tense form of "to be" (`son`/`son`/`seet`) — internally consistent.
- **`minga` unaligned in seed 29** stands out against `minga`=not everywhere else, but it's inside one fixed idiom (`vedi minga l'ora`) — not free variation, so I'm treating it as legitimate rather than flagging it as drift. Still worth your eyes since it's the one case where the same word means opposite things (negator vs. no-op) depending on context.

### Nothing found that looks like a genuine slicing-type error at the seed (whole-sentence) level

Since I only had access to whole known/target sentence pairs, not your LEGO-level card boundaries, I could not directly observe the "one side sliced from a different word" defect you described — that defect lives in how a sentence gets *cut into cards*, which is exactly the layer I was blocked from reading. What I can say: within every one of the 30 seeds, the known and target sentences correspond as whole units (same overall meaning, no seed where the target sentence looks like it belongs to a different known sentence). If the defect is present, it will show up as a mismatch between where MY word/chunk boundaries fall and where your card boundaries fall — that's the diff this alignment is for.

---

## 2. Low-confidence list (every low pair, with what I couldn't resolve)

| Seed | Eng | Lmo | Issue |
|---|---|---|---|
| 3 | as | pussee | Is "pussee" really carrying "as", or is the whole `pussee spess che se pò` one indivisible chunk for "as often as possible" with no clean word-by-word split? |
| 3 | as | che | Same construction; I can't tell if `che` truly maps to the second "as" or is just structural glue |
| 7 | to try | sforzamm | Does the "hard" sense belong to `sforzamm` alone, or is it distributed across `sforzamm` + `pussee che`? |
| 7 | as | pussee | Same doubt as seed 3, compounded by "hard" already possibly living in `sforzamm` |
| 7 | as | che | Same |
| 17 | to find | vegnì | Is `vegnì` "find" and `savè` "out", or is `vegnì a savè` one unsegmentable idiom for "find out"? I have no principled way to split it |
| 17 | out | savè | Same |
| 25 | Are...going to help | daret ona man | Idiom "give a hand" = "help" — I can't tell if a Lombard speaker would consider `ona man` (a hand) part of the verb phrase or a true direct object that happens to translate idiomatically |
| 29 | I'm looking | vedi | Fixed idiom `vedi minga l'ora de` = "I'm looking forward to" / "I can't wait to" — I could not find a defensible word-by-word split at all; treated the whole run as one block |
| 29 | forward | ora | Same idiom |

---

## 3. Questions for a native speaker (plain English, no software knowledge needed)

1. **Seed 2/6:** In "son dree a provà a imparà" (I'm trying to learn), does "dree a" by itself carry the "-ing" of "trying", separately from "provà" (try)? Or do "dree a provà" only mean "trying" together, as one inseparable unit?
2. **Seed 3/7:** In "pussee spess che se pò" (as often as possible) and "pussee che poss" (as...as I can), is "pussee" doing the work of the first "as", and "che" the second "as"? Or is it more accurate to say this whole phrase is just "more often than is possible" and English "as...as" is a loose translation rather than a word-for-word match?
3. **Seed 7:** In "sforzamm" (I try hard), is the idea of "hard" built into the word itself, or does it only become "hard" (rather than just "try") because of the "pussee che poss" that follows?
4. **Seed 17:** In "vegnì a savè" (find out), if you had to point to one word for "find" and one word for "out", could you? Or is that not how a Milanese speaker would think about it at all?
5. **Seed 20/21:** "sò nomm" is used for both "his name" and "her name" with the exact same word "sò". Can "sò" ever change form to specify the possessor's gender, or is it truly always the same regardless of whether the owner is male or female?
6. **Seed 21/22:** "perchè" is used for both "why" (a question) and "because" (an answer). Is there ever a different word for one or the other in casual Milanese speech, or are they genuinely always the same word?
7. **Seed 25:** "daret ona man" (literally "will give a hand") — is this a completely fixed expression for "help", or could a speaker use just "daret" (will give) alone to mean "help" in some contexts?
8. **Seed 26/27:** "me pias" (literally "to me it pleases") is used for "I like". Is there any everyday sense in which a Milanese speaker feels "me" as "to me" rather than as "I" — for example, would it feel odd to a learner if we taught it as "to-me-pleases" rather than as "I-like"?
9. **Seed 29:** "vedi minga l'ora de parlà" is glossed as "I'm looking forward to speaking". Literally this is "I don't see the hour of speaking" — could you confirm this is a completely fixed saying (like an English idiom), and that a learner should never try to build new sentences by swapping out pieces of it?
10. **Seed 16:** "i olter" is "the others"/"everyone else". Does "i" (the) always have to be there, or could a Milanese speaker drop it and still say "everyone else" naturally?

---

## Explicit gaps

- **Cannot check for the actual off-by-one slicing defect directly** — that requires `course_legos`/`course_practice_phrases` card boundaries, which I was deliberately kept off. This alignment gives you the independent word-mapping to diff against your own card cuts; it does not itself locate a slicing bug.
- Everything above is my own linguistic judgment from the sentence pairs alone, cross-checked against general Romance-language patterns (Italian, French) I know reasonably well but am not a native or fluent Lombard/Milanese speaker — hence the native-speaker question list above being a real deliverable, not a formality.

---

**Landing line:** no commits. Read-only task; output is `.a108-lmo-align/alignment.json` and `.a108-lmo-align/report.md`, uncommitted scratch files in this checkout on branch `docs/roh-for-eng-decomposition-2026-08-15`. Not merged, not deployed — nothing to merge or deploy for a read-only alignment exercise.
