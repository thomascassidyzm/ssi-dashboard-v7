# A-108 — Hindi, Nepali, Persian, Arabic ×3, Hebrew, Swahili, Basque

1,021 staged draft lines examined across nine courses. **51 changed** — 48 for gender, 3 for
register. **Zero annotations to strip in any of the nine.** Draft flag preserved on every row;
no audio generated.

| Language | Drafts | Register | Gender | Annotations |
|---|---|---|---|---|
| hin_for_eng | 132 | 0 | **14** | 0 |
| nep_for_eng | 100 | **1** | **1** *(same row)* | 0 |
| fas_for_eng | 122 | **2** | 0 | 0 |
| ara_for_eng (MSA) | 114 | 0 | **7** | 0 |
| ara_eg_for_eng | 105 | 0 | **15** | 0 |
| ara_sy_for_eng | 108 | 0 | **9** | 0 |
| heb_for_eng | 126 | 0 | **3** | 0 |
| swa_for_eng | 113 | 0 | 0 | 0 |
| eus_for_eng | 111 | 0 | 0 | 0 |

Every changed row is logged with before/after/reason in
`docs/a108/indo-iranian-semitic-applied-log.json`. Resolved cast gender per course is in
`docs/a108/indo-iranian-semitic-cast.md`.

## Rule 1 is a clean pass, estate-wide in this block

A single mechanical sweep for `( ) [ ] / { }` over all 1,021 draft rows returned **nothing**.
No slash forms, no bracketed glosses, no parentheticals anywhere in these nine courses.

## Where register genuinely had no surface — and why that is the right answer

Four of the nine languages have **no T-V distinction at all**, so rule 3 cannot act:

- **Hebrew** — `at`/`ata` is gender, not register. Politeness is lexical (`bevakasha`, `slicha`).
- **Swahili** — politeness is lexical (`tafadhali`) and by honorific address; noun classes are
  not gender and do not track the speaker.
- **Arabic, all three variants** — no T-V pair exists. Politeness is lexical
  (`min fadlak`, `law samaht`, Egyptian `hadretak`). The live axis in Arabic is gender, not register.
- **Basque** — `zu` is the ordinary standard 2nd person, **not** a V form; `hi` is intimate and
  marked. Every one of the 111 Basque drafts uses `zu`, which is correct. Downgrading any of them
  to `hi` would have been the error.

And two languages have **no grammatical gender**, so rule 2 cannot act: **Persian** and
**Swahili**. Basque has none either outside allocutive `hika`, which the `zu` register never
triggers.

That leaves **Basque and Swahili with zero changes on all three rules** — checked, not skipped.

## The three register changes, and the evidence that settled them

Scene 22 is PEER in the canon, so it takes the T form. In two courses the drafts had drifted to
the polite form while **the scene's own already-settled non-draft lines were informal** — the
drafts were the odd ones out, which is what made these safe rather than a judgment call.

| id | before | after | why |
|---|---|---|---|
| `fas SC22-S001` | …صحبت کردن رو **باهاتون** تمرین کنم؟ | …صحبت کردن رو **باهات** تمرین کنم؟ | Scene-22 settled lines S004/S006/S008/S010 all use `to` (برات، باهات، آماده‌ای). |
| `fas SC22-S002` | …خیلی خوب **صحبت میکنید**. راحت میتونم **بفهممتون**. | …خیلی خوب **صحبت میکنی**. راحت میتونم **بفهممت**. | Same scene, Friend speaking to the Learner. |
| `nep SC22-S001` | के **तपाईंलाई**… **तपाईंसँग**… | के **तिमीलाई**… **तिमीसँग**… | Scene-22 settled lines all use `timi`; this lone draft used `tapai`. |

## Hindi: `aap` was already right, and I left all 132 alone on register

Hindi drafts are uniformly `aap`. That is **correct and I changed none of it.** `aap` is the
neutral-polite default; it is right for every service scene, and entirely natural between adult
neighbours (scenes 1, 5) and strangers introducing themselves (scene 6). Scene 22's own settled
non-draft lines are `aap` throughout, so the drafts are consistent with their scene. Flattening
Hindi to `tum` would have been a European T-V instinct misapplied. Nepali `tapai` is the same
story everywhere except the one scene-22 line above.

## Gender: 48 changes, and one that runs the other way

Gender was resolved from the **target voice**, per the brief. Learner voices:

- female — Hindi (Ara), Nepali (Hemkala), MSA (Ara), Egyptian (Eve)
- **male — Syrian (Laith), Hebrew (Avri)**

So most fixes make a masculine draft feminine (`آسِفٌ`→`آسِفَةٌ`, `करता हूँ`→`करती हूँ`,
`عايز`→`عايزة`) — but **ara_sy runs the opposite way.** Its 108 drafts were written *feminine*
throughout (`آسفة`, `متأكدة`, `محقة`, `غلطانة`, `قلقانة`, `غبية`, `متوترة`) while its Learner is
cast on `ar-SY-LaithNeural`, male — and there the declared `gender` field says `m` too, so both
signals agree. All nine ara_sy changes therefore go feminine → masculine.

**Flag for you:** if the intent is a *female* learner persona across the estate, the fix is to
recast the Syrian Learner voice, not to rewrite the text — and these nine rows should then be
reverted rather than kept. As cast today, masculine is what rule 2 requires.

