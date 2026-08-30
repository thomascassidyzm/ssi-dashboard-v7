# Deborah's Welsh finding set — harvested, resolved to rows

**Read-only forensics for Kai, 2026-08-19.** Nothing changed: no code, no data, no audio,
nothing posted to Basecamp, no commits to any content. No machine transcription was used —
Kai ruled whisper out, and every finding below is a human report joined to database rows.

---

## The one-paragraph answer

Deborah's Welsh finding set is **complete, small, and it was never on the Creu Cyrsiau board**.
It lives in her own personal Basecamp project, in two to-do lists called **"QA Cymraeg y Gogledd"**
and **"QA Cymraeg y De"**, written in Welsh, dated **October–November 2025**. There are **seven**
findings with an audio dimension, not the one or two the canon records. Every one of them
resolves cleanly to database rows. The famous "angry eyes" case is **exactly 105 human clips** —
102 known/target1/target2 plus 3 presentation clips — and Kai's estimate was right on the nose.
The English known side **is** in scope: the English text today says *angry eyes* while the
recording says *pretty eyes*, so the English clips are as stale as the Welsh ones. And the sharpest
thing found: **Kai already did this work on 17 June 2026** and wrote the recording list, but that
document never reached `main` and is stranded on two backup branches, so it has been invisible for
two months.

---

## 1. Where the findings actually live

The brief pointed at the Creu Cyrsiau board. That was the wrong shelf, and the reason matters:
**there is no Welsh course card on the Creu Cyrsiau board at all.** All 39 cards were read, every
column, plus their descriptions. The only card with "Welsh" in the title is *Welsh Anthem for
Japanese Speakers*, which has an empty body and is a different course entirely.

The findings are in **Basecamp project 43553192, "Deborah"** — her own project, one of eight
personal projects on the account. They sit in to-do lists and in comments on to-dos:

| Where | Date | What it holds |
|---|---|---|
| To-do list **"QA Cymraeg y Gogledd"** (North), *description* | 2025-10-29 | The "pretty eyes" finding — one sentence, in the list body, exactly as the brief predicted |
| To-do **"Gwneud rhestr o wallau yn y cwrs"** (South), *comments* | 2025-10-28, 2025-11-01 | Five findings across two comments |
| To-do list **"QA Cymraeg y De"** (South), *comment* | 2025-10-31 | One finding relayed from a learner, Codi Mortimer |

This confirms the shape the brief described — her material is in **bodies and comments, not
card comments** — but on a different board than expected. Her Creu Cyrsiau presence is real but
covers other languages: Lebanese Arabic, Egyptian Arabic, Basque, Japanese, Korean, German.

---

## 2. The seven findings, verbatim

Deborah writes in Welsh. Her words are quoted exactly; the English is my translation and is
marked as such. **R, M and C are voice initials** — she identifies speakers by letter.

### North Welsh — "QA Cymraeg y Gogledd", 2025-10-29

> *"Gwregys Du - mae'r Saesneg a'r ddau lais yn dweud "pretty eyes" ond mae'r testun yn Gymraeg
> yn dangos "llygaid blin""*

*Translation: "Black Belt — the English and both voices say 'pretty eyes' but the Welsh text
shows 'llygaid blin' [angry eyes]."*

This is the source of canon rule A13, and the canon quotes it accurately. Note what she says
precisely: **the English says "pretty eyes" too.** It is not only the two Welsh voices.

### South Welsh — comment of 2025-10-28

> *"some postcards" - mae R yn dweud "bwl o gardiau"; mae M yn dweud "cwpl o gardiau post"*
>
> *"Never again" - mae cyflwyniad a R yn dweud "byth"; mae'r testun a M yn dweud "byth eto"*
>
> *"I will never" - mae cyflwyniad a R yn dweud "fydda i"; mae'r testun a M yn dweud "fydda i byth"*

*Translation: "some postcards" — R says "bwl o gardiau"; M says "cwpl o gardiau post". ·
"Never again" — the presentation and R say "byth"; the text and M say "byth eto". ·
"I will never" — the presentation and R say "fydda i"; the text and M say "fydda i byth".*

