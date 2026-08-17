# Silent-slot repair — scope, with real numbers

**2026-08-17, per Tom's ruling: "do not start it; scope it: produce the per-course
relinkable-vs-render split so the approval has real numbers."**

**Nothing has been repaired.** This is measurement. Read-only throughout: no relink, no
render, no TTS, no deletion. Tool: `tools/deborah/silent-slot-repair-scope.cjs`
(re-runnable); raw per-slot verdicts: `docs/deborah/silent-slot-repair-scope-2026-08-17.json`.

---

## The headline number changed, upward — and here is why

My earlier estate figure was **1,034**. That counted `target1` only. Counting all three
audio columns a slot can have — `known`, `target1`, `target2` — the real figure is

> ## 2,820 silent slots across 19 courses

Nothing got worse between the two counts; the first was narrower than the problem. A
learner meets a `known` slot as often as a `target` one, so leaving the known side out
understated it by roughly two thirds.

## The split

| Course | Silent | **Relink (free)** | Voice-mismatch | **Needs render** | Distinct texts |
|---|---|---|---|---|---|
| `spa_for_eng` | **1,076** | 0 | 9 | **1,067** | 1,064 |
| `zho_for_eng` | 447 | 11 | 10 | 426 | 426 |
| `spa_mx_for_eng` | 306 | **256** | 14 | 36 | 36 |
| `ita_for_eng` | 185 | 2 | 7 | 176 | 176 |
| `kor_for_eng` | 156 | 0 | 5 | 151 | 151 |
| `fra_ca_for_eng` | 138 | 16 | 4 | 118 | 118 |
| `por_br_for_eng` | 121 | 1 | 5 | 115 | 115 |
| `eng_for_mar` | 100 | 14 | 20 | 66 | 66 |
| `por_for_eng` | 79 | 5 | 3 | 71 | 71 |
| `eng_for_por` | 56 | 12 | 2 | 42 | 40 |
| `ara_for_eng` | 51 | 0 | 0 | 51 | 51 |
| `cym_s_for_eng` | 44 | 0 | 11 | 33 | 33 |
| `fra_for_eng` | 34 | 2 | 18 | 14 | 14 |
| `eus_for_eng` | 14 | 0 | 0 | 14 | 12 |
| `gle_for_eng` | 5 | 0 | 0 | 5 | 5 |
| `ukr_for_eng` | 3 | 0 | 0 | 3 | 3 |
| `heb_for_eng` | 2 | 0 | 0 | 2 | 2 |
| `afr_for_eng` | 2 | 0 | 0 | 2 | 2 |
| `hun_for_eng` | 1 | 0 | 0 | 1 | 1 |
| **TOTAL** | **2,820** | **319** | **108** | **2,393** | **2,386** |

All 19 courses completed. **No gaps** — see "how this was measured" for two failures I
had to fix to get there.

## What the three columns mean, and why the middle one is not free

**RELINK — 319 slots (11%).** A clip already exists with the same normalised text, the
same role, a live `s3_key`, **and the exact `voice_id` this course has configured for that
role**, region included. Restoring these costs nothing, changes nothing audible, and is
reversible with a recorded before-image. This is the whole of the free win.

**VOICE-MISMATCH — 108 slots (4%). Deliberately NOT counted as free.** A clip exists for
the text and role, but on a *different voice*. Linking it would silently change which
voice a learner hears mid-course. That is a voice swap and needs its own approval, so it
sits in its own column. The strictness is on purpose: this estate has already published a
French reuse figure of 100% that was really 0%, because the identity key drops region.
Fold these into "relinkable" and the approval gets a number that is 34% too optimistic.

**NEEDS RENDER — 2,393 slots, 2,386 distinct texts.** Nothing exists on any voice. Only
TTS closes these, which is your spend decision. Note the near-1:1 slot-to-text ratio: there
is almost no internal duplication to exploit, so the render bill is essentially the full
2,386.

## The two things that decide the plan

**1. `spa_for_eng` is 38% of the problem and has a 0% free rate.** 1,076 silent slots, of
which **zero** are relinkable — its Spanish text is unique to it, so nothing can be
borrowed. It is also the course Deborah stopped checking, so nobody has reported these.
Any approval that covers only the cheap wins leaves the largest concentration untouched.

