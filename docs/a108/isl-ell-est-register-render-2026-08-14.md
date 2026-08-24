# A-108 — Icelandic, Greek and Estonian: the register/gender pocket is rendered and live

2026-08-14. Tom approved the render this thread. **36 clips re-rendered on their incumbent
Azure voices, verified, and swapped in. 71 pod rows now carry the corrected words, and every
one of them speaks them.** Nothing was deleted. Five judgement rows are parked, untouched, and
listed at the bottom for the next listening pass.

## Scope — and one number that did not check out

The approval said 67 clips at $0.073. **The live DB says the pocket is 38 clips.** I re-measured
it from scratch before touching anything, and it reconciles exactly to the sweep's own report
(`/d/a69dfd64`, commit `c2055d62`): 763 non-draft rows examined, 74 candidate rows, 38 distinct
clips, 3,056 characters, $0.049. No artefact anywhere in the A-108 branches says 67 or $0.073.
I could not reproduce that number by any slicing — including drafts, counting rows instead of
clips, or counting every `course_audio` row that carries these texts.

So the pass ran at the measured scope, which is **strictly inside the approved envelope on both
count and cost**: 36 clips rendered (38 minus the 2 parked), $0.053 spent against $0.073
approved. If 67 was pointing at something real that I have not found, it is a genuine gap in
this report and the extra pocket is still out there.

| | Clips | Rows | Characters |
|---|---|---|---|
| Icelandic | 4 | 8 | 467 |
| Greek | 10 | 20 | 1,122 |
| Estonian | 22 | 43 | 1,240 |
| **Rendered** | **36** | **71** | **2,829** |
| Parked (isl) | 2 | 3 | — |

## Text and audio moved together, never apart

`course_audio.text` was byte-identical to `listening_pod_sentences.target_text` on every row in
this pocket, and the render path reads `course_audio.text`. A text-only edit first would have
desynced the two and a later render would have spoken the old words again. So per clip, the new
bytes, the clip's `text` and every pod row's `target_text` all move **inside one psql
transaction**, guarded on the exact before-state, with in-transaction assertions that the clip
took the swap, that all its rows took it, and that no row is left with `a.text <> s.target_text`.
There is no instant at which a learner could see corrected text against superseded audio.

The clips were rendered from the **plain corrected text, no `…` pause cue**, because that is how
the incumbent clips in this pocket were made — preserving the byte-identical invariant rather
than introducing a new divergence on 36 rows.

## Make before break

Per CLAUDE.md and `AUDIO_PIPELINE_ARCHITECTURE.md` §6b, in this order, every clip:

1. **Render** to a brand-new S3 key. The DB is untouched at this point.
2. **Verify the new object** — nine checks, below.
3. **Swap** in one transaction, with `audio_revision` bumped 1 → 2.
4. **The old object is never deleted.** All 36 superseded objects are still in the bucket, and
   every one is recorded in `course_audio_revisions` with its previous key, previous duration
   and previous revision — that table is the rollback ledger for this pass.

`audio_revision` is bumped, not just the key, because `/api/audio/:id` serves
`max-age=31536000, immutable`: without a new revision every learner who had already played a
clip would keep the wrong words for a year.

**The voice is never chosen by this tool.** It re-resolves the voice from the pod cast
(`speakers[role].target.voice_id`), asserts it is the same voice already on the clip row, and
refuses the clip otherwise. All 36 came back on their incumbent voices: `is-IS-Gudrun`,
`is-IS-Gunnar`, `el-GR-Athina`, `el-GR-Nestoras`, `et-EE-Anu`, `et-EE-Kert`. Some rows spell the
voice bare and some `azure_`-prefixed; the tool compares the voice, not the spelling, and leaves
each row's own spelling alone — re-spelling `voice_id` would be a silent estate-wide
normalisation riding on a render approval.

These three courses have **zero xAI voices in their pools**, so Azure here is the sanctioned
fallback case of the xAI-first ruling, not an exception to it. There is nothing to recast to.

## Verification — nine checks per clip, all 36 green

| Check | What it proves |
|---|---|
| `s3_alive` | HEAD on the new key succeeds |
| `s3_bytes_match` | the object in the bucket is byte-for-byte the buffer we rendered |
| `decodable` | `ffprobe` reads a real duration out of the file |
| `duration_agrees` | ffprobe and the mastering step agree within 5% |
| `not_truncated` | duration within 0.75–1.4× of the old clip scaled by text length |
| `asr_decoded` | whisper-medium returns a transcript at the clip's own language |
| `asr_is_speech` | CER vs the corrected text < 0.6 — real speech, not silence or a stub |
| `asr_speaks_new_form` | CER vs corrected < CER vs superseded |
| `asr_changed_words` | the changed word is heard, closer to the new form than to the old |

