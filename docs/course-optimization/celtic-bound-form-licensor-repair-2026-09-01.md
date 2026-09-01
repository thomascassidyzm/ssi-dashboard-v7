# Celtic bound-form / licensor-outside-chunk repair — 5 courses

> **⚠️ SUPERSEDED FOR WELSH (2026-09-01, later the same day).** Kai ruled that the Welsh
> courses are hand-built and that the mutated form on the card is Aran's deliberate authoring
> choice, not a defect: *"Please undo the fixes."* **All eight Welsh LEGO edits in
> `cym_s_for_eng`, `cym_n_for_eng` and `cym_nnew_for_eng` have been reverted, their audio
> links restored and their re-record flags cleared.** Everything this document says about
> Welsh describes a state that no longer exists. The other courses stand.
> See `docs/course-optimization/welsh-mutation-revert-2026-09-01.md`.

*2026-09-01. Executing Kai's ruling, verbatim: **"Yup, fix all and regenerate."** Scope:
the Celtic family minus Connacht Irish (`gle_cn_for_eng`, already repaired). Every defect
below was re-derived against the live database and against each course's own attested
practice before anything was touched; the cross-course scan's "confirmed" was treated as a
lead, never as authority.*

**Headline: 14 LEGO cards and 10 practice phrases repaired across 5 courses. Two clips
re-rendered and verified in Irish. The Welsh half cannot be regenerated at all — all three
Welsh courses are human-voice, and the audio-pass queue refuses them by design; six human
takes now sit in the re-record queue and six cards are silent until Aran and Catrin
record them. That is the pass's main gap and it is stated in full below.**

---

## The defect shape, as it actually presents in Celtic

A LEGO stores an initial-mutated form as the chunk's base — correct only after the trigger
that happens to precede it *in the seed sentence* — and the trigger sits in the **adjacent
LEGO**, outside the chunk. The card is then presented bare, with nothing licensing the
mutation, and the learner is taught a form that is wrong on its own.

