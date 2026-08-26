# The four candidates, re-cut — tier coverage, exit cost, and the bridge frame

**Slice `gz-recut` of phase 1. Compiled 2026-08-26.**
This replaces the frame of [`gate-zero-candidates-2026-08-26.md`](./gate-zero-candidates-2026-08-26.md),
not its research. That document was finished moments before Tom's course correction reached it. Its
vendor work is sound and is reused here in full, with every original citation intact; its headline —
Welsh — is gone.

Machine-readable per provider, all four updated in place on top of this: `coverage-cartesia.json`,
`coverage-chatterbox.json`, `coverage-minimax.json`, `coverage-openai.json`. Each now carries a
`headline` block keyed on tier coverage, an `exit_cost` block, tier-based `coverage_counts`, and the
old Welsh analysis demoted to `welsh_footnote`.

**Nothing here was measured.** There is no Cartesia key, no MiniMax key and no OpenAI key on this
box; phase 1 spends zero; Chatterbox cannot run here at all. Every claim carries the URL, code path
or DB query that established it, and where a vendor will not say, this document says so.

---

## The headline: coverage is not the discriminator

**On the migration scope — the part that actually has to be re-voiced off xAI — all four candidates
are exactly equal.**

| | Cartesia | Chatterbox (OSS) | MiniMax | OpenAI |
|---|---|---|---|---|
| **Tier B — xAI migration scope (11)** | **10/11** | **10/11** | **10/11** | **10/11** |
| Tier B miss | pdc | pdc | pdc | pdc |

The single miss is the same language at every vendor: **pdc**, Pennsylvania Dutch, which no TTS
vendor on earth supports. And `pdc_for_eng` is **`not_available`, and holds exactly one audio clip**
(live `courses` and `course_audio`, queried 2026-08-26). It is not a shipped course, it is not a
blocked course, it is a stub. So the one language that separates the candidates on Tier B separates
nothing at all.

**The consequence, stated plainly: language coverage does not decide this decision.** The four are
indistinguishable on the commercial core. What is left to decide on is **version pinning, exit cost,
cloning terms and quality** — and of those, quality is the only one phase 1 cannot touch.

This inverts the original dossier, which ranked the field on Welsh. Removing Welsh does not just
change the ranking; it removes the axis the ranking was built on and leaves nothing in its place.
That absence is the most useful finding in this slice.

Where coverage *does* bite is **Tier A**, and it bites on live courses:

| | Cartesia | Chatterbox (OSS) | MiniMax | OpenAI |
|---|---|---|---|---|
| **Tier A — live on synthetic (10)** | **9/10** | 7/10 | 8/10 | **9/10** |
| Tier A misses | glg | hrv, ben, glg | ben, glg | ben |
| **Tier B — xAI scope (11)** | 10/11 | 10/11 | 10/11 | 10/11 |
| **Tier A+B+C (44)** | 29/44 | 22/44 | 31/44 | **40/44** |
| A+B+C misses | 15 langs | 22 langs | 13 langs | eus, gle, ben, pdc |

Those Tier A misses are shipped, populated courses, not aspirations — clip counts from
`course_audio`, 2026-08-26:

| Language | Course | Status | Clips | Missed by |
|---|---|---|---|---|
| `hrv` | `hrv_for_eng` | **live** | 29,021 | Chatterbox |
| `ben` | `ben_for_eng` | **live** | 20,315 | Chatterbox, MiniMax, **OpenAI** |
| `glg` | `glg_for_eng` | **live** | 15,931 | Chatterbox, MiniMax, **Cartesia** |
| `pdc` | `pdc_for_eng` | not_available | **1** | all four |

Read together: **OpenAI and Cartesia each miss exactly one live course; MiniMax misses two;
Chatterbox misses three.** Tier C is where OpenAI's breadth actually shows — 40/44 against MiniMax's
31 and Cartesia's 29 — and Tier C is beta, so that breadth is a *scale-out* argument, not a
ship-tomorrow one.

### Languages no candidate covers

Recomputed against the 44-language tier set rather than the whole 68:

> **`pdc`, `eus`, `gle`** — three languages, covered by none of the four.

- **`eus` (Basque)** is the one that matters. `eus_for_eng` (28,893 clips) and `eus_for_spa`
  (20,009 clips) are both beta with 300 seeds each — **48,902 clips of live-ish Basque** that no
  candidate on this shortlist can re-voice. That is an operational fact, not a footnote.
- **`gle` (Irish)** — `gle_for_eng` is beta with **25,665 clips**. (The three other Irish courses,
  `gle_cn`/`gle_ul`/`gle_mu`, are `not_available` with zero audio.)
- **`pdc`** — one clip, not_available, discussed above.