**2. `spa_mx_for_eng` is the opposite and should be done first.** 306 silent slots, **256
relinkable — 84% free.** Mexican Spanish shares text with `spa_for_eng` on identical voice
ids, so most of its damage is repairable at zero cost today. It is the single best
ratio on the estate and it needs no spend approval at all.

Between them: `eng_for_por` (12 of 56 free) and `eng_for_mar` (14 free, 20 voice-mismatch)
are free-ish because their *target* language is English, and English clips are shared
estate-wide across sibling `eng_for_*` courses. **This corrects worker #924**, which
reported "zero matches, so a relink can't rescue them" for `eng_for_por` — that check was
course-scoped; widened to the estate, 12 of its 56 are rescuable free. Its conclusion was
right about the Portuguese side and wrong about the English side.

## Recommended order (for your decision, not started)

1. **`spa_mx_for_eng` relinks — 256 slots, free, no approval needed beyond yours to
   proceed.** Best ratio on the estate.
2. **The rest of the relinks — 63 slots** across 8 courses. Also free.
3. **Rule on the 108 voice-mismatches** as a policy question, not case by case: is a
   voice change preferable to silence? A defensible answer is yes for a `known`-side slot
   and no for a target, but that is your call and I have not assumed it.
4. **Then the render pass — 2,386 texts**, sequenced per your ruling 1: after the trigger
   fix is live, and audio-first.

**Sequencing constraint that applies to all of it:** every one of these slots went silent
*because* a text edit re-resolved its link. Repairing them while the old trigger is live
is safe (a relink changes no text), but any repair bundled with a text change is not —
which is exactly the hold you have already placed.

## How this was measured, including two failures worth knowing about

Two bugs in my own first run, both of which would have produced **false all-clears** if
they had been swallowed:

- **Statement timeouts.** Paging every row of a 13–16k-phrase course with an `ORDER BY`
  hit the server timeout on `spa_for_eng`, `spa_mx_for_eng`, `zho_for_eng`, `ita_for_eng`
  and `fra_ca_for_eng` — five of the six biggest, i.e. exactly the courses that matter.
  Fixed by filtering to NULL-carrying rows server-side. The tool reported these as `GAP`
  rather than `0`, which is the only reason I noticed.
- **`zho_for_eng` failed reproducibly with a bare `TypeError: fetch failed`.** PostgREST
  sends `in.(…)` in the query string, and 100 Chinese phrases overflow the URL. Fixed by
  sizing batches on encoded bytes rather than row count. Any estate sweep that batches
  text values by count has this bug latent for CJK courses.

After both fixes, `eng_for_por` and `eus_for_eng` reproduced their pre-fix numbers exactly
(56/12/2/42 and 14/0/0/14), which is the evidence the changes altered throughput and not
semantics.

## Honest gaps

- **Cause is not measured here.** This scopes the *repair*; attribution is in the
  programme report, where confirmed loss-to-edit figures are a **floor** because
  `content_audit_log` is pruned to ~14 days. Some of these 2,820 may be never-rendered
  rather than lost — for `zho_for_eng` (4 of 149 target1 attributable) that is likely for
  most of them. **I have not separated the two causes, and the render bill does not
  depend on which it is.**
- **Verified in the database, not in the player.** I have not confirmed that a NULL
  pointer is audible silence rather than a client-side fallback for any of these courses.
- **`presentation` slots are not counted** — only `known`, `target1`, `target2`.
- Courses whose silent slots are a *majority* of their rows are excluded as never-built,
  not damaged: `ara_lb_for_eng` (6,506 of 12,333) is the clearest, and Deborah has only
  just started it.

---

# APPLIED — the 319 free relinks, per Tom's authorisation of 2026-08-17

**319 of 319 relinked. Zero failures. Zero spend. No text edited, so no trigger
interaction at all.** Tool: `tools/deborah/relink-silent-slots.cjs`. Logs:
`relink-2026-08-17-applied-spa_mx.json`, `relink-2026-08-17-applied-rest.json`
(every row carries its before-image and a one-line rollback).

| Course | Relinked slots | Rows |
|---|---|---|
| `spa_mx_for_eng` (proving batch) | **256** | 129 |
| `eng_for_mar` | 14 | 9 |
| `fra_ca_for_eng` | 11 | 9 |
| `zho_for_eng` | 10 | 11 |
| `eng_for_por` | 10 | 6 |
| `por_for_eng` | 5 | 5 |
| `ita_for_eng` | 2 | 2 |
| `fra_for_eng` | 2 | 2 |
| `por_br_for_eng` | 1 | 1 |
| **TOTAL** | **319** | **174** |