Every repair below took **case two — correct the form** (Kai's clause 2), never a boundary
redraw. In every instance the course itself already teaches the radical/citation form
elsewhere, usually for the *same known prompt*, so merging the licensor in would have
contradicted the course's own settled practice and would have cost a lego-index shift,
reissued phrase ids and a learner-progress migration for nothing. **No boundary moved. No
lego index moved. No phrase id was reissued. No `course_audio` row was deleted.**

---

## 1. `gle_for_eng` — Irish — 2 defects, both fixed, audio regenerated ✅

Seeds 51 and 52 — one build family, exactly as the scan said.

| | known | was | is now |
|---|---|---|---|
| `S0051L06` | "friends" | `chairde` | **`cairde`** |
| `S0052L06` | "friend" | `chara` | **`cara`** |

Plus the two build phrases that present those chunks bare:
`gle_for_eng:S0051L06B01` "friends" → `chairde` → **`cairde`**, and
`gle_for_eng:S0052L06B01` "friend" → `chara` → **`cara`**. Both `decomposition`
segments updated in the same edit; both recompose to the new target text
character-for-character.

### Why case two, on the course's own evidence

`chairde`/`chara` are the lenited forms, licensed in the seeds by `mo` (S0051L05) and
`a` "his" (S0052L05) — adjacent LEGOs, outside the chunk. Everywhere else in the course
the lenited form is stored **together with its licensor**: `do chara` (S0083L05,
S0267L03), `faoi mo chara` (S0084L01), `do chairde` (S0283L02), `ar chara` (S0284L02),
`ó mo chara` (S0138L02), `ó chara` (S0267L02B02). The radical is what the course cites:
`cara` (S0265L01 "a friend"), `cúpla cara` (S0216L02), `cara liom` (S0130L03),
`is cara liom í` (S0136L03), `is cairde muid` (S0110L01), and the word-level component
`gle_for_eng:S0130L03C01` "friend" → `cara`.

S0051L06 and S0052L06 were the **only** two places in 114 legos and 5,000-odd phrases
storing a bare lenited form as a chunk.

**This fix also removes a ZUT collision:** `S0052L06` "friend" → `chara` sat against
`S0265L01` "a friend" → `cara` — near-identical known prompts, two different targets.
They now agree.

### What was deliberately left alone

Every licensed occurrence — 40-odd phrases with `le mo chairde`, `chuig a chara`,
`do chara`, `faoi mo chara`, `ó mo chara` — untouched. A post-fix sweep for
`ch(ara|airde)` not preceded by a lenition trigger returns exactly one row,
`S0266L01 seanchara` ("old friend"), where the lenition is compound-internal after
`sean-` and correct.

### Audio

`gle_for_eng` is cleanly configured on Azure (`ga-IE-OrlaNeural` / `ga-IE-ColmNeural`,
known and presentation `en-GB-SoniaNeural`) — **no retired-provider block here.**

| clip | role | voice | rev | result |
|---|---|---|---|---|
| `cairde` `1d2bd24f` | target1 | `azure_ga-IE-OrlaNeural` | 1→2 | rendered, 1,980 ms, 24,480 bytes |
| `cairde` `a10dc6ed` | target2 | `azure_ga-IE-ColmNeural` | 1→2 | rendered, 1,836 ms, 22,752 bytes |
| `cara` `76ef28be` | target1 | `azure_ga-IE-OrlaNeural` | 1 | **relinked, not rendered** — an existing same-voice clip |
| `cara` `ed338e3e` | target2 | `azure_ga-IE-ColmNeural` | 1 | **relinked, not rendered** |

The two `cara` links were resolved by the text-change trigger itself
(`relinked-same-voice`) onto existing clips whose stored text is `Cara.` — same word,
same voice, capitalised sentence spelling. The trigger's choice was left standing.

Both presentation clips were nulled by the trigger
(`nulled-presentation-not-text-addressable`) and **restored** by
`/regenerate-presentation`, which found the existing clip unchanged and re-linked it
(`created: false`) — the known text did not change, so the narration is still correct.
All four target links and both presentation links read back live and correct.

#### ⚠️ GAP — CER cannot be reported for Irish, and this is a tooling fact, not a dodge

The veracity gate returns `unchecked_decode_error` on every Irish clip. The cause,
measured directly on the binary: **`whisper-cli` does not support the language `ga` at
all** — `whisper_lang_id: unknown language 'ga'`. (Same for `gd`, Scottish Gaelic.
`cy` — Welsh — *is* supported.) `ga` is not in `audio-veracity.cjs`'s
`DECODER_NOT_VALIDATED` set, so the module fails with a confusing "decode error"
rather than the honest "decoder cannot read this language". **No CER exists for any
Irish clip in this estate.**

What I could verify instead, and did:

- correct voice on the `course_audio` row, correct text, correct duration, non-silent
  (−19.9 / −19.5 dB mean), bytes present on S3;
- an **advisory** cross-model decode showing the lenition is genuinely gone from the
  audio, not just from the row:

  | | old clip (`chairde`) | new clip (`cairde`) |
  |---|---|---|
  | target1, Orla | "Chordza." | "Cordza." |
  | target2, Colm | "Hwyrdwch." | "Corrige." |

  The aspirated /x/ onset in the old takes is absent from the new ones, replaced by a
  /k/ onset, in both voices. Read as an initial-consonant contrast only — the decoder
  is reading Irish through a model that has no Irish, so the word-level transcript is
  noise and no CER should be inferred from it.

---

## 2. `cym_s_for_eng` — South Welsh — 4 defects fixed, 1 held for Kai

**My re-derivation found four defects to the same standard, not two.** All four are
LEGO cards storing a soft-mutated form whose licensor lives in the seed sentence outside
the chunk. I could not map the scan's unnamed "borderline third item" onto a specific
row, so I have named the one I judge weakest and left it alone.

| | known | was | is now | licensor in the seed |
|---|---|---|---|---|
| `S0121L01` | "to eat" | `fwyta` | **`bwyta`** | `rhywbeth i'w fwyta` |
| `S0189L01` | "to happen" | `ddigwydd` | **`digwydd`** | `yn mynd i ddigwydd` |
| `S0199L01` | "to make sure" | `wneud yn siŵr` | **`gwneud yn siŵr`** | `iddyn nhw wneud yn siŵr` |
| `S0292L06` | "coffee" | `goffi` | **`coffi`** | `dishgled o goffi` |

### The evidence, which is unusually strong

**The course teaches every other "to <verb>" chunk in the radical.** 33 LEGOs have the
known form "to <verb>": `siarad`, `dysgu`, `ymarfer`, `cofio`, `gwella`, `dweud`,
`gwybod`, `gwylio`, `yfed`, `hedfan`, `meddwl`, `trafod`, `newid`, `esbonio`, `dringo`,
`ystyried`, `colli`, `eistedd`, `chwarae`, `byw`, `talu`, `cyrraedd`, `cadw`, `gadael`,
`anadlu` … — including plenty with mutable initials (b-, c-, d-, g-, t-). **Exactly two
were mutated: `fwyta` and `ddigwydd`.**

**The build phrases under those very LEGOs already carry the radical.** The LEGO card
contradicted its own scaffold:
`cym_s_for_eng:S0121L01B01` "to eat" → `bwyta`;
`cym_s_for_eng:S0189L01B02` "to happen" → `digwydd`;
`cym_s_for_eng:S0292L06B01` "to drink coffee" → `yfed coffi` and `…B06` →
`mae coffi ar y llinell felen`, with the mutation appearing only where licensed
(`dishgled o goffi`, `dianc rhag goffi`).

**S0199L01 was a live ZUT collision.** `S0177L03` already teaches the identical known
prompt "to make sure" as `gwneud yn siŵr`. One known prompt, two targets. The fix
removes it.

**And the human narration settles it out loud.** These courses' presentation clips are
Aran's own recorded introductions, and their scripts name the form:

> *"The Welsh for* **to eat** *is* **bwyta**, *but you'll very commonly hear* **byta**
> *in the south.* **Byta**." — `S0121L01`
> *"Meanwhile, back at the ranch, the Welsh for* **to happen** *is* **digwydd**.
> **Digwydd**." — `S0189L01`
> *"The Welsh for* **to make sure** *is* **gwneud yn siŵr**. **Gwneud yn siŵr**."* — `S0199L01`

A native Welsh speaker is already saying the radical on the card the row got wrong.

### HELD FOR KAI — `S0279L01` "a big world" → `fyd mawr`

Same shape: `byd` soft-mutated to `fyd`, licensed in the seed by predicative `yn`
(`ma fe'n fyd mawr`), and every one of the nine phrases using it keeps that `yn`. The
LEGO card is the only bare occurrence. The radical `byd` is attested in-course at
`S0290L01 dim byd` ("nothing"). **I judge this a real defect and would fix it to
`byd mawr`**, but the standing instruction was that the Welsh borderline is Kai's call,
so it is untouched. One statement closes it:

```sql
UPDATE course_legos SET target_text='byd mawr'
 WHERE course_code='cym_s_for_eng' AND lego_id='S0279L01' AND target_text='fyd mawr';
```

(That would drop its two `legacy_import` target links — no `byd mawr` human take
exists — so it carries the same re-record cost as `coffi` below.)

### Audio — three healed for free, one silenced

`cym_s_for_eng` has **no voice configuration at all** (all four roles blank) and its
19,992 clips are `legacy_import` — Aran and Catrin's legacy recordings. There is no TTS
route and there should not be one.

| LEGO | outcome |
|---|---|
| `S0121L01` `bwyta` | **relinked-same-voice** to existing human takes `4a816cad` / `23c9dc2f` |
| `S0189L01` `digwydd` | **relinked-same-voice** to `7f3623bf` / `5ca84e67` |
| `S0199L01` `gwneud yn siŵr` | **relinked-same-voice** to `370e2935` / `d21671f6` (S0177L03's takes) |
| `S0292L06` `coffi` | **no `coffi` take exists — both links dropped, card is now silent** |

Verified on the served bytes. Welsh *is* readable by the decoder (`cy`), but
whisper-small is a known unreliable referee for Welsh, so I read the **initial
consonant** rather than a CER — which is precisely the thing under test:

| clip | voice | decoded |
|---|---|---|
| `4a816cad` t1 | `legacy_import` | "**B**u ita." |
| `23c9dc2f` t2 | `legacy_import` | "**Bw**ysa." |
| `7f3623bf` t1 | `legacy_import` | "**D**ick with." |
| `5ca84e67` t2 | `legacy_import` | "**D**ig with." |
| `370e2935` t1 | `legacy_import` | "**Gn**eud yn siŵr." |
| `d21671f6` t2 | `legacy_import` | "**Gwneud yn siŵr**." (exact) |

Every one begins on the radical consonant — b-, d-, g- — never `f-`, `dd-` or `wn-`.
The human takes say the corrected form.

All four presentation narrations were nulled by the trigger
(`nulled-presentation-not-text-addressable`) and **restored by hand to their original
clip ids** — the narration scripts quoted above are still correct for the new text, and
these are irreplaceable human recordings that no regeneration route could rebuild.

---

## 3. & 4. `cym_n_for_eng` and `cym_nnew_for_eng` — North Welsh — 2 defects each, fixed

The two northern courses share the same content and the **same clip ids**, so this is
one defect pair appearing twice — the scan's "same build event" is exactly right, though
it is 2 LEGOs, not 1.

| | known | was | is now | licensor in the seed |
|---|---|---|---|---|
| `S0266L02` | "many reasons" | `lawer o resymau` | **`llawer o resymau`** | `mae na lawer o resymau` |
| `S0266L05` | "the end" | `ddiwedd` | **`diwedd`** | `aros tan ddiwedd` |

Seed 266 in both: *"there are many reasons to consider waiting for the end of the second
half"* → `mae na lawer o resymau i ystyried aros tan ddiwedd yr ail hanner`. The
licensors `mae na` and `tan` sit in the adjacent LEGOs `S0266L01` and `S0266L04`.

### Evidence

- `llawer` radical is attested in-course at `S0099L01` "a lot" → `llawer`.
- `diwedd` radical is attested by the **sibling southern course**, which teaches the
  same chunk correctly: `cym_s_for_eng:S0283L05` "end" → **`diwedd`** — and by the
  northern courses' own phrase `S0274L06B06` `aros tan y diwedd` (no mutation after the
  article).

### ⚠️ GAP — the audio cannot be regenerated, and four cards are now silent

Both courses are **human-voice** (`legacy_import`; the pod cast names Aran and Catrin,
`human_aran_cym_n` / `human_catrinlliar_cym_n`) and their `known`/`target1`/`target2`
voice ids are empty strings. `queue-audio-pass.cjs` refuses them outright and says why:

> `REFUSED: cym_n_for_eng is a human-voice course — no TTS is ever queued for it (Tom
> 2026-08-13). Changed content there is a recording task for Aran and Catrin.`

No `llawer o resymau` or `diwedd` take exists in either course, so the text-change
trigger dropped all four target links (`nulled-no-same-voice-clip-for-new-text`).
**`S0266L02` and `S0266L05` now have correct text and no target audio, in both courses
(two distinct clip pairs, shared).**

I deliberately did **not** hand-restore the incumbent takes. Whether Aran actually says
`lawer` or `llawer` is a single initial consonant and I could not settle it: whisper-small
decodes `1fbc2ea4` as "**Ll**awer o resymau" and whisper-medium as "**L**awr or yw'r
semyl" — the two models disagree on exactly the phoneme in question, and the `ddiwedd`
takes decode as nonsense English in both. Per the estate's own standing finding, whisper
cannot referee Welsh; this is an ear-only call and Kai's ear settles it in five seconds.
Restoring a link I could not verify is the precise failure O2 names — a learner told one
thing and hearing another.

Instead, following the exact precedent of Kai's 2026-08-19 "Welsh eyes" ruling (same
courses, same legacy text-vs-recording mismatch, same lever), **`rerecord_wanted` is now
set on the six superseded takes**, with the reason, the before→after text, the evidence
and the voice gender:

