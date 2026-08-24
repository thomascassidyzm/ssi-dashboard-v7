# A-108 — spa_for_eng, spa_mx_for_eng, cat_for_eng

361 staged draft pod lines examined. 29 changed. Applied 2026-08-14.

| Course | Drafts | Register | Gender | Annotations |
|---|---|---|---|---|
| spa_for_eng | 128 | 0 | 0 | 0 |
| spa_mx_for_eng | 117 | 0 | **3** | 0 |
| cat_for_eng | 116 | **26** | 0 | 0 |

## The annotation limb is empty, checked independently

I did not take this from FINDINGS. An eight-mark detector — ASCII and Unicode slash,
round parens ASCII and full-width, square brackets both widths, braces, angle/guillemet,
backslash — returns **0 hits across all 361 rows**. Nothing to do on rule 1.

## Catalan carried the whole register defect

Every service scene in `cat_for_eng` addressed the staff on `tu`. The barista is asked
`Tens menjar?`, the taxi driver hands the fare over with `Aquí ho tens`, the hotel
receptionist wishes you `Que gaudeixis de la teva estada`. That is exactly the fault Tom
ruled against — flattening service dialogue to informal.

26 lines moved to `vostè`. Scenes 2, 3, 7, 8, 9, 11, 12, 14 in full, plus 8 solo-practice
lines in scenes 15–21 that are addressed to a counter (`Tens gelat?` → `Té gelat?`) or are
the staff's own line being rehearsed (`Voldries pagar…?` → `Voldria pagar…?`).

Three of those are not a bare `tens → té` swap and are worth naming:

- `Sopeu aquesta nit?` → `Sopen aquesta nit?` — bartender to a group; V takes the
  `vostès` 3rd-plural, not `vosaltres`.
- `Us queda lloc per a les postres?` → `Els queda lloc…` — the clitic moves too.
- `Aquí tens el teu cafè` → `Aquí té el seu cafè` — the possessive follows the verb.

## Mexican Spanish: the Learner is a woman and three lines said otherwise

`spa_mx_for_eng` carries `gender:'n'` on the Learner, but the cast voice is **Eve**, and
Tom's rule keys on the voice. Three predicate adjectives agreed masculine:

| Line | Before | After |
|---|---|---|
| S16.2 | no estoy **seguro** de si te entendí | no estoy **segura** |
| S19.2 | me hace sentir un poco **preocupado** | **preocupada** |
| S19.3 | me hace sentir **tonto** | **tonta** |

Its register was already right, and its vocabulary is genuinely localised rather than
copied from the parent — `camión`, `boletos`, `jugo`, `papas fritas`, `Ya llegamos`. The
sibling-variant rule holds here.

## Iberian Spanish needed nothing

`spa_for_eng` service scenes are already on `usted` throughout — `¿Qué le pongo?`,
`Aquí tiene su café`, `¿Les queda sitio para el postre?`, `Pruebe con paracetamol`. The
note in my brief that "spa service scenes appear to use tu with a barista" does not hold
against the current draft rows; either it was read off the non-draft `pod-0` rows or it
has since been repaired.

Its Learner is **Manuel, male**, so the masculine agreement standing in `seguro`,
`preocupado`, `tonto`, `nervioso` is correct and was left alone. The two Spanish courses
therefore disagree on gender **on purpose** — different casts.

## Left alone, deliberately

- **`Gracias por ser tan simpático`** (spa and spa_mx, S20.10). The adjective agrees with
  the *addressee*, not the speaker, and rule 2 keys on the speaker. The addressee is
  unspecified. Masculine unmarked stands; a slash form would breach rule 1.
- **`Can you tell me where the toilet is?`** stays T in all three, while
  **`Can you tell me how much that is?`** is V. Not an oversight: a price question has no
  non-service reading, a toilet question does — you might be asking a companion. Flagging
  it as a taste item rather than harmonising it silently.
- **The thanking block** (S20.4–S20.9, "thank you for all your work", "you're very kind")
  stays T in all three. Not *clearly* a stranger, so rule 3's default holds.

## Gaps and things I did not touch

1. **The xAI voice `sal` is gender-neutral** — `voice-discovery-service.cjs:191` declares
   it so, and the cast metadata contradicts itself, calling sal `f` for Barista and `m`
   for Waiter/Bartender/Tourist. So "read gender off the voice" has a hole. It did not
   bite here: no sal-voiced speaker in spa_mx says a self-referential gendered line. But
   the next course may differ, and this is Tom's call, not mine.
2. **Three defects outside A-108 scope, not touched:**
   - spa_mx S11.4 `tercera planta` — Iberian; Mexican Spanish says `piso`.
   - spa_mx S8.10 `Me gustaría dos copas más de cerveza` — number agreement (`gustarían`),
     and `copas` is odd for beer.
   - cat S20.1 `Puc tenir una bola de xocolata…` — calque of "Can I have"; natural Catalan
     is `Em posa una bola…`.

## Confidence

High on all three. The Catalan work is morphological substitution within the `tu`/`vostè`
paradigm, with the scene canon deciding which — not a subtle idiom call. The one place I
am making a judgement rather than applying a rule is whether a Barcelona café genuinely
warrants `vostè`; plenty of baristas do use `tu`. Tom's ruling is explicit that service
scenes take V and are not to be flattened, so I applied it.

## How it was written

Gated script, `scripts/a108-apply-spa-spamx-cat.cjs`, dry-run first. Each row's before-state
is in its own `WHERE` clause and the transaction aborts unless exactly 29 rows change.
`target_text_draft` is never named in a `SET` clause; re-queried afterwards and all 29 rows
are still `true`, with per-course draft counts unchanged at 128/117/116. Direct SQL, not the
`PATCH /sentence/:sentenceId` route. **No audio generated.**

Per-row log with before, after and reason: `docs/a108/spa-spamx-cat-applied-log.json`.
