# A-108 — Finnish, Estonian, Latvian, Lithuanian

Applied 2026-08-14 against the live DB. 479 staged draft lines examined, 11 rewritten.
Every write preserved `target_text_draft = true`. No audio generated.

| Course | Drafts examined | Annotations | Gender | Register | Total changed |
|---|---|---|---|---|---|
| fin_for_eng | 160 | 0 | 0 (n/a) | 4 | 4 |
| est_for_eng | 109 | 0 | 0 (n/a) | 0 | 0 |
| lav_for_eng | 101 | 0 | 1 | 2 | 3 |
| lit_for_eng | 109 | 0 | 4 | 0 | 4 |

Per-row log: `docs/a108/fin-est-lav-lit-applied-log.json`. Gated script:
`docs/a108/baltic-finnic-apply.sql` (before-state + draft-flag assertion, no-op assertion,
post-write count assertion; dry-run rolled back clean before the real apply).

## Rule 1 — annotations: nothing to do in the drafts

Zero of the 479 draft lines carry a slash form, parenthetical, bracket, brace or guillemet.
The detector found **12 rows estate-wide in these four courses, all `target_text_draft = false`**,
all in `lav_for_eng` scene 22, duplicated across `pod-0` and `pod-0-unrecorded` — the six
distinct lines FINDINGS.md already flagged as released and audio-backed:

- `Es neesmu mācījies(-usies) jau ļoti ilgi…`
- `Es neesmu pārliecināts(-a), ko teikt…`
- `Esmu pārsteigts(-a).` / `tu esi gatavs(-a)…`
- `Tev jau vajadzētu būt pārliecinātam(-ai).`
- `cik noguris(-usi) es kļūstu…`
- `Esmu tiešām priecīgs(-a)…`

Out of my scope (not drafts, and they have audio behind them). See "Escalations" below for
how they resolve under rule 2 when someone does take them.

## Rule 2 — gender

**Finnish and Estonian have no grammatical gender.** Rule 2 is structurally a no-op in both;
there is no form in either course that could carry it. Not "clean" — inapplicable.

**Latvian and Lithuanian do.** Cast read from `listening_pods.speakers` → `target.voice_id`:
Learner is `lv-LV-EveritaNeural` and `lt-LT-OnaNeural`, both female. Five first-person
masculine forms in Learner lines were wrong under Tom's rule and are now feminine:

| Row | Before | After |
|---|---|---|
| lav 16/2 | es neesmu **drošs** | es neesmu **droša** |
| lit 16/2 | nesu **tikras** | nesu **tikra** |
| lit 18/7 | Ar aš **teisus**? | Ar aš **teisi**? |
| lit 22/1 | jaučiuosi … **nervingas kalbėdamas** | jaučiuosi … **nervinga kalbėdama** |
| lit 22/5 | **Nesu tikras**, ką sakyti | **Nesu tikra**, ką sakyti |

Deliberately not touched: second-person adjectives in solo practice lines
(lav 20/9 `Tu esi ļoti laipns`, lav 20/10 `esi tik draudzīgs`, lit 20/9 `Tu labai malonus`,
lit 20/10 `esi toks draugiškas`). Those agree with the **addressee**, who is unspecified in a
solo line. Rule 2 keys on the speaker and does not reach them.

Also checked and correctly gendered already: every accusative in the Latvian lines is
syncretic (`laimīgu`, `noraizējušos` are identical masculine and feminine), so nothing hides
there.

## Rule 3 — register

### Finnish — 4 changes

Finnish uses `sinä` far more widely than its neighbours, so I checked rather than assumed.
The verdict: `fin_for_eng`'s **service scenes are already uniformly V** (`Onko teillä`,
`Haluatteko`, `Voitteko`, `teidän`) and its peer scenes are uniformly T. The defect was four
solo-practice lines that broke the course's own convention mid-thread:

| Row | Before | After | Why |
|---|---|---|---|
| 15/2 | **Voitko** kertoa, paljonko tuo maksaa? | **Voitteko** | The course renders the identical English at 2/4 (Sarah → Passenger, a stranger) as `Voitteko kertoa` |
| 16/2 | **Puhuit** hieman liian nopeasti… | **Puhuitte** | Adjacent 16/1 is `jos **voitte** puhua hitaasti` and 15/9 is `**teidän** kieltänne` — same addressee, V |
| 21/4 | **Voitko** kertoa, missä vessa on? | **Voitteko** | Asking venue staff |
| 21/7 | **Voitko** sanoa sen uudelleen? | **Voitteko** | Same stranger thread; 21/11–13 in that scene are already V |