| clip | course | role | old text |
|---|---|---|---|
| `1fbc2ea4` | cym_n (shared w/ cym_nnew) | target1 (f) | `lawer o resymau` |
| `18058475` | cym_n (shared) | target2 (m) | `lawer o resymau` |
| `7e95e9d6` | cym_n (shared) | target1 (f) | `ddiwedd` |
| `6e9ed137` | cym_n (shared) | target2 (m) | `ddiwedd` |
| `88d5f5ba` | cym_s | target1 (f) | `goffi` |
| `27135ab6` | cym_s | target2 (m) | `goffi` |

Nothing was deleted. All six old takes are still in `course_audio`, unlinked; if Kai
listens and hears the radical, restoring any of them is a one-line link UPDATE.

Both presentation narrations were nulled by the trigger and **restored by hand**
(`1ca8a616` for `S0266L05`, `b7946b68` for `S0266L02`, in both courses). Neither script
names a Welsh form — *"here's how you're going to say 'end', as in 'the end'"* and
*"how to say 'many reasons'"* — so both remain correct.

### DELIBERATELY NOT FIXED — 8 build-scaffold phrases, listed for Kai

Four phrases per northern course present the mutated form sentence-initially:

| phrase (both courses) | known | target |
|---|---|---|
| `S0266L03B05` | "many reasons to consider" | `lawer o resymau i ystyried` |
| `S0266L04B04` | "many reasons to consider waiting until she speaks" | `lawer o resymau i ystyried aros tan iddi siarad` |
| `S0266L06B03` | "the end of the second half" | `ddiwedd yr ail hanner` |
| `S0267L04B03` | "the end of the holidays" | `ddiwedd y gwyliau` |