The canon carries the middle one as A13's second instance and the first one as A14. **The third
one — "I will never" / "fydda i byth" — is in no canon rule and appears nowhere in the repo.**

### South Welsh — comment of 2025-11-01

> *testun - "could you tell me something before you go?" - prompt dim ond "something before you go"*
>
> *"I'm surprised at how much I've done in a short time" - mae C yn dweud dim ond "dw i'n synnu at
> faint dw i 'di gwneud", mae R yn iawn*

*Translation: text is "could you tell me something before you go?" — the prompt is only "something
before you go". · "I'm surprised at how much I've done in a short time" — C says only "dw i'n synnu
at faint dw i 'di gwneud" [I'm surprised at how much I've done], R is correct.*

The first is canon rule A15. **The second — voice C truncating the sentence — is in no canon rule.**

### South Welsh — comment of 2025-10-31, relayed from a learner

> *Oddi wrth Codi Mortimer: in the south welsh course, for the prompt 'they'd just started to spend
> more time working at home/o'n nhw Newydd ddechrau hala mwy o amser yn gweithio gytre.' The audio
> ends with cwrdd fel grwp instead of gweithio gytre. It's happened a couple of times but only just
> got to pause it and write down which prompt it was.*

**This finding is in no canon rule and nowhere in the repo.** It is the most diagnostically
interesting of the set — see §5.

---

## 3. Every finding resolved to database rows

All counts are live as of 2026-08-19. "Human clips" means `course_audio.origin = 'human'` —
that column is a clean discriminator and it is the one I used. Clip counts cover the whole
lego family: the LEGO itself plus all its practice phrases, across all three of the
known / target1 / target2 roles.

| # | Finding | Course | Seed | LEGO | Current text (known → target) | Human clips | Roles |
|---|---|---|---|---|---|---|---|
| 1 | **Angry eyes** | cym_n_for_eng | **272–274** | S0272L05, S0273L01, S0274L07 | "these angry eyes" → *y llygaid blin yma* | **30** + 1 presentation | known, target1, target2, presentation |
| 1b | **Angry eyes** | cym_s_for_eng | **290–321** | S0290L03, S0290L07 + 7 more | "these angry eyes" → *y llygaid crac yma* | **72** + 2 presentation | known, target1, target2, presentation |
| 2 | **Some postcards** | cym_s_for_eng | **275** | S0275L05 | "some postcards" → *cwpl o gardiau post* | **24** | known, target1, target2 (+1 presentation) |
| 3 | **Never again / byth eto** | cym_s_for_eng | **292** | S0292L05 | "ever again" → *byth eto* | **21** | known, target1, target2 (+1 presentation) |
| 4 | **I will never / fydda i byth** | cym_s_for_eng | **292** | S0292L08 | "I will never" → *fydda i byth* | **21** | known, target1, target2 (+1 presentation) |
| 5 | **Prompt shorter than text** | cym_s_for_eng | **259** | S0259L02 | "could you tell me something before you go?" → *allet ti ddweud rhywbeth wrtha i cyn i ti fynd?* | **36** | known, target1, target2 |
| 6 | **Voice C truncates** | cym_s_for_eng | **102** | S0102L01 | "I'm surprised at how much I've done in a short time" → *dw i'n synnu at faint dw i 'di gwneud mewn amser byr* | **39** | known, target1, target2 |
| 7 | **Wrong audio tail** | cym_s_for_eng | **175** | S0175L02 | "they'd just started to spend more time working at home" → *o'n nhw newydd ddechrau hala mwy o amser yn gweithio gytre* | **24** | known, target1, target2 |

Findings 3 and 4 land on **adjacent legos in the same seed** (cym_s seed 292, legos 5 and 8).
That is a coherent result, not a coincidence: Deborah reported them together because she met
them together.

---

## 4. The eyes case — and the English question, answered

**The brief's reading is correct. The English known side is in scope.**

Deborah reported in October 2025 that the English *said* "pretty eyes". Today the English text
in the database says **"angry eyes"** — I checked every one of the 34 affected rows and all of
them read *angry*. So the text on both sides was corrected and **the recordings were not**. The
English clips are therefore exactly as stale as the Welsh ones.

