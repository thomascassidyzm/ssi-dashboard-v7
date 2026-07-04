# ZUT membership-failure fix sweep — fra_for_eng, batch 2/2 (component rows), 2026-07-04

*Part of the 148-item membership-failure fix sweep (`zut-rescope-component-rows-2026-07-04.md`
background, `zut-violation-sweep-pilot-fra-40.md` methodology). This batch: the 36 entries in
`scripts/zut-membership-triage/batch-fra_for_eng-2.json` — `course_practice_phrases` rows with
`phrase_role:'component'` whose `target_text` failed the substring-containment membership check
against its own seed's `target_text`. Each was read against its own seed's full sentence and
every sibling row at the same `seed_number` before classifying — never against the bare fragment.*

## Result: 32/36 orphans (delete), 4/36 not orphans (keep, no action)

**32 orphans** — the component's `target_text` has zero relation to its own seed's actual
sentence. In every case a correctly-formed BUILD/USE/LEGO row elsewhere in the course already
teaches the real chunk for that seed; deleting these stray rows loses no learner-facing content.
Fix applied via `tools/course-optimization/apply-zut-triage-fra-batch2.cjs` (dry-run verified
first — all 32 before-state assertions passed against live DB — then live).

| id | known → target (component) | seed's actual sentence |
|---|---|---|
| S0244L01C02 | did not understand → n'a pas compris | I've learnt a lot already / j'ai déjà beaucoup appris |
| S0220L01C01 | she → elle | did you watch a bit of television? |
| S0241L01C01 | I → j'ai | I don't want to give it to him / Je ne veux pas le lui donner |
| S0223L01C01 | I → je | he's going to ask you tomorrow / il va vous demander demain |
| S0215L02C01 | it takes time → ça prend du temps | I went out on Saturday night / Je suis sorti samedi soir |
| S0211L01C02 | know → sais | they told us that they didn't want to explain |
| S0214L01C01 | she → elle | did you have a good time at the weekend? |
| S0214L02C01 | how to answer → comment répondre | (same seed as above) |
| S0218L02C01 | what to do → quoi faire | I didn't do much on Sunday |
| S0218L02C02 | next → ensuite | (same seed as above) |
| S0219L01C02 | knew → savait | it was nice to relax for a while |
| S0230L01C02 | did not believe → ne croyais pas | I know a young man who wants to work with you |
| S0241L01C02 | understood → compris | I don't want to give it to him |
| S0213L01C02 | knows → sait | we don't know what they're trying to achieve (has "savons", not "sait" — wrong subject) |
| S0227L01C02 | believe → croyons | that man is going to tell me something new |
| S0215L02C02 | to → pour | I went out on Saturday night |
| S0245L01C02 | understood → avons compris | I'm happy with how much I've done in a short time |
| S0213L02C01 | how to find → comment trouver | we don't know what they're trying to achieve |
| S0235L01C02 | understand → comprends | I met someone who said that he wanted to tell you something |
| S0237L01C02 | understands → comprend | he wanted me to tell you before the weekend |
| S0220L01C02 | did not know → ne savait pas | did you watch a bit of television? |
| S0214L01C02 | does not know → ne sait pas | did you have a good time at the weekend? |
| S0215L01C02 | know → savons | I went out on Saturday night |
| S0219L01C01 | he → il | it was nice to relax for a while |
| S0223L01C02 | believe → crois | he's going to ask you tomorrow |
| S0238L01C01 | she → elle | he wanted you to tell me yesterday |
| S0243L02C01 | everything we said → tout ce que nous avons dit | I'm going to ask for the same thing to eat |
| S0236L01C02 | do not understand → ne comprends pas | I know someone who said that she was going to try to help |
| S0219L02C01 | what he wanted → ce qu'il voulait | it was nice to relax for a while |
| S0234L02C02 | so quickly → si vite | I met someone last night who works with your brother |
| S0234L02C01 | that it would happen → que ça arriverait | (same seed as above) |
| S0211L02C02 | time → le temps | they told us that they didn't want to explain |

Notable pattern in this batch: many orphans cluster into a handful of seeds (211, 213, 214, 215,
218, 219, 220, 223, 234, 241) each shedding 2 stray components — these read like leftover rows
from an earlier decomposition/renumbering pass that moved the real components elsewhere but
didn't clean up the superseded ones, consistent with the "stale/orphaned rows" hypothesis flagged
in the rescope report's [2] bucket analysis.

## 4/36 — not orphans, kept, no action

These 4 are genuinely related to their own seed's sentence and were **excluded from the deletion
list** — the substring-containment check's false positive, not a real defect:

| id | known → target | issue |
|---|---|---|
| **S0093L01C02** | time to → temps de | seed sentence is "il est temps **d'y** aller maintenant" — elision (de+y→d'y) hides the literal substring "temps de", but the meaning is exactly present. |
| **S0055L02C02** | didn't sleep → n'ai pas dormi | seed sentence is "je n'ai pas **très bien** dormi" — interposed words between "pas" and "dormi" break contiguous substring match, but all words are present, in order, and the meaning is exactly present. |
| **S0440L02C01** | while → pendant que | seed sentence is "pendant **qu'ils** sont encore jeunes" — elision (que+ils→qu'ils) hides the literal substring, same pattern as S0093L01C02. |
| **S0140L01C01** | I can't → je ne peux pas | different, more interesting case: the master sentence for seed 140 uses "Je suis désolé **de ne pas pouvoir** voir…" (infinitival construction), while the LEGO at this index is "I can't see"→"je ne peux pas voir" — used verbatim across many of that LEGO's own BUILD/USE siblings ("je ne peux pas voir ceci", etc.). The component correctly decomposes its **LEGO's** text; it just never appears in the **master sentence's** text, because the LEGO paraphrases the master sentence with a different grammatical construction. This isn't a stray/mislabeled row — it's the target-membership check being too strict for a LEGO that legitimately doesn't mirror the master sentence word-for-word. Flagging as a policy question rather than cutting: should the membership check compare a component against its LEGO's target instead of (or in addition to) the seed's master-sentence target? |

## Files

- `tools/course-optimization/apply-zut-triage-fra-batch2.cjs` — the gated fix script (dry-run +
  live modes, before/after assertions per row, no raw writes).
- `tools/course-optimization/zut-triage-fra-batch2-{dryrun,applied}-log.json` — per-row action logs.
