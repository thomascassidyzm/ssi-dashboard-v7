# Every pod-0 in the estate — what it is now, and what moving them all costs

**2026-08-08 · measured live from the database, not from any document**
Tool: `tools/pods/pod0-fleet-census.cjs` (read-only, re-runnable). Data: `pod0-fleet-census-2026-08-08.json`.

---

## First, the thing you spotted

**The admin page is right, and Spanish really is still serving 142 lines. That is deliberate,
and it is mine.**

Spanish is live. Aligning its pod-0 in place would have handed real Spanish learners 128 rows
with no words and no audio — and those rows do not get skipped, they render as **blank cards**
that play nothing (`ListeningOverlay.vue:1415`). So the new 231-line canon went onto a working
copy beside it, and `pod-0` still holds its intact 142 lines with all its audio. The admin page
reads `pod-0`, so it reads 142. Nothing is broken; the new version is one slug away, waiting on
your ear.

That is the same call the census asks about for every other course, and the answer differs per
course — which is what the table below is for.

## Where the estate actually is

| | count |
|---|---|
| Courses holding a pod-0 | **67** |
| Already on the new ~231 canon | **4** — Welsh ×2, Austrian German, Spanish |
| Still on the old 142 | **63** |
| Already on a two-voice cast | 37 |
| Whose learner-facing pod-0 slot is occupied (so needs the working-copy route) | **65** |

The two exceptions are the Welsh pair: their `pod-0` was **emptied** to gate it, so Welsh
learners' listening pod is empty right now. Spanish was deliberately not done that way.

## What can be moved today, and what cannot

| Bucket | Courses | Status |
|---|---|---|
| **Ready to roll** | **40** | One parameterised command each |
| Needs one extra argument | 3 | `hin_for_eng`, `hye_for_eng`, `swa_for_eng` — no line in their pod says "I'm learning X", so the aligner can't learn the language name. Pass `--language-name="Hindi"` etc. Not a code change. |
| **Blocked on tooling** | **23** | Known language is not English |
| Test course | 1 | `zzz_test_for_eng`, ignore |

**The 23 blocked courses are the one real obstacle to "all pods".** They are the 16 `eng_for_*`
courses plus `cat_for_spa`, `eus_for_spa`, and five `*_for_jpn`. The aligner matches each pod line
against Aran's canonical **English**, which only works when English is the *known* side. On these
the English sits in the target column and the whole carry-forward logic inverts, so the tool
refuses rather than mis-carrying every line. That refusal is correct — but it means a third of
the estate cannot be rolled until someone writes the inverted path.

## The cost, at the rate the Spanish sample actually billed

The eight Spanish clips were **387 characters and $0.0058** — well under a penny. At the corrected
xAI rate of **$15 per million characters** (`phase8-audio-v13.cjs:6160`), and 48 characters per
clip measured off the fully-drafted Spanish pod:

| | clips | rough spend | rough wall-clock |
|---|---|---|---|
| The 40 ready courses, both tracks | **10,051** | **≈ $7** | **≈ 21 h** |
| — of which, the 4 already aligned | 1,403 | ≈ $1 | ≈ 3 h |
| — of which, the 36 still to align | 8,648 | ≈ $6 | ≈ 18 h |
| The 23 blocked courses, if unblocked | ≤ 10,600 | ≤ ≈ $8 | ≤ ≈ 22 h |

Wall-clock is from this run's own measured rate: 8 clips in 61 seconds at concurrency 5, i.e.
**473 clips/hour**. That matches the 576/hour the redo scope measured independently. The pod door
is whisper-bound, not money-bound.

**So money is not the constraint — the whole estate is under $20.** The constraints are a day of
pipeline time, and **4,094 lines of translation** across the 40 ready courses. That translation is
the actual work.

## The table

`live-pod` = lines the learner-facing `pod-0` serves today. `clips` = clips still to render on the
new canon, both tracks. `translate` = canonical lines with no usable target text yet.

