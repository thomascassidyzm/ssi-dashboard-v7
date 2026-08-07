# Reuse before render — what the lookup proved on real data

**2026-08-07.** Companion to
[`AUDIO_PIPELINE_CONTENT_ADDRESSED_DESIGN-2026-08-06.md`](./AUDIO_PIPELINE_CONTENT_ADDRESSED_DESIGN-2026-08-06.md)
and its migration note. Tool: `tools/audio-reuse-inventory.cjs`. Data:
`docs/audio-repair-2026-08-07/`.

This is not a script for ten rounds of French. It is the first working instance
of the content-addressed architecture: the first thing in the estate that asks
*"do we already own this clip?"* against the whole estate, using the canonical
identity key, **before** a render is approved. Ten rounds of French is the test
case that proved it, and the ways it fell short are the migration's real
backlog.

---

## 1 · What the design predicted, and what the data said

The design's headline number is that **2,336,018 keys resolve to 2,099,110
identities — 236,908 objects exist only because the same sentence was rendered
again for another course or side.** That is a ~10% dedup opportunity measured
across the estate.

The founder's hunch went further: since fifty-odd `*_for_eng` courses share an
English known side, *"we've got all these clips already in Spanish, or Italian
or Chinese for English speakers… all the known language clips anyway, so we'll
just need the target language ones."*

Measured on `fra_for_eng` rounds 1-10 (61 distinct English identities, 104
distinct French identities, 202 slots):

| | English (known) | French (target) |
|---|---|---|
| distinct identities | 61 | 104 |
| exists elsewhere, **canonical voice matches** | **27 (44%)** | **0 (0%)** |
| exists elsewhere, different voice only | 28 (46%) | 104 (100%) |
| exists nowhere else | 6 | 0 |

**The hunch is confirmed on the known side and refuted on the target side, and
the refutation is the more interesting half.**

Confirmed: 44% of English prompts already exist in the same voice, supplied by
`deu_for_eng`, `deu_at_for_eng`, `spa_for_eng`, `kor_for_eng`, `jpn_for_eng`.
That is real and bankable — the reuse rate on the known side of a new
`*_for_eng` course is not a rounding error.

Refuted, and this is the finding to carry forward: **the target-side 100% is a
mirage, and the identity key itself is what creates it.**

---

## 2 · Where the identity key held, and where it did not

### It held: voice spelling

The drift the canonicaliser was written for is live in this very scope. Within
202 slots of one course, the known side stores the same voice as both `xai_eve`
(57 rows) and bare `eve` (1 row); target1 stores it as `eve` (46) and `xai_eve`
(12). A lookup asking for one spelling misses the other. `canonicalVoiceId()`
collapses them correctly, and without it this inventory would have reported
false "must render" on clips the course already owns — the exact bug the
identity commit measured at 2,590 clips rendered twice.

### It did not hold: region is dropped, and reuse needs it back

`canonicalLanguage()` reduces `fr-CA` → `fra`, on the stated and correct
reasoning that *"the voice carries the accent"*, so region on the language
column only splits the key.

**For dedup that is right. For reuse it is not sufficient on its own**, and the
French target side is the proof. All 104 French identities have a match
elsewhere under the canonical key `(fra, <text>, <voice>)` — supplied by
`fra_ca_for_eng` (Canadian French, `azure_fr-CA-SylvieNeural` /
`fr-CA-AntoineNeural`), `fra_for_jpn` and `fra_for_zho` (metropolitan French,
but Azure voices of an older generation). Adopting any of them changes the
accent, the provider, or both.

The key is not wrong — the information *is* in it, carried by the voice field
exactly as designed. What was missing is that **nothing was reading it.** A
reuse decision that matches on `(language, text)` and treats voice as a tiebreak
adopts a Canadian clip into a metropolitan course and books it as a saving.

The tool now reports, for every different-voice candidate, *what would change*
(`ofWhichChangeProvider`, `ofWhichChangeRegion`) and refuses to count it as
reusable. **Whether a voice mix is acceptable is an ear judgement and is
reported for a human, never resolved by the query.**

> **Design consequence.** A reuse lookup needs a second predicate the dedup key
> does not: *substitutability*. Two clips can share an identity and not be
> substitutable. The minimum viable form is "same canonical voice_id" — which
> is what this tool uses — but the general form is a voice-equivalence class
> (which voices may stand in for which, per course), and that does not exist in
> the estate today.