For completeness, the original dossier's count against all 68 target languages survives the reframe
unchanged and is worth keeping: **19 real target languages are covered by none of the four** — bre,
cor, **eus**, fur, gla, **gle**, hak, lmo, mlt, nan, nap, **pdc**, rgn, roh, scn, sme, vec, yid, yor.
The narrowing from 19 to 3 is entirely the tier frame doing its job: sixteen of those nineteen are
languages we are not currently rendering TTS for. **No single candidate is the estate's answer**, and
the minority-language tail needs its own plan that this slice was not asked to write.

---

## Per-candidate verdicts, Welsh removed and the bridge frame applied

### OpenAI TTS + Custom Voices — **the strongest hosted candidate, and the easiest hosted bridge to leave**

Widest tier coverage by eleven languages (40/44), the best written version-pinning position — dated
snapshots `gpt-4o-mini-tts-2025-03-20` and `-2025-12-15` both callable, behind a published ≥6-month
notice policy for GA models — and the only candidate whose **contract writes the exit down**:
Customer "owns all Output", OpenAI "assigns to Customer all OpenAI's right, title, and interest" in
it, the IP clause is enumerated among those that **survive termination**, and OpenAI must delete all
Customer Content within **30 days** of the agreement ending. It is also the only candidate with a
first-class consent API, so Aran's and Catrin's consent has both a place to live and a documented
way to be withdrawn.

Against it: **no timestamps of any kind**, a **fixed 24 kHz** output, **no pronunciation control
whatsoever** (prose `instructions` only — and an unversioned natural-language control is the
opposite of repeatability), one live course uncovered (`ben`), and Custom Voices restricted to
"eligible customers" behind a sales conversation nobody has had. For a product that teaches
pronunciation, the pronunciation-control gap is a real risk, not a nit.

**Verdict: first for phase 2.** The gating action is Tom opening the OpenAI Custom Voices
conversation — it is slow and everything else on this candidate is downstream of it.

### Cartesia Sonic — **strong candidate, weak bridge**

Joint-best Tier A (9/10, missing live `glg`), the best pinning mechanism of the hosted three (dated
immutable snapshots, with an honest sunset cliff — 8–17 months observed), by a distance the best
pronunciation control (IPA dictionaries, sounds-like, SSML), and the only candidate besides MiniMax
that renders **native 44.1 kHz mp3 at exactly 192 kbps** — the house master format, no upsample.

Against it, and it is serious: the ToS make commercial use of Output conditional on your
**subscription tier**, present tense, with **no survival clause**; §9.3 says Cartesia "may, but is
not obligated to" delete your content; and by default Cartesia **trains on our inputs and outputs**,
with an opt-out that is a form rather than an API flag.

**Verdict: second, conditional on paper.** Do not sign without (a) a written post-termination
licence to keep serving already-generated clips, (b) a deletion commitment for Aran's and Catrin's
clones, and (c) the training opt-out filed *before* anyone records.

### Chatterbox — **two products, opposite verdicts**

**Resemble Ultra, the hosted platform: DEAD.** This verdict was never about Welsh and survives the
reframe completely untouched, which is worth saying out loud since every other verdict in the
original dossier was Welsh-driven. It dies on repeatability alone: models **cannot be selected in a
request** ("the synthesis API automatically uses the model associated with your `voice_uuid`"), and
**all previous TTS models have already reached end of life** with existing voices force-migrated to
Resemble Ultra to keep generating at all, with no published notice period. A vendor that has already
force-migrated every voice once, and offers no version to pin, cannot deliver near-Azure
repeatability by construction. Take it off the list.

**Open-source Chatterbox: the worst coverage and the best bridge.** Tier A 7/10 is the weakest of
the four and the misses are three live courses (hrv, ben, glg). But MIT-licensed **code and
weights** mean there is no vendor, no subscription, no licence to lapse, nobody holding Aran's
voice, and pinning stops being a promise and becomes a file we keep — better than Azure, not merely
near it. Retiring a clone is deleting a checkpoint.

Its costs are real and should not be soft-pedalled: **no timestamps**, **no pronunciation control at
all**, a **24 kHz** ceiling, a **permanent undisableable PerTh watermark** on every clip we would
ever ship, and — the blocker — **this box cannot run it**: no GPU, no CUDA, no torch, no pip. The
one candidate that costs nothing to evaluate is the one we are hardware-blocked from touching.

**Verdict: keep, as the long-game option, blocked on a GPU box rather than on money.**

### MiniMax Speech — **drop it, unless the unreadable terms say something different**

Tier A 8/10 (missing live `ben` and `glg`), native 44.1 kHz output, and the **best timestamp story
of the hosted three** — word-level timings on the ordinary batch endpoint via `subtitle_enable`,
which is the shape a bulk course render actually wants.