I left these because they are **fragments clipped out of a licensed sentence**, not
citations — `mae na lawer o resymau i ystyried` minus its opening — and whether a
build fragment keeps the mutation of the sentence it was cut from is a Welsh-editorial
call, not a mechanical one. Every one of them also holds a live human take (four distinct
clip pairs), so fixing them silences eight more clips with no route back. Every *other*
occurrence in both courses is properly licensed (`mae na lawer`, `ganddi lawer`,
`am lawer`, `gen i lawer`, `aros tan ddiwedd`, `ers … ddiwedd`) and was left alone —
I swept all 40-odd occurrences by preceding word to be sure.

---

## 5. `gla_for_eng` — Scottish Gaelic — the `thoilichte` finding CONFIRMED and fixed

The scan flagged this one "lower confidence, wants a native check", and the default was
do-not-fix. **My own reading confirms it to a higher standard than any other item in this
pass, so I fixed it.** The deciding evidence is not a grammar I recall — it is the
course's own word-level components, which gloss the identical known prompt with the
radical, twice.

| | known | was | is now |
|---|---|---|---|
| `S0076L02` | "happy" | `thoilichte` | **`toilichte`** |

Plus **8 practice phrases** where the lenited form appears with nothing licensing it:

| phrase | known | was | is now |
|---|---|---|---|
| `S0076L02B01` | "happy" | `thoilichte` | `toilichte` |
| `S0076L03B03` | "happy with what" | `thoilichte leis na` | `toilichte leis na` |
| `S0076L02U05` | "it's very important to be happy" | `…a bhith thoilichte` | `…a bhith toilichte` |
| `S0076L04U02` | "it is important to be happy with what I've learned" | `…a bhith thoilichte leis na…` | `…a bhith toilichte leis na…` |
| `S0076L04U03` | "it's not difficult to be happy with what I've learned" | `…a bhith thoilichte leis na…` | `…a bhith toilichte leis na…` |
| `S0076L03U03` | "I'm happy with what I know" | `tha mi thoilichte leis na…` | `tha mi toilichte leis na…` |
| `S0076L03U04` | "I am happy with what I am doing" | `tha mi thoilichte leis na…` | `tha mi toilichte leis na…` |
| `S0076L05U05` | "I'm already happy with what I've learned" | `tha mi thoilichte leis na…` | `tha mi toilichte leis na…` |