### It did not hold: `auto`, and the language-spelling gap

`clip-identity-lookup.cjs` ships `voiceSpellings()` but deliberately no
`languageSpellings()`, because guessing forward from `eng` to its possible
stored spellings would either miss rows or invent them. Its header calls this a
known remaining gap.

**This tool closes it by inverting the direction.** Instead of guessing forward,
it reads every distinct `language` value present in `course_audio`,
canonicalises each, and builds the reverse map. Derived from data, so it cannot
invent a spelling and cannot miss one. English resolves from `eng`, `en` and
`en-GB` (1,083,750 rows between them).

What it cannot reach: **7,847 rows across 36 courses store `language = 'auto'`,
which `canonicalLanguage()` correctly refuses to guess at.** Those rows are
invisible to every reuse lookup, in both directions — they can neither be found
nor be found *by*. This is a concrete, countable item for the migration
backlog, not a rounding error: it is 7,847 clips that will be re-rendered by
anything that trusts the key.

### It did not hold: storage prefix

The most operationally important gap, and the one that would have gone unnoticed
without measuring bytes.

The single best reuse candidate in the whole run — `deu_for_eng`'s clip of
*"I want to learn with you"*, at the matching voice, from German's freshly
verified known-side rebuild — returned **HTTP 403**. Its `s3_key` is
`repair-candidates/419EA32E-…mp3`, not `mastered/…`. Fetched with credentials
through the SDK it is a perfectly good clip (1344 ms, transcribes back exactly).

Two things follow.

1. **A clip under a non-public prefix is not reusable through the path Popty
   reads.** Popty derives its URL by convention from the clip id
   (`mastered/<ID>.mp3`) and never reads `s3_key`. So adopting that German clip
   is not a pointer flip — the object must be copied to `mastered/<newid>.mp3`
   first. Reuse is free of *TTS* cost but not free of *storage* work, and any
   plan that assumes "reuse = repoint a column" is wrong today.
2. Note also that the row's id (`71419ed4…`) and its key (`419EA32E…`) do not
   match, which is precisely the divergence
   `tools/regen-seed-clips-from-scratch.cjs` was written to stop creating.

Content-addressed storage — one object per identity, at a location derived from
the identity — dissolves both problems at once. This is the strongest concrete
argument for it that tonight produced.

---

## 3 · Existence is not health: the gate, and one mistake worth recording

Measuring condition was not optional. Of the 174 clips behind these rounds,
**122 have `veracity_pass = NULL`** — never gated at all. The database cannot
answer "is this clip good", so the tool fetches served bytes and measures.

**The mistake.** The first cut used a flat chars-per-second band and failed
**144 of 165 healthy clips**. A flat rate is wrong at both ends: short clips are
dominated by onset and tail, long ones by steady rate. That is exactly the error
`tools/audio-pace-gate.cjs` was built to avoid, and its model was adopted
instead — Theil–Sen fit of `duration ≈ a + b·characters` per `(language,
voice)` cohort, failing only clips materially below the line. Result: 163 of 165
pass, 2 fail, and both failures survived independent scrutiny.

Recording it because the failure mode is instructive: **a gate that fails 87% of
its input is reporting a broken gate, not a broken estate.** Two contradicted
assumptions should have stopped the analysis before the number was believed.

**On the pace gate's own warning.** Its header forbids using it as a replacement
*selector* — "this clip is fast, therefore re-render it" — because it was
written as an output check after two German clips passed whisper at CER 0 and
were still wrong. The use here is different and is stated so the distinction is
not lost: it is an **intake** check on a candidate offered for adoption. A
candidate that fails intake is simply not adopted, costing a render already
budgeted. **Nothing is replaced on the strength of a pace number** — of the two
clips flagged here, one was independently confirmed chopped by whisper, and the
other is reported to the founder as a judgement call, not actioned.

**Self-calibration, and its limit.** The cohort is the measured set itself, which
is right for an intake check but *cannot detect a systematic fault*: a
uniformly fast generation would fit its own line and pass. This was checked
rather than assumed. Against `deu_for_eng`'s verified rebuild at the same voice,
English clips 10–60 chars: French **63.0** ms/char (median 61.0), German **61.1**
(median 59.6), Spanish 64.9, Korean 68.0. French sits inside the band, so no
systematic fast-render is hiding here.

