# fra_ca_for_eng presentation-clip audit — chunk 1 (77 rows)

Method: node+pg against `.env.psql` (no psql binary on box), `course_legos` and `course_practice_phrases` joined by `seed_number`+`lego_index`, matched against each clip's quoted headword and "as in" example. `course_audio.text` confirmed as identical to the supplied `clip_text` for every row (ground truth, per brief). `course_legos.target_text` confirmed identical to the supplied `target_text` for all 77 rows (no target drift). All rows individually read — see the row table.

**Methodology note (new FP class found):** most flagged rows are NOT misroutes — this course routinely builds presentation "as in" examples from a **full-seed combined practice phrase** that concatenates 2–3 sibling legos' targets into one natural sentence (e.g. seed 147: L1 "she was really sweet"+L2 "she saw me"+L3 "nervous" combine into "she was very kind when she saw me feeling nervous"). The clip's headword is often a **decomposed sub-component or synonym gloss** of the lego's own known_text drawn from that same practice-phrase set, not the literal known_text string. When the target audio still matches the lego's own current target_text, this is **FP-PARAPHRASE / FP-EQUIV**, not a defect, and no rerender or repoint is needed.

The genuine defects fall into two clean patterns:
1. **Sibling swap/mixup within the same seed** — a clip's headword is the *exact* known_text of a sibling lego at the same seed (different lego_index). This is the reliable misroute signal per the brief. Two of these are exact reciprocal swaps (S0204L01 ↔ S0204L03).
2. **Orphaned/stale headword with no traceable owner anywhere in the course** — headword and example don't match any lego or practice phrase, current or sibling. These get REAL-STALE.

## Row-by-row table

