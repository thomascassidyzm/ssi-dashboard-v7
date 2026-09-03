# Register additions — worker T-255 (gle_cn_for_eng, seeds 255–261)

Decomposition only. No seed target text was translated or PATCHed. Zero TTS; `course_audio`
was 0 rows before and 0 rows after.

Every row below is a **known → target** pair this band introduced as a lego or component gloss,
i.e. a choice a later band could plausibly make the other way. Coordinator to merge and ZUT-sweep.

| English (known) | Irish (target) | seed | authority | confidence |
|---|---|---|---|---|
| do you think you'll be | `a cheapann tú a bheas tú` | 255 | the audited seed target itself | confident (in the seed), see note 1 |
| ready to leave | `réidh le himeacht` | 255 | pattern of `réidh le dul` (S26), `réidh le tosú` (S252); `imeacht` is already the course's word for *to leave* (S274) | confident |
| that I'll be | `go mbeidh mé` | 256 | regular `go` + future; matches `cén uair a bheidh mé` (S80) | confident |
| less than | `níos lú ná` | 256 | Ó Dónaill `beag` comparative; matches the course's `níos mó` / `níos fearr` | confident |
| an hour | `uair an chloig` | 256 | Ó Dónaill, the ordinary phrase for a clock hour | confident |
| blue | `gorm` | 257 | Ó Dónaill | confident |
| that blue thing | `an rud gorm sin` | 257 | band ZUT sheet (already fixed there) | confident |
| over there | `thall ansin` | 258 | Ó Dónaill `thall`; `thall ansin` is the ordinary spoken pairing | confident |
| an idea | `smaoineamh` | 259 | band ZUT sheet; consistent with `smaoineamh maith` (S123), `do smaoineamh` (S125) | confident |
| the faintest idea (in `I don't have the faintest idea`) | `tuairim dá laghad` | 260 | the audited seed target | confident (in the seed) |
| that maybe | `go mb'fhéidir` | 261 | the audited seed target; `b'fhéidir` is well attested (191 real hits once the apostrophe trap is worked around) | best attempt for the extended frame, see note 3 |
| it's something important | `gur rud eicínt tábhachtach é` | 261 | copula `gur … é`, exactly the shape of `gur smaoineamh maith é sin` (S123/124) | confident |

## Notes for the coordinator

**1. Seed 255 puts a finite present of `ceap` into the course.** The audited target is
`Cén uair a cheapann tú a bheas tú réidh le himeacht?` — a relative `a cheapann tú`, where the
register's live form for *I think* is the progressive `tá mé ag cheapadh` and for *what do you
think* is `céard atá tú ag cheapadh`. There is **no formal ZUT break** (three distinct English
prompts, three distinct targets), but it is the first finite present of `ceap` in the course and a
later band writing *do you think* after a different question word could easily reach for
`atá tú ag cheapadh` instead and split the pattern. Worth a ruling row.

I kept the whole thing as **one atomic tile** (`a cheapann tú a bheas tú`) rather than splitting
`a cheapann tú` and `a bheas tú`, because both are relative forms that only exist after a relative
antecedent: split out, neither could be practised in a sentence a learner could actually build,
and `a bheas tú` glossed as *you'll be* would collide with the ordinary `beidh tú` the moment a
later seed needs it.

**2. `smaoineamh` now carries two known prompts.** Seed 91 already teaches `smaoineamh` = *to
think* (verbal noun); seed 259 adds *an idea*. ZUT is intact (prompt → target is still one-to-one)
and the server accepted it without a duplicate skip, but a reader should know the collision is
deliberate.

**3. `go mb'fhéidir go bhfuil sé …`.** Seed 261's own sentence is `go mb'fhéidir gur … é`, which is
audited. To give the tile enough practice sentences I extended it to `go mb'fhéidir go bhfuil sé
…`. That is regular and I believe it is ordinary speech, but it is not directly attested in what I
could probe, so it is labelled **best attempt** and is the first thing I would show a speaker.

**4. "might" is not a licensed known-side word at this point in the course.** The known-side gate
rejected every practice sentence containing it, so seeds 261's practice lines say *that maybe it's
something important* rather than *it might be something important*. The seed's own English is
untouched.

**5. Open items: `try` count = 0.** Nothing in 255–261 contains *try* or *trying*, so there are no
`<!--TRY-OPEN-->` annotations. No new *how to* embedded clauses either — no `<!--HOWTO-OPEN-->`.
No `chun`-future and no `ag dul a` was written.