> **Ruled 2026-08-16 (plate A-120): recast female.** The Syrian Learner is now cast on
> `ar-SY-AmanyNeural` with `gender: "f"`, and these nine rows have been reverted to their
> feminine `before` values — see `docs/pods/a120-ara-sy-learner-recast-2026-08-16.md`.

Beyond the Learner, gender fixes also landed on Sarah (Hindi, Hebrew), Customer 1/2 and the
Receptionist (Hindi), and Customer (Egyptian) — all female voices carrying masculine agreement.

## Named gaps and things I did not touch

**1. Arabic addressee agreement — a second axis, larger than rule 2, not swept.**
Arabic inflects for the *person being spoken to* as well as the speaker. Tom's rule 2 names the
speaker only, so I applied speaker agreement everywhere and did **not** sweep addressee agreement
in the three Arabic courses. In MSA alone I spotted these while working, unfixed:

`SC02-S002` تَفَضَّلْ→تَفَضَّلي · `SC02-S004` يُمْكِنُكَ→يُمْكِنُكِ · `SC03-S001` لَكَ→لَكِ ·
`SC03-S007` تُريدُ→تُريدينَ · `SC03-S009` تَفَضَّلْ قَهْوَتَكَ→تَفَضَّلي قَهْوَتَكِ ·
`SC07-S001` لَكَ→لَكِ · `SC08-S001` لَكَ→لَكِ · `SC14-S006` سَأُنْزِلُكَ→سَأُنْزِلُكِ

That is a spotted list, **not an exhaustive audit**, and the same axis exists in Egyptian and
Syrian. It is worth its own scoped pass — but it depends on cast entries that are themselves
partly stale, so I would confirm the Arabic cast genders before running it.

**Inconsistency I am owning:** in Hebrew I *did* fix two addressee lines (`SC03-S007` תרצה→תרצי
and `SC08-S007` אתה יכול→את יכולה) because each sits in a two-person exchange with an explicit
cast and no ambiguity. If you want the addressee axis left alone until it is ruled on, those two
are the rows to revert. Hebrew's third change (`SC04-S002`, Sarah) is pure speaker gender.

**2. Egyptian: four roles are cast on a gender-neutral voice.**
Barista, Bartender, Waiter and Tourist in ara_eg are all cast on xAI `sal`, which the voice
registry lists as **"Gender-neutral option"**. The voice therefore cannot decide their gender and
I fell back on the declared field. **No change I made depends on this fallback** — all 15
Egyptian fixes are on Learner, Customer and Customer 1, none of them `sal`. Flagged so it does
not bite a later pass.

**3. Persian drafts are missing their ZWNJ.**
Draft rows read `میکنید`/`میگیرم`; the settled non-draft rows in the same pods read `می‌کنید`/
`می‌گیرم` with the zero-width non-joiner. Unjoined, these are misspellings in careful Persian.
Outside A-108's three rules so I changed nothing, but it affects most of the 122 Persian drafts
and is a clean mechanical fix.

**4. Persian scene 1 has a T/V split I could not close.**
The drafts (`SC01-S002`, `SC01-S004`) use `to` with the Neighbour — canon-correct for a peer
scene. But the non-draft `SC01-S003` in the same pod answers with `shoma`. The non-draft is out of
scope, so the scene still reads mismatched. **Your call:** the drafts follow the canon, so the
non-draft line is the one that wants changing.

**5. Hindi's settled Learner lines are masculine while its voice is female.**
My 14 fixes make the *drafts* feminine, but non-draft Learner lines in scene 22 (`SC22-S001`,
`S007`, `S009`, `S011`) still read `सीख रहा हूँ`, `सोच पाता`, `बोलता हूँ`. Scope says drafts only,
so Hindi scene 22 now mixes genders in one speaker. Needs the same pass over non-drafts to be
consistent — flagging rather than silently leaving it.

**6. Out-of-scope grammar defects I noticed but did not touch** (none are register, gender or
annotation): Basque `SC16-S001` `badezu` should be standard `baduzu`; Basque `SC15-S007`
`Lau txartel joanekoa` wants plural agreement; Swahili `SC18-S001` `Hiyo ni wazo baya` should be
`Hilo…` by noun class, same at `SC20-S008`; Hindi `SC22-S002` `बोलते लगते हैं` is not idiomatic.

## Confidence

High on Hindi, Persian, Hebrew, MSA, Egyptian and Basque. High on Swahili, where the finding is
an absence rather than a judgment. **Lower on two points, stated plainly:** Nepali feminine
participle agreement (`सिकिरहेकी`) is standard written usage but is often left masculine in
colloquial speech — the change is defensible, not certain. And Syrian Levantine is the variant I
would most want a native ear on, though the nine changes there are mechanical agreement flips on
unambiguous adjectives, not phrasing choices.

## Method

Needle-based gated SQL: every edit declared as an exact substring replacement, dry-run first with
a per-row assertion that the needle occurs exactly once in the live text **and** that the row is a
draft — the dry run aborted twice and caught two real defects in my own spec (an ambiguous id
match across two pods, and a ZWNJ mismatch) before anything was written. Writes were
`UPDATE … WHERE id = … AND target_text = <before> AND target_text_draft`, re-queried afterwards:
51/51 texts match, 51/51 still `target_text_draft = true`, per-course touched counts reconcile
exactly to the log, and total draft counts are unchanged.
