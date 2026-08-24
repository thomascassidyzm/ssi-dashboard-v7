# A-108 Nordic — dan, nor, swe, isl

**493 staged drafts examined. One line changed. No T-V action needed in any of the four, and that is a fact about the languages, not a gap in the sweep.**

Applied 2026-08-14 against Tom's three A-108 rules. Log with every row: `docs/a108/nordic-applied-log.json`.

## The counts

| Course | Drafts examined | Register | Gender | Annotations |
|---|---|---|---|---|
| dan_for_eng | 129 | 0 | 0 | 0 |
| nor_for_eng | 113 | 0 | 0 | 0 |
| swe_for_eng | 115 | 0 | 0 | 0 |
| isl_for_eng | 136 | 0 | **1** | 0 |

## The one change

`isl_for_eng:pod-0-unrecorded:SC22-S001`, Learner, scene 22:

> …og ég er ennþá svolítið **kvíðinn** fyrir að tala við annað fólk.
> …og ég er ennþá svolítið **kvíðin** fyrir að tala við annað fólk.

`kvíðinn` is masculine nominative singular. The Learner voice in isl is Guðrún (`is-IS-GudrunNeural`, cast gender `f`), so the adjective describing the speaker takes the feminine `kvíðin`. Written by direct SQL with an exact before-text guard; `target_text_draft` still `true`.

## Why rule 3 produced nothing — plainly

You were right to expect this. Danish and Norwegian `De/Dem/Deres` and Swedish `Ni/Er` as polite address do not appear **anywhere** in the 357 mainland-Scandinavian drafts. After the du-reform, `du` to a barista, a bartender, a receptionist, a pharmacist and a taxi driver is not merely acceptable — it is the only natural choice, so the service scenes are already correct as written and flattening or elevating them would both be wrong.

Icelandic has no living V form either. Every `þér` in the isl drafts (`Hvað má bjóða þér?`, `Ég óska þér góðs gengis`) is the dative of informal `þú`, not the archaic polite nominative. No `yður/yðar` anywhere.

**No T-V action needed. Nothing changed for register, and nothing should be.**

## Why rule 2 produced almost nothing

Danish, Norwegian and Swedish adjectives inflect for noun gender and number, **not for the natural gender of the person**. `ledsen`, `nervøs`, `bekymret`, `snäll` are identical whoever says them. There is no surface for rule 2 to act on in three of the four languages — which is why the whole gender yield of this sweep is the single Icelandic line above.

Icelandic is the exception, and is the one language here where rule 2 genuinely bites.

## What I left alone, named

- `isl SC20-S009` "Þú ert mjög **almennilegur**" and `isl SC20-S010` "…svona **vingjarnlegur**" — masculine, but agreeing with the **addressee**, not the speaker. Scene 20 is solo Learner practice with no cast interlocutor, so the addressee has no gender to key on. Rule 2 is speaker-keyed; I declined to guess.
- `isl SC11-S002` "**Velkomin**." — correct as neuter plural to the arriving party (the scene establishes two guests: `fyrir okkur` / `þið getið`). Not a defect.
- Speaker *labels* `Neighbour (10:30 pm)` (dan, isl) and `Barista (3 pm)` (isl) carry parentheticals. They are the speaker column, not learner-facing line text. Flagging, not touching.

## Two things outside A-108 scope you should see

**Same defect, non-draft rows.** `isl SC22-S009` has the female Learner saying "Ég er mjög **ánægður**" — masculine, exactly the defect I just fixed one line earlier in the same scene — and `isl SC22-S006` has the Friend telling her "þú sért **tilbúinn**". Both are `target_text_draft = false`, so under the brief I did not touch them. **The Icelandic gender problem is not confined to the drafts, and a draft-only sweep cannot close it.** That needs its own ruling.

**Ordinary grammar wobbles in the drafts**, not one of the three rules, so untouched: swe `en blåbär` / `en jordgubb` (SC20-S001/2), dan `Har I noget snacks?` (SC03-S004).

## Confidence

High on all three rules for Danish, Norwegian and Swedish — the register and annotation checks are mechanical and came back empty, and rule 2 has no grammatical surface in those languages.

High for Icelandic on rules 1 and 3 and on the `kvíðinn → kvíðin` fix, which is elementary strong-adjective agreement. **Not native-level**: I would not certify idiom or style across all 136 Icelandic drafts, and I have declined the two addressee-agreement lines rather than guess at them.

## Hygiene

Gated SQL only: exact before-text equality in the `WHERE`, a PL/pgSQL guard raising inside the transaction, commit only on guard pass, re-queried after. Draft counts after the write are 129/113/115/136 — unchanged — with exactly one row's `updated_at` moved, in isl. `target_text_draft` preserved. **No audio generated.**