Every link: pointer was NULL first (never an overwrite), the clip's voice_id matched
the course's configured voice for that role exactly, the S3 object was **HEAD-checked
alive before the pointer moved**, and the row was re-read afterwards to confirm the
pointer resolves to a live `s3_key`.

## Proving batch verified through the production endpoint

Six sampled clips fetched from the live learner endpoint
(`ssi-learning-app.vercel.app/api/audio/<id>`):

| Result | Detail |
|---|---|
| HTTP | **200 on all six** |
| Bytes | 21,888 / 23,904 / 23,040 / 24,480 / 24,480 / 24,768 — **exactly matching the S3 HEAD sizes in the log** |
| Content | `fffb…` MP3 frame sync; `ffprobe` → `format_name=mp3`, `duration=1.764` |

Real audio, served live, byte-identical to what was verified before the write.

## ⚠ Read this before counting the 319 as a learner win

**It mostly isn't one, and I would rather say so than let the number flatter the work.**

Of the 174 rows restored, by `phrase_role`:

| | Rows |
|---|---|
| `build` / `use` — drilled by the bundle, learner-audible | **38** |
| `component` — **never drilled by the bundle** | 131 |
| LEGO rows — always learner-facing | 5 |

**So roughly 43 of 174 rows are learner-reachable.** And the proving batch is the worst
case: **all 129 `spa_mx_for_eng` rows are `component` rows**, so its headline "256 slots,
84% free" is entirely data-integrity repair with **no audible change for any learner**.
Correct to have done — a NULL pointer is a real defect, it corrupts every future census
(it inflated my own), and component rows do feed component intros — but it is not 256
restored learner slots and should not be reported as such.

The learner-audible restorations are the 38 build/use rows and 5 LEGOs, in
`eng_for_mar`, `zho_for_eng`, `fra_ca_for_eng`, `eng_for_por`, `por_for_eng`,
`ita_for_eng`, `fra_for_eng` and `por_br_for_eng`. One of them is
`eng_for_por` **S0028L01 "as soon as possible"** — Deborah's own item 7 — now live on
all three roles.

## A bug in my own verification, disclosed

The first estate run reported **8 verify-failures**. They were false: my after-write read
used `.eq('lego_id', …).maybeSingle()` **without `course_code`**, and `lego_id` is not
unique across courses (every course has an `S0028L01`), so the read matched many rows and
returned nothing. The *writes* were correctly scoped; only the check was wrong. I
confirmed all five rows directly — every one is live on all three roles — and fixed the
tool. **The final 319/319 includes them.** Worth stating plainly: a verification that is
broken in the *lenient* direction would have reported success; this one broke loudly.

---

# THE RENDER BILL — costed two ways, and it is small

**~2,386 renders, 88,883 characters, mean 37 characters per render.**

| Method | Basis | Total |
|---|---|---|
| A — measured per-render | today's Sinhala job: 81 renders for $0.014 → $0.00017/render | **$0.41** |
| B — per-character | Azure neural standard, $16/1M chars | **$1.42** |
| B (upper bound) | Azure neural **HD**, $30/1M chars | **$2.67** |

**Say it plainly: the entire render bill for all 2,386 silent slots is about $1.40, and
under $3 on the worst assumption.** Method B is the one to quote — Azure prices per
character, and the Sinhala job's texts were likely shorter than these. This is an
afternoon's spend decision, not a programme.

Per course (at $16/1M): `spa_for_eng` **$0.85** (1,067 slots — 60% of the whole bill),
`zho_for_eng` $0.11, `ita_for_eng` $0.09, `kor_for_eng` $0.06, `por_br_for_eng` $0.07,
`fra_ca_for_eng` $0.06, `por_for_eng` $0.04, `eng_for_mar` $0.03, `eng_for_por` $0.03,
`ara_for_eng` $0.02, `spa_mx_for_eng` $0.02, `cym_s_for_eng` $0.01, and nine courses at
under a cent each. **`eus_for_eng` — Deborah's course, the one she is re-doing by hand —
is $0.006.**

---

# THE 108 VOICE-MISMATCH — held, and they are four different things

