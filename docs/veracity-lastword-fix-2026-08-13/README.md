# The last-word rule: mended, and the cache re-judged

2026-08-13. The 12 August render audit found the audio-defect cache holding 534 failures, 467 of
them from one rule, and hand-checked four flagged clips — all four healthy. Tom's decision: fix the
rule before any repair run trusts that cache again.

Done. **534 recorded failures → 345.** 189 were false alarms and are now passes. No audio was
rendered, deleted, or touched.

**But the headline number in the audit was wrong, and correcting it is the main finding.** The audit
inferred that the rule "accounts for 467 of the 534 failures" and recommended exempting that whole
class. 467 is the count of failures *carrying that rule's label* — it was never a count of verified
false alarms. It came from a four-clip sample, and those four clips were in a different course and a
different language from the 467. Replaying all of them says: **189 false alarms, not 467.** The other
278 look like the real defect Tom heard on 7 August. Exempting them wholesale, as recommended, would
have blinded the detector to exactly the thing it was built for.

---

## What the rule was doing wrong

`services/audio-veracity.cjs`, Rule 3. The clip is decoded by whisper, and the script's final word
has to turn up in the last three decoded words, allowing 0–2 edits of spelling slack.

That asks **"is this word spelt the way I expect?"** when the question is **"was this word
spoken?"** — and whisper answers the first one badly on purpose. It writes what the language's
orthography prefers, not what the script author typed:

| script | whisper wrote | old verdict |
|---|---|---|
| it is okay | "It is OK." | BROKEN |
| why are you not happy any more | "…happy anymore?" | BROKEN |
| you like to | "You like too." | BROKEN |
| come se | "Come si?" | BROKEN |
| più di | "PUD" / "Pewdie!" | BROKEN |

Every one of those clips is fine. The audit proved it the hard way on the Italian pair: it rendered
them fresh from Azure, three takes each, and all nine failed identically. A renderer does not
truncate a six-character phrase nine times out of nine in the same place.

## The fix

Two tests now, not one. Test 1 is the original spelling match, unchanged — it grants most passes and
costs nothing. A miss no longer convicts on its own; it goes to Test 2.

**Test 2: a dropped word has a structural signature a mis-spelt one does not.** When the final word
is genuinely gone, the decode stops fitting the whole script and starts fitting the script *minus*
its last word. So measure both and compare:

```
"it is okay"            -> "it is ok"           whole 2 | headless 3   → word was said
"ce que tu as dit hier" -> "ce que tu as dit"   whole 5 | headless 0   → word is gone
```

**Ties convict.** A tie means the decode is explained equally well as "final word mangled" and
"final word truncated mid-way" — which is precisely Tom's 7 August defect (`"je suis surpris"` →
`"Je suis sur..."`). The rule stays suspicious there.

**And it abstains when it cannot see.** The comparison only means anything if the decode is
recognisably this script at all. `"più di"` → `"PUD"` is not a truncation report, it is whisper
failing to hear a two-word fragment; there is no final slot to reason about. Those clips go to
Rule 2, which measures whole-string wrongness and needs no alignment to do it.

No calibrated constant was re-tuned. The CER threshold, the edit floor and the spelling tolerances
are all exactly as fitted.

### What this deliberately gives up

A final word **substituted** for a different one now passes Rule 3 and falls to Rule 2, which will
miss it when the substitution is short. `"prendre le bus"` heard as `"prendre le but"` passes.

This is honest rather than hidden, and it is why the rescue reason is logged as `not_truncated` and
not "spelling variant": whisper mishearing a spoken word and TTS speaking the wrong word produce the
*same transcript*, and only listening can separate them. All the test establishes is that the final
region is better explained as a rendering of the word than as its absence. Substitution is the one
class a free decode can launder; it was never validated in this module, and this rule was built for
truncation. Rescued passes carry a `lastWordVia` field so the class stays countable.

## Re-judging the cache

The cache stores the full transcript alongside each verdict, not just the verdict. So every one of
the 5,341 remembered decodes could be re-scored from text already on disk — **no audio, no S3, no
whisper, no cost.** That is now a committed tool, `tools/reverify-veracity-cache.cjs`, to be run
after any change to the scoring rules. Dry-run by default; `--apply` backs the file up first.

| | before | after |
|---|---|---|
| entries | 5,341 | 5,341 |
| recorded failures | **534** | **345** |
| — last_word_missing | 467 | 278 |
| — cer_above_threshold | 67 | 67 |
| verdicts changed | | 189, all fail → pass |
| pass → fail | | 0 |

All 5,341 decodes preserved; a second run changes nothing. Backup at
`~/.audio-veracity-verdicts.json.before-reverify-2026-08-13T02-00-29-895Z`.

### The 189 corrected, shown

```
"why are you not happy any more"  -> "Why are you not happy anymore?"
"it is okay"                      -> "It is OK."
"encore des choses à apprendre"   -> "Encore des choses à appeler."
"j'essaie de prendre le bus"      -> "J'essaye de prendre le but."
"c'était une surprise"            -> "C'était une surpour."
"il est temps de parler français" -> "Il est temps de parler France."
```

The last three are the give-up class above: not truncations, but not provably correct either.
Per-entry detail in `reverify-applied-log.json`.

### The 278 that survived, and how strong the evidence is

Not a uniform queue. A repair run should treat these differently:

| | count | evidence |
|---|---|---|
| **A** | 155 | the decode is the script minus its final word, *exactly*. Strongest. |
| **B** | 40 | the decode ends in whisper's truncation ellipsis mid-word. Strong. |
| **C** | 83 | mixed — some drop two or more words, some are substitutions that tied. Listen first. |

All 278 are fra_for_eng. Examples from A and B:

```
"ce que tu as dit hier"           -> "ce que tu as dit."
"nous devons travailler dur"      -> "Nous devons travailler."
"je vois ces choses différemment maintenant" -> "Je vois ces choses différemment."
"oui, je suis prêt"               -> "Oui, je suis..."
"il est temps de finir ça"        -> "Il est temps de finir..."
```

That is Tom's 7 August complaint, still being caught.

## The honest gap

**Nothing here was listened to.** This is a re-judgement of stored transcripts: it corrects the
detector's *judgment*, never its *perception*. If whisper misheard a clip, replaying that transcript
re-derives the same wrong answer. The four clips anyone has actually verified against live audio are
the audit's four, and all four now pass.

So 345 is a *trustworthy queue*, not a proven defect list — and bucket C especially should be heard
before anything is spent on it.

## Coverage

Rule 3 had no tests at all. It has 10 now, pinning the audit's four healthy clips, the
re-segmentation and homophone classes, the tie case, abstention, and — most importantly — that
genuine drops are still caught. 142/142 green across the veracity and reuse-planner suites.
