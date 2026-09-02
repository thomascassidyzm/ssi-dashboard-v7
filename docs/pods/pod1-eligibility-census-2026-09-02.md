# Which courses can actually move to POD 1

*Read-only census, 2026-09-02. Measured live from `listening_pods` + `listening_pod_sentences`.
Nothing was written. Tool: `tools/pods/pod1-eligibility-census.cjs`. Data:
`docs/pods/pod1-eligibility-census-2026-09-02.json`.*

---

## The answer in one sentence

**Zero of the 46 can move today, and it is not a migration backlog — POD 1 has only ever been
authored for 22 courses, all of them `*_for_eng`, so there is no POD 1 content sitting in the
other 46 waiting to be switched on.** The hypothesis is confirmed: this is an authoring backlog
wearing a migration label.

If you accept the *mirror* reading below — that the 231-line English POD 1 script already
exists and can be re-pointed — then **16 of the 46 become reachable as a re-assembly job rather
than an authoring job**, and the single language that unblocks the most is **English on the
target side: 10 of those 16** (`eng_for_ara/deu/fra/hin/ita/jpn/kor/por/spa/zho`).

The other 30 need genuinely new POD 1 content in a language nobody has authored it in.

---

## First, the enforcement finding — read this before the numbers

**Tom's constraint, as a language-level rule, is enforced NOWHERE in code.** Nothing in the
estate reads "does POD 1 exist for this course's known language and its target language" before
a move. What is enforced is a *different and mostly stronger* per-course thing, plus one real
hole:

| | Gated? | Where |
|---|---|---|
| Staged pod must exist for the course | **yes, refuses** | `tools/pods/pod-switchover.cjs:305` |
| Every staged sentence has **target text** | **yes, refuses** | `pod-switchover.cjs:335` |
| No sentence still marked `target_text_draft` | **yes, refuses** | `pod-switchover.cjs:336` |
| Every staged sentence has **target audio** | **yes, refuses** | `pod-switchover.cjs:337` |
| Every staged sentence has **known audio** | **NO — counted, logged, then discarded** | `pod-switchover.cjs:319, 326` |
| Every staged sentence has **known text** | **NO — never checked at all** | — |
| Either language can actually serve the pod | **NO** | — |

`no_known_audio` is computed in the readiness query and printed in the log line, and then it is
never pushed onto `blockers`. So **a course can be promoted onto POD 1 today with a silent
known side** — the prompts missing — and no gate will stop it. Every other readiness dimension
refuses loudly. This is the same asymmetry already recorded for the content pipeline: the target
side is gated, the known side is measured and ignored.

The player resolver does not close it either: `servedPod.ts` hardcodes
`SERVING_POD_SLUGS = ['pod-1', 'pod-0']` and resolves **per course_code, preferring `pod-1`**,
with `pod-0` as the fallback for anything unknown. It is a slug preference, not a content check.
Same for `usePodStage0.ts` (prefix-matches the slug inside the sentence id),
`useListeningPods.ts`, `listeningMetaCache.ts`, `usePodLapScheduler.ts`,
`generateLearningScript.ts`, and `bundle.ts` (which filters `.in('slug', ['pod-1','pod-0'])` and
orders download priority on `pod_order`). None is language-aware.

*Occurrence counts deduped by real path: the 24 `pod-1` hits across the learning app are 12 real
files and 12 copies of the same files inside the `wt-i18n/southasia` worktree.*

In practice the per-course staging gate means the language question rarely arises — you cannot
move a course onto a pod it does not have. But **the rule Tom stated is not the rule the code
enforces**, and the known side has a real hole in it.

---

## The by-language ranking — what one authoring pass buys

Under the **mirror** reading (definition B), the blocked set collapses to one dominant language
and then a long tail of singletons:

| Missing language | Courses unblocked by one pass | Which |
|---|---|---|
| **cat** | 2 | cat_for_eng, cat_for_spa |
| every other | 1 each | ara_sy, bul, cym_n, cym_s, dan, ell, ben, guj, pan, sin, tam, urd, est, fas, fin, heb, hye, lav, lit, nep, nor, pol, swa, tha, tur, ukr |