**The remaining honest gap: there is no verified reference generation for
French.** The `fra|xai_eve` and `fra|xai_leo` cohorts are fitted on themselves
with nothing external to check them against. The German cross-check only
licenses the *English* side. A systematically fast French generation would
currently be invisible, and only an ear can rule on it — which is why the
founder is being asked to listen rather than shown a green tick.

---

## 4 · What the numbers changed about the job

The job this replaced would have regenerated every clip in `fra_for_eng`.
Measured: **163 of 165 distinct clips in rounds 1-10 are healthy on their served
bytes.** Two needed work; both are English practice-phrase clips held by
`course_practice_phrases.known_audio_id` — *the holder column a seed-range slot
map cannot reach*, and the same class as the "as often as possible" clip the
founder caught by ear on 2026-08-06.

The priced render was **55 TTS characters**. Against the German pilot's ~$5 per
full course, the saving is not marginal; it is the difference between a
full-course spend and effectively nothing.

**The general lesson for phase8: the expensive question is not "how do we render
this faster", it is "does this need rendering at all".** Nobody had asked it,
and the answer for this scope was "almost never".

---

## 5 · What would have to be true for this to be phase8's default path

Today this is a **pre-pass**: it answers the question and hands a human numbers.
For it to become the default path inside `phase8-audio-v13.cjs`, four things
must be true, none of which is true now.

1. **A substitutability rule that is not "same voice string".** Voice-equivalence
   classes per course — which voices may stand in for which. Until then the
   safe rule is exact canonical voice match, which leaves the 28 English and 104
   French different-voice candidates unusable without an ear.
2. **The `auto` rows resolved.** 7,847 rows in 36 courses cannot be found by any
   reuse lookup. They must be back-filled from course code + role before the
   lookup can claim completeness. Proposed but not executed in
   `audio-clip-identity-canonicalisation-2026-08-06.md`.
3. **One object location per identity.** While clips live under
   `repair-candidates/`, `pending/` and `mastered/` and Popty derives URLs by
   convention, "reuse" means an S3 copy plus a new row, not a repoint — and a
   reusable clip can be invisible to the public path entirely (the 403 above;
   991 German slots are already known to point outside the public prefix).
4. **Health recorded, not re-measured.** 122 of 174 clips here carry
   `veracity_pass = NULL`, so every reuse decision pays for a fetch-and-measure.
   A clip adopted for reuse should carry a durable verdict.

Until all four hold, **reuse-before-render belongs where it is: a cheap,
read-only pre-pass a human reads before approving a spend.** That is not a
failure of the design — a pre-pass that costs nothing and cancelled a
full-course render on its first outing has already paid for the architecture
several times over.

---

## 6 · Note on where the tooling lives

This work needed both `services/shared/clip-identity*.cjs` (on `main`) and
`tools/regen-seed-clips-from-scratch.cjs` + `tools/audio-pace-gate.cjs` (on the
audio branches, **not merged to main**). No single ref in the repo contains
all four; merging the audio branch into `main` conflicts in unrelated files
(`src/router/index.js`, pods, config views).

**`main` cannot currently run this job.** Flagging it because it is a real
integration debt, not a checkout accident — the audio tooling and the identity
canonicaliser have been developed on branches that have not met.

---

## 7 · A concurrency caveat that qualifies §4's headline

**Another session was rendering French audio into `fra_for_eng` while this
inventory was measuring it.** 57 `course_audio` rows (fra, `xai_eve`, origin
`tts`) were written between 01:11 and 01:21 UTC on 2026-08-07; **51 of them are
linked into the first 10 rounds**, and the measured run overlapped that window.

Of the 104 French identities graded healthy, **51 were created tonight by that
job and 53 predate it.** The verdict on what the course serves *now* stands —
every clip was fetched and measured. But "all 104 French clips are healthy" is
not evidence that the French target side was healthy before tonight, and it must
not be quoted as such. The 53 pre-existing clips did all pass, which is the
honest, smaller claim.

Both defects found are on the English known side and both predate the window, so
the §4 conclusion — that the full-course regeneration was the wrong scope — is
unaffected.

**Design consequence.** This tool measures a moving target and has no way to know
it. A reuse/health inventory over a live course should stamp the read
(`max(created_at)` per scope, or an explicit snapshot) and re-check it before
its numbers are used to approve a spend, or it will confidently report on rows
that changed underneath it. Compare the known drift pattern where 43% of a
270-candidate batch was consumed by a concurrent campaign in three hours.
