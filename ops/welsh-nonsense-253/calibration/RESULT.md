## haiku-v1
```
POS CAUGHT | I’d prefer if I don’t care whenever you breathe
POS CAUGHT | I don’t mind that I don’t care
POS MISSED | to breathe every word
POS borderline | every word was late
POS MISSED | whoever said it was absolutely wrong that I don’t care
POS MISSED | it’s your turn to breathe but I don’t mind
POS MISSED | game is a lucky word
POS borderline | he has won three minutes with me
POS CAUGHT | one towel was at the other end of the mud
POS MISSED | it’s under the angry eyes
NEG passed  | I’m tired of being dry
NEG passed  | the dog is sad without mud
NEG passed  | appear as though I don’t care
CALIBRATION FAIL | flagged 3 clear, 2 borderline
```
## sonnet-v2
```
POS CAUGHT | I’d prefer if I don’t care whenever you breathe
POS CAUGHT | I don’t mind that I don’t care
POS CAUGHT | to breathe every word
POS CAUGHT | every word was late
POS borderline | whoever said it was absolutely wrong that I don’t care
POS MISSED | it’s your turn to breathe but I don’t mind
POS CAUGHT | game is a lucky word
POS CAUGHT | he has won three minutes with me
POS CAUGHT | one towel was at the other end of the mud
POS CAUGHT | it’s under the angry eyes
NEG passed  | I’m tired of being dry
NEG passed  | the dog is sad without mud
NEG passed  | appear as though I don’t care
CALIBRATION FAIL | flagged 10 clear, 15 borderline
```
## sonnet-v3
```
POS CAUGHT | I’d prefer if I don’t care whenever you breathe
POS CAUGHT | I don’t mind that I don’t care
POS CAUGHT | to breathe every word
POS CAUGHT | every word was late
POS CAUGHT | whoever said it was absolutely wrong that I don’t care
POS CAUGHT | it’s your turn to breathe but I don’t mind
POS borderline | game is a lucky word
POS CAUGHT | he has won three minutes with me
POS CAUGHT | one towel was at the other end of the mud
POS CAUGHT | it’s under the angry eyes
NEG passed  | I’m tired of being dry
NEG passed  | the dog is sad without mud
NEG passed  | appear as though I don’t care
CALIBRATION FAIL | flagged 10 clear, 10 borderline
```

Set: all 369 unique practice pairs of cym_s_for_eng seeds 320-334, plus S0291L01B06 and the "appear as though" negative.
Known positives/negatives: #249·AL hand-read (d/2af42ddb). Prompt examples are INVENTED, not the positives (no leak).
haiku-v1 = first prompt (with "be conservative"); sonnet-v2 = conservatism removed + situation test; sonnet-v3 = + stacked-clause pattern (prompt.md as committed).
Chosen: sonnet, prompt v3. Every positive is in the net (CLEAR or BORDERLINE); the CLEAR/BORDERLINE margin varies run to run,
so the final split is decided by the hand-read, not the model.