The full row count for the eyes case:

| Course | Content rows | known (English) | target1 | target2 | presentation | Total human clips |
|---|---:|---:|---:|---:|---:|---:|
| cym_n_for_eng (seeds 272–274) | 10 | 10 | 10 | 10 | 1 | **31** |
| cym_s_for_eng (seeds 290–321) | 24 | 24 | 24 | 24 | 2 | **74** |
| **Total** | **34** | **34** | **34** | **34** | **3** | **105** |

**Kai's "~105 clips" is exactly right.** It counts 34 content rows across three voice roles,
plus the three presentation clips. **34 of those 105 are English known-side clips.**

Every one of the 105 is `origin = 'human'`, `audio_revision = 1`, and `created_at = 2026-01-04`.
Revision 1 with no later revision means **nothing here has ever been re-recorded**. The defect is
completely unrepaired.

---

## 5. Why no instrument could ever have caught this

Two mechanisms, both structural, and the second one is new.

**First: `course_audio.text` is the script, not the recording.** It stores what the speaker was
*asked* to say. I searched all 40,686 Welsh clips for text containing *llygaid del* — the "pretty
eyes" wording — and found **zero**. That is the expected result, and it is the whole problem: the
database has no field anywhere that records what a voice actually said. A text-versus-recording
mismatch is invisible by construction.

**Second, and this is the sharper one: the presentation clip's stored text contains no Welsh at all.**
The presentation clips read, verbatim:

- cym_s S0292L05 → *"Okay, now, moving on, the way I want you to say "ever again" is:"*
- cym_s S0292L08 → *"Now, for "i will never" I want you to say:"*
- cym_n S0272L05 → *"Right, let's get you using "these angry eyes" which is:"*

The Welsh word the presenter speaks comes **after the colon** and is never written down. So when
Deborah reports "the presentation says *byth* but the text says *byth eto*", there is no field in
the estate that holds the presenter's *byth* to compare against. This is the concrete mechanism
behind clash C21, and it explains why A13's second instance is undetectable even in principle.

---

## 6. The provenance of canon rule A13 — and a two-month-old worklist nobody saw

**A13 and C21 both entered the repo in a single commit**, `6b4f3365`, *"docs: course methodology
canon — one place to look before touching course content"*, by thomascassidyzm on **18 August 2026**
— yesterday. It added `docs/course-methodology-canon.md` and nothing else, 669 lines. Its message
names its sources, and Basecamp is one of them: *"Basecamp (Aran's 'Courses' doc, unread since
2026-02-10, and Deborah's Welsh QA findings)."* So the canon was distilled directly from the
material harvested above. **There is no intermediate source document** — the canon is the first
time her Welsh findings were written down in the repo. That is an explicit gap closed rather than
a document to go find.

**But there is an earlier document, and it is the important one.** On **17 June 2026** — two months
before the canon — Kai wrote `docs/en-cy-north-blin-recording-list.md` (commit `2c9c2c8c`,
author kai-saraceno). It is a complete, correct re-recording worklist for the North Welsh eyes
case. It opens:

> *"The North Welsh course content is "angry eyes" / "y llygaid blin yma" (seeds 271–273). The
> earlier audio mistakenly said "pretty eyes" / "y llygaid del yma". Text has been rolled back to
> the correct angry / blin wording; the audio below needs (re-)recording."*

It lists 12 English recordings — including the presentation line, whose wording matches the live
database clip **word for word** — and 11 Welsh phrases needing both voices. It even records that
2 English clips were borrowed from the South course as a stopgap, and notes that **nothing is
reusable from South because North uses *blin* and South uses *crac***.

**That document is not on `main`.** It exists only on `origin/kai-stage-backup-2026-07-28` and
`origin/kai-stage-uncommitted-2026-07-28`. It was never deleted — it simply never landed. So the
analysis was done, was right, and then became invisible, which is why the same defect had to be
rediscovered by ear this month.

