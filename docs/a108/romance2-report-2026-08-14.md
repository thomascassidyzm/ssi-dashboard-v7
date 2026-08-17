# A-108 — por, por_br, ita, ron: what was wrong and what was written

Applied 2026-08-14 against the live DB. 431 staged draft lines examined, **82 rewritten**.
Every row kept `target_text_draft = true`. No audio generated. No `PATCH /sentence/:id`.

Script: `scripts/a108-apply-romance2.cjs` — dry-run first, per-row before-state assertion
(abort on any drift), single transaction, re-query verify.
Row-by-row log: `docs/a108/por-porbr-ita-ron-applied-log.json`.

## Headline: the defect is Italian and Romanian, and it is register

| Course | Drafts | Register | Gender | Annotations | Left alone |
|---|---|---|---|---|---|
| por_for_eng | 108 | 0 | **10** | 0 | 98 |
| por_br_for_eng | 113 | 3 | **9** | 0 | 101 |
| ita_for_eng | 107 | **19** | 2 | 0 | 86 |
| ron_for_eng | 103 | **35** | 4 | 0 | 64 |
| **total** | **431** | **57** | **25** | **0** | **349** |

**Zero annotations in all four courses** — no slash forms, no parentheses, no brackets.
That confirms FINDINGS.md: the annotation limb of A-108 has no work in the staged drafts.
`por_for_eng`'s 12 known annotation rows are all `target_text_draft = false`, released
audio-backed content, and are out of this scope.

**European Portuguese was already correct on register.** Every service scene was already on
the 3rd-person V form (`Tem comida?`, `Pode dizer-me…`, `Aqui tem o seu café`) and every peer
scene on `tu` (`Espero que tenhas`, `Desculpa`). Nothing to change; only the speaker's own
gender was wrong.

**Italian and Romanian were flat `tu`/`tu` across every service scene** — exactly the fault
the brief spot-checked. Romanian was the worst: `Ai mâncare?` and `te rog` to a barista,
`Mai ai loc de desert?` from a *waiter* to a diner, `îmi poți recomanda ceva?` to a pharmacist.
Italian had `Sì, vuoi il menù?` and `Ecco il tuo caffè` from a barista, `potresti consigliarmi`
to a pharmacist, and the whole waiter-to-customer block in scene 21 on `tu`.

## Gender — all four Learners are female, resolved from the cast voice

Read from `listening_pods.speakers` on each course's own `pod-0-unrecorded`, keying on the
target voice as the brief directs, not the stale `gender` field:

| Course | Learner voice | Other female-voiced speakers with lines |
|---|---|---|
| por_for_eng | `eve` | Customer, Customer 1, Passenger, Receptionist, Anna |
| por_br_for_eng | `ara` | Customer, Customer 1, Passenger, Receptionist, Anna |
| ita_for_eng | `eve` | Customer, Customer 1, Passenger, Receptionist, Anna |
| ron_for_eng | `ro-RO-AlinaNeural` | Barista, Customer, Customer 1–3, Receptionist, Sarah |

So `Estou certo?` → `Estou certa?`, `Obrigado` → `Obrigada`, `nervoso` → `nervosa`,
`non sono sicuro` → `non sono sicura`, `Asta mă face fericit` → `fericită`,
`emoționat` → `emoționată`. Two `Customer` lines (por SC10-S009, por_br SC12-S009) were also
female-voiced and said `obrigado` — fixed.

Worth flagging on the ita/por/por_br casts: **`Barista` carries `gender:'f'` but is cast to a
male voice** (Matteo / Sal / Mateus). No Barista line in those courses is gender-marked, so
nothing turned on it here — but the stale `gender` field is wrong in a second way beyond the
`'n'` case FINDINGS.md documented, and any future rule that reads it will mis-resolve.

## Brazilian Portuguese: treated as its own language, not a copy of por

