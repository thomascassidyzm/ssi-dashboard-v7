# A-108 Celtic pass — cym_s, cym_n, gle (2026-08-14)

**Result: 221 staged drafts examined, zero writes.** Tom's three A-108 rules — no annotations,
gender matches the speaker, tu-by-default-V-for-strangers — are all either already satisfied or
structurally inapplicable in these three languages. No SQL ran, so every `target_text_draft = true`
flag is exactly as it was.

Per-row log with a reason on every line: `docs/a108/celtic-cym_s-cym_n-gle-applied-log.json`.

| Course | Drafts examined | Register changes | Gender changes | Annotation changes |
|---|---|---|---|---|
| cym_s_for_eng | 104 | 0 | 0 | 0 |
| cym_n_for_eng | **0** | — | — | — |
| gle_for_eng | 117 | 0 | 0 | 0 |

`cym_n_for_eng` has 231 pod sentences and **not one** with `target_text_draft = true`. There is
nothing in A-108 scope for Northern Welsh; it was not skipped, it is empty.

## Rule 1 — annotations

Mechanical scan of all 221 drafts for `/`, `(`, `)`, `[`, `]`, `i.e.`, `e.g.`: **zero hits.** No
slash forms, no bracketed glosses, no parentheticals. Clean.

The `…` that appears mid-line in the Welsh drafts is the estate's recording-chunk separator, not an
annotation, and it is present in already-recorded non-draft rows too — left alone.

One near-miss worth naming so nobody "fixes" it later: the gle speaker label is
`Neighbour (10:30 pm)`. Those parentheses are in the `speaker` column, which is production
metadata and never reaches the learner. Not a rule-1 violation.

## Rule 2 — gender matches the speaker

**Structurally no-op in both languages, on every line in the set.** Neither Welsh nor Irish
inflects predicate adjectives or participles for the gender of the person speaking. The Spanish
`cansado/a` failure mode cannot be expressed here: "I'm very tired" is `Dw i wedi blino'n ofnadwy`
and `Táim an-tuirseach` regardless of who says it.

The gendered morphology that *is* present in these drafts is third-person, about the referent, not
the speaker — and it is correct:

- `cym_s SC18-S009` "my son lost **his** ticket" → `ei **d**ocyn` (soft mutation, masculine)
- `cym_s SC18-S010` "my daughter has lost **her** ticket" → `ei **th**ocyn` (aspirate, feminine)

Both casts are single-gender-per-role and unambiguous anyway: cym_s is two human voices (Catrin f /
Aran m), gle is Orla f / Colm m. No `gender:'n'` Learner problem arises — cym_s Learner is Catrin
(f), gle Learner is Orla (f) — but since nothing agrees with the speaker, it changes no text.

## Rule 3 — T-V register

### Irish: there is no T-V distinction to apply

This is the honest headline for gle. Irish `tú` / `sibh` is **number only** — singular vs plural.
`sibh` is not a polite singular the way `vous` or `usted` is; addressing one stranger as `sibh` is
simply ungrammatical, not formal. So rule 3 has no Irish surface to act on.

Verified rather than assumed: zero occurrences of `sibh` / `bhur` / `sibhse` across all 117 drafts,
and every line addressing one person uses singular forms (`agat`, `leat`, `duit`, `ort`, `tú`) —
including all ten service scenes. That is correct Irish, and flattening or elevating any of it
would be a defect, not a fix.

### Welsh: one T-form line, and it is in a peer scene

Welsh does have the distinction, and `chi` is genuinely ambiguous between polite-singular and
plain-plural — so I judged by addressee, per your note.

Across 104 cym_s drafts there is exactly **one** T-form line:

- `SC05-S002` Sarah → Neighbour: "See you tomorrow" → `Wela i **di** fory`

Scene 5 is a peer scene in the canon (Neighbour), so T is right. Everything else is `chi`, and
every one of those is either a service/stranger scene (2, 3, 7, 8, 10, 11, 12, 14 — V correct) or a
scene 15–21 solo-practice line in the traveller thread, where the addressee is a shopkeeper, a
driver, a receptionist or a Welsh-speaking stranger the learner is asking to slow down
(`Allwch chi weud wrtha i…`, `os allwch chi siarad yn araf`, `eich iaith **chi**`). V is correct
there under your exception clause, and several are plural anyway. Nothing to flatten.