Tom held these, and he was right to. But they are not one class, and treating them as one
would get three of the four wrong.

| Class | Slots | Courses | What it actually is |
|---|---|---|---|
| **(a) Same voice, different id PREFIX** | **21** | `eng_for_mar` 18, `fra_ca_for_eng` 2, `spa_mx_for_eng` 1 | **Not a mismatch at all.** `bedd6226` and `xai_bedd6226` are the same voice; my exact-string test rejected them on a prefix. **These are free.** |
| (b) Course has **no configured voice** for the role | 11 | `cym_s_for_eng` 11 | `voice_config` has no `known` voice, so there is nothing to match against. A **config defect**, to fix before any repair. |
| (c) Genuine different voice or accent | **72** | `fra_for_eng` 18, `spa_mx_for_eng` 13, `spa_for_eng` 9, `zho_for_eng` 7, `ita_for_eng` 7, `kor_for_eng` 4, `por_br_for_eng` 5, others | The real decision. Includes true region swaps — `spa_mx` wants `es-MX-Carlota`, has `es-ES-Elvira`; `por_br` wants `pt-BR`, has `pt-PT`. |
| **(d) Cross-LANGUAGE candidate** | **4** | `zho_for_eng` 3, `kor_for_eng` 1 | **Must never be linked.** A Chinese and a Korean slot each have a candidate under `xai_ara` — an *Arabic* voice id. This is the cross-language mislink family, and it is a finding in its own right. |

**One word from you converts class (a) — 21 slots — to free.** I did not apply them: they
are exact-voice in substance but not in string, and on the day whose whole theme is
"never silently change a learner's voice", stretching your authorisation from
exact-match to prefix-equivalent is not mine to do.

**Disclosure on the (c) evidence:** my candidate lookup filtered by role but **not by
language**, so for very short texts the "available voices" lists cross languages — French
`un` shows candidates on Spanish, Galician, Latvian, Italian, Catalan and Romanian voices,
because `un` is a word in all of them. That does **not** affect any relinkable or applied
count (those required an exact voice match, which implies the right language), but it does
mean the class (c) lists are noisier than they look, and class (d) was found *because* of
that noise rather than by design.

---

# Also applied: the queueAudioPass reason-append fix

Per Tom's ruling 4. `services/shared/audio-pass-queue.cjs` now appends with ` || ` instead
of overwriting, de-duplicates on retry, selects `reason` so it can see what it is merging,
and logs the merged text. `requested_by` is left last-writer-wins with a comment saying
why that is a choice and not a bug. Merge logic unit-tested 6/6 (null, empty, new, repeat,
already-present-in-list, third addition); module loads clean.

---

# FINAL — the four classes ruled and closed

Tom's rulings of 2026-08-17 on classes (a)–(d), all executed. **340 slots relinked in
total, zero spend. The render bill is $1.44.**

## (a) The 21 same-voice slots — APPLIED, proved per row by `decodeVoiceId`

Tom's condition was to prove equivalence with **the estate's own decoder**, not string
surgery. Done: `tools/deborah/relink-silent-slots.cjs` now imports `decodeVoiceId` from
`services/audio-repair-core.cjs` and compares `{provider, voiceId}` after decode.

Its verdicts on the real cases, before anything was written:

| Pair | decodeVoiceId |
|---|---|
| `xai_bedd6226` vs `bedd6226` | **SAME** |
| `xai_gfzdpspr5fdp` vs `gfzdpspr5fdp` | **SAME** |
| `azure_en-GB-SoniaNeural` vs `en-GB-SoniaNeural` | **SAME** |
| `xai_eve` vs `azure_en-GB-SoniaNeural` | DIFF |
| `azure_es-MX-CarlotaNeural` vs `azure_es-ES-ElviraNeural` | DIFF |
| `xai_leo` vs `azure_fr-FR-HenriNeural` | DIFF |

**21 of 21 relinked**, 14 rows: `eng_for_mar` 18, `fra_ca_for_eng` 2, `spa_mx_for_eng` 1.
Every one recorded with `voice_equivalence: "decodeVoiceId"` in the log, so the basis for
each link is auditable rather than asserted. No row was disputed by decode, so none stayed
held on that ground. Log: `relink-2026-08-17-applied-decode21.json`.