`você` was left in place everywhere, including all service scenes — it is the ordinary
Brazilian 2nd person and is not over-familiar to a barista. **No text was copied from
`por_for_eng`.** The genuine BR register defect is the imperative: `desculpa` is the
tu-derived familiar form, `desculpe` the standard one to a stranger. Three learner lines
addressed to service staff were on `desculpa` and are now `desculpe` (SC15-S010, SC16-S010,
SC18-S009). `James`'s `Desculpa` in scene 6 is a peer scene and was left.

I did **not** escalate BR service dialogue to `o senhor / a senhora`. That is the real BR V
form, but at this course level it would read as deferential rather than polite, and `você`
plus `por favor` / `desculpe` is what a Brazilian traveller actually says at a café counter.
If Tom wants `o senhor / a senhora` in the BR service scenes that is a one-line ruling and a
separate small pass — flagging it rather than deciding it.

## Scenes 15–21: how each line was judged

The rule I applied, stated so it can be checked: **convert `tu` → V only where the line
carries a clear service or stranger cue; where the line is ambiguous, leave the default T
alone; and never convert an existing V down to T.**

Converted (clear cue): asking a vendor a price; ticket-counter orders; asking where the
toilet is and the follow-up "can you say that again"; the whole staff-side block in scene 17
("do you want to pay by cash or card or on the room" is a receptionist's line, not a
traveller's); the waiter's "would you like to order some drinks" in scene 21; and scene 20 —
which opens by ordering ice-cream from a vendor and then thanks that person, so
"thank you for all your work" / "you're very kind" are service-directed.

Left on `tu` deliberately, and this is a judgment call rather than a certainty:
- ita SC15-S009 / ron SC15-S009 — "I prefer to try to speak your language". No service cue;
  it is the same conversational-practice frame as scene 22, which is a peer scene.
- ita SC16-S001/S002, ron SC16-S001/S002 — "if you can speak slowly", "you spoke too quickly".
- ita SC19-S003, ron SC19-S003/S008/S009, SC21-S002 and their `Îți promit` forms.

`por_for_eng` has all of these on V. I did not pull ita/ron up to match, and I did not pull
por down: rule 3's default is T, and the brief's finding is that too-formal is the rare fault.
If Tom's ear says the traveller-to-local practice lines should be V estate-wide, that is one
sentence from him and roughly a dozen more rows per course.

Narrator lines were not touched anywhere — they address no one.

## Confidence, honestly

- **European Portuguese, Brazilian Portuguese, Italian** — confident. The T/V morphology is
  unambiguous and every changed form is a standard service-register realisation.
- **Romanian** — confident on the mechanics (`aveți`, `puteți`, `vreți`, `doriți`, `ați vrea`,
  `vă rog`, `dumneavoastră`) which is what all 35 register changes are. Less confident on
  idiomatic polish than on the other three; a native read of ron would be worth having before
  render.

## Out-of-scope defects found, not fixed

Not register, gender or annotation, so left alone under scope discipline — but real, and on
rows still flagged as drafts:

1. **`ron_for_eng` SC17-S003 is ungrammatical.** `Putem să treacă pe cameră, vă rog?` —
   "can they pass onto the room". It needs something like `Putem să o trecem pe cameră`.
   I changed only `te rog` → `vă rog` on that row.
2. **`ron_for_eng` SC19-S003** renders "it makes me feel stupid" as `mă simt prost`, which
   Romanian reads as "I feel unwell/bad". Also gender-invariant, so it needed no A-108 fix.
3. **`ron_for_eng` SC20-S009 / SC21-S011–13** and **ita SC17/SC21** staff lines sitting in the
   `Learner` speaker slot is by design in scenes 15–21, but it means the Learner's female
   voice will speak lines whose addressee-agreement (`Sunteți foarte drăguț`,
   `così gentile`) is masculine-default. That is addressee agreement, not speaker agreement,
   so Tom's rule 2 does not reach it. Left masculine.