Southern forms are used throughout and consistently — `moyn`, `'da fi`/`'da chi`, `gweud`/`weud`,
`licen i` / `licech chi`, `falle`, `dre`, `fan hyn`. Nothing was copied from any other Welsh
variant, and cym_n was not touched.

## Confidence, stated plainly

- **Welsh (cym_s):** high on the three rules, and the drafts read as good idiomatic southern Welsh
  to me. I am a competent reader of Welsh, not a native South Walian — a native pass would still be
  worth having before recording, but I found nothing I would change.
- **Irish:** high confidence on the three rules — the "no T-V" and "no speaker-gender agreement"
  facts are structural, not judgment calls. **Lower confidence on general fluency**, which is what
  the previous worker flagged. See below: I think they were partly right and partly wrong, and I am
  explicitly not confident enough to rewrite Irish to native standard myself.

## The earlier Irish fluency flag — assessed, not acted on

These are **outside** A-108's three rules, so I have written nothing. Listing them as decision
candidates because the batch is 117 fresh drafts staged only this morning and it is cheaper to rule
now than after recording.

**The `sea` flag was right, twice, and it is a real error:**

- `SC03-S007` Barista answers "do you have any food?" with `**Sea**, ar mhaith leat an biachlár?`
  Irish has no all-purpose "yes" — an `An bhfuil…?` question is answered `Tá`. `Sea` only answers a
  copula question. Should be `Tá`.
- `SC21-S008` `**Sea**, dúirt mé go bhfuil sé thall ansin` answering "can you say that again?" —
  same error; the echo is `Is féidir`.

**The `tá`/`níl` flag was wrong** — the free-standing ones are correct verb-echo answers:
`Níl, tá sé saor` (SC02), `Níl, níl againn ach deochanna` (SC03), `Is féidir, ar ndóigh` (SC14),
`Ba mhaith, le do thoil` (SC03), `Bhí…` (SC05). That is exactly how Irish says yes and no.

**The `sneaic` flag was overstated.** `sneaic` / `sneaiceanna` is dictionary-attested modern Irish
(focloir.ie). `greim le hithe` would be warmer, but this is a taste call, not a defect.

**What I would actually flag instead — English-calqued greetings:**

- `SC05-S001` Neighbour opens a 10:30pm conversation with `Oíche mhaith, a Shára`. `Oíche mhaith`
  is a *parting* — "good night", not "good evening". Opening should be `Dia duit` (or `Tráthnóna
  maith agat`). This one I am confident about.
- `SC03-S002`, `SC11-S001` open with `Tráthnóna maith` as a greeting — a calque of "good
  afternoon"; Irish greets with `Dia duit`. Moderately confident.
- `SC14-S007` "Here we are" → `Seo dúinn`. Not idiomatic; `Seo linn` / `Tá muid ann`. Moderately
  confident.
- `SC12-S007` "all right to take with food" → `le **tógáil** le bia`; medicine is `glac` in Irish,
  not `tóg`. Moderately confident.
- `SC19-S003` `cuireann sé mothú amaideach orm` reads as a word-order calque; `braithim amaideach`
  is the natural phrasing. Moderate.
- `SC18-S004/005/006` `An bhfágann an bád **as seo**?` / `Cá bhfágann an bus?` — `imigh` fits
  departures better than `fág` here. Moderate.
- `SC16-S002` `ró-thapa` should be `róthapa` under the caighdeán (no hyphen). Low-stakes,
  high-confidence orthography.

My recommendation: **do not record gle pod-0 until a native Irish speaker reads the 117 drafts.**
The grammar is broadly sound and the register is fine, but the greeting calques are the kind of
thing a learner would copy and a native would wince at. That is a one-hour read, not a rebuild.

## Provenance note

All 117 gle drafts were written at 09:38 UTC today into rows that were previously empty strings
with `target_text_draft = false` (confirmed in `content_audit_log.old_row`). So this is a fresh
staging batch, not an edited one, and nothing moved under this pass while it ran.