**Running total: 319 + 21 = 340 slots relinked, 188 rows, zero spend, zero failures.**

## (b) The 11 `cym_s_for_eng` rows — filed as a config defect

`courses.voice_config` for `cym_s_for_eng` has **no `known` voice at all** — that is what
`wanted_voice: null` meant. Neither authorised route reaches them: relinking needs the
configured voice to prove equivalence, and rendering needs it to know what to render *in*.
Filed at `docs/deborah/fix-item-cym-s-missing-known-voice.md` with the question for Kai
(confirming `azure_en-GB-SoniaNeural` would make all 11 free). **Excluded from the render
bill** for that reason.

## (c) The 72 genuine voice differences — folded into the render pass

Per Tom: rendering them in the **correct** voice costs pennies and sidesteps the whole
substitution question. They move out of the link list and into the bill.

| | Renders | Characters |
|---|---|---|
| Previously "needs render" | 2,386 | 88,883 |
| **+ folded in from classes (c) and (d)** | **+60** | +1,429 |
| **TOTAL** | **2,446** | **90,312** |

*(60, not 72, because a render is keyed on distinct text × role — several of the 72 slots
share a text with a row already in the bill.)*

## (d) The 4 cross-language slots — never linked, and now structurally impossible

Two assertions added to the relink tool, so this class cannot be chosen by mistake again:

- **Language assertion** — a clip's `language` must canonicalise to the course's language
  for that role, via `canonicalLanguage` from `services/shared/clip-identity.cjs`. **Fails
  closed**: that function throws on a sentinel or an unknown code (it rejects nine of the
  estate's course languages outright), and a language we cannot assert is a language we do
  not link.
- **Voice assertion** — `decodeVoiceId` equivalence, applied to *every* candidate
  whichever list it arrived on, not only to the promoted ones.

**Verified against the real hazards, not just assumed from a zero count:**

| Check | Result |
|---|---|
| `xai_ara` clip for a `zh-CN` slot | **refused** |
| `xai_ara` clip for a `ko-KR` slot | **refused** |
| clip language `ara` / `ar` vs course `zho` | **refused** |
| `eu-ES` vs `eus`, `en-GB` vs `eng`, `pt_BR` vs `por` | **allowed** (regional variants of one language) |
| `auto`, `""`, `null` vs `eng` | **refused** (fails closed) |

The dry run over `zho_for_eng` and `kor_for_eng` promoted **0** rows — and the table above
is why that zero means "refused" rather than "never looked".

---

# THE RENDER DECISION, as it should read to Kai

**2,446 renders, 90,312 characters. $1.44 at Azure neural standard; under $3 worst case.**
Two independent methods: $0.42 by today's measured per-render rate (Sinhala: 81 renders
for $0.014), $1.44 per-character at $16/1M. Quote the per-character figure — Azure prices
per character, and the Sinhala texts were shorter than these.

| Course | Renders | Cost |
|---|---|---|
| `spa_for_eng` | 1,072 | **$0.86** (60% of the bill) |
| `zho_for_eng` | 436 | $0.11 |
| `ita_for_eng` | 183 | $0.09 |
| `kor_for_eng` | 156 | $0.07 |
| `por_br_for_eng` | 120 | $0.07 |
| `fra_ca_for_eng` | 120 | $0.06 |
| `por_for_eng` | 74 | $0.04 |
| `eng_for_mar` | 68 | $0.03 |
| `ara_for_eng` | 51 | $0.02 |
| `spa_mx_for_eng` | 48 | $0.02 |
| `eng_for_por` | 42 | $0.03 |
| `cym_s_for_eng` | 33 | $0.01 |
| `fra_for_eng` | 18 | $0.01 |
| **`eus_for_eng`** | **12** | **$0.006** |
| 5 more | 13 | <$0.01 |

## And the honesty that has to travel with it

**340 slots relinked is not 340 restored learner slots.** Of the 188 rows:

| | Rows |
|---|---|
| `build` / `use` — drilled by the bundle, learner-audible | **~59** |
| `component` — **never drilled by the bundle** | ~131 |
| LEGO rows — always learner-facing | 5 |

The free repair is mostly **data-integrity work**: it removes NULL pointers that corrupt
every future census (they inflated my own first count from 1,034 to 2,820), and it costs
nothing, but a learner hears the difference in roughly a third of it. `spa_mx_for_eng`'s
257 relinked slots are **entirely** component rows — no learner hears any of them.