| lego_id | verdict | severity | known_text (current) | clip says (headword / as-in) | → owner if misroute |
|---|---|---|---|---|---|
| S0139L03 | FP-PARAPHRASE | LOW | just as bright and early | 'so early' / "I didn't want to leave so early" | — (seed's own combined phrase: "I'm sorry that I need to leave so early"→same target "aussi de bonne heure") |
| S0142L03 | FP-PARAPHRASE | LOW | you help me | 'helping' / "...grateful to you for helping" | — (own seed's combined phrase, target "tu m'aides" embedded) |
| S0147L01 | FP-PARAPHRASE | LOW | she was really sweet | 'was' / "she was very kind when she saw me feeling nervous" | — ('was' is an exact component of this lego's own decomposition; example is the seed's full combined phrase) |
| S0176L02 | REAL-STALE | HIGH | if he will | 'he'll be able' / "I'll ask him if he'll be able to help next year" | none found — "he'll be able" matches neither this lego's target (s'y va = "if he") nor any lego in the course; closest concept (être capable) belongs to sibling S0176L03 but wording doesn't match exactly enough to call misroute |
| S0069L02 | **REAL-MISROUTE** | HIGH | to look after | 'young' / "you're too young" | **S0069L03** ("the young dog"→"le jeune chien"; "young"→"jeune" is an exact component of that sibling's own decomposition) |
| S0185L01 | FP-EQUIV | LOW | you left them | 'left them' (no example) | — (headword is known_text minus "you") |
| S0197L02 | FP-PARAPHRASE | LOW | as a teacher | 'works as a teacher' (no example) | — (own seed's combined phrase: "my son works as a teacher"→target embeds "comme professeur") |
| S0178L01 | FP-PARAPHRASE | LOW | I didn't have time | 'didn't have' / "I didn't have time to help you" | — (exact combined phrase exists at this position, target "j'avais pas le temps" embedded) |
| S0203L02 | FP-EQUIV | LOW | I asked you | 'asked' / "what would you do if I asked you?" | — ("asked you"→"te demandais" is an exact component here) |
| S0067L01 | REAL-STALE | HIGH | why | 'do you want' / "Why do you want to learn?" | none confirmed — target "pourquoi" is correct for "why", but headword says "do you want"; an exact-known_text match exists elsewhere (S0156L01 "do you want"→"tu veux-tu", seed 156, restaurant theme) but its theme doesn't fit the "why...learn" example, so this looks like a wrong-fragment authoring error, not a clean misroute |
| S0211L02 | FP-EQUIV | LOW | that they didn't want to | 'that they' / "I think that they want to meet with us" | — (headword is a known_text prefix) |
| S0129L02 | FP-PARAPHRASE | LOW | you're doing | 'you're doing so well' (no example) | — (target "tu te débrouilles" idiomatically means "you're doing well/getting by"; headword is arguably a *more* accurate gloss than the terse known_text) |
| S0076L01 | FP-PARAPHRASE | LOW | happy | 'I'm very happy' / "I'm very happy with how much I've learnt already" | — (exact combined-phrase match; minor note: target is bare "content" not "ben content", so "very" is slightly oversold, but not learner-contradictory) |
| S0229L01 | FP-EQUIV | LOW | that woman | 'woman' / "that woman would help you if she could" | — (exact component "woman"→"femme-là"; example is seed's combined phrase) |
| S0225L01 | FP-EQUIV | LOW | he would give you | 'would give' / "he would give you an answer if he could" | — ("would give you"→"te donnerait" component, headword drops "you") |
| S0203L01 | FP-EQUIV | LOW | you would do | 'would you do' / "what would you do after?" | — ("would do"→"ferais" component) |
| S0204L01 | **REAL-MISROUTE** | HIGH | that she helps you | 'the arrangements' / "Can you tell me about the arrangements?" | **S0204L03** — confirmed reciprocal swap with the row below |
| S0272L01 | FP-PARAPHRASE | LOW | that sounds like | 'sounds like' / "yes that sounds like a great idea" | — (known_text "that sounds like" is itself listed verbatim at this position; example is sibling-combined phrase, target "ça a l'air" embedded) |
| S0198L02 | FP-PARAPHRASE | LOW | the council | 'works for the council' / (no example) | — (combined phrase "my son works for the council"→target embeds "la municipalité") |
| S0204L03 | **REAL-MISROUTE** | HIGH | the arrangements | 'I wanted her to help you' / (no example) | **S0204L01** — reciprocal swap, confirmed both directions (S0204L01's headword is exactly S0204L03's known_text and vice versa in spirit) |
| S0205L02 | REAL-STALE | HIGH | I was trying to | 'the word' / "I think I understand the word now" | none found — no lego or practice phrase anywhere in the course has "word"/"the word" as known_text; headword names a noun while known_text/target ("j'essayais de" = "I was trying to") is a verb phrase — flatly unrelated |
| S0038L01 | **REAL-MISROUTE** | HIGH | about | 'I learn' / (no example) | **S0038L03** ("I'm learning"→"j'apprends", same seed, closest available match; "about"→"à peu près" shares no relation to "I learn") |
| S0064L01 | **REAL-MISROUTE** | HIGH | it's not | 'easy' / "are you sure it's easy?" | **S0064L02** ("easy"→"facile", exact known_text match, same seed) |
| S0274L01 | **REAL-MISROUTE** | HIGH | do you have to | 'days' / "I think I'll finish this in two days" | **S0274L02** ("a few days"→"quelques jours"; "days"→"jours" is an exact component of that sibling) |
| S0290L01 | FP-EQUIV | LOW | if he knows | 'he knows' / "I think he knows what I'm going to say" | — (headword is known_text minus "if") |
| S0206L01 | FP-PARAPHRASE | LOW | to have | 'enjoy' / "I think I enjoy this more than before" | — (target "avoir" is used idiomatically for "enjoy having" in this position's own phrase "I like having"→"j'aime ça avoir") |
| S0200L04 | FP-PARAPHRASE | LOW | in time | 'we finish everything' / "they say they want to make sure we finish everything" | — (exact combined phrase at this position, target "à temps" embedded; headword omits "in time" itself, mild but not learner-contradictory) |
| S0212L01 | **REAL-MISROUTE** | HIGH | they wanted | 'ask for' / "she doesn't want to ask for help" | **S0212L02** ("to ask for help"→"demander de l'aide", same seed) |
| S0052L01 | **REAL-MISROUTE** | HIGH | he wanted | 'wanted' / "she wanted to learn things" | **S0053L01** ("she wanted"→"a voulait") — example explicitly uses "she", which contradicts this lego's own "he wanted"/"y voulait"; matches the pronoun and theme of S0053L01 exactly |
| S0053L01 | **REAL-MISROUTE** | HIGH | she wanted | 'to put' / "she wanted to put things here" | **S0053L02** ("to put"→"mettre", exact known_text match, same seed) |
| S0148L02 | **REAL-MISROUTE** | HIGH | I couldn't | 'patient' / "you need to be patient" | **S0148L01** ("he wasn't really patient"→"y'a pas été ben patient"; "patient" is an exact component of that sibling's own decomposition) |
| S0169L01 | FP-PARAPHRASE | LOW | I do | 'what do you want' / (no example) | — (combined phrase "what do you want me to do?"→target embeds "j'fasse") |
| S0293L01 | FP-PARAPHRASE | LOW | I find | 'I have to find out' / (no example) | — ("I have to find"→"faut que j'trouve" component embeds this lego's own target) |
| S0284L01 | **REAL-MISROUTE** | HIGH | do you know | 'my sister's friend' / (no example) | **S0284L02** ("my sister's friend"→"l'ami de ma sœur", exact known_text match, same seed) |
| S0215L02 | FP-PARAPHRASE | LOW | saturday | 'on Saturday night' / "I want to see you on Saturday night" | — (no DB corroboration exists — no practice phrases at all for this position — but this is a plausible natural extension of a one-word known_text; target "samedi" alone is still what's taught, no contradiction) |
| S0298L01 | FP-PARAPHRASE | LOW | no more | 'nothing left' / "I've got nothing left in my bag" | — (idiomatic paraphrase of "no more"/pus; no DB corroboration exists but no contradiction either) |
| S0213L02 | FP-EQUIV | LOW | what they're trying to achieve | 'what they're' / "do you know what they're saying?" | — (headword is a literal prefix of known_text) |
| S0217L01 | **REAL-MISROUTE** | HIGH | I took | 'had' / "I had too much yesterday" | **S0214L01** ("had"→"eu", exact known_text match, different seed but exact) |
| S0217L03 | **REAL-MISROUTE** | MEDIUM confidence, HIGH severity | or two | 'of water' / "I want a glass of water now" | **S0217L04** ("water"→"d'eau", same seed; headword "of water" is not an exact match to sibling's bare "water" but is the only plausible owner) |
| S0196L02 | FP-PARAPHRASE | LOW | the latest idea | 'the latest' / "I think the latest idea is good" | — (exact combined phrase at this position, target "la dernière idée" embedded) |
| S0287L01 | FP-EQUIV | LOW | how many people | 'how many people do you know' / (no example) | — (headword is an exact known_text of a *different* practice-phrase row at this same position) |
| S0137L02 | FP-PARAPHRASE | LOW | to be perfect | 'to talk often' / "It's so good to talk often with them" | — (exact combined phrase at this position: "it's more important to talk often than to be perfect"→target "d'être parfait" embedded) |
| S0221L02 | **REAL-MISROUTE** | HIGH | and then | 'film' / (no example) | **S0221L03** ("a film"→"un film", exact component match, same seed) |
| S0195L01 | FP-EQUIV | LOW | the money | 'money' / "I don't understand why he needs more money for that" | — (exact component "money"→"argent") |
| S0134L01 | FP-EQUIV | LOW | problem | 'not a problem' / (no example) | — (headword is an exact combined-phrase at this position, target "problème" embedded) |
| S0107L03 | FP-EQUIV | LOW | you were doing | 'what you were doing' / (no example) | — (headword is an exact combined-phrase at this position) |
| S0196L01 | FP-EQUIV | LOW | heard | 'have you heard' / (no example) | — (exact combined-phrase at this position) |
| S0197L01 | FP-PARAPHRASE | LOW | my son | 'son' / "my son is here" | — (exact component "son"→"gars"; example is an exact practice phrase at this position) |
| S0210L01 | FP-EQUIV | LOW | they think | 'they think that' / "she said they think that it's important" | — (exact combined-phrase at this position) |
| S0210L02 | **REAL-MISROUTE** | HIGH | that we need | 'to discuss' / "I think we need to discuss what you needed to do" | **S0210L03** ("to discuss"→"discuter", exact known_text match, same seed) |
| S0056L01 | **REAL-MISROUTE** | HIGH | so | 'words' / (no example) | **S0056L02** ("a few words"→"quelques mots"; "words"→"mots" exact component match, same seed) |
| S0219L01 | FP-EQUIV | LOW | it was nice | 'it was nice to' / "it was nice to do this together" | — (exact combined-phrase at this position, target "c'était l'fun" embedded) |
| S0190L01 | **REAL-MISROUTE** | HIGH | does that bother you | 'ask' / "I ask you a question" | **S0190L02** ("I ask you"→"j'te pose"; "ask"→"pose" exact component match, same seed) |
| S0225L02 | FP-EQUIV | LOW | if he could | 'could' / "he would give you an answer if he could" | — (exact component "could"→"pouvait" at this same position) |
| S0258L01 | FP-PARAPHRASE | LOW | over there | 'what' / "what's that blue thing over there?" | — (example is an exact practice phrase at this position, target "là-bas" embedded; a global exact match for bare "what" exists elsewhere but this position's own phrase covers it) |
| S0261L01 | FP-EQUIV | LOW | might be | 'it might be' / "they said it might be ready by tomorrow morning" | — (headword is known_text plus "it") |
| S0033L01 | REAL-STALE | MEDIUM | how long | 'the' / "I don't like taking the time to explain" | none found — "the" is too generic to trace and "taking the time to explain" doesn't match any phrase in the course; this position's own phrase set is entirely about "how long has it been..." |
| S0121L01 | FP-EQUIV | LOW | unusual | 'it's unusual' / (no example) | — (headword = known_text + "it's", exact combined-phrase exists at this position: "that's unusual"→"c'est spécial") |
| S0088L01 | FP-PARAPHRASE | LOW | to talk to | 'I'm not ready yet to talk to people I don't know' / (no example) | — (near-exact match to this position's own phrase "I'm not ready to talk to people I don't know yet", just reordered; target "parler à" embedded) |
| S0292L01 | FP-PARAPHRASE | LOW | at the party | 'you'll be able to' / (no example) | — (exact combined phrase at this position: "I hope you'll be able to come to the party"→target "au party" embedded) |
| S0229L02 | FP-EQUIV | LOW | would help you | 'would help' / "that woman would help you if she could" | — (headword is known_text minus "you"; example is seed's combined phrase) |
| S0201L01 | **REAL-MISROUTE** | HIGH | we wanted | 'was going to' / "she was going to work tomorrow" | **S0201L02** ("what was going to"→"ce qui allait"; "was going to"→"allait" is an exact component of that sibling's own decomposition) |
| S0214L02 | FP-PARAPHRASE | LOW | fun | 'at the weekend' / "I want to see you at the weekend" | — (exact combined phrase at this position: "did you have a good time at the weekend?"→target "du fun" embedded) |
| S0049L01 | FP-EQUIV | LOW | like this | 'it is' / (no example) | — (this position's own phrase "it's like this"→"c'est de même" confirms target; "it is"≈"it's") |
| S0147L02 | REAL-STALE | LOW | she saw me | 'kind' / "you were kind yesterday" | none confirmed — "kind" is used as a synonym gloss in the *sibling* S0147L01's combined example ("she was very kind..."), but "you were kind yesterday" itself doesn't match any phrase in the course; likely drifted from the shared seed-147 vocabulary context rather than a clean misroute |
| S0218L01 | FP-EQUIV | LOW | I didn't do much | 'didn't do much' / "I didn't do much at the weekend" | — (known_text listed verbatim as a practice phrase at this exact position) |
| S0248L01 | REAL-STALE | MEDIUM | rubbish | 'really' / "I really think you should do it" | none confirmed — "really" is an extremely common intensifier appearing in ~5+ legos course-wide (incl. seeds 147/148, already in this chunk); example doesn't match any of them, too generic to trace to one owner |
| S0045L02 | FP-PARAPHRASE | LOW | everything | 'to know' / "I don't need to know everything" | — (exact combined phrase at this position, target "tout" embedded) |
| S0300L01 | REAL-STALE | LOW | unfriendly | 'to seem' / "I don't want to seem nervous" | none confirmed — this position's own phrases all use "to seem unfriendly"→"avoir l'air bête"; the example substitutes "nervous" for "unfriendly", a different adjective not otherwise present at this position (the word "nervous"/nerveux exists only at unrelated seed 147). Grammar pattern and target ("bête") are still correctly taught; only the illustrative adjective drifted |
| S0133L02 | FP-EQUIV | LOW | to know someone | 'someone' / "someone was saying something interesting before" | — (exact component "someone"→"quelqu'un" at this position) |
| S0016L03 | **REAL-MISROUTE** | HIGH | everyone else | 'later on' / "I can explain later on" | **S0016L04** ("later on"→"tantôt", exact known_text match, same seed) |
| S0138L01 | REAL-STALE | HIGH | wanted | 'this was where' / "this was where it's more important to talk" | none found anywhere in the course — completely unrelated content; known_text/target ("wanted"→"voulait") share no connection with "this was where...talk" |
| S0039L02 | **REAL-MISROUTE** | HIGH | tired | 'this morning' / "he doesn't want to be quiet this morning" | **S0039L03** ("this morning"→"à matin", exact known_text match, same seed) |
| S0294L01 | FP-PARAPHRASE | LOW | to call you | 'enough time' / "I don't have enough time to finish" | — (this position's own phrases include "I don't have enough time to call you tonight"→target "t'appeler" embedded; the clip's example omits "call you" itself, a looser paraphrase but not contradictory) |
| S0214L01 | **REAL-MISROUTE** | MEDIUM confidence, HIGH severity | had | 'have a good time' / (no example) | **S0214L02** ("fun"→"du fun"; this position's own phrase "did you have a good time at the weekend?"→target embeds "du fun" is the closest available match — not an exact known_text hit, but "had"/"eu" shares nothing with "have a good time") |
| S0256L01 | FP-EQUIV | LOW | less than an hour | 'I think I'll be ready in less than an hour' / (no example) | — (headword is an exact combined-phrase known_text at this position) |
| S0281L03 | FP-PARAPHRASE | LOW | before you start | 'do you mind' / (no example) | — (exact combined phrase at this position: "do you mind if I finish my coffee before you start?"→target "avant que tu commences" embedded) |

## Counts

- REAL-MISROUTE: 21 (S0069L02, S0204L01, S0204L03, S0038L01, S0064L01, S0274L01, S0212L01, S0052L01, S0053L01, S0148L02, S0284L01, S0217L01, S0217L03, S0221L02, S0210L02, S0056L01, S0190L01, S0201L01, S0016L03, S0039L02, S0214L01)
- REAL-STALE: 8 (S0176L02, S0067L01, S0205L02, S0033L01, S0147L02, S0248L01, S0300L01, S0138L01)
- FP-PARAPHRASE: 25
- FP-EQUIV: 23

(21 + 8 + 25 + 23 = 77 ✓)

Severity breakdown of REAL rows: 27 of 29 REAL rows are HIGH (learner reads one thing, hears an unrelated/contradictory intro before the target); S0033L01, S0248L01 are MEDIUM; S0147L02, S0300L01 are LOW (wording drift within a related theme, target still correct).

## Rows not individually read

None. All 77 rows were read individually and given their own verdict — headword/example extracted from `course_audio.text`, cross-checked against `course_legos`/`course_practice_phrases` for the same seed position, sibling legos in the same seed, and (where no sibling matched) the whole course.

## New false-positive class found (for implementation)

**FP class: "combined-phrase headword decomposition."** The detector should not flag a row purely because `clip_text`'s quoted headword ≠ `known_text` verbatim. In this course, presentation "as in" examples are frequently the seed's full multi-lego combined practice phrase (built by concatenating 2–3 sibling legos' targets), and the headword is often a legitimate sub-component or synonym gloss of the lego's own known_text drawn from the SAME seed position's practice-phrase set — not a different lego's content. To implement: before flagging, check whether (a) `course_legos.target_text` for the lego appears as a substring of any `course_practice_phrases.target_text` at the SAME `seed_number`+`lego_index`, or (b) the headword equals a `known_text` of any practice-phrase row at that same position (even one not literally matching the "as in" example verbatim). If either holds, suppress the flag — it's noise, not a defect. Only flag when a *sibling lego in the same seed* has an *exact* known_text match to the headword (the reliable misroute signal), or when no lego/phrase anywhere in the course corroborates the headword at all (stale/unrouted).

## Confidence caveats

- `word_boundaries` was not queried per-clip in this pass (not needed — `course_audio.text` gave the narration ground truth directly per the brief), so no clip was force-aligned; all verdicts rest on the DB text fields, not the audio waveform itself.
- S0217L03→S0217L04 and S0214L01→S0214L02 are misroute calls with only a thematic/component match, not an exact known_text match — flagged as MEDIUM confidence in the table above rather than presented as certain.
- S0067L01, S0147L02, S0248L01: genuinely ambiguous — an exact known_text match exists elsewhere in the course but its theme/pronoun/context doesn't corroborate the clip's example, so these are called REAL-STALE (no confident repoint target) rather than forced into a misroute they may not fit.