16/2 is the load-bearing one: it sat directly next to a V line addressing the same person.

### Estonian — 0 changes

All service scenes in the draft set are already V (`Kas teil on`, `kas soovite`,
`Kas te saate öelda`, `Mida teile tuua`). Peer scenes are T. One genuine defect found and
**deliberately not written** — see Escalations.

### Latvian — 2 changes

Service scenes are V throughout. Two T-form imperatives were addressed to service staff while
the same scene already used V to the same person:

| Row | Before | After | Why |
|---|---|---|---|
| 16/10 | **Piedod**, man nav skaidras naudas. | **Atvainojiet** | Follows 16/9 "we only take cash" — addressed to a cashier; 16/6 in the same scene is `Vai **jums** ir kaut kas ēdams` |
| 18/9 | **Piedod**, mans dēls pazaudēja savu biļeti. | **Atvainojiet** | Addressed to transport staff; 18/2–18/3 are `Vai **jums** ir` |

Not touched: lav 15/10 `Piedod, es nevaru runāt ļoti ātri` — that one sits inside the
language-practice thread (15/9 `tavā valodā`), which is coherently T.

### Lithuanian — 0 register changes

Service scenes are V throughout (`Ar galite`, `Ar turite`, `jūsų`), peer scenes T, and
Lithuanian `Atsiprašau` is register-neutral so the trap that caught Latvian does not exist here.

## Left alone on purpose

A cluster of solo-practice lines in scenes 15–21 is T in **all four** courses and I left it
that way in all four: 15/9 "I prefer to try to speak your language", 16/1 "if you can speak
slowly", 19/3 "when you talk quickly, it makes me feel stupid", 20/4–20/10 (the thanks and
kindness lines), 21/2 "it sounds as though you want us not to do that". These read as a
language-practice partner or a friend, not a service encounter — three independently
translated courses converged on T, and the brief says judge per line. Finnish 15/9 is the one
exception: it was already V there, which is why the fin thread resolves to V and the others
do not.

## Escalations — real defects I could not write

1. **est_for_eng scene 10 (pharmacy/shop) is T-registered in rows I may not touch.**
   `10/9` is the only draft in that scene and it says `See on väga kena **sinu** poolt!` to
   the Assistant. Under the canon it should be `teie poolt` — but 10/4, 10/6, 10/7 and 10/8
   are `target_text_draft = false` and read `pead`, `leiad`, `sa oled`, `Kas **sa** oled siin
   puhkusel? **Sa räägid**…`. An Estonian shop assistant addressing an adult customer as `sa`
   is under-formal, so the whole scene is wrong — but flipping the single draft line would
   leave the customer polite and the assistant informal mid-scene. **Needs a scope decision:
   widen to the four non-draft rows, or leave the scene alone.** I left it alone.

2. **lav_for_eng scene 22 — the six annotated lines resolve cleanly under rule 2** if anyone
   is authorised to touch released audio-backed rows. Learner is Everita (f), Friend is Nils (m):
   `mācījies(-usies)` → `mācījusies`, `pārliecināts(-a)` → `pārliecināta`,
   `noguris(-usi)` → `nogurusi`, `priecīgs(-a)` → `priecīga`, `pārsteigts(-a)` → `pārsteigts`
   (Friend, male speaker). Two are second-person and agree with the **addressee**, the female
   Learner, not the male speaker: `tu esi gatavs(-a)` → `gatava`,
   `pārliecinātam(-ai)` → `pārliecinātai`. That second-person reading is my judgment, not
   Tom's ruling — rule 2 as written names the speaker. Worth confirming before writing.

3. **lit_for_eng scene 22 has the same second-person mismatch without annotations**, in
   non-draft rows: 22/6 `esi pasiruošęs`, 22/8 `Jau turėtum būti drąsus` and `nei pats
   supranti` are all masculine but address the female Learner. Same decision as (2).

## Confidence

Finnish, Estonian and Latvian: confident. Lithuanian gender agreement: confident (the four
forms are unambiguous first-person predicatives). Lithuanian register: confident that nothing
in the draft set is wrong; less confident that I would catch a subtle Lithuanian
over-formality, which is why I made no register changes there rather than guessing.

One thing I did not do and want to name: I did not second-guess the *translation quality* of
these drafts, only the three A-108 limbs. lit 5/1 `Ar turėjai ilgą dieną?` for "Did you have a
long day?" is a calque a Lithuanian would not say — out of scope here, but it suggests the
draft set has quality problems A-108 does not describe.