**The learner-audible repair is overwhelmingly in the render pass, not the relinks.** That
is the number the decision turns on: **$1.44 buys back 2,446 slots that are currently
silent**, including all 1,072 in `spa_for_eng` — the course Deborah stopped checking and
whose silence nobody has reported. `eus_for_eng`, where she is redoing audio by hand right
now, is six tenths of a cent.

---

# CORRECTIONS — two, both mine, both material

## 1. `cym_s_for_eng` cannot be rendered at all. The bill is $1.43, not $1.44.

I filed its 11 held slots as a "missing known voice config" defect. **That was wrong.**
Its `voice_config` holds only a `podCast` block — **no course voices at all** — because
`cym_s_for_eng` is a **HUMAN-VOICE-ONLY course and TTS is forbidden on it** by Tom's ruling
of 2026-07-25 (`services/shared/human-voice-courses.cjs`, enforced at
`phase8-audio-v13.cjs:1905`, which short-circuits `/generate` with
`SKIP … no TTS generated`).

So I had **wrongly included its 33 slots in the render bill**. Removed:

| | Renders | Characters | Azure standard |
|---|---|---|---|
| As previously stated | 2,446 | 90,312 | $1.44 |
| **Corrected** | **2,413** | **89,424** | **$1.43** |

Trivial in money, **wrong in kind**: a render pass containing them would have been skipped
by phase8 and reported as a no-op. All **44** of its silent slots need a **human recording**
from Catrin's queue, not pennies of TTS. Fix item rewritten accordingly. Checked the other
18 courses — **`cym_s_for_eng` is the only human-voice course in this set.**

## 2. My filler-Build detector measures the wrong thing. Worker #925 was right.

Worker **#925** validated the detector I built, as it was asked to, and found an **81%
false-positive rate**: 13 of 16 sampled "confirmed" clusters are normal, correct SSi
practice — *"She speaks Spanish / a lot / very well"*. **That criticism is correct and I
accept it.** My definition is **structural** (residue ≤ 3 tokens); Deborah's defect is
**semantic** (the residue carries no meaning). "very well" and "yesterday" are
indistinguishable to my test and completely different to a learner. Its recurrence gate is
also satisfied by `my`/`your`/`the`, which are not filler either.

The tool's header claim that it "reproduces all five of Deborah's real examples" needs the
same correction. It was true of the **logic applied to her quoted strings offline** — I
tested that, 5/5 — and it is **not** true of the tool **run against the database**, because
those rows are not there (see below). A reader would take the header for the second claim.
**#925's corrected detector, which requires a semantically-empty residue (~10–15% FP), is
the instrument to use.** Its result: `spa_for_eng` **15 confirmed Builds in 7 clusters
(0.3%)**, while unchecked courses are far worse — `ces_for_eng` **776**, `ara_eg_for_eng`
**387**.

### And I verified the `spa_for_eng` reconciliation myself, precisely

#925 reported "her quoted Builds aren't in the DB". That is right in substance but too
loose, and the precise version matters:

- **Her LEGOs and their Builds DO exist.** 25 rows match her quoted texts.
- **Those Builds are varied and correct** — `because he has been playing until they are
  ready`, `because he has been playing since the second day of…`, `dirty and wet because he
  has been playing`. This is good practice, not filler.
- **Not one of the 14 exact filler forms she quoted exists.** I tested each:
  `was absolutely right here` / `yesterday` / `before`, `in the mud here` / `yesterday` /
  `before`, `I am feeling sad yesterday` / `before`, `small yesterday` / `here` / `before` /
  `for everyone`, `because he has been playing here` / `yesterday` — **0 of 14 found.**

**So Deborah is describing content that the database does not contain, under LEGOs that it
does.** Her "nearly every Build" and the measured 0.3% cannot both describe the same rows.
The most likely explanation is that she is reading a **cached baked script** rather than
live content — and if that is so, it may also bear on her "my fixes reverted" reports,
because a stale script would show her old text *and* old audio together.

**This is the one thing I would put to her before `spa_for_eng` is judged at all**, and the
question to ask is narrow: **which surface is she reviewing in, and when did it last
refresh?** Note it does *not* dissolve the Basque alarm — those 7 NULL pointers are real
and measured in the live database, not in a cache.