Against it: the weakest pinning of the four (floating model names, **no dated snapshots, no
deprecation policy at all**), no consent mechanism of any kind, unverifiable pricing — and the
licensing. The readable MiniMax terms grant MiniMax a **"royalty-free, perpetual, irrevocable,
worldwide, non-exclusive"** licence to use, reproduce, modify and create derivative works from user
content, retained **after termination**, alongside a "personal, non-commercial use only" clause.
Uploading Aran's voice under those terms hands a perpetual irrevocable licence over it to a company,
which is precisely and exactly the thing SSi is leaving xAI to avoid. Deleting the `voice_id` does
not undo a licence attached to the uploaded audio.

**Verdict: fourth, and recommend dropping.** With the caveat below: the API platform terms, which
are the ones that would actually govern an SSi contract, could not be read.

---

## Exit cost — the new research

TTS is a bridge. Tom, verbatim: *"we probably want long term to eventually do everything with human
voices. Using our intelligent limited subset slice and dice approach."* So a vendor cheap to enter
and expensive to leave is a **worse** bridge. This section is the only genuinely new work in this
slice.

| | Cartesia | Chatterbox (OSS) | MiniMax | OpenAI |
|---|---|---|---|---|
| **Bridge to leave** | **HARD** | **EASY** | **HARD (worst)** | **EASY** |
| Word timings | yes (SSE/WS only) | **none** | yes (batch) | **none** |
| Phoneme timings | **yes** | none | none | none |
| Native 44.1 kHz | **yes** | no (24 kHz) | **yes** | no (24 kHz) |
| Keep serving clips after we stop paying | **unclear — points wrong** | **yes, unconditionally** | unclear | **yes, in writing** |
| Clone retirement | DELETE, no obligation | delete a file | DELETE, licence persists | DELETE + 30-day duty |

**Boundary data.** We already use `word_boundaries` in this estate to prove what TTS actually spoke,
and it is load-bearing, not decorative: `POST /splice-components/:courseCode` in
`services/phases/phase8-audio-v13.cjs` cuts component clips out of their parent M-LEGO audio using
that parent's stored boundaries. Only Azure ever populated them —
`services/tts-service.cjs` returns `wordBoundaries: null` explicitly for xAI and ElevenLabs — and
the DB shows what that costs: **`spa_for_eng` holds 33,420 clips with boundaries out of 79,722**
(Azure era), while **`fra_for_eng` holds 58 out of 67,369** after the xAI re-render. So losing
boundaries is survivable and already survived. But *gaining* them back is a real capability: Cartesia
offers word **and phoneme** timings (more than the estate has anywhere today, though only on the
SSE/WebSocket path, so a bulk render would have to move to streaming); MiniMax offers word timings
on the plain batch call; **OpenAI and Chatterbox offer nothing**, and for those two the fallback is
deriving boundaries locally with whisper, which the estate already runs on three separate legs.

**Audio format.** Less of a discriminator than it looks, because the house pipeline re-encodes
everything anyway: `masterAudio` trims to end-of-speech, normalises to **-16 LUFS**, and writes mp3
at **44.1 kHz / 192 kbps** (`services/audio-processor.cjs`). All four candidates feed that fine. The
real distinction is a **bandwidth ceiling**: OpenAI is fixed at **24 kHz** (pcm documented as 24 kHz,
16-bit LE, no sample-rate parameter) and Chatterbox's S3Gen runs at **24 kHz**, so both are
band-limited near 12 kHz and then upsampled into a 44.1 kHz master. Invisible in a fully synthetic
course; **audible-adjacent in exactly the situation this project is building towards** — a
part-migrated course where a 24 kHz-derived synthetic clip plays next to a full-bandwidth human
recording in the same round. Cartesia and MiniMax render 44.1 kHz natively and do not have this.

**Licensing after we stop paying.** The sharpest split in the whole evaluation.
- **OpenAI — yes, in writing.** Output is *assigned* to the customer (not licensed), and §9 IP
  Rights is enumerated among the clauses that survive termination. Nothing to lapse.
- **Chatterbox — yes, unconditionally.** MIT code and MIT weights; there is no payment to stop.
  The one thing that never leaves is the PerTh watermark: permanent, undisableable, engineered to
  survive mp3 compression, so every clip we ship stays identifiable as Chatterbox-generated forever
  unless replaced. Not a licence problem, but Aran and Catrin should be told.
- **Cartesia — unclear, and pointing the wrong way.** §5.3(b) and §4.1 gate commercial use of Output
  on "your subscription tier", present tense, and no clause says it survives cancellation. §9.3's
  survival provision is a bare "sections which by their nature should survive", unenumerated. The
  plain reading is that when we stop paying, the basis for continuing to serve tens of thousands of
  Cartesia clips commercially becomes unclear — and unclear is not a position to put an estate in.
  This is a lawyer's question and is flagged as one.