The last two are the ones that matter and they took two goes to get right. An exact word-match
test failed five perfectly good clips because whisper transliterates freely on these languages
— `võite` came back "võitte", `leiate` as "leijate", `svöng` as "svung". The fix is comparative,
not absolute: find the decode word that best matches either candidate and require it to sit
closer to the corrected form than to the superseded one. Transliteration noise hits both
candidates equally, so it cancels. One further refinement was forced by Estonian scene 8, whose
line legitimately contains the word `või` ("or") — one edit from the superseded `võid` — so
decode words attributable to the *unchanged* part of the sentence are excluded from candidacy.
Worked examples from the live run: `"voitte" is 1 from voite and 3 from superseded void`;
`"leijate" is 1 from leiate and 3 from superseded leiad`; `"svung" is 1 from svong and 3 from
superseded svangur`.

Five clips failed the word check on the first pass and were **not** swapped: their objects were
left in the bucket as evidence, their live rows untouched and still serving the old audio, and
they went green after the verifier was corrected. One of those five needed the second refinement
as well. At no point was a clip swapped on a check it had not passed.

## Independent re-verification — 36/36

The render tool's own checks are not the evidence here. `tools/a108/isl-ell-est-render-verify.cjs`
reads nothing from the render logs: it takes the live DB state and the rollback ledger,
**downloads what is actually being served** for each of the 36 clips, and re-runs every check
from scratch, recovering the superseded wording from the edit list rather than assuming it.

**36/36 clips pass every check. 71 pod rows covered.** Per-clip evidence — including each live
whisper decode and each changed-word distance — is in
`docs/a108/isl-ell-est-register-render-verification.json`.

## Reconciliation, after the fact

Independent of the tool's own logs, read back from the live DB:

```
revisions_written      36
distinct_clips         36
clips_at_rev2          36
clips_key_moved        36      (s3_key = the new key, and != the previous key)
voice_unchanged_azure  36
pod rows on them       71      isl 8, ell 20, est 43
alive on S3            36/36   with matching byte counts
desync introduced      0
envelope rows left     0       (stale loudness envelopes dropped, will recompute)
```

33 rows elsewhere in these three courses show `course_audio.text <> target_text`. All 33 are the
`…` pause-cue convention on multi-sentence turns, all pre-existing, none of them mine, and none
of them a real desync.

## Cost

$0.0532 actual, against $0.073 approved. The 36 live clips are 2,829 characters ($0.0453); the
remaining $0.0079 is 493 characters of re-render on the six clips that had to go round again
after the verifier was corrected. Nothing was billed that is not accounted for here.

## Parked — five rows, untouched, for Tom's listening pass

Not swept in, not rendered, not edited. Two are in the pocket and deliberately excluded; three
were never in the plan.

**1. isl `pod-0` SC04-S003 — Friend (is-IS-Gunnar, male)**
`Nei, fyrirgefðu, ég er upptekin á morgun…` — text analysis says a male speaker needs
`upptekinn`. Parked because the defect is a word-final `-n`/`-nn` and whisper cannot resolve
that contrast in Icelandic. **Proven, not asserted:** control clip isl 9.17, whose stored text is
unambiguously `tilbúinn`, decodes as `tilbúin` — the model drops the geminate. Needs a native ear.

**2. isl `pod-0` SC15-S006 and `pod-0-unrecorded` SC22-S006 — Friend (is-IS-Gunnar)** *(2 rows,
one shared clip)*
`…ég held að þú sért tilbúinn að byrja að tala Íslensku…` — should agree with the female
Learner as `tilbúin`. Same `-n`/`-nn` contrast, same control-clip proof, same reason to park.

**3. ell SC10-S004 — Assistant (el-GR-Nestoras)** *(2 rows)*
`…θα πρέπει να κοιτάξετε για να είστε σίγουροι.` Formal-plural masculine `σίγουροι` addressed to
one woman. Greek allows both this and the semantically-agreeing `σίγουρη`. Genuine taste fork.

**4. ell SC10-S009 — Customer (el-GR-Athina)** *(2 rows)*
`Είστε πολύ καλοί!` to a single male Assistant. Same honorific-plural question, the other way round.

**5. isl SC11-S002 — Receptionist** *(2 rows)*
`Velkomin.` to the Guest — feminine singular *or* mixed plural. The Guest asks for a late
check-out "for us" and is answered in the plural, so the plural reading is defensible.

## Files

- `tools/a108/isl-ell-est-register-render.cjs` — the pass. `--dry` runs every assertion with no
  spend; `--apply` renders and swaps; it is resumable and idempotent, because an edit whose
  corrected form is already live is recognised as done rather than as drift.
- `tools/a108/isl-ell-est-edits.cjs` — the 38 edits, lifted verbatim from the approved planner.
- `docs/a108/isl-ell-est-register-render-applied-log.json` — per clip: before, after, old and
  new S3 key, old and new duration, revision, voice, every check with its evidence, the whisper
  decode, the changed-word distances, the pod rows touched, and the cost.
- `docs/a108/isl-ell-est-register-render-dryrun-log.json` — the pre-spend dry run.