| course | status | live-pod | canon | voices | clips | translate | blocked |
|---|---|---|---|---|---|---|---|
| ara_eg_for_eng | beta | 142 | old | 4 | 218 | 105 | |
| ara_for_eng | beta | 142 | old | 5 | 235 | 114 | |
| ara_sy_for_eng | draft | 142 | old | 2 | 223 | 108 | |
| bul_for_eng | beta | 142 | old | 2 | 227 | 109 | |
| cat_for_eng | beta | 142 | old | 3 | 241 | 116 | |
| cat_for_spa | beta | 142 | old | 3 | — | — | known language not English |
| cym_n_for_eng | released | 0 | new | 5 | 413 | 0 | |
| cym_s_for_eng | released | 0 | new | 5 | 462 | 0 | |
| dan_for_eng | beta | 142 | old | 5 | 266 | 129 | |
| deu_at_for_eng | draft | 232 | new | 2 | 260 | 0 | |
| deu_for_eng | beta | 142 | old | 6 | 235 | 112 | |
| deu_for_jpn | beta | 142 | old | 6 | — | — | known language not English |
| ell_for_eng | beta | 142 | old | 2 | 235 | 114 | |
| eng_for_ara | beta | 142 | old | 2 | — | — | known language not English |
| eng_for_ben | beta | 142 | old | 2 | — | — | known language not English |
| eng_for_deu | beta | 142 | old | 2 | — | — | known language not English |
| eng_for_fra | beta | 142 | old | 2 | — | — | known language not English |
| eng_for_guj | beta | 142 | old | 2 | — | — | known language not English |
| eng_for_hin | beta | 142 | old | 2 | — | — | known language not English |
| eng_for_ita | beta | 142 | old | 2 | — | — | known language not English |
| eng_for_jpn | beta | 142 | old | 2 | — | — | known language not English |
| eng_for_kor | beta | 142 | old | 2 | — | — | known language not English |
| eng_for_pan | beta | 142 | old | 2 | — | — | known language not English |
| eng_for_por | beta | 142 | old | 2 | — | — | known language not English |
| eng_for_sin | beta | 142 | old | 2 | — | — | known language not English |
| eng_for_spa | beta | 142 | old | 2 | — | — | known language not English |
| eng_for_tam | beta | 142 | old | 2 | — | — | known language not English |
| eng_for_urd | beta | 142 | old | 2 | — | — | known language not English |
| eng_for_zho | beta | 142 | old | 2 | — | — | known language not English |
| est_for_eng | beta | 142 | old | 2 | 227 | 109 | |
| eus_for_eng | beta | 142 | old | 2 | 229 | 111 | |
| eus_for_spa | beta | 142 | old | 2 | — | — | known language not English |
| fas_for_eng | beta | 142 | old | 2 | 249 | 122 | |
| fin_for_eng | draft | 142 | old | 0 | 462 | 160 | no cast at all |
| fra_ca_for_eng | draft | 142 | old | 4 | 230 | 112 | |
| fra_for_eng | released | 142 | old | 5 | 291 | 111 | |
| fra_for_jpn | beta | 142 | old | 5 | — | — | known language not English |
| gle_for_eng | beta | 142 | old | 2 | 243 | 117 | |
| heb_for_eng | beta | 142 | old | 2 | 259 | 126 | |
| hin_for_eng | beta | 142 | old | 5 | — | — | needs `--language-name` |
| hrv_for_eng | released | 142 | old | 5 | 243 | 118 | |
| hye_for_eng | beta | 142 | old | 2 | — | — | needs `--language-name` |
| isl_for_eng | beta | 142 | old | 2 | 280 | 136 | |
| ita_for_eng | released | 142 | old | 5 | 221 | 107 | |
| ita_for_jpn | beta | 142 | old | 5 | — | — | known language not English |
| jpn_for_eng | released | 142 | old | 5 | 214 | 106 | |
| kor_for_eng | released | 142 | old | 6 | 205 | 101 | |
| lav_for_eng | beta | 142 | old | 2 | 210 | 101 | |
| lit_for_eng | beta | 142 | old | 2 | 227 | 109 | |
| nep_for_eng | beta | 142 | old | 2 | 204 | 100 | |
| nld_for_eng | beta | 142 | old | 6 | 239 | 115 | |
| nor_for_eng | beta | 142 | old | 3 | 231 | 113 | |
| pol_for_eng | beta | 142 | old | 6 | 258 | 123 | |
| por_br_for_eng | beta | 142 | old | 5 | 236 | 113 | |
| por_for_eng | released | 142 | old | 4 | 226 | 108 | |
| ron_for_eng | beta | 142 | old | 2 | 213 | 103 | |
| **spa_for_eng** | released | 142 | **new** | 2 | 268 | 0 | working copy ready |
| spa_for_jpn | beta | 142 | old | 5 | — | — | known language not English |
| spa_mx_for_eng | beta | 142 | old | 4 | 239 | 117 | |
| swa_for_eng | beta | 142 | old | 2 | — | — | needs `--language-name` |
| swe_for_eng | beta | 142 | old | 5 | 238 | 115 | |
| tha_for_eng | beta | 142 | old | 5 | 217 | 106 | |
| tur_for_eng | beta | 142 | old | 5 | 244 | 118 | |
| ukr_for_eng | beta | 142 | old | 2 | 226 | 109 | |
| zho_for_eng | released | 142 | old | 5 | 207 | 101 | |
| zho_for_jpn | beta | 142 | old | 5 | — | — | known language not English |
| zzz_test_for_eng | draft | 6 | old | 0 | — | — | test course |

## The rollout command, per course

Nothing is course-specific any more. Each course is:

```
clone-pod        --course=X --to=pod-0-unrecorded      # only if its pod-0 is live
align-pod0-to-canonical --course=X --pod-slug=pod-0-unrecorded
pod-recast       --course=X --pod=X:pod-0-unrecorded   # two-voice
<translate the blank slots>
write-pod0-drafts --course=X --pod-slug=pod-0-unrecorded
```

## What is not decided

Whether this rolls at all, and whether the 23 English-known-inverted courses get the tooling
built or get left on the old canon. Both are yours. Nothing beyond Spanish has been touched.
