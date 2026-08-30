# Does the practice sentence use the word it teaches?

One rule, checked three ways in sequence.

**The rule.** A lesson teaches one word. The practice sentences built for that lesson exist to
introduce that word. A practice sentence that never uses the word it was built to teach is a
defect.

**Which side.** Both. Every practice sentence has a prompt in the language the learner already
knows and an answer in the language they are learning, and this check now runs on each of them
independently. The old check ran on the known side only.

## The three stages

| | what it does | what it may conclude |
|---|---|---|
| `prefilter.cjs` | mechanical, free, language-neutral | **fine** — never *defect* |
| `reader.cjs` | a cheap model reads each survivor | uses / missing / unsure |
| `confirm.cjs` | a second model tries to overturn each accusation | upheld / overturned |

`funnel.cjs` pulls the material from the live database and runs stage 1 over the whole estate.
`report.cjs` writes the funnel and the confirmed list out for a human to read.

    node tools/teaches-word/funnel.cjs > /dev/null            # whole estate, both sides
    OUT=candidates.json node tools/teaches-word/funnel.cjs spa_for_eng
    node tools/teaches-word/reader.cjs candidates.json --out verdicts.json --model haiku
    node tools/teaches-word/confirm.cjs verdicts.json --out confirmed.json --model sonnet
    node tools/teaches-word/report.cjs --funnel candidates.json --verdicts verdicts.json \
         --confirmed confirmed.json --out report.md

All of it is read-only. Nothing here writes to the database or touches course content.

## Why it was rebuilt this way

The previous check decided mechanically whether "wanted" was the word "want", by stripping
endings from a hand-authored list per language. Four languages ever got a list. On the other
thirty-five content-bearing courses the check returned **zero**, and that zero read as *clean*
when it meant *did not look* — including on every paid course taught from English. Three
languages had declared that ending-stripping does not work for them by leaving their list empty,
and the code read "empty" as "nothing to strip" and convicted 444 good sentences. Where lists did
exist the false-alarm rate ran at 91% (Arabic), 77% (Korean) and 32–47% (Chinese).

So the lists are gone. A model can read "does this sentence use this word" in any language
without anyone hand-authoring its morphology, and that is now what happens. **There is no
per-language configuration anywhere in this directory**, and `prefilter.test.cjs` fails if anyone
adds one.

`langnames.cjs` is the one file that mentions languages. It maps `cym` to "Welsh" so a reader can
be told what it is looking at. It is a label. It changes no verdict.

## The direction of error

Every stage is built to prefer missing a defect over inventing one:

- the pre-filter may only ever say *fine*, never *defect*, and hands on everything else;
- the reader is told UNSURE is a respectable answer, and UNSURE is counted as neither;
- the confirm pass is told that where it cannot decide, the tie goes to the material.

That is deliberate. The failure mode of this family of check is crying wolf, and a check people
learn to ignore is worse than no check at all.

## Reporting

RAW and CONFIRMED are always reported separately, with the funnel shown. A confirmed count on its
own hides how much work it took to earn; a raw count on its own repeats the cry-wolf failure.