One discrepancy worth a look: Kai's June list gives the North seed range as **271–273** and
includes a Welsh phrase, *"fyddai dim byd yn gwneud fi'n hapusach na dianc rhag y llygaid blin
yma"*, which is **not in the North course today** — the near-identical sentence now exists only in
the South course, with *crac*. The live North range is **272–274**. Either the content moved
between June and now, or the June list was drawn slightly wide. It does not change the totals
above, which were counted from the live database, but it means the June list should not be handed
to a recordist unchecked.

---

## 7. What is not in the canon

Three of the seven findings have never been written into any rule, and two of those three appear
nowhere in either repository:

| Finding | Canon status |
|---|---|
| Eyes / *llygaid blin* | A13, recorded accurately |
| *byth* vs *byth eto* | A13 second instance, recorded accurately |
| Postcards, R vs M | A14, recorded accurately |
| Prompt shorter than text | A15, recorded accurately |
| **"I will never" / *fydda i byth*** | **Not recorded anywhere** |
| **Voice C truncates the sentence** | **Not recorded anywhere** |
| **Wrong audio tail (Codi Mortimer)** | **Not recorded anywhere** |

The last one deserves attention on its own. The learner heard *cwrdd fel grŵp* ("meeting as a
group") at the end of a sentence whose text ends *gweithio gytre* ("working at home"). Both
sentences exist in the South course, one seed apart, and they are identical except for the tail:

- cym_s seed **175**, S0175L02 — *o'n nhw newydd ddechrau hala mwy o amser yn **gweithio gytre***
- cym_s seed **176**, S0176L01 — *o'n nhw newydd ddechrau hala amser yn **cwrdd fel grŵp***

So this is not a speaker error. It has the shape of **the wrong clip being served** — a
mislink between two near-identical neighbours — which is a different defect class from the other
six, and one that *is* mechanically detectable. It is worth chasing separately.

---

## 8. Gaps, stated plainly

- **Archived and trashed Basecamp items were not read.** The API's `status=archived` and
  `status=trashed` filters were passed and **silently ignored** — all three requests returned the
  same 39 active cards. Deborah is known to have archived lists. If she archived a Welsh QA list,
  its contents are not in this harvest and I cannot say what was in it.
- **The Campfire chats were not read.** Basecamp's cross-project recordings API does not return
  chat lines, so any finding she typed into a chat rather than a to-do is outside this sweep.
- **Voice identity cannot be resolved from the database.** Every one of the 40,636 Welsh human
  clips carries `voice_id = 'legacy_import'`. Deborah names her speakers R, M and C; the database
  cannot tell you which clip is R's and which is M's. So for findings 2, 3, 4 and 6 — all of which
  say *one* voice is wrong and the other is right — **the row lists above cannot be narrowed to
  the offending voice**. A human ear is still required to pick which of the two target clips to
  re-record, and until that is done the safe assumption is both.
- **Recording dates are unavailable, as reported.** `recording_provenance` is empty across all
  Welsh human clips and `created_at` is the single bulk-import date 2026-01-04 for every one of
  them. Neither can date a recording. This confirms the brief's premise rather than working
  around it.
- **The Basecamp reader corrupts multibyte characters.** The upstream HTTP layer does not set a
  UTF-8 encoding, so a character straddling a network chunk boundary can be destroyed. I checked
  the quoted passages above for the replacement character and found none, so the verbatim Welsh
  quotes are clean — but this cannot be guaranteed for text I did not inspect character by
  character.
- **Deborah's non-Welsh findings were not harvested.** Her Creu Cyrsiau material on Lebanese
  Arabic, Egyptian Arabic and Basque is substantial and out of scope for this brief.

---

## 9. What this adds up to for a recordist

The re-record list for the eyes case is **105 human clips**, and it breaks down as:

- **34 English known-side clips** — the English text now says *angry eyes*, the recordings say
  *pretty eyes*. These were previously easy to miss because the defect was described as a Welsh
  problem.
- **68 Welsh clips** — 34 in each of the two target voices. North needs *blin*, South needs *crac*,
  and nothing can be shared between the two courses.
- **3 presentation clips** — one North, two South.

The other six findings add roughly 165 further clips across seeds 102, 175, 259, 275 and 292 of the
South course, though four of those six should be narrowed by ear to a single voice first, which
would roughly halve the target-side work.