There is **no big lever left in authoring** — the leverage is all in the mirror. Under the
strict reading (definition A) the ranking is:

| Missing | Side | Courses |
|---|---|---|
| **eng** | target | **16** |
| **jpn** | known | 6 |
| **spa** | known | 3 |
| cat | target | 2 |
| 36 others | — | 1 each |

Read that table this way: authoring English as a POD 1 **target** language would unblock 16
courses at a stroke — and the mirror finding says that English content already exists.

---

## The evidence — exactly what "content exists" means here

**How languages were derived.** Course codes parse as `<target>_for_<known>`; `eng_for_spa` has
target `eng`, known `spa`. Dialects are distinct languages per Tom's 2026-09-02 ruling — `spa`
and `spa_mx`, `por` and `por_br`, `cym_n` and `cym_s`, `ara`/`ara_eg`/`ara_sy`, `deu`/`deu_at`,
`fra`/`fra_ca`. Nothing was collapsed to a parent.

**Definition A (strict — the taste-safe default in the brief).** POD 1 content exists for
language L on the TARGET side iff at least one `listening_pods` row with `slug = 'pod-1'`, whose
course's target language is L, has ≥1 `listening_pod_sentences` row with non-empty
`target_text`; and on the KNOWN side iff such a row exists with L on the known side and
non-empty `known_text`. Result: **0 of 46 eligible, 0 of the 44 real courses**.

The per-language inventory that produces it is stark. Every one of the 22 pod-1 courses is
`*_for_eng`, so:

- 22 languages have POD 1 **target** text (231 rows each, exactly): ara, ara_eg, deu, deu_at,
  eus, fra, fra_ca, gle, hin, hrv, isl, ita, jpn, kor, nld, por, por_br, ron, spa, spa_mx, swe,
  zho.
- **eng** has 5,082 rows of POD 1 **known** text (22 × 231) and **zero** target rows.
- Every other language — the 30 in the tail above — has neither.

**Definition B (mirror) — and why it is worth stating.** I checked whether the English known
script is one canonical script or 22 independent ones. It is one script: all 22 pod-1 courses
hold **exactly 231 sentences under the same 231 sentence keys**, and the English text is
identical across courses on **226 of 231 lines**. The 5 that differ are the 5 that name the
language being learnt ("I'm learning Spanish" / "I'm learning Japanese", SC06-S009, SC10-S008,
SC10-S009, SC22-S001, SC22-S006).

So English POD 1 text demonstrably exists; it exists on the *known* side. Under definition B a
language has POD 1 text if it appears on **either** side of any pod-1 pod, which makes
`eng_for_spa` reachable by mirroring `spa_for_eng`'s pod-1 — English known text becomes target
text, Spanish target text becomes known text, and the 5 language-name lines are re-pointed.

**Result under B: 16 of 46.** deu_for_jpn, eng_for_ara, eng_for_deu, eng_for_fra, eng_for_hin,
eng_for_ita, eng_for_jpn, eng_for_kor, eng_for_por, eng_for_spa, eng_for_zho, eus_for_spa,
fra_for_jpn, ita_for_jpn, spa_for_jpn, zho_for_jpn.

**I have not adopted B as the answer** — I am reporting A as the measured result and B as a
material option, because B is a text claim and a pod needs audio. Mirroring gives you the text
for free but the *audio* is not free in the same way: the English clips exist as known-side
audio (usable as target-side audio for a course learning English), and the target clips exist
(usable as known-side prompts) — but whether a course's pods may serve another course's clips is
a clip-identity question, not a text question, and `course_code` sits inside clip identity.
**That is the one thing Tom or an audio owner has to rule on before B is real.** Under A alone,
the answer is zero.