All 8 `decomposition` records were updated in the same edit and every one recomposes to
its new target text character-for-character (checked by string-concatenating the
segments and comparing to `target_text`).

### Why this is not a judgement call

Seed 76 is *"I'm very happy with how much I've learnt already"* →
`Tha mi glè thoilichte leis na tha mi air ionnsachadh mar-thà`. The licensor is **`glè`**
("very"), which lenites — and `glè` is a **separate LEGO**, `S0076L01`. Classic shape.

The course's own attested practice, on the same word:

- **`gla_for_eng:S0106L02C02` "happy" → `toilichte`** and
  **`gla_for_eng:S0129L01C02` "happy" → `toilichte`** — the *identical* known prompt,
  the radical, twice. `S0076L02` "happy" → `thoilichte` was a **live ZUT collision**
  against both. It is gone.
- `S0129L01` "so happy" → `cho toilichte` — `cho` does not lenite. Radical.
- `S0106L02` "to be happy" → `a bhith toilichte`, plus **10 phrases** with
  `a bhith toilichte`, against the 3 defective `a bhith thoilichte`.
- `tha mi toilichte` is attested repeatedly — including
  `S0245L01U01 tha mi toilichte leis na tha mi air a dhèanamh`, which is the same frame,
  word for word, as the defective `S0076L03U03 tha mi thoilichte leis na tha mi ag
  ionnsachadh`.