- **MiniMax — worst.** Perpetual, irrevocable, worldwide licence to MiniMax over user content,
  surviving termination, plus a personal/non-commercial default. See the verdict above.

**Clone retirement.** OpenAI is strongest: a consent-delete endpoint plus a contractual 30-day
deletion duty on termination. Chatterbox is cleanest in kind: nobody else ever held the voice, so
retiring it is `rm`. MiniMax deletes the `voice_id` permanently but the perpetual licence over the
uploaded audio is untouched by that. Cartesia has a `DELETE /voices/{id}` that returns 204 with no
documented permanence, sitting under a §9.3 that explicitly disclaims any obligation to delete —
and a default of training on our inputs, so retiring the clone does not obviously retire the
training influence.

---

## GAPS

Reported as gaps rather than papered over.

**Nothing was measured, by anyone, for any candidate.** No Cartesia key, no MiniMax key, no OpenAI
key on this box; phase 1 spends zero; no audio was generated. Every vendor figure in this document
is documentary. Tom is signing up — that is the expected state, not a failure.

**Quality is entirely unassessed.** The re-cut proves coverage is not the discriminator. It cannot
tell you which of these sounds like a human being. That is the whole of phase 2 and it needs keys.

**The MiniMax API platform terms could not be read.** `platform.minimax.io/protocol/terms-of-service`
renders client-side and returned only a page header. Every MiniMax licensing statement here comes
from the **App and Web** Terms of Service at `minimax.io`, which may not be the document governing an
API contract. This is the largest single unknown in the re-cut: if the platform terms differ
materially, the MiniMax verdict could move. It needs a browser-rendered fetch or MiniMax's own
confirmation.

**Cartesia's post-termination position is genuinely unanswered by its public terms** — not adverse,
*absent*. It must be settled with Cartesia in writing, by someone qualified to read a contract.

**No OpenAI DELETE endpoint for the custom voice itself was found** (as distinct from the consent
recording); the documentation URL for it 404s and search surfaced only `voice_consents` delete.
Whether a voice can be deleted independently of its consent record is unverified.

**Chatterbox cannot be evaluated from this box at all.** No GPU (Virtio paravirtual only, no CUDA,
no `nvidia-smi`), Python 3.14.4 with no pip, no ensurepip, no torch, no numpy. The one free candidate
is the one blocked. It needs a GPU box, not a budget.

**A whole-table `word_boundaries` census timed out.** `course_audio` holds 2,593,092 rows and the
unfiltered null/not-null counts hit PostgREST's statement timeout, so the boundary figures quoted
here are **per-course samples** (`spa_for_eng`, `fra_for_eng`, `cym_n_for_eng`), not an estate-wide
count. The estate-wide number is unmeasured.

**Timestamp language coverage at Cartesia** for `sonic-3.5` specifically was not enumerated on the
page fetched; the en/de/es/fr restriction is documented for the older `sonic` model, and
`sonic-preview` is documented as supporting all languages. Which applies to 3.5 is unverified.

**MiniMax subtitle granularity is ambiguous on paper** — the same doc describes sentence-aligned
subtitles (≤50 chars) while offering `word` and `word_streaming` types — and the `subtitle_file`
link's expiry is undocumented. One paid probe settles it.

**Sample rates for OpenAI's non-pcm formats** are not stated by OpenAI; 24 kHz is documented for pcm
and is the model's native rate, so mp3/wav/flac are inferred from that rather than cited.

**The PerTh watermark's survival through our own mastering chain** (end-of-speech trim, loudnorm,
lame at 192 kbps) is untested. The vendor claims survival through mp3 compression; we have not
checked.

**Whether 24 kHz is audibly distinguishable from a human recording inside one course round** is an
untested ear question. It is named here because it is exactly the failure mode the bridge frame
creates, not because there is evidence for it.

**Carried over unresolved from the original dossier:** Resemble's two published language lists
disagree on which 23 languages Chatterbox supports (GitHub treated as authoritative); Cartesia's
versioned HTML docs are auth-walled and were read via the `.md` suffix; MiniMax per-character
pricing and clone cost are absent from vendor documentation and the circulating figures are
third-party; Resemble's hosted per-character pricing was not found and is deliberately not quoted;
Cartesia's training opt-out is a form, not an API flag, and whether it applies retroactively is
unverified.

**The minority-language tail has no owner.** Nineteen real target languages are covered by none of
the four, including Basque (48,902 clips) and Irish (25,665). This slice was not asked what covers
them and does not answer it.