**The Deliverable-4 question, answered directly.** Does "content exists for the known language"
mean the POD 1 prompts have been authored in that language, and is that the same as "some pod-1
course has that language on its known side"? **The two come apart, in exactly one direction and
it matters.** "Some pod-1 course has L on its known side" is *sufficient* — the prompts exist,
authored, in L. It is not *necessary*: L's POD 1 sentences may exist as target text in a course
teaching L, which is the same 231 thoughts in the same language, differing only in which track
of the player they are played on and which voice cast reads them. Definition A tests the
sufficient condition only, which is why it returns zero; definition B tests the necessary one.

---

## The control — the 22 already on POD 1

All 22 pass, and all 22 are complete: **exactly 231 sentences each, 231 with non-empty known
text, 231 with non-empty target text. No exceptions, no short pods, no ragged counts.**

ara_eg_for_eng, ara_for_eng, deu_at_for_eng, deu_for_eng, eus_for_eng, fra_ca_for_eng,
fra_for_eng, gle_for_eng, hin_for_eng, hrv_for_eng, isl_for_eng, ita_for_eng, jpn_for_eng,
kor_for_eng, nld_for_eng, por_br_for_eng, por_for_eng, ron_for_eng, spa_for_eng, spa_mx_for_eng,
swe_for_eng, zho_for_eng — all 231/231/231.

**Honest caveat on what this control proves.** Under definition A it is partly self-referential:
a course sitting on pod-1 is its own evidence that its target language has pod-1 target content.
So "22 of 22 pass" is close to a tautology and should not be read as the constraint being
validated in the wild. What the control does prove, and it is worth having, is the **completeness
claim**: nothing moved onto pod-1 with a short or half-authored pod, and no course moved with a
missing known side — despite the code not gating on the known side at all. The gap in the gate
has not yet been exercised.

---

## What the 46 are actually sitting on

Worth knowing before anyone plans the switchover: **40 of the 46 are still on the OLD 142-line
pod-0 canon**, not the 231-line one.

- 142 sentences: 40 courses (everything except the five below)
- 231 sentences: cym_n_for_eng, cym_s_for_eng
- 232 sentences: ara_sy_for_eng, fin_for_eng
- 10 / 24 sentences: zzz_test2_for_eng, zzz_test_for_eng (test courses)

**One course is genuinely close.** `ara_sy_for_eng` is the only one of the 46 holding staged POD 1
content: `ara_sy_for_eng:pod-1-staged-2026-08-23`, 231 rows, known text complete, target text
complete, known audio complete. It would still be refused by the switchover gate today —
**108 rows are still marked `target_text_draft` and 4 have no target audio**. That is a short,
concrete list of work, and it is the only one of the 46 that has one.

---

## Per-course verdict — the 46

Eligible under A: none. The `mirror` column is definition B.