This matches the standard description of Gaelic lenition (Gaelic Orthographic Conventions
2009; Mark, *The Gaelic-English Dictionary*): `glè`, `ro` and `fìor` lenite a following
adjective; `cho` does not, the predicate adjective after `tha` is not lenited, and
`a bhith` does not lenite a following adjective. I am citing an external authority for
the description rather than inventing a house rule, and no orthography was normalised
anywhere in this pass.

**All 13 licensed `glè thoilichte` occurrences were left untouched** and verified intact
after the edit. A post-fix sweep for `thoilichte` outside `glè thoilichte` returns zero
rows.

### Audio — nothing to regenerate, nothing lost

None of the nine edited rows held any audio link at all, so the text-change trigger
recorded **zero** entries in `content_audio_link_drops` for this course and nothing was
silenced. Seed 76 was the one seed in the whole pass that was **approved**
(`approved_at` 2026-03-20), so per O5 it has been **unapproved** and returned to
proofreading. An audio-pass request is queued for `gla_for_eng` naming this repair.

---

## Ledger

| Course | LEGOs fixed | Phrases fixed | Clips rendered | Clips relinked | Clips silenced | Held / reported |
|---|---|---|---|---|---|---|
| `gle_for_eng` | 2 | 2 | 2 | 2 | 0 | — |
| `cym_s_for_eng` | 4 | 0 | 0 | 6 | 2 (`coffi`) | `S0279L01 fyd mawr` |
| `cym_n_for_eng` | 2 | 0 | 0 | 0 | 4 (2 pairs, shared) | 4 build fragments |
| `cym_nnew_for_eng` | 2 | 0 | 0 | 0 | *(same clips)* | 4 build fragments |
| `gla_for_eng` | 1 | 8 | 0 | 0 | 0 | — |
| **total** | **11** | **10** | **2** | **8** | **6 clips / 3 pairs** | — |

ZUT collisions **removed** by this pass: three (`gle_for_eng` friend/a friend;
`cym_s_for_eng` to-make-sure; `gla_for_eng` happy ×2). None created.

## Disputed findings

None. Every defect the scan named in these five courses survived re-derivation. In three
courses my reading found **more** instances of the same defect in the same build family
than the scan reported — cym_s 4 rather than 2, cym_n/cym_nnew 2 rather than 1 — and each
extra one is evidenced above from the course's own rows.

## Explicit gaps

1. **No CER exists for Irish, anywhere in this estate.** `whisper-cli` has no `ga`
   language; `audio-veracity.cjs` reports this as `unchecked_decode_error` rather than
   naming it, because `ga` (and `gd`) are missing from its `DECODER_NOT_VALIDATED` set.
   Adding them there would turn a confusing error into an honest "cannot check". Not
   done — out of this pass's scope.
2. **Six Welsh cards are silent** (`cym_s S0292L06 coffi`; `cym_n`/`cym_nnew`
   `S0266L02 llawer o resymau` and `S0266L05 diwedd`). No TTS may ever run on these
   courses. They need Aran and Catrin. `rerecord_wanted` is set on all six superseded
   takes with full context.
3. **Whether the incumbent northern takes already say the radical is unresolved** and
   whisper cannot settle it. Kai's ear can, and if they do, three link UPDATEs close
   gap 2 entirely without any recording.
4. **`cym_s_for_eng:S0279L01 fyd mawr` and the 8 northern build fragments** are
   confirmed-shape but deliberately unfixed, per the standing instruction and the
   fragment-vs-citation argument above.
5. The Welsh **mirror-direction** case (a LEGO storing the unmutated form where mutation
   is required) was explicitly out of scope and was not looked for.

## Not done, on purpose

No vitest or application test suite was run — this is course data, not application code.
No general course audit, no ZUT sweep, no `scan-course` pass, no re-run of the
cross-course scan, no attempt at Breton or the other families the scan itself declared
unscanned. `pdc_for_eng` was never touched.