| Course | Known | Target | A | Mirror (B) | Blocked on |
|---|---|---|---|---|---|
| ara_sy_for_eng | eng | ara_sy | ✗ | ✗ | ara_sy (target) — but has staged pod-1, see above |
| bul_for_eng | eng | bul | ✗ | ✗ | bul (target) |
| cat_for_eng | eng | cat | ✗ | ✗ | cat (target) |
| cat_for_spa | spa | cat | ✗ | ✗ | **both** — cat (target) + spa (known) |
| cym_n_for_eng | eng | cym_n | ✗ | ✗ | cym_n (target) |
| cym_s_for_eng | eng | cym_s | ✗ | ✗ | cym_s (target) |
| dan_for_eng | eng | dan | ✗ | ✗ | dan (target) |
| deu_for_jpn | jpn | deu | ✗ | **✓** | jpn (known) |
| ell_for_eng | eng | ell | ✗ | ✗ | ell (target) |
| eng_for_ara | ara | eng | ✗ | **✓** | **both** — eng (target) + ara (known) |
| eng_for_ben | ben | eng | ✗ | ✗ | **both** — eng (target) + ben (known) |
| eng_for_deu | deu | eng | ✗ | **✓** | **both** — eng (target) + deu (known) |
| eng_for_fra | fra | eng | ✗ | **✓** | **both** — eng (target) + fra (known) |
| eng_for_guj | guj | eng | ✗ | ✗ | **both** — eng (target) + guj (known) |
| eng_for_hin | hin | eng | ✗ | **✓** | **both** — eng (target) + hin (known) |
| eng_for_ita | ita | eng | ✗ | **✓** | **both** — eng (target) + ita (known) |
| eng_for_jpn | jpn | eng | ✗ | **✓** | **both** — eng (target) + jpn (known) |
| eng_for_kor | kor | eng | ✗ | **✓** | **both** — eng (target) + kor (known) |
| eng_for_pan | pan | eng | ✗ | ✗ | **both** — eng (target) + pan (known) |
| eng_for_por | por | eng | ✗ | **✓** | **both** — eng (target) + por (known) |
| eng_for_sin | sin | eng | ✗ | ✗ | **both** — eng (target) + sin (known) |
| eng_for_spa | spa | eng | ✗ | **✓** | **both** — eng (target) + spa (known) |
| eng_for_tam | tam | eng | ✗ | ✗ | **both** — eng (target) + tam (known) |
| eng_for_urd | urd | eng | ✗ | ✗ | **both** — eng (target) + urd (known) |
| eng_for_zho | zho | eng | ✗ | **✓** | **both** — eng (target) + zho (known) |
| est_for_eng | eng | est | ✗ | ✗ | est (target) |
| eus_for_spa | spa | eus | ✗ | **✓** | spa (known) |
| fas_for_eng | eng | fas | ✗ | ✗ | fas (target) |
| fin_for_eng | eng | fin | ✗ | ✗ | fin (target) |
| fra_for_jpn | jpn | fra | ✗ | **✓** | jpn (known) |
| heb_for_eng | eng | heb | ✗ | ✗ | heb (target) |
| hye_for_eng | eng | hye | ✗ | ✗ | hye (target) |
| ita_for_jpn | jpn | ita | ✗ | **✓** | jpn (known) |
| lav_for_eng | eng | lav | ✗ | ✗ | lav (target) |
| lit_for_eng | eng | lit | ✗ | ✗ | lit (target) |
| nep_for_eng | eng | nep | ✗ | ✗ | nep (target) |
| nor_for_eng | eng | nor | ✗ | ✗ | nor (target) |
| pol_for_eng | eng | pol | ✗ | ✗ | pol (target) |
| spa_for_jpn | jpn | spa | ✗ | **✓** | jpn (known) |
| swa_for_eng | eng | swa | ✗ | ✗ | swa (target) |
| tha_for_eng | eng | tha | ✗ | ✗ | tha (target) |
| tur_for_eng | eng | tur | ✗ | ✗ | tur (target) |
| ukr_for_eng | eng | ukr | ✗ | ✗ | ukr (target) |
| zho_for_jpn | jpn | zho | ✗ | **✓** | jpn (known) |
| *zzz_test2_for_eng* (test) | eng | zzz_test2 | ✗ | ✗ | test course |
| *zzz_test_for_eng* (test) | eng | zzz_test | ✗ | ✗ | test course |

**Totals: 46 courses, 44 real (2 test). Eligible under A: 0 real. Eligible under B: 16 real.**

---

## Gaps — what I could not measure

- **Audio reusability across courses.** I measured *text* presence, which is what the brief's
  definition asks for. Whether a mirrored pod's clips are legally servable in the other course is
  a clip-identity question (`course_code` sits inside clip identity) and I did not open it — it
  is the ruling that decides whether definition B is real. Flagged, not assumed.
- **Nothing else.** All tables read cleanly; no access was refused.

## Corrections made during the measurement

My first run reported inflated control counts (447, 431, 462 rows against an expected 231). That
was my own bug — paginating `.range()` over 20-pod chunks without an `ORDER BY`, so rows
duplicated across pages. Fixed with `.order('id')`; the true counts are 231 across all 22, and
that is what is reported above.
